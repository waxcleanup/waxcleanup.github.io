import React, { useEffect, useState } from 'react';
import { fetchBurnableNFTs, fetchProposals, fetchIncineratorsFromBlockchain } from '../services/api';
import { InitTransaction } from '../hooks/useSession';
import './BurnRoom.css';

const BurnRoom = ({ accountName, session, onClose }) => {
  const [burnableNFTs, setBurnableNFTs] = useState([]);
  const [incinerators, setIncinerators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isBurning, setIsBurning] = useState(false);
  const [proposals, setProposals] = useState([]);
  const [showIncinerators, setShowIncinerators] = useState(false); // State to control visibility of incinerators
  const [isFetchingIncinerators, setIsFetchingIncinerators] = useState(false);
  const [hasStakedIncinerator, setHasStakedIncinerator] = useState(false); // To track if the user has a staked incinerator

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

  // Fetch incinerators from the blockchain
  const fetchIncinerators = async () => {
    setIsFetchingIncinerators(true);
    try {
      const userIncinerators = await fetchIncineratorsFromBlockchain(accountName);
      if (userIncinerators.length > 0) {
        setIncinerators(userIncinerators);
        // Check if the user has any staked incinerator
        const stakedIncinerator = userIncinerators.find((incinerator) => incinerator.staked);
        setHasStakedIncinerator(!!stakedIncinerator);
      } else {
        console.log('No incinerators found for this user.');
        setIncinerators([]);
        setHasStakedIncinerator(false); // No incinerators found
      }
    } catch (error) {
      console.error('Error fetching user incinerators:', error);
      alert('Failed to fetch incinerators from the blockchain.');
    } finally {
      setIsFetchingIncinerators(false);
    }
  };

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

  // Show placeholder incinerator cards if user has no incinerators
  const renderIncinerators = () => {
    const incineratorSlots = 3;
    const placeholderCards = Array.from({ length: incineratorSlots - incinerators.length }).map((_, index) => (
      <div key={index} className="incinerator-card empty-incinerator">
        <p>No Incinerator Found</p>
      </div>
    ));

    return (
      <>
        {incinerators.map((incinerator) => (
          <div key={incinerator.asset_id} className="incinerator-card">
            <img src={`https://ipfs.io/ipfs/${incinerator.img}`} alt={incinerator.template_name} className="incinerator-image" />
            <div className="incinerator-info">
              <p className="incinerator-name">{incinerator.template_name || 'Unnamed Incinerator'}</p>
              <div className="incinerator-actions">
                <button className="stake-button">Stake</button>
              </div>
            </div>
          </div>
        ))}
        {placeholderCards}
      </>
    );
  };

  if (loading) {
    return <div className="burn-room">Loading burnable NFTs...</div>;
  }

  return (
    <div className="burn-room">
      <button className="close-button" onClick={onClose}>&times;</button>
      <h2 className="burn-room-title">Burn Room</h2>

      {/* Incinerators Button */}
      <button onClick={() => { fetchIncinerators(); setShowIncinerators(true); }} disabled={isFetchingIncinerators}>
        {isFetchingIncinerators ? 'Loading Incinerators...' : 'Show Incinerators'}
      </button>

      {showIncinerators && (
        <div className="incinerator-grid">
          {renderIncinerators()}
        </div>
      )}

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
                <p className="trash-fee">
                  Fee: {trash_fee ? `${trash_fee} ` : 'Not available'}
                </p>
                <p className="nft-reward">
                  Reward: {cinder_reward ? `${cinder_reward} ` : 'No reward info'}
                </p>

                {/* Show Burn button only if the user has a staked incinerator */}
                {hasStakedIncinerator && (
                  <button
                    className="burn-button"
                    onClick={() => payFeeAndTransferNFT(nft)}
                    disabled={isBurning}
                  >
                    {isBurning ? 'Processing...' : 'Burn NFT'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!hasStakedIncinerator && (
        <div className="no-incinerator-message">
          <p>You must stake an incinerator to burn NFTs.</p>
        </div>
      )}
    </div>
  );
};

export default BurnRoom;
