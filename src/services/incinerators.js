import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL; // Backend API base URL
const BASE_URL = process.env.REACT_APP_RPC; // WAX blockchain endpoint
const CONTRACT_NAME = process.env.REACT_APP_CONTRACT_NAME;

/**
 * Fetch incinerators from the blockchain using the cleanupcentr contract.
 *
 * @param {string} accountName - The user's WAX account name.
 * @returns {Promise<Array>} - Array of incinerators.
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
 * @param {string} accountName - The account name of the user.
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
 * @param {string} accountName - The account name of the user.
 * @returns {Promise<Object>} - An object containing staked and unstaked incinerators.
 */
export const fetchStakedAndUnstakedIncinerators = async (accountName) => {
  try {
    // Fetch staked incinerators from backend
    const staked = await fetchStakedIncineratorsFromBackend(accountName);

    // Fetch all incinerators from blockchain
    const allIncinerators = await fetchIncineratorsFromBlockchain(accountName);

    // Unstaked incinerators are those not marked as locked
    const unstaked = allIncinerators.filter(
      (incinerator) =>
        incinerator.owner === accountName &&
        Number(incinerator.locked) === 0
    );

    console.log("All Incinerators Fetched:", allIncinerators);
    console.log("Staked Incinerators:", staked);
    console.log("Unstaked Incinerators:", unstaked);

    return { staked, unstaked };
  } catch (error) {
    console.error("Error fetching staked and unstaked incinerators:", error);
    throw error;
  }
};
