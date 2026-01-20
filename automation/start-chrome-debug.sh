#!/bin/bash

# Helper script to start Chrome with remote debugging enabled
# This allows the automation script to connect to your existing Chrome session

# Detect OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    USER_DATA_DIR="$HOME/Library/Application Support/Google/Chrome"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    CHROME_PATH="google-chrome"
    USER_DATA_DIR="$HOME/.config/google-chrome"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    # Windows
    CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
    USER_DATA_DIR="$LOCALAPPDATA\Google\Chrome\User Data"
    echo "Windows detected. Please run manually:"
    echo "\"$CHROME_PATH\" --remote-debugging-port=9222 --user-data-dir=\"$USER_DATA_DIR\""
    exit 1
else
    echo "Unsupported OS: $OSTYPE"
    exit 1
fi

# Check if Chrome is already running
if pgrep -f "Google Chrome" > /dev/null; then
    echo "⚠️  Chrome is already running."
    echo "   Please close all Chrome windows first, then run this script again."
    echo "   Or manually start Chrome with:"
    echo "   $CHROME_PATH --remote-debugging-port=9222 --user-data-dir=\"$USER_DATA_DIR\""
    exit 1
fi

# Start Chrome with remote debugging
echo "🚀 Starting Chrome with remote debugging on port 9222..."
echo "   Using profile: $USER_DATA_DIR"
echo ""
echo "📝 Instructions:"
echo "   1. Log in to Kite (https://kite.zerodha.com) in this Chrome window"
echo "   2. Keep Chrome running"
echo "   3. In another terminal, run: USE_EXISTING_CHROME=true node index.js"
echo ""

"$CHROME_PATH" --remote-debugging-port=9222 --user-data-dir="$USER_DATA_DIR"
