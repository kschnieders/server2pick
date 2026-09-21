import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as api from "./api";
import {
  DEFAULT_SETTINGS,
  EMPTY_GAME_SETTINGS,
  type GameSettings,
  type Pop,
  type RuleBinding,
  type Settings,
  type SystemState,
} from "./api";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ActiveRulesOverlay } from "./components/ActiveRulesOverlay";
import { CloseDialog } from "./components/CloseDialog";
import { GamePicker } from "./components/GamePicker";
import { LoadingBar } from "./components/LoadingBar";
import { ServerList } from "./components/ServerList";
import { Sidebar } from "./components/Sidebar";
import { SettingsDialog } from "./components/SettingsDialog";
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

/** A header action that carries no label — the name lives in the tooltip. */
function IconButton({
  onClick,
  label,
  active,
  children,
}: {
  onClick: () => void;
  label: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`rounded-lg p-1.5 transition-colors ${
        active ? "text-ink-300 hover:text-ink-100" : "text-ink-600 hover:text-ink-100"
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
        {children}
      </svg>
    </button>
  );
}

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
  const [splashTimedOut, setSplashTimedOut] = useState(false);
  /** Flips once the first load is through; from then on a game switch gets the
   *  slim bar instead of the full splash. */
  const [initialDone, setInitialDone] = useState(false);

  /** Shown when live rules could catch someone off guard; see the component. */
  const [rulesOverlayOpen, setRulesOverlayOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  /** Set while the window close is held back waiting for an answer. */
  const [closeAsked, setCloseAsked] = useState(false);

  const { state: updateState, install: installUpdate } = useUpdater(settings.checkUpdates);

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

  /** Every game holding rules right now, as "name (count)". */
  const gamesWithRules = useMemo(
    () =>
      (sys?.games ?? [])
        .filter((g) => (ruleCounts[g.id] ?? 0) > 0)
        .map((g) => `${g.name} (${ruleCounts[g.id]})`),
    [sys, ruleCounts],
  );

  const totalRules = useMemo(() => (sys?.rules ?? []).length, [sys]);

  /**
   * Timestamp of this game's last rule write. It is what tells the binding
   * check that a rewrite happened: rewriting the same locations against a new
   * path leaves the blocked set — and its size — untouched, so without this the
   * check never re-runs and the warning it raised can never be cleared.
   */
  const appliedAt = gameId ? (sys?.appliedAt?.[gameId] ?? null) : null;

  // Reading the firewall's application filter costs seconds, so it happens only
  // when something could have changed the answer: another game, another
  // executable, a change of scope, or a fresh write.
  const [binding, setBinding] = useState<RuleBinding | null>(null);
  useEffect(() => {
    if (!gameId || appliedBlocked.size === 0) {
      setBinding(null);
      return;
    }
    let cancelled = false;
    api
      .ruleBinding(gameId)
      .then((found) => {
        if (!cancelled) setBinding(found);
      })
      .catch(() => {
        // Unreadable is not the same as wrong — stay quiet rather than cry wolf.
        if (!cancelled) setBinding(null);
      });
    return () => {
      cancelled = true;
    };
  }, [gameId, game?.path, settings.scopeToGame, appliedBlocked.size, appliedAt]);

  const dirty = useMemo(() => {
    // Rules pointing at the wrong executable differ from the desired state just
    // as much as a changed selection does — and flagging it here is what makes
    // "Apply" clickable, so rewriting them against the new path is possible at
    // all. Without this the app would report the problem and offer no way out.
    if (binding?.stale) return true;
    if (blocked.size !== appliedBlocked.size) return true;
    for (const id of blocked) if (!appliedBlocked.has(id)) return true;
    return false;
  }, [blocked, appliedBlocked, binding]);

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
    // Worse than a stale session: those rules block nothing at all, while the
    // rule count and the status lines keep insisting they do.
    if (binding?.stale) {
      list.push({
        text: t("warn.staleBinding", { game: game?.name ?? "" }),
        bad: true,
      });
    }
    if (effect === "stale") {
      list.push({ text: t("warn.staleRules", { game: game?.name ?? "" }) });
    }
    if (pops.length > 0 && allowedCount < MIN_SAFE_ALLOWED) {
      list.push({
        text: t("warn.tooFew", {
          count: allowedCount,
          total: pops.length,
          min: MIN_SAFE_ALLOWED,
        }),
      });
    }
    return list;
  }, [loadError, effect, binding, game, pops.length, allowedCount, t]);

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

  /**
   * The overlay opens at the two moments live rules can catch someone out: the
   * app opening, and switching to a game that already holds rules. Deliberately
   * not after applying — the notice confirms that already, and re-opening would
   * nag through every round of tweaking.
   */
  const overlayShownFor = useRef<string | null>(null);
  useEffect(() => {
    if (!initialDone || !gameId) return;
    if (overlayShownFor.current === gameId) return;
    if (appliedBlocked.size === 0) return;
    overlayShownFor.current = gameId;
    if (!settings.showActiveOverlay) return;
    setRulesOverlayOpen(true);
  }, [initialDone, gameId, appliedBlocked.size]);

  // The rules live in the Windows firewall, not in this process, so closing the
  // window leaves them blocking. Holding the close back is the only moment that
  // fact can still be acted on.
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    getCurrentWindow()
      .onCloseRequested((event) => {
        if (totalRules === 0) return;
        // A standing answer skips the question; "keep" is simply letting the
        // close through, which is what would happen without this hook at all.
        if (settings.closeAction === "keep") return;
        event.preventDefault();
        if (settings.closeAction === "remove") {
          void closeRemovingRules();
          return;
        }
        setCloseAsked(true);
      })
      .then((fn) => {
        if (cancelled) fn();
        else unlisten = fn;
      })
      .catch(() => {
        // Without the hook the window simply closes as it always did.
      });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [totalRules, settings.closeAction]);

  const closeKeepingRules = () => {
    setCloseAsked(false);
    getCurrentWindow().destroy();
  };

  const closeRemovingRules = async () => {
    setBusy(true);
    try {
      await api.clearBlocks(undefined);
      await getCurrentWindow().destroy();
    } catch (e) {
      // Clearing needs elevation; a refusal must not close the window, or the
      // rules would survive under the impression that they were removed.
      setNotice({ text: translateError(t, e), tone: "bad" });
      setCloseAsked(false);
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

          {/* Map, settings and share are quiet icons: they open or toggle a
              view and never change the firewall, so they stay out of the way of
              the two buttons that do. The active map state is carried by colour
              rather than a second icon, so the row never shifts. */}
          <IconButton onClick={() => setPrefsOpen(true)} label={t("prefs.title")}>
            <path
              fill="currentColor"
              d="M12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Zm7.43-2.53c.04-.32.07-.64.07-.97s-.03-.65-.07-.97l2.11-1.63a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.61-.22l-2.49 1a7.3 7.3 0 0 0-1.69-.98l-.38-2.65A.49.49 0 0 0 14 2h-4a.49.49 0 0 0-.49.42l-.38 2.65c-.61.25-1.17.58-1.69.98l-2.49-1a.5.5 0 0 0-.61.22l-2 3.46a.5.5 0 0 0 .12.64l2.11 1.63c-.04.32-.07.65-.07.97s.03.65.07.97L2.46 14.6a.5.5 0 0 0-.12.64l2 3.46c.14.24.44.33.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.04.24.25.42.49.42h4c.24 0 .45-.18.49-.42l.38-2.65c.61-.25 1.17-.58 1.69-.98l2.49 1c.17.11.47.02.61-.22l2-3.46a.5.5 0 0 0-.12-.64l-2.11-1.63Z"
            />
          </IconButton>

          <IconButton
            onClick={() => setShareOpen(true)}
            label={t("share.button")}
          >
            {/* Drawn as three nodes rather than one filled path: at 18px the
                circles of the usual glyph shrink until it reads as a bare "<". */}
            <g
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
            >
              <path d="M8.4 10.9 15.6 6.6M8.4 13.1l7.2 4.3" />
            </g>
            <g fill="currentColor">
              <circle cx="18" cy="5" r="2.7" />
              <circle cx="6" cy="12" r="2.7" />
              <circle cx="18" cy="19" r="2.7" />
            </g>
          </IconButton>

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
            {settings.showMap && (
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

        {rulesOverlayOpen && !showPicker && game && (
          <ActiveRulesOverlay
            gameName={game.name}
            pops={pops}
            blockedIds={appliedBlocked}
            otherGames={gamesWithRules.filter((g) => !g.startsWith(game.name))}
            busy={busy}
            onUnblock={async () => {
              await clear("game");
              setRulesOverlayOpen(false);
            }}
            onDismiss={() => setRulesOverlayOpen(false)}
          />
        )}

        {prefsOpen && (
          <SettingsDialog
            settings={settings}
            language={language}
            onSettings={patchSettings}
            onLanguage={(code) => patchSettings({ language: code })}
            onClose={() => setPrefsOpen(false)}
          />
        )}

        {closeAsked && (
          <CloseDialog
            count={totalRules}
            games={gamesWithRules}
            elevated={sys?.elevated ?? false}
            busy={busy}
            onKeep={closeKeepingRules}
            onRemove={closeRemovingRules}
            onCancel={() => setCloseAsked(false)}
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
