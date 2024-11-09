// services/eosActions.js
import { InitTransaction } from '../hooks/useSession';

// Submits a proposal to the blockchain
export const submitProposal = async ({ session, proposer, collection, schema, template_id, trash_fee, cinder_reward }) => {
  if (!session) throw new Error("No active session found. Please log in.");

  const actions = [
    {
      account: 'cleanuptoken',
      name: 'transfer',
      authorization: [{ actor: proposer, permission: 'active' }],
      data: {
        from: proposer,
        to: 'cleanupcentr',
        quantity: trash_fee,
        memo: 'Proposal initiation fee'
      }
    },
    {
      account: 'cleanupcentr',
      name: 'createprop',
      authorization: [{ actor: proposer, permission: 'active' }],
      data: {
        proposer,
        proposal_type: 'NFT Burn',
        collection,
        schema,
        template_id,
        trash_fee,
        cinder_reward,
      },
    },
  ];

  try {
    // Initialize transaction
    return await InitTransaction({ session, actions });
  } catch (error) {
    console.error('Error during proposal submission:', error);
    throw error;
  }
};

// Votes on a proposal
export const voteOnProposal = async ({ session, voter, propId, voteFor }) => {
  if (!session) throw new Error("No active session found. Please log in.");

  const actions = [
    {
      account: 'cleanupcentr',
      name: 'voteprop',
      authorization: [{ actor: voter, permission: 'active' }],
      data: {
        voter,
        prop_id: propId,
        vote_for: voteFor,
      },
    },
  ];

  try {
    // Initialize transaction
    return await InitTransaction({ session, actions });
  } catch (error) {
    console.error('Error during proposal voting:', error);
    throw error;
  }
};
