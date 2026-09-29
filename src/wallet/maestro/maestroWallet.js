import { PrivateKey, PublicKey, Transaction } from "@wharfkit/antelope";
import {
  postWaxMainnetRpc,
  WAX_MAINNET_CHAIN_ID,
} from "../../services/waxMainnetEndpoints";
import { assertSafeWalletPermission } from "./maestroPolicy";

export const MAESTRO_WALLET_ID = "maestro-wallet-mainnet";
export const MAINNET_CHAIN_ID = WAX_MAINNET_CHAIN_ID;
export const MAESTRO_WALLET_LOGIN_REQUEST_EVENT =
  "maestro-wallet-mainnet:login-request";
export const MAESTRO_WALLET_SIGN_REQUEST_EVENT = "maestro-wallet-mainnet:sign-request";
export const MAESTRO_WALLET_TERMS_VERSION = "2026-09-21-mainnet-v1";
export const MAESTRO_GAMEPLAY_AUTO_SIGN_ACTIONS = new Set([
  "enterworld",
  "movechar",
  "starttravel",
  "advtravel",
  "finishtravel",
  "canceltravel",
  "exitworld",
  "unstakechar",
  "syncchar",
  "syncall",
  "syncvitals",
  "startdisc",
  "revealdisc",
  "finaldisc",
  "startact",
  "revealact",
  "finalact",
  "syncbuild",
  "allocattrs",
  "chooseclass",
  "syncclass",
  "equipwtool",
  "unequipwtool",
  "unstakewtool",
  "startresjob",
  "cancelresjob",
  "finishresjob",
]);
export const MAESTRO_COMPANION_AUTO_SIGN_ACTIONS = new Set([
  "startdepgen",
  "finaldepgen",
  "tracktravel",
  "canceltrack",
  "rollarrival",
  "rollfrontier",
]);

const STORAGE_KEY = "cleanupcentr_mainnet_maestro_wallet_v1";
const LEGACY_STORAGE_KEY = "cleanupcentr_mainnet_experimental_wallet_v1";
const WALLETS_STORAGE_KEY = "cleanupcentr_mainnet_maestro_wallets_v2";
const ACTIVE_WALLET_KEY = "cleanupcentr_mainnet_maestro_active_wallet_v1";
const CONSENT_STORAGE_KEY = "cleanupcentr_mainnet_maestro_wallet_consent_v1";
const ACTIVITY_STORAGE_KEY = "cleanupcentr_mainnet_maestro_wallet_activity_v1";
const AUTO_SIGN_PREFS_STORAGE_KEY = "cleanupcentr_mainnet_maestro_autosign_prefs_v1";
const VERSION = 1;
const PBKDF2_ITERATIONS = 600000;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

let unlockedPrivateKey = null;
let runtime = {
  unlocked: false,
  account: "",
  permission: "",
  publicKey: "",
  autoSignScopes: [],
};
const listeners = new Set();
let pendingLoginRequest = null;
let pendingSignRequest = null;

function emit() {
  listeners.forEach((listener) => listener(getMaestroWalletState()));
}

function resolvePendingLogin() {
  if (!pendingLoginRequest) return;
  const { resolve } = pendingLoginRequest;
  pendingLoginRequest = null;
  resolve(getMaestroWalletState());
}

function bytesToBase64(bytes) {
  let binary = "";
  bytes.forEach((value) => {
    binary += String.fromCharCode(value);
  });
  return window.btoa(binary);
}

