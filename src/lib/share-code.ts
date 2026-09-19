import { EMPTY_GAME_SETTINGS, type GameSettings, type Preset, type Settings } from "../api";

/**
 * Encodes and decodes the shareable part of a configuration.
 *
 * Only the server selection travels: blocklists and profiles, per game. Paths
 * to executables, the chosen language and the ping interval stay local —
 * they describe the machine, not the setup someone wants to hand a friend.
 */

const PREFIX = "S2P1-";

/** Short field names keep a pasteable code short. */
type Payload = {
  v: 1;
  g: Record<string, { b: string[]; p?: { n: string; b: string[] }[] }>;
};

function toBase64Url(text: string): string {
  // The code travels through chat clients, so it avoids `+`, `/` and `=`.
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(code: string): string {
  const padded = code.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Builds the code for everything the settings currently hold. */
export function encodeShare(
  settings: Settings,
  /** The open game's live selection, which may not be saved yet. */
  current?: { game: string; blocked: string[] },
): string {
  const games: Payload["g"] = {};

  for (const [id, entry] of Object.entries(settings.games)) {
    const presets = entry.presets.map((p) => ({ n: p.name, b: p.blocked }));
    games[id] = {
      b: entry.lastBlocked,
      ...(presets.length > 0 ? { p: presets } : {}),
    };
  }

  if (current) {
    games[current.game] = {
      ...(games[current.game] ?? {}),
      b: current.blocked,
    };
  }

  return PREFIX + toBase64Url(JSON.stringify({ v: 1, g: games } satisfies Payload));
}

export type DecodedShare = Record<string, { blocked: string[]; presets: Preset[] }>;

/** Returns `null` for anything that is not one of our codes. */
export function decodeShare(code: string): DecodedShare | null {
  const trimmed = code.trim();
  if (!trimmed.startsWith(PREFIX)) return null;

  try {
    const parsed = JSON.parse(fromBase64Url(trimmed.slice(PREFIX.length)));
    if (parsed?.v !== 1 || typeof parsed.g !== "object" || parsed.g === null) {
      return null;
    }

    const out: DecodedShare = {};
    for (const [id, entry] of Object.entries<any>(parsed.g)) {
      const blocked = Array.isArray(entry?.b)
        ? entry.b.filter((x: unknown) => typeof x === "string")
        : [];
      const presets: Preset[] = Array.isArray(entry?.p)
        ? entry.p
            .filter((p: any) => typeof p?.n === "string" && Array.isArray(p?.b))
            .map((p: any) => ({
              name: p.n,
              blocked: p.b.filter((x: unknown) => typeof x === "string"),
            }))
        : [];
      out[id] = { blocked, presets };
    }
    return Object.keys(out).length > 0 ? out : null;
  } catch {
    return null;
  }
}

/**
 * Merges a decoded code into the settings, leaving every local-only field
 * alone. Profiles of the same name are replaced, the rest are kept.
 */
export function applyShare(settings: Settings, share: DecodedShare): Settings {
  const games: Record<string, GameSettings> = { ...settings.games };

  for (const [id, incoming] of Object.entries(share)) {
    const existing = games[id] ?? EMPTY_GAME_SETTINGS;
    const names = new Set(incoming.presets.map((p) => p.name));

    games[id] = {
      // Deliberately preserved: where the game lives is this machine's business.
      gamePath: existing.gamePath,
      // A code never touches the firewall, so whatever was written there — and
      // when — stays true.
      appliedAt: existing.appliedAt,
      lastBlocked: incoming.blocked,
      presets: [
        ...existing.presets.filter((p) => !names.has(p.name)),
        ...incoming.presets,
      ].sort((a, b) => a.name.localeCompare(b.name)),
    };
  }

  return { ...settings, games };
}
