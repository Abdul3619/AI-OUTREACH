# AI Outreach (v2)

A small, single-user tool that finds real local businesses, audits their
website, and drafts a personalized outreach email for you to review and
send yourself. Nothing is ever sent automatically. It's meant to be hosted
(Render) so you just open a URL — no terminal, no local install, exactly
like the portfolio and Agbada Luxe sites.

This is a ground-up rewrite of the old `AI-OUTREACH` repo. The old code is
kept for reference under [`legacy/`](./legacy) — see "Why a rewrite?" below.

## What it actually does

1. **Get leads in, three ways** — all three feed the same pipeline
   automatically (crawl → audit → draft), no per-lead manual step:
   - Paste a single website URL.
   - Import a CSV of URLs/business names.
   - **Auto-search**: type a city + category (e.g. "plumbers in Lagos") and
     it searches OpenStreetMap (free, no API key) for matching businesses
     that list a website, and runs every result through the pipeline.
2. **Audit** — fetches the homepage (respecting `robots.txt`, 12s timeout,
   and refusing to fetch anything on a private/internal network — see
   "Security" below) and pulls out real signals: missing meta description,
   missing mobile viewport tag, images without alt text, detected CMS,
   contact emails/phones, social links.
3. **Draft** — one Gemini call per lead, grounded only in that lead's real
   evidence. **If the Gemini call fails for any reason (bad/missing key,
   rate limit, network error, malformed response), the lead is marked
   `draft_error` with the real error message. It is never given fake or
   generic content instead.** This was the most dangerous bug in the old
   code and it does not exist here.
4. **Review queue** — every drafted lead is editable, shows the evidence it
   was based on, and can be approved or rejected.
5. **Send — always manual.** Approving a draft gives you a `mailto:` link
   pre-filled with the subject/body, or a one-click copy of the text. You
   send it yourself from your own mail client. Once you confirm you sent
   it, mark it "sent".

## Coverage tracking (never contact the same business twice)

Every business you've ever drafted, rejected, or contacted is recorded
forever in one table (`ai_outreach_registry`, keyed by domain), independent
of which search or city it came from. Before drafting anything "new", the
pipeline checks this table first — a duplicate is skipped and clearly
flagged, never silently re-drafted. Every auto-search you run (city +
category + date) is also recorded, and running the exact same search again
warns you it's a repeat before it re-runs.

This is what lets you expand across many cities and countries over time
without keeping track of it yourself — the database is the memory.

## Storage: Supabase Postgres, via RPC functions only

This app stores everything in the **same Supabase project already used by
the portfolio and Agbada Luxe sites** (this account is capped at 2 free
projects) — not a new one. Its tables all live under a distinct
`ai_outreach_` prefix so they never collide with the existing `agbada_`
tables.

The security model matches what's already proven on Agbada Luxe: every
`ai_outreach_*` table has **Row Level Security enabled with zero direct
policies** — meaning nothing, including the app itself, can `SELECT`,
`INSERT`, `UPDATE`, or `DELETE` a row directly. The only way in is through a
fixed set of narrow `SECURITY DEFINER` Postgres functions (`ai_outreach_upsert_business`,
`ai_outreach_record_action`, `ai_outreach_add_optout`, etc. — see
[`supabase/migration.sql`](./supabase/migration.sql) for the full list),
each of which validates its own inputs and does exactly one named thing.
`EXECUTE` on those specific functions is granted to the `anon` role — and
**that's the only credential this app ever holds** (`SUPABASE_ANON_KEY`).
It never has, and never needs, the service-role secret key. If the anon key
ever leaked, the worst it could do is call these same narrow functions —
never run an arbitrary query against the tables.

`server/store.ts` only ever calls `.rpc(...)`; there is no direct table
query anywhere in the app.

## Running it (hosted — this is how it's meant to be used)

This app is meant to run as a long-lived web service (e.g. Render), not on
your own machine. Nothing to install, no terminal — you just open the URL
once it's deployed. What you (the user) need to provide, when asked, is:

- A **Gemini API key** — get a free one at https://aistudio.google.com/apikey.
  Without it, everything else works (crawling, CSV import, auto-search,
  coverage tracking) but drafting will show a clear error instead of a draft.
- Your real **business name and mailing address**, for the compliance
  footer that goes on every drafted email.
