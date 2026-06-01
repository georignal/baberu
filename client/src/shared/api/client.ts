const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Documents
  listDocuments: () => request<import('./types').Document[]>('/documents'),
  createDocument: (data: { title: string; text: string; fileType?: string }) =>
    request<import('./types').Document>('/documents', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getDocument: (id: string) => request<import('./types').Document>(`/documents/${id}`),
  deleteDocument: (id: string) =>
    request<{ message: string }>(`/documents/${id}`, { method: 'DELETE' }),

  // Parsing
  parseDocument: (id: string) =>
    request<{ segments: number; sentences: number }>(`/documents/${id}/parse`, {
      method: 'POST',
    }),
  getSegments: (id: string) =>
    request<import('./types').Segment[]>(`/documents/${id}/segments`),
  getSentences: (id: string) =>
    request<import('./types').Sentence[]>(`/documents/${id}/sentences`),

  // Vocabulary extraction
  extractVocabulary: (id: string) =>
    request<import('./types').ExtractResult>(`/documents/${id}/extract-vocabulary`, {
      method: 'POST',
    }),
  getCandidates: (id: string) =>
    request<import('./types').Candidate[]>(`/documents/${id}/vocabulary-candidates`),

  // Cards
  listCards: () => request<import('./types').Card[]>('/cards'),
  createCard: (data: {
    occurrenceId?: string;
    vocabularyId?: string;
    frontText: string;
    reading: string;
    meaning: string;
    partOfSpeech: string;
    exampleSentences: string[];
    documentId: string;
    segmentId: string;
    sentenceId: string;
  }) =>
    request<import('./types').Card>('/cards', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getCard: (id: string) => request<import('./types').Card>(`/cards/${id}`),
  updateCard: (id: string, data: Partial<import('./types').Card>) =>
    request<import('./types').Card>(`/cards/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteCard: (id: string) =>
    request<{ message: string }>(`/cards/${id}`, { method: 'DELETE' }),
  getCardSource: (id: string) =>
    request<import('./types').SourceContext>(`/cards/${id}/source`),

  // Review
  getTodayReview: () =>
    request<{ cards: import('./types').Card[]; totalToday: number; reviewedToday: number }>(
      '/review/today',
    ),
  logReview: (cardId: string, result: string) =>
    request<{ id: string }>(`/review/${cardId}`, {
      method: 'POST',
      body: JSON.stringify({ result }),
    }),
  getReviewStats: () => request<import('./types').ReviewStats>('/review/stats'),
  getDailyStats: () => request<{ year: number; month: number; created: Record<string,number>; reviewed: Record<string,number> }>('/review/daily'),
};
