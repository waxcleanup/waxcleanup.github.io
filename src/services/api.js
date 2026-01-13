import axios from 'axios';  
import { JsonRpc } from 'eosjs';

// Prefer BACKEND_API_BASE_URL, but keep old API_BASE_URL for backward compatibility
const API_URL =
  process.env.REACT_APP_BACKEND_API_BASE_URL ||
  process.env.REACT_APP_API_BASE_URL ||
  'http://localhost:3003';
const rpc = new JsonRpc(process.env.REACT_APP_RPC || 'https://wax.pink.gg'); // Mainnet WAX URL
// Helper function to introduce a delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const toGatewayUrl = (val) => {
  if (!val) return '';
  const trimmed = String(val).trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^baf[myq]/i.test(trimmed) || /^Qm/i.test(trimmed)) {
    return `${IPFS_GATEWAY}/${trimmed.replace(/^\/+/, '')}`;
  }
  const m = trimmed.match(/\/ipfs\/(.+)/i);
  return m ? `${IPFS_GATEWAY}/${m[1]}` : trimmed;
};

// ---- IPFS helpers ----
const IPFS_GATEWAY =
  process.env.REACT_APP_IPFS_GATEWAY || 'https://maestrobeatz.servegame.com/ipfs';

/**
 * Normalize any IPFS-style URL to a clean CID (no /preview.png).
 * Supports:
 *  - ipfs://CID[/path]
 *  - https://host/ipfs/CID[/path]
 *  - https://CID.ipfs.host[/path]
 *  - raw "CID[/path]"
 */
const toIpfsCid = (input = '') => {
  let url = String(input || '').trim();
  if (!url) return '';

  // ipfs://CID[/path]
  const mIpfs = url.match(/^ipfs:\/\/([^/]+)/i);
  if (mIpfs) return mIpfs[1];

  // path-style: https://gateway.tld/ipfs/CID[/...]
  const mPath = url.match(/^https?:\/\/[^/]+\/ipfs\/([^/]+)/i);
  if (mPath) return mPath[1];

  // subdomain-style: https://CID.ipfs.host.tld[/...]
  const mSub = url.match(/^https?:\/\/([a-z0-9]+)\.ipfs\.[^/]+/i);
  if (mSub) return mSub[1];

  // already bare CID
  const mBare = url.match(/^([a-z0-9]{46,})/i);
  if (mBare) return mBare[1];

  return '';
};

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
 * Fetch template details and return CID-only gateway URL.
 */
export const fetchTemplateDetails = async (collectionName, templateId) => {
  try {
    const response = await axios.get(
      `${API_URL}/collections/${collectionName}/templates/${templateId}`
    );
    const data = response.data;

    // Extract just the CID from any IPFS-like link
    const imgCid = data.img ? toIpfsCid(data.img) : '';
    const videoCid = data.video ? toIpfsCid(data.video) : '';

    return {
      ...data,
      template_name: data.template_name ?? 'Unnamed Template',
      img: imgCid ? `${IPFS_GATEWAY}/${imgCid}` : '',
      video: videoCid ? `${IPFS_GATEWAY}/${videoCid}` : '',
    };
  } catch (error) {
    console.error(
      `Error fetching template details for template ID ${templateId} in collection ${collectionName}:`,
      error
    );
    throw error;
  }
};
/**
 * Syncs schemas and templates for a selected collection.
 * This endpoint is now admin-protected on the backend.
 * If the call is forbidden (403), we gracefully skip sync and continue using DB data.
 */
export const syncCollectionData = async (collectionName) => {
  try {
    const response = await axios.post(`${API_URL}/collections/${collectionName}/sync-schemas-templates`);
    return response.data;
  } catch (error) {
    const status = error?.response?.status;

    // ✅ IMPORTANT: Don't break the UI if sync is locked (expected for normal users)
    if (status === 403) {
      console.warn(`🔒 Sync blocked (403) for ${collectionName} — using DB data only.`);
      return { skipped: true, reason: 'forbidden' };
    }

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
 * IMPORTANT: pass account so backend can compute has_my_stake / my_staked_str / my_vote_for
 */
export const fetchOpenProposals = async (accountName) => {
  try {
    const params = {};
    if (accountName) params.account = String(accountName);

    const response = await axios.get(`${API_URL}/cleanup/proposals/open`, { params });

    console.log('[fetchOpenProposals] account=', accountName, response.data);
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
    // ✅ New backend returns the full merged list (approvednfts + tplcaps) without paging.
    // Keep the export name for compatibility across the UI.
    const response = await axios.get(`${API_URL}/cleanup/approved-collections`);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Error fetching approved collections:', error);
    throw error;
  }
};

/**
 * Fetch approved schema-burn rules (schemaburns + schemcaps merged on backend).
 */
export const fetchSchemaBurns = async () => {
  try {
    const response = await axios.get(`${API_URL}/cleanup/schema-burns`);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Error fetching schema burns:', error);
    throw error;
  }
};

// Replace your existing fetchBurnableNFTs with this:
export const fetchBurnableNFTs = async (accountName) => {
  try {
    const res = await axios.get(`${API_URL}/nfts/burnable/${accountName}`, { withCredentials: true });

    // Backend may return {success, data:[...]} or just an array
    const rows = Array.isArray(res.data) ? res.data : (res.data?.data || []);

    const mapped = rows.map((x) => {
      const templateIdNum = typeof x.template_id === 'string' ? Number(x.template_id) : x.template_id;

      // Convert CID or foreign gateway to your configured gateway
      const img = toGatewayUrl(x.img || '');

      // Normalize reward for UI (number only)
      const rewardNum = (x.cinder_reward || '')
        .toString()
        .split(' ')[0]; // "1.000000 CINDER" -> "1.000000"

      return {
        // required by UI
        asset_id: x.asset_id,
        collection_name: x.collection_name,
        schema_name: x.schema_name,
        template_id: templateIdNum,
        template_name: x.template_name || 'Unnamed NFT',
        img,

        // keep originals too
        trash_fee: x.trash_fee,
        cinder_reward: x.cinder_reward,

        // UI-friendly fields
        reward: rewardNum ? Number(rewardNum) : 0,
        count: x.count ?? 1,
      };
    });

    console.log('[fetchBurnableNFTs] mapped:', mapped);
    await delay(100); // small pause for smoother UI if needed
    return mapped;
  } catch (err) {
    console.error('[fetchBurnableNFTs] Error:', err);
    throw err;
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
