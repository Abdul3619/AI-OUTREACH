import { Router, Request, Response, NextFunction } from 'express';
import { db, ActivityLogRepository } from '../db/index.ts';
import { logger } from '../services/logging.ts';
import { ProposalMemoryEntry, User, OrgRole, Workspace, LeadStatus } from '../../src/types.ts';

const router = Router();

// Helper to generate a short ID
const genId = (prefix: string) => `${prefix}-${Math.random().toString(36).substring(2, 9)}`;

// Initialize default settings arrays if missing
const ensureSettingsKeys = () => {
  if (!db.settings.knowledgeBase) {
    db.settings.knowledgeBase = [
      {
        id: 'kb-1',
        title: 'Alpha Tech Enterprise Case Study - 2026',
        category: 'case_study',
        content: 'Alpha Tech Solutions implemented a mobile-responsive patient scheduling widget for Downtown Dental Clinic. Resulted in 42% increase in online appointment bookings within 30 days and reduced administrative reception loads by 20 hours/week.',
        tags: ['Healthcare', 'Dental', 'Scheduling', 'Success Story'],
        createdAt: new Date(Date.now() - 86400000 * 10).toISOString()
      },
      {
        id: 'kb-2',
        title: 'B2B Client Tone of Voice and Brand Guidelines',
        category: 'brand_guidelines',
        content: 'Our communication must remain consultative, objective, and polite. Avoid high-pressure sales words like "guarantee", "free", "limited time", "million dollars", or "risk-free". Frame suggestions as digital audits focusing on user experience, SEO technical standards, and mobile accessibility.',
        tags: ['Copywriting', 'Brand Standards', 'Consultative'],
        createdAt: new Date(Date.now() - 86400000 * 8).toISOString()
      },
      {
        id: 'kb-3',
        title: 'Apex Legal Partners Consultation Redesign Case Study',
        category: 'case_study',
        content: 'Redesigned Apex Legal Partners homepage with high-contrast accessibility tags, optimized metadata, and a secure client contact form. Resulted in a 35% improvement in Google Search console ranking and 2.5x increase in secure consultation requests.',
        tags: ['Legal Services', 'SEO', 'Security', 'CRO'],
        createdAt: new Date(Date.now() - 86400000 * 5).toISOString()
      }
    ];
  }
  if (!db.settings.workflows) {
    db.settings.workflows = [
      {
        id: 'flow-1',
        name: 'Auto-Draft proposal on Audit completion',
        trigger: 'analysis_completed',
        enabled: true,
        nodes: [
          { id: 'n1', type: 'trigger', label: 'Trigger: Analysis Completed' },
          { id: 'n2', type: 'action', label: 'Action: AI Auto-Draft Proposal (consultative tone)' },
          { id: 'n3', type: 'action', label: 'Action: Send Internal Notification' }
        ],
        connections: [
          { from: 'n1', to: 'n2' },
          { from: 'n2', to: 'n3' }
        ],
        delay: '0 mins',
        createdAt: new Date().toISOString()
      },
      {
        id: 'flow-2',
        name: 'Proactive Alert on High Opportunity',
        trigger: 'high_opportunity_detected',
        enabled: true,
        nodes: [
          { id: 'n1', type: 'trigger', label: 'Trigger: Opportunity Score > 85%' },
          { id: 'n2', type: 'delay', label: 'Delay: Wait 15 mins (human check)' },
          { id: 'n3', type: 'action', label: 'Action: Auto-Create Calendar Callback Task' }
        ],
        connections: [
          { from: 'n1', to: 'n2' },
          { from: 'n2', to: 'n3' }
        ],
        delay: '15 mins',
        createdAt: new Date().toISOString()
      },
      {
        id: 'flow-3',
        name: 'Follow-up Task Creation Sequence',
        trigger: 'proposal_approved',
        enabled: false,
        nodes: [
          { id: 'n1', type: 'trigger', label: 'Trigger: Proposal Approved & Sent' },
          { id: 'n2', type: 'delay', label: 'Delay: Wait 3 Days' },
          { id: 'n3', type: 'action', label: 'Action: Create Task - Follow up on Sent Pitch' }
        ],
        connections: [
          { from: 'n1', to: 'n2' },
          { from: 'n2', to: 'n3' }
        ],
        delay: '3 days',
        createdAt: new Date().toISOString()
      }
    ];
  }
};

