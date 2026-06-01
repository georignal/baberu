import { Router, Request, Response } from 'express';
import { db } from '../db.js';

const router = Router();

// Login/Register — simple username-based auth
router.post('/login', (req: Request, res: Response) => {
  const { username } = req.body;
  if (!username || typeof username !== 'string' || username.trim().length < 1) {
    res.status(400).json({ error: 'Username is required' });
    return;
  }
  const name = username.trim();
  const user = db.upsertUser(name);
  const token = Buffer.from(JSON.stringify({ userId: user.id, username: name })).toString('base64');
  res.json({ token, user: { id: user.id, username: name } });
});

// Get current user
router.get('/me', (req: Request, res: Response) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  try {
    const data = JSON.parse(Buffer.from(auth.slice(7), 'base64').toString());
    res.json({ userId: data.userId, username: data.username });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
