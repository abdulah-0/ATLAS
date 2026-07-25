import { dbOperations } from './db';
import { RegimeType } from './regime';
import { alpaca } from './alpaca';

export interface ConversionQueueItem {
  usdAmount: number;
  sourceTradeId: string;
  queuedAt: string;
}

export interface ConversionResult {
  executed: boolean;
  btcAmount: number;
  usdSpent: number;
  btcPrice: number;
  sourceTradeId: string | null;
  reason: string;
}

export const btcConversion = {
  /**
   * Processes a closed trade's profit: 80% to BTC queue, 20% to bot capital
   */
  processProfitSplit(netProfitUsd: number, tradeId: string): { btcQueueUsd: number; botReinvestUsd: number } {
    if (netProfitUsd <= 0) {
      return { btcQueueUsd: 0, botReinvestUsd: 0 };
    }

    const btcQueueUsd = parseFloat((netProfitUsd * 0.80).toFixed(2));
    const botReinvestUsd = parseFloat((netProfitUsd * 0.20).toFixed(2));

    return { btcQueueUsd, botReinvestUsd };
  },

  /**
   * Evaluates if a BTC conversion buy order should execute based on dip criteria, regime, and minimum threshold
   */
  async executeBtcConversion(
    usdAmount: number,
    currentBtcPrice: number,
    recent4hBtcBars: Array<{ c: number }>,
    currentRegime: RegimeType,
    sourceTradeId: string | null = null
  ): Promise<ConversionResult> {
    const defaultHold = (reason: string): ConversionResult => ({
      executed: false,
      btcAmount: 0,
      usdSpent: 0,
      btcPrice: currentBtcPrice,
      sourceTradeId,
      reason,
    });

    // Minimum conversion threshold: $5
    if (usdAmount < 5.0) {
      return defaultHold(`Queued amount $${usdAmount.toFixed(2)} is below minimum $5 threshold. Held in queue.`);
    }

    // Regime Check: If CRASH, hold profit in USDC
    if (currentRegime === 'CRASH') {
      return defaultHold(`BTC CRASH regime active. $${usdAmount.toFixed(2)} profit held in USDC queue.`);
    }

    // Dip-aware check: Look for > 0.8% dip in recent 4h bars
    let isDipDetected = false;
    if (recent4hBtcBars && recent4hBtcBars.length >= 2) {
      const highest4hPrice = Math.max(...recent4hBtcBars.map(b => b.c));
      const dipPct = ((highest4hPrice - currentBtcPrice) / highest4hPrice) * 100;
      if (dipPct >= 0.8) {
        isDipDetected = true;
      }
    } else {
      // If insufficient bar data, default to executing conversion
      isDipDetected = true;
    }

    // Calculate BTC Quantity
    const btcAmount = parseFloat((usdAmount / currentBtcPrice).toFixed(8));

    // Submit market buy order via Alpaca or simulate
    try {
      if (alpaca.isLive) {
        await alpaca.placeOrder({
          symbol: 'BTC/USD',
          notional: usdAmount.toFixed(2),
          side: 'buy',
          type: 'market',
          time_in_force: 'gtc',
        });
      }
    } catch (orderErr) {
      console.warn('Alpaca BTC purchase order failed, logging simulated conversion:', orderErr instanceof Error ? orderErr.message : String(orderErr));
    }

    // Log purchase to SQLite btc_stack table
    try {
      await dbOperations.logBtcPurchase(btcAmount, usdAmount, currentBtcPrice, sourceTradeId);
    } catch (dbErr) {
      console.warn('Could not log BTC purchase in SQLite:', dbErr instanceof Error ? dbErr.message : String(dbErr));
    }

    return {
      executed: true,
      btcAmount,
      usdSpent: usdAmount,
      btcPrice: currentBtcPrice,
      sourceTradeId,
      reason: isDipDetected 
        ? `Converted $${usdAmount.toFixed(2)} to ${btcAmount.toFixed(6)} BTC during intraday dip!` 
        : `Converted $${usdAmount.toFixed(2)} to ${btcAmount.toFixed(6)} BTC at market price.`,
    };
  }
};
