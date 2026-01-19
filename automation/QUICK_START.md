# Quick Start Guide

## Step-by-Step Instructions to Run the Script

### Step 1: Navigate to the automation directory
```bash
cd automation
```

### Step 2: Install dependencies (if not already installed)
```bash
npm install
```

### Step 3: Get your Access Token

You have **two options**:

#### Option A: Generate Access Token from Request Token (Recommended for first time)

1. **Get Request Token:**
   - Visit this URL in your browser (replace `YOUR_API_KEY` with your actual API key):
     ```
     https://kite.zerodha.com/connect/login?v=3&api_key=3ngsjp3dclif0m3o
     ```
   - Login with your Zerodha credentials
   - After login, you'll be redirected to a URL like:
     ```
     http://localhost:8080/?request_token=XXXXX&action=login&status=success
     ```
   - Copy the `request_token` value from the URL

2. **Run the script with REQUEST_TOKEN:**
   ```bash
   REQUEST_TOKEN=your_request_token_here node index.js
   ```
   
   The script will:
   - Generate an access token automatically
   - Save it to `.access_token` file for future use
   - Use it to fetch charts

#### Option B: Use Existing Access Token (if you already have one)

```bash
ACCESS_TOKEN=your_access_token_here node index.js
```

### Step 4: Run the Script

**If you have a saved access token (from previous run):**
```bash
node index.js
```

**If you need to generate a new token:**
```bash
REQUEST_TOKEN=your_request_token_here node index.js
```

**With custom Nifty price:**
```bash
NIFTY_PRICE=25000 node index.js
```

**With all options:**
```bash
REQUEST_TOKEN=xxx NIFTY_PRICE=25000 OUTPUT_DIR=./my_screenshots node index.js
```

## What the Script Does

1. ✅ Loads or generates access token
2. ✅ Fetches NFO instrument data from Kite API
3. ✅ Calculates ITM strikes (5 CE + 5 PE options)
4. ✅ Opens browser and loads each chart
5. ✅ Takes screenshots and saves to `./screenshots/` directory

## Output

Screenshots will be saved in `./screenshots/` directory with names like:
- `NIFTY_25700_CE_2024-01-15T10-30-45.png`
- `NIFTY_25700_PE_2024-01-15T10-30-45.png`

## Troubleshooting

### "ACCESS_TOKEN or REQUEST_TOKEN required"
- You need to provide either an access token or request token
- Follow Step 3 above to get a request token

### "Token generation failed"
- Check that your API key and secret are correct in `config.js`
- Ensure request token is valid (not expired, from recent login)

### "Failed to fetch instruments"
- Access token might be expired (they expire daily)
- Regenerate using REQUEST_TOKEN

### Browser issues
- Run `npx playwright install` to install browser binaries

## Notes

- **Access tokens expire daily** - you may need to regenerate them
- The script automatically saves the access token to `.access_token` file
- On subsequent runs, it will reuse the saved token (no need to provide REQUEST_TOKEN again)
- If token expires, just provide REQUEST_TOKEN again to regenerate
