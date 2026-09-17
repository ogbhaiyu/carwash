import { WALLET_CONFIG } from './config.js';

const STORAGE_KEY_REDEEMED = 'bhai_redeemed_tx_signatures';

function getRedeemedSignatures() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REDEEMED);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function markSignatureRedeemed(txId) {
  try {
    const list = getRedeemedSignatures();
    if (!list.includes(txId)) {
      list.push(txId);
      localStorage.setItem(STORAGE_KEY_REDEEMED, JSON.stringify(list));
    }
  } catch (e) {
    console.warn('Could not persist redeemed signature:', e);
  }
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

/**
 * Verifies a transaction on Solana Mainnet
 */
async function verifySolana(txSignature, minAmount, targetAddress) {
  const cleanSig = txSignature.trim();
  // Basic base58 format check (roughly 85-90 chars)
  if (cleanSig.length < 64 || cleanSig.length > 100) {
    return {
      success: false,
      error: 'Invalid Solana transaction signature length. A Solana signature is typically 87-88 characters.'
    };
  }

  const rpcEndpoints = [
    'https://api.mainnet-beta.solana.com',
    'https://solana-mainnet.g.alchemy.com/v2/demo',
    'https://rpc.ankr.com/solana'
  ];

  let lastError = 'Unable to query Solana network';

  for (const endpoint of rpcEndpoints) {
    try {
      const response = await fetchWithTimeout(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getTransaction',
          params: [
            cleanSig,
            {
              encoding: 'jsonParsed',
              maxSupportedTransactionVersion: 0,
              commitment: 'confirmed'
            }
          ]
        })
      });

      const data = await response.json();

      if (data.error) {
        lastError = data.error.message || 'Solana RPC returned an error';
        continue;
      }

      if (!data.result) {
        return {
          success: false,
          error: 'Transaction signature not found on Solana Mainnet. If you just sent it, please wait 5-10 seconds for validator confirmation and try again.'
        };
      }

      const tx = data.result;

      // Check transaction status
      if (tx.meta && tx.meta.err) {
        return {
          success: false,
          error: `Transaction failed on-chain: ${JSON.stringify(tx.meta.err)}`
        };
      }

      // Check age (reject tx older than 3 days)
      if (tx.blockTime && (Date.now() / 1000 - tx.blockTime) > 86400 * 3) {
        return {
          success: false,
          error: 'Transaction is too old (older than 3 days). Please submit a fresh payment.'
        };
      }

      // Calculate transferred amount to targetAddress
      let lamportsSent = 0;

      // 1. Check outer instructions
      const outerIxs = tx.transaction?.message?.instructions || [];
      for (const ix of outerIxs) {
        if (ix.parsed && ix.parsed.type === 'transfer') {
          const info = ix.parsed.info;
          if (info && info.destination === targetAddress) {
            lamportsSent += Number(info.lamports || 0);
          }
        }
      }

      // 2. Check inner instructions
      const innerGroups = tx.meta?.innerInstructions || [];
      for (const group of innerGroups) {
        for (const ix of group.instructions || []) {
          if (ix.parsed && ix.parsed.type === 'transfer') {
            const info = ix.parsed.info;
            if (info && info.destination === targetAddress) {
              lamportsSent += Number(info.lamports || 0);
            }
          }
        }
      }

      // 3. Fallback: postBalances - preBalances
      if (lamportsSent === 0 && tx.transaction?.message?.accountKeys) {
        const keys = tx.transaction.message.accountKeys.map(k => (typeof k === 'string' ? k : k.pubkey));
        const targetIdx = keys.indexOf(targetAddress);
        if (targetIdx !== -1 && tx.meta?.postBalances && tx.meta?.preBalances) {
          const delta = tx.meta.postBalances[targetIdx] - tx.meta.preBalances[targetIdx];
          if (delta > 0) lamportsSent = delta;
        }
      }

      const solSent = lamportsSent / 1e9;
      // 2% tolerance for slight pricing or slippage
      const requiredSol = minAmount * 0.98;

      if (lamportsSent === 0) {
        return {
          success: false,
          error: `Transaction did not transfer SOL to Bhai's wallet address (${targetAddress}).`
        };
      }

      if (solSent < requiredSol) {
        return {
          success: false,
          error: `Insufficient payment: Received ${solSent.toFixed(4)} SOL, but this package requires ${minAmount} SOL.`
        };
      }

      return {
        success: true,
        txId: cleanSig,
        amountReceived: `${solSent.toFixed(4)} SOL`,
        explorerUrl: `https://solscan.io/tx/${cleanSig}`
      };
    } catch (err) {
      lastError = err.message;
    }
  }

  return { success: false, error: `Network verification error: ${lastError}` };
}

