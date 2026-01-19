// Chart rendering using TradingView Lightweight Charts library
// Make functions available globally for content script access

// Render TradingView chart (requires TradingView library to be loaded)
function renderTradingViewChart(containerId, historicalData, symbol) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container with id ${containerId} not found`);
    return null;
  }
  
  if (typeof TradingView === 'undefined') {
    console.error('TradingView Lightweight Charts library not loaded');
    return null;
  }
  
  // Clear container
  container.innerHTML = '';
  
  const chart = TradingView.createChart(container, {
    width: 1200,
    height: 600,
    layout: {
      backgroundColor: '#ffffff',
      textColor: '#333333',
    },
    grid: {
      vertLines: {
        color: '#e0e0e0',
        style: TradingView.LineStyle.Solid,
      },
      horzLines: {
        color: '#e0e0e0',
        style: TradingView.LineStyle.Solid,
      },
    },
    crosshair: {
      mode: TradingView.CrosshairMode.Normal,
    },
    rightPriceScale: {
      borderColor: '#e0e0e0',
    },
    timeScale: {
      borderColor: '#e0e0e0',
      timeVisible: true,
      secondsVisible: false,
    },
  });
  
  const candlestickSeries = chart.addCandlestickSeries({
    upColor: '#26a69a',
    downColor: '#ef5350',
    borderVisible: false,
    wickUpColor: '#26a69a',
    wickDownColor: '#ef5350',
  });
  
  // Format data for TradingView
  // Historical data format: [timestamp, open, high, low, close, volume, oi]
  const formattedData = historicalData.map(candle => ({
    time: Math.floor(candle[0] / 1000), // Convert milliseconds to seconds
    open: parseFloat(candle[1]),
    high: parseFloat(candle[2]),
    low: parseFloat(candle[3]),
    close: parseFloat(candle[4]),
  }));
  
  candlestickSeries.setData(formattedData);
  
  // Add title
  const title = document.createElement('div');
  title.style.cssText = 'position: absolute; top: 10px; left: 10px; font-size: 18px; font-weight: bold; color: #333; z-index: 1000;';
  title.textContent = symbol;
  container.style.position = 'relative';
  container.appendChild(title);
  
  return chart;
}

// Alternative: Render using Chart.js (if TradingView not available)
function renderChartJSChart(canvasId, historicalData, symbol) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    console.error(`Canvas with id ${canvasId} not found`);
    return null;
  }
  
  if (typeof Chart === 'undefined') {
    console.error('Chart.js library not loaded');
    return null;
  }
  
  const ctx = canvas.getContext('2d');
  
  // Process historical data
  const labels = [];
  const candleData = [];
  
  historicalData.forEach(candle => {
    const date = new Date(candle[0]);
    labels.push(date.toLocaleDateString());
    candleData.push({
      x: date,
      o: parseFloat(candle[1]),
      h: parseFloat(candle[2]),
      l: parseFloat(candle[3]),
      c: parseFloat(candle[4])
    });
  });
  
  const chart = new Chart(ctx, {
    type: 'candlestick',
    data: {
      datasets: [{
        label: symbol,
        data: candleData
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: symbol,
          font: {
            size: 16,
            weight: 'bold'
          }
        },
        legend: {
          display: false
        }
      },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'day'
          }
        }
      }
    }
  });
  
  return chart;
}

// Capture screenshot of chart
async function captureChartScreenshot(container, filename) {
  return new Promise((resolve, reject) => {
    // Find canvas element in container
    const canvas = container.querySelector('canvas');
    if (!canvas) {
      reject(new Error('Canvas not found in container'));
      return;
    }
    
    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to create blob from canvas'));
        return;
      }
      
      const url = URL.createObjectURL(blob);
      
      // Download the image
      chrome.downloads.download({
        url: url,
        filename: filename,
        saveAs: false
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          URL.revokeObjectURL(url);
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          URL.revokeObjectURL(url);
          resolve({ downloadId, filename });
        }
      });
    }, 'image/png');
  });
}

// Wait for chart to fully render
function waitForChartRender(container, maxWait = 5000) {
  return new Promise((resolve) => {
    const canvas = container.querySelector('canvas');
    if (canvas && canvas.width > 0 && canvas.height > 0) {
      // Give it a moment for any animations
      setTimeout(() => resolve(true), 500);
      return;
    }
    
    // Wait for canvas to appear
    const observer = new MutationObserver(() => {
      const canvas = container.querySelector('canvas');
      if (canvas && canvas.width > 0 && canvas.height > 0) {
        observer.disconnect();
        setTimeout(() => resolve(true), 500);
      }
    });
    
    observer.observe(container, {
      childList: true,
      subtree: true
    });
    
    // Timeout
    setTimeout(() => {
      observer.disconnect();
      resolve(false);
    }, maxWait);
  });
}

// Expose functions globally for content script (after all functions are defined)
if (typeof window !== 'undefined') {
  window.renderTradingViewChart = renderTradingViewChart;
  window.captureChartScreenshot = captureChartScreenshot;
  window.waitForChartRender = waitForChartRender;
}
