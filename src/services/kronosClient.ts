import { secureStore, SECURE_KEYS } from './secureStore';
import { KronosForecast, ForecastRequest, StoredForecast } from '../types/kronos';
import { dbOperations } from './db';
import { logger } from './logger';

const DEFAULT_KRONOS_URL = 'https://atlas-kronos.onrender.com';
const REQUEST_TIMEOUT_MS = 15000;

export class KronosClient {
  private apiKey: string | null = null;
  private keepAliveInterval: ReturnType<typeof setInterval> | null = null;

  async init(): Promise<void> {
    try {
      this.apiKey = await secureStore.getItem(SECURE_KEYS.PINECONE_API_KEY); // Using secureStore fallback or dedicated key
    } catch (e) {
      console.log('Kronos client initialized without API key');
    }
  }

  startKeepAlive(): void {
    if (this.keepAliveInterval) return;
    this.keepAliveInterval = setInterval(async () => {
      try {
        await fetch(`${DEFAULT_KRONOS_URL}/ping`, { method: 'GET' });
      } catch (e) {
        // Best-effort ping
      }
    }, 10 * 60 * 1000);
  }

  stopKeepAlive(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  async forecast(req: ForecastRequest): Promise<KronosForecast | null> {
    const requestedAt = new Date().toISOString();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const resp = await fetch(`${DEFAULT_KRONOS_URL}/forecast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-ATLAS-Key': this.apiKey || '',
        },
        body: JSON.stringify({
          asset: req.asset,
          timeframe: req.timeframe,
          bars: req.bars.slice(-400),
          pred_len: req.pred_len ?? 24,
          sample_count: req.sample_count ?? 5,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!resp.ok) {
        console.warn(`[Kronos] HTTP ${resp.status}`);
        return null;
      }

      const forecast: KronosForecast = await resp.json();
      const respondedAt = new Date().toISOString();

      const stored: StoredForecast = {
        id: `kf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        asset: forecast.asset,
        timeframe: forecast.timeframe,
        direction: forecast.direction,
        direction_confidence: forecast.direction_confidence,
        predicted_change_pct: forecast.predicted_change_pct,
        volatility_regime: forecast.volatility_regime,
        forecast_confidence: forecast.forecast_confidence,
        requested_at: requestedAt,
        responded_at: respondedAt,
        latency_ms: forecast.inference_ms || 1200,
      };

      await dbOperations.logKronosForecast(stored);
      logger.kronosForecast(forecast.asset, forecast.direction, forecast.direction_confidence, forecast.predicted_change_pct);

      return forecast;
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        console.warn('[Kronos] Request timed out after 15s');
      } else {
        console.warn('[Kronos] Call unavailable, falling back gracefully');
      }
      return null;
    }
  }

  async forecastBatch(requests: ForecastRequest[]): Promise<Map<string, KronosForecast>> {
    const results = new Map<string, KronosForecast>();
    if (requests.length === 0) return results;

    try {
      const resp = await fetch(`${DEFAULT_KRONOS_URL}/forecast/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-ATLAS-Key': this.apiKey || '',
        },
        body: JSON.stringify(
          requests.map(r => ({
            ...r,
            bars: r.bars.slice(-400),
          }))
        ),
      });
      if (!resp.ok) return results;
      const batch: (KronosForecast | { error: string; asset: string })[] = await resp.json();
      for (const item of batch) {
        if ('error' in item) continue;
        results.set(item.asset, item as KronosForecast);
      }
    } catch (err) {
      console.warn('[Kronos] Batch call failed:', err);
    }
    return results;
  }
}

export const kronosClient = new KronosClient();
