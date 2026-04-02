// src/components/Dashboard.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();

  const [shopSales, setShopSales] = useState([]);
  const [loadingSales, setLoadingSales] = useState(false);

  useEffect(() => {
    setLoadingSales(true);

    axios
      .get(`${process.env.REACT_APP_API_BASE_URL}/shop/sales`)
      .then((res) => {
        setShopSales(res.data.sales || []);
      })
      .catch(console.error)
      .finally(() => setLoadingSales(false));
  }, []);

  const featuredPack =
    shopSales.find((item) => item.category === 'packs') || null;

  return (
    <div className="dashboard-container">
      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1>Game Hub</h1>
          <p className="dashboard-subtitle">
            Manage your packs, crafting, and machines.
          </p>
        </div>

        <section className="dashboard-hub-grid">
          <div className="dashboard-hub-card">
            <div className="dashboard-hub-top">
              <span className="dashboard-hub-badge">Packs</span>
            </div>

            <h2>Open Packs</h2>
            <p>
              View your unopened packs, check drop tables, and open rewards.
            </p>

            <div className="dashboard-hub-meta">
              {loadingSales ? (
                <span>Loading shop...</span>
              ) : featuredPack ? (
                <span>Featured: {featuredPack.name}</span>
              ) : (
                <span>No pack sales found</span>
              )}
            </div>

            <button
              className="dashboard-hub-btn"
              onClick={() => navigate('/packs')}
            >
              Go to Packs
            </button>
          </div>

          <div className="dashboard-hub-card">
            <div className="dashboard-hub-top">
              <span className="dashboard-hub-badge">Blends</span>
            </div>

            <h2>Blend Station</h2>
            <p>
              Craft items, combine assets, and use recipes to progress your game.
            </p>

            <div className="dashboard-hub-meta">
              <span>Use seeds, compost, and tools</span>
            </div>

            <button
              className="dashboard-hub-btn"
              onClick={() => navigate('/blends')}
            >
              Go to Blends
            </button>
          </div>

          <div className="dashboard-hub-card">
            <div className="dashboard-hub-top">
              <span className="dashboard-hub-badge">Machines</span>
            </div>

            <h2>Machines</h2>
            <p>
              Run reactors and production machines to automate your resources.
            </p>

            <div className="dashboard-hub-meta">
              <span>Manage timers and outputs</span>
            </div>

            <button
              className="dashboard-hub-btn"
              onClick={() => navigate('/machines')}
            >
              Open Machines Section
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}