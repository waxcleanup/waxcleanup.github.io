// src/components/FarmPlotsGrid.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './FarmPlotsGrid.css';
import FarmSlotModal from './FarmSlotModal';
import useSession from '../hooks/useSession';
import { waterPlot, harvestPlot } from '../services/plotActions';
import { plantSlot } from '../services/plantActions';
import TomatoGrowthSVG from './TomatoGrowthSVG';

export default function FarmPlotsGrid({ farmId }) {
  const { session } = useSession();
  const wallet = session?.actor;

  const [plots, setPlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Selected slot for details / actions
  const [selectedSlot, setSelectedSlot] = useState(null);

  // TX state
  const [slotPending, setSlotPending] = useState(null);
  const [txError, setTxError] = useState(null);

  // Seed inventory from /api/player/:account/status (seedinv table)
  const [seedStatus, setSeedStatus] = useState(null);

  // ---------------------------------------------------------------------------
  // Fetch plots for this farm
  // ---------------------------------------------------------------------------
  const fetchPlots = async () => {
    if (!farmId) return;

    setLoading(true);
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/api/farms/${farmId}/plots`
      );
      const newPlots = res.data.plots || [];
      setPlots(newPlots);
      setError(null);

      // keep modal slot in sync if it is open
      if (selectedSlot) {
        const updatedPlot = newPlots.find(
          (p) =>
            String(p.plot_asset_id) ===
            String(selectedSlot.plot.plot_asset_id)
        );
        if (updatedPlot) {
          const updatedSlot = updatedPlot.slots.find(
            (s) => s.index === selectedSlot.slot.index
          );
          if (updatedSlot) {
            setSelectedSlot({
              ...selectedSlot,
              plot: updatedPlot,
              slot: updatedSlot,
            });
          }
        }
      }
    } catch (err) {
      console.error('Error loading farm plots:', err);
      setError('Could not load plots for this farm.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmId]);

  // ---------------------------------------------------------------------------
  // Fetch seed inventory for current wallet
  // ---------------------------------------------------------------------------
  const fetchSeedStatus = async (account) => {
    if (!account) {
      setSeedStatus(null);
      return;
    }

    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/api/player/${account}/status`
      );
      setSeedStatus(res.data.seeds || null);
    } catch (err) {
      console.error('Error loading seed status:', err);
      setSeedStatus(null);
    }
  };

  useEffect(() => {
    if (!wallet) {
      setSeedStatus(null);
      return;
    }
    fetchSeedStatus(wallet);
  }, [wallet]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------
  const handleWater = async (plot, slot) => {
    if (!wallet) {
      setTxError('Please connect your wallet to water plots.');
      return;
    }

    const key = `water-${plot.plot_asset_id}-${slot.index}`;
    setSlotPending(key);
    setTxError(null);

    try {
      await waterPlot(wallet, plot.plot_asset_id, slot.index);
      await fetchPlots();
    } catch (err) {
      console.error('Water failed:', err);
      setTxError(err.message || 'Water action failed.');
    } finally {
      setSlotPending(null);
    }
  };

  const handleHarvest = async (plot, slot) => {
    if (!wallet) {
      setTxError('Please connect your wallet to harvest.');
      return;
    }

    const key = `harvest-${plot.plot_asset_id}-${slot.index}`;
    setSlotPending(key);
    setTxError(null);

    try {
      await harvestPlot(wallet, plot.plot_asset_id, slot.index);
      await fetchPlots();
      // optionally refresh seeds here too if harvest can grant seeds
      // await fetchSeedStatus(wallet);
    } catch (err) {
      console.error('Harvest failed:', err);
      setTxError(err.message || 'Harvest action failed.');
    } finally {
      setSlotPending(null);
    }
  };

  // 🌱 Plant using first available seed batch from seedinv
  const handlePlant = async ({ plotAssetId, slotIndex }) => {
    if (!wallet) {
      setTxError('Please connect your wallet to plant.');
      return;
    }

    const batches = seedStatus?.batches || [];
    const batch = batches.find((b) => Number(b.qty || 0) > 0);

    if (!batch) {
      setTxError('No seeds available to plant.');
      return;
    }

    const seedTemplateId = Number(batch.seed_tpl_id);     // uint32_t
    const seedBatchId = Number(batch.seed_asset_id);      // uint64_t

    if (!Number.isFinite(seedTemplateId) || !Number.isFinite(seedBatchId)) {
      console.error('Invalid seed batch data:', batch);
      setTxError('Invalid seed data; cannot plant.');
      return;
    }

    const key = `plant-${plotAssetId}-${slotIndex}`;
    setSlotPending(key);
    setTxError(null);

    try {
      await plantSlot({
        actor: wallet,
        plotAssetId: Number(plotAssetId),
        slotIndex: Number(slotIndex),
        seedTemplateId,
        seedBatchId,
      });

      // refresh plots + seed inventory after planting
      await fetchPlots();
      await fetchSeedStatus(wallet);
    } catch (err) {
      console.error('Plant failed:', err);
      setTxError(err.message || 'Planting failed.');
    } finally {
      setSlotPending(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (loading && !plots.length) {
    return <div className="plots-grid-status">Loading plots…</div>;
  }

  if (error) {
    return <div className="plots-grid-status error">{error}</div>;
  }

  if (!plots.length) {
    return (
      <div className="plots-grid-status">
        No plots staked to this farm yet.
      </div>
    );
  }

  return (
    <>
      {txError && <div className="plots-grid-status error">{txError}</div>}

      <div className="farm-plots-grid">
        {plots.map((plot) => (
          <div key={plot.plot_asset_id} className="plot-card">
            <div className="plot-header">
              {plot.image && (
                <img
                  src={plot.image}
                  alt={plot.name}
                  className="plot-image"
                />
              )}
              <div className="plot-header-text">
                <div className="plot-name">{plot.name}</div>
                <div className="plot-meta">
                  Plot #{String(plot.plot_asset_id).slice(-4)} · Slots:{' '}
                  {plot.capacity}
                </div>
              </div>
            </div>

            <div className={`plot-slots plot-slots-${plot.capacity}`}>
              {plot.slots.map((slot) => {
                const tick = slot.tick || 0;
                const tickGoal = slot.tick_goal || 21;
                const state = slot.state;

                return (
                  <div
                    key={slot.index}
                    className={`plot-slot plot-slot-${state.toLowerCase()}`}
                    title={
                      state === 'EMPTY'
                        ? 'Empty plot slot'
                        : `${state} (${tick}/${tickGoal})`
                    }
                    onClick={() =>
                      setSelectedSlot({
                        farmId,
                        plot,
                        slot,
                      })
                    }
                  >
                    {state === 'GROWING' || state === 'READY' ? (
                      <TomatoGrowthSVG
                        tick={tick}
                        tickGoal={tickGoal}
                        weather="sunny"
                        rarity="common"
                        className="plot-slot-svg"
                      />
                    ) : (
                      ''
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {selectedSlot && (
        <FarmSlotModal
          farmId={selectedSlot.farmId}
          plot={selectedSlot.plot}
          slot={selectedSlot.slot}
          onClose={() => setSelectedSlot(null)}
          onWater={() => handleWater(selectedSlot.plot, selectedSlot.slot)}
          onHarvest={() =>
            handleHarvest(selectedSlot.plot, selectedSlot.slot)
          }
          slotPending={slotPending}
          onPlant={handlePlant}
        />
      )}
    </>
  );
}

