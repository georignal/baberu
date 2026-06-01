/**
 * Database layer. Uses Supabase if configured, falls back to file storage.
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve('data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

// --- File storage (always works as fallback) ---
interface StoreData {
  users: any[]; documents: any[]; segments: any[]; sentences: any[];
  vocabulary: any[]; occurrences: any[]; cards: any[]; reviewLogs: any[]; reviewStates: any[];
}
const empty: StoreData = { users:[],documents:[],segments:[],sentences:[],vocabulary:[],occurrences:[],cards:[],reviewLogs:[],reviewStates:[] };
let fileStore: StoreData;
function loadFileStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fileStore = fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) : { ...empty };
  } catch { fileStore = { ...empty }; }
}
function saveFileStore() {
  try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(fileStore, null, 2), 'utf-8'); } catch {}
}
loadFileStore();

// --- Supabase (optional) ---
let supabase: any = null;
let usingSupabase = false;
try {
  const url = process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (url && key && key.length > 10) {
    supabase = createClient(url, key);
    usingSupabase = true;
    console.log('Database: Supabase');
  }
} catch {}
if (!usingSupabase) console.log('Database: file storage');

let currentUserId = 'default';
export function setCurrentUser(id: string) { currentUserId = id; }
export function uuid() { return crypto.randomUUID(); }
function now() { return new Date().toISOString(); }

export const db = {
  async upsertUser(username: string) {
    if (usingSupabase) {
      const { data: e } = await supabase.from('users').select('id,username').eq('username', username).single();
      if (e) return e;
      const id = uuid(); await supabase.from('users').insert({ id, username });
      return { id, username };
    }
    const e = fileStore.users.find((u:any) => u.username === username);
    if (e) return e;
    const u = { id: uuid(), username, createdAt: now() }; fileStore.users.push(u); saveFileStore(); return u;
  },

  async createDocument(data: { title: string; fileType?: string; text: string }) {
    const doc: any = { id: uuid(), userId: currentUserId, title: data.title, fileType: data.fileType || 'text', text: data.text, createdAt: now(), updatedAt: now() };
    if (usingSupabase) {
      await supabase.from('documents').insert({ id: doc.id, user_id: doc.userId, title: doc.title, file_type: doc.fileType, text: doc.text });
    } else {
      fileStore.documents.push(doc); saveFileStore();
    }
    return doc;
  },
  async listDocuments() {
    if (usingSupabase) {
      const { data } = await supabase.from('documents').select('*').eq('user_id', currentUserId).order('created_at', { ascending: false });
      return (data || []).map((d:any) => ({ id: d.id, userId: d.user_id, title: d.title, fileType: d.file_type, text: d.text, createdAt: d.created_at, updatedAt: d.updated_at }));
    }
    return fileStore.documents.filter((d:any) => d.userId === currentUserId);
  },
  async getDocument(id: string) {
    if (usingSupabase) {
      const { data } = await supabase.from('documents').select('*').eq('id', id).single();
      return data ? { id: data.id, userId: data.user_id, title: data.title, fileType: data.file_type, text: data.text, createdAt: data.created_at, updatedAt: data.updated_at } : undefined;
    }
    return fileStore.documents.find((d:any) => d.id === id);
  },
  async deleteDocument(id: string) {
    if (usingSupabase) await supabase.from('documents').delete().eq('id', id);
    else { fileStore.documents = fileStore.documents.filter((d:any) => d.id !== id); saveFileStore(); }
  },

  async createSegments(docId: string, items: { paragraphIndex: number; text: string; startOffset: number; endOffset: number }[]) {
    const rows = items.map(i => ({ id: uuid(), document_id: docId, paragraph_index: i.paragraphIndex, text: i.text, start_offset: i.startOffset, end_offset: i.endOffset }));
    if (usingSupabase) await supabase.from('text_segments').insert(rows);
    else { fileStore.segments.push(...rows as any); saveFileStore(); }
    return rows;
  },
  async getSegments(docId: string) {
    if (usingSupabase) {
      const { data } = await supabase.from('text_segments').select('*').eq('document_id', docId).order('paragraph_index');
      return (data || []).map((d:any) => ({ id: d.id, documentId: d.document_id, paragraphIndex: d.paragraph_index, text: d.text, startOffset: d.start_offset, endOffset: d.end_offset }));
    }
    return fileStore.segments.filter((s:any) => s.document_id === docId).map((d:any) => ({ id: d.id, documentId: d.document_id, paragraphIndex: d.paragraph_index, text: d.text, startOffset: d.start_offset, endOffset: d.end_offset }));
  },

  async createSentences(docId: string, items: { segmentId: string; sentenceIndex: number; text: string; startOffset: number; endOffset: number }[]) {
    const rows = items.map(i => ({ id: uuid(), document_id: docId, segment_id: i.segmentId, sentence_index: i.sentenceIndex, text: i.text, start_offset: i.startOffset, end_offset: i.endOffset }));
    if (usingSupabase) await supabase.from('text_sentences').insert(rows);
    else { fileStore.sentences.push(...rows as any); saveFileStore(); }
    return rows;
  },
  async getSentences(docId: string) {
    if (usingSupabase) {
      const { data } = await supabase.from('text_sentences').select('*').eq('document_id', docId).order('sentence_index');
      return (data || []).map((d:any) => ({ id: d.id, documentId: d.document_id, segmentId: d.segment_id, sentenceIndex: d.sentence_index, text: d.text, startOffset: d.start_offset, endOffset: d.end_offset }));
    }
    return fileStore.sentences.filter((s:any) => s.document_id === docId).map((d:any) => ({ id: d.id, documentId: d.document_id, segmentId: d.segment_id, sentenceIndex: d.sentence_index, text: d.text, startOffset: d.start_offset, endOffset: d.end_offset }));
  },

  async createVocabulary(data: { surface: string; lemma: string; reading: string; partOfSpeech: string; meaning?: string }) {
    if (usingSupabase) {
      const { data: e } = await supabase.from('vocabulary_items').select('id').eq('surface', data.surface).eq('lemma', data.lemma).eq('user_id', currentUserId).single();
      if (e) return e;
      const id = uuid(); await supabase.from('vocabulary_items').insert({ id, user_id: currentUserId, surface: data.surface, lemma: data.lemma, reading: data.reading, part_of_speech: data.partOfSpeech, meaning: data.meaning || null });
      return { id, ...data };
    }
    return { id: uuid(), ...data };
  },
  async createOccurrence(data: { vocabularyId: string; documentId: string; segmentId: string; sentenceId: string; surfaceText: string; startOffset: number; endOffset: number }) {
    const r = { id: uuid(), ...data };
    if (usingSupabase) await supabase.from('vocabulary_occurrences').insert({ id: r.id, vocabulary_id: r.vocabularyId, document_id: r.documentId, segment_id: r.segmentId, sentence_id: r.sentenceId, surface_text: r.surfaceText, start_offset: r.startOffset, end_offset: r.endOffset });
    return r;
  },
  async getOccurrences(docId: string) {
    if (usingSupabase) {
      const { data } = await supabase.from('vocabulary_occurrences').select('*').eq('document_id', docId);
      return (data || []).map((d:any) => ({ id: d.id, vocabularyId: d.vocabulary_id, documentId: d.document_id, segmentId: d.segment_id, sentenceId: d.sentence_id, surfaceText: d.surface_text, startOffset: d.start_offset, endOffset: d.end_offset }));
    }
    return [];
  },

  async createCard(data: { vocabularyId: string; documentId: string; sentenceId: string; frontText: string; reading: string; meaning: string; partOfSpeech: string; exampleSentences: string[]; dictData?: string | null }) {
    const card: any = { id: uuid(), vocabularyId: data.vocabularyId, documentId: data.documentId, sentenceId: data.sentenceId, frontText: data.frontText, reading: data.reading, meaning: data.meaning, partOfSpeech: data.partOfSpeech, exampleSentences: data.exampleSentences, dictData: data.dictData, status: 'new', createdAt: now(), updatedAt: now() };
    if (usingSupabase) {
      await supabase.from('cards').insert({ id: card.id, user_id: currentUserId, document_id: card.documentId, vocabulary_id: card.vocabularyId, sentence_id: card.sentenceId, front_text: card.frontText, reading: card.reading, meaning: card.meaning, part_of_speech: card.partOfSpeech, example_sentences: card.exampleSentences, dict_data: card.dictData ? JSON.parse(card.dictData) : null });
    } else {
      fileStore.cards.push(card); saveFileStore();
    }
    return card;
  },
  async listCards() {
    if (usingSupabase) {
      const { data } = await supabase.from('cards').select('*').eq('user_id', currentUserId).order('created_at', { ascending: false });
      return (data || []).map((d:any) => ({ id: d.id, vocabularyId: d.vocabulary_id, documentId: d.document_id, sentenceId: d.sentence_id, frontText: d.front_text, reading: d.reading, meaning: d.meaning, partOfSpeech: d.part_of_speech, exampleSentences: d.example_sentences || [], dictData: d.dict_data ? JSON.stringify(d.dict_data) : null, status: d.status, createdAt: d.created_at, updatedAt: d.updated_at }));
    }
    return fileStore.cards;
  },
  async getCard(id: string) {
    if (usingSupabase) {
      const { data } = await supabase.from('cards').select('*').eq('id', id).single();
      if (!data) return undefined;
      return { id: data.id, vocabularyId: data.vocabulary_id, documentId: data.document_id, sentenceId: data.sentence_id, frontText: data.front_text, reading: data.reading, meaning: data.meaning, partOfSpeech: data.part_of_speech, exampleSentences: data.example_sentences || [], dictData: data.dict_data ? JSON.stringify(data.dict_data) : null, status: data.status, createdAt: data.created_at, updatedAt: data.updated_at };
    }
    return fileStore.cards.find((c:any) => c.id === id);
  },
  async updateCard(id: string, data: Partial<{ status: string }>) {
    if (usingSupabase) await supabase.from('cards').update(data.status ? { status: data.status } : {}).eq('id', id);
    else {
      const c = fileStore.cards.find((c:any) => c.id === id);
      if (c) { if (data.status) c.status = data.status; saveFileStore(); }
    }
  },
  async deleteCard(id: string) {
    if (usingSupabase) await supabase.from('cards').delete().eq('id', id);
    else { fileStore.cards = fileStore.cards.filter((c:any) => c.id !== id); saveFileStore(); }
  },

  async createReviewLog(cardId: string, result: string) {
    const r = { id: uuid(), cardId, result, reviewedAt: now() };
    if (usingSupabase) await supabase.from('review_logs').insert({ id: r.id, user_id: currentUserId, card_id: cardId, result });
    else { fileStore.reviewLogs.push(r); saveFileStore(); }
    return r;
  },
  async getTodayReviews() {
    const today = new Date().toISOString().slice(0, 10);
    if (usingSupabase) {
      const { data } = await supabase.from('review_logs').select('*').eq('user_id', currentUserId).gte('reviewed_at', today);
      return (data || []).map((d:any) => ({ id: d.id, cardId: d.card_id, result: d.result, reviewedAt: d.reviewed_at }));
    }
    return fileStore.reviewLogs.filter((r:any) => r.reviewedAt.startsWith(today));
  },
  async getAllReviewLogs() {
    if (usingSupabase) {
      const { data } = await supabase.from('review_logs').select('*').eq('user_id', currentUserId);
      return (data || []).map((d:any) => ({ id: d.id, cardId: d.card_id, result: d.result, reviewedAt: d.reviewed_at }));
    }
    return fileStore.reviewLogs;
  },

  async getReviewState(cardId: string) {
    if (usingSupabase) {
      const { data } = await supabase.from('review_states').select('*').eq('card_id', cardId).eq('user_id', currentUserId).single();
      return data ? { id: data.id, cardId: data.card_id, stage: data.stage, intervalDays: data.interval_days, dueAt: data.due_at } : undefined;
    }
    return fileStore.reviewStates.find((r:any) => r.cardId === cardId);
  },
  async upsertReviewState(cardId: string, result: string) {
    const intervals = [1, 2, 4, 7, 15, 30];
    if (usingSupabase) {
      const { data: e } = await supabase.from('review_states').select('*').eq('card_id', cardId).eq('user_id', currentUserId).single();
      const n = new Date();
      if (e) {
        const stage = result === 'again' ? 0 : Math.min((e.stage || 0) + 1, intervals.length - 1);
        const days = intervals[stage]; const due = new Date(n); due.setDate(due.getDate() + days);
        await supabase.from('review_states').update({ stage, interval_days: days, due_at: due.toISOString(), last_reviewed_at: n.toISOString() }).eq('id', e.id);
      } else {
        const days = result === 'again' ? 1 : intervals[0]; const due = new Date(n); due.setDate(due.getDate() + days);
        await supabase.from('review_states').insert({ id: uuid(), user_id: currentUserId, card_id: cardId, stage: result === 'again' ? 0 : 1, interval_days: days, due_at: due.toISOString(), last_reviewed_at: n.toISOString() });
      }
    } else {
      const e = fileStore.reviewStates.find((r:any) => r.cardId === cardId);
      const n = new Date();
      if (e) {
        const stage = result === 'again' ? 0 : Math.min((e.stage || 0) + 1, intervals.length - 1);
        const days = intervals[stage]; const due = new Date(n); due.setDate(due.getDate() + days);
        e.stage = stage; e.intervalDays = days; e.dueAt = due.toISOString(); e.lastReviewedAt = n.toISOString();
      } else {
        const days = result === 'again' ? 1 : intervals[0]; const due = new Date(n); due.setDate(due.getDate() + days);
        fileStore.reviewStates.push({ id: uuid(), cardId, stage: result === 'again' ? 0 : 1, intervalDays: days, dueAt: due.toISOString(), lastReviewedAt: n.toISOString() });
      }
      saveFileStore();
    }
  },
  async getDueCards() {
    const now2 = new Date().toISOString();
    if (usingSupabase) {
      const { data: dueStates } = await supabase.from('review_states').select('card_id').eq('user_id', currentUserId).lte('due_at', now2);
      const dueIds = (dueStates || []).map((d:any) => d.card_id);
      const { data: allIds } = await supabase.from('cards').select('id').eq('user_id', currentUserId);
      const { data: reviewedIds } = await supabase.from('review_states').select('card_id').eq('user_id', currentUserId);
      const reviewedSet = new Set((reviewedIds || []).map((d:any) => d.card_id));
      const newIds = (allIds || []).filter((c:any) => !reviewedSet.has(c.id)).map((c:any) => c.id);
      const allDue = [...new Set([...dueIds, ...newIds])];
      if (allDue.length === 0) return [];
      const { data: cards } = await supabase.from('cards').select('*').in('id', allDue);
      return (cards || []).map((d:any) => ({ id: d.id, vocabularyId: d.vocabulary_id, documentId: d.document_id, sentenceId: d.sentence_id, frontText: d.front_text, reading: d.reading, meaning: d.meaning, partOfSpeech: d.part_of_speech, exampleSentences: d.example_sentences || [], dictData: d.dict_data ? JSON.stringify(d.dict_data) : null, status: d.status, createdAt: d.created_at, updatedAt: d.updated_at }));
    }
    const dueIds = fileStore.reviewStates.filter((r:any) => r.dueAt && r.dueAt <= now2).map((r:any) => r.cardId);
    const reviewedIds = fileStore.reviewStates.map((r:any) => r.cardId);
    const newIds = fileStore.cards.filter((c:any) => !reviewedIds.includes(c.id)).map((c:any) => c.id);
    return fileStore.cards.filter((c:any) => dueIds.includes(c.id) || newIds.includes(c.id));
  },
  async getDueCount() { return (await this.getDueCards()).length; },
};
