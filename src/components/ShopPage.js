import TokenLogo from './TokenLogo';
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { buyPack } from '../services/shopActions';
import { usePlayerResources } from '../hooks/PlayerResourcesContext';
import './ShopPage.css';
import { fetchShopUsdRate, tokenPriceKey, estimatedUsd } from '../services/shopUsd';

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

function getTokenBalance(resources, symbol) {
  const key = String(symbol || '').trim().toLowerCase();
  const supported = ['wax', 'trash', 'cinder', 'tomatoe', 'bananaz'];
  if (!supported.includes(key)) return null;

  const amount = Number(resources?.[key]?.amount);
  return Number.isFinite(amount) ? amount : null;
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

function dropRange(drop) {
  if (Number(drop.template_id) <= 0) return { min: 0, max: 0 };
  return { min: Number(drop.qty_min), max: Number(drop.qty_max) };
}

export function slotNftRange(drops) {
  const ranges = drops.map(dropRange);
  return { min: Math.min(...ranges.map(r => r.min)), max: Math.max(...ranges.map(r => r.max)) };
}

export function crateNftRange(detail) {
  const ranges = (detail.guaranteed || []).map(dropRange);
  const slots = {};
  for (const drop of detail.bonus || []) (slots[drop.slot] ||= []).push(drop);
  ranges.push(...Object.values(slots).map(slotNftRange));
  return ranges.reduce((total, range) => ({ min: total.min + range.min, max: total.max + range.max }), { min: 0, max: 0 });
}

function formatNftRange({ min, max }) {
  return `${min === max ? min : `${min}–${max}`} ${max === 1 && min === 1 ? 'NFT' : 'NFTs'}`;
}

function formatDropQty(drop) {
  return formatNftRange(dropRange(drop));
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
          <div className="drop-item-placeholder">{Number(item.template_id) === 0 ? '—' : 'NFT'}</div>
        )}
      </div>

      <div className="drop-item-body">
        <div className="drop-item-name">{item.name}</div>
        <div className="drop-item-meta">
          <span>{formatDropQty(item)}</span>
          {showWeight && <span>{item.chance == null ? `Weight ${item.weight}` : `${Number(item.chance.toFixed(2))}% chance`}</span>}
        </div>
      </div>
    </div>
  );
}

