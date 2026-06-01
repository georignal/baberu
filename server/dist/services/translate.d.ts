/**
 * Translate multiple English gloss strings to Chinese.
 * Batches requests with delay to avoid rate limiting.
 */
export declare function translateBatch(texts: string[]): Promise<Map<string, string>>;
/** Simple sync lookup for cached translations (no network). */
export declare function getCached(text: string): string | null;
//# sourceMappingURL=translate.d.ts.map