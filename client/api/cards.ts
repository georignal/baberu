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

app.get('/api/cards', async (_req: any, res: any) => res.json(await db.listCards()));
app.post('/api/cards', async (req: any, res: any) => {
  const { frontText, reading, meaning, partOfSpeech, exampleSentences, documentId, sentenceId, vocabularyId } = req.body;
  if (!frontText) { res.status(400).json({ error: 'frontText is required' }); return; }
  res.status(201).json(await db.createCard({ vocabularyId: vocabularyId || '', documentId: documentId || '', sentenceId: sentenceId || '', frontText, reading: reading || '', meaning: meaning || '', partOfSpeech: partOfSpeech || '', exampleSentences: exampleSentences || [], dictData: null }));
});

export default app;
