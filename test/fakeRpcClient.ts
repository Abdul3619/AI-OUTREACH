// An in-memory stand-in for the Supabase RPC surface defined in
// supabase/migration.sql, implementing the exact same function names and
// the exact same business rules (status-rank-based registry merging,
// domain normalization, the "only move forward" rule, the permanent
// opt-out list) in plain TypeScript. Used by the test suite because this
// sandbox has no outbound internet and cannot reach a real Supabase
// project — see the test report for what this does and doesn't prove.
//
// Any behavior in here that diverges from migration.sql would make these
// tests pass while the real deployed function fails, so keep the two in
// sync: this file exists to test the *app's* logic and the *shape* of the
// contract between store.ts and the RPC layer, not to replace verifying
// the real SQL once it's applied.

import type { RpcClient, RpcResult } from '../server/store.ts';
import type { LeadStatus } from '../server/types.ts';

const STATUS_RANK: Record<string, number> = {
  crawling: 0,
  crawl_error: 1,
  drafting: 1,
  draft_error: 1,
  duplicate: 1,
  opted_out: 2,
  drafted: 3,
  rejected: 4,
  approved: 5,
  sent: 6,
};

interface BusinessRow {
  id: number;
  domain: string;
  name: string | null;
  website: string;
  city: string | null;
  country: string | null;
  createdAt: string;
}

interface LeadRow {
  id: number;
  businessId: number;
  source: string;
  status: string;
  error: string | null;
  evidence: any;
  draftSubject: string | null;
  draftBody: string | null;
  createdAt: string;
  updatedAt: string;
}

interface RegistryRow {
  domain: string;
  businessName: string | null;
  status: string;
  city: string | null;
  country: string | null;
  firstSeenAt: string;
  lastActionAt: string;
}

interface SearchRow {
  id: number;
  city: string;
  category: string;
  normalizedKey: string;
  resultCount: number;
  createdAt: string;
}

export class FakeRpcClient implements RpcClient {
  private businesses: BusinessRow[] = [];
  private leads: LeadRow[] = [];
  private registry: Map<string, RegistryRow> = new Map();
  private searches: SearchRow[] = [];
  private optouts: Map<string, string> = new Map();
  private nextBusinessId = 1;
  private nextLeadId = 1;
  private nextSearchId = 1;

  async rpc<T = any>(fn: string, params: Record<string, any> = {}): Promise<RpcResult<T>> {
    try {
      const data = await this.dispatch(fn, params);
      return { data: data as T, error: null };
    } catch (e: any) {
      return { data: null, error: { message: e.message || String(e) } };
    }
  }

  private async dispatch(fn: string, p: Record<string, any>): Promise<any> {
    switch (fn) {
      case 'ai_outreach_upsert_business':
        return this.upsertBusiness(p);
      case 'ai_outreach_create_lead':
        return this.createLead(p);
      case 'ai_outreach_update_lead':
        return this.updateLead(p);
      case 'ai_outreach_get_lead':
        return this.getLead(p.p_lead_id);
      case 'ai_outreach_list_leads':
        return this.listLeads(p.p_status ?? null);
      case 'ai_outreach_check_registry':
        return this.checkRegistry(p.p_domain);
      case 'ai_outreach_record_action':
        return this.recordAction(p);
      case 'ai_outreach_find_prior_search':
        return this.findPriorSearch(p.p_city, p.p_category);
      case 'ai_outreach_record_search':
        return this.recordSearch(p);
      case 'ai_outreach_list_searches':
        return this.searches.slice().sort((a, b) => b.id - a.id).map(searchToJson);
      case 'ai_outreach_add_optout':
        return this.addOptOut(p.p_email);
      case 'ai_outreach_check_optout':
        return this.optouts.has(normEmail(p.p_email));
      case 'ai_outreach_list_optouts':
        return Array.from(this.optouts.entries()).map(([email, requestedAt]) => ({ email, requestedAt }));
      case 'ai_outreach_coverage_stats':
        return this.coverageStats();
      default:
        throw new Error(`FakeRpcClient: unknown function "${fn}"`);
    }
  }

  private upsertBusiness(p: Record<string, any>): any {
    const domain = String(p.p_domain).toLowerCase().trim();
    if (!domain) throw new Error('domain is required');
    if (!p.p_website) throw new Error('website is required');
    let row = this.businesses.find((b) => b.domain === domain);
    if (!row) {
      row = {
        id: this.nextBusinessId++,
        domain,
        website: p.p_website,
        name: p.p_name || null,
        city: p.p_city || null,
        country: p.p_country || null,
        createdAt: new Date().toISOString(),
      };
      this.businesses.push(row);
    } else {
      row.name = row.name ?? p.p_name ?? null;
      row.city = row.city ?? p.p_city ?? null;
      row.country = row.country ?? p.p_country ?? null;
    }
    return { ...row };
  }

