import { MarketBar } from './alpaca';

export type RegimeType = 'CRASH' | 'BEAR' | 'NEUTRAL' | 'BULL' | 'EUPHORIA';

export interface RegimeResult {
  regime: RegimeType;
  confidence: number; // 0.0 to 1.0
  volatility: number; // annualized/standardized volatility metric
  priceToSmaRatio: number;
}

// Simple statistical helpers
const calculateSma = (prices: number[]): number => {
  if (prices.length === 0) return 0;
  return prices.reduce((sum, p) => sum + p, 0) / prices.length;
};

const calculateVolatility = (prices: number[]): number => {
  if (prices.length < 2) return 0;
  
  // Calculate percent returns
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }
  
  const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  
  const squaredDiffsSum = returns.reduce((sum, r) => {
    const diff = r - meanReturn;
    return sum + (diff * diff);
  }, 0);
  
  // Return standard deviation
  return Math.sqrt(squaredDiffsSum / (returns.length - 1));
};

export const regimeDetector = {
  /**
   * Evaluates the current market regime based on OHLCV bars
   * @param bars Historical bars (requires at least 50 bars for accurate 20/50 SMA)
   */
  detectRegime(bars: MarketBar[]): RegimeResult {
    if (!bars || bars.length < 50) {
      return {
        regime: 'NEUTRAL',
        confidence: 0.5,
        volatility: 0,
        priceToSmaRatio: 1.0,
      };
    }

    const closePrices = bars.map(b => b.c);
    const latestPrice = closePrices[closePrices.length - 1];

    // Compute SMA 20 and SMA 50
    const pricesForSma20 = closePrices.slice(-20);
    const pricesForSma50 = closePrices.slice(-50);
    
    const sma20 = calculateSma(pricesForSma20);
    const sma50 = calculateSma(pricesForSma50);

    // Compute Volatility over last 20 bars
    const recentVolatility = calculateVolatility(pricesForSma20);
    
    // Compute historic benchmark volatility (e.g. over last 50 bars) for comparison
    const benchmarkVolatility = calculateVolatility(pricesForSma50);

    const priceToSmaRatio = latestPrice / sma20;
    const volRatio = benchmarkVolatility > 0 ? recentVolatility / benchmarkVolatility : 1.0;

    let regime: RegimeType = 'NEUTRAL';
    let confidence = 0.5;

    // 1. Check for CRASH (Extremely high volatility + price far below SMA 20)
    // E.g., Volatility spiked 1.8x and price is >4% below SMA 20
    if (volRatio > 1.8 && priceToSmaRatio < 0.96) {
      regime = 'CRASH';
      // Confidence scales with severity of volatility spike and price deviation
      confidence = Math.min(0.95, (volRatio - 1.0) / 2 + (1.0 - priceToSmaRatio) * 5);
    }
    // 2. Check for EUPHORIA (High volatility + price far above SMA 20)
    // E.g., Volatility is elevated and price is >6% above SMA 20
    else if (volRatio > 1.3 && priceToSmaRatio > 1.06) {
      regime = 'EUPHORIA';
      confidence = Math.min(0.90, (priceToSmaRatio - 1.0) * 8);
    }
    // 3. Check for BULL (Sma 20 > Sma 50 and price above SMA 20)
    else if (sma20 > sma50 && latestPrice >= sma20) {
      regime = 'BULL';
      // Confidence is higher if trend is strong
      const trendStrength = (sma20 - sma50) / sma50;
      confidence = Math.min(0.85, 0.6 + trendStrength * 10);
    }
    // 4. Check for BEAR (Sma 20 < Sma 50 and price below SMA 20)
    else if (sma20 < sma50 && latestPrice <= sma20) {
      regime = 'BEAR';
      const trendStrength = (sma50 - sma20) / sma50;
      confidence = Math.min(0.85, 0.6 + trendStrength * 10);
    }
    // 5. Default to NEUTRAL (Rangebound / Mean Reverting)
    else {
      regime = 'NEUTRAL';
      // Confidence is higher if volatility is low and price is hugging the SMA 20
      const priceProximity = Math.abs(1.0 - priceToSmaRatio); // smaller is closer
      confidence = Math.max(0.4, Math.min(0.8, 0.8 - priceProximity * 5));
    }

    return {
      regime,
      confidence: parseFloat(confidence.toFixed(2)),
      volatility: parseFloat(recentVolatility.toFixed(5)),
      priceToSmaRatio: parseFloat(priceToSmaRatio.toFixed(4)),
    };
  }
};
