import axios from 'axios';

// Constants from environment variables
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL; // Backend API base URL
const BASE_URL = process.env.REACT_APP_RPC; // WAX blockchain endpoint
const CONTRACT_NAME = process.env.REACT_APP_CONTRACT_NAME;
const COLLECTION_NAME = "cleanupcentr"; // Collection name for incinerators
const SCHEMA_NAME = "incinerators"; // Schema name for incinerators

/**
 * Fetch all NFTs owned by the user and filter for cleanupcentr incinerators.
 *
 * @param {string} accountName - The user's WAX account name.
 * @returns {Promise<Array>} - Array of unstaked incinerator NFTs.
 */
export const fetchUnstakedIncinerators = async (accountName) => {
  try {
    const response = await axios.get(
      `https://wax.api.atomicassets.io/atomicassets/v1/assets?owner=${accountName}&collection_name=${COLLECTION_NAME}&schema_name=${SCHEMA_NAME}&page=1&limit=1000`
    );

    const incinerators = response.data.data || [];
    console.log("Unstaked Incinerators:", incinerators);

    return incinerators;
  } catch (error) {
    console.error("Error fetching unstaked incinerators:", error);
    throw error;
  }
};

/**
 * Fetch incinerators from the blockchain using the cleanupcentr contract.
 *
 * @param {string} accountName - The user's WAX account name.
 * @returns {Promise<Array>} - Array of all incinerators owned by the user.
 */
export const fetchIncineratorsFromBlockchain = async (accountName) => {
  try {
    const response = await axios.post(`${BASE_URL}/v1/chain/get_table_rows`, {
      json: true,
      code: CONTRACT_NAME,
      scope: accountName,
      table: "incinerators",
      limit: 1000,
    });

    const incinerators = response.data.rows || [];
    console.log("Fetched incinerators from blockchain:", incinerators);
    return incinerators;
  } catch (error) {
    console.error("Error fetching incinerators from blockchain:", error);
    throw error;
  }
};

/**
 * Fetch staked incinerators from the backend API.
 *
 * @param {string} accountName - The user's WAX account name.
 * @returns {Promise<Array>} - Array of staked incinerators.
 */
export const fetchStakedIncineratorsFromBackend = async (accountName) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/incinerators/staked/${accountName}`);
    const stakedIncinerators = response.data.data || [];
    console.log("Fetched staked incinerators from backend:", stakedIncinerators);
    return stakedIncinerators;
  } catch (error) {
    console.error("Error fetching staked incinerators from backend:", error);
    throw error;
  }
};

/**
 * Fetch both staked and unstaked incinerators for a given user.
 *
 * @param {string} accountName - The user's WAX account name.
 * @returns {Promise<Object>} - An object containing staked and unstaked incinerators.
 */
export const fetchStakedAndUnstakedIncinerators = async (accountName) => {
  try {
    // Fetch unstaked incinerators
    const unstaked = await fetchUnstakedIncinerators(accountName);

    // Fetch staked incinerators
    const staked = await fetchStakedIncineratorsFromBackend(accountName);

    // Exclude staked incinerators from unstaked list
    const stakedIds = new Set(staked.map((incinerator) => incinerator.asset_id));
    const filteredUnstaked = unstaked.filter(
      (incinerator) => !stakedIds.has(incinerator.asset_id)
    );

    console.log("Staked Incinerators:", staked);
    console.log("Filtered Unstaked Incinerators:", filteredUnstaked);

    return { staked, unstaked: filteredUnstaked };
  } catch (error) {
    console.error("Error fetching incinerators:", error);
    return { staked: [], unstaked: [] };
  }
};

/**
 * Refresh all incinerators (staked and unstaked).
 *
 * @param {string} accountName - The user's WAX account name.
 * @returns {Promise<Object>} - An object containing refreshed staked and unstaked incinerators.
 */
export const refreshIncinerators = async (accountName) => {
  try {
    const incinerators = await fetchStakedAndUnstakedIncinerators(accountName);
    console.log("Refreshed incinerators:", incinerators);
    return incinerators;
  } catch (error) {
    console.error("Error refreshing incinerators:", error);
    throw error;
  }
};
