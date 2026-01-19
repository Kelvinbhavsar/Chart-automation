// Playwright chart capture functions

import { chromium, firefox, webkit } from 'playwright';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// Initialize browser
export async function initBrowser(browserType = 'chromium', headless = true) {
  const browserMap = { chromium, firefox, webkit };
  const Browser = browserMap[browserType] || chromium;
  
  return await Browser.launch({
    headless,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
}

// Login to Kite (if credentials provided)
export async function loginToKite(page, username, password, pin) {
  if (!username || !password) {
    return false; // No credentials, skip login
  }
  
  try {
    await page.goto('https://kite.zerodha.com');
    await page.fill('input[name="user_id"]', username);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    
    // Wait for PIN page
    if (pin) {
      await page.waitForSelector('input[type="password"]', { timeout: 5000 });
      await page.fill('input[type="password"]', pin);
      await page.click('button[type="submit"]');
    }
    
    // Wait for dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    return true;
  } catch (error) {
    console.error('Login failed:', error.message);
    return false;
  }
}

// Load chart and capture screenshot
export async function captureChart(browser, instrumentToken, symbol, outputDir, theme = 'dark', waitTime = 5000) {
  const page = await browser.newPage();
  
  try {
    // Ensure output directory exists
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
    
    // Construct chart URL (per Kite documentation)
    // Format: https://kite.zerodha.com/markets/chart/web/ciq/NFO-OPT/{symbol}/{token}?theme={theme}
    const chartUrl = `https://kite.zerodha.com/markets/chart/web/ciq/NFO-OPT/${symbol}/${instrumentToken}?theme=${theme}`;
    
    console.log(`Loading chart: ${symbol} (${instrumentToken})`);
    console.log(`  URL: ${chartUrl}`);
    
    await page.goto(chartUrl, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Wait for chart to load (look for canvas or chart container)
    // Kite charts use canvas elements for rendering
    try {
      // Wait for chart canvas to appear
      await page.waitForSelector('canvas', { timeout: 15000 });
      console.log('  ✓ Chart canvas detected');
    } catch (e) {
      console.log('  ⚠ Canvas not found, waiting for chart to load...');
      // Fallback: wait for chart container or any chart-related element
      try {
        await page.waitForSelector('[class*="chart"], [id*="chart"], canvas', { timeout: waitTime });
      } catch (e2) {
        // If still not found, wait for default time
        await page.waitForTimeout(waitTime);
      }
    }
    
    // Additional wait for chart rendering and data loading
    await page.waitForTimeout(3000);
    
    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const match = symbol.match(/(\d+)(CE|PE)/i);
    const strike = match ? match[1] : 'unknown';
    const type = match ? match[2].toUpperCase() : 'UNKNOWN';
    const filename = `NIFTY_${strike}_${type}_${timestamp}.png`;
    const filepath = join(outputDir, filename);
    
    // Capture screenshot
    await page.screenshot({
      path: filepath,
      fullPage: false,
      type: 'png'
    });
    
    console.log(`✓ Screenshot saved: ${filename}`);
    return { success: true, filename, filepath };
    
  } catch (error) {
    console.error(`Error capturing chart for ${symbol}:`, error.message);
    return { success: false, error: error.message };
  } finally {
    await page.close();
  }
}

// Close browser
export async function closeBrowser(browser) {
  await browser.close();
}
