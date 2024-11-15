import React, { useEffect, useState } from 'react';
import { fetchBurnableNFTs, fetchProposals } from '../services/api';
import { InitTransaction } from '../hooks/useSession';
import './BurnRoom.css';

const BurnRoom = ({ accountName, session, onClose }) => {
  const [burnableNFTs, setBurnableNFTs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isBurning, setIsBurning] = useState(false);
  const [proposals, setProposals] = useState([]);

  useEffect(() => {
    if (accountName) {
      setLoading(true);
      Promise.all([fetchBurnableNFTs(accountName), fetchProposals()])
        .then(([nfts, fetchedProposals]) => {
          setBurnableNFTs(nfts);
          setProposals(fetchedProposals.filter((proposal) => proposal.status === 'approved'));
          setLoading(false);
        })
        .catch((error) => {
          console.error('Error fetching burnable NFTs or proposals:', error);
          setLoading(false);
        });
    }
  }, [accountName]);

  const getProposalData = (templateId) => {
    const proposal = proposals.find((proposal) => proposal.template_id === templateId);
    return proposal ? { trash_fee: proposal.trash_fee, cinder_reward: proposal.cinder_reward } : {};
  };

  const payFeeAndTransferNFT = async (nft) => {
    const { trash_fee } = getProposalData(nft.template_id);
    if (!trash_fee) {
      throw new Error('No approved proposal or trash fee found for this NFT.');
    }

    try {
      console.log('Attempting to pay fee and transfer NFT:', nft);

      // Single action to pay fee and initiate transfer
      const result = await InitTransaction({
        actions: [{
          account: 'cleanupcentr',
          name: 'payfee',
          authorization: [{
            actor: session.permissionLevel.actor,
            permission: session.permissionLevel.permission || 'active'
          }],
          data: {
            user: session.permissionLevel.actor,
            asset_id: nft.asset_id,
            trash_fee: trash_fee
          }
        }]
      });

      console.log('Pay fee and transfer result:', result);
      alert('Fee paid and NFT transferred for burning!');
      
      // Update local state to remove the burned NFT
      setBurnableNFTs(prevNFTs => 
        prevNFTs.filter(item => item.asset_id !== nft.asset_id)
      );

    } catch (error) {
      console.error('Error in pay fee and transfer process:', error);
      alert(`Failed to complete fee payment and transfer: ${error.message}`);
    } finally {
      setIsBurning(false);
    }
  };

  if (loading) {
    return <div className="burn-room">Loading burnable NFTs...</div>;
  }

  return (
    <div className="burn-room">
      <button className="close-button" onClick={onClose}>&times;</button>
      <h2 className="burn-room-title">Burn Room</h2>
      {burnableNFTs.length === 0 ? (
        <p>No burnable NFTs available.</p>
      ) : (
        <div className="nft-grid">
          {burnableNFTs.map((nft) => {
            const { trash_fee, cinder_reward } = getProposalData(nft.template_id);
            return (
              <div key={nft.asset_id} className="nft-card">
                {nft.img ? (
                  <img
                    src={`https://ipfs.io/ipfs/${nft.img}`}
                    alt={nft.template_name || 'Unnamed NFT'}
                    className="nft-image"
                  />
                ) : (
                  <div className="no-image">No image</div>
                )}

                <div className="nft-info">
                  <p className="nft-name">{nft.template_name || 'Unnamed NFT'}</p>
                  <p className="nft-count">Count: {nft.count}</p>
                  <p className="trash-fee">
                    Fee: {trash_fee ? `${trash_fee} ` : 'Not available'}
                  </p>
                  <p className="nft-reward">
                    Reward: {cinder_reward ? `${cinder_reward} ` : 'No reward info'}
                  </p>
                  <button
                    className="burn-button"
                    onClick={() => payFeeAndTransferNFT(nft)}
                    disabled={isBurning}
                  >
                    {isBurning ? 'Processing...' : 'Burn NFT'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BurnRoom;
