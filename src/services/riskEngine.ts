import { RegimeType } from './regime';

export interface RiskCheckInput {
  symbol: string;
  assetClass: 'crypto' | 'stock';
  direction: 'long' | 'short';
  entryPrice: number;
  stopLoss: number;
  takeProfit?: number;
  botAllocationUsd: number;
  totalPortfolioValue: number;
  dayStartPortfolioValue: number;
  currentPortfolioValue: number;
  peakPortfolioValue: number; // All-Time High
  currentRegime: RegimeType;
  openPositions: Array<{ symbol: string; direction: string }>;
  hasBreakingBearishNews?: boolean;
  isEarningsWithin48h?: boolean;
}

export interface RiskCheckResult {
  passed: boolean;
  rejectedRule?: string;
  reason?: string;
  maxQuantity: number;
  maxPositionUsd: number;
  riskAmountUsd: number;
}

export const riskEngine = {
  /**
   * Evaluates proposed trade against all 9 Immutable Hard Risk Rules at code level
   */
  evaluateTradeRisk(input: RiskCheckInput): RiskCheckResult {
    const fail = (rule: string, reason: string): RiskCheckResult => ({
      passed: false,
      rejectedRule: rule,
      reason,
      maxQuantity: 0,
      maxPositionUsd: 0,
      riskAmountUsd: 0,
    });

    // Rule 1: MANDATORY STOP LOSS
    if (!input.stopLoss || input.stopLoss <= 0 || isNaN(input.stopLoss)) {
      return fail('RULE_1_MANDATORY_STOP_LOSS', 'Trade rejected: Every trade must have a valid stop_loss price.');
    }

    if (input.direction === 'long' && input.stopLoss >= input.entryPrice) {
      return fail('RULE_1_MANDATORY_STOP_LOSS', 'Trade rejected: Long stop_loss must be below entry price.');
    }
    if (input.direction === 'short' && input.stopLoss <= input.entryPrice) {
      return fail('RULE_1_MANDATORY_STOP_LOSS', 'Trade rejected: Short stop_loss must be above entry price.');
    }

    // Rule 7: CRASH REGIME LOCK
    if (input.currentRegime === 'CRASH') {
      return fail('RULE_7_CRASH_REGIME_LOCK', 'Trade rejected: CRASH regime lock active. Zero new positions allowed.');
    }

    // Rule 4: DAILY LOSS LIMIT (5%)
    const dailyDropPct = ((input.dayStartPortfolioValue - input.currentPortfolioValue) / input.dayStartPortfolioValue) * 100;
    if (dailyDropPct >= 5.0) {
      return fail('RULE_4_DAILY_LOSS_LIMIT', `Trade rejected: Daily loss limit hit (-${dailyDropPct.toFixed(2)}% >= -5.0%). Trading halted for rest of day.`);
    }

    // Rule 5: TOTAL DRAWDOWN LIMIT (20% Circuit Breaker)
    const totalDrawdownPct = ((input.peakPortfolioValue - input.currentPortfolioValue) / input.peakPortfolioValue) * 100;
    if (totalDrawdownPct >= 20.0) {
      return fail('RULE_5_TOTAL_DRAWDOWN_LIMIT', `Trade rejected: Total drawdown circuit breaker triggered (-${totalDrawdownPct.toFixed(2)}% >= -20.0%). Requires manual reset.`);
    }

    // Rule 8: EARNINGS BLACKOUT (Stocks)
    if (input.assetClass === 'stock' && input.isEarningsWithin48h) {
      return fail('RULE_8_EARNINGS_BLACKOUT', `Trade rejected: Stock ${input.symbol} has earnings release within 48 hours.`);
    }

    // Rule 9: BREAKING NEWS PAUSE
    if (input.hasBreakingBearishNews) {
      return fail('RULE_9_BREAKING_NEWS_PAUSE', `Trade rejected: Strong bearish breaking news active for ${input.symbol}.`);
    }

    // Rule 6: CORRELATION GUARD (Simplified check for duplicate exposure to same symbol)
    const existingSameAsset = input.openPositions.some(p => p.symbol === input.symbol);
    if (existingSameAsset) {
      return fail('RULE_6_CORRELATION_GUARD', `Trade rejected: Bot already has an open position in ${input.symbol}.`);
    }

    // Rule 2 & Rule 3: Position Sizing & 1% Portfolio Risk Rule
    // Rule 2: Max 20% of bot allocated capital
    const maxPositionUsdRule2 = input.botAllocationUsd * 0.20;

    // Rule 3: Max 1% portfolio risk: (Entry - Stop) * Qty <= Portfolio * 0.01
    const maxRiskUsdRule3 = input.totalPortfolioValue * 0.01;
    const distancePerUnit = Math.abs(input.entryPrice - input.stopLoss);
    const maxUnitsRule3 = distancePerUnit > 0 ? maxRiskUsdRule3 / distancePerUnit : 0;
    const maxUsdRule3 = maxUnitsRule3 * input.entryPrice;

    // Final Position Cap: min of Rule 2 cap and Rule 3 cap
    const maxPositionUsd = Math.min(maxPositionUsdRule2, maxUsdRule3);
    const maxQuantity = parseFloat((maxPositionUsd / input.entryPrice).toFixed(6));
    const riskAmountUsd = parseFloat((maxQuantity * distancePerUnit).toFixed(2));

    if (maxQuantity <= 0 || maxPositionUsd < 5) {
      return fail('RULE_3_PORTFOLIO_RISK', 'Trade rejected: Calculated position size is below minimum execution threshold.');
    }

    return {
      passed: true,
      maxQuantity,
      maxPositionUsd: parseFloat(maxPositionUsd.toFixed(2)),
      riskAmountUsd,
    };
  }
};
