import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import type { SourceContext } from '@/shared/api/types';

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

export default function SourceContextPage() {
  const { cardId } = useParams<{ cardId: string }>();
  const { getCardSource } = useApp();
  const [ctx, setCtx] = useState<SourceContext | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cardId) return;
    setLoading(true);
    getCardSource(cardId)
      .then(setCtx)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [cardId, getCardSource]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto mt-8 text-center text-muted text-sm">Loading...</div>
    );
  }

  if (!ctx) {
    return (
      <div className="max-w-2xl mx-auto mt-8 text-center text-subtle text-sm">
        Source not found.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-8">
      <div className="panel">
        <div className="panel-header">
          <span className="font-semibold tracking-tight">Source Context</span>
          <span className="text-muted text-xs">{ctx.documentTitle}</span>
        </div>
        <div className="panel-body p-0">
          {ctx.previousSentence && (
            <div className="border-b border-border py-3.5 px-4 text-[#3f3f3f]">
              {ctx.previousSentence}
            </div>
          )}
          <div className="border-b border-border py-3.5 px-4 bg-[#fff8db] text-[#171717] font-medium">
            {highlightWord(ctx.sentence, ctx.highlight.word)}
          </div>
          {ctx.nextSentence && (
            <div className="py-3.5 px-4 text-[#3f3f3f]">
              {ctx.nextSentence}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
