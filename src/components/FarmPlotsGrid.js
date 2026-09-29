import {farmTimers,formatFarmTime,harvestLabel} from '../utils/farmTimers';
import FarmPlotStakeControl from './FarmPlotStakeControl';
import PlotUnstakeControl from './PlotUnstakeControl';
// src/components/FarmPlotsGrid.js
import React, { useEffect, useState, useCallback, useRef, lazy, Suspense } from 'react';
import axios from 'axios';
import usePlantingCapacity from '../hooks/usePlantingCapacity';
import './FarmPlotsGrid.css';
import './FarmMap3D.css';

import FarmSlotModal from './FarmSlotModal';
import TomatoGrowthSVG from './TomatoGrowthSVG';

import useSession from '../hooks/useSession';
import { waterPlot, waterPlots, harvestPlot } from '../services/plotActions';
import { plantSlot } from '../services/plantActions';
import { getWaxRpc } from '../services/waxRpcRead';
import { unstakePlot } from '../services/plotStakeActions';

const FarmMap3D = lazy(() => import('./FarmMap3D'));
class FarmSceneBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <p>3D could not load. Select 2D plots to continue.</p> : this.props.children; }
}


const IPFS_GATEWAY = (
  process.env.REACT_APP_IPFS_GATEWAY || 'https://maestrobeatz.servegame.com/ipfs'
).replace(/\/$/, '');

function toIpfsUrl(image) {
  if (!image) return null;
  const s = String(image).trim();
  if (s.includes('/ipfs/')) return `${IPFS_GATEWAY}/${s.split('/ipfs/')[1]}`;
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

export default function FarmPlotsGrid({
  farm,
  farmId,
  onChanged,
  refreshNonce,
  showMyPlotsOnly = false,
  ownerFilter = '', // ✅ filter toggle
}) {
  const { session } = useSession();
  const wallet = session?.actor;

  const [view3D, setView3D] = useState(true);
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
  const chainOffset=useRef(0);

  const fetchChainTime = useCallback(async () => {
    try {
      const data = await getWaxRpc('/v1/chain/get_info');
      const headBlockTime = parseEosioTimeMs(data.head_block_time);
      if (headBlockTime != null) {chainOffset.current=headBlockTime-Date.now();setBlockchainTime(headBlockTime);}
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
      setBlockchainTime(Date.now()+chainOffset.current);
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
  }, [wallet, fetchSeedStatus, refreshNonce]);

  const planting = usePlantingCapacity({ wallet, farmId,
    batch: seedStatus?.batches?.find(b => Number(b.qty) > 0), refreshNonce, pending: slotPending });
  const getPlantBatch = useCallback(() => {
    if (!planting.capacity) return null;
    return (seedStatus?.batches || []).find(b => Number(b.qty) > 0) || null;
  }, [seedStatus, planting.capacity]);

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
      onChanged?.({ type: 'plot_watered', farmId, plotAssetId: plot.plot_asset_id });
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
      onChanged?.({ type: 'plot_harvested', farmId, plotAssetId: plot.plot_asset_id });
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
      setTxError('Planting requires a seed, compost, and enough player and farm energy.');
      return;
    }

    const key = `plant-${plotAssetId}-${slotIndex}`;
    setSlotPending(key);

    try {
      if (await planting.refresh() < 1) throw new Error('Not enough seeds, compost, or energy to plant.');
      await plantSlot({
        actor: wallet,
        plotAssetId: Number(plotAssetId),
        slotIndex: Number(slotIndex),
        seedTemplateId: Number(batch.seed_tpl_id),
        seedBatchId: Number(batch.seed_asset_id),
      });

      await fetchPlots();
      await fetchSeedStatus(wallet);
      onChanged?.({ type: 'plot_planted', farmId, plotAssetId });
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
  const getWaterLabel = useCallback(slot=>{
    const {waterMs}=farmTimers(slot,blockchainTime);
    return waterMs===null ? null : waterMs===0 ? 'READY' : formatFarmTime(waterMs);
  },[blockchainTime]);
  const getHarvestLabel = useCallback(slot=>harvestLabel(slot,blockchainTime),[blockchainTime]);

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

      <p className="farm-timer-note">Harvest estimates assume you water as soon as each tick is ready. Waiting to water extends the estimate.</p><div className="farm-view-toggle" aria-label="Farm view"><button aria-pressed={!view3D} onClick={()=>setView3D(false)}>2D plots</button><button aria-pressed={view3D} onClick={()=>setView3D(true)}>3D farm</button></div>
      {view3D ? <FarmSceneBoundary><Suspense fallback={<p>Preparing your farm…</p>}><FarmMap3D farm={farm} plots={visiblePlots} onInspect={openSlotDetails} actions={{renderFarm:()=><FarmPlotStakeControl key={`${wallet}:${farmId}`} wallet={wallet} farmId={farmId} blocked={Boolean(slotPending) || waterAllPending} onChanged={async event=>{ await fetchPlots(); await onChanged?.(event); }} />,renderPlot:(plot)=><PlotUnstakeControl plot={plot} wallet={wallet} pending={Boolean(slotPending) || waterAllPending} unstaking={slotPending===`unstake-plot-${plot.plot_asset_id}`} onUnstake={handleUnstakePlot} />,emptyLabel:(plot)=>String(plot.owner)===String(wallet) ? planting.message : 'Empty plot',waterLabel:getWaterLabel,harvestLabel:getHarvestLabel,render:(plot,slot)=>{
        const owned = Boolean(wallet) && String(plot.owner)===String(wallet);
        const pending = Boolean(slotPending) || waterAllPending;
        const state = String(slot.state || '').toUpperCase();
        return <>
          {state==='EMPTY' && owned && <small role="status">{planting.message}</small>}
          {state==='EMPTY' && <button disabled={!owned || pending || !getPlantBatch()} onClick={()=>handlePlant({plotAssetId:plot.plot_asset_id,slotIndex:slot.index})}>Plant seed</button>}
          {state==='GROWING' && <button disabled={!owned || pending || getWaterLabel(slot)!=='READY'} onClick={()=>handleWater(plot,slot)}>Water · {getWaterLabel(slot) || 'Checking…'}</button>}
          {state==='READY' && <button disabled={!owned || pending} onClick={()=>handleHarvest(plot,slot)}>Harvest</button>}
          {!owned && <small>Only the owner can manage this plot.</small>}
        </>;
      }}} /></Suspense></FarmSceneBoundary> : <div className="farm-plots-grid">
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
                      {(slot.state==='GROWING'||slot.state==='READY') && <div className="plot-timer-summary"><strong>{slot.state==='READY'?'Harvest ready':getWaterLabel(slot)==='READY'?'Water ready':getWaterLabel(slot)?`Water in ${getWaterLabel(slot)}`:'Checking water timer…'}</strong>{slot.state==='GROWING' && <small>{getHarvestLabel(slot)}<br/>{farmTimers(slot,blockchainTime).remainingTicks ?? '—'} waterings left</small>}</div>}
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
                        {isEmpty && isOwner && <small role="status" style={{display:'block'}}>{planting.message}</small>}
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
                                ? planting.message
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
      </div>}

      {/* Modal */}
      {selectedSlot && (
        <FarmSlotModal
          waterLabel={selectedSlot?.slot ? getWaterLabel(selectedSlot.slot) : null}
          harvestLabel={selectedSlot?.slot ? getHarvestLabel(selectedSlot.slot) : null}
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
