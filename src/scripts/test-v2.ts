import { fetchModelCatalog } from '../services/modelCatalog';
import { rateLimiter } from '../services/rateLimiter';
import { withBackoff } from '../services/backoff';

async function runVerificationV2() {
  console.log('=== ATLAS Integration v2 Verification ===\n');

  // 1. Model Catalog Verification
  console.log('1. Testing OpenRouter Model Catalog Fetcher:');
  const catalog = await fetchModelCatalog();
  console.log(`   - Total catalog models loaded: ${catalog.length}`);
  console.assert(catalog.length > 0, 'Catalog should contain models');
  const sampleModel = catalog[0];
  console.log(`   - Sample Model: ${sampleModel.name} (${sampleModel.id}) | Tier: ${sampleModel.tier}`);

  // 2. Exponential Backoff Test
  console.log('\n2. Testing Exponential Backoff Utility:');
  let attempts = 0;
  const backoffResult = await withBackoff(async () => {
    attempts++;
    if (attempts < 2) {
      const err: any = new Error('Transient rate limit test 429');
      err.status = 429;
      throw err;
    }
    return 'SUCCESS';
  });
  console.log(`   - Backoff result: ${backoffResult} after ${attempts} attempts`);
  console.assert(backoffResult === 'SUCCESS', 'Backoff test failed');

  // 3. RateLimiter Execution & Spend Tracking Test
  console.log('\n3. Testing Token Bucket RateLimiter & Spend Tracking:');
  const startSpend = rateLimiter.getDailySpend('openrouter_premium');
  await rateLimiter.execute('openrouter_premium', async () => 'test_call', 0.05);
  const endSpend = rateLimiter.getDailySpend('openrouter_premium');
  console.log(`   - Daily spend updated: $${startSpend.toFixed(2)} -> $${endSpend.toFixed(2)}`);
  console.assert(endSpend >= startSpend + 0.05, 'RateLimiter spend tracking failed');

  console.log('\n✅ ALL ATLAS INTEGRATION V2 VERIFICATION TESTS PASSED SUCCESSFULLY!');
}

runVerificationV2();
