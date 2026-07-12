# Security Architecture & Compliance Specification (v1.0.0)

This document establishes the security specifications, cryptographic controls, policy alignments, and architectural mitigations engineered to protect the **AI Outreach Platform & Sales CRM** against modern attack vectors.

---

## 🔒 1. Authentication & Session Hygiene

- **Backend Authentication Verification**: The platform implements session-token and JSON Web Token (JWT) strategies to authenticate every request.
- **Firebase Authentication Alignment**: Multi-tenant organizations leverage Firebase Auth, supporting email/password hashes and federated SSO (Google Identity Provider).
- **Client Session Rules**:
  - Secure, HTTP-Only, SameSite=Strict cookies protect session markers against Cross-Site Scripting (XSS).
  - Client-side routes are guarded by a robust authentication state listener that halts render actions if a session is invalid.
  - Automatic session timeouts trigger logout operations after 30 minutes of user inactivity.

---

## 🛡️ 2. Role-Based Access Control (RBAC)

The application enforces strict resource separation using a modular tenant role matrix.

| Role | Permissions | Scope Limitation |
| :--- | :--- | :--- |
| **Owner** | Full workspace management, billing, credentials, users | Full administrative control of Organization |
| **Admin** | Workspace configurations, lead management, model updates | Restricted from modifying parent subscription tier |
| **Member** | Create leads, trigger analyses, edit outreach proposals | Cannot edit organization settings or workspaces |
| **Viewer** | Read dashboards, review pipelines, view proposals | Read-only access; mutations are blocked |

Backend endpoints intercept payload queries, comparing the authenticated user's `role` and `org_id` against requested resource IDs before executing modifications:

```typescript
// Conceptual middleware validation
if (user.role !== 'owner' && targetResourceId !== user.workspace_id) {
  return res.status(403).json({ error: "Access denied. Insufficient RBAC clearance." });
}
```

---

## 🌐 3. Content Security Policy (CSP) & CORS Alignment

### Express CORS Configuration
CORS is restricted to authorized origins in production. Wildcards (`*`) are strictly prohibited:

```typescript
import cors from 'cors';

const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:3000'];

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
});
```

### Content Security Policy (CSP)
The platform enforces strict CSP directives to block unapproved script injections, frame hijacking, and data-exfiltration pathways:

```text
Content-Security-Policy: default-src 'self'; 
                         script-src 'self' 'unsafe-inline'; 
                         style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; 
                         img-src 'self' data: https: referrerPolicy; 
                         connect-src 'self' https://generativelanguage.googleapis.com; 
                         font-src 'self' https://fonts.gstatic.com; 
                         frame-ancestors 'none';
```

---

## 🚫 4. Prevention of Common Vulnerabilities

### A. Cross-Site Scripting (XSS) Mitigation
1. **Sanitization**: The server-side crawler fetches website HTML and strips all `<script>`, `<style>`, `<iframe>`, `<object>`, and `on*` inline triggers before storage or parsing.
2. **Safe Render Controls**: The React UI renders crawled metadata strictly as sanitized text templates. It never uses `dangerouslySetInnerHTML` for unverified crawled content.

### B. SQL Injection Protection
When connecting to PostgreSQL, every SQL statement is executed using **parameterized queries** or structured Drizzle/ORM clauses. Dynamic string concats (`SELECT ... WHERE id = ` + userInput) are strictly banned in the codebase.

### C. Server-Side Request Forgery (SSRF) Defense
The crawler engine executes external HTTP queries. To prevent attackers from forcing the server to crawl internal local infrastructure (e.g., calling `http://169.254.169.254/latest/meta-data/` on GCP or AWS), the proxy engine:
1. Resolves input URLs to their underlying IP addresses.
2. Rejects request sequences matching private, local, loopback, or multicast subnets (e.g., `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`).
3. Blocks connections to non-standard HTTP/HTTPS ports (restricting crawlers strictly to `80` and `443`).

### D. File Upload Validation
To prevent Remote Code Execution (RCE) via malicious uploads:
- File uploads are validated strictly against an approved list of MIME types (e.g., `.pdf`, `.png`, `.jpg`, `.csv`).
- File sizes are limited to a maximum of 5MB.
- Uploaded file streams are stored on isolated Cloud Storage buckets (like Google Cloud Storage) with standard object encryption rather than write-executing them on the local container's disk.

---

## ⚙️ 5. Secret Management & Compliance Hygiene

- **API Secret Isolation**: All private credentials (`GEMINI_API_KEY`, `DATABASE_URL`) are strictly kept on the Express backend server. They are **never** prefixed with `VITE_` or exposed to browser bundles.
- **Audit Logging**: A durable, tamper-evident audit ledger records every security-sensitive action, including user authentication events, API key updates, database structure revisions, and outreach approvals.
