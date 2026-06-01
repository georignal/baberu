import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '@/context/AppContext';

export default function CandidatesPage() {
  const { id } = useParams<{ id: string }>();
  const { candidates, cards, fetchCandidates, createCard } = useApp();
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (id) fetchCandidates(id);
  }, [id, fetchCandidates]);

  const filtered = candidates.filter((c) => {
    if (filter === 'unadded') return !cards.some((card) => card.frontText === c.word);
    if (filter === 'added') return cards.some((card) => card.frontText === c.word);
    return true;
  });

  const isInCards = (word: string) => cards.some((c) => c.frontText === word);

  return (
    <div className="panel max-w-3xl mx-auto" style={{ minHeight: 'calc(100vh - 56px - 32px)' }}>
      <div className="panel-header">
        <span className="font-semibold tracking-tight">Vocabulary Candidates</span>
        <select
          className="text-xs border border-border rounded-sm px-2 py-1 bg-white"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All</option>
          <option value="unadded">Not added</option>
          <option value="added">In cards</option>
        </select>
      </div>
      <div className="panel-body">
        {filtered.length === 0 ? (
          <div className="grid place-items-center py-12 text-subtle text-sm">
            {candidates.length === 0
              ? 'No candidates. Extract vocabulary from a document first.'
              : 'No matching candidates.'}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((cand) => (
              <div key={cand.id} className="border border-border rounded-xl p-3 bg-panel-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div>
                    <span className="font-bold text-[15px] tracking-tight">{cand.word}</span>
                    <span className="text-muted text-xs ml-1.5">{cand.reading}</span>
                    <span className="text-subtle text-[10px] ml-1.5 bg-white px-1.5 py-0.5 rounded-full border border-border">
                      {cand.partOfSpeech}
                    </span>
                  </div>
                  <div className="text-[#3f3f3f] text-[13px] mt-1">{cand.meaning}</div>
                  <div className="text-subtle text-[11px] mt-1 truncate max-w-xs">{cand.sentenceText}</div>
                </div>
                <button
                  className={`btn-icon text-xs shrink-0 ${isInCards(cand.word) ? 'opacity-40' : 'text-accent'}`}
                  onClick={() => createCard(cand)}
                  disabled={isInCards(cand.word)}
                >
                  {isInCards(cand.word) ? 'Added' : 'Add to cards'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
