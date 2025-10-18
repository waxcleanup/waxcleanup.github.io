import axios from 'axios';

// Constants from environment variables
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL; // Backend API base URL
const COLLECTION_NAME = "cleanupcentr"; // Collection name for incinerators
const SCHEMA_NAME = "incinerators"; // Schema name for incinerators
const ATOMIC_ASSETS_API = "https://wax.api.atomicassets.io/atomicassets/v1/assets"; // API endpoint for AtomicAssets

/**
 * Fetch all unstaked incinerators owned by the user.
 *
 * @param {string} accountName - The user's WAX account name.
 * @returns {Promise<Array>} - Array of objects containing Asset ID, Name, and optional Image of unstaked incinerators.
 */
export const fetchUnstakedIncinerators = async (accountName) => {
  try {
    // Query the AtomicAssets API for the user's NFTs in the specific collection/schema
    const response = await axios.get(
      `${ATOMIC_ASSETS_API}?owner=${accountName}&collection_name=${COLLECTION_NAME}&schema_name=${SCHEMA_NAME}&page=1&limit=1000`
    );

    // Extract relevant data from the response
    const incinerators = response.data.data || [];
    const simplifiedIncinerators = incinerators.map((incinerator) => ({
      asset_id: incinerator.asset_id,
      name: incinerator.data?.name || "Unnamed Incinerator",
      img: incinerator.data?.img || "default-placeholder.png", // Provide a default image if unavailable
    }));

    console.log("Unstaked Incinerators (Simplified):", simplifiedIncinerators);
    return simplifiedIncinerators;
  } catch (error) {
    console.error("Error fetching unstaked incinerators:", error);
    throw error;
  }
};

/**
 * Fetch staked incinerators from the backend API.
 *
 * @param {string} accountName - The user's WAX account name.
 * @returns {Promise<Array>} - Array of objects containing staked incinerators with additional attributes.
 */
export const fetchStakedIncinerators = async (accountName) => {
  try {
    // Query the backend API for staked incinerators
    const response = await axios.get(`${API_BASE_URL}/incinerators/staked/${accountName}`);
    const stakedIncinerators = response.data.data || [];
    console.log("Staked Incinerators:", stakedIncinerators);
    return stakedIncinerators;
  } catch (error) {
    console.error("Error fetching staked incinerators:", error);
    throw error;
  }
};
