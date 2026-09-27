import { Router, Request, Response } from 'express';
import { 
  CampaignRepository, 
  PluginRepository, 
  NotificationRepository, 
  EnhancedNoteRepository, 
  InboxMessageRepository,
  db
} from '../db/index.ts';
import { logger } from '../services/logging.ts';

const router = Router();

// ==========================================
// 1. CAMPAIGNS ENDPOINTS
// ==========================================

// List all campaigns
router.get('/campaigns', async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.query.workspaceId as string) || 'default-workspace-456';
    const list = await CampaignRepository.list(workspaceId);
    res.json(list);
  } catch (err: any) {
    logger.error('API Campaigns', `Failed to retrieve campaigns: ${err.message}`);
    res.status(500).json({ error: 'Failed to retrieve campaigns' });
  }
});

// Get campaign by ID
router.get('/campaigns/:id', async (req: Request, res: Response) => {
  try {
    const campaign = await CampaignRepository.get(req.params.id);
    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
    res.json(campaign);
  } catch (err: any) {
    logger.error('API Campaigns', `Failed to retrieve campaign ${req.params.id}: ${err.message}`);
    res.status(500).json({ error: 'Failed to retrieve campaign' });
  }
});

// Create campaign
router.post('/campaigns', async (req: Request, res: Response) => {
  try {
    const workspaceId = req.body.workspaceId || 'default-workspace-456';
    const campaign = await CampaignRepository.create(workspaceId, req.body);
    res.status(201).json(campaign);
  } catch (err: any) {
    logger.error('API Campaigns', `Failed to create campaign: ${err.message}`);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// Update campaign
router.patch('/campaigns/:id', async (req: Request, res: Response) => {
  try {
    const campaign = await CampaignRepository.update(req.params.id, req.body);
    res.json(campaign);
  } catch (err: any) {
    logger.error('API Campaigns', `Failed to update campaign ${req.params.id}: ${err.message}`);
    res.status(500).json({ error: err.message || 'Failed to update campaign' });
  }
});

// Delete campaign
router.delete('/campaigns/:id', async (req: Request, res: Response) => {
  try {
    const success = await CampaignRepository.delete(req.params.id);
    if (!success) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
    res.json({ success: true });
  } catch (err: any) {
    logger.error('API Campaigns', `Failed to delete campaign ${req.params.id}: ${err.message}`);
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

// Add lead to campaign
router.post('/campaigns/:id/leads', async (req: Request, res: Response) => {
  try {
    const { leadId } = req.body;
    if (!leadId) {
      res.status(400).json({ error: 'leadId is required' });
      return;
    }
    const campaign = await CampaignRepository.addLead(req.params.id, leadId);
    res.json(campaign);
  } catch (err: any) {
    logger.error('API Campaigns', `Failed to add lead to campaign ${req.params.id}: ${err.message}`);
    res.status(500).json({ error: err.message || 'Failed to add lead to campaign' });
  }
});

// Remove lead from campaign
router.delete('/campaigns/:id/leads/:leadId', async (req: Request, res: Response) => {
  try {
    const campaign = await CampaignRepository.removeLead(req.params.id, req.params.leadId);
    res.json(campaign);
  } catch (err: any) {
    logger.error('API Campaigns', `Failed to remove lead from campaign ${req.params.id}: ${err.message}`);
    res.status(500).json({ error: err.message || 'Failed to remove lead from campaign' });
  }
});


// ==========================================
// 2. PLUGINS ENDPOINTS
// ==========================================

// List all plugins
router.get('/plugins', async (req: Request, res: Response) => {
  try {
    const list = await PluginRepository.list();
    res.json(list);
  } catch (err: any) {
    logger.error('API Plugins', `Failed to retrieve plugins: ${err.message}`);
    res.status(500).json({ error: 'Failed to retrieve plugins' });
  }
});

// Update plugin configuration
router.patch('/plugins/:id', async (req: Request, res: Response) => {
  try {
    const plugin = await PluginRepository.update(req.params.id, req.body);
    res.json(plugin);
  } catch (err: any) {
    logger.error('API Plugins', `Failed to update plugin ${req.params.id}: ${err.message}`);
    res.status(500).json({ error: err.message || 'Failed to update plugin' });
  }
});


// ==========================================
// 3. NOTIFICATIONS ENDPOINTS
// ==========================================

// List notifications
router.get('/notifications', async (req: Request, res: Response) => {
  try {
    const list = await NotificationRepository.list();
    res.json(list);
  } catch (err: any) {
    logger.error('API Notifications', `Failed to retrieve notifications: ${err.message}`);
    res.status(500).json({ error: 'Failed to retrieve notifications' });
  }
});

// Mark notification as read
router.patch('/notifications/:id/read', async (req: Request, res: Response) => {
  try {
    const success = await NotificationRepository.markAsRead(req.params.id);
    res.json({ success });
  } catch (err: any) {
    logger.error('API Notifications', `Failed to read notification ${req.params.id}: ${err.message}`);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// Create alert
router.post('/notifications', async (req: Request, res: Response) => {
  try {
    const alert = await NotificationRepository.create(req.body);
    res.status(201).json(alert);
  } catch (err: any) {
    logger.error('API Notifications', `Failed to create notification: ${err.message}`);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// Delete alert
router.delete('/notifications/:id', async (req: Request, res: Response) => {
  try {
    const success = await NotificationRepository.delete(req.params.id);
    res.json({ success });
  } catch (err: any) {
    logger.error('API Notifications', `Failed to delete notification: ${err.message}`);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});


// ==========================================
// 4. ENHANCED LEAD NOTES ENDPOINTS
// ==========================================

// Get notes for a lead
router.get('/leads/:leadId/enhanced-notes', async (req: Request, res: Response) => {
  try {
    const notes = await EnhancedNoteRepository.list(req.params.leadId);
    res.json(notes);
  } catch (err: any) {
    logger.error('API Notes', `Failed to retrieve notes for lead ${req.params.leadId}: ${err.message}`);
    res.status(500).json({ error: 'Failed to retrieve notes' });
  }
});

// Create note for a lead
router.post('/leads/:leadId/enhanced-notes', async (req: Request, res: Response) => {
  try {
    const note = await EnhancedNoteRepository.create({
      ...req.body,
      leadId: req.params.leadId
    });
    res.status(201).json(note);
  } catch (err: any) {
    logger.error('API Notes', `Failed to create note: ${err.message}`);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// Update note
router.patch('/enhanced-notes/:id', async (req: Request, res: Response) => {
  try {
    const note = await EnhancedNoteRepository.update(req.params.id, req.body);
    res.json(note);
  } catch (err: any) {
    logger.error('API Notes', `Failed to update note ${req.params.id}: ${err.message}`);
    res.status(500).json({ error: err.message || 'Failed to update note' });
  }
});

// Delete note
router.delete('/enhanced-notes/:id', async (req: Request, res: Response) => {
  try {
    const success = await EnhancedNoteRepository.delete(req.params.id);
    res.json({ success });
  } catch (err: any) {
    logger.error('API Notes', `Failed to delete note ${req.params.id}: ${err.message}`);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});


// ==========================================
// 5. INBOX COMPONENT ENDPOINTS
// ==========================================

// List inbox messages
router.get('/inbox', async (req: Request, res: Response) => {
  try {
    const leadId = req.query.leadId as string | undefined;
    const list = await InboxMessageRepository.list(leadId);
    res.json(list);
  } catch (err: any) {
    logger.error('API Inbox', `Failed to retrieve inbox: ${err.message}`);
    res.status(500).json({ error: 'Failed to retrieve inbox messages' });
  }
});

// Mark inbox message as read
router.patch('/inbox/:id/read', async (req: Request, res: Response) => {
  try {
    const success = await InboxMessageRepository.markAsRead(req.params.id);
    res.json({ success });
  } catch (err: any) {
    logger.error('API Inbox', `Failed to read message ${req.params.id}: ${err.message}`);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
});

// Simulate receiving an incoming reply email
router.post('/inbox/simulate', async (req: Request, res: Response) => {
  try {
    const { leadId, sender, subject, body } = req.body;
    if (!leadId) {
      res.status(400).json({ error: 'leadId is required for simulator' });
      return;
    }

    const msg = await InboxMessageRepository.create({
      leadId,
      sender: sender || 'Lead contact <reply@leadcompany.com>',
      recipient: 'sales@alphatech.com',
      subject: subject || 'RE: Outbound Proposal Inquiry',
      body: body || 'Thanks for your audit report! This looks very promising. Can we discuss next steps on a quick video session?',
      syncProvider: 'manual'
    });

    // Create a notification of incoming message
    await NotificationRepository.create({
      title: 'Incoming Buyer Reply',
      message: `New message from ${msg.sender}: "${msg.subject}"`,
      type: 'campaign'
    });

    res.status(201).json(msg);
  } catch (err: any) {
    logger.error('API Inbox Simulator', `Failed to simulate incoming message: ${err.message}`);
    res.status(500).json({ error: 'Simulator failed' });
  }
});

export default router;
