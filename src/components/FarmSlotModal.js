// src/components/FarmSlotModal.js
import React from 'react';
import './FarmSlotModal.css';
import TomatoGrowthSVG from './TomatoGrowthSVG';

export default function FarmSlotModal({
  farmId,
  plot,
  slot,
  onClose,
  onWater,
  onHarvest,
  onPlant,      // callback for planting (optional)
  slotPending,
}) {
  if (!plot || !slot) return null;

  const tick = slot.tick || 0;
  const tickGoal = slot.tick_goal || 21;

  const progress =
    tickGoal > 0
      ? Math.min(100, Math.round((tick / tickGoal) * 100))
      : 0;

  const canWater = slot.state === 'GROWING';
  const canHarvest = slot.state === 'READY';

  const isWatering =
    slotPending === `water-${plot.plot_asset_id}-${slot.index}`;
  const isHarvesting =
    slotPending === `harvest-${plot.plot_asset_id}-${slot.index}`;
  const isPlanting =
    slotPending === `plant-${plot.plot_asset_id}-${slot.index}`;

  const handlePlantClick = () => {
    const payload = {
      plotAssetId: plot.plot_asset_id,
      slotIndex: slot.index,
    };

    if (typeof onPlant === 'function') {
      onPlant(payload);
    } else {
      // Safe fallback so UI still works visually
      // You’ll see this in console if wiring is missing.
      // eslint-disable-next-line no-console
      console.warn(
        '[FarmSlotModal] Plant button clicked but onPlant is not provided',
        payload
      );
    }
  };

  return (
    <div className="slot-modal-backdrop" onClick={onClose}>
      <div
        className="slot-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="slot-modal-header">
          <h3>
            Plot #{String(plot.plot_asset_id).slice(-4)} — Slot {slot.index}
          </h3>
          <button className="slot-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="slot-modal-body">
          {/* Tomato growth visualization */}
          {slot.state !== 'EMPTY' && (
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
            <span className={`slot-value state-${slot.state.toLowerCase()}`}>
              {slot.state}
            </span>
          </div>

          {/* Progress + seed info when not empty */}
          {slot.state !== 'EMPTY' && (
            <>
              <div className="slot-modal-row">
                <span className="slot-label">Growth Progress:</span>
                <span className="slot-value">
                  {tick} / {tickGoal} ({progress}%)
                </span>
              </div>

              {slot.seed_tpl_id > 0 && (
                <div className="slot-modal-row">
                  <span className="slot-label">Seed Template:</span>
                  <span className="slot-value">#{slot.seed_tpl_id}</span>
                </div>
              )}
            </>
          )}

          {/* Actions */}
          <div className="slot-modal-actions">
            {/* Water button */}
            <button
              className="slot-action-btn water-btn"
              disabled={!canWater || isWatering}
              onClick={onWater}
            >
              {isWatering ? 'Watering…' : '💧 Water Slot'}
            </button>

            {/* Harvest button */}
            <button
              className="slot-action-btn harvest-btn"
              disabled={!canHarvest || isHarvesting}
              onClick={onHarvest}
            >
              {isHarvesting ? 'Harvesting…' : '🧺 Harvest'}
            </button>

            {/* 🌱 Plant button when slot is EMPTY */}
            {slot.state === 'EMPTY' && (
              <button
                className="slot-action-btn plant-btn"
                disabled={isPlanting}
                onClick={handlePlantClick}
              >
                {isPlanting ? 'Planting…' : '🌱 Plant Seed'}
              </button>
            )}

            {slot.state === 'EMPTY' && !onPlant && (
              <div className="slot-empty-info">
                Planting is not fully wired yet — click will just log in the
                console until onPlant is connected.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

