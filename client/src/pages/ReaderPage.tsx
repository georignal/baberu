import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { api } from '@/shared/api/client';
import type { Document, WordToken, Candidate } from '@/shared/api/types';
import SpeakButton from '@/shared/ui/SpeakButton';

interface PopoverState { token: WordToken; x: number; y: number; }

export default function ReaderPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { documents, cards, fetchDocuments, fetchCards, createCard: addCard, deleteCard } = useApp();
  const [doc, setDoc] = useState<Document | null>(null);
  const [rawTokens, setRawTokens] = useState<WordToken[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [addedWords, setAddedWords] = useState<Set<string>>(new Set());
  const [ignoredWords, setIgnoredWords] = useState<Set<string>>(new Set());
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchDocuments(); fetchCards(); }, [fetchDocuments, fetchCards]);
  useEffect(() => { if (id) setDoc(documents.find(d => d.id === id) || null); }, [id, documents]);
  useEffect(() => { if (id) api.getSentences(id).catch(() => {}); }, [id]);
  useEffect(() => { setAddedWords(new Set(cards.map(c => c.frontText))); }, [cards]);

  const handleExtract = async () => {
    if (!id) return; setExtracting(true);
    try { const r = await api.extractVocabulary(id); if (r?.rawTokens) { setRawTokens(r.rawTokens); setCandidates(r.candidates || []); } await fetchDocuments(); }
    finally { setExtracting(false); }
  };

  const handleFlip = (t: WordToken, e: React.MouseEvent) => {
    const r = (e.target as HTMLElement).getBoundingClientRect();
    setPopover({ token: t, x: r.left + r.width / 2, y: r.bottom + 4 });
  };
  const close = useCallback(() => setPopover(null), []);
  useEffect(() => { if (!popover) return; const h = (e: MouseEvent) => { if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) close(); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, [popover, close]);

  const doAddCard = async (t: WordToken) => {
    await addCard({ id: t.lemma, word: t.surface, lemma: t.lemma, reading: t.reading, partOfSpeech: t.partOfSpeech, meaning: t.meaning, frequency: candidates.find(c => c.lemma === t.lemma)?.frequency || 1, sentenceId: '', sentenceText: '', documentId: id || '', segmentId: '' });
    setAddedWords(p => new Set(p).add(t.lemma)); close();
  };
  const doIgnore = (lemma: string) => { setIgnoredWords(p => new Set(p).add(lemma)); close(); };
  const unIgnore = (lemma: string) => { setIgnoredWords(p => { const s = new Set(p); s.delete(lemma); return s; }); };

  const docCards = cards.filter(c => c.documentId === id);
  const addedCount = rawTokens.filter(t => addedWords.has(t.lemma)).length;
  const ignoredCount = rawTokens.filter(t => ignoredWords.has(t.lemma)).length;

  const renderText = () => {
    if (!doc) return null;
    const text = doc.text;
    const hasDouble = /\n{2,}/.test(text);
    const paragraphs = hasDouble ? text.split(/\n{2,}/).filter(Boolean) : text.split(/\n/).filter(Boolean);
    const cls = 'text-[#242424] leading-relaxed text-[15px]';

    if (rawTokens.length === 0) {
      return <div className="space-y-5">{paragraphs.map((p,i) => <p key={i} className={`${cls} whitespace-pre-wrap`}>{p}</p>)}</div>;
    }

    const sorted = [...rawTokens].sort((a,b) => a.startOffset - b.startOffset);
    return (
      <div className="space-y-5">
        {paragraphs.map((pt, pi) => {
          const ps = text.indexOf(pt); if (ps < 0) return <p key={pi} className={`${cls} whitespace-pre-wrap`}>{pt}</p>;
          const pe = ps + pt.length;
          const ptoks = sorted.filter(t => t.startOffset >= ps && t.startOffset < pe);
          if (ptoks.length === 0) return <p key={pi} className={`${cls} whitespace-pre-wrap`}>{pt}</p>;
          const segs: Array<{type:'text'|'word';content:string;token?:WordToken}> = [];
          let c = ps;
          for (const t of ptoks) { if (t.startOffset < c) continue; if (t.startOffset > c) segs.push({type:'text',content:text.slice(c,t.startOffset)}); segs.push({type:'word',content:t.surface,token:t}); c = t.endOffset; }
          if (c < pe) segs.push({type:'text',content:text.slice(c,pe)});
          return (
            <p key={pi} className={`${cls} whitespace-pre-wrap`}>
              {segs.map((seg,i) => {
                if (seg.type === 'text') return <span key={i}>{seg.content}</span>;
                const t = seg.token!;
                if (t.partOfSpeech === '記号' || t.partOfSpeech === '助詞' || t.partOfSpeech === '助動詞' || t.partOfSpeech === 'フィラー') return <span key={i}>{seg.content}</span>;
                const added = addedWords.has(t.lemma), ignored = ignoredWords.has(t.lemma);
                return (
                  <span key={i}>
                    <span
                      className={`cursor-pointer border-b-2 transition-colors ${added ? 'border-accent text-accent bg-accent-soft/50' : ignored ? 'text-subtle line-through border-transparent' : 'border-warning/50 hover:border-accent hover:bg-accent-soft/30'}`}
                      onClick={e => { if (ignored) unIgnore(t.lemma); else handleFlip(t, e); }}
                      title={t.reading ? `${t.reading}${t.meaning ? ' — ' + t.meaning : ''}` : undefined}
                    >{seg.content}</span>
                    {' '}
                  </span>
                );
              })}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-[1fr_auto] gap-4 items-start" style={{ minHeight: 'calc(100vh - 56px - 32px)' }}>
      <div className="max-w-3xl mx-auto w-full flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-4 text-xs text-muted">
            <span>{doc?.title || 'Reader'}</span>
            {candidates.length > 0 && <><span>{candidates.length} unique</span><span className="text-accent">{addedCount} added</span>{ignoredCount > 0 && <span className="text-subtle">{ignoredCount} ignored</span>}</>}
          </div>
          <div className="flex gap-2">
            {candidates.length === 0
              ? <button className="btn-primary text-xs" onClick={handleExtract} disabled={extracting}>{extracting ? 'Analyzing...' : 'Extract Words'}</button>
              : <button className="btn-ghost text-xs" onClick={() => { setRawTokens([]); setCandidates([]); setIgnoredWords(new Set()); }}>Re-extract</button>}
          </div>
        </div>
        {candidates.length > 0 && (
          <div className="flex gap-4 text-[11px] text-subtle">
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-warning/50 inline-block"/> unknown</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-accent inline-block"/> added</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-transparent inline-block"/> <span className="line-through">ignored</span></span>
          </div>
        )}
        <div className="panel flex-1 min-h-0"><div className="panel-body p-6 overflow-auto" style={{minHeight:300}}><div className="max-w-2xl">{renderText()}</div></div></div>
      </div>
      <div className="w-72 shrink-0 hidden lg:flex flex-col gap-3 sticky top-[72px]">
        <div className="panel flex-1 min-h-0 flex flex-col">
          <div className="panel-header"><span className="font-semibold text-sm tracking-tight">Cards</span><span className="text-muted text-xs">{docCards.length}</span></div>
          <div className="panel-body flex-1 overflow-auto p-2">
            {docCards.length === 0
              ? <div className="text-subtle text-xs text-center py-8">Click words and add to create cards.</div>
              : <div className="space-y-1.5">{docCards.map(card => (
                  <div key={card.id} className="border border-border rounded-lg p-2 bg-panel-2 text-xs">
                    <div className="flex items-center justify-between gap-1"><span className="font-bold truncate">{card.frontText}</span><button className="text-muted hover:text-danger shrink-0 text-[10px]" onClick={() => deleteCard(card.id)}>×</button></div>
                    <div className="text-muted truncate">{card.reading}</div>
                    <div className="text-subtle truncate">{card.meaning || '—'}</div>
                    <button className="text-[10px] text-accent mt-1 hover:underline" onClick={() => nav('/cards')}>Open Cards →</button>
                  </div>
                ))}</div>}
          </div>
        </div>
      </div>
      {popover && (
        <div ref={popoverRef} className="fixed z-50 bg-white border border-border rounded-xl shadow-[0_4px_24px_rgba(0,0,0,.12)] p-4 min-w-[240px]" style={{left:Math.min(popover.x-120,window.innerWidth-260),top:Math.min(popover.y,window.innerHeight-280)}}>
          <div className="flex items-center gap-2"><div className="text-lg font-bold tracking-tight">{popover.token.surface}</div><SpeakButton text={popover.token.surface} size="sm"/></div>
          {popover.token.surface !== popover.token.lemma && <div className="text-xs text-subtle mt-0.5">{popover.token.lemma}</div>}
          <div className="text-sm text-muted mt-1">{popover.token.reading}</div>
          {popover.token.meaning && <div className="text-sm text-[#3f3f3f] mt-1">{popover.token.meaning}</div>}
          <div className="flex gap-1 text-[11px] text-subtle mt-1"><span className="bg-panel-2 px-1.5 py-0.5 rounded-full border border-border">{popover.token.partOfSpeech}</span><span className="bg-panel-2 px-1.5 py-0.5 rounded-full border border-border">x{candidates.find(c=>c.lemma===popover.token.lemma)?.frequency||1}</span></div>
          <div className="flex gap-2 mt-3"><button className="btn-primary text-xs flex-1" onClick={()=>doAddCard(popover.token)} disabled={addedWords.has(popover.token.lemma)}>{addedWords.has(popover.token.lemma)?'Added':'Add to Cards'}</button><button className="btn-ghost text-xs" onClick={()=>doIgnore(popover.token.lemma)}>Ignore</button></div>
        </div>
      )}
    </div>
  );
}
