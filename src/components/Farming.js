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

export default function Farming() {
  const { session } = useSession();
  const wallet = session?.actor;

  const [weather, setWeather] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [farmInfo, setFarmInfo] = useState({ staked: [], unstaked: [], cells: [] });
  const [allFarms, setAllFarms] = useState([]);
  const [pendingAction, setPendingAction] = useState(null);
  const [showCellModal, setShowCellModal] = useState(false);
  const [selectedFarmId, setSelectedFarmId] = useState(null);
  const [farmError, setFarmError] = useState(null);

  // Fetch global farms and weather
  useEffect(() => {
    const fetchData = async () => {
      setLoadingWeather(true);
      try {
        const [weatherRes, farmsRes] = await Promise.all([
          axios.get(`${process.env.REACT_APP_API_BASE_URL}/weather/current`),
          axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/farms`)
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

  // Fetch user farms and cells
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
          cells: farmRes.data.cells || []
        });
      } catch (err) {
        console.error('Error loading user farms:', err);
        setFarmError('Could not load your farms');
      }
    };
    fetchUserData();
  }, [wallet]);

  // Handlers
  const openCellModal = farmId => {
    setSelectedFarmId(farmId);
    setShowCellModal(true);
  };

  const handleCellConfirm = async cellAssetId => {
    setPendingAction(`cell-${cellAssetId}`);
    try {
      await stakeFarmCell(wallet, selectedFarmId, cellAssetId);
      // refresh both global and user data
      const [farmsRes, userRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/farms`),
        axios.get(`${process.env.REACT_APP_API_BASE_URL}/nfts/farm/${wallet}`)
      ]);
      setAllFarms(farmsRes.data.farms || []);
      setFarmInfo({
        staked: userRes.data.staked || [],
        unstaked: userRes.data.unstaked || [],
        cells: userRes.data.cells || []
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

  const handleFarmStake = async farm => {
    setPendingAction(`farm-${farm.asset_id}`);
    try {
      await stakeFarm(wallet, farm.asset_id);
      const [farmsRes, userRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/farms`),
        axios.get(`${process.env.REACT_APP_API_BASE_URL}/nfts/farm/${wallet}`)
      ]);
      setAllFarms(farmsRes.data.farms || []);
      setFarmInfo({
        staked: userRes.data.staked || [],
        unstaked: userRes.data.unstaked || [],
        cells: userRes.data.cells || []
      });
    } catch (err) {
      console.error('Error staking farm:', err);
    } finally {
      setPendingAction(null);
    }
  };

  const handleFarmUnstake = async farm => {
    setPendingAction(`farm-${farm.asset_id}`);
    try {
      await unstakeFarm(wallet, farm.asset_id);
      const [farmsRes, userRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/farms`),
        axios.get(`${process.env.REACT_APP_API_BASE_URL}/nfts/farm/${wallet}`)
      ]);
      setAllFarms(farmsRes.data.farms || []);
      setFarmInfo({
        staked: userRes.data.staked || [],
        unstaked: userRes.data.unstaked || [],
        cells: userRes.data.cells || []
      });
    } catch (err) {
      console.error('Error unstaking farm:', err);
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <div className="farming-container">
      <Weather weather={weather} loading={loadingWeather} />
      {farmError && <div className="error">{farmError}</div>}

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
        onUnstakeCell={async farmId => {
          setPendingAction(`cell-un-${farmId}`);
          try {
            await unstakeFarmCell(wallet, farmId);
            const [farmsRes, userRes] = await Promise.all([
              axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/farms`),
              axios.get(`${process.env.REACT_APP_API_BASE_URL}/nfts/farm/${wallet}`)
            ]);
            setAllFarms(farmsRes.data.farms || []);
            setFarmInfo({
              staked: userRes.data.staked || [],
              unstaked: userRes.data.unstaked || [],
              cells: userRes.data.cells || []
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
