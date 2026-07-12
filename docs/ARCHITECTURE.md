# AI Outreach Platform & Sales CRM - Permanent Architectural Specification (v1.1)

This document establishes the official system blueprint and permanent architectural specification for the **AI Outreach Platform & Sales CRM** (Version 1.1). Every subsequent phase, API contract, database migration, component layout, and AI prompt must align strictly with the structures and guidelines defined herein.

---

## 1. Project Vision & Fundamental Principles
The AI Outreach Platform is not an automated cold-spam utility. It is an **intelligent Sales CRM and Business Intelligence (BI) Platform** designed to help agencies, freelancers, consultants, and enterprises discover high-value prospects, analyze their digital presence, calculate opportunity ratings, generate bespoke high-conversion outreach copy, and manage sales pipelines.

### Core Architecture Principles:
- **Modular Separation**: Complete isolation of the crawling engine, database layers, front-end views, and multi-agent AI orchestration.
- **Plugin-Based Adaptability**: All integrations (AI models, Databases, SMTP/Email providers, Calendars, CRMs) are structured as hot-swappable interface implementations.
- **Multi-Agent AI Coordination**: Complex tasks are decomposed and assigned to seven specialized micro-agents instead of using a single monolithic prompt.
- **Human-in-the-Loop Security**: Absolutely no direct communication is automated. The system discovers, scores, analyzes, and drafts; the user reviews, modifies, and clicks to approve or send.
- **SaaS-Ready Multi-Tenancy**: The database structure and backend are designed from Day 1 to support multiple workspaces, user roles, organizations, and seat-based subscription plans.

---

## 2. Unrealistic Assumptions, External Services & Reliable Implementation

### A. Analysis of Potential Constraints & Unrealistic Assumptions
1. **Unrestricted Client-Side Scraping**: Directly scraping external business websites from the browser is impossible due to CORS browser protections.
   * *Resolution*: All web scraping and SEO analyses are executed server-side through a dedicated proxy/crawler using `cheerio` and `axios`.
2. **Automated LinkedIn Actions**: Directly automating messages or profile visits on LinkedIn violates LinkedIn's Terms of Service and results in accounts being banned.
   * *Resolution*: The system operates as a **Personalized Companion**—preparing customized clipboard contents, providing direct-action mailto links, and formulating deep links directly to LinkedIn message boxes for manual execution.
3. **Infinite Web Scraping Crawling**: Crawling multi-page websites on an Express backend at scale can cause memory starvation or trigger IP bans.
   * *Resolution*: The crawler is strictly single-page (extracts homepage elements only), token-lean (< 10k characters total), and strictly respects `robots.txt` headers.

### B. Third-Party Services & Official APIs Required
- **AI Engine**: Google Gemini API via `@google/genai` (utilizing `gemini-2.5-flash` for high-speed indexing/analysis and `gemini-2.5-pro` for deep editorial drafts).
- **OAuth Authentication**: Firebase Authentication (configured for local email/password and future Google workspace login).
- **Relational Storage**: PostgreSQL (Google Cloud SQL or Supabase PostgreSQL with local fallback capabilities).
- **Email Delivery (Optional Integration)**: Resend, SendGrid, or Gmail API (with SMTP fallback for manual mailto links).

### C. Challenges in Reliable Extraction
- **Contact Email/Phone Discovery**: Scraping text for contact details is notoriously unreliable due to obfuscation, SPAM-prevention JavaScript, or lack of public exposure on the home page.
   * *Mitigation*: The crawler scans common anchor structures (`href="mailto:..."`, `href="tel:..."`) and social URLs, falling back on an "unassigned contact" card in the CRM where the user can input details manually.

---

## 3. Multi-Agent AI Architecture
The system replaces monolithic prompts with a modular Registry of Micro-Agents, coordinated by an orchestrator. Each agent handles a single task and returns structured JSON conforming to a strict typescript interface.

```
                  ┌──────────────────────┐
                  │   User Request API   │
                  └──────────┬───────────┘
                             ▼
              ┌──────────────────────────────┐
              │    AI Agent Orchestrator     │
              └──────────────┬───────────────┘
                             │
         ┌───────────┬───────┼───────┬───────────┐
         ▼           ▼       ▼       ▼           ▼
     ┌───────┐   ┌───────┐┌───────┐┌───────┐ ┌───────┐
     │Agent 1│   │Agent 2││Agent 3││Agent 4│ │Agent 5│ ... (7 Agents)
     │ Lead  │   │Web    ││Bus.   ││Prop.  │ │  QA   │
     │ Disc  │   │Intel  ││Intel  ││Gen    │ │ Agent │
     └───────┘   └───────┘└───────┘└───────┘ └───────┘
```

