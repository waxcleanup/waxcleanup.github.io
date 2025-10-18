
// src/components/FarmCard.js
import React from 'react';
import './FarmCard.css';

const FarmCard = ({ farm, onStakeCell }) => {
  const {
    asset_id,
    template_id,
    owner,
    created_at,
    farm_energy,
    reward_pool,
    is_rentable,
    renter,
    image,
    name
  } = farm;

  const formattedDate = new Date(created_at).toLocaleDateString();
  const rentalStatus = is_rentable === 1 ? 'Active' : 'Inactive';

  return (
    <div className="farm-card compact">
      {/* Left: Image */}
      <img
        src={image}
        alt="Farm"
        className="farm-card-image"
      />

      {/* Center: Info */}
      <div className="farm-info">
        <h3 className="farm-title">🌾 {name || `Farm #${asset_id.slice(-5)}`}</h3>
        <p><strong>Template:</strong> {template_id}</p>
        <p><strong>Asset ID:</strong> {asset_id}</p>
        <p><strong>Owner:</strong> {owner}</p>
        <p><strong>Rental Status:</strong> {rentalStatus}</p>
        <p><strong>Created:</strong> {formattedDate}</p>
        <p><strong>Energy:</strong> ⚡ {farm_energy}</p>
        <p><strong>Reward Pool:</strong> {reward_pool} CINDER</p>
      </div>

      {/* Right: Actions */}
      <div className="farm-actions">
        {is_rentable === 1 && !renter && (
          <button className="rent-btn">Rent</button>
        )}
        <button className="rent-btn stake-btn" onClick={onStakeCell}>Stake Battery</button>
      </div>
    </div>
  );
};

export default FarmCard;
