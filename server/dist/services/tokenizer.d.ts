export interface Token {
    endOffset: number;
    surface: string;
    lemma: string;
    reading: string;
    partOfSpeech: string;
    meaning: string;
    priority: number;
    startOffset: number;
}
/** Get full JMdict entry for a word, with Chinese translations if cached. */
export declare function getDictEntry(word: string): import('./dictionary.js').LookupResult | null;
export declare function tokenize(text: string): Promise<Token[]>;
/**
 * Merge consecutive content words + verb/aux chains into phrases.
 * 形成 + さ + れ + た → 形成された
 * 想像 + できる → 想像できる
 * 歩い + て + いる → 歩いている
 */
export declare function mergePhrases(tokens: Token[]): Token[];
/**
 * Deduplicate tokens by lemma, counting frequency.
 * Sorts by: priority desc > frequency desc.
 */
export declare function deduplicateTokens(tokens: Token[]): Array<Token & {
    frequency: number;
}>;
//# sourceMappingURL=tokenizer.d.ts.map