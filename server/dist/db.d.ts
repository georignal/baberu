export declare function setCurrentUser(id: string): void;
export declare function uuid(): `${string}-${string}-${string}-${string}-${string}`;
export declare const db: {
    upsertUser(username: string): Promise<any>;
    createDocument(data: {
        title: string;
        fileType?: string;
        text: string;
    }): Promise<any>;
    listDocuments(): Promise<any>;
    getDocument(id: string): Promise<any>;
    deleteDocument(id: string): Promise<void>;
    createSegments(docId: string, items: {
        paragraphIndex: number;
        text: string;
        startOffset: number;
        endOffset: number;
    }[]): Promise<{
        id: `${string}-${string}-${string}-${string}-${string}`;
        document_id: string;
        paragraph_index: number;
        text: string;
        start_offset: number;
        end_offset: number;
    }[]>;
    getSegments(docId: string): Promise<any>;
    createSentences(docId: string, items: {
        segmentId: string;
        sentenceIndex: number;
        text: string;
        startOffset: number;
        endOffset: number;
    }[]): Promise<{
        id: `${string}-${string}-${string}-${string}-${string}`;
        document_id: string;
        segment_id: string;
        sentence_index: number;
        text: string;
        start_offset: number;
        end_offset: number;
    }[]>;
    getSentences(docId: string): Promise<any>;
    createVocabulary(data: {
        surface: string;
        lemma: string;
        reading: string;
        partOfSpeech: string;
        meaning?: string;
    }): Promise<any>;
    createOccurrence(data: {
        vocabularyId: string;
        documentId: string;
        segmentId: string;
        sentenceId: string;
        surfaceText: string;
        startOffset: number;
        endOffset: number;
    }): Promise<{
        vocabularyId: string;
        documentId: string;
        segmentId: string;
        sentenceId: string;
        surfaceText: string;
        startOffset: number;
        endOffset: number;
        id: `${string}-${string}-${string}-${string}-${string}`;
    }>;
    getOccurrences(docId: string): Promise<any>;
    createCard(data: {
        vocabularyId: string;
        documentId: string;
        sentenceId: string;
        frontText: string;
        reading: string;
        meaning: string;
        partOfSpeech: string;
        exampleSentences: string[];
        dictData?: string | null;
    }): Promise<any>;
    listCards(): Promise<any>;
    getCard(id: string): Promise<any>;
    updateCard(id: string, data: Partial<{
        status: string;
    }>): Promise<void>;
    deleteCard(id: string): Promise<void>;
    createReviewLog(cardId: string, result: string): Promise<{
        id: `${string}-${string}-${string}-${string}-${string}`;
        cardId: string;
        result: string;
        reviewedAt: string;
    }>;
    getTodayReviews(): Promise<any>;
    getAllReviewLogs(): Promise<any>;
    getReviewState(cardId: string): Promise<any>;
    upsertReviewState(cardId: string, result: string): Promise<void>;
    getDueCards(): Promise<any>;
    getDueCount(): Promise<any>;
};
//# sourceMappingURL=db.d.ts.map