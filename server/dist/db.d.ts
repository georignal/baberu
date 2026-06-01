export declare function setCurrentUser(id: string): void;
export declare function uuid(): `${string}-${string}-${string}-${string}-${string}`;
export declare const db: {
    upsertUser(username: string): Promise<{
        id: string;
        username: string;
    }>;
    createDocument(data: {
        title: string;
        fileType?: string;
        text: string;
    }): Promise<{
        createdAt: string;
        updatedAt: string;
        id: `${string}-${string}-${string}-${string}-${string}`;
        user_id: string;
        title: string;
        file_type: string;
        text: string;
    }>;
    listDocuments(): Promise<{
        id: any;
        userId: any;
        title: any;
        fileType: any;
        text: any;
        segmentCount: any;
        sentenceCount: any;
        candidateCount: number;
        cardCount: number;
        createdAt: any;
        updatedAt: any;
    }[]>;
    getDocument(id: string): Promise<{
        id: any;
        userId: any;
        title: any;
        fileType: any;
        text: any;
        createdAt: any;
        updatedAt: any;
    } | undefined>;
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
    getSegments(docId: string): Promise<{
        id: any;
        documentId: any;
        paragraphIndex: any;
        text: any;
        startOffset: any;
        endOffset: any;
    }[]>;
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
    getSentences(docId: string): Promise<{
        id: any;
        documentId: any;
        segmentId: any;
        sentenceIndex: any;
        text: any;
        startOffset: any;
        endOffset: any;
    }[]>;
    getSentence(id: string): Promise<{
        id: any;
        documentId: any;
        segmentId: any;
        sentenceIndex: any;
        text: any;
        startOffset: any;
        endOffset: any;
    } | undefined>;
    createVocabulary(data: {
        surface: string;
        lemma: string;
        reading: string;
        partOfSpeech: string;
        meaning?: string;
    }): Promise<{
        surface: string;
        lemma: string;
        reading: string;
        partOfSpeech: string;
        meaning?: string;
        id: any;
    }>;
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
    getOccurrences(docId: string): Promise<{
        id: any;
        vocabularyId: any;
        documentId: any;
        segmentId: any;
        sentenceId: any;
        surfaceText: any;
        startOffset: any;
        endOffset: any;
    }[]>;
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
    }): Promise<{
        id: `${string}-${string}-${string}-${string}-${string}`;
        vocabularyId: string;
        documentId: string;
        sentenceId: string;
        frontText: string;
        reading: string;
        meaning: string;
        partOfSpeech: string;
        exampleSentences: string[];
        dictData: string | null | undefined;
        status: string;
        createdAt: string;
        updatedAt: string;
    }>;
    listCards(): Promise<{
        id: any;
        vocabularyId: any;
        documentId: any;
        sentenceId: any;
        frontText: any;
        reading: any;
        meaning: any;
        partOfSpeech: any;
        exampleSentences: any;
        dictData: string | null;
        status: any;
        createdAt: any;
        updatedAt: any;
    }[]>;
    getCard(id: string): Promise<{
        id: any;
        vocabularyId: any;
        documentId: any;
        sentenceId: any;
        frontText: any;
        reading: any;
        meaning: any;
        partOfSpeech: any;
        exampleSentences: any;
        dictData: string | null;
        status: any;
        createdAt: any;
        updatedAt: any;
    } | undefined>;
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
    getTodayReviews(): Promise<{
        id: any;
        cardId: any;
        result: any;
        reviewedAt: any;
    }[]>;
    getAllReviewLogs(): Promise<{
        id: any;
        cardId: any;
        result: any;
        reviewedAt: any;
    }[]>;
    getReviewState(cardId: string): Promise<{
        id: any;
        cardId: any;
        stage: any;
        intervalDays: any;
        dueAt: any;
    } | undefined>;
    upsertReviewState(cardId: string, result: string): Promise<void>;
    getDueCards(): Promise<{
        id: any;
        vocabularyId: any;
        documentId: any;
        sentenceId: any;
        frontText: any;
        reading: any;
        meaning: any;
        partOfSpeech: any;
        exampleSentences: any;
        dictData: string | null;
        status: any;
        createdAt: any;
        updatedAt: any;
    }[]>;
    getDueCount(): Promise<number>;
};
//# sourceMappingURL=db.d.ts.map