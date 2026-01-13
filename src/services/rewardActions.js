// src/services/rewardActions.js
import { InitTransaction } from '../hooks/useSession';

// RhythmFarmer contract account
const RHYTHM_FARMER_ACCOUNT =
  process.env.REACT_APP_RHYTHMFARMER_ACCOUNT || 'rhythmfarmer';

/**
 * Claims all pending seed/farm rewards for a user.
 *
 * Wraps the on-chain action:
 *   [[eosio::action]]
 *   inline void claimseedrwd(name owner)
 */
export async function claimSeedRewards(owner) {
  if (!owner) {
    throw new Error('Missing owner for claimSeedRewards');
  }

  const actions = [
    {
      account: RHYTHM_FARMER_ACCOUNT,
      name: 'claimseedrwd',
      data: { owner },
    },
  ];

  return InitTransaction({ actions });
}
