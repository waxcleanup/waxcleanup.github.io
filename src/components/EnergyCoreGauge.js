import React, { useMemo } from "react";

export default function EnergyCoreGauge({ value = 0, max = 0 }) {
  const pct = useMemo(() => {
    const v = Number(value || 0);
    const m = Number(max || 0);
    if (!m || m <= 0) return 0;
    return Math.max(0, Math.min(1, v / m));
  }, [value, max]);

  const r = 26;
  const c = 2 * Math.PI * r;
  const dash = c * pct;

  const label = Math.round(pct * 100);

  return (
    <svg className="core-gauge" viewBox="0 0 80 80" aria-label={`Energy ${label}%`}>
      <defs>
        <radialGradient id="coreGlow" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="rgba(120, 220, 255, 0.95)" />
          <stop offset="55%" stopColor="rgba(120, 220, 255, 0.25)" />
          <stop offset="100%" stopColor="rgba(120, 220, 255, 0)" />
        </radialGradient>

        <linearGradient id="coreRing" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(120, 220, 255, 0.95)" />
          <stop offset="100%" stopColor="rgba(180, 120, 255, 0.95)" />
        </linearGradient>
      </defs>

      {/* glow */}
      <circle className="core-glow" cx="40" cy="40" r="30" fill="url(#coreGlow)" />

      {/* base ring */}
      <circle
        cx="40"
        cy="40"
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="8"
      />

      {/* progress ring */}
      <circle
        cx="40"
        cy="40"
        r={r}
        fill="none"
        stroke="url(#coreRing)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c - dash}`}
        transform="rotate(-90 40 40)"
      />

      {/* core icon */}
      <circle cx="40" cy="40" r="10" fill="rgba(255,255,255,0.10)" />
      <circle cx="40" cy="40" r="6" fill="rgba(120, 220, 255, 0.70)" />

      {/* % */}
      <text
        x="40"
        y="67"
        textAnchor="middle"
        fontSize="10"
        fill="rgba(255,255,255,0.85)"
      >
        {label}%
      </text>
    </svg>
  );
}
