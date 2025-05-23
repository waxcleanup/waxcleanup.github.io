import axios from 'axios';  
import { JsonRpc } from 'eosjs';

const API_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3003';
const rpc = new JsonRpc(process.env.REACT_APP_RPC || 'https://wax.pink.gg'); // Mainnet WAX URL
// Helper function to introduce a delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
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
 * Fetches templates for a specific schema in a collection.
 */
export const fetchTemplates = async (collectionName, schemaName) => {
  try {
    const response = await axios.get(`${API_URL}/collections/${collectionName}/schemas/${schemaName}/templates`);
    return response.data.map(template => ({
      template_id: template.template_id,
      name: template.template_name || 'Unnamed Template',
      circulating_supply: template.circulating_supply || 0,
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
      ...response.data
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
export const fetchUserBalances = async (accountName) => {
  try {
    const waxResponse = await axios.post(`${rpc.endpoint}/v1/chain/get_account`, {
      account_name: accountName,
    });
    const waxBalance = waxResponse.data.core_liquid_balance || '0.00000000 WAX';

    const trashBalanceResponse = await axios.post(`${rpc.endpoint}/v1/chain/get_currency_balance`, {
      code: "cleanuptoken",
      account: accountName,
      symbol: "TRASH",
    });
    const trashBalance = trashBalanceResponse.data[0] ? trashBalanceResponse.data[0].split(' ')[0] : '0.00000000';

    const cinderBalanceResponse = await axios.post(`${rpc.endpoint}/v1/chain/get_currency_balance`, {
      code: "cleanuptoken",
      account: accountName,
      symbol: "CINDER",
    });
    const cinderBalance = cinderBalanceResponse.data[0] ? cinderBalanceResponse.data[0].split(' ')[0] : '0.00000000';

    return {
      wax: waxBalance,
      trash: trashBalance,
      cinder: cinderBalance,
    };
  } catch (error) {
    console.error('Error fetching user balances:', error);
    throw new Error('Failed to fetch user balances');
  }
};

/**
 * Fetches all proposals from the backend.
 */
export const fetchProposals = async (page = 1, limit = 100) => {
  try {
    const response = await axios.get(`${API_URL}/cleanup/proposals`, {
      params: { page, limit }, // Pass page and limit to the backend
    });
    const { proposals, pagination } = response.data; // Extract proposals and pagination metadata
    return { proposals, pagination };
  } catch (error) {
    console.error('Error fetching proposals:', error);
    throw error;
  }
};

/**
 * Fetches only open (verified) proposals from the backend.
 */
export const fetchOpenProposals = async () => {
  try {
    const response = await axios.get(`${API_URL}/cleanup/proposals/open`);
    console.log('Fetched proposals from API:', response.data); // Log response data
    return response.data;
  } catch (error) {
    console.error('Error fetching open proposals:', error);
    throw error;
  }
};

/**
 * Fetches approved collections from the backend.
 */
export const fetchApprovedCollections = async () => {
  try {
    let allApprovedCollections = [];
    let page = 1;
    const limit = 1000; // Set the limit for each API request
    let hasMore = true;

    while (hasMore) {
      const response = await axios.get(`${API_URL}/cleanup/approved-collections?page=${page}&limit=${limit}`);
      const collections = response.data.map(collection => ({
        id: collection.id,
        collection: collection.collection,
        schema: collection.schema,
        template_id: collection.template_id,
      }));

      allApprovedCollections = [...allApprovedCollections, ...collections];
      hasMore = collections.length === limit; // Check if the current page has the maximum number of items
      page++;
    }

    return allApprovedCollections;
  } catch (error) {
    console.error('Error fetching approved collections:', error);
    throw error;
  }
};

/**
 * Fetches and filters user's NFTs to show burnable NFTs based on the approved list and proposal rewards,
 * while also counting each unique NFT type by template_id.
 */
export const fetchBurnableNFTs = async (accountName) => {
  try {
    // Fetch user NFTs, approved templates, and open proposals concurrently
    const [userNFTs, approvedNFTs, openProposals] = await Promise.all([
      fetchUserNFTsFromBlockchain(accountName),
      fetchApprovedCollections(),  // Fetch approved templates
      fetchOpenProposals()         // Fetch open proposals (with reward info)
    ]);

    console.log("Fetched userNFTs:", userNFTs);
    console.log("Fetched approvedNFTs:", approvedNFTs);
    console.log("Fetched openProposals:", openProposals);

    // Filter user's NFTs based on approved collections and templates
    const filteredNFTs = userNFTs.filter(nft =>
      approvedNFTs.some(approved =>
        approved.collection === nft.collection_name &&
        approved.schema === nft.schema_name &&
        approved.template_id === nft.template_id
      )
    );

    console.log("Filtered NFTs:", filteredNFTs);

    // Group NFTs by template_id and count each unique type
    const nftMap = filteredNFTs.reduce((acc, nft) => {
      const { template_id, collection_name, schema_name } = nft;

      // Find the corresponding proposal to get the reward amount
      const proposal = openProposals.find(prop =>
        prop.collection === collection_name &&
        prop.schema === schema_name &&
        prop.template_id === template_id
      );
      const reward = proposal ? proposal.reward : 0;  // Use 0 if no reward found

      if (!acc[template_id]) {
        // Initialize a new entry if template_id is not already in map
        acc[template_id] = {
          ...nft,       // Copy NFT details (to keep template_name and img from the NFT)
          reward,       // Attach reward from proposal
          count: 1       // Start counting occurrences of this template
        };
      } else {
        // Increment count if template_id already exists in map
        acc[template_id].count += 1;
      }
      return acc;
    }, {});

    console.log("Grouped and counted NFTs by template_id:", nftMap);

    // Fetch additional details (e.g., template name and image) for each unique NFT type
    const uniqueNFTs = await Promise.all(
      Object.values(nftMap).map(async nft => {
        // Fetch template details like name and image
        const templateDetails = await fetchTemplateDetails(nft.collection_name, nft.template_id);
        return {
          ...nft,
          template_name: templateDetails.template_name || 'Unnamed NFT', // Default if template name is missing
          img: templateDetails.img || null  // Default if image is missing
        };
      })
    );

    console.log("Final unique NFTs with counts before delay:", uniqueNFTs);

    // Add delay for UI rendering, if needed
    await delay(500); // 500ms delay to simulate processing time or for UI responsiveness

    console.log("Final unique NFTs with counts after delay:", uniqueNFTs);

    return uniqueNFTs;  // Return the final array of unique NFTs with details
  } catch (error) {
    console.error('Error fetching burnable NFTs:', error);
    throw error; // Rethrow error for handling at the caller level
  }
};


// Add this to your `api.js` file
export const fetchUserNFTsFromContract = async (accountName) => {
  try {
    const response = await axios.post(`${rpc.endpoint}/v1/chain/get_table_rows`, {
      json: true,
      code: 'atomicassets',  // The smart contract name (could be different if you're using a custom contract)
      scope: accountName,    // The account name that owns the NFTs
      table: 'assets',       // The table where the assets are stored
      limit: 1000,           // Limit to avoid overloading the response
    });

    const userNFTs = response.data.rows;

    console.log('Fetched user NFTs from contract:', userNFTs);
    
    return userNFTs;
  } catch (error) {
    console.error('Error fetching user NFTs from contract:', error);
    throw error;
  }
};
/**
 * Fetches user's incinerators and categorizes them as staked or unstaked.
 */
export const fetchIncineratorsFromBlockchain = async (accountName) => {
  try {
    const response = await axios.post(`${rpc.endpoint}/v1/chain/get_table_rows`, {
      json: true,
      code: "atomicassets",  // Contract name for assets
      scope: accountName,    // Account name (ownership scope)
      table: "assets",       // Table name
      limit: 1000,           // Max rows to fetch
    });

    const userAssets = response.data.rows || [];
    console.log("Fetched user assets from blockchain:", userAssets);

    // Filter incinerators by collection and schema
    const incinerators = userAssets.filter(
      (asset) =>
        asset.collection_name === "cleanupcentr" && // Filter by collection
        asset.schema_name === "incinerators"        // Filter by schema
    );

    console.log("Filtered incinerators:", incinerators);

    // Return the filtered incinerators
    return incinerators;
  } catch (error) {
    console.error("Error fetching incinerators from blockchain:", error);
    throw error;
  }
};


/**
 * Fetches template details for a specific template_id and collection_name.
 */
export const fetchIncineratorTemplateDetails = async (collectionName, templateId) => {
  try {
    const response = await axios.get(`${API_URL}/collections/${collectionName}/templates/${templateId}`);
    return response.data;  // Assuming the data includes template_name, img (IPFS URL), and metadata
  } catch (error) {
    console.error(`Error fetching template details for ${templateId} in collection ${collectionName}:`, error);
    throw error;
  }
};
/**
 * Stakes an incinerator by sending the assetId and user to the backend.
 */
export const stakeIncinerator = async (user, assetId) => {
  try {
    const response = await axios.post(
      `${API_URL}/cleanup/stake-incinerator`,
      { user, assetId }, // Use "user" to match backend expectations
      { timeout: 10000 } // Set timeout for 10 seconds
    );

    // Return the backend response
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('Error staking incinerator:', error);

    // Extract detailed error or fallback to a generic message
    const errorMessage =
      error.response?.data?.error || 'Failed to stake incinerator. Please try again.';
    return {
      success: false,
      error: errorMessage,
    };
  }
};
/**
 * Fetches user's NFTs from the blockchain based on the provided account name.
 */
export const fetchUserNFTsFromBlockchain = async (accountName) => {
  try {
    const response = await axios.post(`${rpc.endpoint}/v1/chain/get_table_rows`, {
      json: true,
      code: 'atomicassets',  // Contract name for assets
      scope: accountName,    // Account name (ownership scope)
      table: 'assets',       // Table name
      limit: 1000,           // Max rows to fetch
    });

    const userNFTs = response.data.rows;

    console.log('Fetched user NFTs from contract:', userNFTs);
    
    return userNFTs;
  } catch (error) {
    console.error('Error fetching user NFTs from contract:', error);
    throw error;
  }
};

/**
 * Fetches the current blockchain time from the WAX RPC.
 */
export const fetchBlockchainTime = async () => {
  try {
    const response = await axios.get(`${rpc.endpoint}/v1/chain/get_info`); // Fetch blockchain info
    const headBlockTime = response.data.head_block_time; // Get the head block time (ISO 8601 format)
    console.log('Fetched blockchain time:', headBlockTime); // Debugging log
    return new Date(headBlockTime).getTime(); // Convert to milliseconds
  } catch (error) {
    console.error('Error fetching blockchain time:', error);
    return Date.now(); // Fallback to local time if API call fails
  }
};
