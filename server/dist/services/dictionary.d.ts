export interface LookupResult {
    kanji: string[];
    kana: string[];
    senses: {
        glosses: string[];
        pos: string[];
        examples?: {
            jp: string;
            en: string;
        }[];
    }[];
}
export declare function lookup(word: string): LookupResult | null;
/** Ensure dictionary is initialized before use. Call once at startup. */
export declare function initDictionary(): Promise<void>;
//# sourceMappingURL=dictionary.d.ts.map