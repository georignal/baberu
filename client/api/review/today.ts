import { db } from '../../../server/src/db.js';

export default async function handler(_req: any, res: any) {
  const allCards = await db.listCards(); const todayReviews = await db.getTodayReviews();
  const reviewedIds = new Set(todayReviews.map((r: any) => r.cardId));
  res.json({ cards: allCards.filter((c: any) => !reviewedIds.has(c.id)), totalToday: allCards.length, reviewedToday: todayReviews.length });
}
