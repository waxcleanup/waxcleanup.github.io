// src/components/Farming.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Farming.css';
import useSession from '../hooks/useSession';
import Weather from './Weather';
import FarmDisplay from './FarmDisplay';
import { stakeFarm, unstakeFarm } from '../services/farmActions';
import { stakeFarmCell, unstakeFarmCell } from '../services/farmCellActions';

function Farming() {
  const [weather, setWeather] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [farmInfo, setFarmInfo] = useState(null);
  const [farmError, setFarmError] = useState(null);
  const [allFarms, setAllFarms] = useState([]);
  const [pendingAction, setPendingAction] = useState(null);
  const { session } = useSession();
  const wallet = session?.actor;

  useEffect(() => {
    const fetchWeather = async () => {
      setLoadingWeather(true);
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/weather/current`);
        setWeather(res.data);
      } finally {
        setLoadingWeather(false);
      }
    };

    const fetchAllFarms = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/farms`);
        setAllFarms(res.data.farms || []);
      } catch (e) {
        console.error(e);
      }
    };

    fetchWeather();
    fetchAllFarms();
  }, []);

  useEffect(() => {
    if (!wallet) return;
    const fetchFarmStatus = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/nfts/farm/${wallet}`);
        setFarmInfo(res.data);
      } catch (e) {
        console.error('Failed to fetch farm data:', e);
        setFarmError('Failed to fetch farm data');
      }
    };
    fetchFarmStatus();
  }, [wallet]);

  const waitForAssetStatus = async (assetId, type) => {
    for (let i = 0; i < 12; i++) {
      await new Promise(res => setTimeout(res, 5000));
      const [statusRes, allRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_BASE_URL}/nfts/farm/${wallet}`),
        axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/farms`)
      ]);
      setFarmInfo(statusRes.data);
      setAllFarms(allRes.data.farms || []);
      const list = (type === 'stake' ? statusRes.data?.staked : statusRes.data?.unstaked) || [];
      if (list.find(f => f.asset_id === assetId)) return;
    }
  };

  const handleFarmStake = async (farm) => {
    setPendingAction(farm.asset_id);
    await stakeFarm(wallet, farm.asset_id, farm.template_id);
    await waitForAssetStatus(farm.asset_id, 'stake');
    setPendingAction(null);
  };

  const handleFarmUnstake = async (farm) => {
    setPendingAction(farm.asset_id);
    await unstakeFarm(wallet, farm.asset_id);
    await waitForAssetStatus(farm.asset_id, 'unstake');
    setPendingAction(null);
  };

  const handleFarmCellStake = async (farmId, assetId, templateId) => {
    setPendingAction(assetId);
    await stakeFarmCell(wallet, farmId, assetId, templateId);
    await waitForAssetStatus(assetId, 'stake');
    setPendingAction(null);
  };

  const handleFarmCellUnstake = async (farmId) => {
    setPendingAction(farmId);
    await unstakeFarmCell(wallet, farmId);
    await waitForAssetStatus(farmId, 'unstake');
    setPendingAction(null);
  };

  const farmsAsObjects = (farmInfo?.unstaked || []).map(f => ({
    asset_id: f.asset_id,
    template_id: f.template_id
  }));

  return (
    <div className="farming-container">
      <Weather weather={weather} loading={loadingWeather} />

      <FarmDisplay
        farmInfo={farmInfo}
        farmError={farmError}
        farmsAsObjects={farmsAsObjects}
        allFarms={allFarms}
        pendingAction={pendingAction}
        onStakeFarm={handleFarmStake}
        onUnstakeFarm={handleFarmUnstake}
        onStakeCell={handleFarmCellStake}
        onUnstakeCell={handleFarmCellUnstake}
      />
    </div>
  );
}

export default Farming;
