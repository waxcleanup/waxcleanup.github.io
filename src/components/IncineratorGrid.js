import React from 'react';
import IncineratorCard from './IncineratorCard';

const IncineratorGrid = ({ slots, onRemove, onSlotClick }) => (
  <div className="incinerator-grid">
    {slots.map((slot, index) => (
      <IncineratorCard
        key={index}
        slot={slot}
        index={index}
        onRemove={onRemove}
        onSlotClick={onSlotClick}
      />
    ))}
  </div>
);

export default IncineratorGrid;