function DropTableModal({ detail, loading, error, onClose }) {
  const modal = React.useRef();
  useEffect(() => { modal.current?.showModal(); }, []);
  const sale = detail?.sale;
  const bonusSlots = Object.entries((detail?.bonus || []).reduce((groups, drop) => {
    const slot = Number(drop.slot);
    (groups[slot] ||= []).push(drop);
    return groups;
  }, {})).sort(([a], [b]) => Number(a) - Number(b));

  return (
    <dialog ref={modal} className="shop-contents-dialog" aria-label="Crate contents" onCancel={e => { e.preventDefault(); onClose(); }}>
      <div className="shop-item-dialog-header"><span>Crate contents</span><button className="shop-item-close" aria-label="Close contents" onClick={onClose} type="button">×</button></div>
      <div className="shop-contents-scroll">

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
                
                <h2 className="shop-modal-title">{sale?.name}</h2>
                <details className="shop-contents-description"><summary>About this crate</summary><p>{sale?.description}</p></details>

                <div className="shop-modal-stats">
                  <span><TokenLogo token={{symbol: sale.token, contract: sale.token_contract, precision: Number(sale.decimals)}} size={18} />{formatPrice(sale)}</span>
                  <span>
                    Remaining:{' '}
                    {sale?.remaining === null || sale?.remaining === undefined
                      ? 'Unlimited'
                      : formatNumber(sale.remaining)}
                  </span>
                </div>
              </div>
            </div>

            {!detail?.guaranteed?.length && !detail?.bonus?.length && <p role="status">Contents are not available for this item yet.</p>}
            {(!!detail?.guaranteed?.length || !!detail?.bonus?.length) && (
              <div className="shop-nft-count"><span>Total per crate</span><strong>{formatNftRange(crateNftRange(detail))}</strong></div>
            )}
            {!!detail?.guaranteed?.length && (
              <div className="shop-modal-section">
                <h3 className="shop-modal-section-title">Guaranteed Drops</h3>
                <div className="drop-list">
                  {detail.guaranteed.map((drop) => (
                    <DropItem
                      key={`g-${drop.id}-${drop.template_id}`}
                      item={drop}
                      showWeight={false}
                    />
                  ))}
                </div>
              </div>
            )}

            {!!detail?.bonus?.length && (
              <div className="shop-modal-section">
                <h3 className="shop-modal-section-title">Guaranteed slots · randomized drops</h3>
                <p className="shop-outcome-note">Every slot is included. Its NFT outcome is randomized using the chances below.{detail.bonus.some(drop => Number(drop.template_id) <= 0 || Number(drop.qty_max) === 0) && ' “No Bonus” means that slot adds no NFT.'}</p>
                {bonusSlots.map(([slot, drops]) => (
                  <section className="shop-drop-slot" key={slot} aria-label={`Slot ${Number(slot) + 1}`}>
                    <div className="shop-drop-slot-header">
                      <h4>Slot {Number(slot) + 1}</h4>
                      <span>Guaranteed slot · 1 random outcome</span>
                    </div>
                    <div className="shop-slot-count">Drops {formatNftRange(slotNftRange(drops))}</div>
                    <div className="drop-list">
                      {drops.map(drop => (
                        <DropItem key={`b-${drop.id}-${drop.template_id}`} item={drop} showWeight />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </dialog>
  );
}

const PRODUCT_STORIES = {
  '904730': { title: 'Start your next harvest', summary: 'Seeds and compost to put your farm to work.', features: ['Enhanced and basic tomato seeds', 'Compost for your farm', 'Chance of bonus resources'] },
  '900986': { title: 'Build up your farm', summary: 'A restoration supply crate for your next growing project.', features: ['4 EcoFusion Compost NFTs', '1 Seed Pack NFT', 'A randomized bonus slot'] },
};
export function ShopItemCard({
  item,
  isLoggedIn,
  onBuy,
  onViewDrops,
  buying,
  tokenBalance,
  balanceReady,
  usdRate,
  rateNow = Date.now(),
}) {
  const story = PRODUCT_STORIES[String(item.template_id)];
  const unitUsd = estimatedUsd(item.price, usdRate, rateNow);
  const imageUrl = buildIpfsUrl(item.image);
  const soldOut = Boolean(item.is_sold_out);
  const type = mapCategoryToType(item.category);

  const maxQty = getMaxQty(item);
  const [qty, setQty] = React.useState(1);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const detailDialog = React.useRef();
  useEffect(() => { if (detailOpen) detailDialog.current?.showModal(); }, [detailOpen]);

  const totalCost = Number(item.price || 0) * Number(qty || 0);
  const affordabilityKnown =
    isLoggedIn && balanceReady && tokenBalance !== null;
  const insufficientFunds =
    affordabilityKnown && Number(tokenBalance) < totalCost;
  const shortfall = Math.max(0, totalCost - Number(tokenBalance || 0));
  const quantityIncreased = qty > 1;

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
    setQty(Math.min(maxQty, Math.max(1, Math.floor(value))));
  };

  return (
    <article
      aria-label={item.name}
      className={`shop-card shop-thumbnail-card ${soldOut ? 'sold-out' : ''} ${
        insufficientFunds ? 'insufficient-funds' : ''
      }`}
    >
      <button type="button" className="shop-card-image-wrap shop-thumbnail-trigger" aria-label={`View ${item.name}`} onClick={() => setDetailOpen(true)}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={item.name}
            className="shop-card-image"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="shop-card-image-placeholder">
            <span>{type.toUpperCase()}</span>
          </div>
        )}
        <span className="shop-thumbnail-peek"><strong>{story?.title || 'Discover this item'}</strong><span>{story?.summary || 'View contents, quantity and purchase details.'}</span><b>View item →</b></span>
      </button>
      <div className="shop-thumbnail-info"><span className="shop-thumbnail-category">{soldOut ? 'Sold out' : type}</span><h3>{item.name}</h3><strong className="shop-thumbnail-price"><TokenLogo token={{symbol: item.token, contract: item.token_contract, precision: Number(item.decimals)}} size={18} />{formatPrice(item)}</strong><span className="shop-thumbnail-usd">{unitUsd || 'USD estimate unavailable'}</span><button type="button" className="shop-thumbnail-view" onClick={() => setDetailOpen(true)}>View item</button></div>
      {detailOpen && <dialog ref={detailDialog} className="shop-item-dialog" aria-label={item.name} onCancel={e => { e.preventDefault(); if (!buying) setDetailOpen(false); }}>
      <div className="shop-item-dialog-header"><span>Item details</span><button type="button" className="shop-item-close" aria-label="Close item details" disabled={buying} onClick={() => setDetailOpen(false)}>×</button></div>
      <div className="shop-item-scroll"><div className="shop-card-body">
        <div className="shop-card-top">
          <span className={`shop-type-badge shop-type-${type}`}>
            {type}
          </span>
          <span className="shop-template-id">TPL #{item.template_id}</span>
        </div>

        <h3 className="shop-card-title">{item.name}</h3>

        <p className="shop-card-description">{story?.summary || item.description}</p>
        {story && <details className="shop-product-description"><summary>Contents &amp; description</summary><ul className="shop-product-features">{story.features.map(feature => <li key={feature}>{feature}</li>)}</ul><p>{item.description}</p></details>}

        <div className="shop-card-meta compact">
          <div className="shop-compact-block">
            <span className="shop-meta-label">Price per item</span>
            <span className="shop-price"><TokenLogo token={{symbol: item.token, contract: item.token_contract, precision: Number(item.decimals)}} size={18} />{formatPrice(item)}</span>
            <span className="shop-usd-price">{unitUsd || 'USD estimate unavailable'}</span>
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

        <div className="shop-qty-section">
          <div className="shop-qty-label-row">
            <span className="shop-meta-label">Quantity <small>· max {formatNumber(item.tx_limit)}</small></span>
            {quantityIncreased && (
              <span className="shop-qty-selected">x{qty} selected</span>
            )}
          </div>

          <div className="shop-qty-controls">
            <button
              type="button"
              className="shop-qty-btn decrease"
              onClick={decreaseQty}
              disabled={soldOut || buying || qty <= 1}
              aria-label="Decrease quantity"
            >
              −
            </button>

            <input
              type="number"
              aria-label={`Quantity for ${item.name}`}
              step="1"
              min="1"
              max={maxQty}
              value={qty}
              onChange={handleInputChange}
              className="shop-qty-input"
              disabled={soldOut || buying}
            />

            <button
              type="button"
              className="shop-qty-btn increase"
              onClick={increaseQty}
              disabled={soldOut || buying || qty >= maxQty}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        </div>

        <div className="shop-total-row">
          <span className="shop-meta-label">Total</span>
          <span
            className={`shop-total-value ${
              insufficientFunds ? 'insufficient' : quantityIncreased ? 'increased' : ''
            }`}
          >
            <TokenLogo token={{symbol: item.token, contract: item.token_contract, precision: Number(item.decimals)}} size={18} />{formatTotal(item, qty)}
          </span>
        </div>

        <div className="shop-usd-total"><span>Estimated total</span><strong>{estimatedUsd(totalCost, usdRate, rateNow) || 'USD estimate unavailable'}</strong></div>
        {unitUsd && <p className="shop-rate-note">Alcor market estimate · checked {new Date(usdRate.checkedAt).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}. You pay in {item.token}; swap costs and price changes can affect the USD equivalent.</p>}
        {insufficientFunds && (
          <div className="shop-affordability-warning" role="status">
            Not enough {item.token}. Need {formatNumber(shortfall)} more.
          </div>
        )}

        <div className="shop-card-actions">
          <button
            className="shop-secondary-btn"
            onClick={() => { setDetailOpen(false); onViewDrops(item); }}
            type="button"
            disabled={buying}
          >
            Explore contents
          </button>

          <button
            className="shop-buy-btn compact"
            onClick={async () => { await onBuy(item, qty); setDetailOpen(false); }}
            disabled={soldOut || buying || insufficientFunds}
            type="button"
          >
            {soldOut
              ? 'Sold Out'
              : buying
                ? 'Processing...'
                : insufficientFunds
                  ? `Need more ${item.token}`
                : isLoggedIn
                  ? `Buy ${qty} ${type === 'packs' ? qty === 1 ? 'crate' : 'crates' : qty === 1 ? 'item' : 'items'}`
                  : 'Connect Wallet'}
          </button>
        </div>
        {insufficientFunds && <Link className="shop-get-tokens" to="/exchange">Get {item.token} in Exchange →</Link>}
        {type === 'packs' && <p className="shop-open-note">After purchase, open your crate in <Link to="/market/blends">Blends</Link>.</p>}
      </div>
      </div></dialog>}
    </article>
  );
}

export default function ShopPage({ session, onLogin, embedded = false }) {
  const [items, setItems] = useState([]);
  const [usdRates, setUsdRates] = useState({});
  const [rateNow, setRateNow] = useState(Date.now());
  useEffect(() => {
    let active = true;
    const tokens = [...new Map(items.map(item => [tokenPriceKey(item), item])).values()];
    async function refreshRates() {
      const results = await Promise.all(tokens.map(async item => {
        try { return [tokenPriceKey(item), await fetchShopUsdRate(item)]; }
        catch { return [tokenPriceKey(item), null]; }
      }));
      if (active) { setUsdRates(Object.fromEntries(results)); setRateNow(Date.now()); }
    }
    refreshRates();
    const refresh = setInterval(refreshRates, 60000);
    const clock = setInterval(() => setRateNow(Date.now()), 10000);
    return () => { active = false; clearInterval(refresh); clearInterval(clock); };
  }, [items]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [buyMessage, setBuyMessage] = useState('');
  const [buying, setBuying] = useState(false);

  const [selectedSale, setSelectedSale] = useState(null);
  const dropRequest = React.useRef(0);
  useEffect(() => () => { dropRequest.current += 1; }, []);
  const [dropDetail, setDropDetail] = useState(null);
  const [dropLoading, setDropLoading] = useState(false);
  const [dropError, setDropError] = useState('');

  const navigate = useNavigate();
  const isLoggedIn = !!session;
  const actorName = normalizeActor(session);
  const { resources, lastUpdated } = usePlayerResources();
  const balanceReady = Boolean(lastUpdated);

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
    const request = ++dropRequest.current;
    try {
      setSelectedSale(item.sale_id);
      setDropLoading(true);
      setDropError('');
      setDropDetail(null);

      const response = await axios.get(`${API_BASE}/shop/sales/${item.sale_id}`);
      if (request === dropRequest.current) setDropDetail(response.data);
    } catch (err) {
      console.error('Failed to fetch drop detail:', err);
      if (request === dropRequest.current) setDropError('Unable to load drop table right now.');
    } finally {
      if (request === dropRequest.current) setDropLoading(false);
    }
  };

  const closeDropModal = () => {
    dropRequest.current += 1;
    setSelectedSale(null);
    setDropDetail(null);
    setDropError('');
    setDropLoading(false);
  };

  return (
    <div className="shop-page">
      {!embedded && <section className="shop-hero">
        <div className="shop-hero-content">
          <p className="shop-kicker">CleanupCentr Marketplace</p>
          <h1 className="shop-title">Shop Packs and Game Items</h1>
          <p className="shop-subtitle">
            Browse available on-chain shop items, view live prices and supply,
            and prepare to buy directly from your wallet.
          </p>

          <div className="shop-hero-actions">
            {!isLoggedIn ? (
              <button className="shop-primary-btn" onClick={onLogin} type="button">
                Connect Wallet
              </button>
            ) : (
              <div className="shop-wallet-badge">Logged in as {actorName}</div>
            )}
          </div>
        </div>
      </section>}

      <section className="shop-controls">
        <div className="shop-filter-row">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
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
                tokenBalance={getTokenBalance(resources, item.token)}
                balanceReady={balanceReady}
                usdRate={usdRates[tokenPriceKey(item)]}
                rateNow={rateNow}
              />
            ))}
          </div>
        )}
      </section>

      <section className="shop-footer">
        <button className="shop-back-btn" onClick={() => navigate('/')} type="button">
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
