import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { toIpfsUrl } from '../utils/ipfs';
import './QuickBagPicker.css';

function assetType(asset) {
  return String(
    asset?.nft_type || asset?.tool_type || asset?.schema ||
    asset?.type || asset?.name || ''
  ).toLowerCase();
}

export default function QuickBagPicker({
  open,
  wallet,
  category,
  title,
  actionLabel,
  pendingAssetId,
  onConfirm,
  onClose,
}) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !wallet) return undefined;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    axios.get(`${process.env.REACT_APP_API_BASE_URL}/bag/${wallet}`, {
      signal: controller.signal,
      params: { _: Date.now() },
    })
      .then((response) => setAssets(response.data?.assets || []))
      .catch((requestError) => {
        if (requestError?.code !== 'ERR_CANCELED') setError('Could not load your Field Bag.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [open, wallet]);

  const choices = useMemo(() => assets.filter((asset) => {
    const type = assetType(asset);
    if (category === 'seeds') return type.includes('seed');
    if (category === 'compost') return type.includes('compost');
    return false;
  }), [assets, category]);

  const groupedChoices = useMemo(() => {
    const groups = new Map();
    choices.forEach((asset) => {
      const key = String(asset.template_id || asset.name || asset.asset_id);
      if (!groups.has(key)) groups.set(key, { key, items: [], asset });
      groups.get(key).items.push(asset);
    });
    return Array.from(groups.values());
  }, [choices]);

  if (!open) return null;

  return (
    <div className="quick-bag-overlay" onClick={() => !pendingAssetId && onClose?.()}>
      <section className={`quick-bag-modal quick-bag-${category}`} onClick={(event) => event.stopPropagation()}>
        <header>
          <div><span>Field Bag</span><h3>{title}</h3></div>
          <button type="button" className="quick-bag-close" onClick={onClose} disabled={Boolean(pendingAssetId)} aria-label="Close Field Bag picker" title="Close">×</button>
        </header>
        {loading && <div className="quick-bag-state">Checking your bag…</div>}
        {error && <div className="quick-bag-state is-error">{error}</div>}
        {!loading && !error && choices.length === 0 && (
          <div className="quick-bag-state">No matching NFTs are available in your Field Bag.</div>
        )}
        <div className="quick-bag-grid">
          {groupedChoices.map((group) => {
            const asset = group.asset;
            const id = String(asset.asset_id || '');
            const image = toIpfsUrl(asset.image || asset.img || asset?.data?.img);
            const pending = pendingAssetId === id;
            return (
              <article key={group.key} className={pending ? 'is-pending' : ''}>
                <div className="quick-bag-art">
                  {image && <img src={image} alt={asset.name || 'Bag item'} />}
                  <span className="quick-bag-quantity">×{group.items.length}</span>
                  {pending && <span className="quick-bag-processing">Processing…</span>}
                </div>
                <div className="quick-bag-card-copy">
                  <span className="quick-bag-type">{category === 'seeds' ? 'Seed supply' : 'Farm supply'}</span>
                  <strong>{asset.name || `NFT #${id}`}</strong>
                  <small>{group.items.length} available · Template #{asset.template_id || '—'}</small>
                </div>
                <button type="button" disabled={Boolean(pendingAssetId)} onClick={() => onConfirm?.(asset)}>
                  {pending ? 'Processing…' : `${actionLabel} 1`}
                </button>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