/**
 * Verifies a transaction on Ethereum Mainnet
 */
async function verifyEthereum(txHash, minAmount, targetAddress) {
  let cleanHash = txHash.trim();
  if (!cleanHash.startsWith('0x')) cleanHash = '0x' + cleanHash;

  if (cleanHash.length !== 66 || !/^0x[0-9a-fA-F]{64}$/.test(cleanHash)) {
    return {
      success: false,
      error: 'Invalid Ethereum transaction hash format. Expected a 66-character hex string starting with 0x.'
    };
  }

  const rpcEndpoints = [
    'https://ethereum-rpc.publicnode.com',
    'https://1rpc.io/eth',
    'https://rpc.ankr.com/eth'
  ];

  let lastError = 'Unable to query Ethereum network';

  for (const endpoint of rpcEndpoints) {
    try {
      // 1. Fetch transaction details
      const txRes = await fetchWithTimeout(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getTransactionByHash',
          params: [cleanHash]
        })
      });

      const txData = await txRes.json();
      if (!txData.result) {
        return {
          success: false,
          error: 'Transaction not found on Ethereum Mainnet. If you just sent it, please wait a moment for mining.'
        };
      }

      const tx = txData.result;

      // Verify recipient address
      if (!tx.to || tx.to.toLowerCase() !== targetAddress.toLowerCase()) {
        return {
          success: false,
          error: `Transaction recipient (${tx.to}) does not match Bhai's Ethereum wallet (${targetAddress}).`
        };
      }

      // 2. Fetch receipt to verify status
      const receiptRes = await fetchWithTimeout(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'eth_getTransactionReceipt',
          params: [cleanHash]
        })
      });

      const receiptData = await receiptRes.json();
      if (!receiptData.result) {
        return {
          success: false,
          error: 'Transaction is still pending mining. Please wait a few seconds and try again.'
        };
      }

      const receipt = receiptData.result;
      if (receipt.status !== '0x1') {
        return {
          success: false,
          error: 'Transaction failed or reverted on Ethereum.'
        };
      }

      // Verify transferred amount
      const weiReceived = BigInt(tx.value || '0x0');
      const requiredWei = BigInt(Math.floor(minAmount * 1e18 * 0.98));

      if (weiReceived < requiredWei) {
        const ethSent = Number(weiReceived) / 1e18;
        return {
          success: false,
          error: `Insufficient ETH sent: Received ${ethSent.toFixed(5)} ETH, required ${minAmount} ETH.`
        };
      }

      const ethDisplay = (Number(weiReceived) / 1e18).toFixed(5);
      return {
        success: true,
        txId: cleanHash,
        amountReceived: `${ethDisplay} ETH`,
        explorerUrl: `https://etherscan.io/tx/${cleanHash}`
      };
    } catch (err) {
      lastError = err.message;
    }
  }

  return { success: false, error: `Ethereum verification error: ${lastError}` };
}

/**
 * Verifies a transaction on Bitcoin Network
 */
async function verifyBitcoin(txId, minAmount, targetAddress) {
  const cleanId = txId.trim().toLowerCase();
  if (cleanId.length !== 64 || !/^[0-9a-f]{64}$/.test(cleanId)) {
    return {
      success: false,
      error: 'Invalid Bitcoin transaction ID. Expected a 64-character hex string.'
    };
  }

  const endpoints = [
    `https://mempool.space/api/tx/${cleanId}`,
    `https://blockstream.info/api/tx/${cleanId}`
  ];

  let lastError = 'Unable to query Bitcoin network';

  for (const url of endpoints) {
    try {
      const res = await fetchWithTimeout(url);
      if (res.status === 404) {
        return {
          success: false,
          error: 'Transaction not found in Bitcoin mempool or blockchain. Please check your Tx ID.'
        };
      }

      const data = await res.json();
      const vouts = data.vout || [];

      let satsReceived = 0;
      for (const v of vouts) {
        if (v.scriptpubkey_address === targetAddress) {
          satsReceived += v.value || 0;
        }
      }

      if (satsReceived === 0) {
        return {
          success: false,
          error: `Transaction did not send BTC to Bhai's Bitcoin address (${targetAddress}).`
        };
      }

      const btcReceived = satsReceived / 1e8;
      const requiredBtc = minAmount * 0.98;

      if (btcReceived < requiredBtc) {
        return {
          success: false,
          error: `Insufficient BTC sent: Received ${btcReceived.toFixed(6)} BTC, required ${minAmount} BTC.`
        };
      }

      return {
        success: true,
        txId: cleanId,
        amountReceived: `${btcReceived.toFixed(6)} BTC`,
        explorerUrl: `https://mempool.space/tx/${cleanId}`
      };
    } catch (err) {
      lastError = err.message;
    }
  }

  return { success: false, error: `Bitcoin verification error: ${lastError}` };
}

