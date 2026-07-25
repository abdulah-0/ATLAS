// src/scripts/test-phase2.ts
// Run with: npx ts-node src/scripts/test-phase2.ts

import { BotGenomeSchema } from '../schemas/genomeSchema';
import { deathMonitor } from '../services/deathMonitor';
import { probationManager } from '../services/probation';
import { indicators } from '../services/indicators';
import { signalEngine } from '../services/signals';
import { BotGenome } from '../types/genome';

// Mock Seed Genome
const seedGenome: BotGenome = {
  bot_id: 'atlas_001',
  nickname: 'Momentum Hunter',
  generation: 1,
  parent_ids: [],
  birth_timestamp: new Date().toISOString(),
  created_by: 'seed',
  asset_universe: ['BTC/USD', 'ETH/USD'],
  preferred_timeframe: '15min',
  max_concurrent_positions: 2,
  entry: {
    primary_signal: 'momentum_breakout',
    rsi_entry: 60,
    volume_mult: 1.5,
    vwap_deviation: 0.005,
    bb_squeeze: true,
    confluence_count: 2,
    news_sentiment: 'neutral_or_positive',
    min_confidence: 0.70,
  },
  exit: {
    take_profit_rr: 2.5,
    stop_loss_pct: 0.018,
    trail_after_pct: 0.015,
    trail_distance: 0.01,
    max_hold_hours: 24,
    breakeven_at_pct: 0.01,
  },
  sizing: {
    base_pct: 10,
    confidence_scaling: true,
    max_pct: 20,
    kelly_enabled: false,
  },
  regime_filters: {
    active_in: ['NEUTRAL', 'BULL', 'EUPHORIA'],
    size_mult: {
      CRASH: 0.0,
      BEAR: 0.25,
      NEUTRAL: 0.75,
      BULL: 1.0,
      EUPHORIA: 0.5,
    },
  },
};

console.log('--- Testing Phase 2 Core Engine Components ---');

// 1. Validate Seed Genome Schema
try {
  BotGenomeSchema.parse(seedGenome);
  console.log('✅ Zod BotGenomeSchema validation: PASSED');
} catch (err) {
  console.error('❌ Zod BotGenomeSchema validation: FAILED', err);
}

// 2. Test Indicators Calculation
const mockBars = Array.from({ length: 50 }, (_, i) => ({
  t: new Date().toISOString(),
  o: 60000 + i * 10,
  h: 60050 + i * 10,
  l: 59950 + i * 10,
  c: 60020 + i * 10,
  v: 1000 + i * 20,
}));

const rsi = indicators.calculateRsi(mockBars);
const vwap = indicators.calculateVwap(mockBars);
const bb = indicators.calculateBollingerBands(mockBars);
console.log(`✅ Indicator Engine Test: RSI = ${rsi}, VWAP = $${vwap}, BB Upper = $${bb.upper}, Squeeze = ${bb.isSqueeze}`);

// 3. Test Signal Evaluation
const signalEval = signalEngine.evaluateSignal(seedGenome, 'BTC/USD', mockBars, 'BULL');
console.log(`✅ Signal Evaluation Engine Test: HasSignal = ${signalEval.hasSignal}, Confidence = ${signalEval.confidence}, Reasoning = "${signalEval.reasoning}"`);

// 4. Test Death Monitor Logic
const healthyResult = deathMonitor.evaluateHealth('atlas_001', {
  consecutiveLosses: 1,
  winRate: 60,
  totalTrades: 30,
  currentDrawdown: 3.5,
  sharpe30d: 2.1,
}, true);

console.log(`✅ Death Monitor Healthy Test: Composite Score = ${healthyResult.compositeScore}, IsDead = ${healthyResult.isDead}`);

const deadResult = deathMonitor.evaluateHealth('atlas_002', {
  consecutiveLosses: 5,
  winRate: 35,
  totalTrades: 22,
  currentDrawdown: 16.2,
  sharpe30d: -0.5,
}, false);

console.log(`✅ Death Monitor Triggered Test: IsDead = ${deadResult.isDead}, Reasons = [${deadResult.deathReasons.join('; ')}]`);

// 5. Test Probation Logic
const probationActive = probationManager.evaluateProbation('atlas_002', 12, 58, 1.6);
console.log(`✅ Probation Progress Check: Action = ${probationActive.action}, Trades Remaining = ${probationActive.tradesRemaining}`);

const probationPromoted = probationManager.evaluateProbation('atlas_002', 20, 52, 1.4);
console.log(`✅ Probation Promotion Check: Action = ${probationPromoted.action}, Reason = "${probationPromoted.reason}"`);

console.log('\n--- All Phase 2 Core Engine Tests Finished Successfully ---');
