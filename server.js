const express = require('express');
const { ethers } = require('ethers');
const dotenv = require('dotenv');
const axios = require('axios'); // Make sure to install axios: npm install axios

dotenv.config();

const app = express();
const port = 5001;

const provider = new ethers.JsonRpcProvider(process.env.NODE_URL);

const methodCache = new Map();

// Retry function with exponential backoff
async function retry(fn, maxRetries = 5, delay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      console.log(`Attempt ${i + 1} failed. Retrying in ${delay / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
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

app.get('/last10tx', async (req, res) => {
  try {
    const excludeAddress = '0xDeaDDEaDDeAdDeAdDEAdDEaddeAddEAdDEAd0001'.toLowerCase();
    
    const latestBlockNumber = await retry(() => provider.getBlockNumber());
    console.log('Latest Block Number:', latestBlockNumber);

    const transactions = [];
    let currentBlock = latestBlockNumber;

    while (transactions.length < 10 && currentBlock >= 0) {
      const block = await retry(() => provider.getBlock(currentBlock));
      console.log('Current Block:', currentBlock, 'Transactions:', block.transactions.length);

      for (const txHash of block.transactions) {
        const tx = await retry(() => provider.getTransaction(txHash));
        console.log('Processing transaction:', tx.hash);
        console.log(tx);
        
        if (tx.from && tx.from.toLowerCase() !== excludeAddress) {
          const methodSelector = decodeMethod(tx.data);
          const methodName = await getMethodName(methodSelector);
          
          const transactionDetails = {
            hash: tx.hash,
            time: new Date(block.timestamp * 1000),
            block: tx.blockNumber,
            gas: tx.gasLimit.toString(),
            from: tx.from,
            to: tx.to,
            value: tx.value ? ethers.formatEther(tx.value) : '0',
            nonce: tx.nonce,
            gasPrice: tx.gasPrice ? ethers.formatUnits(tx.gasPrice, 'gwei') : '0',
            method: methodName
          };

          console.log('Transaction added:', transactionDetails.hash);
          transactions.push(transactionDetails);

          if (transactions.length >= 1) {
            break;
          }
        } else {
          console.log('Transaction skipped:', tx.hash, 'From:', tx.from);
        }
      }

      if (transactions.length >= 1) {
        break;
      }

      currentBlock--;
    }

    console.log('Total transactions found:', transactions.length);
    res.json(transactions);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});