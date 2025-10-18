import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { fetchApprovedNFTs } from './services/api'; // Assuming this is the function to fetch from your API

const NFTFetcher = ({ accountName, onNFTsFetched }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [nfts, setNFTs] = useState([]);

  useEffect(() => {
    const loadNFTs = async () => {
      if (!accountName) return;

      setLoading(true);
      try {
        // Assuming you have an API to fetch NFTs from the `approvednft` table
        const data = await fetchApprovedNFTs(accountName);  // Adjust as needed
        setNFTs(data);
        if (onNFTsFetched) {
          onNFTsFetched(data); // Pass fetched NFTs to the parent component if needed
        }
      } catch (err) {
        console.error("Error fetching NFTs:", err);
        setError("Failed to fetch NFTs.");
      } finally {
        setLoading(false);
      }
    };

    loadNFTs();
  }, [accountName, onNFTsFetched]);

  if (loading) return <p>Loading NFTs...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <h3>Fetched NFTs for {accountName}</h3>
      <ul>
        {nfts.map((nft) => (
          <li key={nft.nft_id}>{nft.name} - {nft.template_id}</li>
        ))}
      </ul>
    </div>
  );
};

export default NFTFetcher;
