import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve('data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

interface StoreData {
  documents: DocumentRecord[];
  segments: SegmentRecord[];
  sentences: SentenceRecord[];
  vocabulary: VocabularyRecord[];
  occurrences: OccurrenceRecord[];
  cards: CardRecord[];
  reviewLogs: ReviewLogRecord[];
}

const empty: StoreData = {
  documents: [],
  segments: [],
  sentences: [],
  vocabulary: [],
  occurrences: [],
  cards: [],
  reviewLogs: [],
};

let store: StoreData;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function load(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      store = JSON.parse(raw);
    } else {
      store = { ...empty };
      persist();
    }
  } catch {
    store = { ...empty };
  }
}

function persist(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to persist store:', e);
  }
}

function save(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(persist, 100);
}

load();

export function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function now(): string {
  return new Date().toISOString();
}

export const db = {
  // Documents
  createDocument(data: { title: string; fileType?: string; storagePath?: string; text: string }): DocumentRecord {
    const doc: DocumentRecord = {
      id: uuid(),
      title: data.title,
      fileType: data.fileType || 'text',
      storagePath: data.storagePath || null,
      text: data.text,
      createdAt: now(),
      updatedAt: now(),
    };
    store.documents.push(doc);
    save();
    return doc;
  },
  listDocuments(): DocumentRecord[] {
    return store.documents.map((d) => ({
      ...d,
      segmentCount: store.segments.filter((s) => s.documentId === d.id).length,
      sentenceCount: store.sentences.filter((s) => s.documentId === d.id).length,
      candidateCount: store.occurrences.filter((o) => o.documentId === d.id).length,
      cardCount: store.cards.filter((c) => c.documentId === d.id).length,
    })) as DocumentRecord[];
  },
  getDocument(id: string): DocumentRecord | undefined {
    return store.documents.find((d) => d.id === id);
  },
  deleteDocument(id: string): boolean {
    const before = store.documents.length;
    store.documents = store.documents.filter((d) => d.id !== id);
    store.segments = store.segments.filter((s) => s.documentId !== id);
    store.sentences = store.sentences.filter((s) => s.documentId !== id);
    store.occurrences = store.occurrences.filter((o) => o.documentId !== id);
    store.cards = store.cards.filter((c) => c.documentId !== id);
    save();
    return store.documents.length < before;
  },

  // Segments
  createSegments(
    documentId: string,
    items: { paragraphIndex: number; text: string; startOffset: number; endOffset: number }[],
  ): SegmentRecord[] {
    const records = items.map((item) => ({
      id: uuid(),
      documentId,
      paragraphIndex: item.paragraphIndex,
      text: item.text,
      startOffset: item.startOffset,
      endOffset: item.endOffset,
      createdAt: now(),
    }));
    store.segments.push(...records);
    save();
    return records;
  },
  getSegments(documentId: string): SegmentRecord[] {
    return store.segments.filter((s) => s.documentId === documentId);
  },

  // Sentences
  createSentences(
    documentId: string,
    items: { segmentId: string; sentenceIndex: number; text: string; startOffset: number; endOffset: number }[],
  ): SentenceRecord[] {
    const records = items.map((item) => ({
      id: uuid(),
      documentId,
      segmentId: item.segmentId,
      sentenceIndex: item.sentenceIndex,
      text: item.text,
      startOffset: item.startOffset,
      endOffset: item.endOffset,
      createdAt: now(),
    }));
    store.sentences.push(...records);
    save();
    return records;
  },
  getSentences(documentId: string): SentenceRecord[] {
    return store.sentences.filter((s) => s.documentId === documentId);
  },
  getSentence(id: string): SentenceRecord | undefined {
    return store.sentences.find((s) => s.id === id);
  },

  // Vocabulary
  createVocabulary(data: { surface: string; lemma: string; reading: string; partOfSpeech: string; meaning?: string }): VocabularyRecord {
    const existing = store.vocabulary.find((v) => v.surface === data.surface && v.lemma === data.lemma);
    if (existing) return existing;
    const record: VocabularyRecord = {
      id: uuid(),
      surface: data.surface,
      lemma: data.lemma,
      reading: data.reading,
      partOfSpeech: data.partOfSpeech,
      meaning: data.meaning || null,
      createdAt: now(),
      updatedAt: now(),
    };
    store.vocabulary.push(record);
    save();
    return record;
  },
  getVocabularyBySurface(surface: string): VocabularyRecord | undefined {
    return store.vocabulary.find((v) => v.surface === surface);
  },

  // Occurrences
  createOccurrence(data: {
    vocabularyId: string;
    documentId: string;
    segmentId: string;
    sentenceId: string;
    surfaceText: string;
    startOffset: number;
    endOffset: number;
  }): OccurrenceRecord {
    const record: OccurrenceRecord = {
      id: uuid(),
      ...data,
      createdAt: now(),
    };
    store.occurrences.push(record);
    save();
    return record;
  },
  getOccurrences(documentId: string): OccurrenceRecord[] {
    return store.occurrences.filter((o) => o.documentId === documentId);
  },
  getOccurrencesByVocab(vocabularyId: string): OccurrenceRecord[] {
    return store.occurrences.filter((o) => o.vocabularyId === vocabularyId);
  },

  // Cards
  createCard(data: {
    vocabularyId: string;
    documentId: string;
    segmentId: string;
    sentenceId: string;
    occurrenceId: string;
    frontText: string;
    reading: string;
    meaning: string;
    partOfSpeech: string;
    exampleSentences: string[];
    dictData?: string | null;
  }): CardRecord {
    const record: CardRecord = {
      id: uuid(),
      vocabularyId: data.vocabularyId,
      documentId: data.documentId,
      segmentId: data.segmentId,
      sentenceId: data.sentenceId,
      occurrenceId: data.occurrenceId,
      frontText: data.frontText,
      reading: data.reading,
      meaning: data.meaning,
      partOfSpeech: data.partOfSpeech,
      exampleSentences: data.exampleSentences,
      dictData: data.dictData || null,
      status: 'new',
      createdAt: now(),
      updatedAt: now(),
    };
    store.cards.push(record);
    save();
    return record;
  },
  listCards(): CardRecord[] {
    return store.cards;
  },
  getCard(id: string): CardRecord | undefined {
    return store.cards.find((c) => c.id === id);
  },
  updateCard(id: string, data: Partial<Pick<CardRecord, 'frontText' | 'reading' | 'meaning' | 'exampleSentences' | 'status'>>): CardRecord | undefined {
    const card = store.cards.find((c) => c.id === id);
    if (!card) return undefined;
    Object.assign(card, data, { updatedAt: now() });
    save();
    return card;
  },
  deleteCard(id: string): boolean {
    const before = store.cards.length;
    store.cards = store.cards.filter((c) => c.id !== id);
    store.reviewLogs = store.reviewLogs.filter((r) => r.cardId !== id);
    save();
    return store.cards.length < before;
  },

  // Review
  createReviewLog(cardId: string, result: string): ReviewLogRecord {
    const record: ReviewLogRecord = {
      id: uuid(),
      cardId,
      result,
      reviewedAt: now(),
    };
    store.reviewLogs.push(record);
    save();
    return record;
  },
  getReviewLogs(cardId: string): ReviewLogRecord[] {
    return store.reviewLogs.filter((r) => r.cardId === cardId);
  },
  getTodayReviews(): ReviewLogRecord[] {
    const today = new Date().toISOString().slice(0, 10);
    return store.reviewLogs.filter((r) => r.reviewedAt.startsWith(today));
  },
  getAllReviewLogs(): ReviewLogRecord[] {
    return store.reviewLogs;
  },
};

