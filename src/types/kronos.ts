export type ForecastDirection = 'UP' | 'DOWN' | 'NEUTRAL';
export type VolatilityRegime = 'LOW' | 'NORMAL' | 'HIGH' | 'EXTREME';
export type TimeFrame = '1min' | '5min' | '15min' | '1h' | '4h' | '1d';

export interface OHLCVBar {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface ForecastBar {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface KronosForecast {
  asset: string;
  timeframe: string;
  pred_len: number;
  forecast_bars: ForecastBar[];

  // Directional signal
  direction: ForecastDirection;
  direction_confidence: number; // 0.0–1.0
  predicted_change_pct: number; // + = up, - = down

  // Range prediction
  predicted_high_pct: number; // % above current close
  predicted_low_pct: number; // % below current close (negative)

  // Volatility
  volatility_score: number; // 0.0–1.0
  volatility_regime: VolatilityRegime;
  peak_volatility_bar: number;

  // Confidence
  forecast_confidence: number; // 0.0–1.0
  path_agreement: number; // 0.0–1.0

  // Meta
  model_used: string;
  inference_ms: number;
  bars_used: number;
}

export interface ForecastRequest {
  asset: string;
  timeframe: TimeFrame;
  bars: OHLCVBar[];
  pred_len?: number;
  sample_count?: number;
}

export interface StoredForecast {
  id: string;
  trade_id?: string;
  asset: string;
  timeframe: string;
  direction: ForecastDirection;
  direction_confidence: number;
  predicted_change_pct: number;
  volatility_regime: VolatilityRegime;
  forecast_confidence: number;
  actual_change_pct?: number;
  was_correct?: boolean;
  requested_at: string;
  responded_at: string;
  latency_ms: number;
}
