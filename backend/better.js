const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const { ethers } = require('ethers');
const dotenv = require('dotenv');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const provider = new ethers.JsonRpcProvider(process.env.NODE_URL);

app.use(cors());

console.log('Server starting up...');

const clients = new Set();
const methodCache = new Map();
const transactionHistory = [];
const tpmHistory = [];
const gasPriceHistoryFile = path.join(__dirname, 'gasPriceHistory.json');
const fraxPriceHistoryFile = path.join(__dirname, 'fraxPriceHistory.json');
const ethPriceHistoryFile = path.join(__dirname, 'ethPriceHistory.json');
const HISTORY_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds
const EXCLUDE_ADDRESS = '0xDeaDDEaDDeAdDeAdDEAdDEaddeAddEAdDEAd0001'.toLowerCase();
const MINUTE_WINDOW = 60 * 1000; // 1 minute in milliseconds
const FRACTION_COINGECKO_URL = "https://api.coingecko.com/api/v3/coins/frax";
const ETH_COINGECKO_URL = "https://api.coingecko.com/api/v3/coins/ethereum";

wss.on('connection', (ws) => {
  console.log('New WebSocket client connected');
  clients.add(ws);
  
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    clients.delete(ws);
  });
});

function broadcastTransaction(transaction) {
  console.log(`Broadcasting transaction: ${transaction.hash}`);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(transaction));
    }
  });
  console.log(`Transaction broadcasted to ${clients.size} clients`);
}

async function retry(fn, maxRetries = 5, delay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      console.log(`Attempt ${i + 1} failed. Retrying in ${delay / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
}

function decodeMethod(data) {
  if (!data || data.length < 10) return '0x';
  return data.slice(0, 10);
}

async function getMethodName(selector) {
  if (methodCache.has(selector)) {
    return methodCache.get(selector);
  }

  try {
    const response = await axios.get(`https://www.4byte.directory/api/v1/signatures/?hex_signature=${selector}`);
    if (response.data.results.length > 0) {
      const methodName = response.data.results[0].text_signature;
      methodCache.set(selector, methodName);
      return methodName;
    }
  } catch (error) {
    console.error('Error fetching method name:', error);
  }

  return selector;
}

function addTransaction(timestamp) {
  transactionHistory.push(timestamp);
  const now = Date.now();
  
  // Remove transactions older than HISTORY_WINDOW
  const cutoff = now - HISTORY_WINDOW;
  while (transactionHistory.length > 0 && transactionHistory[0] < cutoff) {
    transactionHistory.shift();
  }
}

function calculateTPM() {
  const now = Date.now();
  const cutoff = now - MINUTE_WINDOW; // 1 minute ago
  const recentTransactions = transactionHistory.filter(t => t >= cutoff);
  return recentTransactions.length;
}

function updateTPMHistory() {
  const tpm = calculateTPM();
  const now = Date.now();
  tpmHistory.push({ tpm, timestamp: now });

  // Remove old records
  const cutoff = now - HISTORY_WINDOW;
  while (tpmHistory.length > 0 && tpmHistory[0].timestamp < cutoff) {
    tpmHistory.shift();
  }
}

function calculateStatistics() {
  const now = Date.now();
  const cutoff = now - 60 * 60 * 1000; // 1 hour ago
  const recentTPM = tpmHistory.filter(record => record.timestamp >= cutoff);

  const high = Math.max(...recentTPM.map(record => record.tpm));
  const low = Math.min(...recentTPM.map(record => record.tpm));
  const current = calculateTPM();
  const changeLastHourPct = recentTPM.length > 0 ? (current - recentTPM[0].tpm) / recentTPM[0].tpm : 0;

  return {
    high,
    low,
    current,
    change_last_hour_pct: changeLastHourPct
  };
}
async function getDailyAverageGasPrice() {
    const today = new Date().toISOString().split('T')[0];
    const blockNumber = await provider.getBlockNumber();
    const block = await provider.getBlock(blockNumber);
    
    let totalGasPrice = 0n;  // Using BigInt
    let validTransactionCount = 0;
  
    for (const txHash of block.transactions) {
      try {
        const tx = await retry(() => provider.getTransaction(txHash));
        if (tx && tx.from && tx.from.toLowerCase() !== EXCLUDE_ADDRESS && tx.gasPrice) {
          const gasPriceBigInt = BigInt(tx.gasPrice.toString());
          if (gasPriceBigInt > 0n) {
            totalGasPrice += gasPriceBigInt;
            validTransactionCount++;
          }
        }
      } catch (error) {
        console.error(`Error processing transaction ${txHash}:`, error);
      }
    }
  
    if (validTransactionCount > 0) {
      const avgGasPrice = Number(totalGasPrice / BigInt(validTransactionCount)) / 1e9;  // Convert to Gwei
      return { time: new Date(today).toISOString(), value: avgGasPrice.toFixed(20) };
    }
  
    return null; // Return null if no valid transactions were found
  }