// Ensure settings keys are always prepared
ensureSettingsKeys();

// ==========================================
// 1. AI MEMORY & CONTINUOUS LEARNING
// ==========================================

// GET all memory entries
router.get('/memory', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ status: 'success', memory: db.proposalMemory });
  } catch (error) {
    next(error);
  }
});

// POST create custom memory entry
router.post('/memory', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { leadName, industry, proposalType, tone, language, opening, closing, overallScore, status, feedback } = req.body;
    
    if (!leadName || !proposalType) {
      res.status(400).json({ status: 'error', message: 'Lead Name and Proposal Type are required.' });
      return;
    }

    const entry: ProposalMemoryEntry = {
      id: genId('mem'),
      leadId: genId('lead-ref'),
      leadName,
      industry: industry || 'General',
      proposalType,
      tone: tone || 'professional',
      language: language || 'en',
      opening: opening || '',
      closing: closing || '',
      overallScore: Number(overallScore) || 85,
      status: status || 'approved',
      feedback: feedback || '',
      createdAt: new Date().toISOString()
    };

    db.proposalMemory.unshift(entry);
    db.save();

    await ActivityLogRepository.record(null, 'memory_updated', `Added brand guidance snapshot for ${leadName} to memory engine`);
    res.status(201).json({ status: 'success', entry });
  } catch (error) {
    next(error);
  }
});

// DELETE single memory entry
router.delete('/memory/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const idx = db.proposalMemory.findIndex(m => m.id === id);
    if (idx < 0) {
      res.status(404).json({ status: 'error', message: 'Memory entry not found' });
      return;
    }
    const removed = db.proposalMemory.splice(idx, 1)[0];
    db.save();

    await ActivityLogRepository.record(null, 'memory_updated', `Removed style memory entry [ID: ${id}] for ${removed.leadName}`);
    res.json({ status: 'success', message: 'Memory entry deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 2. KNOWLEDGE BASE & RAG
// ==========================================

// GET knowledge base documents
router.get('/knowledge', async (req: Request, res: Response, next: NextFunction) => {
  try {
    ensureSettingsKeys();
    res.json({ status: 'success', knowledge: db.settings.knowledgeBase });
  } catch (error) {
    next(error);
  }
});

// POST add document/guideline to RAG Knowledge Base
router.post('/knowledge', async (req: Request, res: Response, next: NextFunction) => {
  try {
    ensureSettingsKeys();
    const { title, content, category, tags } = req.body;
    
    if (!title || !content) {
      res.status(400).json({ status: 'error', message: 'Title and Content are required.' });
      return;
    }

    const doc = {
      id: genId('kb'),
      title,
      category: category || 'case_study',
      content,
      tags: Array.isArray(tags) ? tags : [],
      createdAt: new Date().toISOString()
    };

    db.settings.knowledgeBase.unshift(doc);
    db.save();

    await ActivityLogRepository.record(null, 'kb_updated', `Ingested context document: "${title}" into RAG module`);
    res.status(201).json({ status: 'success', doc });
  } catch (error) {
    next(error);
  }
});

// DELETE guideline from Knowledge Base
router.delete('/knowledge/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    ensureSettingsKeys();
    const { id } = req.params;
    const idx = db.settings.knowledgeBase.findIndex((k: any) => k.id === id);
    if (idx < 0) {
      res.status(404).json({ status: 'error', message: 'Document not found' });
      return;
    }
    const removed = db.settings.knowledgeBase.splice(idx, 1)[0];
    db.save();

    await ActivityLogRepository.record(null, 'kb_updated', `Removed ingested document: "${removed.title}"`);
    res.json({ status: 'success', message: 'Knowledge document removed' });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 3. ENTERPRISE WORKSPACES & RBAC
// ==========================================

// GET organization members
router.get('/enterprise/members', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ status: 'success', members: db.users });
  } catch (error) {
    next(error);
  }
});

