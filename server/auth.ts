// Password login for the whole app. This is a single-user tool, so there is one password (APP_PASSWORD) and no
// user accounts. A successful login sets a signed, HttpOnly session cookie; every page and API route except the
// login page, the login endpoint and /health requires it.
//
// Fails closed: if APP_PASSWORD is not set, nobody can log in and every protected route answers 503.

import crypto from 'node:crypto';
import type http from 'node:http';

const COOKIE = 'ao_session';
const SESSION_HOURS = 12;
const MAX_FAILURES = 5;
const FAILURE_WINDOW_MS = 15 * 60 * 1000;
export const MIN_PASSWORD_LENGTH = 12;

export interface AuthConfig {
  password?: string;
  // Signs session cookies. Falls back to a random per-process secret (sessions then end on restart).
  sessionSecret?: string;
  // Mark the cookie Secure (on by default; turned off only for local http development and tests).
  secureCookie?: boolean;
}

export class Auth {
  private passwordHash: Buffer | null = null;
  private salt = crypto.randomBytes(16);
  private secret: Buffer;
  private failures = new Map<string, { count: number; resetAt: number }>();
  readonly configured: boolean;
  private secure: boolean;

  constructor(config: AuthConfig) {
    const password = config.password ?? '';
    this.configured = password.length >= MIN_PASSWORD_LENGTH;
    if (this.configured) this.passwordHash = crypto.scryptSync(password, this.salt, 64);
    this.secret = config.sessionSecret && config.sessionSecret.length >= 32 ? Buffer.from(config.sessionSecret) : crypto.randomBytes(32);
    this.secure = config.secureCookie ?? true;
  }

  private ipOf(req: http.IncomingMessage) {
    // Render and most hosts put the client address first in X-Forwarded-For.
    const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    return forwarded || req.socket.remoteAddress || 'unknown';
  }

  isRateLimited(req: http.IncomingMessage) {
    const entry = this.failures.get(this.ipOf(req));
    return !!entry && entry.resetAt > Date.now() && entry.count >= MAX_FAILURES;
  }

  private recordFailure(req: http.IncomingMessage) {
    const ip = this.ipOf(req);
    const now = Date.now();
    const entry = this.failures.get(ip);
    if (!entry || entry.resetAt <= now) this.failures.set(ip, { count: 1, resetAt: now + FAILURE_WINDOW_MS });
    else entry.count += 1;
  }

  checkPassword(req: http.IncomingMessage, candidate: unknown): boolean {
    if (!this.passwordHash || typeof candidate !== 'string' || candidate.length > 1024) {
      this.recordFailure(req);
      return false;
    }
    const actual = crypto.scryptSync(candidate, this.salt, 64);
    const ok = crypto.timingSafeEqual(actual, this.passwordHash);
    if (ok) this.failures.delete(this.ipOf(req));
    else this.recordFailure(req);
    return ok;
  }

  private sign(payload: string) {
    return crypto.createHmac('sha256', this.secret).update(payload).digest('base64url');
  }

  sessionCookie(): string {
    const expires = Date.now() + SESSION_HOURS * 3600 * 1000;
    const payload = `${expires}.${crypto.randomBytes(12).toString('base64url')}`;
    const value = `${payload}.${this.sign(payload)}`;
    return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_HOURS * 3600}${this.secure ? '; Secure' : ''}`;
  }

  clearCookie(): string {
    return `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${this.secure ? '; Secure' : ''}`;
  }

  isAuthenticated(req: http.IncomingMessage): boolean {
    if (!this.configured) return false;
    const cookies = String(req.headers.cookie || '');
    const match = cookies.split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`));
    if (!match) return false;
    const value = match.slice(COOKIE.length + 1);
    const lastDot = value.lastIndexOf('.');
    if (lastDot < 0) return false;
    const payload = value.slice(0, lastDot);
    const signature = value.slice(lastDot + 1);
    const expected = this.sign(payload);
    if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;
    const expires = Number(payload.split('.')[0]);
    return Number.isFinite(expires) && expires > Date.now();
  }
}

// Paths reachable without a session: the login page and what it needs, the login endpoint, and the health check.
const PUBLIC_PATHS = new Set(['/login', '/login.html', '/api/login', '/health', '/style.css', '/favicon.svg', '/apple-touch-icon.png']);

export function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.has(pathname);
}