### Agent 1 — Lead Discovery Agent
- **Responsibility**: Inspects input business details, identifies primary industries, matches targeted business types, determines website languages, and tags discovered entities.
- **Restriction**: Never attempts to crawl or contact. Only populates basic structured profile information.

### Agent 2 — Website Intelligence Agent
- **Responsibility**: Inspects crawled raw HTML body, headings (`h1`, `h2`), title, description, and anchor metadata. Detects CMS (WordPress, Webflow, Shopify), evaluates responsive tags, lists basic SEO defects, UX formatting issues, and visual trust markers.
- **Output**: JSON containing specific defect markers for SEO, accessibility, mobile responsiveness, and branding.

### Agent 3 — Business Intelligence Agent
- **Responsibility**: Performs SWOT analysis of the lead's services/products based on the crawled text. Evaluates business maturity, identifies clear gaps (e.g., a local clinic missing an online scheduling button, or an agency lacking case studies), and assesses local competitors.
- **Output**: JSON payload outlining 3 strategic strengths, 3 strategic weaknesses, and target customer demographics.

### Agent 4 — Proposal Generator Agent
- **Responsibility**: Merges findings from Agent 2 & 3 with the user's Business Profile. Drafts highly personalized copy tailored to the lead's detected pain points.
- **Channels**: Email drafts, LinkedIn message drafts, contact form drafts, and manual WhatsApp scripts.
- **Constraint**: Natural tone. Excludes clichéd AI jargon (such as "In today's fast-paced digital world", "elevate", "game-changing").

### Agent 5 — Quality Assurance Agent
- **Responsibility**: Audits the drafts produced by Agent 4. Assesses readability, professionalism, personalization, spam risk (frequency of keywords like "guarantee", "free", "million"), and localization style.
- **Self-Healing Loop**: If the computed Spam Risk exceeds 40% or Personalization is below 70%, automatically triggers Agent 4 to regenerate the draft with adjusted constraints.

### Agent 6 — CRM Manager Agent
- **Responsibility**: Evaluates pipeline movements, automatically suggests tasks (e.g., "Schedule follow-up email in 3 days"), categorizes leads based on status shifts, and auto-records logs of actions in the activity timeline.
- **Constraint**: Never communicates externally. Strictly updates data and lists pending reminders.

### Agent 7 — Translation & Localization Agent
- **Responsibility**: Detects primary target language (English, French, Spanish, German, Arabic, Portuguese, Dutch, etc.). Translates and, crucially, *localizes* drafts to conform with regional cultural expectations (e.g., formal German "Sie" vs. casual English, right-to-left layout constraints for Arabic).

---

## 4. Scoring Matrices

### A. Detailed Website Health Category Scores
The platform calculates structural scores (0–100) across 9 distinct criteria, which are then combined using a weighted formula to produce an overall Website Health Score:

$$\text{Health Score} = \sum (\text{Category Score} \times \text{Weight})$$

| Category | Description | Detection Signal | Weight |
| :--- | :--- | :--- | :--- |
| **SEO Basics** | Search Engine friendliness | Meta tags, title tags, heading structure (`h1` count) | 15% |
| **Performance** | Basic responsiveness indicators | Compressed resources, excessive page size, heavy tags | 10% |
| **Mobile UX** | Layout readability on devices | Viewport meta tags, clean link padding, responsive CSS | 15% |
| **Accessibility** | Usability for disabled users | Image alt tags, button labels, high contrast signals | 10% |
| **Branding** | Professional visual consistency | Consistent logo usage, typography structure, cohesive color indicators | 10% |
| **User Experience**| Clean path to conversion | Clear navigation, logical page structure, visible contact info | 15% |
| **Content Quality**| Information completeness | Value propositions, descriptions of offerings, case studies | 10% |
| **Security** | Communication privacy | HTTPS protocol, SSL, clean form submission targets | 10% |
| **Trust Signals** | Social proofs | Reviews, testimonials, active social links, physical address | 5% |

### B. Opportunity Score (0–100)
Determines the likelihood and business value of converting a prospect.
- **High-Scoring Signals**: Poor SEO basics (e.g., missing metadata), no mobile responsive tags, outdated design, missing scheduling widgets, missing email address, low total trust signals.
- **Formula Matrix**:
  * *Low Opportunity (0-30)*: Business website is near perfect, modern, responsive, and secure. Priority: **Low** (Suggested Action: "Monitor for future expansion").
  * *Medium Opportunity (31-60)*: Website is functional but lacks basic SEO elements and modern case studies. Priority: **Medium** (Suggested Action: "Offer basic SEO optimization package").
  * *High Opportunity (61-85)*: Website has broken responsive layouts, lack of clear conversion funnel, or missing key booking systems. Priority: **High** (Suggested Action: "Offer immediate UX and conversion funnel redesign").
  * *Very High Opportunity (86-100)*: Complete lack of secure connection, missing mobile responsive CSS, no clear contact details, or broken CMS pages. Priority: **Very High** (Suggested Action: "Urgent: Deliver custom website redesign mockup proposal").