// POST add organization member (RBAC)
router.post('/enterprise/members', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, fullName, role, avatarUrl } = req.body;
    if (!email || !fullName) {
      res.status(400).json({ status: 'error', message: 'Email and Full Name are required.' });
      return;
    }

    const exists = db.users.some(u => u.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      res.status(400).json({ status: 'error', message: 'Team member with this email already exists.' });
      return;
    }

    const member: User = {
      id: genId('user'),
      orgId: 'default-org-123',
      email,
      role: (role as OrgRole) || OrgRole.MEMBER,
      fullName,
      avatarUrl: avatarUrl || `https://images.unsplash.com/photo-${Math.floor(Math.random() * 100000) + 1500000000000}?auto=format&fit=crop&q=80&w=200`,
      createdAt: new Date().toISOString()
    };

    db.users.push(member);
    db.save();

    await ActivityLogRepository.record(null, 'member_invited', `Invited new workspace member ${fullName} (${role})`);
    res.status(201).json({ status: 'success', member });
  } catch (error) {
    next(error);
  }
});

// PATCH change member role (RBAC update)
router.patch('/enterprise/members/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const idx = db.users.findIndex(u => u.id === id);
    if (idx < 0) {
      res.status(404).json({ status: 'error', message: 'Team member not found.' });
      return;
    }

    if (!role || !Object.values(OrgRole).includes(role as OrgRole)) {
      res.status(400).json({ status: 'error', message: 'Invalid RBAC role specified.' });
      return;
    }

    db.users[idx].role = role as OrgRole;
    db.save();

    await ActivityLogRepository.record(null, 'member_updated', `Updated member ${db.users[idx].fullName} access role to: ${role}`);
    res.json({ status: 'success', member: db.users[idx] });
  } catch (error) {
    next(error);
  }
});

// DELETE organization member
router.delete('/enterprise/members/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const idx = db.users.findIndex(u => u.id === id);
    if (idx < 0) {
      res.status(404).json({ status: 'error', message: 'Member not found.' });
      return;
    }

    if (db.users[idx].role === OrgRole.OWNER) {
      res.status(400).json({ status: 'error', message: 'Cannot remove organization owner.' });
      return;
    }

    const removed = db.users.splice(idx, 1)[0];
    db.save();

    await ActivityLogRepository.record(null, 'member_removed', `Removed team member access for ${removed.fullName}`);
    res.json({ status: 'success', message: 'Member removed successfully.' });
  } catch (error) {
    next(error);
  }
});

// GET all workspaces in organization
router.get('/enterprise/workspaces', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ status: 'success', workspaces: db.workspaces });
  } catch (error) {
    next(error);
  }
});

// POST add custom workspace
router.post('/enterprise/workspaces', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body;
    if (!name) {
      res.status(400).json({ status: 'error', message: 'Workspace name is required.' });
      return;
    }

    const ws: Workspace = {
      id: genId('workspace'),
      orgId: 'default-org-123',
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.workspaces.push(ws);
    db.save();

    await ActivityLogRepository.record(null, 'workspace_created', `Added new campaign workspace node: "${name}"`);
    res.status(201).json({ status: 'success', workspace: ws });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 4. VISUAL WORKFLOW AUTOMATION BUILDER
// ==========================================

// GET all active and configured visual flows
router.get('/workflows', async (req: Request, res: Response, next: NextFunction) => {
  try {
    ensureSettingsKeys();
    res.json({ status: 'success', workflows: db.settings.workflows });
  } catch (error) {
    next(error);
  }
});

// POST create/update automation visual recipe
router.post('/workflows', async (req: Request, res: Response, next: NextFunction) => {
  try {
    ensureSettingsKeys();
    const { name, trigger, enabled, nodes, connections, delay } = req.body;

    if (!name || !trigger) {
      res.status(400).json({ status: 'error', message: 'Workflow Name and Trigger Event are required.' });
      return;
    }

    const flow = {
      id: genId('flow'),
      name,
      trigger,
      enabled: enabled !== undefined ? enabled : true,
      nodes: nodes || [],
      connections: connections || [],
      delay: delay || '0 mins',
      createdAt: new Date().toISOString()
    };

    db.settings.workflows.unshift(flow);
    db.save();

    await ActivityLogRepository.record(null, 'workflow_updated', `Compiled active visual trigger workflow recipe: "${name}"`);
    res.status(201).json({ status: 'success', workflow: flow });
  } catch (error) {
    next(error);
  }
});

// PATCH toggle workflow recipe (enable/disable)
router.patch('/workflows/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    ensureSettingsKeys();
    const { id } = req.params;
    const { enabled } = req.body;

    const idx = db.settings.workflows.findIndex((w: any) => w.id === id);
    if (idx < 0) {
      res.status(404).json({ status: 'error', message: 'Workflow recipe not found.' });
      return;
    }

    db.settings.workflows[idx].enabled = !!enabled;
    db.save();

    await ActivityLogRepository.record(null, 'workflow_updated', `Toggled workflow "${db.settings.workflows[idx].name}" ${enabled ? 'ON' : 'OFF'}`);
    res.json({ status: 'success', workflow: db.settings.workflows[idx] });
  } catch (error) {
    next(error);
  }
});