async function populateHistoricalData() {
  if (fs.existsSync(gasPriceHistoryFile)) {
    console.log('Gas price history file already exists.');
    return;
  }

  console.log('Populating historical gas price data...');
  const end = Date.now();
  const start = end - 30 * 24 * 60 * 60 * 1000; // 30 days ago

  const gasPriceHistory = [];

  for (let day = start; day <= end; day += 24 * 60 * 60 * 1000) {
    const dailyGasPrice = await getDailyAverageGasPrice();
    gasPriceHistory.push(dailyGasPrice);
  }

  fs.writeFileSync(gasPriceHistoryFile, JSON.stringify(gasPriceHistory, null, 2));
  console.log('Historical gas price data populated.');
}

async function populateFraxPriceData() {
  console.log('Fetching historical Frax price data...');
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/coins/frax/market_chart', {
      params: {
        vs_currency: 'usd',
        days: 30,
        interval: 'daily'
      }
    });

    const fraxPriceHistory = response.data.prices.map(([timestamp, price]) => {
      const date = new Date(timestamp).toISOString().split('T')[0];
      return {
        time: new Date(date).toISOString(),
        open: price.toFixed(18),
        high: price.toFixed(18),
        low: price.toFixed(18),
        close: price.toFixed(18)
      };
    });

    fs.writeFileSync(fraxPriceHistoryFile, JSON.stringify(fraxPriceHistory, null, 2));
    console.log('Historical Frax price data populated.');
  } catch (error) {
    console.error('Error fetching Frax price data:', error);
  }
}

async function populateEthPriceData() {
    console.log('Fetching historical ETH price data...');
    try {
      const response = await axios.get('https://api.coingecko.com/api/v3/coins/ethereum/market_chart', {
        params: {
          vs_currency: 'usd',
          days: 30,
          interval: 'daily'
        }
      });
  
      const ethPriceHistory = response.data.prices.map(([timestamp, price]) => {
        const date = new Date(timestamp).toISOString().split('T')[0];
        return {
          time: new Date(date).toISOString(),
          open: price.toFixed(18),
          high: price.toFixed(18),
          low: price.toFixed(18),
          close: price.toFixed(18)
        };
      });
  
      fs.writeFileSync(ethPriceHistoryFile, JSON.stringify(ethPriceHistory, null, 2));
      console.log('Historical ETH price data populated.');
    } catch (error) {
      console.error('Error fetching ETH price data:', error);
    }
  }
  

async function listenForTransactions() {
    console.log('Starting to listen for new transactions...');
    let lastUpdatedDate = '';
  
    provider.on('block', async (blockNumber) => {
      console.log(`New block detected: ${blockNumber}`);
      const currentDate = new Date().toISOString().split('T')[0];
  
      if (currentDate !== lastUpdatedDate) {
        const dailyGasPrice = await getDailyAverageGasPrice();
        if (dailyGasPrice !== null) {
          const gasPriceHistory = JSON.parse(fs.readFileSync(gasPriceHistoryFile, 'utf8'));
          
          const existingEntryIndex = gasPriceHistory.findIndex(entry => entry.time.startsWith(currentDate));
          if (existingEntryIndex !== -1) {
            gasPriceHistory[existingEntryIndex] = dailyGasPrice;
          } else {
            gasPriceHistory.push(dailyGasPrice);
          }
          
          fs.writeFileSync(gasPriceHistoryFile, JSON.stringify(gasPriceHistory, null, 2));
          lastUpdatedDate = currentDate;
        }}

    try {
      const block = await retry(() => provider.getBlock(blockNumber));
      console.log(`Block ${blockNumber} fetched. Contains ${block.transactions.length} transactions.`);
      
      for (const txHash of block.transactions) {
        console.log(`Processing transaction hash: ${txHash}`);
        try {
          const tx = await retry(() => provider.getTransaction(txHash));
          if (tx && tx.from && tx.from.toLowerCase() !== EXCLUDE_ADDRESS) {
            addTransaction(Date.now());
            updateTPMHistory();
            
            const methodSelector = decodeMethod(tx.data);
            const methodName = await getMethodName(methodSelector);
            
            const receipt = await retry(() => provider.getTransactionReceipt(txHash));
            const eventCount = receipt ? receipt.logs.length : 0;

            const transactionDetails = {
              hash: tx.hash,
              time: new Date(block.timestamp * 1000),
              block: tx.blockNumber,
              gas: tx.gasLimit ? tx.gasLimit.toString() : '0',
              from: tx.from,
              to: tx.to,
              value: tx.value ? ethers.formatEther(tx.value) : '0',
              nonce: tx.nonce,
              gasPrice: tx.gasPrice ? ethers.formatUnits(tx.gasPrice, 'gwei') : '0',
              method: methodName,
              eventCount: eventCount
            };
            
            broadcastTransaction(transactionDetails);
          }
        } catch (error) {
          console.error(`Error processing transaction ${txHash}:`, error);
        }
      }
    } catch (error) {
      console.error(`Error fetching block ${blockNumber}:`, error);
    }
  });
}

