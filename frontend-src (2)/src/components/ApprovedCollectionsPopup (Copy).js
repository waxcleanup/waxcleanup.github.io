// src/components/ApprovedCollectionsPopup.js

import React, { useEffect } from 'react';
import './ApprovedCollectionsPopup.css'; // Updated to use specific CSS for this component

const ApprovedCollectionsPopup = ({ collections, onClose }) => {
  useEffect(() => {
    console.log('Approved Collections Data:', collections);
  }, [collections]);

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose} aria-label="Close">
          &times;
        </button>
        <h3>Approved NFTs</h3>

        {collections.length === 0 ? (
          <p>No approved NFTs available.</p>
        ) : (
          <div className="collections-grid">
            {collections.map((template, index) => (
              <div
                key={`${template.template_id}-${index}`}
                className="collection-item"
              >
                <p>
                  <strong>Collection:</strong> {template.collection}
                </p>
                <p>
                  <strong>Schema:</strong> {template.schema}
                </p>
                <p>
                  <strong>Template ID:</strong> {template.template_id}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ApprovedCollectionsPopup;
