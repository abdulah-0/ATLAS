import { BotGenome, SignalType } from '../types/genome';
import { MarketBar } from './alpaca';
import { indicators } from './indicators';
import { RegimeType } from './regime';

export interface SignalEvaluation {
  hasSignal: boolean;
  bot_id: string;
  asset: string;
  signalType: SignalType;
  direction: 'long' | 'short';
  confidence: number; // 0.0 to 1.0
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  reasoning: string;
  confluenceMet: number;
  indicatorSnapshot: {
    rsi: number;
    vwap: number;
    volumeSpike: number;
    bbSqueeze: boolean;
  };
}

export const signalEngine = {
  /**
   * Evaluates if a bot generates a trade entry signal on the provided market bars
   */
  evaluateSignal(
    bot: BotGenome,
    asset: string,
    bars: MarketBar[],
    currentRegime: RegimeType
  ): SignalEvaluation {
    const defaultFail: SignalEvaluation = {
      hasSignal: false,
      bot_id: bot.bot_id,
      asset,
      signalType: bot.entry.primary_signal,
      direction: 'long',
      confidence: 0,
      entryPrice: bars.length > 0 ? bars[bars.length - 1].c : 0,
      stopLoss: 0,
      takeProfit: 0,
      reasoning: 'No signal conditions met',
      confluenceMet: 0,
      indicatorSnapshot: { rsi: 50, vwap: 0, volumeSpike: 1.0, bbSqueeze: false },
    };

    if (!bars || bars.length < 20) {
      return { ...defaultFail, reasoning: 'Insufficient market bars for evaluation' };
    }

    // 1. Regime Filter Check
    if (!bot.regime_filters.active_in.includes(currentRegime)) {
      return { ...defaultFail, reasoning: `Bot ${bot.bot_id} is inactive in ${currentRegime} regime` };
    }

    const latestBar = bars[bars.length - 1];
    const currentPrice = latestBar.c;

    // 2. Compute Technical Indicators
    const rsi = indicators.calculateRsi(bars);
    const vwap = indicators.calculateVwap(bars);
    const bb = indicators.calculateBollingerBands(bars);
    const volumeSpike = indicators.calculateVolumeSpike(bars);
    const momentumBreakout = indicators.checkMomentumBreakout(bars);

    let confluenceCount = 0;
    const reasons: string[] = [];
    let direction: 'long' | 'short' = 'long';

    // 3. Evaluate Primary Signal
    let primarySignalHit = false;

    switch (bot.entry.primary_signal) {
      case 'momentum_breakout':
        if (momentumBreakout) {
          primarySignalHit = true;
          confluenceCount++;
          reasons.push(`Price broken out above 20-bar high ($${currentPrice})`);
        }
        break;

      case 'mean_reversion':
      case 'vwap_reversion':
        const vwapDevPct = Math.abs(currentPrice - vwap) / vwap;
        if (rsi <= bot.entry.rsi_entry || vwapDevPct >= bot.entry.vwap_deviation) {
          primarySignalHit = true;
          direction = currentPrice < vwap ? 'long' : 'short';
          confluenceCount++;
          reasons.push(`Price deviated ${ (vwapDevPct * 100).toFixed(2) }% from VWAP with RSI at ${rsi}`);
        }
        break;

      case 'bb_squeeze_break':
        if (bb.isSqueeze || currentPrice > bb.upper) {
          primarySignalHit = true;
          confluenceCount++;
          reasons.push(`Bollinger Squeeze breakout detected (Bandwidth: ${bb.bandwidth})`);
        }
        break;

      case 'volume_spike':
        if (volumeSpike >= bot.entry.volume_mult) {
          primarySignalHit = true;
          confluenceCount++;
          reasons.push(`Volume spike ${volumeSpike}x above 20-bar average`);
        }
        break;

      default:
        // Generic momentum / breakout check
        if (momentumBreakout || volumeSpike >= 1.5) {
          primarySignalHit = true;
          confluenceCount++;
          reasons.push('General signal conditions triggered');
        }
        break;
    }

    if (!primarySignalHit) {
      return { ...defaultFail, reasoning: `Primary signal ${bot.entry.primary_signal} condition not satisfied` };
    }

    // 4. Check Confluence Conditions
    if (volumeSpike >= bot.entry.volume_mult) {
      confluenceCount++;
      reasons.push(`Volume multiplier threshold met (${volumeSpike}x >= ${bot.entry.volume_mult}x)`);
    }

    if (bot.entry.bb_squeeze && bb.isSqueeze) {
      confluenceCount++;
      reasons.push('Bollinger squeeze condition satisfied');
    }

    if (rsi < 40 || rsi > 60) {
      confluenceCount++;
      reasons.push(`RSI momentum aligned at ${rsi}`);
    }

    const hasSignal = confluenceCount >= bot.entry.confluence_count;

    // Calculate Stop Loss & Take Profit
    const stopLossPct = bot.exit.stop_loss_pct;
    const stopLoss = direction === 'long'
      ? currentPrice * (1 - stopLossPct)
      : currentPrice * (1 + stopLossPct);

    const riskAmount = Math.abs(currentPrice - stopLoss);
    const takeProfit = direction === 'long'
      ? currentPrice + (riskAmount * bot.exit.take_profit_rr)
      : currentPrice - (riskAmount * bot.exit.take_profit_rr);

    // Compute Confidence (0.50 to 0.95 based on confluence count and volume)
    const baseConfidence = 0.50 + (confluenceCount * 0.10) + (Math.min(volumeSpike, 3.0) * 0.05);
    const confidence = parseFloat(Math.min(0.95, baseConfidence).toFixed(2));

    return {
      hasSignal,
      bot_id: bot.bot_id,
      asset,
      signalType: bot.entry.primary_signal,
      direction,
      confidence,
      entryPrice: currentPrice,
      stopLoss: parseFloat(stopLoss.toFixed(4)),
      takeProfit: parseFloat(takeProfit.toFixed(4)),
      reasoning: reasons.join('. '),
      confluenceMet: confluenceCount,
      indicatorSnapshot: {
        rsi,
        vwap,
        volumeSpike,
        bbSqueeze: bb.isSqueeze,
      },
    };
  }
};
