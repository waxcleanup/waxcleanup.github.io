import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { buyPack } from '../services/shopActions';
import './ShopPage.css';

const API_BASE =
  process.env.REACT_APP_API_BASE_URL || 'https://maestrobeatz.servegame.com';

const IPFS_GATEWAY =
  process.env.REACT_APP_IPFS_GATEWAY || 'https://maestrobeatz.servegame.com/ipfs';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'packs', label: 'Packs' },
  { key: 'machines', label: 'Machines' },
  { key: 'cores', label: 'Cores' },
  { key: 'resources', label: 'Resources' },
];

function normalizeActor(session) {
  if (!session) return '';

  const actor = session?.actor ?? session?.permissionLevel?.actor;

  if (!actor) return '';
  if (typeof actor === 'string') return actor;
  if (typeof actor?.toString === 'function') return actor.toString();
  if (typeof actor?.value !== 'undefined') return String(actor.value);

  return String(actor);
}

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

function formatNumber(value) {
  const num = Number(value || 0);
  return num.toLocaleString(undefined, {
    maximumFractionDigits: 8,
  });
}

function formatPrice(item) {
  return `${formatNumber(item.price)} ${item.token || ''}`.trim();
}

function formatTotal(item, qty) {
  const total = Number(item.price || 0) * Number(qty || 0);
  return `${formatNumber(total)} ${item.token || ''}`.trim();
}

function mapCategoryToType(category) {
  if (!category) return 'item';
  return category.toLowerCase();
}

function getMaxQty(item) {
  const txLimit = Number(item.tx_limit || 1);

  if (item.remaining === null || item.remaining === undefined) {
    return Math.max(1, txLimit);
  }

  return Math.max(1, Math.min(txLimit, Number(item.remaining)));
}

function formatDropQty(drop) {
  if (!drop) return '';
  if (drop.qty_min === drop.qty_max) return `x${drop.qty_min}`;
  return `x${drop.qty_min}-${drop.qty_max}`;
}

function DropItem({ item, showWeight = false }) {
  const imageUrl = buildIpfsUrl(item.image);

  return (
    <div className="drop-item">
      <div className="drop-item-image-wrap">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={item.name}
            className="drop-item-image"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="drop-item-placeholder">?</div>
        )}
      </div>

      <div className="drop-item-body">
        <div className="drop-item-name">{item.name}</div>
        <div className="drop-item-meta">
          <span>{formatDropQty(item)}</span>
          {showWeight && <span>{item.weight}% weight</span>}
        </div>
      </div>
    </div>
  );
}

