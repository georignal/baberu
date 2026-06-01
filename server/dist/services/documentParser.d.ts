/**
 * Document parser: splits raw text into segments (paragraphs) and sentences.
 */
export interface ParsedDocument {
    segments: ParsedSegment[];
}
export interface ParsedSegment {
    paragraphIndex: number;
    text: string;
    startOffset: number;
    endOffset: number;
    sentences: ParsedSentence[];
}
export interface ParsedSentence {
    sentenceIndex: number;
    text: string;
    startOffset: number;
    endOffset: number;
}
export declare function parseDocument(rawText: string): ParsedDocument;
//# sourceMappingURL=documentParser.d.ts.map