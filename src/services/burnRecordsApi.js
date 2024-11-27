// services/burnRecordsApi.js
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3003';

/**
 * Fetch burn records for a specific user.
 * @param {string} user - The user account name.
 * @returns {Array} - An array of burn records for the user.
 */
export const getBurnRecords = async (user) => {
    try {
        const response = await axios.get(`${API_URL}/burnrecords/${user}`);
        return response.data.records;
    } catch (error) {
        console.error('Error fetching burn records for user:', error);
        throw error;
    }
};

/**
 * Fetch all burn records.
 * @returns {Array} - An array of all burn records.
 */
export const getAllBurnRecords = async () => {
    try {
        const response = await axios.get(`${API_URL}/burnrecords/all`);
        return response.data.records;
    } catch (error) {
        console.error('Error fetching all burn records:', error);
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
        const response = await axios.get(`${API_URL}/burnrecords/asset/${assetId}`);
        return response.data.records;
    } catch (error) {
        console.error('Error fetching burn records by asset ID:', error);
        throw error;
    }
};
