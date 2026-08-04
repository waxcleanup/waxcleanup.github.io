import React from 'react';
import { usePlayerResources } from '../hooks/PlayerResourcesContext';
import './PlayerResourceBar.css';

function formatCompact(value) {
  const number = Number(value || 0);
  const magnitude = Math.abs(number);
  if (magnitude >= 1000000000) return `${(number / 1000000000).toFixed(1)}B`;
  if (magnitude >= 1000000) return `${(number / 1000000).toFixed(1)}M`;
  if (magnitude >= 1000) return `${(number / 1000).toFixed(1)}K`;
  return number.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function ResourceChip({ name, resource, className }) {
  return (
    <div className={`player-resource-chip ${className}`} title={resource.exact}>
      <span className="player-resource-dot" aria-hidden="true" />
      <span className="player-resource-name">{name}</span>
      <strong>{formatCompact(resource.amount)}</strong>
    </div>
  );
}

function CapacityChip({ name, used, max, formatValue, invert = false }) {
  const safeUsed = Math.max(0, Number(used || 0));
  const safeMax = Math.max(0, Number(max || 0));
  const usedPercent = safeMax > 0
    ? Math.min(100, Math.max(0, (safeUsed / safeMax) * 100))
    : 0;
  const displayPercent = invert ? Math.max(0, 100 - usedPercent) : usedPercent;
  const label = invert ? `${Math.round(displayPercent)}% free` : formatValue(safeUsed);

  return (
    <div
      className={`player-resource-chip player-capacity-chip resource-${name.toLowerCase()}`}
      title={`${name}: ${formatValue(safeUsed)} used of ${formatValue(safeMax)}`}
    >
      <span className="player-resource-name">{name}</span>
      <strong>{label}</strong>
      <span className="player-capacity-track" aria-hidden="true">
        <span style={{ width: `${displayPercent}%` }} />
      </span>
    </div>
  );
}

export default function PlayerResourceBar() {
  const { account, resources, loading, error, lastUpdated, refreshResources } =
    usePlayerResources();

  const energyMax = Number(resources.energy.max || 0);
  const energyCurrent = Number(resources.energy.current || 0);
  const energyPercent = energyMax > 0
    ? Math.min(100, Math.max(0, (energyCurrent / energyMax) * 100))
    : 0;

  return (
    <section className="player-resource-bar" aria-label="Player resources">
      <div className="player-resource-scroll">
        <div className="player-account" title={`WAX account: ${account}`}>
          <span className="player-resource-name">ACCOUNT</span>
          <strong>{account}</strong>
        </div>
        <ResourceChip name="WAX" resource={resources.wax} className="resource-wax" />
        <CapacityChip
          name="RAM"
          used={resources.ram.used}
          max={resources.ram.max}
          formatValue={formatBytes}
        />
        <CapacityChip
          name="CPU"
          used={resources.cpu.used}
          max={resources.cpu.max}
          formatValue={(microseconds) => `${(microseconds / 1000).toFixed(2)} ms`}
          invert
        />
        <ResourceChip name="TRASH" resource={resources.trash} className="resource-trash" />
        <ResourceChip name="CINDER" resource={resources.cinder} className="resource-cinder" />
        <ResourceChip name="TOMATOE" resource={resources.tomatoe} className="resource-tomatoe" />
        <ResourceChip name="BANANAZ" resource={resources.bananaz} className="resource-bananaz" />
        <div
          className="player-resource-chip player-energy-chip"
          title={`Personal energy: ${energyCurrent} / ${energyMax}`}
        >
          <span className="player-resource-name">ENERGY</span>
          <strong>{formatCompact(energyCurrent)} / {formatCompact(energyMax)}</strong>
          <span className="player-energy-track" aria-hidden="true">
            <span style={{ width: `${energyPercent}%` }} />
          </span>
        </div>
      </div>

      <div className="player-resource-actions">
        {error && (
          <span className="player-resource-error" title={error}>Partial data</span>
        )}
        <button
          type="button"
          className="player-resource-refresh"
          onClick={refreshResources}
          disabled={loading}
          title={
            lastUpdated
              ? `Updated ${lastUpdated.toLocaleTimeString()}`
              : 'Refresh balances'
          }
        >
          {loading ? 'Updating...' : 'Refresh'}
        </button>
      </div>
    </section>
  );
}
