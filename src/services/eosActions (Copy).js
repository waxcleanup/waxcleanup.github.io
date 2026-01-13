// services/eosActions.js
import { InitTransaction } from '../hooks/useSession';

// Submits a proposal to the blockchain
export const submitProposal = async ({ session, proposer, collection, schema, template_id, trash_fee, cinder_reward }) => {
  if (!session) throw new Error("No active session found. Please log in.");

  const actor = proposer ? proposer : session?.permissionLevel?.actor; // Extract the actor from session
  const permission = session?.permissionLevel?.permission; // Extract the permission from session
  if (!actor || !permission) throw new Error("Invalid session authorization. Please log in again.");

  // Log values to debug incorrect entries
  console.log("Submitting Proposal with Values:", {
    proposer,
    collection,
    schema,
    template_id,
    trash_fee,
    cinder_reward,
  });

  // Format the memo correctly based on the backend listener requirements
  const memo = `proposal:NFT Burn:${collection}:${schema}:${template_id}:${parseFloat(trash_fee).toFixed(3)}:${parseFloat(cinder_reward).toFixed(6)}`;

  console.log("Generated Memo:", memo); // Log the generated memo for debugging

  const actions = [
    {
      account: 'cleanuptoken',
      name: 'transfer',
      authorization: [{ actor: proposer, permission: 'active' }],
      data: {
        from: proposer,
        to: 'cleanupcentr',
        quantity: '1000.000 TRASH', // Use fixed proposal fee of 1000 TRASH for the transfer
        memo,
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

export default { submitProposal, voteOnProposal };
