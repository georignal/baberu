/**
 * Document parser: splits raw text into segments (paragraphs) and sentences.
 */

export interface ParsedDocument {
  segments: ParsedSegment[];
}

export interface ParsedSegment {
  paragraphIndex: number;
  text: string;
  startOffset: number;
  endOffset: number;
  sentences: ParsedSentence[];
}

export interface ParsedSentence {
  sentenceIndex: number;
  text: string;
  startOffset: number;
  endOffset: number;
}

// Japanese sentence-ending characters and patterns
const SENTENCE_END = /[。！？!?\n]+/;

export function parseDocument(rawText: string): ParsedDocument {
  const cleaned = rawText.replace(/\r/g, '').replace(/\t/g, ' ');
  const segments: ParsedSegment[] = [];

  // Split into paragraphs by double newlines or single newlines
  const paraTexts = cleaned.split(/\n{2,}/).filter((p) => p.trim().length > 0);

  let globalOffset = 0;
  let paraIdx = 0;

  for (const paraText of paraTexts) {
    const paraStart = cleaned.indexOf(paraText, globalOffset);
    if (paraStart === -1) continue;

    const paraEnd = paraStart + paraText.length;
    const segment: ParsedSegment = {
      paragraphIndex: paraIdx,
      text: paraText.trim(),
      startOffset: paraStart,
      endOffset: paraEnd,
      sentences: [],
    };

    // Split paragraph into sentences
    const rawSentences = splitSentences(paraText);
    let sentIdx = 0;
    let sentOffsetInPara = 0;

    for (const sentenceText of rawSentences) {
      const trimmed = sentenceText.trim();
      if (!trimmed) continue;

      const sentStartInDoc = paraStart + sentOffsetInPara + (sentenceText.length - trimmed.length > 0 ? 0 : 0);
      // Find actual start in the paragraph
      const actualStart = paraText.indexOf(trimmed, sentOffsetInPara);
      const sentStart = actualStart >= 0 ? paraStart + actualStart : sentStartInDoc;
      const sentEnd = sentStart + trimmed.length;

      segment.sentences.push({
        sentenceIndex: sentIdx,
        text: trimmed,
        startOffset: sentStart,
        endOffset: sentEnd,
      });

      sentIdx++;
      sentOffsetInPara = actualStart >= 0 ? actualStart + trimmed.length : sentOffsetInPara + trimmed.length;
    }

    segments.push(segment);
    paraIdx++;
    globalOffset = paraEnd;
  }

  return { segments };
}

function splitSentences(text: string): string[] {
  const sentences: string[] = [];
  let current = '';

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    current += ch;

    if (SENTENCE_END.test(ch)) {
      // Handle multiple consecutive sentence-ending chars
      while (i + 1 < text.length && SENTENCE_END.test(text[i + 1])) {
        i++;
        current += text[i];
      }
      if (current.trim()) {
        sentences.push(current);
        current = '';
      }
    }
  }

  // Push remaining text if any
  if (current.trim()) {
    sentences.push(current);
  }

  // Also split on single newlines within paragraphs
  const result: string[] = [];
  for (const s of sentences) {
    const parts = s.split(/\n/).filter((p) => p.trim());
    result.push(...parts);
  }

  return result;
}
