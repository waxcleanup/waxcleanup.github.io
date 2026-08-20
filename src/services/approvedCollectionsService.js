import axios from 'axios';

const API_BASE = (process.env.REACT_APP_API_BASE_URL || 'https://maestrobeatz.servegame.com')
  .replace(/\/+$/, '');

const MARKET_API_BASE = (
  process.env.REACT_APP_MARKET_API_BASE_URL || API_BASE
).replace(/\/+$/, '');


export async function fetchAlcorTokenValues() {
  try {
    const response = await axios.get(`${MARKET_API_BASE}/market/alcor-token-values`);
    return response.data?.success ? response.data.data : null;
  } catch (error) {
    console.error('[fetchAlcorTokenValues] Failed:', error.message);
    return null;
  }
}

const ATOMIC_MARKET_API = "https://wax.api.atomicassets.io";

export async function fetchAtomicTemplateMarket(collection, schema, templateId) {
  const params = {
    symbol: "WAX",
    collection_name: collection,
    schema_name: schema,
    template_id: templateId,
    page: 1,
    limit: 1,
    sort: "price",
    order: "asc",
  };
  const response = await axios.get(`${ATOMIC_MARKET_API}/atomicmarket/v1/sales/templates`, { params });
  const sale = Array.isArray(response.data?.data) ? response.data.data[0] : null;
  if (!sale) return { lowestListingWax: null, saleId: null };
  const precision = Number(sale.price?.token_precision ?? 8);
  const amount = Number(sale.price?.amount ?? sale.listing_price);
  return {
    lowestListingWax: Number.isFinite(amount) ? amount / (10 ** precision) : null,
    saleId: sale.sale_id || null,
  };
}

/**
 * Fetch approved template IDs for filtering burnable NFTs.
 * This uses the backend route: /cleanup/approved-collections
 * @returns {Promise<Array<{ collection: string, schema: string, template_id: number }>>}
 */
export async function fetchApprovedCollections() {
  try {
    const [response, proposalsResponse] = await Promise.all([axios.get(API_BASE + String.fromCharCode(47,99,108,101,97,110,117,112,47,97,112,112,114,111,118,101,100,45,99,111,108,108,101,99,116,105,111,110,115)), axios.get(API_BASE + String.fromCharCode(47,99,108,101,97,110,117,112,47,112,114,111,112,111,115,97,108,115,63,108,105,109,105,116,61,53,48,48,48))]);
    if (Array.isArray(response.data)) {
      const proposals = Array.isArray(proposalsResponse.data?.proposals) ? proposalsResponse.data.proposals : [];
      const proposalsById = new Map(proposals.map((proposal) => [String(proposal.prop_id), proposal]));
      return response.data.map((approved) => {
        const proposal = proposalsById.get(String(approved.prop_id));
        return { ...approved, trash_fee: approved.trash_fee ?? proposal?.trash_fee ?? null, cinder_reward: approved.cinder_reward ?? proposal?.cinder_reward ?? null };
      });
    } else {
      console.warn('Unexpected response format from /cleanup/approved-collections:', response.data);
      return [];
    }
  } catch (error) {
    console.error('[fetchApprovedCollections] Failed to fetch approved templates:', error.message);
    return [];
  }
}