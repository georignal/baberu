import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';

export default function ImportPage() {
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const { createDocument, error } = useApp();
  const navigate = useNavigate();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setTitle(file.name.replace(/\.[^.]+$/, ''));
    const reader = new FileReader();
    reader.onload = () => setText(reader.result as string);
    reader.readAsText(file);
  };

  const handleFetchUrl = async () => {
    if (!url.trim()) return;
    setFetching(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Fetch failed');
      }
      const data = await res.json();
      setTitle(data.title);
      setText(data.text);
    } catch (e) {
      setFetchError((e as Error).message);
    } finally {
      setFetching(false);
    }
  };

  const handleImport = async () => {
    if (!text.trim()) return;
    setImporting(true);
    try {
      const doc = await createDocument(title || 'Untitled', text);
      navigate(`/documents/${doc.id}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="panel">
        <div className="panel-header">
          <span className="font-semibold tracking-tight">Import</span>
          <span className="text-muted text-xs">Paste, upload, or fetch from URL</span>
        </div>
        <div className="panel-body space-y-3">
          <input
            type="text"
            className="w-full border border-border rounded-sm px-3 py-1.5 bg-white text-sm outline-none focus:border-border-strong"
            placeholder="Document title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          {/* URL fetch */}
          <div className="flex gap-2">
            <input
              type="url"
              className="flex-1 border border-border rounded-sm px-3 py-1.5 bg-white text-sm outline-none focus:border-border-strong"
              placeholder="Or paste a URL (news article, blog, YouTube...)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFetchUrl()}
            />
            <button
              className="btn-soft text-xs shrink-0"
              onClick={handleFetchUrl}
              disabled={!url.trim() || fetching}
            >
              {fetching ? 'Fetching...' : 'Fetch'}
            </button>
          </div>
          {fetchError && <p className="text-danger text-xs">{fetchError}</p>}

          <textarea
            className="w-full min-h-[200px] border border-border rounded-xl p-3 bg-white outline-none focus:border-border-strong focus:shadow-[0_0_0_3px_rgba(15,118,110,.08)] resize-none"
            placeholder="Or paste Japanese text here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept=".txt,.md,text/plain"
              onChange={handleFileUpload}
              className="text-muted text-xs file:mr-3 file:px-3 file:py-1 file:rounded-sm file:border file:border-border file:bg-panel file:text-sm file:cursor-pointer"
            />
            <button
              className="btn-primary ml-auto"
              onClick={handleImport}
              disabled={!text.trim() || importing}
            >
              {importing ? 'Importing...' : 'Import & Parse'}
            </button>
          </div>
          {error && <p className="text-danger text-xs">{error}</p>}
        </div>
      </div>
    </div>
  );
}