function base64ToBytes(value) {
  const binary = window.atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function validateEncryptedVault(value) {
  if (!value || value.version !== VERSION || value.chainId !== MAINNET_CHAIN_ID)
    throw new Error("Unsupported wallet vault.");
  if (!/^[a-z1-5.]{1,12}$/.test(String(value.account || "")))
    throw new Error("Invalid wallet account metadata.");
  if (!/^[a-z1-5.]{1,12}$/.test(String(value.permission || "")))
    throw new Error("Invalid wallet permission metadata.");
  try {
    PublicKey.from(value.publicKey);
  } catch (error) {
    throw new Error("Invalid wallet public-key metadata.");
  }
  if (
    value.kdf?.name !== "PBKDF2" ||
    value.kdf?.hash !== "SHA-256" ||
    Number(value.kdf?.iterations) !== PBKDF2_ITERATIONS
  )
    throw new Error("Unsupported wallet KDF configuration.");
  if (
    value.cipher?.name !== "AES-GCM" ||
    Number(value.cipher?.tagLength) !== 128
  )
    throw new Error("Unsupported wallet cipher configuration.");
  try {
    if (base64ToBytes(value.kdf.salt).length !== 16)
      throw new Error("Invalid wallet salt.");
    if (base64ToBytes(value.cipher.iv).length !== 12)
      throw new Error("Invalid wallet IV.");
    if (base64ToBytes(value.cipher.ciphertext).length < 17)
      throw new Error("Invalid wallet ciphertext.");
  } catch (error) {
    throw new Error("Invalid encrypted wallet payload.");
  }
  return value;
}

function walletId(wallet) {
  return `${wallet.account}@${wallet.permission}`;
}

function legacyStoredWallet() {
  const legacyRaw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
  const raw = window.localStorage.getItem(STORAGE_KEY) || legacyRaw;
  if (!raw) return null;
  try {
    const value = validateEncryptedVault(JSON.parse(raw));
    if (legacyRaw && !window.localStorage.getItem(STORAGE_KEY)) {
      window.localStorage.setItem(STORAGE_KEY, legacyRaw);
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
    return value;
  } catch (error) {
    throw new Error("The encrypted mainnet wallet vault is invalid.");
  }
}

function saveWallets(wallets) {
  window.localStorage.setItem(
    WALLETS_STORAGE_KEY,
    JSON.stringify({
      version: 2,
      chainId: MAINNET_CHAIN_ID,
      wallets,
    }),
  );
}

function storedWallets() {
  const raw = window.localStorage.getItem(WALLETS_STORAGE_KEY);
  if (raw) {
    try {
      const collection = JSON.parse(raw);
      if (
        collection.version !== 2 ||
        collection.chainId !== MAINNET_CHAIN_ID ||
        !Array.isArray(collection.wallets)
      ) {
        throw new Error("Unsupported wallet collection.");
      }
      return collection.wallets.map(validateEncryptedVault);
    } catch (error) {
      throw new Error("The encrypted mainnet wallet collection is invalid.");
    }
  }
  const legacy = legacyStoredWallet();
  if (!legacy) return [];
  saveWallets([legacy]);
  window.localStorage.setItem(ACTIVE_WALLET_KEY, walletId(legacy));
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  return [legacy];
}

function storedWallet() {
  const wallets = storedWallets();
  if (!wallets.length) return null;
  const activeId = window.localStorage.getItem(ACTIVE_WALLET_KEY);
  return wallets.find((wallet) => walletId(wallet) === activeId) || wallets[0];
}

function storedConsent() {
  try {
    return JSON.parse(
      window.localStorage.getItem(CONSENT_STORAGE_KEY) || "null",
    );
  } catch (error) {
    return null;
  }
}

function storedActivity() {
  try {
    const rows = JSON.parse(
      window.localStorage.getItem(ACTIVITY_STORAGE_KEY) || "[]",
    );
    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    return [];
  }
}

function storedAutoSignPreferences() {
  try {
    const value = JSON.parse(
      window.localStorage.getItem(AUTO_SIGN_PREFS_STORAGE_KEY) || "{}",
    );
    return value && typeof value === "object" && !Array.isArray(value)
      ? value
      : {};
  } catch (error) {
    return {};
  }
}

function rememberGameplayAutoSign(account, permission, enabled) {
  const id = `${account}@${permission}`;
  const preferences = storedAutoSignPreferences();
  if (enabled) preferences[id] = { gameplay: true };
  else delete preferences[id];
  window.localStorage.setItem(
    AUTO_SIGN_PREFS_STORAGE_KEY,
    JSON.stringify(preferences),
  );
}

export function recordMaestroWalletActivity({
  account,
  permission,
  transactionId,
  actions,
  blockNumber = 0,
}) {
  const cleanId = String(transactionId || "");
  const cleanAccount = String(account || "");
  if (!cleanId || !cleanAccount) return;
  const entry = {
    account: cleanAccount,
    permission: String(permission || "active"),
    transactionId: cleanId,
    actions: (actions || []).slice(0, 12).map((action) => ({
      account: String(action.account || ""),
      name: String(action.name || ""),
    })),
    status: "accepted",
    blockNumber: Number(blockNumber || 0),
    confirmedAt: new Date().toISOString(),
  };
  const rows = [
    entry,
    ...storedActivity().filter((row) => row.transactionId !== cleanId),
  ].slice(0, 50);
  window.localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(rows));
  emit();
}

export function updateMaestroWalletActivityFinality(transactionId, update) {
  const id = String(transactionId || "");
  if (!id) return;
  let changed = false;
  const rows = storedActivity().map((entry) => {
    if (entry.transactionId !== id) return entry;
    changed = true;
    return { ...entry, ...update };
  });
  if (!changed) return;
  window.localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(rows));
  emit();
}

