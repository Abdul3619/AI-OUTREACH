import type { App } from './httpServer.ts';
import { json } from './httpServer.ts';
import type { Auth } from './auth.ts';

export function registerAuthRoutes(app: App, auth: Auth) {
  app.post('/api/login', (req, res, params, body) => {
    if (!auth.configured) return json(res, 503, { error: 'Login is not configured: set APP_PASSWORD on the server.' });
    if (auth.isRateLimited(req)) return json(res, 429, { error: 'Too many attempts. Try again in 15 minutes.' });
    if (!auth.checkPassword(req, body?.password)) return json(res, 401, { error: 'Incorrect password.' });
    res.setHeader('Set-Cookie', auth.sessionCookie());
    json(res, 200, { ok: true });
  });

  app.post('/api/logout', (req, res) => {
    res.setHeader('Set-Cookie', auth.clearCookie());
    json(res, 200, { ok: true });
  });
}
