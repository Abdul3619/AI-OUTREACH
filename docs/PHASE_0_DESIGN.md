# PHASE 0: Complete Technical Design & System Contracts (v1.1)

This document establishes the definitive design system, repository contracts, and implementation blueprints for the **AI Outreach Platform & Sales CRM**. It bridges the high-level roadmap and the actual code.

---

## 1. Directory Structure & Workspace Layout

Our directory structure is fully modular, dividing server-side logic from React client-side logic to ensure zero-latency full-stack execution and robust dependency isolation.

```
/
├── .env.example                    # Template for secrets and environment config
├── .gitignore                      # Prevents committing build outputs, node_modules, and logs
├── AGENTS.md                       # Permanent architectural guidelines for AI interaction
├── metadata.json                   # Platform app identifier, permissions, and descriptors
├── package.json                    # Full-stack dependencies and scripts
├── tsconfig.json                   # TypeScript compiling parameters
├── vite.config.ts                  # Vite bundle and asset-server config
├── server.ts                       # Express Backend Entry Point & Vite middleware
├── docs/
│   ├── ARCHITECTURE.md             # Vision and Scoring Matrices specification
│   └── PHASE_0_DESIGN.md           # This exhaustive Design and Contracts specification
├── src/                            # FRONTEND CLIENT (React SPA)
│   ├── main.tsx                    # Client-side mounting point
│   ├── App.tsx                     # Routing and central state provider
│   ├── index.css                   # Tailwind CSS global styles
│   ├── types.ts                    # Shared types (Single source of truth)
│   ├── components/                 # Presentation and interactive elements
│   │   ├── ui/                     # Atoms: Button, Card, Badge, Drawer, Dialog, Progress
│   │   ├── dashboard/              # Stats containers, Recharts visualizer, Funnel blocks
│   │   ├── leads/                  # Pipeline board, detailed drawers, lead creator modal
│   │   └── outreach/               # AI generation wizard, quality meters, template editors
│   ├── hooks/                      # Custom hooks wrapping query / state hooks
│   ├── layouts/                    # Interactive Dashboard Rails and layouts
│   └── services/                   # Client-to-server HTTP proxy interfaces
└── server/                         # BACKEND ENGINE (Express app)
    ├── routes/                     # API routers (leads, profiles, ai, tasks, dashboard)
    ├── services/                   # Core business logic
    │   ├── crawler.ts              # Proxy website scraper (cheerio, axios)
    │   └── gemini.ts               # Multi-agent SDK orchestration layer
    ├── db/                         # Database pool connection and seeding scripts
    └── types/                      # Server-specific typing maps
```

---

## 2. Database Schema & Entity Relationship Diagram (ERD)

The PostgreSQL relational design is structured to support SaaS scalability, with immediate local simulation layers.

### Relational Entity ERD (Crow's Foot Notation)

```
[organizations] 1 ---- 0..* [workspaces]
[organizations] 1 ---- 0..* [users]
[workspaces]    1 ---- 0..* [business_profiles]
[workspaces]    1 ---- 0..* [leads]
[leads]         1 ---- 0..* [outreach_messages]
[leads]         1 ---- 0..* [tasks]
[leads]         0..* -- 0..1 [activity_logs]
```

### Relational SQL Schema Statements

