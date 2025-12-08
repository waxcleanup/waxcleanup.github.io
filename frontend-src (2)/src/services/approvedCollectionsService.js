import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE_URL;

/**
 * Fetch approved template IDs for filtering burnable NFTs.
 * This uses the new backend route: /collections/approved-templates
 * @returns {Promise<Array<{ collection: string, schema: string, template_id: number }>>}
 */
export async function fetchApprovedCollections() {
  try {
    const response = await axios.get(`${API_BASE}/collections/approved-templates`);
    if (Array.isArray(response.data)) {
      return response.data;
    } else {
      console.warn('Unexpected response format from /collections/approved-templates:', response.data);
      return [];
    }
  } catch (error) {
    console.error('[fetchApprovedCollections] Failed to fetch approved templates:', error.message);
    return [];
  }
}
