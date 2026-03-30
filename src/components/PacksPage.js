import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import './PacksPage.css';
import useSession from '../hooks/useSession';

const API_BASE =
  process.env.REACT_APP_API_BASE_URL || 'https://3.14.81.74';

const IPFS_GATEWAY =
  process.env.REACT_APP_IPFS_GATEWAY || 'https://3.14.81.74/ipfs';

const PACK_SALE_BY_TEMPLATE = {
  904730: 1, // Small Eco Crate
};

function buildIpfsUrl(cid) {
  if (!cid) return '';

  if (cid.startsWith('http://') || cid.startsWith('https://')) {
    return cid;
  }

  if (cid.startsWith('ipfs://')) {
    const cleanCid = cid.replace('ipfs://', '');
    return `${IPFS_GATEWAY.replace(/\/$/, '')}/${cleanCid}`;
  }

  return `${IPFS_GATEWAY.replace(/\/$/, '')}/${cid}`;
}

function normalizeActor(session) {
  if (!session) return '';
  const actor = session?.actor ?? session?.permissionLevel?.actor;

  if (!actor) return '';
  if (typeof actor === 'string') return actor;
  if (typeof actor?.toString === 'function') return actor.toString();
  if (typeof actor?.value !== 'undefined') return String(actor.value);

  return String(actor);
}

function formatDropQty(drop) {
  if (!drop) return '';
  if (drop.qty_min === 0 && drop.qty_max === 0) return '';
  if (drop.qty_min === drop.qty_max) return `Qty: x${drop.qty_min}`;
  return `Qty: x${drop.qty_min}-${drop.qty_max}`;
}

function formatDropChance(drop) {
  if (!drop || typeof drop.weight === 'undefined' || drop.weight === null) {
    return '';
  }
  return `Chance: ${drop.weight}%`;
}

function DropItem({ item, showWeight = false }) {
  const imageUrl = buildIpfsUrl(item.image);

  return (
    <div className="pack-drop-item">
      <div className="pack-drop-image-wrap">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={item.name}
            className="pack-drop-image"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="pack-drop-placeholder">?</div>
        )}
      </div>

      <div className="pack-drop-name">{item.name}</div>

      <div className="pack-drop-meta">
        {formatDropQty(item) && <div>{formatDropQty(item)}</div>}
        {showWeight && <div>{formatDropChance(item)}</div>}
      </div>
    </div>
  );
}

