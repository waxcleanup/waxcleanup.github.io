import axios from 'axios';

export const fetchBurnableNFTs = async (accountName) => {
  try {
    console.log('Fetching approved NFTs and proposals from the cleanupcentr smart contract...');

    // Fetch approved NFTs
    const approvedResponse = await axios.post('https://wax.pink.gg/v1/chain/get_table_rows', {
      json: true,
      code: 'cleanupcentr',
      scope: 'cleanupcentr',
      table: 'approvednfts',
      limit: 100,
    });
    const approvedNFTs = approvedResponse.data.rows;
    console.log('Approved NFTs:', approvedNFTs);

    // Fetch proposals
    const proposalsResponse = await axios.post('https://wax.pink.gg/v1/chain/get_table_rows', {
      json: true,
      code: 'cleanupcentr',
      scope: 'cleanupcentr',
      table: 'proposals',
      limit: 100,
    });
    const proposals = proposalsResponse.data.rows;
    console.log('Proposals:', proposals);

    // Query AtomicAssets API for user-owned NFTs
    const userNFTs = await Promise.all(
      approvedNFTs.map(async (approved) => {
        const response = await axios.get(
          `https://wax.api.atomicassets.io/atomicassets/v1/assets`, {
            params: {
              collection_name: approved.collection,
              template_id: approved.template_id,
              owner: accountName,
            },
          }
        );
        console.log(`Fetched NFTs for template ${approved.template_id}:`, response.data.data);

        return response.data.data.map((nft) => {
          const matchingProposal = proposals.find(
            (proposal) =>
              proposal.template_id === approved.template_id &&
              proposal.collection === approved.collection &&
              proposal.schema === approved.schema
          );

          return {
            ...nft,
            schema_name: approved.schema,
            collection_name: approved.collection,
            template_name: nft.template?.immutable_data?.name || 'Unnamed NFT',
            img: nft.template?.immutable_data?.img || null,
            trash_fee: matchingProposal?.trash_fee || 0,
            cinder_reward: matchingProposal?.cinder_reward || 0,
          };
        });
      })
    );

    const flatNFTs = userNFTs.flat();
    console.log('Final Burnable NFTs:', flatNFTs);
    return flatNFTs;
  } catch (error) {
    console.error('Error fetching burnable NFTs:', error.response?.data || error.message);
    throw error;
  }
};
