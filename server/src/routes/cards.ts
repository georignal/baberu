import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import { getDictEntry } from '../services/tokenizer.js';
import { BUILTIN_DICT } from '../services/builtin-dict.js';

const router = Router();

// Built-in Chinese lookup
const BUILTIN_MAP = new Map<string, string>();
for (const [k, , m] of BUILTIN_DICT) {
  if (!BUILTIN_MAP.has(k)) BUILTIN_MAP.set(k, m);
}

// List all cards
router.get('/', (_req: Request, res: Response) => {
  const cards = db.listCards();
  // Enrich with sentence info
  const enriched = cards.map((card) => {
    const doc = db.getDocument(card.documentId);
    const sent = db.getSentence(card.sentenceId);
    return {
      ...card,
      documentTitle: doc?.title || 'Unknown',
      sourceSentence: sent?.text || '',
    };
  });
  res.json(enriched);
});

// Create a card from a candidate
router.post('/', (req: Request, res: Response) => {
  const { occurrenceId, frontText, reading, meaning, partOfSpeech, exampleSentences, documentId, segmentId, sentenceId, vocabularyId } = req.body;

  if (!frontText) {
    res.status(400).json({ error: 'frontText is required' });
    return;
  }

  const dictEntry = getDictEntry(frontText);
  // Build dictData: keep only senses that have glosses, add Chinese from built-in
  let dictData: any = null;
  if (dictEntry) {
    const zhFromBuiltin = BUILTIN_MAP.get(frontText);
    const validSenses = dictEntry.senses.filter((s) => s.glosses.length > 0);
    dictData = {
      ...dictEntry,
      senses: validSenses.map((s) => ({
        glosses: s.glosses,
        glossesZh: zhFromBuiltin ? [zhFromBuiltin] : [],
        pos: s.pos,
        examples: s.examples,
      })),
    };
  }
  const card = db.createCard({
    vocabularyId: vocabularyId || '',
    documentId: documentId || '',
    segmentId: segmentId || '',
    sentenceId: sentenceId || '',
    occurrenceId: occurrenceId || '',
    frontText,
    reading: reading || '',
    meaning: meaning || '',
    partOfSpeech: partOfSpeech || '',
    exampleSentences: exampleSentences || [],
    dictData: dictData ? JSON.stringify(dictData) : null,
  });

  res.status(201).json(card);
});

// Get a single card
router.get('/:id', (req: Request, res: Response) => {
  const card = db.getCard(req.params.id);
  if (!card) {
    res.status(404).json({ error: 'Card not found' });
    return;
  }
  const doc = db.getDocument(card.documentId);
  const sent = db.getSentence(card.sentenceId);
  res.json({
    ...card,
    documentTitle: doc?.title || 'Unknown',
    sourceSentence: sent?.text || '',
  });
});

// Update a card
router.patch('/:id', (req: Request, res: Response) => {
  const updated = db.updateCard(req.params.id, req.body);
  if (!updated) {
    res.status(404).json({ error: 'Card not found' });
    return;
  }
  res.json(updated);
});

// Delete a card
router.delete('/:id', (req: Request, res: Response) => {
  const deleted = db.deleteCard(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Card not found' });
    return;
  }
  res.json({ message: 'Deleted' });
});

// Get card source context (surrounding sentences)
router.get('/:id/source', (req: Request, res: Response) => {
  const card = db.getCard(req.params.id);
  if (!card) {
    res.status(404).json({ error: 'Card not found' });
    return;
  }

  const doc = db.getDocument(card.documentId);
  const sentences = db.getSentences(card.documentId);
  const targetIndex = sentences.findIndex((s) => s.id === card.sentenceId);

  const target = sentences[targetIndex];
  const previousSentence = targetIndex > 0 ? sentences[targetIndex - 1] : null;
  const nextSentence = targetIndex < sentences.length - 1 ? sentences[targetIndex + 1] : null;

  res.json({
    documentTitle: doc?.title || 'Unknown',
    documentId: card.documentId,
    sentence: target?.text || '',
    previousSentence: previousSentence?.text || null,
    nextSentence: nextSentence?.text || null,
    highlight: {
      word: card.frontText,
      startOffset: target?.text.indexOf(card.frontText) ?? -1,
      endOffset: (target?.text.indexOf(card.frontText) ?? -1) + card.frontText.length,
    },
  });
});

export default router;
