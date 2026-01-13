// src/components/BurnRoom.js
import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import PropTypes from 'prop-types';
import { createPortal } from 'react-dom';

import { fetchBurnableNFTs, invalidateBurnableNFTCache } from '../services/fetchBurnableNFTs';
import {
  fetchUnstakedIncinerators,
  fetchStakedIncinerators,
  fetchIncineratorSlots,
} from '../services/incinerators';

import {
  stakeIncinerator,
  burnNFT,
  unstakeIncinerator,
  repairIncinerator,
  setIncineratorSlot,
  clearIncineratorSlot,
} from '../services/transactionActions';

import { getRepairStatus } from '../services/repairStatusApi';

import NFTGrid from './NFTGrid';
import NFTSlots from './NFTSlots';
import IncineratorModal from './IncineratorModal';
import IncineratorDetails from './IncineratorDetails';
import RepairModal from './RepairModal';
import BurnCapsModal from './BurnCapsModal';
import './BurnRoom.css';

// ✅ BigInt-free asset_id compare (string numeric)
const compareNumericStrings = (a, b) => {
  const A = String(a ?? '').replace(/\D/g, '');
  const B = String(b ?? '').replace(/\D/g, '');
  if (A.length !== B.length) return A.length - B.length;
  if (A === B) return 0;
  return A < B ? -1 : 1;
};

const isMobileWidth = () => {
  try {
    return window.matchMedia && window.matchMedia('(max-width: 900px)').matches;
  } catch {
    return typeof window !== 'undefined' ? window.innerWidth <= 900 : false;
  }
};

// ✅ Fallback costs ONLY if NFT object doesn't include economics
const FALLBACK_BURN_FUEL_COST = 10000;
const FALLBACK_BURN_ENERGY_COST = 1;

