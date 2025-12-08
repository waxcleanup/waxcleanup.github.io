// src/services/userEnergyActions.js

import { InitTransaction } from '../hooks/useSession';
import sessionKit from '../config/sessionConfig';

// Defaults, can be overridden by .env if you want
const TOKEN_CONTRACT =
  process.env.REACT_APP_CINDER_CONTRACT || 'cleanuptoken';
const FARM_CONTRACT =
  process.env.REACT_APP_RHYTHMFARMER_ACCOUNT || 'rhythmfarmer';

const SYMBOL = 'CINDER';
const PRECISION = 6;

/**
 * Recharge the *user energy* pool.
 *
 * Sends a CINDER transfer from the logged-in wallet to the rhythmfarmer
 * contract with memo "Recharge User". The listener will pick this up and
 * call `chguser(user, qty)` on-chain.
 *
 * @param {number|string} amount  CINDER amount (e.g. 1, "1", "0.5")
 */
export async function rechargeUserEnergy(amount) {
  const numeric = Number(amount);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new Error('Recharge amount must be greater than zero');
  }

  // Restore the current wallet session so we know who is sending the tokens
  const session = await sessionKit.restore();
  if (!session || !session.permissionLevel) {
    throw new Error('No active session found. Please log in again.');
  }

  const { actor } = session.permissionLevel; // e.g. "maestrobeatz"
  const quantity = `${numeric.toFixed(PRECISION)} ${SYMBOL}`;

  // Let InitTransaction handle TAPOS + auth + error handling
  return InitTransaction({
    actions: [
      {
        account: TOKEN_CONTRACT,   // cleanuptoken
        name: 'transfer',
        data: {
          from: actor,            // 👈 FIXED: no longer ""
          to: FARM_CONTRACT,      // rhythmfarmer
          quantity,               // "1.000000 CINDER"
          memo: 'Recharge User'   // listener routes this to chguser
        }
      }
    ]
  });
}