app.get('/api/gasprice', (req, res) => {
  try {
    const gasPriceHistory = JSON.parse(fs.readFileSync(gasPriceHistoryFile, 'utf8'));
    res.json(gasPriceHistory);
  } catch (error) {
    console.error('Error reading gas price history file:', error);
    res.status(500).json({ error: 'Failed to read gas price history file' });
  }
});

app.get('/api/fraxprice', (req, res) => {
  try {
    const fraxPriceHistory = JSON.parse(fs.readFileSync(fraxPriceHistoryFile, 'utf8'));
    res.json(fraxPriceHistory);
  } catch (error) {
    console.error('Error reading Frax price history file:', error);
    res.status(500).json({ error: 'Failed to read Frax price history file' });
  }
});

app.get('/api/ethprice', (req, res) => {
    try {
      const ethPriceHistory = JSON.parse(fs.readFileSync(ethPriceHistoryFile, 'utf8'));
      res.json(ethPriceHistory);
    } catch (error) {
      console.error('Error reading eth price history file:', error);
      res.status(500).json({ error: 'Failed to read eth price history file' });
    }
  });

app.get('/api/fraxprice/latest', (req, res) => {
  try {
    const fraxPriceHistory = JSON.parse(fs.readFileSync(fraxPriceHistoryFile, 'utf8'));
    const latestPrice = fraxPriceHistory[fraxPriceHistory.length - 1];
    res.json(latestPrice);
  } catch (error) {
    console.error('Error reading Frax price history file:', error);
    res.status(500).json({ error: 'Failed to read Frax price history file' });
  }
});

app.get('/api/ethprice/latest', (req, res) => {
    try {
      const ethPriceHistory = JSON.parse(fs.readFileSync(ethPriceHistoryFile, 'utf8'));
      const latestPrice = ethPriceHistory[ethPriceHistory.length - 1];
      res.json(latestPrice);
    } catch (error) {
      console.error('Error reading eth price history file:', error);
      res.status(500).json({ error: 'Failed to read eth price history file' });
    }
  });

app.get('/api/fraxprice/current', async (req, res) => {
    try {
        const response = await axios.get(FRACTION_COINGECKO_URL);
        const data = response.data;

        const currentPrice = data.market_data.current_price.usd;
        const currentTime = new Date().toISOString();

        const priceData = {
            time: currentTime,
            open: currentPrice.toFixed(3),
            high: currentPrice.toFixed(3),
            low: currentPrice.toFixed(3),
            close: currentPrice.toFixed(3),
        };

        res.json(priceData);
    } catch (error) {
        console.error('Error fetching the latest price:', error);
        res.status(500).json({ error: 'Error fetching the latest price' });
    }
});

app.get('/api/ethprice/current', async (req, res) => {
    try {
        const response = await axios.get(ETH_COINGECKO_URL);
        const data = response.data;

        const currentPrice = data.market_data.current_price.usd;
        const currentTime = new Date().toISOString();

        const priceData = {
            time: currentTime,
            open: currentPrice.toFixed(3),
            high: currentPrice.toFixed(3),
            low: currentPrice.toFixed(3),
            close: currentPrice.toFixed(3),
        };

        res.json(priceData);
    } catch (error) {
        console.error('Error fetching the latest price:', error);
        res.status(500).json({ error: 'Error fetching the latest price' });
    }
});

app.get('/api/tpm', (req, res) => {
  const tpm = calculateTPM();
  res.json({ tpm });
});

app.get('/api/tpm/history', (req, res) => {
  res.json(tpmHistory);
});

app.get('/api/tpm/statistics', (req, res) => {
  res.json(calculateStatistics());
});

(async () => {
  try {
    await populateHistoricalData();
    await populateFraxPriceData();
    await populateEthPriceData();
    await listenForTransactions();
  } catch (error) {
    console.error('Failed to initialize:', error);
  }

  server.listen(5000, () => {
    console.log('Server is running on http://localhost:5000');
    console.log('WebSocket server is ready');
  });

  provider.on('error', (error) => {
    console.error('Provider error:', error);
  });

  provider.getNetwork().then((network) => {
    console.log(`Connected to network: ${network.name} (Chain ID: ${network.chainId})`);
  }).catch((error) => {
    console.error('Failed to connect to network:', error);
  });
})();