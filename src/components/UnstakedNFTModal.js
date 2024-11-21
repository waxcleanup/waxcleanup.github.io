import React, { useEffect, useState } from 'react';
import { fetchUserNFTsFromBlockchain, stakeIncinerator } from '../services/api';
import './BurnRoom.css';

const UnstakedNFTModal = ({ accountName, onClose, onNFTStake }) => {
  const [unstakedNFTs, setUnstakedNFTs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stakingNFT, setStakingNFT] = useState(null);

  useEffect(() => {
    if (accountName) {
      fetchNFTs();
    }
  }, [accountName]);

  const fetchNFTs = async () => {
    try {
      setLoading(true);
      const nfts = await fetchUserNFTsFromBlockchain(accountName); // Fetch NFTs from user's account
      const filteredNFTs = nfts.filter((nft) => nft.template_id === '856817'); // Filter by template_id
      setUnstakedNFTs(filteredNFTs);
    } catch (error) {
      console.error('Error fetching unstaked NFTs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStakeClick = async (nft) => {
    if (!nft) return;
    setStakingNFT(nft.asset_id);

    try {
      const result = await stakeIncinerator(accountName, nft.asset_id);
      if (result.success) {
        alert(`NFT staked successfully!`);
        onNFTStake(nft); // Notify parent of the staking
        fetchNFTs(); // Refresh the unstaked NFTs
      } else {
        alert(result.error || 'Staking failed. Please try again.');
      }
    } catch (error) {
      console.error('Error staking NFT:', error);
      alert('An error occurred while staking. Please try again.');
    } finally {
      setStakingNFT(null);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Unstaked Incinerators</h3>
        <button className="close-button" onClick={onClose}>
          &times;
        </button>

        {loading ? (
          <p>Loading NFTs...</p>
        ) : unstakedNFTs.length > 0 ? (
          <div className="nft-grid">
            {unstakedNFTs.map((nft) => (
              <div key={nft.asset_id} className="nft-card">
                <img
                  src={nft.img ? `https://ipfs.io/ipfs/${nft.img}` : '/placeholder.png'}
                  alt={nft.name || 'Unnamed Incinerator'}
                  className="nft-image"
                />
                <p>{nft.name || 'Unnamed Incinerator'}</p>
                <p>Asset ID: {nft.asset_id}</p>
                <button
                  className="stake-button"
                  onClick={() => handleStakeClick(nft)}
                  disabled={stakingNFT === nft.asset_id}
                >
                  {stakingNFT === nft.asset_id ? 'Staking...' : 'Stake Incinerator'}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p>No unstaked incinerators found in your account.</p>
        )}
      </div>
    </div>
  );
};

export default UnstakedNFTModal;
