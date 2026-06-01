import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lookup } from './dictionary.js';
import { BUILTIN_DICT } from './builtin-dict.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const kuromoji = require('kuromoji');
const DIC_PATH = path.resolve(__dirname, '../../node_modules/kuromoji/dict');
// Pre-load built-in dictionary into a fast lookup map
const BUILTIN_MAP = new Map();
for (const [kanji, kana, meaning] of BUILTIN_DICT) {
    if (!BUILTIN_MAP.has(kanji))
        BUILTIN_MAP.set(kanji, meaning);
    if (!BUILTIN_MAP.has(kana))
        BUILTIN_MAP.set(kana, meaning);
}
let tokenizer = null;
let ready = false;
let initPromise = null;
function init() {
    if (ready)
        return Promise.resolve();
    if (initPromise)
        return initPromise;
    initPromise = new Promise((resolve, reject) => {
        kuromoji.builder({ dicPath: DIC_PATH }).build((err, tok) => {
            if (err) {
                initPromise = null;
                reject(err);
                return;
            }
            tokenizer = tok;
            ready = true;
            resolve();
        });
    });
    return initPromise;
}
const PRIORITY = {
    '名詞': 10,
    '動詞': 8,
    '形容詞': 7,
    '副詞': 5,
    '連体詞': 4,
    '接続詞': 4,
    '感動詞': 3,
    '接頭詞': 6,
    '助詞': 1,
    '助動詞': 1,
    'フィラー': 0,
    '記号': 0,
};
/** Look up a word: prefer built-in Chinese, then JMdict English. */
function getMeaning(lemma, surface) {
    // 1. Built-in Chinese dictionary (highest priority)
    const builtin = BUILTIN_MAP.get(lemma) || BUILTIN_MAP.get(surface);
    if (builtin)
        return builtin;
    // 2. JMdict English
    const result = lookup(lemma) || lookup(surface);
    if (!result)
        return '';
    return result.senses.flatMap((s) => s.glosses).slice(0, 3).join('; ');
}
/** Get full JMdict entry for a word, with Chinese translations if cached. */
export function getDictEntry(word) {
    return lookup(word);
}
export async function tokenize(text) {
    await init();
    if (!tokenizer)
        throw new Error('Tokenizer not initialized');
    const raw = tokenizer.tokenize(text);
    const tokens = [];
    for (const t of raw) {
        const surface = t.surface_form;
        // Skip only whitespace-only tokens
        if (/^\s+$/.test(surface))
            continue;
        const basic = t.basic_form;
        const lemma = basic !== '*' ? basic : surface;
        const reading = t.reading || surface;
        const meaning = getMeaning(lemma, surface);
        tokens.push({
            surface,
            lemma,
            reading,
            partOfSpeech: t.pos,
            meaning,
            priority: PRIORITY[t.pos] ?? 1,
            startOffset: t.word_position - 1,
            endOffset: t.word_position - 1 + surface.length,
        });
    }
    return tokens;
}
/**
 * Merge consecutive content words + verb/aux chains into phrases.
 * 形成 + さ + れ + た → 形成された
 * 想像 + できる → 想像できる
 * 歩い + て + いる → 歩いている
 */
export function mergePhrases(tokens) {
    const CONTENT = new Set(['名詞', '動詞', '形容詞']);
    const ATTACHABLE = new Set(['動詞', '助動詞']);
    const TE_CONTINUATION = new Set(['いる', 'みる', 'ある', 'いく', 'くる', 'おく', 'しまう', 'もらう', 'くれる', 'あげる', 'やる']);
    const merged = [];
    let i = 0;
    while (i < tokens.length) {
        const t = tokens[i];
        if (CONTENT.has(t.partOfSpeech) && i + 1 < tokens.length) {
            let j = i + 1;
            // Merge consecutive 動詞/助動詞
            while (j < tokens.length && ATTACHABLE.has(tokens[j].partOfSpeech))
                j++;
            // Handle て/で + continuation verb
            if (j < tokens.length - 1 && (tokens[j].surface === 'て' || tokens[j].surface === 'で')) {
                if (ATTACHABLE.has(tokens[j + 1]?.partOfSpeech) && TE_CONTINUATION.has(tokens[j + 1]?.lemma)) {
                    j += 2;
                    while (j < tokens.length && ATTACHABLE.has(tokens[j].partOfSpeech))
                        j++;
                }
            }
            if (j > i + 1) {
                const surface = tokens.slice(i, j).map((x) => x.surface).join('');
                const reading = tokens.slice(i, j).map((x) => x.reading).join('');
                merged.push({ ...t, surface, reading, endOffset: tokens[j - 1].endOffset });
                i = j;
                continue;
            }
        }
        merged.push(t);
        i++;
    }
    return merged;
}
/**
 * Deduplicate tokens by lemma, counting frequency.
 * Sorts by: priority desc > frequency desc.
 */
export function deduplicateTokens(tokens) {
    const map = new Map();
    for (const t of tokens) {
        const key = t.lemma;
        const existing = map.get(key);
        if (existing) {
            existing.count++;
            // Keep the one with higher priority
            if (t.priority > existing.token.priority) {
                existing.token = t;
            }
        }
        else {
            map.set(key, { token: t, count: 1 });
        }
    }
    return Array.from(map.values())
        .map(({ token, count }) => ({ ...token, frequency: count }))
        .sort((a, b) => b.priority - a.priority || b.frequency - b.frequency);
}
//# sourceMappingURL=tokenizer.js.map