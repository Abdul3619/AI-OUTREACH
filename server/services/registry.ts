import { logger } from './logging.ts';

// ==========================================
// 1. SWAPPABLE CONNECTOR / PLUGIN INTERFACES
// ==========================================

export enum PluginCategory {
  AI = 'ai',
  EMAIL = 'email',
  CALENDAR = 'calendar',
  MAPS = 'maps',
  DATABASE = 'database'
}

export interface IPluginConnector {
  id: string;
  name: string;
  category: PluginCategory;
  description: string;
  isConfigured: boolean;
  initialize(config: Record<string, any>): Promise<boolean>;
  validateConfig(config: Record<string, any>): string[] | null; // returns validation errors or null
}

// Concrete Interfaces for Categories to be implemented in future phases

export interface IAIEnginePlugin extends IPluginConnector {
  generateStructuredJSON<T>(prompt: string, schema: any): Promise<T>;
  generateText(prompt: string): Promise<string>;
}

export interface IEmailPlugin extends IPluginConnector {
  sendEmail(to: string, subject: string, htmlBody: string): Promise<{ success: boolean; messageId?: string }>;
}

export interface ICalendarPlugin extends IPluginConnector {
  createEvent(eventDetails: any): Promise<{ success: boolean; eventId: string }>;
}

export interface IMapsPlugin extends IPluginConnector {
  geocodeAddress(address: string): Promise<any>;
}

export interface IDatabasePlugin extends IPluginConnector {
  query(statement: string, params?: any[]): Promise<any[]>;
}

// ==========================================
// 2. MULTI-AGENT ARCHITECTURE CONTRACTS
// ==========================================

export interface IAgent {
  id: string;
  name: string;
  description: string;
  version: string;
  execute(input: any): Promise<any>;
}

// Specific Micro-Agent registrations as described in Section 3 of AGENTS.md

export interface IAgentLeadDiscovery extends IAgent {
  execute(input: { query: string }): Promise<{
    companyName: string;
    website: string | null;
    industry: string;
    city: string | null;
    country: string | null;
    language: string;
  }>;
}

export interface IAgentWebsiteIntelligence extends IAgent {
  execute(input: { html: string }): Promise<any>;
}

export interface IAgentBusinessIntelligence extends IAgent {
  execute(input: { textSummary: string }): Promise<any>;
}

export interface IAgentProposalGenerator extends IAgent {
  execute(input: {
    businessProfile: any;
    webIntel: any;
    bizIntel: any;
    channel: string;
  }): Promise<any>;
}

export interface IAgentQA extends IAgent {
  execute(input: { draft: any }): Promise<any>;
}

export interface IAgentCRM extends IAgent {
  execute(input: { leadStatusUpdate: any }): Promise<any>;
}

export interface IAgentTranslation extends IAgent {
  execute(input: { text: string; targetLang: string }): Promise<any>;
}

// ==========================================
// 3. REGISTRY MANAGER ENGINE
// ==========================================

class PluginAndAgentRegistry {
  private plugins: Map<string, IPluginConnector> = new Map();
  private agents: Map<string, IAgent> = new Map();

  // --- Plugin Methods ---
  
  public registerPlugin(plugin: IPluginConnector): void {
    if (this.plugins.has(plugin.id)) {
      logger.warn('Registry', `Overwriting already registered plugin: ${plugin.id}`);
    }
    this.plugins.set(plugin.id, plugin);
    logger.info('Registry', `Plugin registered successfully: ${plugin.name} (${plugin.id})`);
  }

  public getPlugin<T extends IPluginConnector>(id: string): T | undefined {
    return this.plugins.get(id) as T;
  }

  public getPluginsByCategory(category: PluginCategory): IPluginConnector[] {
    return Array.from(this.plugins.values()).filter(p => p.category === category);
  }

  public getAllPlugins(): IPluginConnector[] {
    return Array.from(this.plugins.values());
  }

  // --- Agent Methods ---

  public registerAgent(agent: IAgent): void {
    if (this.agents.has(agent.id)) {
      logger.warn('Registry', `Overwriting already registered agent: ${agent.id}`);
    }
    this.agents.set(agent.id, agent);
    logger.info('Registry', `Agent registered successfully: ${agent.name} (${agent.id})`);
  }

  public getAgent<T extends IAgent>(id: string): T | undefined {
    return this.agents.get(id) as T;
  }

  public getAllAgents(): IAgent[] {
    return Array.from(this.agents.values());
  }
}