export function clearMaestroWalletActivity(
  account = getMaestroWalletState().account,
) {
  const rows = storedActivity().filter(
    (row) => row.account !== String(account || ""),
  );
  window.localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(rows));
  emit();
}

export function hasCurrentMaestroWalletConsent() {
  const consent = storedConsent();
  return Boolean(
    consent &&
    consent.version === MAESTRO_WALLET_TERMS_VERSION &&
    consent.chainId === MAINNET_CHAIN_ID &&
    consent.acceptedAt,
  );
}

function recordMaestroWalletConsent(account, permission) {
  window.localStorage.setItem(
    CONSENT_STORAGE_KEY,
    JSON.stringify({
      version: MAESTRO_WALLET_TERMS_VERSION,
      chainId: MAINNET_CHAIN_ID,
      account,
      permission,
      acceptedAt: new Date().toISOString(),
    }),
  );
}

export function acceptMaestroWalletTerms() {
  const vault = storedWallet();
  if (!vault)
    throw new Error("Import the Maestro Wallet before recording consent.");
  recordMaestroWalletConsent(vault.account, vault.permission);
  emit();
  return getMaestroWalletState();
}

function associatedData(metadata) {
  return encoder.encode(
    JSON.stringify({
      version: VERSION,
      chainId: MAINNET_CHAIN_ID,
      account: metadata.account,
      permission: metadata.permission,
      publicKey: metadata.publicKey,
    }),
  );
}

async function deriveEncryptionKey(password, salt, usage) {
  const material = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return window.crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    usage,
  );
}

function assertMainnetConfiguration() {
  if (process.env.REACT_APP_CHAINID !== MAINNET_CHAIN_ID) {
    throw new Error("Maestro Wallet is disabled outside WAX mainnet.");
  }
  if (!window.isSecureContext || !window.crypto?.subtle) {
    throw new Error(
      "Maestro Wallet requires HTTPS and browser Web Crypto support.",
    );
  }
}

async function verifyMainnetRpc() {
  const info = await postWaxMainnetRpc("/v1/chain/get_info");
  if (info.chain_id !== MAINNET_CHAIN_ID) {
    throw new Error("Refusing to use a non-mainnet RPC.");
  }
}

function inspectPrivateKey(privateKey) {
  const key = PrivateKey.from(String(privateKey || "").trim());
  return { privateKey: key, publicKey: key.toPublic() };
}

async function verifyAccountPermission(account, permission, publicKey) {
  const info = await postWaxMainnetRpc("/v1/chain/get_account", {
    account_name: account,
  });
  const entry = (info.permissions || []).find(
    (row) => row.perm_name === permission,
  );
  if (!entry)
    throw new Error(`Permission ${permission} was not found on ${account}.`);
  const authorized = (entry.required_auth?.keys || []).some((row) => {
    try {
      return PublicKey.from(row.key).equals(publicKey) && Number(row.weight) >= Number(entry.required_auth?.threshold || Infinity);
    } catch (error) {
      return false;
    }
  });
  if (!authorized) {
    throw new Error(
      `This key is not directly authorized on ${account}@${permission}.`,
    );
  }
}

