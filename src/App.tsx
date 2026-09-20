import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as api from "./api";
import {
  DEFAULT_SETTINGS,
  EMPTY_GAME_SETTINGS,
  type GameSettings,
  type Pop,
  type Settings,
  type SystemState,
} from "./api";
import { GamePicker } from "./components/GamePicker";
import { LoadingBar } from "./components/LoadingBar";
import { ServerList } from "./components/ServerList";
import { Sidebar } from "./components/Sidebar";
import { ShareDialog } from "./components/ShareDialog";
import { UpdateCard } from "./components/UpdateCard";
import { Splash } from "./components/Splash";
import { WorldMap } from "./components/WorldMap";
import {
  I18nProvider,
  detectLanguage,
  makeTranslate,
  translateError,
} from "./i18n";
import { pushRound, statsFor, type History } from "./lib/ping-stats";
import { ruleEffect } from "./lib/rule-effect";
import { applyShare, decodeShare, encodeShare } from "./lib/share-code";
import { useUpdater } from "./lib/updater";

/** Steam Datagram Relay reroutes around blocked POPs. Leaving too few open is
 *  what turns "pick my region" into endless match-confirmation timeouts. */
const MIN_SAFE_ALLOWED = 3;

export default function App() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [sys, setSys] = useState<SystemState | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);

  const [gameId, setGameId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  // Building a code deflates it, which is async — so it lands in state rather
  // than being computed while rendering the dialog.
  const [shareCode, setShareCode] = useState<string | null>(null);

  const [pops, setPops] = useState<Pop[]>([]);
  const [revision, setRevision] = useState<number | null>(null);
  const [blocked, setBlocked] = useState<Set<string>>(new Set());

  // Keyed by POP id, so it survives a game switch — the locations that two
  // games share keep their measurements instead of starting from scratch.
  const [history, setHistory] = useState<History>({});
  /** The game whose locations have had at least one ping round. */
  const [pingedGame, setPingedGame] = useState<string | null>(null);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    text: string;
    tone?: "ok" | "warn" | "bad";
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [mapVisible, setMapVisible] = useState(true);
  const [splashTimedOut, setSplashTimedOut] = useState(false);
  /** Flips once the first load is through; from then on a game switch gets the
   *  slim bar instead of the full splash. */
  const [initialDone, setInitialDone] = useState(false);

  const { state: updateState, install: installUpdate } = useUpdater();

  const language = settings.language ?? detectLanguage();
  const t = useMemo(() => makeTranslate(language), [language]);

  const game = useMemo(
    () => sys?.games.find((g) => g.id === gameId) ?? null,
    [sys, gameId],
  );

  const gameSettings: GameSettings = gameId
    ? (settings.games[gameId] ?? EMPTY_GAME_SETTINGS)
    : EMPTY_GAME_SETTINGS;

  const ruleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const rule of sys?.rules ?? []) {
      counts[rule.game] = (counts[rule.game] ?? 0) + 1;
    }
    return counts;
  }, [sys]);

  const appliedBlocked = useMemo(
    () =>
      new Set(
        (sys?.rules ?? []).filter((r) => r.game === gameId).map((r) => r.pop),
      ),
    [sys, gameId],
  );

  const dirty = useMemo(() => {
    if (blocked.size !== appliedBlocked.size) return true;
    for (const id of blocked) if (!appliedBlocked.has(id)) return true;
    return false;
  }, [blocked, appliedBlocked]);

  const allowedCount = pops.length - blocked.size;

  /** Whether the rules reach the session that is running right now. */
  const effect = useMemo(
    () => ruleEffect(game, sys, appliedBlocked.size),
    [game, sys, appliedBlocked],
  );

  /** Everything worth a permanent bar under the header, worst first. Stacked
   *  rather than one slot, so a failed load cannot hide a stale ruleset. */
  const warnings = useMemo(() => {
    const list: { text: string; bad?: boolean }[] = [];

    if (loadError) {
      list.push({
        text: t("warn.loadFailed", { error: translateError(t, loadError) }),
        bad: true,
      });
    }
    if (effect === "stale") {
      list.push({ text: t("warn.staleRules", { game: game?.name ?? "" }) });
    }
    if (pops.length > 0 && allowedCount < MIN_SAFE_ALLOWED) {
      list.push({
        text: t("warn.tooFew", { count: allowedCount, min: MIN_SAFE_ALLOWED }),
      });
    }
    return list;
  }, [loadError, effect, game, pops.length, allowedCount, t]);

  const refreshSystem = useCallback(async () => {
    try {
      const state = await api.systemState();
      setSys(state);
      return state;
    } catch {
      setSys(null);
      return null;
    }
  }, []);

  // Bootstrap: settings plus the current firewall and install state.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [loaded, state] = await Promise.all([
        api.loadSettings().catch(() => DEFAULT_SETTINGS),
        refreshSystem(),
      ]);
      if (cancelled) return;

      setSettings(loaded);
      // Only reopen a game that still exists in the registry.
      const remembered = loaded.lastGame;
      if (remembered && state?.games.some((g) => g.id === remembered)) {
        setGameId(remembered);
      }
      setBootstrapped(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshSystem]);

  // Load the relay list whenever the selected game changes.
  //
  // Keyed on the app id rather than the `game` object: every status poll
  // rebuilds that object, so depending on it re-ran this effect every 20
  // seconds — clearing the list, flashing the loading bar and re-fetching from
  // Valve for no reason.
  const appid = game?.appid ?? null;
  useEffect(() => {
    if (appid === null) return;
    let cancelled = false;

    setPops([]);
    setLoadError(null);

    (async () => {
      try {
        const config = await api.fetchPops(appid);
        if (cancelled) return;
        setPops(config.pops);
        setRevision(config.revision);
      } catch (e) {
        if (!cancelled) setLoadError(String(e));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [appid]);

  // Adopt the selection the firewall already holds for this game; the stored
  // list only fills in when no rules of ours exist yet.
  useEffect(() => {
    if (!gameId || !sys) return;
    const live = sys.rules.filter((r) => r.game === gameId).map((r) => r.pop);
    const stored = settings.games[gameId]?.lastBlocked ?? [];
    setBlocked(new Set(live.length > 0 ? live : stored));
    // Deliberately keyed on the game alone: later polls must not overwrite an
    // unapplied selection the user is in the middle of making.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  // Live ping loop. Chained timeouts rather than an interval, so a slow round
  // can never stack up behind the next one.
  const pingTimer = useRef<number | null>(null);
  useEffect(() => {
    if (pops.length === 0 || !gameId) return;
    let cancelled = false;

    const forGame = gameId;
    const targets = pops.map((p) => ({ pop: p.id, ips: p.ips }));

    const tick = async () => {
      try {
        const results = await api.pingRound(targets);
        if (!cancelled) {
          setHistory((h) => pushRound(h, results));
          setPingedGame(forGame);
        }
      } catch {
        // A failed round is not worth surfacing; the next one will tell.
      }
      if (!cancelled) {
        pingTimer.current = window.setTimeout(tick, settings.pingIntervalMs);
      }
    };

    tick();
    return () => {
      cancelled = true;
      if (pingTimer.current) window.clearTimeout(pingTimer.current);
    };
  }, [pops, gameId, settings.pingIntervalMs]);

  // Keep install state, "game running" and the rule list honest. Each poll
  // spawns PowerShell and tasklist, so it stays deliberately lazy — this may
  // well be running next to a match.
  useEffect(() => {
    const id = window.setInterval(refreshSystem, 20000);
    return () => window.clearInterval(id);
  }, [refreshSystem]);

  useEffect(() => {
    const id = window.setTimeout(() => setSplashTimedOut(true), 9000);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(id);
  }, [notice]);

  // Rebuilt while the dialog is open so the code keeps matching what is on
  // screen; a round that is overtaken by the next one drops its result.
  useEffect(() => {
    if (!shareOpen) {
      setShareCode(null);
      return;
    }
    let cancelled = false;
    encodeShare(
      settings,
      gameId ? { game: gameId, blocked: [...blocked] } : undefined,
    ).then((code) => {
      if (!cancelled) setShareCode(code);
    });
    return () => {
      cancelled = true;
    };
  }, [shareOpen, settings, gameId, blocked]);

  const persist = useCallback(
    (next: Settings, refresh = false) => {
      setSettings(next);
      api
        .saveSettings(next)
        .then(() => {
          if (refresh) refreshSystem();
        })
        .catch(() => undefined);
    },
    [refreshSystem],
  );

  const patchSettings = useCallback(
    (patch: Partial<Settings>) => persist({ ...settings, ...patch }),
    [settings, persist],
  );

  const patchGameSettings = useCallback(
    (patch: Partial<GameSettings>) => {
      if (!gameId) return;
      const next: Settings = {
        ...settings,
        games: {
          ...settings.games,
          [gameId]: { ...gameSettings, ...patch },
        },
      };
      // A changed executable has to be re-resolved rather than waited out.
      persist(next, "gamePath" in patch);
    },
    [gameId, gameSettings, settings, persist],
  );

  const pickGame = useCallback(
    (id: string) => {
      setGameId(id);
      setPickerOpen(false);
      persist({ ...settings, lastGame: id });
    },
    [settings, persist],
  );

  /** Takes a friend's code: server selection and profiles only. */
  const importShare = useCallback(
    async (code: string) => {
      const decoded = await decodeShare(code);
      if (!decoded) return false;

      persist(applyShare(settings, decoded));
      // The open game's list is on screen right now, so it updates immediately;
      // the firewall stays untouched until the user applies.
      if (gameId && decoded[gameId]) {
        setBlocked(new Set(decoded[gameId].blocked));
      }
      return true;
    },
    [gameId, settings, persist],
  );

  const toggle = useCallback((id: string) => {
    setBlocked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const setRegion = useCallback(
    (region: string, block: boolean) => {
      setBlocked((prev) => {
        const next = new Set(prev);
        for (const pop of pops) {
          if (pop.region !== region) continue;
          block ? next.add(pop.id) : next.delete(pop.id);
        }
        return next;
      });
    },
    [pops],
  );

  const apply = async () => {
    if (!gameId) return;
    setBusy(true);
    try {
      const rules = pops
        .filter((p) => blocked.has(p.id))
        .map((p) => ({ pop: p.id, ips: p.ips }));
      await api.applyBlocks(gameId, rules);
      // The fresh state decides the wording: rules written while the game is up
      // do not reach it, and saying so now is the whole point of the check.
      const state = await refreshSystem();
      const stillRunning =
        state?.games.find((g) => g.id === gameId)?.running ?? false;
      const name = game?.name ?? "";

      if (rules.length === 0) {
        setNotice({ text: t("notice.cleared", { game: name }) });
      } else if (stillRunning) {
        setNotice({
          text: t("notice.blockedRunning", { count: rules.length, game: name }),
          tone: "warn",
        });
      } else {
        setNotice({ text: t("notice.blocked", { count: rules.length, game: name }) });
      }
    } catch (e) {
      setNotice({ text: translateError(t, e), tone: "bad" });
    } finally {
      setBusy(false);
    }
  };

  const clear = async (scope: "game" | "all") => {
    setBusy(true);
    try {
      await api.clearBlocks(scope === "game" ? (gameId ?? undefined) : undefined);
      // Either scope clears the game that is currently open.
      setBlocked(new Set());
      await refreshSystem();
      setNotice({
        text:
          scope === "all"
            ? t("notice.allRulesCleared")
            : t("notice.rulesCleared", { game: game?.name ?? "" }),
      });
    } catch (e) {
      setNotice({ text: translateError(t, e), tone: "bad" });
    } finally {
      setBusy(false);
    }
  };

  const elevate = async () => {
    try {
      await api.elevate();
    } catch (e) {
      setNotice({ text: translateError(t, e), tone: "bad" });
    }
  };

  const best = useMemo(() => {
    let winner: { name: string; ms: number } | null = null;
    for (const pop of pops) {
      if (blocked.has(pop.id)) continue;
      const ms = statsFor(history[pop.id])?.best;
      if (ms == null) continue;
      if (!winner || ms < winner.ms) winner = { name: pop.name, ms };
    }
    return winner;
  }, [pops, blocked, history]);

  const showPicker = bootstrapped && (!gameId || pickerOpen);
  const pingedCurrent = pingedGame === gameId;
  /** Relay list or first ping round still outstanding for this game. */
  const switching = Boolean(gameId) && (pops.length === 0 || !pingedCurrent);
  // The list re-sorts itself by latency, so showing it before the first ping
  // round lands would mean watching every row jump into place.
  const ready = !switching || splashTimedOut || loadError !== null;
  const phase: 0 | 1 | 2 | 3 = !bootstrapped
    ? 0
    : pops.length === 0
      ? 1
      : pingedCurrent
        ? 3
        : 2;

  useEffect(() => {
    if (bootstrapped && ready) setInitialDone(true);
  }, [bootstrapped, ready]);

  return (
    <I18nProvider language={language}>
      <div className="relative flex h-full flex-col bg-ink-950">
        <header className="flex shrink-0 items-center gap-3 border-b border-ink-800 bg-ink-900/80 px-5 py-3">
          <button
            onClick={() => setPickerOpen(true)}
            title={t("header.switchGame")}
            className="flex items-center gap-2.5 rounded-lg px-2 py-1 transition-colors hover:bg-ink-850"
          >
            <span className="text-left">
              <span className="flex items-center gap-1.5 text-sm font-semibold leading-tight">
                {game?.name ?? t("app.name")}
                <span className="text-[10px] text-ink-600">▼</span>
              </span>
              <span className="block text-[11px] leading-tight text-ink-400">
                {pops.length > 0
                  ? `${t("header.locations", { count: pops.length })}${
                      revision ? ` · ${t("header.revision", { revision })}` : ""
                    }`
                  : t("header.loadingRelays")}
              </span>
            </span>
          </button>

          {best && (
            <div className="rounded-lg border border-ink-800 bg-ink-950 px-2.5 py-1">
              <div className="text-[10px] uppercase tracking-wider text-ink-600">
                {t("header.bestActive")}
              </div>
              <div className="text-xs">
                <span className="text-ink-100">{best.name}</span>
                <span className="ml-1.5 font-mono text-teal-glow">
                  {Math.round(best.ms)} ms
                </span>
              </div>
            </div>
          )}

          <div className="flex-1" />

          {notice && (
            <div
              className={`max-w-sm truncate rounded-lg px-3 py-1.5 text-xs ${
                notice.tone === "bad"
                  ? "bg-rose-glow/15 text-rose-glow"
                  : notice.tone === "warn"
                    ? "bg-amber-glow/15 text-amber-glow"
                    : "bg-teal-glow/15 text-teal-glow"
              }`}
              title={notice.text}
            >
              {notice.text}
            </div>
          )}

          <button
            onClick={() => setShareOpen(true)}
            className="rounded-lg border border-ink-700 px-3 py-1.5 text-xs text-ink-300 transition-colors hover:border-amber-glow/60 hover:text-amber-glow"
          >
            {t("share.button")}
          </button>

          <button
            onClick={() => setMapVisible((v) => !v)}
            title={mapVisible ? t("header.mapHide") : t("header.mapShow")}
            className="rounded-lg border border-ink-700 px-3 py-1.5 text-xs text-ink-300 transition-colors hover:border-ink-600 hover:text-ink-100"
          >
            {t("header.map")}
          </button>

          <button
            onClick={() => clear("game")}
            disabled={busy || (appliedBlocked.size === 0 && blocked.size === 0)}
            className="rounded-lg border border-ink-700 px-3 py-1.5 text-xs text-ink-300 transition-colors hover:border-ink-600 hover:text-ink-100 disabled:opacity-40"
          >
            {t("header.unblock")}
          </button>

          <button
            onClick={apply}
            disabled={busy || !dirty}
            className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-all disabled:opacity-40 ${
              dirty
                ? "bg-amber-glow text-ink-950 hover:bg-amber-glow/90"
                : "bg-ink-800 text-ink-400"
            }`}
          >
            {busy ? "…" : dirty ? t("header.apply") : t("header.applied")}
          </button>
        </header>

        <LoadingBar
          visible={initialDone && switching && !showPicker}
          progress={pops.length === 0 ? 0.35 : 0.8}
          label={
            pops.length === 0
              ? t("loading.game", { game: game?.name ?? "" })
              : t("loading.pinging", { game: game?.name ?? "" })
          }
        />

        {warnings.map((warning) => (
          <div
            key={warning.text}
            className={`shrink-0 px-5 py-2 text-xs ${
              warning.bad
                ? "bg-rose-glow/10 text-rose-glow"
                : "bg-amber-glow/10 text-amber-glow"
            }`}
          >
            {warning.text}
          </div>
        ))}

        {/* The explicit row track matters: an implicit `auto` row would be sized
            by the taller column, so neither side would ever scroll — both would
            just get clipped at the bottom of the window. */}
        <main className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_300px] grid-rows-[minmax(0,1fr)] gap-4 overflow-hidden p-4">
          <div className="flex min-h-0 flex-col gap-4">
            {/* The map stays put; only the list underneath scrolls. */}
            {mapVisible && (
              <div className="shrink-0 overflow-hidden rounded-xl border border-ink-800">
                <WorldMap
                  pops={pops}
                  blocked={blocked}
                  history={history}
                  onToggle={toggle}
                />
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <ServerList
                pops={pops}
                blocked={blocked}
                appliedBlocked={appliedBlocked}
                history={history}
                onToggle={toggle}
                onSetRegion={setRegion}
              />
            </div>
          </div>

          <div className="flex min-h-0 flex-col gap-3 overflow-y-auto pr-1">
            <UpdateCard state={updateState} onInstall={installUpdate} />
            <Sidebar
              pops={pops}
              blocked={blocked}
              history={history}
              sys={sys}
              game={game}
              effect={effect}
              gameSettings={gameSettings}
              ruleCounts={ruleCounts}
              settings={settings}
              onSettings={patchSettings}
              onGameSettings={patchGameSettings}
              onSelect={setBlocked}
              onElevate={elevate}
              onClearAll={() => clear("all")}
            />
          </div>
        </main>

        {showPicker && (
          <GamePicker
            games={sys?.games ?? []}
            ruleCounts={ruleCounts}
            language={language}
            onLanguage={(code) => patchSettings({ language: code })}
            onPick={pickGame}
            onClose={gameId ? () => setPickerOpen(false) : undefined}
          />
        )}

        {shareOpen && (
          <ShareDialog
            code={shareCode}
            onImport={importShare}
            onClose={() => setShareOpen(false)}
          />
        )}

        <Splash
          visible={!showPicker && !initialDone}
          phase={phase}
          error={loadError ? translateError(t, loadError) : null}
        />
      </div>
    </I18nProvider>
  );
}
