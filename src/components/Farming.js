// src/components/Farming.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './Farming.css';

import useSession from '../hooks/useSession';
import Weather from './Weather';
import EnergyCellSection from './EnergyCellSection';
import FarmToday from './FarmToday';
import FarmDisplay from './FarmDisplay';
import SelectCellModal from './SelectCellModal';
import CharacterLoadout from './CharacterLoadout';
import BagPanel from './BagPanel';
import FarmRechargeModal from './FarmRechargeModal';
import PlayerStatusBar from './PlayerStatusBar';
import UnequippedTools from './UnequippedTools';
import QuickBagPicker from './QuickBagPicker';

import { stakeFarm, unstakeFarm, rechargeFarm } from '../services/farmActions';
import { stakeFarmCell, unstakeFarmCell } from '../services/farmCellActions';
import { rechargeUserEnergy } from '../services/userEnergyActions';
import { depositCompost, depositPack } from '../services/depositActions';
import { claimSeedRewards } from '../services/rewardActions';
import { usePlayerResources } from '../hooks/PlayerResourcesContext';
import { plantSlot } from '../services/plantActions';
import { unequipTool } from '../services/toolEquipActions';


export default function Farming() {
  const { session } = useSession();
  const { resources, refreshResources } = usePlayerResources();
  const wallet = session?.actor;

  const API = process.env.REACT_APP_API_BASE_URL;

  const [weather, setWeather] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(false);

  const [farmInfo, setFarmInfo] = useState({ staked: [], unstaked: [], cells: [] });
  const [allFarms, setAllFarms] = useState([]);
  const [pendingAction, setPendingAction] = useState(null);
  const [showCellModal, setShowCellModal] = useState(false);
  const [rechargeFarmTarget, setRechargeFarmTarget] = useState(null);
  const [selectedFarmId, setSelectedFarmId] = useState(null);
  const [farmError, setFarmError] = useState(null);

  const [inventory, setInventory] = useState(null);

  // ✅ Split into warning vs hard error
  const [inventoryWarning, setInventoryWarning] = useState(null);
  const [inventoryError, setInventoryError] = useState(null);

  const [recharging, setRecharging] = useState(false);
  const [toolPending, setToolPending] = useState(null);

  const [playerStatus, setPlayerStatus] = useState(null);
  const [playerStatusError, setPlayerStatusError] = useState(null);
  const [loadingPlayerStatus, setLoadingPlayerStatus] = useState(false);
  const [claimingRewards, setClaimingRewards] = useState(false);
  const [quickBagCategory, setQuickBagCategory] = useState(null);
  const [quickBagPending, setQuickBagPending] = useState(null);

  // ✅ force BagPanel to refetch after stake/unstake operations
  const [bagRefreshNonce, setBagRefreshNonce] = useState(0);

  // --------------------------------------------------
  // Global: Weather + All Farms
  // --------------------------------------------------
  useEffect(() => {
    const fetchData = async () => {
      setLoadingWeather(true);
      try {
        const [weatherRes, farmsRes] = await Promise.all([
          axios.get(`${API}/weather/current`),
          axios.get(`${API}/api/farms`),
        ]);
        setWeather(weatherRes.data);
        setAllFarms(farmsRes.data.farms || []);
      } catch (err) {
        console.error('Error loading global data:', err);
      } finally {
        setLoadingWeather(false);
      }
    };
    if (API) fetchData();
  }, [API]);

  // --------------------------------------------------
  // Farms (user + global)
  // --------------------------------------------------
  const refreshFarms = useCallback(async () => {
    if (!wallet) return;
    try {
      const [farmsRes, userRes] = await Promise.all([
        axios.get(`${API}/api/farms`),
        axios.get(`${API}/nfts/farm/${wallet}`),
      ]);

      setAllFarms(farmsRes.data.farms || []);
      setFarmInfo({
        staked: userRes.data.staked || [],
        unstaked: userRes.data.unstaked || [],
        cells: userRes.data.cells || [],
      });
      setFarmError(null);
    } catch (err) {
      console.error('Error refreshing farms:', err);
      setFarmError('Could not load your farms');
    }
  }, [API, wallet]);

  const pollRefreshFarms = useCallback(
    async ({ tries = 6, delayMs = 800 } = {}) => {
      for (let i = 0; i < tries; i++) {
        // eslint-disable-next-line no-await-in-loop
        await refreshFarms();
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, delayMs));
      }
    },
    [refreshFarms]
  );

  useEffect(() => {
    if (!wallet) return;
    refreshFarms();
  }, [wallet, refreshFarms]);

  // --------------------------------------------------
  // Inventory
  // --------------------------------------------------
  const loadInventory = useCallback(
    async (account, { tries = 1, delayMs = 600 } = {}) => {
      if (!account) return;

      setInventoryError(null);
      setInventoryWarning(null);

      let lastErr = null;

      for (let attempt = 0; attempt < tries; attempt++) {
        try {
          const results = await Promise.allSettled([
            axios.get(`${API}/inventory/${account}`, {
              params: { _: Date.now() },
            }),
            axios.get(`${API}/userenergy/${account}`, {
              params: { _: Date.now() },
            }),
          ]);

          const invOk = results[0].status === 'fulfilled';
          const ueOk = results[1].status === 'fulfilled';

          const inv = invOk ? results[0].value.data : {};
          const ue = ueOk ? results[1].value.data : {};

          if (!invOk && !ueOk) throw new Error('BOTH_FAILED');

          const merged = {
            ...inv,
            account: inv.account || ue.account || account,
            cells: {
              ...(inv.cells || {}),
              energy: Number(ue.energy ?? inv?.cells?.energy ?? 0),
              max: Number(ue.max ?? inv?.cells?.max ?? 0),
              cell_count: Number(ue.count ?? inv?.cells?.cell_count ?? 0),
              total_staked: Number(ue.total_staked ?? inv?.cells?.total_staked ?? 0),
              staked: Array.isArray(ue.staked) ? ue.staked : inv?.cells?.staked || [],
              unstaked: Array.isArray(inv?.cells?.unstaked) ? inv.cells.unstaked : [],
            },
          };

          setInventory(merged);

          if (!invOk && ueOk) {
            setInventoryWarning(
              'Inventory is still loading (AtomicAssets can be slow). Energy is up to date.'
            );
          } else {
            setInventoryWarning(null);
          }

          setInventoryError(null);
          return;
        } catch (e) {
          lastErr = e;
          // eslint-disable-next-line no-await-in-loop
          await new Promise((r) => setTimeout(r, delayMs));
        }
      }

      console.error('Error loading inventory:', lastErr);

      if (String(lastErr?.message || '').includes('BOTH_FAILED')) {
        setInventoryError('Could not load your inventory (and energy). Please try again.');
      } else {
        setInventoryWarning('Some data is still loading. Energy should be up to date.');
      }
    },
    [API]
  );

  useEffect(() => {
    if (!wallet) return;
    loadInventory(wallet, { tries: 2, delayMs: 600 });
  }, [wallet, loadInventory]);

  // --------------------------------------------------
  // Player Status
  // --------------------------------------------------
  useEffect(() => {
    if (!wallet) {
      setPlayerStatus(null);
      setPlayerStatusError(null);
      return;
    }

    const fetchPlayerStatus = async () => {
      setLoadingPlayerStatus(true);
      try {
        const res = await axios.get(`${API}/api/player/${wallet}/status`);
        setPlayerStatus(res.data);
        setPlayerStatusError(null);
      } catch (err) {
        console.error('Error loading player status:', err);
        setPlayerStatusError('Could not load player status');
      } finally {
        setLoadingPlayerStatus(false);
      }
    };

    fetchPlayerStatus();
  }, [API, wallet]);

  // --------------------------------------------------
  // Battery modal
  // --------------------------------------------------
  const openCellModal = (farmId) => {
    setSelectedFarmId(farmId);
    setShowCellModal(true);
  };

  const handleCellConfirm = async (cellAssetId) => {
    setPendingAction(`cell-${cellAssetId}`);
    try {
      await stakeFarmCell(wallet, selectedFarmId, cellAssetId);
      await pollRefreshFarms({ tries: 4, delayMs: 700 });
      await loadInventory(wallet, { tries: 2, delayMs: 600 });
      setBagRefreshNonce((n) => n + 1);
    } catch (err) {
      console.error('Error staking cell:', err);
    } finally {
      setPendingAction(null);
      setShowCellModal(false);
      setSelectedFarmId(null);
    }
  };

  // --------------------------------------------------
  // Farm stake / unstake
  // --------------------------------------------------
  const handleFarmStake = async (farm) => {
    setPendingAction(`farm-${farm.asset_id}`);
    try {
      await stakeFarm(wallet, farm.asset_id, farm.template_id);
      await pollRefreshFarms({ tries: 4, delayMs: 700 });
      setBagRefreshNonce((n) => n + 1);
    } catch (err) {
      console.error('Error staking farm:', err);
    } finally {
      setPendingAction(null);
    }
  };

  const handleFarmUnstake = async (farm) => {
    setPendingAction(`farm-${farm.asset_id}`);
    try {
      await unstakeFarm(wallet, farm.asset_id);
      await pollRefreshFarms({ tries: 6, delayMs: 800 });
      setBagRefreshNonce((n) => n + 1);
    } catch (err) {
      console.error('Error unstaking farm:', err);
    } finally {
      setPendingAction(null);
    }
  };

  // --------------------------------------------------
  // Recharge USER energy
  // --------------------------------------------------
  const handleRechargeEnergy = async () => {
    if (!wallet) {
      alert('Please connect your wallet first.');
      return;
    }

    const amountStr = window.prompt(
      'How much CINDER do you want to spend to recharge energy?',
      '1.0'
    );
    if (!amountStr) return;

    const amount = Number(amountStr);
    if (!Number.isFinite(amount) || amount <= 0) {
      alert('Invalid amount.');
      return;
    }

    try {
      setRecharging(true);
      await rechargeUserEnergy(amount);
      await loadInventory(wallet, { tries: 3, delayMs: 700 });
      setBagRefreshNonce((n) => n + 1);
    } catch (err) {
      console.error('Recharge failed:', err);
      alert('Recharge failed. Check console for details.');
    } finally {
      setRecharging(false);
    }
  };

  // --------------------------------------------------
  // Recharge FARM energy
  // --------------------------------------------------
  const handleRechargeFarm = useCallback(
    (farm) => {
      if (!wallet) {
        alert('Please connect your wallet first.');
        return;
      }
      if (!farm?.asset_id) return;
      setRechargeFarmTarget(farm);
    },
    [wallet]
  );

  const handleConfirmFarmRecharge = useCallback(
    async (amount) => {
      const farmId = rechargeFarmTarget?.asset_id;
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error('Recharge amount must be greater than zero.');
      }
      if (!farmId) throw new Error('No farm selected for recharge.');

      const qty = `${amount.toFixed(6)} CINDER`;
      const key = `recharge-${String(farmId)}`;

      try {
        setPendingAction(key);
        await rechargeFarm(wallet, String(farmId), qty);
        await pollRefreshFarms({ tries: 6, delayMs: 800 });
        await loadInventory(wallet, { tries: 2, delayMs: 600 });
        setRechargeFarmTarget(null);
      } catch (err) {
        console.error('Farm recharge failed:', err);
        throw err;
      } finally {
        setPendingAction(null);
        setBagRefreshNonce((n) => n + 1);
      }
    },
    [wallet, rechargeFarmTarget, pollRefreshFarms, loadInventory]
  );

  // --------------------------------------------------
  // Rewards
  // --------------------------------------------------
  const handleClaimRewards = async () => {
    if (!wallet) return;
    const previousRewards = JSON.stringify(playerStatus?.rewards ?? null);

    try {
      setClaimingRewards(true);
      await claimSeedRewards(wallet);

      for (let attempt = 0; attempt < 8; attempt += 1) {
        if (attempt > 0) {
          // Give the backend indexer time to observe the confirmed transaction.
          // eslint-disable-next-line no-await-in-loop
          await new Promise((resolve) => setTimeout(resolve, 800));
        }

        // eslint-disable-next-line no-await-in-loop
        const res = await axios.get(`${API}/api/player/${wallet}/status`, {
          params: { _: Date.now() },
        });
        setPlayerStatus(res.data);
        setPlayerStatusError(null);

        if (JSON.stringify(res.data?.rewards ?? null) !== previousRewards) break;
      }

      await refreshResources();
    } catch (err) {
      console.error('Error claiming rewards:', err);
      setPlayerStatusError('Failed to claim rewards');
    } finally {
      setClaimingRewards(false);
    }
  };

  const handleQuickBagAction = async (asset) => {
    if (!wallet || !quickBagCategory || quickBagPending) return;
    const assetId = String(asset?.asset_id || '');
    if (!assetId) return;

    try {
      setQuickBagPending(assetId);
      if (quickBagCategory === 'seeds') await depositPack(wallet, assetId);
      else if (quickBagCategory === 'compost') await depositCompost(wallet, assetId);

      for (let attempt = 0; attempt < 6; attempt += 1) {
        if (attempt > 0) {
          // eslint-disable-next-line no-await-in-loop
          await new Promise((resolve) => setTimeout(resolve, 700));
        }
        // eslint-disable-next-line no-await-in-loop
        const response = await axios.get(`${API}/api/player/${wallet}/status`, {
          params: { _: Date.now() },
        });
        setPlayerStatus(response.data);
        setPlayerStatusError(null);
      }

      await loadInventory(wallet, { tries: 2, delayMs: 600 });
      setBagRefreshNonce((value) => value + 1);
      setQuickBagCategory(null);
    } catch (error) {
      console.error('Quick Field Bag action failed:', error);
      setPlayerStatusError(error?.message || 'Field Bag action failed');
    } finally {
      setQuickBagPending(null);
    }
  };

  // --------------------------------------------------
  // Child change handlers
  // --------------------------------------------------
  const handleFarmChanged = useCallback(
    async (_evt) => {
      try {
        await pollRefreshFarms({ tries: 6, delayMs: 800 });
        await loadInventory(wallet, { tries: 2, delayMs: 600 });
      } finally {
        setBagRefreshNonce((n) => n + 1);
      }
    },
    [pollRefreshFarms, loadInventory, wallet]
  );

  const handleBagChanged = useCallback(async () => {
    try {
      await pollRefreshFarms({ tries: 4, delayMs: 700 });
      await loadInventory(wallet, { tries: 2, delayMs: 600 });
    } finally {
      setBagRefreshNonce((n) => n + 1);
    }
  }, [pollRefreshFarms, loadInventory, wallet]);

  return (
    <div className="farming-container">
      {inventory && (
        <EnergyCellSection
          cells={inventory.cells}
          accountName={wallet}
          onRefresh={() => loadInventory(wallet, { tries: 2, delayMs: 600 })}
          toolPending={toolPending}
          mode="summary"
        />
      )}

      <Weather weather={weather} loading={loadingWeather} />

      <PlayerStatusBar
        status={playerStatus}
        error={playerStatusError}
        loading={loadingPlayerStatus}
        onClaimRewards={handleClaimRewards}
        claimingRewards={claimingRewards}
        onAddSeeds={() => setQuickBagCategory('seeds')}
        onAddCompost={() => setQuickBagCategory('compost')}
      />

      <FarmToday wallet={wallet} refreshNonce={bagRefreshNonce} />

      {farmError && <div className="error">{farmError}</div>}
      {inventoryError && <div className="error">{inventoryError}</div>}
      {inventoryWarning && <div className="warning">{inventoryWarning}</div>}

      <FarmDisplay
        farmInfo={farmInfo}
        allFarms={allFarms}
        pendingAction={pendingAction}
        onStakeFarm={handleFarmStake}
        onUnstakeFarm={handleFarmUnstake}
        onStakeCell={openCellModal}
        onUnstakeCell={async (farmId) => {
          setPendingAction(`cell-un-${farmId}`);
          try {
            await unstakeFarmCell(wallet, farmId);
            await pollRefreshFarms({ tries: 6, delayMs: 800 });
            await loadInventory(wallet, { tries: 2, delayMs: 600 });
            setBagRefreshNonce((n) => n + 1);
          } finally {
            setPendingAction(null);
          }
        }}
        onRechargeFarm={handleRechargeFarm}
        onPlantSlot={plantSlot}
        onChanged={handleFarmChanged}
        refreshNonce={bagRefreshNonce}
        wallet={wallet}
      />

      <details className="farm-game-panel">
        <summary>
          <span><b>⚙️ Farm Loadout</b><small>Energy core, equipped tools, and staked equipment</small></span>
          <span className="farm-game-panel-action">Manage</span>
        </summary>
        <div className="farm-game-panel-content">
          {inventory && (
            <CharacterLoadout
              inventory={inventory}
              onRechargeEnergy={handleRechargeEnergy}
              recharging={recharging}
              onUnequipTool={async (slot) => {
                if (!wallet || !inventory?.tools?.equipped?.[slot]) return;
                try {
                  setToolPending(`unequip-${slot}`);
                  await unequipTool({ actor: wallet, slot });
                  await loadInventory(wallet, { tries: 2, delayMs: 600 });
                  setBagRefreshNonce((n) => n + 1);
                } finally {
                  setToolPending(null);
                }
              }}
              toolPending={toolPending}
              accountName={wallet}
              onRefreshInventory={async () => loadInventory(wallet, { tries: 2, delayMs: 600 })}
            />
          )}
          <UnequippedTools
            actor={wallet}
            onChanged={() => loadInventory(wallet, { tries: 2, delayMs: 600 })}
          />
        </div>
      </details>

      <details className="farm-game-panel">
        <summary>
          <span><b>🎒 Farm Inventory</b><small>Seeds, compost, plots, packs, and supplies</small></span>
          <span className="farm-game-panel-action">Open Bag</span>
        </summary>
        <div className="farm-game-panel-content">
          <BagPanel
            wallet={wallet}
            farms={allFarms}
            refreshNonce={bagRefreshNonce}
            onChanged={handleBagChanged}
          />
        </div>
      </details>

      <QuickBagPicker
        open={Boolean(quickBagCategory)}
        wallet={wallet}
        category={quickBagCategory}
        title={quickBagCategory === 'seeds' ? 'Choose a Seed Pack' : 'Choose Compost'}
        actionLabel={quickBagCategory === 'seeds' ? 'Open Seed Pack' : 'Deposit Compost'}
        pendingAssetId={quickBagPending}
        onConfirm={handleQuickBagAction}
        onClose={() => !quickBagPending && setQuickBagCategory(null)}
      />

      {showCellModal && (
        <SelectCellModal
          cells={farmInfo.cells}
          onConfirm={handleCellConfirm}
          onCancel={() => {
            setShowCellModal(false);
            setSelectedFarmId(null);
          }}
        />
      )}

      {rechargeFarmTarget && (
        <FarmRechargeModal
          farm={rechargeFarmTarget}
          cinderBalance={resources?.cinder?.amount || 0}
          pending={pendingAction === `recharge-${String(rechargeFarmTarget.asset_id)}`}
          onConfirm={handleConfirmFarmRecharge}
          onClose={() => {
            if (!pendingAction) setRechargeFarmTarget(null);
          }}
        />
      )}
    </div>
  );
}
