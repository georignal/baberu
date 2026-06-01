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

// Log a review
router.post('/:cardId', (req: Request, res: Response) => {
  const { result } = req.body;
  const card = db.getCard(req.params.cardId);
  if (!card) {
    res.status(404).json({ error: 'Card not found' });
    return;
  }

  const log = db.createReviewLog(req.params.cardId, result || 'seen');

  // Update card status based on result
  const statusMap: Record<string, string> = {
    again: 'learning',
    known: 'known',
    mastered: 'mastered',
  };
  db.updateCard(req.params.cardId, { status: statusMap[result] || card.status });

  res.json(log);
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

export default router;
