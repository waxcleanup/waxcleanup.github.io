import React from 'react';
import './PlayerStatusBar.css';

export default function PlayerStatusBar({
  status,
  error,
  loading,
  onClaimRewards,        // NEW
  claimingRewards = false // NEW
}) {
  if (loading) {
    return <div className="player-status-loading">Loading farming status…</div>;
  }

  if (error) {
    return <div className="player-status-error">{error}</div>;
  }

  if (!status) return null;

  const seedTotal = status.seeds?.total ?? 0;
  const compostBalance = status.compost?.balance ?? 0;

  // Rewards come in as: "3.780000 CINDER"
  const totalRewardRaw = status.rewards?.totalAmount ?? '0.000000 CINDER';
  const [rewardAmountStr, rewardSymbol] = String(totalRewardRaw).split(' ');
  const rewardAmount = parseFloat(rewardAmountStr);
  const hasRewards = !Number.isNaN(rewardAmount) && rewardAmount > 0;

  return (
    <div className="player-status-bar">
      <div className="player-status-item">
        <span className="player-status-label">Seeds</span>
        <span className="player-status-value">{seedTotal}</span>
      </div>

      <div className="player-status-divider" />

      <div className="player-status-item">
        <span className="player-status-label">Compost</span>
        <span className="player-status-value">{compostBalance}</span>
      </div>

      {/* Only show Pending Rewards section if rewards exist */}
      {hasRewards && (
        <>
          <div className="player-status-divider" />

          <div className="player-status-item player-status-item--rewards">
            <div className="player-status-rewards-text">
              <span className="player-status-label">Pending Rewards</span>
              <span className="player-status-value">
                {rewardSymbol
                  ? `${rewardAmountStr} ${rewardSymbol}`
                  : rewardAmountStr}
              </span>
            </div>

            {/* CLAIM BUTTON */}
            <button
              className="player-status-claim-btn"
              onClick={onClaimRewards}
              disabled={claimingRewards}
            >
              {claimingRewards ? 'Claiming…' : 'Claim'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

