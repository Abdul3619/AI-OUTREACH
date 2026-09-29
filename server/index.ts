import path from 'node:path';
import { App, dirnameOf } from './httpServer.ts';
import { createSupabaseRpcClient } from './supabaseClient.ts';
import { Store } from './store.ts';
import { registerRoutes } from './routes.ts';
import { loadSenderProfileFromEnv } from './pipeline.ts';
import { Auth } from './auth.ts';
import { registerAuthRoutes } from './authRoutes.ts';

// Load .env without an extra dependency (dotenv). Simple key=value parser.
// On Render (and most hosts) env vars are injected directly and there is
// no .env file at all — that's fine, this just does nothing in that case.
async function loadEnvFile() {
  try {
    const fs = await import('node:fs');
    const here = dirnameOf(import.meta.url);
    const envPath = path.join(here, '..', '.env');
    const text = fs.readFileSync(envPath, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      let value = trimmed.slice(idx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    // No .env file — fine locally (nothing configured yet) and expected
    // on a host that injects env vars directly (e.g. Render).
  }
}

async function main() {
  await loadEnvFile();

  const here = dirnameOf(import.meta.url);
  const rpcClient = await createSupabaseRpcClient();
  const store = new Store(rpcClient);

  const app = new App();
  const auth = new Auth({
    password: process.env.APP_PASSWORD,
    sessionSecret: process.env.SESSION_SECRET,
    secureCookie: process.env.INSECURE_COOKIES !== 'true',
  });
  if (!auth.configured) console.warn('APP_PASSWORD is not set (or shorter than 12 characters): the app is locked until it is.');
  app.useAuth(auth);
  app.serveStatic(path.join(here, '..', 'public'));
  registerAuthRoutes(app, auth);
  registerRoutes(app, store, { sender: loadSenderProfileFromEnv() });

  // Render (and most PaaS hosts) assign the port at runtime via $PORT and
  // route their health check at /health — both are wired up above.
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => {
    console.log(`AI Outreach running on port ${port}`);
    console.log(`Supabase project: ${process.env.SUPABASE_URL || '(not set)'}`);
    if (!process.env.GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY is not set — leads will crawl fine but drafting will fail with a clear error until you set it.');
    }
  });
}

main().catch((e) => {
  console.error('Fatal startup error:', e);
  process.exit(1);
});
