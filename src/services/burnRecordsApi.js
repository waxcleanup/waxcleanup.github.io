// services/burnRecordsApi.js
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3003';
console.log('[DEBUG] API_URL:', API_URL); // Log the API URL being used

/**
 * Fetch burn records for a specific user.
 * @param {string} user - The user account name.
 * @returns {Array} - An array of burn records for the user.
 */
export const getBurnRecords = async (user) => {
    try {
        console.log('[DEBUG] Fetching burn records for user:', user);
        const response = await axios.get(`${API_URL}/burnrecords/${user}`);
        console.log('[DEBUG] Burn records for user fetched successfully:', response.data.records);
        return response.data.records;
    } catch (error) {
        console.error('[ERROR] Fetching burn records for user failed:', error);
        throw error;
    }
};

/**
 * Fetch all burn records.
 * @returns {Array} - An array of all burn records.
 */
export const getAllBurnRecords = async () => {
    try {
        console.log('[DEBUG] Fetching all burn records');
        const response = await axios.get(`${API_URL}/burnrecords/all`);
        console.log('[DEBUG] All burn records fetched successfully:', response.data.records);
        return response.data.records;
    } catch (error) {
        console.error('[ERROR] Fetching all burn records failed:', error);
        throw error;
    }
};

/**
 * Fetch burn records by asset ID.
 * @param {string} assetId - The asset ID to fetch records for.
 * @returns {Array} - An array of burn records for the asset ID.
 */
export const getBurnRecordsByAssetId = async (assetId) => {
    try {
        console.log('[DEBUG] Fetching burn records by assetId:', assetId);
        const response = await axios.get(`${API_URL}/burnrecords/asset/${assetId}`);
        console.log('[DEBUG] Burn records by assetId fetched successfully:', response.data.records);
        return response.data.records;
    } catch (error) {
        console.error('[ERROR] Fetching burn records by asset ID failed:', error);
        throw error;
    }
};
