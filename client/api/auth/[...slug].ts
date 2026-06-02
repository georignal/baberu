import express from 'express';
import cors from 'cors';
import { db } from '../../../server/src/db.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.post('/api/auth/login', async (req: any, res: any) => {
  const { username } = req.body;
  if (!username || typeof username !== 'string' || username.trim().length < 1) {
    res.status(400).json({ error: 'Username is required' }); return;
  }
  const name = username.trim();
  const user = await db.upsertUser(name);
  const token = Buffer.from(JSON.stringify({ userId: user.id, username: name })).toString('base64');
  res.json({ token, user: { id: user.id, username: name } });
});

app.get('/api/auth/me', (req: any, res: any) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) { res.status(401).json({ error: 'Not authenticated' }); return; }
  try {
    const data = JSON.parse(Buffer.from(auth.slice(7), 'base64').toString());
    res.json({ userId: data.userId, username: data.username });
  } catch { res.status(401).json({ error: 'Invalid token' }); }
});

export default app;
