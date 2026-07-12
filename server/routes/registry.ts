import { Router, Request, Response } from 'express';
import { registry } from '../services/registry.ts';
import { db } from '../db/index.ts';

const router = Router();

// GET all registered plugins and whether they are active based on user config settings
router.get('/plugins', (req: Request, res: Response) => {
  const plugins = registry.getAllPlugins().map(p => {
    // Read the active configuration state for this plugin from db.settings
    const dbConfig = db.settings.plugins?.[p.id];
    return {
      id: p.id,
      name: p.name,
      category: p.category,
      description: p.description,
      isConfigured: p.isConfigured || !!(dbConfig?.apiKey || dbConfig?.enabled)
    };
  });
  
  res.json({ status: 'success', plugins });
});

// GET all registered AI micro-agents
router.get('/agents', (req: Request, res: Response) => {
  const agents = registry.getAllAgents().map(a => ({
    id: a.id,
    name: a.name,
    description: a.description,
    version: a.version
  }));

  res.json({ status: 'success', agents });
});

export default router;
