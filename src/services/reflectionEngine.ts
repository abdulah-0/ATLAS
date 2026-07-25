import { z } from 'zod';
import { openrouter, OPENROUTER_MODELS } from './openrouter';
import { dbOperations } from './db';
import { PineconeMatch } from './pinecone';

export const ReflectionSchema = z.object({
  what_worked: z.string(),
  what_failed: z.string(),
  rule_update: z.string().nullable(),
  avoid_next_time: z.string().nullable(),
  summary: z.string(),
});

export type ReflectionResult = z.infer<typeof ReflectionSchema>;

export const reflectionEngine = {
  /**
   * Generates post-trade reflection analysis using Claude Sonnet via OpenRouter
   */
  async generateReflection(
    trade: {
      id: string;
      asset: string;
      direction: 'long' | 'short';
      entry_price: number;
      exit_price: number;
      pnl_pct: number;
      hold_duration_m: number;
      entry_conditions: string;
      outcome: 'win' | 'loss' | 'breakeven';
    },
    top3PastTrades: PineconeMatch[] = []
  ): Promise<ReflectionResult> {
    const defaultReflection: ReflectionResult = {
      what_worked: trade.outcome === 'win' ? 'Technical entry parameters aligned with momentum.' : 'Risk controls limited downside.',
      what_failed: trade.outcome === 'loss' ? 'Market trend reversed against signal direction.' : 'None',
      rule_update: null,
      avoid_next_time: trade.outcome === 'loss' ? 'Avoid trading into tight resistance levels.' : null,
      summary: `${trade.asset} ${trade.direction} closed with ${trade.pnl_pct >= 0 ? '+' : ''}${trade.pnl_pct.toFixed(2)}% P&L.`,
    };

    const pastTradesContext = top3PastTrades.length > 0
      ? top3PastTrades.slice(0, 3).map((m, i) => `#${i + 1}: Outcome=${m.metadata?.outcome.toUpperCase()} (${m.metadata?.pnl_pct.toFixed(1)}%). What Worked: ${m.metadata?.what_worked}. What Failed: ${m.metadata?.what_failed}`).join('\n')
      : 'No past trade comparison available.';

    const systemPrompt = `You are the ATLAS Post-Trade Reflection Engine powered by Claude Sonnet.
Your task is to conduct a concise reflection analysis on a closed trade.

In 4 sentences max, answer:
1. What was the single most important factor that determined the outcome?
2. What should this bot do differently next time in similar conditions?
3. Should any genome parameter change? If yes, which one and how?
4. One-line summary for the trade log.

STRICT REQUIREMENT: Return ONLY a raw JSON object matching the ReflectionSchema:
{
  "what_worked": "...",
  "what_failed": "...",
  "rule_update": null or "Increase RSI threshold from 60 to 65",
  "avoid_next_time": "...",
  "summary": "..."
}`;

    const userPrompt = `Closed Trade Details:
- Asset: ${trade.asset} | Direction: ${trade.direction.toUpperCase()}
- Entry Price: $${trade.entry_price} | Exit Price: $${trade.exit_price}
- P&L: ${trade.pnl_pct >= 0 ? '+' : ''}${trade.pnl_pct.toFixed(2)}% | Hold Duration: ${trade.hold_duration_m} minutes
- Signal Conditions at Entry: ${trade.entry_conditions}
- Outcome: ${trade.outcome.toUpperCase()}

The 3 Most Similar Past Trades:
${pastTradesContext}

Analyze and return JSON response.`;

    try {
      const responseText = await openrouter.chatComplete(
        OPENROUTER_MODELS.SONNET,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        { temperature: 0.2 }
      );

      let cleanedJson = responseText.trim();
      if (cleanedJson.startsWith('```json')) {
        cleanedJson = cleanedJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedJson.startsWith('```')) {
        cleanedJson = cleanedJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const parsed = JSON.parse(cleanedJson);
      const validated = ReflectionSchema.parse(parsed);

      // Store reflection in SQLite
      try {
        await dbOperations.closeTrade(
          trade.id,
          trade.exit_price,
          (trade.exit_price - trade.entry_price) * (trade.direction === 'long' ? 1 : -1),
          trade.pnl_pct,
          validated.what_worked,
          validated.what_failed,
          validated.rule_update
        );
      } catch (dbErr) {
        console.warn('Could not update trade reflection in SQLite:', dbErr instanceof Error ? dbErr.message : String(dbErr));
      }

      return validated;

    } catch (error) {
      console.warn('Claude Sonnet reflection call failed, using default reflection:', error instanceof Error ? error.message : String(error));
      return defaultReflection;
    }
  }
};
