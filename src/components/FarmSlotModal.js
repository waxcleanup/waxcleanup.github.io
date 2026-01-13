// src/components/FarmSlotModal.js
import React from 'react';
import { createPortal } from 'react-dom';
import './FarmSlotModal.css';
import TomatoGrowthSVG from './TomatoGrowthSVG';

export default function FarmSlotModal({
  farmId, // kept for future use / display
  plot,
  slot,
  onClose,
}) {
  if (!plot || !slot) return null;

  const tick = Number(slot.tick || 0);
  const tickGoal = Number(slot.tick_goal || 21);

  const progress =
    tickGoal > 0 ? Math.min(100, Math.round((tick / tickGoal) * 100)) : 0;

  const state = String(slot.state || 'EMPTY');
  const seedTplId = Number(slot.seed_tpl_id || 0);

  const modal = (
    <div className="slot-modal-backdrop" onClick={onClose}>
      <div className="slot-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="slot-modal-header">
          <h3>
            Plot #{String(plot.plot_asset_id).slice(-4)} — Slot {slot.index}
          </h3>
          <button
            className="slot-modal-close"
            onClick={onClose}
            aria-label="Close"
            title="Close"
          >
            ✕
          </button>
        </div>

        <div className="slot-modal-body">
          {/* SVG preview */}
          {state !== 'EMPTY' && (
            <div className="slot-modal-plant">
              <TomatoGrowthSVG
                tick={tick}
                tickGoal={tickGoal}
                weather="sunny"
                rarity="common"
                className="slot-modal-plant-svg"
              />
            </div>
          )}

          {/* State */}
          <div className="slot-modal-row">
            <span className="slot-label">State:</span>
            <span className={`slot-value state-${state.toLowerCase()}`}>
              {state}
            </span>
          </div>

          {/* Progress */}
          {state !== 'EMPTY' && (
            <>
              <div className="slot-modal-row">
                <span className="slot-label">Progress:</span>
                <span className="slot-value">
                  {tick} / {tickGoal} ({progress}%)
                </span>
              </div>

              <div className="slot-progress-wrap" aria-label="Growth progress">
                <div className="slot-progress-track">
                  <div
                    className="slot-progress-fill"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </>
          )}

          {/* Seed template */}
          {seedTplId > 0 && (
            <div className="slot-modal-row">
              <span className="slot-label">Seed Template:</span>
              <span className="slot-value">#{seedTplId}</span>
            </div>
          )}

          {/* Farm id (optional small info) */}
          {farmId != null && (
            <div className="slot-modal-row">
              <span className="slot-label">Farm:</span>
              <span className="slot-value">#{String(farmId).slice(-6)}</span>
            </div>
          )}

          {/* ✅ No actions here — actions moved to cards/grid */}
          <div className="slot-modal-note">
            Actions (Plant / Water / Harvest) are available on the plot card.
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

