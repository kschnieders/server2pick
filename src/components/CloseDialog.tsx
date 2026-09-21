import { useT } from "../i18n";

type Props = {
  /** Total rules across every game, not just the one on screen. */
  count: number;
  /** Games holding rules, as "name (count)". */
  games: string[];
  /** Removing rules touches the firewall, which needs elevation. */
  elevated: boolean;
  busy: boolean;
  onKeep: () => void;
  onRemove: () => void;
  onCancel: () => void;
};

/**
 * Asked when the window is closed while rules are live.
 *
 * The rules sit in the Windows firewall, not in this process — closing the app
 * leaves them blocking. That is usually what people want and the reason the
 * tool works at all, but it is the one thing nobody expects, so it gets said
 * out loud once rather than discovered later.
 */
export function CloseDialog({
  count,
  games,
  elevated,
  busy,
  onKeep,
  onRemove,
  onCancel,
}: Props) {
  const t = useT();

  return (
    <div
      className="absolute inset-0 z-[60] grid place-items-center bg-ink-950/80 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-[28rem] max-w-[90vw] rounded-xl border border-ink-800 bg-ink-900 p-5 shadow-2xl shadow-black/60"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-2 text-sm font-semibold">{t("close.title")}</h2>

        <p className="mb-2 text-xs leading-relaxed text-ink-300">
          {t("close.body", { count })}
        </p>
        <p className="mb-4 text-[11px] leading-relaxed text-ink-400">
          {games.join(", ")}
        </p>

        <div className="flex flex-col gap-2">
          <button
            onClick={onKeep}
            disabled={busy}
            className="rounded-lg bg-amber-glow px-3 py-2 text-xs font-semibold text-ink-950 transition-colors hover:bg-amber-glow/90 disabled:opacity-40"
          >
            {t("close.keep")}
          </button>

          <button
            onClick={onRemove}
            disabled={busy || !elevated}
            title={elevated ? undefined : t("close.needsAdmin")}
            className="rounded-lg border border-ink-700 px-3 py-2 text-xs text-ink-300 transition-colors hover:border-rose-glow/60 hover:text-rose-glow disabled:opacity-40 disabled:hover:border-ink-700 disabled:hover:text-ink-300"
          >
            {busy ? "…" : t("close.remove")}
          </button>

          {!elevated && (
            <p className="text-[11px] leading-relaxed text-amber-glow">
              {t("close.needsAdmin")}
            </p>
          )}

          <button
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg px-3 py-2 text-xs text-ink-400 transition-colors hover:text-ink-100 disabled:opacity-40"
          >
            {t("close.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
