import { useT } from "../i18n";
import type { UpdateState } from "../lib/updater";

type Props = {
  state: UpdateState;
  onInstall: () => void;
};

/**
 * Sits above the status card, and only when there is something to say — an
 * up-to-date app shows nothing at all.
 */
export function UpdateCard({ state, onInstall }: Props) {
  const t = useT();
  if (state.status === "idle") return null;

  const busy = state.status === "downloading" || state.status === "ready";

  return (
    <section className="rounded-xl border border-teal-glow/40 bg-teal-glow/10 p-3">
      <header className="mb-1 flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-glow">
          {t("update.title")}
        </h3>
        <span className="shrink-0 font-mono text-[11px] text-teal-glow">
          {state.version}
        </span>
      </header>

      {state.status === "available" && (
        <>
          <p className="mb-2 text-[11px] leading-relaxed text-ink-300">
            {t("update.available", { version: state.version })}
          </p>
          {state.notes && (
            <p className="mb-2 max-h-24 overflow-y-auto whitespace-pre-line text-[11px] leading-relaxed text-ink-400">
              {state.notes}
            </p>
          )}
          <button
            onClick={onInstall}
            className="w-full rounded-md bg-teal-glow px-3 py-1.5 text-xs font-semibold text-ink-950 transition-colors hover:bg-teal-glow/90"
          >
            {t("update.install")}
          </button>
        </>
      )}

      {busy && (
        <>
          <p className="mb-2 text-[11px] leading-relaxed text-ink-300">
            {t(state.status === "ready" ? "update.restarting" : "update.downloading")}
          </p>
          <div className="h-1 overflow-hidden rounded-full bg-ink-800">
            <div
              className={`h-full bg-teal-glow transition-[width] duration-200 ${
                state.status === "downloading" && state.percent === null
                  ? "w-1/3 animate-pulse"
                  : ""
              }`}
              style={
                state.status === "downloading" && state.percent !== null
                  ? { width: `${state.percent}%` }
                  : state.status === "ready"
                    ? { width: "100%" }
                    : undefined
              }
            />
          </div>
        </>
      )}

      {state.status === "failed" && (
        <>
          <p className="mb-2 text-[11px] leading-relaxed text-amber-glow">
            {t("update.failed")}
          </p>
          <button
            onClick={onInstall}
            className="w-full rounded-md border border-ink-700 px-3 py-1.5 text-xs text-ink-300 transition-colors hover:border-teal-glow/60 hover:text-teal-glow"
          >
            {t("update.retry")}
          </button>
        </>
      )}
    </section>
  );
}
