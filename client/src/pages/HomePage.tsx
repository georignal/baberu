import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { api } from '@/shared/api/client';
import Calendar from './Calendar';
import type { ReviewStats, Card } from '@/shared/api/types';

export default function HomePage() {
  const { documents, cards, loading, fetchDocuments, fetchCards, getReviewStats } = useApp();
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [dueCards, setDueCards] = useState<Card[]>([]);
  const [dueTotal, setDueTotal] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDocuments();
    fetchCards();
    getReviewStats().then(setStats).catch(() => {});
    api.getDueCards().then(r => { setDueCards(r.cards); setDueTotal(r.total); }).catch(() => {});
  }, [fetchDocuments, fetchCards, getReviewStats]);

  if (loading) return <div className="max-w-2xl mx-auto mt-12"><div className="text-muted text-sm">Loading...</div></div>;

  return (
    <div className="max-w-2xl mx-auto mt-12">
      <h1 className="text-2xl font-bold tracking-tight mb-2">baberu</h1>
      <p className="text-muted mb-8">Document-based Japanese vocabulary learning</p>

      <div className="grid grid-cols-3 gap-3.5 mb-4">
        <Link to="/documents" className="panel p-5 no-underline hover:border-border-strong transition-colors">
          <div className="text-2xl font-bold">{documents.length}</div><div className="text-muted text-sm mt-1">Documents</div>
        </Link>
        <Link to="/cards" className="panel p-5 no-underline hover:border-border-strong transition-colors">
          <div className="text-2xl font-bold">{cards.length}</div><div className="text-muted text-sm mt-1">Cards</div>
        </Link>
        <Link to="/cards" className="panel p-5 no-underline hover:border-border-strong transition-colors bg-accent-soft border-accent/20">
          <div className="text-2xl font-bold">{dueTotal}</div><div className="text-muted text-sm mt-1">Due</div>
        </Link>
      </div>

      {dueCards.length > 0 && (
        <div className="panel mb-4">
          <div className="panel-header flex items-center justify-between">
            <span className="font-semibold text-sm tracking-tight">Due for Review</span>
            <Link to="/cards" className="text-xs text-accent">Review all →</Link>
          </div>
          <div className="panel-body p-2">
            <div className="flex flex-wrap gap-1.5">
              {dueCards.map(c => (
                <button
                  key={c.id}
                  className="text-xs bg-accent-soft/50 border border-accent/20 rounded-lg px-2 py-1 hover:bg-accent-soft transition-colors text-[#115e59] cursor-pointer"
                  onClick={() => navigate('/cards', { state: { review: true, cardId: c.id } })}
                >
                  {c.frontText}
                  {(c as any).reviewStage > 0 && <span className="text-[10px] text-subtle ml-1">Lv{(c as any).reviewStage}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {stats && (
          <div className="panel">
            <div className="panel-header"><span className="font-semibold tracking-tight">Review Stats</span></div>
            <div className="panel-body">
              <div className="flex gap-4 text-sm flex-wrap">
                <div><span className="text-muted">Reviewed today:</span> <span className="font-semibold">{stats.reviewedToday}</span></div>
                {stats.byStatus && Object.entries(stats.byStatus).map(([s,c]) => <div key={s}><span className="text-muted capitalize">{s}:</span> <span className="font-semibold">{c}</span></div>)}
              </div>
            </div>
          </div>
        )}
        <Calendar />
      </div>

      <div className="flex gap-3 justify-center">
        <Link to="/import" className="btn-primary text-xs no-underline">Import Text</Link>
        <Link to="/cards" className="btn-soft text-xs no-underline">Open Cards</Link>
      </div>
    </div>
  );
}
