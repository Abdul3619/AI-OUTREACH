import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

import { openDb } from '../server/db.ts';
import { Store } from '../server/store.ts';
import { crawlHomepage } from '../server/crawler.ts';
import { runLeadPipeline } from '../server/pipeline.ts';
import { startFixtureServer } from './testServer.ts';
import type { DraftResult } from '../server/types.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const goodSitePath = path.join(here, 'fixtures', 'good-site.html');
const messySitePath = path.join(here, 'fixtures', 'messy-plumber-site.html');

function freshStore(): Store {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ai-outreach-test-')), 'test.sqlite');
  return new Store(openDb({ file }));
}

// Allows the crawler to reach our local fixture server, which necessarily
// lives on 127.0.0.1 — a real "isPrivateIp" check would (correctly) refuse
// that in production, so tests inject a permissive stand-in instead of
// weakening the real SSRF guard.
const allowLoopback = async () => ({ safe: true });

const sender = { businessName: 'Test Studio', services: ['web design'], tone: 'friendly', address: '123 Test St' };

test('happy path: crawl -> draft -> lead lands as drafted, registry updated', async () => {
  const server = await startFixtureServer({ '/': { file: goodSitePath }, '/robots.txt': { status: 404, text: '' } });
  const store = freshStore();
  let draftCalls = 0;
  const fakeDraft = async (): Promise<DraftResult> => {
    draftCalls++;
    return { ok: true, subject: 'Quick note about your site', body: 'Hi there, noticed a couple of things...', observations: ['no viewport issue'] };
  };

  try {
    const outcome = await runLeadPipeline(
      { website: server.url, businessName: 'Acme Bakery', city: 'Springfield', source: 'manual_url' },
      { store, sender, crawl: (u) => crawlHomepage(u, { checkUrlIsSafeToFetch: allowLoopback }), draft: fakeDraft },
    );
    assert.equal(outcome.kind, 'drafted');
    assert.equal(draftCalls, 1);

    const lead = store.getLead((outcome as any).leadId);
    assert.equal(lead?.status, 'drafted');
    assert.ok(lead?.draftBody?.includes('Hi there'));
    assert.ok(lead?.draftBody?.includes('Test Studio'), 'compliance footer should include sender business name');
    assert.ok(lead?.draftBody?.includes('123 Test St'), 'compliance footer should include sender address');
    assert.ok(lead?.draftBody?.toLowerCase().includes('unsubscribe'));
    assert.equal(lead?.evidence?.emails[0], 'hello@acmebakery-test.com');

    const registryEntry = store.getRegistryEntry(outcome.domain);
    assert.equal(registryEntry?.status, 'drafted');
  } finally {
    await server.close();
  }
});

test('duplicate prevention: a second pipeline run on an already-drafted business is skipped, not re-drafted', async () => {
  const server = await startFixtureServer({ '/': { file: goodSitePath }, '/robots.txt': { status: 404, text: '' } });
  const store = freshStore();
  let draftCalls = 0;
  const fakeDraft = async (): Promise<DraftResult> => {
    draftCalls++;
    return { ok: true, subject: 'Subject', body: 'Body', observations: [] };
  };
  const deps = { store, sender, crawl: (u: string) => crawlHomepage(u, { checkUrlIsSafeToFetch: allowLoopback }), draft: fakeDraft };

  try {
    const first = await runLeadPipeline({ website: server.url, businessName: 'Acme Bakery', source: 'manual_url' }, deps);
    assert.equal(first.kind, 'drafted');
    assert.equal(draftCalls, 1);

    // Same business found again later via a different search/city — this is
    // exactly the "expands across many cities over time" scenario.
    const second = await runLeadPipeline({ website: server.url, businessName: 'Acme Bakery', city: 'A different city', source: 'auto_search' }, deps);
    assert.equal(second.kind, 'duplicate');
    assert.equal(draftCalls, 1, 'draft must NOT be called again for a duplicate');
    assert.equal((second as any).existingStatus, 'drafted');
  } finally {
    await server.close();
  }
});

