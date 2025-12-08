// src/components/Farming.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Farming.css';
import useSession from '../hooks/useSession';
import Weather from './Weather';
import FarmDisplay from './FarmDisplay';
import SelectCellModal from './SelectCellModal';
import { stakeFarm, unstakeFarm } from '../services/farmActions';
import { stakeFarmCell, unstakeFarmCell } from '../services/farmCellActions';
import CharacterLoadout from './CharacterLoadout';
import BagPanel from './BagPanel';
import { rechargeUserEnergy } from '../services/userEnergyActions';
import PlayerStatusBar from './PlayerStatusBar';
import { claimSeedRewards } from '../services/rewardActions';

export default function Farming() {
  const { session } = useSession();
  const wallet = session?.actor;

  const [weather, setWeather] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(false);

  const [farmInfo, setFarmInfo] = useState({
    staked: [],
    unstaked: [],
    cells: [],
  });
  const [allFarms, setAllFarms] = useState([]);
  const [pendingAction, setPendingAction] = useState(null);
  const [showCellModal, setShowCellModal] = useState(false);
  const [selectedFarmId, setSelectedFarmId] = useState(null);
  const [farmError, setFarmError] = useState(null);

  // Inventory (user energy cell + equipped tools)
  const [inventory, setInventory] = useState(null);
  const [inventoryError, setInventoryError] = useState(null);
  const [recharging, setRecharging] = useState(false);

  // Player status (in-game seeds, compost, rewards)
  const [playerStatus, setPlayerStatus] = useState(null);
  const [playerStatusError, setPlayerStatusError] = useState(null);
  const [loadingPlayerStatus, setLoadingPlayerStatus] = useState(false);
  const [claimingRewards, setClaimingRewards] = useState(false);

  // ---------------------------------------------------------------------------
  // Fetch global farms and weather
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const fetchData = async () => {
      setLoadingWeather(true);
      try {
        const [weatherRes, farmsRes] = await Promise.all([
          axios.get(
            `${process.env.REACT_APP_API_BASE_URL}/weather/current`
          ),
          axios.get(
            `${process.env.REACT_APP_API_BASE_URL}/api/farms`
          ),
        ]);
        setWeather(weatherRes.data);
        setAllFarms(farmsRes.data.farms || []);
      } catch (err) {
        console.error('Error loading global data:', err);
      } finally {
        setLoadingWeather(false);
      }
    };
    fetchData();
  }, []);

  // ---------------------------------------------------------------------------
  // Fetch user farms and cells
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!wallet) return;

    const fetchUserData = async () => {
      try {
        const farmRes = await axios.get(
          `${process.env.REACT_APP_API_BASE_URL}/nfts/farm/${wallet}`
        );
        setFarmInfo({
          staked: farmRes.data.staked || [],
          unstaked: farmRes.data.unstaked || [],
          cells: farmRes.data.cells || [],
        });
        setFarmError(null);
      } catch (err) {
        console.error('Error loading user farms:', err);
        setFarmError('Could not load your farms');
      }
    };

    fetchUserData();
  }, [wallet]);

  // ---------------------------------------------------------------------------
  // Fetch user inventory (userenergy + equipped tools)
  // ---------------------------------------------------------------------------
  const loadInventory = async (account) => {
    if (!account) return;

    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/inventory/${account}`
      );
      setInventory(res.data);
      setInventoryError(null);
    } catch (err) {
      console.error('Error loading inventory:', err);
      setInventoryError('Could not load your inventory');
    }
  };

  useEffect(() => {
    if (!wallet) return;
    loadInventory(wallet);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet]);

  // ---------------------------------------------------------------------------
  // Fetch player status (seeds / compost / rewards)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!wallet) {
      setPlayerStatus(null);
      setPlayerStatusError(null);
      return;
    }

    const fetchPlayerStatus = async () => {
      setLoadingPlayerStatus(true);
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_BASE_URL}/api/player/${wallet}/status`
        );
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
  }, [wallet]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const openCellModal = (farmId) => {
    setSelectedFarmId(farmId);
    setShowCellModal(true);
  };

  const handleCellConfirm = async (cellAssetId) => {
    setPendingAction(`cell-${cellAssetId}`);
    try {
      await stakeFarmCell(wallet, selectedFarmId, cellAssetId);
      // refresh both global and user data
      const [farmsRes, userRes] = await Promise.all([
        axios.get(
          `${process.env.REACT_APP_API_BASE_URL}/api/farms`
        ),
        axios.get(
          `${process.env.REACT_APP_API_BASE_URL}/nfts/farm/${wallet}`
        ),
      ]);
      setAllFarms(farmsRes.data.farms || []);
      setFarmInfo({
        staked: userRes.data.staked || [],
        unstaked: userRes.data.unstaked || [],
        cells: userRes.data.cells || [],
      });
    } catch (err) {
      console.error('Error staking cell:', err);
    } finally {
      setPendingAction(null);
      setShowCellModal(false);
      setSelectedFarmId(null);
    }
  };

  const handleCellCancel = () => {
    setShowCellModal(false);
    setSelectedFarmId(null);
  };

  const handleFarmStake = async (farm) => {
    setPendingAction(`farm-${farm.asset_id}`);
    try {
      await stakeFarm(wallet, farm.asset_id);
      const [farmsRes, userRes] = await Promise.all([
        axios.get(
          `${process.env.REACT_APP_API_BASE_URL}/api/farms`
        ),
        axios.get(
          `${process.env.REACT_APP_API_BASE_URL}/nfts/farm/${wallet}`
        ),
      ]);
      setAllFarms(farmsRes.data.farms || []);
      setFarmInfo({
        staked: userRes.data.staked || [],
        unstaked: userRes.data.unstaked || [],
        cells: userRes.data.cells || [],
      });
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
      const [farmsRes, userRes] = await Promise.all([
        axios.get(
          `${process.env.REACT_APP_API_BASE_URL}/api/farms`
        ),
        axios.get(
          `${process.env.REACT_APP_API_BASE_URL}/nfts/farm/${wallet}`
        ),
      ]);
      setAllFarms(farmsRes.data.farms || []);
      setFarmInfo({
        staked: userRes.data.staked || [],
        unstaked: userRes.data.unstaked || [],
        cells: userRes.data.cells || [],
      });
    } catch (err) {
      console.error('Error unstaking farm:', err);
    } finally {
      setPendingAction(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Recharge user energy (CINDER -> Recharge User memo)
  // ---------------------------------------------------------------------------
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
    if (isNaN(amount) || amount <= 0) {
      alert('Invalid amount.');
      return;
    }

    try {
      setRecharging(true);
      await rechargeUserEnergy(amount);
      // Refresh inventory to show updated energy
      await loadInventory(wallet);
    } catch (err) {
      console.error('Recharge failed:', err);
      alert('Recharge failed. Check console for details.');
    } finally {
      setRecharging(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Claim pending rewards
  // ---------------------------------------------------------------------------
  const handleClaimRewards = async () => {
    if (!wallet) return;

    try {
      setClaimingRewards(true);
      await claimSeedRewards(wallet);

      const res = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/api/player/${wallet}/status`
      );
      setPlayerStatus(res.data);
      setPlayerStatusError(null);
    } catch (err) {
      console.error('Error claiming rewards:', err);
      setPlayerStatusError('Failed to claim rewards');
    } finally {
      setClaimingRewards(false);
    }
  };

  return (
    <div className="farming-container">
      <Weather weather={weather} loading={loadingWeather} />

      {/* In-game seeds / compost / rewards summary */}
      <PlayerStatusBar
        status={playerStatus}
        error={playerStatusError}
        loading={loadingPlayerStatus}
        onClaimRewards={handleClaimRewards}
        claimingRewards={claimingRewards}
      />

      {farmError && <div className="error">{farmError}</div>}
      {inventoryError && <div className="error">{inventoryError}</div>}

      {/* Player loadout (user cell + equipped tools) */}
      {inventory && (
        <CharacterLoadout
          inventory={inventory}
          onRechargeEnergy={handleRechargeEnergy}
          recharging={recharging}
        />
      )}

      {/* Bag (wallet NFTs: seeds, compost, tools, cores, etc.) */}
      <BagPanel wallet={wallet} />

      {showCellModal && (
        <SelectCellModal
          cells={farmInfo.cells}
          onConfirm={handleCellConfirm}
          onCancel={handleCellCancel}
        />
      )}

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
            const [farmsRes, userRes] = await Promise.all([
              axios.get(
                `${process.env.REACT_APP_API_BASE_URL}/api/farms`
              ),
              axios.get(
                `${process.env.REACT_APP_API_BASE_URL}/nfts/farm/${wallet}`
              ),
            ]);
            setAllFarms(farmsRes.data.farms || []);
            setFarmInfo({
              staked: userRes.data.staked || [],
              unstaked: userRes.data.unstaked || [],
              cells: userRes.data.cells || [],
            });
          } catch (err) {
            console.error('Error unstaking cell:', err);
          } finally {
            setPendingAction(null);
          }
        }}
      />
    </div>
  );
}

