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

function getRawName(template) {
  return (
    template?.name ||
    template?.template_name ||
    template?.immutable_data?.name ||
    template?.metadata?.name ||
    ''
  );
}

function getRawType(template) {
  return (
    template?.nft_type ||
    template?.type ||
    template?.immutable_data?.nft_type ||
    template?.metadata?.nft_type ||
    ''
  );
}

function getRawSchema(template) {
  return (
    template?.schema ||
    template?.schema_name ||
    template?.schemaName ||
    ''
  );
}

function getRawCollection(template) {
  return (
    template?.collection ||
    template?.collection_name ||
    template?.collectionName ||
    ''
  );
}

function getDisplayName(template) {
  return safeText(getRawName(template), 'Unknown');
}

function getDisplayType(template) {
  return safeText(getRawType(template), 'Unknown');
}

function getDisplaySchema(template) {
  return safeText(getRawSchema(template), 'N/A');
}

function getDisplayCollection(template) {
  return safeText(getRawCollection(template), 'Unknown');
}

function getImageUrl(template) {
  const rawImage =
    template?.image ||
    template?.image_url ||
    template?.img ||
    template?.immutable_data?.img ||
    template?.metadata?.img ||
    '';

  if (!rawImage) return '';

  const raw = String(rawImage);

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw;
  }

  const gateway = process.env.REACT_APP_IPFS_GATEWAY || 'https://ipfs.io/ipfs';

  return `${gateway.replace(/\/$/, '')}/${raw
    .replace(/^ipfs:\/\//, '')
    .replace(/^\/+/, '')}`;
}

function categorizeTemplate(template) {
  const nftType = normalizeText(getRawType(template));
  const name = normalizeText(getRawName(template));
  const schema = normalizeText(getRawSchema(template));
  const category = normalizeText(template?.category);
  const subcategory = normalizeText(template?.subcategory);

  const combined = `${nftType} ${name} ${schema} ${category} ${subcategory}`;

  const hasAny = (terms) => terms.some((term) => combined.includes(term));

  if (hasAny(['machine', 'reactor', 'processor'])) {
    return 'Machines';
  }

  if (hasAny(['tool', 'scythe', 'extractor', 'watering'])) {
    return 'Tools';
  }

  if (hasAny(['plot', 'farm', 'land'])) {
    return 'Land & Farms';
  }

  // Combine seed packs and seeds into one category
  if (hasAny(['seed pack', 'seedpack', 'seed', 'sapling', 'plant'])) {
    return 'Seeds';
  }

  if (hasAny(['crate', 'loot box', 'lootbox', 'box', 'pack'])) {
    return 'Packs';
  }

  if (hasAny(['compost', 'cell', 'core', 'fuel', 'energy', 'resource'])) {
    return 'Energy & Resources';
  }

  return 'Other';
}

function getTemplateCategory(template) {
  return categorizeTemplate(template);
}

function getUseHint(template) {
  const nftType = normalizeText(getRawType(template));
  const name = normalizeText(getRawName(template));
  const schema = normalizeText(getRawSchema(template));
  const combined = `${nftType} ${name} ${schema}`;

  if (combined.includes('seed pack') || combined.includes('seedpack')) {
    return 'Used to open and receive seeds for planting and harvest-based gameplay.';
  }

  if (combined.includes('seed') || combined.includes('sapling')) {
    return 'Used for planting, growth systems, or future yield-based gameplay.';
  }

  if (
    combined.includes('pack') ||
    combined.includes('crate') ||
    combined.includes('box')
  ) {
    return 'Used to open and receive randomized game items and supplies.';
  }

  if (combined.includes('plot')) {
    return 'Used as staking space or land capacity for farming gameplay.';
  }

  if (combined.includes('farm')) {
    return 'Used as a core production asset for larger farming operations.';
  }

  if (
    combined.includes('machine') ||
    combined.includes('reactor') ||
    combined.includes('processor')
  ) {
    return 'Used in machine gameplay to process inputs into outputs over time.';
  }

  if (
    combined.includes('tool') ||
    combined.includes('extractor') ||
    combined.includes('watering') ||
    combined.includes('scythe')
  ) {
    return 'Used as an equipment NFT for farming, harvesting, watering, or extraction actions.';
  }

  if (combined.includes('compost')) {
    return 'Used as a farming input for planting, blending, or land progression.';
  }

  if (
    combined.includes('cell') ||
    combined.includes('core') ||
    combined.includes('energy') ||
    combined.includes('fuel')
  ) {
    return 'Used to power systems, machines, or energy-based gameplay actions.';
  }

  return 'Part of the CleanupCentr ecosystem and may be used in blends, staking, farming, or machine systems.';
}

