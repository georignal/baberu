import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { toHiragana, toRomaji, getVerbConjugations, getAdjectiveConjugations } from '@/shared/utils/japanese';
import SpeakButton from '@/shared/ui/SpeakButton';
import type { Card } from '@/shared/api/types';

type Tab = 'list' | 'review';

function highlightWord(text: string, word: string) {
  if (!word) return text;
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'g'));
  return parts.map((part, i) =>
    part === word ? (
      <span key={i} className="bg-accent-soft rounded px-0.5 font-medium">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

export default function CardsPage() {
  const { cards, loading, fetchCards, deleteCard, logReview } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  // Review state
  const [tab, setTab] = useState<Tab>('list');
  const [reviewIndex, setReviewIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [forgotten, setForgotten] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('baberu_forgotten') || '[]')); } catch { return new Set(); }
  });
  const [remembered, setRemembered] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('baberu_remembered') || '[]')); } catch { return new Set(); }
  });
  const [flyDir, setFlyDir] = useState<'left' | 'right' | null>(null);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'forgotten'>('all');

  useEffect(() => { localStorage.setItem('baberu_forgotten', JSON.stringify(Array.from(forgotten))); }, [forgotten]);
  useEffect(() => { localStorage.setItem('baberu_remembered', JSON.stringify(Array.from(remembered))); }, [remembered]);
  useEffect(() => { if (!flyDir) return; const t = setTimeout(() => setFlyDir(null), 400); return () => clearTimeout(t); }, [flyDir]);

  const jumpToCard = (cardId: string) => {
    const idx = cards.findIndex(x => x.id === cardId);
    if (idx < 0) return;
    setForgotten(prev => { const s = new Set(prev); s.delete(cardId); return s; });
    setRemembered(prev => { const s = new Set(prev); s.delete(cardId); return s; });
    setReviewIndex(idx);
    setFlipped(false);
  };

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  // Handle navigation state: jump to specific card in review mode
  useEffect(() => {
    const state = location.state as { review?: boolean; cardId?: string } | null;
    if (state?.review) {
      setTab('review');
      if (state.cardId) {
        const idx = cards.findIndex(c => c.id === state.cardId);
        if (idx >= 0) setReviewIndex(idx);
      }
      window.history.replaceState({}, '');
    }
  }, [cards, location.state]);

  // Stats
  const newCards = cards.filter((c) => c.status === 'new');
  const learningCards = cards.filter((c) => c.status === 'learning');
  const knownCards = cards.filter((c) => c.status === 'known');

  // Review state
  const reviewCards = reviewFilter === 'forgotten' ? cards.filter(c => forgotten.has(c.id)) : cards;
  const reviewCard: Card | undefined = reviewCards[reviewIndex % Math.max(1, reviewCards.length)];
  const allReviewed = reviewFilter === 'all' && forgotten.size + remembered.size >= cards.length && cards.length > 0;

  const handleFlip = () => setFlipped((prev) => !prev);

  const handleResult = async (result: string) => {
    if (!reviewCard) return;
    const dir = result === 'known' ? 'right' : 'left';
    setFlyDir(dir);
    await logReview(reviewCard.id, result);
    if (result === 'known') {
      setRemembered((prev) => new Set(prev).add(reviewCard.id));
      setForgotten((prev) => { const s = new Set(prev); s.delete(reviewCard.id); return s; });
    } else {
      setForgotten((prev) => new Set(prev).add(reviewCard.id));
      setRemembered((prev) => { const s = new Set(prev); s.delete(reviewCard.id); return s; });
    }
    setFlipped(false);
    setTimeout(() => {
      setReviewIndex((prev) => (prev + 1) % Math.max(1, reviewCards.length));
    }, 350);
  };

  const hiragana = reviewCard ? toHiragana(reviewCard.reading) : '';
  const romaji = reviewCard ? toRomaji(reviewCard.reading) : '';
  const dictData = reviewCard?.dictData ? JSON.parse(reviewCard.dictData) : null;
  const dictSenses: { glosses: string[]; pos: string[]; examples?: { jp: string; en: string }[] }[] = dictData?.senses || [];
  const dictPos = dictSenses.length > 0 ? dictSenses[0].pos : [];
  // Collect all examples from dictionary
  const dictExamples = dictSenses.flatMap((s: { examples?: { jp: string; en: string }[] }) => s.examples || []);
  const conjugations =
    reviewCard?.partOfSpeech === '動詞'
      ? getVerbConjugations(reviewCard.frontText)
      : reviewCard?.partOfSpeech === '形容詞'
        ? getAdjectiveConjugations(reviewCard.frontText)
        : [];

  return (
    <div className="max-w-3xl mx-auto">
      {/* Tab bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 p-1 border border-border rounded-full bg-panel-2">
          <button
            className={`px-4 py-1.5 rounded-full text-[13px] transition-colors ${
              tab === 'list'
                ? 'bg-panel text-[#171717] shadow-[0_1px_2px_rgba(0,0,0,.05)]'
                : 'text-muted hover:text-[#171717]'
            }`}
            onClick={() => { setTab('list'); setReviewFilter('all'); }}
          >
            List
          </button>
          <button
            className={`px-4 py-1.5 rounded-full text-[13px] transition-colors ${
              tab === 'review'
                ? 'bg-panel text-[#171717] shadow-[0_1px_2px_rgba(0,0,0,.05)]'
                : 'text-muted hover:text-[#171717]'
            }`}
            onClick={() => { setTab('review'); setReviewFilter('all'); }}
          >
            Review
          </button>
        </div>
        <span className="text-xs text-muted">
          {newCards.length} new · {learningCards.length} learning · {knownCards.length} known
        </span>
      </div>

      {/* ===== LIST TAB ===== */}
      {tab === 'list' && (
        <>
          {loading ? (
            <div className="py-12 text-center text-muted text-sm">Loading...</div>
          ) : cards.length === 0 ? (
            <div className="panel">
              <div className="panel-body py-16 text-center">
                <p className="text-subtle text-sm mb-4">No cards yet.</p>
                <button className="btn-primary text-xs" onClick={() => navigate('/documents')}>
                  Go to Documents
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {cards.map((card) => (
                <div
                  key={card.id}
                  className="border border-border rounded-xl p-3 bg-panel-2 flex items-center justify-between gap-3 cursor-pointer hover:border-border-strong transition-colors"
                  onClick={() => { setTab('review'); setReviewIndex(cards.findIndex(x => x.id === card.id)); setFlipped(false); }}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[15px] tracking-tight">{card.frontText}</span>
                      <span className="text-muted text-xs">{toHiragana(card.reading)}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                          card.status === 'new'
                            ? 'border-accent text-accent bg-accent-soft'
                            : card.status === 'learning'
                              ? 'border-warning text-warning'
                              : 'border-border-strong text-muted'
                        }`}
                      >
                        {card.status}
                      </span>
                    </div>
                    <div className="text-[#3f3f3f] text-[13px] mt-1">{card.meaning || '—'}</div>
                    {card.exampleSentences && card.exampleSentences.length > 0 && (
                      <div className="text-subtle text-[11px] mt-1 truncate max-w-sm">
                        {card.exampleSentences[0]}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      className="btn-icon text-xs"
                      onClick={() => navigate(`/source/${card.id}`)}
                    >
                      Source
                    </button>
                    <button
                      className="btn-icon text-xs text-danger"
                      onClick={() => deleteCard(card.id)}
                    >
                      Del
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ===== REVIEW TAB ===== */}
      {tab === 'review' && (
        <>
          {cards.length === 0 ? (
            <div className="panel">
              <div className="panel-body py-16 text-center">
                <p className="text-subtle text-sm mb-4">Create cards first to start reviewing.</p>
                <button className="btn-primary text-xs" onClick={() => navigate('/documents')}>
                  Go to Documents
                </button>
              </div>
            </div>
          ) : reviewCards.length === 0 ? (
            <div className="panel">
              <div className="panel-body py-16 text-center">
                <p className="text-subtle text-sm mb-4">No cards to review.</p>
                <button className="btn-soft text-xs" onClick={() => { setReviewFilter('all'); setReviewIndex(0); }}>Show all cards</button>
              </div>
            </div>
          ) : (
            <div>
              <div className="text-center mb-3 flex items-center justify-center gap-3">
                <span className="text-muted text-xs">
                  {allReviewed 
                    ? `${cards.length} cards reviewed` 
                    : `Card ${reviewIndex + 1} of ${cards.length}`}
                </span>
                {(forgotten.size > 0 || remembered.size > 0) && (
                  <button
                    className="text-[10px] text-subtle hover:text-muted underline"
                    onClick={() => { setForgotten(new Set()); setRemembered(new Set()); setReviewFilter('all'); }}
                  >
                    reset
                  </button>
                )}
              </div>

              {allReviewed ? (
                <div className="grid grid-cols-[1fr_minmax(0,480px)_1fr] gap-8 items-start">
                  <div className="hidden lg:block">
                    <div className="space-y-1 max-h-[440px] overflow-auto">
                      <div className="text-[10px] text-muted uppercase tracking-wide pl-1">Forgot</div>
                      {cards.filter(c => forgotten.has(c.id)).map(c => (
                        <div
                          key={c.id}
                          className="text-xs text-[#b42318] bg-red-50 border border-red-100 rounded-lg px-2 py-1 truncate cursor-pointer hover:bg-red-100 transition-colors"
                          onClick={() => jumpToCard(c.id)}
                        >{c.frontText}</div>
                      ))}
                    </div>
                  </div>
                  <div className="panel" style={{ minHeight: 380 }}>
                    <div className="panel-body flex-1 flex flex-col items-center justify-center text-center p-8 gap-4">
                      <div className="text-4xl">🎉</div>
                      <div className="text-lg text-muted">All cards reviewed!</div>
                      <div className="flex gap-3 text-sm">
                        <span className="text-[#b42318]">{forgotten.size} forgotten</span>
                        <span className="text-accent">{remembered.size} remembered</span>
                      </div>
                      <button
                        className="btn-primary text-sm mt-2"
                        onClick={() => { setReviewFilter('forgotten'); setReviewIndex(0); }}
                      >
                        Review Forgotten
                      </button>
                    </div>
                  </div>
                  <div className="hidden lg:block">
                    <div className="space-y-1 max-h-[440px] overflow-auto">
                      <div className="text-[10px] text-muted uppercase tracking-wide pl-1">Got it</div>
                      {cards.filter(c => remembered.has(c.id)).map(c => (
                        <div
                          key={c.id}
                          className="text-xs text-accent bg-accent-soft/50 border border-accent/20 rounded-lg px-2 py-1 truncate cursor-pointer hover:bg-accent-soft transition-colors"
                          onClick={() => jumpToCard(c.id)}
                        >{c.frontText}</div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (

              <div className="grid grid-cols-[1fr_minmax(0,480px)_1fr] gap-8 items-start">
                {/* Left: forgotten list (always visible) */}
                <div className="hidden lg:block">
                  <div className="space-y-1 max-h-[440px] overflow-auto">
                    <div className="text-[10px] text-muted uppercase tracking-wide pl-1">Forgot</div>
                    {cards.filter(c => forgotten.has(c.id)).map(c => (
                      <div
                        key={c.id}
                        className="text-xs text-[#b42318] bg-red-50 border border-red-100 rounded-lg px-2 py-1 truncate cursor-pointer hover:bg-red-100 transition-colors"
                        onClick={() => jumpToCard(c.id)}
                      >{c.frontText}</div>
                    ))}
                  </div>
                </div>

                {/* Center: card */}
                <div>
                  <div className="relative flex items-center justify-center">
                    <button
                      className="absolute left-0 z-10 -ml-10 w-8 h-8 rounded-full border border-border bg-panel text-muted hover:text-[#171717] hover:border-border-strong flex items-center justify-center transition-colors"
                      onClick={(e) => { e.stopPropagation(); setFlipped(false); setReviewIndex((prev) => (prev - 1 + reviewCards.length) % reviewCards.length); }}
                    >←</button>

                    <div
                      className={`panel cursor-pointer select-none transition-all duration-300 w-full ${
                        flyDir === 'left' ? '-translate-x-24 opacity-0 scale-95' :
                        flyDir === 'right' ? 'translate-x-24 opacity-0 scale-95' : ''
                      }`}
                      style={{ minHeight: 380 }}
                      onClick={handleFlip}
                >
                  {!flipped ? (
                    <div className="panel-body flex-1 flex flex-col items-center justify-center text-center p-8">
                      <div className="text-5xl font-bold tracking-tighter leading-tight">
                        {reviewCard.frontText}
                      </div>
                      <div className="mt-4">
                        <SpeakButton text={reviewCard.frontText} size="md" />
                      </div>
                      <div className="mt-6 text-xs text-subtle">tap to reveal</div>
                    </div>
                  ) : (
                    <div className="panel-body flex-1 overflow-auto p-6 space-y-4">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="text-3xl font-bold tracking-tight">{reviewCard.frontText}</div>
                          <SpeakButton text={reviewCard.frontText} size="md" />
                        </div>
                        <div className="text-lg text-muted mt-1">{hiragana}</div>
                        {romaji && <div className="text-sm text-subtle mt-0.5">[{romaji}]</div>}
                      </div>

                      <div className="w-10 h-px bg-border-strong mx-auto" />

                      <div className="flex items-center gap-2 justify-center flex-wrap">
                      {dictPos.length > 0 ? (
                        dictPos.map((p: string, i: number) => (
                          <span key={i} className="text-[11px] bg-panel-2 px-2 py-0.5 rounded-full border border-border text-subtle">
                            {p}
                          </span>
                        ))
                      ) : reviewCard.partOfSpeech ? (
                        <span className="text-[11px] bg-panel-2 px-2 py-0.5 rounded-full border border-border text-subtle">
                          {reviewCard.partOfSpeech}
                        </span>
                      ) : null}
                    </div>

                    {/* Multiple senses from dictionary - prefer Chinese */}
                    {dictSenses.length > 0 ? (
                      <div className="space-y-2">
                        <div className="text-[10px] text-subtle uppercase tracking-wide">Definitions</div>
                        {dictSenses.map((sense, si) => (
                          <div key={si} className="bg-panel-2 border border-border rounded-xl p-3">
                            {sense.pos.length > 0 && (
                              <div className="text-[10px] text-subtle mb-1">
                                {sense.pos.join(' · ')}
                              </div>
                            )}
                            <div className="text-sm text-[#2a2a2a]">
                              {(sense as any).glossesZh?.join('; ') || sense.glosses.join('; ')}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-base text-[#2a2a2a]">{reviewCard.meaning || '—'}</span>
                    )}

                    {/* JMdict dictionary examples */}
                    {dictExamples.length > 0 && (
                      <div>
                        <div className="text-[10px] text-subtle mb-1.5 uppercase tracking-wide">
                          Dictionary Examples ({dictExamples.length})
                        </div>
                        <div className="space-y-2">
                          {dictExamples.slice(0, 3).map((ex, i) => (
                            <div key={i} className="bg-panel-2 border border-border rounded-xl p-3">
                              <div className="text-sm text-[#3f3f3f]">{ex.jp}</div>
                              <div className="text-xs text-muted mt-0.5">{ex.en}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Source examples from user's document */}
                    {reviewCard.exampleSentences && reviewCard.exampleSentences.length > 0 && (
                      <div>
                        <div className="text-[10px] text-subtle mb-1.5 uppercase tracking-wide">
                          {reviewCard.exampleSentences.length > 1 ? 'Examples' : 'Example'}
                        </div>
                        <div className="space-y-2">
                          {reviewCard.exampleSentences.map((ex, i) => (
                            <div key={i} className="bg-panel-2 border border-border rounded-xl p-3">
                              <div className="text-sm text-[#3f3f3f]">
                                {highlightWord(ex, reviewCard.frontText)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {conjugations.length > 0 && (
                      <div>
                        <div className="text-[10px] text-subtle mb-1.5 uppercase tracking-wide">
                          Conjugations
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {conjugations.map((c) => (
                            <div
                              key={c.label}
                              className="bg-panel-2 border border-border rounded-lg px-2.5 py-1.5 flex items-center justify-between"
                            >
                              <span className="text-[11px] text-muted">{c.label}</span>
                              <span className="text-[13px] font-medium">{toHiragana(c.form)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

                    <button
                      className="absolute right-0 z-10 -mr-10 w-8 h-8 rounded-full border border-border bg-panel text-muted hover:text-[#171717] hover:border-border-strong flex items-center justify-center transition-colors"
                      onClick={(e) => { e.stopPropagation(); setFlipped(false); setReviewIndex((prev) => (prev + 1) % cards.length); }}
                    >→</button>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 mt-3.5">
                    <button
                      className="text-base py-2 h-10 px-3 rounded-sm border font-medium transition-colors bg-red-50 text-[#b42318] border-red-200 hover:bg-red-100"
                      onClick={() => { handleResult('again'); }}
                    >忘记</button>
                    <button
                      className="text-base py-2 h-10 px-3 rounded-sm border font-medium transition-colors bg-emerald-50 text-[#0f766e] border-emerald-200 hover:bg-emerald-100"
                      onClick={() => handleResult('known')}
                    >记得</button>
                  </div>
                </div>

                {/* Right: remembered list (always visible) */}
                <div className="hidden lg:block">
                  <div className="space-y-1 max-h-[440px] overflow-auto">
                    <div className="text-[10px] text-muted uppercase tracking-wide pl-1">Got it</div>
                    {cards.filter(c => remembered.has(c.id)).map(c => (
                      <div
                        key={c.id}
                        className="text-xs text-accent bg-accent-soft/50 border border-accent/20 rounded-lg px-2 py-1 truncate cursor-pointer hover:bg-accent-soft transition-colors"
                        onClick={() => jumpToCard(c.id)}
                      >{c.frontText}</div>
                    ))}
                  </div>
                </div>
              </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
