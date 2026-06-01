import { useState, useCallback } from 'react';

/**
 * SpeakButton: uses browser's built-in Speech Synthesis API
 * to pronounce Japanese text. Free, works offline.
 */
export default function SpeakButton({
  text,
  lang = 'ja-JP',
  size = 'sm',
}: {
  text: string;
  lang?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const [speaking, setSpeaking] = useState(false);

  const speak = useCallback(() => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.85;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, [text, lang]);

  const sizeClass = size === 'lg' ? 'w-8 h-8 text-base' : size === 'md' ? 'w-7 h-7 text-sm' : 'w-6 h-6 text-xs';

  return (
    <button
      className={`${sizeClass} rounded-full border border-border bg-panel hover:bg-accent-soft hover:border-accent transition-colors flex items-center justify-center shrink-0 ${speaking ? 'text-accent border-accent bg-accent-soft' : 'text-muted'}`}
      onClick={(e) => { e.stopPropagation(); speak(); }}
      title="Pronounce"
    >
      🔊
    </button>
  );
}
