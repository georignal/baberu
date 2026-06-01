import { Router } from 'express';
const router = Router();
// List all vocabulary items
router.get('/', (_req, res) => {
    res.json({ vocabulary: [] });
});
// Ignore a vocabulary item
router.post('/:id/ignore', (req, res) => {
    res.json({ message: `Ignored vocabulary ${req.params.id}` });
});
export default router;
//# sourceMappingURL=vocabulary.js.map