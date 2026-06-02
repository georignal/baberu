import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

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

    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 15000);
    let fetchRes: Response;
    try {
      fetchRes = await fetch(url, {
        signal: ctrl.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; baberu/1.0)', 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'ja,en' },
      });
    } catch (e: any) {
      clearTimeout(timeout);
      throw new Error(`Failed to fetch: ${e.message}`);
    }
    clearTimeout(timeout);

    const html = await fetchRes.text();
    const title = (html.match(/<title[^>]*>([^<]+)<\/title>/i) || [])[1] || url;
    let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();

    res.json({ title, text: text || '(no text extracted)', source: url });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default app;
