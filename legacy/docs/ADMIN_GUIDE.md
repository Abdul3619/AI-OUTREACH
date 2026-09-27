# Workspace Administrator Guide (v1.0.0)

This guide is designed for workspace administrators, SaaS product managers, and operations leads. It covers tenant management, access controls, user provisioning, usage policies, and billing limits for the **AI Outreach Platform & Sales CRM**.

---

## 🏢 1. Tenant Multi-Tenancy Architecture

The platform supports robust multi-tenant organization boundaries out-of-the-box. All data, including lead records, activities, drafts, tasks, and settings, is tightly partitioned using unique organization UUIDs (`org_id`).

- **Organizations**: Represent companies or parent agencies.
- **Workspaces**: Represent individual departments, client portfolios, or specific sales campaigns within an organization.
- **Users**: Bound to an organization with a defined access role.

---

## 👥 2. User Roles & Security Matrix

Administrators can configure permissions by assigning specific RBAC roles.

| Role | CRM Operations | Settings & API Keys | Billing & Limits | User Management |
| :--- | :--- | :--- | :--- | :--- |
| **Owner** | Full CRUD | Edit All | Modify Tiers | Invite & Delete |
| **Admin** | Full CRUD | Edit All | Read-only | Invite Only |
| **Member** | CRUD Leads/Drafts | Read-only | Read-only | No access |
| **Viewer** | Read-only | Read-only | No access | No access |

### To Invite a User:
1. Navigate to **Settings** > **Team Members**.
2. Click **+ Invite Member**.
3. Input the user's email, full name, and assign their RBAC role.
4. Click **Send Invitation**. The user will receive an invitation link bound to your organization's unique `org_id`.

---

## 📈 3. Billing & Usage Limits

To prevent API abuse and cost overrun, administrators can enforce monthly analysis limits based on the organization's subscription tier:

```text
 [Free Tier] ──► Max 10 Lead Audits/mo ──► Single Workspace
 [Pro Tier]  ──► Max 250 Lead Audits/mo ──► Multi-Workspace Support
 [Enterprise]──► Unlimited Audits ──► Custom SLAs & Dedicated Models
```

### Configuring Usage Limits:
1. Navigate to the **Admin Dashboard** > **Billing & Usage**.
2. Set the active **Subscription Tier** (Free, Pro, Enterprise).
3. Specify the **Usage Limit** (e.g., `100` analyses per month).
4. The system automatically monitors model invocations. If an organization exceeds its quota, further website audits are halted and the user is prompted to upgrade.

---

## ⚙️ 4. Customizing Default Templates & Tones

Workspace Administrators can define global outreach templates and baseline constraints to align and maintain brand tone across all team members.

1. Navigate to **Settings** > **Outreach Preferences**.
2. Configure **Global Exclusion Rules**:
   - Add blacklisted phrases or keywords you wish the generator agent to never include (e.g., *"game-changing"*, *"guarantee"*, *"no cost"*).
3. Set **Baseline Portfolio Links**:
   - Enforce default case studies that should be attached based on the detected industry type of the target lead.
4. Save the template. These rules will act as high-priority constraints for **Agent 4 (Proposal Generator)** and **Agent 5 (QA Auditor)** across all workspaces.

---

## 🧹 5. Data Hygiene & Security Auditing

Administrators should routinely review the Workspace Audit Logs to ensure secure and clean operation:

- **Audit Log Inspection**: Accessible under **Settings** > **System Logs**. Reviews login attempts, model usage bursts, and lead deletion audits.
- **Orphaned Record Cleanup**: If an administrator deletes a custom workspace, the system automatically triggers a cleanup cascade, removing all child leads, tasks, activity history, and outreach drafts to comply with data privacy policies (GDPR/CCPA).