### C. Outreach Quality Score
Every generated draft is inspected by the QA Agent across:
- **Personalization (0-100)**: Direct reference to lead services, specific website issues, and geographical markers.
- **Spam Risk (0-100)**: Density of trigger words. Must be < 30% to pass QA.
- **Natural Tone (0-100)**: Human likeness assessment. High values indicate short sentences, natural transitions, and conversational English/regional languages.
- **Overall Confidence**: High, Medium, or Low. If overall confidence or personalization fails thresholds, automatic regeneration is initiated.

---

## 5. SaaS-Ready Database Schema (PostgreSQL)

```sql
-- Multi-Tenant Organizations
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    subscription_tier VARCHAR(50) DEFAULT 'free', -- free, pro, enterprise
    usage_limit INT DEFAULT 100, -- Maximum lead analyses per month
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Multi-Tenant Workspaces (Departments or campaigns)
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
    services TEXT[] DEFAULT '{}', -- Array of offered services
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
    ai_analysis_data JSONB DEFAULT '{}', -- Raw JSON report containing SWOT details
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
    original_ai_content TEXT, -- Used to track user changes for feedback learning
    
    -- Draft QA Scoring
    qa_personalization INT DEFAULT 0,
    qa_spam_risk INT DEFAULT 0,
    qa_natural_tone INT DEFAULT 0,
    qa_language_accuracy INT DEFAULT 0,
    qa_confidence VARCHAR(50) DEFAULT 'Medium',
    
    status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, review_required, approved, sent, replied, bounced
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Follow-up Reminders & Operational Tasks
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

-- Audit Trails & History Log (Timeline component source)
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    action_type VARCHAR(100) NOT NULL, -- lead_created, analyzed, draft_generated, draft_approved, status_changed, message_sent
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 6. Directory Structure & Organization
A clean modular approach that supports future enterprise expansion, keeping styling isolated and endpoints organized.

```
/
├── .env.example
├── .gitignore
├── metadata.json
├── package.json
├── tsconfig.json
├── vite.config.ts
├── server.ts                       # Express Backend Entry Point & Vite middleware
├── AGENTS.md                       # Active Project System Memory (Prompt Injection File)
├── docs/
│   └── ARCHITECTURE.md             # This Permanent Specification Document
├── src/                            # Frontend React Architecture
│   ├── main.tsx                    # React client bootstrap
│   ├── App.tsx                     # Primary router and system provider shell
│   ├── index.css                   # Tailwind v4 globals
│   ├── types.ts                    # Centralised TypeScript schema mappings
│   ├── components/                 # Atomic UI structure
│   │   ├── ui/                     # Primitives (Button, Badge, Card, Progress bar, Tabs)
│   │   ├── dashboard/              # Stats panels, Conversion rate, Activity streams
│   │   ├── leads/                  # CRM Pipeline (Kanban), Lead list grids, Detail panels
│   │   └── outreach/               # AI generation Wizard, quality dials, template editor
│   ├── hooks/                      # Query hooks (leads, tasks, profile updates)
│   ├── layouts/                    # Interactive Dashboard Rails & Frame structures
│   └── services/                   # Client-side API proxy communications (Axios wrappers)
└── server/                         # Express Server-side Architecture
    ├── routes/                     # Router segments (leads, analysis, profiles, tasks)
    ├── services/                   # Core business logic
    │   ├── crawler.ts              # Proxy scrapers using axios and cheerio
    │   └── gemini.ts               # Multi-agent SDK prompt pipelines
    ├── db/                         # Migration and pool interfaces
    └── types/                      # Server-only typescript typings
