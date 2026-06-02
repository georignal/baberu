import express from 'express';
import cors from 'cors';
import { setCurrentUser } from '../../../server/src/db.js';
import { fetchUrlText } from '../../../server/src/services/urlFetcher.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use((req: any, _res: any, next: any) => {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    try {
      const d = JSON.parse(Buffer.from(auth.slice(7), 'base64').toString());
      if (d.userId) setCurrentUser(d.userId);
    } catch {}
  }
  next();
});

app.post('/api/fetch-url', async (req: any, res: any) => {
  try {
    const { url } = req.body;
    if (!url) { res.status(400).json({ error: 'URL required' }); return; }
    if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
      const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (m) {
        const { YoutubeTranscript } = await import('youtube-transcript');
        const t = await YoutubeTranscript.fetchTranscript(m[1], { lang: 'ja' });
        res.json({ title: '[YT]', text: t.map((x: any) => x.text).join('\n'), source: url });
        return;
      }
    }
    const r = await fetchUrlText(url);
    res.json(r);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default app;
