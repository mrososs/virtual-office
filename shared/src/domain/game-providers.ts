import type { GameRoomMode, GameType } from '../types/game.types.js';

/**
 * An external browser game the Game Room can send people to. This catalog is
 * code-reviewed configuration: the only hosts a room link may ever point to,
 * and the only pages the office opens. Players never supply a provider.
 */
export interface GameProvider {
  id: string;
  name: string;
  gameType: GameType;
  roomMode: GameRoomMode;
  /** Where the host creates a room — for ROOM_CODE providers, the page both players play on. */
  startUrl: string;
  /** Exact hostnames a room link may use (lowercase, default HTTPS port only, no subdomains unless listed). */
  allowedHosts: readonly string[];
  /** Room links: the pathname they must match. */
  invitePath?: RegExp;
  /** Room links: query parameters kept (with their allowed values); every other parameter is dropped. */
  allowedQuery?: Readonly<Record<string, RegExp>>;
  /** ROOM_CODE: what a room code looks like (after trimming and upper-casing). */
  roomCode?: RegExp;
  /** Short steps for the host, shown in the station panel. */
  hostSteps: readonly string[];
  /** One line for players: account needs, ads, network caveats. */
  note: string;
}

export const GAME_PROVIDER = {
  lichess: 'lichess',
  papergamesTicTacToe: 'papergames-tictactoe',
  papergamesConnectFour: 'papergames-connect4',
  pixoplaysPong: 'pixoplays-pong',
} as const;

const PAPERGAMES_ROOM = /^\/[a-z]{2}(?:-[a-z]{2})?\/r\/[A-Za-z0-9]{6,20}(?:\/[0-9]{1,8})?$/i;
const PAPERGAMES_STEPS = [
  'Open papergames.io and choose “Play with a friend”.',
  'Pick a guest name, then copy the link under “Share this link with a friend”.',
  'Paste it here and press Start waiting.',
] as const;

/**
 * Verified September 2026 with two isolated browser sessions (no accounts) —
 * see docs/GAME_ROOM.md for what was checked for each provider.
 */
export const GAME_PROVIDERS: Readonly<Record<string, GameProvider>> = {
  [GAME_PROVIDER.lichess]: {
    id: GAME_PROVIDER.lichess,
    name: 'Lichess',
    gameType: 'CHESS',
    roomMode: 'API_CREATED_ROOM',
    startUrl: 'https://lichess.org/',
    allowedHosts: ['lichess.org'],
    invitePath: /^\/[A-Za-z0-9]{8}$/,
    allowedQuery: { color: /^(?:white|black)$/ },
    hostSteps: ['The office creates a private Lichess game for you.', 'Open it, then wait here for your opponent — Lichess starts the game when they arrive.'],
    note: 'No account needed · ad-free · casual 10+5 game.',
  },
  [GAME_PROVIDER.papergamesTicTacToe]: {
    id: GAME_PROVIDER.papergamesTicTacToe,
    name: 'papergames.io',
    gameType: 'TIC_TAC_TOE',
    roomMode: 'MANUAL_INVITE_LINK',
    startUrl: 'https://papergames.io/en/tic-tac-toe',
    allowedHosts: ['papergames.io'],
    invitePath: PAPERGAMES_ROOM,
    hostSteps: PAPERGAMES_STEPS,
    note: 'Guest name, no account · the site shows ads around the board.',
  },
  [GAME_PROVIDER.papergamesConnectFour]: {
    id: GAME_PROVIDER.papergamesConnectFour,
    name: 'papergames.io',
    gameType: 'CONNECT_FOUR',
    roomMode: 'MANUAL_INVITE_LINK',
    startUrl: 'https://papergames.io/en/connect4',
    allowedHosts: ['papergames.io'],
    invitePath: PAPERGAMES_ROOM,
    hostSteps: PAPERGAMES_STEPS,
    note: 'Guest name, no account · the site shows ads around the board.',
  },
  [GAME_PROVIDER.pixoplaysPong]: {
    id: GAME_PROVIDER.pixoplaysPong,
    name: 'PixoPlays Pong',
    gameType: 'PONG',
    roomMode: 'ROOM_CODE',
    startUrl: 'https://pixoplays.com/pong/',
    allowedHosts: ['pixoplays.com'],
    roomCode: /^[A-Z0-9]{6}$/,
    hostSteps: ['Open PixoPlays Pong and choose Multiplayer → Host game.', 'Copy the 6-character room code it shows.', 'Paste it here — your opponent types it under Multiplayer → Join game.'],
    note: 'Guest mode, no account · peer-to-peer, so very locked-down networks may block it.',
  },
};

export function findGameProvider(providerId: unknown): GameProvider | undefined {
  return typeof providerId === 'string' ? GAME_PROVIDERS[providerId] : undefined;
}

export type ExternalInviteCheck =
  | { ok: true; url: string; code: string | null }
  | { ok: false; reason: string };

const MAX_INVITE_LENGTH = 512;
const IPV4 = /^\d{1,3}(?:\.\d{1,3}){3}$/;

/**
 * Checks what a host pasted (or what a provider API returned) against the
 * provider's rules and returns the one normalized form the office will
 * store and open. Uses the platform URL parser, never a URL regex:
 * HTTPS only · no credentials · default port · exact allowlisted hostname
 * (no IPs, no localhost, no look-alike subdomains) · allowed path ·
 * only allowlisted query parameters survive · the fragment is dropped.
 * ROOM_CODE providers take a code instead of a link and always open their
 * fixed start page.
 */
export function checkExternalInvite(provider: GameProvider, input: unknown): ExternalInviteCheck {
  if (typeof input !== 'string') return { ok: false, reason: 'Paste the invite link.' };
  const value = input.trim();
  if (!value) return { ok: false, reason: provider.roomMode === 'ROOM_CODE' ? 'Paste the room code.' : 'Paste the invite link.' };
  if (value.length > MAX_INVITE_LENGTH) return { ok: false, reason: 'That is too long to be an invite.' };

  if (provider.roomMode === 'ROOM_CODE') {
    const code = value.toUpperCase();
    return provider.roomCode?.test(code) ? { ok: true, url: provider.startUrl, code } : { ok: false, reason: `That doesn't look like a ${provider.name} room code.` };
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, reason: 'That is not a link. Copy the whole invite link.' };
  }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:') return { ok: false, reason: 'Only secure https:// links are allowed.' };
  if (url.username || url.password) return { ok: false, reason: 'Links with a username or password are not allowed.' };
  if (url.port) return { ok: false, reason: 'Links with a custom port are not allowed.' };
  if (host === 'localhost' || IPV4.test(host) || host.includes(':') || host.startsWith('[')) return { ok: false, reason: 'Links to an IP address or this computer are not allowed.' };
  if (!provider.allowedHosts.includes(host)) return { ok: false, reason: `Only ${provider.allowedHosts.join(', ')} links work at this table.` };
  if (!provider.invitePath?.test(url.pathname)) return { ok: false, reason: `That is not a ${provider.name} room link.` };

  const kept = new URLSearchParams();
  for (const [key, pattern] of Object.entries(provider.allowedQuery ?? {})) {
    const param = url.searchParams.get(key);
    if (param !== null && pattern.test(param)) kept.set(key, param);
  }
  const query = kept.toString();
  return { ok: true, url: `https://${host}${url.pathname}${query ? `?${query}` : ''}`, code: null };
}
