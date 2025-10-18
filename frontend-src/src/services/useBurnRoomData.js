import { useState, useEffect } from 'react';
import { fetchBurnableNFTs, fetchProposals } from '../../../services/api';
import { fetchStakedAndUnstakedIncinerators } from '../../../services/incinerators';

const useBurnRoomData = (accountName) => {
  const [burnableNFTs, setBurnableNFTs] = useState([]);
  const [stakedIncinerators, setStakedIncinerators] = useState([]);
  const [unstakedIncinerators, setUnstakedIncinerators] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (accountName) {
      setLoading(true);
      Promise.all([
        fetchBurnableNFTs(accountName),
        fetchProposals(),
        fetchStakedAndUnstakedIncinerators(accountName),
      ])
        .then(([nfts, fetchedProposals, incinerators]) => {
          setBurnableNFTs(nfts);
          setProposals(fetchedProposals.filter((proposal) => proposal.status === 'approved'));
          setStakedIncinerators(incinerators.staked);
          setUnstakedIncinerators(incinerators.unstaked);
        })
        .catch((error) => console.error('Error fetching data:', error))
        .finally(() => setLoading(false));
    }
  }, [accountName]);

  return {
    burnableNFTs,
    stakedIncinerators,
    unstakedIncinerators,
    proposals,
    loading,
  };
};

export default useBurnRoomData;