```sql
-- Multi-Tenant Organizations
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    subscription_tier VARCHAR(50) DEFAULT 'free', -- free, pro, enterprise
    usage_limit INT DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Multi-Tenant Workspaces
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Organization Members / Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) DEFAULT 'member', -- owner, admin, member, viewer
    full_name VARCHAR(255),
    avatar_url VARCHAR(512),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Workspace/User Profile Setup (The Sender Persona)
CREATE TABLE business_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    industry VARCHAR(255),
    services TEXT[] DEFAULT '{}',
    target_audience TEXT,
    tone_of_voice VARCHAR(100) DEFAULT 'professional',
    portfolio_links TEXT[] DEFAULT '{}',
    default_templates JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Lead Tracking & Core CRM
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    business_name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    website VARCHAR(512),
    email VARCHAR(255),
    phone VARCHAR(50),
    linkedin_url VARCHAR(512),
    facebook_url VARCHAR(512),
    instagram_url VARCHAR(512),
    city VARCHAR(100),
    country VARCHAR(100),
    business_size VARCHAR(50),
    language_code VARCHAR(10) DEFAULT 'en',
    
    -- Category Scoring Model
    score_seo INT DEFAULT 0,
    score_performance INT DEFAULT 0,
    score_mobile INT DEFAULT 0,
    score_accessibility INT DEFAULT 0,
    score_branding INT DEFAULT 0,
    score_ux INT DEFAULT 0,
    score_content INT DEFAULT 0,
    score_security INT DEFAULT 0,
    score_trust INT DEFAULT 0,
    
    -- Compiled Indexes
    website_health_score INT DEFAULT 0,
    opportunity_score INT DEFAULT 0,
    opportunity_priority VARCHAR(50) DEFAULT 'Medium', -- Low, Medium, High, Very High
    suggested_action VARCHAR(512),
    
    status VARCHAR(50) NOT NULL DEFAULT 'discovered', -- discovered, qualified, analyzing, outreach_ready, contacted, replied, closed_won, archived
    tags TEXT[] DEFAULT '{}',
    lead_source VARCHAR(100) DEFAULT 'manual',
    ai_analysis_data JSONB DEFAULT '{}', -- SWOT + SEO details
    last_contacted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_website_per_workspace UNIQUE (workspace_id, website)
);

-- Outreach Communication Templates & Drafts
CREATE TABLE outreach_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    channel VARCHAR(50) NOT NULL, -- email, linkedin, contact_form, whatsapp
    subject_line VARCHAR(512),
    body_content TEXT NOT NULL,
    original_ai_content TEXT,
    
    -- Draft QA Scoring
    qa_personalization INT DEFAULT 0,
    qa_spam_risk INT DEFAULT 0,
    qa_natural_tone INT DEFAULT 0,
    qa_language_accuracy INT DEFAULT 0,
    qa_confidence VARCHAR(50) DEFAULT 'Medium',
    
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Follow-up Reminders & Tasks
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit Trails & History Log (Timeline source)
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    action_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3. Repository Pattern Interfaces

To maintain separation of concerns and allow pluggable database drivers (SQLite simulation, Cloud SQL PostgreSQL, Supabase, Firebase), we define strict Repository Interfaces.

```typescript
export interface IBusinessProfileRepository {
  getProfile(workspaceId: string): Promise<BusinessProfile | null>;
  upsertProfile(workspaceId: string, profile: Partial<BusinessProfile>): Promise<BusinessProfile>;
}

export interface ILeadRepository {
  getById(id: string): Promise<Lead | null>;
  list(workspaceId: string, filters?: { status?: LeadStatus; tags?: string[] }): Promise<Lead[]>;
  create(workspaceId: string, lead: Partial<Lead>): Promise<Lead>;
  update(id: string, updates: Partial<Lead>): Promise<Lead>;
  delete(id: string): Promise<boolean>;
  recordActivity(leadId: string, actionType: string, description: string): Promise<ActivityLog>;
}

export interface IOutreachRepository {
  getById(id: string): Promise<OutreachMessage | null>;
  getByLeadId(leadId: string): Promise<OutreachMessage[]>;
  create(leadId: string, message: Partial<OutreachMessage>): Promise<OutreachMessage>;
  update(id: string, updates: Partial<OutreachMessage>): Promise<OutreachMessage>;
}

export interface ITaskRepository {
  list(leadId?: string, isCompleted?: boolean): Promise<Task[]>;
  create(leadId: string, task: Partial<Task>): Promise<Task>;
  update(id: string, isCompleted: boolean): Promise<Task>;
}
```

---

## 4. Multi-Agent AI Contracts & Interfaces

To implement the modular micro-agent specification, each agent is isolated and governed by a specific interface contract. Communication is orchestrated via `GeminiOrchestrator`.

```typescript
export interface IAgentLeadDiscovery {
  discover(inputQuery: string): Promise<{
    companyName: string;
    website: string | null;
    industry: string;
    city: string | null;
    country: string | null;
    language: string;
  }>;
}

export interface IAgentWebsiteIntelligence {
  analyze(html: string): Promise<WebsiteIntelligenceOutput>;
}

export interface IAgentBusinessIntelligence {
  evaluate(textSummary: string): Promise<BusinessIntelligenceOutput>;
}

export interface IAgentProposalGenerator {
  generate(
    profile: BusinessProfile,
    webIntel: WebsiteIntelligenceOutput,
    bizIntel: BusinessIntelligenceOutput,
    channel: CommunicationChannel
  ): Promise<ProposalGeneratorOutput>;
}

export interface IAgentQA {
  audit(draft: ProposalGeneratorOutput): Promise<QAOutput>;
}

export interface IAgentTranslationAndLocalization {
  localize(text: string, targetLang: string): Promise<LocalizationOutput>;
}
```

---

## 5. Plugin & Connector Architecture

Every external integration (AI engine, storage, CRM, maps, calendar) is treated as a hot-swappable connector implemented through abstract wrappers.

```typescript
// Swappable AI Engine Interface
export interface IAIEngineConnector {
  generateStructuredJSON<T>(prompt: string, schema: any): Promise<T>;
  generateText(prompt: string): Promise<string>;
}

