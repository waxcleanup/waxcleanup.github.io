import {postWaxMainnetRpc} from './waxMainnetEndpoints';
// src/services/incinerators.js
import axios from 'axios';

// Normalize base URL (no trailing slash)
const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || '').replace(/\/+$/, '');

if (!API_BASE_URL) {
  console.warn('[WARN] REACT_APP_API_BASE_URL is not set.');
}

// Simple helper (no port logic — nginx handles routing)
function apiRoot() {
  return API_BASE_URL;
}

// Default fallback structure for slots
const defaultSlots = (accountName) => ({
  success: false,
  owner: accountName,
  max_slots: 3,
  slots: [0, 0, 0],
  slotted: []
});

// Fetch UNSTAKED incinerators
export const fetchUnstakedIncinerators = async (accountName) => {
  try {
    const base = apiRoot();
    if (!base) return [];

    const res = await axios.get(`${base}/incinerators/unstaked/${accountName}`);

    // Backend returns { success, data: [...] }
    return res.data?.data || [];
  } catch (err) {
    console.error('[ERROR] Fetching unstaked incinerators failed:', err?.message || err);
    return [];
  }
};

// Fetch STAKED incinerators
export const fetchStakedIncinerators = async (accountName) => {
  try {
    const base = apiRoot();
    if (!base) return [];

    const res = await axios.get(`${base}/incinerators/staked/${accountName}`);

    return res.data?.data || [];
  } catch (err) {
    console.error('[ERROR] Fetching staked incinerators failed:', err?.message || err);
    return [];
  }
};

/**
 * Fetch incinerator slots
 * GET /incinerators/slots/:account
 */
export const fetchIncineratorSlots = async (accountName) => {
  try {
    const base = apiRoot();
    if (!base) return defaultSlots(accountName);

    const res = await axios.get(`${base}/incinerators/slots/${accountName}`);
    const json = res.data;

    if (!json?.success) {
      return defaultSlots(accountName);
    }

    return json;
  } catch (err) {
    console.error('[ERROR] Fetching incinerator slots failed:', err?.message || err);
    return defaultSlots(accountName);
  }
};
// Read mutable state without waiting for NFT artwork or wallet inventory indexing.
export async function fetchLiveIncinerators(owner) {
 const read=options=>postWaxMainnetRpc('/v1/chain/get_table_rows',{json:true,code:'cleanupcentr',scope:'cleanupcentr',...options});
 const [incins,slots]=await Promise.all([
  read({table:'incinerators',index_position:2,key_type:'i64',lower_bound:owner,upper_bound:owner,limit:1000}),
  read({table:'incinslots',lower_bound:owner,upper_bound:owner,limit:1})
 ]);
 if(!Array.isArray(incins.rows)||incins.more||!Array.isArray(slots.rows))throw new Error('Incomplete incinerator readings. Please refresh.');
 return {rows:incins.rows.filter(r=>r.owner===owner).map(r=>({...r,asset_id:String(r.id),fuel:Number(r.fuel),energy:Number(r.energy),durability:Number(r.durability)})),slots:slots.rows.find(r=>r.owner===owner)?.slots||[]};
}
