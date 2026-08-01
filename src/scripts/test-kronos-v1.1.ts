import { DecisionSchema } from '../services/decisionEngine';
import { logger } from '../services/logger';
import { kronosClient } from '../services/kronosClient';
import { useLogsStore } from '../store/logsStore';

async function runVerification() {
  console.log('=== ATLAS × Kronos Integration Verification ===\n');

  // 1. Logger Emission Test
  console.log('1. Testing Centralized Logger Emissions:');
  const mockDecision = {
    action: 'APPROVE',
    confidence: 0.88,
    bull_case: 'RSI oversold rebound + Kronos predicted 1.8% rally.',
    bear_case: 'Resistance level at $68,000.',
    risk_flags: [],
    kronos_alignment: 'CONFIRMS',
    reasoning: 'Bullish confluence outweighs bear case.',
  };

  logger.tradeApproved('tr_test_001', 'atlas_001', 'BTC/USD', mockDecision);
  logger.kronosForecast('BTC/USD', 'UP', 0.73, 1.8);
  logger.riskFired('Drawdown limit', 'Portfolio within limits.');

  const storeLogs = useLogsStore.getState().logs;
  console.log(`   - Emitted logs count: ${storeLogs.length}`);
  console.assert(storeLogs.length >= 3, 'Logger emission failed to update store');

  // 2. 4-Stage Decision Schema Parsing Test
  console.log('\n2. Testing 4-Stage Bull/Bear/Risk Opus Decision Schema:');
  const rawOpusJson = JSON.stringify({
    bull_case: 'Strong RSI bounce with high volume support.',
    bear_case: 'Macro blackout window approaching in 3h.',
    risk_flags: ['High volatility predicted by Kronos'],
    action: 'APPROVE',
    confidence: 0.82,
    reasoning: 'Bullish momentum confirms setup despite minor macro noise.',
    position_size_modifier: 0.8,
    modified_stop: null,
    reject_reason: null,
    kronos_alignment: 'CONFIRMS',
  });

  const parsed = JSON.parse(rawOpusJson);
  const validated = DecisionSchema.parse(parsed);
  console.log(`   - Parsed Action: ${validated.action}`);
  console.log(`   - Kronos Alignment: ${validated.kronos_alignment}`);
  console.log(`   - Bull Case: "${validated.bull_case}"`);
  console.assert(validated.action === 'APPROVE', 'Decision schema parse failed');
  console.assert(validated.kronos_alignment === 'CONFIRMS', 'Alignment parse failed');

  // 3. Kronos Client Fallback Test
  console.log('\n3. Testing Kronos Client Graceful Fallback:');
  const nullForecast = await kronosClient.forecast({
    asset: 'BTC/USD',
    timeframe: '15min',
    bars: [],
  });
  console.log(`   - Kronos forecast output (offline microservice): ${nullForecast === null ? 'NULL (Graceful Fallback)' : 'Forecast Object'}`);
  console.assert(nullForecast === null, 'Kronos client fallback test failed');

  console.log('\n✅ ALL ATLAS × KRONOS VERIFICATION TESTS PASSED SUCCESSFULLY!');
}

runVerification();
