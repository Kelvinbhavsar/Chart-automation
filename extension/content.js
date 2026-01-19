// Content script that runs on Kite pages

let niftyPrice = null;
let captureInProgress = false;
let shouldStopCapture = false;

// Token cache to avoid repeated API calls
const tokenCache = new Map();
const INSTRUMENT_CACHE_KEY = 'nfo_instruments';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Network request interception cache
const networkTokenCache = new Map();

// Function to fetch instrument tokens from Kite Connect API
async function fetchInstrumentTokenFromAPI(strike, type) {
  try {
    // Check cache first
    const cacheKey = `${strike}_${type}`;
    const cached = tokenCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log(`Using cached token for ${strike}${type}: ${cached.token}`);
      return cached;
    }

    // Try to fetch from Kite's internal API (uses session cookies)
    // First, try to get instruments from Kite's internal endpoint
    const response = await fetch('https://kite.zerodha.com/oms/instruments/NFO', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json, text/plain, */*',
      }
    });

    if (!response.ok) {
      // Fallback: Try Kite Connect API endpoint
      const kiteResponse = await fetch('https://api.kite.trade/instruments/NFO', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'text/csv, application/json',
        }
      });

      if (!kiteResponse.ok) {
        console.log(`API fetch failed for ${strike}${type}: ${kiteResponse.status}`);
        return null;
      }

      return await parseInstrumentsResponse(kiteResponse, strike, type, cacheKey);
    }

    return await parseInstrumentsResponse(response, strike, type, cacheKey);
  } catch (error) {
    console.log(`Error fetching token from API for ${strike}${type}:`, error);
    return null;
  }
}

// Helper function to parse instruments response (CSV or JSON)
async function parseInstrumentsResponse(response, strike, type, cacheKey) {
  const contentType = response.headers.get('content-type') || '';
  let instruments = [];

  if (contentType.includes('application/json')) {
    const data = await response.json();
    instruments = Array.isArray(data) ? data : (data.data || []);
  } else {
    // Parse CSV format
    const text = await response.text();
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length > 1) {
      const headers = lines[0].split(',');
      const tokenIndex = headers.indexOf('instrument_token');
      const symbolIndex = headers.indexOf('tradingsymbol') !== -1 ? headers.indexOf('tradingsymbol') : headers.indexOf('name');
      const strikeIndex = headers.indexOf('strike');
      const typeIndex = headers.indexOf('instrument_type');

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        if (values.length > Math.max(tokenIndex, symbolIndex, strikeIndex, typeIndex)) {
          instruments.push({
            instrument_token: values[tokenIndex]?.trim(),
            tradingsymbol: values[symbolIndex]?.trim(),
            strike: parseFloat(values[strikeIndex]) || 0,
            instrument_type: values[typeIndex]?.trim()
          });
        }
      }
    }
  }

  // Find matching instrument
  const optionType = type.toUpperCase();
  const matchingInstrument = instruments.find(inst => {
    const symbol = (inst.tradingsymbol || inst.name || '').toUpperCase();
    const instStrike = inst.strike || 0;
    const instType = (inst.instrument_type || '').toUpperCase();
    
    // Match by strike and type
    if (Math.abs(instStrike - strike) < 1 && instType === 'OPT') {
      // Check if symbol contains the option type (CE/PE)
      if (symbol.includes(optionType) || 
          (optionType === 'CE' && symbol.includes('CALL')) ||
          (optionType === 'PE' && symbol.includes('PUT'))) {
        return true;
      }
    }
    
    // Also try matching by symbol pattern: NIFTY + strike + type
    const symbolPattern = new RegExp(`NIFTY.*${strike}.*${optionType}`, 'i');
    if (symbolPattern.test(symbol)) {
      return true;
    }
    
    return false;
  });

  if (matchingInstrument && matchingInstrument.instrument_token) {
    const result = {
      token: matchingInstrument.instrument_token,
      symbol: matchingInstrument.tradingsymbol || matchingInstrument.name,
      timestamp: Date.now()
    };
    
    // Cache the result
    tokenCache.set(cacheKey, result);
    
    console.log(`Found token via API for ${strike}${type}: ${result.token}`);
    return result;
  }

  console.log(`No matching instrument found via API for ${strike}${type}`);
  return null;
}

// Function to intercept network requests and extract tokens
function interceptNetworkRequests() {
  // Override fetch to intercept API calls
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    
    // Check if this is a Kite API endpoint that might contain instrument data
    const url = args[0];
    if (typeof url === 'string' && (
      url.includes('/oms/instruments/') ||
      url.includes('/oms/quote/') ||
      url.includes('/api/kite.trade/instruments')
    )) {
      // Clone response to read it without consuming the original
      const clonedResponse = response.clone();
      
      try {
        const data = await clonedResponse.json();
        extractTokensFromResponse(data);
      } catch (e) {
        // Response might not be JSON, try text
        try {
          const text = await clonedResponse.text();
          if (text.includes('instrument_token') || text.includes('NIFTY')) {
            extractTokensFromText(text);
          }
        } catch (e2) {
          // Ignore parsing errors
        }
      }
    }
    
    return response;
  };

  // Also intercept XMLHttpRequest
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;
  
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this._url = url;
    return originalXHROpen.apply(this, [method, url, ...rest]);
  };
  
  XMLHttpRequest.prototype.send = function(...args) {
    if (this._url && (
      this._url.includes('/oms/instruments/') ||
      this._url.includes('/oms/quote/') ||
      this._url.includes('/api/kite.trade/instruments')
    )) {
      this.addEventListener('load', function() {
        try {
          if (this.responseType === '' || this.responseType === 'text') {
            const text = this.responseText;
            if (text && (text.includes('instrument_token') || text.includes('NIFTY'))) {
              extractTokensFromText(text);
            }
          } else if (this.responseType === 'json' || this.response) {
            extractTokensFromResponse(this.response);
          }
        } catch (e) {
          // Ignore parsing errors
        }
      });
    }
    return originalXHRSend.apply(this, args);
  };
}

// Helper function to extract tokens from JSON response
function extractTokensFromResponse(data) {
  if (!data) return;
  
  // Handle array of instruments
  if (Array.isArray(data)) {
    data.forEach(inst => {
      if (inst.instrument_token && inst.tradingsymbol) {
        const symbol = inst.tradingsymbol.toUpperCase();
        if (symbol.includes('NIFTY') && symbol.includes('OPT')) {
          const match = symbol.match(/NIFTY.*?(\d{5,6})(CE|PE)/i);
          if (match) {
            const strike = parseInt(match[1]);
            const type = match[2].toUpperCase();
            const cacheKey = `${strike}_${type}`;
            networkTokenCache.set(cacheKey, {
              token: inst.instrument_token,
              symbol: inst.tradingsymbol,
              timestamp: Date.now()
            });
          }
        }
      }
    });
  } else if (data.data && Array.isArray(data.data)) {
    extractTokensFromResponse(data.data);
  } else if (data.instrument_token && data.tradingsymbol) {
    // Single instrument
    const symbol = data.tradingsymbol.toUpperCase();
    if (symbol.includes('NIFTY') && symbol.includes('OPT')) {
      const match = symbol.match(/NIFTY.*?(\d{5,6})(CE|PE)/i);
      if (match) {
        const strike = parseInt(match[1]);
        const type = match[2].toUpperCase();
        const cacheKey = `${strike}_${type}`;
        networkTokenCache.set(cacheKey, {
          token: data.instrument_token,
          symbol: data.tradingsymbol,
          timestamp: Date.now()
        });
      }
    }
  }
}

// Helper function to extract tokens from text/CSV response
function extractTokensFromText(text) {
  if (!text) return;
  
  // Try to parse as CSV
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length < 2) return;
  
  const headers = lines[0].split(',');
  const tokenIndex = headers.findIndex(h => h.includes('instrument_token'));
  const symbolIndex = headers.findIndex(h => h.includes('tradingsymbol') || h.includes('name'));
  
  if (tokenIndex === -1 || symbolIndex === -1) return;
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    if (values.length > Math.max(tokenIndex, symbolIndex)) {
      const token = values[tokenIndex]?.trim();
      const symbol = (values[symbolIndex]?.trim() || '').toUpperCase();
      
      if (token && symbol.includes('NIFTY') && symbol.includes('OPT')) {
        const match = symbol.match(/NIFTY.*?(\d{5,6})(CE|PE)/i);
        if (match) {
          const strike = parseInt(match[1]);
          const type = match[2].toUpperCase();
          const cacheKey = `${strike}_${type}`;
          networkTokenCache.set(cacheKey, {
            token: token,
            symbol: values[symbolIndex]?.trim(),
            timestamp: Date.now()
          });
        }
      }
    }
  }
}

// Function to get token from network interception cache
function getTokenFromNetworkCache(strike, type) {
  const cacheKey = `${strike}_${type}`;
  const cached = networkTokenCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    console.log(`Using network cache token for ${strike}${type}: ${cached.token}`);
    return cached;
  }
  return null;
}

// Function to scrape Nifty price from the page
function scrapeNiftyPrice() {
  // Method 1: Look for elements with "last-price" class (including "last-price up")
  const lastPriceElements = document.querySelectorAll('[class*="last-price"]');
  
  for (let elem of lastPriceElements) {
    // Check if element has "last-price" class (works for both "last-price" and "last-price up")
    if (elem.classList.contains('last-price')) {
      // Check if nearby context has NIFTY
      let parent = elem;
      let checked = 0;
      while (parent && checked < 10) { // Check up to 10 levels up
        const parentText = parent.textContent || '';
        if (parentText.includes('NIFTY') || parentText.includes('Nifty')) {
          const priceText = elem.textContent.trim().replace(/[^\d.]/g, '');
          const price = parseFloat(priceText);
          if (price > 10000 && price < 50000) {
            console.log('Found Nifty price:', price);
            return price;
          }
        }
        parent = parent.parentElement;
        checked++;
      }
    }
  }
  
  // Method 2: Look for any element with "last-price" and extract price (fallback)
  for (let elem of lastPriceElements) {
    if (elem.classList.contains('last-price')) {
      const priceText = elem.textContent.trim().replace(/[^\d.]/g, '');
      const price = parseFloat(priceText);
      if (price > 10000 && price < 50000) {
        console.log('Found price from last-price element:', price);
        return price;
      }
    }
  }
  
  // Method 3: Look for .last-price within NIFTY context
  const niftyElements = document.querySelectorAll('[data-symbol*="NIFTY"], [data-symbol*="Nifty"], [class*="nifty"], [class*="NIFTY"]');
  
  for (let niftyElem of niftyElements) {
    const lastPriceElem = niftyElem.querySelector('.last-price');
    if (lastPriceElem) {
      const priceText = lastPriceElem.textContent.trim().replace(/[^\d.]/g, '');
      const price = parseFloat(priceText);
      if (price > 10000 && price < 50000) {
        console.log('Found Nifty price from NIFTY context:', price);
        return price;
      }
    }
  }

  // Method 4: Fallback - search for text containing "NIFTY" and extract nearby price
  const allElements = document.querySelectorAll('*');
  for (let element of allElements) {
    const text = element.textContent || '';
    if (text.includes('NIFTY') || text.includes('Nifty')) {
      // Look for price pattern (4-6 digits)
      const priceMatch = text.match(/NIFTY[^\d]*(\d{4,6})/i) || text.match(/(\d{4,6})[^\d]*NIFTY/i);
      if (priceMatch) {
        const price = parseFloat(priceMatch[1]);
        if (price > 10000 && price < 50000) {
          console.log('Found Nifty price from text match:', price);
          return price;
        }
      }
    }
  }

  console.log('Could not find Nifty price');
  return null;
}

// Function to calculate ITM strikes
function calculateITMStrikes(currentPrice) {
  const strikeInterval = 50; // Typical Nifty strike interval
  
  const ceStrikes = [];
  const peStrikes = [];
  
  // Get 5 ITM CE strikes (below current price)
  for (let i = 1; i <= 5; i++) {
    const strike = Math.floor((currentPrice - (i * strikeInterval)) / strikeInterval) * strikeInterval;
    if (strike > 0) ceStrikes.push(strike);
  }
  
  // Get 5 ITM PE strikes (above current price)
  for (let i = 1; i <= 5; i++) {
    const strike = Math.ceil((currentPrice + (i * strikeInterval)) / strikeInterval) * strikeInterval;
    peStrikes.push(strike);
  }
  
  return { ceStrikes, peStrikes };
}

// Function to capture screenshot of current page
async function captureScreenshot(filename) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      action: 'captureScreenshot',
      filename: filename
    }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (response && response.success) {
        resolve(response);
      } else {
        reject(new Error(response?.error || 'Screenshot failed'));
      }
    });
  });
}

// Enhanced DOM scraping with MutationObserver support
let optionsChainObserver = null;
let optionsChainReady = false;

// Check if API and chart renderer modules are loaded
function checkModulesLoaded() {
  return {
    apiLoaded: typeof window.getAPICredentials !== 'undefined',
    chartLoaded: typeof window.renderTradingViewChart !== 'undefined'
  };
}

// Fetch token using Kite Connect API
async function fetchTokenViaKiteAPI(strike, type) {
  try {
    const modules = checkModulesLoaded();
    if (!modules.apiLoaded) {
      console.error('API module not loaded');
      return null;
    }
    
    const credentials = await window.getAPICredentials();
    
    if (!credentials.accessToken || !credentials.apiKey) {
      console.log('API credentials not set. Please configure access token in extension settings.');
      return null;
    }
    
    // Fetch instruments (cache this - only fetch once per session)
    if (!window.nfoInstrumentsCache) {
      console.log('Fetching NFO instruments from Kite Connect API...');
      try {
        window.nfoInstrumentsCache = await window.fetchNFOInstruments(credentials.accessToken, credentials.apiKey);
        console.log(`Fetched ${window.nfoInstrumentsCache.length} NFO instruments`);
      } catch (error) {
        console.error('Error fetching instruments:', error);
        return null;
      }
    }
    
    // Find matching instrument
    const expiry = window.getNearestExpiry();
    const instrument = window.findInstrumentToken(window.nfoInstrumentsCache, 'NIFTY', strike, type, expiry);
    
    if (instrument && instrument.instrument_token) {
      console.log(`Found token via Kite API for ${strike}${type}: ${instrument.instrument_token}`);
      return {
        token: instrument.instrument_token,
        symbol: instrument.tradingsymbol,
        expiry: instrument.expiry
      };
    }
    
    console.log(`No instrument found for ${strike}${type}`);
    return null;
  } catch (error) {
    console.error(`Error fetching token via Kite API for ${strike}${type}:`, error);
    return null;
  }
}

// Unified function to fetch instrument token with fallback chain
async function fetchInstrumentToken(strike, type) {
  console.log(`Fetching token for ${strike}${type}...`);
  
  // Method 1: Try Kite Connect API (primary method)
  try {
    const apiResult = await fetchTokenViaKiteAPI(strike, type);
    if (apiResult && apiResult.token) {
      return apiResult;
    }
  } catch (error) {
    console.log(`Kite API fetch failed for ${strike}${type}, trying fallback:`, error);
  }
  
  // Method 2: Try network interception cache (fallback)
  const networkCacheResult = getTokenFromNetworkCache(strike, type);
  if (networkCacheResult) {
    return networkCacheResult;
  }
  
  // Method 3: Try enhanced DOM scraping (fallback)
  try {
    const domResult = await findOptionLink(strike, type);
    if (domResult && domResult.token) {
      // Cache the DOM result
      const cacheKey = `${strike}_${type}`;
      tokenCache.set(cacheKey, {
        token: domResult.token,
        symbol: domResult.symbol,
        timestamp: Date.now()
      });
      return {
        token: domResult.token,
        symbol: domResult.symbol,
        url: domResult.url
      };
    }
  } catch (error) {
    console.log(`DOM scraping failed for ${strike}${type}:`, error);
  }
  
  console.log(`Could not fetch token for ${strike}${type} using any method`);
  return null;
}

// Function to wait for options chain to load
function waitForOptionsChain(maxWait = 10000) {
  return new Promise((resolve) => {
    if (optionsChainReady) {
      resolve(true);
      return;
    }

    // Check if options chain is already present
    const existingChain = document.querySelector('[class*="options"], [class*="chain"], [data-symbol*="NIFTY"]');
    if (existingChain) {
      optionsChainReady = true;
      resolve(true);
      return;
    }

    // Set up MutationObserver to watch for options chain
    const observer = new MutationObserver((mutations) => {
      const chain = document.querySelector('[class*="options"], [class*="chain"], [data-symbol*="NIFTY"]');
      if (chain) {
        optionsChainReady = true;
        observer.disconnect();
        resolve(true);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Timeout after maxWait
    setTimeout(() => {
      observer.disconnect();
      resolve(false);
    }, maxWait);
  });
}

// Function to find option link and extract token/symbol from options chain
async function findOptionLink(strike, type) {
  // Wait for options chain to load if not ready
  if (!optionsChainReady) {
    await waitForOptionsChain(5000);
  }

  // Strategy 1: Look for links with chart URL pattern (enhanced selectors)
  const chartLinkSelectors = [
    'a[href*="/chart/"]',
    'a[href*="NFO-OPT"]',
    'a[href*="NIFTY"]',
    '[data-href*="/chart/"]',
    '[data-href*="NFO-OPT"]',
    '[data-url*="/chart/"]',
    '[data-url*="NFO-OPT"]'
  ];
  
  for (const selector of chartLinkSelectors) {
    const chartLinks = document.querySelectorAll(selector);
    
    for (let link of chartLinks) {
      const href = link.getAttribute('href') || link.getAttribute('data-href') || link.getAttribute('data-url') || '';
      const text = (link.textContent || '').trim();
      
      // Check if link contains strike and type in URL
      if (href.includes(strike.toString()) && (href.includes(type) || href.toUpperCase().includes(type))) {
        // Extract token and symbol from URL
        // Format: /NFO-OPT/NIFTY2612025700CE/12188930
        const match = href.match(/NFO-OPT\/([^\/]+)\/(\d{7,8})/);
        if (match) {
          return {
            symbol: match[1],
            token: match[2],
            url: href.startsWith('http') ? href : `https://kite.zerodha.com${href}`
          };
        }
      }
    }
  }
  
  // Strategy 2: Look in table rows for strike and type, then find chart link (enhanced)
  const rowSelectors = [
    'tr',
    'div[class*="row"]',
    'li[class*="option"]',
    '[data-strike]',
    '[data-symbol*="NIFTY"]',
    '[class*="option-row"]',
    '[class*="strike-row"]'
  ];
  
  for (const selector of rowSelectors) {
    const allRows = document.querySelectorAll(selector);
    for (let row of allRows) {
      const rowText = row.textContent || '';
      const dataStrike = row.getAttribute('data-strike');
      
      // Check if row contains the strike and type
      const hasStrike = dataStrike === strike.toString() || rowText.includes(strike.toString());
      const hasType = rowText.includes(type) || rowText.toUpperCase().includes(type);
      
      if (hasStrike && hasType) {
        // Find chart link in this row
        const rowLinks = row.querySelectorAll('a[href*="/chart/"], a[href*="NFO-OPT"], [data-href*="/chart/"], [data-href*="NFO-OPT"]');
        for (let link of rowLinks) {
          const href = link.getAttribute('href') || link.getAttribute('data-href') || '';
          const match = href.match(/NFO-OPT\/([^\/]+)\/(\d{7,8})/);
          if (match) {
            return {
              symbol: match[1],
              token: match[2],
              url: href.startsWith('http') ? href : `https://kite.zerodha.com${href}`
            };
          }
        }
      }
    }
  }
  
  // Strategy 3: Look for data attributes with token information
  const dataTokenElements = document.querySelectorAll('[data-token], [data-instrument-token], [data-instrument_token]');
  for (let elem of dataTokenElements) {
    const token = elem.getAttribute('data-token') || 
                  elem.getAttribute('data-instrument-token') || 
                  elem.getAttribute('data-instrument_token');
    const symbol = elem.getAttribute('data-symbol') || elem.textContent || '';
    const strikeAttr = elem.getAttribute('data-strike');
    
    if (token && symbol.toUpperCase().includes('NIFTY')) {
      const symbolUpper = symbol.toUpperCase();
      const hasStrike = strikeAttr === strike.toString() || symbolUpper.includes(strike.toString());
      const hasType = symbolUpper.includes(type) || 
                     (type === 'CE' && (symbolUpper.includes('CALL') || symbolUpper.includes('CE'))) ||
                     (type === 'PE' && (symbolUpper.includes('PUT') || symbolUpper.includes('PE')));
      
      if (hasStrike && hasType) {
        return {
          symbol: symbol,
          token: token,
          url: `https://kite.zerodha.com/markets/chart/web/ciq/NFO-OPT/${symbol}/${token}?theme=dark`
        };
      }
    }
  }
  
  // Strategy 4: Try to find option by text pattern (enhanced)
  const optionElements = document.querySelectorAll('*');
  for (let elem of optionElements) {
    const text = elem.textContent || '';
    // Look for exact match: strike + type (e.g., "25700CE" or "25700 CE")
    const strikePattern = new RegExp(`\\b${strike}\\s*${type}\\b`, 'i');
    if (strikePattern.test(text)) {
      // Try to find chart link nearby
      const parent = elem.closest('tr, div, li, [class*="option"], [class*="row"]');
      if (parent) {
        const link = parent.querySelector('a[href*="/chart/"], a[href*="NFO-OPT"], [data-href*="/chart/"], [data-href*="NFO-OPT"]');
        if (link) {
          const href = link.getAttribute('href') || link.getAttribute('data-href') || '';
          const match = href.match(/NFO-OPT\/([^\/]+)\/(\d{7,8})/);
          if (match) {
            return {
              symbol: match[1],
              token: match[2],
              url: href.startsWith('http') ? href : `https://kite.zerodha.com${href}`
            };
          }
        }
        
        // Also check for data attributes in parent
        const token = parent.getAttribute('data-token') || parent.getAttribute('data-instrument-token');
        const symbol = parent.getAttribute('data-symbol');
        if (token && symbol) {
          return {
            symbol: symbol,
            token: token,
            url: `https://kite.zerodha.com/markets/chart/web/ciq/NFO-OPT/${symbol}/${token}?theme=dark`
          };
        }
      }
    }
  }
  
  return null;
}

// Fetch historical data and render chart
async function fetchAndRenderChart(instrumentToken, symbol, strike, type) {
  try {
    const modules = checkModulesLoaded();
    if (!modules.apiLoaded || !modules.chartLoaded) {
      throw new Error('Required modules not loaded');
    }
    
    const credentials = await window.getAPICredentials();
    
    if (!credentials.accessToken || !credentials.apiKey) {
      throw new Error('API credentials not set. Please configure access token.');
    }
    
    // Calculate date range (last 30 days)
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(toDate.getDate() - 30);
    
    const fromDateStr = fromDate.toISOString().split('T')[0];
    const toDateStr = toDate.toISOString().split('T')[0];
    
    // Fetch historical data
    console.log(`Fetching historical data for ${symbol} (token: ${instrumentToken})...`);
    const historicalData = await window.fetchHistoricalData(
      credentials.accessToken,
      credentials.apiKey,
      instrumentToken,
      'day', // interval: minute, 3minute, 5minute, 15minute, 30minute, 60minute, day
      fromDateStr,
      toDateStr
    );
    
    if (!historicalData || historicalData.length === 0) {
      throw new Error('No historical data available for this instrument');
    }
    
    console.log(`Fetched ${historicalData.length} candles for ${symbol}`);
    
    // Load TradingView library if not already loaded
    if (typeof TradingView === 'undefined') {
      await loadTradingViewLibrary();
    }
    
    // Create a hidden container for chart
    const chartContainer = document.createElement('div');
    chartContainer.id = `chart-${instrumentToken}-${Date.now()}`;
    chartContainer.style.width = '1200px';
    chartContainer.style.height = '600px';
    chartContainer.style.position = 'fixed';
    chartContainer.style.top = '-9999px';
    chartContainer.style.left = '-9999px';
    chartContainer.style.backgroundColor = '#ffffff';
    document.body.appendChild(chartContainer);
    
    // Render chart
    const chart = window.renderTradingViewChart(chartContainer.id, historicalData, symbol);
    
    if (!chart) {
      throw new Error('Failed to render chart');
    }
    
    // Wait for chart to render
    const renderSuccess = await window.waitForChartRender(chartContainer, 5000);
    if (!renderSuccess) {
      console.warn('Chart may not have fully rendered, proceeding anyway...');
    }
    
    // Additional wait to ensure chart is fully drawn
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Capture screenshot
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `NIFTY_${strike}_${type}_${timestamp}.png`;
    
    await window.captureChartScreenshot(chartContainer, filename);
    
    // Cleanup
    setTimeout(() => {
      if (chartContainer.parentNode) {
        document.body.removeChild(chartContainer);
      }
    }, 1000);
    
    return { success: true, filename };
  } catch (error) {
    console.error(`Error rendering chart for ${symbol}:`, error);
    return { success: false, error: error.message };
  }
}

// Load TradingView library
function loadTradingViewLibrary() {
  return new Promise((resolve, reject) => {
    if (typeof TradingView !== 'undefined') {
      resolve();
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/lightweight-charts/dist/lightweight-charts.standalone.production.js';
    script.onload = () => {
      // TradingView is available as window.TradingView
      if (typeof TradingView !== 'undefined') {
        resolve();
      } else {
        reject(new Error('TradingView library loaded but not available'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load TradingView library'));
    document.head.appendChild(script);
  });
}

// Function to open option chart in new tab and capture (API-based)
async function captureOptionChart(strike, type, index, total) {
  return new Promise(async (resolve) => {
    // Check if stop was requested
    if (shouldStopCapture) {
      resolve({ strike, type, success: false, error: 'Stopped by user' });
      return;
    }
    
    console.log(`[${index + 1}/${total}] Processing ${strike}${type}...`);
    
    // Step 1: Fetch token via Kite Connect API
    const tokenInfo = await fetchInstrumentToken(strike, type);
    
    if (!tokenInfo || !tokenInfo.token) {
      resolve({ strike, type, success: false, error: 'Token not found' });
      return;
    }
    
    console.log(`Found token for ${strike}${type}: ${tokenInfo.token} (${tokenInfo.symbol})`);
    
    // Step 2: Fetch data and render chart
    const result = await fetchAndRenderChart(tokenInfo.token, tokenInfo.symbol, strike, type);
    
    resolve({
      strike,
      type,
      success: result.success,
      filename: result.filename,
      error: result.error
    });
  });
}

// Main function to capture all options
async function captureAllOptions(niftyPrice) {
  const { ceStrikes, peStrikes } = calculateITMStrikes(niftyPrice);
  
  console.log('Nifty Price:', niftyPrice);
  console.log('CE Strikes (ITM):', ceStrikes);
  console.log('PE Strikes (ITM):', peStrikes);
  
  const allOptions = [
    ...ceStrikes.map(s => ({ strike: s, type: 'CE' })),
    ...peStrikes.map(s => ({ strike: s, type: 'PE' }))
  ];
  
  const results = [];
  captureInProgress = true;
  shouldStopCapture = false;
  
  for (let i = 0; i < allOptions.length; i++) {
    // Check if stop was requested
    if (shouldStopCapture) {
      console.log('Capture stopped by user');
      captureInProgress = false;
      return { 
        success: true, 
        stopped: true,
        count: results.filter(r => r.success).length,
        total: results.length,
        results: results
      };
    }
    
    const { strike, type } = allOptions[i];
    const result = await captureOptionChart(strike, type, i, allOptions.length);
    results.push(result);
    
    // Check again after capture
    if (shouldStopCapture) {
      console.log('Capture stopped by user');
      captureInProgress = false;
      return { 
        success: true, 
        stopped: true,
        count: results.filter(r => r.success).length,
        total: results.length,
        results: results
      };
    }
    
    // Wait before next capture
    if (i < allOptions.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  captureInProgress = false;
  return results;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getNiftyPrice') {
    niftyPrice = scrapeNiftyPrice();
    sendResponse({ price: niftyPrice });
    return true;
  }
  
  if (request.action === 'stopCapture') {
    shouldStopCapture = true;
    sendResponse({ success: true, message: 'Stop signal sent' });
    return true;
  }
  
  if (request.action === 'captureOptions') {
    // Check if capture is already in progress
    if (captureInProgress) {
      sendResponse({ success: false, error: 'Capture already in progress' });
      return true;
    }
    
    if (!niftyPrice) {
      niftyPrice = scrapeNiftyPrice();
    }
    
    if (!niftyPrice) {
      sendResponse({ success: false, error: 'Could not find Nifty price on page. Make sure Nifty chart/price is visible.' });
      return true;
    }
    
    // Reset stop flag
    shouldStopCapture = false;
    
    // Start capture process
    captureAllOptions(niftyPrice).then(results => {
      if (results.stopped) {
        // Capture was stopped
        sendResponse(results);
      } else {
        // Normal completion
        const successCount = results.filter(r => r.success).length;
        sendResponse({ 
          success: true, 
          count: successCount,
          total: results.length,
          results: results
        });
      }
    }).catch(error => {
      captureInProgress = false;
      sendResponse({ success: false, error: error.message });
    });
    
    return true; // Will respond asynchronously
  }
});

// Initialize network interception on page load
interceptNetworkRequests();

// Auto-detect Nifty price when page loads
setTimeout(() => {
  niftyPrice = scrapeNiftyPrice();
  if (niftyPrice) {
    console.log('Auto-detected Nifty price:', niftyPrice);
  }
}, 3000);
