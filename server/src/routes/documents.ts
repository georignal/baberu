import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import { parseDocument } from '../services/documentParser.js';
import { tokenize, mergePhrases, deduplicateTokens } from '../services/tokenizer.js';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const docs = await db.listDocuments();
  res.json(docs);
});

router.post('/', async (req: Request, res: Response) => {
  const { title, text, fileType } = req.body;
  if (!text || typeof text !== 'string') { res.status(400).json({ error: 'Text content is required' }); return; }
  const doc = await db.createDocument({ title: title || 'Untitled', fileType: fileType || 'text', text });
  res.status(201).json(doc);
});

router.get('/:id', async (req: Request, res: Response) => {
  const doc = await db.getDocument(req.params.id as string);
  if (!doc) { res.status(404).json({ error: 'Document not found' }); return; }
  res.json(doc);
});

router.delete('/:id', async (req: Request, res: Response) => {
  await db.deleteDocument(req.params.id as string);
  res.json({ message: 'Deleted' });
});

router.post('/:id/parse', async (req: Request, res: Response) => {
  const doc = await db.getDocument(req.params.id as string);
  if (!doc) { res.status(404).json({ error: 'Document not found' }); return; }
  const parsed = parseDocument(doc.text);
  const segments = await db.createSegments(doc.id, parsed.segments.map(seg => ({
    paragraphIndex: seg.paragraphIndex, text: seg.text, startOffset: seg.startOffset, endOffset: seg.endOffset,
  })));
  let totalSentences = 0;
  for (const seg of parsed.segments) {
    const segRecord = segments.find((s: any) => s.paragraph_index === seg.paragraphIndex)!;
    await db.createSentences(doc.id, seg.sentences.map(sent => ({
      segmentId: segRecord.id, sentenceIndex: sent.sentenceIndex, text: sent.text, startOffset: sent.startOffset, endOffset: sent.endOffset,
    })));
    totalSentences += seg.sentences.length;
  }
  res.json({ segments: segments.length, sentences: totalSentences });
});

router.get('/:id/segments', async (req: Request, res: Response) => {
  const segments = await db.getSegments(req.params.id as string);
  res.json(segments);
});

router.get('/:id/sentences', async (req: Request, res: Response) => {
  const sentences = await db.getSentences(req.params.id as string);
  res.json(sentences);
});

router.post('/:id/extract-vocabulary', async (req: Request, res: Response) => {
  const doc = await db.getDocument(req.params.id as string);
  if (!doc) { res.status(404).json({ error: 'Document not found' }); return; }

  let sentences = await db.getSentences(doc.id);
  if (sentences.length === 0) {
    const parsed = parseDocument(doc.text);
    const segments = await db.createSegments(doc.id, parsed.segments.map(seg => ({
      paragraphIndex: seg.paragraphIndex, text: seg.text, startOffset: seg.startOffset, endOffset: seg.endOffset,
    })));
    for (const seg of parsed.segments) {
      const segRecord = segments.find((s: any) => s.paragraph_index === seg.paragraphIndex)!;
      await db.createSentences(doc.id, seg.sentences.map(sent => ({
        segmentId: segRecord.id, sentenceIndex: sent.sentenceIndex, text: sent.text, startOffset: sent.startOffset, endOffset: sent.endOffset,
      })));
    }
    sentences = await db.getSentences(doc.id);
  }

  const tokens = await tokenize(doc.text);
  const merged = mergePhrases(tokens);
  const deduped = deduplicateTokens(merged);

  const contentWords = deduped.filter(t => t.partOfSpeech !== '助詞' && t.partOfSpeech !== '助動詞' && t.partOfSpeech !== '記号');

  const rawTokens = merged.map(t => ({
    surface: t.surface, lemma: t.lemma, reading: t.reading, partOfSpeech: t.partOfSpeech,
    meaning: t.meaning, startOffset: t.startOffset, endOffset: t.startOffset + t.surface.length,
  }));

  const candidates = contentWords.map(token => {
    const sent = sentences.find((s: any) => s.text.includes(token.surface));
    return { id: token.lemma, word: token.surface, lemma: token.lemma, reading: token.reading, partOfSpeech: token.partOfSpeech, meaning: token.meaning, frequency: token.frequency, sentenceId: sent?.id || '', sentenceText: sent?.text || '' };
  });

  for (const token of contentWords) {
    await db.createVocabulary({ surface: token.surface, lemma: token.lemma, reading: token.reading, partOfSpeech: token.partOfSpeech, meaning: token.meaning });
    const sent = sentences.find((s: any) => s.text.includes(token.surface));
    if (sent) {
      const idx = sent.text.indexOf(token.surface);
      await db.createOccurrence({ vocabularyId: token.lemma, documentId: doc.id, segmentId: sent.segmentId, sentenceId: sent.id, surfaceText: token.surface, startOffset: idx >= 0 ? idx : 0, endOffset: idx >= 0 ? idx + token.surface.length : token.surface.length });
    }
  }

  res.json({ rawTokens, candidates, totalSentences: sentences.length });
});

router.get('/:id/vocabulary-candidates', async (req: Request, res: Response) => {
  const doc = await db.getDocument(req.params.id as string);
  if (!doc) { res.status(404).json({ error: 'Document not found' }); return; }
  const occurrences = await db.getOccurrences(doc.id);
  const sentences = await db.getSentences(doc.id);
  const result = occurrences.map((occ: any) => {
    const sent = sentences.find((s: any) => s.id === occ.sentenceId);
    return { id: occ.id, word: occ.surfaceText, reading: '', lemma: occ.surfaceText, partOfSpeech: '', meaning: '', frequency: occurrences.filter((o: any) => o.vocabularyId === occ.vocabularyId).length, sentenceId: occ.sentenceId, sentenceText: sent?.text || '', documentId: occ.documentId, segmentId: occ.segmentId };
  });
  const unique = new Map<string, any>();
  for (const item of result) { if (!unique.has(item.word)) unique.set(item.word, item); }
  res.json(Array.from(unique.values()));
});

export default router;
