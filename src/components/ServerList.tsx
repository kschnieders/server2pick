import { useMemo } from "react";
import type { Pop } from "../api";
import { useT, type TranslationKey } from "../i18n";
import {
  QUALITY_COLOR,
  formatMs,
  quality,
  qualityFraction,
  statsFor,
  type History,
  type PopStats,
} from "../lib/ping-stats";

type Props = {
  pops: Pop[];
  blocked: Set<string>;
  appliedBlocked: Set<string>;
  history: History;
  onToggle: (id: string) => void;
  onSetRegion: (region: string, blocked: boolean) => void;
};

function Sparkline({ stats }: { stats: PopStats | null }) {
  if (!stats || stats.samples.length < 2) {
    return <div className="h-5 w-16" />;
  }

  const values = stats.samples;
  const ok = values.filter((v): v is number => v !== null);
  const max = Math.max(...ok, 1);
  const min = Math.min(...ok, 0);
  const span = Math.max(max - min, 1);
  const step = 64 / (values.length - 1);

  // Timeouts break the line instead of being drawn as a fake zero.
  const segments: string[] = [];
  let current: string[] = [];
  values.forEach((v, i) => {
    if (v === null) {
      if (current.length > 1) segments.push(current.join(" "));
      current = [];
      return;
    }
    current.push(`${(i * step).toFixed(1)},${(18 - ((v - min) / span) * 16).toFixed(1)}`);
  });
  if (current.length > 1) segments.push(current.join(" "));

  const color = QUALITY_COLOR[quality(stats.best)];

  return (
    <svg viewBox="0 0 64 20" className="h-5 w-16 overflow-visible">
      {segments.map((points, i) => (
        <polyline
          key={i}
          points={points}
          fill="none"
          stroke={color}
          strokeWidth={1.2}
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={0.9}
        />
      ))}
    </svg>
  );
}

function Toggle({
  on,
  pending,
  onChange,
  title,
}: {
  on: boolean;
  pending: boolean;
  onChange: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onChange}
      title={title}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
        on ? "bg-teal-glow/70" : "bg-ink-600"
      } ${pending ? "ring-2 ring-amber-glow/60 ring-offset-2 ring-offset-ink-900" : ""}`}
    >
      {/* `left-0.5` is load-bearing: a button centres its content, so an
          absolutely positioned knob without an explicit left would start from
          the middle and the transform would push it out of the track. */}
      <span
        className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-ink-100 shadow transition-transform duration-200 ${
          on ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export function ServerList({
  pops,
  blocked,
  appliedBlocked,
  history,
  onToggle,
  onSetRegion,
}: Props) {
  const t = useT();
  const grouped = useMemo(() => {
    const groups = new Map<string, Pop[]>();
    for (const pop of pops) {
      const list = groups.get(pop.region) ?? [];
      list.push(pop);
      groups.set(pop.region, list);
    }
    const best = (pop: Pop) => statsFor(history[pop.id])?.best ?? Infinity;

    for (const list of groups.values()) {
      list.sort((a, b) => best(a) - best(b) || a.name.localeCompare(b.name));
    }

    // Nearest region first — that is the one the user actually cares about.
    return [...groups.entries()].sort(
      ([, a], [, b]) => Math.min(...a.map(best)) - Math.min(...b.map(best)),
    );
  }, [pops, history]);

  return (
    <div className="flex flex-col gap-5">
      {grouped.map(([region, list]) => {
        const allowedCount = list.filter((p) => !blocked.has(p.id)).length;

        return (
          <section key={region}>
            <header className="mb-1.5 flex items-center gap-3 px-1">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
                {t(`region.${region}` as TranslationKey)}
              </h2>
              <span className="text-[11px] text-ink-600">
                {t("list.active", {
                  allowed: allowedCount,
                  total: list.length,
                })}
              </span>
              <div className="h-px flex-1 bg-ink-800" />
              <button
                onClick={() => onSetRegion(region, false)}
                className="text-[11px] text-ink-400 transition-colors hover:text-teal-glow"
              >
                {t("list.allOn")}
              </button>
              <button
                onClick={() => onSetRegion(region, true)}
                className="text-[11px] text-ink-400 transition-colors hover:text-rose-glow"
              >
                {t("list.allOff")}
              </button>
            </header>

            <div className="overflow-hidden rounded-xl border border-ink-800 bg-ink-900/60">
              {list.map((pop, i) => {
                const stats = statsFor(history[pop.id]);
                const isBlocked = blocked.has(pop.id);
                const pending = isBlocked !== appliedBlocked.has(pop.id);
                const color = QUALITY_COLOR[quality(stats?.best)];

                return (
                  <div
                    key={pop.id}
                    className={`flex items-center gap-3 px-3 py-2 transition-colors hover:bg-ink-850 ${
                      i > 0 ? "border-t border-ink-800/70" : ""
                    } ${isBlocked ? "opacity-45" : ""}`}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: color, boxShadow: `0 0 8px ${color}55` }}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="truncate font-medium text-ink-100">
                          {pop.name}
                        </span>
                        <span className="shrink-0 font-mono text-[10px] uppercase text-ink-600">
                          {pop.id}
                        </span>
                      </div>
                      <div className="truncate text-xs text-ink-400">
                        {[pop.country, t("list.relays", { count: pop.ips.length })]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </div>

                    <Sparkline stats={stats} />

                    <div className="w-20 shrink-0 text-right">
                      <div className="font-mono text-sm tabular-nums" style={{ color }}>
                        {formatMs(stats?.best)}
                        <span className="ml-0.5 text-[10px] text-ink-600">ms</span>
                      </div>
                      <div className="font-mono text-[10px] text-ink-600">
                        {stats?.jitter != null ? `±${formatMs(stats.jitter)}` : "—"}
                        {stats && stats.loss > 0 && (
                          <span className="ml-1 text-rose-glow">
                            {Math.round(stats.loss * 100)}%
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="h-7 w-1.5 shrink-0 overflow-hidden rounded-full bg-ink-800">
                      <div
                        className="w-full rounded-full transition-all duration-500"
                        style={{
                          height: `${qualityFraction(stats?.best) * 100}%`,
                          marginTop: `${(1 - qualityFraction(stats?.best)) * 100}%`,
                          background: color,
                        }}
                      />
                    </div>

                    <Toggle
                      on={!isBlocked}
                      pending={pending}
                      title={t(isBlocked ? "list.toggleOff" : "list.toggleOn")}
                      onChange={() => onToggle(pop.id)}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
