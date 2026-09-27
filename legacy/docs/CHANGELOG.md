# Changelog - Version History (v1.0.0)

All notable changes, features, architectural upgrades, and bug fixes for the **AI Outreach Platform & Sales CRM** are documented chronologically below.

---

## [1.0.0] - 2026-07-12
### Release Candidate 1 (RC-1) Stabilization & SaaS Launch

### Added:
- Added a production bundling script inside `package.json` compiling the Express backend via Esbuild into CJS (`/dist/server.cjs`) alongside standard Vite frontend compilations.
- Formulated the complete documentation suite inside `/docs` including guides for Installation, Deployment, Security, Operations, APIs, and Plugins.
- Established defensive Server-Side Request Forgery (SSRF) checks rejecting crawls to internal loopback and private subnets.
- Integrated comprehensive Helmets and secure CORS configurations restricting origins to custom environment profiles.

### Changed:
- Upgraded the database schema validator to automatically enforce default seeded mock environments on empty JSON/PostgreSQL file stores without breaking existing records.
- Stabilized and optimized the Recharts rendering modules inside CRM dashboard tabs, correcting resizing flicker states.

### Fixed:
- Fixed a React state bug where deleting a lead with active task dependencies left orphaned pointer indices in local storage.
- Fixed an Express path matching vulnerability on `/api/leads/:id` ensuring correct route parameter types are filtered and validated.
- Corrected TypeScript compilation errors in `EcosystemHub.tsx` ensuring 100% clean, error-free builds.

---

## [0.9.0] - 2026-07-01
### Follow-ups, Activity Logs & Analytics Dashboard

### Added:
- Integrated a full-featured follow-up task system with reactive due-dates and completion controls.
- Added Recharts-powered Business Intelligence widgets rendering lead conversion funnels and pipeline distributions.
- Built a localized Activity Logging ledger capturing timeline records for lead creation, audits, and outreach dispatches.
- Included automated in-app notifications flagging due tasks and low-scoring crawl alerts.

---

## [0.5.0] - 2026-06-15
### Website Crawler & Multi-Agent SWOT Engine

### Added:
- Built the server-side crawler fetching title, headings, and anchors through Cheerio and Axios proxies.
- Developed the 7-micro-agent multi-agent registry running on Google Gemini SDK (`@google/genai`).
- Integrated the 9-category Website Health Score analyzer combining metrics for SEO, UX, speed, and trust.
- Created the Opportunity Rating matrix classifying converted leads into Low, Medium, High, and Very High priority tiers.

---

## [0.1.0] - 2026-06-01
### Core Foundation & Pipeline CRM

### Added:
- Created the core Express server and mounted React Vite scaffolding.
- Built the interactive pipeline Kanban Board with customizable status columns.
- Implemented the Workspace Business Profile manager saving portfolio links and tone alignments.
- Created local persistence syncing to `database-store.json`.
