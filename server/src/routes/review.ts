import { Router, Request, Response } from 'express';
import { db } from '../db.js';

const router = Router();

router.get('/today', async (_req: Request, res: Response) => {
  const allCards = await db.listCards();
  const todayReviews = await db.getTodayReviews();
  const reviewedIds = new Set(todayReviews.map((r: any) => r.cardId));
  const dueCards = allCards.filter((c: any) => !reviewedIds.has(c.id));
  res.json({ cards: dueCards, totalToday: allCards.length, reviewedToday: todayReviews.length });
});

router.post('/:cardId', async (req: Request, res: Response) => {
  const { result } = req.body;
  const card = await db.getCard(req.params.cardId as string);
  if (!card) { res.status(404).json({ error: 'Card not found' }); return; }
  await db.createReviewLog(req.params.cardId as string, result || 'seen');
  await db.upsertReviewState(req.params.cardId as string, result || 'seen');
  await db.updateCard(req.params.cardId as string, { status: result === 'again' ? 'learning' : 'known' });
  res.json({ message: 'ok' });
});

router.get('/stats', async (_req: Request, res: Response) => {
  const cards = await db.listCards();
  const todayReviews = await db.getTodayReviews();
  const counts: Record<string, number> = {};
  for (const c of cards) counts[c.status] = (counts[c.status] || 0) + 1;
  res.json({ totalCards: cards.length, reviewedToday: todayReviews.length, byStatus: counts });
});

router.get('/daily', async (_req: Request, res: Response) => {
  const cards = await db.listCards();
  const logs = await db.getAllReviewLogs();
  const now = new Date(); const year = now.getFullYear(); const month = now.getMonth();
  const created: Record<string,number> = {}; const reviewed: Record<string,number> = {};
  for (const c of cards) { const d = c.createdAt.slice(0,10); created[d] = (created[d]||0)+1; }
  for (const l of logs) { const d = l.reviewedAt.slice(0,10); reviewed[d] = (reviewed[d]||0)+1; }
  res.json({ year, month, created, reviewed });
});

router.get('/due', async (_req: Request, res: Response) => {
  const cards = await db.getDueCards();
  const enriched = cards.map((c: any) => ({ ...c }));
  res.json({ cards: enriched, total: enriched.length });
});

export default router;
