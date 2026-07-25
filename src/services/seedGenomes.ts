import { BotGenome } from '../types/genome';

export const SEED_GENOMES: BotGenome[] = [
  {
    bot_id: 'atlas_001',
    nickname: 'Momentum Hunter',
    generation: 1,
    parent_ids: [],
    birth_timestamp: new Date().toISOString(),
    created_by: 'seed',
    asset_universe: ['BTC/USD', 'ETH/USD', 'NVDA'],
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
      stop_loss_pct: 0.018, // 1.8% stop loss
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
  },
  {
    bot_id: 'atlas_002',
    nickname: 'Mean Reversion',
    generation: 1,
    parent_ids: [],
    birth_timestamp: new Date().toISOString(),
    created_by: 'seed',
    asset_universe: ['BTC/USD', 'ETH/USD'],
    preferred_timeframe: '1h',
    max_concurrent_positions: 2,
    entry: {
      primary_signal: 'mean_reversion',
      rsi_entry: 30,
      volume_mult: 1.2,
      vwap_deviation: 0.015,
      bb_squeeze: false,
      confluence_count: 2,
      news_sentiment: 'any',
      min_confidence: 0.65,
    },
    exit: {
      take_profit_rr: 2.0,
      stop_loss_pct: 0.015, // 1.5% stop loss
      trail_after_pct: 0.012,
      trail_distance: 0.008,
      max_hold_hours: 48,
      breakeven_at_pct: 0.008,
    },
    sizing: {
      base_pct: 10,
      confidence_scaling: true,
      max_pct: 20,
      kelly_enabled: false,
    },
    regime_filters: {
      active_in: ['NEUTRAL', 'BEAR'],
      size_mult: {
        CRASH: 0.0,
        BEAR: 0.5,
        NEUTRAL: 1.0,
        BULL: 0.75,
        EUPHORIA: 0.25,
      },
    },
  },
];
