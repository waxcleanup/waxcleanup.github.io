// src/services/incinerators.js
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

// Fetches incinerators that are NOT staked
export const fetchUnstakedIncinerators = async (accountName) => {
  try {
    const res = await axios.get(`${API_BASE_URL}/incinerators/unstaked/${accountName}`);
    return res.data?.data || []; // ✅ defensive check
  } catch (err) {
    console.error('[ERROR] Fetching unstaked incinerators failed:', err);
    return [];
  }
};

// Fetches incinerators that ARE staked
export const fetchStakedIncinerators = async (accountName) => {
  try {
    const res = await axios.get(`${API_BASE_URL}/incinerators/staked/${accountName}`);
    return res.data?.data || []; // ✅ make sure it's the inner data array
  } catch (err) {
    console.error('[ERROR] Fetching staked incinerators failed:', err);
    return [];
  }
};
