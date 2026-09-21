import { invoke } from "@tauri-apps/api/core";

export type Pop = {
  id: string;
  name: string;
  country: string;
  region: string;
  lon: number;
  lat: number;
  ips: string[];
};

export type SdrConfig = {
  revision: number | null;
  pops: Pop[];
};

export type PingResult = {
  pop: string;
  rtt: number | null;
  sent: number;
  received: number;
};

export type GameInfo = {
  id: string;
  name: string;
  short: string;
  appid: number;
  installed: boolean;
  path: string | null;
  running: boolean;
  /** Unix ms the process started; `null` when it is not running or Windows
   *  would not say. */
  runningSince: number | null;
  /** Accepted executable file names for this game. */
  exeNames: string[];
};

export type ActiveRule = {
  game: string;
  pop: string;
};

/**
 * Where a game's rules actually point. The firewall binds each rule to an
 * executable path, and moving the game leaves those rules behind naming the old
 * one — still counted, still reported as live, blocking nothing.
 */
export type RuleBinding = {
  /** Distinct executables the rules name. */
  programs: string[];
  /** Rules that apply machine-wide instead of to one program. */
  unbound: number;
  /** The path the rules ought to carry. */
  expected: string | null;
  /** At least one rule names something else. */
  stale: boolean;
};

export type SystemState = {
  elevated: boolean;
  games: GameInfo[];
  rules: ActiveRule[];
  /** Unix ms of the last rule write, per game id. */
  appliedAt: Record<string, number>;
  error: string | null;
};

export type Preset = {
  name: string;
  blocked: string[];
};

export type GameSettings = {
  gamePath: string | null;
  presets: Preset[];
  lastBlocked: string[];
  /** Unix ms of the last rule write; the backend owns this. */
  appliedAt: number | null;
};

/** What happens to live rules when the window is closed. */
export type CloseAction = "ask" | "keep" | "remove";

export type Settings = {
  /** UI language code; `null` follows the system. */
  language: string | null;
  lastGame: string | null;
  scopeToGame: boolean;
  pingIntervalMs: number;
  /** `ask` every time, or skip the question with a fixed answer. */
  closeAction: CloseAction;
  /** Show the blocks-are-live overlay when the app opens. */
  showActiveOverlay: boolean;
  /** Ask GitHub for a newer release on start. */
  checkUpdates: boolean;
  /** Show the world map above the server list. */
  showMap: boolean;
  games: Record<string, GameSettings>;
};

export const EMPTY_GAME_SETTINGS: GameSettings = {
  gamePath: null,
  presets: [],
  lastBlocked: [],
  appliedAt: null,
};

export const DEFAULT_SETTINGS: Settings = {
  language: null,
  lastGame: null,
  scopeToGame: true,
  pingIntervalMs: 4000,
  closeAction: "ask",
  showActiveOverlay: true,
  checkUpdates: true,
  showMap: true,
  games: {},
};

export const fetchPops = (appid: number) =>
  invoke<SdrConfig>("fetch_pops", { appid });

export const pingRound = (targets: { pop: string; ips: string[] }[]) =>
  invoke<PingResult[]>("ping_round", { targets });

export const systemState = () => invoke<SystemState>("system_state");

/** Slow — reads the firewall's application filter. Call it on demand, not in a
 *  poll: see the note on the Rust side. */
export const ruleBinding = (game: string) =>
  invoke<RuleBinding>("rule_binding", { game });

export const applyBlocks = (game: string, rules: { pop: string; ips: string[] }[]) =>
  invoke<string[]>("apply_blocks", { game, rules });

/** Omit `game` to clear every game's rules at once. */
export const clearBlocks = (game?: string) =>
  invoke<void>("clear_blocks", { game: game ?? null });

export const loadSettings = () => invoke<Settings>("load_settings");

export const saveSettings = (settings: Settings) =>
  invoke<void>("save_settings", { settings });

export const elevate = () => invoke<void>("elevate");
