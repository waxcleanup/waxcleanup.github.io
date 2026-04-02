import React, { useMemo } from 'react';
import './MachineHeroCard.css';

import {
  buildIpfsUrl,
  formatCountdown,
  getBalanceDisplay,
  getMachineImage,
  getMachineName,
  getMachineRowId,
  getTemplateId,
  toPlain,
} from './machineUtils';

function toBool(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === '1' || normalized === 'true';
  }
  return false;
}

function toUnixSeconds(value) {
  if (!value) return 0;

  if (typeof value === 'number') {
    return value > 1e12 ? Math.floor(value / 1000) : Math.floor(value);
  }

  const str = String(value).trim();
  if (!str) return 0;

  const parsed = Date.parse(str.endsWith('Z') ? str : `${str}Z`);
  return Number.isNaN(parsed) ? 0 : Math.floor(parsed / 1000);
}

function getTokenLabel(balanceRow) {
  const balanceText = toPlain(
    balanceRow?.balance ??
      balanceRow?.quantity ??
      balanceRow?.amount ??
      balanceRow?.token_balance ??
      ''
  );

  if (typeof balanceText === 'string' && balanceText.includes(' ')) {
    const parts = balanceText.trim().split(' ');
    if (parts.length >= 2) return parts.slice(1).join(' ');
  }

  const tokenId = toPlain(balanceRow?.token_id);
  return tokenId != null ? `Token #${tokenId}` : 'Token';
}

export default function MachineHeroCard({
  machine,
  selectedRecipe,
  machinePending,
  machineBalances,
  templateNameMap,
  busyKey,
  onDepositOnly,
  onStartMachine,
  onClaim,
  onUnstake,
  nowTick,
}) {
  const machineId = getMachineRowId(machine);
  const templateId = getTemplateId(machine);

  const machineName =
    toPlain(machine?.machine_name) ||
    toPlain(templateNameMap?.[templateId]) ||
    getMachineName(machine);

  const pendingRow =
    (machinePending || []).find((row) => getMachineRowId(row) === machineId) || null;

  const tokenBalancesForMachine = (machineBalances || []).filter(
    (row) => getMachineRowId(row) === machineId
  );

  const isRunning = toBool(machine?.isRunning);
  const canStart = toBool(machine?.canStart);
  const canClaim = toBool(machine?.canClaim);

  const cooldownSec = Number(
    machine?.recipe?.cooldown_sec ??
      selectedRecipe?.cooldown_sec ??
      0
  );

  const startedAtSec = toUnixSeconds(machine?.last_start);
  const nowSec = Math.floor((nowTick || Date.now()) / 1000);
  const readyAtSec = startedAtSec > 0 ? startedAtSec + cooldownSec : 0;

  const remainingSeconds =
    isRunning && readyAtSec > 0
      ? Math.max(0, readyAtSec - nowSec)
      : 0;

  const readyToClaim =
    canClaim &&
    isRunning &&
    readyAtSec > 0 &&
    nowSec >= readyAtSec;

  const image = getMachineImage(machine);
  const imageUrl = useMemo(() => buildIpfsUrl(image), [image]);

  const statusText = readyToClaim
    ? 'Ready to claim'
    : isRunning
    ? 'Processing'
    : 'Idle';

  const statusClass = readyToClaim
    ? 'ready'
    : isRunning
    ? 'running'
    : 'idle';

  return (
    <section className={`machine-hero-card ${statusClass}`}>
      <div className="machine-hero-header">
        <div className="machine-hero-kicker">Active Machine</div>
        <div className="machine-hero-id">{machineId ?? 'N/A'}</div>
      </div>

      <div className="machine-hero-body">
        <div className="machine-hero-left">
          {image ? (
            <img
              className="machine-hero-image"
              src={imageUrl}
              alt={machineName}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : null}

          <h3 className="machine-hero-title">{machineName}</h3>

          <div className="machine-hero-meta">
            <span>Machine ID: {machineId ?? 'N/A'}</span>
            <span>Template: {templateId ?? 'N/A'}</span>
          </div>

          <div className="machine-status-live">
            <span className={`status-dot ${statusClass}`} />
            <span>{statusText}</span>
          </div>

          <div className="machine-timer-box">
            <div className="machine-timer-label">Time Remaining</div>
            <div className="machine-timer-value">
              {formatCountdown(remainingSeconds)}
            </div>
          </div>

          <div className="machine-balance-block">
            <div className="machine-section-label">Deposited Inputs</div>

            {tokenBalancesForMachine.length === 0 ? (
              <div className="machine-empty-row">No machine balances yet.</div>
            ) : (
              tokenBalancesForMachine.map((bal, idx) => (
                <div className="machine-balance-row" key={`hero-bal-${machineId}-${idx}`}>
                  <span>{getTokenLabel(bal)}</span>
                  <span>{getBalanceDisplay(bal)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="machine-hero-right">
          <div className="machine-btn-row">
            <button
              className="machine-action-btn"
              onClick={() => onDepositOnly(machine)}
              disabled={!selectedRecipe || busyKey === `deposit-${machineId}` || isRunning}
            >
              {busyKey === `deposit-${machineId}` ? 'Depositing...' : 'Deposit'}
            </button>

            <button
              className="machine-action-btn"
              onClick={() => onStartMachine(machine)}
              disabled={
                !selectedRecipe ||
                !canStart ||
                isRunning ||
                busyKey === `start-${machineId}`
              }
            >
              {busyKey === `start-${machineId}` ? 'Starting...' : 'Start'}
            </button>
          </div>

          <button
            className="machine-action-btn primary"
            onClick={() => onClaim(machine)}
            disabled={!readyToClaim || busyKey === `claim-${machineId}`}
          >
            {busyKey === `claim-${machineId}` ? 'Claiming...' : 'Claim'}
          </button>

          <button
            className="machine-action-btn danger"
            onClick={() => onUnstake(machine)}
            disabled={isRunning || busyKey === `unstake-${machineId}`}
          >
            {busyKey === `unstake-${machineId}` ? 'Unstaking...' : 'Unstake'}
          </button>
        </div>
      </div>
    </section>
  );
}