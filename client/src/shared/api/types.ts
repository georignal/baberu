export interface Document {
  id: string;
  title: string;
  fileType: string;
  text: string;
  segmentCount?: number;
  sentenceCount?: number;
  candidateCount?: number;
  cardCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Segment {
  id: string;
  documentId: string;
  paragraphIndex: number;
  text: string;
  startOffset: number;
  endOffset: number;
  createdAt: string;
}

export interface Sentence {
  id: string;
  documentId: string;
  segmentId: string;
  sentenceIndex: number;
  text: string;
  startOffset: number;
  endOffset: number;
  createdAt: string;
}

export interface Candidate {
  id: string;
  word: string;
  lemma: string;
  reading: string;
  partOfSpeech: string;
  meaning: string;
  frequency: number;
  sentenceId: string;
  sentenceText: string;
  exampleSentences?: string[];
  documentId?: string;
  segmentId?: string;
  startOffset?: number;
  endOffset?: number;
}

export interface Card {
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
  dictData?: string | null;
  status: 'new' | 'learning' | 'known' | 'mastered' | 'ignored';
  documentTitle?: string;
  sourceSentence?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SourceContext {
  documentTitle: string;
  documentId: string;
  sentence: string;
  previousSentence: string | null;
  nextSentence: string | null;
  highlight: {
    word: string;
    startOffset: number;
    endOffset: number;
  };
}

export interface ReviewStats {
  totalCards: number;
  reviewedToday: number;
  byStatus: Record<string, number>;
}

export interface ExtractResult {
  rawTokens: WordToken[];
  candidates: Candidate[];
  totalSentences: number;
}

export interface WordToken {
  lemma: string;
  surface: string;
  reading: string;
  partOfSpeech: string;
  meaning: string;
  frequency: number;
  startOffset: number;
  endOffset: number;
}
