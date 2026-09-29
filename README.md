# AI Outreach

This is a small single-user tool I built to find local businesses with weak websites, audit their site, and draft a personalised outreach email that I review and send myself. Nothing is ever sent automatically.

The old version of this repo is kept under [`legacy/`](./legacy) for reference.

## What it does

1. **Leads come in three ways.** I can paste a website URL, import a CSV (`website`/`url`, `name`, `city`, `country`), or run an auto-search by city and category (for example "plumbers in Lagos"). The auto-search uses OpenStreetMap, which is free and needs no API key, and only returns businesses that list a website.
2. **Audit.** It fetches the homepage, respects `robots.txt` and times out after 12 seconds. It pulls out real signals: missing meta description, no mobile viewport, images without alt text, the detected CMS, contact emails and phones, and social links.
3. **Draft.** It makes one Gemini call per lead, based only on that lead's evidence. If the call fails for any reason, the lead is marked `draft_error` with the real error message. It never falls back to generic text.
4. **Review.** Every draft is editable, shows the evidence behind it, and can be approved or rejected.
5. **Send manually.** An approved draft opens in my own mail app (`mailto:`) or copies to the clipboard. I mark it sent once I've sent it.

It also keeps a permanent record of every business I've drafted, rejected or contacted, keyed by domain. The same business is never drafted twice, even if a later search in another city finds it again. Repeating a search I've already run shows a warning first.

## Running it

I intend to host this as a web service (for example on Render). To run it locally:

```bash
npm install
cp .env.example .env   # fill in the values below
npm run dev            # http://localhost:3000
```

It needs Node.js 22.5 or newer.

| Variable | What it is |
|---|---|
| `SUPABASE_URL` | URL of the Supabase project (the same one the portfolio uses) |
| `SUPABASE_ANON_KEY` | That project's public anon/publishable key. Never the service-role key. |
| `GEMINI_API_KEY` | A Gemini API key, free from https://aistudio.google.com/apikey |
| `GEMINI_MODEL` | The model used for drafts. Check https://ai.google.dev/gemini-api/docs/models, because model names change. |
| `SENDER_BUSINESS_NAME`, `SENDER_ADDRESS` | My business name and mailing address, for the footer on every email |
| `OSM_CONTACT_EMAIL` | A real contact email, required by OpenStreetMap's usage policy |
| `PORT` | Defaults to 3000. Render sets it automatically. |

Before first use, apply [`supabase/migration.sql`](./supabase/migration.sql) and then [`supabase/002_require_server_key.sql`](./supabase/002_require_server_key.sql) to the Supabase project, and store the hash of `AI_OUTREACH_DB_KEY` as described at the top of that file.

### Login and access control

The whole app is behind a password. Set these on the host as well:

| Variable | What it is |
|---|---|
| `APP_PASSWORD` | The login password (at least 12 characters). Without it the app stays locked. |
| `SESSION_SECRET` | At least 32 random characters, used to sign the login cookie. |
| `AI_OUTREACH_DB_KEY` | A long random key the server sends with every database call. |

The database is locked to the server too: every `ai_outreach_*` function checks the `x-ai-outreach-key` header
against a hash stored in `ai_outreach_config` (see [`supabase/002_require_server_key.sql`](./supabase/002_require_server_key.sql)),
so the public anon key on its own can no longer read leads or change the do-not-contact list.

Logins are rate limited (5 failed attempts per address per 15 minutes) and sessions last 12 hours.

## How the data is stored

Everything lives in `ai_outreach_*` tables in my existing Supabase project. Each table has row level security with no policies, so nothing can read or write rows directly. The app only calls a fixed set of `SECURITY DEFINER` functions (`ai_outreach_upsert_business`, `ai_outreach_record_action`, `ai_outreach_add_optout` and others), each of which validates its input and does one thing. The app only ever holds the public anon key.

## Security

Auto-search feeds URLs from OpenStreetMap straight into the crawler, so before every fetch (including `robots.txt` and each redirect) it refuses:

- private, loopback and link-local addresses;
- `localhost`, `.local` and `.internal` hostnames;
- anything that isn't `http` or `https`.

See `server/security.ts` and its tests.

## Compliance

Every drafted email gets a footer with my business name, address and a working opt-out. Anything added to the do-not-contact list (Coverage tab) is checked before drafting, so those businesses are never drafted again. The rules differ by market:

- **US (CAN-SPAM):** requires an opt-out and a physical address. Both are included.
- **UK/EU:** emailing limited companies is generally fine with an opt-out, but sole traders count as individuals and usually need prior consent.
- **Nigeria:** the Nigeria Data Protection Act applies to how contact data is collected and used.

This isn't legal advice. It's what I check before emailing a new market.

## Tests

```bash
npm test
```

There are 31 tests. They cover the full pipeline (crawl, duplicate check, draft, save) against a local test server and an in-memory stand-in for the Supabase functions. They also cover the SSRF guard, CSV parsing, the OpenStreetMap query builder, robots.txt parsing, and the rule that a failed draft never produces fake content.

## Not yet verified against the real services

These parts have only been tested against stand-ins so far. I should check each one once before relying on it:

- `supabase/migration.sql` on the real database (run one lead through and check the rows);
- a real Gemini call and the current model name;
- a real OpenStreetMap search.

## Project layout

```
server/
  index.ts          entry point: loads env, connects to Supabase, starts the server
  httpServer.ts     small router and static file server
  routes.ts         JSON API, including /health
  pipeline.ts       crawl -> duplicate check -> draft -> save, for one lead
  crawler.ts        fetches a homepage (robots.txt, timeout, SSRF guard)
  htmlExtract.ts    pulls audit signals out of the HTML
  security.ts       the SSRF guard
  robots.ts         robots.txt parser
  gemini.ts         one Gemini call per lead, no fake fallback
  compliance.ts     email footer and opt-out checks
  overpass.ts       OpenStreetMap auto-search
  supabaseClient.ts Supabase RPC client (anon key only)
  store.ts          all data access, only through .rpc() calls
  csv.ts            CSV parser
  types.ts          shared types
public/             the frontend (plain HTML, JS and CSS, no build step)
supabase/           migration.sql: tables, row level security, RPC functions
test/               the test suite and its in-memory Supabase stand-in
legacy/             the old version of the project
```
