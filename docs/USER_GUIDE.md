# End-User Operation Guide (v1.0.0)

Welcome to the **AI Outreach Platform & Sales CRM**. This guide is designed to walk sales development reps, agency owners, consultants, and business analysts through the complete lifecycle of finding leads, auditing their digital presence, and sending customized high-conversion outreach proposals.

---

## 🗺️ The Core Workflow

The platform operates on a safe, compliant **Human-in-the-Loop** model. The system automates the tedious parts—finding technical gaps, drafting SWOT analyses, and styling proposals—while you remain the final reviewer before any outreach is dispatched.

```text
 [1. Add Lead] ──► [2. Analyze Site] ──► [3. Review SWOT & Scores] ──► [4. Draft AI Proposal] ──► [5. Refine & Send]
```

---

## 👤 Step 1: Configure Your Sender Profile

Before analyzing leads, establish your company's identity so the AI can align proposal hooks with your actual offerings.

1. Click on the **Settings** icon in the sidebar.
2. Select the **Business Profile** tab.
3. Define your company details:
   - **Company Name**: e.g., *Aura Web Studios*
   - **Industry**: e.g., *Digital Design & Local SEO Agency*
   - **Offered Services**: Add specific services like *Webflow Development, Google Maps Optimization, Site Speed Audit*.
   - **Tone of Voice**: Align with your target audience (*Consultative, Authoritative, Friendly, or Direct*).
   - **Portfolio/Case Studies**: Input links to showcase your historical work.
4. Click **Save Settings**.

---

## 👥 Step 2: Adding and Discovering Leads

You can manage your outreach targets inside the interactive **Pipeline** or the structured **Leads Grid**.

### Adding a Lead Manually:
1. Click the **Pipeline** or **Leads** tab in the sidebar.
2. Click the **+ Add Lead** button.
3. Input basic information:
   - **Business Name** (Required)
   - **Website URL** (Crucial for AI audit)
   - **Primary Contact Email & Phone**
   - **City / Country**
4. Click **Save Lead**. The lead will enter the pipeline under the **Discovered** column.

---

## 🔍 Step 3: Triggering Website Audits & SWOT Reports

Once a lead is added with a valid website, you can execute a server-side audit.

1. Locate your lead in the Pipeline or Leads list and click on their name to open the **Lead Dossier Drawer**.
2. Click the **Run AI Website Audit** button.
3. The server crawler will parse the home page and return:
   - **Website Health Score (0-100)**: Evaluated across 9 critical pillars (SEO, Mobile UX, Performance, Accessibility, Branding, Conversion Funnel, Content Quality, Security, Social Trust).
   - **Opportunity Score (0-100)**: Translates technical defects into sales urgency (classified as *Low, Medium, High, or Very High*).
   - **SWOT Analysis Grid**: Synthesizes the business's actual strengths, technical weaknesses, market opportunities, and local competitive threats.

---

## ✍️ Step 4: Crafting the Proposal Sequence

After completing the technical audit, navigate to the **Outreach Drafts** tab in the Lead Dossier to generate custom copy.

1. Select your target outreach **Channel**:
   - ✉️ **Email**: Long-form structured proposal with custom subject lines.
   - 💼 **LinkedIn**: Conversational, low-friction, high-impact messages.
   - 📱 **WhatsApp**: Short, responsive greeting script.
   - 🌐 **Contact Form**: Tailored for website contact inquiry boxes.
2. Adjust your **Tone** and **Target Language** (supporting English, French, Spanish, German, Arabic, Portuguese, and more).
3. Click **Generate Draft**. The Proposal Agent will write customized copy highlighting the exact defects found during the crawl (e.g., calling out a missing viewport tag on a beauty clinic's site).

---

## 🧪 Step 5: QA Dialing & Manual Refinement

Before approving a proposal, inspect the automated quality metrics calculated by the QA Agent:

- **Personalization Index**: Measures how deeply the copy references the lead's actual services and technical defects. (Aim for > 70%).
- **Spam Risk Dial**: Scans the draft for blacklisted spam trigger words like "guarantee, free, fast cash". (Enforced < 30%).
- **Natural Tone Rating**: Evaluates sentence flow to ensure it reads like a human authored it.

### Refinement Controls:
- **Interactive Editor**: Edit the draft text directly inside the browser.
- **Refinement Prompts**: Type a customized instruction like *"make it shorter"* or *"emphasize our 100% guarantee on local booking widgets"* and click **Refine** to have the model rewrite the copy with your feedback.
- **Outreach Dispatches**:
  - Click **Copy to Clipboard** for social channels.
  - Click **Draft Email (mailto)** to instantly load the recipient, subject line, and proposal body directly inside your computer's native email client (Outlook, Mail, or Gmail).

---

## 📅 Step 6: Pipeline Progression & Reminders

1. Once a proposal is approved, drag the lead's card in the Kanban Pipeline from **Outreach Ready** to **Contacted**.
2. To avoid losing track of prospects, scroll to the **Tasks & Reminders** card in the Lead Dossier.
3. Click **+ Add Task** and schedule a follow-up reminder (e.g., *"Send follow-up email if no reply"* due in 3 days).
4. Automated alerts on your workspace dashboard will flag when follow-ups are overdue, helping you maintain a consistent sales cadence.
