// Kite Connect API functions

import { createHash } from 'crypto';

const KITE_API_BASE = 'https://api.kite.trade';

// Generate access token from request token
export async function generateAccessToken(apiKey, apiSecret, requestToken) {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/6676a7ca-b2e5-4a74-983d-8b91ff876270',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'kite-api.js:9',message:'generateAccessToken entry',data:{apiKeyLength:apiKey?.length||0,apiSecretLength:apiSecret?.length||0,requestTokenLength:requestToken?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  
  // FIX: Use function parameters instead of hardcoded values
  const trimmedApiKey = (apiKey || '').trim();
  const trimmedApiSecret = (apiSecret || '').trim();
  const trimmedRequestToken = (requestToken || '').trim();
  
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/6676a7ca-b2e5-4a74-983d-8b91ff876270',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'kite-api.js:13',message:'After trimming credentials',data:{trimmedApiKeyLength:trimmedApiKey.length,trimmedApiSecretLength:trimmedApiSecret.length,trimmedRequestTokenLength:trimmedRequestToken.length,apiKeyPrefix:trimmedApiKey.substring(0,6)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  
  if (!trimmedApiKey || trimmedApiKey.length < 6) {
    throw new Error('API Key must be at least 6 characters');
  }
  if (!trimmedApiSecret) {
    throw new Error('API Secret is required');
  }
  if (!trimmedRequestToken || trimmedRequestToken.length < 10) {
    throw new Error('Request Token must be at least 10 characters');
  }
  
  // Generate checksum: SHA256(api_key + request_token + api_secret)
  // Per Kite Connect API documentation
  const message = trimmedApiKey + trimmedRequestToken + trimmedApiSecret;
  
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/6676a7ca-b2e5-4a74-983d-8b91ff876270',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'kite-api.js:26',message:'Before checksum calculation',data:{messageLength:message.length,messagePrefix:message.substring(0,20)+'...'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  
  // Use Node.js crypto module (crypto.subtle is browser-only)
  const checksum = createHash('sha256').update(message).digest('hex');
  
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/6676a7ca-b2e5-4a74-983d-8b91ff876270',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'kite-api.js:30',message:'After checksum calculation',data:{checksumLength:checksum?.length||0,checksumPrefix:checksum?.substring(0,16)+'...'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  
  if (!checksum || checksum.length !== 64) {
    throw new Error(`Checksum generation failed. Expected 64 characters, got ${checksum ? checksum.length : 0}`);
  }
  
  // Kite API expects application/x-www-form-urlencoded, not multipart/form-data
  // Use URLSearchParams instead of FormData
  const formParams = new URLSearchParams();
  formParams.append('api_key', trimmedApiKey);
  formParams.append('request_token', trimmedRequestToken);
  formParams.append('checksum', checksum);
  
  const formBody = formParams.toString();
  
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/6676a7ca-b2e5-4a74-983d-8b91ff876270',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'kite-api.js:60',message:'Form params created',data:{url:`${KITE_API_BASE}/session/token`,apiKeyLength:trimmedApiKey.length,requestTokenLength:trimmedRequestToken.length,checksumLength:checksum.length,formBodyLength:formBody.length,formBodyPreview:formBody.substring(0,80)+'...',contentType:'application/x-www-form-urlencoded'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  
  // Also log to console for visibility
  console.log('[DEBUG] Request URL:', `${KITE_API_BASE}/session/token`);
  console.log('[DEBUG] Request Body (first 100 chars):', formBody.substring(0, 100));
  console.log('[DEBUG] Content-Type:', 'application/x-www-form-urlencoded');
  
  const response = await fetch(`${KITE_API_BASE}/session/token`, {
    method: 'POST',
    body: formBody, // URLSearchParams.toString() creates urlencoded string
    headers: { 
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Kite-Version': '3' 
    }
  });
  
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/6676a7ca-b2e5-4a74-983d-8b91ff876270',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'kite-api.js:45',message:'After token API request',data:{status:response.status,statusText:response.statusText,ok:response.ok},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  
  if (!response.ok) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/6676a7ca-b2e5-4a74-983d-8b91ff876270',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'kite-api.js:77',message:'Entering error handling',data:{status:response.status,statusText:response.statusText,contentType:response.headers.get('content-type')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    let errorMessage = `Token generation failed: ${response.status}`;
    let errorType = null;
    
    try {
      const errorText = await response.text();
      
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/6676a7ca-b2e5-4a74-983d-8b91ff876270',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'kite-api.js:88',message:'Error response body',data:{errorText,errorTextLength:errorText.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      // Also log to console for visibility
      console.error('[DEBUG] Error Response Body:', errorText);
      
      const errorJson = JSON.parse(errorText);
      
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/6676a7ca-b2e5-4a74-983d-8b91ff876270',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'kite-api.js:95',message:'Parsed error JSON',data:{errorJson},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      // Also log to console
      console.error('[DEBUG] Parsed Error JSON:', JSON.stringify(errorJson, null, 2));
      
      if (errorJson.message) {
        errorMessage = errorJson.message;
      }
      if (errorJson.error_type) {
        errorType = errorJson.error_type;
        errorMessage = `${errorType}: ${errorMessage}`;
      }
      
      // Provide helpful suggestions based on error type
      if (errorType === 'InputException') {
        if (errorMessage.includes('api_key')) {
          errorMessage += '. Check that API key is correct and at least 6 characters.';
        } else if (errorMessage.includes('request_token')) {
          errorMessage += '. Request token may be expired or invalid. Get a fresh one from login.';
        } else if (errorMessage.includes('checksum')) {
          errorMessage += '. Checksum calculation may be incorrect. Verify API secret.';
        }
      } else if (errorType === 'PermissionException') {
        errorMessage += '. Your app may not have required permissions. Check your Kite Connect subscription.';
      }
    } catch (e) {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/6676a7ca-b2e5-4a74-983d-8b91ff876270',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'kite-api.js:117',message:'Error parsing response',data:{errorMessage:e.message,errorName:e.name,status:response.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      // Response not JSON, use status code
      errorMessage = `Token generation failed: ${response.status}`;
    }
    
    throw new Error(errorMessage);
  }
  
  const data = await response.json();
  
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/6676a7ca-b2e5-4a74-983d-8b91ff876270',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'kite-api.js:85',message:'Token API response data',data:{status:data.status,hasData:!!data.data,errorType:data.error_type||null,message:data.message||null,hasAccessToken:!!data.data?.access_token},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  
  if (data.status === 'success' && data.data) {
    const accessToken = data.data.access_token;
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/6676a7ca-b2e5-4a74-983d-8b91ff876270',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'kite-api.js:88',message:'generateAccessToken success',data:{accessTokenLength:accessToken?.length||0,accessTokenPrefix:accessToken?.substring(0,20)+'...'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    return accessToken;
  }
  
  // Handle API error response
  if (data.error_type) {
    throw new Error(`${data.error_type}: ${data.message || 'Token generation failed'}`);
  }
  
  throw new Error(data.message || 'Token generation failed');
}

