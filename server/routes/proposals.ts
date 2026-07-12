import { Router, Request, Response, NextFunction } from 'express';
import { LeadRepository, OutreachMessageRepository, ActivityLogRepository, BusinessProfileRepository } from '../db/index.ts';
import { generateAIProposal } from '../services/gemini.ts';
import { logger } from '../services/logging.ts';
import { MessageStatus } from '../../src/types.ts';

const router = Router();

// POST /api/leads/:id/proposals/generate - Generate proposal
router.post('/leads/:id/proposals/generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const leadId = req.params.id;
    const { proposalType, tone, language, channel, workspaceId } = req.body;

    const lead = await LeadRepository.get(leadId);
    if (!lead) {
      res.status(404).json({ status: 'error', message: 'CRM Lead not found.' });
      return;
    }

    const profile = await BusinessProfileRepository.getProfile(workspaceId || 'default-workspace-456');
    if (!profile) {
      res.status(404).json({ status: 'error', message: 'Sender Business Profile not found.' });
      return;
    }

    // Call Gemini generator
    const proposalData = await generateAIProposal(
      profile,
      lead,
      proposalType || 'general_introduction',
      tone || 'professional',
      language || 'en'
    );

    // Save to database
    const proposal = await OutreachMessageRepository.create(leadId, {
      channel: channel || 'email',
      subjectLine: proposalData.subjectLine,
      bodyContent: proposalData.bodyContent,
      originalAiContent: proposalData.bodyContent,
      qaMetrics: {
        personalization: proposalData.detailedQualityMetrics.personalization,
        professionalism: proposalData.detailedQualityMetrics.professionalism,
        naturalTone: proposalData.detailedQualityMetrics.personalization,
        languageAccuracy: proposalData.detailedQualityMetrics.localizationQuality,
        spamRisk: proposalData.detailedQualityMetrics.spamScore,
        confidence: proposalData.detailedQualityMetrics.overallScore > 80 ? 'High' : 'Medium'
      },
      status: MessageStatus.DRAFT,
      proposalType: proposalType || 'general_introduction',
      tone: tone || 'professional',
      language: language || 'en',
      objections: proposalData.objections,
      portfolioMatches: proposalData.portfolioMatches,
      caseStudies: proposalData.caseStudies,
      aiSuggestions: proposalData.aiSuggestions,
      detailedQualityMetrics: proposalData.detailedQualityMetrics
    });

    await ActivityLogRepository.record(
      leadId,
      'draft_generated',
      `AI successfully drafted ${proposalType} proposal. Personalization: ${proposalData.detailedQualityMetrics.personalization}%, Overall Score: ${proposalData.detailedQualityMetrics.overallScore}/100`
    );

    res.status(201).json({ status: 'success', proposal });
  } catch (error) {
    next(error);
  }
});

// GET /api/leads/:id/proposals - List all proposals for a lead
router.get('/leads/:id/proposals', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const leadId = req.params.id;
    const proposals = await OutreachMessageRepository.list(leadId);
    res.json({ status: 'success', proposals });
  } catch (error) {
    next(error);
  }
});

