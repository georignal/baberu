import fs from 'node:fs';
import zlib from 'node:zlib';

const dictDir = 'dict';
const files = fs.readdirSync(dictDir).filter((f: string) => f.endsWith('.json'));

if (files.length === 0) {
  console.log('No JSON files found. Run download first.');
  process.exit(1);
}

console.log('Files:', files.join(', '));

const index = new Map<string, any>();

// Load main dictionary
const mainFile = files.find((f: string) => f.includes('jmdict-eng-') && !f.includes('examples'));
if (mainFile) {
  const data = JSON.parse(fs.readFileSync(`${dictDir}/${mainFile}`, 'utf-8'));
  const entries = data.words || [];
  const tags: Record<string, string> = data.tags || {};
  for (const e of entries) {
    const kf: string[] = (e.kanji || []).map((k: any) => k.text);
    const rf: string[] = (e.kana || []).map((k: any) => k.text);
    const ss = (e.sense || []).map((s: any) => ({
      g: (s.gloss || []).filter((g: any) => !g.lang || g.lang === 'eng').map((g: any) => g.text || g),
      p: (s.partOfSpeech || []).map((t: string) => tags[t] || t),
    }));
    const entry = { k: kf, r: rf, s: ss };
    for (const k of kf) if (!index.has(k)) index.set(k, entry);
    for (const r of rf) if (!index.has(r)) index.set(r, entry);
  }
  console.log('JMdict:', entries.length, 'entries ->', index.size, 'keys');
}

// Merge examples
const exFile = files.find((f: string) => f.includes('examples'));
if (exFile) {
  const data = JSON.parse(fs.readFileSync(`${dictDir}/${exFile}`, 'utf-8'));
  const entries = data.words || [];
  let merged = 0;
  for (const e of entries) {
    const kf: string[] = (e.kanji || []).map((k: any) => k.text);
    const rf: string[] = (e.kana || []).map((k: any) => k.text);
    const firstKey = kf[0] || rf[0];
    const entry = index.get(firstKey);
    if (entry) {
      const examples = (e.sense || []).map((s: any) =>
        (s.examples || []).map((x: any) => ({ jp: x.text || '', en: x.translation || '' })),
      );
      for (let i = 0; i < entry.s.length && i < examples.length; i++) {
        if (examples[i].length) entry.s[i] = { ...entry.s[i], x: examples[i] };
      }
      merged++;
    }
  }
  console.log('Examples:', entries.length, 'entries, merged', merged);
}

const json = JSON.stringify(Array.from(index.entries()));
fs.writeFileSync(`${dictDir}/jmdict-index.json`, json);
const sz = (fs.statSync(`${dictDir}/jmdict-index.json`).size / 1024 / 1024).toFixed(0);
console.log('Index:', sz + 'MB');

fs.writeFileSync(`${dictDir}/jmdict-index.json.gz`, zlib.gzipSync(json));
const gz = (fs.statSync(`${dictDir}/jmdict-index.json.gz`).size / 1024 / 1024).toFixed(1);
console.log('Compressed:', gz + 'MB');

// Clean up raw files
for (const f of files) fs.unlinkSync(`${dictDir}/${f}`);
console.log('Done.');
