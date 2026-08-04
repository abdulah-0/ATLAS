import AsyncStorage from '@react-native-async-storage/async-storage';
import { withBackoff } from './backoff';
import { logger } from './logger';

export interface ServiceLimitConfig {
  requestsPerMinute: number;
  maxConcurrent: number;
  dailyCostCapUsd?: number;
}

export const SERVICE_LIMITS: Record<string, ServiceLimitConfig> = {
  openrouter_premium:  { requestsPerMinute: 20, maxConcurrent: 2, dailyCostCapUsd: 8.0 },
  openrouter_cheap:    { requestsPerMinute: 30, maxConcurrent: 3, dailyCostCapUsd: 2.0 },
  openrouter_free:     { requestsPerMinute: 10, maxConcurrent: 3 },
  alpaca_trading:      { requestsPerMinute: 180, maxConcurrent: 4 },
  alpaca_data:         { requestsPerMinute: 180, maxConcurrent: 4 },
  kronos:              { requestsPerMinute: 20, maxConcurrent: 2 },
  pinecone:            { requestsPerMinute: 60, maxConcurrent: 3 },
  news_alpaca:         { requestsPerMinute: 30, maxConcurrent: 2 },
  news_cryptopanic:    { requestsPerMinute: 10, maxConcurrent: 1 },
  news_newsapi:        { requestsPerMinute: 5, maxConcurrent: 1 },
  news_finnhub:        { requestsPerMinute: 30, maxConcurrent: 2 },
  news_rss:            { requestsPerMinute: 20, maxConcurrent: 2 },
  news_feargreed:      { requestsPerMinute: 6, maxConcurrent: 1 },
};

class TokenBucket {
  private capacity: number;
  private tokens: number;
  private fillRate: number;
  private lastFill: number;

  constructor(requestsPerMinute: number) {
    this.capacity = requestsPerMinute;
    this.tokens = requestsPerMinute;
    this.fillRate = requestsPerMinute / 60.0;
    this.lastFill = Date.now();
  }

  async waitForToken(): Promise<void> {
    const now = Date.now();
    const deltaSec = (now - this.lastFill) / 1000.0;
    this.tokens = Math.min(this.capacity, this.tokens + deltaSec * this.fillRate);
    this.lastFill = now;

    if (this.tokens >= 1.0) {
      this.tokens -= 1.0;
      return;
    }

    const waitMs = Math.max(100, Math.ceil(((1.0 - this.tokens) / this.fillRate) * 1000));
    await new Promise(resolve => setTimeout(resolve, waitMs));
    return this.waitForToken();
  }
}

class CircuitBreaker {
  private failureCount = 0;
  private trippedUntil = 0;

  recordSuccess() {
    this.failureCount = 0;
  }

  recordFailure(): boolean {
    this.failureCount += 1;
    if (this.failureCount >= 5) {
      this.trippedUntil = Date.now() + 60000; // 60s cooldown
      return true; // tripped
    }
    return false;
  }

  isTripped(): boolean {
    if (Date.now() < this.trippedUntil) {
      return true;
    }
    return false;
  }
}

class RateLimiter {
  private buckets = new Map<string, TokenBucket>();
  private inflight = new Map<string, number>();
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private dailySpend = new Map<string, number>();

  constructor() {
    this.loadDailySpend();
  }

  private async loadDailySpend() {
    try {
      const todayKey = `atlas:spend:${new Date().toISOString().split('T')[0]}`;
      const data = await AsyncStorage.getItem(todayKey);
      if (data) {
        const parsed = JSON.parse(data);
        Object.entries(parsed).forEach(([k, v]) => this.dailySpend.set(k, Number(v)));
      }
    } catch (e) {
      // ignore
    }
  }

  private async recordSpend(service: string, usd: number) {
    const curr = this.dailySpend.get(service) || 0.0;
    const updated = curr + usd;
    this.dailySpend.set(service, updated);

    try {
      const todayKey = `atlas:spend:${new Date().toISOString().split('T')[0]}`;
      const obj: Record<string, number> = {};
      this.dailySpend.forEach((val, k) => (obj[k] = val));
      await AsyncStorage.setItem(todayKey, JSON.stringify(obj));
    } catch (e) {
      // ignore
    }
  }

  public getDailySpend(service: string): number {
    return this.dailySpend.get(service) || 0.0;
  }

  private getBucket(service: string, cfg: ServiceLimitConfig): TokenBucket {
    if (!this.buckets.has(service)) {
      this.buckets.set(service, new TokenBucket(cfg.requestsPerMinute));
    }
    return this.buckets.get(service)!;
  }

  private getCircuitBreaker(service: string): CircuitBreaker {
    if (!this.circuitBreakers.has(service)) {
      this.circuitBreakers.set(service, new CircuitBreaker());
    }
    return this.circuitBreakers.get(service)!;
  }

  async execute<T>(service: string, fn: () => Promise<T>, estimatedCostUsd = 0): Promise<T> {
    const cfg = SERVICE_LIMITS[service] || { requestsPerMinute: 30, maxConcurrent: 3 };
    const cb = this.getCircuitBreaker(service);

    if (cb.isTripped()) {
      logger.riskFired('Circuit Breaker Active', `${service} circuit breaker tripped for 60s after 5 consecutive errors.`);
      throw new Error(`[RateLimiter] Circuit breaker tripped for ${service}`);
    }

    if (cfg.dailyCostCapUsd && this.getDailySpend(service) + estimatedCostUsd > cfg.dailyCostCapUsd) {
      logger.riskFired('Daily Cost Cap Exceeded', `${service} daily cost cap ($${cfg.dailyCostCapUsd.toFixed(2)}) reached.`);
      throw new Error(`[RateLimiter] Daily cost cap exceeded for ${service}`);
    }

    while ((this.inflight.get(service) || 0) >= cfg.maxConcurrent) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    await this.getBucket(service, cfg).waitForToken();

    this.inflight.set(service, (this.inflight.get(service) || 0) + 1);

    try {
      const result = await withBackoff(fn, { maxRetries: 3, baseDelayMs: 500 });
      cb.recordSuccess();
      if (estimatedCostUsd > 0) {
        await this.recordSpend(service, estimatedCostUsd);
      }
      return result;
    } catch (err: any) {
      const tripped = cb.recordFailure();
      if (tripped) {
        logger.riskFired('Circuit Breaker Tripped', `${service} failed 5 consecutive times. Short-circuiting calls for 60s.`);
      }
      throw err;
    } finally {
      this.inflight.set(service, Math.max(0, (this.inflight.get(service) || 1) - 1));
    }
  }
}

export const rateLimiter = new RateLimiter();
