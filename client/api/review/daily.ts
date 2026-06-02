import { db } from '../../../server/src/db.js';

export default async function handler(_req: any, res: any) {
  const cards = await db.listCards(); const logs = await db.getAllReviewLogs();
  const now = new Date(); const year = now.getFullYear(); const month = now.getMonth();
  const created: Record<string,number> = {}; const reviewed: Record<string,number> = {};
  for (const c of cards) { const d = c.createdAt.slice(0,10); created[d] = (created[d]||0)+1; }
  for (const l of logs) { const d = l.reviewedAt.slice(0,10); reviewed[d] = (reviewed[d]||0)+1; }
  res.json({ year, month, created, reviewed });
}
