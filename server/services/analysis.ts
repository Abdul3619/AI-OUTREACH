import { crawlHomepage } from './crawler.ts';
import { analyzeBusinessIntelligence, isGeminiConfigured } from './gemini.ts';
import { LeadRepository, ActivityLogRepository } from '../db/index.ts';
import { logger } from './logging.ts';
import { Lead, AIAnalysisData, OpportunityPriority, LeadStatus } from '../../src/types.ts';

/**
 * Executes the full website audit and AI intelligence pipeline for a specific CRM lead
 */
export async function runLeadAnalysis(leadId: string): Promise<Lead> {
  logger.info('AnalysisPipeline', `Initializing analysis pipeline for Lead ID: ${leadId}`);

  // 1. Fetch Lead
  const lead = await LeadRepository.get(leadId);
  if (!lead) {
    throw new Error(`Lead not found with ID ${leadId}`);
  }

  const website = lead.website;
  if (!website) {
    throw new Error('Cannot analyze lead: website URL is missing');
  }

  // 2. Perform the server-side webpage crawl
  let crawlResult;
  try {
    crawlResult = await crawlHomepage(website);
  } catch (err: any) {
    logger.error('AnalysisPipeline', `Crawl phase failed for Lead: ${lead.businessName}`, err);
    throw err;
  }

  // 3. Perform Gemini SWOT and Business Intelligence Analysis
  let bizIntel = {
    strengths: [
      'Local market presence and active physical service listing',
      'Direct core services and catalog list listed on homepage',
      'Direct contact routes available'
    ],
    weaknesses: [
      'Unoptimized mobile layouts or static presentation templates',
      'Unclear online conversion funnel or modern scheduling methods',
      'Social proofs and testimonials have low exposure'
    ],
    competitors: ['Local competitors', 'Regional alternatives'],
    maturityLevel: 'early_stage' as 'early_stage' | 'mid_market' | 'enterprise',
    estimatedTargetDemographics: ['Local residents', 'Regional service consumers'],
    valueProposition: `Providing local business services for ${lead.businessName}.`,
    missingBusinessFeatures: ['Online Scheduling Widget', 'FAQ accordion section', 'Customer testimonials list'],
    detectedLanguage: lead.languageCode || 'en'
  };

  if (isGeminiConfigured() && crawlResult.success) {
    try {
      const gResult = await analyzeBusinessIntelligence(
        lead.businessName,
        lead.industry || null,
        crawlResult.cleanedText
      );
      bizIntel = {
        strengths: gResult.strengths,
        weaknesses: gResult.weaknesses,
        competitors: gResult.competitors,
        maturityLevel: gResult.maturityLevel,
        estimatedTargetDemographics: gResult.estimatedTargetDemographics,
        valueProposition: gResult.valueProposition,
        missingBusinessFeatures: gResult.missingBusinessFeatures,
        detectedLanguage: gResult.detectedLanguage
      };
    } catch (gErr) {
      logger.error('AnalysisPipeline', 'Gemini analysis failed, falling back to heuristics', gErr);
    }
  } else if (!isGeminiConfigured()) {
    logger.warn('AnalysisPipeline', 'GEMINI_API_KEY not configured. Running heuristical fallback analysis.');
  }

  // 4. Extract contact info and social links found in crawl to enrich CRM fields if they are empty
  const enrichedUpdates: Partial<Lead> = {};
  if (!lead.email && crawlResult.structure.emails.length > 0) {
    enrichedUpdates.email = crawlResult.structure.emails[0];
  }
  if (!lead.phone && crawlResult.structure.phones.length > 0) {
    enrichedUpdates.phone = crawlResult.structure.phones[0];
  }
  if (!lead.linkedinUrl && crawlResult.structure.socialLinks.linkedin) {
    enrichedUpdates.linkedinUrl = crawlResult.structure.socialLinks.linkedin;
  }
  if (!lead.facebookUrl && crawlResult.structure.socialLinks.facebook) {
    enrichedUpdates.facebookUrl = crawlResult.structure.socialLinks.facebook;
  }
  if (!lead.instagramUrl && crawlResult.structure.socialLinks.instagram) {
    enrichedUpdates.instagramUrl = crawlResult.structure.socialLinks.instagram;
  }

  // 5. Compute Category Health Scores (incorporating crawler heuristics + AI gaps)
  // Base scores extracted from crawl result heuristics
  let scoreSeo = crawlResult.heuristics.seoScore;
  let scorePerformance = crawlResult.heuristics.performanceScore;
  let scoreMobile = crawlResult.heuristics.mobileScore;
  let scoreAccessibility = crawlResult.heuristics.accessibilityScore;
  let scoreBranding = crawlResult.heuristics.brandingScore;
  let scoreUx = crawlResult.heuristics.uxScore;
  let scoreContent = crawlResult.heuristics.contentScore;
  let scoreSecurity = crawlResult.heuristics.securityScore;
  let scoreTrust = crawlResult.heuristics.trustScore;

  // Refine UX and Trust Scores based on AI gaps found
  if (bizIntel.missingBusinessFeatures.length > 2) {
    scoreUx = Math.max(15, scoreUx - 15);
  }
  if (bizIntel.weaknesses.length > 0) {
    scoreTrust = Math.max(15, scoreTrust - 10);
  }

  // Weighted Website Health score calculation
  const websiteHealthScore = Math.round(
    scoreSeo * 0.15 +
    scorePerformance * 0.10 +
    scoreMobile * 0.15 +
    scoreAccessibility * 0.10 +
    scoreBranding * 0.10 +
    scoreUx * 0.15 +
    scoreContent * 0.10 +
    scoreSecurity * 0.10 +
    scoreTrust * 0.05
  );

  // 6. Calculate Opportunity Score (lower health = higher opportunity, plus extra opportunity signals)
  let opportunityScore = 100 - websiteHealthScore;

  // Extra opportunity boosters:
  if (!crawlResult.structure.hasBookingWidget && !crawlResult.structure.hasContactForm) {
    opportunityScore += 15; // huge lead-gen redesign opportunity
  } else if (!crawlResult.structure.hasBookingWidget) {
    opportunityScore += 10; // booking integration opportunity
  }

  if (!crawlResult.metadata.viewport) {
    opportunityScore += 15; // mobile fix opportunity
  }

  if (!lead.email && crawlResult.structure.emails.length === 0) {
    opportunityScore += 5; // potential enrichment audit project
  }

  if (!website.startsWith('https://')) {
    opportunityScore += 15; // security setup opportunity
  }

  if (Object.keys(crawlResult.structure.socialLinks).length === 0) {
    opportunityScore += 5; // social linkage expansion
  }

  // Bounds
  opportunityScore = Math.max(5, Math.min(100, Math.round(opportunityScore)));

  // Determine Priority and Suggested Action verbatim from rule constraints
  let opportunityPriority = OpportunityPriority.MEDIUM;
  let suggestedAction = 'Offer basic SEO optimization package';

  if (opportunityScore >= 86) {
    opportunityPriority = OpportunityPriority.VERY_HIGH;
    suggestedAction = 'Urgent: Deliver custom website redesign mockup proposal';
  } else if (opportunityScore >= 61) {
    opportunityPriority = OpportunityPriority.HIGH;
    suggestedAction = 'Offer immediate UX and conversion funnel redesign';
  } else if (opportunityScore >= 31) {
    opportunityPriority = OpportunityPriority.MEDIUM;
    suggestedAction = 'Offer basic SEO optimization package';
  } else {
    opportunityPriority = OpportunityPriority.LOW;
    suggestedAction = 'Monitor for future expansion';
  }

  // 7. Compile the AIAnalysisData structure
  const aiAnalysisData: AIAnalysisData = {
    techStack: crawlResult.technologies.techStack,
    cmsDetected: crawlResult.technologies.cms,
    seoIssues: crawlResult.heuristics.seoIssues,
    uxIssues: crawlResult.heuristics.uxIssues,
    brandingIssues: crawlResult.heuristics.brandingIssues,
    accessibilityIssues: crawlResult.heuristics.accessibilityIssues,
    strengths: bizIntel.strengths,
    weaknesses: bizIntel.weaknesses,
    targetDemographics: bizIntel.estimatedTargetDemographics,
    valueProposition: bizIntel.valueProposition,
    detectedLanguage: bizIntel.detectedLanguage,
    missingFeatures: bizIntel.missingBusinessFeatures,
    lastAnalyzedAt: new Date().toISOString()
  };

  // 8. Update Lead Model
  const updatedLead = await LeadRepository.update(leadId, {
    ...enrichedUpdates,
    scoreSeo,
    scorePerformance,
    scoreMobile,
    scoreAccessibility,
    scoreBranding,
    scoreUx,
    scoreContent,
    scoreSecurity,
    scoreTrust,
    websiteHealthScore,
    opportunityScore,
    opportunityPriority,
    suggestedAction,
    aiAnalysisData,
    status: LeadStatus.READY_FOR_ANALYSIS, // Shift status state as appropriate for completed audit
    languageCode: bizIntel.detectedLanguage,
    lastActivity: `Completed deep asset audit. Website Health: ${websiteHealthScore}%. Opportunity: ${opportunityScore}% (${opportunityPriority}).`
  });

  // 9. Record system activity timeline log
  await ActivityLogRepository.record(
    leadId,
    'analyzed',
    `Completed Website Intelligence audit. CMS: ${crawlResult.technologies.cms || 'Custom'}. Opportunity prioritization rating: ${opportunityPriority}.`
  );

  logger.info('AnalysisPipeline', `Analysis completed successfully for Lead: ${lead.businessName}`);
  return updatedLead;
}
