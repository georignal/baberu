/**
 * Supabase-based database layer.
 * Replaces file-based storage with PostgreSQL via Supabase.
 */
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
if (!supabaseUrl || !supabaseKey) {
    console.warn('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set. Using fallback file storage.');
}
const supabase = createClient(supabaseUrl, supabaseKey);
let currentUserId = '00000000-0000-0000-0000-000000000000';
export function setCurrentUser(id) { currentUserId = id; }
export function uuid() {
    return crypto.randomUUID();
}
function now() { return new Date().toISOString(); }
export const db = {
    // Users
    async upsertUser(username) {
        const { data: existing } = await supabase.from('users').select('id,username').eq('username', username).single();
        if (existing)
            return existing;
        const id = uuid();
        await supabase.from('users').insert({ id, username });
        return { id, username };
    },
    // Documents
    async createDocument(data) {
        const id = uuid();
        const doc = {
            id,
            user_id: currentUserId,
            title: data.title,
            file_type: data.fileType || 'text',
            text: data.text,
        };
        await supabase.from('documents').insert(doc);
        return { ...doc, createdAt: now(), updatedAt: now() };
    },
    async listDocuments() {
        const { data } = await supabase.from('documents')
            .select('*, text_segments(count), text_sentences(count)')
            .eq('user_id', currentUserId)
            .order('created_at', { ascending: false });
        return (data || []).map((d) => ({
            id: d.id,
            userId: d.user_id,
            title: d.title,
            fileType: d.file_type,
            text: d.text,
            segmentCount: d.text_segments?.[0]?.count || 0,
            sentenceCount: d.text_sentences?.[0]?.count || 0,
            candidateCount: 0,
            cardCount: 0,
            createdAt: d.created_at,
            updatedAt: d.updated_at,
        }));
    },
    async getDocument(id) {
        const { data } = await supabase.from('documents').select('*').eq('id', id).eq('user_id', currentUserId).single();
        if (!data)
            return undefined;
        return {
            id: data.id, userId: data.user_id, title: data.title,
            fileType: data.file_type, text: data.text,
            createdAt: data.created_at, updatedAt: data.updated_at,
        };
    },
    async deleteDocument(id) {
        await supabase.from('documents').delete().eq('id', id).eq('user_id', currentUserId);
    },
    // Segments
    async createSegments(docId, items) {
        const rows = items.map((item, i) => ({
            id: uuid(), document_id: docId, paragraph_index: item.paragraphIndex,
            text: item.text, start_offset: item.startOffset, end_offset: item.endOffset,
        }));
        await supabase.from('text_segments').insert(rows);
        return rows;
    },
    async getSegments(docId) {
        const { data } = await supabase.from('text_segments').select('*').eq('document_id', docId).order('paragraph_index');
        return (data || []).map((d) => ({
            id: d.id, documentId: d.document_id, paragraphIndex: d.paragraph_index,
            text: d.text, startOffset: d.start_offset, endOffset: d.end_offset,
        }));
    },
    // Sentences
    async createSentences(docId, items) {
        const rows = items.map(item => ({
            id: uuid(), document_id: docId, segment_id: item.segmentId,
            sentence_index: item.sentenceIndex, text: item.text,
            start_offset: item.startOffset, end_offset: item.endOffset,
        }));
        await supabase.from('text_sentences').insert(rows);
        return rows;
    },
    async getSentences(docId) {
        const { data } = await supabase.from('text_sentences').select('*').eq('document_id', docId).order('sentence_index');
        return (data || []).map((d) => ({
            id: d.id, documentId: d.document_id, segmentId: d.segment_id,
            sentenceIndex: d.sentence_index, text: d.text,
            startOffset: d.start_offset, endOffset: d.end_offset,
        }));
    },
    async getSentence(id) {
        const { data } = await supabase.from('text_sentences').select('*').eq('id', id).single();
        if (!data)
            return undefined;
        return { id: data.id, documentId: data.document_id, segmentId: data.segment_id,
            sentenceIndex: data.sentence_index, text: data.text,
            startOffset: data.start_offset, endOffset: data.end_offset };
    },
    // Vocabulary
    async createVocabulary(data) {
        const { data: existing } = await supabase.from('vocabulary_items')
            .select('id').eq('surface', data.surface).eq('lemma', data.lemma).eq('user_id', currentUserId).single();
        if (existing)
            return { id: existing.id, ...data };
        const id = uuid();
        await supabase.from('vocabulary_items').insert({ id, user_id: currentUserId, surface: data.surface, lemma: data.lemma, reading: data.reading, part_of_speech: data.partOfSpeech, meaning: data.meaning || null });
        return { id, ...data };
    },
    async createOccurrence(data) {
        const id = uuid();
        await supabase.from('vocabulary_occurrences').insert({
            id, vocabulary_id: data.vocabularyId, document_id: data.documentId,
            segment_id: data.segmentId, sentence_id: data.sentenceId,
            surface_text: data.surfaceText, start_offset: data.startOffset, end_offset: data.endOffset,
        });
        return { id, ...data };
    },
    async getOccurrences(docId) {
        const { data } = await supabase.from('vocabulary_occurrences').select('*').eq('document_id', docId);
        return (data || []).map((d) => ({
            id: d.id, vocabularyId: d.vocabulary_id, documentId: d.document_id,
            segmentId: d.segment_id, sentenceId: d.sentence_id,
            surfaceText: d.surface_text, startOffset: d.start_offset, endOffset: d.end_offset,
        }));
    },
    // Cards
    async createCard(data) {
        const id = uuid();
        const card = {
            id, user_id: currentUserId, document_id: data.documentId,
            vocabulary_id: data.vocabularyId, sentence_id: data.sentenceId,
            front_text: data.frontText, reading: data.reading, meaning: data.meaning,
            part_of_speech: data.partOfSpeech, example_sentences: data.exampleSentences,
            dict_data: data.dictData ? JSON.parse(data.dictData) : null,
        };
        await supabase.from('cards').insert(card);
        return {
            id, vocabularyId: data.vocabularyId, documentId: data.documentId,
            sentenceId: data.sentenceId, frontText: data.frontText, reading: data.reading,
            meaning: data.meaning, partOfSpeech: data.partOfSpeech,
            exampleSentences: data.exampleSentences, dictData: data.dictData,
            status: 'new', createdAt: now(), updatedAt: now(),
        };
    },
    async listCards() {
        const { data } = await supabase.from('cards').select('*').eq('user_id', currentUserId).order('created_at', { ascending: false });
        return (data || []).map((d) => ({
            id: d.id, vocabularyId: d.vocabulary_id, documentId: d.document_id,
            sentenceId: d.sentence_id, frontText: d.front_text, reading: d.reading,
            meaning: d.meaning, partOfSpeech: d.part_of_speech,
            exampleSentences: d.example_sentences || [], dictData: d.dict_data ? JSON.stringify(d.dict_data) : null,
            status: d.status, createdAt: d.created_at, updatedAt: d.updated_at,
        }));
    },
    async getCard(id) {
        const { data } = await supabase.from('cards').select('*').eq('id', id).single();
        if (!data)
            return undefined;
        return {
            id: data.id, vocabularyId: data.vocabulary_id, documentId: data.document_id,
            sentenceId: data.sentence_id, frontText: data.front_text, reading: data.reading,
            meaning: data.meaning, partOfSpeech: data.part_of_speech,
            exampleSentences: data.example_sentences || [], dictData: data.dict_data ? JSON.stringify(data.dict_data) : null,
            status: data.status, createdAt: data.created_at, updatedAt: data.updated_at,
        };
    },
    async updateCard(id, data) {
        const update = {};
        if (data.status)
            update.status = data.status;
        await supabase.from('cards').update(update).eq('id', id);
    },
    async deleteCard(id) {
        await supabase.from('cards').delete().eq('id', id);
    },
    // Reviews
    async createReviewLog(cardId, result) {
        const id = uuid();
        await supabase.from('review_logs').insert({ id, user_id: currentUserId, card_id: cardId, result });
        return { id, cardId, result, reviewedAt: now() };
    },
    async getTodayReviews() {
        const today = new Date().toISOString().slice(0, 10);
        const { data } = await supabase.from('review_logs').select('*').eq('user_id', currentUserId).gte('reviewed_at', today);
        return (data || []).map((d) => ({ id: d.id, cardId: d.card_id, result: d.result, reviewedAt: d.reviewed_at }));
    },
    async getAllReviewLogs() {
        const { data } = await supabase.from('review_logs').select('*').eq('user_id', currentUserId);
        return (data || []).map((d) => ({ id: d.id, cardId: d.card_id, result: d.result, reviewedAt: d.reviewed_at }));
    },
    // SRS
    async getReviewState(cardId) {
        const { data } = await supabase.from('review_states').select('*').eq('card_id', cardId).eq('user_id', currentUserId).single();
        return data ? { id: data.id, cardId: data.card_id, stage: data.stage, intervalDays: data.interval_days, dueAt: data.due_at } : undefined;
    },
    async upsertReviewState(cardId, result) {
        const intervals = [1, 2, 4, 7, 15, 30];
        const { data: existing } = await supabase.from('review_states').select('*').eq('card_id', cardId).eq('user_id', currentUserId).single();
        const n = new Date();
        if (existing) {
            const stage = result === 'again' ? 0 : Math.min((existing.stage || 0) + 1, intervals.length - 1);
            const days = intervals[stage];
            const due = new Date(n);
            due.setDate(due.getDate() + days);
            await supabase.from('review_states').update({ stage, interval_days: days, due_at: due.toISOString(), last_reviewed_at: n.toISOString() }).eq('id', existing.id);
        }
        else {
            const days = result === 'again' ? 1 : intervals[0];
            const due = new Date(n);
            due.setDate(due.getDate() + days);
            await supabase.from('review_states').insert({ id: uuid(), user_id: currentUserId, card_id: cardId, stage: result === 'again' ? 0 : 1, interval_days: days, due_at: due.toISOString(), last_reviewed_at: n.toISOString() });
        }
    },
    async getDueCards() {
        const now2 = new Date().toISOString();
        // Get due review states
        const { data: dueStates } = await supabase.from('review_states').select('card_id').eq('user_id', currentUserId).lte('due_at', now2);
        const dueIds = (dueStates || []).map(d => d.card_id);
        // Get new cards (never reviewed)
        const { data: allCardIds } = await supabase.from('cards').select('id').eq('user_id', currentUserId);
        const { data: reviewedCardIds } = await supabase.from('review_states').select('card_id').eq('user_id', currentUserId);
        const reviewedSet = new Set((reviewedCardIds || []).map(d => d.card_id));
        const newIds = (allCardIds || []).filter(c => !reviewedSet.has(c.id)).map(c => c.id);
        const allDue = [...new Set([...dueIds, ...newIds])];
        if (allDue.length === 0)
            return [];
        const { data: cards } = await supabase.from('cards').select('*').in('id', allDue);
        return (cards || []).map((d) => ({
            id: d.id, vocabularyId: d.vocabulary_id, documentId: d.document_id,
            sentenceId: d.sentence_id, frontText: d.front_text, reading: d.reading,
            meaning: d.meaning, partOfSpeech: d.part_of_speech,
            exampleSentences: d.example_sentences || [], dictData: d.dict_data ? JSON.stringify(d.dict_data) : null,
            status: d.status, createdAt: d.created_at, updatedAt: d.updated_at,
        }));
    },
    async getDueCount() {
        const cards = await this.getDueCards();
        return cards.length;
    },
};
//# sourceMappingURL=db.js.map