  private createLead(p: Record<string, any>): number {
    if (!['manual_url', 'csv', 'auto_search'].includes(p.p_source)) throw new Error(`invalid source: ${p.p_source}`);
    const id = this.nextLeadId++;
    this.leads.push({
      id,
      businessId: p.p_business_id,
      source: p.p_source,
      status: p.p_status,
      error: null,
      evidence: null,
      draftSubject: null,
      draftBody: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return id;
  }

  private updateLead(p: Record<string, any>): any {
    const lead = this.leads.find((l) => l.id === p.p_lead_id);
    if (!lead) throw new Error('lead not found');
    const patch = p.p_patch || {};
    if ('status' in patch) {
      if (!(patch.status in STATUS_RANK)) throw new Error(`invalid status: ${patch.status}`);
      lead.status = patch.status;
    }
    if ('error' in patch) lead.error = patch.error;
    if ('evidence' in patch) lead.evidence = patch.evidence;
    if ('draftSubject' in patch) lead.draftSubject = patch.draftSubject;
    if ('draftBody' in patch) lead.draftBody = patch.draftBody;
    lead.updatedAt = new Date().toISOString();
    return this.getLead(lead.id);
  }

  private getLead(id: number): any {
    const lead = this.leads.find((l) => l.id === id);
    if (!lead) return null;
    return this.hydrateLead(lead);
  }

  private listLeads(status: string | null): any[] {
    return this.leads
      .filter((l) => !status || l.status === status)
      .sort((a, b) => b.id - a.id)
      .map((l) => this.hydrateLead(l));
  }

  private hydrateLead(lead: LeadRow): any {
    const business = this.businesses.find((b) => b.id === lead.businessId);
    return {
      id: lead.id,
      businessId: lead.businessId,
      domain: business?.domain,
      website: business?.website,
      businessName: business?.name ?? null,
      city: business?.city ?? null,
      country: business?.country ?? null,
      source: lead.source,
      status: lead.status,
      error: lead.error,
      evidence: lead.evidence,
      draftSubject: lead.draftSubject,
      draftBody: lead.draftBody,
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt,
    };
  }

  private checkRegistry(domain: string): any {
    const row = this.registry.get(String(domain).toLowerCase().trim());
    return row ? { ...row } : null;
  }

  private recordAction(p: Record<string, any>): any {
    const domain = String(p.p_domain).toLowerCase().trim();
    if (!domain) throw new Error('domain is required');
    if (!(p.p_status in STATUS_RANK)) throw new Error(`invalid status: ${p.p_status}`);
    const existing = this.registry.get(domain);
    const now = new Date().toISOString();
    if (!existing) {
      const row: RegistryRow = {
        domain,
        businessName: p.p_business_name || null,
        status: p.p_status,
        city: p.p_city || null,
        country: p.p_country || null,
        firstSeenAt: now,
        lastActionAt: now,
      };
      this.registry.set(domain, row);
      return { ...row };
    }
    const newStatus = STATUS_RANK[p.p_status] >= STATUS_RANK[existing.status] ? p.p_status : existing.status;
    existing.status = newStatus;
    existing.businessName = p.p_business_name || existing.businessName;
    existing.city = p.p_city || existing.city;
    existing.country = p.p_country || existing.country;
    existing.lastActionAt = now;
    return { ...existing };
  }

  private findPriorSearch(city: string, category: string): any {
    const key = `${String(city).toLowerCase().trim()}::${String(category).toLowerCase().trim()}`;
    const matches = this.searches.filter((s) => s.normalizedKey === key).sort((a, b) => b.id - a.id);
    return matches.length ? searchToJson(matches[0]) : null;
  }

  private recordSearch(p: Record<string, any>): number {
    const id = this.nextSearchId++;
    this.searches.push({
      id,
      city: p.p_city,
      category: p.p_category,
      normalizedKey: `${String(p.p_city).toLowerCase().trim()}::${String(p.p_category).toLowerCase().trim()}`,
      resultCount: p.p_result_count ?? 0,
      createdAt: new Date().toISOString(),
    });
    return id;
  }

  private addOptOut(email: string): null {
    const norm = normEmail(email);
    if (!norm || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(norm)) throw new Error('invalid email');
    if (!this.optouts.has(norm)) this.optouts.set(norm, new Date().toISOString());
    return null;
  }

  private coverageStats() {
    const rows = Array.from(this.registry.values());
    return {
      totalBusinesses: rows.length,
      sent: rows.filter((r) => r.status === 'sent').length,
      drafted: rows.filter((r) => r.status === 'drafted').length,
      rejected: rows.filter((r) => r.status === 'rejected').length,
      searchesRun: this.searches.length,
      citiesCovered: new Set(this.searches.map((s) => s.city.toLowerCase())).size,
      searches: this.searches.slice().sort((a, b) => b.id - a.id).map(searchToJson),
    };
  }
}

function normEmail(email: string): string {
  return String(email || '').toLowerCase().trim();
}

function searchToJson(s: SearchRow) {
  return { id: s.id, city: s.city, category: s.category, createdAt: s.createdAt, resultCount: s.resultCount };
}
