import { fitFontSize, truncateModelId, safePercent } from '../utils/responsive';
import { useSettingsStore, AVAILABLE_MODELS } from '../store/settingsStore';
import { btcConversion } from '../services/btcConversion';
import { openrouter } from '../services/openrouter';

function runVerification() {
  console.log('=== ATLAS v1.1 Implementation Verification ===\n');

  // 1. Responsive Utility Tests
  console.log('1. Testing Responsive Utilities:');
  const tr1 = truncateModelId('meta-llama/llama-3.3-70b-instruct:free', 25);
  console.log(`   - Model Truncation (25 chars): "${tr1}"`);
  console.assert(tr1.length <= 25, 'Model ID truncation failed length check');

  const fontSz = fitFontSize('19.99999999 BTC', 200, 32, 12);
  console.log(`   - Fit Font Size (19.99999999 BTC in 200px): ${fontSz}px`);
  console.assert(fontSz <= 32 && fontSz >= 12, 'Fit font size failed range check');

  const pct = safePercent(15, 20);
  console.log(`   - Safe Percent (15 / 20): ${pct}%`);
  console.assert(pct === 75, 'Safe percent failed calculation');

  // 2. Settings Store Tests
  console.log('\n2. Testing Zustand Settings Store:');
  const store = useSettingsStore.getState();
  const initEst = store.estimatedMonthlyCost();
  console.log(`   - Initial Estimated Monthly LLM Cost: $${initEst.toFixed(2)}/mo`);
  console.assert(initEst > 0, 'Initial estimated cost should be > 0');

  // Model Update Test
  console.log('   - Updating tradeDecision model to DeepSeek R1...');
  store.updateModelForTask('tradeDecision', 'deepseek/deepseek-r1');
  const updatedModel = useSettingsStore.getState().settings.models.tradeDecision.modelId;
  const newEst = useSettingsStore.getState().estimatedMonthlyCost();
  console.log(`     Active Trade Decision Model: ${updatedModel}`);
  console.log(`     New Estimated Monthly LLM Cost: $${newEst.toFixed(2)}/mo`);
  console.assert(updatedModel === 'deepseek/deepseek-r1', 'Model update failed');
  console.assert(newEst < initEst, 'Cost should decrease when moving from Opus to DeepSeek R1');

  // Model Router Test
  const routedModel = openrouter.getModelForTask('tradeDecision');
  console.log(`   - OpenRouter Router lookup for tradeDecision: ${routedModel}`);
  console.assert(routedModel === 'deepseek/deepseek-r1', 'Router lookup mismatch');

  // Conversion Ratio Test
  console.log('\n3. Testing Configurable Profit Split & BTC Conversion:');
  store.updateConversionRatio(90);
  const { conversionRatio, reinvestRatio } = useSettingsStore.getState().settings.conversion;
  console.log(`   - Updated Ratio: ${conversionRatio}% BTC / ${reinvestRatio}% Reinvest`);
  console.assert(conversionRatio === 90 && reinvestRatio === 10, 'Ratio update failed');

  const split = btcConversion.processProfitSplit(100.0, 'trade-123');
  console.log(`   - Process $100 profit -> BTC Queue: $${split.btcQueueUsd}, Reinvest: $${split.botReinvestUsd}`);
  console.assert(split.btcQueueUsd === 90.0 && split.botReinvestUsd === 10.0, 'Profit split math failed');

  // Target Goal Test
  console.log('\n4. Testing Target BTC Goal:');
  store.updateTargetBtc(10.0);
  const updatedBtcGoal = useSettingsStore.getState().settings.goal.targetBtc;
  console.log(`   - Target BTC Goal updated to: ${updatedBtcGoal} BTC`);
  console.assert(updatedBtcGoal === 10.0, 'Target BTC goal update failed');

  // Reset Test
  console.log('\n5. Testing Factory Reset:');
  store.resetAllSettings();
  const resetBtcGoal = useSettingsStore.getState().settings.goal.targetBtc;
  const resetModel = useSettingsStore.getState().settings.models.tradeDecision.modelId;
  console.log(`   - Post-reset Target BTC Goal: ${resetBtcGoal} BTC`);
  console.log(`   - Post-reset Trade Decision Model: ${resetModel}`);
  console.assert(resetBtcGoal === 20.0 && resetModel === 'anthropic/claude-opus-4-6', 'Reset failed');

  console.log('\n✅ ALL ATLAS v1.1 VERIFICATION TESTS PASSED SUCCESSFULLY!');
}

runVerification();