function DropTableModal({ detail, loading, error, onClose }) {
  if (!detail && !loading && !error) return null;

  const sale = detail?.sale;

  return (
    <div className="packs-modal-overlay" onClick={onClose}>
      <div className="packs-modal" onClick={(e) => e.stopPropagation()}>
        <button className="packs-modal-close" onClick={onClose}>
          ×
        </button>

        {loading ? (
          <div className="packs-modal-state">Loading drops...</div>
        ) : error ? (
          <div className="packs-modal-state error">{error}</div>
        ) : (
          <>
            <div className="packs-modal-header">
              <div className="packs-modal-pack-image-wrap">
                {sale?.image ? (
                  <img
                    src={buildIpfsUrl(sale.image)}
                    alt={sale.name}
                    className="packs-modal-pack-image"
                  />
                ) : (
                  <div className="packs-modal-pack-placeholder">PACK</div>
                )}
              </div>

              <div className="packs-modal-pack-info">
                <p className="packs-modal-kicker">Drop Table</p>
                <h2>{sale?.name}</h2>
                <p>{sale?.description}</p>
              </div>
            </div>

            <div className="packs-modal-section">
              <h3>Guaranteed Drops</h3>
              <div className="packs-drop-grid">
                {(detail?.guaranteed || []).map((drop) => (
                  <DropItem key={`g-${drop.id}`} item={drop} />
                ))}
              </div>
            </div>

            <div className="packs-modal-section">
              <h3>Bonus Drops</h3>
              <div className="packs-drop-grid">
                {(detail?.bonus || []).map((drop) => (
                  <DropItem key={`b-${drop.id}`} item={drop} showWeight />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PackCard({ pack, onViewDrops, onOpen }) {
  const imageUrl = buildIpfsUrl(pack.image);

  return (
    <div className="pack-card">
      <div className="pack-card-image-wrap">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={pack.name}
            className="pack-card-image"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="pack-card-placeholder">PACK</div>
        )}
      </div>

      <div className="pack-card-body">
        <div className="pack-card-top">
          <span className="pack-badge">Pack</span>
          <span className="pack-template-id">TPL #{pack.template_id}</span>
        </div>

        <h3>{pack.name}</h3>

        <div className="pack-card-meta">
          <span>Owned</span>
          <strong>{pack.count}</strong>
        </div>

        <div className="pack-card-actions">
          <button
            className="pack-secondary-btn"
            onClick={() => onViewDrops(pack)}
            type="button"
          >
            View Drops
          </button>

          <button
            className="pack-open-btn"
            onClick={() => onOpen(pack)}
            type="button"
          >
            Open Pack
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PacksPage() {
  const { session } = useSession();
  const actor = useMemo(() => normalizeActor(session), [session]);

  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [dropDetail, setDropDetail] = useState(null);
  const [dropLoading, setDropLoading] = useState(false);
  const [dropError, setDropError] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);

  useEffect(() => {
    let mounted = true;

    const loadPacks = async () => {
      if (!actor) {
        setPacks([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        setMessage('');

        const res = await axios.get(
          `${API_BASE}/api/nfts/user-assets/${actor}`
        );

        const assets = Array.isArray(res.data?.assets) ? res.data.assets : [];

        const packAssets = assets.filter(
          (asset) =>
            asset.collection_name === 'cleanupcentr' &&
            Object.prototype.hasOwnProperty.call(
              PACK_SALE_BY_TEMPLATE,
              Number(asset.template_id)
            )
        );

        const grouped = {};

        for (const asset of packAssets) {
          const templateId = Number(asset.template_id);

          if (!grouped[templateId]) {
            grouped[templateId] = {
              template_id: templateId,
              asset_ids: [],
              name: asset.name || `Pack #${templateId}`,
              image: asset.img || asset.image || null,
              count: 0,
              sale_id: PACK_SALE_BY_TEMPLATE[templateId] || null,
            };
          }

          grouped[templateId].asset_ids.push(String(asset.asset_id));
          grouped[templateId].count += 1;
        }

        if (mounted) {
          setPacks(Object.values(grouped));
        }
      } catch (err) {
        console.error('Failed to load packs:', err);
        if (mounted) {
          setError('Unable to load your packs right now.');
          setPacks([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadPacks();

    return () => {
      mounted = false;
    };
  }, [actor]);

  const handleViewDrops = async (pack) => {
    if (!pack.sale_id) {
      setDropError('No sale mapping found for this pack.');
      return;
    }

    try {
      setSelectedSale(pack.sale_id);
      setDropLoading(true);
      setDropError('');
      setDropDetail(null);

      const response = await axios.get(
        `${API_BASE}/shop/sales/${pack.sale_id}`
      );

      setDropDetail(response.data);
    } catch (err) {
      console.error('Failed to fetch drop detail:', err);
      setDropError('Unable to load drop table right now.');
    } finally {
      setDropLoading(false);
    }
  };

  const handleOpenPack = async (pack) => {
    if (!pack?.asset_ids?.length) return;

    const assetId = pack.asset_ids[0];

    setMessage(
      `Ready to open ${pack.name} using asset ${assetId}. Hook your real open-pack transaction here.`
    );
  };

  const closeDropModal = () => {
    setSelectedSale(null);
    setDropDetail(null);
    setDropError('');
    setDropLoading(false);
  };

  return (
    <div className="packs-page">
      <div className="packs-page-inner">
        <div className="packs-header">
          <div>
            <p className="packs-kicker">CleanupCentr</p>
            <h1>Your Packs</h1>
            <p className="packs-subtitle">
              Open your packs, review drop tables, and prepare your next rewards.
            </p>
          </div>

          <div className="packs-actor">
            actor: <span>{actor || '—'}</span>
          </div>
        </div>

        {error && <div className="packs-alert error">{error}</div>}
        {message && <div className="packs-alert success">{message}</div>}

        <section className="packs-section">
          {loading ? (
            <div className="packs-state">Loading your packs...</div>
          ) : packs.length === 0 ? (
            <div className="packs-state">No unopened packs found.</div>
          ) : (
            <div className="packs-grid">
              {packs.map((pack) => (
                <PackCard
                  key={pack.template_id}
                  pack={pack}
                  onViewDrops={handleViewDrops}
                  onOpen={handleOpenPack}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {(selectedSale || dropLoading || dropError || dropDetail) && (
        <DropTableModal
          detail={dropDetail}
          loading={dropLoading}
          error={dropError}
          onClose={closeDropModal}
        />
      )}
    </div>
  );
}
