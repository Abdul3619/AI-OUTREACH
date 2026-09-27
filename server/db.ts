// SQLite storage using Node's built-in node:sqlite (stable enough for a
// local single-user tool; requires Node >= 22.5). No ORM — the schema is
// small and the queries are simple enough to write by hand and read at a
// glance, which matters more here than abstraction.
//
// Coverage tracking is a first-class part of this schema, not bolted on:
//   - `searches` records every auto-search (city + category + date) ever run.
//   - `registry` records, per business domain, the most-advanced action ever
//     taken (seen / drafted / rejected / sent) across ALL searches, cities,
//     and countries, forever. This is what pipeline.ts checks before
//     drafting a "new" lead.
//   - `optouts` is the permanent do-not-contact list.

import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import type { LeadStatus, LeadSource, CrawlEvidence } from './types.ts';

export interface OpenDbOptions {
  file: string;
}

export function openDb({ file }: OpenDbOptions): DatabaseSync {
  if (file !== ':memory:') {
    const dir = path.dirname(file);
    fs.mkdirSync(dir, { recursive: true });
  }
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');

  db.exec(`
    CREATE TABLE IF NOT EXISTS businesses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      domain TEXT NOT NULL UNIQUE,
      name TEXT,
      website TEXT NOT NULL,
      city TEXT,
      country TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      source TEXT NOT NULL,
      status TEXT NOT NULL,
      error TEXT,
      evidence_json TEXT,
      draft_subject TEXT,
      draft_body TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- The permanent, cross-search, cross-city, cross-country coverage record.
    -- One row per business domain, forever. This is what makes duplicate
    -- detection work as the user expands across many markets over time.
    CREATE TABLE IF NOT EXISTS registry (
      domain TEXT PRIMARY KEY,
      business_name TEXT,
      status TEXT NOT NULL,
      city TEXT,
      country TEXT,
      first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_action_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS searches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      city TEXT NOT NULL,
      category TEXT NOT NULL,
      normalized_key TEXT NOT NULL,
      result_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS optouts (
      email TEXT PRIMARY KEY,
      requested_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_leads_business ON leads(business_id);
    CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
    CREATE INDEX IF NOT EXISTS idx_searches_key ON searches(normalized_key);
  `);

  return db;
}

// ---- Row <-> domain object helpers -----------------------------------

export function rowToEvidence(json: string | null): CrawlEvidence | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as CrawlEvidence;
  } catch {
    return null;
  }
}

/** Status rank used to decide the registry's "most advanced action" when
 * merging in a new event — e.g. a lead that was 'sent' should never be
 * downgraded back to 'seen' just because it was crawled again. */
const STATUS_RANK: Record<LeadStatus, number> = {
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

export function statusRank(status: LeadStatus): number {
  return STATUS_RANK[status] ?? 0;
}
