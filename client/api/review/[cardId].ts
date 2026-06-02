import express from 'express';
import cors from 'cors';
import { db } from '../../../server/src/db.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.post('/api/review/:cardId', async (req: any, res: any) => {
  const { result } = req.body; const card = await db.getCard(req.params.cardId);
  if (!card) { res.status(404).json({ error: 'Card not found' }); return; }
  await db.createReviewLog(req.params.cardId, result || 'seen');
  await db.upsertReviewState(req.params.cardId, result || 'seen');
  await db.updateCard(req.params.cardId, { status: result === 'again' ? 'learning' : 'known' });
  res.json({ message: 'ok' });
});

export default app;
