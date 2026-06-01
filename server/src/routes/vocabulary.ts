import { Router, Request, Response } from 'express';
import { db } from '../db.js';

const router = Router();

// List all vocabulary items
router.get('/', (_req: Request, res: Response) => {
  res.json({ vocabulary: [] });
});

// Ignore a vocabulary item
router.post('/:id/ignore', (req: Request, res: Response) => {
  res.json({ message: `Ignored vocabulary ${req.params.id}` });
});

export default router;
