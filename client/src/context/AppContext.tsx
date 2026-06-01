import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { api } from '@/shared/api/client';
import type { Document, Candidate, Card, SourceContext, ReviewStats } from '@/shared/api/types';

interface AppContextValue {
  documents: Document[];
  candidates: Candidate[];
  cards: Card[];
  loading: boolean;
  error: string | null;

  fetchDocuments: () => Promise<void>;
  createDocument: (title: string, text: string) => Promise<Document>;
  deleteDocument: (id: string) => Promise<void>;
  parseDocument: (id: string) => Promise<void>;

  fetchCandidates: (documentId: string) => Promise<void>;
  extractVocabulary: (documentId: string) => Promise<void>;

  fetchCards: () => Promise<void>;
  createCard: (candidate: Candidate) => Promise<void>;
  updateCard: (id: string, data: Partial<Card>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;

  getCardSource: (cardId: string) => Promise<SourceContext>;
  logReview: (cardId: string, result: string) => Promise<void>;
  getReviewStats: () => Promise<ReviewStats>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wrap = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    setLoading(true);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDocuments = useCallback(async () => {
    await wrap(async () => {
      const docs = await api.listDocuments();
      setDocuments(docs);
    });
  }, [wrap]);

  const createDocument = useCallback(async (title: string, text: string) => {
    return wrap(async () => {
      const doc = await api.createDocument({ title, text });
      setDocuments((prev) => [doc, ...prev]);
      return doc;
    });
  }, [wrap]);

  const deleteDocument = useCallback(async (id: string) => {
    await wrap(async () => {
      await api.deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    });
  }, [wrap]);

  const parseDocumentFn = useCallback(async (id: string) => {
    await wrap(async () => {
      await api.parseDocument(id);
      await fetchDocuments();
    });
  }, [wrap, fetchDocuments]);

  const fetchCandidates = useCallback(async (documentId: string) => {
    await wrap(async () => {
      const result = await api.getCandidates(documentId);
      setCandidates(result);
    });
  }, [wrap]);

  const extractVocabulary = useCallback(async (documentId: string) => {
    await wrap(async () => {
      const result = await api.extractVocabulary(documentId);
      setCandidates(result.candidates);
      await fetchDocuments();
    });
  }, [wrap, fetchDocuments]);

  const fetchCards = useCallback(async () => {
    await wrap(async () => {
      const result = await api.listCards();
      setCards(result);
    });
  }, [wrap]);

  const createCardFn = useCallback(async (candidate: Candidate) => {
    await wrap(async () => {
      await api.createCard({
        frontText: candidate.word,
        reading: candidate.reading,
        meaning: candidate.meaning,
        partOfSpeech: candidate.partOfSpeech,
        exampleSentences: candidate.exampleSentences || (candidate.sentenceText ? [candidate.sentenceText] : []),
        documentId: candidate.documentId || '',
        segmentId: candidate.segmentId || '',
        sentenceId: candidate.sentenceId,
        occurrenceId: candidate.id,
        vocabularyId: candidate.id,
      });
      await fetchCards();
      setCandidates((prev) => prev.filter((c) => c.id !== candidate.id));
    });
  }, [wrap, fetchCards]);

  const updateCardFn = useCallback(async (id: string, data: Partial<Card>) => {
    await wrap(async () => {
      const updated = await api.updateCard(id, data as Record<string, unknown>);
      setCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...updated } : c)));
    });
  }, [wrap]);

  const deleteCardFn = useCallback(async (id: string) => {
    await wrap(async () => {
      await api.deleteCard(id);
      setCards((prev) => prev.filter((c) => c.id !== id));
    });
  }, [wrap]);

  const getCardSourceFn = useCallback(async (cardId: string) => {
    return wrap(async () => await api.getCardSource(cardId));
  }, [wrap]);

  const logReviewFn = useCallback(async (cardId: string, result: string) => {
    await wrap(async () => {
      await api.logReview(cardId, result);
    });
  }, [wrap]);

  const getReviewStatsFn = useCallback(async () => {
    return wrap(async () => await api.getReviewStats());
  }, [wrap]);

  return (
    <AppContext.Provider
      value={{
        documents,
        candidates,
        cards,
        loading,
        error,
        fetchDocuments,
        createDocument,
        deleteDocument,
        parseDocument: parseDocumentFn,
        fetchCandidates,
        extractVocabulary,
        fetchCards,
        createCard: createCardFn,
        updateCard: updateCardFn,
        deleteCard: deleteCardFn,
        getCardSource: getCardSourceFn,
        logReview: logReviewFn,
        getReviewStats: getReviewStatsFn,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
