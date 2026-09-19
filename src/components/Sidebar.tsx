import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import type {
  GameInfo,
  GameSettings,
  Pop,
  Preset,
  Settings,
  SystemState,
} from "../api";
import { useT, type TranslationKey } from "../i18n";

type Props = {
  pops: Pop[];
  blocked: Set<string>;
  sys: SystemState | null;
  game: GameInfo | null;
  gameSettings: GameSettings;
  /** Active rule counts per game id, for the cross-game overview. */
  ruleCounts: Record<string, number>;
  settings: Settings;
  onSettings: (patch: Partial<Settings>) => void;
  onGameSettings: (patch: Partial<GameSettings>) => void;
  onSelect: (blocked: Set<string>) => void;
  onElevate: () => void;
  onClearAll: () => void;
};

function Card({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-ink-800 bg-ink-900/60 p-3">
      <header className="mb-2.5 flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
          {title}
        </h3>
        {action}
      </header>
      {children}
    </section>
  );
}

function StatusLine({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "ok" | "warn" | "bad" | "muted";
}) {
  const color = {
    ok: "text-teal-glow",
    warn: "text-amber-glow",
    bad: "text-rose-glow",
    muted: "text-ink-400",
  }[tone];

  return (
    <div className="flex items-center justify-between gap-2 py-1 text-xs">
      <span className="text-ink-400">{label}</span>
      <span className={`truncate text-right font-medium ${color}`} title={value}>
        {value}
      </span>
    </div>
  );
}

