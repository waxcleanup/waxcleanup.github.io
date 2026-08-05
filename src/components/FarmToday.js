import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import './FarmToday.css';

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || '').trim().replace(/\/+$/, '');

function parseChainTime(value) {
  if (!value) return null;
  const text = String(value).trim();
  const time = Date.parse(text.endsWith('Z') ? text : `${text}Z`);
  return Number.isFinite(time) ? time : null;
}

function needsWaterNow(slot, now) {
  if (String(slot?.state || '').toUpperCase() !== 'GROWING') return false;
  if (Number(slot?.tick || 0) === 0) return true;
  const lastAction = parseChainTime(slot?.last_action);
  const secondsPerTick = Number(slot?.seconds_per_tick || 0);
  return lastAction !== null && secondsPerTick > 0
    ? lastAction + secondsPerTick * 1000 <= now
    : false;
}

function scrollToFarm() {
  document.getElementById('global-farm-section')?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
}

export default function FarmToday({ wallet, refreshNonce = 0 }) {
  const account = wallet ? String(wallet) : '';
  const [plots, setPlots] = useState([]);
  const [loading, setLoading] = useState(Boolean(account));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!account) {
      setPlots([]);
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    let active = true;

    (async () => {
      setLoading(true);
      setError('');
      try {
        const first = await axios.get(`${API_BASE_URL}/api/plots/owner/${account}`, {
          params: { page: 1, limit: 100, state: 'all', _: Date.now() },
          signal: controller.signal,
        });
        const firstItems = first.data?.items || [];
        const totalPages = Number(first.data?.pagination?.total_pages || 1);
        const remaining = totalPages > 1
          ? await Promise.all(
              Array.from({ length: totalPages - 1 }, (_, index) => (
                axios.get(`${API_BASE_URL}/api/plots/owner/${account}`, {
                  params: { page: index + 2, limit: 100, state: 'all', _: Date.now() },
                  signal: controller.signal,
                })
              ))
            )
          : [];

        if (active) {
          setPlots([
            ...firstItems,
            ...remaining.flatMap((response) => response.data?.items || []),
          ]);
        }
      } catch (requestError) {
        if (requestError?.code !== 'ERR_CANCELED' && active) {
          setError('Farm tasks are temporarily unavailable.');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [account, refreshNonce]);

  const summary = useMemo(() => {
    const now = Date.now();
    const values = {
      plots: plots.length,
      farms: new Set(),
      empty: 0,
      growing: 0,
      ready: 0,
      water: 0,
    };

    plots.forEach((plot) => {
      if (plot?.farm_id) values.farms.add(String(plot.farm_id));
      (plot?.slots || []).forEach((slot) => {
        const state = String(slot?.state || '').toUpperCase();
        if (state === 'EMPTY') values.empty += 1;
        if (state === 'GROWING') values.growing += 1;
        if (state === 'READY') values.ready += 1;
        if (needsWaterNow(slot, now)) values.water += 1;
      });
    });

    return { ...values, farms: values.farms.size };
  }, [plots]);

  if (!account) {
    return (
      <section className="farm-today farm-today--signed-out">
        <span className="farm-today-icon" aria-hidden="true">🌱</span>
        <div><strong>Your farm is waiting</strong><p>Connect your wallet to see today’s farm tasks.</p></div>
      </section>
    );
  }

  return (
    <section className="farm-today" aria-labelledby="farm-today-title">
      <div className="farm-today-heading">
        <div>
          <span className="farm-today-kicker">Daily field report</span>
          <h2 id="farm-today-title">Today on Your Farm</h2>
          <p>{loading ? 'Checking every field…' : `${summary.plots} plots in the Global Farm`}</p>
        </div>
        <span className="farm-today-season" aria-label="Live farm status">● Live</span>
      </div>

      {error ? <div className="farm-today-error">{error}</div> : (
        <div className="farm-today-grid">
          <button type="button" className={summary.water ? 'needs-action' : ''} onClick={scrollToFarm}>
            <span aria-hidden="true">💧</span><b>{loading ? '—' : summary.water}</b><small>Need water</small>
          </button>
          <button type="button" className={summary.ready ? 'is-ready' : ''} onClick={scrollToFarm}>
            <span aria-hidden="true">🧺</span><b>{loading ? '—' : summary.ready}</b><small>Ready to harvest</small>
          </button>
          <button type="button" onClick={scrollToFarm}>
            <span aria-hidden="true">🌿</span><b>{loading ? '—' : summary.growing}</b><small>Growing</small>
          </button>
          <button type="button" onClick={scrollToFarm}>
            <span aria-hidden="true">🟫</span><b>{loading ? '—' : summary.empty}</b><small>Empty slots</small>
          </button>
        </div>
      )}
    </section>
  );
}
