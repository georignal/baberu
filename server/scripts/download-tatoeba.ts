/**
 * Downloads full Tatoeba Japanese-English sentence pairs and builds a word→sentences index.
 * Run: npx tsx scripts/download-tatoeba.ts
 *
 * JMdict examples only cover ~200k matched sentences.
 * Tatoeba has ~200k+ Japanese sentences with English translations.
 * This adds many more examples per word.
 */

import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DICT_DIR = path.resolve(__dirname, '../dict');
const OUTPUT = path.join(DICT_DIR, 'tatoeba-index.json');

const TATOEBA_URL = 'https://downloads.tatoeba.org/exports/sentences.tar.bz2';

function download(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        download(res.headers.location!, dest).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return; }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
      file.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  console.log('Tatoeba Sentence Index Builder');
  console.log('===============================\n');

  const tsvFile = path.join(DICT_DIR, 'jpn_eng_sentences.tsv');
  const bz2File = tsvFile + '.bz2';

  if (fs.existsSync(OUTPUT + '.gz')) {
    console.log('Tatoeba index already exists. Delete dict/tatoeba-index.* to rebuild.');
    return;
  }

  if (!fs.existsSync(tsvFile)) {
    if (!fs.existsSync(bz2File)) {
      console.log(`Downloading Tatoeba JPN-ENG sentences...`);
      console.log(`  ${TATOEBA_URL}`);
      try {
        await download(TATOEBA_URL, bz2File);
        console.log(`  Downloaded ${(fs.statSync(bz2File).size / 1024 / 1024).toFixed(1)}MB`);
      } catch (e) {
        console.log(`  Download failed: ${(e as Error).message}`);
        return;
      }
    }
    console.log('Decompressing...');
    try {
      execSync(`tar -xjf "${bz2File}" -C "${DICT_DIR}"`, { stdio: 'pipe' });
    } catch {
      console.log('  tar failed, trying alternative...');
      // Node.js doesn't have built-in bz2, fallback
      console.log('  Please install 7-Zip or bunzip2, or manually extract the file.');
      return;
    }
    try { fs.unlinkSync(bz2File); } catch {}
  }

  if (!fs.existsSync(tsvFile)) {
    console.log('TSV file not found. Aborting.');
    return;
  }

  console.log(`Building word index from ${(fs.statSync(tsvFile).size / 1024 / 1024).toFixed(1)}MB TSV...`);
  
  // Build index: word → [ { jp, en } ]
  const index = new Map<string, { jp: string; en: string }[]>();
  const raw = fs.readFileSync(tsvFile, 'utf-8');
  const lines = raw.split('\n');
  let count = 0;

  for (const line of lines) {
    const parts = line.split('\t');
    if (parts.length < 3) continue;
    const jp = parts[1]?.trim();
    const en = parts[2]?.trim();
    if (!jp || !en || jp.length > 200 || en.length > 300) continue;

    // Index by each content word in the Japanese sentence
    // Use simple word splitting (spaces are rare in Japanese, so split by common particles)
    const words = jp.split(/[、。！？\s　「」『』（）]|(?<=[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff])/g).filter(w => w.length >= 2);
    const uniqueWords = new Set(words);
    
    for (const w of uniqueWords) {
      if (w.length < 2 || w.length > 10) continue;
      const existing = index.get(w);
      if (existing) {
        if (existing.length < 20) existing.push({ jp, en }); // cap per word
      } else {
        index.set(w, [{ jp, en }]);
      }
    }
    
    count++;
    if (count % 50000 === 0) console.log(`  Processed ${count} lines, ${index.size} words indexed`);
  }

  console.log(`Indexed ${index.size} words from ${count} sentences.`);

  // Save index
  const json = JSON.stringify(Array.from(index.entries()));
  fs.writeFileSync(OUTPUT, json);
  console.log(`Saved: ${OUTPUT} (${(fs.statSync(OUTPUT).size / 1024 / 1024).toFixed(0)}MB)`);
  
  fs.writeFileSync(OUTPUT + '.gz', zlib.gzipSync(json));
  console.log(`Compressed: ${OUTPUT}.gz (${(fs.statSync(OUTPUT + '.gz').size / 1024 / 1024).toFixed(1)}MB)`);

  // Cleanup
  try { fs.unlinkSync(tsvFile); } catch {}
  try { fs.unlinkSync(OUTPUT); } catch {}
  console.log('Done.');
}

main().catch((err) => {
  console.error('Setup failed:', err.message);
  process.exit(1);
});