// Swappable Communication/Email Provider Interface
export interface IEmailProviderConnector {
  sendEmail(to: string, subject: string, bodyHtml: string): Promise<{ success: boolean; messageId?: string }>;
}
```

---

## 6. Authentication, State & Event Flows

### A. Authentication Flow
- **Firebase Auth Bridge**: Uses Firebase Auth client-side SDK for user sign-in and tokens.
- **Backend Verification**: Every Express route prefixed with `/api/*` reads the `Authorization: Bearer <token>` header, decodes the claims, and matches the authenticated user to their mapped `workspace_id`.

### B. Event Flow (Human-in-the-Loop Web Analyzer)

```
[User UI] --(POST /api/leads/:id/analyze)--> [Backend API Gateway]
                                                    │
                                        1. Scrape Homepage (cheerio)
                                                    │
                                                    ▼
                                        2. Invoke Agent 2 & Agent 3 (Gemini)
                                                    │
                                                    ▼
                                        3. Calculate Scores & Save Lead Record
                                                    │
                                                    ▼
[User UI] <-----(Return 200 JSON Analysis)----------┘
```

### C. State Management Strategy (TanStack Query & Context)
- **Local Context**: Retains UI state, drag-and-drop board flags, filter states, and layout configurations.
- **Server Cache (TanStack Query)**: Handles all lead queries, tasks, and draft updates. Instantly refetches list views on status changes to maintain synchronization with no latency.

---

## 7. Operational Guidelines (Security, Error, Logging, Testing)

### A. Security Architecture
- **Secret Protection**: API Keys are isolated server-side. No public configuration carries secret hashes.
- **XSS Mitigation**: The HTML from crawled lead websites is parsed inside cheerio and stripped down to text components. No dynamic HTML string rendering inside React.
- **Anti-Spam Thresholding**: If the QA Agent calculates a `spamRisk` above 30%, the system locks the auto-approval pipeline and prompts the user to edit manual tokens.

### B. Error Handling & Self-Healing Strategy
- **Crawler Failures**: If website fetching fails (timeout or blocking), the API falls back to basic SEO defaults (all score 30) with clear UI warnings allowing the user to provide manual summaries.
- **AI Self-Healing Loop**: If Agent 5 (QA) fails a generated message (Personalization < 70% or Spam Risk > 30%), the orchestrator feeds the feedback string back into Agent 4 (Proposal) for a second regeneration.

### C. Logging Framework
Every transactional action (analysis run, draft approval, status shift) yields a database write to the `activity_logs` table, forming a permanent timeline visualizer.

### D. Testing Strategy
- **Unit**: Validate scoring formulas and prompt structures using mocked website text.
- **Integration**: Verify Express router payloads and middleware token validations.

---

## 8. Architecture Decision Record (ADR) Template

```markdown
# ADR [Number]: [Topic/Decision Title]

## Status
[Proposed | Accepted | Superseded]

## Context
[Describe the problem context and constraints driving this technical choice.]

## Decision
[Detail the exact technical strategy or architecture chosen.]

## Consequences
- **Positive**: [Advantages, speed, simplicity, structure]
- **Negative**: [Complexity overhead, maintenance, migration tasks]
```

---

## 9. Comprehensive Phase Implementation Checklist

### Phase 1: Core Foundation & Lead Pipeline (CRM)
- [ ] Initialize Express server file structure in `server/` and wire dev scripts in `package.json`.
- [ ] Implement local database simulation using JSON files (fallback to Cloud SQL).
- [ ] Design high-fidelity layout framework with responsive workspace rails.
- [ ] Build the interactive Kanban board pipeline supporting drag-and-drop state switches.
- [ ] Create Business Profile configurations UI form (Offerings, Target Audience, Tone).
- [ ] Implement manual Lead creation form and lead listing tables.

### Phase 2: Web Scraping & AI Analysis (Web Intelligence)
- [ ] Build server-side crawler in `server/services/crawler.ts` using Cheerio and Axios/Fetch.
- [ ] Implement Website Intelligence Agent prompt with Gemini structured outputs.
- [ ] Implement Business Intelligence SWOT analysis logic.
- [ ] Code the weighted scoring algorithms to output category indexes (SEO, performance, mobile, accessibility).
- [ ] Establish detailed Opportunity score calculator (0-100).
- [ ] Create visual lead detailed summary drawer containing SEO graphs and opportunities.

### Phase 3: Personalized Proposals & Translation
- [ ] Integrate Proposal Generator Agent combining Profile and Lead insights.
- [ ] Implement Agent 5 (QA Agent) with automated self-healing logic loops.
- [ ] Build Translator Agent support for English, French, Arabic, Spanish, German, and Portuguese.
- [ ] Design Proposal Wizard UI: display QA dials (spam meter, personalization dial).
- [ ] Write outreach actions helpers: copy-to-clipboard, customized mailto links, and LinkedIn jump boxes.

### Phase 4: Full Analytics Dashboard & Productivity Calendar
- [ ] Build interactive conversion funnel tracking using Recharts.
- [ ] Add dashboard graphs: industry breakdowns, lead distribution maps, success ratios.
- [ ] Implement Tasks & Reminders manager table.
- [ ] Embed lead timeline streams drawing from database activity logs.
