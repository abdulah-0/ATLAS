import { z } from 'zod';

export const SignalTypeEnum = z.enum([
  'momentum_breakout',
  'mean_reversion',
  'vwap_reversion',
  'bb_squeeze_break',
  'volume_spike',
  'news_momentum',
  'insider_follow',
  'gap_and_go',
  'orb',
]);

export const TimeFrameEnum = z.enum(['1min', '5min', '15min', '1h', '4h', '1d']);

export const RegimeTypeEnum = z.enum(['CRASH', 'BEAR', 'NEUTRAL', 'BULL', 'EUPHORIA']);

export const EntryRulesSchema = z.object({
  primary_signal: SignalTypeEnum,
  rsi_entry: z.number().min(5).max(95),
  volume_mult: z.number().min(0.5).max(10.0),
  vwap_deviation: z.number().min(0.0).max(0.10),
  bb_squeeze: z.boolean(),
  confluence_count: z.number().min(1).max(4),
  news_sentiment: z.enum(['positive', 'neutral_or_positive', 'any']),
  min_confidence: z.number().min(0.0).max(1.0),
});

export const ExitRulesSchema = z.object({
  take_profit_rr: z.number().min(0.5).max(10.0),
  stop_loss_pct: z.number().min(0.005).max(0.10), // 0.5% to 10%
  trail_after_pct: z.number().min(0.005).max(0.10),
  trail_distance: z.number().min(0.002).max(0.05),
  max_hold_hours: z.number().min(1).max(168),
  breakeven_at_pct: z.number().min(0.005).max(0.05),
});

export const SizingRulesSchema = z.object({
  base_pct: z.number().min(1).max(20),
  confidence_scaling: z.boolean(),
  max_pct: z.number().min(5).max(20), // Max 20% per PRD hard limit
  kelly_enabled: z.boolean(),
});

export const RegimeFilterSchema = z.object({
  active_in: z.array(RegimeTypeEnum).min(1),
  size_mult: z.record(RegimeTypeEnum, z.number().min(0).max(1.5)).optional().default({
    CRASH: 0.0,
    BEAR: 0.25,
    NEUTRAL: 0.75,
    BULL: 1.0,
    EUPHORIA: 0.5,
  }),
});

export const BotGenomeSchema = z.object({
  bot_id: z.string().min(3),
  nickname: z.string().min(2),
  generation: z.number().int().min(1),
  parent_ids: z.array(z.string()).default([]),
  birth_timestamp: z.string(),
  created_by: z.enum(['opus', 'mutation', 'crossover', 'seed']),
  asset_universe: z.array(z.string()).min(1),
  preferred_timeframe: TimeFrameEnum,
  max_concurrent_positions: z.number().int().min(1).max(3),
  entry: EntryRulesSchema,
  exit: ExitRulesSchema,
  sizing: SizingRulesSchema,
  regime_filters: RegimeFilterSchema,
});

export type BotGenomeValidated = z.infer<typeof BotGenomeSchema>;