export interface DocumentRecord {
  id: string;
  title: string;
  fileType: string;
  storagePath: string | null;
  text: string;
  segmentCount?: number;
  sentenceCount?: number;
  candidateCount?: number;
  cardCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SegmentRecord {
  id: string;
  documentId: string;
  paragraphIndex: number;
  text: string;
  startOffset: number;
  endOffset: number;
  createdAt: string;
}

export interface SentenceRecord {
  id: string;
  documentId: string;
  segmentId: string;
  sentenceIndex: number;
  text: string;
  startOffset: number;
  endOffset: number;
  createdAt: string;
}

export interface VocabularyRecord {
  id: string;
  surface: string;
  lemma: string;
  reading: string;
  partOfSpeech: string;
  meaning: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OccurrenceRecord {
  id: string;
  vocabularyId: string;
  documentId: string;
  segmentId: string;
  sentenceId: string;
  surfaceText: string;
  startOffset: number;
  endOffset: number;
  createdAt: string;
}

export interface CardRecord {
  id: string;
  vocabularyId: string;
  documentId: string;
  segmentId: string;
  sentenceId: string;
  occurrenceId: string;
  frontText: string;
  reading: string;
  meaning: string;
  partOfSpeech: string;
  exampleSentences: string[];
  dictData: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewLogRecord {
  id: string;
  cardId: string;
  result: string;
  reviewedAt: string;
}
