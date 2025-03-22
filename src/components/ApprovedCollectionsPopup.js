// src/components/ApprovedCollectionsPopup.js

import React, { useEffect, useState } from "react";
import "./ApprovedCollectionsPopup.css";

const ApprovedCollectionsPopup = ({ collections, onClose }) => {
  const [selectedCollection, setSelectedCollection] = useState("");
  const [filteredCollections, setFilteredCollections] = useState(collections);

  useEffect(() => {
    console.log("Approved Collections Data:", collections);
    setFilteredCollections(collections);
  }, [collections]);

  // Extract unique collections for dropdown
  const uniqueCollections = [...new Set(collections.map((item) => item.collection))];

  // Filter collections based on selected collection
  useEffect(() => {
    if (selectedCollection) {
      setFilteredCollections(collections.filter((item) => item.collection === selectedCollection));
    } else {
      setFilteredCollections(collections);
    }
  }, [selectedCollection, collections]);

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose} aria-label="Close">
          &times;
        </button>
        <h3>Approved NFTs</h3>

        {/* Collection Filter Dropdown */}
        <select
          className="filter-dropdown"
          value={selectedCollection}
          onChange={(e) => setSelectedCollection(e.target.value)}
        >
          <option value="">All Collections</option>
          {uniqueCollections.map((col) => (
            <option key={col} value={col}>
              {col}
            </option>
          ))}
        </select>

        {filteredCollections.length === 0 ? (
          <p>No matching approved NFTs found.</p>
        ) : (
          <div className="collections-grid">
            {filteredCollections.map((template, index) => (
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
