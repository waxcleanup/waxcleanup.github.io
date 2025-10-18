// src/components/Weather.js
import React from 'react';
import './Farming.css';

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

function Weather({ weather, loading }) {
  const condition = weather?.condition || '';

  if (loading) {
    return <p className="farming-status">Loading weather data...</p>;
  }
  if (!weather) {
    return <p className="farming-status">Unable to load weather data.</p>;
  }

  return (
    <>
      {condition.toLowerCase() === 'clear' ? (
        <div className="sun" />
      ) : (
        <>
          <div className="cloud cloud1" />
          <div className="cloud cloud2" />
          <div className="cloud cloud3" />
        </>
      )}
      <h2 className="farming-header">🌾 Farming Weather Conditions</h2>
      <div className={`weather-card ${getBackgroundClass(condition)}`}>
        <div className="weather-divider" />
        <div className="card-title">{condition}</div>
        <div className="temp-row">{weather.temperature}°F</div>
        <div className="weather-row"><strong>Precipitation:</strong> {weather.precip}%</div>
        <div className="weather-row"><strong>Humidity:</strong> {weather.humidity}%</div>
        <div className="weather-row"><strong>Wind Speed:</strong> {weather.wind_speed} mph</div>
        <div className="weather-row"><strong>Boost:</strong> +{weather.yield_boost}%</div>
        <div className="weather-row"><strong>Penalty:</strong> -{weather.yield_penalty}%</div>
      </div>
    </>
  );
}

export default Weather;
