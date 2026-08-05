// src/components/EnergyCellSection.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import { rechargeUserEnergy } from "../services/userEnergyActions";
import { stakeUserCell, unstakeUserCell } from "../services/userCellActions";
import { toIpfsUrl } from "../utils/ipfs";
import { usePlayerResources } from "../hooks/PlayerResourcesContext";
import "./EnergyCellSection.css";

const ENERGY_PER_CINDER = 2;

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

export default function EnergyCellSection({ cells, accountName, onRefresh, toolPending, mode = "combined" }) {
  const { resources, refreshResources } = usePlayerResources();
  const [showModal, setShowModal] = useState(false);
  const [showCorePicker, setShowCorePicker] = useState(false);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cellPending, setCellPending] = useState(null);

  // Keep modal errors separate so the section doesn’t “stay red”
  const [modalError, setModalError] = useState("");
  const [sectionError, setSectionError] = useState("");

  // Charge “burst” animation when energy increases
  const [chargePulse, setChargePulse] = useState(false);
  const prevEnergyRef = useRef(null);
  const liveEnergyRef = useRef(0);

  const stakedCells = cells?.staked || [];
  const unstakedCells = cells?.unstaked || [];
  const cell = stakedCells?.[0] || null;

  const energy = Number(cells?.energy || 0);
  const max = Number(cells?.max || 0);
  const pct = max > 0 ? clamp(energy / max, 0, 1) : 0;

  const pctNumber = Math.round(pct * 100);
  const pctLabel = `${pctNumber}%`;
  const pctWidth = `${pctNumber}%`;
  const cinderBalance = Number(resources?.cinder?.amount || 0);
  const remainingCapacity = Math.max(0, max - energy);
  const cinderToFull = remainingCapacity / ENERGY_PER_CINDER;
  const isFull = max > 0 && energy >= max;
  const maxRechargeSpend = Math.max(0, Math.min(cinderBalance, cinderToFull));
  const enteredRechargeAmount = Number(amount);
  const rechargeAmountIsValid = Number.isFinite(enteredRechargeAmount) &&
    enteredRechargeAmount > 0 && enteredRechargeAmount <= maxRechargeSpend;
  const energyStatus = isFull
    ? { key: "full", label: "Fully charged" }
    : pctNumber <= 0
      ? { key: "empty", label: "Energy empty" }
      : pctNumber <= 15
        ? { key: "critical", label: "Critical energy" }
        : pctNumber <= 35
          ? { key: "low", label: "Low energy" }
          : { key: "healthy", label: "Energy healthy" };
  const rechargeLabel = energyStatus.key === "empty"
    ? "Energy Empty — Recharge Now"
    : ["critical", "low"].includes(energyStatus.key)
      ? "Energy Low — Recharge"
      : isFull ? "Energy Full" : "Recharge Energy";

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
    liveEnergyRef.current = energy;
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
    setAmount(maxRechargeSpend > 0 ? String(Math.min(1, maxRechargeSpend)) : "");
    setShowModal(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setShowModal(false);
    setModalError("");
    setAmount("");
  };

  const handleConfirmRecharge = async () => {
    const numeric = Number(amount);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      setModalError("Please enter a valid CINDER amount greater than 0.");
      return;
    }
    if (numeric > cinderBalance) {
      setModalError(`Not enough CINDER. Available: ${cinderBalance.toFixed(6)} CINDER.`);
      return;
    }
    if (max > 0 && numeric * ENERGY_PER_CINDER > remainingCapacity + 0.000001) {
      setModalError(`That exceeds the remaining capacity. Use at most ${cinderToFull.toFixed(6)} CINDER.`);
      return;
    }

    const energyBeforeRecharge = energy;
    setSubmitting(true);
    setModalError("");
    setSectionError("");

    try {
      await rechargeUserEnergy(numeric);

      // Poll briefly because the backend may still return the pre-transaction
      // energy value while its on-chain index catches up.
      for (let attempt = 0; attempt < 6; attempt += 1) {
        if (attempt > 0) {
          // eslint-disable-next-line no-await-in-loop
          await new Promise((resolve) => setTimeout(resolve, 700));
        }
        // eslint-disable-next-line no-await-in-loop
        await Promise.all([safeRefresh(), refreshResources()]);
        if (liveEnergyRef.current > energyBeforeRecharge) break;
      }

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
      setShowCorePicker(false);
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
    <section className={`ecs-wrap ecs-wrap--${mode} ${chargePulse ? "ecs-pulse" : ""}`}>
      {mode !== "core" && <div className={`ecs-energyHero is-${energyStatus.key}`}>
        <div className="ecs-energyIdentity">
          <span className="ecs-energyIcon" aria-hidden="true">⚡</span>
          <div><span className="ecs-energyEyebrow">User Energy</span>
            <div className="ecs-energyValue"><strong>{energy}</strong><span>/ {max} ENERGY</span></div>
          </div>
        </div>
        <div className="ecs-energyStatus">
          <span>{energyStatus.label}</span><strong>{pctLabel} remaining</strong>
        </div>
        <button
          type="button"
          className="ecs-heroRecharge"
          onClick={cell ? openModal : () => setShowCorePicker(true)}
          disabled={disableButtons || (Boolean(cell) && isFull)}
        >
          {cell ? rechargeLabel : "Choose Core from Bag"}
        </button>
        <div className="ecs-energyTrack" aria-label={`${pctLabel} energy remaining`}><span style={{ width: pctWidth }} /></div>
        <div className="ecs-energyFoot">
          <span>Balance: <strong>{cinderBalance.toLocaleString(undefined, { maximumFractionDigits: 6 })} CINDER</strong></span>
          {!isFull && max > 0 && <span>Full recharge: <strong>{cinderToFull.toFixed(3)} CINDER</strong></span>}
        </div>
      </div>}
      {mode !== "summary" && <>
      <div className="ecs-header ecs-header--compact">
        <div><h3 className="ecs-title">Energy Core</h3><div className="ecs-subtitle">Your attached core determines energy capacity.</div></div>
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
            className="ecs-btn ecs-btnOutline"
            onClick={() => cell && handleUnstakeCell(cell.asset_id)}
            disabled={disableButtons || !cell}
          >
            {cell && cellPending === `unstake-${cell.asset_id}` ? "Unstaking..." : "Unstake Core"}
          </button>

          {sectionError && <div className="ecs-error">{sectionError}</div>}

        </div>
      </div>
      </>}

      {mode !== "core" && showCorePicker && (
        <div className="ecs-modalBackdrop" onClick={() => !cellPending && setShowCorePicker(false)}>
          <div className="ecs-modal ecs-corePicker" onClick={(event) => event.stopPropagation()}>
            <div className="ecs-modalTitle">Choose an Energy Core</div>
            <p>Select an available core from your Field Bag.</p>
            {unstakedCells.length ? (
              <div className="ecs-corePickerGrid">
                {unstakedCells.map((availableCore) => {
                  const id = String(availableCore.asset_id || "");
                  return (
                    <button
                      type="button"
                      key={id}
                      disabled={Boolean(cellPending)}
                      onClick={() => handleStakeCell(availableCore)}
                    >
                      <img src={toIpfsUrl(availableCore.image) || ""} alt="" />
                      <span><strong>{availableCore.name || "Energy Core"}</strong><small>#{id}</small></span>
                      <b>{cellPending === `stake-${id}` ? "Staking…" : "Stake Core"}</b>
                    </button>
                  );
                })}
              </div>
            ) : <div className="ecs-error">No unstaked Energy Cores were found in your Field Bag.</div>}
            <div className="ecs-modalActions">
              <button className="ecs-btn ecs-btnOutline" onClick={() => setShowCorePicker(false)} disabled={Boolean(cellPending)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {mode !== "core" && showModal && (
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
                <div className="ecs-modalLabel">CINDER Balance</div>
                <div className="ecs-modalValue">{cinderBalance.toFixed(6)} CINDER</div>
              </div>
            </div>
            <div className="ecs-quickAmounts">
              {[25, 50].map((energyAmount) => {
                const cinderAmount = energyAmount / ENERGY_PER_CINDER;
                return <button type="button" key={energyAmount} disabled={submitting || cinderAmount > cinderBalance || energyAmount > remainingCapacity} onClick={() => setAmount(String(cinderAmount))}>+{energyAmount} Energy</button>;
              })}
              <button type="button" disabled={submitting || isFull || cinderToFull > cinderBalance} onClick={() => setAmount(String(Number(cinderToFull.toFixed(6))))}>Fill to Maximum</button>
            </div>

            <label className="ecs-modalLabel2">
              CINDER to spend
              <input
                type="number"
                min={Math.min(1, maxRechargeSpend || 1)}
                max={maxRechargeSpend}
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="ecs-input"
              />
            </label>

            <div className="ecs-inputLimit">
              Maximum available: {maxRechargeSpend.toFixed(6)} CINDER
            </div>

            {Number(amount) > 0 && (
              <div className="ecs-preview"><span>+{Number(amount) * ENERGY_PER_CINDER} Energy</span><strong>Projected: {Math.min(max, energy + Number(amount) * ENERGY_PER_CINDER)} / {max}</strong></div>
            )}

            {modalError && <div className="ecs-error">{modalError}</div>}

            <div className="ecs-modalActions">
              <button className="ecs-btn ecs-btnOutline" onClick={closeModal} disabled={submitting}>
                Cancel
              </button>
              <button className="ecs-btn ecs-btnPrimary" onClick={handleConfirmRecharge} disabled={submitting || !rechargeAmountIsValid}>
                {submitting ? "Signing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

