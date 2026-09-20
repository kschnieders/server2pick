import { EMPTY_GAME_SETTINGS, type GameSettings, type Preset, type Settings } from "../api";

/**
 * Encodes and decodes the shareable part of a configuration.
 *
 * Only the server selection travels: blocklists and profiles, per game. Paths
 * to executables, the chosen language and the ping interval stay local —
 * they describe the machine, not the setup someone wants to hand a friend.
 *
 * The payload is a flat delimited string rather than JSON, then deflated: POP
 * ids are three or four characters, so JSON's quotes and commas cost more than
 * the data itself, and the same ids repeat across every profile. Together that
 * turns a two-game setup from ~890 characters into ~195 — short enough to paste
 * into a chat message without it wrapping into a wall of text.
 *
 * `S2P1-` codes from earlier versions still import; only writing changed.
 */

const PREFIX = "S2P2-";
const LEGACY_PREFIX = "S2P1-";

/**
 * Structure: `game~blocked~name:blocked~name:blocked|nextGame~…`, ids joined by
 * dots. Ids are always `[a-z0-9]`, so only the user-chosen profile names can
 * collide with a delimiter and need escaping.
 */
const DELIMITERS = /[%~|:.]/g;
const ESCAPED = /%(25|7E|7C|3A|2E)/g;

const escapeName = (name: string) =>
  name.replace(DELIMITERS, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());

const unescapeName = (name: string) =>
  name.replace(ESCAPED, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));

const joinIds = (ids: string[]) => ids.join(".");
const splitIds = (text: string) => text.split(".").filter(Boolean);

function bytesToBase64Url(bytes: Uint8Array): string {
  // The code travels through chat clients, so it avoids `+`, `/` and `=`.
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(code: string): Uint8Array {
  const padded = code.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

/** Raw deflate — no zlib or gzip header, since both sides know the format. */
async function deflate(text: string): Promise<Uint8Array> {
  const stream = new Blob([new TextEncoder().encode(text)])
    .stream()
    .pipeThrough(new CompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function inflate(bytes: Uint8Array): Promise<string> {
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
  return await new Response(stream).text();
}

type Shareable = Record<string, { blocked: string[]; presets: Preset[] }>;

function shareableFrom(
  settings: Settings,
  current?: { game: string; blocked: string[] },
): Shareable {
  const games: Shareable = {};

  for (const [id, entry] of Object.entries(settings.games)) {
    games[id] = { blocked: entry.lastBlocked, presets: entry.presets };
  }

  if (current) {
    games[current.game] = {
      presets: games[current.game]?.presets ?? [],
      blocked: current.blocked,
    };
  }

  return games;
}

/** Builds the code for everything the settings currently hold. */
export async function encodeShare(
  settings: Settings,
  /** The open game's live selection, which may not be saved yet. */
  current?: { game: string; blocked: string[] },
): Promise<string> {
  const body = Object.entries(shareableFrom(settings, current))
    .map(([id, entry]) => {
      const segments = [id, joinIds(entry.blocked)];
      for (const preset of entry.presets) {
        segments.push(escapeName(preset.name) + ":" + joinIds(preset.blocked));
      }
      return segments.join("~");
    })
    .join("|");

  return PREFIX + bytesToBase64Url(await deflate(body));
}

export type DecodedShare = Record<string, { blocked: string[]; presets: Preset[] }>;

function parseBody(body: string): DecodedShare | null {
  const out: DecodedShare = {};

  for (const chunk of body.split("|")) {
    const [id, blocked = "", ...presets] = chunk.split("~");
    if (!id) continue;

    out[id] = {
      blocked: splitIds(blocked),
      presets: presets.flatMap((segment) => {
        const at = segment.indexOf(":");
        if (at < 1) return [];
        return [
          {
            name: unescapeName(segment.slice(0, at)),
            blocked: splitIds(segment.slice(at + 1)),
          },
        ];
      }),
    };
  }

  return Object.keys(out).length > 0 ? out : null;
}

/** Reads the `S2P1-` JSON payload that versions before this one produced. */
function parseLegacy(json: string): DecodedShare | null {
  const parsed = JSON.parse(json);
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
}

/** Returns `null` for anything that is not one of our codes. */
export async function decodeShare(code: string): Promise<DecodedShare | null> {
  const trimmed = code.trim();

  try {
    if (trimmed.startsWith(PREFIX)) {
      return parseBody(await inflate(base64UrlToBytes(trimmed.slice(PREFIX.length))));
    }
    if (trimmed.startsWith(LEGACY_PREFIX)) {
      const bytes = base64UrlToBytes(trimmed.slice(LEGACY_PREFIX.length));
      return parseLegacy(new TextDecoder().decode(bytes));
    }
  } catch {
    return null;
  }

  return null;
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