export function Sidebar({
  pops,
  blocked,
  sys,
  game,
  gameSettings,
  ruleCounts,
  settings,
  onSettings,
  onGameSettings,
  onSelect,
  onElevate,
  onClearAll,
}: Props) {
  const t = useT();
  const [presetName, setPresetName] = useState("");

  const isManualPath = Boolean(gameSettings.gamePath?.trim());
  const exeName = game?.path?.split(/[\\/]/).pop()?.toLowerCase();
  const wrongExeName = Boolean(
    game && exeName && !game.exeNames.some((n) => n.toLowerCase() === exeName),
  );

  const otherGames = (sys?.games ?? []).filter(
    (g) => g.id !== game?.id && (ruleCounts[g.id] ?? 0) > 0,
  );

  const pickExecutable = async () => {
    const picked = await open({
      multiple: false,
      directory: false,
      title: t("settings.chooseDialog", { game: game?.name ?? "" }),
      defaultPath: game?.path ?? undefined,
      filters: [{ name: t("settings.programFilter"), extensions: ["exe"] }],
    });
    if (typeof picked === "string") onGameSettings({ gamePath: picked });
  };

  const savePreset = () => {
    const name = presetName.trim();
    if (!name) return;
    const preset: Preset = { name, blocked: [...blocked] };
    // Saving under an existing name overwrites it — that is the expected
    // behaviour for "update my EU profile".
    const presets = [
      ...gameSettings.presets.filter((p) => p.name !== name),
      preset,
    ].sort((a, b) => a.name.localeCompare(b.name));
    onGameSettings({ presets });
    setPresetName("");
  };

  const deletePreset = (name: string) =>
    onGameSettings({
      presets: gameSettings.presets.filter((p) => p.name !== name),
    });

  const allowAll = () => onSelect(new Set());
  const invert = () =>
    onSelect(new Set(pops.filter((p) => !blocked.has(p.id)).map((p) => p.id)));
  const onlyRegion = (region: string) =>
    onSelect(new Set(pops.filter((p) => p.region !== region).map((p) => p.id)));

  const regions = [...new Set(pops.map((p) => p.region))];

  return (
    <div className="flex flex-col gap-3">
      <Card
        title={t("sidebar.status")}
        action={
          sys && !sys.elevated ? (
            <button
              onClick={onElevate}
              className="shrink-0 rounded-md bg-amber-glow/15 px-2 py-0.5 text-[11px] font-medium text-amber-glow transition-colors hover:bg-amber-glow/25"
            >
              {t("sidebar.elevate")}
            </button>
          ) : null
        }
      >
        <StatusLine
          label={t("sidebar.rights")}
          value={t(
            sys?.elevated ? "sidebar.rights.admin" : "sidebar.rights.limited",
          )}
          tone={sys?.elevated ? "ok" : "warn"}
        />
        {/* A fixed label: game names like "Counter-Strike 2" squeeze the value
            out of the row. */}
        <StatusLine
          label={t("sidebar.installation")}
          value={t(game?.installed ? "sidebar.found" : "sidebar.notFound")}
          tone={game?.installed ? "ok" : "warn"}
        />
        <StatusLine
          label={t("sidebar.gameRunning")}
          value={t(game?.running ? "sidebar.yes" : "sidebar.no")}
          tone={game?.running ? "warn" : "muted"}
        />
        <StatusLine
          label={t("sidebar.rulesActive")}
          value={`${game ? (ruleCounts[game.id] ?? 0) : 0}`}
          tone={game && (ruleCounts[game.id] ?? 0) > 0 ? "bad" : "muted"}
        />

        {!sys?.elevated && (
          <p className="mt-2 rounded-lg bg-ink-850 p-2 text-[11px] leading-relaxed text-ink-400">
            {t("sidebar.elevationHint")}
          </p>
        )}

        {otherGames.length > 0 && (
          <div className="mt-2 rounded-lg bg-ink-850 p-2">
            <p className="text-[11px] text-ink-400">
              {t("sidebar.alsoBlocked", {
                games: otherGames
                  .map((g) => `${g.name} (${ruleCounts[g.id]})`)
                  .join(", "),
              })}
            </p>
            <button
              onClick={onClearAll}
              className="mt-1.5 text-[11px] text-ink-400 underline-offset-2 transition-colors hover:text-rose-glow hover:underline"
            >
              {t("sidebar.clearAll")}
            </button>
          </div>
        )}
      </Card>

      <Card title={t("quick.title")}>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={allowAll}
            className="rounded-md border border-ink-700 px-2 py-1 text-[11px] text-ink-300 transition-colors hover:border-teal-glow/60 hover:text-teal-glow"
          >
            {t("quick.allowAll")}
          </button>
          <button
            onClick={invert}
            className="rounded-md border border-ink-700 px-2 py-1 text-[11px] text-ink-300 transition-colors hover:border-amber-glow/60 hover:text-amber-glow"
          >
            {t("quick.invert")}
          </button>
          {regions.map((region) => (
            <button
              key={region}
              onClick={() => onlyRegion(region)}
              className="rounded-md border border-ink-700 px-2 py-1 text-[11px] text-ink-300 transition-colors hover:border-amber-glow/60 hover:text-amber-glow"
            >
              {t("quick.onlyRegion", {
                region: t(`region.${region}` as TranslationKey),
              })}
            </button>
          ))}
        </div>
      </Card>

      <Card title={t("presets.title", { game: game?.name ?? "" })}>
        {gameSettings.presets.length === 0 ? (
          <p className="text-[11px] text-ink-600">
            {t("presets.empty")}
          </p>
        ) : (
          <ul className="mb-2 flex flex-col gap-1">
            {gameSettings.presets.map((preset) => (
              <li key={preset.name} className="flex items-center gap-1">
                <button
                  onClick={() => onSelect(new Set(preset.blocked))}
                  className="min-w-0 flex-1 truncate rounded-md bg-ink-850 px-2 py-1.5 text-left text-xs text-ink-100 transition-colors hover:bg-ink-800"
                >
                  {preset.name}
                  <span className="ml-1.5 text-[10px] text-ink-600">
                    {t("presets.activeCount", {
                      count: pops.length - preset.blocked.length,
                    })}
                  </span>
                </button>
                <button
                  onClick={() => deletePreset(preset.name)}
                  title={t("presets.delete")}
                  className="rounded-md px-1.5 py-1.5 text-ink-600 transition-colors hover:text-rose-glow"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-1">
          <input
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && savePreset()}
            placeholder={t("presets.namePlaceholder")}
            className="min-w-0 flex-1 rounded-md border border-ink-700 bg-ink-950 px-2 py-1.5 text-xs text-ink-100 outline-none transition-colors placeholder:text-ink-600 focus:border-amber-glow/60"
          />
          <button
            onClick={savePreset}
            disabled={!presetName.trim()}
            className="rounded-md bg-ink-700 px-2.5 py-1.5 text-xs text-ink-100 transition-colors hover:bg-ink-600 disabled:opacity-40"
          >
            {t("presets.save")}
          </button>
        </div>
      </Card>

      <Card title={t("settings.title")}>
        <label className="flex cursor-pointer items-start gap-2 py-1">
          <input
            type="checkbox"
            checked={settings.scopeToGame}
            onChange={(e) => onSettings({ scopeToGame: e.target.checked })}
            className="mt-0.5 accent-amber-glow"
          />
          <span className="text-xs leading-snug">
            {t("settings.scopeToGame")}
            <span className="block text-[11px] text-ink-400">
              {t("settings.scopeToGameHint")}
            </span>
          </span>
        </label>

        {!settings.scopeToGame && (
          <p className="mt-1 rounded-lg bg-amber-glow/10 p-2 text-[11px] leading-relaxed text-amber-glow">
            {t("settings.scopeWarning")}
          </p>
        )}

        <label className="mt-2 flex items-center justify-between gap-2 text-xs">
          <span className="text-ink-400">{t("settings.pingInterval")}</span>
          <select
            value={settings.pingIntervalMs}
            onChange={(e) => onSettings({ pingIntervalMs: Number(e.target.value) })}
            className="rounded-md border border-ink-700 bg-ink-950 px-1.5 py-1 text-xs text-ink-100 outline-none focus:border-amber-glow/60"
          >
            <option value={2000}>2 s</option>
            <option value={4000}>4 s</option>
            <option value={8000}>8 s</option>
            <option value={15000}>15 s</option>
          </select>
        </label>

        <div className="mt-3 border-t border-ink-800 pt-2.5">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="text-xs text-ink-400">
              {t("settings.program")}
              <span className="ml-1 text-[10px] text-ink-600">
                {t(isManualPath ? "settings.manual" : "settings.auto")}
              </span>
            </span>
            <div className="flex shrink-0 gap-1">
              <button
                onClick={pickExecutable}
                className="rounded-md border border-ink-700 px-1.5 py-0.5 text-[11px] text-ink-300 transition-colors hover:border-amber-glow/60 hover:text-amber-glow"
              >
                {t("settings.choose")}
              </button>
              {isManualPath && (
                <button
                  onClick={() => onGameSettings({ gamePath: null })}
                  title={t("settings.resetToAutoHint")}
                  className="rounded-md border border-ink-700 px-1.5 py-0.5 text-[11px] text-ink-300 transition-colors hover:border-ink-600 hover:text-ink-100"
                >
                  {t("settings.resetToAuto")}
                </button>
              )}
            </div>
          </div>

          <p
            className="truncate font-mono text-[10px] text-ink-600"
            title={game?.path ?? undefined}
          >
            {game?.path ?? t("settings.noPath")}
          </p>

          {wrongExeName && (
            <p className="mt-1 text-[11px] text-amber-glow">
              {t("settings.wrongExe", { game: game?.name ?? "" })}
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
