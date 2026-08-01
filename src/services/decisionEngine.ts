import { z } from 'zod';
import { openrouter } from './openrouter';
import { pinecone, PineconeMatch } from './pinecone';
import { dbOperations } from './db';
import { SignalEvaluation } from './signals';
import { BotGenome } from '../types/genome';
import { NewsDigest } from './newsEngine';
import { RegimeType } from './regime';
import { kronosClient } from './kronosClient';
import { KronosForecast } from '../types/kronos';
import { logger } from './logger';

export const DecisionSchema = z.object({
  bull_case: z.string().optional(),
  bear_case: z.string().optional(),
  risk_flags: z.array(z.string()).optional(),
  action: z.enum(['APPROVE', 'REJECT', 'MODIFY']),
  confidence: z.number().min(0.0).max(1.0),
  reasoning: z.string().min(5),
  position_size_modifier: z.number().optional(),
  modified_stop: z.number().nullable().optional(),
  reject_reason: z.string().nullable().optional(),
  kronos_alignment: z.enum(['CONFIRMS', 'CONTRADICTS', 'NEUTRAL', 'UNAVAILABLE']).optional(),
});

export type DecisionResult = z.infer<typeof DecisionSchema> & {
  similarPastTrades: PineconeMatch[];
  kronosForecast?: KronosForecast | null;
};

