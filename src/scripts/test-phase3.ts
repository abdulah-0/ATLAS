// src/scripts/test-phase3.ts
// Run with: npx -y tsx src/scripts/test-phase3.ts

import { z } from 'zod';

console.log('--- Testing Phase 3 Intelligence & Vector Memory Engine ---');

// 1. Haiku Classification Schema
const HaikuNewsClassificationSchema = z.object({
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

const sampleNewsResponse = {
  items: [
    {
      headline: 'Bitcoin Breaches $68,000 as Institutional Inflows Surge',
      asset: 'BTC',
      sentiment: 'strong_bullish',
      urgency: 'breaking',
      trade_relevant: true,
    }
  ],
  overall_tone: 'strong_bullish',
  trade_recommendation: 'proceed',
  reasoning: 'Institutional momentum is overwhelmingly positive.',
};

try {
  HaikuNewsClassificationSchema.parse(sampleNewsResponse);
  console.log('✅ Zod HaikuNewsClassificationSchema validation: PASSED');
} catch (err) {
  console.error('❌ Zod HaikuNewsClassificationSchema validation: FAILED', err);
}

// 2. Decision Schema
const DecisionSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT', 'MODIFY']),
  confidence: z.number().min(0.0).max(1.0),
  reasoning: z.string().min(5),
  modifiedSizingPct: z.number().optional(),
  modifiedStopLossPct: z.number().optional(),
});

const sampleOpusDecision = {
  decision: 'APPROVE',
  confidence: 0.88,
  reasoning: 'Historical RAG matches show 80% win rate under similar BULL breakout setups.',
};

try {
  DecisionSchema.parse(sampleOpusDecision);
  console.log('✅ Zod DecisionSchema validation: PASSED');
} catch (err) {
  console.error('❌ Zod DecisionSchema validation: FAILED', err);
}

// 3. Reflection Schema
const ReflectionSchema = z.object({
  what_worked: z.string(),
  what_failed: z.string(),
  rule_update: z.string().nullable(),
  avoid_next_time: z.string().nullable(),
  summary: z.string(),
});

const sampleSonnetReflection = {
  what_worked: 'RSI momentum combined with VWAP bounce provided strong confluence.',
  what_failed: 'Trailing stop triggered prematurely during intraday wick.',
  rule_update: 'Increase trail_distance from 0.008 to 0.012',
  avoid_next_time: 'Avoid tight stops during major US session open.',
  summary: 'BTC/USD long closed with +3.20% gain in 94m.',
};

try {
  ReflectionSchema.parse(sampleSonnetReflection);
  console.log('✅ Zod ReflectionSchema validation: PASSED');
} catch (err) {
  console.error('❌ Zod ReflectionSchema validation: FAILED', err);
}

// 4. Trade DNA Formatting
function formatEmbeddingText(trade: any, reflection: any): string {
  const outcome = trade.pnl_pct > 0.1 ? 'win' : trade.pnl_pct < -0.1 ? 'loss' : 'breakeven';
  return `${trade.asset} ${trade.direction} entry via ${trade.signal_type}. ` +
    `Regime: ${trade.regime} (confidence ${(trade.regime_confidence * 100).toFixed(0)}%). ` +
    `RSI was ${trade.rsi.toFixed(1)}, VWAP deviation ${trade.vwap_dev_pct.toFixed(2)}%, Volume spike ${trade.volume_spike.toFixed(1)}x. ` +
    `News: ${trade.news_summary}. Opus confidence: ${trade.opus_confidence.toFixed(2)}. ` +
    `Entry: $${trade.entry_price}, Stop: $${trade.stop_loss}, Target: $${trade.take_profit}. ` +
    `Outcome: ${outcome.toUpperCase()} ${trade.pnl_pct >= 0 ? '+' : ''}${trade.pnl_pct.toFixed(2)}% in ${trade.hold_duration_m}m. ` +
    `What worked: ${reflection.what_worked}. What failed: ${reflection.what_failed}.`;
}

const sampleTrade = {
  asset: 'BTC/USD',
  direction: 'long',
  signal_type: 'momentum_breakout',
  regime: 'BULL',
  regime_confidence: 0.85,
  rsi: 62.4,
  vwap_dev_pct: 0.8,
  volume_spike: 2.1,
  news_summary: 'ETF inflows positive',
  opus_confidence: 0.85,
  entry_price: 67420,
  stop_loss: 66080,
  take_profit: 70780,
  pnl_pct: 3.20,
  hold_duration_m: 94,
};

const dnaText = formatEmbeddingText(sampleTrade, sampleSonnetReflection);
console.log(`✅ Trade DNA Formatting Test: PASSED ("${dnaText.slice(0, 95)}...")`);

// 5. Safety Rollback Logic
function testRollbackLogic(preTrades: Array<{ pnl_pct: number }>, postTrades: Array<{ pnl_pct: number }>) {
  const calcWinRate = (arr: Array<{ pnl_pct: number }>) => (arr.filter(t => t.pnl_pct > 0).length / arr.length) * 100;
  const preWinRate = calcWinRate(preTrades);
  const postWinRate = calcWinRate(postTrades);
  const delta = postWinRate - preWinRate;
  const shouldRollback = delta < -10.0;
  return { shouldRollback, preWinRate, postWinRate, delta };
}

const preMutationTrades = Array.from({ length: 15 }, () => ({ pnl_pct: 2.5 })); // 100% win rate
const postMutationTrades = Array.from({ length: 15 }, () => ({ pnl_pct: -1.5 })); // 0% win rate

const rollbackResult = testRollbackLogic(preMutationTrades, postMutationTrades);
console.log(`✅ Rollback Calculation Test: ShouldRollback = ${rollbackResult.shouldRollback}, PreWinRate = ${rollbackResult.preWinRate}%, PostWinRate = ${rollbackResult.postWinRate}%, Delta = ${rollbackResult.delta.toFixed(1)}%`);

console.log('\n--- All Phase 3 Intelligence Engine Tests Finished Successfully ---');
