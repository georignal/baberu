import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DICT_DIR = path.resolve(__dirname, '../dict');
const OUTPUT = path.join(DICT_DIR, 'jmdict-index.json');

const TAG = '3.6.2%2B20260525143653';
const VERSION = '3.6.2+20260525143653';

const DOWNLOADS = [
  { name: 'JMdict', file: `jmdict-eng-${VERSION}` },
  { name: 'Examples', file: `jmdict-examples-eng-${VERSION}` },
];

function urls(filename: string): string[] {
  return [
    `https://github.com/scriptin/jmdict-simplified/releases/download/${TAG}/${filename}.json.zip`,
    `https://github.com/scriptin/jmdict-simplified/releases/download/${TAG}/${filename}.json.tgz`,
  ];
}

interface IndexEntry {
  k: string[];
  r: string[];
  s: { g: string[]; p: string[]; x?: { jp: string; en: string }[] }[];
}

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

async function downloadOne(name: string, filename: string): Promise<string | null> {
  // Extract short version (e.g. "3.6.2" from "3.6.2+20260525143653")
  const shortVer = VERSION.split('+')[0];
  const pattern = filename.split('+')[0]; // e.g. "jmdict-eng-3.6.2"
  const exist = fs.readdirSync(DICT_DIR).find(f => f.startsWith(pattern) && f.endsWith('.json'));
  if (exist) { console.log(`  ${name}: cached`); return path.join(DICT_DIR, exist); }

  for (const url of urls(filename)) {
    const ext = url.endsWith('.zip') ? '.zip' : '.tgz';
    const arc = path.join(DICT_DIR, filename + ext);
    try {
      await download(url, arc);
      console.log(`  ${name}: ${(fs.statSync(arc).size / 1024).toFixed(0)}KB, extracting...`);
      try { execSync(`tar -xzf "${arc}" -C "${DICT_DIR}"`, { stdio: 'pipe' }); }
      catch { try { execSync(`tar -xf "${arc}" -C "${DICT_DIR}"`, { stdio: 'pipe' }); } catch {} }
      try { fs.unlinkSync(arc); } catch {}
      const out = fs.readdirSync(DICT_DIR).find(f => f.startsWith(filename.split('+')[0]) && f.endsWith('.json'));
      if (out) { console.log(`  ${name}: ${(fs.statSync(path.join(DICT_DIR, out)).size / 1024 / 1024).toFixed(0)}MB`); return path.join(DICT_DIR, out); }
    } catch (e) { console.log(`  ${name}: ${(e as Error).message}`); try { fs.unlinkSync(arc); } catch {} }
  }
  return null;
}

async function main() {
  console.log('JMdict Setup\n============\n');
  const files: { name: string; path: string }[] = [];
  for (const dl of DOWNLOADS) {
    const p = await downloadOne(dl.name, dl.file);
    if (p) files.push({ name: dl.name, path: p });
  }
  if (files.length === 0) { console.log('No files downloaded.'); return; }

  console.log('\nBuilding index...');
  const index = new Map<string, IndexEntry>();

  for (const { name, path: fp } of files) {
    const data = JSON.parse(fs.readFileSync(fp, 'utf-8'));
    const entries = data.words || [];
    const tags: Record<string, string> = data.tags || {};
    const isEx = name === 'Examples';
    for (const e of entries) {
      const kf: string[] = (e.kanji || []).map((k: any) => k.text);
      const rf: string[] = (e.kana || []).map((k: any) => k.text);
      const senses = (e.sense || []).map((s: any) => ({
        g: (s.gloss || []).filter((g: any) => !g.lang || g.lang === 'eng').map((g: any) => g.text || g),
        p: (s.partOfSpeech || []).map((t: string) => tags[t] || t),
        x: isEx ? (s.examples || []).map((x: any) => {
          const jp = (x.sentences || []).find((s: any) => s.lang === 'jpn');
          const en = (x.sentences || []).find((s: any) => s.lang === 'eng');
          return { jp: jp?.text || '', en: en?.text || '' };
        }).filter((x: any) => x.jp) : undefined,
      })).filter((s: any) => s.g.length > 0); // skip empty senses
      const entry: IndexEntry = { k: kf, r: rf, s: senses };
      // Merge examples into existing entry
      const firstKey = kf[0] || rf[0];
      if (isEx && index.has(firstKey)) {
        const existing = index.get(firstKey)!;
        for (let i = 0; i < existing.s.length && i < senses.length; i++) {
          if (senses[i].x?.length) existing.s[i] = { ...existing.s[i], x: senses[i].x };
        }
      } else if (!index.has(firstKey)) {
        for (const k of kf) index.set(k, entry);
        for (const r of rf) index.set(r, entry);
      }
    }
    console.log(`  ${name}: ${entries.length} entries`);
  }
  console.log(`Total: ${index.size} lookup keys`);

  const json = JSON.stringify(Array.from(index.entries()));
  fs.writeFileSync(OUTPUT, json);
  console.log(`Index: ${OUTPUT} (${(fs.statSync(OUTPUT).size / 1024 / 1024).toFixed(0)}MB)`);
  const gz = OUTPUT + '.gz';
  fs.writeFileSync(gz, zlib.gzipSync(json));
  console.log(`Compressed: ${gz} (${(fs.statSync(gz).size / 1024 / 1024).toFixed(0)}MB)`);
  for (const { path: fp } of files) try { fs.unlinkSync(fp); } catch {}
  console.log('\nDone.');
}

main().catch(e => { console.error(e); process.exit(1); });
