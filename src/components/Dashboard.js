// src/components/Dashboard.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import NFTsGrid from './NFTsGrid';
import './Dashboard.css';
import useSession from '../hooks/useSession';

export default function Dashboard() {
  const { session } = useSession();
  const [farmNFTs, setFarmNFTs] = useState([]);
  const [treeNFTs, setTreeNFTs] = useState([]);

  useEffect(() => {
    if (!session?.actor) return;

    axios
      .get(`${process.env.REACT_APP_API_BASE_URL}/api/nfts/user-assets/${session.actor}`)
      .then(res => {
        const allAssets = res.data.assets || [];

        // ⚡ Dynamically separate farms and trees based on collection
        const farms = allAssets.filter(nft => nft.collection_name === 'cleanupcentr');
        const trees = allAssets.filter(nft => nft.collection_name === 'agar');

        setFarmNFTs(farms);
        setTreeNFTs(trees);
      })
      .catch(console.error);
  }, [session]);

  return (
    <div className="dashboard-container">
      <div className="dashboard-content">
        <h1>Your Dashboard</h1>

        <section>
          <h2>Stakable Farms</h2>
          <NFTsGrid
            items={farmNFTs}
            type="farm"
            onAction={(nft) => {/* stakeFarm(...) */}}
            actionLabel="Stake"
          />
        </section>

        <section>
          <h2>Stakable Trees</h2>
          <NFTsGrid
            items={treeNFTs}
            type="tree"
            onAction={(nft) => {/* stakeTree(...) */}}
            actionLabel="Stake"
          />
        </section>
      </div>
    </div>
  );
}
