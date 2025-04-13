
// src/components/Farming.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Farming.css';
import useSession from '../hooks/useSession';
import FarmSelectionModal from './FarmSelectionModal';
import { stakeFarm } from '../services/farmActions';

function Farming() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [farmInfo, setFarmInfo] = useState(null);
  const [farmError, setFarmError] = useState(null);
  const [showFarmModal, setShowFarmModal] = useState(false);
  const [selectedFarm, setSelectedFarm] = useState(null);
  const { session } = useSession();

  const wallet = session?.actor;

  const fetchFarmInfo = async () => {
    if (!wallet) return;
    try {
      const res = await axios.get(`https://maestrobeatz.servegame.com:3003/nfts/farm/${wallet}`);
      setFarmInfo(res.data);
    } catch (error) {
      console.error('Error fetching farm info:', error);
      setFarmError('Failed to fetch farm data');
    }
  };

  useEffect(() => {
    const fetchWeather = async () => {
      setLoading(true);
      try {
        const res = await axios.get('https://maestrobeatz.servegame.com:3003/weather/current');
        setWeather(res.data);
      } catch (error) {
        console.error('Error fetching weather:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, []);

  useEffect(() => {
    fetchFarmInfo();
  }, [wallet]);

  const handleOpenModal = (farm) => {
    setSelectedFarm(farm);
    setShowFarmModal(true);
  };

  const handleStakeFarm = async (farm) => {
    try {
      await stakeFarm(wallet, farm.asset_id, farm.template_id);
      setShowFarmModal(false);
      await fetchFarmInfo();
    } catch (error) {
      console.error('Failed to stake farm:', error);
    }
  };

  const condition = weather?.condition || '';
  const backgroundClass = getBackgroundClass(condition);
  const isClear = condition.toLowerCase() === 'clear';

  const farmsAsObjects = farmInfo?.unstaked?.map(f => ({
    asset_id: f.asset_id,
    template_id: f.template_id
  })) || [];

  return (
    <div className="farming-container">
      {isClear ? (
        <div className="sun"></div>
      ) : (
        <>
          <div className="cloud cloud1"></div>
          <div className="cloud cloud2"></div>
          <div className="cloud cloud3"></div>
        </>
      )}

      <h2 className="farming-header">🌾 Farming Weather Conditions</h2>
      {loading ? (
        <p className="farming-status">Loading weather data...</p>
      ) : weather ? (
        <div className={`weather-card ${backgroundClass}`}>
          <div className="weather-divider"></div>
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
        farmInfo.count?.staked > 0 || farmInfo.count?.unstaked > 0 ? (
          <div className="farm-status-card">
            <p><strong>Template ID:</strong> {farmInfo.template_id}</p>
            <p><strong>Farms Owned:</strong> {farmInfo.count.staked + farmInfo.count.unstaked}</p>
            <p><strong>Name:</strong> {farmInfo.name}</p>
            {farmInfo.ipfs && (
              <img
                src={farmInfo.ipfs}
                alt="Farm"
                className="farm-nft-image"
                style={{ width: '200px', borderRadius: '12px', marginBottom: '1rem' }}
              />
            )}

            {farmInfo.staked?.length > 0 && (
              <>
                <p><strong>Staked Farms:</strong></p>
                <ul>
                  {farmInfo.staked.map(farm => (
                    <li key={farm.asset_id}>{farm.asset_id}</li>
                  ))}
                </ul>
              </>
            )}

            {farmInfo.unstaked?.length > 0 && (
              <>
                <p><strong>Unstaked Farms:</strong></p>
                <ul>
                  {farmsAsObjects.map(farm => (
                    <li key={farm.asset_id}>
                      {farm.asset_id} <button onClick={() => handleOpenModal(farm)}>Stake Farm</button>
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

      {showFarmModal && selectedFarm && (
        <FarmSelectionModal
          assetId={selectedFarm.asset_id}
          onStake={() => handleStakeFarm(selectedFarm)}
          onClose={() => setShowFarmModal(false)}
          stakedFarms={farmInfo?.staked || []}
          unstakedFarms={farmsAsObjects}
          onFarmSelect={(farm) => handleStakeFarm(farm)}
        />
      )}
    </div>
  );
}

function getBackgroundClass(cond) {
  const weatherClassMap = {
    clear: 'weather-clear',
    cloudy: 'weather-cloudy',
    rain: 'weather-rain',
    'heavy rain': 'weather-heavy-rain',
    thunderstorm: 'weather-thunderstorm',
    flood: 'weather-flood',
    tornado: 'weather-tornado',
    drought: 'weather-drought',
    heatwave: 'weather-heatwave',
    'chill setup': 'weather-chill-setup',
    snow: 'weather-snow',
    sleet: 'weather-sleet',
    blizzard: 'weather-blizzard',
    windy: 'weather-windy',
    foggy: 'weather-foggy',
    hail: 'weather-hail',
    'lightning strike': 'weather-lightning-strike',
    hurricane: 'weather-hurricane',
    'dust storm': 'weather-dust-storm',
    drizzle: 'weather-drizzle',
    overcast: 'weather-overcast',
    'spring bloom': 'weather-spring-bloom',
    'gentle showers': 'weather-gentle-showers',
    'autumn spark': 'weather-autumn-spark',
    'frigid mist': 'weather-frigid-mist',
    'evening calm': 'weather-evening-calm',
    'morning dew': 'weather-morning-dew',
    default: 'weather-default'
  };

  if (!cond) return weatherClassMap.default;
  const lowerCond = cond.toLowerCase();
  for (const [key, className] of Object.entries(weatherClassMap)) {
    if (key !== 'default' && lowerCond.includes(key)) {
      return className;
    }
  }
  return weatherClassMap.default;
}

export default Farming;
