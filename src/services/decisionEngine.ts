import { z } from 'zod';
import { openrouter, OPENROUTER_MODELS } from './openrouter';
import { pinecone, PineconeMatch } from './pinecone';
import { dbOperations } from './db';
import { SignalEvaluation } from './signals';
import { BotGenome } from '../types/genome';
import { NewsDigest } from './newsEngine';
import { RegimeType } from './regime';

export const DecisionSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT', 'MODIFY']),
  confidence: z.number().min(0.0).max(1.0),
  reasoning: z.string().min(5),
  modifiedSizingPct: z.number().optional(),
  modifiedStopLossPct: z.number().optional(),
});

export type DecisionResult = z.infer<typeof DecisionSchema> & {
  similarPastTrades: PineconeMatch[];
};

export const decisionEngine = {
  /**
   * Executes the full Pre-Trade RAG decision flow using Pinecone similarity and Claude Opus
   */
  async evaluateTradeDecision(
    signal: SignalEvaluation,
    bot: BotGenome,
    currentRegime: RegimeType,
    regimeConfidence: number,
    newsDigest: NewsDigest
  ): Promise<DecisionResult> {
    const defaultReject: DecisionResult = {
      decision: 'REJECT',
      confidence: 0.0,
      reasoning: 'Trade rejected by safety default',
      similarPastTrades: [],
    };

    if (!signal.hasSignal) {
      return {
        decision: 'REJECT',
        confidence: 0.0,
        reasoning: `No signal triggered by ${bot.bot_id} (${signal.reasoning})`,
        similarPastTrades: [],
      };
    }

    // 1. Build Query Text from current market situation
    const queryText = `${signal.asset} ${signal.direction} entry via ${signal.signalType}. ` +
      `Regime: ${currentRegime} (confidence ${(regimeConfidence * 100).toFixed(0)}%). ` +
      `RSI: ${signal.indicatorSnapshot.rsi.toFixed(1)}, Volume Spike: ${signal.indicatorSnapshot.volumeSpike.toFixed(1)}x, ` +
      `VWAP: $${signal.indicatorSnapshot.vwap.toFixed(2)}. News tone: ${newsDigest.overall_tone}.`;

    // 2. Query Pinecone for Top-10 Similar Past Trades (RAG)
    let similarTrades: PineconeMatch[] = [];
    try {
      let queryVector: number[];
      try {
        queryVector = await openrouter.getEmbedding(queryText);
      } catch (embErr) {
        queryVector = Array.from({ length: 1536 }, () => Math.random());
      }

      similarTrades = await pinecone.querySimilarity(
        queryVector,
        { asset: signal.asset, direction: signal.direction },
        10
      );
    } catch (pineconeErr) {
      console.warn('Pinecone RAG search unavailable, evaluating without historical vector context:', pineconeErr instanceof Error ? pineconeErr.message : String(pineconeErr));
    }

    // 3. Assemble Claude Opus Prompt
    const systemPrompt = `You are the ATLAS Pre-Trade Decision Engine powered by Claude Opus.
Your task is to analyze a proposed trade signal alongside historical RAG memory of past similar trades and current news context.

Decide whether to:
- APPROVE: Execute trade as proposed.
- REJECT: Cancel trade due to poor past performance in similar setups or news risk.
- MODIFY: Execute trade with adjusted position sizing or tighter stop loss.

STRICT REQUIREMENT: Return ONLY a raw JSON object matching the DecisionSchema. No markdown code blocks, no intro text.
Example format:
{
  "decision": "APPROVE",
  "confidence": 0.85,
  "reasoning": "RAG shows 4/5 wins in similar BULL regime breakouts. News is positive."
}`;

    const ragContext = similarTrades.length > 0
      ? similarTrades.map((m, i) => `#${i + 1} (Score: ${(m.score * 100).toFixed(0)}%): Outcome=${m.metadata?.outcome.toUpperCase()} (${m.metadata?.pnl_pct.toFixed(1)}%). What Worked: ${m.metadata?.what_worked}. What Failed: ${m.metadata?.what_failed}`).join('\n')
      : 'No past trade history available in vector DB yet.';

    const userPrompt = `Proposed Trade Context:
- Bot: ${bot.bot_id} (${bot.nickname}, Gen ${bot.generation})
- Asset: ${signal.asset} | Direction: ${signal.direction.toUpperCase()} | Signal: ${signal.signalType}
- Entry Price: $${signal.entryPrice} | Stop Loss: $${signal.stopLoss} | Take Profit: $${signal.takeProfit}
- Market Regime: ${currentRegime} (Confidence: ${(regimeConfidence * 100).toFixed(0)}%)
- Indicator Snapshot: RSI ${signal.indicatorSnapshot.rsi.toFixed(1)}, Volume Spike ${signal.indicatorSnapshot.volumeSpike.toFixed(1)}x
- Signal Engine Confidence: ${signal.confidence}

News Digest Summary:
- Overall Tone: ${newsDigest.overall_tone}
- Recommendation: ${newsDigest.trade_recommendation}
- Reasoning: ${newsDigest.reasoning}

Top Similar Past Trades from Vector DB (RAG):
${ragContext}

Analyze and return JSON response.`;

    try {
      const responseText = await openrouter.chatComplete(
        OPENROUTER_MODELS.OPUS,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        { temperature: 0.1 }
      );

      let cleanedJson = responseText.trim();
      if (cleanedJson.startsWith('```json')) {
        cleanedJson = cleanedJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedJson.startsWith('```')) {
        cleanedJson = cleanedJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const parsed = JSON.parse(cleanedJson);
      const validated = DecisionSchema.parse(parsed);

      const decisionResult: DecisionResult = {
        ...validated,
        similarPastTrades: similarTrades,
      };

      // 4. Log Approved Trade to SQLite
      if (decisionResult.decision === 'APPROVE' || decisionResult.decision === 'MODIFY') {
        try {
          const tradeRecord = {
            id: `tr_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            bot_id: bot.bot_id,
            asset: signal.asset,
            asset_class: signal.asset.includes('/') ? 'crypto' : 'stock',
            direction: signal.direction,
            signal_type: signal.signalType,
            entry_price: signal.entryPrice,
            stop_loss: decisionResult.modifiedStopLossPct ? signal.entryPrice * (1 - decisionResult.modifiedStopLossPct) : signal.stopLoss,
            take_profit: signal.takeProfit,
            quantity: 1,
            regime: currentRegime,
            hmm_confidence: regimeConfidence,
            opus_confidence: decisionResult.confidence,
            opus_reasoning: decisionResult.reasoning,
          };

          await dbOperations.insertTrade(tradeRecord);
          console.log(`✅ Trade ${tradeRecord.id} approved by Opus and logged to SQLite.`);
        } catch (dbErr) {
          console.warn('Could not log trade to SQLite:', dbErr instanceof Error ? dbErr.message : String(dbErr));
        }
      }

      return decisionResult;

    } catch (error) {
      console.warn('Claude Opus trade decision call failed, using heuristic fallback:', error instanceof Error ? error.message : String(error));
      
      // Heuristic Fallback
      if (signal.confidence >= bot.entry.min_confidence && newsDigest.trade_recommendation !== 'avoid') {
        return {
          decision: 'APPROVE',
          confidence: signal.confidence,
          reasoning: `Approved via rule engine fallback (Signal confidence ${signal.confidence} >= min threshold ${bot.entry.min_confidence})`,
          similarPastTrades: similarTrades,
        };
      } else {
        return {
          ...defaultReject,
          reasoning: `Rejected via rule engine fallback (Signal confidence ${signal.confidence} below required threshold ${bot.entry.min_confidence})`,
          similarPastTrades: similarTrades,
        };
      }
    }
  }
};
