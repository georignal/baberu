import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { setCurrentUser } from './db.js';
import authRouter from './routes/auth.js';
import documentsRouter from './routes/documents.js';
import cardsRouter from './routes/cards.js';
import reviewRouter from './routes/review.js';
import { fetchUrlText } from './services/urlFetcher.js';
import { initDictionary } from './services/dictionary.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use((req, _res, next) => {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    try { const d = JSON.parse(Buffer.from(auth.slice(7), 'base64').toString()); if (d.userId) setCurrentUser(d.userId); } catch {}
  }
  next();
});

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/cards', cardsRouter);
app.use('/api/review', reviewRouter);
app.post('/api/fetch-url', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) { res.status(400).json({ error: 'URL required' }); return; }
    if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
      const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (m) { const { YoutubeTranscript } = await import('youtube-transcript'); const t = await YoutubeTranscript.fetchTranscript(m[1], { lang: 'ja' }); res.json({ title: '[YT]', text: t.map((x:any)=>x.text).join('\n'), source: url }); return; }
    }
    const r = await fetchUrlText(url); res.json(r);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, () => { console.log('Server on', PORT); initDictionary().catch(() => {}); });
