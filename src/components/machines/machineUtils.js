// src/components/machines/machineUtils.js
export function toPlain(value) {
  if (value == null) return '';

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'object') {
    if (typeof value.toString === 'function') {
      const str = value.toString();
      if (str && str !== '[object Object]') return str;
    }

    if ('name' in value) return toPlain(value.name);
    if ('accountName' in value) return toPlain(value.accountName);
    if ('actorName' in value) return toPlain(value.actorName);
    if ('actor' in value) return toPlain(value.actor);
    if ('quantity' in value) return toPlain(value.quantity);
    if ('amount' in value) return toPlain(value.amount);
    if ('balance' in value) return toPlain(value.balance);
    if ('template_id' in value) return toPlain(value.template_id);
    if ('machine_name' in value) return toPlain(value.machine_name);
    if ('value' in value) return toPlain(value.value);
  }

  try {
    return String(value);
  } catch {
    return '';
  }
}

export function isLikelyWaxAccountName(value) {
  const str = toPlain(value).trim();
  return /^[a-z1-5.]{1,12}$/.test(str);
}

export function formatNumber(value, decimals = 2) {
  const plain = toPlain(value);
  const num = Number(plain || 0);

  if (!Number.isFinite(num)) return '0';

  return num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

export function formatSeconds(seconds = 0) {
  const total = Number(toPlain(seconds) || 0);
  if (!total) return '0m';

  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatCountdown(totalSeconds = 0) {
  const sec = Math.max(Number(totalSeconds || 0), 0);
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;

  return [
    String(hours).padStart(2, '0'),
    String(minutes).padStart(2, '0'),
    String(seconds).padStart(2, '0'),
  ].join(':');
}

export function buildIpfsUrl(cid) {
  const plainCid = toPlain(cid);
  if (!plainCid) return '';

  if (plainCid.startsWith('http://') || plainCid.startsWith('https://')) {
    return plainCid;
  }

  const cleanCid = plainCid
    .replace(/^ipfs:\/\//, '')
    .replace(/^ipfs\//, '')
    .replace(/^\/+/, '');

  const gateway =
    process.env.REACT_APP_IPFS_GATEWAY ||
    `${process.env.REACT_APP_API_BASE_URL || ''}/ipfs`;

  const cleanGateway = gateway.replace(/\/$/, '');

  return `${cleanGateway}/${cleanCid}`;
}

export function getMachineName(machine) {
  return (
    toPlain(machine?.name) ||
    toPlain(machine?.data?.name) ||
    toPlain(machine?.template?.immutable_data?.name) ||
    toPlain(machine?.machine_name) ||
    'Machine'
  );
}

export function getMachineImage(machine) {
  return (
    toPlain(machine?.data?.img) ||
    toPlain(machine?.template?.immutable_data?.img) ||
    toPlain(machine?.img) ||
    ''
  );
}

export function getMachineRarity(machine) {
  return (
    toPlain(machine?.data?.Rarity) ||
    toPlain(machine?.template?.immutable_data?.Rarity) ||
    'Common'
  );
}

export function getTemplateId(machine) {
  const raw =
    machine?.template?.template_id ??
    machine?.template_id ??
    machine?.data?.template_id ??
    null;

  if (raw === null || raw === undefined || raw === '') {
    return null;
  }

  const parsed = Number(toPlain(raw));
  return Number.isNaN(parsed) ? null : parsed;
}

export function getMachineAssetId(machine) {
  return toPlain(
    machine?.asset_id ?? machine?.nft_asset_id ?? machine?.machine_asset_id ?? ''
  );
}

export function getMachineRowId(machine) {
  const raw =
    machine?.machine_id ??
    machine?.id ??
    machine?.machineId ??
    machine?.row_id ??
    machine?.machineid ??
    machine?.data?.machine_id;

  if (raw === null || raw === undefined || raw === '') {
    return null;
  }

  const parsed = Number(toPlain(raw));
  return Number.isNaN(parsed) ? null : parsed;
}

export function getBalanceDisplay(row) {
  return (
    toPlain(row?.balance) ||
    toPlain(row?.quantity) ||
    toPlain(row?.amount) ||
    toPlain(row?.token_balance) ||
    '—'
  );
}

export function getLiveRemainingSeconds(machine, nowTick) {
  const readyAt = Number(toPlain(machine?.readyAt) || 0);
  const fallback = Number(toPlain(machine?.cooldownRemainingSec) || 0);

  if (readyAt > 0) {
    const nowSec = Math.floor(nowTick / 1000);
    return Math.max(readyAt - nowSec, 0);
  }

  return Math.max(fallback, 0);
}
