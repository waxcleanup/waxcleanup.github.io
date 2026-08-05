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

function getWeatherIcon(cond) {
  const value = cond.toLowerCase();
  if (value.includes('thunder') || value.includes('lightning')) return '⛈️';
  if (value.includes('snow') || value.includes('blizzard') || value.includes('frigid')) return '❄️';
  if (value.includes('rain') || value.includes('shower') || value.includes('drizzle')) return '🌧️';
  if (value.includes('wind') || value.includes('tornado') || value.includes('hurricane')) return '🌬️';
  if (value.includes('fog') || value.includes('mist') || value.includes('overcast')) return '🌫️';
  if (value.includes('drought') || value.includes('heat')) return '🌡️';
  if (value.includes('cloud')) return '⛅';
  if (value.includes('clear') || value.includes('bloom') || value.includes('dew')) return '☀️';
  return '🌤️';
}

function WeatherScene({ condition }) {
  const value = condition.toLowerCase();
  const isWet = /rain|shower|drizzle|storm|flood|sleet/.test(value);
  const isSnow = /snow|blizzard|frigid/.test(value);
  const isStorm = /thunder|lightning|storm|hurricane|tornado/.test(value);
  const showClouds = !/clear|bloom|dew/.test(value);

  return (
    <div className="weather-scene" aria-hidden="true">
      <svg viewBox="0 0 900 150" role="presentation" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="weatherSky" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#173c35" />
            <stop offset="1" stopColor="#0b1d18" />
          </linearGradient>
          <linearGradient id="weatherField" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#346d3c" />
            <stop offset="1" stopColor="#13291b" />
          </linearGradient>
          <filter id="weatherGlow"><feGaussianBlur stdDeviation="6" /></filter>
        </defs>
        <rect width="900" height="150" rx="16" fill="url(#weatherSky)" />
        <circle className="weather-scene__sun-glow" cx="105" cy="42" r="30" fill="#ffd66b" filter="url(#weatherGlow)" />
        <circle className="weather-scene__sun" cx="105" cy="42" r="18" fill="#ffd66b" />
        <path d="M0 100 Q125 52 245 102 T485 96 T720 100 T900 84 V150 H0Z" fill="#1d5033" />
        <path d="M0 118 Q170 72 350 115 T700 112 T900 100 V150 H0Z" fill="url(#weatherField)" />
        <g className="weather-scene__rows" fill="none" stroke="#b77a37" strokeWidth="3" opacity=".55">
          <path d="M265 150 Q330 118 420 105" /><path d="M360 150 Q410 124 475 108" />
          <path d="M465 150 Q500 127 535 111" /><path d="M580 150 Q598 127 610 111" />
        </g>
        <g className="weather-scene__plants" stroke="#7fe88d" strokeWidth="2" strokeLinecap="round">
          <path d="M650 123v20m0-11-9-6m9 12 10-7" /><path d="M700 114v26m0-17-10-7m10 14 12-8" />
          <path d="M755 121v22m0-13-9-6m9 12 10-7" /><path d="M815 110v31m0-19-12-8m12 15 13-9" />
        </g>
        {showClouds && <g className="weather-scene__clouds" fill="#d8ebe5" opacity=".72">
          <path d="M310 50c2-15 15-25 30-22 8-14 31-13 39 2 19-3 34 9 34 25h-103c-7 0-7-5 0-5Z" />
          <path d="M580 34c2-12 13-20 25-18 7-11 25-10 32 2 15-2 27 7 27 20h-84c-6 0-6-4 0-4Z" />
        </g>}
        {isWet && <g className="weather-scene__rain" stroke="#73cfff" strokeWidth="3" strokeLinecap="round" opacity=".8">
          <path d="M330 65l-7 13m32-13-7 13m32-13-7 13M600 49l-7 13m32-13-7 13" />
        </g>}
        {isSnow && <g className="weather-scene__snow" fill="#fff">
          <circle cx="325" cy="70" r="2"/><circle cx="360" cy="80" r="2"/><circle cx="600" cy="60" r="2"/><circle cx="635" cy="72" r="2"/>
        </g>}
        {isStorm && <path className="weather-scene__lightning" d="M500 35l-14 28h14l-10 25 31-36h-16l12-17Z" fill="#ffe65b" />}
      </svg>
      <span className="weather-scene__label">Live conditions across RhythmFarm</span>
    </div>
  );
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function Weather({ weather, loading }) {
  const condition = weather?.condition || '';
  if (loading) return <p className="farming-status">Loading weather data...</p>;
  if (!weather) return <p className="farming-status">Unable to load weather data.</p>;

  const boost = toNumber(weather.yield_boost);
  const penalty = toNumber(weather.yield_penalty);
  const netImpact = boost - penalty;
  const impactClass = netImpact > 0 ? 'positive' : netImpact < 0 ? 'negative' : 'neutral';
  const impactLabel = netImpact > 0 ? `+${netImpact}% yield` : netImpact < 0 ? `${netImpact}% yield` : 'No yield change';

  return (
    <section className={`weather-card weather-dashboard ${getBackgroundClass(condition)}`} aria-label="Current farming weather">
      <div className="weather-card__glow" aria-hidden="true" />
      <WeatherScene condition={condition} />
      <div className="weather-summary">
        <div className="weather-icon" aria-hidden="true">{getWeatherIcon(condition)}</div>
        <div><div className="weather-eyebrow">Current farm conditions</div><h2 className="weather-condition">{condition || 'Unknown'}</h2><div className="weather-temperature">{weather.temperature}°<span>F</span></div></div>
      </div>
      <div className="weather-metrics">
        <div className="weather-metric"><span className="weather-metric__icon">💧</span><span className="weather-metric__label">Precipitation</span><strong>{weather.precip}%</strong></div>
        <div className="weather-metric"><span className="weather-metric__icon">🌡️</span><span className="weather-metric__label">Humidity</span><strong>{weather.humidity}%</strong></div>
        <div className="weather-metric"><span className="weather-metric__icon">🌬️</span><span className="weather-metric__label">Wind</span><strong>{weather.wind_speed} mph</strong></div>
      </div>
      <div className="weather-impact">
        <div><span className="weather-impact__label">Crop yield impact</span><strong className={`weather-impact__value ${impactClass}`}>{impactLabel}</strong></div>
        <div className="weather-impact__breakdown"><span className="positive">+ {boost}% boost</span><span className="negative">− {penalty}% penalty</span></div>
      </div>
    </section>
  );
}

export default Weather;
