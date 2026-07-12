/**
 * AI Outreach Platform & Sales CRM - Shared TypeScript Types (v1.1)
 * This file serves as the single source of truth for both the frontend client and backend server.
 */

// --- ENUMS ---

export enum LeadStatus {
  DISCOVERED = 'discovered',
  QUALIFIED = 'qualified',
  RESEARCHING = 'researching',
  READY_FOR_ANALYSIS = 'ready_for_analysis',
  PROPOSAL_DRAFTED = 'proposal_drafted',
  AWAITING_APPROVAL = 'awaiting_approval',
  READY_TO_CONTACT = 'ready_to_contact',
  CONTACTED = 'contacted',
  FOLLOW_UP = 'follow_up',
  NEGOTIATING = 'negotiating',
  WON = 'won',
  LOST = 'lost',
  ARCHIVED = 'archived'
}

export enum CommunicationChannel {
  EMAIL = 'email',
  LINKEDIN = 'linkedin',
  CONTACT_FORM = 'contact_form',
  WHATSAPP = 'whatsapp',
  FACEBOOK = 'facebook'
}

export enum MessageStatus {
  DRAFT = 'draft',
  REVIEW_REQUIRED = 'review_required',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ARCHIVED = 'archived',
  SENT = 'sent',
  REPLIED = 'replied',
  BOUNCED = 'bounced',
  SCHEDULED = 'scheduled',
  READY = 'ready'
}

export enum OpportunityPriority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  VERY_HIGH = 'Very High'
}

export enum OrgRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  VIEWER = 'viewer'
}

// --- DATA ACCESS LAYER / DATABASE CONTRACTS ---

export interface Organization {
  id: string;
  name: string;
  subscriptionTier: 'free' | 'pro' | 'enterprise';
  usageLimit: number; // monthly lead analysis quota
  createdAt: string;
  updatedAt: string;
}

export interface Workspace {
  id: string;
  orgId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  orgId: string;
  email: string;
  role: OrgRole;
  fullName: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

export interface BusinessProfile {
  id: string;
  workspaceId: string;
  companyName: string;
  industry: string | null;
  services: string[]; // offered products/services
  targetAudience: string | null;
  toneOfVoice: string; // e.g. professional, bold, casual, consultative
  portfolioLinks: string[];
  defaultTemplates: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Detailed website scoring across 9 distinct categories
 */
export interface WebsiteHealthScores {
  seo: number;           // 0-100 (Weight: 15%)
  performance: number;   // 0-100 (Weight: 10%)
  mobile: number;        // 0-100 (Weight: 15%)
  accessibility: number; // 0-100 (Weight: 10%)
  branding: number;      // 0-100 (Weight: 10%)
  ux: number;            // 0-100 (Weight: 15%)
  content: number;       // 0-100 (Weight: 10%)
  security: number;      // 0-100 (Weight: 10%)
  trust: number;         // 0-100 (Weight: 5%)
}

/**
 * AI Analysis details containing Web & Business Intelligence reports
 */
export interface AIAnalysisData {
  techStack: string[];
  cmsDetected: string | null;
  seoIssues: string[];
  uxIssues: string[];
  brandingIssues: string[];
  accessibilityIssues: string[];
  strengths: string[];      // SWOT - Strengths
  weaknesses: string[];     // SWOT - Weaknesses
  targetDemographics: string[];
  valueProposition: string;
  detectedLanguage: string;
  missingFeatures: string[]; // e.g. ["Online Scheduling Button", "FAQ section"]
  lastAnalyzedAt: string;
}

export interface LeadAttachment {
  id: string;
  leadId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
}

export interface LeadNoteHistory {
  id: string;
  content: string;
  updatedAt: string;
}

export interface Lead {
  id: string;
  workspaceId: string;
  businessName: string;
  industry?: string | null;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedinUrl?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  city?: string | null;
  country?: string | null;
  businessSize?: string | null;
  languageCode: string;
  campaignId?: string | null;
  
  // Phase 2 CRM properties
  category?: string | null;
  contactName?: string | null;
  whatsapp?: string | null;
  googleBusinessUrl?: string | null;
  notes?: string | null;
  owner?: string | null;
  lastActivity?: string | null;
  nextFollowUpDate?: string | null;
  attachments?: LeadAttachment[];
  noteHistory?: LeadNoteHistory[];

  // Category Scoring
  scoreSeo: number;
  scorePerformance: number;
  scoreMobile: number;
  scoreAccessibility: number;
  scoreBranding: number;
  scoreUx: number;
  scoreContent: number;
  scoreSecurity: number;
  scoreTrust: number;
  
