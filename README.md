# AI Outreach & Sales CRM (v1.0.0)

An intelligent Sales CRM, Web Crawler, and Multi-Agent AI Outreach Platform designed for agencies, consulting firms, freelancers, and enterprises. Discover high-quality prospects, audit their digital presence, calculate granular opportunity metrics, and generate hyper-personalized outreach sequences across multiple channels with a secure, Human-in-the-Loop workflow.

---

## 🚀 Key Capabilities

- 📋 **Pipeline CRM**: Full Kanban-style sales tracking board to manage lead conversion stages (Discovered, Qualified, Analyzing, Outreach Ready, Contacted, Replied, Won, Archived).
- 🕷️ **Website Crawler**: Server-side crawling and cleaning of raw HTML content to detect architectural elements, CMS, and metadata safely without CORS issues.
- 🧠 **Multi-Agent Orchestration**: Seven specialized, isolated AI agents coordinated to index, audit SWOT profiles, generate multi-lingual proposal copies, and validate quality.
- 🎯 **Scoring Matrices**: Automated 9-category Website Health Scoring combined with complex conversion opportunity algorithms.
- ✍️ **Intelligent Draft Wizard**: Custom tailoring of tone, language, and channel formats (Email, LinkedIn, WhatsApp, Forms) with integrated copy-to-clipboard, mailto links, and deep-link hooks.
- 🛡️ **Human-in-the-Loop Controls**: Zero automated cold spam. Full editing interface with AI refinement dials, spam/confidence checkers, and historical draft restore points.
- 🔌 **Extensible Plugin Registry**: Hot-swappable providers for databases, external APIs, notifications, email delivery interfaces, and custom connectors.

---

## 📂 Project Documentation Center

We have compiled exhaustive production-grade documentation inside the `/docs` directory to help you deploy, configure, customize, and operate the platform at scale:

1. **System Setup & Development**:
   - [Installation Guide](./docs/INSTALLATION.md) — Quickstart, environment setup, and local run instruction.
   - [Developer Guide](./docs/DEVELOPER_GUIDE.md) — Architecture deep dive, multi-agent structure, codebase walkthrough, and state flow.
   - [API Reference](./docs/API_REFERENCE.md) — Comprehensive REST API endpoint schema, payloads, and response patterns.

2. **Operations & Production Launch**:
   - [Deployment Guide](./docs/DEPLOYMENT.md) — Cloud Run, PostgreSQL database setups, environment configuration, and SSL setups.
   - [Operations & Monitoring Guide](./docs/OPERATIONS.md) — Monitoring, log forwarding, performance metrics, backups, and disaster recovery.
   - [Security Specification](./docs/SECURITY.md) — Vulnerability mitigations, authorization checks, secret hygiene, and CSP guidelines.

3. **User & Administrator Manuals**:
   - [User Guide](./docs/USER_GUIDE.md) — Comprehensive guide on finding leads, analyzing sites, crafting proposals, and handling sales pipelines.
   - [Administrator Guide](./docs/ADMIN_GUIDE.md) — Access controls, organizations, workspaces, billing limits, and workspace customizations.

4. **Extensibility & Version History**:
   - [Plugin SDK & Connector Guide](./docs/PLUGIN_SDK.md) — Guide on building custom integrations (databases, AI models, CRM bridges, calendars).
   - [Technical Architecture](./docs/ARCHITECTURE.md) — Detailed specifications of databases, multi-agent mechanics, and scoring algorithms.
   - [Project Status & Roadmap](./ROADMAP.md) — Milestones, permanent constraints, and forward-looking capabilities.
   - [Changelog](./docs/CHANGELOG.md) — Historical records of versions, patches, and release notes up to v1.0.0.

---

## 🛠️ Stack Overview

- **Frontend**: React 18, Vite, Tailwind CSS, Recharts (Charts), Framer Motion (Animations), Lucide React (Icons).
- **Backend**: Node.js, Express, TypeScript (native tsx parsing), Esbuild (Bundler).
- **Core AI**: Google Gemini API via modern `@google/genai` (using `gemini-2.5-flash` for high-speed crawler intelligence and `gemini-2.5-pro` for proposals).
- **Database**: Extensible local database schema mapping with native PostgreSQL compliance.

---

## 📝 License & Compliance

This platform is crafted for professional B2B lead generation. All users must strictly comply with regional communication laws, including CAN-SPAM (US), GDPR (EU), CASL (Canada), and LinkedIn/social network Terms of Service. The platform enforces **Human-in-the-Loop** verification by default to guarantee ethical, compliant outreach practices.
