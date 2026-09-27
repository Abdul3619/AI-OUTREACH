import { Router, Request, Response, NextFunction } from 'express';
import { LeadRepository, ActivityLogRepository, db } from '../db/index.ts';
import { logger } from '../services/logging.ts';
import { LeadStatus } from '../../src/types.ts';
import { runLeadAnalysis } from '../services/analysis.ts';

const router = Router();

// GET /api/leads - Query list with filters
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workspaceId, search, status, priority, industry, tag } = req.query;
    
    const leads = await LeadRepository.list(workspaceId as string, {
      search: search as string,
      status: status as string,
      priority: priority as string,
      industry: industry as string,
      tag: tag as string,
    });

    res.json({ status: 'success', count: leads.length, leads });
  } catch (error) {
    next(error);
  }
});

// GET /api/leads/stats - CRM general statistics for dashboard widgets
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workspaceId } = req.query;
    if (!workspaceId) {
      res.status(400).json({ status: 'error', message: 'workspaceId query param is required.' });
      return;
    }

    const stats = await LeadRepository.getCRMStats(workspaceId as string);
    res.json({ status: 'success', stats });
  } catch (error) {
    next(error);
  }
});

// GET /api/leads/:id - Fetch single lead by ID
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const lead = await LeadRepository.get(id);
    
    if (!lead) {
      res.status(404).json({ status: 'error', message: 'CRM Lead not found.' });
      return;
    }

    res.json({ status: 'success', lead });
  } catch (error) {
    next(error);
  }
});

// POST /api/leads - Create new lead
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workspaceId, businessName, website, email, phone, force } = req.body;

    if (!workspaceId) {
      res.status(400).json({ status: 'error', message: 'workspaceId is required.' });
      return;
    }
    if (!businessName) {
      res.status(400).json({ status: 'error', message: 'businessName is required.' });
      return;
    }

    // Phase 5 Duplicate Detection Scan
    if (!force) {
      const duplicates: { field: string; value: string; leadId: string; leadName: string }[] = [];
      const cleanWeb = (url: string) => url.toLowerCase().replace(/https?:\/\/(www\.)?/, '').replace(/\/+$/, '').trim();
      const cleanPhone = (num: string) => num.replace(/[^0-9]/g, '');

      const allLeads = db.leads;
      for (const existing of allLeads) {
        // Only compare within same workspace for multi-tenant isolation
        if (existing.workspaceId !== workspaceId) continue;

        if (existing.businessName.toLowerCase().trim() === businessName.toLowerCase().trim()) {
          duplicates.push({ field: 'Company Name', value: businessName, leadId: existing.id, leadName: existing.businessName });
        }
        if (website && existing.website && cleanWeb(existing.website) === cleanWeb(website)) {
          duplicates.push({ field: 'Website', value: website, leadId: existing.id, leadName: existing.businessName });
        }
        if (email && existing.email && existing.email.toLowerCase().trim() === email.toLowerCase().trim()) {
          duplicates.push({ field: 'Email', value: email, leadId: existing.id, leadName: existing.businessName });
        }
        if (phone && existing.phone && cleanPhone(existing.phone) === cleanPhone(phone) && cleanPhone(phone).length > 4) {
          duplicates.push({ field: 'Phone', value: phone, leadId: existing.id, leadName: existing.businessName });
        }
      }

      if (duplicates.length > 0) {
        res.status(409).json({
          status: 'duplicate',
          message: 'Potential duplicate lead detected inside your workspace pipeline.',
          duplicates
        });
        return;
      }
    }

    const lead = await LeadRepository.create(workspaceId, req.body);
    
    await ActivityLogRepository.record(
      lead.id,
      'lead_created',
      `Lead entry "${lead.businessName}" added to pipeline [Status: ${lead.status}]`
    );

    res.status(201).json({ status: 'success', lead });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/leads/:id - Update lead details
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const lead = await LeadRepository.update(id, req.body);
    
    res.json({ status: 'success', lead });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/leads/:id - Delete lead
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const success = await LeadRepository.delete(id);

    if (!success) {
      res.status(404).json({ status: 'error', message: 'Lead not found.' });
      return;
    }

    await ActivityLogRepository.record(
      null,
      'lead_deleted',
      `Lead entry [ID: ${id}] deleted from system CRM`
    );

    res.json({ status: 'success', message: 'Lead removed from CRM successfully.' });
  } catch (error) {
    next(error);
  }
});

// POST /api/leads/:id/notes - Add or edit markdown notes
router.post('/:id/notes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    if (notes === undefined) {
      res.status(400).json({ status: 'error', message: 'notes body property is required.' });
      return;
    }

    const lead = await LeadRepository.addNote(id, notes);
    res.json({ status: 'success', lead });
  } catch (error) {
    next(error);
  }
});

// POST /api/leads/:id/attachments - Add file metadata attachment
router.post('/:id/attachments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { fileName, fileSize, fileType } = req.body;

    if (!fileName) {
      res.status(400).json({ status: 'error', message: 'fileName is required.' });
      return;
    }

    const lead = await LeadRepository.addAttachment(
      id,
      fileName,
      fileSize || 0,
      fileType || 'application/octet-stream'
    );

    res.json({ status: 'success', lead });
  } catch (error) {
    next(error);
  }
});

// POST /api/leads/batch-enrich - Batch validation & enrichment
router.post('/batch-enrich', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workspaceId } = req.body;
    if (!workspaceId) {
      res.status(400).json({ status: 'error', message: 'workspaceId is required for batch enrichment' });
      return;
    }

    const result = await LeadRepository.batchEnrich(workspaceId);
    res.json({ status: 'success', ...result });
  } catch (error) {
    next(error);
  }
});

// POST /api/leads/:id/enrich - Trigger validation & enrichment for a specific lead
router.post('/:id/enrich', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const lead = await LeadRepository.enrich(id);
    res.json({ status: 'success', lead });
  } catch (error) {
    next(error);
  }
});

// POST /api/leads/:id/analyze - Trigger deep website crawling & AI analysis
router.post('/:id/analyze', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const lead = await runLeadAnalysis(id);
    res.json({ status: 'success', lead });
  } catch (error) {
    next(error);
  }
});

// POST /api/leads/:id/merge - Merge duplicate records into primary lead
router.post('/:id/merge', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { duplicateLeadIds, fieldsToKeep } = req.body;
    
    if (!duplicateLeadIds || !Array.isArray(duplicateLeadIds)) {
      res.status(400).json({ status: 'error', message: 'duplicateLeadIds must be an array of string IDs' });
      return;
    }

    const lead = await LeadRepository.merge(id, duplicateLeadIds, fieldsToKeep || {});
    res.json({ status: 'success', lead });
  } catch (error) {
    next(error);
  }
});

// POST /api/leads/:id/ignore-duplicate - Mark a duplicate pair as ignored
router.post('/:id/ignore-duplicate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { duplicateId } = req.body;

    if (!duplicateId) {
      res.status(400).json({ status: 'error', message: 'duplicateId is required' });
      return;
    }

    const lead = await LeadRepository.ignoreDuplicate(id, duplicateId);
    res.json({ status: 'success', lead });
  } catch (error) {
    next(error);
  }
});

export default router;