/**
 * Verifies a transaction on Dogecoin Network
 */
async function verifyDogecoin(txId, minAmount, targetAddress) {
  const cleanId = txId.trim().toLowerCase();
  if (cleanId.length !== 64 || !/^[0-9a-f]{64}$/.test(cleanId)) {
    return {
      success: false,
      error: 'Invalid Dogecoin transaction ID. Expected a 64-character hex string.'
    };
  }

  try {
    const url = `https://api.blockcypher.com/v1/doge/main/txs/${cleanId}`;
    const res = await fetchWithTimeout(url);

    if (res.status === 404) {
      return {
        success: false,
        error: 'Transaction not found on the Dogecoin network. Please verify your Tx ID.'
      };
    }

    const data = await res.json();
    const outputs = data.outputs || [];

    let koinuReceived = 0;
    for (const out of outputs) {
      if (out.addresses && out.addresses.includes(targetAddress)) {
        koinuReceived += out.value || 0;
      }
    }

    if (koinuReceived === 0) {
      return {
        success: false,
        error: `Transaction did not send DOGE to Bhai's address (${targetAddress}).`
      };
    }

    const dogeReceived = koinuReceived / 1e8;
    const requiredDoge = minAmount * 0.98;

    if (dogeReceived < requiredDoge) {
      return {
        success: false,
        error: `Insufficient DOGE sent: Received ${dogeReceived.toFixed(1)} DOGE, required ${minAmount} DOGE.`
      };
    }

    return {
      success: true,
      txId: cleanId,
      amountReceived: `${dogeReceived.toFixed(1)} DOGE`,
      explorerUrl: `https://dogechain.info/tx/${cleanId}`
    };
  } catch (err) {
    return {
      success: false,
      error: `Dogecoin network query error: ${err.message}`
    };
  }
}

/**
 * Main On-Chain Payment Verification Entry Point
 */
export async function verifyOnChainPayment(cryptoSymbol, txHash, packageObj) {
  if (!txHash || !txHash.trim()) {
    return {
      success: false,
      error: 'Please enter your Transaction ID / Hash to verify payment on-chain.'
    };
  }

  const cleanHash = txHash.trim();
  const config = WALLET_CONFIG[cryptoSymbol];
  if (!config) {
    return { success: false, error: `Unsupported cryptocurrency: ${cryptoSymbol}` };
  }

  const minAmount = packageObj.numericAmounts?.[cryptoSymbol] || 0;
  const targetAddress = config.address;

  // Anti-Replay: check if this transaction was already redeemed
  const redeemed = getRedeemedSignatures();
  if (redeemed.includes(cleanHash)) {
    return {
      success: false,
      error: '⚠️ This transaction has already been redeemed for a previous wash! Double-spending is not permitted on-chain.'
    };
  }

  let result;
  switch (cryptoSymbol) {
    case 'SOL':
      result = await verifySolana(cleanHash, minAmount, targetAddress);
      break;
    case 'ETH':
      result = await verifyEthereum(cleanHash, minAmount, targetAddress);
      break;
    case 'BTC':
      result = await verifyBitcoin(cleanHash, minAmount, targetAddress);
      break;
    case 'DOGE':
      result = await verifyDogecoin(cleanHash, minAmount, targetAddress);
      break;
    default:
      return { success: false, error: `Unknown cryptocurrency: ${cryptoSymbol}` };
  }

  // If verified successfully, record in anti-replay storage
  if (result && result.success) {
    markSignatureRedeemed(cleanHash);
  }

  return result;
}