// DELETE workflow recipe
router.delete('/workflows/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    ensureSettingsKeys();
    const { id } = req.params;
    const idx = db.settings.workflows.findIndex((w: any) => w.id === id);
    if (idx < 0) {
      res.status(404).json({ status: 'error', message: 'Workflow not found.' });
      return;
    }
    const removed = db.settings.workflows.splice(idx, 1)[0];
    db.save();

    await ActivityLogRepository.record(null, 'workflow_updated', `Deleted visual trigger recipe: "${removed.name}"`);
    res.json({ status: 'success', message: 'Workflow recipe deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 5. AI PROACTIVE ADVICE RECOMMENDATIONS
// ==========================================

// GET real-time generated advisory alerts for CRM Dashboard
router.get('/proactive-advice', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const leads = db.leads || [];
    const recommendations = [];

    // Analyze idle leads
    const fiveDaysAgo = Date.now() - 5 * 86400000;
    const idleLeads = leads.filter(l => l.status === 'qualified' && (!l.lastActivity || new Date(l.lastActivity).getTime() < fiveDaysAgo));
    
    idleLeads.forEach(lead => {
      recommendations.push({
        id: `rec-idle-${lead.id}`,
        type: 'idle_prospect',
        title: `Prospect Idle alert: ${lead.businessName}`,
        description: `This high-opportunity lead was qualified 5+ days ago but has no active proposals or calls scheduled. We recommend generating a personalized consultative proposal now.`,
        actionLabel: 'Auto-Draft Proposal',
        leadId: lead.id,
        impactScore: 82,
        priority: 'high'
      });
    });

    // Analyze outstanding SEO defects
    const seoGaps = leads.filter(l => l.status === 'discovered' && l.scoreSeo < 45 && l.website);
    seoGaps.forEach(lead => {
      recommendations.push({
        id: `rec-seo-${lead.id}`,
        type: 'seo_remediation',
        title: `SEO Gap Detected: ${lead.businessName}`,
        description: `This site scored extremely low in search tags (${lead.scoreSeo}/100) due to missing header tags and description assets. Click to auto-generate a mobile landing page pitch.`,
        actionLabel: 'Analyze & Pitch',
        leadId: lead.id,
        impactScore: 88,
        priority: 'high'
      });
    });

    // General high conversion potential
    const highConvert = leads.filter(l => l.status === LeadStatus.DISCOVERED && l.opportunityScore > 80);
    highConvert.forEach(lead => {
      recommendations.push({
        id: `rec-convert-${lead.id}`,
        type: 'high_conversion',
        title: `High Opportunity Priority: ${lead.businessName}`,
        description: `Computed Opportunity Index is ${lead.opportunityScore}%. Lead exhibits multiple UX, performance, and accessibility flaws, showing optimal sales conversion possibility.`,
        actionLabel: 'Draft Proposal Bundle',
        leadId: lead.id,
        impactScore: 94,
        priority: 'very_high'
      });
    });

    // Defaults fallbacks if CRM leads database is clean
    if (recommendations.length === 0) {
      recommendations.push({
        id: 'rec-default-1',
        type: 'growth_campaign',
        title: 'Launch Healthcare Outreach',
        description: 'Google Maps platform indexed 12 un-audited medical clinics in local subnets. Start a bulk crawl to qualify high opportunity targets.',
        actionLabel: 'Start Crawl Campaign',
        impactScore: 75,
        priority: 'medium'
      });
    }

    res.json({ status: 'success', recommendations: recommendations.slice(0, 5) });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 6. CONTINUOUS AI QUALITY MONITORING
// ==========================================

// GET aggregated QA monitoring metrics
router.get('/qa-metrics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const drafts = db.outreachMessages || [];
    const memory = db.proposalMemory || [];

    // Calculate distributions
    const totalCount = drafts.length + memory.length;
    let avgPersonalization = 85;
    let avgSpamRisk = 12;
    let avgNaturalTone = 88;
    let avgReadability = 90;
    let totalHealingCycles = 24; // Simulated baseline

    if (drafts.length > 0) {
      let sumP = 0, sumS = 0, sumN = 0, sumR = 0;
      let countValids = 0;

      drafts.forEach(d => {
        if (d.qaMetrics) {
          sumP += d.qaMetrics.personalization;
          sumS += d.qaMetrics.spamRisk;
          sumN += d.qaMetrics.naturalTone;
          sumR += d.qaMetrics.languageAccuracy;
          countValids++;
        }
      });

      if (countValids > 0) {
        avgPersonalization = Math.round(sumP / countValids);
        avgSpamRisk = Math.round(sumS / countValids);
        avgNaturalTone = Math.round(sumN / countValids);
        avgReadability = Math.round(sumR / countValids);
      }
    }

    const qaHistory = [
      { week: 'Wk 24', spamRisk: 22, personalization: 78, readability: 80 },
      { week: 'Wk 25', spamRisk: 18, personalization: 82, readability: 84 },
      { week: 'Wk 26', spamRisk: 14, personalization: 85, readability: 87 },
      { week: 'Wk 27', spamRisk: avgSpamRisk, personalization: avgPersonalization, readability: avgReadability }
    ];

    res.json({
      status: 'success',
      metrics: {
        totalCount,
        avgPersonalization,
        avgSpamRisk,
        avgNaturalTone,
        avgReadability,
        totalHealingCycles,
        qaHistory,
        spamWarnings: [
          'Detected high concentration of phrase "guarantee sales" in early law campaign',
          'Healed proposal for Downtown Dental Clinic by stripping trailing sales slogans'
        ]
      }
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// 7. OFFLINE DATA QUEUE SYNCHRONIZER
// ==========================================

// POST synchronization batch of offline client actions
router.post('/sync', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { queue } = req.body;
    if (!Array.isArray(queue) || queue.length === 0) {
      res.status(400).json({ status: 'error', message: 'No sync queue actions provided.' });
      return;
    }

    logger.info('SyncEngine', `Received sync queue batch: ${queue.length} items`);
    const processed: string[] = [];

    queue.forEach((action: any) => {
      const { type, payload, id } = action;
      
      switch (type) {
        case 'CREATE_TASK':
          if (payload.title) {
            db.tasks.push({
              id: payload.id || genId('task'),
              leadId: payload.leadId || 'lead-mock-1',
              title: payload.title,
              description: payload.description || '',
              dueDate: payload.dueDate || new Date().toISOString(),
              isCompleted: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
            processed.push(`Created Task: "${payload.title}"`);
          }
          break;

        case 'UPDATE_LEAD_STATUS':
          const lIdx = db.leads.findIndex(l => l.id === payload.leadId);
          if (lIdx >= 0) {
            db.leads[lIdx].status = payload.status;
            db.leads[lIdx].updatedAt = new Date().toISOString();
            processed.push(`Updated lead "${db.leads[lIdx].businessName}" status to: ${payload.status}`);
          }
          break;

        case 'ADD_ACTIVITY_LOG':
          db.activityLogs.unshift({
            id: genId('log'),
            leadId: payload.leadId || null,
            actionType: payload.actionType || 'client_action',
            description: payload.description || 'Offline synchronization operation executed',
            createdAt: new Date().toISOString()
          });
          processed.push(`Added activity log: ${payload.actionType}`);
          break;

        default:
          processed.push(`Ignored unknown action type: ${type}`);
          break;
      }
    });

    db.save();
    
    await ActivityLogRepository.record(null, 'sync_completed', `Offline Queue Sync: Processed ${processed.length} actions successfully`);
    res.json({ status: 'success', processed, count: processed.length });
  } catch (error) {
    next(error);
  }
});

export default router;
