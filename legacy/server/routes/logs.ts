import { Router, Request, Response, NextFunction } from 'express';
import { ActivityLogRepository } from '../db/index.ts';

const router = Router();

// GET all logged actions
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const logs = await ActivityLogRepository.list(limit);
    res.json({ status: 'success', logs });
  } catch (error) {
    next(error);
  }
});

export default router;