function formatTotalFromRaw(rawValue, decimals) {
  const raw = Number(rawValue || 0);
  const dec = Number(decimals || 0);
  const divisor = 10 ** dec;

  return (raw / divisor).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: dec,
  });
}

function buildYieldInfo(template, referenceData) {
  if (!referenceData) return null;

  const templateId = Number(template.template_id);
  const displayCategory = getTemplateCategory(template);

  const {
    seedByPackTemplateId,
    seedBySeedTemplateId,
    compostByTemplateId,
  } = referenceData;

  if (displayCategory === 'Seeds') {
    // First check if this is a seed pack mapping
    const pack = seedByPackTemplateId.get(templateId);

    if (pack) {
      const seedCount = Number(pack.count || 0);
      const seedRaw = Number(pack.seed_base_yield_raw || 0);
      const totalRaw = seedCount * seedRaw;
      const tokenDecimals = Number(pack.seed_token_decimals || 0);
      const tokenCode = safeText(pack.seed_token_symbol_code, '');

      return {
        title: 'Seed Pack Output',
        lines: [
          `Contains: ${seedCount} ${pack.seed_name || 'seed'}${seedCount === 1 ? '' : 's'}`,
          `Per Seed: ${pack.seed_base_yield_display || '0'} ${tokenCode}`.trim(),
          `Total Yield: ${formatTotalFromRaw(totalRaw, tokenDecimals)} ${tokenCode}`.trim(),
        ],
      };
    }

    // Then try direct seedmeta lookup
    let seed = seedBySeedTemplateId.get(templateId);

    // Fallback: some seed NFTs are mapped through packmeta
    if (!seed) {
      const seedPackMapping = seedByPackTemplateId.get(templateId);
      if (
        seedPackMapping?.seed_type_id !== undefined &&
        seedPackMapping?.seed_type_id !== null
      ) {
        seed = seedBySeedTemplateId.get(Number(seedPackMapping.seed_type_id));
      }
    }

    if (seed) {
      return {
        title: 'Seed Yield',
        lines: [
          `Yield: ${seed.base_yield_display} ${seed.token_symbol_code} per harvest`,
          `Growth: ${seed.growth_duration_display}`,
          `Water Ticks: ${seed.water_ticks}`,
        ],
      };
    }

    return {
      title: 'Seed Info',
      lines: [
        'This seed or seed pack is not mapped yet.',
        'Add its template or mapping to show yield data.',
      ],
    };
  }

  if (displayCategory === 'Packs') {
    return {
      title: 'Pack Info',
      lines: [
        'This pack may use crate loot, blend loot, or another opening system.',
        'Add a crate or loot metadata layer later if you want detailed outputs here.',
      ],
    };
  }

  if (displayCategory === 'Energy & Resources') {
    const compost = compostByTemplateId.get(templateId);

    if (compost) {
      return {
        title: 'Resource Value',
        lines: [
          `Compost Yield: ${compost.compost_yield}`,
          `Rarity: ${compost.rarity}`,
        ],
      };
    }
  }

  return null;
}

