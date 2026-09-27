# Operations, Monitoring & Central Logging Guide (v1.0.0)

This guide details operational workflows, logging practices, system monitoring structures, and alerting procedures to ensure high availability and clean performance of the **AI Outreach Platform & Sales CRM**.

---

## 🏥 1. System Health & Ingress Monitoring

The application exposes a lightweight, authenticated health check endpoint at `/api/health`. Monitoring platforms (such as Google Cloud Monitoring or UptimeRobot) should poll this endpoint every 30 seconds to confirm runtime availability:

- **Endpoint**: `/api/health`
- **Response Format (200 OK)**:
  ```json
  {
    "status": "healthy",
    "timestamp": "2026-07-12T00:50:00.000Z",
    "version": "1.0.0",
    "database": {
      "status": "connected",
      "latencyMs": 14
    },
    "crawler": {
      "status": "online"
    },
    "memory": {
      "rssMb": 84.12,
      "heapUsedMb": 42.85
    }
  }
  ```

If the database is unreachable or latency exceeds 500ms, the endpoint returns a `503 Service Unavailable` payload, allowing load balancers to isolate and recycle the container automatically.

---

## 🪵 2. Structured Log Management

The server leverages a structured logging engine that outputs to `stdout` in JSON format during production, allowing easy integration with central log aggregators (GCP Cloud Logging, Datadog, ELK, or Grafana Loki):

### Format Schema:
```json
{
  "timestamp": "2026-07-12T00:50:05.182Z",
  "level": "INFO",
  "module": "AI_ORCHESTRATOR",
  "message": "Outreach proposal draft generated successfully via Agent 4.",
  "metadata": {
    "leadId": "lead-mock-2",
    "channel": "email",
    "durationMs": 1284,
    "tokensUsed": 1542
  }
}
```

### Logging Categories:
- `DATABASE`: Connection pools, query performance, schema updates, cache syncs.
- `CRAWLER`: Proxy request attempts, response statuses, HTML sanitization sizes.
- `AI_ORCHESTRATOR`: System prompt evaluations, response parsing statuses, self-healing QA iterations.
- `CRM`: Sales pipeline stage movements, user deletions, lead exports.
- `PLUGIN_REGISTRY`: Integrations mounting, third-party webhook ingestions.

---

## 📈 3. Centralized Performance Dashboards

Operating teams should establish dashboards tracking key system performance indicators (KPIs) through Google Cloud Monitoring or Datadog:

### A. Infrastructure Metrics
- **CPU Utilization**: Maintain average usage < 70%. Set scaling thresholds to provision new containers when usage exceeds 80% for 3 minutes.
- **Memory Consumption**: Track heap usage. Memory leaks on Node are flagged if heap size grows linearly without resetting during garbage collection cycles.
- **HTTP Latency**: Track 95th and 99th percentile response times. Maintain api request latency < 150ms.

### B. AI Operations & Cost Metrics
- **API Token Tracking**: Monitor input/output token volume processed by Google Gemini.
- **AI Latency**: Track time-to-first-token for proposal creation. (Avg: `~2` seconds for 2.5-flash).
- **QA Healing Rates**: Monitor the percentage of proposals that fail Agent 5's quality check and trigger auto-regeneration. (Maintain below 15%).

### C. Plugin & Connector Health
- Track request success rates for active third-party connectors (such as SMTP mail gateways or custom CRM bridges). Flag any connector exhibiting an error rate > 5% over a 10-minute window.

---

## 🚨 4. Alerting Thresholds

We recommend configuring immediate alert notifications (via Slack, PagerDuty, or email) for the following edge cases:

| Trigger Condition | Target | Severity | Suggested Action |
| :--- | :--- | :--- | :--- |
| `/api/health` returns non-200 | Any Instance | **Critical** | Page on-call; trigger automatic container reboot |
| DB Connection Latency > 1000ms | PostgreSQL | **High** | Inspect active connection pool and PostgreSQL CPU utilization |
| Gemini API returns 429 Rate Limit | AI Engine | **Medium** | Increase quota allotment; verify retry-backoff schedules |
| CRM Proposal Failure Rate > 10% | AI Engine | **High** | Review system instruction boundaries and JSON parsing safety |
| Unauthorized login attempts > 50 | Identity | **High** | Trigger temporary rate limiter block; review audit log IPs |

---

## 💾 5. Backup Schedules & Disaster Recovery (DR)

The platform enforces a multi-tier backup approach to guarantee data integrity:

1. **Cloud SQL PostgreSQL (Primary)**: Managed automated backups are executed daily during off-peak hours (02:00 AM UTC). Keep a 30-day snapshot history.
2. **Integrated File DB Fallback (Secondary)**: The JSON state store automatically captures safe snapshots, packing them into `/backups/database-store-backup-[timestamp].json` every 24 hours. The local filesystem holds a maximum of 7 rolling backup files.
3. **Recovery Time Objective (RTO)**: Target < 15 minutes.
4. **Recovery Point Objective (RPO)**: Target < 24 hours.
