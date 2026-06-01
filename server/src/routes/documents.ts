import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import { parseDocument } from '../services/documentParser.js';
import { tokenize, mergePhrases, deduplicateTokens } from '../services/tokenizer.js';

const router = Router();

// List all documents
router.get('/', (_req: Request, res: Response) => {
  const docs = db.listDocuments();
  res.json(docs);
});

// Create a document from pasted text
router.post('/', (req: Request, res: Response) => {
  const { title, text, fileType } = req.body;
  if (!text || typeof text !== 'string') {
    res.status(400).json({ error: 'Text content is required' });
    return;
  }
  const doc = db.createDocument({
    title: title || 'Untitled',
    fileType: fileType || 'text',
    text,
  });
  res.status(201).json(doc);
});

// Get a single document
router.get('/:id', (req: Request, res: Response) => {
  const doc = db.getDocument(req.params.id);
  if (!doc) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }
  res.json(doc);
});

// Delete a document
router.delete('/:id', (req: Request, res: Response) => {
  const deleted = db.deleteDocument(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }
  res.json({ message: 'Deleted' });
});

// Parse document into segments and sentences
router.post('/:id/parse', (req: Request, res: Response) => {
  const doc = db.getDocument(req.params.id);
  if (!doc) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }

  const parsed = parseDocument(doc.text);

  // Delete old segments/sentences for this document
  const segments = db.createSegments(
    doc.id,
    parsed.segments.map((seg) => ({
      paragraphIndex: seg.paragraphIndex,
      text: seg.text,
      startOffset: seg.startOffset,
      endOffset: seg.endOffset,
    })),
  );

  const allSentences: Array<ReturnType<typeof db.createSentences>[number]> = [];
  for (const seg of parsed.segments) {
    const segRecord = segments.find((s) => s.paragraphIndex === seg.paragraphIndex)!;
    const sentences = db.createSentences(
      doc.id,
      seg.sentences.map((sent) => ({
        segmentId: segRecord.id,
        sentenceIndex: sent.sentenceIndex,
        text: sent.text,
        startOffset: sent.startOffset,
        endOffset: sent.endOffset,
      })),
    );
    allSentences.push(...sentences);
  }

  res.json({ segments: segments.length, sentences: allSentences.length });
});

// Get segments
router.get('/:id/segments', (req: Request, res: Response) => {
  const segments = db.getSegments(req.params.id);
  res.json(segments);
});

// Get sentences
router.get('/:id/sentences', (req: Request, res: Response) => {
  const sentences = db.getSentences(req.params.id);
  res.json(sentences);
});

// Extract vocabulary from document
router.post('/:id/extract-vocabulary', async (req: Request, res: Response) => {
  const doc = db.getDocument(req.params.id);
  if (!doc) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }

  // Parse if not already done
  let sentences = db.getSentences(doc.id);
  if (sentences.length === 0) {
    const parsed = parseDocument(doc.text);
    const segments = db.createSegments(
      doc.id,
      parsed.segments.map((seg) => ({
        paragraphIndex: seg.paragraphIndex,
        text: seg.text,
        startOffset: seg.startOffset,
        endOffset: seg.endOffset,
      })),
    );
    for (const seg of parsed.segments) {
      const segRecord = segments.find((s) => s.paragraphIndex === seg.paragraphIndex)!;
      db.createSentences(
        doc.id,
        seg.sentences.map((sent) => ({
          segmentId: segRecord.id,
          sentenceIndex: sent.sentenceIndex,
          text: sent.text,
          startOffset: sent.startOffset,
          endOffset: sent.endOffset,
        })),
      );
    }
    sentences = db.getSentences(doc.id);
  }

  // Tokenize, merge phrases, then deduplicate
  const tokens = await tokenize(doc.text);
  const merged = mergePhrases(tokens);
  const deduped = deduplicateTokens(merged);

  // Filter candidates to content words only (no 助詞, 助動詞, 記号)
  const contentWords = deduped.filter(
    (t) => t.partOfSpeech !== '助詞' && t.partOfSpeech !== '助動詞' && t.partOfSpeech !== '記号' && t.partOfSpeech !== 'フィラー',
  );

  // Build raw token list (merged phrases, for inline rendering)
  const rawTokens = merged.map((t) => ({
    surface: t.surface,
    lemma: t.lemma,
    reading: t.reading,
    partOfSpeech: t.partOfSpeech,
    meaning: t.meaning,
    startOffset: t.startOffset,
    endOffset: t.startOffset + t.surface.length,
  }));

  // Build deduplicated candidate list (content words only, for display)
  const candidates = contentWords.map((token) => {
    const sent = sentences.find((s) => s.text.includes(token.surface));
    return {
      id: token.lemma,
      word: token.surface,
      lemma: token.lemma,
      reading: token.reading,
      partOfSpeech: token.partOfSpeech,
      meaning: token.meaning,
      frequency: token.frequency,
      sentenceId: sent?.id || '',
      sentenceText: sent?.text || '',
    };
  });

  res.json({ rawTokens, candidates, totalSentences: sentences.length });
});

// Get vocabulary candidates for a document
router.get('/:id/vocabulary-candidates', (req: Request, res: Response) => {
  const doc = db.getDocument(req.params.id);
  if (!doc) {
    res.status(404).json({ error: 'Document not found' });
    return;
  }

  const occurrences = db.getOccurrences(doc.id);
  const sentences = db.getSentences(doc.id);

  const result = occurrences.map((occ) => {
    const vocab = db.getVocabularyBySurface(occ.surfaceText);
    const sent = sentences.find((s) => s.id === occ.sentenceId);
    return {
      id: occ.id,
      word: occ.surfaceText,
      reading: vocab?.reading || '',
      lemma: vocab?.lemma || occ.surfaceText,
      partOfSpeech: vocab?.partOfSpeech || '',
      meaning: vocab?.meaning || '',
      frequency: occurrences.filter((o) => o.vocabularyId === occ.vocabularyId).length,
      sentenceId: occ.sentenceId,
      sentenceText: sent?.text || '',
      documentId: occ.documentId,
      segmentId: occ.segmentId,
    };
  });

  // Deduplicate by word
  const unique = new Map<string, typeof result[0]>();
  for (const item of result) {
    if (!unique.has(item.word)) {
      unique.set(item.word, item);
    }
  }

  res.json(Array.from(unique.values()));
});

export default router;
