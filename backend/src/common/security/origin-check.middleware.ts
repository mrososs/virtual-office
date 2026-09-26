import type { NextFunction, Request, Response } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF defense in depth on top of SameSite=Lax session cookies: any
 * state-changing request must come from the app's own origin. Browsers always
 * send `Origin` on cross-origin and same-origin POST/PUT/PATCH/DELETE, so a
 * request without it (or from elsewhere) is not the Virtual Office UI.
 * Azure DevOps Service Hooks authenticate differently and are exempt.
 */
export function originCheckMiddleware(allowedOrigin: string, exemptPrefixes: readonly string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (SAFE_METHODS.has(req.method) || exemptPrefixes.some((prefix) => req.path.startsWith(prefix))) {
      next();
      return;
    }
    const origin = req.headers.origin ?? originOfReferer(req.headers.referer);
    if (origin === allowedOrigin) {
      next();
      return;
    }
    res.status(403).json({ statusCode: 403, message: 'Cross-origin request rejected', path: req.originalUrl });
  };
}

function originOfReferer(referer: string | undefined): string | undefined {
  if (!referer) return undefined;
  try {
    return new URL(referer).origin;
  } catch {
    return undefined;
  }
}
