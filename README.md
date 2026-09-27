# AI Outreach (v2)

A small, local, single-user tool that finds real local businesses, audits
their website, and drafts a personalized outreach email for you to review
and send yourself. Nothing is ever sent automatically.

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
forever in one table (`registry`, keyed by domain), independent of which
search or city it came from. Before drafting anything "new", the pipeline
checks this table first — a duplicate is skipped and clearly flagged, never
silently re-drafted. Every auto-search you run (city + category + date) is
also recorded, and running the exact same search again warns you it's a
repeat before it re-runs.

This is what lets you expand across many cities and countries over time
without keeping track of it yourself — the database is the memory.

## Running it

**Requirements:** Node.js **22.5 or newer** (needed for `node:sqlite`, which
this app uses instead of an external database — no separate Postgres/Supabase
setup, and nothing new to host).

```bash
cd ai-outreach
npm install
cp .env.example .env
```

Then edit `.env`:
- `GEMINI_API_KEY` — get a free key at https://aistudio.google.com/apikey.
  Without this, everything else works (crawling, CSV import, auto-search,
  coverage tracking) but drafting will show a clear error instead of a draft.
- `GEMINI_MODEL` — defaults to a current model, but Google renames/retires
  Gemini models fairly often. Before relying on this, check
  https://ai.google.dev/gemini-api/docs/models and update `.env` if needed.
- `SENDER_BUSINESS_NAME` / `SENDER_ADDRESS` — your real business name and
  mailing address. These go in the compliance footer on every drafted email.
- `OSM_CONTACT_EMAIL` — your email, sent as a courtesy identifier on
  OpenStreetMap API requests (their usage policy asks for this).

Start it:

```bash
npm start          # or: npm run dev   (auto-restarts on file changes)
```

Then open **http://localhost:3000** in your browser. That's the whole app —
one page with three tabs (Add Leads / Review Queue / Coverage).

Your data lives in a single SQLite file at `data/ai-outreach.sqlite`
(created automatically). Back it up like any other file if you care about
not losing it — there's no cloud copy.

## Running the tests

```bash
npm test
```

This runs 31 tests, including a full end-to-end run of the real pipeline
(crawl → dedupe check → draft → save) against a local test HTTP server, and
a test that specifically proves a business already drafted/rejected/sent is
never re-drafted on a second pass. See "What was actually tested" below for
exactly what this does and doesn't cover.

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

This sandbox had **no outbound internet access** (no npm registry, no
GitHub API, no OpenStreetMap, no Gemini API — all blocked at the network
boundary) and could not install any npm packages. Given that, the app was
deliberately built to need **zero external npm packages for anything except
drafting** (only `@google/genai` is a real dependency, and it's imported
lazily only inside the draft call) — everything else uses Node's own
built-ins (`node:http`, `node:sqlite`, `fetch`, `node:dns`). That let me
actually run almost the whole thing for real in this sandbox instead of
just reading the code:

**Actually run and verified, for real, in this sandbox:**
- The real server boots (`npm start` equivalent), serves the frontend, and
  answers every API route.
- The real crawler (robots.txt parsing, HTML signal extraction, the fixed
  email-parsing logic, HTTP fetch with timeout/redirect handling) against a
  real local HTTP test server serving two fixture pages (one messy, one
  well-built) — not mocked.
- The real SSRF guard, hit through the real running HTTP server: a request
  to `http://localhost:3777/` was actually refused end-to-end, not just
  unit-tested in isolation (see the curl transcript this was verified with,
  reproduced in the PR/commit description).
- The full pipeline (crawl → coverage-registry check → draft → persist to a
  real SQLite file) end-to-end, with a stand-in draft function standing in
  for the real Gemini call (see below for why).
- The specific duplicate-prevention requirement: running the pipeline twice
  against the same business (from two different "cities", simulating
  expansion over time) drafts it once and skips/flags the second time,
  without calling the draft function again.
- A simulated Gemini failure produces a `draft_error` lead with the real
  error message and a `null` draft body — never fallback content — and does
  **not** get marked as permanently covered, so it can be retried.
- CSV parsing, the Overpass query builder (correct OSM tags + bounding box +
  required `website` tag), and robots.txt parsing, each with dedicated tests.
- 31 tests total, `npm test`, all passing.

**Could not be tested for real, and why — you should verify these once you
have internet and a key:**
- **A real Gemini API call.** No API key was available and the sandbox
  could not reach `generativelanguage.googleapis.com` at all. The
  request/response shape in `server/gemini.ts` matches the `@google/genai`
  SDK's documented `generateContent` call, and the failure-handling path
  (no fake fallback, ever) was tested with a stand-in function that mimics
  both a success and a failure response — but the real network call itself
  was never made. **Try one real lead through the UI first** after adding
  your key, before trusting it for anything at scale.
- **The exact current Gemini model name.** I verified via web search (not
  a live API call) that `gemini-3-flash-preview` is a real, current model
  ID as of when this was built, but Google's model lineup changes often —
  double-check `.env`'s `GEMINI_MODEL` against
  https://ai.google.dev/gemini-api/docs/models before relying on this.
- **A real OpenStreetMap auto-search** (Nominatim geocoding + Overpass
  query). The sandbox's network proxy explicitly blocked
  `overpass-api.de`. The query-building logic is unit-tested and the HTTP
  call code is straightforward `fetch()`, but a real end-to-end search was
  never run. Try a small city+category search first and sanity-check the
  results before running a large one.
- `npm install` itself was never run in this sandbox (the npm registry was
  also blocked) — the dependency versions in `package.json` are carried
  over from what the old repo had already pinned (for `@google/genai`) or
  are ordinary, unpinned-to-a-specific-patch ranges; run `npm install`
  yourself and it should resolve normally on a machine with real internet.

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
  index.ts        entry point — loads .env, opens the DB, starts the server
  httpServer.ts   tiny router + static file server (no Express)
  routes.ts       the JSON API
  pipeline.ts     crawl -> dedupe-check -> draft -> persist, for one lead
  crawler.ts      fetches a homepage (robots.txt, timeout, SSRF guard)
  htmlExtract.ts  pulls audit signals out of raw HTML (the fixed email bug)
  security.ts     the SSRF guard
  robots.ts       tiny robots.txt parser
  gemini.ts       one Gemini call per lead; never a fake fallback
  compliance.ts   the footer + opt-out honoring
  overpass.ts     OpenStreetMap auto-search (Nominatim + Overpass)
  db.ts           SQLite schema (node:sqlite)
  store.ts        all database queries, including the coverage registry
  csv.ts          tiny CSV parser
  types.ts        shared types
public/
  index.html, app.js, style.css     the whole frontend, no build step
test/
  *.test.ts       31 tests, run with `npm test`
legacy/            the old repo, kept for reference
```