const BurnRoom = ({ accountName, onClose }) => {
  // --- State ---
  const [loadingNFTs, setLoadingNFTs] = useState(false);
  const [burnableNFTs, setBurnableNFTs] = useState([]);

  // ✅ slots reflect ON-CHAIN incinslots (contract-managed)
  const [slots, setSlots] = useState([null, null, null]); // default 3

  const [nftSlots, setNftSlots] = useState([null, null, null]); // keep 3 (burn deck)
  const [selectedNFT, setSelectedNFT] = useState(null);

  const [stakedIncinerators, setStakedIncinerators] = useState([]);
  const [unstakedIncinerators, setUnstakedIncinerators] = useState([]);

  const [repairTimers, setRepairTimers] = useState({});
  const [showIncineratorModal, setShowIncineratorModal] = useState(false);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(null);

  const [burnMessage, setBurnMessage] = useState('');
  const [messageVisible, setMessageVisible] = useState(false);

  const [showRepairModal, setShowRepairModal] = useState(false);
  const [repairTarget, setRepairTarget] = useState(null);
  const [repairPoints, setRepairPoints] = useState('');
  const [repairError, setRepairError] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);
  const imgCache = useRef(new Map());

  // ✅ caps modal state
  const [showCapsModal, setShowCapsModal] = useState(false);
  const [burnStatus, setBurnStatus] = useState(null);
  const [burnStatusLoading, setBurnStatusLoading] = useState(false);
  const [burnStatusError, setBurnStatusError] = useState('');

  // ✅ Bottom-sheet burn console state
  const [showConsole, setShowConsole] = useState(false);

  // ✅ one-shot refresh when timers complete (auto-repair)
  const completedRepairsRef = useRef(new Set());

  // ======================================================
  // ✅ Burnable NFT Filtering + Search + Pagination
  // ======================================================
  const [nftSearch, setNftSearch] = useState('');
  const [nftSchema, setNftSchema] = useState('ALL');
  const [nftCollection, setNftCollection] = useState('ALL');
  const [nftSort, setNftSort] = useState('NEWEST');
  const [nftPageSize, setNftPageSize] = useState(48);
  const [nftPage, setNftPage] = useState(1);

  const schemaOptions = useMemo(() => {
    const set = new Set();
    (burnableNFTs || []).forEach((n) => {
      if (n?.schema_name) set.add(n.schema_name);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [burnableNFTs]);

  const collectionOptions = useMemo(() => {
    const set = new Set();
    (burnableNFTs || []).forEach((n) => {
      if (n?.collection_name) set.add(n.collection_name);
      if (n?.collection?.collection_name) set.add(n.collection.collection_name);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [burnableNFTs]);

  const filteredBurnableNFTs = useMemo(() => {
    const q = (nftSearch || '').trim().toLowerCase();

    let list = (burnableNFTs || []).filter((n) => {
      const col = n?.collection_name || n?.collection?.collection_name || '';
      if (nftCollection !== 'ALL' && col !== nftCollection) return false;

      const sch = n?.schema_name || '';
      if (nftSchema !== 'ALL' && sch !== nftSchema) return false;

      if (q) {
        const name =
          (n?.name || '') +
          ' ' +
          (n?.template_name || '') +
          ' ' +
          (n?.data?.name || '') +
          ' ' +
          (n?.immutable_data?.name || '');
        if (!name.toLowerCase().includes(q)) return false;
      }

      return true;
    });

    list.sort((a, b) => {
      if (nftSort === 'NEWEST') return compareNumericStrings(b?.asset_id, a?.asset_id);
      if (nftSort === 'OLDEST') return compareNumericStrings(a?.asset_id, b?.asset_id);

      const an = String(a?.template_name || a?.name || a?.data?.name || '').toLowerCase();
      const bn = String(b?.template_name || b?.name || b?.data?.name || '').toLowerCase();

      if (nftSort === 'NAME_ASC') return an.localeCompare(bn);
      if (nftSort === 'NAME_DESC') return bn.localeCompare(an);

      return 0;
    });

    return list;
  }, [burnableNFTs, nftSearch, nftSchema, nftCollection, nftSort]);

  const totalPages = useMemo(() => {
    const n = filteredBurnableNFTs.length;
    const size = Math.max(1, Number(nftPageSize) || 48);
    return Math.max(1, Math.ceil(n / size));
  }, [filteredBurnableNFTs.length, nftPageSize]);

  const pagedBurnableNFTs = useMemo(() => {
    const size = Math.max(1, Number(nftPageSize) || 48);
    const page = Math.min(Math.max(1, Number(nftPage) || 1), totalPages);
    const start = (page - 1) * size;
    return filteredBurnableNFTs.slice(start, start + size);
  }, [filteredBurnableNFTs, nftPageSize, nftPage, totalPages]);

  useEffect(() => setNftPage(1), [nftSearch, nftSchema, nftCollection, nftSort, nftPageSize]);
  useEffect(() => setNftPage((p) => Math.min(Math.max(1, p), totalPages)), [totalPages]);

  // ---------- helpers ----------
  const apiRoot = useCallback(() => {
    const base = (process.env.REACT_APP_API_BASE_URL || '').replace(/\/+$/, '');
    if (!base) return '';
    const host = base.replace(/^https?:\/\//, '').split('/')[0];
    const hasPort = /:\d+$/.test(host);
    return hasPort ? base : `${base}:3003`;
  }, []);

  useEffect(() => {
    document.body.classList.add('modal-open');
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('modal-open');
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  // When console open, prevent modal-content from scrolling (portal sits above).
  useEffect(() => {
    const root = document.querySelector('.modal-content.burn-room');
    if (!root) return;

    const prev = root.style.overflow;
    if (showConsole) root.style.overflow = 'hidden';
    return () => {
      root.style.overflow = prev;
    };
  }, [showConsole]);

  // ✅ On mobile: tapping an NFT should immediately open the console so user sees the deck / incins
  const onNFTClickOpenConsole = useCallback((nft) => {
    setSelectedNFT(nft);
    if (isMobileWidth()) setShowConsole(true);
  }, []);

  // ---------- parse helpers (backend may return string formats) ----------
  const parseCurrent = (v) => {
    if (v == null) return 0;

    // "70000/100000"
    if (typeof v === 'string' && v.includes('/')) {
      const left = v.split('/')[0];
      const n = parseInt(String(left).replace(/[^\d]/g, ''), 10);
      return Number.isFinite(n) ? n : 0;
    }

    // "70000.000 TRASH" or "70000.000"
    if (typeof v === 'string') {
      const n = parseInt(String(v).replace(/[^\d]/g, ''), 10);
      return Number.isFinite(n) ? n : 0;
    }

    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  // ✅ Get required burn costs per NFT (matches Burn Deck behavior)
  const getRequiredCosts = useCallback((nft) => {
    const requiredFuel = parseFloat(nft?.trash_fee || 0);
    const requiredEnergy = parseFloat(nft?.energy_cost || 0);

    return {
      requiredFuel:
        Number.isFinite(requiredFuel) && requiredFuel > 0 ? requiredFuel : FALLBACK_BURN_FUEL_COST,
      requiredEnergy:
        Number.isFinite(requiredEnergy) && requiredEnergy > 0
          ? requiredEnergy
          : FALLBACK_BURN_ENERGY_COST,
    };
  }, []);

  // ✅ Find first equipped incinerator that can burn THIS nft (per-NFT gating)
  const getFirstBurnableIncineratorForNFT = useCallback(
    (nft) => {
      const equipped = (slots || []).filter((s) => s?.asset_id);
      if (equipped.length === 0) {
        return { slotIndex: -1, inc: null, disabled: true, label: 'Assign an incinerator to burn' };
      }

      const { requiredFuel, requiredEnergy } = getRequiredCosts(nft);

      for (let i = 0; i < (slots || []).length; i++) {
        const inc = slots[i];
        if (!inc?.asset_id) continue;

        // repair in progress blocks use
        const t = repairTimers?.[inc.asset_id];
        if (t && t > 0) continue;

        const fuel = parseCurrent(inc.fuel);
        const energy = parseCurrent(inc.energy);
        const durability = parseCurrent(inc.durability);

        if (durability <= 0) continue;
        if (fuel < requiredFuel) continue;
        if (energy < requiredEnergy) continue;

        return { slotIndex: i, inc, disabled: false, label: 'Burn NFT' };
      }

      return { slotIndex: -1, inc: null, disabled: true, label: 'Not enough fuel or energy' };
    },
    [slots, repairTimers, getRequiredCosts]
  );

  // ✅ fetch burn-status for ALL slotted incinerators
  const fetchBurnStatusMulti = useCallback(async () => {
    const incIds = (slots || [])
      .map((s) => (s?.asset_id ? String(s.asset_id) : null))
      .filter(Boolean);

    if (!accountName || incIds.length === 0) return;

    setBurnStatusLoading(true);
    setBurnStatusError('');

    try {
      const base = apiRoot();
      if (!base) throw new Error('REACT_APP_API_BASE_URL is not set.');

      const incResults = await Promise.all(
        incIds.map(async (incId, slotIndex) => {
          const url = `${base}/burn-status/${accountName}/${incId}`;
          const res = await fetch(url, { method: 'GET' });

          const contentType = res.headers.get('content-type') || '';
          const raw = await res.text();

          if (!contentType.includes('application/json')) {
            throw new Error(`Non-JSON burn-status response: ${raw.slice(0, 140)}`);
          }

          const json = JSON.parse(raw);

          if (!res.ok || !json?.success) {
            throw new Error(json?.message || `Failed to fetch burn status for ${incId}`);
          }

          return {
            slotIndex,
            asset_id: incId,
            ...(json.data?.incinerator || {}),
          };
        })
      );

      const firstUrl = `${base}/burn-status/${accountName}/${incIds[0]}`;
      const firstRes = await fetch(firstUrl, { method: 'GET' });
      const firstCT = firstRes.headers.get('content-type') || '';
      const firstRaw = await firstRes.text();

      if (!firstCT.includes('application/json')) {
        throw new Error(`Non-JSON burn-status response: ${firstRaw.slice(0, 140)}`);
      }

      const firstJson = JSON.parse(firstRaw);

      if (!firstRes.ok || !firstJson?.success) {
        throw new Error(firstJson?.message || 'Failed to fetch burn status (user cap)');
      }

      setBurnStatus({
        user: firstJson.data?.user,
        incinerators: incResults,
      });
    } catch (e) {
      console.error('[ERROR] fetchBurnStatusMulti:', e);
      setBurnStatus(null);
      setBurnStatusError(e.message || 'Failed to fetch burn status');
    } finally {
      setBurnStatusLoading(false);
    }
  }, [accountName, slots, apiRoot]);

  // --- Helper: Fetch repair timers ---
  // ✅ Only track timers when repair is actually active; NO console error on 404/null
  const fetchRepairTimers = useCallback(async (incs) => {
    const map = {};

    await Promise.all(
      (incs || []).map(async (inc) => {
        try {
          const status = await getRepairStatus(inc.asset_id);

          // ✅ null means "no repair in progress" (404 or empty) — normal
          if (!status) return;

          const pts = Number(status?.repair_points);
          const rt = status?.repair_time;

          if (!rt || !Number.isFinite(pts) || pts <= 0) return;

          // repair_time from contract is completion time (END time)
          const endMs = Date.parse(String(rt) + 'Z');
          if (!Number.isFinite(endMs)) return;

          map[inc.asset_id] = Math.max(Math.ceil((endMs - Date.now()) / 1000), 0);
        } catch (e) {
          // Should not happen if repairStatusApi returns null on 404; keep as warn.
          console.warn('[WARN] getRepairStatus unexpected failure for', inc.asset_id, e);
        }
      })
    );

    setRepairTimers(map);
  }, []);

  const formatSeconds = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    const parts = [];
    if (h) parts.push(`${h}h`);
    if (m) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
  };

  // ✅ Sync UI slots from on-chain incinslots via backend
  const syncSlotsFromChain = useCallback(
    async (stakedList) => {
      try {
        const slotResp = await fetchIncineratorSlots(accountName);
        if (!slotResp?.success) {
          setSlots([null, null, null]);
          return;
        }

        const uiSlots = 3;
        const slotted = Array.isArray(slotResp.slotted) ? slotResp.slotted : [];
        const next = Array(uiSlots).fill(null);

        for (const row of slotted) {
          const idx = Number(row.slot);
          if (!Number.isFinite(idx) || idx < 0 || idx >= uiSlots) continue;

          if (!row.incinerator_id) {
            next[idx] = null;
            continue;
          }

          const asset_id = String(row.incinerator_id);
          const fallbackFromStaked = (stakedList || []).find((s) => String(s.asset_id) === asset_id);

          const baseObj = fallbackFromStaked || {
            asset_id,
            id: asset_id,
            owner: row.owner,
            fuel: row.fuel,
            energy: row.energy,
            durability: row.durability,
            template_id: row.template_id,
            locked: row.locked,
            name: row.name,
            imgCid: row.imgCid,
            rarity: row.rarity,
          };

          const img =
            imgCache.current.get(asset_id) ||
            baseObj.img ||
            baseObj.imgCid ||
            'default-placeholder.png';

          imgCache.current.set(asset_id, img);
          next[idx] = { ...baseObj, asset_id, img };
        }

        setSlots(next);
      } catch (e) {
        console.error('[ERROR] syncSlotsFromChain:', e);
        setSlots([null, null, null]);
      }
    },
    [accountName]
  );

  // --- Fetch incinerators + timers + slots ---
  const fetchIncineratorData = useCallback(async () => {
    try {
      const [unstaked, staked] = await Promise.all([
        fetchUnstakedIncinerators(accountName),
        fetchStakedIncinerators(accountName),
      ]);

      const normalizedStaked = (staked || []).map((inc) => {
        const asset_id = String(inc.asset_id || inc.id);
        const img =
          imgCache.current.get(asset_id) || inc.img || inc.imgCid || 'default-placeholder.png';
        imgCache.current.set(asset_id, img);
        return { ...inc, asset_id, img };
      });

      setStakedIncinerators(normalizedStaked);
      setUnstakedIncinerators(
        (unstaked || []).filter(
          (i) => !normalizedStaked.some((n) => String(n.asset_id) === String(i.asset_id))
        )
      );

      await syncSlotsFromChain(normalizedStaked);
      await fetchRepairTimers(normalizedStaked);
    } catch (err) {
      console.error('[ERROR] Incinerator fetch failed:', err);
    }
  }, [accountName, fetchRepairTimers, syncSlotsFromChain]);

  // --- Fetch NFTs + incinerators on mount ---
  const fetchData = useCallback(async () => {
    setLoadingNFTs(true);
    try {
      const nfts = await fetchBurnableNFTs(accountName);
      setBurnableNFTs((nfts || []).filter((n) => n.template_id !== 294990));
    } catch (err) {
      console.error('[ERROR] NFT fetch failed:', err);
    } finally {
      setLoadingNFTs(false);
    }
    await fetchIncineratorData();
  }, [accountName, fetchIncineratorData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // tick timers down locally
  useEffect(() => {
    if (!Object.keys(repairTimers).length) return;
    const interval = setInterval(() => {
      setRepairTimers((prev) => {
        if (!prev || !Object.keys(prev).length) return prev;
        const next = {};
        Object.entries(prev).forEach(([id, secs]) => {
          const n = Number(secs) || 0;
          next[id] = n > 0 ? n - 1 : 0;
        });
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [repairTimers]);

  // ✅ auto-repair: when any timer hits 0, refresh once and then remove it from map
  useEffect(() => {
    const entries = Object.entries(repairTimers || {});
    if (!entries.length) return;

    entries.forEach(([id, secs]) => {
      if (Number(secs) !== 0) return;
      if (completedRepairsRef.current.has(id)) return;

      completedRepairsRef.current.add(id);

      // brief delay so backend/table reflects updated durability
      setTimeout(async () => {
        try {
          await fetchIncineratorData();
        } finally {
          setRepairTimers((prev) => {
            const copy = { ...(prev || {}) };
            delete copy[id];
            return copy;
          });
        }
      }, 1500);
    });
  }, [repairTimers, fetchIncineratorData]);

  // --- Burn deck handler ---
  const handleBurnNFT = async (idx) => {
    const nft = nftSlots[idx];
    const inc = slots[idx];
    if (!nft || !inc) return alert('Assign both NFT and incinerator');

    try {
      setBurnMessage('Burn initiated…');
      setMessageVisible(true);

      await burnNFT(accountName, nft, inc);

      setBurnableNFTs((prev) => prev.filter((i) => i.asset_id !== nft.asset_id));
      setNftSlots((prev) => prev.map((s, i) => (i === idx ? null : s)));

      invalidateBurnableNFTCache();
      await fetchIncineratorData();

      if (showCapsModal) {
        await fetchBurnStatusMulti();
      }
    } catch (err) {
      console.error('[ERROR] Burn failed:', err);
      setBurnMessage('Burn failed.');
    } finally {
      setTimeout(() => setMessageVisible(false), 10000);
    }
  };

  // ✅ Assign from grid into deck (first empty slot, or error if full)
  const handleAssignNFTToDeck = useCallback((nft, slotIndex) => {
    if (!nft) return;

    setNftSlots((prev) => {
      // prevent duplicates
      if (prev.some((s) => s?.asset_id === nft.asset_id)) return prev;

      // allow explicit target slot (from NFTGrid)
      if (Number.isInteger(slotIndex) && slotIndex >= 0 && slotIndex < prev.length) {
        return prev.map((s, i) => (i === slotIndex ? nft : s));
      }

      // fallback: first empty slot
      const i = prev.findIndex((s) => s === null);
      if (i === -1) return prev;
      return prev.map((s, idx) => (idx === i ? nft : s));
    });

    // select + open console on mobile so they see the deck update
    setSelectedNFT(nft);
    if (isMobileWidth()) setShowConsole(true);
  }, []);

  const onIncineratorSelect = async (inc) => {
    try {
      if (selectedSlotIndex === null || selectedSlotIndex === undefined) {
        setShowIncineratorModal(false);
        return;
      }

      const alreadyAssigned = (slots || []).some(
        (slot) => slot && String(slot.asset_id) === String(inc.asset_id)
      );
      if (alreadyAssigned) {
        alert('This incinerator is already assigned to another slot.');
        setShowIncineratorModal(false);
        return;
      }

      setIsProcessing(true);
      setBurnMessage('Equipping incinerator...');
      setMessageVisible(true);

      await setIncineratorSlot(accountName, selectedSlotIndex, String(inc.asset_id));

      setShowIncineratorModal(false);
      await fetchIncineratorData();
      setBurnMessage('Incinerator equipped!');
    } catch (e) {
      console.error('[ERROR] setIncineratorSlot failed:', e);
      alert(e?.response?.data?.message || e?.message || 'Failed to equip incinerator');
      setBurnMessage('Equip failed.');
    } finally {
      setTimeout(() => setMessageVisible(false), 4000);
      setIsProcessing(false);
    }
  };

  const handleRepairClick = (inc) => {
    setShowConsole(false); // ✅ prevent stacking overlay fights
    setRepairTarget(inc);
    setRepairPoints('');
    setRepairError('');
    setShowRepairModal(true);
  };

  const handleRepairConfirm = async () => {
    const maxNeeded = repairTarget ? 500 - repairTarget.durability : 0;
    const pts = parseInt(repairPoints, 10);

    if (!Number.isInteger(pts) || pts < 1 || pts > maxNeeded) {
      setRepairError(`Enter 1–${maxNeeded}`);
      return;
    }

    try {
      await repairIncinerator(accountName, repairTarget.asset_id, pts);
      await fetchIncineratorData();
      setShowRepairModal(false);
    } catch (err) {
      const msg = err?.message || String(err);
      if (msg.toLowerCase().includes('request expired')) {
        setRepairError('Signing request expired. Please try again and sign promptly.');
        return;
      }
      setRepairError(msg);
    }
  };

  const handleUnstake = async (inc) => {
    await unstakeIncinerator(accountName, inc);
    await fetchIncineratorData();
  };

  const handleUnstakedStake = async (inc) => {
    await stakeIncinerator(accountName, inc);
    await fetchIncineratorData();
  };

  const handleClearSlot = async (slotIndex) => {
    try {
      setIsProcessing(true);
      setBurnMessage('Unequipping incinerator...');
      setMessageVisible(true);

      await clearIncineratorSlot(accountName, slotIndex);

      await fetchIncineratorData();
      setBurnMessage('Incinerator unequipped!');
    } catch (e) {
      console.error('[ERROR] clearIncineratorSlot failed:', e);
      alert(e?.response?.data?.message || e?.message || 'Failed to unequip incinerator');
      setBurnMessage('Unequip failed.');
    } finally {
      setTimeout(() => setMessageVisible(false), 4000);
      setIsProcessing(false);
    }
  };

  const handleRemoveNFTFromSlot = useCallback((slotIndex) => {
    setNftSlots((prev) => prev.map((n, i) => (i === slotIndex ? null : n)));
  }, []);

  const onOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const dockStats = useMemo(() => {
    const incCount = (slots || []).filter((s) => s?.asset_id).length;
    const nftCount = (nftSlots || []).filter(Boolean).length;
    return { incCount, nftCount };
  }, [slots, nftSlots]);

  const emptyNFTList = !loadingNFTs && (filteredBurnableNFTs?.length || 0) === 0;

  // ===== Responsive UI helpers for mobile filter/pagination =====
  const mobile = isMobileWidth();

  return (
    <div className="modal-overlay" onClick={onOverlayClick}>
      <div
        className="modal-content burn-room"
        onClick={(e) => e.stopPropagation()}
        style={{
          minHeight: '70vh',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div className="modal-header">
          <h2 className="burn-room-title">Burn Room</h2>
          <button className="close-button" onClick={onClose} aria-label="Close Burn Room">
            &times;
          </button>
        </div>

        <div
          className="modal-body"
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* FILTER BAR (mobile-friendly grid) */}
          <div
            className="burnroom-filterbar"
            style={{
              display: 'grid',
              gridTemplateColumns: mobile ? '1fr 1fr' : '1fr 160px 160px 160px 110px',
              gap: '8px',
              marginBottom: '10px',
              alignItems: 'center',
              flex: '0 0 auto',
            }}
          >
            <input
              className="input"
              placeholder="Search burnable NFTs (name/template)..."
              value={nftSearch}
              onChange={(e) => setNftSearch(e.target.value)}
              style={{
                padding: '10px',
                borderRadius: 8,
                gridColumn: mobile ? '1 / -1' : 'auto',
              }}
            />

            <select
              value={nftCollection}
              onChange={(e) => setNftCollection(e.target.value)}
              style={{ padding: '10px', borderRadius: 8 }}
            >
              <option value="ALL">All Collections</option>
              {collectionOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={nftSchema}
              onChange={(e) => setNftSchema(e.target.value)}
              style={{ padding: '10px', borderRadius: 8 }}
            >
              <option value="ALL">All Schemas</option>
              {schemaOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <select
              value={nftSort}
              onChange={(e) => setNftSort(e.target.value)}
              style={{ padding: '10px', borderRadius: 8 }}
            >
              <option value="NEWEST">Newest</option>
              <option value="OLDEST">Oldest</option>
              <option value="NAME_ASC">Name A–Z</option>
              <option value="NAME_DESC">Name Z–A</option>
            </select>

            <select
              value={nftPageSize}
              onChange={(e) => setNftPageSize(Number(e.target.value))}
              style={{ padding: '10px', borderRadius: 8 }}
            >
              <option value={24}>24</option>
              <option value={48}>48</option>
              <option value={96}>96</option>
              <option value={200}>200</option>
            </select>
          </div>

          {/* pagination header (mobile wraps + full width controls) */}
          <div
            className="burnroom-pagination"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 10,
              flex: '0 0 auto',
              gap: 8,
              flexWrap: mobile ? 'wrap' : 'nowrap',
            }}
          >
            <div style={{ opacity: 0.85 }}>
              Showing <b>{pagedBurnableNFTs.length}</b> of <b>{filteredBurnableNFTs.length}</b>{' '}
              (Total: {burnableNFTs.length})
            </div>

            <div
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                width: mobile ? '100%' : 'auto',
                justifyContent: mobile ? 'space-between' : 'flex-end',
              }}
            >
              <button
                className="finalize-button"
                disabled={nftPage <= 1}
                onClick={() => setNftPage((p) => Math.max(1, p - 1))}
                type="button"
              >
                Prev
              </button>
              <div style={{ minWidth: 110, textAlign: 'center' }}>
                Page {nftPage} / {totalPages}
              </div>
              <button
                className="finalize-button"
                disabled={nftPage >= totalPages}
                onClick={() => setNftPage((p) => Math.min(totalPages, p + 1))}
                type="button"
              >
                Next
              </button>
            </div>
          </div>

          {/* ✅ NFT List (stable height so dock doesn't jump when empty) */}
          <div
            className="burnroom-nft-scroll"
            style={{
              flex: 1,
              minHeight: 280,
              overflowY: 'auto',
              paddingBottom: 110, // room for dock
            }}
          >
            {emptyNFTList ? (
              <div
                style={{
                  minHeight: 260,
                  display: 'grid',
                  placeContent: 'center',
                  textAlign: 'center',
                  gap: 10,
                  opacity: 0.9,
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 800 }}>Nothing to burn</div>
                <div style={{ fontSize: 13, opacity: 0.8, maxWidth: 560 }}>
                  This wallet doesn&apos;t have any NFTs that match an approved burn rule right now.
                </div>
                <button className="finalize-button" onClick={fetchData} type="button">
                  Refresh
                </button>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  Tip: if you just submitted a proposal, it may need to finalize on-chain before it
                  shows up.
                </div>
              </div>
            ) : (
              <NFTGrid
                burnableNFTs={pagedBurnableNFTs}
                selectedNFT={selectedNFT}
                onNFTClick={onNFTClickOpenConsole}
                loading={loadingNFTs}
                nftSlots={nftSlots}
                slots={slots}
                onAssignNFT={handleAssignNFTToDeck}
                onRemoveNFT={handleRemoveNFTFromSlot}
                onBurnNFT={handleBurnNFT}
              />
            )}
          </div>

          {messageVisible && <div className="burn-message">{burnMessage}</div>}

          {/* Floating Dock */}
          <div className="burnroom-dock">
            <button
              type="button"
              className="burnroom-dock-btn"
              onClick={() => setShowConsole(true)}
              aria-label="Open Burn Console"
            >
              <span className="burnroom-dock-icon">🔥</span>
              <span className="burnroom-dock-text">
                <span className="burnroom-dock-title">Burn Console</span>
                <span className="burnroom-dock-sub">
                  {dockStats.nftCount}/3 NFTs • {dockStats.incCount}/3 Incinerators
                </span>
              </span>
            </button>
          </div>

          {/* ======================================================
              ✅ Bottom Sheet Console (PORTAL)
             ====================================================== */}
          {createPortal(
            <div
              className={`burnroom-sheet ${showConsole ? 'open' : ''}`}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 99999,
                pointerEvents: showConsole ? 'auto' : 'none',
              }}
            >
              <button
                className="burnroom-sheet-backdrop"
                onClick={() => setShowConsole(false)}
                aria-label="Close burn console"
                tabIndex={showConsole ? 0 : -1}
                type="button"
                style={{
                  position: 'absolute',
                  inset: 0,
                  cursor: 'default',
                }}
              />

              <div
                className="burnroom-sheet-panel"
                role="dialog"
                aria-modal="true"
                aria-label="Burn Console"
                style={{
                  position: 'absolute',
                  left: '50%',
                  bottom: 0,
                  transform: 'translateX(-50%)',
                  width: 'min(1100px, 96vw)',
                  maxHeight: '92vh',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div className="burnroom-sheet-grabber" />

                <div className="burnroom-sheet-header">
                  <div className="burnroom-sheet-title">Burn Console</div>
                  <button
                    className="burnroom-sheet-close"
                    onClick={() => setShowConsole(false)}
                    aria-label="Close"
                    type="button"
                  >
                    ✕
                  </button>
                </div>

                <div className="burnroom-sheet-body burnroom-sheet-body--incins">
                  <div className="burnroom-sheet-content">
                    <div className="burnroom-inc-row">
                      <h3 className="burnroom-inc-title">Incinerators</h3>
                      <div className="burnroom-inc-hint">Tap a slot to equip</div>
                    </div>

                    <div className="incinerator-grid burnroom-inc-grid">
                      {(slots || []).map((slot, i) => (
                        <div
                          key={i}
                          className={`incinerator-card ${slot ? '' : 'empty-incinerator'}`}
                          onClick={() => {
                            setSelectedSlotIndex(i);
                            setShowConsole(false); // ✅ prevent stacking two overlays fighting
                            setShowIncineratorModal(true);
                          }}
                        >
                          {slot ? (
                            <>
                              <IncineratorDetails
                                incinerator={slot}
                                fetchIncineratorData={fetchIncineratorData}
                                showButtons
                                onRepair={() => handleRepairClick(slot)}
                                onRemove={() => handleClearSlot(i)}
                              />

                              {repairTimers[slot.asset_id] > 0 && (
                                <p className="repair-timer">
                                  Repair in progress: {formatSeconds(repairTimers[slot.asset_id])}{' '}
                                  remaining
                                </p>
                              )}

                              {repairTimers[slot.asset_id] === 0 && (
                                <p className="repair-timer">✅ Repair complete — refreshing…</p>
                              )}
                            </>
                          ) : (
                            <div className="burnroom-empty-inc">
                              <div className="burnroom-plus">+</div>
                              <div className="burnroom-empty-text">Equip Incinerator</div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="burnroom-sheet-footer">
                  <div className="burnroom-deck-row">
                    <div className="burnroom-deck-title">Burn Deck</div>

                    <button
                      className="finalize-button"
                      onClick={async () => {
                        const hasInc = (slots || []).some((s) => s?.asset_id);
                        if (!hasInc) {
                          alert('Assign an incinerator first to view caps.');
                          return;
                        }

                        // ✅ close console so caps modal cannot appear behind it
                        setShowConsole(false);

                        await fetchBurnStatusMulti();
                        setShowCapsModal(true);
                      }}
                      type="button"
                    >
                      Daily Caps
                    </button>
                  </div>

                  <NFTSlots
                    nftSlots={nftSlots}
                    slots={slots}
                    onBurn={handleBurnNFT}
                    onRemoveNFT={handleRemoveNFTFromSlot}
                  />
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* ======================================================
              ✅ IncineratorModal (PORTAL) — forces it ABOVE console
             ====================================================== */}
          {showIncineratorModal &&
            createPortal(
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 100000, // ✅ higher than console (99999)
                  pointerEvents: 'auto',
                }}
              >
                <IncineratorModal
                  accountName={accountName}
                  stakedIncinerators={stakedIncinerators}
                  unstakedIncinerators={unstakedIncinerators}
                  assignedSlots={slots}
                  onIncineratorSelect={onIncineratorSelect}
                  onUnstakedStake={handleUnstakedStake}
                  onUnstake={handleUnstake}
                  loadFuel={async () => await fetchIncineratorData()}
                  loadEnergy={async () => await fetchIncineratorData()}
                  fetchData={fetchIncineratorData}
                  repairTimers={repairTimers}
                  onClose={() => setShowIncineratorModal(false)}
                  isProcessing={isProcessing}
                />
              </div>,
              document.body
            )}

          {/* ======================================================
              ✅ RepairModal (PORTAL) — forces it ABOVE everything
             ====================================================== */}
          {showRepairModal &&
            createPortal(
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 100001, // ✅ higher than IncineratorModal (100000) and console (99999)
                  pointerEvents: 'auto',
                }}
              >
                <RepairModal
                  repairPoints={repairPoints}
                  setRepairPoints={setRepairPoints}
                  repairError={repairError}
                  setRepairError={setRepairError}
                  onMaxClick={() =>
                    setRepairPoints((500 - (repairTarget?.durability || 0)).toString())
                  }
                  onCancel={() => setShowRepairModal(false)}
                  onConfirm={handleRepairConfirm}
                  maxPoints={repairTarget ? 500 - repairTarget.durability : 0}
                />
              </div>,
              document.body
            )}

          {/* ======================================================
              ✅ BurnCapsModal (PORTAL) — forces it ABOVE EVERYTHING
             ====================================================== */}
          {showCapsModal &&
            createPortal(
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 100002, // ✅ above console (99999) + inc modal (100000) + repair (100001)
                  pointerEvents: 'auto',
                }}
              >
                <BurnCapsModal
                  open={showCapsModal}
                  onClose={() => setShowCapsModal(false)}
                  burnStatus={burnStatus}
                  loading={burnStatusLoading}
                  error={burnStatusError}
                  onRefresh={fetchBurnStatusMulti}
                />
              </div>,
              document.body
            )}
        </div>
      </div>
    </div>
  );
};

BurnRoom.propTypes = {
  accountName: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default BurnRoom;