export const decisionEngine = {
  async evaluateTradeDecision(
    signal: SignalEvaluation,
    bot: BotGenome,
    currentRegime: RegimeType,
    regimeConfidence: number,
    newsDigest: NewsDigest
  ): Promise<DecisionResult> {
    const defaultReject: DecisionResult = {
      action: 'REJECT',
      confidence: 0.0,
      reasoning: 'Trade rejected by safety default',
      similarPastTrades: [],
      kronos_alignment: 'UNAVAILABLE',
    };

    if (!signal.hasSignal) {
      logger.tradeRejected('N/A', bot.bot_id, signal.asset, `No signal triggered (${signal.reasoning})`);
      return {
        action: 'REJECT',
        confidence: 0.0,
        reasoning: `No signal triggered by ${bot.bot_id} (${signal.reasoning})`,
        similarPastTrades: [],
        kronos_alignment: 'UNAVAILABLE',
      };
    }

    // 1. Query Kronos Forecast (Non-blocking fallback to null)
    let kronosForecast: KronosForecast | null = null;
    try {
      kronosForecast = await kronosClient.forecast({
        asset: signal.asset,
        timeframe: bot.preferred_timeframe || '15min',
        bars: [], // Kronos client handles fetching from cache
        pred_len: 24,
        sample_count: 5,
      });
    } catch (kErr) {
      console.warn('Kronos forecast query fallback to null:', kErr);
    }

    // 2. Query Pinecone for Top-10 Similar Past Trades (RAG)
    const queryText = `${signal.asset} ${signal.direction} entry via ${signal.signalType}. ` +
      `Regime: ${currentRegime} (confidence ${(regimeConfidence * 100).toFixed(0)}%). ` +
      `News tone: ${newsDigest.overall_tone}. Kronos direction: ${kronosForecast?.direction || 'N/A'}.`;

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
      console.warn('Pinecone RAG search unavailable, evaluating without historical vector context:', pineconeErr);
    }

    // 3. Assemble 4-Stage Bull/Bear/Risk Internal Debate System Prompt
    const systemPrompt = `You are the ATLAS trade decision engine. Evaluate this trade signal.
You will reason through this in three internal stages — BULL CASE, BEAR CASE, RISK ASSESSMENT — before reaching a VERDICT.
Each stage must be argued honestly as if you were three different analysts.

Return ONLY this JSON object format:
{
  "bull_case": "2-3 sentence strongest case for the trade",
  "bear_case": "2-3 sentence strongest case against the trade",
  "risk_flags": ["array of hard-rule or risk concerns"],
  "action": "APPROVE" | "REJECT" | "MODIFY",
  "confidence": 0.0-1.0,
  "reasoning": "1-2 sentence synthesis explaining how bull vs bear was resolved",
  "position_size_modifier": 0.5-1.0,
  "modified_stop": null | number,
  "reject_reason": null | string,
  "kronos_alignment": "CONFIRMS" | "CONTRADICTS" | "NEUTRAL" | "UNAVAILABLE"
}`;

    const kronosSection = kronosForecast
      ? `=== KRONOS DEEP-LEARNING FORECAST ===
Model: ${kronosForecast.model_used} | Timeframe: ${kronosForecast.timeframe} | Pred len: ${kronosForecast.pred_len}
Direction: ${kronosForecast.direction} (Confidence: ${(kronosForecast.direction_confidence * 100).toFixed(0)}%)
Predicted change: ${kronosForecast.predicted_change_pct > 0 ? '+' : ''}${kronosForecast.predicted_change_pct.toFixed(2)}%
Predicted range: Low ${kronosForecast.predicted_low_pct.toFixed(2)}% to High +${kronosForecast.predicted_high_pct.toFixed(2)}%
Volatility Regime: ${kronosForecast.volatility_regime} (Score: ${(kronosForecast.volatility_score * 100).toFixed(0)}/100)
Forecast Confidence: ${(kronosForecast.forecast_confidence * 100).toFixed(0)}%`
      : `=== KRONOS DEEP-LEARNING FORECAST ===
Kronos model unavailable — proceed on technical indicators and news alone.`;

    const ragContext = similarTrades.length > 0
      ? similarTrades.map((m, i) => `#${i + 1} (Score: ${(m.score * 100).toFixed(0)}%): Outcome=${m.metadata?.outcome.toUpperCase()} (${m.metadata?.pnl_pct.toFixed(1)}%). What Worked: ${m.metadata?.what_worked}. What Failed: ${m.metadata?.what_failed}`).join('\n')
      : 'No past trade history available in vector DB yet.';

    const userPrompt = `=== CURRENT MARKET CONTEXT ===
Asset: ${signal.asset} | Direction: ${signal.direction.toUpperCase()} | Signal: ${signal.signalType}
Regime: ${currentRegime} (Confidence: ${(regimeConfidence * 100).toFixed(0)}%)
Entry Price: $${signal.entryPrice} | Stop Loss: $${signal.stopLoss} | Take Profit: $${signal.takeProfit}
Indicator Snapshot: RSI ${signal.indicatorSnapshot.rsi.toFixed(1)}, Volume Spike ${signal.indicatorSnapshot.volumeSpike.toFixed(1)}x

${kronosSection}

=== NEWS CONTEXT (last 4h) ===
Tone: ${newsDigest.overall_tone} | Recommendation: ${newsDigest.trade_recommendation}
Reasoning: ${newsDigest.reasoning}

=== 10 MOST SIMILAR PAST TRADES (RAG Memory) ===
${ragContext}

Perform the 3-stage internal debate (Bull Case, Bear Case, Risk Assessment) and return JSON.`;

    try {
      const selectedModel = openrouter.getModelForTask('tradeDecision');
      const responseText = await openrouter.chatComplete(
        selectedModel,
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
        kronosForecast,
      };

      const tradeId = `tr_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      if (decisionResult.action === 'APPROVE' || decisionResult.action === 'MODIFY') {
        try {
          const tradeRecord = {
            id: tradeId,
            bot_id: bot.bot_id,
            asset: signal.asset,
            asset_class: signal.asset.includes('/') ? 'crypto' : 'stock',
            direction: signal.direction,
            signal_type: signal.signalType,
            entry_price: signal.entryPrice,
            stop_loss: decisionResult.modified_stop ?? signal.stopLoss,
            take_profit: signal.takeProfit,
            quantity: 1,
            regime: currentRegime,
            hmm_confidence: regimeConfidence,
            opus_confidence: decisionResult.confidence,
            opus_reasoning: decisionResult.reasoning,
            bull_case: decisionResult.bull_case,
            bear_case: decisionResult.bear_case,
            risk_flags: decisionResult.risk_flags ? JSON.stringify(decisionResult.risk_flags) : null,
            kronos_alignment: decisionResult.kronos_alignment,
          };

          await dbOperations.insertTrade(tradeRecord);
          logger.tradeApproved(tradeId, bot.bot_id, signal.asset, decisionResult);
        } catch (dbErr) {
          console.warn('Could not log trade to SQLite:', dbErr);
        }
      } else {
        logger.tradeRejected(tradeId, bot.bot_id, signal.asset, decisionResult.reject_reason || decisionResult.reasoning);
      }

      return decisionResult;

    } catch (error) {
      console.warn('Opus trade decision call failed, using heuristic fallback:', error);
      
      const isApproved = signal.confidence >= (bot.entry?.min_confidence || 0.7) && newsDigest.trade_recommendation !== 'avoid';
      const fallbackResult: DecisionResult = {
        action: isApproved ? 'APPROVE' : 'REJECT',
        confidence: signal.confidence,
        reasoning: isApproved
          ? `Approved via rule engine fallback (Signal confidence ${signal.confidence} >= min threshold)`
          : `Rejected via rule engine fallback (Signal confidence ${signal.confidence} below threshold)`,
        similarPastTrades: similarTrades,
        kronos_alignment: kronosForecast ? (kronosForecast.direction.toLowerCase() === signal.direction.toLowerCase() ? 'CONFIRMS' : 'CONTRADICTS') : 'UNAVAILABLE',
      };

      if (isApproved) {
        logger.tradeApproved('tr_fallback', bot.bot_id, signal.asset, fallbackResult);
      } else {
        logger.tradeRejected('tr_fallback', bot.bot_id, signal.asset, fallbackResult.reasoning);
      }

      return fallbackResult;
    }
  }
};
