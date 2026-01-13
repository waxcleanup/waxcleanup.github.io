import axios from 'axios';

const API_BASE =
  process.env.REACT_APP_BACKEND_API_BASE_URL ||
  process.env.REACT_APP_API_BASE_URL ||
  'http://localhost:3003';

/**
 * Fetch approved template IDs for filtering burnable NFTs.
 * This uses the backend route: /cleanup/approved-collections
 * @returns {Promise<Array<{ collection: string, schema: string, template_id: number }>>}
 */
export async function fetchApprovedCollections() {
  try {
    const response = await axios.get(`${API_BASE}/cleanup/approved-collections`);
    if (Array.isArray(response.data)) {
      return response.data;
    } else {
      console.warn('Unexpected response format from /cleanup/approved-collections:', response.data);
      return [];
    }
  } catch (error) {
    console.error('[fetchApprovedCollections] Failed to fetch approved templates:', error.message);
    return [];
  }
}
