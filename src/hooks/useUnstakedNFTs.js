import { useState, useEffect, useCallback } from 'react';
import { fetchUserNFTsFromBlockchain } from '../services/api';

const useUnstakedNFTs = (accountName, templateId) => {
  const [unstakedNFTs, setUnstakedNFTs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNFTs = useCallback(async () => {
    try {
      setLoading(true);
      const nfts = await fetchUserNFTsFromBlockchain(accountName);
      const filteredNFTs = nfts.filter((nft) => nft.template_id === templateId);
      setUnstakedNFTs(filteredNFTs);
    } catch (error) {
      console.error('Error fetching unstaked NFTs:', error);
    } finally {
      setLoading(false);
    }
  }, [accountName, templateId]);

  useEffect(() => {
    if (accountName) fetchNFTs();
  }, [accountName, fetchNFTs]);

  return { unstakedNFTs, loading, refetch: fetchNFTs };
};

export default useUnstakedNFTs;
