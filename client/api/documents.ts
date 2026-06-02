import express from 'express';
import cors from 'cors';
import { setCurrentUser, db } from '../../server/src/db.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use((req: any, _res: any, next: any) => {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    try { const d = JSON.parse(Buffer.from(auth.slice(7), 'base64').toString()); if (d.userId) setCurrentUser(d.userId); } catch {}
  }
  next();
});

app.get('/api/documents', async (_req: any, res: any) => res.json(await db.listDocuments()));
app.post('/api/documents', async (req: any, res: any) => {
  const { title, text, fileType } = req.body;
  if (!text || typeof text !== 'string') { res.status(400).json({ error: 'Text content is required' }); return; }
  res.status(201).json(await db.createDocument({ title: title || 'Untitled', fileType: fileType || 'text', text }));
});

export default app;
