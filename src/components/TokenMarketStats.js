// src/components/TokenMarketStats.js
import React, { useEffect, useState } from "react";
import axios from "axios";

// Set the base URL globally (or do it once in index.js/App.js if preferred)
axios.defaults.baseURL = "https://maestrobeatz.servegame.com:3003";

const TokenMarketStats = () => {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopTokens = async () => {
      try {
        const { data } = await axios.get("/pools");
        const sorted = data
          .filter(t => parseFloat(t.volume24h) > 0)
          .sort((a, b) => b.volume24h - a.volume24h)
          .slice(0, 100); // Limit to top 100 by volume
        console.log("Fetched tokens:", sorted); // Debug log
        setTokens(sorted);
      } catch (error) {
        console.error("Failed to load top token pools:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTopTokens();
  }, []);

  if (loading) return <div className="text-white">Loading token market stats...</div>;

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl font-bold mb-4">Top 100 WAX Token Markets</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tokens.map((token, index) => (
          <div
            key={`${token.token.symbol}@${token.token.contract}`}
            className="bg-zinc-800 p-4 rounded shadow-md border border-zinc-700"
          >
            <h2 className="text-lg font-semibold mb-1">
              #{index + 1} — {token.token.symbol} @{token.token.contract}
            </h2>
            <p>
              Price (WAX): {token.price != null ? token.price.toFixed(8) : "N/A"}
            </p>
            <p>
              24h Volume: {token.volume24h != null ? token.volume24h.toFixed(2) : "N/A"}
            </p>
            <p>
              Liquidity: {token.liquidity?.wax?.toFixed(2) ?? "0"} WAX / {token.liquidity?.token?.toFixed(2) ?? "0"} {token.token.symbol}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TokenMarketStats;
