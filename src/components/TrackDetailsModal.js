// src/components/TrackDetailsModal.js
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import './TrackDetailsModal.css';

const IPFS_GATEWAY = (process.env.REACT_APP_IPFS_GATEWAY || '')
  .trim()
  .replace(/\/+$/, '');

function resolveMediaUrl(value) {
  const source = String(value || '').trim();
  if (!source) return '';
  if (/^https?:\/\//i.test(source)) return source;
  return `${IPFS_GATEWAY}/${source.replace(/^ipfs:\/\//i, '').replace(/^\/+/, '')}`;
}

export default function TrackDetailsModal({ item, onClose }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  if (!item || typeof document === 'undefined') return null;

  const coverUrl = resolveMediaUrl(item.img);

  return createPortal(
    <div className="track-modal-overlay" onMouseDown={onClose}>
      <section
        className="track-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="track-details-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="track-modal-close"
          onClick={onClose}
          aria-label="Close track details"
        >
          <span aria-hidden="true">×</span>
        </button>

        <div className="track-modal-artwork">
          {coverUrl ? (
            <img src={coverUrl} alt="" className="track-modal-cover" />
          ) : (
            <div className="track-modal-cover track-modal-cover--empty" aria-hidden="true">♫</div>
          )}
          <div className="track-modal-artwork-glow" aria-hidden="true" />
        </div>

        <div className="track-modal-content">
          <div className="track-modal-eyebrow">Now in the RhythmFarm playlist</div>
          <h2 id="track-details-title" className="track-modal-title">
            {item.title || 'Untitled track'}
          </h2>
          <p className="track-modal-author">
            {item.author || 'Unknown artist'}
          </p>

          <div className="track-modal-metadata">
            <div>
              <span>Collection</span>
              <strong>{item.collection || 'Unknown'}</strong>
            </div>
            <div>
              <span>Template</span>
              <strong>#{item.template_id || '—'}</strong>
            </div>
            <div>
              <span>Format</span>
              <strong>{item.media_type || 'Audio'}</strong>
            </div>
          </div>

          <div className="track-modal-description-wrap">
            <h3>About this track</h3>
            <p className="track-modal-description">
              {item.description || 'No description is available for this track.'}
            </p>
          </div>

          <div className="track-modal-footer">
            <span>Stored on IPFS</span>
            <button type="button" onClick={onClose}>Back to player</button>
          </div>
        </div>
      </section>
    </div>,
    document.body
  );
}
