// src/components/ActivityFeed.js
import React, { useEffect, useState, useRef, useCallback } from 'react';
import waxGeckoApi from '../services/waxGeckoApi';
import './ActivityFeed.css';

const MAX_EVENTS = 100;
const LOOKBACK_BLOCKS = 50;
const POLL_INTERVAL = 2000;

function normalizeEvent(ev) {
  const blockNum = ev.block?.blockNumber ?? ev.blockNumber ?? '?';
  const tsSecs   = ev.block?.blockTimestamp ?? ev.blockTimestamp;
  return {
    type:        (ev.eventType ?? ev.type ?? 'unknown').toLowerCase(),
    blockNumber: blockNum,
    timestamp:   typeof tsSecs === 'number' ? tsSecs * 1000 : undefined,
    raw:         ev,
  };
}

function fmt(numStr, decimals) {
  const n = parseFloat(numStr);
  if (isNaN(n) || decimals == null) return numStr;
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals
  });
}

export default function ActivityFeed() {
  const [events, setEvents]     = useState([]);
  const [poolInfo, setPoolInfo] = useState({});
  const [prices, setPrices]     = useState({});
  const lastBlockRef            = useRef(0);

  // fetch and cache CoinGecko prices
  const fetchPrices = useCallback(async (ids) => {
    try {
      const res  = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}` +
        `&vs_currencies=usd&include_24hr_change=true`
      );
      const data = await res.json();
      setPrices(prev => ({ ...prev, ...data }));
    } catch {
      // silently ignore
    }
  }, []);

  // load pool info for a given pairId/poolId
  const loadPoolInfo = useCallback(async (pid) => {
    try {
      const pairRes = await waxGeckoApi.get(`/pair?id=${pid}`);
      const { asset0Id, asset1Id, dexKey } = pairRes.data.pair;
      const [r0, r1] = await Promise.all([
        waxGeckoApi.get(`/asset?id=${asset0Id}`),
        waxGeckoApi.get(`/asset?id=${asset1Id}`)
      ]);
      const a0 = r0.data.asset, a1 = r1.data.asset;

      setPoolInfo(prev => ({
        ...prev,
        [pid]: {
          asset0Id, asset1Id, dexKey,
          decimals0: a0.decimals, decimals1: a1.decimals,
          cg0: a0.coinGeckoId,   cg1: a1.coinGeckoId
        }
      }));

      const ids = [a0.coinGeckoId, a1.coinGeckoId].filter(Boolean);
      if (ids.length) fetchPrices(ids);
    } catch {
      // fallback placeholder if the pair lookup fails
      setPoolInfo(prev => ({
        ...prev,
        [pid]: {
          asset0Id: 'UNKNOWN',
          asset1Id: 'UNKNOWN',
          dexKey:   'unknown',
          decimals0: 6,
          decimals1: 6
        }
      }));
    }
  }, [fetchPrices]);

  // Whenever `events` updates, load any missing poolInfo entries
  useEffect(() => {
    const pids = Array.from(new Set(events.map(e => e.raw.pairId ?? e.raw.poolId)));
    pids.forEach(pid => {
      if (pid && !poolInfo[pid]) {
        loadPoolInfo(pid);
      }
    });
  }, [events, poolInfo, loadPoolInfo]);


  // polling new on-chain events
  useEffect(() => {
    let cancelled = false;

    const fetchEvents = async (from, to) => {
      try {
        const resp = await waxGeckoApi.get(`/events?fromBlock=${from}&toBlock=${to}`);
        const raw  = Array.isArray(resp.data.events) ? resp.data.events : resp.data;
        return raw.filter(ev => (ev.eventType ?? ev.type) !== 'fee');
      } catch {
        return [];
      }
    };

    const init = async () => {
      const { data: { block } } = await waxGeckoApi.get('/latest-block');
      lastBlockRef.current = block.blockNumber;

      const raw = await fetchEvents(
        block.blockNumber - LOOKBACK_BLOCKS,
        block.blockNumber
      );
      if (cancelled) return;

      raw.reverse();
      setEvents(raw.map(normalizeEvent).slice(0, MAX_EVENTS));
    };

    init();
    const timer = setInterval(async () => {
      const { data: { block } } = await waxGeckoApi.get('/latest-block');
      if (block.blockNumber > lastBlockRef.current) {
        const raw = await fetchEvents(
          lastBlockRef.current + 1,
          block.blockNumber
        );
        raw.reverse();
        setEvents(old => [...raw.map(normalizeEvent), ...old].slice(0, MAX_EVENTS));
        lastBlockRef.current = block.blockNumber;
      }
    }, POLL_INTERVAL);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return (
    <>
      <div className="dev-banner">
        ⚠️ This feed is a work-in-progress demo, under active development and testing.  
        We’re currently using Alcor’s on-chain data — results may be incomplete or delayed!
      </div>

      <div className="activity-feed">
        <h2>Recent Activity</h2>
        {events.length === 0 ? (
          <p className="loading">Loading…</p>
        ) : (
          <ul>
            {events.map((e, i) => {
              const time = e.timestamp
                ? new Date(e.timestamp).toLocaleTimeString()
                : '?';
              const pid  = e.raw.pairId ?? e.raw.poolId;
              const info = poolInfo[pid];

              if (!info) {
                return (
                  <li key={i} className="item loading-item">
                    <span className="timestamp">#{e.blockNumber} @ {time}</span>
                    <span className={`badge ${e.type}`}>
                      {e.type.toUpperCase()}
                    </span>
                    <span className="content">
                      Loading pool {pid}…
                    </span>
                  </li>
                );
              }

              const {
                asset0Id, asset1Id, dexKey,
                decimals0, decimals1, cg0, cg1
              } = info;

              let content;
              if (e.type === 'swap') {
                const raw     = e.raw;
                const is0in   = raw.asset0In != null;
                const inAmt   = fmt(is0in ? raw.asset0In : raw.asset1In,
                                     is0in ? decimals0 : decimals1);
                const outAmt  = fmt(is0in ? raw.asset1Out : raw.asset0Out,
                                     is0in ? decimals1 : decimals0);
                const symIn   = is0in ? asset0Id : asset1Id;
                const symOut  = is0in ? asset1Id : asset0Id;
                const price   = fmt(raw.priceNative,
                                     is0in ? decimals1 : decimals0);
                const inv     = fmt((1/parseFloat(raw.priceNative)).toString(),
                                     is0in ? decimals0 : decimals1);
                const usdIn   = cg0 && prices[cg0]
                  ? `$${(parseFloat(raw.asset0In)*prices[cg0].usd).toFixed(2)}`
                  : '';
                const usdOut  = cg1 && prices[cg1]
                  ? `$${(parseFloat(raw.asset1Out)*prices[cg1].usd).toFixed(2)}`
                  : '';

                content = (
                  <>
                    <span className="amount">{inAmt}</span>{' '}
                    <span className="symbol">{symIn}</span>{' '}
                    {usdIn}
                    <span className="arrow">→</span>
                    <span className="amount">{outAmt}</span>{' '}
                    <span className="symbol">{symOut}</span>{' '}
                    {usdOut}
                    <span className="price">
                      @ {price} {symOut}/{symIn}
                    </span>
                    <span className="price-inv">
                      (1 {symOut} = {inv} {symIn})
                    </span>
                    <span className="meta">
                      DEX: {dexKey} | Maker: {raw.maker}
                    </span>
                  </>
                );
              } else if (e.type === 'join') {
                const a0    = fmt(e.raw.amount0, decimals0);
                const a1    = fmt(e.raw.amount1, decimals1);
                const ratio = isNaN(e.raw.amount1/e.raw.amount0)
                  ? 'N/A'
                  : (e.raw.amount1/e.raw.amount0).toFixed(decimals1);

                content = (
                  <>
                    <b>{e.raw.maker}</b> joined Pool {pid}:{' '}
                    <b>{a0}</b> <i>{asset0Id}</i> +{' '}
                    <b>{a1}</b> <i>{asset1Id}</i>
                    <span className="meta">
                      Ratio: 1 {asset0Id} = {ratio} {asset1Id} | DEX: {dexKey}
                    </span>
                  </>
                );
              } else if (e.type === 'exit') {
                const a0    = fmt(e.raw.amount0, decimals0);
                const a1    = fmt(e.raw.amount1, decimals1);
                const ratio = isNaN(e.raw.amount0/e.raw.amount1)
                  ? 'N/A'
                  : (e.raw.amount0/e.raw.amount1).toFixed(decimals0);

                content = (
                  <>
                    <b>{e.raw.maker}</b> exited Pool {pid}:{' '}
                    <b>{a0}</b> <i>{asset0Id}</i> →{' '}
                    <b>{a1}</b> <i>{asset1Id}</i>
                    <span className="meta">
                      Ratio: 1 {asset1Id} = {ratio} {asset0Id} | DEX: {dexKey}
                    </span>
                  </>
                );
              } else {
                content = <span className="unknown">Event on {pid}</span>;
              }

              return (
                <li key={i} className={`item ${e.type}`}>
                  <span className="timestamp">
                    #{e.blockNumber} @ {time}
                  </span>
                  <span className={`badge ${e.type}`}>
                    {e.type.toUpperCase()}
                  </span>
                  <span className="content">{content}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
