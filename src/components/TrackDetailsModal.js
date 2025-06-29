// src/components/TrackDetailsModal.js
import React from 'react';
import ReactDOM from 'react-dom';
import './TrackDetailsModal.css';

export default function TrackDetailsModal({ item, onClose }) {
  if (!item) return null;

  return ReactDOM.createPortal(
    <div className="track-modal-overlay" onClick={onClose}>
      <div className="track-modal" onClick={e => e.stopPropagation()}>
        <button className="track-modal-close" onClick={onClose}>&times;</button>

        {item.img && (
          <img
            src={item.img.startsWith('http') ? item.img : `https://maestrobeatz.servegame.com/ipfs/${item.img}`}
            alt={item.title}
            className="track-modal-cover"
          />
        )}

        <h2 className="track-modal-title">{item.title}</h2>
        <p className="track-modal-author">By: {item.author}</p>
        {item.description && (
          <p className="track-modal-description">{item.description}</p>
        )}

        {/* you can add genre, release date, other metadata here */}
      </div>
    </div>,
    document.body
  );
}
