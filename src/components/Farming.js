// src/components/Farming.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Farming.css';
import useSession from '../hooks/useSession';
import FarmCard from './FarmCard';
import { stakeFarm, unstakeFarm } from '../services/farmActions';
import { stakeFarmCell, unstakeFarmCell } from '../services/farmCellActions';

function Farming() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [farmInfo, setFarmInfo] = useState(null);
  const [farmError, setFarmError] = useState(null);
  const [allFarms, setAllFarms] = useState([]);
  const [pendingAction, setPendingAction] = useState(null);
  const { session } = useSession();
  const wallet = session?.actor;

  useEffect(() => {
    const fetchWeather = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/weather/current`);
        setWeather(res.data);
      } finally {
        setLoading(false);
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
    fetchFarmStatus();
  }, [wallet]);

  const fetchFarmStatus = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/nfts/farm/${wallet}`);
      setFarmInfo(res.data);
    } catch (e) {
      console.error('Failed to fetch farm data:', e);
      setFarmError('Failed to fetch farm data');
    }
  };

  const waitForAssetStatus = async (assetId, type) => {
    for (let i = 0; i < 12; i++) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/nfts/farm/${wallet}`);
      setFarmInfo(res.data);
      const allRes = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/farms`);
      setAllFarms(allRes.data.farms || []);

      const list = (type === 'stake' ? res.data?.staked : res.data?.unstaked) || [];
      if (list.find(f => f.asset_id === assetId)) return;
    }
  };

  const handleFarmStake = async (farm) => {
    try {
      setPendingAction(farm.asset_id);
      await stakeFarm(wallet, farm.asset_id, farm.template_id);
      await waitForAssetStatus(farm.asset_id, 'stake');
    } catch (e) {
      console.error('Stake failed:', e);
      alert('Failed to stake farm: ' + e.message);
    } finally {
      setPendingAction(null);
    }
  };

  const handleFarmUnstake = async (farm) => {
    try {
      setPendingAction(farm.asset_id);
      await unstakeFarm(wallet, farm.asset_id);
      await waitForAssetStatus(farm.asset_id, 'unstake');
    } catch (e) {
      console.error('Unstake failed:', e);
      alert('Failed to unstake farm: ' + e.message);
    } finally {
      setPendingAction(null);
    }
  };

  const handleFarmCellStake = async (farmId, assetId, templateId) => {
    try {
      setPendingAction(assetId);
      await stakeFarmCell(wallet, farmId, assetId, templateId);
      await waitForAssetStatus(assetId, 'stake');
    } catch (e) {
      console.error('Stake Farm Cell failed:', e);
      alert('Failed to stake farm cell: ' + e.message);
    } finally {
      setPendingAction(null);
    }
  };

  const handleFarmCellUnstake = async (farmId) => {
    try {
      setPendingAction(farmId);
      await unstakeFarmCell(wallet, farmId);
      await waitForAssetStatus(farmId, 'unstake');
    } catch (e) {
      console.error('Unstake Farm Cell failed:', e);
      alert('Failed to unstake farm cell: ' + e.message);
    } finally {
      setPendingAction(null);
    }
  };

  const condition = weather?.condition || '';
  const isClear = condition.toLowerCase() === 'clear';
  const backgroundCls = getBackgroundClass(condition);

  const farmsAsObjects = (farmInfo?.unstaked || []).map(f => ({
    asset_id: f.asset_id,
    template_id: f.template_id
  }));

  return (
    <div className="farming-container">
      {isClear ? <div className="sun" /> : (
        <>
          <div className="cloud cloud1" />
          <div className="cloud cloud2" />
          <div className="cloud cloud3" />
        </>
      )}

      <h2 className="farming-header">🌾 Farming Weather Conditions</h2>
      {loading ? (
        <p className="farming-status">Loading weather data...</p>
      ) : weather ? (
        <div className={`weather-card ${backgroundCls}`}>
          <div className="weather-divider" />
          <div className="card-title">{condition}</div>
          <div className="temp-row">{weather.temperature}°F</div>
          <div className="weather-row"><strong>Precipitation:</strong> {weather.precip}%</div>
          <div className="weather-row"><strong>Humidity:</strong> {weather.humidity}%</div>
          <div className="weather-row"><strong>Wind Speed:</strong> {weather.wind_speed} mph</div>
          <div className="weather-row"><strong>Boost:</strong> +{weather.yield_boost}%</div>
          <div className="weather-row"><strong>Penalty:</strong> -{weather.yield_penalty}%</div>
        </div>
      ) : (
        <p className="farming-status">Unable to load weather data.</p>
      )}

      <h2 className="farming-header">🏡 Farm Ownership</h2>
      {farmError ? (
        <p className="farming-status">{farmError}</p>
      ) : farmInfo ? (
        farmInfo.count?.staked + farmInfo.count?.unstaked > 0 ? (
          <div className="farm-status-card">
            <p><strong>Template ID:</strong> {farmInfo.template_id}</p>
            <p><strong>Farms Owned:</strong> {farmInfo.count.staked + farmInfo.count.unstaked}</p>
            <p><strong>Name:</strong> {farmInfo.name}</p>
            {farmInfo.ipfs && <img src={farmInfo.ipfs} alt="Farm" className="farm-nft-image" />}
            {farmInfo.staked.length > 0 && (
              <>
                <p><strong>Staked:</strong></p>
                <ul>
                  {farmInfo.staked.map(f => (
                    <li key={f.asset_id}>
                      {f.asset_id}
                      <button
                        onClick={() => handleFarmUnstake(f)}
                        disabled={pendingAction === f.asset_id}
                      >Unstake Farm</button>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {farmInfo.unstaked.length > 0 && (
              <>
                <p><strong>Unstaked:</strong></p>
                <ul>
                  {farmsAsObjects.map(f => (
                    <li key={f.asset_id}>
                      {f.asset_id}
                      <button
                        onClick={() => handleFarmStake(f)}
                        disabled={pendingAction === f.asset_id}
                      >Stake Farm</button>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {farmInfo.cells?.length > 0 && farmInfo.staked.length > 0 && (
              <>
                <p><strong>Available Farm Cells:</strong></p>
                <ul>
                  {farmInfo.cells.map(cell => (
                    <li key={cell.asset_id}>
                      Cell {cell.asset_id}
                      <button
                        onClick={() => handleFarmCellStake(farmInfo.staked[0].asset_id, cell.asset_id, cell.template_id)}
                        disabled={pendingAction === cell.asset_id}
                      >Stake Cell</button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        ) : (
          <p className="farming-status">You do not currently own a farm NFT.</p>
        )
      ) : (
        <p className="farming-status">Checking for farm ownership...</p>
      )}

      <h2 className="farming-header">📡 Available Farms (Global)</h2>
      {pendingAction && (
        <div className="farm-loading">
          <div className="spinner" />
          ⏳ Updating global farms...
        </div>
      )}
      <div className="farm-card-grid compact-global-farms">
        {allFarms.map(f => <FarmCard key={f.asset_id} farm={f} />)}
      </div>
    </div>
  );
}

function getBackgroundClass(cond) {
  const map = {
    clear: 'weather-clear', cloudy: 'weather-cloudy', rain: 'weather-rain',
    'heavy rain': 'weather-heavy-rain', thunderstorm: 'weather-thunderstorm',
    flood: 'weather-flood', tornado: 'weather-tornado', drought: 'weather-drought',
    heatwave: 'weather-heatwave', 'chill setup': 'weather-chill-setup',
    snow: 'weather-snow', sleet: 'weather-sleet', blizzard: 'weather-blizzard',
    windy: 'weather-windy', foggy: 'weather-foggy', hail: 'weather-hail',
    'lightning strike': 'weather-lightning-strike', hurricane: 'weather-hurricane',
    'dust storm': 'weather-dust-storm', drizzle: 'weather-drizzle',
    overcast: 'weather-overcast', 'spring bloom': 'weather-spring-bloom',
    'gentle showers': 'weather-gentle-showers', 'autumn spark': 'weather-autumn-spark',
    'frigid mist': 'weather-frigid-mist', 'evening calm': 'weather-evening-calm',
    'morning dew': 'weather-morning-dew'
  };
  return map[cond.toLowerCase()] || 'weather-default';
}

export default Farming;
