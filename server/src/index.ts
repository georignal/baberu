import 'dotenv/config';
import fs from 'node:fs';
import express from 'express';
import path from 'node:path';
import cors from 'cors';

process.on('uncaughtException', (err) => console.error('FATAL:', err));
process.on('unhandledRejection', (err) => console.error('REJECTION:', err));
import { initDictionary } from './services/dictionary.js';
import { setCurrentUser } from './db.js';
import { fetchUrlText } from './services/urlFetcher.js';
import authRouter from './routes/auth.js';
import documentsRouter from './routes/documents.js';
import vocabularyRouter from './routes/vocabulary.js';
import cardsRouter from './routes/cards.js';
import reviewRouter from './routes/review.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use((req, _res, next) => {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    try {
      const data = JSON.parse(Buffer.from(auth.slice(7), 'base64').toString());
      if (data.userId) setCurrentUser(data.userId);
    } catch {}
  }
  next();
});

app.get('/api/health', (_req, res) => res.json({ status: 'ok', version: '0.1.0' }));
app.use('/api/auth', authRouter);
app.post('/api/fetch-url', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') { res.status(400).json({ error: 'URL is required' }); return; }
    if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
      const vidMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (vidMatch) {
        const { YoutubeTranscript } = await import('youtube-transcript');
        const transcript = await YoutubeTranscript.fetchTranscript(vidMatch[1], { lang: 'ja' });
        res.json({ title: '[YT] ' + vidMatch[1], text: transcript.map((t: any) => t.text).join('\n'), source: url });
        return;
      }
    }
    const result = await fetchUrlText(url);
    res.json(result);
  } catch (e) { res.status(500).json({ error: (e as Error).message }); }
});
app.use('/api/documents', documentsRouter);
app.use('/api/vocabulary', vocabularyRouter);
app.use('/api/cards', cardsRouter);
app.use('/api/review', reviewRouter);

// Production: serve built client files
const clientDist = path.resolve(__dirname, '../../client/dist');
console.log('Client dist path:', clientDist, 'exists:', fs.existsSync(clientDist));
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}, client dist: ${clientDist}`));
initDictionary().then(() => console.log('Dictionary ready')).catch((e: any) => console.error('Dictionary load failed:', e.message));

