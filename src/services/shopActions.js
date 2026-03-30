// src/services/shopActions.js
import { InitTransaction } from '../hooks/useSession';

const FARM_CONTRACT =
  process.env.REACT_APP_RHYTHMFARMER_ACCOUNT || 'rhythmfarmer';

/**
 * Format token quantity using API-provided symbol + precision.
 * Example:
 *   formatTokenQuantity(1800000, 'TOMATOE', 8)
 *   -> "1800000.00000000 TOMATOE"
 */
const formatTokenQuantity = (amount, symbol, precision) => {
  const numeric = Number(amount);
  const safePrecision = Number(precision);

  if (!Number.isFinite(numeric)) {
    throw new Error('Invalid token amount');
  }

  if (!symbol) {
    throw new Error('Missing token symbol');
  }

  if (!Number.isFinite(safePrecision) || safePrecision < 0) {
    throw new Error('Invalid token precision');
  }

  return `${numeric.toFixed(safePrecision)} ${symbol}`;
};

/**
 * Purchase a shop pack by sending token transfer with memo.
 *
 * Memo format expected by contract:
 *   "BUY:<sale_id>:<qty>"
 *
 * Expects full sale item data from the API.
 */
export const buyPack = async ({
  accountName,
  saleId,
  qty = 1,
  item,
}) => {
  if (!accountName) throw new Error('Missing accountName');
  if (!saleId && saleId !== 0) throw new Error('Missing saleId');
  if (!qty || Number(qty) <= 0) throw new Error('Invalid qty');
  if (!item) throw new Error('Missing item');

  const safeQty = Number(qty);
  const unitPrice = Number(item.price);
  const tokenContract = item.token_contract;
  const tokenSymbol = item.token;
  const tokenPrecision = Number(item.decimals);

  if (!Number.isFinite(safeQty) || safeQty <= 0) {
    throw new Error('Invalid qty');
  }

  if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
    throw new Error('Invalid item price');
  }

  if (!tokenContract) {
    throw new Error('Missing token contract');
  }

  if (!tokenSymbol) {
    throw new Error('Missing token symbol');
  }

  if (!Number.isFinite(tokenPrecision) || tokenPrecision < 0) {
    throw new Error('Invalid token precision');
  }

  const totalAmount = unitPrice * safeQty;
  const quantity = formatTokenQuantity(totalAmount, tokenSymbol, tokenPrecision);
  const memo = `BUY:${saleId}:${safeQty}`;

  const dataTrx = {
    actions: [
      {
        account: tokenContract,
        name: 'transfer',
        authorization: [{ actor: accountName, permission: 'active' }],
        data: {
          from: accountName,
          to: FARM_CONTRACT,
          quantity,
          memo,
        },
      },
    ],
  };

  const result = await InitTransaction(dataTrx);

  if (!result?.transactionId) {
    throw new Error('Pack purchase transaction failed.');
  }

  return result.transactionId;
};