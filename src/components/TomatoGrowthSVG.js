// src/components/TomatoGrowthSVG.js
import React, { useId, useMemo } from "react";

import TomatoStem from "./svg/TomatoStem";
import TomatoLeaves from "./svg/TomatoLeaves";
import TomatoFruitClusters from "./svg/TomatoFruitClusters";

import {
  clamp01,
  lerpColorHex,
  mixHex,
  shadeHex,
  mulberry32,
  hashStringToInt,
} from "./svg/svgUtils";

export default function TomatoGrowthSVG({
  tick = 0,
  tickGoal = 21,
  weather = "sunny",
  rarity = "common",
  className = "",
  cinderTheme = true,
}) {
  // ✅ unique per instance to prevent <defs> collisions
  const rid = useId().replace(/:/g, "");
  const ids = useMemo(() => {
    const p = `tgs-${rid}`;
    return {
      sky: `${p}-sky`,
      soil: `${p}-soil`,
      sun: `${p}-sun`,
      glow: `${p}-glow`,

      // realism
      stemGrad: `${p}-stemGrad`,
      stemHi: `${p}-stemHi`,
      leafGrad: `${p}-leafGrad`,
      leafHi: `${p}-leafHi`,
      leafShadow: `${p}-leafShadow`,

      // cinder
      cinderCore: `${p}-cinderCore`,
      steamBlur: `${p}-steamBlur`,

      // tomatoes
      tomatoGrad: `${p}-tomatoGrad`,
      tomatoSpec: `${p}-tomatoSpec`,
    };
  }, [rid]);

  // -----------------------------
  // Progress + growth stage
  // -----------------------------
  const safeGoal = Math.max(1, tickGoal || 1);
  const clampedTick = Math.max(0, Math.min(tick || 0, safeGoal));
  const progress = clampedTick / safeGoal;

  let stage = { key: "seed", label: "Germination" };
  if (progress >= 0.15 && progress < 0.35) stage = { key: "seedling", label: "Seedling" };
  else if (progress >= 0.35 && progress < 0.6) stage = { key: "foliage", label: "Vegetative Growth" };
  else if (progress >= 0.6 && progress < 0.8) stage = { key: "flower", label: "Flowering" };
  else if (progress >= 0.8) stage = { key: "fruit", label: "Fruit & Ripening" };

  const rarityGlowMap = { common: 0.0, rare: 0.3, epic: 0.55, legendary: 0.8 };
  const rarityGlow = rarityGlowMap[rarity] ?? 0.0;

  const isCloudy = weather === "cloudy";
  const isWindy = weather === "windy";
  const isStormy = weather === "stormy";

  // Plant height (stem top Y)
  const stemTopY = 78 - 48 * Math.pow(progress, 0.7);

  // Branch levels (clamped so nothing goes above soil too far)
  const branchLevels = [stemTopY + 20, stemTopY + 10, stemTopY].map((y) =>
    Math.min(74, y)
  );

  const leafDensity =
    stage.key === "seed"
      ? 0
      : stage.key === "seedling"
      ? 0.42
      : stage.key === "foliage"
      ? 1
      : stage.key === "flower"
      ? 1.1
      : 1.2;

  const totalLeaves = Math.round(18 * leafDensity);

  // -----------------------------
  // Tomato color follows ripeness
  // -----------------------------
  const fruitRipeness = clamp01((progress - 0.8) / 0.2);

  // green -> yellow/orange -> red
  const mid = lerpColorHex("#4CAF50", "#FFB300", clamp01(fruitRipeness * 0.6));
  const tomatoBase = lerpColorHex(
    mid,
    "#FF3D00",
    clamp01((fruitRipeness - 0.35) / 0.65)
  );

  const tomatoLight = mixHex(tomatoBase, "#FFFFFF", 0.34);
  const tomatoMid = tomatoBase;
  const tomatoDark = shadeHex(tomatoBase, -42);
  const tomatoEdge = shadeHex(tomatoBase, -65);

  // -----------------------------
  // Atmosphere
  // -----------------------------
  const clouds = [
    { x: 18, y: 20, w: 22, h: 10 },
    { x: 65, y: 16, w: 26, h: 12 },
  ];

  const swayDur = isWindy ? "1.2s" : "3s";
  const cloudOpacity = isCloudy || isStormy ? 0.7 : 0.35;

  // -----------------------------
  // CINDER heat + steam
  // -----------------------------
  const isCinder = !!cinderTheme;
  const hot = isCinder ? 0.18 + 0.62 * progress : 0;
  const coreOpacity = isCinder ? Math.min(0.92, 0.22 + hot + 0.18 * rarityGlow) : 0;

  const steamCount = isCinder ? Math.round(5 + 9 * progress + 6 * rarityGlow) : 0;
  const steamOpacity = isCinder
    ? Math.min(0.65, 0.22 + 0.38 * progress + 0.12 * rarityGlow)
    : 0;
  const steamBaseY = 78.5; // above soil

  // deterministic RNG (stable steam)
  const seed = useMemo(() => hashStringToInt(rid), [rid]);
  const rng = useMemo(() => mulberry32(seed), [seed]);

  const steamLanes = useMemo(() => {
    const lanes = [];
    for (let i = 0; i < steamCount; i++) {
      const x = 22 + rng() * 56; // 22..78
      const drift = (rng() * 2 - 1) * 10;
      const height = 16 + rng() * 22;
      const width = 6 + rng() * 9;
      const dur = 1.8 + rng() * 2.1;
      const delay = rng() * 1.3;
      const wobble = 2 + rng() * 5;
      const puff = 0.9 + rng() * 0.9;
      lanes.push({ x, drift, height, width, dur, delay, wobble, puff });
    }
    return lanes;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steamCount, seed]);

  const plantFilter = rarityGlow > 0 ? `url(#${ids.glow})` : undefined;

  return (
    <div className={"tomato-growth-wrapper " + className}>
      <svg
        viewBox="0 0 100 100"
        className="tomato-growth-svg"
        role="img"
        aria-label={"Tomato growth — " + stage.label}
      >
        <defs>
          {/* Sky */}
          <linearGradient id={ids.sky} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor={
                isStormy
                  ? "#3a4763"
                  : isCloudy
                  ? isCinder
                    ? "#9bb6ff"
                    : "#7fb0ff"
                  : isCinder
                  ? "#a8dcff"
                  : "#87CEEB"
              }
            />
            <stop
              offset="100%"
              stopColor={isStormy ? "#1d2433" : isCinder ? "#f4e6ff" : "#cfe9ff"}
            />
          </linearGradient>

          {/* Soil */}
          <linearGradient id={ids.soil} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isCinder ? "#7b4a3e" : "#6d4c41"} />
            <stop offset="100%" stopColor={isCinder ? "#311a16" : "#4e342e"} />
          </linearGradient>

          <radialGradient id={ids.sun} cx="80%" cy="15%" r="22%">
            <stop offset="0%" stopColor="#fff8e1" stopOpacity="0.95" />
            <stop offset="70%" stopColor="#ffeb3b" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#ffeb3b" stopOpacity="0.06" />
          </radialGradient>

          {/* Stem gradient + highlight */}
          <linearGradient id={ids.stemGrad} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#124a18" />
            <stop offset="50%" stopColor="#2e7d32" />
            <stop offset="100%" stopColor="#1f6a28" />
          </linearGradient>

          <linearGradient id={ids.stemHi} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#eaffef" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#eaffef" stopOpacity="0.0" />
          </linearGradient>

          {/* Leaf gradient + highlight */}
          <linearGradient id={ids.leafGrad} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#49b053" />
            <stop offset="55%" stopColor="#2e7d32" />
            <stop offset="100%" stopColor="#1b5e20" />
          </linearGradient>

          <linearGradient id={ids.leafHi} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
          </linearGradient>

          <filter id={ids.leafShadow} x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow
              dx="0"
              dy="0.6"
              stdDeviation="0.6"
              floodColor="#000"
              floodOpacity="0.22"
            />
          </filter>

          {/* CINDER core */}
          <radialGradient id={ids.cinderCore} cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#ffd37a" stopOpacity="0.95" />
            <stop offset="35%" stopColor="#ff7a18" stopOpacity="0.65" />
            <stop offset="70%" stopColor="#ff2a2a" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#000" stopOpacity="0" />
          </radialGradient>

          <filter id={ids.steamBlur} x="-70%" y="-70%" width="240%" height="240%">
            <feGaussianBlur stdDeviation="0.85" />
          </filter>

          {/* Tomato gradient follows ripeness */}
          <radialGradient id={ids.tomatoGrad} cx="35%" cy="30%" r="72%">
            <stop offset="0%" stopColor={tomatoLight} stopOpacity="0.98" />
            <stop offset="35%" stopColor={tomatoMid} stopOpacity="0.98" />
            <stop offset="80%" stopColor={tomatoDark} stopOpacity="1" />
            <stop offset="100%" stopColor={tomatoEdge} stopOpacity="1" />
          </radialGradient>

          <radialGradient id={ids.tomatoSpec} cx="25%" cy="20%" r="55%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="35%" stopColor="#ffffff" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
          </radialGradient>

          {/* optional rarity glow */}
          {rarityGlow > 0 ? (
            <filter id={ids.glow} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur
                in="SourceGraphic"
                stdDeviation={Math.max(0.8, rarityGlow * 2.6)}
                result="blur"
              />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ) : null}
        </defs>

        {/* Sky */}
        <rect x="0" y="0" width="100" height="100" fill={`url(#${ids.sky})`} />

        {/* Sun */}
        {!isStormy && <circle cx="82" cy="13" r="9" fill={`url(#${ids.sun})`} />}

        {/* Clouds */}
        {clouds.map((c, i) => (
          <g key={i} opacity={cloudOpacity}>
            <g>
              <animateTransform
                attributeName="transform"
                type="translate"
                dur={i === 0 ? "28s" : "34s"}
                repeatCount="indefinite"
                values="-40 0; 140 0"
                begin={i === 0 ? "0s" : "3s"}
              />
              <ellipse cx={c.x} cy={c.y} rx={c.w / 2} ry={c.h / 2} fill="#fff" />
              <ellipse cx={c.x + 6} cy={c.y - 3} rx={c.w / 3} ry={c.h / 2.5} fill="#fff" />
              <ellipse cx={c.x - 6} cy={c.y - 2} rx={c.w / 3} ry={c.h / 3} fill="#fff" />
            </g>
          </g>
        ))}

        {/* Soil */}
        <rect x="0" y="80" width="100" height="20" fill={`url(#${ids.soil})`} />

        {/* CINDER core under soil */}
        {isCinder && (
          <g opacity={coreOpacity}>
            <circle cx="50" cy="86" r="18" fill={`url(#${ids.cinderCore})`}>
              <animate
                attributeName="opacity"
                values={`${coreOpacity};${Math.max(0.12, coreOpacity - 0.2)};${coreOpacity}`}
                dur="2.4s"
                repeatCount="indefinite"
              />
            </circle>
          </g>
        )}

        {/* Steam above soil */}
        {isCinder && steamCount > 0 && (
          <g opacity={steamOpacity} filter={`url(#${ids.steamBlur})`}>
            {steamLanes.map((s, i) => {
              const x0 = s.x;
              const y0 = steamBaseY + (i % 3) * 0.9;
              const x1 = x0 + s.drift * 0.35;
              const y1 = y0 - s.height * 0.45;
              const x2 = x0 + s.drift;
              const y2 = y0 - s.height;

              const path = `M ${x0} ${y0}
                            C ${x0 + s.wobble} ${y0 - 6},
                              ${x1 - s.wobble} ${y1 + 6},
                              ${x1} ${y1}
                            S ${x2 + s.wobble} ${y2 + 6},
                              ${x2} ${y2}`;

              return (
                <g key={i}>
                  <path
                    d={path}
                    fill="none"
                    stroke="#ffd7b2"
                    strokeOpacity="0.62"
                    strokeWidth={Math.max(1.0, s.width * 0.085)}
                    strokeLinecap="round"
                  >
                    <animate
                      attributeName="stroke-opacity"
                      dur={`${s.dur}s`}
                      repeatCount="indefinite"
                      values="0;0.72;0"
                      begin={`${s.delay}s`}
                    />
                  </path>

                  <path
                    d={path}
                    fill="none"
                    stroke="#ff7a18"
                    strokeOpacity="0.18"
                    strokeWidth={Math.max(1.9, s.width * 0.14)}
                    strokeLinecap="round"
                  >
                    <animate
                      attributeName="stroke-opacity"
                      dur={`${s.dur}s`}
                      repeatCount="indefinite"
                      values="0;0.26;0"
                      begin={`${s.delay}s`}
                    />
                  </path>

                  <animateTransform
                    attributeName="transform"
                    type="translate"
                    dur={`${s.dur}s`}
                    repeatCount="indefinite"
                    values={`0 0; 0 ${-s.height * 0.18}`}
                    begin={`${s.delay}s`}
                  />
                  <animateTransform
                    attributeName="transform"
                    additive="sum"
                    type="scale"
                    dur={`${s.dur}s`}
                    repeatCount="indefinite"
                    values={`1; ${1 + s.puff * 0.06}; 1`}
                    begin={`${s.delay}s`}
                  />
                </g>
              );
            })}
          </g>
        )}

        {/* Seed */}
        {stage.key === "seed" && (
          <g filter={plantFilter}>
            <ellipse cx="50" cy="80" rx="2.2" ry="1.6" fill="#8D6E63" />
            <path
              d="M49.7,79.3 Q50,78.6 50.3,79.3"
              stroke="#5D4037"
              strokeWidth="0.25"
              fill="none"
            />
          </g>
        )}

        {/* Plant */}
        {stage.key !== "seed" && (
          <g filter={plantFilter}>
            <g>
              <animateTransform
                attributeName="transform"
                type="rotate"
                dur={swayDur}
                repeatCount="indefinite"
                values={`-0.8 50 80; 0.8 50 80; -0.8 50 80`}
              />

              {/* STEM */}
              <TomatoStem stemTopY={stemTopY} ids={ids} />

              {/* Branches */}
              {branchLevels.map((y, idx) => {
                const visibleFactor =
                  stage.key === "seedling" ? (idx === 0 ? 0.75 : 0.25) : 1;
                const length = 11 + idx * 2;
                const thickness = 1.55;
                const alpha = 0.7 + 0.1 * (2 - idx);

                return (
                  <g key={idx} opacity={alpha * visibleFactor}>
                    <path
                      d={`M50 ${y} Q ${50 - length / 2} ${y - 2}, ${50 - length} ${y}`}
                      stroke="#0b2f10"
                      strokeWidth={thickness + 0.9}
                      fill="none"
                      strokeLinecap="round"
                      opacity="0.35"
                    />
                    <path
                      d={`M50 ${y} Q ${50 + length / 2} ${y - 2}, ${50 + length} ${y}`}
                      stroke="#0b2f10"
                      strokeWidth={thickness + 0.9}
                      fill="none"
                      strokeLinecap="round"
                      opacity="0.35"
                    />
                    <path
                      d={`M50 ${y} Q ${50 - length / 2} ${y - 2}, ${50 - length} ${y}`}
                      stroke={`url(#${ids.stemGrad})`}
                      strokeWidth={thickness}
                      fill="none"
                      strokeLinecap="round"
                    />
                    <path
                      d={`M50 ${y} Q ${50 + length / 2} ${y - 2}, ${50 + length} ${y}`}
                      stroke={`url(#${ids.stemGrad})`}
                      strokeWidth={thickness}
                      fill="none"
                      strokeLinecap="round"
                    />
                  </g>
                );
              })}

              {/* Leaves */}
              <TomatoLeaves
                branchLevels={branchLevels}
                totalLeaves={totalLeaves}
                stageKey={stage.key}
                ids={ids}
              />

              {/* Flowers */}
              {(stage.key === "flower" || stage.key === "fruit") &&
                branchLevels.map((y, idx) => {
                  const cx = 50 + (idx - 1) * 6;
                  const cy = y - 4;
                  const op = stage.key === "flower" ? 0.9 : 0.4;
                  return (
                    <g key={idx} opacity={op}>
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
                })}

              {/* ✅ Fruit clusters (new component) */}
              <TomatoFruitClusters
                ids={ids}
                stageKey={stage.key}
                branchLevels={branchLevels}
                stemTopY={stemTopY}
                progress={progress}
                rid={rid}
              />
            </g>
          </g>
        )}

        {/* Stage label */}
        <g>
          <rect x="6" y="86" width="88" height="8" rx="2" fill="#fff" opacity="0.6" />
          <text x="50" y="91.5" textAnchor="middle" fontSize="3.6" fill="#1b3a2f">
            {stage.label}
          </text>
        </g>

        {/* Progress */}
        <g>
          <rect x="6" y="96" width="88" height="2" rx="1" fill="#e0e0e0" />
          <rect x="6" y="96" width={88 * progress} height="2" rx="1" fill="#43A047" />
        </g>
      </svg>
    </div>
  );
}