```

---

## 7. API Design Specification

All routes are prefixed with `/api/*` and return clean JSON structures.

| Method | Endpoint | Payload Schema | Success Response (200) |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/profile` | N/A | `BusinessProfile` |
| **PUT** | `/api/profile` | `{ company_name: string, services: string[], tone_of_voice: string }` | `{ status: 'success', profile: BusinessProfile }` |
| **GET** | `/api/leads` | Query params: `status`, `tag` | `Lead[]` |
| **POST** | `/api/leads` | `{ business_name: string, website?: string, email?: string, phone?: string }` | `{ status: 'created', lead: Lead }` |
| **PATCH** | `/api/leads/:id` | `{ status?: string, score_seo?: number, tags?: string[] }` | `{ status: 'updated', lead: Lead }` |
| **DELETE** | `/api/leads/:id`| N/A | `{ status: 'deleted', id: string }` |
| **POST** | `/api/leads/:id/analyze`| N/A | `{ status: 'analyzed', analysis: JSON, scores: Scores }` |
| **POST** | `/api/leads/:id/draft`| `{ channel: 'email' \| 'linkedin' \| 'contact_form' \| 'whatsapp' }` | `{ status: 'drafted', message: OutreachMessage }` |
| **GET** | `/api/dashboard/stats`| N/A | `{ leadCounts: Object, conversionFunnel: Array, pipelineDistribution: Array }` |
| **GET** | `/api/tasks` | N/A | `Task[]` |
| **POST** | `/api/tasks` | `{ lead_id: string, title: string, due_date: string }` | `{ status: 'created', task: Task }` |
| **PATCH** | `/api/tasks/:id` | `{ is_completed: boolean }` | `{ status: 'updated', task: Task }` |

---

## 8. Plugin-Based & Connector Architecture
All external resources are mounted through Abstract Classes or standard interfaces, ensuring easy integration of future services without core modifications.

### A. Integrated Provider Registries
- **AI Engine Registry**: Allows swapping between Google Gemini, OpenAI, or Anthropic.
  ```typescript
  interface AIServiceConnector {
    analyzeWebsite(htmlContent: string): Promise<WebsiteAnalysisData>;
    generateDraft(persona: BusinessProfile, analysis: WebsiteAnalysisData, channel: string): Promise<DraftContent>;
  }
  ```
- **DB Driver Connector**: Standardizes storage queries. Allows seamless transitions between SQLite local simulation, Cloud SQL PostgreSQL, or Supabase.
- **Email Delivery Interface**: Supports manual email triggers via `mailto` or premium integrations (Resend, SMTP, SendGrid).

---

## 9. Security & Output Quality Controls
- **API Key Leakage Prevention**: All SDK instances are initialized on the server-side. Absolutely no `GEMINI_API_KEY` or custom parameters are mapped to client-side `import.meta.env` objects.
- **HTML Crawl Isolation**: Crawled website HTML payloads are never parsed or rendered in the React UI as active DOM elements. They are processed purely as text structures to eliminate any Cross-Site Scripting (XSS) vectors.
- **Query Parameterization**: Every database query, filtering block, or CRM list is constructed using parameterized query strings or safe ORM schemas.

---

## 10. Implementation & Development Roadmap

### Phase 1: Core Foundation & CRM Pipeline (Sprint 1)
- **Objective**: Establish the robust full-stack shell, Express API routes, mock database seeders, and visual pipeline dashboard.
- **Highlights**:
  - Interactive pipeline Kanban board supporting drag-and-drop actions.
  - Organization profile settings (Business Profile Manager).
  - Manual Lead creation sheets and lead lists.

### Phase 2: Crawler Engine & AI Audit Integration (Sprint 2)
- **Objective**: Integrate the Express website scraping logic and model-binding handlers.
- **Highlights**:
  - Server-side crawler fetching title, headings, meta tags, and accessibility hooks.
  - Gemini-powered Website Intelligence and Business SWOT analysis pipelines.
  - Real-time display of multi-metric health scores and opportunity prioritization tiers.

### Phase 3: Personalized Proposals & Multi-Language Translation (Sprint 3)
- **Objective**: Implement multi-language template generation and QA validation cycles.
- **Highlights**:
  - AI Drafting interface with active QA checks (personalization meter, spam dials).
  - Language detection and localization filters.
  - Copy-to-clipboard, mailto links, and LinkedIn jump boxes.

### Phase 4: Full CRM Dashboard, Follow-ups, and Charts (Sprint 4)
- **Objective**: Modern dashboard charts, tasks, reminders, and historical pipelines.
- **Highlights**:
  - Conversion funnel and response monitoring charts with Recharts.
  - Follow-up reminder list and activity timeline logs.

---

## 11. Testing & Verification Protocols
- **Build and Lint Assertions**: Run `npm run lint` and `npm run build` after any module completion to verify type safety and Vite production bundler compliance.
- **Unit Sandbox Integrity**: Maintain mocks for scraper HTTP calls to test the Gemini prompt formatting reliably.
- **Client Route Transitions**: Use `framer-motion` layout animations to facilitate visually polished transitions between pipeline cards and deep lead information drawers.

---

This specification serves as the permanent Version 1.1 architectural standard for the AI Outreach Platform & Sales CRM. Future development turns must strictly comply with this modular format.