  // Compiled Scoring Outputs
  websiteHealthScore: number; // weighted sum
  opportunityScore: number;   // calculated conversion value (0-100)
  opportunityPriority: OpportunityPriority;
  suggestedAction: string | null;
  
  status: LeadStatus;
  tags: string[];
  leadSource: string;
  aiAnalysisData: AIAnalysisData | null;
  enrichment?: LeadEnrichmentData | null;
  lastContactedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FieldValidation {
  valid: boolean;
  error?: string | null;
  suggestion?: string | null;
}

export interface DomainValidationResult {
  validFormat: boolean;
  isHttps: boolean;
  redirectsOk: boolean;
  dnsResolved: boolean;
  reachability: 'reachable' | 'unreachable' | 'unknown';
  statusCode?: number | null;
}

export interface EmailValidationResult {
  validFormat: boolean;
  isDisposable: boolean;
  domainExists: boolean;
}

export interface LeadEnrichmentData {
  completenessScore: number; // 0-100
  missingFields: string[];
  
  validations: {
    businessName: FieldValidation;
    website: FieldValidation & { domainDetails?: DomainValidationResult | null };
    email: FieldValidation & { emailDetails?: EmailValidationResult | null };
    phone: FieldValidation;
    country: FieldValidation;
    city: FieldValidation;
    socials: {
      linkedin: FieldValidation;
      facebook: FieldValidation;
      instagram: FieldValidation;
      x: FieldValidation;
      youtube: FieldValidation;
    };
  };

  languagePrep: {
    preferredLanguage: string;
    secondaryLanguage?: string | null;
    confidence: number;
  };
  locationPrep: {
    country: string | null;
    region: string | null;
    city: string | null;
    timezone: string | null;
  };

  industrySuggestions: string[];
  tagRecommendations: string[];
  duplicateGroupIds: string[];
  ignoredDuplicateIds: string[];
}

/**
 * Quality metrics evaluated by the QA Agent
 */
export interface OutreachQAMetrics {
  personalization: number;   // 0-100
  professionalism: number;   // 0-100
  naturalTone: number;       // 0-100
  languageAccuracy: number;  // 0-100
  spamRisk: number;          // 0-100 (needs to be <30% to pass automatically)
  confidence: 'Low' | 'Medium' | 'High';
}

export interface ProposalVersion {
  versionNumber: number;
  subjectLine: string | null;
  bodyContent: string;
  createdAt: string;
  author: string;
}

export interface ObjectionPrediction {
  concern: string; // Budget, Timing, Existing developer, Trust, Complexity, Need
  explanation: string;
  suggestedResponse: string;
}

export interface ProposalMemoryEntry {
  id: string;
  leadId: string;
  leadName: string;
  industry: string;
  proposalType: string;
  tone: string;
  language: string;
  opening: string;
  closing: string;
  overallScore: number;
  status: 'approved' | 'rejected' | 'draft';
  feedback?: string;
  createdAt: string;
}

export interface OutreachMessage {
  id: string;
  leadId: string;
  channel: CommunicationChannel;
  subjectLine: string | null;
  bodyContent: string;
  originalAiContent: string | null;
  
  // QA evaluation indicators
  qaMetrics: OutreachQAMetrics | null;
  
  status: MessageStatus;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;

