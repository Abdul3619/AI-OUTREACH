import { App, json } from './httpServer.ts';
import { Store } from './store.ts';
import { runLeadPipeline, type PipelineDeps } from './pipeline.ts';
import { parseCsv } from './csv.ts';
import { searchBusinesses, knownCategories } from './overpass.ts';
import type { LeadStatus } from './types.ts';

export function registerRoutes(app: App, store: Store, deps: Omit<PipelineDeps, 'store'>) {
  const pipelineDeps: PipelineDeps = { store, ...deps };

  // ---- Health (used by Render's health check) ------------------------

  app.get('/health', (req, res) => {
    json(res, 200, { status: 'ok' });
  });

  // ---- Leads --------------------------------------------------------

  app.get('/api/leads', async (req, res) => {
    const status = (req as any).query?.status as LeadStatus | undefined;
    try {
      json(res, 200, await store.listLeads(status ? { status } : undefined));
    } catch (e: any) {
      json(res, 502, { error: e.message || String(e) });
    }
  });

  app.get('/api/leads/:id', async (req, res, params) => {
    try {
      const lead = await store.getLead(Number(params.id));
      if (!lead) return json(res, 404, { error: 'Lead not found' });
      json(res, 200, lead);
    } catch (e: any) {
      json(res, 502, { error: e.message || String(e) });
    }
  });

  app.post('/api/leads/url', async (req, res, params, body) => {
    if (!body?.website) return json(res, 400, { error: 'website is required' });
    try {
      const outcome = await runLeadPipeline(
        { website: body.website, businessName: body.businessName, city: body.city, country: body.country, source: 'manual_url' },
        pipelineDeps,
      );
      json(res, 200, outcome);
    } catch (e: any) {
      json(res, 400, { error: e.message || String(e) });
    }
  });

  app.post('/api/leads/csv', async (req, res, params, body) => {
    const text: string | undefined = typeof body === 'string' ? body : body?.csv;
    if (!text) return json(res, 400, { error: 'Send raw CSV text as the request body (text/plain), or { "csv": "..." } as JSON.' });
    const { rows, skipped } = parseCsv(text);
    const outcomes = [];
    for (const row of rows) {
      try {
        const outcome = await runLeadPipeline(
          { website: row.website, businessName: row.businessName, city: row.city, country: row.country, source: 'csv' },
          pipelineDeps,
        );
        outcomes.push({ row: row.website, ...outcome });
      } catch (e: any) {
        outcomes.push({ row: row.website, kind: 'invalid', error: e.message || String(e) });
      }
    }
    json(res, 200, { imported: rows.length, skipped, outcomes });
  });

  app.patch('/api/leads/:id', async (req, res, params, body) => {
    try {
      const lead = await store.getLead(Number(params.id));
      if (!lead) return json(res, 404, { error: 'Lead not found' });

      const patch: any = {};
      if (typeof body?.draftSubject === 'string') patch.draftSubject = body.draftSubject;
      if (typeof body?.draftBody === 'string') patch.draftBody = body.draftBody;

      if (body?.action === 'approve') {
        patch.status = 'approved';
        await store.recordRegistryAction({ domain: lead.domain, status: 'approved' });
      } else if (body?.action === 'reject') {
        patch.status = 'rejected';
        await store.recordRegistryAction({ domain: lead.domain, status: 'rejected' });
      } else if (body?.action === 'mark_sent') {
        patch.status = 'sent';
        await store.recordRegistryAction({ domain: lead.domain, status: 'sent' });
      }

      await store.updateLead(lead.id, patch);
      json(res, 200, await store.getLead(lead.id));
    } catch (e: any) {
      json(res, 502, { error: e.message || String(e) });
    }
  });

  // ---- Auto-search (OpenStreetMap) -----------------------------------

  app.get('/api/search/categories', (req, res) => {
    json(res, 200, knownCategories());
  });

  app.get('/api/search/history', async (req, res) => {
    try {
      json(res, 200, await store.listSearches());
    } catch (e: any) {
      json(res, 502, { error: e.message || String(e) });
    }
  });

  app.post('/api/search', async (req, res, params, body) => {
    const city = String(body?.city || '').trim();
    const category = String(body?.category || '').trim();
    if (!city || !category) return json(res, 400, { error: 'city and category are required' });

    try {
      const prior = await store.findPriorSearch(city, category);
      if (prior && body?.force !== true) {
        return json(res, 200, {
          repeat: true,
          priorSearch: prior,
          message: `You already ran "${category} in ${city}" on ${prior.createdAt}. Pass { "force": true } to run it again anyway.`,
        });
      }

      let businesses;
      try {
        businesses = await searchBusinesses(city, category);
      } catch (e: any) {
        return json(res, 502, { error: `OpenStreetMap search failed: ${e.message || e}` });
      }

      const outcomes = [];
      for (const b of businesses) {
        try {
          const outcome = await runLeadPipeline(
            { website: b.website, businessName: b.name, city, source: 'auto_search' },
            pipelineDeps,
          );
          outcomes.push({ business: b.name, website: b.website, ...outcome });
        } catch (e: any) {
          outcomes.push({ business: b.name, website: b.website, kind: 'invalid', error: e.message || String(e) });
        }
      }

      await store.recordSearch(city, category, businesses.length);
      json(res, 200, { repeat: false, found: businesses.length, outcomes });
    } catch (e: any) {
      json(res, 502, { error: e.message || String(e) });
    }
  });

  // ---- Coverage / stats ------------------------------------------------

  app.get('/api/coverage', async (req, res) => {
    try {
      json(res, 200, await store.coverageStats());
    } catch (e: any) {
      json(res, 502, { error: e.message || String(e) });
    }
  });

  // ---- Opt-outs ----------------------------------------------------------

  app.get('/api/optouts', async (req, res) => {
    try {
      json(res, 200, await store.listOptOuts());
    } catch (e: any) {
      json(res, 502, { error: e.message || String(e) });
    }
  });

  app.post('/api/optouts', async (req, res, params, body) => {
    const email = String(body?.email || '').trim();
    if (!email) return json(res, 400, { error: 'email is required' });
    try {
      await store.addOptOut(email);
      json(res, 200, { ok: true });
    } catch (e: any) {
      json(res, 400, { error: e.message || String(e) });
    }
  });
}
