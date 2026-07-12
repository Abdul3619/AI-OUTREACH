import { Router, Request, Response, NextFunction } from 'express';
import { TaskRepository, ActivityLogRepository } from '../db/index.ts';
import { logger } from '../services/logging.ts';

const router = Router();

// GET all tasks
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tasks = await TaskRepository.list();
    res.json({ status: 'success', tasks });
  } catch (error) {
    next(error);
  }
});

// POST create task
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { leadId, title, description, dueDate } = req.body;
    
    if (!title) {
      res.status(400).json({ status: 'error', message: 'Task title is required.' });
      return;
    }

    const task = await TaskRepository.create(leadId || 'lead-mock-1', {
      title,
      description,
      dueDate
    });

    await ActivityLogRepository.record(
      leadId || null,
      'task_created',
      `New task scheduled: ${task.title}`
    );

    res.status(201).json({ status: 'success', task });
  } catch (error) {
    next(error);
  }
});

// PATCH update task (mark completed)
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { isCompleted } = req.body;

    if (isCompleted === undefined) {
      res.status(400).json({ status: 'error', message: 'isCompleted field is required.' });
      return;
    }

    const task = await TaskRepository.update(id, isCompleted);
    
    await ActivityLogRepository.record(
      task.leadId,
      'task_updated',
      `Task "${task.title}" status marked as ${isCompleted ? 'completed' : 'incomplete'}`
    );

    res.json({ status: 'success', task });
  } catch (error) {
    next(error);
  }
});

// DELETE a task
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const success = await TaskRepository.delete(id);
    
    if (!success) {
      res.status(404).json({ status: 'error', message: 'Task not found.' });
      return;
    }

    res.json({ status: 'success', message: 'Task deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

export default router;
