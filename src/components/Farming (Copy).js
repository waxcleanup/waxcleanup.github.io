// src/components/Farming.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Farming.css';

function Farming() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);

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

  // Safely extract weather properties as strings
  const condition = weather?.condition ? String(weather.condition) : '';
  const temperature = weather?.temperature ? String(weather.temperature) : '';
  const precip = weather?.precip ? String(weather.precip) : '';
  const humidity = weather?.humidity ? String(weather.humidity) : '';
  const windSpeed = weather?.wind_speed ? String(weather.wind_speed) : '';
  const yieldBoost = weather?.yield_boost ? String(weather.yield_boost) : '';
  const yieldPenalty = weather?.yield_penalty ? String(weather.yield_penalty) : '';

  // Determine background color for the weather card based on condition
  const getBackgroundColor = (cond) => {
    const lower = cond.toLowerCase();
    if (lower.includes('rain')) return '#a3a3a3';      // Grayish for rainy
    if (lower.includes('overcast') || lower.includes('cloud')) return '#d3d3d3'; // Light gray for overcast/cloudy
    if (lower.includes('sunny')) return '#fffacd';     // Light yellow for sunny
    if (lower.includes('storm')) return '#888888';     // Darker gray for storms
    // Default background color
    return '#ffffff';
  };

  // Create a style object for the card background
  const cardStyle = {
    backgroundColor: getBackgroundColor(condition),
  };

  return (
    <div className="farming-container">
      {/* Floating clouds */}
      <div className="cloud cloud1"></div>
      <div className="cloud cloud2"></div>
      <div className="cloud cloud3"></div>

      <h2 className="farming-header">🌾 Farming Weather Conditions</h2>
      {loading ? (
        <p className="farming-status">Loading weather data...</p>
      ) : weather ? (
        <div className="weather-card" style={cardStyle}>
          <div className="weather-divider"></div>
          <div className="weather-row"><strong>Condition:</strong> {condition}</div>
          <div className="weather-row"><strong>Temperature:</strong> {temperature}°F</div>
          <div className="weather-row"><strong>Precipitation:</strong> {precip}%</div>
          <div className="weather-row"><strong>Humidity:</strong> {humidity}%</div>
          <div className="weather-row"><strong>Wind Speed:</strong> {windSpeed} mph</div>
          <div className="weather-row"><strong>Boost:</strong> +{yieldBoost}%</div>
          <div className="weather-row"><strong>Penalty:</strong> -{yieldPenalty}%</div>
        </div>
      ) : (
        <p className="farming-status">Unable to load weather data.</p>
      )}
    </div>
  );
}

export default Farming;
