import { openrouter, OPENROUTER_MODELS } from './openrouter';
import { dbOperations } from './db';
import { z } from 'zod';

export type SentimentType = 'strong_bullish' | 'bullish' | 'neutral' | 'bearish' | 'strong_bearish';
export type UrgencyType = 'breaking' | 'normal' | 'background';

export interface NewsItem {
  id?: string;
  headline: string;
  source: string;
  asset: string; // 'BTC', 'ETH', 'NVDA', 'macro', etc.
  sentiment: SentimentType;
  urgency: UrgencyType;
  trade_relevant: boolean;
  published_at: string;
}

export interface NewsDigest {
  generated_at: string;
  lookback_hours: number;
  asset_filter: string[];
  overall_tone: SentimentType;
  items: NewsItem[];
  high_impact_events_next_4h: Array<{
    event: string;
    time: string;
    impact: 'high' | 'medium' | 'low';
  }>;
  trade_recommendation: 'proceed' | 'caution' | 'avoid';
  reasoning: string;
}

// Zod Schema for Haiku Classification Output
export const HaikuNewsClassificationSchema = z.object({
  items: z.array(z.object({
    headline: z.string(),
    asset: z.string(),
    sentiment: z.enum(['strong_bullish', 'bullish', 'neutral', 'bearish', 'strong_bearish']),
    urgency: z.enum(['breaking', 'normal', 'background']),
    trade_relevant: z.boolean(),
  })),
  overall_tone: z.enum(['strong_bullish', 'bullish', 'neutral', 'bearish', 'strong_bearish']),
  trade_recommendation: z.enum(['proceed', 'caution', 'avoid']),
  reasoning: z.string(),
});

export const newsEngine = {
  /**
   * Classifies raw headlines using Claude Haiku via OpenRouter
   */
  async classifyHeadlines(rawItems: Array<{ headline: string; source: string; published_at: string }>): Promise<NewsDigest> {
    const defaultDigest: NewsDigest = {
      generated_at: new Date().toISOString(),
      lookback_hours: 4,
      asset_filter: ['BTC', 'ETH', 'NVDA'],
      overall_tone: 'neutral',
      items: rawItems.map(r => ({
        headline: r.headline,
        source: r.source,
        asset: 'macro',
        sentiment: 'neutral',
        urgency: 'normal',
        trade_relevant: true,
        published_at: r.published_at,
      })),
      high_impact_events_next_4h: [],
      trade_recommendation: 'proceed',
      reasoning: 'Market news sentiment is neutral and stable.',
    };

    if (!rawItems || rawItems.length === 0) return defaultDigest;

    const prompt = `You are the ATLAS Market Intelligence News Classifier.
Analyze the following raw financial news headlines:
${JSON.stringify(rawItems, null, 2)}

Requirements:
1. For each headline, determine the target asset ('BTC', 'ETH', 'NVDA', 'macro', 'crypto_broad', 'stock_broad').
2. Classify sentiment: 'strong_bullish', 'bullish', 'neutral', 'bearish', or 'strong_bearish'.
3. Classify urgency: 'breaking', 'normal', or 'background'.
4. Set trade_relevant boolean.
5. Provide overall market tone and trade recommendation ('proceed', 'caution', 'avoid') with a 1-sentence reasoning.

Return ONLY a raw JSON object matching the required schema:
{
  "items": [{ "headline": "...", "asset": "...", "sentiment": "...", "urgency": "...", "trade_relevant": true }],
  "overall_tone": "neutral",
  "trade_recommendation": "proceed",
  "reasoning": "..."
}`;

    try {
      const responseText = await openrouter.chatComplete(
        OPENROUTER_MODELS.HAIKU,
        [{ role: 'user', content: prompt }],
        { temperature: 0.1 }
      );

      let cleanedJson = responseText.trim();
      if (cleanedJson.startsWith('```json')) {
        cleanedJson = cleanedJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedJson.startsWith('```')) {
        cleanedJson = cleanedJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const parsed = JSON.parse(cleanedJson);
      const validated = HaikuNewsClassificationSchema.parse(parsed);

      const classifiedItems: NewsItem[] = validated.items.map((item, idx) => ({
        headline: item.headline,
        source: rawItems[idx]?.source || 'Alpaca News',
        asset: item.asset,
        sentiment: item.sentiment,
        urgency: item.urgency,
        trade_relevant: item.trade_relevant,
        published_at: rawItems[idx]?.published_at || new Date().toISOString(),
      }));

      // Store in SQLite DB
      try {
        await dbOperations.insertNewsEvents(classifiedItems);
      } catch (dbErr) {
        console.warn('Could not persist news to SQLite:', dbErr instanceof Error ? dbErr.message : String(dbErr));
      }

      return {
        generated_at: new Date().toISOString(),
        lookback_hours: 4,
        asset_filter: Array.from(new Set(classifiedItems.map(i => i.asset))),
        overall_tone: validated.overall_tone,
        items: classifiedItems,
        high_impact_events_next_4h: [],
        trade_recommendation: validated.trade_recommendation,
        reasoning: validated.reasoning,
      };

    } catch (error) {
      console.warn('Haiku news classification failed, using fallback digest:', error instanceof Error ? error.message : String(error));
      return defaultDigest;
    }
  },

  /**
   * Checks if breaking strong bearish news exists for a specific asset
   */
  hasBreakingBearishNews(digest: NewsDigest, asset: string): boolean {
    return digest.items.some(
      item => (item.asset === asset || item.asset === 'crypto_broad' || item.asset === 'macro') &&
              (item.sentiment === 'strong_bearish' || item.sentiment === 'bearish') &&
              item.urgency === 'breaking'
    );
  }
};
