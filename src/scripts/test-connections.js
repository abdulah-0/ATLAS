// src/scripts/test-connections.js
// Run with: node src/scripts/test-connections.js

const {
  ALPACA_API_KEY,
  ALPACA_SECRET_KEY,
  OPENROUTER_API_KEY,
  PINECONE_API_KEY,
  PINECONE_INDEX_HOST
} = process.env;

async function testAlpaca() {
  console.log('\n--- Testing Alpaca Markets Connection ---');
  if (!ALPACA_API_KEY || !ALPACA_SECRET_KEY) {
    console.warn('⚠️ Alpaca credentials missing from environment variables (ALPACA_API_KEY / ALPACA_SECRET_KEY). Skipping.');
    return false;
  }

  try {
    const response = await fetch('https://paper-api.alpaca.markets/v2/account', {
      method: 'GET',
      headers: {
        'APCA-API-KEY-ID': ALPACA_API_KEY,
        'APCA-API-SECRET-KEY': ALPACA_SECRET_KEY,
        'Content-Type': 'application/json',
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Alpaca Connection Successful!');
      console.log(`Account ID: ${data.id}`);
      console.log(`Portfolio Value: $${data.portfolio_value}`);
      console.log(`Buying Power: $${data.buying_power}`);
      return true;
    } else {
      const err = await response.text();
      console.error(`❌ Alpaca Connection Failed: ${response.status} - ${err}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Alpaca Connection Error:', error.message);
    return false;
  }
}

async function testOpenRouter() {
  console.log('\n--- Testing OpenRouter LLM Connection ---');
  if (!OPENROUTER_API_KEY) {
    console.warn('⚠️ OpenRouter API key missing from environment variables (OPENROUTER_API_KEY). Skipping.');
    return false;
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/abdulah-0/ATLAS',
        'X-Title': 'ATLAS Connection Tester'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.1-8b-instruct:free',
        messages: [{ role: 'user', content: 'Say hello in 3 words.' }],
        temperature: 0.1,
      })
    });

    if (response.ok) {
      const data = await response.json();
      const answer = data.choices?.[0]?.message?.content?.trim();
      console.log('✅ OpenRouter Connection Successful!');
      console.log(`Model Response: "${answer}"`);
      return true;
    } else {
      const err = await response.text();
      console.error(`❌ OpenRouter Connection Failed: ${response.status} - ${err}`);
      return false;
    }
  } catch (error) {
    console.error('❌ OpenRouter Connection Error:', error.message);
    return false;
  }
}

async function testPinecone() {
  console.log('\n--- Testing Pinecone Vector DB Connection ---');
  if (!PINECONE_API_KEY || !PINECONE_INDEX_HOST) {
    console.warn('⚠️ Pinecone credentials missing from environment variables (PINECONE_API_KEY / PINECONE_INDEX_HOST). Skipping.');
    return false;
  }

  let host = PINECONE_INDEX_HOST.trim();
  if (!host.startsWith('http://') && !host.startsWith('https://')) {
    host = `https://${host}`;
  }
  if (host.endsWith('/')) {
    host = host.slice(0, -1);
  }

  try {
    const response = await fetch(`${host}/describe_index_stats`, {
      method: 'POST',
      headers: {
        'Api-Key': PINECONE_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Pinecone Connection Successful!');
      console.log(`Total Vector Count: ${data.totalRecordCount ?? 0}`);
      console.log(`Index Dimension: ${data.dimension}`);
      return true;
    } else {
      const err = await response.text();
      console.error(`❌ Pinecone Connection Failed: ${response.status} - ${err}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Pinecone Connection Error:', error.message);
    return false;
  }
}

async function runAll() {
  console.log('Starting ATLAS API connection tests...');
  const alpacaOk = await testAlpaca();
  const openrouterOk = await testOpenRouter();
  const pineconeOk = await testPinecone();
  
  console.log('\n--- Test Summary ---');
  console.log(`Alpaca:     ${alpacaOk ? 'SUCCESS ✅' : 'FAILED ❌'}`);
  console.log(`OpenRouter: ${openrouterOk ? 'SUCCESS ✅' : 'FAILED ❌'}`);
  console.log(`Pinecone:   ${pineconeOk ? 'SUCCESS ✅' : 'FAILED ❌'}`);
}

runAll().catch(err => {
  console.error('Failed to run tests:', err);
});
