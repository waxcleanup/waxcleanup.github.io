// services/api.js
import axios from 'axios';
import { JsonRpc } from 'eosjs'; // EOSIO JSON RPC for blockchain interaction

const API_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3003';
const rpc = new JsonRpc(process.env.REACT_APP_RPC || 'https://wax.pink.gg'); // Updated to mainnet WAX URL

/**
 * Fetches collections with pagination and optional search term.
 */
export const fetchCollections = async (page = 1, limit = 100, searchTerm = '') => {
  try {
    const response = await axios.get(`${API_URL}/collections`, {
      params: { page, limit, search: searchTerm },
    });
    const { collections, pagination } = response.data;
    return { collections, pagination };
  } catch (error) {
    console.error('Error fetching collections:', error);
    throw error;
  }
};

/**
 * Fetches schemas for a specific collection.
 */
export const fetchSchemas = async (collectionName) => {
  try {
    const response = await axios.get(`${API_URL}/collections/${collectionName}/schemas`);
    return response.data || [];
  } catch (error) {
    console.error(`Error fetching schemas for collection ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Fetches templates for a specific schema in a collection, including name, supply, and media (img and video).
 */
export const fetchTemplates = async (collectionName, schemaName) => {
  try {
    const response = await axios.get(`${API_URL}/collections/${collectionName}/schemas/${schemaName}/templates`);
    return response.data.map(template => ({
      template_id: template.template_id,
      name: template.template_name || 'Unnamed Template',
      circulating_supply: template.circulating_supply || 0,
      img: template.img || '',
      video: template.video || ''
    }));
  } catch (error) {
    console.error(`Error fetching templates for collection ${collectionName}, schema ${schemaName}:`, error);
    throw error;
  }
};

/**
 * Fetches detailed information for a specific template by template ID and collection name.
 */
export const fetchTemplateDetails = async (collectionName, templateId) => {
  try {
    const response = await axios.get(`${API_URL}/collections/${collectionName}/templates/${templateId}`);
    return {
      ...response.data,
      img: response.data.img || '',
      video: response.data.video || ''
    };
  } catch (error) {
    console.error(`Error fetching template details for template ID ${templateId} in collection ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Syncs schemas and templates for a selected collection.
 */
export const syncCollectionData = async (collectionName) => {
  try {
    const response = await axios.post(`${API_URL}/collections/${collectionName}/sync-schemas-templates`);
    return response.data;
  } catch (error) {
    console.error(`Error syncing collection data for ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Fetches user balances for WAX, TRASH, and CINDER directly from the blockchain.
 */
// Adjust the fetchUserBalances to return just the numeric value
export const fetchUserBalances = async (accountName) => {
  try {
    const waxResponse = await axios.post('https://wax.pink.gg/v1/chain/get_account', {
      account_name: accountName,
    });
    const waxBalance = waxResponse.data.core_liquid_balance || '0.00000000'; // Only numeric value

    const trashBalanceResponse = await axios.post('https://wax.pink.gg/v1/chain/get_currency_balance', {
      code: "cleanuptoken",
      account: accountName,
      symbol: "TRASH",
    });
    const trashBalance = trashBalanceResponse.data[0] ? trashBalanceResponse.data[0].split(' ')[0] : '0.00000000'; // Get only the numeric part

    const cinderBalanceResponse = await axios.post('https://wax.pink.gg/v1/chain/get_currency_balance', {
      code: "cleanuptoken",
      account: accountName,
      symbol: "CINDER",
    });
    const cinderBalance = cinderBalanceResponse.data[0] ? cinderBalanceResponse.data[0].split(' ')[0] : '0.00000000'; // Get only the numeric part

    return {
      wax: waxBalance, // e.g., '0.00000000'
      trash: trashBalance, // e.g., '1794217475.956'
      cinder: cinderBalance, // e.g., '0.00000000'
    };
  } catch (error) {
    console.error('Error fetching user balances:', error);
    throw new Error('Failed to fetch user balances');
  }
};
