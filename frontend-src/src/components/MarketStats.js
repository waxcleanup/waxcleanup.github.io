// src/components/MarketStats.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';

function MarketStats() {
  const [ticker, setTicker] = useState(null);
  const [trades, setTrades] = useState([]);
  const [orderbook, setOrderbook] = useState(null);
  const tickerId = 'shing-t.taco_wax-eosio.token'; // Default for now

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tickerRes, tradesRes, orderbookRes] = await Promise.all([
          axios.get(`/ticker/${tickerId}`),
          axios.get(`/trades/${tickerId}`),
          axios.get(`/orderbook/${tickerId}`)
        ]);
        setTicker(tickerRes.data);
        setTrades(tradesRes.data);
        setOrderbook(orderbookRes.data);
      } catch (err) {
        console.error('Failed to fetch market data:', err);
      }
    };

    fetchData();
  }, [tickerId]);

  return (
    <div className="p-4 text-white">
      <h1 className="text-2xl font-bold mb-4">Market Stats: {tickerId}</h1>

      {ticker && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold">Ticker Summary</h2>
          <p>Last Price: {ticker.last_price}</p>
          <p>24h Volume (Base): {ticker.base_volume}</p>
          <p>24h Volume (Target): {ticker.target_volume}</p>
          <p>High: {ticker.high}</p>
          <p>Low: {ticker.low}</p>
        </div>
      )}

      {orderbook && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold">Order Book (Top 5)</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold">Asks</h3>
              {orderbook.asks.slice(0, 5).map((ask, i) => (
                <div key={i}>Price: {ask.price} — Amount: {ask.amount}</div>
              ))}
            </div>
            <div>
              <h3 className="font-semibold">Bids</h3>
              {orderbook.bids.slice(0, 5).map((bid, i) => (
                <div key={i}>Price: {bid.price} — Amount: {bid.amount}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {trades.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold">Recent Trades</h2>
          <ul>
            {trades.slice(0, 10).map((t, i) => (
              <li key={i}>
                [{new Date(t.timestamp).toLocaleTimeString()}] {t.side.toUpperCase()} - {t.amount} @ {t.price}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default MarketStats;
