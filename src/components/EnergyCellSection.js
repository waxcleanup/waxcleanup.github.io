// src/components/EnergyCellSection.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import { rechargeUserEnergy } from "../services/userEnergyActions";
import { stakeUserCell, unstakeUserCell } from "../services/userCellActions";
import { toIpfsUrl } from "../utils/ipfs";
import "./EnergyCellSection.css";

const ENERGY_PER_CINDER = 10;

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

// ✅ Avoid SVG id collisions by generating a unique id per component instance
function useUid(prefix = "uid") {
  const ref = useRef(null);
  if (!ref.current) {
    ref.current = `${prefix}-${Math.random().toString(16).slice(2)}-${Date.now()}`;
  }
  return ref.current;
}

function EnergyRing({ value = 0, max = 0 }) {
  const pct = max > 0 ? clamp(value / max, 0, 1) : 0;

  const size = 64;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * pct;

  const gradId = useUid("ecsRingGrad");

  return (
    <div className="ecs-ring" title={`${Math.round(pct * 100)}%`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          {/* Molten ring gradient */}
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="rgba(255,122,24,0.95)" stopOpacity="1" />
            <stop offset="0.55" stopColor="rgba(255,179,71,0.85)" stopOpacity="1" />
            <stop offset="1" stopColor="rgba(107,44,0,0.55)" stopOpacity="1" />
          </linearGradient>
        </defs>

        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={`url(#${gradId})`}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>

      <div className="ecs-ring-center">
        <div className="ecs-ring-num">{value}</div>
        <div className="ecs-ring-max">/ {max}</div>
      </div>
    </div>
  );
}

export default function EnergyCellSection({ cells, accountName, onRefresh, toolPending }) {
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const [cellPending, setCellPending] = useState(null);

  // Keep modal errors separate so the section doesn’t “stay red”
  const [modalError, setModalError] = useState("");
  const [sectionError, setSectionError] = useState("");

  // Charge “burst” animation when energy increases
  const [chargePulse, setChargePulse] = useState(false);
  const prevEnergyRef = useRef(null);

  const stakedCells = cells?.staked || [];
  const unstakedCells = cells?.unstaked || [];
  const cell = stakedCells?.[0] || null;

  const energy = Number(cells?.energy || 0);
  const max = Number(cells?.max || 0);
  const pct = max > 0 ? clamp(energy / max, 0, 1) : 0;

  const pctLabel = `${Math.round(pct * 100)}%`;
  const pctWidth = `${Math.round(pct * 100)}%`;

  const cellImgSrc = useMemo(() => toIpfsUrl(cell?.image), [cell?.image]);

  const disableButtons =
    submitting ||
    !!cellPending ||
    toolPending?.startsWith("unequip-") ||
    toolPending?.startsWith("equip-");

  const safeRefresh = async () => {
    if (typeof onRefresh === "function") await onRefresh();
  };

  // ✅ Pulse effect when energy increases (after refresh updates the prop)
  useEffect(() => {
    if (prevEnergyRef.current === null) {
      prevEnergyRef.current = energy;
      return;
    }
    if (energy > prevEnergyRef.current) {
      setChargePulse(true);
      window.setTimeout(() => setChargePulse(false), 650);
    }
    prevEnergyRef.current = energy;
  }, [energy]);

  const openModal = () => {
    setModalError("");
    setSectionError("");
    setAmount("1");
    setShowModal(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setShowModal(false);
    setModalError("");
    setAmount("1");
  };

  const handleConfirmRecharge = async () => {
    const numeric = Number(amount);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      setModalError("Please enter a valid CINDER amount greater than 0.");
      return;
    }

    setSubmitting(true);
    setModalError("");
    setSectionError("");

    try {
      await rechargeUserEnergy(numeric);

      // ✅ refresh FIRST so UI can show updated energy
      await safeRefresh();

      // ✅ close after refresh
      setShowModal(false);
    } catch (err) {
      setModalError(err?.message || "Recharge failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStakeCell = async (cellObj) => {
    try {
      if (!accountName) {
        setSectionError("Please connect your wallet first.");
        return;
      }

      const asset_id = cellObj?.asset_id;
      const template_id = cellObj?.template_id;
      if (!asset_id) return setSectionError("Missing asset_id for this User Cell.");
      if (!template_id) return setSectionError("Missing template_id for this User Cell.");

      setSectionError("");
      setCellPending(`stake-${asset_id}`);
      await stakeUserCell(accountName, asset_id, template_id);

      await safeRefresh();
    } catch (err) {
      setSectionError(err?.message || "Stake failed.");
    } finally {
      setCellPending(null);
    }
  };

  const handleUnstakeCell = async (asset_id) => {
    try {
      if (!accountName) {
        setSectionError("Please connect your wallet first.");
        return;
      }
      if (!asset_id) return setSectionError("Missing asset_id for unstake.");

      setSectionError("");
      setCellPending(`unstake-${asset_id}`);
      await unstakeUserCell(accountName, asset_id);

      await safeRefresh();
    } catch (err) {
      setSectionError(err?.message || "Unstake failed.");
    } finally {
      setCellPending(null);
    }
  };

  // ✅ Unique ids for SVG defs (no collisions)
  const busGradId = useUid("ecsBusGrad");
  const busGlowId = useUid("ecsBusGlow");

  // Molten intensity based on pct
  const flowOpacity = 0.18 + pct * 0.55;

  return (
    <section className={`ecs-wrap ${chargePulse ? "ecs-pulse" : ""}`}>
      <div className="ecs-header">
        <div>
          <h3 className="ecs-title">Energy System</h3>
          <div className="ecs-subtitle">Attach a core to power your loadout. Recharge with CINDER.</div>
        </div>

        <div className="ecs-meter">
          <EnergyRing value={energy} max={max} />
          <div className="ecs-meter-text">
            <div className="ecs-meter-label">User Energy</div>
            <div className="ecs-meter-pct">{pctLabel}</div>
          </div>
        </div>
      </div>

      <div className="ecs-body">
        {/* LEFT: “socket” + bus line */}
        <div className="ecs-socket">
          {/* busline svg behind everything */}
          <svg className="ecs-busSvg" viewBox="0 0 800 220" preserveAspectRatio="none">
            <defs>
              {/* Molten glow */}
              <filter id={busGlowId} x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation={8 + pct * 10} result="blur" />
                <feColorMatrix
                  in="blur"
                  type="matrix"
                  values="
                    1 0 0 0 0
                    0 0.65 0 0 0
                    0 0 0.2 0 0
                    0 0 0 0.85 0"
                  result="glow"
                />
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Molten gradient */}
              <linearGradient id={busGradId} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="rgba(107,44,0,0.08)" />
                <stop offset="0.45" stopColor={`rgba(255,122,24,${0.10 + pct * 0.35})`} />
                <stop offset="0.75" stopColor={`rgba(255,179,71,${0.10 + pct * 0.35})`} />
                <stop offset="1" stopColor="rgba(255,179,71,0.04)" />
              </linearGradient>
            </defs>

            {/* frame */}
            <rect x="10" y="10" width="780" height="200" rx="18" fill="rgba(255,255,255,0.02)" />
            <rect x="10" y="10" width="780" height="200" rx="18" fill="none" stroke="rgba(255,255,255,0.06)" />

            {/* “rail” */}
            <path
              d="M230 110 C 310 110, 340 70, 420 70 L 770 70"
              fill="none"
              stroke={`url(#${busGradId})`}
              strokeWidth="16"
              strokeLinecap="round"
              filter={`url(#${busGlowId})`}
            />

            {/* animated flow when core exists */}
            {cell && (
              <>
                <path
                  d="M230 110 C 310 110, 340 70, 420 70 L 770 70"
                  fill="none"
                  stroke={`rgba(255,122,24,${flowOpacity})`}
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray="10 16"
                  filter={`url(#${busGlowId})`}
                >
                  <animate attributeName="stroke-dashoffset" from="0" to="-52" dur="1.05s" repeatCount="indefinite" />
                </path>

                {/* hot core line */}
                <path
                  d="M230 110 C 310 110, 340 70, 420 70 L 770 70"
                  fill="none"
                  stroke={`rgba(255,179,71,${0.06 + pct * 0.35})`}
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </>
            )}
          </svg>

          <div className="ecs-socket-top">
            <div className="ecs-socket-label">Core Bay</div>
            <div className="ecs-socket-bar">
              {/* ✅ width must be numeric % string */}
              <div className="ecs-socket-barFill" style={{ width: pctWidth }} />
            </div>
          </div>

          {cell ? (
            <div className="ecs-coreCard">
              <div className="ecs-coreImgWrap">
                <img
                  src={cellImgSrc || ""}
                  alt={cell.name || "Core"}
                  className="ecs-coreImg"
                  onError={(e) => (e.currentTarget.style.opacity = "0")}
                />
                <div className="ecs-coreGlow" />
              </div>

              <div className="ecs-coreMeta">
                <div className="ecs-coreName">{cell.name || "Simple Core"}</div>
                <div className="ecs-coreId">#{String(cell.asset_id || "")}</div>
                <div className="ecs-coreHint">Locked into the bus line when staked.</div>
              </div>
            </div>
          ) : (
            <div className="ecs-empty">
              <div className="ecs-emptyTitle">No core attached</div>
              <div className="ecs-emptyText">Stake a Simple Core to enable user energy.</div>

              {unstakedCells.length > 0 ? (
                <div className="ecs-walletGrid">
                  {unstakedCells.slice(0, 6).map((c) => (
                    <button
                      key={String(c.asset_id)}
                      className="ecs-walletItem"
                      disabled={disableButtons}
                      onClick={() => handleStakeCell(c)}
                      title={`Stake ${c.name} #${c.asset_id}`}
                    >
                      <div className="ecs-walletName">{c.name}</div>
                      <div className="ecs-walletId">#{String(c.asset_id)}</div>
                      <div className="ecs-walletAction">
                        {cellPending === `stake-${c.asset_id}` ? "Staking..." : "Stake Core"}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="ecs-emptyText2">No wallet cores found.</div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: controls */}
        <div className="ecs-controls">
          <button
            className="ecs-btn ecs-btnPrimary"
            onClick={openModal}
            disabled={disableButtons || !cell}
            title={!cell ? "Stake a core first" : "Recharge energy"}
          >
            Recharge User Energy
          </button>

          <button
            className="ecs-btn ecs-btnOutline"
            onClick={() => cell && handleUnstakeCell(cell.asset_id)}
            disabled={disableButtons || !cell}
          >
            {cell && cellPending === `unstake-${cell.asset_id}` ? "Unstaking..." : "Unstake Core"}
          </button>

          {sectionError && <div className="ecs-error">{sectionError}</div>}

          <div className="ecs-note">
            <div className="ecs-noteTitle">Rate</div>
            <div className="ecs-noteText">1 CINDER = {ENERGY_PER_CINDER} Energy</div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="ecs-modalBackdrop" onClick={closeModal}>
          <div className="ecs-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ecs-modalTitle">Recharge User Energy</div>

            <div className="ecs-modalRow">
              <div className="ecs-modalStat">
                <div className="ecs-modalLabel">Current</div>
                <div className="ecs-modalValue">
                  {energy} / {max}
                </div>
              </div>
              <div className="ecs-modalStat">
                <div className="ecs-modalLabel">Rate</div>
                <div className="ecs-modalValue">{ENERGY_PER_CINDER} Energy / 1 CINDER</div>
              </div>
            </div>

            <label className="ecs-modalLabel2">
              CINDER to spend
              <input
                type="number"
                min="0"
                step="0.000001"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="ecs-input"
              />
            </label>

            {Number(amount) > 0 && (
              <div className="ecs-preview">+{Number(amount) * ENERGY_PER_CINDER} Energy (estimate)</div>
            )}

            {modalError && <div className="ecs-error">{modalError}</div>}

            <div className="ecs-modalActions">
              <button className="ecs-btn ecs-btnOutline" onClick={closeModal} disabled={submitting}>
                Cancel
              </button>
              <button className="ecs-btn ecs-btnPrimary" onClick={handleConfirmRecharge} disabled={submitting}>
                {submitting ? "Signing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

