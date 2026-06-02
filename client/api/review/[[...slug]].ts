import express from 'express';
import cors from 'cors';
import { setCurrentUser, db } from '../../../server/src/db.js';

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

app.get('/api/review/today', async (_req: any, res: any) => {
  const allCards = await db.listCards(); const todayReviews = await db.getTodayReviews();
  const reviewedIds = new Set(todayReviews.map((r: any) => r.cardId));
  res.json({ cards: allCards.filter((c: any) => !reviewedIds.has(c.id)), totalToday: allCards.length, reviewedToday: todayReviews.length });
});
app.post('/api/review/:cardId', async (req: any, res: any) => {
  const { result } = req.body; const card = await db.getCard(req.params.cardId);
  if (!card) { res.status(404).json({ error: 'Card not found' }); return; }
  await db.createReviewLog(req.params.cardId, result || 'seen');
  await db.upsertReviewState(req.params.cardId, result || 'seen');
  await db.updateCard(req.params.cardId, { status: result === 'again' ? 'learning' : 'known' });
  res.json({ message: 'ok' });
});
app.get('/api/review/stats', async (_req: any, res: any) => {
  const cards = await db.listCards(); const todayReviews = await db.getTodayReviews();
  const counts: Record<string, number> = {};
  for (const c of cards) counts[c.status] = (counts[c.status] || 0) + 1;
  res.json({ totalCards: cards.length, reviewedToday: todayReviews.length, byStatus: counts });
});
app.get('/api/review/daily', async (_req: any, res: any) => {
  const cards = await db.listCards(); const logs = await db.getAllReviewLogs();
  const now = new Date(); const year = now.getFullYear(); const month = now.getMonth();
  const created: Record<string,number> = {}; const reviewed: Record<string,number> = {};
  for (const c of cards) { const d = c.createdAt.slice(0,10); created[d] = (created[d]||0)+1; }
  for (const l of logs) { const d = l.reviewedAt.slice(0,10); reviewed[d] = (reviewed[d]||0)+1; }
  res.json({ year, month, created, reviewed });
});
app.get('/api/review/due', async (_req: any, res: any) => {
  const cards = await db.getDueCards();
  res.json({ cards, total: cards.length });
});

export default app;
