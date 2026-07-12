# System Installation & Setup Guide (v1.0.0)

This document provides step-by-step instructions to install, configure, and run the **AI Outreach Platform & Sales CRM** in development and local server environments.

---

## 📋 System Requirements

Ensure your machine meets the following prerequisites before initiating installation:

- **Node.js**: `v18.x` or higher (LTS recommended)
- **Package Manager**: `npm v9.x` or higher
- **Operating System**: Linux, macOS, or Windows (WSL recommended)
- **External Dependencies**: 
  - Access to a Google Gemini API key (Required for AI features)
  - PostgreSQL Database (Optional; falling back automatically to the integrated file system state)

---

## 🛠️ Step 1: Clone & Repository Setup

Extract or clone the project files into your chosen local workspace directory:

```bash
# Navigate to your workspace directory
cd /your/local/workspace/ai-outreach-crm

# Verify the file structure
ls -la
```

---

## 📦 Step 2: Dependency Installation

This project utilizes a highly unified full-stack architecture with a single root `package.json`. Run npm to download and cache required libraries:

```bash
# Install root package dependencies
npm install
```

The system automatically resolves packages for both frontend (React, Tailwind, Recharts, Lucide Icons, Framer Motion) and backend (Express, `@google/genai`, axios, cheerio, tsx, esbuild).

---

## 🔑 Step 3: Environment Configuration

To enable AI and external services, copy the example environment file and populate it with your private keys:

```bash
# Copy template configuration
cp .env.example .env
```

Open `.env` in your text editor and specify required variables:

```env
# Server Ingress Settings
PORT=3000
NODE_ENV=development

# Gemini API Key (Required for multi-agent crawls and drafting)
GEMINI_API_KEY=AIzaSyYourGeminiAPIKeyHere

# Optional Database Configurations (Uses local JSON storage if omitted)
# DATABASE_URL=postgresql://user:password@localhost:5432/outreach_crm
```

*Note: The database client uses a robust local file fallback (`database-store.json`) when `DATABASE_URL` is undefined, allowing instant evaluation without manual database installation.*

---

## 🚀 Step 4: Launching Development Services

Start the unified development server. The backend runs on Node.js using native TypeScript parsing (`tsx`), mounting the Vite frontend compiler as an integrated dev middleware:

```bash
# Run the application in development mode
npm run dev
```

Upon running, you should observe output logs similar to:
```text
[Database] Loaded and verified JSON database state successfully
[Server] Unified full-stack server starting...
[Server] Express listening on http://0.0.0.0:3000 in development mode
```

Open your browser and navigate to **`http://localhost:3000`** to access the platform.

---

## 🏗️ Step 5: Seeding Sample Data (Demo Mode)

The system automatically populates the database with polished, high-quality sample records on the very first boot if the file store or database is empty.

To trigger a complete clean reset and force re-seeding of the database:
1. Stop the active terminal server (`Ctrl + C`).
2. Delete the local cache file: `rm -f database-store.json`.
3. Restart the server with `npm run dev`.

This seeds:
- 1 default Multi-Tenant Organization and Workspace.
- A customized Sender Business Profile focusing on SEO, Web Apps, and Conversion Funnels.
- 3 highly-detailed mock leads (with pre-calculated Health & Opportunity scores).
- Polished, realistic activity feeds, task reminders, and pre-constructed outreach proposals.

---

## 🧪 Step 6: Code Quality Verification

Before committing changes, ensure your codebase complies with all type-safety and formatting standards:

```bash
# Run the TypeScript type-checker
npm run lint
```

If any errors arise, double-check your TS config or imports. To test the production build locally:

```bash
# Compile and package static/server files
npm run build

# Start the compiled release bundle
npm run start
```
This confirms that the production builder is ready for live Cloud deployment.
