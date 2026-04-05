// src/services/fetchBurnableNFTs.js
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE_URL;
const burnableCache = new Map();

/**
 * Fetch burnable NFTs for a user from the backend.
 * Uses the backend route `/nfts/burnable/:account`.
 * Caches per-account until manually invalidated.
 */
export async function fetchBurnableNFTs(accountName) {
  const key = String(accountName || '').trim().toLowerCase();
  if (!key) return [];

  if (burnableCache.has(key)) {
    return burnableCache.get(key);
  }

  try {
    const response = await axios.get(`${API_BASE}/nfts/burnable/${key}`);

    if (response.data && response.data.success && Array.isArray(response.data.data)) {
      const rows = response.data.data;
      burnableCache.set(key, rows);
      return rows;
    }

    console.warn('[fetchBurnableNFTs] Unexpected response:', response.data);
    return [];
  } catch (error) {
    console.error('[fetchBurnableNFTs] Error:', error.message || error);
    return [];
  }
}

/**
 * Manually clear cached burnable NFTs.
 * If accountName is provided, only that account cache is cleared.
 * If not provided, all cached accounts are cleared.
 */
export function invalidateBurnableNFTCache(accountName) {
  if (!accountName) {
    burnableCache.clear();
    return;
  }

  const key = String(accountName || '').trim().toLowerCase();
  burnableCache.delete(key);
}