export async function findMaestroWalletAuthorities(privateKey) {
  assertMainnetConfiguration();
  await verifyMainnetRpc();
  const inspected = inspectPrivateKey(privateKey);
  const publicKey = inspected.publicKey.toString();
  const result = await postWaxMainnetRpc(
    "/v1/chain/get_accounts_by_authorizers",
    {
      keys: [publicKey],
      accounts: [],
    },
  );
  const unique = new Map();
  (result.accounts || []).forEach((entry) => {
    const account = String(entry.account_name || "").trim();
    const permission = String(entry.permission_name || "").trim();
    const weight = Number(entry.weight || 0);
    const threshold = Number(entry.threshold || 0);
    if (!account || !permission || weight < threshold) return;
    unique.set(`${account}@${permission}`, { account, permission, publicKey });
  });
  return [...unique.values()].sort((left, right) => {
    const leftRank =
      left.permission === "active" ? 0 : left.permission === "owner" ? 2 : 1;
    const rightRank =
      right.permission === "active" ? 0 : right.permission === "owner" ? 2 : 1;
    return leftRank - rightRank || left.account.localeCompare(right.account);
  });
}

export function getMaestroWalletState() {
  let vault = null;
  let wallets = [];
  try {
    wallets = storedWallets();
    vault = storedWallet();
  } catch (error) {
    /* explicit operations surface corruption */
  }
  return {
    installed: Boolean(vault),
    unlocked: runtime.unlocked,
    account: runtime.account || vault?.account || "",
    permission: runtime.permission || vault?.permission || "active",
    publicKey: runtime.publicKey || vault?.publicKey || "",
    autoSign: Boolean(runtime.unlocked && runtime.autoSignScopes.length),
    autoSignScopes: runtime.unlocked ? [...runtime.autoSignScopes] : [],
    termsAccepted: hasCurrentMaestroWalletConsent(),
    termsVersion: MAESTRO_WALLET_TERMS_VERSION,
    activity: storedActivity()
      .filter(
        (entry) => entry.account === (runtime.account || vault?.account || ""),
      )
      .slice(0, 50),
    wallets: wallets.map((entry) => ({
      account: entry.account,
      permission: entry.permission,
      publicKey: entry.publicKey,
      active: vault ? walletId(entry) === walletId(vault) : false,
    })),
  };
}

