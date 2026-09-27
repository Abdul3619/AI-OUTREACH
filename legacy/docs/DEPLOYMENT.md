# Production Deployment Guide (v1.0.0)

This guide outlines deployment procedures to package, containerize, and run the **AI Outreach Platform & Sales CRM** on production infrastructure, emphasizing Google Cloud Run and cloud-hosted PostgreSQL (Cloud SQL).

---

## 🏗️ 1. Modern Bundled Build Process

The platform utilizes a customized production bundling pipeline managed by Vite and Esbuild. When running `npm run build`, the system:

1. Compiles frontend assets through **Vite** with strict code-splitting, tree-shaking, and minification, exporting the single-page app into `/dist`.
2. Packages the backend Express server via **Esbuild** into a highly-optimized, compiled CommonJS module at `/dist/server.cjs`.
3. Isolates external NPM packages natively via `--packages=external` to maintain clean library boundaries.

```bash
# Compile and build the entire full-stack application
npm run build
```

This ensures the container cold-start is extremely fast because Node doesn't need to resolve hundreds of relative TypeScript imports on boot.

---

## 🐋 2. Docker Containerization

Below is the production-grade `Dockerfile` designed for hosting the platform on serverless runtimes like Google Cloud Run or AWS Fargate:

```dockerfile
# Step 1: Base Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies first for layer caching
COPY package*.json ./
RUN npm ci

# Copy codebase and compile applet
COPY . .
ENV NODE_ENV=production
RUN npm run build

# Step 2: Production Execution Stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy compiled build artifacts from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/metadata.json ./metadata.json

# Bind app to all interfaces
EXPOSE 3000

# Start server using the compiled CJS launcher
CMD ["npm", "run", "start"]
```

---

## 🚀 3. Deploying to Google Cloud Run

Google Cloud Run is the recommended hosting platform, providing scalable scale-to-zero compute.

### Step 3.1: Build and Push Docker Image
Configure your local CLI with Google Cloud SDK credentials and push the built image to Google Artifact Registry:

```bash
# Set variables
PROJECT_ID="your-gcp-project-id"
REGION="europe-west1"
REPO_NAME="outreach-crm"
IMAGE_NAME="platform:v1.0.0"

# Build the image using Google Cloud Build
gcloud builds submit --tag gcr.io/${PROJECT_ID}/${IMAGE_NAME} .
```

### Step 3.2: Configure Google Cloud SQL (PostgreSQL)
1. Create a Cloud SQL (PostgreSQL) instance in the same region:
   ```bash
   gcloud sql instances create outreach-db \
       --database-version=POSTGRES_15 \
       --tier=db-f1-micro \
       --region=${REGION}
   ```
2. Set a secure password for the root `postgres` user.
3. Create the database:
   ```bash
   gcloud sql databases create outreach_crm --instance=outreach-db
   ```

### Step 3.3: Deploy the Container to Cloud Run
Deploy the compiled container, ensuring that your `GEMINI_API_KEY` is securely injected from Google Secret Manager rather than exposing it as plain-text env:

```bash
gcloud run deploy outreach-platform \
    --image=gcr.io/${PROJECT_ID}/${IMAGE_NAME} \
    --platform=managed \
    --region=${REGION} \
    --allow-unauthenticated \
    --port=3000 \
    --set-env-vars="NODE_ENV=production" \
    --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY_SECRET:latest,DATABASE_URL=DATABASE_URL_SECRET:latest"
```

---

## 🌍 4. SSL, Domain Binding, and Security Headers

1. **Domain Mapping**: Google Cloud Run automatically generates fully-managed, auto-renewing SSL certificates (HTTPS) for your custom domains.
2. **Reverse Proxy Configuration**: In front-end routing systems, ensure the reverse proxy (Nginx or Cloudflare) forces traffic redirection from HTTP to HTTPS.
3. **Strict Headers**: The Express server automatically attaches security-hardened headers through Helmet in production.

---

## 🔄 5. Rollback Procedures

If an issue arises on production:

1. **Query Active Revisions**:
   ```bash
   gcloud run revisions list --service=outreach-platform --region=${REGION}
   ```
2. **Instant Rollback**: Direct 100% of incoming production traffic back to the previous stable revision instantly:
   ```bash
   gcloud run services update-traffic outreach-platform \
       --region=${REGION} \
       --to-revisions=outreach-platform-prev-revision-id=100
   ```
This provides zero-downtime rollbacks.

---

## 💾 6. Database Backups & Recovery

- **PostgreSQL CloudSQL Backups**: Enable automated daily backups and point-in-time recovery (PITR) with a minimum retention window of 7 days:
  ```bash
  gcloud sql instances patch outreach-db --backup-start-time=02:00 --enable-bin-log
  ```
- **Local Fallback Backups**: When running in single-instance local file environments, the system schedules automated file state mirroring of `database-store.json` to the `/backups/` folder every 24 hours. Keep this folder on persistent storage volumes (PVs).
