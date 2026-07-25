import { RegimeType } from '../services/regime';

export type SignalType =
  | 'momentum_breakout'
  | 'mean_reversion'
  | 'vwap_reversion'
  | 'bb_squeeze_break'
  | 'volume_spike'
  | 'news_momentum'
  | 'insider_follow'
  | 'gap_and_go'
  | 'orb';

export type TimeFrame = '1min' | '5min' | '15min' | '1h' | '4h' | '1d';

export type BotStatus = 'probation' | 'active' | 'champion' | 'dead';

export interface EntryRules {
  primary_signal: SignalType;
  rsi_entry: number; // e.g. 10–40 for oversold, 60–90 for overbought
  volume_mult: number; // min volume vs 20-bar average (e.g. 1.5)
  vwap_deviation: number; // min % deviation from VWAP (e.g. 0.01 = 1%)
  bb_squeeze: boolean; // require Bollinger squeeze before entry
  confluence_count: number; // conditions aligned (1–4)
  news_sentiment: 'positive' | 'neutral_or_positive' | 'any';
  min_confidence: number; // 0.0–1.0 from Opus scorer
}

export interface ExitRules {
  take_profit_rr: number; // risk:reward ratio e.g. 2.5
  stop_loss_pct: number; // e.g. 0.018 = 1.8%
  trail_after_pct: number; // activate trailing stop after X% profit
  trail_distance: number; // trailing stop distance in %
  max_hold_hours: number; // force close after N hours
  breakeven_at_pct: number; // move stop to entry after X% profit
}

export interface SizingRules {
  base_pct: number; // base % of bot allocation per trade (e.g. 10)
  confidence_scaling: boolean; // scale size by Opus confidence score
  max_pct: number; // hard cap % of bot allocation (max 20%)
  kelly_enabled: boolean;
}

export interface RegimeFilter {
  active_in: RegimeType[];
  size_mult: Partial<Record<RegimeType, number>>;
}

export interface BotGenome {
  bot_id: string; // e.g. 'atlas_001'
  nickname: string; // e.g. 'Momentum Hunter'
  generation: number; // starts at 1
  parent_ids: string[]; // empty for Gen 1, 1-2 parents thereafter
  birth_timestamp: string; // ISO 8601
  created_by: 'opus' | 'mutation' | 'crossover' | 'seed';

  // Asset Universe
  asset_universe: string[]; // ['BTC/USD', 'ETH/USD', 'NVDA']
  preferred_timeframe: TimeFrame;
  max_concurrent_positions: number; // 1–3

  // Core Rules
  entry: EntryRules;
  exit: ExitRules;
  sizing: SizingRules;
  regime_filters: RegimeFilter;
}

export interface BotHealth {
  bot_id: string;
  compositeScore: number; // 0–100 composite health score
  winRate: number; // percentage e.g. 55.4
  profitFactor: number; // gross profit / gross loss e.g. 1.85
  currentDrawdown: number; // percentage e.g. 4.2
  consecutiveLosses: number; // count
  totalTrades: number;
  sharpe30d: number;
  triggersHit: ('consecutive_losses' | 'win_rate' | 'drawdown')[];
  isChampion: boolean;
  probationTradesRemaining?: number; // 0 to 20
}
