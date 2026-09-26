import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes, timingSafeEqual } from 'node:crypto';
import { AppConfig } from '../../config/configuration';

const SEAL_VERSION = 'v1';

/**
 * AES-256-GCM "sealed box": confidentiality + integrity in one opaque string
 * (`v1.<iv>.<tag>.<ciphertext>`, base64url). `open` returns null for anything
 * tampered with, truncated, or sealed under another key.
 */
class SealedBox {
  constructor(private readonly key: Buffer) {}

  seal(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    return [SEAL_VERSION, iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), ciphertext.toString('base64url')].join('.');
  }

  open(sealed: string): string | null {
    const [version, iv, tag, ciphertext] = sealed.split('.');
    if (version !== SEAL_VERSION || !iv || !tag || ciphertext === undefined) return null;
    try {
      const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(iv, 'base64url'));
      decipher.setAuthTag(Buffer.from(tag, 'base64url'));
      return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64url')), decipher.final()]).toString('utf8');
    } catch {
      return null;
    }
  }
}

/**
 * The backend's only crypto surface:
 *  - session tokens: random, stored only as an HMAC (SESSION_SECRET-derived key)
 *  - sign-in flow cookie: sealed (SESSION_SECRET-derived key), never readable by the browser
 *  - realtime tickets: HMAC-signed (SESSION_SECRET-derived key), single use, 60 seconds
 *  - provider tokens at rest: sealed with TOKEN_ENCRYPTION_KEY
 *
 * Production refuses to boot without both secrets (env.validation.ts). In
 * development they fall back to per-process random keys: sessions and stored
 * Microsoft tokens then simply stop working after a restart.
 */
@Injectable()
export class CryptoService {
  private readonly logger = new Logger(CryptoService.name);
  private readonly sessionHmacKey: Buffer;
  private readonly ticketHmacKey: Buffer;
  private readonly flowBox: SealedBox;
  private readonly tokenBox: SealedBox;

  constructor(configService: ConfigService) {
    const { session, tokenEncryptionKey } = configService.get<AppConfig>('app')!;

    const sessionSecret = session.secret ? Buffer.from(session.secret, 'utf8') : this.ephemeral('SESSION_SECRET');
    this.sessionHmacKey = Buffer.from(hkdfSync('sha256', sessionSecret, Buffer.alloc(0), 'vo/session-token-hash', 32));
    this.ticketHmacKey = Buffer.from(hkdfSync('sha256', sessionSecret, Buffer.alloc(0), 'vo/realtime-ticket', 32));
    this.flowBox = new SealedBox(Buffer.from(hkdfSync('sha256', sessionSecret, Buffer.alloc(0), 'vo/sign-in-flow', 32)));

    const tokenKey = tokenEncryptionKey ? Buffer.from(tokenEncryptionKey, 'base64') : this.ephemeral('TOKEN_ENCRYPTION_KEY');
    this.tokenBox = new SealedBox(tokenKey);
  }

  /** URL-safe random secret, e.g. a session token or OAuth state. */
  randomToken(bytes = 32): string {
    return randomBytes(bytes).toString('base64url');
  }

  /** What the database stores for a session token (keyed, so a leaked table cannot be brute-forced offline). */
  hashSessionToken(token: string): string {
    return createHmac('sha256', this.sessionHmacKey).update(token, 'utf8').digest('base64url');
  }

  /** Signature of a realtime ticket payload (its own derived key, so it can never pass as a session hash). */
  signRealtimeTicket(payload: string): string {
    return createHmac('sha256', this.ticketHmacKey).update(payload, 'utf8').digest('base64url');
  }

  safeEqual(a: string, b: string): boolean {
    const left = Buffer.from(a, 'utf8');
    const right = Buffer.from(b, 'utf8');
    return left.length === right.length && timingSafeEqual(left, right);
  }

  sealFlowState(plaintext: string): string {
    return this.flowBox.seal(plaintext);
  }

  openFlowState(sealed: string): string | null {
    return this.flowBox.open(sealed);
  }

  sealProviderToken(plaintext: string): string {
    return this.tokenBox.seal(plaintext);
  }

  openProviderToken(sealed: string): string | null {
    return this.tokenBox.open(sealed);
  }

  private ephemeral(name: string): Buffer {
    this.logger.warn(`${name} is not set — using a random per-process key (development only; nothing encrypted with it survives a restart).`);
    return randomBytes(32);
  }
}
