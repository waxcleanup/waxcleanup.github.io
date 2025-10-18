// src/components/CollectionsPage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './CollectionsPage.css';

function NftCard({ template }) {
  return (
    <div className="nft-card">
      {template.image && (
        <img src={template.image} alt={template.name} className="nft-card-image" />
      )}
      <h3>{template.name}</h3>
      <p><strong>Type:</strong> {template.nft_type}</p>
      <p><strong>Collection:</strong> {template.collection}</p>
      <p><strong>ID:</strong> {template.template_id}</p>
    </div>
  );
}

export default function CollectionsPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/nfts/registered`)
      .then(r => setTemplates(r.data.templates))
      .catch(() => setError('Failed to load templates'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading templates...</p>;
  if (error)   return <p>{error}</p>;

  return (
    <>

      <div className="collections-page">
        <h2>Registered NFT Templates</h2>
        <div className="nft-grid">
          {templates.map(t => (
            <NftCard key={`${t.collection}-${t.template_id}`} template={t} />
          ))}
        </div>
      </div>
    </>
  );
}
