import express from 'express';
import cors from 'cors';
import { setCurrentUser, db } from '../../../server/src/db.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use((req: any, _res: any, next: any) => {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    try { const d = JSON.parse(Buffer.from(auth.slice(7), 'base64').toString()); if (d.userId) setCurrentUser(d.userId); } catch {}
  }
  next();
});

app.get('/api/documents', async (_req: any, res: any) => res.json(await db.listDocuments()));
app.post('/api/documents', async (req: any, res: any) => {
  const { title, text, fileType } = req.body;
  if (!text || typeof text !== 'string') { res.status(400).json({ error: 'Text content is required' }); return; }
  res.status(201).json(await db.createDocument({ title: title || 'Untitled', fileType: fileType || 'text', text }));
});
app.get('/api/documents/:id', async (req: any, res: any) => {
  const doc = await db.getDocument(req.params.id);
  if (!doc) { res.status(404).json({ error: 'Document not found' }); return; }
  res.json(doc);
});
app.delete('/api/documents/:id', async (req: any, res: any) => { await db.deleteDocument(req.params.id); res.json({ message: 'Deleted' }); });
app.post('/api/documents/:id/parse', async (req: any, res: any) => {
  try {
    const { parseDocument } = await import('../../../server/src/services/documentParser.js');
    const doc = await db.getDocument(req.params.id);
    if (!doc) { res.status(404).json({ error: 'Document not found' }); return; }
    const parsed = parseDocument(doc.text);
    const segments = await db.createSegments(doc.id, parsed.segments.map((seg: any) => ({ paragraphIndex: seg.paragraphIndex, text: seg.text, startOffset: seg.startOffset, endOffset: seg.endOffset })));
    let totalSentences = 0;
    for (const seg of parsed.segments) {
      const sr = segments.find((s: any) => s.paragraph_index === seg.paragraphIndex);
      if (sr) { await db.createSentences(doc.id, seg.sentences.map((sent: any) => ({ segmentId: sr.id, sentenceIndex: sent.sentenceIndex, text: sent.text, startOffset: sent.startOffset, endOffset: sent.endOffset }))); totalSentences += seg.sentences.length; }
    }
    res.json({ segments: segments.length, sentences: totalSentences });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
app.get('/api/documents/:id/segments', async (req: any, res: any) => res.json(await db.getSegments(req.params.id)));
app.get('/api/documents/:id/sentences', async (req: any, res: any) => res.json(await db.getSentences(req.params.id)));
app.get('/api/documents/:id/vocabulary-candidates', async (req: any, res: any) => {
  const doc = await db.getDocument(req.params.id);
  if (!doc) { res.status(404).json({ error: 'Document not found' }); return; }
  const occurrences = await db.getOccurrences(doc.id); const sentences = await db.getSentences(doc.id);
  const result = occurrences.map((occ: any) => {
    const sent = sentences.find((s: any) => s.id === occ.sentenceId);
    return { id: occ.id, word: occ.surfaceText, reading: '', lemma: occ.surfaceText, partOfSpeech: '', meaning: '', frequency: occurrences.filter((o: any) => o.vocabularyId === occ.vocabularyId).length, sentenceId: occ.sentenceId, sentenceText: sent?.text || '', documentId: occ.documentId, segmentId: occ.segmentId };
  });
  const unique = new Map<string, any>();
  for (const item of result) { if (!unique.has(item.word)) unique.set(item.word, item); }
  res.json(Array.from(unique.values()));
});

export default app;