export const registry = new PluginAndAgentRegistry();

// ==========================================
// 4. BOOTSTRAP PLUGINS AND AGENTS MOCKS
// ==========================================

// Helper mock builder for the required connectors
const buildMockPlugin = (id: string, name: string, category: PluginCategory, description: string): IPluginConnector => {
  return {
    id,
    name,
    category,
    description,
    isConfigured: false,
    async initialize(config: Record<string, any>): Promise<boolean> {
      logger.info('Registry', `Initializing mock connector for ${name}`);
      this.isConfigured = true;
      return true;
    },
    validateConfig(config: Record<string, any>): string[] | null {
      const missingKeys: string[] = [];
      if (id === 'gemini' && !config.apiKey) missingKeys.push('apiKey');
      if (id === 'resend' && !config.apiKey) missingKeys.push('apiKey');
      return missingKeys.length > 0 ? missingKeys : null;
    }
  };
};

// Bootstrap the 11 Required Phase 1 Connectors
export function bootstrapPluginConnectors() {
  const mockConnectors = [
    // AI
    buildMockPlugin('gemini', 'Google Gemini AI', PluginCategory.AI, 'Official Gemini models via @google/genai'),
    buildMockPlugin('openai', 'OpenAI ChatGPT', PluginCategory.AI, 'GPT-4o and custom models integration'),
    buildMockPlugin('claude', 'Anthropic Claude', PluginCategory.AI, 'Claude 3.5 Sonnet integrations for high-level editing'),
    
    // Email
    buildMockPlugin('gmail', 'Gmail OAuth Integration', PluginCategory.EMAIL, 'Direct secure connection to user personal mailbox'),
    buildMockPlugin('resend', 'Resend Delivery API', PluginCategory.EMAIL, 'Bespoke high-volume agency transactional email system'),
    buildMockPlugin('smtp', 'Standard Custom SMTP', PluginCategory.EMAIL, 'Fallback email dispatcher utilizing generic mail configs'),
    
    // Calendar & Maps
    buildMockPlugin('calendar', 'Google Calendar API', PluginCategory.CALENDAR, 'Smart workflow automation for client callback sessions'),
    buildMockPlugin('maps', 'Google Maps Platform', PluginCategory.MAPS, 'Geocoding, demographic indexing, and location discovery validation'),
    
    // Database Adapters
    buildMockPlugin('postgres', 'PostgreSQL Engine', PluginCategory.DATABASE, 'SaaS scale secure relational server-side storage'),
    buildMockPlugin('supabase', 'Supabase Database', PluginCategory.DATABASE, 'Fast backend SQL virtualization with realtime triggers'),
    buildMockPlugin('firebase', 'Firebase Firestore Auth', PluginCategory.DATABASE, 'Client real-time stream sync and token user authorizations')
  ];

  mockConnectors.forEach(conn => registry.registerPlugin(conn));
}

// Bootstrap the 7 Required Phase 1 Micro-Agents
export function bootstrapMicroAgents() {
  const buildMockAgent = (id: string, name: string, description: string): IAgent => {
    return {
      id,
      name,
      description,
      version: '1.1.0',
      async execute(input: any): Promise<any> {
        logger.info('Registry', `Mock Agent ${name} triggered`);
        return { status: 'mock_executed', agentId: id, timestamp: new Date().toISOString() };
      }
    };
  };

  const mockAgents = [
    buildMockAgent('lead-discovery', 'Lead Discovery Agent', 'Discovers potential business prospects and processes basic company parameters'),
    buildMockAgent('website-intelligence', 'Website Intelligence Agent', 'Analyzes website crawl details, SEO flaws, accessibility compliance, and layouts'),
    buildMockAgent('business-intelligence', 'Business Intelligence Agent', 'Conducts competitor, SWOT, and maturity metrics evaluation of lead offerings'),
    buildMockAgent('proposal-generator', 'Proposal Generator Agent', 'Synthesizes intelligence findings and drafts deep contextual copy for pitches'),
    buildMockAgent('qa-agent', 'Quality Assurance Agent', 'Audits drafted proposals for natural writing, spam ratios, and compliance bounds'),
    buildMockAgent('crm-agent', 'CRM Manager Agent', 'Updates pipelines and constructs contextual reminder events on CRM progress'),
    buildMockAgent('translation-localization', 'Translation & Localization Agent', 'Localizes proposals according to cultural contexts and regional layouts')
  ];

  mockAgents.forEach(agent => registry.registerAgent(agent));
}
