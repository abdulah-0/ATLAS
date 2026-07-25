import { MarketBar } from './alpaca';

export interface BollingerBandsResult {
  middle: number;
  upper: number;
  lower: number;
  bandwidth: number; // (upper - lower) / middle
  isSqueeze: boolean;
}

export const indicators = {
  /**
   * Relative Strength Index (RSI) - Default period 14
   */
  calculateRsi(bars: MarketBar[], period: number = 14): number {
    if (!bars || bars.length <= period) return 50; // Neutral default if insufficient data

    const closes = bars.map(b => b.c);
    const gains: number[] = [];
    const losses: number[] = [];

    for (let i = 1; i < closes.length; i++) {
      const difference = closes[i] - closes[i - 1];
      if (difference >= 0) {
        gains.push(difference);
        losses.push(0);
      } else {
        gains.push(0);
        losses.push(Math.abs(difference));
      }
    }

    // Average gain and loss for the first period
    let avgGain = gains.slice(0, period).reduce((sum, g) => sum + g, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((sum, l) => sum + l, 0) / period;

    // Smoothed average for subsequent periods
    for (let i = period; i < gains.length; i++) {
      avgGain = (avgGain * (period - 1) + gains[i]) / period;
      avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    }

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return parseFloat((100 - (100 / (1 + rs))).toFixed(2));
  },

  /**
   * Volume Weighted Average Price (VWAP)
   */
  calculateVwap(bars: MarketBar[]): number {
    if (!bars || bars.length === 0) return 0;

    let cumulativeTypicalPriceVolume = 0;
    let cumulativeVolume = 0;

    for (const bar of bars) {
      const typicalPrice = (bar.h + bar.l + bar.c) / 3;
      cumulativeTypicalPriceVolume += typicalPrice * bar.v;
      cumulativeVolume += bar.v;
    }

    if (cumulativeVolume === 0) return bars[bars.length - 1].c;
    return parseFloat((cumulativeTypicalPriceVolume / cumulativeVolume).toFixed(4));
  },

  /**
   * Bollinger Bands (Default 20 periods, 2 standard deviations)
   */
  calculateBollingerBands(bars: MarketBar[], period: number = 20, multiplier: number = 2.0): BollingerBandsResult {
    if (!bars || bars.length < period) {
      const lastClose = bars && bars.length > 0 ? bars[bars.length - 1].c : 0;
      return { middle: lastClose, upper: lastClose, lower: lastClose, bandwidth: 0, isSqueeze: false };
    }

    const recentBars = bars.slice(-period);
    const closes = recentBars.map(b => b.c);
    const middle = closes.reduce((sum, c) => sum + c, 0) / period;

    const variance = closes.reduce((sum, c) => sum + Math.pow(c - middle, 2), 0) / period;
    const stdDev = Math.sqrt(variance);

    const upper = middle + (multiplier * stdDev);
    const lower = middle - (multiplier * stdDev);
    const bandwidth = middle > 0 ? (upper - lower) / middle : 0;

    // A squeeze is typically defined as bandwidth dropping below 0.025 (2.5% of middle price)
    const isSqueeze = bandwidth < 0.025;

    return {
      middle: parseFloat(middle.toFixed(4)),
      upper: parseFloat(upper.toFixed(4)),
      lower: parseFloat(lower.toFixed(4)),
      bandwidth: parseFloat(bandwidth.toFixed(4)),
      isSqueeze,
    };
  },

  /**
   * Volume Spike Multiplier (Current volume vs N-period average volume)
   */
  calculateVolumeSpike(bars: MarketBar[], period: number = 20): number {
    if (!bars || bars.length <= period) return 1.0;

    const currentVolume = bars[bars.length - 1].v;
    const previousBars = bars.slice(-period - 1, -1);
    const avgVolume = previousBars.reduce((sum, b) => sum + b.v, 0) / period;

    if (avgVolume === 0) return 1.0;
    return parseFloat((currentVolume / avgVolume).toFixed(2));
  },

  /**
   * Momentum Breakout Check
   * Returns true if latest close is higher than highest high of previous N bars
   */
  checkMomentumBreakout(bars: MarketBar[], period: number = 20): boolean {
    if (!bars || bars.length <= period) return false;

    const latestClose = bars[bars.length - 1].c;
    const previousBars = bars.slice(-period - 1, -1);
    const highestHigh = Math.max(...previousBars.map(b => b.h));

    return latestClose > highestHigh;
  }
};