- Whatever OpenStreetMap asks for (just an email address, for their
  request-identification policy — not a secret).

Everything else (creating the Supabase tables, wiring up environment
variables, deploying the service) is infrastructure work done once during
setup — you shouldn't need to touch a terminal for normal use afterward.

### For whoever deploys it (reference — not needed for day-to-day use)

Environment variables the running service needs:

| Variable | Where it comes from |
|---|---|
| `SUPABASE_URL` | The existing shared Supabase project's URL |
| `SUPABASE_ANON_KEY` | That project's **public anon/publishable key only** — never the service-role key |
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey |
| `GEMINI_MODEL` | Defaults to a current model in `.env.example`; verify against https://ai.google.dev/gemini-api/docs/models |
| `SENDER_BUSINESS_NAME` / `SENDER_ADDRESS` | The user's real business details, for the compliance footer |
| `OSM_CONTACT_EMAIL` | A real contact email, per Nominatim's usage policy |
| `PORT` | Set automatically by Render — don't set this manually there |

The schema + RPC functions in `supabase/migration.sql` must be applied to
that Supabase project before the app can do anything (see the comment block
at the top of that file for exactly why RLS + no-policies + SECURITY
DEFINER is safe here, and who needs to run it).

For local development only (optional, not needed for normal use): `npm
install`, `cp .env.example .env`, fill it in, then `npm start` or `npm run
dev`, and open `http://localhost:3000`. Requires Node.js 22.5+.

## Running the tests

```bash
npm test
```

