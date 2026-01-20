// Main automation script

import { config } from './config.js';
import { generateAccessToken, fetchNFOInstruments, findInstrumentToken, getNearestExpiry } from './kite-api.js';
import { initBrowser, loginToKite, captureChart, closeBrowser } from './chart-capture.js';
import { existsSync, readFileSync, writeFileSync } from 'fs';

// Calculate ITM strikes
function calculateITMStrikes(currentPrice, interval = 50, count = 5) {
  const ceStrikes = [];
  const peStrikes = [];
  
  for (let i = 1; i <= count; i++) {
    const ceStrike = Math.floor((currentPrice - (i * interval)) / interval) * interval;
    if (ceStrike > 0) ceStrikes.push(ceStrike);
    
    const peStrike = Math.ceil((currentPrice + (i * interval)) / interval) * interval;
    peStrikes.push(peStrike);
  }
  
  return { ceStrikes, peStrikes };
}

// Main execution
async function main() {
  try {
    console.log('🚀 Starting Kite Chart Automation...\n');
    
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/6676a7ca-b2e5-4a74-983d-8b91ff876270',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.js:25',message:'main entry',data:{hasConfigAccessToken:!!config.accessToken,hasConfigRequestToken:!!config.requestToken,apiKeyLength:config.apiKey?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    // Step 1: Get access token
    let accessToken = config.accessToken;
    
    // Try to load from token file if not provided
    if (!accessToken && existsSync(config.tokenFile)) {
      try {
        accessToken = readFileSync(config.tokenFile, 'utf-8').trim();
        if (accessToken) {
          console.log('✓ Loaded access token from file\n');
        }
      } catch (error) {
        console.log('⚠ Could not read token file, will generate new token\n');
      }
    }
    
    if (!accessToken) {
      const requestToken = config.requestToken || process.env.REQUEST_TOKEN;
      
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/6676a7ca-b2e5-4a74-983d-8b91ff876270',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.js:45',message:'Checking for request token',data:{hasRequestToken:!!requestToken,requestTokenLength:requestToken?.length||0,fromConfig:!!config.requestToken,fromEnv:!!process.env.REQUEST_TOKEN},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      if (!requestToken) {
        console.error('\n❌ Error: ACCESS_TOKEN or REQUEST_TOKEN required\n');
        console.error('📋 Quick Setup Options:\n');
        console.error('Option 1: Set ACCESS_TOKEN (if you already have one)');
        console.error('  export ACCESS_TOKEN=your_access_token_here');
        console.error('  node index.js\n');
        console.error('Option 2: Generate ACCESS_TOKEN from REQUEST_TOKEN');
        console.error('  Step 1: Get request_token from:');
        console.error(`    https://kite.trade/connect/login?api_key=${config.apiKey}`);
        console.error('    (or https://kite.zerodha.com/connect/login?v=3&api_key=...)');
        console.error('  Step 2: Set REQUEST_TOKEN and run:');
        console.error('    export REQUEST_TOKEN=your_request_token_here');
        console.error('    node index.js\n');
        console.error('Option 3: Edit config.js directly');
        console.error('  Set accessToken or requestToken in config.js\n');
        throw new Error('ACCESS_TOKEN or REQUEST_TOKEN required');
      }
      console.log('Generating access token from request token...');
      
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/6676a7ca-b2e5-4a74-983d-8b91ff876270',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.js:64',message:'Before generateAccessToken call',data:{apiKeyLength:config.apiKey?.length||0,apiSecretLength:config.apiSecret?.length||0,requestTokenLength:requestToken?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      accessToken = await generateAccessToken(config.apiKey, config.apiSecret, requestToken);
      
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/6676a7ca-b2e5-4a74-983d-8b91ff876270',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.js:68',message:'After generateAccessToken call',data:{accessTokenLength:accessToken?.length||0,accessTokenPrefix:accessToken?.substring(0,20)+'...'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      console.log('✓ Access token generated');
      console.log(`  Access Token: ${accessToken.substring(0, 20)}...`);
      
      // Save token to file for future use
      try {
        writeFileSync(config.tokenFile, accessToken, 'utf-8');
        console.log(`  💡 Token saved to ${config.tokenFile} for future runs\n`);
      } catch (error) {
        console.log('  ⚠ Could not save token to file:', error.message);
        console.log('  💡 Save this token manually: ACCESS_TOKEN=' + accessToken + '\n');
      }
    } else {
      console.log('✓ Using provided access token\n');
    }
    
    // Step 2: Fetch instruments
    console.log('Fetching NFO instruments...');
    
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/6676a7ca-b2e5-4a74-983d-8b91ff876270',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.js:82',message:'Before fetchNFOInstruments call',data:{accessTokenLength:accessToken?.length||0,apiKeyLength:config.apiKey?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    const instruments = await fetchNFOInstruments(accessToken, config.apiKey);
    
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/6676a7ca-b2e5-4a74-983d-8b91ff876270',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.js:87',message:'After fetchNFOInstruments call',data:{instrumentsCount:instruments.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    console.log(`✓ Fetched ${instruments.length} instruments\n`);
    
    // Step 3: Get Nifty price
    let niftyPrice = config.niftyPrice;
    if (!niftyPrice) {
      // Try to get from market (you can enhance this)
      console.log('⚠ Nifty price not set in config. Using default calculation.');
      console.log('Set NIFTY_PRICE environment variable or update config.js\n');
      niftyPrice = 25000; // Default fallback
    }
    console.log(`Nifty Price: ${niftyPrice}\n`);
    
    // Step 4: Calculate strikes
    const { ceStrikes, peStrikes } = calculateITMStrikes(
      niftyPrice,
      config.strikeInterval,
      config.itmStrikesCount
    );
    
    const allOptions = [
      ...ceStrikes.map(s => ({ strike: s, type: 'CE' })),
      ...peStrikes.map(s => ({ strike: s, type: 'PE' }))
    ];
    
    console.log(`CE Strikes: ${ceStrikes.join(', ')}`);
    console.log(`PE Strikes: ${peStrikes.join(', ')}\n`);
    
    // Step 5: Initialize browser
    console.log('Initializing browser...');
    const browser = await initBrowser(
      config.browserType,
      config.headless,
      config.useExistingChrome,
      config.chromeCDPEndpoint
    );
    const page = await browser.newPage();
    
    // Step 6: Login if credentials provided
    if (config.kiteUsername && config.kitePassword) {
      console.log('Logging in to Kite...');
      const loginSuccess = await loginToKite(page, config.kiteUsername, config.kitePassword, config.kitePin);
      if (loginSuccess) {
        console.log('✓ Login successful\n');
      } else {
        console.log('⚠ Login failed, continuing anyway...\n');
      }
    }
    await page.close();
    
    // Step 7: Process each option
    const expiry = getNearestExpiry();
    const results = [];
    
    console.log('Processing options...\n');
    for (let i = 0; i < allOptions.length; i++) {
      const { strike, type } = allOptions[i];
      console.log(`[${i + 1}/${allOptions.length}] Processing ${strike}${type}...`);
      
      // Find instrument token
      const instrument = findInstrumentToken(instruments, 'NIFTY', strike, type, expiry);
      
      if (!instrument || !instrument.instrument_token) {
        console.log(`  ⚠ Token not found for ${strike}${type}\n`);
        results.push({ strike, type, success: false, error: 'Token not found' });
        continue;
      }
      
      // Capture chart
      const result = await captureChart(
        browser,
        instrument.instrument_token,
        instrument.tradingsymbol,
        config.outputDir,
        config.chartTheme,
        config.chartWaitTime
      );
      
      results.push({
        strike,
        type,
        symbol: instrument.tradingsymbol,
        ...result
      });
      
      // Delay between captures
      if (i < allOptions.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Step 8: Cleanup
    await closeBrowser(browser);
    
    // Step 9: Summary
    console.log('\n📊 Summary:');
    const successCount = results.filter(r => r.success).length;
    console.log(`  Success: ${successCount}/${allOptions.length}`);
    console.log(`  Screenshots saved to: ${config.outputDir}\n`);
    
    if (successCount < allOptions.length) {
      console.log('Failed captures:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`  ${r.strike}${r.type}: ${r.error || 'Unknown error'}`);
      });
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run
main();