function NftCard({ template, referenceData }) {
  const displayName = getDisplayName(template);
  const displayType = getDisplayType(template);
  const displayCollection = getDisplayCollection(template);
  const displayTemplateId = safeText(template.template_id);
  const displaySchema = getDisplaySchema(template);
  const displayCategory = getTemplateCategory(template);
  const useHint = getUseHint(template);
  const yieldInfo = buildYieldInfo(template, referenceData);
  const imageUrl = getImageUrl(template);

  return (
    <div className="nft-card">
      {imageUrl && (
        <img
          src={imageUrl}
          alt={displayName}
          className="nft-card-image"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      )}

      <div className="nft-card-body">
        <div className="nft-card-badges">
          <span className="nft-badge">{displayCategory}</span>
          <span className="nft-badge nft-badge-muted">{displayType}</span>
        </div>

        <h3>{displayName}</h3>

        <p className="nft-card-description">{useHint}</p>

        {yieldInfo && (
          <div className="nft-card-yield">
            <p style={{ margin: '0 0 8px', fontWeight: 700 }}>
              {yieldInfo.title}
            </p>

            {yieldInfo.lines.map((line, index) => (
              <p
                key={`${displayTemplateId}-yield-${index}`}
                style={{
                  margin: index === yieldInfo.lines.length - 1 ? 0 : '0 0 6px',
                }}
              >
                {line}
              </p>
            ))}
          </div>
        )}

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
  const [referenceData, setReferenceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/nfts/registered`),
      axios.get(`${process.env.REACT_APP_API_BASE_URL}/game/reference-data`),
    ])
      .then(([templatesResponse, referenceResponse]) => {
        if (!isMounted) return;

        const nextTemplates = Array.isArray(templatesResponse?.data?.templates)
          ? templatesResponse.data.templates
          : [];

        const ref = referenceResponse?.data || {};
        const seeds = Array.isArray(ref.seeds) ? ref.seeds : [];
        const packs = Array.isArray(ref.packs) ? ref.packs : [];
        const compost = Array.isArray(ref.compost) ? ref.compost : [];

        const seedBySeedTemplateId = new Map(
          seeds.map((seed) => [Number(seed.template_id), seed])
        );

        const seedByPackTemplateId = new Map(
          packs.map((pack) => {
            const linkedSeed = seedBySeedTemplateId.get(Number(pack.seed_type_id));

            return [
              Number(pack.pack_template_id),
              {
                ...pack,
                seed_name: linkedSeed?.seed_name || pack.linked_seed_name || 'Unknown Seed',
                seed_base_yield_raw: linkedSeed?.base_yield_raw || 0,
                seed_base_yield_display: linkedSeed?.base_yield_display || '0',
                seed_token_symbol_code: linkedSeed?.token_symbol_code || '',
                seed_token_decimals: linkedSeed?.token_decimals || 0,
              },
            ];
          })
        );

        const compostByTemplateId = new Map(
          compost.map((item) => [Number(item.template_id), item])
        );

        setTemplates(nextTemplates);
        setReferenceData({
          seeds,
          packs,
          compost,
          seedBySeedTemplateId,
          seedByPackTemplateId,
          compostByTemplateId,
        });
      })
      .catch((err) => {
        console.error('CollectionsPage load error:', err);
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
    const preferredOrder = [
      'All',
      'Seeds',
      'Packs',
      'Machines',
      'Tools',
      'Land & Farms',
      'Energy & Resources',
      'Other',
    ];

    const found = new Set(['All']);
    templates.forEach((template) => {
      found.add(getTemplateCategory(template));
    });

    return preferredOrder.filter((category) => found.has(category));
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
        getRawName(template),
        getRawType(template),
        getRawCollection(template),
        template?.template_id,
        getRawSchema(template),
        template?.category,
        template?.subcategory,
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
              key={`${safeText(getDisplayCollection(template), 'unknown')}-${safeText(template.template_id, '0')}`}
              template={template}
              referenceData={referenceData}
            />
          ))}
        </div>
      )}
    </div>
  );
}