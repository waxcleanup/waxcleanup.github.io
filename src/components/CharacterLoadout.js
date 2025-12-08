// src/components/CharacterLoadout.js
import React, { useState } from "react";
import "./CharacterLoadout.css";
import { rechargeUserEnergy } from "../services/userEnergyActions";

const ENERGY_PER_CINDER = 10; // UI info: 1 CINDER = 10 Energy

/**
 * CharacterLoadout
 *
 * Props:
 *  - inventory: {
 *      cells: { staked: [...], energy, max },
 *      tools: {
 *        equipped: {
 *          watering?: { image, name, rarity, ... },
 *          harvesting?: { image, name, rarity, ... }
 *        }
 *      }
 *    }
 *  - onUnequipTool?: (slot: "watering" | "harvesting") => void
 *  - toolPending?: string  // e.g. "unequip-watering"
 */
export default function CharacterLoadout({
  inventory,
  onUnequipTool,
  toolPending,
}) {
  // Hooks must be at the top level, not behind conditionals
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // If no inventory, render nothing
  if (!inventory) return null;

  const cell = inventory.cells?.staked?.[0];
  const tools = inventory.tools?.equipped || {};

  const openModal = () => {
    setError("");
    setSuccess("");
    setAmount("1");
    setShowModal(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setShowModal(false);
  };

  const handleConfirmRecharge = async () => {
    const numeric = Number(amount);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      setError("Please enter a valid CINDER amount greater than 0.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      await rechargeUserEnergy(numeric);

      const energyGain = numeric * ENERGY_PER_CINDER;
      setSuccess(
        `Recharge successful! You sent ${numeric.toFixed(
          6
        )} CINDER for ~${energyGain} Energy.`
      );
    } catch (err) {
      console.error("Recharge failed:", err);
      setError(
        err?.message ||
          "Recharge failed. Please check your wallet and try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const isUnequipPending = (slot) => toolPending === `unequip-${slot}`;

  return (
    <>
      <div className="loadout-container">
        {/* Energy Cell */}
        <div className="loadout-section">
          <h3 className="loadout-title">Energy Cell</h3>

          {cell ? (
            <div className="cell-card">
              <img src={cell.image} alt={cell.name} className="cell-image" />

              <div className="cell-info">
                <div className="cell-name">{cell.name}</div>
                <div className="cell-energy">
                  {inventory.cells.energy} / {inventory.cells.max} Energy
                </div>

                <button className="recharge-button" onClick={openModal}>
                  Recharge User Energy
                </button>
              </div>
            </div>
          ) : (
            <p>No User Cell Staked</p>
          )}
        </div>

        {/* Equipped Tools */}
        <div className="loadout-section">
          <h3 className="loadout-title">Equipped Tools</h3>

          <div className="tool-slots">
            {["watering", "harvesting"].map((slot) => {
              const tool = tools[slot];

              return (
                <div key={slot} className="tool-slot">
                  <div className="tool-slot-label">
                    {slot === "watering" ? "Watering" : "Harvesting"}
                  </div>

                  {tool ? (
                    <div className="tool-equipped-card">
                      <img
                        src={tool.image}
                        alt={tool.name}
                        className="tool-image"
                      />
                      <div className="tool-name">{tool.name}</div>
                      <div className="tool-rarity">{tool.rarity}</div>

                      <button
                        className="tool-unequip-button"
                        onClick={() =>
                          onUnequipTool && onUnequipTool(slot)
                        }
                        disabled={isUnequipPending(slot)}
                      >
                        {isUnequipPending(slot)
                          ? "Unequipping..."
                          : "Unequip"}
                      </button>
                    </div>
                  ) : (
                    <div className="tool-empty">None Equipped</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recharge Modal */}
      {showModal && (
        <div className="recharge-modal-backdrop" onClick={closeModal}>
          <div
            className="recharge-modal"
            onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside
          >
            <h3 className="recharge-title">Recharge User Energy</h3>

            <p className="recharge-text">
              Use <strong>CINDER</strong> to refill your{" "}
              <strong>User Energy</strong>.
            </p>
            <p className="recharge-rate">
              <strong>Rate:</strong> 1 CINDER = {ENERGY_PER_CINDER} Energy
            </p>

            {cell && (
              <p className="recharge-current">
                Current Energy:{" "}
                <strong>
                  {inventory.cells.energy} / {inventory.cells.max}
                </strong>
              </p>
            )}

            <label className="recharge-label">
              CINDER to spend
              <input
                type="number"
                min="0"
                step="0.000001"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="recharge-input"
              />
            </label>

            {amount && Number(amount) > 0 && (
              <p className="recharge-preview">
                This will give approximately{" "}
                <strong>
                  {Number(amount) * ENERGY_PER_CINDER} Energy
                </strong>
                .
              </p>
            )}

            {error && <div className="recharge-error">{error}</div>}
            {success && <div className="recharge-success">{success}</div>}

            <div className="recharge-actions">
              <button
                className="recharge-cancel"
                onClick={closeModal}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                className="recharge-confirm"
                onClick={handleConfirmRecharge}
                disabled={submitting}
              >
                {submitting ? "Signing..." : "Confirm Recharge"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

