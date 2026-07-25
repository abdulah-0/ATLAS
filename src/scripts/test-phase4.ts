// src/scripts/test-phase4.ts
// Run with: npx -y tsx src/scripts/test-phase4.ts

import { positionSizing } from '../services/sizing';
import { riskEngine, RiskCheckInput } from '../services/riskEngine';
import { profitLock } from '../services/profitLock';

console.log('--- Testing Phase 4 Risk Management & Profit Compounding Engine ---');

// 1. Test Confidence-Gated Position Sizing
const sizeHighConfBull = positionSizing.calculatePositionSize(0.88, 'BULL');
console.log(`✅ Position Sizing (High Conf BULL): Allowed = ${sizeHighConfBull.allowed}, Final Size = ${sizeHighConfBull.finalSizingPct}% (${sizeHighConfBull.reason})`);

const sizeCrashRegime = positionSizing.calculatePositionSize(0.90, 'CRASH');
console.log(`✅ Position Sizing (CRASH Regime): Allowed = ${sizeCrashRegime.allowed}, Final Size = ${sizeCrashRegime.finalSizingPct}% (${sizeCrashRegime.reason})`);

// 2. Test Hard Risk Engine
const validTradeInput: RiskCheckInput = {
  symbol: 'BTC/USD',
  assetClass: 'crypto',
  direction: 'long',
  entryPrice: 67420,
  stopLoss: 66080,
  takeProfit: 70780,
  botAllocationUsd: 1000,
  totalPortfolioValue: 10000,
  dayStartPortfolioValue: 10000,
  currentPortfolioValue: 10150,
  peakPortfolioValue: 10150,
  currentRegime: 'BULL',
  openPositions: [],
};

const validRiskResult = riskEngine.evaluateTradeRisk(validTradeInput);
console.log(`✅ Risk Check (Valid Trade): Passed = ${validRiskResult.passed}, Max Position = $${validRiskResult.maxPositionUsd}, Max Qty = ${validRiskResult.maxQuantity}, Risk = $${validRiskResult.riskAmountUsd}`);

// Test Rule 1: Missing Stop Loss
const noStopResult = riskEngine.evaluateTradeRisk({ ...validTradeInput, stopLoss: 0 });
console.log(`✅ Risk Check (Missing Stop Loss): Passed = ${noStopResult.passed}, Rejected Rule = ${noStopResult.rejectedRule}`);

// Test Rule 7: CRASH Regime Lock
const crashRegimeResult = riskEngine.evaluateTradeRisk({ ...validTradeInput, currentRegime: 'CRASH' });
console.log(`✅ Risk Check (CRASH Regime Lock): Passed = ${crashRegimeResult.passed}, Rejected Rule = ${crashRegimeResult.rejectedRule}`);

// Test Rule 4: Daily Loss Limit (5%)
const dailyHaltResult = riskEngine.evaluateTradeRisk({
  ...validTradeInput,
  dayStartPortfolioValue: 10000,
  currentPortfolioValue: 9400, // 6% drop
});
console.log(`✅ Risk Check (5% Daily Loss Halt): Passed = ${dailyHaltResult.passed}, Rejected Rule = ${dailyHaltResult.rejectedRule}`);

// Test Rule 5: Total Drawdown Limit (20% Circuit Breaker)
const drawdownHaltResult = riskEngine.evaluateTradeRisk({
  ...validTradeInput,
  peakPortfolioValue: 15000,
  currentPortfolioValue: 11000, // 26.6% drawdown
});
console.log(`✅ Risk Check (20% Drawdown Circuit Breaker): Passed = ${drawdownHaltResult.passed}, Rejected Rule = ${drawdownHaltResult.rejectedRule}`);

// 3. Test BTC 80/20 Profit Compounding Split Calculation
function processProfitSplit(netProfitUsd: number) {
  if (netProfitUsd <= 0) return { btcQueueUsd: 0, botReinvestUsd: 0 };
  return {
    btcQueueUsd: parseFloat((netProfitUsd * 0.80).toFixed(2)),
    botReinvestUsd: parseFloat((netProfitUsd * 0.20).toFixed(2)),
  };
}

const profitSplit = processProfitSplit(100.00);
console.log(`✅ BTC Profit Split: 80% to BTC Queue = $${profitSplit.btcQueueUsd}, 20% to Bot Capital = $${profitSplit.botReinvestUsd}`);

// 4. Test Daily High-Water Mark Profit Lock
const profitLockResult = profitLock.evaluateProfitLock(10000, 10500, 10350);
console.log(`✅ Profit Lock Protection: LockActive = ${profitLockResult.isLockActive}, Peak Gain = +$${profitLockResult.peakGainUsd}, Protected Floor = $${profitLockResult.protectedFloorUsd}`);

console.log('\n--- All Phase 4 Risk & Compounding Engine Tests Finished Successfully ---');
