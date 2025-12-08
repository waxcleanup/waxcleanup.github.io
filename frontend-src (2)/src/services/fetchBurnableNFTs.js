// src/services/fetchBurnableNFTs.js
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE_URL;
let cachedBurnableNFTs = null;

/**
 * Fetch burnable NFTs for a user from the backend.
 * This version uses the backend route `/nfts/burnable/:account`.
 * Caches data until manually invalidated (e.g. after a burn).
 */
export async function fetchBurnableNFTs(accountName) {
  if (cachedBurnableNFTs) return cachedBurnableNFTs;

  try {
    const response = await axios.get(`${API_BASE}/nfts/burnable/${accountName}`);
    if (response.data && response.data.success && Array.isArray(response.data.data)) {
      cachedBurnableNFTs = response.data.data;
      return cachedBurnableNFTs;
    } else {
      console.warn('[fetchBurnableNFTs] Unexpected response:', response.data);
      return [];
    }
  } catch (error) {
    console.error('[fetchBurnableNFTs] Error:', error.message || error);
    return [];
  }
}

/**
 * Manually clear the cached burnable NFTs (e.g. after burning an NFT).
 */
export function invalidateBurnableNFTCache() {
  cachedBurnableNFTs = null;
}
