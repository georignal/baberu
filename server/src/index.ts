import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

async function loadRoute<T>(name: string, importer: () => Promise<T>): Promise<T | null> {
  try {
    console.log(`Loading ${name}...`);
    return await importer();
  } catch (e) {
    console.error(`Failed to load ${name}:`, e);
    return null;
  }
}

async function load() {
  // Load db (required for auth middleware)
  const dbMod = await loadRoute('db', () => import('./db.js'));
  if (!dbMod) { console.error('Database module failed — app limited to health checks'); return; }

  app.use((req, _res, next) => {
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) {
      try { const d = JSON.parse(Buffer.from(auth.slice(7), 'base64').toString()); if (d.userId) dbMod.setCurrentUser(d.userId); } catch {}
    }
    next();
  });

  const authRouter = await loadRoute('auth', () => import('./routes/auth.js').then(m => m.default));
  if (authRouter) app.use('/api/auth', authRouter);

  const docsRouter = await loadRoute('docs', () => import('./routes/documents.js').then(m => m.default));
  if (docsRouter) app.use('/api/documents', docsRouter);

  const cardsRouter = await loadRoute('cards', () => import('./routes/cards.js').then(m => m.default));
  if (cardsRouter) app.use('/api/cards', cardsRouter);

  const reviewRouter = await loadRoute('review', () => import('./routes/review.js').then(m => m.default));
  if (reviewRouter) app.use('/api/review', reviewRouter);

  const urlFetcher = await loadRoute('url fetcher', () => import('./services/urlFetcher.js'));
  if (urlFetcher) {
    app.post('/api/fetch-url', async (req, res) => {
      try {
        const { url } = req.body;
        if (!url) { res.status(400).json({ error: 'URL required' }); return; }
        if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
          const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
          if (m) { const { YoutubeTranscript } = await import('youtube-transcript'); const t = await YoutubeTranscript.fetchTranscript(m[1], { lang: 'ja' }); res.json({ title: '[YT]', text: t.map((x:any)=>x.text).join('\n'), source: url }); return; }
        }
        const r = await urlFetcher.fetchUrlText(url); res.json(r);
      } catch (e: any) { res.status(500).json({ error: e.message }); }
    });
  }

  const dict = await loadRoute('dictionary', () => import('./services/dictionary.js'));
  if (dict) dict.initDictionary().catch(() => {});

  console.log('Route loading complete');
}

let moduleReady = false;
const modulePromise = load().then(() => { moduleReady = true; }).catch((e) => {
  console.error('LOAD ERROR:', e);
  moduleReady = true;
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => { console.log('Listening on', PORT); });
} else {
  app.use(async (_req, _res, next) => {
    if (!moduleReady) await modulePromise;
    next();
  });
}

export default app;
