import { BackgroundJobEngine } from './jobs.ts';
import { LeadRepository, OutreachMessageRepository } from '../db/index.ts';
import { LeadStatus } from '../../src/types.ts';
import { logger } from './logging.ts';

export class WorkflowEngine {
  /**
   * Advances the lead through the CRM stages based on the current state.
   */
  public static async processLead(leadId: string, action: string, payload?: any): Promise<void> {
    const lead = await LeadRepository.get(leadId);
    if (!lead) throw new Error(`Lead not found: ${leadId}`);

    logger.info('WorkflowEngine', `Processing action '${action}' for lead '${lead.id}' [Current Status: ${lead.status}]`);

    switch (action) {
      case 'start_audit':
        // Ensure restartable
        if (lead.status === LeadStatus.RESEARCHING || lead.status === LeadStatus.QUALIFIED) {
          logger.info('WorkflowEngine', 'Audit already in progress or completed. Checking for restart...');
        }
        await LeadRepository.update(lead.id, { status: LeadStatus.RESEARCHING });
        await BackgroundJobEngine.createJob('Crawl & Analyze Website', 'crawl', lead.id);
        break;

      case 'generate_proposal':
        if (!payload || !payload.businessProfile || !payload.proposalType) {
          throw new Error('Business profile and proposal type required to generate draft.');
        }
        await LeadRepository.update(lead.id, { status: LeadStatus.PROPOSAL_DRAFTED });
        await BackgroundJobEngine.createJob('Generate AI Proposal', 'proposal_generation', lead.id, payload);
        break;

      case 'approve_proposal':
        if (!payload || !payload.messageId) throw new Error('Message ID required for approval.');
        await OutreachMessageRepository.update(payload.messageId, { status: 'approved' });
        await LeadRepository.update(lead.id, { status: LeadStatus.OUTREACH_READY });
        logger.info('WorkflowEngine', `Proposal ${payload.messageId} approved for lead ${lead.id}`);
        break;

      case 'send_outreach':
        if (!payload || !payload.messageId) throw new Error('Message ID required for sending.');
        await OutreachMessageRepository.update(payload.messageId, { status: 'sent', sentAt: new Date().toISOString() });
        await LeadRepository.update(lead.id, { status: LeadStatus.CONTACTED });
        logger.info('WorkflowEngine', `Message ${payload.messageId} dispatched for lead ${lead.id}`);
        break;

      case 'mark_replied':
        await LeadRepository.update(lead.id, { status: LeadStatus.REPLIED });
        break;

      case 'close_won':
        await LeadRepository.update(lead.id, { status: LeadStatus.CLOSED_WON });
        break;

      case 'archive':
        await LeadRepository.update(lead.id, { status: LeadStatus.ARCHIVED });
        break;

      default:
        throw new Error(`Unknown workflow action: ${action}`);
    }
  }
}
