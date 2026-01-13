import { InitTransaction } from '../hooks/useSession';

const CONTRACT =
  process.env.REACT_APP_RHYTHMFARMER_ACCOUNT || 'rhythmfarmer';

/**
 * Unstake Tool
 * Removes tool from contract and sends NFT back to wallet
 */
export async function unstakeTool(wallet, assetId) {
  if (!wallet) throw new Error('Missing wallet');
  if (!assetId) throw new Error('Missing assetId');

  const tx = {
    actions: [
      {
        account: CONTRACT,
        name: 'removetool', // contract action
        authorization: [
          {
            actor: wallet,
            permission: 'active',
          },
        ],
        data: {
          owner: wallet,
          asset_id: String(assetId),
        },
      },
    ],
  };

  console.log('[DEBUG] unstakeTool tx:', tx);
  return InitTransaction(tx);
}
