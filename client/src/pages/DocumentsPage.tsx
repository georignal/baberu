import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';

export default function DocumentsPage() {
  const { documents, loading, fetchDocuments, deleteDocument } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleDelete = async (id: string) => {
    await deleteDocument(id);
  };

  return (
    <div className="panel max-w-3xl mx-auto" style={{ minHeight: 'calc(100vh - 56px - 32px)' }}>
      <div className="panel-header">
        <span className="font-semibold tracking-tight">Documents</span>
        <Link to="/import" className="btn-primary text-xs no-underline">
          + Import
        </Link>
      </div>
      <div className="panel-body">
        {loading ? (
          <div className="grid place-items-center py-12 text-muted text-sm">Loading...</div>
        ) : documents.length === 0 ? (
          <div className="grid place-items-center py-12">
            <div className="text-center">
              <p className="text-subtle text-sm mb-4">No documents yet.</p>
              <Link to="/import" className="btn-primary no-underline text-xs">
                Import your first document
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="border border-border rounded-xl p-3 bg-panel-2 flex items-center justify-between gap-3 cursor-pointer hover:border-border-strong transition-colors"
                onClick={() => navigate(`/documents/${doc.id}`)}
              >
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{doc.title}</div>
                  <div className="text-muted text-xs mt-0.5">
                    {doc.sentenceCount ?? 0} sentences · {doc.candidateCount ?? 0} candidates ·{' '}
                    {doc.cardCount ?? 0} cards
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-subtle text-[11px] uppercase bg-white px-2 py-0.5 rounded-full border border-border">
                    {doc.fileType}
                  </span>
                  <button
                    className="btn-icon text-danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(doc.id);
                    }}
                  >
                    Del
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
