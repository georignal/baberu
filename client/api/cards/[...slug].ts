import express from 'express';
import cors from 'cors';
import { setCurrentUser, db } from '../../../server/src/db.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use((req: any, _res: any, next: any) => {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    try {
      const d = JSON.parse(Buffer.from(auth.slice(7), 'base64').toString());
      if (d.userId) setCurrentUser(d.userId);
    } catch {}
  }
  next();
});

app.get('/api/cards', async (_req: any, res: any) => {
  res.json(await db.listCards());
});

app.post('/api/cards', async (req: any, res: any) => {
  const { frontText, reading, meaning, partOfSpeech, exampleSentences, documentId, sentenceId, vocabularyId } = req.body;
  if (!frontText) { res.status(400).json({ error: 'frontText is required' }); return; }
  res.status(201).json(await db.createCard({
    vocabularyId: vocabularyId || '', documentId: documentId || '', sentenceId: sentenceId || '',
    frontText, reading: reading || '', meaning: meaning || '', partOfSpeech: partOfSpeech || '',
    exampleSentences: exampleSentences || [], dictData: null,
  }));
});

app.get('/api/cards/:id', async (req: any, res: any) => {
  const card = await db.getCard(req.params.id);
  if (!card) { res.status(404).json({ error: 'Card not found' }); return; }
  res.json(card);
});

app.patch('/api/cards/:id', async (req: any, res: any) => {
  await db.updateCard(req.params.id, req.body);
  res.json(await db.getCard(req.params.id));
});

app.delete('/api/cards/:id', async (req: any, res: any) => {
  await db.deleteCard(req.params.id);
  res.json({ message: 'Deleted' });
});

app.get('/api/cards/:id/source', async (req: any, res: any) => {
  const card = await db.getCard(req.params.id);
  if (!card) { res.status(404).json({ error: 'Card not found' }); return; }
  const doc = await db.getDocument(card.documentId);
  const sentences = await db.getSentences(card.documentId);
  const targetIndex = sentences.findIndex((s: any) => s.id === card.sentenceId);
  const target = sentences[targetIndex];
  const prev = targetIndex > 0 ? sentences[targetIndex - 1] : null;
  const next = targetIndex < sentences.length - 1 ? sentences[targetIndex + 1] : null;
  res.json({
    documentTitle: doc?.title || 'Unknown', documentId: card.documentId,
    sentence: target?.text || '', previousSentence: prev?.text || null, nextSentence: next?.text || null,
    highlight: { word: card.frontText, startOffset: target?.text?.indexOf(card.frontText) ?? -1, endOffset: (target?.text?.indexOf(card.frontText) ?? -1) + card.frontText.length },
  });
});

export default app;
