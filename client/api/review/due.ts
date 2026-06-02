import { db } from '../../../server/src/db.js';

export default async function handler(_req: any, res: any) {
  const cards = await db.getDueCards();
  res.json({ cards, total: cards.length });
}
