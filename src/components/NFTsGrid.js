// src/components/NFTsGrid.js
import React from 'react';
import './CollectionsPage.css';

export default function NFTsGrid({ items, type, onAction, actionLabel }) {
  return (
    <div className="nfts-grid">
      {items.map((item) => {
        const key = item.asset_id || item.template_id;
        const title = item.name || `${type.charAt(0).toUpperCase() + type.slice(1)} #${key}`;
        return (
          <div key={key} className="nft-card">
            {item.image && (
              <img
                src={item.image}
                alt={title}
                className="nft-card-image"
              />
            )}
            <h3 className="nft-card-title">{title}</h3>
            <p className="nft-card-ids">
              {item.asset_id ? `Asset ID: ${item.asset_id}` : `Template: ${item.template_id}`}
            </p>
            {onAction && (
              <button
                className="nft-action-btn"
                onClick={() => onAction(item)}
              >
                {actionLabel}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
