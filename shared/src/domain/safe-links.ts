/**
 * Allowlist checks for links the office stores and opens on someone's
 * behalf (game rooms, Teams meetings). Always uses the platform URL parser,
 * never a URL regex.
 */
export interface AllowlistedUrlRules {
  /** What the link is, for messages ("Microsoft Teams meeting", "papergames.io room"). */
  label: string;
  /** Exact hostnames (lowercase). No subdomains unless listed. */
  allowedHosts: readonly string[];
  /** The pathname must match one of these. */
  paths: readonly RegExp[];
  /** Query parameters kept (with their allowed values); every other parameter is dropped. */
  allowedQuery?: Readonly<Record<string, RegExp>>;
  /** A friendlier refusal for hosts people often paste by mistake (e.g. mail link wrappers). */
  hostHint?: (host: string) => string | null;
}

export type SafeLinkCheck = { ok: true; url: string } | { ok: false; reason: string };

export const MAX_SAFE_LINK_LENGTH = 512;
const IPV4 = /^\d{1,3}(?:\.\d{1,3}){3}$/;

/**
 * HTTPS only · no username/password · default port · exact allowlisted host
 * (no IP addresses, no localhost, no look-alike subdomains) · allowed path ·
 * only allowlisted query parameters survive · the fragment is dropped.
 * Returns the one normalized form to store and open.
 */
export function checkAllowlistedUrl(rules: AllowlistedUrlRules, input: unknown): SafeLinkCheck {
  if (typeof input !== 'string' || !input.trim()) return { ok: false, reason: 'Paste the link.' };
  const value = input.trim();
  if (value.length > MAX_SAFE_LINK_LENGTH) return { ok: false, reason: 'That link is too long.' };

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, reason: 'That is not a link. Copy the whole link.' };
  }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:') return { ok: false, reason: 'Only secure https:// links are allowed.' };
  if (url.username || url.password) return { ok: false, reason: 'Links with a username or password are not allowed.' };
  if (url.port) return { ok: false, reason: 'Links with a custom port are not allowed.' };
  if (host === 'localhost' || IPV4.test(host) || host.includes(':') || host.startsWith('[')) return { ok: false, reason: 'Links to an IP address or this computer are not allowed.' };
  if (!rules.allowedHosts.includes(host)) {
    return { ok: false, reason: rules.hostHint?.(host) ?? `Only ${rules.allowedHosts.join(', ')} links work here.` };
  }
  if (!rules.paths.some((pattern) => pattern.test(url.pathname))) return { ok: false, reason: `That is not a ${rules.label} link.` };

  const kept = new URLSearchParams();
  for (const [key, pattern] of Object.entries(rules.allowedQuery ?? {})) {
    const param = url.searchParams.get(key);
    if (param !== null && pattern.test(param)) kept.set(key, param);
  }
  const query = kept.toString();
  return { ok: true, url: `https://${host}${url.pathname}${query ? `?${query}` : ''}` };
}