This runs 31 tests, including a full end-to-end run of the real pipeline
(crawl → dedupe check → draft → save) against a local test HTTP server and
an in-memory stand-in for the Supabase RPC layer (see "What was actually
tested" below for why), and a test that specifically proves a business
already drafted/rejected/sent is never re-drafted on a second pass.

## Compliance — read this before emailing real people

This tool does not target one country's law, because you said you're not
committed to one market yet. It ships a general-purpose footer (your real
business name + address, a working opt-out that's actually enforced — see
below) on every email. But the rules differ by market, and you should know
this before scaling up outreach anywhere:

- **US (CAN-SPAM Act):** requires a working opt-out mechanism and your
  valid physical postal address in every commercial email. This tool
  includes both by default. No misleading subject lines or "From" headers.
- **UK / EU:** for outreach to *limited companies* (Ltd, GmbH, etc.), B2B
  email is generally permitted with a clear opt-out, similar to CAN-SPAM.
  For **sole traders and individuals**, most EU/UK rules (PECR in the UK,
  ePrivacy Directive in the EU) treat them like consumers and generally
  require **prior consent** before you can email them — cold outreach to a
  sole trader's personal-feeling email address is legally riskier there.
- **Nigeria:** covered by the Nigeria Data Protection Act (NDPA, 2023),
  which governs how personal data (which includes a business owner's email
  tied to their identity) can be collected and used — it doesn't ban cold
  outreach outright, but you should process contact data lawfully and honor
  opt-outs, which this tool already does mechanically.

None of this is legal advice, and the tool does not block you from emailing
any market — it's a heads-up so you can make an informed call per-market as
you expand, not a decision made for you.

### The opt-out list is real, not decorative

Go to the **Coverage** tab → "Do-not-contact list" to add an email address.
Once added, the pipeline checks it *before drafting* — if a business's
detected contact email is on that list, drafting is skipped and the lead is
marked `opted_out`, permanently, regardless of which search finds it later.

## Security: why arbitrary "websites" can't make this server attack itself

Auto-search feeds the crawler URLs pulled straight from OpenStreetMap data,
with no human review beforehand — that data could contain a `website` tag
pointing at `http://localhost/admin`, an internal `10.x.x.x` address, or
similar. Before every fetch (including the `robots.txt` fetch, and every
redirect hop), this app:

- resolves the hostname and rejects it if it — or any of its resolved IPs —
  falls in a private, loopback, or link-local range (`127.0.0.0/8`,
  `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`, IPv6
  `::1`/`fc00::/7`/`fe80::/10`, etc.);
- rejects the literal hostnames `localhost` and anything ending in
  `.local`/`.internal`/`.localhost`;
- only allows `http:`/`https:`, so `file://`, `ftp://`, etc. are refused;
- re-checks every redirect hop against the same rules (a public URL that
  redirects to an internal one is refused mid-flight, not just at the start).

See `server/security.ts` for the implementation and `test/security.test.ts`
and the `crawler refuses to fetch...` test in `test/pipeline.test.ts` for
the tests proving this actually blocks a request.

## The two crawler bugs from the old repo, fixed here

1. **Glued-together emails** (e.g. `joe@joesplumbing-test.comcopyright`) —
   caused by concatenating text across HTML elements with no separating
   whitespace before running the email regex. Fixed by inserting separators
   at block-element boundaries before extracting text, *and* validating
   every candidate email's TLD against a known-TLD list so an implausible
   tail like `comcopyright` is trimmed back to `com` even if it slips past
   the first fix. See `server/htmlExtract.ts` and
   `test/htmlExtract.test.ts` / the "glued-email bug" test in
   `test/pipeline.test.ts` (the latter runs the real crawler against a real
   local HTTP server, not just the parsing function in isolation).
2. **SSRF (fetching internal/local addresses)** — fixed as described above.

## What was actually tested for real vs. what could not be

This sandbox had **no outbound internet access at all** (no npm registry,
no GitHub API beyond the one repo explicitly attached, no OpenStreetMap, no
Gemini API, no Supabase — all blocked at the network boundary) and could
not install any npm packages. Given that, the app was deliberately built so
that `server/store.ts` (all database logic) depends on nothing but a
one-method `RpcClient` interface (`rpc(fnName, params)`), never on
`@supabase/supabase-js` directly — the real Supabase client is only ever
constructed in `server/supabaseClient.ts`, imported solely from
`server/index.ts`. That let the test suite exercise the exact same
`Store`/pipeline logic the deployed app runs, against `test/fakeRpcClient.ts`
— an in-memory implementation of the **same function names and the same
business rules** as `supabase/migration.sql` (status-rank merging, domain
normalization, the permanent opt-out list) — instead of just reading the
code.

**Actually run and verified, for real, in this sandbox:**
- The real HTTP server (`server/httpServer.ts` + `routes.ts`) boots, serves
  the frontend, and answers every API route including `/health`, run
  end-to-end via `curl` against a real running process (not just unit
  tests) — see the transcript in this session.
- The real crawler (robots.txt parsing, HTML signal extraction, the fixed
  email-parsing logic, HTTP fetch with timeout/redirect handling) against a
  real local HTTP test server serving two fixture pages (one messy, one
  well-built) — not mocked.
- The real SSRF guard, hit through the real running HTTP server: a request
  to `http://localhost:3777/` was actually refused end-to-end, not just
  unit-tested in isolation.
- The full pipeline (crawl → coverage-registry check → draft → persist)
  end-to-end against the in-memory RPC stand-in, with a stand-in draft
  function standing in for the real Gemini call (see below for why).
- The specific duplicate-prevention requirement: running the pipeline twice
  against the same business (from two different "cities", simulating
  expansion over time) drafts it once and skips/flags the second time,
  without calling the draft function again.
- A simulated Gemini failure produces a `draft_error` lead with the real
  error message and a `null` draft body — never fallback content — and does
  **not** get marked as permanently covered, so it can be retried.
- CSV parsing, the Overpass query builder (correct OSM tags + bounding box +
  required `website` tag), and robots.txt parsing, each with dedicated tests.
- Confirmed `server/index.ts` reads `process.env.PORT` (Render sets this
  itself) and fails with one clear error message, rather than crashing
  confusingly, when `SUPABASE_URL`/`SUPABASE_ANON_KEY` aren't set.
- 31 tests total, `npm test`, all passing.

**Could not be tested for real, and why — this is the orchestrator's side
of this split (real infra access) to verify once applied/deployed:**
- **The real `supabase/migration.sql` against an actual Postgres database.**
  This sandbox cannot reach Supabase at all. The SQL was written carefully
  (validated inputs, `SET search_path = public` on every `SECURITY DEFINER`
  function, RLS enabled with zero policies, explicit `REVOKE ALL` on top of
  that) and its logic is mirrored exactly in `test/fakeRpcClient.ts`, which
  is what the test suite actually runs against — but the SQL itself has
  never executed against a real Postgres instance. **After applying it,
  run one lead through `/api/leads/url` for real and check the resulting
  rows in the Supabase table editor before trusting it at volume**, and
  specifically confirm the functions are owned by a role that bypasses RLS
  (see the note at the top of the migration file) — if they aren't, every
  RPC call will silently return nothing instead of erroring clearly.
- **A real Gemini API call.** No API key was available and the sandbox
  could not reach `generativelanguage.googleapis.com` at all. The
  request/response shape in `server/gemini.ts` matches the `@google/genai`
  SDK's documented `generateContent` call, and the failure-handling path
  (no fake fallback, ever) was tested with a stand-in function — but the
  real network call itself was never made. **Try one real lead through the
  UI first** after the key is set, before trusting it at scale.
- **The exact current Gemini model name.** Verified via web search (not a
  live API call) that `gemini-3-flash-preview` is a real, current model ID
  as of when this was built, but Google's model lineup changes often —
  double-check against https://ai.google.dev/gemini-api/docs/models.
- **A real OpenStreetMap auto-search** (Nominatim geocoding + Overpass
  query). The sandbox's network proxy explicitly blocked
  `overpass-api.de`. The query-building logic is unit-tested and the HTTP
  call code is straightforward `fetch()`, but a real end-to-end search was
  never run.
- **`npm install` and an actual deploy.** The npm registry was blocked in
  this sandbox too — dependency versions in `package.json` are carried over
  from what the old repo had already pinned (`@google/genai`,
  `@supabase/supabase-js`) or are ordinary unpinned ranges; they should
  resolve normally with real internet, but that was never confirmed here.

## Why a rewrite instead of fixing the old repo?

The old repo (~21,000 lines) had, per the audit that led to this rebuild: a
missing `FileDatabase` class that crashed the server on startup, 11
TypeScript errors, a lead-discovery step that only ever returned mock data,
no real email sending, fake login, in-memory-only storage, hardcoded
dashboard numbers, and a Gemini integration that silently faked its output
on failure. Of that codebase, only the crawler and the Gemini
prompt/drafting approach were real and worth carrying forward — both were
reused conceptually here (and the crawler's actual bugs were fixed rather
than copied).

Given that, patching the old code in place would have meant fixing a
missing core class, 11 type errors, and a dangerous silent-fallback bug
*inside* an architecture built for multi-tenant SaaS (organizations,
workspaces, seven "AI agents", OAuth, Postgres) that this project
explicitly does not need — it's one person's local tool. A fresh, much
smaller implementation reusing only the two things that worked was faster
to get right and much easier to audit. The old code is preserved under
[`legacy/`](./legacy) rather than deleted, so nothing is lost if you want
to reference it later.

Two other cleanup items from the audit are also done: a committed
`firebase-applet-config.json` (an unused public web key) has been removed,
and a committed `server-logs.txt` has been removed with `.gitignore`
updated (`*.log`, `server-logs.txt`, `.env`, the SQLite data file) so
neither can be committed again by accident.

## Project layout

```
server/
  index.ts          entry point — loads env, connects to Supabase, starts the server
  httpServer.ts     tiny router + static file server (no Express)
  routes.ts         the JSON API, including /health for Render's health check
  pipeline.ts       crawl -> dedupe-check -> draft -> persist, for one lead
  crawler.ts        fetches a homepage (robots.txt, timeout, SSRF guard)
  htmlExtract.ts    pulls audit signals out of raw HTML (the fixed email bug)
  security.ts       the SSRF guard
  robots.ts         tiny robots.txt parser
  gemini.ts         one Gemini call per lead; never a fake fallback
  compliance.ts     the footer + opt-out honoring
  overpass.ts       OpenStreetMap auto-search (Nominatim + Overpass)
  supabaseClient.ts builds the real Supabase RPC client (anon key only)
  store.ts          all data access, purely via .rpc() calls — no direct table queries
  csv.ts            tiny CSV parser
  types.ts          shared types
public/
  index.html, app.js, style.css     the whole frontend, no build step
supabase/
  migration.sql     tables + RLS + SECURITY DEFINER RPC functions — apply this once
test/
  *.test.ts         31 tests, run with `npm test`
  fakeRpcClient.ts  in-memory stand-in for the Supabase RPC surface, used by tests
legacy/              the old repo, kept for reference
```
