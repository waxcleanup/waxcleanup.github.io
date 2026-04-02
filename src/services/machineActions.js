// src/services/machineActions.js
import axios from 'axios';
import { InitTransaction } from '../hooks/useSession';

const RHYTHM_CONTRACT =
  process.env.REACT_APP_RHYTHMFARMER_ACCOUNT || 'rhythmfarmer';
const ATOMIC_CONTRACT =
  process.env.REACT_APP_ATOMICASSETS_ACCOUNT || 'atomicassets';

const TOMATOE_TOKEN_CONTRACT =
  process.env.REACT_APP_TOMATOE_TOKEN_CONTRACT || 'maestrobeatz';
const BANANAZ_TOKEN_CONTRACT =
  process.env.REACT_APP_BANANAZ_TOKEN_CONTRACT || 'maestrobeatz';

const API_URL =
  process.env.REACT_APP_BACKEND_API_BASE_URL ||
  process.env.REACT_APP_API_BASE_URL ||
  'http://localhost:3003';

export const REACTOR_TEMPLATE_ID = Number(
  process.env.REACT_APP_REACTOR_TEMPLATE_ID || 900920
);

export const REACTOR_RECIPE_ID = Number(
  process.env.REACT_APP_REACTOR_RECIPE_ID || 1
);

function toPlain(value) {
  if (value == null) return null;
  if (typeof value === 'string' || typeof value === 'number') return value;

  if (typeof value === 'object') {
    if (typeof value.toString === 'function') {
      const str = value.toString();
      if (str && str !== '[object Object]') return str;
    }

    if ('name' in value) return toPlain(value.name);
    if ('accountName' in value) return toPlain(value.accountName);
    if ('actorName' in value) return toPlain(value.actorName);
    if ('actor' in value) return toPlain(value.actor);
    if ('value' in value) return value.value;
  }

  return String(value);
}

function isLikelyWaxAccountName(value) {
  if (!value) return false;
  const str = String(value).trim();
  return /^[a-z1-5.]{1,12}$/.test(str);
}

