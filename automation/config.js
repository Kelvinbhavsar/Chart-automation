// Configuration for Kite Chart Automation

export const config = {
  // Kite Connect API credentials
  apiKey: process.env.API_KEY || '3ngsjp3dclif0m3o',
  apiSecret: process.env.API_SECRET || 'p60rabo57qehlcvezoxmalev9i0k4tvb',
  accessToken: process.env.ACCESS_TOKEN || null, // Set this or generate from request_token
  requestToken: process.env.REQUEST_TOKEN || null, // Use this to generate access_token
  
  // Nifty price (or set to null to calculate from current market)
  niftyPrice: process.env.NIFTY_PRICE ? parseFloat(process.env.NIFTY_PRICE) : null,
  
  // Strike calculation
  strikeInterval: 50, // Nifty strike interval
  itmStrikesCount: 5, // Number of ITM strikes for CE and PE
  
  // Output settings
  outputDir: process.env.OUTPUT_DIR || './screenshots',
  tokenFile: process.env.TOKEN_FILE || './.access_token', // File to persist access token
  
  // Chart settings
  chartTheme: 'dark', // 'dark' or 'light'
  chartWaitTime: 5000, // Wait time for chart to load (ms)
  
  // Browser settings
  headless: process.env.HEADLESS !== 'false', // Run in headless mode
  browserType: 'chromium', // 'chromium', 'firefox', or 'webkit'
  
  // Kite login (optional - if access_token not provided)
  kiteUsername: process.env.KITE_USERNAME || null,
  kitePassword: process.env.KITE_PASSWORD || null,
  kitePin: process.env.KITE_PIN || null
};
