// Playwright chart capture functions

import { chromium, firefox, webkit } from 'playwright';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// Initialize browser
export async function initBrowser(browserType = 'chromium', headless = true, useExistingChrome = false, cdpEndpoint = 'http://localhost:9222') {
  // If connecting to existing Chrome via CDP
  if (useExistingChrome && browserType === 'chromium') {
    try {
      console.log(`Connecting to existing Chrome at ${cdpEndpoint}...`);
      const browser = await chromium.connectOverCDP(cdpEndpoint);
      console.log('✓ Connected to existing Chrome browser');
      return browser;
    } catch (error) {
      console.error(`❌ Failed to connect to Chrome: ${error.message}`);
      console.error('\n💡 Chrome is not running with remote debugging enabled.');
      console.error('   To fix this, you have two options:\n');
      console.error('   Option 1: Start Chrome with remote debugging:');
      console.error('     /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome \\');
      console.error('       --remote-debugging-port=9222 \\');
      console.error('       --user-data-dir="$HOME/Library/Application Support/Google/Chrome"');
      console.error('\n   Option 2: Use the helper script:');
      console.error('     ./start-chrome-debug.sh');
      console.error('\n   Falling back to launching a new browser instance...\n');
      
      // Fallback: Launch a new browser instead of failing
      console.log('Launching new browser instance...');
      const browserMap = { chromium, firefox, webkit };
      const Browser = browserMap[browserType] || chromium;
      return await Browser.launch({
        headless,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
  }
  
  // Fallback to launching new browser
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
    
    // Navigate to chart URL with multiple wait strategies
    console.log('  → Navigating to chart URL...');
    
    // Set a longer timeout for navigation
    page.setDefaultNavigationTimeout(60000);
    page.setDefaultTimeout(30000);
    
    const response = await page.goto(chartUrl, { 
      waitUntil: 'domcontentloaded', // Start with DOM content loaded
      timeout: 60000 // Increase timeout to 60 seconds
    });
    
    if (!response || !response.ok()) {
      console.log(`  ⚠ HTTP Status: ${response?.status() || 'No response'}`);
      if (response && response.status() === 401 || response.status() === 403) {
        console.log('  ⚠ Authentication required - make sure you are logged in to Kite');
      }
    } else {
      console.log(`  ✓ Page loaded (HTTP ${response.status()})`);
    }
    
    // Wait for page to be fully interactive
    console.log('  → Waiting for page to be ready...');
    
    // Wait for load state
    await page.waitForLoadState('load', { timeout: 20000 }).catch(() => {
      console.log('  ⚠ Load state timeout, continuing...');
    });
    
    // Wait for network to be idle (no active requests)
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {
      console.log('  ⚠ Network idle timeout, continuing...');
    });
    
    // Check if we're on a login page (redirected)
    const currentUrl = page.url();
    if (currentUrl.includes('/login') || currentUrl.includes('/connect/login')) {
      console.log('  ⚠ Redirected to login page - authentication required');
      console.log(`  Current URL: ${currentUrl}`);
    }
    
    // Wait for chart to load (look for canvas or chart container)
    // Kite charts use canvas elements for rendering
    console.log('  → Waiting for chart to render...');
    let chartReady = false;
    
    // Strategy 1: Wait for canvas element (primary chart element)
    try {
      await page.waitForSelector('canvas', { timeout: 20000, state: 'attached' });
      console.log('  ✓ Chart canvas detected');
      chartReady = true;
    } catch (e) {
      console.log('  ⚠ Canvas not found, trying alternative selectors...');
    }
    
    // Strategy 2: Wait for chart container elements
    if (!chartReady) {
      try {
        // Look for common chart container classes/IDs
        await page.waitForSelector(
          '[class*="chart"], [id*="chart"], [class*="tradingview"], [class*="ciq"]',
          { timeout: 15000 }
        );
        console.log('  ✓ Chart container detected');
        chartReady = true;
      } catch (e2) {
        console.log('  ⚠ Chart container not found, waiting fixed time...');
      }
    }
    
    // Strategy 3: Wait for page to be fully loaded and check for chart-related content
    if (!chartReady) {
      console.log('  → Waiting for page content to load...');
      await page.waitForLoadState('load', { timeout: 15000 }).catch(() => {});
      
      // Check if page has loaded (not showing error or login page)
      const pageContent = await page.content();
      const hasChartContent = pageContent.includes('chart') || 
                              pageContent.includes('canvas') || 
                              pageContent.includes('tradingview') ||
                              pageContent.includes('ciq');
      
      if (hasChartContent) {
        console.log('  ✓ Chart-related content detected in page');
        chartReady = true;
      } else {
        console.log('  ⚠ No chart content detected, checking page title...');
        const title = await page.title();
        console.log(`  Page title: ${title}`);
      }
    }
    
    // Additional wait for chart rendering and data loading
    console.log('  → Waiting for chart data to load...');
    
    // Wait for chart to be interactive (canvas exists and has dimensions)
    try {
      // Wait for canvas to have dimensions (chart is initialized)
      await page.waitForFunction(
        () => {
          const canvas = document.querySelector('canvas');
          if (!canvas) return false;
          // Check if canvas has been initialized with dimensions
          return canvas.width > 0 && canvas.height > 0;
        },
        { timeout: 15000 }
      ).catch(() => {
        console.log('  ⚠ Canvas dimension check timeout, proceeding anyway...');
      });
    } catch (e) {
      // If function check fails, just wait fixed time
      console.log('  → Waiting fixed time for chart to render...');
    }
    
    // Wait for chart to fully render with data
    await page.waitForTimeout(Math.max(waitTime, 8000)); // At least 8 seconds for chart to fully render
    
    // One more check - wait for any loading indicators to disappear
    try {
      await page.waitForFunction(
        () => {
          // Check if loading spinners/indicators are gone
          const loaders = document.querySelectorAll('[class*="loading"], [class*="spinner"], [class*="loader"]');
          const visibleLoaders = Array.from(loaders).filter(el => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden';
          });
          return visibleLoaders.length === 0;
        },
        { timeout: 10000 }
      ).catch(() => {
        console.log('  ⚠ Loading indicator check timeout, proceeding...');
      });
    } catch (e) {
      // Ignore - proceed with screenshot
    }
    
    // Verify chart is visible before screenshot
    const canvasCount = await page.locator('canvas').count();
    console.log(`  → Found ${canvasCount} canvas element(s)`);
    
    if (canvasCount === 0) {
      console.log('  ⚠ Warning: No canvas elements found, screenshot may not show chart');
      // Try to find any chart-related elements
      const chartElements = await page.locator('[class*="chart"], [id*="chart"], [class*="ciq"]').count();
      console.log(`  → Found ${chartElements} chart-related element(s)`);
    } else {
      // Check if canvas is visible
      const firstCanvas = page.locator('canvas').first();
      const isVisible = await firstCanvas.isVisible().catch(() => false);
      console.log(`  → Canvas visible: ${isVisible}`);
    }
    
    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const match = symbol.match(/(\d+)(CE|PE)/i);
    const strike = match ? match[1] : 'unknown';
    const type = match ? match[2].toUpperCase() : 'UNKNOWN';
    const filename = `NIFTY_${strike}_${type}_${timestamp}.png`;
    const filepath = join(outputDir, filename);
    
    // Capture screenshot
    console.log('  → Capturing screenshot...');
    await page.screenshot({
      path: filepath,
      fullPage: false,
      type: 'png',
      timeout: 10000
    });
    
    console.log(`  ✓ Screenshot saved: ${filename}`);
    return { success: true, filename, filepath };
    
  } catch (error) {
    console.error(`  ❌ Error capturing chart for ${symbol}:`, error.message);
    
    // Try to capture screenshot even on error (might still have useful content)
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const match = symbol.match(/(\d+)(CE|PE)/i);
      const strike = match ? match[1] : 'unknown';
      const type = match ? match[2].toUpperCase() : 'UNKNOWN';
      const filename = `NIFTY_${strike}_${type}_${timestamp}_ERROR.png`;
      const filepath = join(outputDir, filename);
      await page.screenshot({ path: filepath, fullPage: true });
      console.log(`  → Error screenshot saved: ${filename}`);
    } catch (screenshotError) {
      // Ignore screenshot errors
    }
    
    return { success: false, error: error.message };
  } finally {
    await page.close();
  }
}

// Close browser
export async function closeBrowser(browser) {
  // For CDP connections, this will disconnect without closing the actual Chrome browser
  // For regular browser instances, this will close the browser
  await browser.close();
}
