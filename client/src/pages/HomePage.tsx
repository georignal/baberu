import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import Calendar from './Calendar';
import type { ReviewStats } from '@/shared/api/types';

export default function HomePage() {
  const { documents, cards, loading, fetchDocuments, fetchCards, getReviewStats } = useApp();
  const [stats, setStats] = useState<ReviewStats | null>(null);

  useEffect(() => {
    fetchDocuments();
    fetchCards();
    getReviewStats().then(setStats).catch(() => {});
  }, [fetchDocuments, fetchCards, getReviewStats]);

  const newCards = cards.filter((c) => c.status === 'new').length;

  return (
    <div className="max-w-2xl mx-auto mt-12">
      <h1 className="text-2xl font-bold tracking-tight mb-2">baberu</h1>
      <p className="text-muted mb-8">Document-based Japanese vocabulary learning</p>

      {loading ? (
        <div className="text-muted text-sm">Loading...</div>
      ) : (
        <div className="grid grid-cols-3 gap-3.5 mb-8">
          <Link
            to="/documents"
            className="panel p-5 no-underline hover:border-border-strong transition-colors"
          >
            <div className="text-2xl font-bold">{documents.length}</div>
            <div className="text-muted text-sm mt-1">Documents</div>
          </Link>
          <Link
            to="/cards"
            className="panel p-5 no-underline hover:border-border-strong transition-colors"
          >
            <div className="text-2xl font-bold">{cards.length}</div>
            <div className="text-muted text-sm mt-1">Cards</div>
          </Link>
          <Link
            to="/cards"
            className="panel p-5 no-underline hover:border-border-strong transition-colors bg-accent-soft border-accent/20"
          >
            <div className="text-2xl font-bold">{newCards}</div>
            <div className="text-muted text-sm mt-1">New</div>
          </Link>
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
