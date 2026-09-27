# REST API Reference (v1.0.0)

This reference outlines the system API endpoints, payload configurations, response schemas, and error codes for the **AI Outreach Platform & Sales CRM**. All endpoint routes are prefixed with `/api/*`.

---

## 🔑 Authentication Headers

Every HTTP request sent to protected routes must include a secure Bearer token inside the `Authorization` header:

```http
Authorization: Bearer <your_session_token>
Content-Type: application/json
```

---

## 🏢 1. Sender Profiles & Settings

### GET `/api/profile`
Retrieves the sender's active business profile.

- **Response (200 OK)**:
  ```json
  {
    "id": "profile-uuid",
    "workspaceId": "workspace-uuid",
    "companyName": "Alpha Tech Solutions",
    "industry": "Software Development & SEO Agency",
    "services": ["Website Redesign", "SEO Optimization", "Booking Integrations"],
    "targetAudience": "Local medical clinics and specialized law firms lacking a mobile presence",
    "toneOfVoice": "consultative",
    "portfolioLinks": ["https://alphatech-portfolio.com"],
    "createdAt": "2026-07-12T00:00:00.000Z",
    "updatedAt": "2026-07-12T00:50:00.000Z"
  }
  ```

---

### PUT `/api/profile`
Updates the sender's active business profile.

- **Payload**:
  ```json
  {
    "companyName": "Alpha Tech Solutions",
    "industry": "Digital Transformation Agency",
    "services": ["UX redesign", "Local SEO audits", "Speed optimization"],
    "toneOfVoice": "authoritative"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "status": "success",
    "profile": { ... }
  }
  ```

---

## 👥 2. Lead CRM Management

### GET `/api/leads`
Lists leads filtered by workspace, status, or tags.

- **Query Parameters**:
  - `status`: Filter by CRM state (e.g., `discovered`, `qualified`, `analyzed`, etc.)
  - `tag`: Filter by specific lead tag arrays.
- **Response (200 OK)**:
  ```json
  [
    {
      "id": "lead-mock-1",
      "businessName": "Green Valley Medical",
      "website": "https://greenvalleymedical-example.com",
      "industry": "Healthcare & Medical",
      "status": "discovered",
      "websiteHealthScore": 50,
      "opportunityScore": 78,
      "opportunityPriority": "High",
      "tags": ["outdated-design", "missing-scheduler"],
      "createdAt": "2026-07-07T00:44:52.000Z"
    }
  ]
  ```

---

### POST `/api/leads`
Creates a new lead profile in the active workspace.

- **Payload**:
  ```json
  {
    "businessName": "Silverline Dental",
    "website": "https://silverlinedental-example.com",
    "industry": "Healthcare & Medical",
    "city": "Chicago",
    "country": "USA"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "status": "created",
    "lead": {
      "id": "lead-new-uuid",
      "businessName": "Silverline Dental",
      "website": "https://silverlinedental-example.com",
      "status": "discovered",
      "websiteHealthScore": 0,
      "opportunityScore": 0,
      "opportunityPriority": "Medium",
      "createdAt": "2026-07-12T00:50:00.000Z"
    }
  }
  ```

---

### PATCH `/api/leads/:id`
Updates fields of an existing lead (e.g., status changes, tags updates).

- **Payload**:
  ```json
  {
    "status": "qualified",
    "tags": ["qualified-lead", "high-value"]
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "status": "updated",
    "lead": { ... }
  }
  ```

---

### DELETE `/api/leads/:id`
Permanently deletes a lead profile from the active workspace.

- **Response (200 OK)**:
  ```json
  {
    "status": "deleted",
    "id": "lead-new-uuid"
  }
  ```

---

## 🔍 3. Crawling & AI Analytics

### POST `/api/leads/:id/analyze`
Triggers the server-side proxy crawler to scrape the lead's website and executes the multi-agent SWOT and scoring analysis pipelines.

- **Response (200 OK)**:
  ```json
  {
    "status": "analyzed",
    "scores": {
      "scoreSeo": 35,
      "scorePerformance": 45,
      "scoreMobile": 20,
      "scoreAccessibility": 50,
      "scoreBranding": 70,
      "scoreUx: "30",
      "scoreContent": 60,
      "scoreSecurity": 40,
      "scoreTrust": 50,
      "websiteHealthScore": 45,
      "opportunityScore": 82,
      "opportunityPriority": "High"
    },
    "swot": {
      "strengths": ["Clean logo branding", "Has complete list of services"],
      "weaknesses": ["No viewport responsive tags", "Completely missing online booking button"],
      "opportunities": ["Propose responsive Webflow rebuild", "Suggest simple appointment widget integration"],
      "threats": ["Competitors down the street utilize active Calendly links"]
    }
  }
  ```

---

## ✉️ 4. Proposal Generation

### POST `/api/leads/:id/draft`
Triggers the multi-agent Proposal Generator (Agent 4) to write a customized outreach sequence based on crawled intelligence, active tone, and channel.

- **Payload**:
  ```json
  {
    "channel": "email",
    "tone": "consultative",
    "language": "en"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "status": "drafted",
    "message": {
      "id": "msg-uuid",
      "leadId": "lead-mock-1",
      "channel": "email",
      "subjectLine": "Quick suggestions for Green Valley Medical's mobile layout",
      "bodyContent": "Dear Green Valley Medical Team, ...",
      "qaScore": {
        "personalization": 88,
        "spamRisk": 12,
        "naturalTone": 95,
        "confidence": "High"
      }
    }
  }
  ```

---

## 📊 5. Dashboard Analytics

### GET `/api/dashboard/stats`
Retrieves aggregated CRM analytics, pipeline distributions, and conversion funnel ratios.

- **Response (200 OK)**:
  ```json
  {
    "totalLeads": 24,
    "stages": {
      "discovered": 10,
      "qualified": 6,
      "analyzed": 4,
      "outreach_ready": 2,
      "contacted": 1,
      "replied": 1
    },
    "funnel": [
      { "stage": "Discovery", "count": 24, "pct": 100 },
      { "stage": "Analysis", "count": 12, "pct": 50 },
      { "stage": "Outreach", "count": 6, "pct": 25 },
      { "stage": "Won", "count": 2, "pct": 8 }
    ],
    "averageOpportunityScore": 64.5
  }
  ```