export function subscribeMaestroWallet(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function requestMaestroWalletLogin() {
  if (runtime.unlocked && unlockedPrivateKey)
    return Promise.resolve(getMaestroWalletState());
  if (pendingLoginRequest) return pendingLoginRequest.promise;

  let resolveRequest;
  let rejectRequest;
  const promise = new Promise((resolve, reject) => {
    resolveRequest = resolve;
    rejectRequest = reject;
  });
  pendingLoginRequest = {
    promise,
    resolve: resolveRequest,
    reject: rejectRequest,
  };
  window.dispatchEvent(new CustomEvent(MAESTRO_WALLET_LOGIN_REQUEST_EVENT));
  return promise;
}

export function cancelMaestroWalletLogin() {
  if (!pendingLoginRequest) return;
  const { reject } = pendingLoginRequest;
  pendingLoginRequest = null;
  reject(new Error("Maestro Wallet login canceled."));
}

export function requestMaestroWalletSignature(summary) {
  if (pendingSignRequest)
    throw new Error("Another Maestro Wallet approval is already pending.");
  let resolveRequest;
  let rejectRequest;
  const promise = new Promise((resolve, reject) => {
    resolveRequest = resolve;
    rejectRequest = reject;
  });
  pendingSignRequest = { resolve: resolveRequest, reject: rejectRequest };
  window.dispatchEvent(
    new CustomEvent(MAESTRO_WALLET_SIGN_REQUEST_EVENT, { detail: summary }),
  );
  return promise;
}

export function approveMaestroWalletSignature() {
  if (!pendingSignRequest) return;
  const { resolve } = pendingSignRequest;
  pendingSignRequest = null;
  resolve();
}

export function rejectMaestroWalletSignature() {
  if (!pendingSignRequest) return;
  const { reject } = pendingSignRequest;
  pendingSignRequest = null;
  reject(new Error("Maestro Wallet signing rejected."));
}

export async function importMaestroWallet({
  account,
  permission = "active",
  privateKey,
  password,
  termsAccepted = false,
  ownerRiskAccepted = false,
}) {
  assertMainnetConfiguration();
  await verifyMainnetRpc();
  const preserveUnlockedWallet = Boolean(
    runtime.unlocked && unlockedPrivateKey,
  );
  const currentWalletId = preserveUnlockedWallet
    ? walletId(storedWallet())
    : "";
  const authorities = await findMaestroWalletAuthorities(privateKey);
  if (!authorities.length)
    throw new Error(
      "This key does not independently authorize a WAX mainnet permission.",
    );
  if (!account && authorities.length > 1) {
    const error = new Error(
      "This key controls multiple permissions. Select the account and permission to import.",
    );
    error.authorities = authorities;
    throw error;
  }
  const selected = account
    ? authorities.find(
        (entry) => entry.account === account && entry.permission === permission,
      )
    : authorities[0];
  if (!selected)
    throw new Error(
      "The selected account permission is not authorized by this key.",
    );
  const cleanAccount = selected.account;
  const cleanPermission = selected.permission;
  if (!/^[a-z1-5.]{1,12}$/.test(cleanAccount))
    throw new Error("Enter a valid WAX account.");
  assertSafeWalletPermission(cleanPermission);
  if (cleanPermission === "owner" && !ownerRiskAccepted) {
    const error = new Error(
      "Explicitly acknowledge the owner-key warning before importing this recovery authority.",
    );
    error.authorities = [selected];
    throw error;
  }
  if (String(password || "").length < 12)
    throw new Error("Use a wallet password of at least 12 characters.");
  if (String(password || "").length > 1024)
    throw new Error("Wallet password is too long.");
  if (!termsAccepted)
    throw new Error(
      "Accept the Maestro Wallet Terms and Risk Disclosure to continue.",
    );

  const inspected = inspectPrivateKey(privateKey);
  await verifyAccountPermission(
    cleanAccount,
    cleanPermission,
    inspected.publicKey,
  );
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const metadata = {
    account: cleanAccount,
    permission: cleanPermission,
    publicKey: inspected.publicKey.toString(),
  };
  const encryptionKey = await deriveEncryptionKey(password, salt, ["encrypt"]);
  const ciphertext = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: associatedData(metadata),
      tagLength: 128,
    },
    encryptionKey,
    encoder.encode(String(privateKey || "").trim()),
  );
  const encryptedVault = {
    version: VERSION,
    chainId: MAINNET_CHAIN_ID,
    account: cleanAccount,
    permission: cleanPermission,
    publicKey: metadata.publicKey,
    kdf: {
      name: "PBKDF2",
      hash: "SHA-256",
      iterations: PBKDF2_ITERATIONS,
      salt: bytesToBase64(salt),
    },
    cipher: {
      name: "AES-GCM",
      tagLength: 128,
      iv: bytesToBase64(iv),
      ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    },
  };
  const wallets = storedWallets().filter(
    (entry) => walletId(entry) !== walletId(encryptedVault),
  );
  wallets.push(encryptedVault);
  saveWallets(wallets);
  window.localStorage.setItem(
    ACTIVE_WALLET_KEY,
    preserveUnlockedWallet && currentWalletId
      ? currentWalletId
      : walletId(encryptedVault),
  );
  recordMaestroWalletConsent(cleanAccount, cleanPermission);
  if (!preserveUnlockedWallet) lockMaestroWallet();
  emit();
  return getMaestroWalletState();
}

