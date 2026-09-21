import { useEffect, useState } from "react";
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import type { CloseAction, Settings } from "../api";
import { LANGUAGES, languageName, useT, type TranslationKey } from "../i18n";
import { BACKDROP_IN, CARD_IN } from "../lib/overlay-animation";

type Props = {
  settings: Settings;
  /** `null` while the language follows the system. */
  language: string;
  onSettings: (patch: Partial<Settings>) => void;
  onLanguage: (code: string | null) => void;
  onClose: () => void;
};

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <div className="text-xs text-ink-100">{label}</div>
        {hint && (
          <div className="mt-0.5 text-[11px] leading-relaxed text-ink-400">
            {hint}
          </div>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({
  on,
  onChange,
  disabled,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative h-5 w-9 rounded-full transition-colors disabled:opacity-40 ${
        on ? "bg-teal-glow/70" : "bg-ink-700"
      }`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-ink-100 transition-[left] ${
          on ? "left-[1.125rem]" : "left-0.5"
        }`}
      />
    </button>
  );
}

const SELECT =
  "rounded-md border border-ink-700 bg-ink-950 px-2 py-1 text-xs text-ink-100 outline-none focus:border-amber-glow/60";

/** Grouped so each tab answers one question: who am I, what do I see, what does
 *  it do. The dialog keeps one height across tabs so switching never jumps. */
const TABS = ["general", "appearance", "behaviour"] as const;
type Tab = (typeof TABS)[number];

export function SettingsDialog({
  settings,
  language,
  onSettings,
  onLanguage,
  onClose,
}: Props) {
  const t = useT();
  const [tab, setTab] = useState<Tab>("general");

  /**
   * Autostart lives in the Windows registry, not in our settings file — the
   * plugin is the only honest source. Mirroring it into settings.json would let
   * the two drift apart the moment someone removes the entry by hand.
   */
  const [autostart, setAutostart] = useState<boolean | null>(null);

  useEffect(() => {
    isEnabled()
      .then(setAutostart)
      .catch(() => setAutostart(null));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const toggleAutostart = async (next: boolean) => {
    try {
      await (next ? enable() : disable());
      setAutostart(next);
    } catch {
      // Refused by the registry — re-read rather than claim a state we failed
      // to set.
      isEnabled()
        .then(setAutostart)
        .catch(() => setAutostart(null));
    }
  };

  return (
    <div
      className="absolute inset-0 z-50 grid place-items-center bg-ink-950/80 backdrop-blur-sm"
      style={BACKDROP_IN}
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-[30rem] max-w-[92vw] overflow-y-auto rounded-xl border border-ink-800 bg-ink-900 p-5 shadow-2xl shadow-black/60"
        style={CARD_IN}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">{t("prefs.title")}</h2>
          <button
            onClick={onClose}
            className="rounded-md px-1.5 text-ink-600 transition-colors hover:text-ink-100"
          >
            ✕
          </button>
        </header>

        <nav className="mb-1 flex gap-1 border-b border-ink-800">
          {TABS.map((name) => (
            <button
              key={name}
              onClick={() => setTab(name)}
              className={`-mb-px border-b-2 px-2.5 py-1.5 text-xs transition-colors ${
                tab === name
                  ? "border-amber-glow text-ink-100"
                  : "border-transparent text-ink-400 hover:text-ink-100"
              }`}
            >
              {t(`prefs.tab.${name}` as TranslationKey)}
            </button>
          ))}
        </nav>

        {/* One shared minimum height, so switching tabs never resizes the
            dialog under the pointer. */}
        <div className="min-h-[15rem]">
        <section
          hidden={tab !== "general"}
          className="divide-y divide-ink-800"
        >
          <Row label={t("settings.language")}>
            <select
              value={settings.language ?? ""}
              onChange={(e) => onLanguage(e.target.value || null)}
              className={SELECT}
            >
              <option value="">
                {t("settings.languageAuto")} ({languageName(language)})
              </option>
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {languageName(lang.code)}
                </option>
              ))}
            </select>
          </Row>

          <Row label={t("prefs.autostart")} hint={t("prefs.autostartHint")}>
            <Toggle
              on={autostart === true}
              disabled={autostart === null}
              onChange={toggleAutostart}
            />
          </Row>

          <Row label={t("prefs.updates")} hint={t("prefs.updatesHint")}>
            <Toggle
              on={settings.checkUpdates}
              onChange={(next) => onSettings({ checkUpdates: next })}
            />
          </Row>
        </section>

        <section
          hidden={tab !== "appearance"}
          className="divide-y divide-ink-800"
        >
          <Row label={t("prefs.map")} hint={t("prefs.mapHint")}>
            <Toggle
              on={settings.showMap}
              onChange={(next) => onSettings({ showMap: next })}
            />
          </Row>

          <Row label={t("prefs.overlay")} hint={t("prefs.overlayHint")}>
            <Toggle
              on={settings.showActiveOverlay}
              onChange={(next) => onSettings({ showActiveOverlay: next })}
            />
          </Row>
        </section>

        <section
          hidden={tab !== "behaviour"}
          className="divide-y divide-ink-800"
        >
          <Row label={t("prefs.closeAction")} hint={t("prefs.closeActionHint")}>
            <select
              value={settings.closeAction}
              onChange={(e) =>
                onSettings({ closeAction: e.target.value as CloseAction })
              }
              className={SELECT}
            >
              <option value="ask">{t("prefs.close.ask")}</option>
              <option value="keep">{t("prefs.close.keep")}</option>
              <option value="remove">{t("prefs.close.remove")}</option>
            </select>
          </Row>

          <Row label={t("settings.pingInterval")} hint={t("prefs.pingHint")}>
            <select
              value={settings.pingIntervalMs}
              onChange={(e) =>
                onSettings({ pingIntervalMs: Number(e.target.value) })
              }
              className={SELECT}
            >
              <option value={2000}>2 s</option>
              <option value={4000}>4 s</option>
              <option value={8000}>8 s</option>
              <option value={15000}>15 s</option>
            </select>
          </Row>

          <Row
            label={t("settings.scopeToGame")}
            hint={t("settings.scopeToGameHint")}
          >
            <Toggle
              on={settings.scopeToGame}
              onChange={(next) => onSettings({ scopeToGame: next })}
            />
          </Row>

          {!settings.scopeToGame && (
            <p className="mt-3 rounded-lg bg-amber-glow/10 p-2 text-[11px] leading-relaxed text-amber-glow">
              {t("settings.scopeWarning")}
            </p>
          )}
        </section>
        </div>
      </div>
    </div>
  );
}
