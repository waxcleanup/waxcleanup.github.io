import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './SelectCellModal.css';

export default function SelectCellModal({ cells, onConfirm, onCancel }) {
  const [selectedAssetId, setSelectedAssetId] = useState(null);

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h3>Select a Farm Cell</h3>
        <ul className="cell-list">
          {cells.map(cell => (
            <li key={cell.asset_id}>
              <label>
                <input
                  type="radio"
                  name="cell"
                  value={cell.asset_id}
                  onChange={() => setSelectedAssetId(cell.asset_id)}
                />
                Template #{cell.template_id} — Asset ID {cell.asset_id}
              </label>
            </li>
          ))}
        </ul>
        <div className="modal-actions">
          <button onClick={onCancel}>Cancel</button>
          <button
            onClick={() => onConfirm(selectedAssetId)}
            disabled={!selectedAssetId}
          >
            Stake Cell
          </button>
        </div>
      </div>
    </div>
  );
}

SelectCellModal.propTypes = {
  cells: PropTypes.arrayOf(
    PropTypes.shape({
      template_id: PropTypes.number,
      asset_id: PropTypes.number,
    })
  ).isRequired,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};
