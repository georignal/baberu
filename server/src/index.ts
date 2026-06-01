import 'dotenv/config';
import express from 'express';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Start immediately, load heavy deps in background
app.listen(PORT, '0.0.0.0', () => console.log(`Listening on ${PORT}`));

// Lazy-load the rest
setTimeout(async () => {
  const { initDictionary } = await import('./services/dictionary.js');
  const { setCurrentUser } = await import('./db.js');
  const authRouter = (await import('./routes/auth.js')).default;
  const docsRouter = (await import('./routes/documents.js')).default;
  const cardsRouter = (await import('./routes/cards.js')).default;
  const reviewRouter = (await import('./routes/review.js')).default;
  const { fetchUrlText } = await import('./services/urlFetcher.js');

  app.use((req, _res, next) => {
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) {
      try { const d = JSON.parse(Buffer.from(auth.slice(7), 'base64').toString()); if (d.userId) setCurrentUser(d.userId); } catch {}
    }
    next();
  });

  app.use('/api/auth', authRouter);
  app.use('/api/documents', docsRouter);
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
  await initDictionary().catch(() => {});
  console.log('All services loaded');
}, 100);
