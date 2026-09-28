import React, { useState, useEffect } from 'react';

interface Real3DDiceProps {
  value: number; // 1 to 6
  isShaking: boolean;
  size?: number; // pixel width, default 52
  rotationAngle?: number; // tilt in deg, e.g. -12 to 12
}

export const Real3DDice: React.FC<Real3DDiceProps> = ({
  value,
  isShaking,
  size = 52,
  rotationAngle = 0,
}) => {
  // During shaking, cycle faces rapidly to simulate realistic tumble
  const [displayValue, setDisplayValue] = useState<number>(value);

  useEffect(() => {
    if (!isShaking) {
      setDisplayValue(value);
      return;
    }
    const interval = setInterval(() => {
      setDisplayValue(Math.floor(Math.random() * 6) + 1);
    }, 70);
    return () => clearInterval(interval);
  }, [isShaking, value]);

  // Unique ID prefix to avoid SVG gradient collisions between multiple dice
  const idPrefix = React.useId().replace(/:/g, '_');

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size * 1.08}px`,
        transform: isShaking
          ? undefined
          : `rotate(${rotationAngle}deg)`,
        transition: isShaking ? 'none' : 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      }}
      className={`relative shrink-0 select-none ${
        isShaking ? 'animate-[diceTumble_0.18s_infinite_ease-in-out]' : ''
      }`}
    >
      <svg
        viewBox="0 0 100 108"
        className="w-full h-full drop-shadow-[0_8px_14px_rgba(0,0,0,0.7)] overflow-visible"
      >
        <defs>
          {/* Bottom Drop Shadow */}
          <radialGradient id={`${idPrefix}_shadow`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#000000" stopOpacity="0.75" />
            <stop offset="70%" stopColor="#000000" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>

          {/* 3D Extrusion Side Gradient (Depth) */}
          <linearGradient id={`${idPrefix}_depth`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#cbd5e1" />
            <stop offset="35%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>

          {/* Luxury Ivory Porcelain Top Face Gradient */}
          <linearGradient id={`${idPrefix}_face`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="30%" stopColor="#fdfefe" />
            <stop offset="75%" stopColor="#f1f5f9" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>

          {/* Beveled Edge Highlight */}
          <linearGradient id={`${idPrefix}_bevel`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#e2e8f0" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.4" />
          </linearGradient>

          {/* Glossy Curved Light Reflection */}
          <linearGradient id={`${idPrefix}_gloss`} x1="0%" y1="0%" x2="100%" y2="80%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
            <stop offset="40%" stopColor="#ffffff" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          {/* Deep Carved Red Pip (Ruby Inset) */}
          <radialGradient id={`${idPrefix}_pipRed`} cx="38%" cy="36%" r="62%">
            <stop offset="0%" stopColor="#ff6b6b" />
            <stop offset="35%" stopColor="#ef4444" />
            <stop offset="70%" stopColor="#b91c1c" />
            <stop offset="95%" stopColor="#7f1d1d" />
            <stop offset="100%" stopColor="#450a0a" />
          </radialGradient>

          {/* Center Red Pip 1 Extra Glow */}
          <radialGradient id={`${idPrefix}_pipCenter1`} cx="38%" cy="36%" r="62%">
            <stop offset="0%" stopColor="#ff8787" />
            <stop offset="30%" stopColor="#f43f5e" />
            <stop offset="65%" stopColor="#be123c" />
            <stop offset="90%" stopColor="#881337" />
            <stop offset="100%" stopColor="#4c0519" />
          </radialGradient>

          {/* Deep Carved Black Pip (Obsidian Inset) */}
          <radialGradient id={`${idPrefix}_pipBlack`} cx="38%" cy="36%" r="62%">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="40%" stopColor="#334155" />
            <stop offset="75%" stopColor="#0f172a" />
            <stop offset="95%" stopColor="#020617" />
            <stop offset="100%" stopColor="#000000" />
          </radialGradient>
        </defs>

        {/* 1. Ambient Drop Shadow Underneath */}
        <ellipse cx="50" cy="100" rx="42" ry="7" fill={`url(#${idPrefix}_shadow)`} />

        {/* 2. 3D Beveled Bottom / Thickness (Creates true 3D solid cube illusion) */}
        <path
          d="M 12 70 
             Q 12 86 24 88 
             L 76 88 
             Q 88 86 88 70 
             L 88 30 
             Q 88 84 76 88 
             L 24 88 
             Q 12 84 12 30 
             Z"
          fill={`url(#${idPrefix}_depth)`}
        />
        <rect
          x="12"
          y="68"
          width="76"
          height="22"
          rx="14"
          fill={`url(#${idPrefix}_depth)`}
        />

        {/* 3. Main Face (Glossy Porcelain Ivory Tile) */}
        <rect
          x="12"
          y="10"
          width="76"
          height="74"
          rx="17"
          fill={`url(#${idPrefix}_face)`}
          stroke={`url(#${idPrefix}_bevel)`}
          strokeWidth="1.8"
        />

        {/* 4. Elegant Top Curved Gloss Reflection */}
        <path
          d="M 16 26 
             C 16 16 24 14 38 13 
             C 56 12 68 15 80 23 
             C 66 19 46 17 32 20 
             C 22 22 18 25 16 26 Z"
          fill={`url(#${idPrefix}_gloss)`}
        />

        {/* 5. Concave Engraved Pips (Chấm Xí Ngầu) */}
        {/* Helper function to draw a Pip with 3D inset shadow and specular glint */}
        {displayValue === 1 && (
          <g>
            {/* Ambient carved halo for the big red dot */}
            <circle cx="50" cy="47" r="16.5" fill="#fecdd3" opacity="0.45" />
            <circle
              cx="50"
              cy="47"
              r="15"
              fill={`url(#${idPrefix}_pipCenter1)`}
              stroke="#9f1239"
              strokeWidth="0.8"
            />
            {/* Top-left glint */}
            <ellipse cx="45" cy="42" rx="3.5" ry="2.2" transform="rotate(-30 45 42)" fill="#ffffff" opacity="0.75" />
          </g>
        )}

        {displayValue === 2 && (
          <g>
            {/* Pip Top-Left */}
            <circle cx="31" cy="28" r="8" fill={`url(#${idPrefix}_pipBlack)`} stroke="#0f172a" strokeWidth="0.5" />
            <ellipse cx="28.5" cy="25.5" rx="1.8" ry="1.1" transform="rotate(-30 28.5 25.5)" fill="#ffffff" opacity="0.65" />

            {/* Pip Bottom-Right */}
            <circle cx="69" cy="66" r="8" fill={`url(#${idPrefix}_pipBlack)`} stroke="#0f172a" strokeWidth="0.5" />
            <ellipse cx="66.5" cy="63.5" rx="1.8" ry="1.1" transform="rotate(-30 66.5 63.5)" fill="#ffffff" opacity="0.65" />
          </g>
        )}

        {displayValue === 3 && (
          <g>
            {/* Pip Top-Left */}
            <circle cx="30" cy="27" r="7.5" fill={`url(#${idPrefix}_pipBlack)`} stroke="#0f172a" strokeWidth="0.5" />
            <ellipse cx="27.5" cy="24.5" rx="1.6" ry="1" transform="rotate(-30 27.5 24.5)" fill="#ffffff" opacity="0.6" />

            {/* Pip Center */}
            <circle cx="50" cy="47" r="7.5" fill={`url(#${idPrefix}_pipBlack)`} stroke="#0f172a" strokeWidth="0.5" />
            <ellipse cx="47.5" cy="44.5" rx="1.6" ry="1" transform="rotate(-30 47.5 44.5)" fill="#ffffff" opacity="0.6" />

            {/* Pip Bottom-Right */}
            <circle cx="70" cy="67" r="7.5" fill={`url(#${idPrefix}_pipBlack)`} stroke="#0f172a" strokeWidth="0.5" />
            <ellipse cx="67.5" cy="64.5" rx="1.6" ry="1" transform="rotate(-30 67.5 64.5)" fill="#ffffff" opacity="0.6" />
          </g>
        )}

        {displayValue === 4 && (
          <g>
            {/* 4 Red Pips - Asian Casino Tradition */}
            {[
              { cx: 31, cy: 28 },
              { cx: 69, cy: 28 },
              { cx: 31, cy: 66 },
              { cx: 69, cy: 66 },
            ].map((p, idx) => (
              <g key={idx}>
                <circle cx={p.cx} cy={p.cy} r="8" fill={`url(#${idPrefix}_pipRed)`} stroke="#991b1b" strokeWidth="0.5" />
                <ellipse cx={p.cx - 2.5} cy={p.cy - 2.5} rx="1.8" ry="1.1" transform={`rotate(-30 ${p.cx - 2.5} ${p.cy - 2.5})`} fill="#ffffff" opacity="0.7" />
              </g>
            ))}
          </g>
        )}

        {displayValue === 5 && (
          <g>
            {/* 4 Corner Black Pips */}
            {[
              { cx: 30, cy: 27 },
              { cx: 70, cy: 27 },
              { cx: 30, cy: 67 },
              { cx: 70, cy: 67 },
            ].map((p, idx) => (
              <g key={idx}>
                <circle cx={p.cx} cy={p.cy} r="7.5" fill={`url(#${idPrefix}_pipBlack)`} stroke="#0f172a" strokeWidth="0.5" />
                <ellipse cx={p.cx - 2.2} cy={p.cy - 2.2} rx="1.6" ry="1" transform={`rotate(-30 ${p.cx - 2.2} ${p.cy - 2.2})`} fill="#ffffff" opacity="0.6" />
              </g>
            ))}
            {/* Center Red Pip */}
            <circle cx="50" cy="47" r="8" fill={`url(#${idPrefix}_pipRed)`} stroke="#991b1b" strokeWidth="0.5" />
            <ellipse cx="47.5" cy="44.5" rx="1.8" ry="1.1" transform="rotate(-30 47.5 44.5)" fill="#ffffff" opacity="0.75" />
          </g>
        )}

        {displayValue === 6 && (
          <g>
            {/* 6 Black Pips in 2 columns */}
            {[
              { cx: 31, cy: 26 },
              { cx: 31, cy: 47 },
              { cx: 31, cy: 68 },
              { cx: 69, cy: 26 },
              { cx: 69, cy: 47 },
              { cx: 69, cy: 68 },
            ].map((p, idx) => (
              <g key={idx}>
                <circle cx={p.cx} cy={p.cy} r="7.2" fill={`url(#${idPrefix}_pipBlack)`} stroke="#0f172a" strokeWidth="0.5" />
                <ellipse cx={p.cx - 2} cy={p.cy - 2} rx="1.5" ry="0.9" transform={`rotate(-30 ${p.cx - 2} ${p.cy - 2})`} fill="#ffffff" opacity="0.6" />
              </g>
            ))}
          </g>
        )}
      </svg>
    </div>
  );
};
