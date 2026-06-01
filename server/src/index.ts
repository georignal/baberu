import express from 'express';
import cors from 'cors';
import { initDictionary } from './services/dictionary.js';
import { fetchUrlText } from './services/urlFetcher.js';
import documentsRouter from './routes/documents.js';
import vocabularyRouter from './routes/vocabulary.js';
import cardsRouter from './routes/cards.js';
import reviewRouter from './routes/review.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: '0.1.0' });
});

// URL fetch endpoint
app.post('/api/fetch-url', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      res.status(400).json({ error: 'URL is required' });
      return;
    }
    // YouTube: use dedicated library inline to avoid module issues
    if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
      const vidMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (vidMatch) {
        const { YoutubeTranscript } = await import('youtube-transcript');
        const transcript = await YoutubeTranscript.fetchTranscript(vidMatch[1], { lang: 'ja' });
        const text = transcript.map((t: any) => t.text).join('\n');
        res.json({ title: '[YT] ' + vidMatch[1], text, source: url });
        return;
      }
    }
    const result = await fetchUrlText(url);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.use('/api/documents', documentsRouter);
app.use('/api/vocabulary', vocabularyRouter);
app.use('/api/cards', cardsRouter);
app.use('/api/review', reviewRouter);

async function start() {
  await initDictionary();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start();