export async function unlockMaestroWallet(password) {
  assertMainnetConfiguration();
  await verifyMainnetRpc();
  const vault = storedWallet();
  if (!vault) throw new Error("No Maestro Wallet is imported.");
  assertSafeWalletPermission(vault.permission);
  if (String(password || "").length > 1024)
    throw new Error("Wallet password is too long.");
  if (!hasCurrentMaestroWalletConsent()) {
    throw new Error(
      "Accept the current Maestro Wallet Terms and Risk Disclosure to unlock.",
    );
  }
  try {
    const encryptionKey = await deriveEncryptionKey(
      password,
      base64ToBytes(vault.kdf.salt),
      ["decrypt"],
    );
    const plaintext = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: base64ToBytes(vault.cipher.iv),
        additionalData: associatedData(vault),
        tagLength: 128,
      },
      encryptionKey,
      base64ToBytes(vault.cipher.ciphertext),
    );
    const plaintextBytes = new Uint8Array(plaintext);
    let inspected;
    try {
      inspected = inspectPrivateKey(decoder.decode(plaintextBytes));
    } finally {
      plaintextBytes.fill(0);
    }
    if (!inspected.publicKey.equals(PublicKey.from(vault.publicKey))) {
      throw new Error("Stored public key mismatch.");
    }
    await verifyAccountPermission(
      vault.account,
      vault.permission,
      inspected.publicKey,
    );
    unlockedPrivateKey = inspected.privateKey;
    runtime = {
      unlocked: true,
      account: vault.account,
      permission: vault.permission,
      publicKey: vault.publicKey,
      autoSignScopes:
        vault.permission !== "owner" &&
        storedAutoSignPreferences()[walletId(vault)]?.gameplay
          ? ["rhythmfarmer.gameplay"]
          : [],
    };
    emit();
    resolvePendingLogin();
    return getMaestroWalletState();
  } catch (error) {
    unlockedPrivateKey = null;
    runtime = {
      unlocked: false,
      account: "",
      permission: "",
      publicKey: "",
      autoSignScopes: [],
    };
    throw new Error(
      "Unable to unlock wallet. Check the password and vault integrity.",
    );
  }
}

export function lockMaestroWallet() {
  rejectMaestroWalletSignature();
  unlockedPrivateKey = null;
  runtime = {
    unlocked: false,
    account: "",
    permission: "",
    publicKey: "",
    autoSignScopes: [],
  };
  emit();
}

export function setMaestroWalletAutoSign(
  enabled,
  scope = "rhythmfarmer.gameplay",
) {
  requireUnlockedMaestroWallet();
  if (enabled && runtime.permission === "owner")
    throw new Error(
      "Auto-sign is disabled for owner-key sessions. Review every transaction manually.",
    );
  const scopes = new Set(runtime.autoSignScopes);
  if (enabled) scopes.add(scope);
  else if (scope === "all") scopes.clear();
  else scopes.delete(scope);
  if (scope === "rhythmfarmer.gameplay") {
    rememberGameplayAutoSign(runtime.account, runtime.permission, enabled);
  } else if (scope === "all" && !enabled) {
    rememberGameplayAutoSign(runtime.account, runtime.permission, false);
  }
  runtime = { ...runtime, autoSignScopes: [...scopes] };
  emit();
  return getMaestroWalletState();
}

export function selectMaestroWallet(account, permission) {
  const id = `${account}@${permission}`;
  const wallet = storedWallets().find((entry) => walletId(entry) === id);
  if (!wallet)
    throw new Error("The selected Maestro Wallet account was not found.");
  lockMaestroWallet();
  window.localStorage.setItem(ACTIVE_WALLET_KEY, id);
  emit();
  return getMaestroWalletState();
}

export function removeMaestroWallet() {
  const current = storedWallet();
  const remaining = current
    ? storedWallets().filter((entry) => walletId(entry) !== walletId(current))
    : [];
  lockMaestroWallet();
  if (current)
    rememberGameplayAutoSign(current.account, current.permission, false);
  if (remaining.length) {
    saveWallets(remaining);
    window.localStorage.setItem(ACTIVE_WALLET_KEY, walletId(remaining[0]));
  } else {
    window.localStorage.removeItem(WALLETS_STORAGE_KEY);
    window.localStorage.removeItem(ACTIVE_WALLET_KEY);
    window.localStorage.removeItem(CONSENT_STORAGE_KEY);
  }
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  emit();
}

export function requireUnlockedMaestroWallet() {
  if (!runtime.unlocked || !unlockedPrivateKey) {
    throw new Error("Unlock the Maestro Wallet first.");
  }
  return { ...runtime };
}

export function signMaestroTransaction(transaction, chainId) {
  requireUnlockedMaestroWallet();
  if (String(chainId) !== MAINNET_CHAIN_ID)
    throw new Error("Refusing to sign outside WAX mainnet.");
  return unlockedPrivateKey.signDigest(
    getMaestroTransactionDigest(transaction),
  );
}

export function getMaestroTransactionDigest(transaction) {
  return Transaction.from(transaction).signingDigest(MAINNET_CHAIN_ID);
}