// Fetch NFO instruments list
export async function fetchNFOInstruments(accessToken, apiKey) {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/6676a7ca-b2e5-4a74-983d-8b91ff876270',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'kite-api.js:96',message:'fetchNFOInstruments entry',data:{accessTokenLength:accessToken?.length||0,apiKeyLength:apiKey?.length||0,url:`${KITE_API_BASE}/instruments/NFO`},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  
  const authHeader = `token ${apiKey}:${accessToken}`;
  
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/6676a7ca-b2e5-4a74-983d-8b91ff876270',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'kite-api.js:100',message:'Authorization header constructed',data:{authHeaderPrefix:authHeader.substring(0,30)+'...',authHeaderFormat:'token apiKey:accessToken'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  
  const response = await fetch(`${KITE_API_BASE}/instruments/NFO`, {
    headers: {
      'Authorization': authHeader,
      'X-Kite-Version': '3',
      'Accept-Encoding': 'gzip' // Request gzip compression
    }
  });
  
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/6676a7ca-b2e5-4a74-983d-8b91ff876270',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'kite-api.js:109',message:'Instruments API response status',data:{status:response.status,statusText:response.statusText,ok:response.ok,contentType:response.headers.get('content-type'),contentEncoding:response.headers.get('content-encoding')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  
  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Failed to fetch instruments: ${response.status}`;
    
    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson.message) {
        errorMessage = errorJson.message;
      }
      if (errorJson.error_type) {
        errorMessage = `${errorJson.error_type}: ${errorMessage}`;
      }
    } catch (e) {
      // Not JSON, use text as is
    }
    
    throw new Error(errorMessage);
  }
  
  // Node.js fetch() automatically decompresses gzip responses
  // The content-encoding header indicates the server sent it gzipped,
  // but fetch has already decompressed it by the time we read the body
  // So we can just use response.text() directly
  
  const contentType = response.headers.get('content-type') || '';
  const contentEncoding = response.headers.get('content-encoding') || '';
  
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/6676a7ca-b2e5-4a74-983d-8b91ff876270',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'kite-api.js:207',message:'Before reading response',data:{contentType,contentEncoding,note:'fetch() auto-decompresses gzip'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  
  // Use response.text() - fetch() handles gzip decompression automatically
  const text = await response.text();
  
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/6676a7ca-b2e5-4a74-983d-8b91ff876270',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'kite-api.js:215',message:'Response text read',data:{textLength:text.length,textPrefix:text.substring(0,100),contentEncoding},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  
  const instruments = parseInstrumentsCSV(text);
  
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/6676a7ca-b2e5-4a74-983d-8b91ff876270',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'kite-api.js:145',message:'fetchNFOInstruments success',data:{instrumentsCount:instruments.length,firstInstrument:instruments[0]||null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  
  return instruments;
}

// Parse instruments CSV
function parseInstrumentsCSV(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',');
  const instruments = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    if (values.length < headers.length) continue;
    
    const instrument = {};
    headers.forEach((header, index) => {
      instrument[header.trim()] = values[index]?.trim() || '';
    });
    instruments.push(instrument);
  }
  
  return instruments;
}

// Find instrument token for strike and type
export function findInstrumentToken(instruments, underlying, strike, type, expiry = null) {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/6676a7ca-b2e5-4a74-983d-8b91ff876270',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'kite-api.js:166',message:'findInstrumentToken entry',data:{instrumentsCount:instruments.length,underlying,strike,type,expiry},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  
  const upperType = type.toUpperCase();
  const upperUnderlying = underlying.toUpperCase();
  
  // #region agent log
  // Find sample NIFTY instruments to see what types exist
  const sampleNifty = instruments.filter(inst => {
    const symbol = (inst.tradingsymbol || '').toUpperCase();
    return symbol.includes('NIFTY');
  }).slice(0, 20);
  
  // Check what instrument_type values exist for NIFTY
  const instrumentTypes = [...new Set(sampleNifty.map(i => i.instrument_type))];
  const sampleWithCE = sampleNifty.filter(i => {
    const symbol = (i.tradingsymbol || '').toUpperCase();
    return symbol.includes('CE') || symbol.includes('PE');
  }).slice(0, 5);
  
  console.log('[DEBUG] Sample NIFTY instruments (first 20):', sampleNifty.map(i => ({
    tradingsymbol: i.tradingsymbol,
    strike: i.strike,
    expiry: i.expiry,
    instrument_type: i.instrument_type
  })));
  console.log('[DEBUG] Unique instrument_type values for NIFTY:', instrumentTypes);
  console.log('[DEBUG] Sample NIFTY with CE/PE:', sampleWithCE.map(i => ({
    tradingsymbol: i.tradingsymbol,
    strike: i.strike,
    expiry: i.expiry,
    instrument_type: i.instrument_type
  })));
  
  fetch('http://127.0.0.1:7244/ingest/6676a7ca-b2e5-4a74-983d-8b91ff876270',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'kite-api.js:264',message:'Sample NIFTY instruments analysis',data:{sampleCount:sampleNifty.length,instrumentTypes,sampleWithCE:sampleWithCE.map(i=>({tradingsymbol:i.tradingsymbol,strike:i.strike,expiry:i.expiry,instrument_type:i.instrument_type}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  
  const matches = instruments.filter(inst => {
    const symbol = (inst.tradingsymbol || inst.name || '').toUpperCase();
    const instStrike = parseFloat(inst.strike) || 0;
    const instType = (inst.instrument_type || '').toUpperCase();
    const instExpiry = inst.expiry || '';
    
    // Options are identified by having CE or PE in symbol, not necessarily instrument_type === 'OPT'
    // Check for CE/PE in symbol first
    const hasCE = symbol.includes('CE') || symbol.includes('CALL');
    const hasPE = symbol.includes('PE') || symbol.includes('PUT');
    
    // #region agent log - detailed matching for first few instruments
    if (symbol.includes(upperUnderlying) && (hasCE || hasPE) && Math.abs(instStrike - strike) < 100) {
      fetch('http://127.0.0.1:7244/ingest/6676a7ca-b2e5-4a74-983d-8b91ff876270',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'kite-api.js:302',message:'Checking instrument match',data:{symbol,instStrike,strike,instType,instExpiry,expiry:expiry?.toString(),strikeMatch:Math.abs(instStrike - strike) < 1,hasCE,hasPE},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    }
    // #endregion
    
    // Filter: Must be an option (has CE or PE in symbol) OR instrument_type is OPT/CE/PE
    const isOption = hasCE || hasPE || instType === 'OPT' || instType === 'CE' || instType === 'PE' || instType === 'CALL' || instType === 'PUT';
    if (!isOption) return false;
    
    if (!symbol.includes(upperUnderlying)) return false;
    if (Math.abs(instStrike - strike) >= 1) return false;
    
    if (upperType === 'CE' && !hasCE) return false;
    if (upperType === 'PE' && !hasPE) return false;
    
    // Check expiry match - expiry is in YYMMDD format (e.g., 260122)
    // But CSV expiry is in YYYY-MM-DD format (e.g., 2026-01-22)
    if (expiry) {
      const expiryStr = expiry.toString(); // e.g., "260122"
      // Convert YYMMDD to YYYY-MM-DD for matching
      const year = '20' + expiryStr.substring(0, 2); // "26" -> "2026"
      const month = expiryStr.substring(2, 4); // "01"
      const day = expiryStr.substring(4, 6); // "22"
      const expiryDateStr = `${year}-${month}-${day}`; // "2026-01-22"
      
      // Match against expiry field (YYYY-MM-DD format)
      if (instExpiry === expiryDateStr || instExpiry.includes(expiryDateStr)) {
        return true;
      }
      
      // Also try matching YYMMDD in symbol (e.g., "NIFTY26JAN24950CE")
      if (symbol.includes(expiryStr)) {
        return true;
      }
      
      // Try matching month abbreviation (e.g., "26JAN" for January)
      const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const monthIndex = parseInt(month) - 1;
      if (monthIndex >= 0 && monthIndex < 12) {
        const monthAbbr = monthNames[monthIndex];
        const yearShort = expiryStr.substring(0, 2);
        if (symbol.includes(yearShort + monthAbbr) || symbol.includes(monthAbbr + yearShort)) {
          return true;
        }
      }
      
      // If expiry is provided but doesn't match, exclude this instrument
      return false;
    }
    
    // If no expiry specified, match any expiry
    return true;
  });
  
  // If no matches found with expiry, try without expiry requirement
  if (matches.length === 0 && expiry) {
    console.log(`[DEBUG] No matches with expiry ${expiry}, trying without expiry filter...`);
    const matchesWithoutExpiry = instruments.filter(inst => {
      const symbol = (inst.tradingsymbol || inst.name || '').toUpperCase();
      const instStrike = parseFloat(inst.strike) || 0;
      const instType = (inst.instrument_type || '').toUpperCase();
      
      // Options are identified by CE/PE in symbol, not just instrument_type
      const hasCE = symbol.includes('CE') || symbol.includes('CALL');
      const hasPE = symbol.includes('PE') || symbol.includes('PUT');
      const isOption = hasCE || hasPE || instType === 'OPT' || instType === 'CE' || instType === 'PE';
      if (!isOption) return false;
      if (!symbol.includes(upperUnderlying)) return false;
      if (Math.abs(instStrike - strike) >= 1) return false;
      
      if (upperType === 'CE' && !hasCE) return false;
      if (upperType === 'PE' && !hasPE) return false;
      
      return true;
    });
    
    if (matchesWithoutExpiry.length > 0) {
      console.log(`[DEBUG] Found ${matchesWithoutExpiry.length} matches without expiry filter`);
      console.log(`[DEBUG] Sample matches:`, matchesWithoutExpiry.slice(0, 3).map(i => ({
        tradingsymbol: i.tradingsymbol,
        strike: i.strike,
        expiry: i.expiry
      })));
      // Return the first match (or could return closest expiry)
      return matchesWithoutExpiry[0];
    }
  }
  
  if (expiry && matches.length > 1) {
    const expiryMatch = matches.find(inst => {
      const symbol = (inst.tradingsymbol || '').toUpperCase();
      return symbol.includes(expiry.toString());
    });
    if (expiryMatch) {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/6676a7ca-b2e5-4a74-983d-8b91ff876270',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'kite-api.js:195',message:'findInstrumentToken found with expiry',data:{instrumentToken:expiryMatch.instrument_token,tradingsymbol:expiryMatch.tradingsymbol},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      return expiryMatch;
    }
  }
  
  const result = matches.length > 0 ? matches[0] : null;
  
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/6676a7ca-b2e5-4a74-983d-8b91ff876270',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'kite-api.js:202',message:'findInstrumentToken result',data:{found:!!result,matchesCount:matches.length,instrumentToken:result?.instrument_token||null,tradingsymbol:result?.tradingsymbol||null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  
  return result;
}

// Get nearest expiry date for NIFTY options
export function getNearestExpiry() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  
  let daysUntilExpiry = (4 - dayOfWeek + 7) % 7;
  if (daysUntilExpiry === 0 && today.getHours() >= 15) {
    daysUntilExpiry = 7;
  }
  
  const expiryDate = new Date(today);
  expiryDate.setDate(today.getDate() + daysUntilExpiry);
  
  const year = expiryDate.getFullYear().toString().slice(-2);
  const month = (expiryDate.getMonth() + 1).toString().padStart(2, '0');
  const day = expiryDate.getDate().toString().padStart(2, '0');
  
  return parseInt(year + month + day);
}