  // Phase 4 - Proposal Intelligence properties
  proposalType?: string;
  tone?: string;
  language?: string;
  version?: number;
  versions?: ProposalVersion[];
  objections?: ObjectionPrediction[];
  portfolioMatches?: { title: string; description: string; relevance: number }[];
  caseStudies?: string[];
  aiSuggestions?: string[];
  detailedQualityMetrics?: {
    personalization: number;
    grammar: number;
    professionalism: number;
    trust: number;
    spamScore: number;
    readability: number;
    localizationQuality: number;
    overallScore: number;
  };
}

export interface Task {
  id: string;
  leadId: string;
  title: string;
  description: string | null;
  dueDate: string;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  leadId: string | null;
  actionType: string; // e.g. lead_created, analyzed, draft_generated, status_changed, message_sent
  description: string;
  createdAt: string;
}

// --- DASHBOARD PORTLET INTERFACES ---

export interface DashboardStats {
  leadCounts: Record<LeadStatus, number>;
  conversionFunnel: {
    stage: string;
    count: number;
    percentage: number;
  }[];
  pipelineDistribution: {
    status: LeadStatus;
    count: number;
    value: number; // Potential opportunity sum
  }[];
  openRate: number;
  replyRate: number;
  totalOpportunities: number;
  topOpportunities: {
    leadId: string;
    businessName: string;
    website: string | null;
    opportunityScore: number;
    priority: OpportunityPriority;
  }[];
}

// --- AGENT INTERFACES & SERVICE PLUGINS ---

/**
 * Input to execute AI Generation
 */
export interface AIServiceConnectorInput {
  businessProfile: BusinessProfile;
  lead: Lead;
  channel: CommunicationChannel;
}

/**
 * Output model for Agent 2: Website Intelligence
 */
export interface WebsiteIntelligenceOutput {
  cms: string | null;
  techStack: string[];
  seoIssues: string[];
  uxIssues: string[];
  accessibilityIssues: string[];
  brandingIssues: string[];
  responsiveFlawDetected: boolean;
  scoring: WebsiteHealthScores;
}

/**
 * Output model for Agent 3: Business Intelligence
 */
export interface BusinessIntelligenceOutput {
  strengths: string[];
  weaknesses: string[];
  competitors: string[];
  maturityLevel: 'early_stage' | 'mid_market' | 'enterprise';
  estimatedTargetDemographics: string[];
  valueProposition: string;
  missingBusinessFeatures: string[];
}

/**
 * Output model for Agent 4: Proposal Generator
 */
export interface ProposalGeneratorOutput {
  subjectLine: string | null;
  body: string;
  summaryOfDetectedPainPoints: string[];
  recommendedCaseStudies: string[];
}

/**
 * Output model for Agent 5: Quality Assurance
 */
export interface QAOutput {
  passed: boolean;
  scores: OutreachQAMetrics;
  feedback: string | null; // Suggestions to self-heal
}

/**
 * Output model for Agent 7: Translation & Localization
 */
export interface LocalizationOutput {
  languageCode: string;
  localizedSubject: string | null;
  localizedBody: string;
}

/**
 * Combined Response for Client API Draft Initiations
 */
export interface DraftGenerationResponse {
  message: OutreachMessage;
  healingIterationCount: number; // Counts the self-healing attempts done by Agent 5
}

// --- PHASE 5: OUTREACH & CAMPAIGN MANAGEMENT ---

export interface CampaignSuccessMetrics {
  leadsAdded: number;
  proposalsGenerated: number;
  approved: number;
  scheduled: number;
  sent: number;
  replies: number;
  meetings: number;
  conversions: number;
  revenue: number; // manual entry in USD
  conversionRate: number; // calculated %
  replyRate: number; // calculated %
  approvalRate: number; // calculated %
}

export interface Campaign {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  targetIndustry: string;
  country: string;
  language: string;
  status: 'draft' | 'active' | 'completed' | 'paused';
  goal: string;
  leads: string[]; // List of Lead IDs
  successMetrics: CampaignSuccessMetrics;
  createdAt: string;
  updatedAt: string;
}

export interface PluginDefinition {
  id: string;
  name: string;
  description: string;
  type: 'email' | 'messaging' | 'calendar' | 'crm' | 'export' | 'analytics';
  provider: string; // e.g., "SendGrid", "WhatsApp Web", "Google Calendar"
  enabled: boolean;
  config: Record<string, string>; // stores secret API keys, configurations
  createdAt: string;
}

export interface CustomPipelineStage {
  id: string; // unique slug or UUID
  key: string; // maps to a LeadStatus or custom stage slug
  label: string;
  order: number;
  color: string; // Hex color code or Tailwind color
  visible: boolean;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'task' | 'followup' | 'campaign' | 'plugin' | 'error' | 'info';
  read: boolean;
  createdAt: string;
}

export interface NoteChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface EnhancedLeadNote {
  id: string;
  leadId: string;
  content: string;
  pinned: boolean;
  tags: string[];
  mentions: string[]; // lists of usernames or emails
  checklist: NoteChecklistItem[];
  attachments: { id: string; fileName: string; fileSize: number }[];
  createdAt: string;
  updatedAt: string;
}

export interface InboxMessage {
  id: string;
  leadId?: string;
  sender: string; // e.g., "Robert Vance <r.vance@apexlegal.com>"
  recipient: string; // e.g., "sales@alphatech.com"
  subject: string;
  body: string;
  receivedAt: string;
  read: boolean;
  syncProvider: 'gmail' | 'outlook' | 'imap' | 'manual';
  threadId?: string;
}

