import { Router, Request, Response, NextFunction } from 'express';
import { SettingsRepository } from '../db/index.ts';
import { logger } from '../services/logging.ts';

const router = Router();

// GET all application settings
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await SettingsRepository.get();
    res.json({ status: 'success', settings });
  } catch (error) {
    next(error);
  }
});

// PUT (update) a specific settings section
router.put('/:section', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { section } = req.params;
    const value = req.body;
    
    if (!value || typeof value !== 'object') {
      res.status(400).json({ status: 'error', message: 'Invalid payload structure. Expected an object.' });
      return;
    }

    logger.info('SettingsAPI', `Attempting update on configuration section: ${section}`);
    const updatedSettings = await SettingsRepository.update(section, value);
    
    res.json({
      status: 'success',
      message: `Section '${section}' updated successfully.`,
      settings: updatedSettings
    });
  } catch (error) {
    next(error);
  }
});

export default router;
