import React from 'react';
import IncineratorDetails from './IncineratorDetails';

const IncineratorGrid = ({ slots, onRemove, onSlotClick }) => (
  <div className="incinerator-grid">
    {slots.map((slot, index) => (
      <div
        key={index}
        className={`incinerator-card ${slot ? '' : 'empty-incinerator'}`}
        onClick={() => onSlotClick(index)}
      >
        {slot ? (
          <IncineratorDetails
            incinerator={slot}
            onRemove={() => onRemove(index)}
            fetchIncineratorData={() => {}} // Replace with actual data-fetching logic
            showButtons
          />
        ) : (
          <p>Empty Slot</p>
        )}
      </div>
    ))}
  </div>
);

export default IncineratorGrid;
