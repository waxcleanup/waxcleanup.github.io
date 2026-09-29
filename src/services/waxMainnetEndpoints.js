export const WAX_MAINNET_CHAIN_ID = '1064487b3cd1a897ce03ae5b6a865651747e2e152090f99c1d19d44e01aea5a4';

const normalizeEndpoint = (value) => String(value || '').trim().replace(/\/+$/, '');
const configuredBackups = String(process.env.REACT_APP_RPC_BACKUPS || '')
  .split(',')
  .map(normalizeEndpoint)
  .filter(Boolean);

export const WAX_MAINNET_ENDPOINTS = Array.from(new Set([
  process.env.REACT_APP_RPC,
  ...configuredBackups,
  'https://wax.greymass.com',
  'https://wax.eosusa.io',
].map(normalizeEndpoint).filter(Boolean)));

let cachedEndpoint = '';
let cacheExpiresAt = 0;

async function fetchWithTimeout(url, options = {}, timeoutMs = 6000) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await window.fetch(url, { ...options, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
}

async function endpointIsWaxMainnet(endpoint) {
  try {
    const response = await fetchWithTimeout(`${endpoint}/v1/chain/get_info`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    if (!response.ok) return false;
    const info = await response.json();
    return info.chain_id === WAX_MAINNET_CHAIN_ID;
  } catch (error) {
    return false;
  }
}

export async function getHealthyWaxMainnetEndpoint({ force = false, exclude = [] } = {}) {
  if (!force && cachedEndpoint && !exclude.includes(cachedEndpoint) && Date.now() < cacheExpiresAt) return cachedEndpoint;
  for (const endpoint of WAX_MAINNET_ENDPOINTS) {
    if (exclude.includes(endpoint)) continue;
    if (await endpointIsWaxMainnet(endpoint)) {
      cachedEndpoint = endpoint;
      cacheExpiresAt = Date.now() + 30000;
      return endpoint;
    }
  }
  cachedEndpoint = '';
  cacheExpiresAt = 0;
  throw new Error('No verified WAX mainnet RPC endpoint is currently available.');
}

export function invalidateWaxMainnetEndpoint(endpoint) {
  if (!endpoint || endpoint === cachedEndpoint) {
    cachedEndpoint = '';
    cacheExpiresAt = 0;
  }
}

export async function postWaxMainnetRpc(path, body = {}) {
  let lastError = null;
  for (const endpoint of WAX_MAINNET_ENDPOINTS) {
    if (!(await endpointIsWaxMainnet(endpoint))) continue;
    try {
      const response = await fetchWithTimeout(`${endpoint}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(`WAX mainnet RPC request failed (${response.status}).`);
      return await response.json();
    } catch (error) {
      lastError = error;
      invalidateWaxMainnetEndpoint(endpoint);
    }
  }
  throw lastError || new Error('No verified WAX mainnet RPC endpoint is currently available.');
}
