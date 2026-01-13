// src/components/ApprovedCollectionsPopup.js
// Upgraded: supports BOTH approved template-burn rules and approved schema-burn rules.

import React, { useEffect, useMemo, useState } from "react";
import "./ApprovedCollectionsPopup.css";

function safeStr(v) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function norm(v) {
  return safeStr(v).trim().toLowerCase();
}

function fmtCap(v) {
  if (v === null || v === undefined) return "∞";
  const n = Number(v);
  return Number.isFinite(n) ? String(n) : safeStr(v);
}

function fmtAssetAmount(assetStr, fallback = "—") {
  if (!assetStr) return fallback;
  const s = String(assetStr);
  const parts = s.split(" ");
  return parts[0] || fallback;
}

export default function ApprovedCollectionsPopup({
  // New props
  templates = [],
  schemas = [],
  // Back-compat (older code passed `collections`)
  collections,
  onClose,
}) {
  const templateRows = Array.isArray(templates) && templates.length
    ? templates
    : (Array.isArray(collections) ? collections : []);

  const schemaRows = Array.isArray(schemas) ? schemas : [];

  const [tab, setTab] = useState("templates"); // templates | schemas

  const [selectedCollection, setSelectedCollection] = useState("");
  const [selectedSchema, setSelectedSchema] = useState("");
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState("template_asc");
  const [copiedId, setCopiedId] = useState(null);

  // Reset schema filter when collection changes
  useEffect(() => {
    setSelectedSchema("");
  }, [selectedCollection]);

  // Switch sort defaults per tab
  useEffect(() => {
    setSearch("");
    setSelectedCollection("");
    setSelectedSchema("");
    setCopiedId(null);
    setSortMode(tab === "templates" ? "template_asc" : "schema");
  }, [tab]);

  // Debug: keep local copy stable if props change
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log("Approved template rules:", templateRows);
    // eslint-disable-next-line no-console
    console.log("Approved schema rules:", schemaRows);
  }, [templateRows, schemaRows]);

  const activeRows = tab === "templates" ? templateRows : schemaRows;

  // Collection counts for dropdown
  const collectionCounts = useMemo(() => {
    const map = new Map();
    (activeRows || []).forEach((item) => {
      const key = safeStr(item.collection);
      if (!key) return;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [activeRows]);

  const uniqueCollections = useMemo(() => {
    const arr = Array.from(collectionCounts.keys());
    arr.sort((a, b) => a.localeCompare(b));
    return arr;
  }, [collectionCounts]);

  // Schema dropdown depends on selected collection
  const uniqueSchemas = useMemo(() => {
    const set = new Set();
    (activeRows || []).forEach((item) => {
      if (selectedCollection && safeStr(item.collection) !== selectedCollection) return;
      if (item.schema) set.add(String(item.schema));
    });
    const arr = Array.from(set);
    arr.sort((a, b) => a.localeCompare(b));
    return arr;
  }, [activeRows, selectedCollection]);

  const filtered = useMemo(() => {
    const q = norm(search);

    let list = [...(activeRows || [])];

    if (selectedCollection) {
      list = list.filter((x) => safeStr(x.collection) === selectedCollection);
    }
    if (selectedSchema) {
      list = list.filter((x) => safeStr(x.schema) === selectedSchema);
    }

    if (q) {
      list = list.filter((x) => {
        const hay = [
          x.collection,
          x.schema,
          tab === "templates" ? x.template_id : "",
          x.trash_fee,
          x.cinder_reward,
        ]
          .map((v) => norm(v))
          .join(" ");
        return hay.includes(q);
      });
    }

    // Sorting
    const byCollection = (a, b) => safeStr(a.collection).localeCompare(safeStr(b.collection));
    const bySchema = (a, b) => safeStr(a.schema).localeCompare(safeStr(b.schema));
    const byTemplateAsc = (a, b) => Number(a.template_id || 0) - Number(b.template_id || 0);
    const byTemplateDesc = (a, b) => Number(b.template_id || 0) - Number(a.template_id || 0);

    if (sortMode === "collection") list.sort(byCollection);
    else if (sortMode === "schema") list.sort(bySchema);
    else if (sortMode === "template_desc") list.sort(byTemplateDesc);
    else list.sort(byTemplateAsc);

    // For schema tab, template sort modes don't matter; default to schema/collection
    if (tab === "schemas") {
      if (sortMode === "collection") list.sort(byCollection);
      else list.sort(bySchema);
    }

    return list;
  }, [activeRows, selectedCollection, selectedSchema, search, sortMode, tab]);

  const total = activeRows?.length || 0;
  const shown = filtered.length;

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(String(text));
      setCopiedId(String(text));
      setTimeout(() => setCopiedId(null), 1400);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Copy failed:", e);
    }
  };

  const clearFilters = () => {
    setSelectedCollection("");
    setSelectedSchema("");
    setSearch("");
    setSortMode(tab === "templates" ? "template_asc" : "schema");
  };

  return (
    <div className="popup-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="popup-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose} aria-label="Close">
          &times;
        </button>

        <div className="popup-header">
          <h3>Approved Burns</h3>
          <div className="popup-subtitle">
            Showing <strong>{shown}</strong> of <strong>{total}</strong>
          </div>
        </div>

        {/* Tabs */}
        <div className="popup-toolbar" style={{ justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="popup-clear"
              type="button"
              onClick={() => setTab("templates")}
              style={{ opacity: tab === "templates" ? 1 : 0.6 }}
            >
              Templates
            </button>
            <button
              className="popup-clear"
              type="button"
              onClick={() => setTab("schemas")}
              style={{ opacity: tab === "schemas" ? 1 : 0.6 }}
            >
              Schemas
            </button>
          </div>

          <button className="popup-clear" onClick={clearFilters} type="button">
            Clear
          </button>
        </div>

        {/* Sticky toolbar */}
        <div className="popup-toolbar">
          <input
            className="popup-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tab === "templates" ? "Search (collection / schema / template id)…" : "Search (collection / schema)…"}
          />

          <select
            className="filter-dropdown"
            value={selectedCollection}
            onChange={(e) => setSelectedCollection(e.target.value)}
          >
            <option value="">All Collections</option>
            {uniqueCollections.map((col) => (
              <option key={col} value={col}>
                {col} ({collectionCounts.get(col) || 0})
              </option>
            ))}
          </select>

          <select
            className="filter-dropdown"
            value={selectedSchema}
            onChange={(e) => setSelectedSchema(e.target.value)}
            disabled={!selectedCollection && uniqueSchemas.length === 0}
            title={selectedCollection ? "Filter by schema" : "Select a collection to narrow schemas"}
          >
            <option value="">All Schemas</option>
            {uniqueSchemas.map((sch) => (
              <option key={sch} value={sch}>
                {sch}
              </option>
            ))}
          </select>

          <select
            className="filter-dropdown"
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value)}
          >
            {tab === "templates" ? (
              <>
                <option value="template_asc">Template ↑</option>
                <option value="template_desc">Template ↓</option>
                <option value="collection">Collection</option>
                <option value="schema">Schema</option>
              </>
            ) : (
              <>
                <option value="schema">Schema</option>
                <option value="collection">Collection</option>
              </>
            )}
          </select>
        </div>

        {filtered.length === 0 ? (
          <p className="popup-empty">
            {tab === "templates" ? "No matching approved templates found." : "No matching approved schemas found."}
          </p>
        ) : (
          <div className="collections-grid">
            {filtered.map((row, index) => {
              const col = safeStr(row.collection);
              const sch = safeStr(row.schema);

              if (tab === "templates") {
                const tpl = safeStr(row.template_id);
                const isCopied = copiedId === tpl;

                return (
                  <div key={`${col}:${sch}:${tpl}:${index}`} className="collection-item">
                    <div className="collection-top">
                      <div className="collection-line">
                        <span className="label">Collection</span>
                        <span className="value">{col}</span>
                      </div>

                      <div className="collection-line">
                        <span className="label">Schema</span>
                        <span className="value">{sch}</span>
                      </div>

                      <div className="collection-line">
                        <span className="label">Template</span>
                        <span className="value mono">{tpl}</span>
                      </div>

                      <div className="collection-line">
                        <span className="label">Enabled</span>
                        <span className="value">{row.enabled === null || row.enabled === undefined ? "—" : (row.enabled ? "✅" : "❌")}</span>
                      </div>

                      <div className="collection-line">
                        <span className="label">Cap</span>
                        <span className="value">
                          {fmtCap(row.cap_remaining)} / {fmtCap(row.cap_total)}
                        </span>
                      </div>

                      <div className="collection-line">
                        <span className="label">Trash Fee</span>
                        <span className="value mono">{fmtAssetAmount(row.trash_fee, "—")}</span>
                      </div>

                      <div className="collection-line">
                        <span className="label">CINDER Reward</span>
                        <span className="value mono">{fmtAssetAmount(row.cinder_reward, "—")}</span>
                      </div>

                      {(row.prop_id !== null && row.prop_id !== undefined) && (
                        <div className="collection-line">
                          <span className="label">Prop</span>
                          <span className="value mono">{safeStr(row.prop_id)}</span>
                        </div>
                      )}

                      {row.updated_at && (
                        <div className="collection-line">
                          <span className="label">Updated</span>
                          <span className="value">{safeStr(row.updated_at)}</span>
                        </div>
                      )}
                    </div>

                    <div className="collection-actions">
                      <button
                        className="mini-btn"
                        type="button"
                        onClick={() => copyToClipboard(tpl)}
                        title="Copy template id"
                      >
                        {isCopied ? "✅ Copied" : "📋 Copy ID"}
                      </button>
                    </div>
                  </div>
                );
              }

              // schemas tab
              const key = `${col}:${sch}`;
              const isCopied = copiedId === key;

              return (
                <div key={`${key}:${index}`} className="collection-item">
                  <div className="collection-top">
                    <div className="collection-line">
                      <span className="label">Collection</span>
                      <span className="value">{col}</span>
                    </div>

                    <div className="collection-line">
                      <span className="label">Schema</span>
                      <span className="value">{sch}</span>
                    </div>

                    <div className="collection-line">
                      <span className="label">Enabled</span>
                      <span className="value">{row.enabled === null || row.enabled === undefined ? "—" : (row.enabled ? "✅" : "❌")}</span>
                    </div>

                    <div className="collection-line">
                      <span className="label">Cap</span>
                      <span className="value">
                        {fmtCap(row.cap_remaining)} / {fmtCap(row.cap_total)}
                      </span>
                    </div>

                    <div className="collection-line">
                      <span className="label">Trash Fee</span>
                      <span className="value mono">{fmtAssetAmount(row.trash_fee, "—")}</span>
                    </div>

                    <div className="collection-line">
                      <span className="label">CINDER Reward</span>
                      <span className="value mono">{fmtAssetAmount(row.cinder_reward, "—")}</span>
                    </div>

                    {(row.prop_id !== null && row.prop_id !== undefined) && (
                      <div className="collection-line">
                        <span className="label">Prop</span>
                        <span className="value mono">{safeStr(row.prop_id)}</span>
                      </div>
                    )}

                    {row.updated_at && (
                      <div className="collection-line">
                        <span className="label">Updated</span>
                        <span className="value">{safeStr(row.updated_at)}</span>
                      </div>
                    )}
                  </div>

                  <div className="collection-actions">
                    <button
                      className="mini-btn"
                      type="button"
                      onClick={() => copyToClipboard(key)}
                      title="Copy collection:schema"
                    >
                      {isCopied ? "✅ Copied" : "📋 Copy"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
