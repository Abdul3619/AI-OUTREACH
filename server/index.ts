import path from 'node:path';
import { App, dirnameOf } from './httpServer.ts';
import { openDb } from './db.ts';
import { Store } from './store.ts';
import { registerRoutes } from './routes.ts';
import { loadSenderProfileFromEnv } from './pipeline.ts';

// Load .env without an extra dependency (dotenv). Simple key=value parser.
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
    // No .env file yet — fine, the user will be told what's missing when
    // they try to draft or search.
  }
}

async function main() {
  await loadEnvFile();

  const here = dirnameOf(import.meta.url);
  const dbFile = process.env.DATABASE_FILE || path.join(here, '..', 'data', 'ai-outreach.sqlite');
  const db = openDb({ file: dbFile });
  const store = new Store(db);

  const app = new App();
  app.serveStatic(path.join(here, '..', 'public'));
  registerRoutes(app, store, { sender: loadSenderProfileFromEnv() });

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => {
    console.log(`AI Outreach running at http://localhost:${port}`);
    console.log(`Database: ${dbFile}`);
    if (!process.env.GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY is not set — leads will crawl fine but drafting will fail with a clear error until you set it in .env.');
    }
  });
}

main().catch((e) => {
  console.error('Fatal startup error:', e);
  process.exit(1);
});
