// src/components/MarketsList.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

const API_BASE = process.env.REACT_APP_API_BASE_URL;

const MarketsList = () => {
  const [pools, setPools] = useState([]);

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/pools`);
        setPools(data);
      } catch (error) {
        console.error("Error fetching markets:", error);
      }
    };

    fetchMarkets();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Token Markets</h1>
      <table className="min-w-full bg-white border border-gray-200">
        <thead>
          <tr>
            <th className="py-2 px-4 border-b">Symbol</th>
            <th className="py-2 px-4 border-b">Price (WAX)</th>
            <th className="py-2 px-4 border-b">24h Volume</th>
            <th className="py-2 px-4 border-b">Details</th>
          </tr>
        </thead>
        <tbody>
          {pools.map((pool) => (
            <tr key={pool.id} className="text-center">
              <td className="py-2 px-4 border-b">
                {pool.token.symbol}@{pool.token.contract}
              </td>
              <td className="py-2 px-4 border-b">{pool.price}</td>
              <td className="py-2 px-4 border-b">{pool.volume24h.toFixed(2)}</td>
              <td className="py-2 px-4 border-b">
                <Link
                  to={`/markets/${pool.token.symbol.toLowerCase()}-${pool.token.contract}_wax-eosio.token`}
                  className="text-blue-500 hover:underline"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MarketsList;