test('a rejected lead also counts as covered and is not re-drafted later', async () => {
  const server = await startFixtureServer({ '/': { file: goodSitePath }, '/robots.txt': { status: 404, text: '' } });
  const store = freshStore();
  const fakeDraft = async (): Promise<DraftResult> => ({ ok: true, subject: 'S', body: 'B', observations: [] });
  const deps = { store, sender, crawl: (u: string) => crawlHomepage(u, { checkUrlIsSafeToFetch: allowLoopback }), draft: fakeDraft };

  try {
    const first = await runLeadPipeline({ website: server.url, source: 'manual_url' }, deps);
    assert.equal(first.kind, 'drafted');
    store.updateLead((first as any).leadId, { status: 'rejected' });
    store.recordRegistryAction({ domain: first.domain, status: 'rejected' });

    const second = await runLeadPipeline({ website: server.url, source: 'auto_search' }, deps);
    assert.equal(second.kind, 'duplicate');
    assert.equal((second as any).existingStatus, 'rejected');
  } finally {
    await server.close();
  }
});

test('Gemini/draft failure produces a visible error, never fake content, and does not block a future retry', async () => {
  const server = await startFixtureServer({ '/': { file: goodSitePath }, '/robots.txt': { status: 404, text: '' } });
  const store = freshStore();
  const failingDraft = async (): Promise<DraftResult> => ({ ok: false, error: 'GEMINI_API_KEY is not set.' });
  const deps = { store, sender, crawl: (u: string) => crawlHomepage(u, { checkUrlIsSafeToFetch: allowLoopback }), draft: failingDraft };

  try {
    const outcome = await runLeadPipeline({ website: server.url, source: 'manual_url' }, deps);
    assert.equal(outcome.kind, 'draft_error');
    const lead = store.getLead((outcome as any).leadId);
    assert.equal(lead?.status, 'draft_error');
    assert.equal(lead?.draftBody, null, 'must never contain a fallback/fake draft');
    assert.match(lead?.error || '', /GEMINI_API_KEY/);

    // A draft error must not mark the business as permanently covered —
    // it should be retryable once the real problem (e.g. missing key) is fixed.
    assert.equal(store.isAlreadyCovered(outcome.domain), null);
  } finally {
    await server.close();
  }
});

test('a crawl failure (site unreachable) is recorded with a visible error', async () => {
  const store = freshStore();
  const fakeDraft = async (): Promise<DraftResult> => ({ ok: true, subject: 'S', body: 'B', observations: [] });
  // Point at a port nothing is listening on.
  const deps = { store, sender, crawl: (u: string) => crawlHomepage(u, { checkUrlIsSafeToFetch: allowLoopback }), draft: fakeDraft };

  const outcome = await runLeadPipeline({ website: 'http://127.0.0.1:1', source: 'manual_url' }, deps);
  assert.equal(outcome.kind, 'crawl_error');
  const lead = store.getLead((outcome as any).leadId);
  assert.equal(lead?.status, 'crawl_error');
  assert.ok(lead?.error);
});

test('an opted-out contact email blocks drafting even though the crawl succeeds', async () => {
  const server = await startFixtureServer({ '/': { file: goodSitePath }, '/robots.txt': { status: 404, text: '' } });
  const store = freshStore();
  store.addOptOut('hello@acmebakery-test.com');
  let draftCalls = 0;
  const fakeDraft = async (): Promise<DraftResult> => {
    draftCalls++;
    return { ok: true, subject: 'S', body: 'B', observations: [] };
  };
  const deps = { store, sender, crawl: (u: string) => crawlHomepage(u, { checkUrlIsSafeToFetch: allowLoopback }), draft: fakeDraft };

  try {
    const outcome = await runLeadPipeline({ website: server.url, source: 'manual_url' }, deps);
    assert.equal(outcome.kind, 'opted_out');
    assert.equal(draftCalls, 0, 'must never draft for an opted-out contact');
  } finally {
    await server.close();
  }
});

test('crawler fixes the glued-email bug end-to-end through the real crawler against a local server', async () => {
  const server = await startFixtureServer({ '/': { file: messySitePath }, '/robots.txt': { status: 404, text: '' } });
  try {
    const result = await crawlHomepage(server.url, { checkUrlIsSafeToFetch: allowLoopback });
    assert.equal(result.ok, true);
    assert.equal(result.evidence?.emails[0], 'info@joesplumbing-test.com');
    assert.equal(result.evidence?.cms, 'WordPress');
  } finally {
    await server.close();
  }
});

test('crawler refuses to fetch a target that fails the SSRF safety check', async () => {
  const result = await crawlHomepage('http://127.0.0.1:9', { checkUrlIsSafeToFetch: async () => ({ safe: false, reason: 'blocked for test' }) });
  assert.equal(result.ok, false);
  assert.match(result.error || '', /SSRF/);
});