function normalizeNumericId(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function extractWalletActor(session) {
  const candidates = [
    session?.auth?.actorName,
    session?.auth?.accountName,
    session?.auth?.account?.accountName,
    session?.auth?.accountName?.toString?.(),
    session?.auth?.actor?.toString?.(),

    session?.session?.auth?.actorName,
    session?.session?.auth?.accountName,
    session?.session?.auth?.account?.accountName,

    session?.permissionLevel?.actor,
    session?.actor,
    session?.user?.accountName,
    session?.accountName,
    session?.walletAccount,
  ];

  for (const candidate of candidates) {
    const plain = toPlain(candidate);
    if (plain && isLikelyWaxAccountName(plain)) {
      return String(plain);
    }
  }

  return null;
}

export function getWalletActor(session) {
  return extractWalletActor(session);
}

function parseAsset(assetString = '') {
  const [amount = '0', symbol = ''] = String(assetString).trim().split(' ');
  const decimals = amount.includes('.') ? amount.split('.')[1].length : 0;

  return {
    amount: Number(amount || 0),
    symbol,
    decimals,
    raw: assetString,
  };
}

function formatAssetAmount(amount, decimals, symbol) {
  return `${Number(amount || 0).toFixed(decimals)} ${symbol}`;
}

function getTokenContractForSymbol(symbol) {
  const upperSymbol = String(symbol || '').toUpperCase();

  if (upperSymbol === 'BANANAZ') {
    return BANANAZ_TOKEN_CONTRACT;
  }

  return TOMATOE_TOKEN_CONTRACT;
}

function getMachineBalanceAmount(machineBalances = [], machineId, tokenId) {
  const normalizedMachineId = normalizeNumericId(machineId);
  const normalizedTokenId = normalizeNumericId(tokenId);

  const row = machineBalances.find(
    (entry) =>
      normalizeNumericId(entry?.machine_id) === normalizedMachineId &&
      normalizeNumericId(entry?.token_id) === normalizedTokenId
  );

  if (!row) return 0;

  const possibleValue =
    row.balance ?? row.quantity ?? row.amount ?? row.token_balance ?? 0;

  if (typeof possibleValue === 'string' && possibleValue.includes(' ')) {
    return parseAsset(possibleValue).amount;
  }

  return Number(possibleValue || 0);
}

function buildDepositActions(
  wallet,
  machineId,
  recipeId,
  inputs = [],
  machineBalances = [],
  batchSize = 1
) {
  const normalizedMachineId = normalizeNumericId(machineId);
  const normalizedRecipeId = normalizeNumericId(recipeId);
  const normalizedBatchSize = normalizeNumericId(batchSize);

  if (!wallet) throw new Error('Wallet is required.');
  if (normalizedMachineId === null) throw new Error('machineId is required.');
  if (normalizedRecipeId === null) throw new Error('recipeId is required.');
  if (normalizedBatchSize === null) throw new Error('batchSize is required.');

  const actions = [];

  for (const input of inputs) {
    if (Number(input?.input_type) !== 1) continue;
    if (!input?.token_qty) continue;

    const parsedRequired = parseAsset(input.token_qty);
    const currentDeposited = getMachineBalanceAmount(
      machineBalances,
      normalizedMachineId,
      input.token_id
    );

    const totalRequired = parsedRequired.amount * normalizedBatchSize;
    const deficit = Math.max(totalRequired - currentDeposited, 0);

    if (deficit <= 0) continue;

    const quantityToDeposit = formatAssetAmount(
      deficit,
      parsedRequired.decimals,
      parsedRequired.symbol
    );

    const tokenContract = getTokenContractForSymbol(parsedRequired.symbol);

    actions.push({
      account: tokenContract,
      name: 'transfer',
      authorization: [{ actor: wallet, permission: 'active' }],
      data: {
        from: wallet,
        to: RHYTHM_CONTRACT,
        quantity: quantityToDeposit,
        memo: `recipe:machine:${normalizedMachineId}:${normalizedRecipeId}`,
      },
    });
  }

  return actions;
}

export async function fetchMachineDashboard(wallet) {
  if (!wallet) {
    return {
      reactorsOwned: [],
      machines: [],
      recipes: [],
      machineTemplates: [],
      machineInputs: [],
      machineLoot: [],
      machinePending: [],
      machineBalances: [],
      userBalances: {
        tomatoe: 0,
        bananaz: 0,
        energy: 0,
        energyMax: 0,
      },
    };
  }

  const { data } = await axios.get(`${API_URL}/machines/${wallet}`);

  return {
    reactorsOwned: data?.reactorsOwned || [],
    machines: data?.machines || [],
    recipes: data?.recipes || [],
    machineTemplates: data?.machineTemplates || [],
    machineInputs: data?.machineInputs || [],
    machineLoot: data?.machineLoot || [],
    machinePending: data?.raw?.machinePending || [],
    machineBalances: data?.raw?.machineBalances || [],
    userBalances: {
      tomatoe: Number(String(data?.balances?.tomatoe || '0').split(' ')[0] || 0),
      bananaz: Number(String(data?.balances?.bananaz || '0').split(' ')[0] || 0),
      energy: Number(data?.balances?.energy || 0),
      energyMax: Number(data?.balances?.energyMax || 0),
    },
  };
}

export async function stakeMachine(wallet, assetId) {
  if (!wallet) throw new Error('Wallet is required.');
  if (!assetId) throw new Error('assetId is required.');

  const dataTrx = {
    actions: [
      {
        account: ATOMIC_CONTRACT,
        name: 'transfer',
        authorization: [{ actor: wallet, permission: 'active' }],
        data: {
          from: wallet,
          to: RHYTHM_CONTRACT,
          asset_ids: [String(assetId)],
          memo: 'stake:machine',
        },
      },
    ],
  };

  return InitTransaction(dataTrx);
}

export async function depositMachineToken(
  wallet,
  machineId,
  recipeId,
  quantity,
  tokenSymbol
) {
  const normalizedMachineId = normalizeNumericId(machineId);
  const normalizedRecipeId = normalizeNumericId(recipeId);

  if (!wallet) throw new Error('Wallet is required.');
  if (normalizedMachineId === null) throw new Error('machineId is required.');
  if (normalizedRecipeId === null) throw new Error('recipeId is required.');
  if (!quantity) throw new Error('quantity is required.');
  if (!tokenSymbol) throw new Error('tokenSymbol is required.');

  const tokenContract = getTokenContractForSymbol(tokenSymbol);

  const dataTrx = {
    actions: [
      {
        account: tokenContract,
        name: 'transfer',
        authorization: [{ actor: wallet, permission: 'active' }],
        data: {
          from: wallet,
          to: RHYTHM_CONTRACT,
          quantity,
          memo: `recipe:machine:${normalizedMachineId}:${normalizedRecipeId}`,
        },
      },
    ],
  };

  return InitTransaction(dataTrx);
}

export async function depositRecipeOnly(
  wallet,
  machineId,
  recipeId,
  inputs = [],
  machineBalances = [],
  batchSize = 1
) {
  const actions = buildDepositActions(
    wallet,
    machineId,
    recipeId,
    inputs,
    machineBalances,
    batchSize
  );

  if (actions.length === 0) {
    throw new Error('No deposits required for this recipe.');
  }

  return InitTransaction({ actions });
}

export async function depositFullRecipe(
  wallet,
  machineId,
  recipeId,
  inputs = [],
  machineBalances = [],
  batchSize = 1
) {
  const actions = buildDepositActions(
    wallet,
    machineId,
    recipeId,
    inputs,
    machineBalances,
    batchSize
  );

  if (actions.length === 0) {
    throw new Error('No deposits required for this recipe.');
  }

  return InitTransaction({ actions });
}

export async function startMachine(wallet, machineId, recipeId, batchSize = 1) {
  const normalizedMachineId = normalizeNumericId(machineId);
  const normalizedRecipeId = normalizeNumericId(recipeId);
  const normalizedBatchSize = normalizeNumericId(batchSize);

  if (!wallet) throw new Error('Wallet is required.');
  if (normalizedMachineId === null) throw new Error('machineId is required.');
  if (normalizedRecipeId === null) throw new Error('recipeId is required.');
  if (normalizedBatchSize === null) throw new Error('batchSize is required.');

  const dataTrx = {
    actions: [
      {
        account: RHYTHM_CONTRACT,
        name: 'startmach',
        authorization: [{ actor: wallet, permission: 'active' }],
        data: {
          user: wallet,
          machine_id: normalizedMachineId,
          recipe_id: normalizedRecipeId,
          batch_size: normalizedBatchSize,
        },
      },
    ],
  };

  return InitTransaction(dataTrx);
}

export async function claimMachine(wallet, machineId) {
  const normalizedMachineId = normalizeNumericId(machineId);

  if (!wallet) throw new Error('Wallet is required.');
  if (normalizedMachineId === null) throw new Error('machineId is required.');

  const dataTrx = {
    actions: [
      {
        account: RHYTHM_CONTRACT,
        name: 'claimmach',
        authorization: [{ actor: wallet, permission: 'active' }],
        data: {
          user: wallet,
          machine_id: normalizedMachineId,
        },
      },
    ],
  };

  return InitTransaction(dataTrx);
}

export async function unstakeMachine(wallet, machineId, memo = 'unstake:machine') {
  const normalizedMachineId = normalizeNumericId(machineId);

  if (!wallet) throw new Error('Wallet is required.');
  if (normalizedMachineId === null) throw new Error('machineId is required.');

  const dataTrx = {
    actions: [
      {
        account: RHYTHM_CONTRACT,
        name: 'unstakemach',
        authorization: [{ actor: wallet, permission: 'active' }],
        data: {
          user: wallet,
          machine_id: normalizedMachineId,
          memo,
        },
      },
    ],
  };

  return InitTransaction(dataTrx);
}