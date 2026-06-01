import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import { getDictEntry } from '../services/tokenizer.js';
import { BUILTIN_DICT } from '../services/builtin-dict.js';

const router = Router();
const BUILTIN_MAP = new Map<string, string>();
for (const [k, , m] of BUILTIN_DICT) { if (!BUILTIN_MAP.has(k)) BUILTIN_MAP.set(k, m); }

router.get('/', async (_req: Request, res: Response) => {
  const cards = await db.listCards();
  res.json(cards);
});

router.post('/', async (req: Request, res: Response) => {
  const { frontText, reading, meaning, partOfSpeech, exampleSentences, documentId, sentenceId, vocabularyId } = req.body;
  if (!frontText) { res.status(400).json({ error: 'frontText is required' }); return; }

  const dictEntry = getDictEntry(frontText);
  let dictData: any = null;
  if (dictEntry) {
    const zhFromBuiltin = BUILTIN_MAP.get(frontText);
    const validSenses = dictEntry.senses.filter((s: any) => s.glosses.length > 0);
    dictData = { ...dictEntry, senses: validSenses.map((s: any) => ({ glosses: s.glosses, glossesZh: zhFromBuiltin ? [zhFromBuiltin] : [], pos: s.pos, examples: s.examples })) };
  }

  const card = await db.createCard({
    vocabularyId: vocabularyId || '', documentId: documentId || '', sentenceId: sentenceId || '',
    frontText, reading: reading || '', meaning: meaning || '', partOfSpeech: partOfSpeech || '',
    exampleSentences: exampleSentences || [], dictData: dictData ? JSON.stringify(dictData) : null,
  });
  res.status(201).json(card);
});

router.get('/:id', async (req: Request, res: Response) => {
  const card = await db.getCard(req.params.id as string);
  if (!card) { res.status(404).json({ error: 'Card not found' }); return; }
  res.json(card);
});

router.patch('/:id', async (req: Request, res: Response) => {
  await db.updateCard(req.params.id as string, req.body);
  const card = await db.getCard(req.params.id as string);
  res.json(card);
});

router.delete('/:id', async (req: Request, res: Response) => {
  await db.deleteCard(req.params.id as string);
  res.json({ message: 'Deleted' });
});

router.get('/:id/source', async (req: Request, res: Response) => {
  const card = await db.getCard(req.params.id as string);
  if (!card) { res.status(404).json({ error: 'Card not found' }); return; }

  const doc = await db.getDocument(card.documentId);
  const sentences = await db.getSentences(card.documentId);
  const targetIndex = sentences.findIndex((s: any) => s.id === card.sentenceId);
  const target = sentences[targetIndex];
  const prev = targetIndex > 0 ? sentences[targetIndex - 1] : null;
  const next = targetIndex < sentences.length - 1 ? sentences[targetIndex + 1] : null;

  res.json({
    documentTitle: doc?.title || 'Unknown', documentId: card.documentId,
    sentence: target?.text || '', previousSentence: prev?.text || null, nextSentence: next?.text || null,
    highlight: { word: card.frontText, startOffset: target?.text?.indexOf(card.frontText) ?? -1, endOffset: (target?.text?.indexOf(card.frontText) ?? -1) + card.frontText.length },
  });
});

export default router;