// GET /api/proposals/memory - Proposal Memory and Analytics Dashboard
router.get('/proposals/memory', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const memory = await OutreachMessageRepository.listMemory();
    
    // Group analysis for high value BI
    const totalCount = memory.length;
    const approved = memory.filter(m => m.status === 'approved');
    const rejected = memory.filter(m => m.status === 'rejected');
    
    const avgScore = totalCount > 0 
      ? Math.round(memory.reduce((acc, m) => acc + m.overallScore, 0) / totalCount)
      : 80;

    // Extract successful openings & closings
    const successfulOpenings = approved.map(m => ({
      text: m.opening,
      industry: m.industry,
      type: m.proposalType
    })).slice(0, 5);

    const successfulClosings = approved.map(m => ({
      text: m.closing,
      industry: m.industry,
      type: m.proposalType
    })).slice(0, 5);

    // Group industries
    const industryStats: Record<string, { total: number; approved: number }> = {};
    memory.forEach(m => {
      const ind = m.industry || 'General';
      if (!industryStats[ind]) {
        industryStats[ind] = { total: 0, approved: 0 };
      }
      industryStats[ind].total++;
      if (m.status === 'approved') {
        industryStats[ind].approved++;
      }
    });

    const industriesRanked = Object.entries(industryStats).map(([name, data]) => ({
      name,
      count: data.total,
      approvedRate: data.total > 0 ? Math.round((data.approved / data.total) * 100) : 0
    })).sort((a, b) => b.approvedRate - a.approvedRate);

    res.json({
      status: 'success',
      stats: {
        totalCount,
        avgScore,
        approvedCount: approved.length,
        rejectedCount: rejected.length,
        successfulOpenings,
        successfulClosings,
        industriesRanked,
        frequentlyReusedSections: [
          'Overview of SEO defect remediation paths',
          'Responsive grid layout conversion diagrams',
          'Direct appointment scheduling funnel injection code',
          'Mobile view trust badges with feedback indicators'
        ]
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/proposals/:id - Fetch single proposal
router.get('/proposals/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const proposal = await OutreachMessageRepository.get(id);
    if (!proposal) {
      res.status(404).json({ status: 'error', message: 'Proposal draft not found.' });
      return;
    }
    res.json({ status: 'success', proposal });
  } catch (error) {
    next(error);
  }
});

// PUT /api/proposals/:id - Edit proposal content (creates new version!)
router.put('/proposals/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { subjectLine, bodyContent, author } = req.body;

    const current = await OutreachMessageRepository.get(id);
    if (!current) {
      res.status(404).json({ status: 'error', message: 'Proposal not found.' });
      return;
    }

    const updated = await OutreachMessageRepository.update(id, {
      subjectLine,
      bodyContent
    }, author || 'User');

    await ActivityLogRepository.record(
      current.leadId,
      'draft_edited',
      `Manual adjustments made to proposal draft. Saved as Version ${updated.version}`
    );

    res.json({ status: 'success', proposal: updated });
  } catch (error) {
    next(error);
  }
});

// POST /api/proposals/:id/status - Approve, Reject, or Archive proposal
router.post('/proposals/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, feedback } = req.body;

    const proposal = await OutreachMessageRepository.get(id);
    if (!proposal) {
      res.status(404).json({ status: 'error', message: 'Proposal not found.' });
      return;
    }

    const updated = await OutreachMessageRepository.update(id, { status });

    // Store in proposal memory if approved/rejected
    if (status === 'approved' || status === 'rejected') {
      const lead = await LeadRepository.get(proposal.leadId);
      await OutreachMessageRepository.addMemory({
        id: 'mem-' + Math.random().toString(36).substring(2, 9),
        leadId: proposal.leadId,
        leadName: lead ? lead.businessName : 'Unknown',
        industry: lead ? lead.industry || 'General' : 'General',
        proposalType: proposal.proposalType || 'general_introduction',
        tone: proposal.tone || 'professional',
        language: proposal.language || 'en',
        opening: proposal.bodyContent.slice(0, 150),
        closing: proposal.bodyContent.slice(-150),
        overallScore: proposal.detailedQualityMetrics?.overallScore || 80,
        status: status === 'approved' ? 'approved' : 'rejected',
        feedback: feedback || '',
        createdAt: new Date().toISOString()
      });
    }

    await ActivityLogRepository.record(
      proposal.leadId,
      status === 'approved' ? 'draft_approved' : 'status_changed',
      `Proposal was marked as ${status}. Long-term preference registry updated.`
    );

    res.json({ status: 'success', proposal: updated });
  } catch (error) {
    next(error);
  }
});

// POST /api/proposals/:id/restore - Restore proposal version
router.post('/proposals/:id/restore', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { versionNumber } = req.body;

    const proposal = await OutreachMessageRepository.get(id);
    if (!proposal) {
      res.status(404).json({ status: 'error', message: 'Proposal not found.' });
      return;
    }

    const targetVer = proposal.versions?.find(v => v.versionNumber === Number(versionNumber));
    if (!targetVer) {
      res.status(400).json({ status: 'error', message: `Version ${versionNumber} not found in history.` });
      return;
    }

    // Restore to that version
    const updated = await OutreachMessageRepository.update(id, {
      subjectLine: targetVer.subjectLine,
      bodyContent: targetVer.bodyContent
    }, `Restored Version ${versionNumber}`);

    await ActivityLogRepository.record(
      proposal.leadId,
      'draft_edited',
      `Restored proposal to previous state (Version ${versionNumber})`
    );

    res.json({ status: 'success', proposal: updated });
  } catch (error) {
    next(error);
  }
});

// Helper for fetching business profiles inside proposal generation
async function BusinessProfileRepositoryGet(workspaceId: string) {
  const { BusinessProfileRepository } = await import('../db/index.ts');
  return BusinessProfileRepository.getProfile(workspaceId);
}

export default router;
