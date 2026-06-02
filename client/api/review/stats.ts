import { db } from '../../../server/src/db.js';

export default async function handler(_req: any, res: any) {
  const cards = await db.listCards(); const todayReviews = await db.getTodayReviews();
  const counts: Record<string, number> = {};
  for (const c of cards) counts[c.status] = (counts[c.status] || 0) + 1;
  res.json({ totalCards: cards.length, reviewedToday: todayReviews.length, byStatus: counts });
}
