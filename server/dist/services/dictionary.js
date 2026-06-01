/**
 * JMdict dictionary lookup service.
 * Loads pre-built index and provides fast word lookups.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { BUILTIN_DICT } from './builtin-dict.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
let index = null;
let loaded = false;
async function load() {
    if (loaded)
        return;
    const indexFile = path.resolve(__dirname, '../../dict/jmdict-index.json.gz');
    const jsonFile = path.resolve(__dirname, '../../dict/jmdict-index.json');
    // Try loading JMdict index first
    try {
        let raw;
        if (fs.existsSync(indexFile)) {
            raw = zlib.gunzipSync(fs.readFileSync(indexFile)).toString('utf-8');
        }
        else if (fs.existsSync(jsonFile)) {
            raw = fs.readFileSync(jsonFile, 'utf-8');
        }
        else {
            throw new Error('No JMdict index found, using built-in dictionary');
        }
        const entries = JSON.parse(raw);
        index = new Map(entries);
        console.log(`JMdict loaded: ${index.size} entries`);
    }
    catch (err) {
        // Fall back to built-in dictionary
        console.log('Using built-in dictionary (run "npm run setup-dict" for full JMdict)');
        index = new Map();
        for (const [kanji, kana, meaning, pos] of BUILTIN_DICT) {
            const entry = {
                k: [kanji],
                r: [kana],
                s: [{ g: meaning.split('; '), p: [pos] }],
            };
            // Index by both kanji and kana
            if (!index.has(kanji))
                index.set(kanji, entry);
            if (!index.has(kana))
                index.set(kana, entry);
        }
        console.log(`Built-in dictionary: ${index.size} entries`);
    }
    loaded = true;
}
export function lookup(word) {
    if (!index)
        return null;
    const entry = index.get(word);
    if (!entry)
        return null;
    return {
        kanji: entry.k,
        kana: entry.r,
        senses: entry.s.map((s) => ({
            glosses: s.g,
            pos: s.p,
            examples: s.x,
        })),
    };
}
/** Ensure dictionary is initialized before use. Call once at startup. */
export async function initDictionary() {
    await load();
}
//# sourceMappingURL=dictionary.js.map