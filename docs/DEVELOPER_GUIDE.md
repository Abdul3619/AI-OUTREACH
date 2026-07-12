# System Developer Guide (v1.0.0)

This guide is written for software engineers, systems engineers, and AI engineers working with the **AI Outreach Platform & Sales CRM**. It covers system architecture, codebase patterns, API designs, database structures, and the multi-agent AI orchestration engine.

---

## 🏗️ 1. Technical Architecture Overview

The system is constructed as a unified full-stack TypeScript application with a single root repository:

```text
 ┌──────────────────────────────────────────────────────────────────┐
 │                         REACT FRONTEND                           │
 │      (Single Page Application, Recharts, Lucide, Framer)         │
 └────────────────────────────────┬─────────────────────────────────┘
                                  │
                                  ▼   (REST API Prefixed /api/*)
 ┌──────────────────────────────────────────────────────────────────┐
 │                      EXPRESS BACKEND SERVER                      │
 │     (TSX Runtime Engine, Vite Dev Middleware, Unified Port 3000) │
 └──────┬─────────────────────────┬─────────────────────────┬───────┘
        │                         │                         │
        ▼                         ▼                         ▼
 ┌──────────────┐          ┌──────────────┐          ┌──────────────┐
 │ CRAWLER PROXY│          │  MULTI-AGENT │          │ EXTENSIBLE DB │
 │(Axios/Cheerio│          │ ORCHESTRATOR │          │(PostgreSQL or │
 │ SSRF Filter) │          │(Gemini SDK)  │          │ JSON Store)  │
 └──────────────┘          └──────────────┘          └──────────────┘
```

---

## 📁 2. File and Directory Layout

```text
/
├── server.ts                       # Unified Full-Stack Express Entry Point
├── package.json                    # Dependencies & Bundling Scripts
├── tsconfig.json                   # Strict TypeScript Rules & Enums
├── docs/                           # Central System Documentation Hub
├── server/                         # Backend Architecture Segment
│   ├── routes/                     # Express Endpoint Segment Controllers
│   │   ├── leads.ts                # CRUD CRM Pipeline, Audits, & SWOT triggers
│   │   ├── integrations.ts         # Plugin registrations, custom configurations
│   │   └── profiles.ts             # Workspace profile settings
│   ├── services/                   # Core business logic services
│   │   ├── crawler.ts              # Proxy scrapers with Cheerio parsing
│   │   ├── gemini.ts               # Multi-agent prompt pipeline & Gemini binds
│   │   └── registry.ts             # Active Plugin Provider Registry
│   └── db/                         # Database Adapter and Pool files
└── src/                            # Frontend React Segment
    ├── main.tsx                    # React client entry bootstrap
    ├── App.tsx                     # Unified system routing, context provider wrapper
    ├── index.css                   # Global Tailwind imports
    ├── types.ts                    # Synchronized TypeScript schemas & Enums
    ├── components/                 # Atomic UI Blocks
    │   ├── ui/                     # Primitives (Badges, Buttons, Cards, Dialogs)
    │   ├── dashboard/              # Stats panels, Pipeline distributions
    │   ├── leads/                  # CRM Kanban board, Dossiers, Refinement drawers
    │   └── outreach/               # AI generation Wizard, QA Dial panels
    ├── hooks/                      # Query hooks binding to services
    └── services/                   # Frontend Axios wrappers to endpoints
```

---

## 🧠 3. Multi-Agent AI Orchestration Flow

The core capability is managed by `server/services/gemini.ts` which coordinates 7 specialized micro-agents:

1. **Lead Discovery Agent (Agent 1)**: Maps basic target demographics and industries.
2. **Website Intelligence Agent (Agent 2)**: Receives crawled raw HTML, strips script tags, and parses SEO, UX, accessibility, and branding deficiencies.
3. **Business Intelligence Agent (Agent 3)**: Examines business service descriptions and conducts SWOT and local market positioning audits.
4. **Proposal Generator Agent (Agent 4)**: Merges the sender's business profile with detected flaws, drafting proposals across Email, LinkedIn, WhatsApp, or Contact Forms.
5. **Quality Assurance Agent (Agent 5)**: Audits proposals for personalization (>70%), spam risk (<30%), and natural human writing patterns. If constraints are violated, triggers a self-healing loop back to Agent 4.
6. **CRM Manager Agent (Agent 6)**: Formulates task schedules, reminders, and activity timeline logs.
7. **Translation & Localization Agent (Agent 7)**: Detects primary website languages, translating and localizing copies to fit regional cultural guidelines.

---

## 💾 4. State Management & Database Fallbacks

The application is built to be "SaaS-ready," mapping seamlessly to relational PostgreSQL databases while maintaining an integrated filesystem fallback (`database-store.json`) for effortless development:

```typescript
// server/db/index.ts excerpt
export class JSONDatabase {
  private state: DatabaseSchema;
  
  constructor() {
    this.state = this.loadOrCreateState();
  }
  
  // Operations are native TypeScript array filters and mutations,
  // mapping 1-to-1 with PostgreSQL queries.
}
```

### Type Synchronization & Enums
We enforce strict type-safety by defining unified enums inside `src/types.ts`:

```typescript
export enum LeadStatus {
  DISCOVERED = 'discovered',
  QUALIFIED = 'qualified',
  RESEARCHING = 'analyzing',
  OUTREACH_READY = 'outreach_ready',
  CONTACTED = 'contacted',
  REPLIED = 'replied',
  CLOSED_WON = 'closed_won',
  ARCHIVED = 'archived'
}

export enum OpportunityPriority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  VERY_HIGH = 'Very High'
}
```

---

## 🔌 5. Database Schema Extensions

To add a new table to the PostgreSQL database:
1. Declare the schema table schema in `server/db/schema.ts` (using Drizzle or standard SQL).
2. Run schema migration tasks: `npm run db:migrate`.
3. Add corresponding interface models inside `src/types.ts` to maintain synchronized types on the React frontend.
4. Update the DB driver adapter to handle mutations on the new database table.
