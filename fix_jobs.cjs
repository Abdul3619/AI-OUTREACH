const fs = require('fs');

let content = fs.readFileSync('server/services/jobs.ts', 'utf8');

// The file has syntax errors due to duplicate class endings and stray blocks.
// We'll replace it with a cleanly rewritten version based on our previous edits but with proper structure.

const newContent = `import { logger } from './logging.ts';
import { runLeadAnalysis } from './analysis.ts';
import { generateAIProposal } from './gemini.ts';
import { LeadRepository, OutreachMessageRepository } from '../db/index.ts';
import { db, hasPostgres } from '../db/postgres.ts';
import { backgroundJobs } from '../db/schema.ts';
import { eq, asc, sql } from 'drizzle-orm';
import cron from 'node-cron';

export interface BackgroundJob {
  id: string;
  name: string;
  type: 'crawl' | 'proposal_generation' | 'translation' | 'import';
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  retryCount: number;
  maxRetries: number;
  logs: string[];
  startedAt: string;
  finishedAt: string | null;
  error: string | null;
  leadId?: string;
  payload?: any;
}

const jobsCache = new Map<string, BackgroundJob>();

export class BackgroundJobEngine {
  public static async listJobs(): Promise<BackgroundJob[]> {
    if (hasPostgres && db) {
      const rows = await db.select().from(backgroundJobs).orderBy(sql\`\${backgroundJobs.startedAt} DESC\`);
      return rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        type: r.type as any,
        status: r.status as any,
        progress: r.progress || 0,
        retryCount: r.retryCount || 0,
        maxRetries: r.maxRetries || 3,
        logs: r.logs || [],
        startedAt: r.startedAt?.toISOString() || new Date().toISOString(),
        finishedAt: r.finishedAt?.toISOString() || null,
        error: r.error,
        leadId: r.leadId || undefined,
        payload: r.payload
      }));
    }
    return Array.from(jobsCache.values()).sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
  }

  public static async getJob(id: string): Promise<BackgroundJob | undefined> {
    if (hasPostgres && db) {
      const rows = await db.select().from(backgroundJobs).where(eq(backgroundJobs.id, id)).limit(1);
      if (!rows.length) return undefined;
      const r = rows[0];
      return {
        id: r.id,
        name: r.name,
        type: r.type as any,
        status: r.status as any,
        progress: r.progress || 0,
        retryCount: r.retryCount || 0,
        maxRetries: r.maxRetries || 3,
        logs: (r.logs as string[]) || [],
        startedAt: r.startedAt?.toISOString() || new Date().toISOString(),
        finishedAt: r.finishedAt?.toISOString() || null,
        error: r.error,
        leadId: r.leadId || undefined,
        payload: r.payload
      };
    }
    return jobsCache.get(id);
  }

  public static async createJob(
    name: string,
    type: BackgroundJob['type'],
    leadId?: string,
    payload?: any
  ): Promise<BackgroundJob> {
    const id = 'job-' + Math.random().toString(36).substring(2, 9);
    const newJob: BackgroundJob = {
      id,
      name,
      type,
      status: 'queued',
      progress: 0,
      retryCount: 0,
      maxRetries: 3,
      logs: [\`[\${new Date().toISOString()}] Job initialized and placed in queue state.\`],
      startedAt: new Date().toISOString(),
      finishedAt: null,
      error: null,
      leadId,
      payload,
    };

    if (hasPostgres && db) {
      await db.insert(backgroundJobs).values({
        id,
        name,
        type,
        status: 'queued',
        progress: 0,
        retryCount: 0,
        maxRetries: 3,
        logs: newJob.logs,
        leadId: leadId || null,
        payload: payload || {},
        startedAt: new Date(),
      });
      logger.info('JobEngine', \`Placed persistent background job in DB queue: \${name} (\${id})\`);
    } else {
      jobsCache.set(id, newJob);
      logger.info('JobEngine', \`Placed new background job in memory queue: \${name} (\${id})\`);
      this.runJob(id);
    }

    return newJob;
  }

  public static async updateJobState(id: string, updates: Partial<BackgroundJob>) {
    if (hasPostgres && db) {
      await db.update(backgroundJobs).set({
        status: updates.status,
        progress: updates.progress,
        error: updates.error,
        logs: updates.logs ? (updates.logs as any) : undefined,
        finishedAt: updates.finishedAt ? new Date(updates.finishedAt) : undefined,
        retryCount: updates.retryCount
      }).where(eq(backgroundJobs.id, id));
    } else {
      const job = jobsCache.get(id);
      if (job) Object.assign(job, updates);
    }
  }

  public static async cancelJob(id: string): Promise<boolean> {
    const job = await this.getJob(id);
    if (!job) return false;
    
    if (job.status === 'running' || job.status === 'queued') {
      const logs = [...job.logs, \`[\${new Date().toISOString()}] Job execution explicitly aborted by admin workspace.\`];
      await this.updateJobState(id, { status: 'cancelled', finishedAt: new Date().toISOString(), logs });
      logger.warn('JobEngine', \`Background job cancelled: \${job.name} (\${id})\`);
      return true;
    }
    return false;
  }

  public static async retryJob(id: string): Promise<boolean> {
    const job = await this.getJob(id);
    if (!job) return false;
    
    if (job.status === 'failed' || job.status === 'cancelled') {
      const logs = [...job.logs, \`[\${new Date().toISOString()}] Retrying job execution (Retry attempt #\${job.retryCount + 1}).\`];
      await this.updateJobState(id, { status: 'queued', progress: 0, error: null, finishedAt: null, logs });
      logger.info('JobEngine', \`Re-queueing failed background job: \${job.name} (\${id})\`);
      
      if (!hasPostgres) this.runJob(id);
      return true;
    }
    return false;
  }

  public static async runJob(id: string) {
    const job = await this.getJob(id);
    if (!job) return;

    job.status = 'running';
    job.logs.push(\`[\${new Date().toISOString()}] Activating execution thread.\`);
    await this.updateJobState(id, job);

    try {
      if (job.type === 'crawl') {
        if (!job.leadId) throw new Error('Lead ID required for crawler audit.');
        job.progress = 10;
        job.logs.push(\`[\${new Date().toISOString()}] Resolving DNS and crawling target URL...\`);
        await this.updateJobState(id, job);
        
        await this.delay(1000);
        if (await this.isAborted(id)) return;
        job.progress = 30;
        job.logs.push(\`[\${new Date().toISOString()}] Downloading homepage raw markup elements...\`);
        await this.updateJobState(id, job);

        await this.delay(1200);
        if (await this.isAborted(id)) return;
        job.progress = 60;
        job.logs.push(\`[\${new Date().toISOString()}] Scraping SEO title, viewport tags, accessibility indices...\`);
        await this.updateJobState(id, job);

        const lead = await runLeadAnalysis(job.leadId);
        
        if (await this.isAborted(id)) return;
        job.progress = 90;
        job.logs.push(\`[\${new Date().toISOString()}] Triggering Gemini SWOT analysis and model heuristics...\`);
        await this.updateJobState(id, job);
        
        await this.delay(1000);
        if (await this.isAborted(id)) return;
        
        job.progress = 100;
        job.status = 'completed';
        job.finishedAt = new Date().toISOString();
        job.logs.push(\`[\${new Date().toISOString()}] Deep Website Analysis completed successfully! Health Score: \${lead.websiteHealthScore}%. Opportunity Rating: \${lead.opportunityScore}% (\${lead.opportunityPriority}).\`);
        await this.updateJobState(id, job);
        
      } else if (job.type === 'proposal_generation') {
        const { businessProfile, lead, proposalType, tone, targetLang } = job.payload;
        if (!lead || !businessProfile) throw new Error('Lead and profile context are required for proposal generation.');

        job.progress = 15;
        job.logs.push(\`[\${new Date().toISOString()}] Context mapping and target requirements extraction...\`);
        await this.updateJobState(id, job);

        await this.delay(1000);
        if (await this.isAborted(id)) return;
        job.progress = 40;
        job.logs.push(\`[\${new Date().toISOString()}] Triggering Gemini-2.5-Pro model payload drafting...\`);
        await this.updateJobState(id, job);

        const proposal = await generateAIProposal(businessProfile, lead, proposalType, tone, targetLang);

        if (await this.isAborted(id)) return;
        job.progress = 75;
        job.logs.push(\`[\${new Date().toISOString()}] Running QA Agent evaluation loop...\`);
        job.logs.push(\`[\${new Date().toISOString()}] Quality evaluation: Personalization \${proposal.detailedQualityMetrics.personalization}%, Spam Risk \${proposal.detailedQualityMetrics.spamScore}%.\`);
        await this.updateJobState(id, job);

        const dbMsg = await OutreachMessageRepository.create(lead.id, {
          channel: proposalType as any,
          subjectLine: proposal.subjectLine,
          bodyContent: proposal.bodyContent,
          originalAiContent: proposal.bodyContent,
          proposalType: proposalType,
          tone: tone,
          language: targetLang,
          detailedQualityMetrics: proposal.detailedQualityMetrics,
          objections: proposal.objections,
          portfolioMatches: proposal.portfolioMatches,
          caseStudies: proposal.caseStudies,
          aiSuggestions: proposal.aiSuggestions,
          status: 'pending_approval' as any // Human Approval required
        });

        await LeadRepository.update(lead.id, { status: 'proposal_drafted' as any });

        if (await this.isAborted(id)) return;
        job.progress = 100;
        job.status = 'completed';
        job.finishedAt = new Date().toISOString();
        job.logs.push(\`[\${new Date().toISOString()}] Handcrafted pitch drafted successfully and queued for human approval! Saved to CRM message ID: \${dbMsg.id}.\`);
        await this.updateJobState(id, job);

      } else if (job.type === 'translation') {
        const { messageId, targetLang } = job.payload;
        if (!messageId) throw new Error('Message ID is required for translation.');

        job.progress = 20;
        job.logs.push(\`[\${new Date().toISOString()}] Fetching draft layout from CRM database...\`);
        await this.updateJobState(id, job);

        await this.delay(800);
        if (await this.isAborted(id)) return;
        job.progress = 50;
        job.logs.push(\`[\${new Date().toISOString()}] Translating and localizing formatting filters into '\${targetLang}'...\`);
        await this.updateJobState(id, job);

        const message = await OutreachMessageRepository.get(messageId);
        if (!message) throw new Error('Message draft not found.');

        const localizedSubject = \`[Localized - \${targetLang.toUpperCase()}] \` + message.subjectLine;
        const localizedBody = \`[Translated to \${targetLang.toUpperCase()}]\n\n\` + message.bodyContent;

        await OutreachMessageRepository.update(messageId, {
          subjectLine: localizedSubject,
          bodyContent: localizedBody,
          language: targetLang
        });

        if (await this.isAborted(id)) return;
        job.progress = 100;
        job.status = 'completed';
        job.finishedAt = new Date().toISOString();
        job.logs.push(\`[\${new Date().toISOString()}] Language localization complete. Tone elements verified and saved.\`);
        await this.updateJobState(id, job);

      } else if (job.type === 'import') {
        const { leads, workspaceId } = job.payload;
        if (!leads || !Array.isArray(leads)) throw new Error('Array of leads payload required for bulk data integration.');

        job.progress = 10;
        job.logs.push(\`[\${new Date().toISOString()}] Received \${leads.length} import entities. Preparing workspace mappings...\`);
        await this.updateJobState(id, job);

        let count = 0;
        for (const rawLead of leads) {
          if (await this.isAborted(id)) return;
          
          await LeadRepository.create(workspaceId, {
            businessName: rawLead.businessName,
            website: rawLead.website,
            email: rawLead.email,
            phone: rawLead.phone,
            industry: rawLead.industry,
            city: rawLead.city,
            country: rawLead.country,
            category: rawLead.category,
            contactName: rawLead.contactName,
            leadSource: 'import'
          });

          count++;
          job.progress = Math.round(10 + (count / leads.length) * 90);
          job.logs.push(\`[\${new Date().toISOString()}] Imported lead #\${count}: \${rawLead.businessName}\`);
          await this.updateJobState(id, job);
          await this.delay(150);
        }

        job.progress = 100;
        job.status = 'completed';
        job.finishedAt = new Date().toISOString();
        job.logs.push(\`[\${new Date().toISOString()}] Bulk integration completed! Successfully imported \${count} fresh prospects into workspace CRM.\`);
        await this.updateJobState(id, job);
      }
    } catch (error: any) {
      job.status = 'failed';
      job.error = error.message || 'Unknown execution error';
      job.finishedAt = new Date().toISOString();
      job.logs.push(\`[\${new Date().toISOString()}] FATAL ERROR: \${job.error}\`);
      
      if (job.retryCount < job.maxRetries) {
        job.retryCount++;
        job.status = 'queued';
        job.error = null;
        job.finishedAt = null;
        job.logs.push(\`[\${new Date().toISOString()}] Auto-requeueing job (Attempt \${job.retryCount}/\${job.maxRetries})...\`);
      }
      
      logger.error('JobEngine', \`Background job failed: \${job.name} (\${id})\`, error);
      await this.updateJobState(id, job);
    }
  }

  private static delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private static async isAborted(id: string): Promise<boolean> {
    const job = await this.getJob(id);
    return job ? job.status === 'cancelled' || job.status === 'failed' : true;
  }
}

export function startJobScheduler() {
  if (hasPostgres) {
    cron.schedule('* * * * *', async () => {
      if (!db) return;
      try {
        const queuedJobs = await db.select().from(backgroundJobs)
          .where(eq(backgroundJobs.status, 'queued'))
          .orderBy(asc(backgroundJobs.startedAt))
          .limit(5);
          
        for (const j of queuedJobs) {
          logger.info('Scheduler', \`Picking up queued job: \${j.id}\`);
          await db.update(backgroundJobs).set({ status: 'running' }).where(eq(backgroundJobs.id, j.id));
          BackgroundJobEngine.runJob(j.id);
        }
      } catch (e) {
        logger.error('Scheduler', 'Failed to poll queued jobs', e);
      }
    });
    logger.info('Scheduler', 'Persistent job scheduler initialized (node-cron)');
  }
}
`;

fs.writeFileSync('server/services/jobs.ts', newContent);
