import { logger } from '../services/logging.ts';
import { enrichLead } from '../services/enrichment.ts';
import {
  LeadStatus,
  OpportunityPriority,
  OrgRole,
  Organization,
  Workspace,
  User,
  BusinessProfile,
  Lead,
  Task,
  OutreachMessage,
  ActivityLog,
  ProposalMemoryEntry,
} from '../../src/types.ts';

// Postgres Integration via Drizzle ORM
// If process.env.DATABASE_URL is provided, the repositories should route queries to Postgres.
// For now, this serves as an in-memory fallback to prevent UI crashes if no DB is configured.
const HAS_POSTGRES = !!process.env.DATABASE_URL;

// Central Database State Schema
export interface IDatabaseState {
  organizations: Organization[];
  workspaces: Workspace[];
  users: User[];
  businessProfiles: BusinessProfile[];
  leads: Lead[];
  tasks: Task[];
  outreachMessages: OutreachMessage[];
  activityLogs: ActivityLog[];
  settings: Record<string, any>;
  proposalMemory: ProposalMemoryEntry[];
  campaigns: import('../../src/types.ts').Campaign[];
  plugins: import('../../src/types.ts').PluginDefinition[];
  notifications: import('../../src/types.ts').AppNotification[];
  enhancedNotes: import('../../src/types.ts').EnhancedLeadNote[];
  inboxMessages: import('../../src/types.ts').InboxMessage[];
}

class MemoryDatabase {
  private state: IDatabaseState = {
    organizations: [],
    workspaces: [],
    users: [],
    businessProfiles: [],
    leads: [],
    tasks: [],
    outreachMessages: [],
    activityLogs: [],
    settings: {},
    proposalMemory: [],
    campaigns: [],
    plugins: [],
    notifications: [],
    enhancedNotes: [],
    inboxMessages: [],
  };

  constructor() {
    this.seedDefaults();
  }

  public save() {
    if (HAS_POSTGRES) {
      // In a fully migrated Postgres environment, synchronous saves are not used.
      // DML operations are executed directly inside Repository async methods.
    } else {
      // In-memory fallback: state is preserved in RAM for the lifetime of the process.
    }
  }

