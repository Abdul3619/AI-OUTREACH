import { Router, Request, Response, NextFunction } from 'express';
import { BusinessProfileRepository, ActivityLogRepository } from '../db/index.ts';
import { logger } from '../services/logging.ts';

const router = Router();

// GET workspace company profile (uses a mock workspace ID for Phase 1 session)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspaceId = (req.query.workspaceId as string) || 'default-workspace-456';
    const profile = await BusinessProfileRepository.getProfile(workspaceId);
    
    if (!profile) {
      res.status(404).json({ status: 'error', message: 'Business Profile not found.' });
      return;
    }
    
    res.json({ status: 'success', profile });
  } catch (error) {
    next(error);
  }
});

// PUT / POST upsert workspace company profile
router.put('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.body.workspaceId || 'default-workspace-456';
    const updates = req.body;
    
    logger.info('ProfileAPI', `Updating company settings profile in workspace ${workspaceId}`);
    const profile = await BusinessProfileRepository.upsertProfile(workspaceId, updates);
    
    await ActivityLogRepository.record(
      null,
      'profile_updated',
      `Sender business profile updated for company: ${profile.companyName}`
    );

    res.json({ status: 'success', profile });
  } catch (error) {
    next(error);
  }
});

export default router;
