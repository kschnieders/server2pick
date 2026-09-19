import type { GameInfo, SystemState } from "../api";

/**
 * Whether the rules in the firewall actually reach the session on screen.
 *
 * Windows never tears down connections that already exist: it classifies a
 * flow when the first packet goes out and keeps that verdict. A game that was
 * already running when the rules were written therefore keeps talking to the
 * relay it picked at startup, however complete the blocklist looks. Only a
 * restart of the game puts it under the new rules.
 *
 * That is invisible from the rule count alone, which is why this compares the
 * moment the rules were written against the moment the process started.
 */
export type RuleEffect =
  /** No rules for this game. */
  | "none"
  /** Rules stand, the game is not running — they take hold at the next start. */
  | "idle"
  /** The game started under these rules. */
  | "live"
  /** The game predates the rules; its existing connections are unaffected. */
  | "stale"
  /** One of the two timestamps is missing, so there is nothing honest to say. */
  | "unknown";

export function ruleEffect(
  game: GameInfo | null,
  sys: SystemState | null,
  /** Rules this game currently holds in the firewall. */
  activeRules: number,
): RuleEffect {
  if (!game || activeRules === 0) return "none";
  if (!game.running) return "idle";

  const appliedAt = sys?.appliedAt?.[game.id];
  if (appliedAt == null || game.runningSince == null) return "unknown";

  return game.runningSince >= appliedAt ? "live" : "stale";
}
