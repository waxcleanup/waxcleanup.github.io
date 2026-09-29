import TokenLogo from './TokenLogo';
/* global BigInt */
import React, { useEffect, useRef, useState } from 'react';
import { useSession } from '../hooks/SessionContext';
import { toIpfsUrl } from '../utils/ipfs';
import { COLLECTION, PAGE_SIZE, getAssetListings, getMarketSales, getOwnedMarketAssets, getMarketSchemas, getMarketFees, getMarketPriceSuggestions, salePrice, supportedSale, prepareMarketOperation, executeMarketOperation } from '../services/atomicMarketMainnet';
import './MarketplacePage.css';

const nameOf = asset => asset?.name || asset?.data?.name || asset?.template?.immutable_data?.name || `NFT #${asset?.asset_id}`;
const metadataOf = asset => ({ ...asset?.template?.immutable_data, ...asset?.immutable_data, ...asset?.mutable_data, ...asset?.data });
const percent = value => `${Number((value * 100).toFixed(4))}%`;
const emptyFilters = { search: '', schema: '', rarity: '', template: '', minPrice: '', maxPrice: '', sort: 'created', order: 'desc' };
function estimatedProceeds(quantity, fees) {
  const raw = BigInt(quantity.split(' ')[0].replace('.', ''));
  const scale = 100000000n;
  const deducted = ['collection', 'maker', 'taker'].reduce((sum, key) => sum + raw * BigInt(Math.round(fees[key] * 1e8)) / scale, 0n);
  const net = raw - deducted;
  return `${net / scale}.${String(net % scale).padStart(8, '0')} WAX`;
}
function AssetSummary({ asset }) {
  const data = metadataOf(asset);
  const fields = ['Type', 'type', 'Energy Capacity', 'Fuel Capacity', 'Durability'].filter(key => data[key] != null).slice(0, 3);
  return <div className="market-card-stats"><span>Template #{asset?.template?.template_id ?? asset?.template_id ?? '—'}</span>{fields.map(key => <span key={key}>{key}: <b>{String(data[key])}</b></span>)}{fields.some(key => key.includes('Capacity') || key === 'Durability') && <small>NFT metadata · live machine state may differ</small>}</div>;
}
function AssetImage({ asset }) {
  const [failed, setFailed] = useState(false);
  const src = toIpfsUrl(metadataOf(asset).img);
  return src && !failed ? <img src={src} alt={nameOf(asset)} loading="lazy" onError={() => setFailed(true)} /> : <div className="market-image-empty">NFT</div>;
}
function NftDetails({ asset }) {
  const data = metadataOf(asset);
  const details = Object.entries(data).filter(([key, value]) => !['name', 'img', 'video', 'audio', 'description'].includes(key.toLowerCase()) && value !== null && value !== undefined);
  return <><p className="market-description">{data.Description || data.description || 'A collectible from the CleanupCentr collection.'}</p><dl className="market-attributes">{details.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</dd></div>)}</dl></>;
}
function NftDetailDialog({ asset, sale, onClose }) {
  const dialog = useRef();
  useEffect(() => { dialog.current.showModal(); }, []);
  let price = null;
  try { if (sale) price = salePrice(sale); } catch { price = 'Unsupported currency'; }
  const information = [
    ['Asset ID', asset.asset_id], ['Collection', asset.collection?.collection_name || COLLECTION],
    ['Schema', asset.schema?.schema_name || asset.schema_name],
    ['Template', asset.template?.template_id ?? asset.template_id],
    ['Mint number', asset.template_mint], ['Owner', asset.owner || sale?.seller],
    ['Transferable', asset.is_transferable == null ? null : asset.is_transferable ? 'Yes' : 'No'],
    ['Burnable', asset.is_burnable == null ? null : asset.is_burnable ? 'Yes' : 'No'],
  ].filter(([, value]) => value !== null && value !== undefined && value !== '');
  return <dialog ref={dialog} className="market-modal market-detail-modal" aria-labelledby="nft-detail-title" onCancel={e => { e.preventDefault(); onClose(); }}>
    <header className="market-detail-header"><h2 id="nft-detail-title">{nameOf(asset)}</h2><button type="button" onClick={onClose} aria-label="Close NFT details">×</button></header>
    <div className="market-detail-layout"><div className="market-detail-art"><AssetImage asset={asset} /></div><div className="market-detail-content">
    <h3>Description and attributes</h3><NftDetails asset={asset} />
    <PriceSuggestions asset={asset} /><h3>NFT information</h3><dl className="market-attributes">{information.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{String(value)}</dd></div>)}</dl>
    {sale && <section aria-label="Listing details"><h3>Listing details</h3><dl className="market-attributes"><div><dt>Sale ID</dt><dd>{sale.sale_id}</dd></div><div><dt>Seller</dt><dd>{sale.seller}</dd></div><div><dt>Price</dt><dd>{supportedSale(sale) && <TokenLogo symbol="WAX" size={18} />}{price}</dd></div><div><dt>Status</dt><dd>{Number(sale.state) === 0 ? 'Announced · awaiting offer' : 'Listed'}</dd></div></dl>{sale.assets?.length > 1 && <p>Bundle price includes {sale.assets.length} NFTs.</p>}</section>}
    </div></div><div className="market-dialog-actions"><button type="button" onClick={onClose}>Close details</button></div>
  </dialog>;
}
function PriceSuggestions({ asset, disabled, onUse }) {
  const [data, setData] = useState(null); const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true; setData(null);
    getMarketPriceSuggestions(asset).then(result => { if (active) setData(result); }).catch(() => { if (active) setData({ unavailable: 'Comparable prices are temporarily unavailable.' }); });
    return () => { active = false; };
  }, [asset, refresh]);
  return <section className="market-suggestions" aria-label={onUse ? 'Price suggestions' : 'Compare prices'}>
    <div className="market-suggestions-heading"><h3>{onUse ? 'Price suggestions' : 'Compare prices'}</h3><button type="button" disabled={disabled || !data} onClick={() => setRefresh(v => v + 1)}>Refresh prices</button></div>
    {!data ? <p role="status">Checking comparable listings and sales…</p> : data.unavailable ? <p>{data.unavailable}</p> : <>
      <p>Same template #{data.templateId} · single-NFT <TokenLogo symbol="WAX" size={16}/>WAX sales</p>
      {[['lowest', 'Lowest listing', 'Use lowest listing', 'No active listing found'], ['lastSold', 'Last sold', 'Use last sold price', 'No completed sale found']].map(([key, label, button, empty]) => <div className="market-suggestion" key={key}><div><span>{label}</span><strong>{data[key]?.quantity || data[`${key}Error`] || empty}</strong>{key === 'lastSold' && data[key]?.at && <small>Sold {new Date(data[key].at).toLocaleString()}</small>}</div><>{onUse && <button type="button" disabled={disabled || !data[key]} onClick={() => onUse(data[key].price)}>{button}</button>}</></div>)}
      <small>Reference prices from AtomicMarket, checked {new Date(data.checkedAt).toLocaleTimeString()}. Mint numbers and individual NFT stats can affect value. Reference prices are not a valuation or a guaranteed sale price.</small>
    </>}
  </section>;
}
function TradeDialog({ actor, selection, onClose, onComplete, onManageExisting }) {
  const dialog = useRef(); const working = useRef(false); const mounted = useRef(true);
  const [existingSale, setExistingSale] = useState(null);
  const [price, setPrice] = useState(''); const [review, setReview] = useState(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [now, setNow] = useState(Date.now());
  const { kind, sale, asset } = selection;
  const params = { actor, kind, sale, asset, price };
  useEffect(() => { mounted.current = true; dialog.current.showModal(); const timer = setInterval(() => setNow(Date.now()), 1000); return () => { mounted.current = false; clearInterval(timer); }; }, []);
  async function proceed() {
    if (working.current) return;
    working.current = true; setBusy(true); setError('');
    try {
      if (!review) { const next = await prepareMarketOperation(params); if (mounted.current) { setReview(next); setNow(Date.now()); } }
      else { const result = await executeMarketOperation(review, params); if (mounted.current) onComplete(result); }
    } catch (e) { if (mounted.current) { setReview(null); setError(e.message || 'The transaction was not completed.'); if (e.existingSale) setExistingSale(e.existingSale); } }
    finally { working.current = false; if (mounted.current) setBusy(false); }
  }
  const seconds = review ? Math.max(0, Math.ceil((review.expiresAt - now) / 1000)) : 0;
  return <dialog className="market-modal" ref={dialog} aria-labelledby="market-dialog-title" onCancel={e => { e.preventDefault(); if (!busy) onClose(); }}>
    <span className="market-eyebrow">WAX MAINNET · {actor}</span>
    <h2 id="market-dialog-title">{kind === 'buy' ? 'Buy NFT' : kind === 'list' ? 'List NFT for sale' : 'Cancel listing'}</h2>
    <div className="market-sell-preview"><AssetImage asset={asset} /><div><strong>{nameOf(asset)}</strong><small>Asset #{asset.asset_id}</small><small>Collection: {COLLECTION}</small>{sale && <small>Seller: {sale.seller}</small>}</div></div>
    {kind !== 'list' && <NftDetails asset={asset} />}
    {kind === 'list' && <label className="market-modal-price-label">Sale price in <TokenLogo symbol="WAX" size={16}/>WAX<input autoFocus inputMode="decimal" value={price} disabled={busy || !!review} onChange={e => setPrice(e.target.value)} placeholder="10.00000000" /></label>}
    {kind === 'list' && <PriceSuggestions key={asset.asset_id} asset={asset} disabled={busy || !!review} onUse={setPrice} />}
    {kind === 'list' && <details className="market-nft-details"><summary>NFT description and attributes</summary><NftDetails asset={asset} /></details>}
    {kind === 'buy' && <><div className="market-confirm-price"><TokenLogo symbol="WAX" />{salePrice(sale)}</div><PriceSuggestions asset={asset} /></>}
    <p className="market-safety">{kind === 'buy' ? 'You receive this NFT. The exact asset and price are asserted before payment in one transaction.' : kind === 'list' ? 'This creates a public AtomicMarket listing and an NFT offer. Your NFT stays in your wallet until sold. Cancel the listing before transferring or staking it.' : 'This removes the sale and its NFT offer. No WAX payment is made.'}</p>
    {review && <div className="market-review"><h3>Review {kind === 'cancel' ? 'cancellation' : kind === 'buy' ? 'purchase' : 'listing'}</h3>{kind !== 'cancel' && <><p>{kind === 'buy' ? 'You pay' : 'Buyer pays'} <strong><TokenLogo symbol="WAX" size={18} />{review.quantity}</strong></p><p>Fees deducted from the sale proceeds: collection {percent(review.fees.collection)}, maker {percent(review.fees.maker)}, taker {percent(review.fees.taker)}.</p>{kind === 'list' && <div className="market-net"><span>Estimated seller proceeds</span><strong><TokenLogo symbol="WAX" size={18} />{estimatedProceeds(review.quantity, review.fees)}</strong><small>After the listed fees. Additional applicable marketplace fees and changes before sale can affect the final payout.</small></div>}</>}<small>Review expires in {seconds}s. Network resources may apply.</small></div>}
    {error && <p className="market-notice" role="alert">{error}</p>}
    {existingSale && <button disabled={busy} onClick={() => onManageExisting(existingSale)}>Manage existing listing</button>}
    <div className="market-dialog-actions"><button disabled={busy} onClick={review ? () => setReview(null) : onClose}>{review ? 'Edit' : 'Close'}</button><button disabled={busy || !!existingSale || (kind === 'list' && !price.trim()) || (!!review && !seconds)} onClick={proceed}>{busy ? 'Checking / waiting for wallet…' : review ? 'Confirm in wallet' : 'Review transaction'}</button></div>
    {review && !seconds && <p role="status">Review expired. Choose Edit to refresh it.</p>}
  </dialog>;
}
function Listings({ actor, tab, query, onSelect, onManageListing, onInspect, refreshVersion, pendingAssetId }) {
  const [rows, setRows] = useState([]); const [page, setPage] = useState(1); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  useEffect(() => {
    let active = true; setLoading(true); setError(''); setRows([]);
    const request = Promise.resolve().then(() => tab === 'sell' ? getOwnedMarketAssets(actor, { ...query, page }) : getMarketSales({ ...query, page, seller: tab === 'mine' ? actor : '' }));
    request.then(data => { if (active) setRows(data); }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [actor, tab, query, page, refreshVersion]);
  return <section aria-label="NFT listings" aria-busy={loading}>
    <div className="market-section-heading"><h2>{tab === 'sell' ? 'Choose an NFT to sell' : tab === 'mine' ? 'Your active listings' : 'Collection listings'}</h2><span>Page {page}</span></div>
    {loading ? <div className="market-empty" role="status">Loading NFTs…</div> : error ? <div className="market-notice" role="alert">{error} Use Refresh to retry.</div> : !rows.length ? <div className="market-empty"><strong>{tab === 'sell' ? 'No wallet-held NFTs found' : 'No matching listings'}</strong><span>{tab === 'sell' ? 'Staked NFTs must be unstaked before listing.' : 'Try another filter or list a CleanupCentr NFT.'}</span></div> : <div className="market-grid">{rows.map(item => {
      const sale = tab === 'sell' ? null : item; const asset = sale ? sale.assets?.[0] : item;
      const mine = sale?.seller === actor; const supported = sale ? supportedSale(sale) : asset?.is_transferable !== false;
      const existingSale = !sale && asset?.sales?.find(s => [0, 1].includes(Number(s.sale_state ?? s.state)));
      const listed = !!existingSale;
      const syncing = !sale && !listed && String(asset?.asset_id) === pendingAssetId;
      let displayedPrice = 'Unsupported currency'; try { if (sale) displayedPrice = salePrice(sale); } catch {}
      return <article className="market-card" onClick={() => onInspect({ asset, sale: sale || existingSale || null })} key={sale?.sale_id || asset?.asset_id}>
        <button type="button" className="market-card-image market-inspect-image" aria-label={`View details for ${nameOf(asset)} #${asset?.asset_id}`}><AssetImage asset={asset} /><span>{metadataOf(asset).Rarity || metadataOf(asset).rarity || asset?.schema?.schema_name || 'NFT'}</span></button>
        <div className="market-card-body"><small>#{asset?.asset_id}{asset?.template_mint ? ` · Mint #${asset.template_mint}` : ''}</small><h3><button type="button" className="market-inspect-name">{nameOf(asset)}</button></h3>
          <AssetSummary asset={asset} />{sale ? <><div className="market-seller"><span>Seller</span><strong>{sale.seller}</strong></div><div className="market-price"><span>Price</span><strong>{supportedSale(sale) && <TokenLogo symbol="WAX" size={18} />}{displayedPrice}</strong></div></> : <p>{asset?.schema?.schema_name}</p>}
          {listed && <p className="market-listed-status">Already listed · Sale #{existingSale.sale_id}</p>}
          {sale && Number(sale.state) === 0 && <small>Announced · awaiting NFT offer. Cancel before listing again.</small>}
          {sale?.assets?.length > 1 && <small>Bundle · {sale.assets.length} NFTs. Bundle trading is not available here yet.</small>}
          <button className="market-card-action" disabled={syncing || (!listed && !supported)} onClick={e => { e.stopPropagation(); if (listed) onManageListing(existingSale, asset); else onSelect({ kind: sale ? mine ? 'cancel' : 'buy' : 'list', sale, asset }); }}>{syncing ? 'Listing confirmed · updating…' : listed ? 'Manage listing' : !supported ? 'Not supported here' : !actor ? 'Connect wallet to buy' : sale ? mine ? 'Cancel listing' : 'View & buy' : 'Set sale price'}</button>
        </div>
      </article>;
    })}</div>}
    <nav className="market-pagination" aria-label="Listing pages"><button disabled={loading || page === 1} onClick={() => setPage(p => p - 1)}>Previous</button><span>Page {page} · up to {PAGE_SIZE} per page</span><button disabled={loading || !!error || rows.length < PAGE_SIZE} onClick={() => setPage(p => p + 1)}>Next</button></nav>
  </section>;
}
export default function MarketplacePage({ embedded = false }) {
  const { session, handleLogin } = useSession(); const actor = String(session?.permissionLevel?.actor || '');
  const [tab, setTab] = useState('browse'); const [search, setSearch] = useState('');
  const [query, setQuery] = useState(emptyFilters);
  const [filterDraft, setFilterDraft] = useState({ template: '', minPrice: '', maxPrice: '' });
  const [filterError, setFilterError] = useState('');
  const [schemas, setSchemas] = useState([]); const [fees, setFees] = useState(null);
  const [inspection, setInspection] = useState(null);
  const [selection, setSelection] = useState(null); const [refreshVersion, setRefresh] = useState(0); const [notice, setNotice] = useState('');
  const [pendingListing, setPendingListing] = useState(null);
  const [syncRetry, setSyncRetry] = useState(0);
  useEffect(() => { setSelection(null); setNotice(''); setPendingListing(null); }, [actor]);
  useEffect(() => {
    if (!pendingListing || pendingListing.actor !== actor) return;
    let active = true, timer; let attempts = 0;
    async function syncListing() {
      try {
        const sales = await getAssetListings(actor, [pendingListing.assetId]);
        if (!active) return;
        if (sales.length) {
          setPendingListing(null); setRefresh(v => v + 1);
          setNotice(`Transaction confirmed: ${pendingListing.transactionId}. Your listing is now visible.`);
          return;
        }
      } catch { /* Retry transient indexing/network delays without resubmitting the sale. */ }
      if (!active) return;
      if (++attempts < 20) timer = setTimeout(syncListing, 3000);
      else setNotice(`Transaction confirmed: ${pendingListing.transactionId}. Marketplace updates are delayed. Your NFT is already listed; use Refresh to check again.`);
    }
    syncListing();
    return () => { active = false; clearTimeout(timer); };
  }, [actor, pendingListing, syncRetry]);
  useEffect(() => { let active = true; getMarketSchemas().then(s => { if (active) setSchemas(s); }).catch(() => {}); getMarketFees().then(f => { if (active) setFees(f); }).catch(() => {}); return () => { active = false; }; }, [refreshVersion]);
  const changeTab = next => { setTab(next); setSearch(''); setQuery(emptyFilters); setFilterDraft({ template: '', minPrice: '', maxPrice: '' }); setFilterError(''); };
  const select = next => { if (!actor) { handleLogin(); return; } setSelection({ ...next, actor }); };
  return <main className="market-page">
    {!embedded && <section className="market-hero"><div><span className="market-eyebrow">CLEANUPCENTR · WAX MAINNET</span><h1>Marketplace</h1><p>Find your next tool, machine, or collectible. Trade CleanupCentr NFTs directly with other collectors.</p></div><div className="market-registration"><span>Registered marketplace</span><strong>cleanupcentr</strong><small>Shared AtomicMarket listings · WAX mainnet</small></div></section>}
    <nav className="market-tabs" aria-label="Marketplace sections">{[['browse', 'Browse NFTs'], ['sell', 'Sell an NFT'], ['mine', 'My listings']].map(([key, label]) => <button key={key} className={tab === key ? 'active' : ''} aria-pressed={tab === key} onClick={() => changeTab(key)}>{label}</button>)}<button onClick={() => { setRefresh(v => v + 1); setSyncRetry(v => v + 1); }}>Refresh</button></nav>
    {notice && <div className="market-notice success" role="status">{notice}</div>}
    {!actor && tab !== 'browse' ? <div className="market-empty"><strong>Connect your WAX wallet</strong><span>See your NFTs and manage your listings.</span><button onClick={() => handleLogin()}>Connect wallet</button></div> : <>
      <form className="market-filters" onSubmit={e => { e.preventDefault(); const { template, minPrice, maxPrice } = filterDraft;
        if ((template && !/^[1-9]\d*$/.test(template)) || [minPrice, maxPrice].some(p => p && (!/^\d+(\.\d{1,8})?$/.test(p) || Number(p) <= 0)) || (minPrice && maxPrice && Number(minPrice) > Number(maxPrice))) { setFilterError('Enter a valid template ID and positive WAX prices, with minimum no greater than maximum.'); return; }
        setFilterError(''); setQuery(q => ({ ...q, ...filterDraft, search: search.trim() })); }}><label>Search NFTs<input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name…" /></label><button type="submit">Search</button><label>Category<select value={query.schema} onChange={e => setQuery(q => ({ ...q, schema: e.target.value }))}><option value="">All categories</option>{schemas.map(s => <option key={s.schema_name} value={s.schema_name}>{s.schema_name}</option>)}</select></label>{tab !== 'sell' && <label>Sort<select value={`${query.sort}:${query.order}`} onChange={e => { const [sort, order] = e.target.value.split(':'); setQuery(q => ({ ...q, sort, order })); }}><option value="created:desc">Newest listings</option><option value="price:asc">Price: low to high</option><option value="price:desc">Price: high to low</option></select></label>}<label>Rarity<select value={query.rarity} onChange={e => setQuery(q => ({ ...q, rarity: e.target.value }))}><option value="">All rarities</option>{['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic'].map(r => <option key={r}>{r}</option>)}</select></label>{[['template', 'Template ID'], ...(tab === 'sell' ? [] : [['minPrice', 'Min WAX'], ['maxPrice', 'Max WAX']])].map(([key, label]) => <label key={key}>{label}<input inputMode={key === 'template' ? 'numeric' : 'decimal'} value={filterDraft[key]} onChange={e => setFilterDraft(d => ({ ...d, [key]: e.target.value.trim() }))} placeholder="Any" /></label>)}<button type="submit">Apply filters</button><button type="button" onClick={() => changeTab(tab)}>Clear filters</button></form>
      {filterError && <p className="market-notice" role="alert">{filterError}</p>}
      <nav className="market-categories" aria-label="Quick categories"><button aria-pressed={!query.schema} onClick={() => setQuery(q => ({ ...q, schema: '' }))}>All NFTs</button>{schemas.map(s => <button key={s.schema_name} aria-pressed={query.schema === s.schema_name} onClick={() => setQuery(q => ({ ...q, schema: s.schema_name }))}>{s.schema_name}</button>)}</nav>
      <Listings key={`${actor}:${tab}:${JSON.stringify(query)}`} actor={actor} tab={tab} query={query} onSelect={select} onInspect={setInspection} onManageListing={(sale, asset) => supportedSale(sale) ? select({ kind: 'cancel', sale, asset }) : changeTab('mine')} refreshVersion={refreshVersion} pendingAssetId={pendingListing?.actor === actor ? pendingListing.assetId : ''} />
    </>}
    <aside className="market-fees"><strong>Sale fees</strong>{fees ? <><span>Collection: {percent(fees.collection)}</span><span>Maker: {percent(fees.maker)}</span><span>Taker: {percent(fees.taker)}</span></> : <span>Fees are verified when you review a transaction.</span>}<small>Fees come from sale proceeds. Existing listings may retain an earlier royalty; your review shows that listing’s fee. This marketplace currently supports single-NFT, WAX-priced sales.</small></aside>
    {inspection && <NftDetailDialog key={inspection.asset.asset_id} {...inspection} onClose={() => setInspection(null)} />}
    {selection && selection.actor === actor && <TradeDialog key={`${actor}:${selection.kind}:${selection.asset.asset_id}`} onManageExisting={(sale) => { if (supportedSale(sale)) select({ kind: 'cancel', sale, asset: sale.assets[0] }); else { setSelection(null); changeTab('mine'); } }} actor={actor} selection={selection} onClose={() => setSelection(null)} onComplete={result => { setSelection(null); setNotice(`Transaction confirmed: ${result.transactionId}. Updating marketplace…`); if (selection.kind === 'list') setPendingListing({ actor, assetId: String(selection.asset.asset_id), transactionId: result.transactionId }); setRefresh(v => v + 1); }} />}
  </main>;
}

