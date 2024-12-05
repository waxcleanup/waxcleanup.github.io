import React from 'react';
import PropTypes from 'prop-types';
import IncineratorDetails from './IncineratorDetails';

const IncineratorGrid = ({ slots, onRemove, onSlotClick, fetchData }) => (
  <div className="incinerator-grid">
    {slots.map((slot, index) => (
      <div
        key={index}
        className={`incinerator-card ${slot ? '' : 'empty-incinerator'}`}
        onClick={slot ? () => onSlotClick(index) : null} // Disable click for empty slots
      >
        {slot ? (
          <IncineratorDetails
            incinerator={slot}
            onRemove={() => onRemove(index)}
            fetchIncineratorData={fetchData} // Use real fetch function
            showButtons
          />
        ) : (
          <p>Empty Slot</p>
        )}
      </div>
    ))}
  </div>
);

IncineratorGrid.propTypes = {
  slots: PropTypes.arrayOf(
    PropTypes.shape({
      asset_id: PropTypes.string, // Ensure asset_id is defined for incinerators
    })
  ).isRequired,
  onRemove: PropTypes.func.isRequired, // Function to handle incinerator removal
  onSlotClick: PropTypes.func.isRequired, // Function to handle slot click
  fetchData: PropTypes.func, // Function to refresh data (optional)
};

export default IncineratorGrid;

