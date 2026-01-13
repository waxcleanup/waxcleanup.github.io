// src/services/eosActions.js
import { InitTransaction } from '../hooks/useSession';

const TOKEN_CONTRACT = process.env.REACT_APP_TOKEN_CONTRACT || 'cleanuptoken';
const DAO_CONTRACT = process.env.REACT_APP_CONTRACT_NAME || 'cleanupcentr';

// -------------------- helpers --------------------

function mustNonEmpty(v, label) {
  if (v === undefined || v === null || String(v).trim() === '') {
    throw new Error(`Missing ${label}`);
  }
}

// strict numeric check (no symbols)
function parseNumberStrict(v, label) {
  const s = String(v).trim();
  // allow "123", "123.4", "0.001"
  if (!/^\d+(\.\d+)?$/.test(s)) {
    throw new Error(`Invalid ${label}. Must be a number.`);
  }
  // This Number() is ONLY for validation / toFixed rendering in toAsset
  const n = Number(s);
  if (!Number.isFinite(n)) throw new Error(`Invalid ${label}. Must be a number.`);
  return n;
}

function mustFinitePositive(n, label) {
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Invalid ${label}. Must be > 0.`);
  }
}

/**
 * Format a number/string into an on-chain asset string.
 * Example: toAsset("10000.2", 'TRASH', 3) => "10000.200 TRASH"
 */
function toAsset(amount, symbol, precision) {
  const n = parseNumberStrict(amount, `${symbol} amount`);
  mustFinitePositive(n, `${symbol} amount`);
  return `${n.toFixed(precision)} ${symbol}`;
}

/**
 * Add 1 to a non-negative integer string (base10).
 * Example: "999" -> "1000"
 */
function addOneToIntString(intStr) {
  let s = String(intStr).replace(/^0+/, '') || '0';
  let carry = 1;
  let out = '';
  for (let i = s.length - 1; i >= 0; i--) {
    const d = s.charCodeAt(i) - 48;
    const sum = d + carry;
    if (sum >= 10) {
      out = String(sum - 10) + out;
      carry = 1;
    } else {
      out = String(sum) + out;
      carry = 0;
    }
  }
  if (carry) out = '1' + out;
  return out;
}

/**
 * Convert a decimal string/number into a raw integer string using string math.
 * - avoids float rounding issues
 * - supports up to `precision` decimals (extra decimals are rounded half-up)
 *
 * Examples:
 *  toRawIntStr("10000", 3) => "10000000"
 *  toRawIntStr("0.4", 6)   => "400000"
 *  toRawIntStr("1.23456", 3) => "1235" (round)
 */
function toRawIntStr(amount, precision, label = 'amount') {
  const s0 = String(amount).trim();
  if (!/^\d+(\.\d+)?$/.test(s0)) {
    throw new Error(`Invalid ${label}. Must be a number.`);
  }

  const [intPartRaw, decPartRaw = ''] = s0.split('.');
  const intPart = intPartRaw.replace(/^0+/, '') || '0';
  const decDigits = decPartRaw.replace(/[^\d]/g, '');

  // pad to precision+1 for rounding digit
  const padded = (decDigits + '0'.repeat(precision + 1)).slice(0, precision + 1);
  const mainDec = padded.slice(0, precision);
  const roundDigit = padded.slice(precision, precision + 1);

  // base = intPart + mainDec, but keep as string integer
  let base = `${intPart}${mainDec}`.replace(/^0+/, '') || '0';

  // round half-up
  if (roundDigit && Number(roundDigit) >= 5) {
    base = addOneToIntString(base);
  }

  // must be > 0 for fees/rewards
  if (base === '0') {
    throw new Error(`Invalid ${label}. Must be > 0.`);
  }

  return base;
}

// -------------------- memos --------------------

// proposeburn:<proposer>:<collection>:<template_id>:<trash_raw>:<cinder_raw>:<cap>
function buildProposeBurnMemo({
  proposer,
  collection,
  template_id,
  trash_fee,
  cinder_reward,
  cap,
}) {
  mustNonEmpty(proposer, 'proposer');
  mustNonEmpty(collection, 'collection');

  const tpl = Number(template_id);
  if (!Number.isFinite(tpl) || tpl <= 0) throw new Error('Invalid template_id');

  // cap must be integer > 0
  const capN = parseNumberStrict(cap, 'cap');
  mustFinitePositive(capN, 'cap');
  const capInt = String(Math.trunc(capN));

  const trash_raw = toRawIntStr(trash_fee, 3, 'trash_fee'); // TRASH 3
  const cinder_raw = toRawIntStr(cinder_reward, 6, 'cinder_reward'); // CINDER 6

  return `proposeburn:${proposer}:${collection}:${tpl}:${trash_raw}:${cinder_raw}:${capInt}`;
}

// proposeschemaburn:<proposer>:<collection>:<schema>:<tpl>:<trash_raw>:<cinder_raw>:<cap>
function buildProposeSchemaBurnMemo({
  proposer,
  collection,
  schema,
  template_id,
  trash_fee,
  cinder_reward,
  cap,
}) {
  mustNonEmpty(proposer, 'proposer');
  mustNonEmpty(collection, 'collection');
  mustNonEmpty(schema, 'schema');

  const tpl = Number(template_id ?? 0);
  if (!Number.isFinite(tpl) || tpl < 0) throw new Error('Invalid template_id');

  // cap must be integer > 0
  const capN = parseNumberStrict(cap, 'cap');
  mustFinitePositive(capN, 'cap');
  const capInt = String(Math.trunc(capN));

  const trash_raw = toRawIntStr(trash_fee, 3, 'trash_fee'); // TRASH 3
  const cinder_raw = toRawIntStr(cinder_reward, 6, 'cinder_reward'); // CINDER 6

  return `proposeschemaburn:${proposer}:${collection}:${schema}:${tpl}:${trash_raw}:${cinder_raw}:${capInt}`;
}

function buildStakeVoteMemo(propId, voteFor) {
  const pid = Number(propId);
  if (!Number.isFinite(pid) || pid <= 0) throw new Error('Invalid propId');
  return `stakevote:${pid}:${voteFor ? 'true' : 'false'}`;
}

function buildUnstakeVoteMemo(propId) {
  const pid = Number(propId);
  if (!Number.isFinite(pid) || pid <= 0) throw new Error('Invalid propId');
  return `unstakevote:${pid}`;
}

// -------------------- actions --------------------

/**
 * Submit a proposal
 * Token transfer -> cleanupcentr with proposeschemaburn memo
 *
 * Inputs should be numeric strings (NO symbol).
 */
export const submitProposal = async ({
  proposer,
  proposalFee, // TRASH numeric (NO symbol)
  collection,
  schema,
  template_id = 0,
  trash_fee, // TRASH numeric (NO symbol)
  cinder_reward, // CINDER numeric (NO symbol)
  cap, // required numeric
  type = 'schemaburn',
} = {}) => {
  mustNonEmpty(proposer, 'proposer');
  mustNonEmpty(collection, 'collection');

  // schema is only required for schemaburn
  if (type === 'schemaburn') {
    mustNonEmpty(schema, 'schema');
  }

  // default fee = 100000 TRASH (3 decimals)
  const feeQty = toAsset(proposalFee ?? '100000', 'TRASH', 3);

  let memo = '';
  if (type === 'schemaburn') {
    memo = buildProposeSchemaBurnMemo({
      proposer,
      collection,
      schema,
      template_id: 0, // schema burn requires 0
      trash_fee,
      cinder_reward,
      cap,
    });
  } else if (type === 'nftburn') {
    memo = buildProposeBurnMemo({
      proposer,
      collection,
      template_id,
      trash_fee,
      cinder_reward,
      cap,
    });
  } else {
    throw new Error(`Unknown proposal type: ${type}`);
  }

  return InitTransaction({
    actions: [
      {
        account: TOKEN_CONTRACT,
        name: 'transfer',
        data: {
          from: proposer,
          to: DAO_CONTRACT,
          quantity: feeQty,
          memo,
        },
      },
    ],
  });
};

/**
 * Vote on a proposal
 * cleanuptoken::transfer(from=voter, to=cleanupcentr, quantity="X.XXX TRASH", memo="stakevote:<id>:<true|false>")
 */
export const voteOnProposal = async ({ voter, propId, voteFor, amountTrash } = {}) => {
  mustNonEmpty(voter, 'voter');
  mustNonEmpty(propId, 'propId');
  mustNonEmpty(amountTrash, 'vote amount (TRASH)');

  const quantity = toAsset(amountTrash, 'TRASH', 3);
  const memo = buildStakeVoteMemo(propId, !!voteFor);

  return InitTransaction({
    actions: [
      {
        account: TOKEN_CONTRACT,
        name: 'transfer',
        data: {
          from: voter,
          to: DAO_CONTRACT,
          quantity,
          memo,
        },
      },
    ],
  });
};

export const unstakeVote = async ({ voter, propId } = {}) => {
  if (!voter) throw new Error('Missing voter');
  if (!propId) throw new Error('Missing propId');

  return InitTransaction({
    actions: [
      {
        account: DAO_CONTRACT,          // cleanupcentr
        name: 'unstakevote',
        authorization: [{ actor: voter, permission: 'active' }],
        data: {
          voter,
          prop_id: Number(propId),
        },
      },
    ],
  });
};

