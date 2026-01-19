// Quick test script to verify token generation fix
import { generateAccessToken } from './kite-api.js';
import { config } from './config.js';

async function test() {
  try {
    const requestToken = config.requestToken || process.env.REQUEST_TOKEN;
    
    if (!requestToken) {
      console.error('❌ REQUEST_TOKEN required');
      console.error('Get it from: https://kite.zerodha.com/connect/login?v=3&api_key=' + config.apiKey);
      process.exit(1);
    }
    
    console.log('🧪 Testing token generation...');
    console.log('API Key:', config.apiKey.substring(0, 6) + '...');
    console.log('Request Token:', requestToken.substring(0, 10) + '...');
    console.log('');
    
    const accessToken = await generateAccessToken(config.apiKey, config.apiSecret, requestToken);
    
    console.log('✅ SUCCESS!');
    console.log('Access Token:', accessToken.substring(0, 20) + '...');
    console.log('Full Token:', accessToken);
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

test();
