import type { GameInfo } from "../api";
import { LANGUAGES, languageName, useT, type TranslationKey } from "../i18n";

type Props = {
  games: GameInfo[];
  /** Active rule counts per game id. */
  ruleCounts: Record<string, number>;
  language: string;
  onLanguage: (code: string) => void;
  onPick: (id: string) => void;
  /** Present once a game is open, so the picker can be dismissed. */
  onClose?: () => void;
};

export function GamePicker({
  games,
  ruleCounts,
  language,
  onLanguage,
  onPick,
  onClose,
}: Props) {
  const t = useT();

  // Installed games first; beyond that keep the curated order.
  const sorted = [...games].sort(
    (a, b) => Number(b.installed) - Number(a.installed),
  );

  return (
    <div className="absolute inset-0 z-40 grid place-items-center bg-ink-950/95 backdrop-blur-sm">
      <div className="w-[30rem] max-w-[90vw]">
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-amber-glow to-amber-deep text-sm font-bold text-ink-950">
            S2P
          </div>
          <h1 className="text-base font-semibold">{t("picker.title")}</h1>
          <p className="mt-1 text-xs text-ink-400">{t("picker.subtitle")}</p>
        </div>

        <ul className="flex flex-col gap-2">
          {sorted.map((game) => {
            const rules = ruleCounts[game.id] ?? 0;
            const note = t(`game.${game.id}.note` as TranslationKey);

            return (
              <li key={game.id}>
                <button
                  onClick={() => onPick(game.id)}
                  className="group flex w-full items-center gap-3 rounded-xl border border-ink-800 bg-ink-900/70 p-3 text-left transition-colors hover:border-amber-glow/50 hover:bg-ink-850"
                >
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xs font-bold ${
                      game.installed
                        ? "bg-gradient-to-br from-amber-glow to-amber-deep text-ink-950"
                        : "bg-ink-800 text-ink-400"
                    }`}
                  >
                    {game.short}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-medium text-ink-100">
                        {game.name}
                      </span>
                      {game.running && (
                        <span className="shrink-0 rounded bg-teal-glow/15 px-1.5 py-px text-[10px] text-teal-glow">
                          {t("picker.running")}
                        </span>
                      )}
                      {rules > 0 && (
                        <span className="shrink-0 rounded bg-rose-glow/15 px-1.5 py-px text-[10px] text-rose-glow">
                          {t("picker.blocked", { count: rules })}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-ink-400">
                      {game.installed
                        ? note || game.path
                        : t("picker.notFound")}
                    </span>
                  </span>

                  <span className="shrink-0 text-ink-600 transition-colors group-hover:text-amber-glow">
                    →
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-4 flex items-center gap-2">
          <label className="flex flex-1 items-center gap-2 text-[11px] text-ink-400">
            {t("picker.language")}
            <select
              value={language}
              onChange={(e) => onLanguage(e.target.value)}
              className="rounded-md border border-ink-800 bg-ink-950 px-1.5 py-1 text-[11px] text-ink-100 outline-none focus:border-amber-glow/60"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {languageName(lang.code)}
                </option>
              ))}
            </select>
          </label>

          {onClose && (
            <button
              onClick={onClose}
              className="rounded-lg border border-ink-800 px-3 py-1.5 text-xs text-ink-400 transition-colors hover:text-ink-100"
            >
              {t("picker.cancel")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
