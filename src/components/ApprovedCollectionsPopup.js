// src/components/ApprovedCollectionsPopup.js

import React, { useEffect } from 'react';
import './ProposalModal.css'; // Use the ProposalModal.css for styling

const ApprovedCollectionsPopup = ({ collections, onClose }) => {
  useEffect(() => {
    console.log("Approved Collections Data: ", collections);
  }, [collections]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal button close" onClick={onClose} aria-label="Close">
          &times;
        </button>
        <h3>Approved NFTs</h3>

        {collections.length === 0 ? (
          <p>No approved NFTs available.</p>
        ) : (
          <div className="collections-grid">
            {collections.map((template, index) => (
              <div key={`${template.template_id}-${index}`} className="proposal-note collection-item">
                <p><strong>Collection:</strong> {template.collection}</p>
                <p><strong>Schema:</strong> {template.schema}</p>
                <p><strong>Template ID:</strong> {template.template_id}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ApprovedCollectionsPopup;
