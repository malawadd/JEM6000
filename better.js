const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { ethers } = require('ethers');
const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const provider = new ethers.JsonRpcProvider(process.env.NODE_URL);

console.log('Server starting up...');

const clients = new Set();
const methodCache = new Map();

// For TPM calculation
const transactionHistory = [];
const HISTORY_WINDOW = 5 * 60 * 1000; // 5 minutes in milliseconds
const excludeAddress = '0xDeaDDEaDDeAdDeAdDEAdDEaddeAddEAdDEAd0001'.toLowerCase();

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
  
  // Remove transactions older than HISTORY_WINDOW
  const cutoff = Date.now() - HISTORY_WINDOW;
  while (transactionHistory.length > 0 && transactionHistory[0] < cutoff) {
    transactionHistory.shift();
  }
}

function calculateTPM() {
  const now = Date.now();
  const cutoff = now - 60000; // 1 minute ago
  const recentTransactions = transactionHistory.filter(t => t >= cutoff);
  return recentTransactions.length;
}

async function listenForTransactions() {
  console.log('Starting to listen for new transactions...');

  provider.on('block', async (blockNumber) => {
    console.log(`New block detected: ${blockNumber}`);
    try {
      const block = await retry(() => provider.getBlock(blockNumber));
      console.log(`Block ${blockNumber} fetched. Contains ${block.transactions.length} transactions.`);
      
      for (const txHash of block.transactions) {
        console.log(`Processing transaction hash: ${txHash}`);
        try {
          const tx = await retry(() => provider.getTransaction(txHash));
          if (tx && tx.from && tx.from.toLowerCase() !== excludeAddress) {
            addTransaction(Date.now());
            
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
            
            console.log(`Transaction details prepared: ${JSON.stringify(transactionDetails)}`);
            broadcastTransaction(transactionDetails);
          } else {
            console.log(`Transaction ${txHash} skipped (from excluded address or invalid transaction)`);
          }
        } catch (txError) {
          console.error(`Error processing transaction ${txHash}:`, txError);
        }
      }
    } catch (error) {
      console.error('Error processing block:', error);
    }
  });

  console.log('Transaction listener set up successfully');
}

// API endpoint for TPM
app.get('/api/tpm', (req, res) => {
  const tpm = calculateTPM();
  res.json({ tpm });
});

listenForTransactions();

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