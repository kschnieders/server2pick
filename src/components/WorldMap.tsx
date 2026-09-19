import { useState } from "react";
import type { Pop } from "../api";
import { WORLD_PATH } from "../data/world";
import { useT } from "../i18n";
import {
  QUALITY_COLOR,
  formatMs,
  quality,
  statsFor,
  type History,
} from "../lib/ping-stats";

type Props = {
  pops: Pop[];
  blocked: Set<string>;
  history: History;
  onToggle: (id: string) => void;
};

/** Equirectangular projection matching the pre-projected land path. */
const projectX = (lon: number) => lon + 180;
const projectY = (lat: number) => 90 - lat;

/** Crops the poles, where Valve has no relays and the projection only wastes
 *  height. Stockholm (lat 59) and Buenos Aires (lat -35) are the outer POPs —
 *  the window keeps a wide margin beyond them so no dot sits on an edge.
 *  Widening it only makes the element taller: the viewBox is still 360 wide,
 *  so the horizontal scale, and with it the on-screen dot size, is unchanged. */
const VIEW_TOP = 13;
const VIEW_HEIGHT = 126;

export function WorldMap({ pops, blocked, history, onToggle }: Props) {
  const t = useT();
  const [hovered, setHovered] = useState<Pop | null>(null);

  const fastest = pops.reduce<{ id: string; ms: number } | null>((best, pop) => {
    const ms = statsFor(history[pop.id])?.best;
    if (ms == null || blocked.has(pop.id)) return best;
    return !best || ms < best.ms ? { id: pop.id, ms } : best;
  }, null);

  const hoveredStats = hovered ? statsFor(history[hovered.id]) : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 ${VIEW_TOP} 360 ${VIEW_HEIGHT}`}
        className="block w-full"
        role="img"
        aria-label={t("map.alt")}
      >
        <defs>
          <radialGradient id="map-glow" cx="50%" cy="45%" r="70%">
            <stop offset="0%" stopColor="#1a2129" />
            <stop offset="100%" stopColor="#0f1216" />
          </radialGradient>
          <linearGradient id="map-sweep-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#e8a33d" stopOpacity={0} />
            <stop offset="50%" stopColor="#e8a33d" stopOpacity={0.09} />
            <stop offset="100%" stopColor="#e8a33d" stopOpacity={0} />
          </linearGradient>
          {/* Keeps the sweep on the continents instead of washing over the sea. */}
          <clipPath id="map-land">
            <path d={WORLD_PATH} />
          </clipPath>
        </defs>

        <rect x="0" y="0" width="360" height="180" fill="url(#map-glow)" />
        <path d={WORLD_PATH} fill="#222a33" stroke="#2f3944" strokeWidth={0.25} />

        <g clipPath="url(#map-land)">
          <rect
            x={-140}
            y="0"
            width={140}
            height="180"
            fill="url(#map-sweep-grad)"
            style={{ animation: "map-sweep 26s linear infinite" }}
          />
        </g>

        {pops.map((pop, index) => {
          const isBlocked = blocked.has(pop.id);
          const stats = statsFor(history[pop.id]);
          const color = isBlocked
            ? "#e5615e"
            : QUALITY_COLOR[quality(stats?.best ?? null)];
          const x = projectX(pop.lon);
          const y = projectY(pop.lat);
          const isFastest = fastest?.id === pop.id;

          return (
            <g
              key={pop.id}
              onClick={() => onToggle(pop.id)}
              onMouseEnter={() => setHovered(pop)}
              onMouseLeave={() => setHovered((h) => (h?.id === pop.id ? null : h))}
              className="cursor-pointer"
            >
              {/* Generous invisible hit area — the dots are only a few pixels wide. */}
              <circle cx={x} cy={y} r={4.5} fill="transparent" />
              {/* Staggered so the pulses read as a wave rolling over the map
                  rather than 29 dots blinking in lockstep. */}
              {!isBlocked && (
                <circle
                  cx={x}
                  cy={y}
                  r={2.6}
                  fill="none"
                  stroke={color}
                  strokeWidth={0.5}
                  style={{
                    transformOrigin: `${x}px ${y}px`,
                    animation: "pulse-soft 4.5s ease-out infinite",
                    animationDelay: `${(index % 12) * 0.36}s`,
                  }}
                />
              )}
              {isFastest && (
                <circle
                  cx={x}
                  cy={y}
                  r={3}
                  fill="none"
                  stroke={color}
                  strokeWidth={0.6}
                  style={{
                    transformOrigin: `${x}px ${y}px`,
                    animation: "pulse-ring 2.4s ease-out infinite",
                  }}
                />
              )}
              <circle
                cx={x}
                cy={y}
                r={isBlocked ? 1.8 : 2.4}
                fill={isBlocked ? "none" : color}
                stroke={color}
                strokeWidth={isBlocked ? 0.9 : 0.5}
                opacity={isBlocked ? 0.85 : 1}
              />
              {isBlocked && (
                <path
                  d={`M${x - 1.2} ${y - 1.2}L${x + 1.2} ${y + 1.2}M${x + 1.2} ${
                    y - 1.2
                  }L${x - 1.2} ${y + 1.2}`}
                  stroke={color}
                  strokeWidth={0.7}
                  strokeLinecap="round"
                />
              )}
            </g>
          );
        })}
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-ink-700 bg-ink-900/95 px-2.5 py-1.5 text-xs shadow-xl shadow-black/50"
          style={{
            left: `${(projectX(hovered.lon) / 360) * 100}%`,
            top: `${((projectY(hovered.lat) - VIEW_TOP) / VIEW_HEIGHT) * 100 - 2}%`,
          }}
        >
          <div className="font-medium text-ink-100">{hovered.name}</div>
          {hovered.country && <div className="text-ink-400">{hovered.country}</div>}
          <div className="mt-1 font-mono text-ink-300">
            {formatMs(hoveredStats?.best)} ms
            {blocked.has(hovered.id) && (
              <span className="ml-1.5 text-rose-glow">{t("map.blocked")}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
