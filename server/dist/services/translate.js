/**
 * Translation cache for converting English JMdict glosses to Chinese.
 * Uses Google Translate (free tier) with persistent cache.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_FILE = path.resolve(__dirname, '../../dict/zh-cache.json');
let cache = {};
// Load existing cache
try {
    if (fs.existsSync(CACHE_FILE)) {
        cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    }
}
catch { }
function saveCache() {
    try {
        fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
    }
    catch { }
}
const DELAY_MS = 800; // rate limiting
async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
async function translateOne(text, retries = 2) {
    // Already cached?
    if (cache[text])
        return cache[text];
    try {
        const mod = await import('@vitalets/google-translate-api');
        const { translate } = mod;
        const result = await translate(text, { from: 'en', to: 'zh-CN' });
        const zh = result.text;
        if (zh && zh !== text) {
            cache[text] = zh;
            saveCache();
            return zh;
        }
    }
    catch (e) {
        if (retries > 0) {
            await sleep(DELAY_MS * 2);
            return translateOne(text, retries - 1);
        }
    }
    return text; // fallback to original English
}
/**
 * Translate multiple English gloss strings to Chinese.
 * Batches requests with delay to avoid rate limiting.
 */
export async function translateBatch(texts) {
    const result = new Map();
    const toTranslate = texts.filter((t) => t && t.length < 500);
    for (let i = 0; i < toTranslate.length; i++) {
        const text = toTranslate[i];
        if (cache[text]) {
            result.set(text, cache[text]);
        }
        else {
            try {
                const zh = await translateOne(text);
                result.set(text, zh);
                if (i < toTranslate.length - 1)
                    await sleep(DELAY_MS);
            }
            catch {
                result.set(text, text);
            }
        }
    }
    return result;
}
/** Simple sync lookup for cached translations (no network). */
export function getCached(text) {
    return cache[text] || null;
}
//# sourceMappingURL=translate.js.map