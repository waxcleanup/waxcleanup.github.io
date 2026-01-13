// src/services/tools.js

const API_BASE =
  process.env.REACT_APP_API_BASE_URL || 'https://maestrobeatz.servegame.com';

/**
 * Fetch staked but unequipped tools for a user
 */
export async function fetchUnequippedStakedTools(owner) {
  if (!owner) throw new Error('Missing owner');

  const url = `${API_BASE}/tools/staked/unequipped/${owner}`;
  const res = await fetch(url);

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Tools API failed (${res.status}): ${txt.slice(0, 140)}`);
  }

  const json = await res.json();
  if (!json?.success) throw new Error('Tools API returned success=false');

  // 🔑 return the array, not the wrapper
  return json.data || [];
}

