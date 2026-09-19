type Props = {
  visible: boolean;
  /** 0–1; the bar animates towards it and never goes backwards on its own. */
  progress: number;
  label: string;
};

/**
 * The slim progress strip under the header. It covers the short gap when a
 * game switch reloads the relay list and re-measures every ping — the startup
 * splash is too heavy for that, and showing nothing at all just looks broken.
 */
export function LoadingBar({ visible, progress, label }: Props) {
  return (
    <div
      aria-hidden={!visible}
      className={`shrink-0 overflow-hidden border-b border-ink-800 bg-ink-900/60 transition-all duration-300 ${
        visible ? "max-h-10 opacity-100" : "max-h-0 opacity-0"
      }`}
    >
      <div className="flex items-center gap-3 px-5 py-1.5">
        <span className="text-[11px] text-ink-400">{label}</span>
        <div className="relative h-0.5 flex-1 overflow-hidden rounded-full bg-ink-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-deep to-amber-glow transition-[width] duration-500 ease-out"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
          <div
            className="absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-ink-100/20 to-transparent"
            style={{ animation: "shimmer 1.6s ease-in-out infinite" }}
          />
        </div>
      </div>
    </div>
  );
}
