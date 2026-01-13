// src/services/incinerators.js
import axios from 'axios';

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || '').replace(/\/+$/, '');

/**
 * Your backend is serving these routes on :3003 (based on your curl tests).
 * If you later reverse-proxy /incinerators through 443, this will still work
 * if API_BASE_URL already includes :3003 (we won't double-add it).
 */
function apiRoot() {
  if (!API_BASE_URL) return '';
  // if base already includes an explicit port, don’t append :3003
  const hasPort = /:\d+$/.test(API_BASE_URL.replace(/^https?:\/\//, '').split('/')[0]);
  return hasPort ? API_BASE_URL : `${API_BASE_URL}:3003`;
}

// Fetches incinerators that are NOT staked
export const fetchUnstakedIncinerators = async (accountName) => {
  try {
    const base = apiRoot();
    if (!base) return [];

    const res = await axios.get(`${base}/incinerators/unstaked/${accountName}`);
    return res.data?.data || []; // ✅ defensive check
  } catch (err) {
    console.error('[ERROR] Fetching unstaked incinerators failed:', err);
    return [];
  }
};

// Fetches incinerators that ARE staked
export const fetchStakedIncinerators = async (accountName) => {
  try {
    const base = apiRoot();
    if (!base) return [];

    const res = await axios.get(`${base}/incinerators/staked/${accountName}`);
    return res.data?.data || []; // ✅ inner data array
  } catch (err) {
    console.error('[ERROR] Fetching staked incinerators failed:', err);
    return [];
  }
};

/**
 * Fetches the user's on-chain incinerator slots (incinslots table),
 * hydrated by backend with incinerator rows + template meta.
 *
 * GET /incinerators/slots/:account
 * returns:
 * { success, owner, max_slots, slots:[id,id,id], slotted:[{slot, incinerator_id, ...}] }
 */
export const fetchIncineratorSlots = async (accountName) => {
  try {
    const base = apiRoot();
    if (!base) {
      return { success: false, owner: accountName, max_slots: 3, slots: [0, 0, 0], slotted: [] };
    }

    const res = await axios.get(`${base}/incinerators/slots/${accountName}`);
    const json = res.data;

    if (!json?.success) {
      return { success: false, owner: accountName, max_slots: 3, slots: [0, 0, 0], slotted: [] };
    }

    return json;
  } catch (err) {
    console.error('[ERROR] Fetching incinerator slots failed:', err);
    return { success: false, owner: accountName, max_slots: 3, slots: [0, 0, 0], slotted: [] };
  }
};

