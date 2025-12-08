// src/components/TomatoGrowthSVG.js
import React from "react";

/**
 * TomatoGrowthSVG
 *
 * Props:
 *  - tick: current tick (0..tickGoal)
 *  - tickGoal: total ticks for this slot
 *  - weather: "sunny" | "rainy" | "cloudy" | "windy" | "stormy"
 *  - rarity: "common" | "rare" | "epic" | "legendary"
 *  - className: optional wrapper class
 */
export default function TomatoGrowthSVG({
  tick = 0,
  tickGoal = 21,
  weather = "sunny",
  rarity = "common",
  className = "",
}) {
  // Safety + progress 0..1
  const safeGoal = Math.max(1, tickGoal || 1);
  const clampedTick = Math.max(0, Math.min(tick || 0, safeGoal));
  const progress = clampedTick / safeGoal;

  // Map progress → stage
  // 0–0.15: seed; 0.15–0.35: seedling; 0.35–0.6: foliage;
  // 0.6–0.8: flowering; 0.8–1: fruiting/ripening
  let stage = { key: "seed", label: "Germination" };
  if (progress >= 0.15 && progress < 0.35) {
    stage = { key: "seedling", label: "Seedling" };
  } else if (progress >= 0.35 && progress < 0.6) {
    stage = { key: "foliage", label: "Vegetative Growth" };
  } else if (progress >= 0.6 && progress < 0.8) {
    stage = { key: "flower", label: "Flowering" };
  } else if (progress >= 0.8) {
    stage = { key: "fruit", label: "Fruit & Ripening" };
  }

  // Rarity glow strength
  const rarityGlowMap = {
    common: 0.0,
    rare: 0.3,
    epic: 0.55,
    legendary: 0.8,
  };
  const rarityGlow =
    rarityGlowMap[rarity] != null ? rarityGlowMap[rarity] : 0.0;

  const isCloudy = weather === "cloudy";
  const isWindy = weather === "windy";
  const isStormy = weather === "stormy";

  // Plant height (stem top Y)
  // base at y = 78, top rises from 68 → 30 as it grows
  const stemTopY = 78 - 48 * Math.pow(progress, 0.7);

  // Branch levels (3 main layers)
  const branchLevels = [
    stemTopY + 20, // lower
    stemTopY + 10, // middle
    stemTopY, // upper
  ].map((y) => Math.min(74, y));

  // How many leaves overall (tomato plants are leafy)
  const leafDensity =
    stage.key === "seed" ? 0 :
    stage.key === "seedling" ? 0.4 :
    stage.key === "foliage" ? 1 :
    stage.key === "flower" ? 1.1 : 1.2;

  const totalLeaves = Math.round(18 * leafDensity);

  // Tomatoes (3 trusses, each can have 2–3 fruits)
  const trussCount = 3;
  const trussBaseProgress = Math.max(0, progress - 0.8) / 0.2; // 0..1 when in final stage

  // color for fruit based on ripeness
  const fruitRipeness = Math.max(0, progress - 0.8) / 0.2; // 0..1
  const tomatoColor = lerpColor("#4CAF50", "#FF3D00", fruitRipeness); // green → red

  // Clouds positions
  const clouds = [
    { x: 18, y: 20, w: 22, h: 10 },
    { x: 65, y: 16, w: 26, h: 12 },
  ];

  return (
    <div className={"tomato-growth-wrapper " + className}>
      <svg
        viewBox="0 0 100 100"
        className="tomato-growth-svg"
        role="img"
        aria-label={"Tomato growth — " + stage.label}
      >
        <defs>
          <linearGradient id="tgs-sky" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor={isStormy ? "#3a4763" : isCloudy ? "#7fb0ff" : "#87CEEB"}
            />
            <stop offset="100%" stopColor={isStormy ? "#1d2433" : "#cfe9ff"} />
          </linearGradient>

          <linearGradient id="tgs-soil" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6d4c41" />
            <stop offset="100%" stopColor="#4e342e" />
          </linearGradient>

          <radialGradient id="tgs-sun" cx="80%" cy="15%" r="20%">
            <stop offset="0%" stopColor="#fff8e1" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ffeb3b" stopOpacity="0.3" />
          </radialGradient>

          <filter id="tgs-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation={rarityGlow * 3}
              result="tgs-blur"
            />
            <feMerge>
              <feMergeNode in="tgs-blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <style>{`
            @keyframes tgs-drift {
              from { transform: translateX(-15%); }
              to   { transform: translateX(115%); }
            }
            @keyframes tgs-sway {
              0%   { transform: rotate(-0.8deg); }
              50%  { transform: rotate( 0.8deg); }
              100% { transform: rotate(-0.8deg); }
            }
            .tgs-cloud {
              animation: tgs-drift linear infinite;
              opacity: ${isCloudy || isStormy ? 0.7 : 0.35};
            }
            .tgs-cloud0 { animation-duration: 28s; animation-delay: 0s; }
            .tgs-cloud1 { animation-duration: 34s; animation-delay: 3s; }
            .tgs-stem-group {
              transform-origin: 50% 80%;
              animation: tgs-sway ${isWindy ? 1.2 : 3}s ease-in-out infinite;
            }
          `}</style>
        </defs>

        {/* Sky */}
        <rect x="0" y="0" width="100" height="100" fill="url(#tgs-sky)" />

        {/* Sun */}
        {!isStormy && <circle cx="82" cy="13" r="9" fill="url(#tgs-sun)" />}

        {/* Clouds */}
        {clouds.map((c, i) => (
          <g
            key={i}
            className={"tgs-cloud tgs-cloud" + i}
            style={{ transformBox: "fill-box" }}
          >
            <ellipse cx={c.x} cy={c.y} rx={c.w / 2} ry={c.h / 2} fill="#ffffff" />
            <ellipse
              cx={c.x + 6}
              cy={c.y - 3}
              rx={c.w / 3}
              ry={c.h / 2.5}
              fill="#ffffff"
            />
            <ellipse
              cx={c.x - 6}
              cy={c.y - 2}
              rx={c.w / 3}
              ry={c.h / 3}
              fill="#ffffff"
            />
          </g>
        ))}

        {/* Soil */}
        <rect x="0" y="80" width="100" height="20" fill="url(#tgs-soil)" />

        {/* Seed */}
        {stage.key === "seed" && (
          <g filter="url(#tgs-glow)">
            <ellipse cx="50" cy="80" rx="2.2" ry="1.6" fill="#8D6E63" />
            <path
              d="M49.7,79.3 Q50,78.6 50.3,79.3"
              stroke="#5D4037"
              strokeWidth="0.25"
              fill="none"
            />
          </g>
        )}

        {/* Plant (stem + branches + leaves + fruit) */}
        <g className="tgs-stem-group" filter="url(#tgs-glow)">
          {/* Main stem */}
          <path
            d={`M50 78 L50 ${stemTopY}`}
            stroke="#2e7d32"
            strokeWidth="2.4"
            strokeLinecap="round"
          />

          {/* Side branches */}
          {branchLevels.map((y, idx) => {
            // fade lower branches on early stages
            const visibleFactor =
              stage.key === "seed"
                ? 0
                : stage.key === "seedling"
                ? idx === 0
                  ? 0.7
                  : 0.2
                : 1;
            if (visibleFactor <= 0) return null;

            const length = 11 + idx * 2;
            const thickness = 1.4;
            const alpha = 0.7 + 0.1 * (2 - idx);

            return (
              <g key={idx} opacity={alpha * visibleFactor}>
                {/* left */}
                <path
                  d={`M50 ${y} Q ${50 - length / 2} ${y - 2}, ${50 - length} ${y}`}
                  stroke="#2e7d32"
                  strokeWidth={thickness}
                  fill="none"
                  strokeLinecap="round"
                />
                {/* right */}
                <path
                  d={`M50 ${y} Q ${50 + length / 2} ${y - 2}, ${50 + length} ${y}`}
                  stroke="#2e7d32"
                  strokeWidth={thickness}
                  fill="none"
                  strokeLinecap="round"
                />
              </g>
            );
          })}

          {/* Leaves */}
          {Array.from({ length: totalLeaves }).map((_, i) => {
            const levelIndex = i % branchLevels.length;
            const baseY = branchLevels[levelIndex];
            const side = i % 2 === 0 ? -1 : 1;
            const offsetX = 8 + (i % 3) * 2;
            const x = 50 + side * offsetX;
            const y = baseY + (i % 3) * 1.2 - 4;

            const scale = 0.85 + ((i * 7) % 5) * 0.05;
            const rot = side * (18 + ((i * 11) % 7));

            // pointier / jagged tomato leaf shape
            return (
              <g
                key={i}
                transform={`translate(${x} ${y}) rotate(${rot}) scale(${scale})`}
                opacity={stage.key === "seed" ? 0 : 0.9}
              >
                <path
                  d="M0 0
                     C 5 -2, 8 -1, 9 1
                     C 7 1.5, 6 3, 5.5 4.5
                     C 3 4.5, 1.5 5, 0 4.8
                     C -1.5 5, -3 4.5, -4.8 3.8
                     C -4.2 2, -3.5 1, -2.5 0.3
                     C -1.2 -0.5, 0 -0.4, 0 0 Z"
                  fill="#388E3C"
                  stroke="#1B5E20"
                  strokeWidth="0.3"
                />
                <path
                  d="M0 0 L 5 4.2"
                  stroke="#1B5E20"
                  strokeWidth="0.3"
                />
              </g>
            );
          })}

          {/* Flower clusters (small yellow stars) */}
          {stage.key === "flower" || stage.key === "fruit" ? (
            branchLevels.map((y, idx) => {
              const cx = 50 + (idx - 1) * 6;
              const cy = y - 4;
              const opacity = stage.key === "flower" ? 0.9 : 0.4;
              return (
                <g key={idx} opacity={opacity}>
                  {Array.from({ length: 3 }).map((_, j) => {
                    const angle = (j * 120 * Math.PI) / 180;
                    const fx = cx + Math.cos(angle) * 3;
                    const fy = cy + Math.sin(angle) * 3;
                    return (
                      <g key={j}>
                        <circle
                          cx={fx}
                          cy={fy}
                          r="1.4"
                          fill="#FFD54F"
                          stroke="#F9A825"
                          strokeWidth="0.3"
                        />
                        <circle cx={fx} cy={fy} r="0.5" fill="#F57F17" />
                      </g>
                    );
                  })}
                </g>
              );
            })
          ) : null}

          {/* Tomato trusses (only later) */}
          {stage.key === "fruit" &&
            branchLevels.map((y, idx) => {
              const cx = 50 + (idx - 1) * 7;
              const cy = y + 2;
              const fruitsHere = idx === 0 ? 2 : 3;

              return (
                <g key={idx} filter="url(#tgs-glow)">
                  {/* little stem downwards for truss */}
                  <path
                    d={`M${cx} ${cy - 2} Q ${cx} ${cy}, ${cx} ${cy + 4}`}
                    stroke="#2e7d32"
                    strokeWidth="0.7"
                    fill="none"
                  />
                  {Array.from({ length: fruitsHere }).map((_, j) => {
                    const spread = 5;
                    const fx = cx + (j - (fruitsHere - 1) / 2) * spread;
                    const fy = cy + 5 + (j % 2) * 1.5;
                    const r = 2.8 + ((j + idx) % 2) * 0.6;

                    return (
                      <g key={j}>
                        <circle
                          cx={fx}
                          cy={fy}
                          r={r}
                          fill={tomatoColor}
                          stroke="#8B1A1A"
                          strokeWidth="0.5"
                        />
                        {/* highlight */}
                        <ellipse
                          cx={fx - r * 0.3}
                          cy={fy - r * 0.3}
                          rx={r * 0.4}
                          ry={r * 0.25}
                          fill="#ffffff"
                          opacity="0.15"
                        />
                      </g>
                    );
                  })}
                </g>
              );
            })}
        </g>

        {/* Stage label bar */}
        <g>
          <rect
            x="6"
            y="86"
            width="88"
            height="8"
            rx="2"
            fill="#FFFFFF"
            opacity="0.6"
          />
          <text
            x="50"
            y="91.5"
            textAnchor="middle"
            fontSize="3.6"
            fill="#1b3a2f"
          >
            {stage.label}
          </text>
        </g>

        {/* Progress bar (real tick progress) */}
        <g>
          <rect x="6" y="96" width="88" height="2" rx="1" fill="#e0e0e0" />
          <rect
            x="6"
            y="96"
            width={88 * progress}
            height="2"
            rx="1"
            fill="#43A047"
          />
        </g>
      </svg>
    </div>
  );
}

/* ---------- tiny color helpers ---------- */

function lerpColor(a, b, t) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const tt = Math.max(0, Math.min(1, t));
  const r = Math.round(ca.r + (cb.r - ca.r) * tt);
  const g = Math.round(ca.g + (cb.g - ca.g) * tt);
  const b2 = Math.round(ca.b + (cb.b - ca.b) * tt);
  return `rgb(${r}, ${g}, ${b2})`;
}

function hexToRgb(hex) {
  const s = hex.replace("#", "");
  const full =
    s.length === 3
      ? s
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : s;
  const n = parseInt(full, 16);
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255,
  };
}

