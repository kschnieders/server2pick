import { useEffect } from "react";
import type { Pop } from "../api";
import { WORLD_PATH } from "../data/world";
import { useT } from "../i18n";
import { VIEW_HEIGHT, VIEW_TOP, projectX, projectY } from "./WorldMap";

type Props = {
  gameName: string;
  /** Every location, so the map can show what is still open as well. */
  pops: Pop[];
  /** POPs the firewall currently blocks for this game. */
  blockedIds: Set<string>;
  /** Other games that hold rules of their own, as "name (count)". */
  otherGames: string[];
  busy: boolean;
  onUnblock: () => void;
  onDismiss: () => void;
};

/**
 * Says plainly that blocks are live, at the two moments it can come as a
 * surprise: opening the app, and switching to a game that already has rules.
 *
 * Dismissible on purpose. Active rules are the state this app exists to
 * produce, so locking the interface behind them would mean no selection could
 * ever be adjusted without tearing the whole set down first.
 *
 * The map is the same world the main view draws, but deliberately inert: no
 * hover, no click-to-toggle. A modal that quietly changes the selection behind
 * its own buttons would be a trap.
 */
export function ActiveRulesOverlay({
  gameName,
  pops,
  blockedIds,
  otherGames,
  busy,
  onUnblock,
  onDismiss,
}: Props) {
  const t = useT();
  const blocked = pops.filter((p) => blockedIds.has(p.id));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onDismiss();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  return (
    <div
      className="absolute inset-0 z-50 grid place-items-center bg-ink-950/75 backdrop-blur-md"
      style={{ animation: "overlay-backdrop-in 380ms ease-out both" }}
      onClick={onDismiss}
    >
      <div
        className="w-[34rem] max-w-[92vw] overflow-hidden rounded-2xl border border-rose-glow/30 bg-ink-900 shadow-2xl shadow-black/70"
        style={{
          animation: "overlay-card-in 560ms cubic-bezier(0.16, 0.8, 0.24, 1) 120ms both",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <svg
            viewBox={`0 ${VIEW_TOP} 360 ${VIEW_HEIGHT}`}
            className="block w-full"
            aria-hidden="true"
          >
            <defs>
              <radialGradient id="overlay-glow" cx="50%" cy="45%" r="75%">
                <stop offset="0%" stopColor="#1c1417" />
                <stop offset="100%" stopColor="#0d0f12" />
              </radialGradient>
              {/* Fades the map into the card so the text below has no seam.
                  Strong enough by the lower third that the headline stays
                  readable over land as well as over ocean. */}
              <linearGradient id="overlay-fade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="35%" stopColor="#111417" stopOpacity={0} />
                <stop offset="72%" stopColor="#111417" stopOpacity={0.88} />
                <stop offset="100%" stopColor="#111417" stopOpacity={1} />
              </linearGradient>
            </defs>

            <rect
              x="0"
              y={VIEW_TOP}
              width="360"
              height={VIEW_HEIGHT}
              fill="url(#overlay-glow)"
            />
            <path d={WORLD_PATH} fill="#1b2127" stroke="#242c34" strokeWidth={0.3} />

            {pops.map((pop, index) => {
              const x = projectX(pop.lon);
              const y = projectY(pop.lat);
              const isBlocked = blockedIds.has(pop.id);

              if (!isBlocked) {
                return (
                  <circle
                    key={pop.id}
                    cx={x}
                    cy={y}
                    r={1.5}
                    fill="#3ec7a8"
                    opacity={0.3}
                  />
                );
              }

              return (
                <g key={pop.id}>
                  {/* Ring and dot share one entrance group: without it the
                      pulse would start before its own location has landed. */}
                  <g
                    style={{
                      transformOrigin: `${x}px ${y}px`,
                      animation: `overlay-dot-in 340ms cubic-bezier(0.2, 1.3, 0.4, 1) ${
                        420 + index * 45
                      }ms both`,
                    }}
                  >
                    {/* Staggered, so the blocked locations read as a wave
                        rather than one synchronised blink. */}
                    <circle
                      cx={x}
                      cy={y}
                      r={3}
                      fill="none"
                      stroke="#e5615e"
                      strokeWidth={0.6}
                      style={{
                        transformOrigin: `${x}px ${y}px`,
                        animation: "pulse-ring 2.8s ease-out infinite",
                        animationDelay: `${800 + (index % 9) * 300}ms`,
                      }}
                    />
                    <circle cx={x} cy={y} r={2.2} fill="#e5615e" />
                    <path
                      d={`M ${x - 1} ${y - 1} L ${x + 1} ${y + 1} M ${x + 1} ${y - 1} L ${x - 1} ${y + 1}`}
                      stroke="#0d0f12"
                      strokeWidth={0.6}
                      strokeLinecap="round"
                    />
                  </g>
                </g>
              );
            })}

            <rect
              x="0"
              y={VIEW_TOP}
              width="360"
              height={VIEW_HEIGHT}
              fill="url(#overlay-fade)"
            />
          </svg>

          <div className="absolute inset-x-0 bottom-0 px-5 pb-4">
            <div className="mb-1.5 flex items-center gap-2">
              <span className="relative grid h-2 w-2 place-items-center">
                <span
                  className="absolute h-2 w-2 rounded-full bg-rose-glow/70"
                  style={{ animation: "pulse-ring 2.4s ease-out infinite" }}
                />
                <span className="h-2 w-2 rounded-full bg-rose-glow" />
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-glow">
                {t("active.title")}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="font-mono text-4xl leading-none font-semibold text-ink-100">
                {blocked.length}
              </span>
              <span className="text-xs text-ink-400">
                {t("active.ofTotal", { total: pops.length, game: gameName })}
              </span>
            </div>
          </div>
        </div>

        <div className="p-5 pt-3">
          <div className="mb-3 max-h-28 overflow-y-auto">
            <div className="flex flex-wrap gap-1">
              {blocked.map((pop) => (
                <span
                  key={pop.id}
                  className="rounded bg-rose-glow/10 px-1.5 py-0.5 text-[11px] text-rose-glow"
                >
                  {pop.name}
                </span>
              ))}
            </div>
          </div>

          {otherGames.length > 0 && (
            <p className="mb-2 text-[11px] leading-relaxed text-ink-400">
              {t("active.otherGames", { games: otherGames.join(", ") })}
            </p>
          )}

          <p className="mb-4 text-[11px] leading-relaxed text-ink-400">
            {t("active.persistHint")}
          </p>

          <div className="flex gap-2">
            <button
              onClick={onUnblock}
              disabled={busy}
              className="flex-1 rounded-lg bg-rose-glow px-3 py-2 text-xs font-semibold text-ink-950 transition-colors hover:bg-rose-glow/90 disabled:opacity-40"
            >
              {busy ? "…" : t("active.unblock")}
            </button>
            <button
              onClick={onDismiss}
              className="flex-1 rounded-lg border border-ink-700 px-3 py-2 text-xs text-ink-300 transition-colors hover:border-ink-600 hover:text-ink-100"
            >
              {t("active.keep")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
