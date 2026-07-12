/**
 * Client-Side API Communication Wrappers
 * Bridges React Query handlers to the Express API routes.
 */

import { 
  BusinessProfile, 
  Task, 
  ActivityLog, 
  User, 
  Organization, 
  Workspace, 
  Lead, 
  DashboardStats, 
  OutreachMessage,
  Campaign,
  PluginDefinition,
  AppNotification,
  EnhancedLeadNote,
  InboxMessage
} from '../types.ts';

export class APIError extends Error {
  public code?: string;
  public status: number;
  
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(path, { ...options, headers });
  
  if (!response.ok) {
    let errorMsg = 'An unexpected response error occurred.';
    let errorCode = 'UNKNOWN';
    try {
      const errorJson = await response.json();
      errorMsg = errorJson.message || errorMsg;
      errorCode = errorJson.code || errorCode;
    } catch {
      // JSON parse failed
    }
    throw new APIError(errorMsg, response.status, errorCode);
  }

  return response.json() as Promise<T>;
}

export const apiService = {
  // Auth Modules
  async getSession(): Promise<{ status: string; user: User; organization: Organization; workspace: Workspace }> {
    return request('/api/auth/me');
  },

  async login(credentials: { email: string; password?: string }): Promise<{ user: User; organization: Organization; workspace: Workspace }> {
    const data = await request<{ user: User; organization: Organization; workspace: Workspace }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: credentials.email, password: credentials.password || 'default123' })
    });
    return data;
  },

  async signup(payload: { email: string; fullName: string; companyName?: string }): Promise<{ user: User; organization: Organization; workspace: Workspace }> {
    const data = await request<{ user: User; organization: Organization; workspace: Workspace }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return data;
  },

  async logout(): Promise<void> {
    await request('/api/auth/logout', { method: 'POST' });
  },

  // Business Profile Modules
  async getProfile(workspaceId: string): Promise<BusinessProfile> {
    const data = await request<{ status: string; profile: BusinessProfile }>(`/api/profile?workspaceId=${workspaceId}`);
    return data.profile;
  },

  async updateProfile(profile: Partial<BusinessProfile>): Promise<BusinessProfile> {
    const data = await request<{ status: string; profile: BusinessProfile }>('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(profile)
    });
    return data.profile;
  },

  // Task Modules
  async getTasks(): Promise<Task[]> {
    const data = await request<{ status: string; tasks: Task[] }>('/api/tasks');
    return data.tasks;
  },

  async createTask(task: Partial<Task>): Promise<Task> {
    const data = await request<{ status: string; task: Task }>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(task)
    });
    return data.task;
  },

  async updateTask(id: string, isCompleted: boolean): Promise<Task> {
    const data = await request<{ status: string; task: Task }>(`/api/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isCompleted })
    });
    return data.task;
  },

  async deleteTask(id: string): Promise<void> {
    await request(`/api/tasks/${id}`, { method: 'DELETE' });
  },

  // Logs Modules
  async getLogs(limit = 100): Promise<ActivityLog[]> {
    const data = await request<{ status: string; logs: ActivityLog[] }>(`/api/logs?limit=${limit}`);
    return data.logs;
  },

  // Registry Modules
  async getPlugins(): Promise<{ id: string; name: string; category: string; description: string; isConfigured: boolean }[]> {
    const data = await request<{ status: string; plugins: any[] }>('/api/registry/plugins');
    return data.plugins;
  },

  async getAgents(): Promise<{ id: string; name: string; description: string; version: string }[]> {
    const data = await request<{ status: string; agents: any[] }>('/api/registry/agents');
    return data.agents;
  },

  // Settings Configurations Modules
  async getSettings(): Promise<Record<string, any>> {
    const data = await request<{ status: string; settings: Record<string, any> }>('/api/settings');
    return data.settings;
  },

  async updateSettings(section: string, value: Record<string, any>): Promise<Record<string, any>> {
    const data = await request<{ status: string; settings: Record<string, any> }>(`/api/settings/${section}`, {
      method: 'PUT',
      body: JSON.stringify(value)
    });
    return data.settings;
  },

  // Lead CRM Modules
  async getLeads(workspaceId: string, filters: { search?: string; status?: string; priority?: string; industry?: string; tag?: string } = {}): Promise<Lead[]> {
    const params = new URLSearchParams({ workspaceId });
    if (filters.search) params.append('search', filters.search);
    if (filters.status) params.append('status', filters.status);
    if (filters.priority) params.append('priority', filters.priority);
    if (filters.industry) params.append('industry', filters.industry);
    if (filters.tag) params.append('tag', filters.tag);

    const data = await request<{ status: string; leads: Lead[] }>(`/api/leads?${params.toString()}`);
    return data.leads;
  },

  async getLead(id: string): Promise<Lead> {
    const data = await request<{ status: string; lead: Lead }>(`/api/leads/${id}`);
    return data.lead;
  },

  async createLead(leadData: Partial<Lead> & { workspaceId: string; businessName: string }): Promise<Lead> {
    const data = await request<{ status: string; lead: Lead }>('/api/leads', {
      method: 'POST',
      body: JSON.stringify(leadData)
    });
    return data.lead;
  },

  async updateLead(id: string, updates: Partial<Lead>): Promise<Lead> {
    const data = await request<{ status: string; lead: Lead }>(`/api/leads/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
    return data.lead;
  },

  async deleteLead(id: string): Promise<void> {
    await request(`/api/leads/${id}`, { method: 'DELETE' });
  },

  async getLeadStats(workspaceId: string): Promise<DashboardStats> {
    const data = await request<{ status: string; stats: DashboardStats }>(`/api/leads/stats?workspaceId=${workspaceId}`);
    return data.stats;
  },

  async addLeadNote(id: string, notes: string): Promise<Lead> {
    const data = await request<{ status: string; lead: Lead }>(`/api/leads/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify({ notes })
    });
    return data.lead;
  },

  async addLeadAttachment(id: string, fileName: string, fileSize: number, fileType: string): Promise<Lead> {
    const data = await request<{ status: string; lead: Lead }>(`/api/leads/${id}/attachments`, {
      method: 'POST',
      body: JSON.stringify({ fileName, fileSize, fileType })
    });
    return data.lead;
  },

  async enrichLead(id: string): Promise<Lead> {
    const data = await request<{ status: string; lead: Lead }>(`/api/leads/${id}/enrich`, {
      method: 'POST'
    });
    return data.lead;
  },

  async mergeLeads(primaryId: string, duplicateLeadIds: string[], fieldsToKeep: Partial<Lead>): Promise<Lead> {
    const data = await request<{ status: string; lead: Lead }>(`/api/leads/${primaryId}/merge`, {
      method: 'POST',
      body: JSON.stringify({ duplicateLeadIds, fieldsToKeep })
    });
    return data.lead;
  },

  async ignoreDuplicate(id: string, duplicateId: string): Promise<Lead> {
    const data = await request<{ status: string; lead: Lead }>(`/api/leads/${id}/ignore-duplicate`, {
      method: 'POST',
      body: JSON.stringify({ duplicateId })
    });
    return data.lead;
  },

  async batchEnrichLeads(workspaceId: string): Promise<{ successCount: number }> {
    const data = await request<{ status: string; successCount: number }>('/api/leads/batch-enrich', {
      method: 'POST',
      body: JSON.stringify({ workspaceId })
    });
    return data;
  },

  async analyzeLead(id: string): Promise<Lead> {
    const data = await request<{ status: string; lead: Lead }>(`/api/leads/${id}/analyze`, {
      method: 'POST'
    });
    return data.lead;
  },

  // Proposal Intelligence Modules
  async generateProposal(leadId: string, options: { proposalType: string; tone: string; language: string; channel: string; workspaceId?: string }): Promise<OutreachMessage> {
    const data = await request<{ status: string; proposal: OutreachMessage }>(`/api/leads/${leadId}/proposals/generate`, {
      method: 'POST',
      body: JSON.stringify(options)
    });
    return data.proposal;
  },

  async getLeadProposals(leadId: string): Promise<OutreachMessage[]> {
    const data = await request<{ status: string; proposals: OutreachMessage[] }>(`/api/leads/${leadId}/proposals`);
    return data.proposals;
  },

  async getProposal(proposalId: string): Promise<OutreachMessage> {
    const data = await request<{ status: string; proposal: OutreachMessage }>(`/api/proposals/${proposalId}`);
    return data.proposal;
  },

  async updateProposal(proposalId: string, updates: { subjectLine: string; bodyContent: string; author?: string }): Promise<OutreachMessage> {
    const data = await request<{ status: string; proposal: OutreachMessage }>(`/api/proposals/${proposalId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
    return data.proposal;
  },

  async updateProposalStatus(proposalId: string, status: string, feedback?: string): Promise<OutreachMessage> {
    const data = await request<{ status: string; proposal: OutreachMessage }>(`/api/proposals/${proposalId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, feedback })
    });
    return data.proposal;
  },

  async restoreProposalVersion(proposalId: string, versionNumber: number): Promise<OutreachMessage> {
    const data = await request<{ status: string; proposal: OutreachMessage }>(`/api/proposals/${proposalId}/restore`, {
      method: 'POST',
      body: JSON.stringify({ versionNumber })
    });
    return data.proposal;
  },

  async getProposalMemory(): Promise<any> {
    const data = await request<{ status: string; stats: any }>('/api/proposals/memory');
    return data.stats;
  },

  // Campaigns API Wrappers
  async getCampaigns(workspaceId?: string): Promise<Campaign[]> {
    const url = workspaceId ? `/api/campaigns?workspaceId=${workspaceId}` : '/api/campaigns';
    return request<Campaign[]>(url);
  },

  async getCampaign(id: string): Promise<Campaign> {
    return request<Campaign>(`/api/campaigns/${id}`);
  },

  async createCampaign(campaign: Partial<Campaign>): Promise<Campaign> {
    return request<Campaign>('/api/campaigns', {
      method: 'POST',
      body: JSON.stringify(campaign)
    });
  },

  async updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign> {
    return request<Campaign>(`/api/campaigns/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  },

  async deleteCampaign(id: string): Promise<void> {
    await request(`/api/campaigns/${id}`, { method: 'DELETE' });
  },

  async addLeadToCampaign(campaignId: string, leadId: string): Promise<Campaign> {
    return request<Campaign>(`/api/campaigns/${campaignId}/leads`, {
      method: 'POST',
      body: JSON.stringify({ leadId })
    });
  },

  async removeLeadFromCampaign(campaignId: string, leadId: string): Promise<Campaign> {
    return request<Campaign>(`/api/campaigns/${campaignId}/leads/${leadId}`, {
      method: 'DELETE'
    });
  },

  // Plugins API Wrappers
  async getPluginDefinitions(): Promise<PluginDefinition[]> {
    return request<PluginDefinition[]>('/api/plugins');
  },

  async updatePluginConfig(id: string, updates: Partial<PluginDefinition>): Promise<PluginDefinition> {
    return request<PluginDefinition>(`/api/plugins/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  },

  // Notifications API Wrappers
  async getNotifications(): Promise<AppNotification[]> {
    return request<AppNotification[]>('/api/notifications');
  },

  async markNotificationRead(id: string): Promise<void> {
    await request(`/api/notifications/${id}/read`, { method: 'PATCH' });
  },

  async createNotification(notif: Partial<AppNotification>): Promise<AppNotification> {
    return request<AppNotification>('/api/notifications', {
      method: 'POST',
      body: JSON.stringify(notif)
    });
  },

  async deleteNotification(id: string): Promise<void> {
    await request(`/api/notifications/${id}`, { method: 'DELETE' });
  },

  // Enhanced Notes API Wrappers
  async getEnhancedNotes(leadId: string): Promise<EnhancedLeadNote[]> {
    return request<EnhancedLeadNote[]>(`/api/leads/${leadId}/enhanced-notes`);
  },

  async createEnhancedNote(leadId: string, note: Partial<EnhancedLeadNote>): Promise<EnhancedLeadNote> {
    return request<EnhancedLeadNote>(`/api/leads/${leadId}/enhanced-notes`, {
      method: 'POST',
      body: JSON.stringify(note)
    });
  },

  async updateEnhancedNote(id: string, updates: Partial<EnhancedLeadNote>): Promise<EnhancedLeadNote> {
    return request<EnhancedLeadNote>(`/api/enhanced-notes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  },

  async deleteEnhancedNote(id: string): Promise<void> {
    await request(`/api/enhanced-notes/${id}`, { method: 'DELETE' });
  },

  // Inbox Simulator API Wrappers
  async getInboxMessages(leadId?: string): Promise<InboxMessage[]> {
    const url = leadId ? `/api/inbox?leadId=${leadId}` : '/api/inbox';
    return request<InboxMessage[]>(url);
  },

  async markInboxMessageRead(id: string): Promise<void> {
    await request(`/api/inbox/${id}/read`, { method: 'PATCH' });
  },

  async simulateIncomingMessage(data: { leadId: string; sender?: string; subject?: string; body?: string }): Promise<InboxMessage> {
    return request<InboxMessage>('/api/inbox/simulate', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Integrations & Automation Ecosystem Wrappers
  async getIntegrationPlugins(): Promise<PluginDefinition[]> {
    const data = await request<any>('/api/integrations/plugins');
    if (data && Array.isArray(data.plugins)) {
      return data.plugins;
    }
    if (Array.isArray(data)) {
      return data;
    }
    return [];
  },

  async updateIntegrationPlugin(id: string, body: { enabled?: boolean; config?: Record<string, string> }): Promise<PluginDefinition> {
    const data = await request<{ status: string; plugin: PluginDefinition }>(`/api/integrations/plugins/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
    return data.plugin;
  },

  async testIntegrationPlugin(id: string): Promise<{ status: string; latency: number; details: string; timestamp: string }> {
    return request<{ status: string; latency: number; details: string; timestamp: string }>(`/api/integrations/plugins/${id}/test`, {
      method: 'POST'
    });
  },

  async getIntegrationJobs(): Promise<any[]> {
    const data = await request<{ status: string; jobs: any[] }>('/api/integrations/jobs');
    return data.jobs;
  },

  async createCrawlJob(leadId: string, name?: string): Promise<any> {
    return request<any>('/api/integrations/jobs/crawl', {
      method: 'POST',
      body: JSON.stringify({ leadId, name })
    });
  },

  async cancelIntegrationJob(id: string): Promise<void> {
    await request(`/api/integrations/jobs/${id}/cancel`, { method: 'POST' });
  },

  async retryIntegrationJob(id: string): Promise<void> {
    await request(`/api/integrations/jobs/${id}/retry`, { method: 'POST' });
  },

  async getAutomationRules(): Promise<any[]> {
    const data = await request<{ status: string; automations: any[] }>('/api/integrations/automations');
    return data.automations;
  },

  async createAutomationRule(rule: { name: string; trigger: string; action: string; actionParams?: any }): Promise<any> {
    const data = await request<{ status: string; rule: any }>('/api/integrations/automations', {
      method: 'POST',
      body: JSON.stringify(rule)
    });
    return data.rule;
  },

  async updateAutomationRule(id: string, updates: any): Promise<any> {
    const data = await request<{ status: string; rule: any }>(`/api/integrations/automations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
    return data.rule;
  },

  async deleteAutomationRule(id: string): Promise<void> {
    await request(`/api/integrations/automations/${id}`, { method: 'DELETE' });
  },

  async validateImportLeads(leads: any[]): Promise<any[]> {
    const data = await request<{ status: string; validated: any[] }>('/api/integrations/import/validate', {
      method: 'POST',
      body: JSON.stringify({ leads })
    });
    return data.validated;
  },

  async commitImportLeads(leads: any[], workspaceId: string): Promise<any> {
    return request<any>('/api/integrations/import/commit', {
      method: 'POST',
      body: JSON.stringify({ leads, workspaceId })
    });
  },

  async exportLeads(format: 'csv' | 'json' | 'pdf', fields: string[], workspaceId?: string): Promise<any> {
    if (format === 'json' || format === 'csv') {
      const response = await fetch('/api/integrations/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, fields, workspaceId })
      });
      if (!response.ok) throw new Error('Failed to generate export file.');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `crm_leads_export.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      return { success: true };
    } else {
      return request<any>('/api/integrations/export', {
        method: 'POST',
        body: JSON.stringify({ format, fields, workspaceId })
      });
    }
  },

  async getBackups(): Promise<any[]> {
    const data = await request<{ status: string; backups: any[] }>('/api/integrations/backups');
    return data.backups;
  },

  async createBackup(): Promise<any> {
    const data = await request<{ status: string; backup: any }>('/api/integrations/backups/create', {
      method: 'POST'
    });
    return data.backup;
  },

  async restoreBackup(id: string): Promise<any> {
    return request<any>(`/api/integrations/backups/${id}/restore`, { method: 'POST' });
  },

  async deleteBackup(id: string): Promise<void> {
    await request(`/api/integrations/backups/${id}`, { method: 'DELETE' });
  },

  async getDiagnostics(): Promise<any> {
    const data = await request<{ status: string; diagnostics: any }>('/api/integrations/diagnostics');
    return data.diagnostics;
  },

  async getIntegrityReport(): Promise<{ issues: any[]; scannedAt: string }> {
    return request<{ issues: any[]; scannedAt: string }>('/api/integrations/integrity');
  },

  async repairIntegrity(): Promise<{ repairs: string[]; timestamp: string }> {
    return request<{ repairs: string[]; timestamp: string }>('/api/integrations/integrity/repair', { method: 'POST' });
  },

  async getSecurityPolicy(): Promise<any> {
    const data = await request<{ status: string; security: any }>('/api/integrations/security');
    return data.security;
  },

  async updateSecurityPolicy(body: { mfaEnabled?: boolean; accountLockoutThreshold?: number; sessionTimeoutMinutes?: number }): Promise<any> {
    const data = await request<{ status: string; security: any }>('/api/integrations/security/update', {
      method: 'POST',
      body: JSON.stringify(body)
    });
    return data.security;
  },

  async triggerPasswordReset(email?: string): Promise<{ message: string }> {
    return request<{ message: string }>('/api/integrations/security/password-reset', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  async resetLockout(): Promise<any> {
    const data = await request<{ status: string; security: any }>('/api/integrations/security/lockout-reset', { method: 'POST' });
    return data.security;
  }
};
