// BurnRoom.js
import React, { useEffect, useState } from 'react';
import { fetchBurnableNFTs } from '../services/api';
import './BurnRoom.css';

const BurnRoom = ({ accountName, onClose }) => {
  const [burnableNFTs, setBurnableNFTs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (accountName) {
      setLoading(true);
      fetchBurnableNFTs(accountName)
        .then((nfts) => {
          setBurnableNFTs(nfts);
          setLoading(false);
        })
        .catch((error) => {
          console.error('Error fetching burnable NFTs:', error);
          setLoading(false);
        });
    }
  }, [accountName]);

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
          {burnableNFTs.map((nft) => (
            <div key={nft.template_id} className="nft-card">
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
                <p className="nft-name">
                  {nft.template_name || 'Unnamed NFT'}
                </p>
                <p className="nft-count">Count: {nft.count}</p>
                <p className="nft-reward">
                  Reward: {nft.reward > 0 ? `${nft.reward} CINDER` : 'No reward info'}
                </p>
                <button className="burn-button">Burn NFT</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BurnRoom;
