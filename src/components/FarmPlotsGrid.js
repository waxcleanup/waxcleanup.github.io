// src/components/FarmPlotsGrid.js
import React, { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import './FarmPlotsGrid.css';

import FarmSlotModal from './FarmSlotModal';
import TomatoGrowthSVG from './TomatoGrowthSVG';

import useSession from '../hooks/useSession';
import { waterPlot, waterPlots, harvestPlot } from '../services/plotActions';
import { plantSlot } from '../services/plantActions';
import { getWaxRpc } from '../services/waxRpcRead';
import { unstakePlot } from '../services/plotStakeActions';

const IPFS_GATEWAY = (
  process.env.REACT_APP_IPFS_GATEWAY || 'https://ipfs.io/ipfs'
).replace(/\/$/, '');

function toIpfsUrl(image) {
  if (!image) return null;
  const s = String(image).trim();
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('ipfs://')) return `${IPFS_GATEWAY}/${s.replace('ipfs://', '')}`;
  if (s.includes('/ipfs/')) return `${IPFS_GATEWAY}/${s.split('/ipfs/')[1]}`;
  return `${IPFS_GATEWAY}/${s}`;
}

// ✅ EOSIO timestamps often come without "Z" and MUST be treated as UTC.
function parseEosioTimeMs(v) {
  if (!v) return null;
  const s = String(v).trim();
  if (!s) return null;
  const iso = s.endsWith('Z') ? s : `${s}Z`;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

function fmtMMSS(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * ✅ Water cooldown comes from CHAIN seedmeta:
 * backend returns: slot.seconds_per_tick
 * Water cooldown = 1 tick (seconds_per_tick)
 */
function getWaterCooldownMs(slot) {
  const spt = Number(slot?.seconds_per_tick || 0);
  if (spt > 0) return spt * 1000;
  return null;
}

export default function FarmPlotsGrid({
  farmId,
  onChanged,
  refreshNonce,
  showMyPlotsOnly = false,
  ownerFilter = '', // ✅ filter toggle
}) {
  const { session } = useSession();
  const wallet = session?.actor;

  const [plots, setPlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [selectedSlot, setSelectedSlot] = useState(null);
  const selectedSlotRef = useRef(null);
  const [plotDetailsLoading, setPlotDetailsLoading] = useState(false);

  const [slotPending, setSlotPending] = useState(null);
  const [waterAllPending, setWaterAllPending] = useState(false);
  const waterAllLockRef = useRef(false);
  const [txError, setTxError] = useState(null);
  const [seedStatus, setSeedStatus] = useState(null);

  // ---------------------------
  // Blockchain time (same pattern as Proposals.js)
  // ---------------------------
  const [blockchainTime, setBlockchainTime] = useState(Date.now());

  const fetchChainTime = useCallback(async () => {
    try {
      const data = await getWaxRpc('/v1/chain/get_info');
      const headBlockTime = parseEosioTimeMs(data.head_block_time);
      if (headBlockTime != null) setBlockchainTime(headBlockTime);
    } catch {
      // keep last known
    }
  }, []);

  useEffect(() => {
    fetchChainTime();
    const interval = setInterval(fetchChainTime, 10000);
    return () => clearInterval(interval);
  }, [fetchChainTime]);

  useEffect(() => {
    const i = setInterval(() => {
      setBlockchainTime((t) => t + 1000);
    }, 1000);
    return () => clearInterval(i);
  }, []);

  // --------------------------------------------------
  // Fetch plots
  // --------------------------------------------------
  const fetchPlots = useCallback(async () => {
    if (!farmId) return [];

    setLoading(true);
    try {
      const res = ownerFilter
        ? await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/plots/owner/${ownerFilter}`, {
            params: { farmId, page: 1, limit: 100 },
          })
        : await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/farms/${farmId}/plots`);

      const newPlots = ownerFilter ? (res.data.items || []) : (res.data.plots || []);
      setPlots(newPlots);
      setError(null);
      return newPlots;
    } catch (err) {
      console.error(err);
      setError('Could not load plots for this farm.');
      return [];
    } finally {
      setLoading(false);
    }
  }, [farmId, ownerFilter]);

  useEffect(() => {
    fetchPlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmId, refreshNonce]);

  const openSlotDetails = useCallback(async (plot, slot) => {
    const payload = { farmId, plot, slot };
    selectedSlotRef.current = payload;
    setSelectedSlot(payload);
    setPlotDetailsLoading(true);

    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/api/plots/${plot.plot_asset_id}`
      );
      const refreshedPlot = res.data?.plot;
      const refreshedSlot = refreshedPlot?.slots?.find(
        (candidate) => Number(candidate.index) === Number(slot.index)
      );
      const current = selectedSlotRef.current;
      if (
        refreshedPlot &&
        refreshedSlot &&
        String(current?.plot?.plot_asset_id) === String(plot.plot_asset_id) &&
        Number(current?.slot?.index) === Number(slot.index)
      ) {
        const refreshedPayload = { farmId, plot: refreshedPlot, slot: refreshedSlot };
        selectedSlotRef.current = refreshedPayload;
        setSelectedSlot(refreshedPayload);
      }
    } catch (error) {
      console.warn('Could not refresh individual plot details:', error);
    } finally {
      const current = selectedSlotRef.current;
      if (
        String(current?.plot?.plot_asset_id) === String(plot.plot_asset_id) &&
        Number(current?.slot?.index) === Number(slot.index)
      ) {
        setPlotDetailsLoading(false);
      }
    }
  }, [farmId]);

  // --------------------------------------------------
  // Seed inventory
  // --------------------------------------------------
  const fetchSeedStatus = useCallback(async (account) => {
    if (!account) return setSeedStatus(null);
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/api/player/${account}/status`
      );
      setSeedStatus(res.data.seeds || null);
    } catch {
      setSeedStatus(null);
    }
  }, []);

  useEffect(() => {
    if (wallet) fetchSeedStatus(wallet);
  }, [wallet, fetchSeedStatus]);

  // ✅ Pick a usable seed batch (first batch with qty > 0)
  const getPlantBatch = useCallback(() => {
    const batches = seedStatus?.batches || [];
    return batches.find((b) => Number(b.qty) > 0) || null;
  }, [seedStatus]);

  // --------------------------------------------------
  // Actions
  // --------------------------------------------------
  const handleWater = async (plot, slot) => {
    setTxError(null);
    const key = `water-${plot.plot_asset_id}-${slot.index}`;
    setSlotPending(key);
    try {
      const result = await waterPlot(wallet, plot.plot_asset_id, slot.index);
      if (!result.ok) {
        if (!result.cancelled) {
          setTxError(result.message || 'Water failed');
        }
        return;
      }
      await fetchPlots();
    } catch (e) {
      setTxError(e?.message || 'Water failed');
    } finally {
      setSlotPending(null);
    }
  };

  const handleHarvest = async (plot, slot) => {
    setTxError(null);
    const key = `harvest-${plot.plot_asset_id}-${slot.index}`;
    setSlotPending(key);
    try {
      await harvestPlot(wallet, plot.plot_asset_id, slot.index);
      await fetchPlots();
    } catch (e) {
      setTxError(e?.message || 'Harvest failed');
    } finally {
      setSlotPending(null);
    }
  };

  const handlePlant = async ({ plotAssetId, slotIndex }) => {
    setTxError(null);

    const batch = getPlantBatch();
    if (!batch) {
      setTxError('No seeds available to plant.');
      return;
    }

    const key = `plant-${plotAssetId}-${slotIndex}`;
    setSlotPending(key);

    try {
      await plantSlot({
        actor: wallet,
        plotAssetId: Number(plotAssetId),
        slotIndex: Number(slotIndex),
        seedTemplateId: Number(batch.seed_tpl_id),
        seedBatchId: Number(batch.seed_asset_id),
      });

      await fetchPlots();
      await fetchSeedStatus(wallet);
    } catch (e) {
      setTxError(e?.message || 'Plant failed');
    } finally {
      setSlotPending(null);
    }
  };

  const handleUnstakePlot = async (plotAssetId) => {
    setTxError(null);
    const key = `unstake-plot-${plotAssetId}`;
    setSlotPending(key);
    try {
      await unstakePlot(wallet, String(farmId), String(plotAssetId));
      await fetchPlots();
      onChanged?.({ type: 'plot_unstaked', farmId, plotAssetId });
    } catch (e) {
      setTxError(e?.message || 'Unstake failed');
    } finally {
      setSlotPending(null);
    }
  };

  // --------------------------------------------------
  // Water timer label
  // --------------------------------------------------
  const getWaterLabel = useCallback(
    (slot) => {
      if (!slot) return null;
      if (slot.state !== 'GROWING') return null;

      if (Number(slot.tick || 0) === 0) return 'READY';

      const lastActionMs = parseEosioTimeMs(slot.last_action);
      const cooldownMs = getWaterCooldownMs(slot);

      if (lastActionMs != null && cooldownMs != null) {
        const deadline = lastActionMs + cooldownMs;
        const remaining = deadline - blockchainTime;

        if (remaining <= 0) return 'READY';
        return fmtMMSS(remaining);
      }

      return null;
    },
    [blockchainTime]
  );

  // ✅ Filter plots (renders only user's plots when toggle enabled)
  const visiblePlots = ownerFilter
    ? plots.filter((plot) => String(plot.owner || '') === String(ownerFilter))
    : showMyPlotsOnly && wallet
      ? plots.filter((p) => String(p.owner || '') === String(wallet))
      : plots;

  const waterAllTargets = plots.flatMap((plot) => {
    const isOwner = !!wallet && String(plot.owner || '') === String(wallet);
    if (!isOwner) return [];

    return (plot.slots || [])
      .filter((slot) => slot.state === 'GROWING' && getWaterLabel(slot) === 'READY')
      .map((slot) => ({
        first: String(plot.plot_asset_id),
        second: String(slot.index),
      }));
  });

  const handleWaterAll = async () => {
    if (!wallet || waterAllTargets.length === 0 || waterAllLockRef.current) return;

    waterAllLockRef.current = true;
    setTxError(null);
    setWaterAllPending(true);

    try {
      const result = await waterPlots(wallet, waterAllTargets);
      if (!result.ok) {
        if (!result.cancelled) {
          setTxError(result.message || 'Water All failed');
        }
        return;
      }

      await fetchPlots();
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await fetchPlots();
      onChanged?.({
        type: 'plots_watered',
        farmId,
        count: waterAllTargets.length,
      });
    } catch (e) {
      setTxError(e?.message || 'Water All failed');
    } finally {
      waterAllLockRef.current = false;
      setWaterAllPending(false);
    }
  };

  if (loading && !plots.length) {
    return <div className="plots-grid-status">Loading plots…</div>;
  }

  if (error) {
    return <div className="plots-grid-status error">{error}</div>;
  }

  return (
    <>
      {txError && <div className="plots-grid-status error">{txError}</div>}

      {showMyPlotsOnly && wallet && !loading && plots.length > 0 && visiblePlots.length === 0 && (
        <div className="plots-grid-status">No plots owned by you in this farm.</div>
      )}

      {ownerFilter && !loading && visiblePlots.length === 0 && (
        <div className="plots-grid-status">No plots owned by {ownerFilter} in this farm.</div>
      )}

      <div className="plots-water-all-row">
        <button
          type="button"
          className="plots-water-all-btn"
          onClick={handleWaterAll}
          disabled={!wallet || waterAllTargets.length === 0 || waterAllPending || Boolean(slotPending)}
          title={
            waterAllTargets.length > 0
              ? `Water ${waterAllTargets.length} ready slot${waterAllTargets.length === 1 ? '' : 's'}`
              : 'No growing slots are ready to water'
          }
        >
          {waterAllPending ? 'Watering All...' : `Water All (${waterAllTargets.length})`}
        </button>
      </div>

      <div className="farm-plots-grid">
        {visiblePlots.map((plot) => {
          const isOwner = !!wallet && !!plot.owner && String(plot.owner) === String(wallet);

          // ✅ correct active-crop detection
          const hasActiveCrop = (plot.slots || []).some((s) => {
            const state = String(s?.state || '').toUpperCase();
            if (state === 'EMPTY') return false;
            if (state === 'GROWING' || state === 'READY') return true;
            const tpl = Number(s?.seed_tpl_id || 0);
            return tpl > 0;
          });

          const unstakeBlockedByCrop = hasActiveCrop;

          const unstakeKey = `unstake-plot-${plot.plot_asset_id}`;

          return (
            <div key={plot.plot_asset_id} className="plot-card">
              {/* ✅ Header: meta wraps safely, no button in header (prevents overflow) */}
              <div className="plot-header">
                {plot.image && (
                  <img src={toIpfsUrl(plot.image)} alt={plot.name} className="plot-image" />
                )}

                <div className="plot-header-text">
                  <div className="plot-name">{plot.name}</div>

                  <div className="plot-meta">
                    <span className="plot-id">Plot #{String(plot.plot_asset_id).slice(-4)}</span>

                    {plot.owner && (
                      <span
                        className={`plot-owner ${
                          wallet && String(plot.owner) === String(wallet) ? 'me' : ''
                        }`}
                        title={plot.owner}
                      >
                        Owner: {plot.owner}
                      </span>
                    )}

                    {hasActiveCrop && (
                      <span className="active-crop-badge" title="This plot has an active crop">
                        ACTIVE CROP
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className={`plot-slots plot-slots-${plot.capacity}`}>
                {plot.slots.map((slot) => {
                  const tick = slot.tick || 0;
                  const tickGoal = slot.tick_goal || 21;

                  return (
                    <div
                      key={slot.index}
                      className={`plot-slot plot-slot-${String(slot.state || '').toLowerCase()}`}
                      onClick={() => openSlotDetails(plot, slot)}
                      title="Click to view progress"
                    >
                      {(slot.state === 'GROWING' || slot.state === 'READY') && (
                        <TomatoGrowthSVG
                          tick={tick}
                          tickGoal={tickGoal}
                          weather="sunny"
                          rarity="common"
                          className="plot-slot-svg"
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* ✅ Admin row: keeps Unstake aligned and INSIDE the card */}
              <div className="plot-admin-row">
                <button
                  className="unstake-plot-btn"
                  onClick={() => handleUnstakePlot(plot.plot_asset_id)}
                  disabled={!isOwner || unstakeBlockedByCrop || slotPending === unstakeKey}
                  title={
                    !isOwner
                      ? 'Only the plot owner can unstake'
                      : unstakeBlockedByCrop
                        ? 'Unstake disabled: harvest/remove crop first'
                        : 'Unstake this plot'
                  }
                >
                  {slotPending === unstakeKey ? 'Unstaking…' : 'Unstake'}
                </button>
              </div>

              {/* Footer actions for 1-slot plots */}
              {plot.capacity === 1 &&
                plot.slots?.[0] &&
                (() => {
                  const slot = plot.slots[0];

                  const isEmpty = slot.state === 'EMPTY';
                  const isGrowing = slot.state === 'GROWING';
                  const isReady = slot.state === 'READY';

                  const batch = getPlantBatch();
                  const canPlant = isEmpty && !!batch;

                  const waterLabel = getWaterLabel(slot);
                  const waterReady = isGrowing && waterLabel === 'READY';

                  const waterKey = `water-${plot.plot_asset_id}-${slot.index}`;
                  const harvestKey = `harvest-${plot.plot_asset_id}-${slot.index}`;
                  const plantKey = `plant-${plot.plot_asset_id}-${slot.index}`;

                  return (
                    <div className="plot-footer">
                      <div className="plot-seed">
                        {slot.seed_name ? slot.seed_name : isEmpty ? 'Empty slot' : '—'}
                      </div>

                      {isEmpty && (
                        <button
                          type="button"
                          className={`plot-water-pill ${canPlant ? 'ready' : ''}`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!isOwner || !wallet) return;
                            if (!canPlant) return;
                            handlePlant({ plotAssetId: plot.plot_asset_id, slotIndex: slot.index });
                          }}
                          disabled={!isOwner || !wallet || !canPlant || slotPending === plantKey}
                          title={
                            !isOwner
                              ? 'Only the plot owner can plant'
                              : !batch
                                ? 'No seeds available'
                                : 'Click to plant a seed'
                          }
                        >
                          {slotPending === plantKey ? '🌱 PLANTING…' : '🌱 PLANT'}
                        </button>
                      )}

                      {isGrowing && (
                        <button
                          type="button"
                          className={`plot-water-pill ${waterReady ? 'ready' : ''}`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!isOwner) return;
                            if (!waterReady) return;
                            handleWater(plot, slot);
                          }}
                          disabled={
                            !isOwner ||
                            !wallet ||
                            !waterReady ||
                            waterAllPending ||
                            slotPending === waterKey
                          }
                          title={
                            !isOwner
                              ? 'Only the plot owner can water'
                              : waterReady
                                ? 'Click to water'
                                : 'Not ready yet'
                          }
                        >
                          {slotPending === waterKey
                            ? '💧 WATERING…'
                            : `💧 WATER: ${waterLabel || '—'}`}
                        </button>
                      )}

                      {isReady && (
                        <button
                          type="button"
                          className="plot-water-pill ready"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!isOwner) return;
                            handleHarvest(plot, slot);
                          }}
                          disabled={!isOwner || !wallet || slotPending === harvestKey}
                          title={!isOwner ? 'Only the plot owner can harvest' : 'Click to harvest'}
                        >
                          {slotPending === harvestKey ? '🌾 HARVESTING…' : '🌾 HARVEST: READY'}
                        </button>
                      )}
                    </div>
                  );
                })()}
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {selectedSlot && (
        <FarmSlotModal
          farmId={selectedSlot.farmId}
          plot={selectedSlot.plot}
          slot={selectedSlot.slot}
          loading={plotDetailsLoading}
          onClose={() => {
            selectedSlotRef.current = null;
            setSelectedSlot(null);
            setPlotDetailsLoading(false);
          }}
        />
      )}
    </>
  );
}
