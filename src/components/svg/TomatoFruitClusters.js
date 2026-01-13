// src/components/svg/TomatoFruitClusters.js
import React, { useMemo } from "react";
import { clamp01, mulberry32, hashStringToInt } from "./svgUtils";

/**
 * TomatoFruitClusters
 * - Deterministic fruit placement (stable per SVG instance)
 * - No conditional hooks (eslint react-hooks/rules-of-hooks safe)
 */
export default function TomatoFruitClusters({
  ids,
  stageKey,
  branchLevels = [],
  stemTopY = 40,
  progress = 0,
  rid = "0",
}) {
  // ✅ hooks must ALWAYS run (no early returns before these)
  const seedInt = useMemo(() => hashStringToInt(String(rid || "0")), [rid]);
  const rng = useMemo(() => mulberry32(seedInt), [seedInt]);

  const fruitRipeness = clamp01((progress - 0.8) / 0.2);

  // Build cluster specs even when not fruit (empty array), so hooks stay stable
  const clusters = useMemo(() => {
    if (!Array.isArray(branchLevels) || branchLevels.length === 0) return [];

    // fruit appears on/near upper branch levels; fewer on the lowest
    return branchLevels.map((y, idx) => {
      const fruitsHere = idx === 0 ? 2 : 3;

      // keep closer to stem, and a little higher so stems don’t “stick out”
      const baseCx = 50 + (idx - 1) * 6.0;
      const baseCy = y + 2.0;

      // tiny deterministic offsets per branch
      const nudgeX = (rng() * 2 - 1) * 0.7;
      const nudgeY = (rng() * 2 - 1) * 0.6;

      // a little tighter cluster late-stage
      const spread = 4.2 + (1 - fruitRipeness) * 0.4;

      return {
        idx,
        cx: baseCx + nudgeX,
        cy: baseCy + nudgeY,
        fruitsHere,
        spread,
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    });
    // NOTE: rng is deterministic but stateful; we intentionally key this memo
    // to seedInt so it rebuilds consistently per instance.
  }, [branchLevels, fruitRipeness, seedInt]);

  // ✅ early return AFTER hooks
  if (stageKey !== "fruit") return null;

  return (
    <g>
      {clusters.map((c) => (
        <g key={c.idx}>
          {/* Shorter & softer fruit stem */}
          <path
            d={`M${c.cx} ${c.cy - 1.3} Q ${c.cx} ${c.cy}, ${c.cx} ${c.cy + 2.4}`}
            stroke="#1f6a28"
            strokeWidth="0.75"
            fill="none"
            opacity="0.92"
            strokeLinecap="round"
          />

          {Array.from({ length: c.fruitsHere }).map((_, j) => {
            // deterministic per fruit in cluster
            const wobX = (rng() * 2 - 1) * 0.45;
            const wobY = (rng() * 2 - 1) * 0.35;

            const fx = c.cx + (j - (c.fruitsHere - 1) / 2) * c.spread + wobX;
            const fy = c.cy + 4.6 + (j % 2) * 1.35 + wobY;

            // slight size variation
            const baseR = 2.95 + ((j + c.idx) % 2) * 0.7;
            const r = baseR + (rng() * 0.25 - 0.12);

            // slightly oblong (more “tomato”)
            const rx = r * (1.08 + (rng() * 0.06 - 0.03));
            const ry = r * (0.94 + (rng() * 0.06 - 0.03));

            // calyx (little green top)
            const calyxY = fy - ry * 0.85;

            return (
              <g key={j}>
                {/* soft shadow */}
                <ellipse
                  cx={fx + rx * 0.18}
                  cy={fy + ry * 0.6}
                  rx={rx * 0.82}
                  ry={ry * 0.42}
                  fill="#000"
                  opacity="0.10"
                />

                {/* tomato body */}
                <ellipse
                  cx={fx}
                  cy={fy}
                  rx={rx}
                  ry={ry}
                  fill={`url(#${ids.tomatoGrad})`}
                  stroke="#5f0a0a"
                  strokeWidth="0.45"
                />

                {/* specular highlight */}
                <ellipse
                  cx={fx - rx * 0.35}
                  cy={fy - ry * 0.32}
                  rx={rx * 0.7}
                  ry={ry * 0.55}
                  fill={`url(#${ids.tomatoSpec})`}
                  opacity="0.9"
                />

                {/* calyx */}
                <path
                  d={`
                    M ${fx - rx * 0.35} ${calyxY}
                    Q ${fx} ${calyxY - 0.7}, ${fx + rx * 0.35} ${calyxY}
                    Q ${fx} ${calyxY + 0.55}, ${fx - rx * 0.35} ${calyxY}
                    Z
                  `}
                  fill="#2e7d32"
                  stroke="#0f3b13"
                  strokeWidth="0.28"
                  opacity={0.92 - (1 - fruitRipeness) * 0.25}
                />
              </g>
            );
          })}
        </g>
      ))}
    </g>
  );
}

