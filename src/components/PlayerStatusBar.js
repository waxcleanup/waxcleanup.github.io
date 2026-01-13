import React from 'react';
import './PlayerStatusBar.css';

export default function PlayerStatusBar({
  status,
  error,
  loading,
  onClaimRewards,
  claimingRewards = false,
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

  const rewards = status.rewards || {};

  // Support multiple reward tokens, e.g. CINDER + TOMATOE
  let rewardTokens = [];

  if (Array.isArray(rewards.tokens)) {
    // Expected shape: [{ symbol: 'CINDER', amount: '10.00000000' }, ...]
    rewardTokens = rewards.tokens
      .map((t) => {
        const amountNum = parseFloat(t.amount);
        return {
          symbol: t.symbol,
          amountStr: t.amount,
          amountNum: Number.isNaN(amountNum) ? 0 : amountNum,
        };
      })
      .filter((t) => t.amountNum > 0);
  } else if (rewards.totalAmount) {
    // Fallback: old single-string behavior ("3.780000 CINDER")
    const totalRewardRaw = rewards.totalAmount;
    const [rewardAmountStr, rewardSymbol] = String(totalRewardRaw).split(' ');
    const rewardAmount = parseFloat(rewardAmountStr);

    if (!Number.isNaN(rewardAmount) && rewardAmount > 0) {
      rewardTokens = [
        {
          symbol: rewardSymbol || '',
          amountStr: rewardAmountStr,
          amountNum: rewardAmount,
        },
      ];
    }
  }

  const hasRewards = rewardTokens.length > 0;

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

      {hasRewards && (
        <>
          <div className="player-status-divider" />

          <div className="player-status-item player-status-item--rewards">
            <div className="player-status-rewards-text">
              <span className="player-status-label">Pending Rewards</span>

              {/* List each token reward on its own line */}
              <div className="player-status-rewards-list">
                {rewardTokens.map((t) => {
                  const iconClass =
                    t.symbol === 'TOMATOE'
                      ? 'reward-icon reward-icon--tomatoe'
                      : t.symbol === 'CINDER'
                      ? 'reward-icon reward-icon--cinder'
                      : 'reward-icon';

                  return (
                    <div
                      key={t.symbol}
                      className="player-status-value player-status-reward-line"
                    >
                      <span className={iconClass}>
                        {t.symbol === 'TOMATOE' && '🍅'}
                        {t.symbol === 'CINDER' && '🔥'}
                      </span>
                      {t.amountStr} {t.symbol}
                    </div>
                  );
                })}
              </div>
            </div>

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

