// src/components/svg/TomatoLeaves.js
import React from "react";

export default function TomatoLeaves({
  branchLevels = [],
  totalLeaves = 0,
  stageKey = "seed",
  ids,
}) {
  if (!ids) return null;
  if (!branchLevels.length) return null;
  if (stageKey === "seed") return null;

  // Match the parent branch math: length = 11 + idx*2
  // We'll attach leaves near the *end* of those branches.
  const branchLength = (idx) => 11 + idx * 2;

  // Reduce chaos: keep leaves closer + more consistent
  const leafCount = Math.max(0, totalLeaves);

  return (
    <g>
      {Array.from({ length: leafCount }).map((_, i) => {
        const levelIndex = i % branchLevels.length; // 0..2
        const by = branchLevels[levelIndex];

        // Alternate side, but add occasional flips so it doesn't look mirrored
        const side = i % 2 === 0 ? -1 : 1;

        // Where the branch ends (the leaf anchor point)
        const len = branchLength(levelIndex);
        const ax = 50 + side * (len - 0.8);
        const ay = by + (i % 3) * 0.45 - 0.2;

        // Leaf position slightly past the anchor
        const leafX = ax + side * (2.1 + (i % 3) * 0.35);
        const leafY = ay + (i % 3) * 0.35 - 0.6;

        // Rotation/scale: tighter, more natural
        const scale = 0.88 + ((i * 7) % 5) * 0.035;
        const rot = side * (22 + (levelIndex * 6)) + (((i * 11) % 7) - 3);

        // Petiole (leaf stem): from branch tip -> leaf base
        const px1 = ax;
        const py1 = ay;
        const px2 = leafX - side * 1.2;
        const py2 = leafY + 0.25;

        // Slight curve control
        const c1x = ax + side * 1.0;
        const c1y = ay - 0.35;
        const c2x = leafX - side * 1.0;
        const c2y = leafY + 0.55;

        // Small node bump at the branch tip
        const nodeR = 0.35;

        return (
          <g key={i} opacity={0.98}>
            {/* node at attachment */}
            <circle cx={ax} cy={ay} r={nodeR + 0.18} fill="#0b2f10" opacity="0.18" />
            <circle cx={ax} cy={ay} r={nodeR} fill="#2e7d32" opacity="0.85" />

            {/* petiole */}
            <path
              d={`M ${px1} ${py1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${px2} ${py2}`}
              stroke="#1b5e20"
              strokeWidth="0.6"
              strokeLinecap="round"
              opacity="0.85"
            />
            {/* petiole highlight */}
            <path
              d={`M ${px1} ${py1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${px2} ${py2}`}
              stroke="#eaffef"
              strokeWidth="0.22"
              strokeLinecap="round"
              opacity="0.25"
            />

            {/* leaf */}
            <g
              transform={`translate(${leafX} ${leafY}) rotate(${rot}) scale(${scale})`}
              filter={`url(#${ids.leafShadow})`}
            >
              <path
                d="M0 0
                   C 5 -2.1, 8 -1.2, 9.2 1
                   C 7.2 1.7, 6.2 3.2, 5.6 4.8
                   C 3.1 4.9, 1.5 5.3, 0 5.0
                   C -1.6 5.3, -3.2 4.9, -5.1 4.0
                   C -4.4 2.2, -3.6 1.1, -2.5 0.35
                   C -1.2 -0.5, 0 -0.4, 0 0 Z"
                fill={`url(#${ids.leafGrad})`}
                stroke="#144d19"
                strokeWidth="0.26"
              />
              <path
                d="M-1 -0.25
                   C 2 -2.15, 6.1 -1.85, 7.2 -0.25
                   C 5.3 0.25, 3.2 1.25, 1.4 2.55
                   C 0.25 1.7, -0.25 0.85, -1 -0.25 Z"
                fill={`url(#${ids.leafHi})`}
                opacity="0.75"
              />
              <path d="M-0.9 0.25 L 5.3 4.45" stroke="#0f3b13" strokeWidth="0.26" opacity="0.65" />
            </g>
          </g>
        );
      })}
    </g>
  );
}

