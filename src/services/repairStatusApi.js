// src/services/repairStatusApi.js

const normalizeApiBase = () => {
  const raw = (process.env.REACT_APP_API_BASE_URL || '').replace(/\/+$/, '');
  if (!raw) return '';

  const hasProtocol = /^https?:\/\//i.test(raw);
  return hasProtocol ? raw : `https://${raw}`;
};

const withCleanupPrefix = (base) => {
  if (!base) return '';
  if (/\/cleanup$/i.test(base)) return base;
  return `${base}/cleanup`;
};

const looksLikeNoRepair = (json) => {
  const msg = (json?.message || json?.error || json?.msg || '')
    .toString()
    .toLowerCase();

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
    return null;
  }

  const id = String(incineratorId || '').trim();
  if (!id) return null;

  const url = `${base}/repair-status/${encodeURIComponent(id)}`;

  let res;
  try {
    res = await fetch(url, { method: 'GET' });
  } catch {
    return null;
  }

  if (res.status === 404) return null;

  let json = null;
  try {
    json = await res.json();
  } catch {
    return null;
  }

  if (json?.success === false && looksLikeNoRepair(json)) return null;

  if (!res.ok) return null;

  const data = json?.data ?? json;

  if (!data || (!data.repair_time && !data.repair_points)) return null;

  return data;
}