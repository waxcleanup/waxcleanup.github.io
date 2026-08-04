const normalizeEndpoint = (value) => String(value || '').trim().replace(/\/+$/, '');

const READ_ENDPOINTS = Array.from(new Set([
  process.env.REACT_APP_READ_RPC,
  'https://wax.greymass.com',
  process.env.REACT_APP_RPC,
  'https://wax.pink.gg',
].map(normalizeEndpoint).filter(Boolean)));

async function requestWaxRpc(path, options) {
  let lastError = null;

  for (const endpoint of READ_ENDPOINTS) {
    try {
      const response = await fetch(`${endpoint}${path}`, options);
      if (!response.ok) {
        lastError = new Error(`WAX RPC request failed (${response.status}).`);
        continue;
      }
      return await response.json();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('No WAX read RPC is available.');
}

export function postWaxRpc(path, body) {
  return requestWaxRpc(path, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: JSON.stringify(body),
  });
}

export function getWaxRpc(path) {
  return requestWaxRpc(path, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
}
