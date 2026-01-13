// src/services/repairStatusApi.js

const normalizeApiBase = () => {
  const raw = (process.env.REACT_APP_API_BASE_URL || '').replace(/\/+$/, '');
  if (!raw) return '';

  // If they provided "localhost:3003" with no protocol, add https:// (or http:// if you prefer)
  const hasProtocol = /^https?:\/\//i.test(raw);
  const base = hasProtocol ? raw : `https://${raw}`;

  // Add :3003 if no explicit port present in host
  // Example: https://maestrobeatz.servegame.com -> https://maestrobeatz.servegame.com:3003
  const host = base.replace(/^https?:\/\//i, '').split('/')[0];
  const hasPort = /:\d+$/.test(host);

  return hasPort ? base : `${base}:3003`;
};

const withCleanupPrefix = (base) => {
  if (!base) return '';
  // If base already ends with /cleanup or contains /cleanup at the end, don’t double it
  if (/\/cleanup$/i.test(base)) return base;
  return `${base}/cleanup`;
};

const looksLikeNoRepair = (json) => {
  const msg =
    (json?.message || json?.error || json?.msg || '')
      .toString()
      .toLowerCase();

  // Add/adjust phrases to match your backend wording if needed
  return (
    msg.includes('no repair') ||
    msg.includes('not repairing') ||
    msg.includes('no active') ||
    msg.includes('nothing to finalize') ||
    msg.includes('not found')
  );
};

export async function getRepairStatus(incineratorId) {
  const base = withCleanupPrefix(normalizeApiBase());
  if (!base) {
    // No base configured: treat as "no repair info available" without spamming errors
    return null;
  }

  const id = String(incineratorId || '').trim();
  if (!id) return null;

  const url = `${base}/repair-status/${encodeURIComponent(id)}`;

  let res;
  try {
    res = await fetch(url, { method: 'GET' });
  } catch {
    // Network errors shouldn’t spam the console as “repair errors”
    return null;
  }

  // If backend uses 404 to mean "no repair in progress", treat it as normal
  if (res.status === 404) return null;

  let json = null;
  try {
    json = await res.json();
  } catch {
    // Non-JSON response: don't blow up the UI
    return null;
  }

  // If backend wraps: { success:false, message:"no repair in progress" }
  if (json?.success === false && looksLikeNoRepair(json)) return null;

  // If non-OK and not "no repair", still don’t throw — just return null so UI stays clean
  if (!res.ok) return null;

  // ✅ unwrap backend envelope
  const data = json?.data ?? json;

  // If it’s missing expected fields, also treat as “no repair”
  if (!data || (!data.repair_time && !data.repair_points)) return null;

  return data;
}

