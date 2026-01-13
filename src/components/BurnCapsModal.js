// src/components/BurnCapsModal.js
import React from 'react';
import './BurnCapsModal.css';

export default function BurnCapsModal({
  open,
  onClose,
  burnStatus,
  loading,
  error,
  onRefresh,
}) {
  if (!open) return null;

  const user = burnStatus?.user;

  // Supports:
  //  - NEW: burnStatus.incinerators = [{ slotIndex, asset_id, used, cap, remaining, resetAt }]
  //  - OLD: burnStatus.incinerator = { used, cap, remaining, resetAt }
  const incinerators = Array.isArray(burnStatus?.incinerators)
    ? burnStatus.incinerators
    : burnStatus?.incinerator
      ? [{ slotIndex: 0, asset_id: '—', ...burnStatus.incinerator }]
      : [];

  const pct = (used, cap) => (cap > 0 ? Math.min(100, (used / cap) * 100) : 0);

  const fmtReset = (iso) =>
    iso ? new Date(iso).toUTCString().replace('GMT', 'UTC') : '—';

  const anyCapHit =
    (user?.remaining === 0) || incinerators.some((x) => x?.remaining === 0);

  // Prefer user reset time; otherwise first incinerator reset
  const resetAt = user?.resetAt || incinerators?.[0]?.resetAt || null;

  return (
    <div className="capsOverlay" onClick={onClose}>
      <div className="capsModal" onClick={(e) => e.stopPropagation()}>
        <div className="capsHeader">
          <div className="capsTitle">Daily Burn Caps</div>
          <button className="capsClose" onClick={onClose}>✕</button>
        </div>

        <div className="capsSub">
          {resetAt ? `Resets: ${fmtReset(resetAt)}` : 'Resets: —'}
        </div>

        {loading && <div className="capsLoading">Loading…</div>}
        {error && <div className="capsError">{error}</div>}

        {!loading && burnStatus && (
          <>
            {/* USER */}
            {user && (
              <>
                <div className="capRow">
                  <span>User</span>
                  <strong>{user.used} / {user.cap}</strong>
                </div>
                <div className="capBar">
                  <div
                    className="capFill"
                    style={{ width: `${pct(user.used, user.cap)}%` }}
                  />
                </div>
                <div className="capMeta">
                  Remaining: {user.remaining}
                </div>
              </>
            )}

            {/* INCINERATORS (multi) */}
            {incinerators.length > 0 && (
              <>
                <div className="capsSectionTitle">Incinerators</div>

                {incinerators.map((inc, idx) => {
                  const slotLabel =
                    typeof inc.slotIndex === 'number'
                      ? `Slot ${inc.slotIndex + 1}`
                      : `Slot ${idx + 1}`;

                  const assetLabel = inc.asset_id && inc.asset_id !== '—'
                    ? ` • ${inc.asset_id}`
                    : '';

                  const incResetAt = inc.resetAt || user?.resetAt || null;

                  return (
                    <div key={`${inc.asset_id || 'inc'}-${idx}`} className="capsIncBlock">
                      <div className="capRow">
                        <span>{slotLabel}{assetLabel}</span>
                        <strong>{inc.used} / {inc.cap}</strong>
                      </div>

                      <div className="capBar">
                        <div
                          className="capFill inc"
                          style={{ width: `${pct(inc.used, inc.cap)}%` }}
                        />
                      </div>

                      <div className="capMeta">
                        Remaining: {inc.remaining}
                        <span className="capMetaSep">•</span>
                        Resets: {fmtReset(incResetAt)}
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {anyCapHit && (
              <div className="capsHardStop">
                🚫 Cap reached — burns disabled until reset
              </div>
            )}
          </>
        )}

        <div className="capsFooter">
          <button className="capsRefresh" onClick={onRefresh}>
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}

