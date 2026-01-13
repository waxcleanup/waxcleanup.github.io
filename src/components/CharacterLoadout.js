// src/components/CharacterLoadout.js
import React from "react";
import "./CharacterLoadout.css";
import EnergyCellSection from "./EnergyCellSection";
import { toIpfsUrl } from "../utils/ipfs";

export default function CharacterLoadout({
  inventory,
  onUnequipTool,
  toolPending,
  accountName,
  onRefreshInventory,
}) {
  if (!inventory) return null;

  const tools = inventory?.tools?.equipped || {};
  const isUnequipPending = (slot) => toolPending === `unequip-${slot}`;

  return (
    <div className="loadout-container">
      {/* ✅ energy wrapper so the CSS applies */}
      <div className="loadout-energy">
        <EnergyCellSection
          cells={inventory.cells}
          accountName={accountName}
          onRefresh={onRefreshInventory}
          toolPending={toolPending}
        />
      </div>

      <div className="loadout-section">
        <h3 className="loadout-title">Equipped Tools</h3>

        <div className="tool-slots">
          {["watering", "harvesting"].map((slot) => {
            const tool = tools[slot];
            const toolImg = toIpfsUrl(tool?.image);

            return (
              <div key={slot} className="tool-slot">
                <div className="tool-slot-label">
                  {slot === "watering" ? "Watering" : "Harvesting"}
                </div>

                {tool ? (
                  <div className="tool-equipped-card">
                    <img
                      src={toolImg || ""}
                      alt={tool.name}
                      className="tool-image"
                      onError={(e) => (e.currentTarget.style.visibility = "hidden")}
                    />
                    <div className="tool-name">{tool.name}</div>
                    <div className="tool-rarity">{tool.rarity}</div>

                    <button
                      className="tool-unequip-button"
                      onClick={() => onUnequipTool && onUnequipTool(slot)}
                      disabled={isUnequipPending(slot)}
                    >
                      {isUnequipPending(slot) ? "Unequipping..." : "Unequip"}
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
  );
}

