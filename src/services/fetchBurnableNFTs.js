import axios from 'axios';
import { fetchApprovedCollections } from './api'; // Import the function from api.js

export const fetchBurnableNFTs = async (accountName) => {
  try {
    console.log('Fetching approved NFTs and proposals from the backend...');

    // Reuse fetchApprovedCollections to get approved NFTs
    const approvedNFTs = await fetchApprovedCollections();
    console.log('Approved NFTs:', approvedNFTs);

    // Fetch all proposals directly from the blockchain with pagination
    let proposals = [];
    let lowerBound = '';
    let hasMore = true;

    while (hasMore) {
      const proposalsResponse = await axios.post('https://wax.pink.gg/v1/chain/get_table_rows', {
        json: true,
        code: 'cleanupcentr',
        scope: 'cleanupcentr',
        table: 'proposals',
        limit: 100,
        lower_bound: lowerBound,
      });
      const rows = proposalsResponse.data.rows;
      proposals = [...proposals, ...rows];
      hasMore = proposalsResponse.data.more;
      lowerBound = proposalsResponse.data.next_key || ''; // Adjust for pagination
    }

    console.log('Fetched Proposals:', proposals);

    // Filter proposals to include only approved ones
    const approvedProposals = proposals.filter(
      (proposal) => proposal.status === 'approved'
    );
    console.log('Approved Proposals:', approvedProposals);

    // Group approvedNFTs by collection to reduce redundant API calls
    const nftRequestsByCollection = approvedNFTs.reduce((acc, nft) => {
      acc[nft.collection] = acc[nft.collection] || [];
      acc[nft.collection].push(nft.template_id);
      return acc;
    }, {});

    // Query AtomicAssets API for user-owned NFTs by collection
    const userNFTRequests = Object.entries(nftRequestsByCollection).map(
      ([collection, templateIds]) =>
        axios.get('https://wax.api.atomicassets.io/atomicassets/v1/assets', {
          params: {
            collection_name: collection,
            owner: accountName,
            template_id: templateIds.join(','), // Fetch all relevant templates for this collection
          },
        })
    );

    const userNFTResponses = await Promise.all(userNFTRequests);

    // Flatten and enrich NFT data
    const userNFTs = userNFTResponses.flatMap((response) => {
      return response.data.data.map((nft) => {
        const matchingProposal = approvedProposals.find(
          (proposal) =>
            String(proposal.template_id) === String(nft.template.template_id) &&
            proposal.collection.toLowerCase() === nft.collection.collection_name.toLowerCase() &&
            proposal.schema.toLowerCase() === nft.schema.schema_name.toLowerCase()
        );

        return {
          ...nft,
          schema_name: nft.schema.schema_name,
          collection_name: nft.collection.collection_name,
          template_name: nft.template?.immutable_data?.name || 'Unnamed NFT',
          img: nft.template?.immutable_data?.img || null,
          trash_fee: matchingProposal?.trash_fee || 'N/A',
          cinder_reward: matchingProposal?.cinder_reward || 'N/A',
        };
      });
    });

    console.log('Final Burnable NFTs:', userNFTs);
    return userNFTs;
  } catch (error) {
    console.error('Error fetching burnable NFTs:', error.message || error.response?.data);
    throw error;
  }
};
