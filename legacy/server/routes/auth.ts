import { Router, Request, Response, NextFunction } from 'express';
import { db, ActivityLogRepository } from '../db/index.ts';
import { logger } from '../services/logging.ts';

const router = Router();

// GET current session profile
router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = db.users[0] || null;
    const organization = db.organizations[0] || null;
    const workspace = db.workspaces[0] || null;
    
    if (!user) {
      res.status(401).json({ status: 'error', message: 'Unauthorized. No active session found.' });
      return;
    }
    
    res.json({
      status: 'success',
      user,
      organization,
      workspace
    });
  } catch (error) {
    next(error);
  }
});

// POST simulate user login (e.g. email/password validation for Firebase simulation)
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      res.status(400).json({ status: 'error', message: 'Email and password are required.' });
      return;
    }

    // Match or create mock user
    let user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      user = {
        id: 'user-' + Math.random().toString(36).substring(2, 9),
        orgId: db.organizations[0]?.id || 'default-org-123',
        email,
        role: email.includes('admin') ? 'admin' as any : 'member' as any,
        fullName: email.split('@')[0],
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150',
        createdAt: new Date().toISOString()
      };
      db.users.push(user);
      db.save();
    }

    await ActivityLogRepository.record(
      null,
      'user_login',
      `User ${user.fullName || user.email} successfully logged in (Session persisted)`
    );

    res.json({
      status: 'success',
      user,
      organization: db.organizations[0],
      workspace: db.workspaces[0]
    });
  } catch (error) {
    next(error);
  }
});

// POST user signup registration simulation
router.post('/signup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, fullName, companyName } = req.body;
    
    if (!email || !fullName) {
      res.status(400).json({ status: 'error', message: 'Email and Full Name are required.' });
      return;
    }

    // Create a new customized Organization and Workspace
    const orgId = 'org-' + Math.random().toString(36).substring(2, 9);
    const workspaceId = 'workspace-' + Math.random().toString(36).substring(2, 9);
    
    const newOrg = {
      id: orgId,
      name: companyName || `${fullName}'s Organization`,
      subscriptionTier: 'free' as any,
      usageLimit: 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const newWorkspace = {
      id: workspaceId,
      orgId,
      name: 'Default Campaign Workspace',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const newUser = {
      id: 'user-' + Math.random().toString(36).substring(2, 9),
      orgId,
      email,
      role: 'owner' as any,
      fullName,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150',
      createdAt: new Date().toISOString()
    };

    const newProfile = {
      id: 'profile-' + Math.random().toString(36).substring(2, 9),
      workspaceId,
      companyName: companyName || `${fullName}'s Agency`,
      industry: null,
      services: [],
      targetAudience: null,
      toneOfVoice: 'professional',
      portfolioLinks: [],
      defaultTemplates: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Store as active session records
    db.organizations.unshift(newOrg);
    db.workspaces.unshift(newWorkspace);
    db.users.unshift(newUser);
    db.businessProfiles.unshift(newProfile);
    db.save();

    await ActivityLogRepository.record(
      null,
      'user_registered',
      `New user account registered for ${fullName} (${newOrg.name})`
    );

    res.status(201).json({
      status: 'success',
      user: newUser,
      organization: newOrg,
      workspace: newWorkspace
    });
  } catch (error) {
    next(error);
  }
});

// POST simulate session logout
router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = db.users[0];
    if (user) {
      await ActivityLogRepository.record(
        null,
        'user_logout',
        `User ${user.fullName || user.email} signed out of session`
      );
    }
    
    res.json({ status: 'success', message: 'Successfully logged out.' });
  } catch (error) {
    next(error);
  }
});

export default router;
