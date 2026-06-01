import { parse } from 'node-html-parser';

export interface FetchResult {
  title: string;
  text: string;
  source: string;
}

export async function fetchUrlText(url: string): Promise<FetchResult> {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 15000);

  let res: Response;
  try {
    res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; baberu/1.0)', 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'ja,en' },
    });
  } catch (e: any) {
    clearTimeout(timeout);
    if (e.name === 'AbortError') throw new Error('Request timed out after 15s');
    throw new Error(`Failed to fetch: ${e.message}`);
  }
  clearTimeout(timeout);

  if (!res.ok) {
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/pdf')) throw new Error('PDF files are not supported. Please copy-paste the text instead.');
    throw new Error(`Server returned ${res.status} ${res.statusText}`);
  }

  const html = await res.text();
  if (!html || html.length < 100) throw new Error('Page is empty or too short');

  let root;
  try { root = parse(html); } catch { throw new Error('Failed to parse page HTML'); }

  const title = root.querySelector('title')?.text?.replace(/\s+/g, ' ').trim() || url;
  root.querySelectorAll('script, style, nav, footer, header, aside, iframe, noscript, svg').forEach(el => el.remove());

  const main = root.querySelector('main, article, [role="main"], .content, #content, #main');
  let text = extractText(main || root.querySelector('body') || root);
  text = text.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').replace(/\t/g, ' ').replace(/ {2,}/g, ' ').trim();

  if (!text || text.length < 20) {
    const body = root.querySelector('body');
    if (body) {
      body.querySelectorAll('script, style, noscript').forEach(el => el.remove());
      text = (body.text || '').replace(/\s{2,}/g, ' ').trim();
    }
  }

  if (!text || text.length < 10) throw new Error('Could not extract text. The page may be mostly images, require login, or use JavaScript rendering.');
  return { title, text, source: url };
}

function extractText(element: any): string {
  const texts: string[] = [];
  function walk(el: any) {
    if (!el) return;
    for (const child of el.childNodes) {
      if (child.nodeType === 3) { const t = child.text.trim(); if (t) texts.push(t); }
      else if (child.nodeType === 1) {
        const tag = child.tagName?.toLowerCase();
        if (['p','div','br','li','h1','h2','h3','h4','h5','h6','tr','section','article'].includes(tag)) {
          walk(child); texts.push('\n');
        } else { walk(child); }
      }
    }
  }
  walk(element);
  return texts.join('').replace(/\n{2,}/g,'\n').trim();
}