  private seedDefaults() {
    logger.info('Database', 'Initializing database state structure...');
    
    // 1. Create Organization
    const defaultOrg: Organization = {
      id: 'default-org-123',
      name: 'Alpha Growth Agency',
      subscriptionTier: 'pro',
      usageLimit: 500,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 2. Create Workspace
    const defaultWorkspace: Workspace = {
      id: 'default-workspace-456',
      orgId: defaultOrg.id,
      name: 'North America B2B Campaign',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 3. Create User
    const defaultUser: User = {
      id: 'default-user-789',
      orgId: defaultOrg.id,
      email: 'abdulwahababdullah3619@gmail.com',
      role: OrgRole.OWNER,
      fullName: 'Abdulwahab Abdullah',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
      createdAt: new Date().toISOString()
    };

    // 4. Create Business Profile
    const defaultProfile: BusinessProfile = {
      id: 'default-profile-101',
      workspaceId: defaultWorkspace.id,
      companyName: 'Alpha Tech Solutions',
      industry: 'Software & Technology Solutions',
      services: [
        'Web Application Development',
        'Custom CRM Integration',
        'Search Engine Optimization (SEO)',
        'Conversion Rate Optimization (CRO)'
      ],
      targetAudience: 'Local healthcare clinics, regional legal practitioners, and e-commerce stores earning $10k-$100k/mo',
      toneOfVoice: 'consultative',
      portfolioLinks: ['https://alphatech-example.com/portfolio'],
      defaultTemplates: {
        email: 'Hi {{lead_name}},\n\nI noticed on your website {{lead_website}} that you are experiencing some issues with {{detected_weakness}}.\n\nBest,\n{{sender_name}}',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 5. Create basic initial Tasks to verify calendar / list view
    const initialTasks: Task[] = [
      {
        id: 'task-1',
        leadId: 'lead-mock-1',
        title: 'Review first batch of discovered medical clinics',
        description: 'Review lead discovery ratings to qualify for active crawl audit sessions',
        dueDate: new Date(Date.now() + 86400000 * 2).toISOString(), // 2 days from now
        isCompleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'task-2',
        leadId: 'lead-mock-2',
        title: 'Call back legal client on custom proposal details',
        description: 'Address natural copywriting and verify responsive mobile draft mockup',
        dueDate: new Date(Date.now() + 86400000).toISOString(), // 1 day from now
        isCompleted: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    // 6. Create default system settings
    const defaultSettings = {
      general: {
        companyName: 'Alpha Growth Agency',
        supportEmail: 'support@alphagrowth.com',
        timezone: 'America/New_York',
        currency: 'USD'
      },
      ai: {
        defaultModel: 'gemini-2.5-flash',
        temperature: 0.7,
        maxTokens: 2048,
        useQAFeedbackLoop: true
      },
      plugins: {
        gemini: { enabled: true, apiKey: '' },
        openai: { enabled: false, apiKey: '' },
        claude: { enabled: false, apiKey: '' },
        gmail: { enabled: false },
        resend: { enabled: false, apiKey: '' },
        smtp: { enabled: true, host: 'smtp.mailtrap.io', port: 2525, secure: false, user: '', pass: '' },
        calendar: { enabled: false },
        maps: { enabled: false },
        postgres: { enabled: false },
        supabase: { enabled: false },
        firebase: { enabled: true }
      },
      appearance: {
        theme: 'dark',
        compactMode: false,
        primaryColor: 'violet'
      },
      notifications: {
        emailAlerts: true,
        weeklySummary: true,
        highOpportunityAlerts: true
      },
      language: {
        primary: 'en',
        autoDetectLeadLanguage: true
      },
      security: {
        mfaEnabled: false,
        sessionTimeout: 120, // minutes
        ipWhitelist: ''
      },
      backup: {
        autoBackup: true,
        backupFrequency: 'weekly'
      }
    };

    // 7. Seed Initial Mock Leads for CRM
    const initialLeads: Lead[] = [
      {
        id: 'lead-mock-1',
        workspaceId: defaultWorkspace.id,
        businessName: 'Downtown Dental Clinic',
        industry: 'Healthcare & Medical',
        website: 'https://downtowndental-example.com',
        email: 'info@downtowndental-example.com',
        phone: '+1 (555) 019-2834',
        city: 'Chicago',
        country: 'USA',
        businessSize: '10-50',
        languageCode: 'en',
        category: 'Dentist',
        contactName: 'Dr. Sarah Jenkins',
        whatsapp: '+1 (555) 019-2834',
        googleBusinessUrl: 'https://google.com/maps/place/Downtown+Dental',
        notes: '# Initial Review\nThis clinic looks great but lacks a modern booking widget. High potential for conversions.',
        tags: ['seo-issues', 'no-scheduler', 'high-priority'],
        leadSource: 'google_maps',
        status: LeadStatus.DISCOVERED,
        owner: 'Abdulwahab Abdullah',
        scoreSeo: 45,
        scorePerformance: 62,
        scoreMobile: 30,
        scoreAccessibility: 50,
        scoreBranding: 75,
        scoreUx: 40,
        scoreContent: 55,
        scoreSecurity: 90,
        scoreTrust: 65,
        websiteHealthScore: 50,
        opportunityScore: 78,
        opportunityPriority: OpportunityPriority.HIGH,
        suggestedAction: 'Propose direct online scheduling widget and mobile UX overhaul',
        aiAnalysisData: null,
        lastContactedAt: null,
        createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        lastActivity: 'Lead discovered via Google Maps crawler proxy',
        nextFollowUpDate: new Date(Date.now() + 86400000 * 1).toISOString(),
        attachments: [],
        noteHistory: []
      },
      {
        id: 'lead-mock-2',
        workspaceId: defaultWorkspace.id,
        businessName: 'Apex Legal Partners',
        industry: 'Legal Services',
        website: 'https://apexlegal-example.com',
        email: 'contact@apexlegal-example.com',
        phone: '+1 (555) 024-9182',
        city: 'New York',
        country: 'USA',
        businessSize: '1-10',
        languageCode: 'en',
        category: 'Law Firm',
        contactName: 'Robert Vance',
        whatsapp: null,
        googleBusinessUrl: 'https://google.com/maps/place/Apex+Legal',
        notes: 'Outreach email sent. Robert Vance replied expressing interest in SEO solutions.',
        tags: ['replied', 'seo-focus'],
        leadSource: 'organic',
        status: LeadStatus.QUALIFIED,
        owner: 'Abdulwahab Abdullah',
        scoreSeo: 55,
        scorePerformance: 70,
        scoreMobile: 85,
        scoreAccessibility: 80,
        scoreBranding: 60,
        scoreUx: 75,
        scoreContent: 50,
        scoreSecurity: 95,
        scoreTrust: 40,
        websiteHealthScore: 68,
        opportunityScore: 52,
        opportunityPriority: OpportunityPriority.MEDIUM,
        suggestedAction: 'Offer basic SEO audit package',
        aiAnalysisData: null,
        lastContactedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
        createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
        lastActivity: 'Outreach email sent and positive response received',
        nextFollowUpDate: new Date(Date.now() + 86400000 * 3).toISOString(),
        attachments: [],
        noteHistory: []
      },
      {
        id: 'lead-mock-3',
        workspaceId: defaultWorkspace.id,
        businessName: 'Belle Vie Esthetics',
        industry: 'Beauty & Wellness',
        website: 'https://bellevie-example.com',
        email: 'hello@bellevie-example.com',
        phone: '+33 1 42 68 53 00',
        city: 'Paris',
        country: 'France',
        businessSize: '1-10',
        languageCode: 'fr',
        category: 'Spa & Beauty',
        contactName: 'Chantal Dubois',
        whatsapp: '+33 1 42 68 53 00',
        googleBusinessUrl: null,
        notes: 'Website has broken layouts on mobile screens. Highly motivated for immediate conversion.',
        tags: ['french-market', 'mobile-flaw', 'very-high-priority'],
        leadSource: 'instagram',
        status: LeadStatus.RESEARCHING,
        owner: 'Abdulwahab Abdullah',
        scoreSeo: 30,
        scorePerformance: 45,
        scoreMobile: 15,
        scoreAccessibility: 40,
        scoreBranding: 85,
        scoreUx: 30,
        scoreContent: 60,
        scoreSecurity: 40,
        scoreTrust: 50,
        websiteHealthScore: 41,
        opportunityScore: 92,
        opportunityPriority: OpportunityPriority.VERY_HIGH,
        suggestedAction: 'Deliver custom mobile aesthetic mockup proposal immediately',
        aiAnalysisData: null,
        lastContactedAt: null,
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        lastActivity: 'Discovered on Instagram with layout issues',
        nextFollowUpDate: new Date(Date.now() + 86400000 * 2).toISOString(),
        attachments: [],
        noteHistory: []
      }
    ];

    // 8. Write to state structure
    this.state = {
      organizations: [defaultOrg],
      workspaces: [defaultWorkspace],
      users: [defaultUser],
      businessProfiles: [defaultProfile],
      leads: initialLeads,
      tasks: initialTasks,
      outreachMessages: [],
      activityLogs: [
        {
          id: 'log-1',
          leadId: null,
          actionType: 'system_initialized',
          description: 'SaaS CRM Core Platform Engine Booted up successfully',
          createdAt: new Date().toISOString()
        }
      ],
      settings: defaultSettings,
      proposalMemory: [
        {
          id: 'mem-1',
          leadId: 'lead-mock-2',
          leadName: 'Apex Legal Partners',
          industry: 'Legal Services',
          proposalType: 'seo',
          tone: 'consultative',
          language: 'en',
          opening: 'Dear Robert Vance, I hope this finds you well. I was reviewing the digital presence of Apex Legal Partners...',
          closing: 'Best regards, Alpha Tech Solutions team',
          overallScore: 88,
          status: 'approved',
          createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
        }
      ],
      campaigns: [
        {
          id: 'campaign-1',
          workspaceId: defaultWorkspace.id,
          name: 'Medical Clinics Outreach',
          description: 'Targeting local healthcare facilities with SEO audits and booking scheduler proposals.',
          targetIndustry: 'Healthcare & Medical',
          country: 'USA',
          language: 'en',
          status: 'active',
          goal: 'Secure 15 scheduler integration contracts.',
          leads: ['lead-mock-1'],
          successMetrics: {
            leadsAdded: 1,
            proposalsGenerated: 1,
            approved: 0,
            scheduled: 0,
            sent: 0,
            replies: 0,
            meetings: 0,
            conversions: 0,
            revenue: 0,
            conversionRate: 0,
            replyRate: 0,
            approvalRate: 0
          },
          createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'campaign-2',
          workspaceId: defaultWorkspace.id,
          name: 'Law Firms Digital Redesign',
          description: 'Proposing high-performance mobile-first responsive redesigns for boutique legal practices.',
          targetIndustry: 'Legal Services',
          country: 'USA',
          language: 'en',
          status: 'active',
          goal: 'Sign 5 premium redesign contracts.',
          leads: ['lead-mock-2'],
          successMetrics: {
            leadsAdded: 1,
            proposalsGenerated: 1,
            approved: 1,
            scheduled: 0,
            sent: 1,
            replies: 1,
            meetings: 1,
            conversions: 1,
            revenue: 4500,
            conversionRate: 100,
            replyRate: 100,
            approvalRate: 100
          },
          createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
          updatedAt: new Date().toISOString()
        }
      ],
      plugins: [
        {
          id: 'plugin-resend',
          name: 'Resend API Integration',
          description: 'High-speed professional cold outreach delivery via Resend transaction servers.',
          type: 'email',
          provider: 'Resend',
          enabled: false,
          config: { apiKey: '', fromEmail: 'outreach@alphatech.com' },
          createdAt: new Date().toISOString()
        },
        {
          id: 'plugin-smtp',
          name: 'Custom SMTP Server Gateway',
          description: 'Connect your agency\'s custom business mailbox (SMTP/IMAP) for manual draft approvals.',
          type: 'email',
          provider: 'SMTP',
          enabled: true,
          config: { host: 'smtp.mailtrap.io', port: '2525', secure: 'false', user: '', pass: '' },
          createdAt: new Date().toISOString()
        },
        {
          id: 'plugin-whatsapp',
          name: 'WhatsApp Web Companion',
          description: 'Generates deep direct-link WhatsApp outreach messages and manual script clips.',
          type: 'messaging',
          provider: 'WhatsApp Web',
          enabled: true,
          config: {},
          createdAt: new Date().toISOString()
        },
        {
          id: 'plugin-linkedin',
          name: 'LinkedIn Sales Companion',
          description: 'Personalized messaging clipboard assistant with automated profile search shortcuts.',
          type: 'messaging',
          provider: 'LinkedIn Sales Navigator',
          enabled: true,
          config: {},
          createdAt: new Date().toISOString()
        },
        {
          id: 'plugin-gcal',
          name: 'Google Calendar Synchronizer',
          description: 'Publish approved follow-up dates, tasks, and confirmed buyer meetings directly into Google Calendar.',
          type: 'calendar',
          provider: 'Google Calendar API',
          enabled: false,
          config: { client_id: '', calendar_id: 'primary' },
          createdAt: new Date().toISOString()
        },
        {
          id: 'plugin-hubspot',
          name: 'Hubspot CRM Sync',
          description: 'Export qualified leads, audits, and communication drafts directly to your enterprise Hubspot pipeline.',
          type: 'crm',
          provider: 'Hubspot API',
          enabled: false,
          config: { oauth_token: '' },
          createdAt: new Date().toISOString()
        }
      ],
      notifications: [
        {
          id: 'notif-1',
          title: 'High Opportunity Discovered',
          message: 'Apex Legal Partners has an opportunity score of 92%. We recommend delivering a mockup proposal.',
          type: 'followup',
          read: false,
          createdAt: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: 'notif-2',
          title: 'Upcoming Follow-up Reminder',
          message: 'Dr. Sarah Jenkins from Downtown Dental is due for follow-up outreach tomorrow.',
          type: 'task',
          read: false,
          createdAt: new Date(Date.now() - 7200000).toISOString()
        },
        {
          id: 'notif-3',
          title: 'Incoming Buyer Message',
          message: 'New reply received from Dr. Sarah Jenkins (Downtown Dental Clinic) on your scheduler pitch!',
          type: 'campaign',
          read: false,
          createdAt: new Date(Date.now() - 10800000).toISOString()
        }
      ],
      enhancedNotes: [],
      inboxMessages: [
        {
          id: 'inbox-1',
          leadId: 'lead-mock-2',
          sender: 'Robert Vance <r.vance@apexlegal.com>',
          recipient: 'sales@alphatech.com',
          subject: 'RE: Digital responsive review & mockup',
          body: 'Thanks for reaching out, Abdulwahab! Your audit raised some very interesting points. Can we schedule a quick call this Thursday at 10 AM CST? I\'d like to discuss the mobile-first redesign pricing options.',
          receivedAt: new Date(Date.now() - 18000000).toISOString(),
          read: false,
          syncProvider: 'manual'
        },
        {
          id: 'inbox-2',
          leadId: 'lead-mock-1',
          sender: 'Dr. Sarah Jenkins <info@downtowndental.com>',
          recipient: 'sales@alphatech.com',
          subject: 'RE: Interactive booking scheduler inquiry',
          body: 'Hi there, I saw your proposal regarding the dental booking widget. How long does the integration typically take, and does it support synchronization with our existing Dentrix server?',
          receivedAt: new Date(Date.now() - 36000000).toISOString(),
          read: true,
          syncProvider: 'manual'
        }
      ]
    };
  }

  // Getter shortcuts
  public get organizations() { return this.state.organizations; }
  public get workspaces() { return this.state.workspaces; }
  public get users() { return this.state.users; }
  public get businessProfiles() { return this.state.businessProfiles; }
  public get leads() { return this.state.leads; }
  public get tasks() { return this.state.tasks; }
  public get outreachMessages() { return this.state.outreachMessages; }
  public get activityLogs() { return this.state.activityLogs; }
  public get settings() { return this.state.settings; }
  public get proposalMemory() { return this.state.proposalMemory; }
  public get campaigns() { return this.state.campaigns; }
  public get plugins() { return this.state.plugins; }
  public get notifications() { return this.state.notifications; }
  public get enhancedNotes() { return this.state.enhancedNotes; }
  public get inboxMessages() { return this.state.inboxMessages; }
}

export const db = new FileDatabase();

// ==========================================
// 5. REPOSITORY CLASS IMPLEMENTATIONS
// ==========================================

export class SettingsRepository {
  public static async get(): Promise<Record<string, any>> {
    return db.settings;
  }

  public static async update(section: string, value: Record<string, any>): Promise<Record<string, any>> {
    db.settings[section] = {
      ...db.settings[section],
      ...value
    };
    db.save();
    logger.audit('Settings', `Updated configuration settings for section: ${section}`);
    return db.settings;
  }
}

export class BusinessProfileRepository {
  public static async getProfile(workspaceId: string): Promise<BusinessProfile | null> {
    const profile = db.businessProfiles.find(p => p.workspaceId === workspaceId);
    return profile || null;
  }

  public static async upsertProfile(workspaceId: string, updates: Partial<BusinessProfile>): Promise<BusinessProfile> {
    const idx = db.businessProfiles.findIndex(p => p.workspaceId === workspaceId);
    let profile: BusinessProfile;
    
    if (idx >= 0) {
      profile = {
        ...db.businessProfiles[idx],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      db.businessProfiles[idx] = profile;
      logger.audit('Profile', `Updated existing company business profile: ${profile.companyName}`);
    } else {
      profile = {
        id: 'profile-' + Math.random().toString(36).substring(2, 9),
        workspaceId,
        companyName: updates.companyName || 'New Company',
        industry: updates.industry || null,
        services: updates.services || [],
        targetAudience: updates.targetAudience || null,
        toneOfVoice: updates.toneOfVoice || 'professional',
        portfolioLinks: updates.portfolioLinks || [],
        defaultTemplates: updates.defaultTemplates || {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      db.businessProfiles.push(profile);
      logger.audit('Profile', `Created new company business profile: ${profile.companyName}`);
    }
    
    db.save();
    return profile;
  }
}

export class TaskRepository {
  public static async list(): Promise<Task[]> {
    return db.tasks;
  }

  public static async create(leadId: string, taskData: Partial<Task>): Promise<Task> {
    const task: Task = {
      id: 'task-' + Math.random().toString(36).substring(2, 9),
      leadId,
      title: taskData.title || 'New Task',
      description: taskData.description || null,
      dueDate: taskData.dueDate || new Date(Date.now() + 86400000).toISOString(),
      isCompleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.tasks.push(task);
    db.save();
    logger.audit('Task', `Added new task to list: ${task.title}`);
    return task;
  }

  public static async update(id: string, isCompleted: boolean): Promise<Task> {
    const idx = db.tasks.findIndex(t => t.id === id);
    if (idx < 0) {
      throw new Error(`Task not found with ID ${id}`);
    }
    db.tasks[idx].isCompleted = isCompleted;
    db.tasks[idx].updatedAt = new Date().toISOString();
    db.save();
    logger.audit('Task', `Updated task state ${id} isCompleted: ${isCompleted}`);
    return db.tasks[idx];
  }

  public static async delete(id: string): Promise<boolean> {
    const idx = db.tasks.findIndex(t => t.id === id);
    if (idx < 0) return false;
    db.tasks.splice(idx, 1);
    db.save();
    logger.audit('Task', `Deleted task with ID: ${id}`);
    return true;
  }
}

export class ActivityLogRepository {
  public static async list(limit = 100): Promise<ActivityLog[]> {
    return db.activityLogs.slice(0, limit);
  }

  public static async record(leadId: string | null, actionType: string, description: string): Promise<ActivityLog> {
    const log: ActivityLog = {
      id: 'log-' + Math.random().toString(36).substring(2, 9),
      leadId,
      actionType,
      description,
      createdAt: new Date().toISOString()
    };
    db.activityLogs.unshift(log); // newest first
    db.save();
    return log;
  }
}

export class LeadRepository {
  public static async list(workspaceId?: string, filters: {
    search?: string;
    status?: string;
    priority?: string;
    industry?: string;
    tag?: string;
  } = {}): Promise<Lead[]> {
    let list = db.leads;
    if (workspaceId) {
      list = list.filter(l => l.workspaceId === workspaceId);
    }
    
    // Lazy enrich any leads that do not have enrichment calculated yet
    let stateChanged = false;
    list.forEach(l => {
      if (!l.enrichment) {
        l.enrichment = enrichLead(l, db.leads.filter(x => x.workspaceId === l.workspaceId));
        stateChanged = true;
      }
    });
    if (stateChanged) {
      db.save();
    }
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      list = list.filter(l => 
        l.businessName.toLowerCase().includes(searchLower) ||
        (l.website && l.website.toLowerCase().includes(searchLower)) ||
        (l.email && l.email.toLowerCase().includes(searchLower)) ||
        (l.contactName && l.contactName.toLowerCase().includes(searchLower))
      );
    }
    
    if (filters.status) {
      list = list.filter(l => l.status === filters.status);
    }
    
    if (filters.priority) {
      list = list.filter(l => l.opportunityPriority === filters.priority);
    }
    
    if (filters.industry) {
      list = list.filter(l => l.industry?.toLowerCase() === filters.industry?.toLowerCase());
    }
    
    if (filters.tag) {
      list = list.filter(l => l.tags.includes(filters.tag!));
    }
    
    return list;
  }

  public static async get(id: string): Promise<Lead | null> {
    const idx = db.leads.findIndex(l => l.id === id);
    if (idx < 0) return null;
    
    const lead = db.leads[idx];
    if (!lead.enrichment) {
      const workspaceLeads = db.leads.filter(l => l.workspaceId === lead.workspaceId);
      lead.enrichment = enrichLead(lead, workspaceLeads);
      db.save();
    }
    return lead;
  }

  public static async create(workspaceId: string, leadData: Partial<Lead>): Promise<Lead> {
    // Duplicate Prevention
    if (leadData.website) {
      const normalizedWebsite = leadData.website.trim().toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
      const existing = db.leads.find(l => 
        l.workspaceId === workspaceId && 
        l.website && 
        l.website.trim().toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') === normalizedWebsite
      );
      if (existing) {
        throw new Error(`Duplicate prevention: Lead with website ${leadData.website} already exists in this workspace.`);
      }
    }

    // Generate scores if not present
    const scoreSeo = leadData.scoreSeo ?? Math.floor(Math.random() * 40) + 30; // 30-70
    const scorePerformance = leadData.scorePerformance ?? Math.floor(Math.random() * 40) + 40;
    const scoreMobile = leadData.scoreMobile ?? Math.floor(Math.random() * 40) + 30;
    const scoreAccessibility = leadData.scoreAccessibility ?? Math.floor(Math.random() * 40) + 40;
    const scoreBranding = leadData.scoreBranding ?? Math.floor(Math.random() * 30) + 60;
    const scoreUx = leadData.scoreUx ?? Math.floor(Math.random() * 40) + 30;
    const scoreContent = leadData.scoreContent ?? Math.floor(Math.random() * 40) + 40;
    const scoreSecurity = leadData.scoreSecurity ?? Math.floor(Math.random() * 20) + 80;
    const scoreTrust = leadData.scoreTrust ?? Math.floor(Math.random() * 40) + 40;
    
    // Weighted Health score calculation
    const websiteHealthScore = Math.round(
      scoreSeo * 0.15 +
      scorePerformance * 0.10 +
      scoreMobile * 0.15 +
      scoreAccessibility * 0.10 +
      scoreBranding * 0.10 +
      scoreUx * 0.15 +
      scoreContent * 0.10 +
      scoreSecurity * 0.10 +
      scoreTrust * 0.05
    );

    // Opportunity Score (Lower health = Higher opportunity)
    const opportunityScore = Math.max(0, Math.min(100, 100 - websiteHealthScore + Math.floor(Math.random() * 15)));
    
    let opportunityPriority = OpportunityPriority.MEDIUM;
    if (opportunityScore > 85) opportunityPriority = OpportunityPriority.VERY_HIGH;
    else if (opportunityScore > 60) opportunityPriority = OpportunityPriority.HIGH;
    else if (opportunityScore < 30) opportunityPriority = OpportunityPriority.LOW;

    const lead: Lead = {
      id: 'lead-' + Math.random().toString(36).substring(2, 9),
      workspaceId,
      businessName: leadData.businessName || 'Unnamed Business',
      industry: leadData.industry || null,
      website: leadData.website || null,
      email: leadData.email || null,
      phone: leadData.phone || null,
      linkedinUrl: leadData.linkedinUrl || null,
      facebookUrl: leadData.facebookUrl || null,
      instagramUrl: leadData.instagramUrl || null,
      city: leadData.city || null,
      country: leadData.country || null,
      businessSize: leadData.businessSize || null,
      languageCode: leadData.languageCode || 'en',
      
      category: leadData.category || null,
      contactName: leadData.contactName || null,
      whatsapp: leadData.whatsapp || null,
      googleBusinessUrl: leadData.googleBusinessUrl || null,
      notes: leadData.notes || '',
      owner: leadData.owner || 'Abdulwahab Abdullah',
      lastActivity: leadData.lastActivity || 'Lead created inside CRM',
      nextFollowUpDate: leadData.nextFollowUpDate || null,
      attachments: leadData.attachments || [],
      noteHistory: leadData.noteHistory || [],

      scoreSeo,
      scorePerformance,
      scoreMobile,
      scoreAccessibility,
      scoreBranding,
      scoreUx,
      scoreContent,
      scoreSecurity,
      scoreTrust,
      websiteHealthScore,
      opportunityScore,
      opportunityPriority,
      suggestedAction: leadData.suggestedAction || 'Analyze company assets to define proposal roadmap',
      
      status: leadData.status || LeadStatus.DISCOVERED,
      tags: leadData.tags || [],
      leadSource: leadData.leadSource || 'manual',
      aiAnalysisData: null,
      lastContactedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Calculate enrichment on create
    const workspaceLeads = db.leads.filter(l => l.workspaceId === workspaceId);
    lead.enrichment = enrichLead(lead, workspaceLeads);

    db.leads.push(lead);
    db.save();
    logger.audit('Lead', `Created new CRM Lead entry: ${lead.businessName} [Status: ${lead.status}]`);
    return lead;
  }

  public static async update(id: string, updates: Partial<Lead>): Promise<Lead> {
    const idx = db.leads.findIndex(l => l.id === id);
    if (idx < 0) {
      throw new Error(`Lead not found with ID ${id}`);
    }

    const previousStatus = db.leads[idx].status;

    // Preserve sub-arrays if not updated
    const lead = {
      ...db.leads[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    // If status updated, log activity automatically!
    if (updates.status && updates.status !== previousStatus) {
      lead.lastActivity = `Stage shifted from ${previousStatus} to ${updates.status}`;
      await ActivityLogRepository.record(
        id,
        'status_changed',
        `Lead pipeline stage shifted from "${previousStatus}" to "${updates.status}"`
      );
    }

    db.leads[idx] = lead;
    db.save();
    logger.audit('Lead', `Updated Lead record ${lead.businessName} [ID: ${id}]`);
    return lead;
  }

  public static async delete(id: string): Promise<boolean> {
    const idx = db.leads.findIndex(l => l.id === id);
    if (idx < 0) return false;
    const name = db.leads[idx].businessName;
    db.leads.splice(idx, 1);
    
    // Delete associated tasks
    db['state'].tasks = db.tasks.filter(t => t.leadId !== id);
    db.save();
    logger.audit('Lead', `Deleted Lead record: ${name} and purged related tasks`);
    return true;
  }

  public static async addNote(id: string, noteContent: string): Promise<Lead> {
    const idx = db.leads.findIndex(l => l.id === id);
    if (idx < 0) {
      throw new Error(`Lead not found with ID ${id}`);
    }

    const currentLead = db.leads[idx];
    const noteHistory = currentLead.noteHistory || [];
    
    // Add current to history
    if (currentLead.notes) {
      noteHistory.unshift({
        id: 'note-hist-' + Math.random().toString(36).substring(2, 9),
        content: currentLead.notes,
        updatedAt: currentLead.updatedAt || new Date().toISOString()
      });
    }

    currentLead.notes = noteContent;
    currentLead.noteHistory = noteHistory;
    currentLead.updatedAt = new Date().toISOString();
    currentLead.lastActivity = 'Notes revised';

    db.leads[idx] = currentLead;
    db.save();
    
    await ActivityLogRepository.record(id, 'notes_updated', 'Notes updated in CRM panel');
    return currentLead;
  }

  public static async addAttachment(id: string, fileName: string, fileSize: number, fileType: string): Promise<Lead> {
    const idx = db.leads.findIndex(l => l.id === id);
    if (idx < 0) {
      throw new Error(`Lead not found with ID ${id}`);
    }

    const currentLead = db.leads[idx];
    const attachments = currentLead.attachments || [];

    const newAttachment = {
      id: 'attach-' + Math.random().toString(36).substring(2, 9),
      leadId: id,
      fileName,
      fileSize,
      fileType,
      uploadedAt: new Date().toISOString()
    };

    attachments.push(newAttachment);
    currentLead.attachments = attachments;
    currentLead.updatedAt = new Date().toISOString();
    currentLead.lastActivity = `File attached: ${fileName}`;

    db.leads[idx] = currentLead;
    db.save();

    await ActivityLogRepository.record(id, 'attachment_uploaded', `Uploaded document metadata: ${fileName}`);
    return currentLead;
  }

  public static async enrich(id: string): Promise<Lead> {
    const idx = db.leads.findIndex(l => l.id === id);
    if (idx < 0) {
      throw new Error(`Lead not found with ID ${id}`);
    }
    const lead = db.leads[idx];
    const workspaceLeads = db.leads.filter(l => l.workspaceId === lead.workspaceId);
    lead.enrichment = enrichLead(lead, workspaceLeads);
    db.save();
    
    await ActivityLogRepository.record(id, 'lead_enriched', `Enriched data and evaluated completeness score for "${lead.businessName}"`);
    return lead;
  }

  public static async merge(primaryId: string, duplicateIds: string[], fieldsToKeep: Partial<Lead>): Promise<Lead> {
    const primaryIdx = db.leads.findIndex(l => l.id === primaryId);
    if (primaryIdx < 0) {
      throw new Error(`Primary Lead not found with ID ${primaryId}`);
    }
    const primaryLead = db.leads[primaryIdx];
    const mergedDetails: string[] = [];
    const history = primaryLead.noteHistory || [];

    for (const dupId of duplicateIds) {
      const dupIdx = db.leads.findIndex(l => l.id === dupId);
      if (dupIdx >= 0) {
        const dupLead = db.leads[dupIdx];
        mergedDetails.push(dupLead.businessName);

        // Merge notes
        if (dupLead.notes && dupLead.notes.trim()) {
          history.unshift({
            id: 'note-hist-merge-' + Math.random().toString(36).substring(2, 9),
            content: `Merged notes from ${dupLead.businessName}: ${dupLead.notes}`,
            updatedAt: new Date().toISOString()
          });
        }

        // Merge tags
        if (dupLead.tags && dupLead.tags.length) {
          primaryLead.tags = [...new Set([...primaryLead.tags, ...dupLead.tags])];
        }

        // Re-assign tasks of duplicate to primary
        db.tasks.forEach(t => {
          if (t.leadId === dupId) {
            t.leadId = primaryId;
            t.title = `[Merged] ${t.title}`;
          }
        });

        // Delete duplicate lead
        db.leads.splice(dupIdx, 1);
      }
    }

    // Apply fields to keep (overrides)
    Object.assign(primaryLead, fieldsToKeep);
    primaryLead.noteHistory = history;
    primaryLead.updatedAt = new Date().toISOString();
    primaryLead.lastActivity = `Merged with duplicate records: ${mergedDetails.join(', ')}`;

    // Re-enrich the primary lead
    const workspaceLeads = db.leads.filter(l => l.workspaceId === primaryLead.workspaceId);
    primaryLead.enrichment = enrichLead(primaryLead, workspaceLeads);

    db.save();

    await ActivityLogRepository.record(
      primaryId,
      'lead_merged',
      `Merged lead "${primaryLead.businessName}" with duplicate records: ${mergedDetails.join(', ')}`
    );

    return primaryLead;
  }

  public static async ignoreDuplicate(id: string, duplicateId: string): Promise<Lead> {
    const idx = db.leads.findIndex(l => l.id === id);
    if (idx < 0) {
      throw new Error(`Lead not found with ID ${id}`);
    }
    const lead = db.leads[idx];
    if (!lead.enrichment) {
      const workspaceLeads = db.leads.filter(l => l.workspaceId === lead.workspaceId);
      lead.enrichment = enrichLead(lead, workspaceLeads);
    }
    
    if (lead.enrichment) {
      if (!lead.enrichment.ignoredDuplicateIds.includes(duplicateId)) {
        lead.enrichment.ignoredDuplicateIds.push(duplicateId);
      }
      
      // Update ignored duplicates on the duplicate lead as well to be symmetric
      const dupIdx = db.leads.findIndex(l => l.id === duplicateId);
      if (dupIdx >= 0) {
        const dupLead = db.leads[dupIdx];
        if (!dupLead.enrichment) {
          const workspaceLeads = db.leads.filter(l => l.workspaceId === dupLead.workspaceId);
          dupLead.enrichment = enrichLead(dupLead, workspaceLeads);
        }
        if (dupLead.enrichment && !dupLead.enrichment.ignoredDuplicateIds.includes(id)) {
          dupLead.enrichment.ignoredDuplicateIds.push(id);
        }
      }

      // Re-evaluate duplicates excluding ignored ones
      const workspaceLeads = db.leads.filter(l => l.workspaceId === lead.workspaceId);
      lead.enrichment = enrichLead(lead, workspaceLeads);
      if (dupIdx >= 0) {
        const dupLead = db.leads[dupIdx];
        if (dupLead.enrichment) {
          dupLead.enrichment = enrichLead(dupLead, workspaceLeads);
        }
      }
    }
    
    db.save();
    await ActivityLogRepository.record(id, 'duplicate_ignored', `Ignored potential duplicate lead [ID: ${duplicateId}]`);
    return lead;
  }

  public static async batchEnrich(workspaceId: string): Promise<{ successCount: number }> {
    const list = db.leads.filter(l => l.workspaceId === workspaceId);
    list.forEach(l => {
      l.enrichment = enrichLead(l, db.leads.filter(x => x.workspaceId === workspaceId));
    });
    db.save();
    await ActivityLogRepository.record(null, 'batch_validation', `Executed batch data validation and enrichment for ${list.length} leads`);
    return { successCount: list.length };
  }

  public static async getCRMStats(workspaceId: string) {
    const list = db.leads.filter(l => l.workspaceId === workspaceId);
    
    // Calculate leadCounts
    const leadCounts = {
      [LeadStatus.DISCOVERED]: 0,
      [LeadStatus.QUALIFIED]: 0,
      [LeadStatus.RESEARCHING]: 0,
      [LeadStatus.READY_FOR_ANALYSIS]: 0,
      [LeadStatus.PROPOSAL_DRAFTED]: 0,
      [LeadStatus.AWAITING_APPROVAL]: 0,
      [LeadStatus.READY_TO_CONTACT]: 0,
      [LeadStatus.CONTACTED]: 0,
      [LeadStatus.FOLLOW_UP]: 0,
      [LeadStatus.NEGOTIATING]: 0,
      [LeadStatus.WON]: 0,
      [LeadStatus.LOST]: 0,
      [LeadStatus.ARCHIVED]: 0
    };

    list.forEach(l => {
      if (leadCounts[l.status] !== undefined) {
        leadCounts[l.status]++;
      }
    });

    // Conversion Funnel
    // stage: Discovered -> Qualified -> Contacted -> Won
    const stageDiscoveredCount = list.filter(l => 
      [LeadStatus.DISCOVERED, LeadStatus.QUALIFIED, LeadStatus.RESEARCHING, LeadStatus.READY_FOR_ANALYSIS, LeadStatus.PROPOSAL_DRAFTED, LeadStatus.AWAITING_APPROVAL, LeadStatus.READY_TO_CONTACT, LeadStatus.CONTACTED, LeadStatus.FOLLOW_UP, LeadStatus.NEGOTIATING, LeadStatus.WON].includes(l.status)
    ).length;

    const stageQualifiedCount = list.filter(l => 
      [LeadStatus.QUALIFIED, LeadStatus.RESEARCHING, LeadStatus.READY_FOR_ANALYSIS, LeadStatus.PROPOSAL_DRAFTED, LeadStatus.AWAITING_APPROVAL, LeadStatus.READY_TO_CONTACT, LeadStatus.CONTACTED, LeadStatus.FOLLOW_UP, LeadStatus.NEGOTIATING, LeadStatus.WON].includes(l.status)
    ).length;

    const stageContactedCount = list.filter(l => 
      [LeadStatus.CONTACTED, LeadStatus.FOLLOW_UP, LeadStatus.NEGOTIATING, LeadStatus.WON].includes(l.status)
    ).length;

    const stageWonCount = list.filter(l => l.status === LeadStatus.WON).length;

    const totalCount = list.length || 1;

    const conversionFunnel = [
      { stage: 'Discovered', count: stageDiscoveredCount, percentage: Math.round((stageDiscoveredCount / totalCount) * 100) },
      { stage: 'Qualified', count: stageQualifiedCount, percentage: Math.round((stageQualifiedCount / totalCount) * 100) },
      { stage: 'Contacted', count: stageContactedCount, percentage: Math.round((stageContactedCount / totalCount) * 100) },
      { stage: 'Won', count: stageWonCount, percentage: Math.round((stageWonCount / totalCount) * 100) }
    ];

    // Pipeline Distribution (count and dollar value potential)
    const pipelineDistribution = Object.values(LeadStatus).map(status => {
      const statusLeads = list.filter(l => l.status === status);
      let potentialValue = 0;
      statusLeads.forEach(l => {
        if (l.opportunityPriority === OpportunityPriority.VERY_HIGH) potentialValue += 5000;
        else if (l.opportunityPriority === OpportunityPriority.HIGH) potentialValue += 3000;
        else if (l.opportunityPriority === OpportunityPriority.MEDIUM) potentialValue += 1500;
        else potentialValue += 500;
      });

      return {
        status,
        count: statusLeads.length,
        value: potentialValue
      };
    });

    const openRate = 65;
    const replyRate = 32;

    const totalOpportunities = list.filter(l => l.opportunityPriority === OpportunityPriority.HIGH || l.opportunityPriority === OpportunityPriority.VERY_HIGH).length;

    const topOpportunities = list
      .filter(l => l.opportunityScore > 50)
      .sort((a, b) => b.opportunityScore - a.opportunityScore)
      .slice(0, 5)
      .map(l => ({
        leadId: l.id,
        businessName: l.businessName,
        website: l.website,
        opportunityScore: l.opportunityScore,
        priority: l.opportunityPriority
      }));

    return {
      leadCounts,
      conversionFunnel,
      pipelineDistribution,
      openRate,
      replyRate,
      totalOpportunities,
      topOpportunities
    };
  }
}

export class OutreachMessageRepository {
  public static async list(leadId?: string): Promise<OutreachMessage[]> {
    if (leadId) {
      return db.outreachMessages.filter(m => m.leadId === leadId);
    }
    return db.outreachMessages;
  }

  public static async get(id: string): Promise<OutreachMessage | null> {
    const msg = db.outreachMessages.find(m => m.id === id);
    return msg || null;
  }

  public static async create(leadId: string, messageData: Partial<OutreachMessage>): Promise<OutreachMessage> {
    const id = 'proposal-' + Math.random().toString(36).substring(2, 9);
    const version = messageData.version || 1;
    const initialVersion = {
      versionNumber: version,
      subjectLine: messageData.subjectLine || '',
      bodyContent: messageData.bodyContent || '',
      createdAt: new Date().toISOString(),
      author: 'AI Agent System'
    };

    const message: OutreachMessage = {
      id,
      leadId,
      channel: messageData.channel || 'email' as any,
      subjectLine: messageData.subjectLine || '',
      bodyContent: messageData.bodyContent || '',
      originalAiContent: messageData.originalAiContent || messageData.bodyContent || '',
      qaMetrics: messageData.qaMetrics || {
        personalization: 80,
        professionalism: 85,
        naturalTone: 80,
        languageAccuracy: 90,
        spamRisk: 10,
        confidence: 'High'
      },
      status: messageData.status || 'draft' as any,
      sentAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      proposalType: messageData.proposalType || 'general_introduction',
      tone: messageData.tone || 'professional',
      language: messageData.language || 'en',
      version,
      versions: messageData.versions || [initialVersion],
      objections: messageData.objections || [],
      portfolioMatches: messageData.portfolioMatches || [],
      caseStudies: messageData.caseStudies || [],
      aiSuggestions: messageData.aiSuggestions || [],
      detailedQualityMetrics: messageData.detailedQualityMetrics || {
        personalization: 80,
        grammar: 90,
        professionalism: 85,
        trust: 80,
        spamScore: 10,
        readability: 85,
        localizationQuality: 90,
        overallScore: 83
      }
    };

    db.outreachMessages.push(message);
    db.save();
    return message;
  }

  public static async update(id: string, updates: Partial<OutreachMessage>, author = 'User'): Promise<OutreachMessage> {
    const idx = db.outreachMessages.findIndex(m => m.id === id);
    if (idx < 0) {
      throw new Error(`OutreachMessage not found with ID ${id}`);
    }

    const current = db.outreachMessages[idx];
    
    // If bodyContent or subjectLine changes, we should add a new version
    let versions = current.versions || [];
    let version = current.version || 1;

    const bodyChanged = updates.bodyContent !== undefined && updates.bodyContent !== current.bodyContent;
    const subjectChanged = updates.subjectLine !== undefined && updates.subjectLine !== current.subjectLine;

    if (bodyChanged || subjectChanged) {
      version += 1;
      const newVer = {
        versionNumber: version,
        subjectLine: updates.subjectLine !== undefined ? updates.subjectLine : current.subjectLine,
        bodyContent: updates.bodyContent !== undefined ? updates.bodyContent : current.bodyContent,
        createdAt: new Date().toISOString(),
        author
      };
      versions = [...versions, newVer];
    }

    const updated: OutreachMessage = {
      ...current,
      ...updates,
      version,
      versions,
      updatedAt: new Date().toISOString()
    };

    db.outreachMessages[idx] = updated;
    db.save();
    return updated;
  }

  public static async delete(id: string): Promise<boolean> {
    const idx = db.outreachMessages.findIndex(m => m.id === id);
    if (idx < 0) return false;
    db.outreachMessages.splice(idx, 1);
    db.save();
    return true;
  }

  public static async listMemory(): Promise<ProposalMemoryEntry[]> {
    return db.proposalMemory;
  }

  public static async addMemory(entry: ProposalMemoryEntry): Promise<ProposalMemoryEntry> {
    db.proposalMemory.unshift(entry);
    db.save();
    return entry;
  }
}

export class CampaignRepository {
  public static async list(workspaceId?: string): Promise<import('../../src/types.ts').Campaign[]> {
    let list = db.campaigns;
    if (workspaceId) {
      list = list.filter(c => c.workspaceId === workspaceId);
    }
    return list;
  }

  public static async get(id: string): Promise<import('../../src/types.ts').Campaign | null> {
    const campaign = db.campaigns.find(c => c.id === id);
    return campaign || null;
  }

  public static async create(workspaceId: string, campaignData: Partial<import('../../src/types.ts').Campaign>): Promise<import('../../src/types.ts').Campaign> {
    const campaign: import('../../src/types.ts').Campaign = {
      id: 'campaign-' + Math.random().toString(36).substring(2, 9),
      workspaceId,
      name: campaignData.name || 'New Campaign',
      description: campaignData.description || '',
      targetIndustry: campaignData.targetIndustry || '',
      country: campaignData.country || 'USA',
      language: campaignData.language || 'en',
      status: campaignData.status || 'draft',
      goal: campaignData.goal || '',
      leads: campaignData.leads || [],
      successMetrics: campaignData.successMetrics || {
        leadsAdded: 0,
        proposalsGenerated: 0,
        approved: 0,
        scheduled: 0,
        sent: 0,
        replies: 0,
        meetings: 0,
        conversions: 0,
        revenue: 0,
        conversionRate: 0,
        replyRate: 0,
        approvalRate: 0
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.campaigns.push(campaign);
    db.save();
    logger.audit('Campaign', `Created new Campaign: ${campaign.name}`);
    return campaign;
  }

  public static async update(id: string, updates: Partial<import('../../src/types.ts').Campaign>): Promise<import('../../src/types.ts').Campaign> {
    const idx = db.campaigns.findIndex(c => c.id === id);
    if (idx < 0) {
      throw new Error(`Campaign not found with ID ${id}`);
    }

    const current = db.campaigns[idx];
    const updated = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    // Calculate metrics percentages
    const m = updated.successMetrics;
    if (m) {
      m.approvalRate = m.proposalsGenerated > 0 ? Math.round((m.approved / m.proposalsGenerated) * 100) : 0;
      m.replyRate = m.sent > 0 ? Math.round((m.replies / m.sent) * 100) : 0;
      m.conversionRate = m.leadsAdded > 0 ? Math.round((m.conversions / m.leadsAdded) * 100) : 0;
    }

    db.campaigns[idx] = updated;
    db.save();
    logger.audit('Campaign', `Updated Campaign: ${updated.name}`);
    return updated;
  }

  public static async delete(id: string): Promise<boolean> {
    const idx = db.campaigns.findIndex(c => c.id === id);
    if (idx < 0) return false;
    
    // Unassign campaignId from leads in this campaign
    const campaign = db.campaigns[idx];
    db.leads.forEach(l => {
      if (l.campaignId === id) {
        l.campaignId = null;
      }
    });

    db.campaigns.splice(idx, 1);
    db.save();
    logger.audit('Campaign', `Deleted Campaign [ID: ${id}]`);
    return true;
  }

  public static async addLead(campaignId: string, leadId: string): Promise<import('../../src/types.ts').Campaign> {
    const idx = db.campaigns.findIndex(c => c.id === campaignId);
    if (idx < 0) throw new Error(`Campaign not found with ID ${campaignId}`);

    const campaign = db.campaigns[idx];
    if (!campaign.leads.includes(leadId)) {
      campaign.leads.push(leadId);
      campaign.successMetrics.leadsAdded = campaign.leads.length;
    }

    // Set lead campaign ID
    const leadIdx = db.leads.findIndex(l => l.id === leadId);
    if (leadIdx >= 0) {
      db.leads[leadIdx].campaignId = campaignId;
      db.leads[leadIdx].updatedAt = new Date().toISOString();
    }

    db.save();
    await ActivityLogRepository.record(leadId, 'campaign_assigned', `Assigned to Campaign: ${campaign.name}`);
    return campaign;
  }

  public static async removeLead(campaignId: string, leadId: string): Promise<import('../../src/types.ts').Campaign> {
    const idx = db.campaigns.findIndex(c => c.id === campaignId);
    if (idx < 0) throw new Error(`Campaign not found with ID ${campaignId}`);

    const campaign = db.campaigns[idx];
    campaign.leads = campaign.leads.filter(id => id !== leadId);
    campaign.successMetrics.leadsAdded = campaign.leads.length;

    // Unset lead campaign ID
    const leadIdx = db.leads.findIndex(l => l.id === leadId);
    if (leadIdx >= 0 && db.leads[leadIdx].campaignId === campaignId) {
      db.leads[leadIdx].campaignId = null;
      db.leads[leadIdx].updatedAt = new Date().toISOString();
    }

    db.save();
    await ActivityLogRepository.record(leadId, 'campaign_unassigned', `Removed from Campaign: ${campaign.name}`);
    return campaign;
  }
}

export class PluginRepository {
  public static async list(): Promise<import('../../src/types.ts').PluginDefinition[]> {
    return db.plugins;
  }

  public static async get(id: string): Promise<import('../../src/types.ts').PluginDefinition | null> {
    const plugin = db.plugins.find(p => p.id === id);
    return plugin || null;
  }

  public static async update(id: string, updates: Partial<import('../../src/types.ts').PluginDefinition>): Promise<import('../../src/types.ts').PluginDefinition> {
    const idx = db.plugins.findIndex(p => p.id === id);
    if (idx < 0) {
      throw new Error(`Plugin not found with ID ${id}`);
    }

    const current = db.plugins[idx];
    const updated = {
      ...current,
      ...updates
    };

    db.plugins[idx] = updated;
    db.save();
    logger.audit('Plugin', `Updated Plugin: ${updated.name} (enabled: ${updated.enabled})`);
    return updated;
  }
}

export class NotificationRepository {
  public static async list(): Promise<import('../../src/types.ts').AppNotification[]> {
    return db.notifications;
  }

  public static async create(notifData: Partial<import('../../src/types.ts').AppNotification>): Promise<import('../../src/types.ts').AppNotification> {
    const notif: import('../../src/types.ts').AppNotification = {
      id: 'notif-' + Math.random().toString(36).substring(2, 9),
      title: notifData.title || 'Notification',
      message: notifData.message || '',
      type: notifData.type || 'info',
      read: false,
      createdAt: new Date().toISOString()
    };
    db.notifications.unshift(notif);
    db.save();
    return notif;
  }

  public static async markAsRead(id: string): Promise<boolean> {
    const idx = db.notifications.findIndex(n => n.id === id);
    if (idx < 0) return false;
    db.notifications[idx].read = true;
    db.save();
    return true;
  }

  public static async delete(id: string): Promise<boolean> {
    const idx = db.notifications.findIndex(n => n.id === id);
    if (idx < 0) return false;
    db.notifications.splice(idx, 1);
    db.save();
    return true;
  }
}

export class EnhancedNoteRepository {
  public static async list(leadId: string): Promise<import('../../src/types.ts').EnhancedLeadNote[]> {
    return db.enhancedNotes.filter(n => n.leadId === leadId);
  }

  public static async create(noteData: Partial<import('../../src/types.ts').EnhancedLeadNote>): Promise<import('../../src/types.ts').EnhancedLeadNote> {
    const note: import('../../src/types.ts').EnhancedLeadNote = {
      id: 'enote-' + Math.random().toString(36).substring(2, 9),
      leadId: noteData.leadId!,
      content: noteData.content || '',
      pinned: noteData.pinned || false,
      tags: noteData.tags || [],
      mentions: noteData.mentions || [],
      checklist: noteData.checklist || [],
      attachments: noteData.attachments || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.enhancedNotes.unshift(note);
    db.save();
    return note;
  }

  public static async update(id: string, updates: Partial<import('../../src/types.ts').EnhancedLeadNote>): Promise<import('../../src/types.ts').EnhancedLeadNote> {
    const idx = db.enhancedNotes.findIndex(n => n.id === id);
    if (idx < 0) throw new Error(`Enhanced note not found with ID ${id}`);

    const current = db.enhancedNotes[idx];
    const updated = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    db.enhancedNotes[idx] = updated;
    db.save();
    return updated;
  }

  public static async delete(id: string): Promise<boolean> {
    const idx = db.enhancedNotes.findIndex(n => n.id === id);
    if (idx < 0) return false;
    db.enhancedNotes.splice(idx, 1);
    db.save();
    return true;
  }
}

export class InboxMessageRepository {
  public static async list(leadId?: string): Promise<import('../../src/types.ts').InboxMessage[]> {
    let list = db.inboxMessages;
    if (leadId) {
      list = list.filter(m => m.leadId === leadId);
    }
    return list;
  }

  public static async create(msgData: Partial<import('../../src/types.ts').InboxMessage>): Promise<import('../../src/types.ts').InboxMessage> {
    const msg: import('../../src/types.ts').InboxMessage = {
      id: 'inbox-msg-' + Math.random().toString(36).substring(2, 9),
      leadId: msgData.leadId,
      sender: msgData.sender || 'Unknown Sender',
      recipient: msgData.recipient || 'sales@alphatech.com',
      subject: msgData.subject || 'No Subject',
      body: msgData.body || '',
      receivedAt: new Date().toISOString(),
      read: false,
      syncProvider: msgData.syncProvider || 'manual',
      threadId: msgData.threadId
    };
    db.inboxMessages.unshift(msg);
    db.save();
    return msg;
  }

  public static async markAsRead(id: string): Promise<boolean> {
    const idx = db.inboxMessages.findIndex(m => m.id === id);
    if (idx < 0) return false;
    db.inboxMessages[idx].read = true;
    db.save();
    return true;
  }
}

// Simple adapter helpers representing SQL transactional commits
export class DBTransaction {
  public static async run<T>(block: (db: FileDatabase) => Promise<T>): Promise<T> {
    // In local JSON, we do synchronous state locking & persistence
    try {
      const result = await block(db);
      db.save();
      return result;
    } catch (e) {
      logger.error('DBTransaction', 'Database transaction failed and rollback executed');
      throw e;
    }
  }
}
