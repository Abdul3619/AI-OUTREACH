import type { DatabaseSync } from 'node:sqlite';
import { rowToEvidence, statusRank } from './db.ts';
import type { Business, Lead, LeadSource, LeadStatus, RegistryEntry, SearchRecord, CrawlEvidence } from './types.ts';

function leadRowToLead(row: any, business: Business): Lead {
  return {
    id: row.id,
    businessId: row.business_id,
    domain: business.domain,
    website: business.website,
    businessName: business.name,
    city: business.city,
    country: business.country,
    source: row.source,
    status: row.status,
    error: row.error,
    evidence: rowToEvidence(row.evidence_json),
    draftSubject: row.draft_subject,
    draftBody: row.draft_body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class Store {
  constructor(private db: DatabaseSync) {}

  // ---- businesses ------------------------------------------------

  getBusinessByDomain(domain: string): Business | null {
    const row = this.db.prepare('SELECT * FROM businesses WHERE domain = ?').get(domain) as any;
    return row ? (row as Business & { name: string | null }) as any : null;
  }

  getBusinessById(id: number): Business | null {
    const row = this.db.prepare('SELECT * FROM businesses WHERE id = ?').get(id) as any;
    return row || null;
  }

  upsertBusiness(input: { domain: string; website: string; name?: string | null; city?: string | null; country?: string | null }): Business {
    const existing = this.getBusinessByDomain(input.domain);
    if (existing) {
      // Fill in any newly-known details without clobbering existing ones.
      this.db
        .prepare(
          `UPDATE businesses SET name = COALESCE(name, ?), city = COALESCE(city, ?), country = COALESCE(country, ?) WHERE id = ?`,
        )
        .run(input.name ?? null, input.city ?? null, input.country ?? null, existing.id);
      return this.getBusinessById(existing.id)!;
    }
    const result = this.db
      .prepare('INSERT INTO businesses (domain, name, website, city, country) VALUES (?, ?, ?, ?, ?)')
      .run(input.domain, input.name ?? null, input.website, input.city ?? null, input.country ?? null);
    return this.getBusinessById(Number(result.lastInsertRowid))!;
  }

  // ---- leads -------------------------------------------------------

  createLead(businessId: number, source: LeadSource, status: LeadStatus): number {
    const result = this.db
      .prepare('INSERT INTO leads (business_id, source, status) VALUES (?, ?, ?)')
      .run(businessId, source, status);
    return Number(result.lastInsertRowid);
  }

  updateLead(
    id: number,
    patch: Partial<{ status: LeadStatus; error: string | null; evidence: CrawlEvidence | null; draftSubject: string | null; draftBody: string | null }>,
  ): void {
    const sets: string[] = [];
    const values: any[] = [];
    if (patch.status !== undefined) {
      sets.push('status = ?');
      values.push(patch.status);
    }
    if (patch.error !== undefined) {
      sets.push('error = ?');
      values.push(patch.error);
    }
    if (patch.evidence !== undefined) {
      sets.push('evidence_json = ?');
      values.push(patch.evidence ? JSON.stringify(patch.evidence) : null);
    }
    if (patch.draftSubject !== undefined) {
      sets.push('draft_subject = ?');
      values.push(patch.draftSubject);
    }
    if (patch.draftBody !== undefined) {
      sets.push('draft_body = ?');
      values.push(patch.draftBody);
    }
    sets.push("updated_at = datetime('now')");
    values.push(id);
    this.db.prepare(`UPDATE leads SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  }

  getLead(id: number): Lead | null {
    const row = this.db.prepare('SELECT * FROM leads WHERE id = ?').get(id) as any;
    if (!row) return null;
    const business = this.getBusinessById(row.business_id);
    if (!business) return null;
    return leadRowToLead(row, business);
  }

  listLeads(filter?: { status?: LeadStatus }): Lead[] {
    const rows = filter?.status
      ? (this.db.prepare('SELECT * FROM leads WHERE status = ? ORDER BY id DESC').all(filter.status) as any[])
      : (this.db.prepare('SELECT * FROM leads ORDER BY id DESC').all() as any[]);
    return rows
      .map((row) => {
        const business = this.getBusinessById(row.business_id);
        return business ? leadRowToLead(row, business) : null;
      })
      .filter((l): l is Lead => l !== null);
  }

  // ---- registry (permanent coverage record) -------------------------

  getRegistryEntry(domain: string): RegistryEntry | null {
    const row = this.db.prepare('SELECT * FROM registry WHERE domain = ?').get(domain) as any;
    if (!row) return null;
    return {
      domain: row.domain,
      businessName: row.business_name,
      status: row.status,
      city: row.city,
      country: row.country,
      firstSeenAt: row.first_seen_at,
      lastActionAt: row.last_action_at,
    };
  }

  /** Records an action against a domain in the permanent registry, only
   * moving the status forward (never downgrading a 'sent' business back to
   * 'seen' just because it got crawled again from a different search). */
  recordRegistryAction(input: { domain: string; businessName?: string | null; status: LeadStatus; city?: string | null; country?: string | null }): void {
    const existing = this.getRegistryEntry(input.domain);
    if (!existing) {
      this.db
        .prepare('INSERT INTO registry (domain, business_name, status, city, country) VALUES (?, ?, ?, ?, ?)')
        .run(input.domain, input.businessName ?? null, input.status, input.city ?? null, input.country ?? null);
      return;
    }
    const newStatus = statusRank(input.status) >= statusRank(existing.status) ? input.status : existing.status;
    this.db
      .prepare(
        `UPDATE registry SET status = ?, business_name = COALESCE(?, business_name), city = COALESCE(?, city), country = COALESCE(?, country), last_action_at = datetime('now') WHERE domain = ?`,
      )
      .run(newStatus, input.businessName ?? null, input.city ?? null, input.country ?? null, input.domain);
  }

  /** A business counts as "already covered" for dedup purposes once it has
   * been drafted, rejected, approved, or sent — i.e. a human has already
   * seen a real draft for it, or it has been contacted. Bare crawl/draft
   * *errors* don't count, so a transient failure can be retried later. */
  isAlreadyCovered(domain: string): RegistryEntry | null {
    const entry = this.getRegistryEntry(domain);
    if (!entry) return null;
    const covered: LeadStatus[] = ['drafted', 'rejected', 'approved', 'sent'];
    return covered.includes(entry.status) ? entry : null;
  }

  // ---- searches (auto-search coverage) -------------------------------

  normalizedSearchKey(city: string, category: string): string {
    return `${city.trim().toLowerCase()}::${category.trim().toLowerCase()}`;
  }

  findPriorSearch(city: string, category: string): SearchRecord | null {
    const key = this.normalizedSearchKey(city, category);
    const row = this.db.prepare('SELECT * FROM searches WHERE normalized_key = ? ORDER BY id DESC LIMIT 1').get(key) as any;
    if (!row) return null;
    return { id: row.id, city: row.city, category: row.category, createdAt: row.created_at, resultCount: row.result_count };
  }

  recordSearch(city: string, category: string, resultCount: number): number {
    const key = this.normalizedSearchKey(city, category);
    const result = this.db
      .prepare('INSERT INTO searches (city, category, normalized_key, result_count) VALUES (?, ?, ?, ?)')
      .run(city, category, key, resultCount);
    return Number(result.lastInsertRowid);
  }

  listSearches(): SearchRecord[] {
    const rows = this.db.prepare('SELECT * FROM searches ORDER BY id DESC').all() as any[];
    return rows.map((row) => ({ id: row.id, city: row.city, category: row.category, createdAt: row.created_at, resultCount: row.result_count }));
  }

  // ---- opt-outs -------------------------------------------------------

  addOptOut(email: string): void {
    this.db.prepare('INSERT OR IGNORE INTO optouts (email) VALUES (?)').run(email.trim().toLowerCase());
  }

  isOptedOut(email: string): boolean {
    const row = this.db.prepare('SELECT 1 FROM optouts WHERE email = ?').get(email.trim().toLowerCase());
    return !!row;
  }

  listOptOuts(): string[] {
    return (this.db.prepare('SELECT email FROM optouts ORDER BY requested_at DESC').all() as any[]).map((r) => r.email);
  }

  // ---- coverage stats --------------------------------------------------

  coverageStats() {
    const totalBusinesses = (this.db.prepare('SELECT COUNT(*) as c FROM registry').get() as any).c as number;
    const sent = (this.db.prepare("SELECT COUNT(*) as c FROM registry WHERE status = 'sent'").get() as any).c as number;
    const drafted = (this.db.prepare("SELECT COUNT(*) as c FROM registry WHERE status = 'drafted'").get() as any).c as number;
    const rejected = (this.db.prepare("SELECT COUNT(*) as c FROM registry WHERE status = 'rejected'").get() as any).c as number;
    const searches = this.listSearches();
    const citiesCovered = new Set(searches.map((s) => s.city.toLowerCase())).size;
    return { totalBusinesses, sent, drafted, rejected, searchesRun: searches.length, citiesCovered, searches };
  }
}
