// src/components/svg/TomatoStem.js
import React, { useMemo } from "react";
import { mulberry32 } from "./svgUtils";

export default function TomatoStem({
  stemTopY,
  ids,
  // optional: pass stable seed from parent so details don’t “jump”
  seed = 1337,
  // optional: allow parent to fade complexity by growth stage
  progress = 1,
}) {
  // ✅ subtle taper: thicker at base, thinner at top
  const baseW = 2.9;
  const topW = 2.0;

  // ✅ deterministic small details (nodes + micro-stems)
  const rng = useMemo(() => mulberry32(seed), [seed]);

  // How much detail should show (0..1)
  const detail = Math.max(0, Math.min(1, progress));

  // ✅ node bumps (tomato stems have nodes) – scale with progress
  const nodes = useMemo(() => {
    const base = [
      { y: 74.5, r: 0.55, op: 0.25 },
      { y: 67.5, r: 0.50, op: 0.22 },
      { y: 60.5, r: 0.45, op: 0.20 },
      { y: 53.5, r: 0.40, op: 0.18 },
      { y: 46.5, r: 0.36, op: 0.16 },
      { y: 39.5, r: 0.32, op: 0.14 },
    ];

    // only keep nodes that are inside visible stem span
    const usable = base.filter((n) => n.y > stemTopY + 2);

    // fade out nodes early growth
    return usable.map((n) => ({
      ...n,
      r: n.r * (0.65 + 0.45 * detail),
      op: n.op * (0.25 + 0.85 * detail),
    }));
  }, [stemTopY, detail]);

  // ✅ micro “fibers” / ridges along the stem (very subtle)
  const ridges = useMemo(() => {
    const list = [];
    // fewer ridges early, more later
    const count = Math.round(4 + 8 * detail);

    // span along the stem
    const yStart = 78;
    const yEnd = stemTopY + 1.2;
    const span = Math.max(8, yStart - yEnd);

    for (let i = 0; i < count; i++) {
      const t = (i + 0.25 + rng() * 0.4) / (count + 0.5);
      const y = yStart - span * t;
      if (y <= yEnd + 1) continue;

      const side = rng() < 0.5 ? -1 : 1;
      const x = 50 + side * (0.25 + rng() * 0.55);
      const wob = (rng() * 2 - 1) * 0.45;
      const len = 2.2 + rng() * 3.2; // short ridge length
      const op = (0.05 + rng() * 0.08) * detail;

      // tiny curved ridge
      const d = `M ${x} ${y}
                 Q ${x + wob} ${y - len * 0.45},
                   ${x} ${y - len}`;

      list.push({
        d,
        op,
        w: 0.55 + rng() * 0.55,
      });
    }
    return list;
  }, [rng, stemTopY, detail]);

  // ✅ tiny “hair” offshoots near nodes (tomato stems get fuzzy)
  const hairs = useMemo(() => {
    const list = [];
    const count = Math.round(6 + 10 * detail);

    for (let i = 0; i < count; i++) {
      const y = 76 - rng() * (76 - (stemTopY + 4));
      const side = rng() < 0.5 ? -1 : 1;

      const x0 = 50 + side * (0.9 + rng() * 0.9);
      const x1 = x0 + side * (0.8 + rng() * 1.6);
      const y1 = y - (0.8 + rng() * 2.4);

      const curve = (rng() * 2 - 1) * 0.8;

      const d = `M ${x0} ${y}
                 Q ${x0 + curve} ${y - 0.6},
                   ${x1} ${y1}`;

      list.push({
        d,
        w: 0.18 + rng() * 0.18,
        op: (0.06 + rng() * 0.10) * detail,
      });
    }
    return list;
  }, [rng, stemTopY, detail]);

  return (
    <g>
      {/* outline for visibility */}
      <path
        d={`M50 78 L50 ${stemTopY}`}
        stroke="#0b2f10"
        strokeWidth={baseW + 0.95}
        strokeLinecap="round"
        opacity="0.55"
      />

      {/* main gradient stem */}
      <path
        d={`M50 78 L50 ${stemTopY}`}
        stroke={`url(#${ids.stemGrad})`}
        strokeWidth={baseW}
        strokeLinecap="round"
      />

      {/* highlight */}
      <path
        d={`M49.35 78 L49.35 ${stemTopY}`}
        stroke={`url(#${ids.stemHi})`}
        strokeWidth="0.95"
        strokeLinecap="round"
        opacity="0.65"
      />

      {/* ✅ inner ridge strip (taper hint) */}
      <path
        d={`M50.45 78 L50.45 ${stemTopY}`}
        stroke="#0f3b13"
        strokeWidth={topW}
        strokeLinecap="round"
        opacity={0.10 + 0.06 * detail}
      />

      {/* ✅ micro ridges */}
      <g opacity={0.95}>
        {ridges.map((r, i) => (
          <path
            key={i}
            d={r.d}
            fill="none"
            stroke="#0c3511"
            strokeWidth={r.w}
            strokeLinecap="round"
            opacity={r.op}
          />
        ))}
      </g>

      {/* ✅ fuzzy hairs */}
      <g>
        {hairs.map((h, i) => (
          <path
            key={i}
            d={h.d}
            fill="none"
            stroke="#eaffef"
            strokeWidth={h.w}
            strokeLinecap="round"
            opacity={h.op}
          />
        ))}
      </g>

      {/* ✅ nodes */}
      {nodes.map((n, i) => (
        <g key={i} opacity={n.op}>
          <circle cx="50.35" cy={n.y} r={n.r * 1.05} fill="#0b2f10" />
          <circle cx="50" cy={n.y} r={n.r} fill="#2e7d32" opacity="0.82" />
          {/* small highlight dot */}
          <circle cx="49.85" cy={n.y - n.r * 0.15} r={n.r * 0.35} fill="#eaffef" opacity="0.22" />
        </g>
      ))}
    </g>
  );
}

