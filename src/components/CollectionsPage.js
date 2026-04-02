// src/components/CollectionsPage.js
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import './CollectionsPage.css';

function safeText(value, fallback = 'Unknown') {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

function normalizeText(value) {
  return safeText(value, '').toLowerCase().trim();
}

function getTemplateCategory(template) {
  const nftType = normalizeText(template.nft_type);
  const name = normalizeText(template.name);
  const schema = normalizeText(template.schema);
  const category = normalizeText(template.category);
  const subcategory = normalizeText(template.subcategory);

  const combined = `${nftType} ${name} ${schema} ${category} ${subcategory}`;

  if (
    combined.includes('pack') ||
    combined.includes('crate') ||
    combined.includes('box')
  ) {
    return 'Packs';
  }

  if (
    combined.includes('machine') ||
    combined.includes('reactor') ||
    combined.includes('processor')
  ) {
    return 'Machines';
  }

  if (
    combined.includes('tool') ||
    combined.includes('scythe') ||
    combined.includes('extractor') ||
    combined.includes('watering')
  ) {
    return 'Tools';
  }

  if (
    combined.includes('seed') ||
    combined.includes('sapling')
  ) {
    return 'Seeds & Plants';
  }

  if (
    combined.includes('plot') ||
    combined.includes('farm')
  ) {
    return 'Land & Farms';
  }

  if (
    combined.includes('compost') ||
    combined.includes('cell') ||
    combined.includes('core') ||
    combined.includes('fuel') ||
    combined.includes('energy') ||
    combined.includes('resource')
  ) {
    return 'Resources';
  }

  return 'Other';
}

function getUseHint(template) {
  const nftType = normalizeText(template.nft_type);
  const name = normalizeText(template.name);
  const schema = normalizeText(template.schema);
  const combined = `${nftType} ${name} ${schema}`;

  if (combined.includes('pack') || combined.includes('crate')) {
    return 'Used to open and receive randomized game items and supplies.';
  }

  if (combined.includes('plot')) {
    return 'Used as staking space or land capacity for farming gameplay.';
  }

  if (combined.includes('farm')) {
    return 'Used as a core production asset for larger farming operations.';
  }

  if (combined.includes('machine') || combined.includes('reactor') || combined.includes('processor')) {
    return 'Used in machine gameplay to process inputs into outputs over time.';
  }

  if (combined.includes('tool') || combined.includes('extractor') || combined.includes('watering') || combined.includes('scythe')) {
    return 'Used as an equipment NFT for farming, harvesting, watering, or extraction actions.';
  }

  if (combined.includes('seed') || combined.includes('sapling')) {
    return 'Used for planting, growth systems, or future yield-based gameplay.';
  }

  if (combined.includes('compost')) {
    return 'Used as a farming input for planting, blending, or land progression.';
  }

  if (combined.includes('cell') || combined.includes('core') || combined.includes('energy')) {
    return 'Used to power systems, machines, or energy-based gameplay actions.';
  }

  return 'Part of the CleanupCentr ecosystem and may be used in blends, staking, farming, or machine systems.';
}

function NftCard({ template }) {
  const displayName = safeText(template.name);
  const displayType = safeText(template.nft_type);
  const displayCollection = safeText(template.collection);
  const displayTemplateId = safeText(template.template_id);
  const displaySchema = safeText(template.schema, 'N/A');
  const displayCategory = getTemplateCategory(template);
  const useHint = getUseHint(template);

  return (
    <div className="nft-card">
      {template.image && (
        <img
          src={template.image}
          alt={displayName}
          className="nft-card-image"
          loading="lazy"
        />
      )}

      <div className="nft-card-body">
        <div className="nft-card-badges">
          <span className="nft-badge">{displayCategory}</span>
          <span className="nft-badge nft-badge-muted">{displayType}</span>
        </div>

        <h3>{displayName}</h3>

        <p className="nft-card-description">{useHint}</p>

        <div className="nft-card-meta">
          <p><strong>Type:</strong> {displayType}</p>
          <p><strong>Schema:</strong> {displaySchema}</p>
          <p><strong>Collection:</strong> {displayCollection}</p>
          <p><strong>Template ID:</strong> {displayTemplateId}</p>
        </div>
      </div>
    </div>
  );
}

export default function CollectionsPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    let isMounted = true;

    axios
      .get(`${process.env.REACT_APP_API_BASE_URL}/api/nfts/registered`)
      .then((response) => {
        if (!isMounted) return;
        const nextTemplates = Array.isArray(response?.data?.templates)
          ? response.data.templates
          : [];
        setTemplates(nextTemplates);
      })
      .catch(() => {
        if (!isMounted) return;
        setError('Failed to load encyclopedia items.');
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const categories = useMemo(() => {
    const categorySet = new Set(['All']);
    templates.forEach((template) => {
      categorySet.add(getTemplateCategory(template));
    });
    return Array.from(categorySet);
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    const query = search.toLowerCase().trim();

    return templates.filter((template) => {
      const category = getTemplateCategory(template);

      const matchesCategory =
        activeCategory === 'All' || category === activeCategory;

      if (!matchesCategory) return false;

      if (!query) return true;

      const haystack = [
        template.name,
        template.nft_type,
        template.collection,
        template.template_id,
        template.schema,
        template.category,
        template.subcategory
      ]
        .map((value) => safeText(value, ''))
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [templates, search, activeCategory]);

  if (loading) {
    return (
      <div className="collections-page">
        <div className="collections-hero">
          <h2>Game Encyclopedia</h2>
          <p>Loading game items...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="collections-page">
        <div className="collections-hero">
          <h2>Game Encyclopedia</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="collections-page">
      <div className="collections-hero">
        <h2>Game Encyclopedia</h2>
        <p>
          Explore CleanupCentr items, learn what each NFT is, and see how it fits
          into the game ecosystem.
        </p>
      </div>

      <div className="collections-toolbar">
        <input
          type="text"
          className="collections-search"
          placeholder="Search by name, type, schema, or template ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="collections-filters">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={`collections-filter-btn ${
                activeCategory === category ? 'active' : ''
              }`}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div className="collections-summary">
        <p>
          Showing <strong>{filteredTemplates.length}</strong> of{' '}
          <strong>{templates.length}</strong> registered items
          {activeCategory !== 'All' ? ` in ${activeCategory}` : ''}.
        </p>
      </div>

      {filteredTemplates.length === 0 ? (
        <div className="collections-empty">
          <h3>No items found</h3>
          <p>Try a different search or category filter.</p>
        </div>
      ) : (
        <div className="nft-grid">
          {filteredTemplates.map((template) => (
            <NftCard
              key={`${safeText(template.collection, 'unknown')}-${safeText(template.template_id, '0')}`}
              template={template}
            />
          ))}
        </div>
      )}
    </div>
  );
}