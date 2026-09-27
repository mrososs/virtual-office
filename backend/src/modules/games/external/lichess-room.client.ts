import { Injectable, Logger } from '@nestjs/common';
import { GAME_PROVIDER } from '@virtual-office/shared';

import { SocketRateLimiter } from '../socket-rate-limiter';
import { ExternalGameUrlValidator } from './external-game-url.validator';

const OPEN_CHALLENGE_URL = 'https://lichess.org/api/challenge/open';
const REQUEST_TIMEOUT_MS = 6000;
/** A table unused for an hour is cleaned up anyway; the Lichess challenge expires with it. */
const CHALLENGE_LIFETIME_MS = 60 * 60_000;

export interface ExternalRoomLinks {
  hostUrl: string;
  guestUrl: string;
}

export class ExternalRoomUnavailableError extends Error {}

/**
 * Creates private Lichess games through the documented, unauthenticated
 * "open challenge" endpoint (POST /api/challenge/open): anyone with the link
 * can join, the first two to arrive play. The host gets the white-seat link,
 * the opponent the black-seat link. No token or employee data is sent — only
 * game settings. Creation is rate limited so the office never floods Lichess.
 */
@Injectable()
export class LichessRoomClient {
  private readonly logger = new Logger(LichessRoomClient.name);
  private readonly limiter = new SocketRateLimiter(6, 0.1);

  constructor(private readonly validator: ExternalGameUrlValidator) {}

  async createRoom(): Promise<ExternalRoomLinks> {
    if (!this.limiter.allow('lichess')) throw new ExternalRoomUnavailableError('Too many new games right now. Try again in a minute.');
    const body = new URLSearchParams({
      rated: 'false',
      'clock.limit': '600',
      'clock.increment': '5',
      name: 'iSaned Game Room',
      expiresAt: String(Date.now() + CHALLENGE_LIFETIME_MS),
    });
    let response: Response;
    try {
      response = await fetch(OPEN_CHALLENGE_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
        body,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      this.logger.warn(`Lichess unreachable: ${error instanceof Error ? error.message : String(error)}`);
      throw new ExternalRoomUnavailableError('Lichess is not reachable right now. Try again in a minute.');
    }
    if (!response.ok) {
      this.logger.warn(`Lichess refused to create a challenge (HTTP ${response.status})`);
      throw new ExternalRoomUnavailableError(response.status === 429 ? 'Lichess asked us to slow down. Try again in a minute.' : 'Lichess could not create a game right now.');
    }
    const data = (await response.json().catch(() => null)) as { urlWhite?: unknown; urlBlack?: unknown } | null;
    // Even the provider's own answer goes through the allowlist.
    const host = this.validator.validate(GAME_PROVIDER.lichess, data?.urlWhite);
    const guest = this.validator.validate(GAME_PROVIDER.lichess, data?.urlBlack);
    if (!host.ok || !guest.ok) {
      this.logger.warn('Lichess returned links that fail validation');
      throw new ExternalRoomUnavailableError('Lichess returned an unexpected answer.');
    }
    return { hostUrl: host.url, guestUrl: guest.url };
  }
}