function DropTableModal({ detail, loading, error, onClose }) {
  if (!detail && !loading && !error) return null;

  const sale = detail?.sale;

  return (
    <div className="shop-modal-overlay" onClick={onClose}>
      <div
        className="shop-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="shop-modal-close" onClick={onClose}>
          ×
        </button>

        {loading ? (
          <div className="shop-modal-loading">Loading drops...</div>
        ) : error ? (
          <div className="shop-modal-error">{error}</div>
        ) : (
          <>
            <div className="shop-modal-header">
              <div className="shop-modal-pack">
                {sale?.image ? (
                  <img
                    src={buildIpfsUrl(sale.image)}
                    alt={sale.name}
                    className="shop-modal-pack-image"
                  />
                ) : (
                  <div className="shop-modal-pack-placeholder">PACK</div>
                )}
              </div>

              <div className="shop-modal-info">
                <p className="shop-modal-kicker">Drop Table</p>
                <h2 className="shop-modal-title">{sale?.name}</h2>
                <p className="shop-modal-description">{sale?.description}</p>

                <div className="shop-modal-stats">
                  <span>{formatPrice(sale)}</span>
                  <span>
                    Remaining:{' '}
                    {sale?.remaining === null || sale?.remaining === undefined
                      ? 'Unlimited'
                      : formatNumber(sale.remaining)}
                  </span>
                </div>
              </div>
            </div>

            <div className="shop-modal-section">
              <h3 className="shop-modal-section-title">Guaranteed Drops</h3>
              <div className="drop-list">
                {(detail?.guaranteed || []).map((drop) => (
                  <DropItem
                    key={`g-${drop.id}`}
                    item={drop}
                    showWeight={false}
                  />
                ))}
              </div>
            </div>

            <div className="shop-modal-section">
              <h3 className="shop-modal-section-title">Bonus Drops</h3>
              <div className="drop-list">
                {(detail?.bonus || []).map((drop) => (
                  <DropItem
                    key={`b-${drop.id}`}
                    item={drop}
                    showWeight
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ShopItemCard({ item, isLoggedIn, onBuy, onViewDrops, buying }) {
  const imageUrl = buildIpfsUrl(item.image);
  const soldOut = Boolean(item.is_sold_out);
  const type = mapCategoryToType(item.category);

  const maxQty = getMaxQty(item);
  const [qty, setQty] = React.useState(1);

  useEffect(() => {
    setQty((prev) => {
      if (soldOut) return 1;
      return Math.min(Math.max(1, prev), maxQty);
    });
  }, [maxQty, soldOut]);

  const decreaseQty = () => {
    setQty((prev) => Math.max(1, prev - 1));
  };

  const increaseQty = () => {
    setQty((prev) => Math.min(maxQty, prev + 1));
  };

  const handleInputChange = (e) => {
    const value = Number(e.target.value);
    if (Number.isNaN(value)) {
      setQty(1);
      return;
    }
    setQty(Math.min(maxQty, Math.max(1, value)));
  };

  return (
    <div className={`shop-card ${soldOut ? 'sold-out' : ''}`}>
      <div className="shop-card-image-wrap">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={item.name}
            className="shop-card-image"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="shop-card-image-placeholder">
            <span>{type.toUpperCase()}</span>
          </div>
        )}
      </div>

      <div className="shop-card-body">
        <div className="shop-card-top">
          <span className={`shop-type-badge shop-type-${type}`}>
            {type}
          </span>
          <span className="shop-template-id">TPL #{item.template_id}</span>
        </div>

        <h3 className="shop-card-title">{item.name}</h3>

        <p className="shop-card-description">{item.description}</p>

        <div className="shop-card-meta compact">
          <div className="shop-compact-block">
            <span className="shop-meta-label">Price</span>
            <span className="shop-price">{formatPrice(item)}</span>
          </div>

          <div className="shop-compact-block right">
            <span className="shop-meta-label">Remaining</span>
            <span className="shop-remaining">
              {item.remaining === null || item.remaining === undefined
                ? 'Unlimited'
                : formatNumber(item.remaining)}
            </span>
          </div>
        </div>

        <div className="shop-card-submeta">
          <span>Tx Limit: {formatNumber(item.tx_limit)}</span>
        </div>

        <div className="shop-qty-section">
          <span className="shop-meta-label">Quantity</span>

          <div className="shop-qty-controls">
            <button
              type="button"
              className="shop-qty-btn"
              onClick={decreaseQty}
              disabled={soldOut || buying || qty <= 1}
            >
              −
            </button>

            <input
              type="number"
              min="1"
              max={maxQty}
              value={qty}
              onChange={handleInputChange}
              className="shop-qty-input"
              disabled={soldOut || buying}
            />

            <button
              type="button"
              className="shop-qty-btn"
              onClick={increaseQty}
              disabled={soldOut || buying || qty >= maxQty}
            >
              +
            </button>
          </div>
        </div>

        <div className="shop-total-row">
          <span className="shop-meta-label">Total</span>
          <span className="shop-total-value">{formatTotal(item, qty)}</span>
        </div>

        <div className="shop-card-actions">
          <button
            className="shop-secondary-btn"
            onClick={() => onViewDrops(item)}
            type="button"
            disabled={buying}
          >
            View Drops
          </button>

          <button
            className="shop-buy-btn compact"
            onClick={() => onBuy(item, qty)}
            disabled={soldOut || buying}
          >
            {soldOut
              ? 'Sold Out'
              : buying
                ? 'Processing...'
                : isLoggedIn
                  ? `Buy ${qty}`
                  : 'Connect Wallet'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ShopPage({ session, onLogin }) {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [buyMessage, setBuyMessage] = useState('');
  const [buying, setBuying] = useState(false);

  const [selectedSale, setSelectedSale] = useState(null);
  const [dropDetail, setDropDetail] = useState(null);
  const [dropLoading, setDropLoading] = useState(false);
  const [dropError, setDropError] = useState('');

  const navigate = useNavigate();
  const isLoggedIn = !!session;
  const actorName = normalizeActor(session);

  useEffect(() => {
    let mounted = true;

    const fetchShopItems = async () => {
      try {
        setLoading(true);
        setError('');
        setBuyMessage('');

        const response = await axios.get(`${API_BASE}/shop/sales`);
        const shopItems = Array.isArray(response.data?.sales)
          ? response.data.sales
          : [];

        if (mounted) {
          setItems(shopItems);
        }
      } catch (err) {
        console.error('Failed to fetch shop items:', err);
        if (mounted) {
          setItems([]);
          setError('Unable to load shop data right now.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchShopItems();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredItems = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter(
      (item) => mapCategoryToType(item.category) === filter
    );
  }, [items, filter]);

  const handleBuy = async (item, qty) => {
    setBuyMessage('');

    if (!isLoggedIn) {
      if (typeof onLogin === 'function') {
        onLogin();
      } else {
        setBuyMessage(`Connect your wallet to buy ${item.name}.`);
      }
      return;
    }

    try {
      setBuying(true);

      const txId = await buyPack({
        accountName: actorName,
        saleId: item.sale_id,
        qty,
        item,
      });

      setBuyMessage(`Purchased ${item.name} x${qty}. Tx: ${txId}`);

      setItems((prevItems) =>
        prevItems.map((sale) => {
          if (sale.sale_id !== item.sale_id) return sale;

          if (sale.remaining === null || sale.remaining === undefined) {
            return {
              ...sale,
              sold: Number(sale.sold || 0) + Number(qty || 0),
            };
          }

          const nextRemaining = Math.max(
            0,
            Number(sale.remaining || 0) - Number(qty || 0)
          );

          return {
            ...sale,
            sold: Number(sale.sold || 0) + Number(qty || 0),
            remaining: nextRemaining,
            is_sold_out: nextRemaining === 0,
          };
        })
      );
    } catch (err) {
      console.error('Buy failed:', err);
      setBuyMessage(err?.message || 'Purchase failed.');
    } finally {
      setBuying(false);
    }
  };

  const handleViewDrops = async (item) => {
    try {
      setSelectedSale(item.sale_id);
      setDropLoading(true);
      setDropError('');
      setDropDetail(null);

      const response = await axios.get(`${API_BASE}/shop/sales/${item.sale_id}`);
      setDropDetail(response.data);
    } catch (err) {
      console.error('Failed to fetch drop detail:', err);
      setDropError('Unable to load drop table right now.');
    } finally {
      setDropLoading(false);
    }
  };

  const closeDropModal = () => {
    setSelectedSale(null);
    setDropDetail(null);
    setDropError('');
    setDropLoading(false);
  };

  return (
    <div className="shop-page">
      <section className="shop-hero">
        <div className="shop-hero-content">
          <p className="shop-kicker">CleanupCentr Marketplace</p>
          <h1 className="shop-title">Shop Packs and Game Items</h1>
          <p className="shop-subtitle">
            Browse available on-chain shop items, view live prices and supply,
            and prepare to buy directly from your wallet.
          </p>

          <div className="shop-hero-actions">
            {!isLoggedIn ? (
              <button className="shop-primary-btn" onClick={onLogin}>
                Connect Wallet
              </button>
            ) : (
              <div className="shop-wallet-badge">Logged in as {actorName}</div>
            )}
          </div>
        </div>
      </section>

      <section className="shop-controls">
        <div className="shop-filter-row">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={`shop-filter-btn ${filter === f.key ? 'active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      {error && <div className="shop-alert">{error}</div>}
      {buyMessage && <div className="shop-alert success">{buyMessage}</div>}

      <section className="shop-grid-section">
        {loading ? (
          <div className="shop-loading">Loading shop...</div>
        ) : filteredItems.length === 0 ? (
          <div className="shop-empty">No shop items found for this category.</div>
        ) : (
          <div className="shop-grid">
            {filteredItems.map((item) => (
              <ShopItemCard
                key={item.sale_id || item.template_id}
                item={item}
                isLoggedIn={isLoggedIn}
                onBuy={handleBuy}
                onViewDrops={handleViewDrops}
                buying={buying}
              />
            ))}
          </div>
        )}
      </section>

      <section className="shop-footer">
        <button className="shop-back-btn" onClick={() => navigate('/')}>
          ← Back to Home
        </button>
      </section>

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