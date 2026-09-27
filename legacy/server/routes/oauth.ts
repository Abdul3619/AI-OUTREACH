import { Router, Request, Response } from 'express';
import { logger } from '../services/logging.ts';

const router = Router();

// In a real application, you would store encrypted OAuth tokens securely in the database.
// For the preview environment, we use in-memory state or mock responses to simulate the token exchange process.
let connectedAccounts: Record<string, any> = {
  // Pre-fill with a mock disconnected status for popular ones, or just an empty array
};

const AVAILABLE_PROVIDERS = [
  { id: 'google-workspace', name: 'Google Workspace', provider: 'google', category: 'email', scopes: ['gmail.modify', 'drive.file', 'calendar', 'spreadsheets', 'contacts.readonly'] },
  { id: 'gmail', name: 'Gmail', provider: 'google', category: 'email', scopes: ['gmail.modify'] },
  { id: 'google-drive', name: 'Google Drive', provider: 'google', category: 'storage', scopes: ['drive.file'] },
  { id: 'google-calendar', name: 'Google Calendar', provider: 'google', category: 'calendar', scopes: ['calendar'] },
  { id: 'google-sheets', name: 'Google Sheets', provider: 'google', category: 'database', scopes: ['spreadsheets'] },
  { id: 'github', name: 'GitHub', provider: 'github', category: 'developer', scopes: ['repo', 'user'] },
  { id: 'linkedin', name: 'LinkedIn', provider: 'linkedin', category: 'social', scopes: ['r_liteprofile', 'w_member_social'] },
  { id: 'microsoft-365', name: 'Microsoft 365', provider: 'microsoft', category: 'workspace', scopes: ['Mail.ReadWrite', 'Calendars.ReadWrite'] },
  { id: 'outlook', name: 'Outlook', provider: 'microsoft', category: 'email', scopes: ['Mail.ReadWrite'] },
  { id: 'slack', name: 'Slack', provider: 'slack', category: 'messaging', scopes: ['chat:write', 'channels:read'] },
  { id: 'discord', name: 'Discord', provider: 'discord', category: 'messaging', scopes: ['identify', 'guilds'] },
  { id: 'notion', name: 'Notion', provider: 'notion', category: 'workspace', scopes: [] },
  { id: 'trello', name: 'Trello', provider: 'trello', category: 'workspace', scopes: ['read', 'write'] },
  { id: 'jira', name: 'Jira', provider: 'atlassian', category: 'workspace', scopes: ['read:jira-work', 'write:jira-work'] },
  { id: 'dropbox', name: 'Dropbox', provider: 'dropbox', category: 'storage', scopes: ['files.content.write'] },
  { id: 'resend', name: 'Resend', provider: 'resend', category: 'email', scopes: [] },
  { id: 'sendgrid', name: 'SendGrid', provider: 'sendgrid', category: 'email', scopes: [] },
  { id: 'smtp', name: 'SMTP', provider: 'smtp', category: 'email', scopes: [] },
  { id: 'firebase', name: 'Firebase', provider: 'google', category: 'database', scopes: [] },
  { id: 'supabase', name: 'Supabase', provider: 'supabase', category: 'database', scopes: [] }
];

router.get('/providers', (req: Request, res: Response) => {
  res.json({
    status: 'success',
    providers: AVAILABLE_PROVIDERS.map(p => {
      const conn = connectedAccounts[p.id];
      return {
        ...p,
        status: conn ? 'connected' : 'disconnected',
        account: conn?.account || null,
        lastSync: conn?.lastSync || null,
        healthStatus: conn?.healthStatus || 'healthy',
        lastActivity: conn?.lastActivity || null,
        tokenExpiration: conn?.tokenExpiration || null,
      };
    })
  });
});

// Mock OAuth Connect Start
router.get('/connect/:id', (req: Request, res: Response) => {
  const providerId = req.params.id;
  const provider = AVAILABLE_PROVIDERS.find(p => p.id === providerId);
  if (!provider) {
    return res.status(404).send('Provider not found');
  }

  logger.info('OAuth', `Initiating OAuth flow for provider: ${provider.name}`);
  // In a real app, redirect to the actual OAuth URL
  res.json({
    status: 'redirect',
    url: `/oauth/callback?provider=${provider.id}&code=mock_auth_code_123`
  });
});

// Mock OAuth Callback Exchange
router.post('/exchange', (req: Request, res: Response) => {
  const { provider, code } = req.body;
  if (!provider) return res.status(400).json({ error: 'Provider required' });

  logger.info('OAuth', `Exchanging OAuth code for provider: ${provider}`);
  
  // Store securely (mocked)
  connectedAccounts[provider] = {
    account: 'admin@workspace.com',
    lastSync: new Date().toISOString(),
    healthStatus: 'healthy',
    lastActivity: new Date().toISOString(),
    tokenExpiration: new Date(Date.now() + 3600000).toISOString() // 1 hour from now
  };

  res.json({ status: 'success', message: 'Tokens stored securely' });
});

router.post('/disconnect/:id', (req: Request, res: Response) => {
  const providerId = req.params.id;
  if (connectedAccounts[providerId]) {
    delete connectedAccounts[providerId];
    logger.info('OAuth', `Revoked token for provider: ${providerId}`);
  }
  res.json({ status: 'success' });
});

router.post('/refresh/:id', (req: Request, res: Response) => {
  const providerId = req.params.id;
  if (connectedAccounts[providerId]) {
    connectedAccounts[providerId].tokenExpiration = new Date(Date.now() + 3600000).toISOString();
    logger.info('OAuth', `Refreshed token for provider: ${providerId}`);
    res.json({ status: 'success', message: 'Token refreshed' });
  } else {
    res.status(404).json({ error: 'Not connected' });
  }
});

router.post('/test/:id', (req: Request, res: Response) => {
  const providerId = req.params.id;
  if (!connectedAccounts[providerId]) {
    return res.status(404).json({ error: 'Not connected' });
  }
  
  // Random failure chance for demonstration (10%)
  const isHealthy = Math.random() > 0.1;
  if (isHealthy) {
    connectedAccounts[providerId].lastActivity = new Date().toISOString();
    connectedAccounts[providerId].healthStatus = 'healthy';
    res.json({ status: 'success', message: 'Connection verified. Read operations successful.' });
  } else {
    connectedAccounts[providerId].healthStatus = 'degraded';
    res.status(500).json({ status: 'error', message: 'Connection test failed. Access token may be revoked.' });
  }
});

export default router;
