// src/components/EnergySystemSVG.js
import React, { useMemo } from "react";

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

export default function EnergySystemSVG({ pct = 0 }) {
  const p = clamp01(pct);

  // glow strength based on energy %
  const glow = useMemo(() => 0.25 + p * 0.75, [p]);

  // Molten palette helpers
  const ember = `rgba(107,44,0,${0.20 + glow * 0.35})`;     // deep ember
  const lava = `rgba(255,122,24,${0.18 + glow * 0.55})`;    // molten orange
  const hot = `rgba(255,179,71,${0.12 + glow * 0.55})`;     // white-hot edge

  return (
    <svg className="ecs-sysSvg" viewBox="0 0 800 220" preserveAspectRatio="none">
      <defs>
        {/* Background rail gradient (molten faint) */}
        <linearGradient id="railGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="rgba(255,122,24,0.04)" />
          <stop offset="0.35" stopColor={`rgba(107,44,0,${0.05 + p * 0.10})`} />
          <stop offset="0.70" stopColor={`rgba(255,122,24,${0.06 + p * 0.14})`} />
          <stop offset="1" stopColor="rgba(255,179,71,0.03)" />
        </linearGradient>

        {/* Active flowing molten gradient */}
        <linearGradient id="flowGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={ember} />
          <stop offset="0.40" stopColor={lava} />
          <stop offset="0.72" stopColor={hot} />
          <stop offset="1" stopColor="rgba(255,179,71,0.02)" />
        </linearGradient>

        {/* Fill bar molten gradient */}
        <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={`rgba(107,44,0,${0.55 + p * 0.20})`} />
          <stop offset="0.55" stopColor={`rgba(255,122,24,${0.55 + p * 0.25})`} />
          <stop offset="1" stopColor={`rgba(255,179,71,${0.35 + p * 0.25})`} />
        </linearGradient>

        {/* Soft molten glow */}
        <filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation={6 + p * 10} result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="
              1 0 0 0 0
              0 0.55 0 0 0
              0 0 0.15 0 0
              0 0 0 0.85 0"
            result="glow"
          />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Hot core glow (tighter) */}
        <filter id="hotCoreGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation={2 + p * 3} result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="
              1 0 0 0 0
              0 0.75 0 0 0
              0 0 0.25 0 0
              0 0 0 0.9 0"
            result="glow"
          />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Ember noise overlay for subtle texture */}
        <filter id="emberNoise" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" result="noise" />
          <feColorMatrix
            in="noise"
            type="matrix"
            values="
              1 0 0 0 0
              0 0.5 0 0 0
              0 0 0.2 0 0
              0 0 0 0.18 0"
            result="tinted"
          />
          <feComposite in="tinted" in2="SourceGraphic" operator="in" />
        </filter>
      </defs>

      {/* outer frame */}
      <rect x="10" y="10" width="780" height="200" rx="18" fill="rgba(255,255,255,0.03)" />
      <rect x="10" y="10" width="780" height="200" rx="18" fill="none" stroke="rgba(255,255,255,0.08)" />

      {/* socket area */}
      <g transform="translate(30,40)">
        <rect
          x="0"
          y="0"
          width="180"
          height="140"
          rx="16"
          fill="rgba(0,0,0,0.18)"
          stroke="rgba(255,255,255,0.08)"
        />
        <text x="14" y="24" fontSize="12" fill="rgba(255,255,255,0.65)" fontFamily="system-ui, sans-serif">
          CORE SOCKET
        </text>

        {/* socket hole */}
        <rect
          x="26"
          y="46"
          width="128"
          height="72"
          rx="12"
          fill="rgba(255,255,255,0.04)"
          stroke="rgba(255,255,255,0.10)"
        />

        {/* connector pins (molten) */}
        {Array.from({ length: 6 }).map((_, i) => (
          <rect
            key={i}
            x={40 + i * 18}
            y={102}
            width="10"
            height="10"
            rx="3"
            fill={`rgba(255,122,24,${0.08 + glow * 0.45})`}
          />
        ))}

        {/* small heat shimmer overlay */}
        <rect x="26" y="46" width="128" height="72" rx="12" fill="transparent" filter="url(#emberNoise)" />
      </g>

      {/* energy rail (bus line) */}
      <g filter="url(#softGlow)">
        {/* background rail */}
        <path
          d="M240 110 C 320 110, 360 60, 430 60 L 760 60"
          fill="none"
          stroke="url(#railGrad)"
          strokeWidth="16"
          strokeLinecap="round"
        />

        {/* active rail: molten flow */}
        <path
          d="M240 110 C 320 110, 360 60, 430 60 L 760 60"
          fill="none"
          stroke="url(#flowGrad)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray="10 16"
          opacity={0.35 + p * 0.65}
        >
          <animate attributeName="stroke-dashoffset" from="0" to="-52" dur="1.1s" repeatCount="indefinite" />
        </path>

        {/* hot core line: tighter + brighter */}
        <path
          d="M240 110 C 320 110, 360 60, 430 60 L 760 60"
          fill="none"
          stroke={`rgba(255,179,71,${0.06 + p * 0.45})`}
          strokeWidth="3"
          strokeLinecap="round"
          filter="url(#hotCoreGlow)"
        />
      </g>

      {/* fill bar (visual energy) */}
      <g>
        <rect x="240" y="150" width="520" height="14" rx="7" fill="rgba(255,255,255,0.06)" />
        <rect
          x="240"
          y="150"
          width={520 * p}
          height="14"
          rx="7"
          fill="url(#barGrad)"
          filter="url(#hotCoreGlow)"
        />

        <text x="240" y="190" fontSize="12" fill="rgba(255,255,255,0.6)" fontFamily="system-ui, sans-serif">
          POWER BUS
        </text>
        <text
          x="760"
          y="190"
          textAnchor="end"
          fontSize="12"
          fill="rgba(255,255,255,0.75)"
          fontFamily="system-ui, sans-serif"
        >
          {Math.round(p * 100)}%
        </text>
      </g>
    </svg>
  );
}

