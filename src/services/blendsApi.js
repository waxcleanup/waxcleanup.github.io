import axios from 'axios';

const API_BASE = (
  process.env.REACT_APP_BACKEND_API_BASE_URL ||
  process.env.REACT_APP_API_BASE_URL ||
  'http://localhost:3003'
).replace(/\/$/, '');

const IPFS_GATEWAY = (
  process.env.REACT_APP_IPFS_GATEWAY ||
  'https://maestrobeatz.servegame.com/ipfs'
).replace(/\/$/, '');

export function toIpfsUrl(value) {
  if (!value) return '';
  const raw = String(value).trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('ipfs://')) {
    return `${IPFS_GATEWAY}/${raw.replace('ipfs://', '').replace(/^ipfs\//, '')}`;
  }
  return `${IPFS_GATEWAY}/${raw.replace(/^\/+/, '')}`;
}

export function getRecipeActionText(recipe) {
  const text = [recipe?.label, recipe?.title]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return text.includes('pack') || text.includes('crate') ? 'Open' : 'Process';
}

export async function fetchBlendOverview(wallet) {
  const { data } = await axios.get(`${API_BASE}/blends/overview/${wallet}`);
  return data;
}

export async function fetchBagAssets(wallet) {
  const { data } = await axios.get(`${API_BASE}/bag/${wallet}`);
  const assets = Array.isArray(data?.assets) ? data.assets : [];

  return assets.map((asset) => ({
    ...asset,
    asset_id: String(asset.asset_id || ''),
    template_id: String(asset.template_id || asset?.template?.template_id || ''),
    image: toIpfsUrl(asset.image || asset?.data?.img || ''),
    name: asset.name || asset.nft_type || asset?.data?.name || '',
  }));
}
