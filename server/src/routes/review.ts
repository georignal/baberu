import { Router, Request, Response } from 'express';
import { db } from '../db.js';

const router = Router();

// Get today's review cards
router.get('/today', (_req: Request, res: Response) => {
  const allCards = db.listCards();
  const todayReviews = db.getTodayReviews();
  const reviewedIds = new Set(todayReviews.map((r) => r.cardId));

  // Cards not yet reviewed today
  const dueCards = allCards.filter((c) => !reviewedIds.has(c.id));

  // Enrich cards
  const enriched = dueCards.map((card) => {
    const doc = db.getDocument(card.documentId);
    const sent = db.getSentence(card.sentenceId);
    return {
      ...card,
      documentTitle: doc?.title || 'Unknown',
      sourceSentence: sent?.text || '',
    };
  });

  res.json({ cards: enriched, totalToday: allCards.length, reviewedToday: todayReviews.length });
});

// Log a review and schedule next review
router.post('/:cardId', (req: Request, res: Response) => {
  const { result } = req.body;
  const card = db.getCard(req.params.cardId);
  if (!card) { res.status(404).json({ error: 'Card not found' }); return; }

  db.createReviewLog(req.params.cardId, result || 'seen');
  db.upsertReviewState(req.params.cardId, result || 'seen');
  db.updateCard(req.params.cardId, { status: result === 'again' ? 'learning' : result === 'known' ? 'known' : 'mastered' });

  res.json({ message: 'ok' });
});

// Get daily stats for calendar
router.get('/daily', (_req: Request, res: Response) => {
  const cards = db.listCards();
  const allLogs = db.getTodayReviews ? [] : []; // get all reviews

  // Build daily counts for current month
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  const created: Record<string, number> = {};
  const reviewed: Record<string, number> = {};

  // Count cards created per day
  for (const card of cards) {
    const d = card.createdAt.slice(0, 10); // "YYYY-MM-DD"
    created[d] = (created[d] || 0) + 1;
  }

  // Count reviews per day
  for (const log of allLogs) {
    const d = log.reviewedAt.slice(0, 10);
    reviewed[d] = (reviewed[d] || 0) + 1;
  }

  // Also get review logs from db
  const reviewLogs = db.getAllReviewLogs ? db.getAllReviewLogs() : [];
  for (const log of reviewLogs) {
    const d = log.reviewedAt.slice(0, 10);
    reviewed[d] = (reviewed[d] || 0) + 1;
  }

  res.json({ year, month, created, reviewed });
});

// Get review stats
router.get('/stats', (_req: Request, res: Response) => {
  const cards = db.listCards();
  const todayReviews = db.getTodayReviews();

  const statusCounts: Record<string, number> = {};
  for (const card of cards) {
    statusCounts[card.status] = (statusCounts[card.status] || 0) + 1;
  }

  res.json({
    totalCards: cards.length,
    reviewedToday: todayReviews.length,
    byStatus: statusCounts,
  });
});

// Get cards due for review (SRS)
router.get('/due', (_req: Request, res: Response) => {
  const dueCards = db.getDueCards();
  const enriched = dueCards.map((card) => {
    const doc = db.getDocument(card.documentId);
    const state = db.getReviewState(card.id);
    return {
      ...card,
      documentTitle: doc?.title || 'Unknown',
      reviewStage: state?.stage || 0,
      dueAt: state?.dueAt || null,
    };
  });
  res.json({ cards: enriched, total: enriched.length });
});

export default router;
