/**
 * Japanese morphology utilities:
 *  - katakana → hiragana conversion
 *  - hiragana → romaji conversion
 *  - verb/adjective conjugation tables
 */

const KATA_START = 0x30a1;
const HIRA_START = 0x3041;
const KATA_TO_HIRA_OFFSET = HIRA_START - KATA_START;

/** Convert a katakana string to hiragana. */
export function kataToHira(str: string): string {
  return str.replace(/[\u30a1-\u30f6]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) + KATA_TO_HIRA_OFFSET),
  );
}

/** Ensure reading is displayed in hiragana (convert if katakana). */
export function toHiragana(reading: string): string {
  if (!reading) return '';
  const hasHiragana = /[\u3040-\u309f]/.test(reading);
  if (hasHiragana) return reading;
  const hasKatakana = /[\u30a0-\u30ff]/.test(reading);
  if (hasKatakana) return kataToHira(reading);
  return reading;
}

// ---------------------------------------------------------------------------
// Hiragana → Romaji
// ---------------------------------------------------------------------------

const HIRA_ROMAJI: Record<string, string> = {
  あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o',
  か: 'ka', き: 'ki', く: 'ku', け: 'ke', こ: 'ko',
  が: 'ga', ぎ: 'gi', ぐ: 'gu', げ: 'ge', ご: 'go',
  さ: 'sa', し: 'shi', す: 'su', せ: 'se', そ: 'so',
  ざ: 'za', じ: 'ji', ず: 'zu', ぜ: 'ze', ぞ: 'zo',
  た: 'ta', ち: 'chi', つ: 'tsu', て: 'te', と: 'to',
  だ: 'da', ぢ: 'ji', づ: 'zu', で: 'de', ど: 'do',
  な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no',
  は: 'ha', ひ: 'hi', ふ: 'fu', へ: 'he', ほ: 'ho',
  ば: 'ba', び: 'bi', ぶ: 'bu', べ: 'be', ぼ: 'bo',
  ぱ: 'pa', ぴ: 'pi', ぷ: 'pu', ぺ: 'pe', ぽ: 'po',
  ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo',
  や: 'ya', ゆ: 'yu', よ: 'yo',
  ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro',
  わ: 'wa', を: 'o', ん: 'n',
  きゃ: 'kya', きゅ: 'kyu', きょ: 'kyo',
  ぎゃ: 'gya', ぎゅ: 'gyu', ぎょ: 'gyo',
  しゃ: 'sha', しゅ: 'shu', しょ: 'sho',
  じゃ: 'ja', じゅ: 'ju', じょ: 'jo',
  ちゃ: 'cha', ちゅ: 'chu', ちょ: 'cho',
  にゃ: 'nya', にゅ: 'nyu', にょ: 'nyo',
  ひゃ: 'hya', ひゅ: 'hyu', ひょ: 'hyo',
  びゃ: 'bya', びゅ: 'byu', びょ: 'byo',
  ぴゃ: 'pya', ぴゅ: 'pyu', ぴょ: 'pyo',
  みゃ: 'mya', みゅ: 'myu', みょ: 'myo',
  りゃ: 'rya', りゅ: 'ryu', りょ: 'ryo',
  っ: '', // small tsu handled separately
  ー: '', // long vowel mark
  ぁ: 'a', ぃ: 'i', ぅ: 'u', ぇ: 'e', ぉ: 'o',
};

export function hiraganaToRomaji(str: string): string {
  if (!str) return '';
  let result = '';
  let i = 0;
  while (i < str.length) {
    // Check for two-char kana (digraphs)
    const two = str.slice(i, i + 2);
    if (HIRA_ROMAJI[two]) {
      result += HIRA_ROMAJI[two];
      i += 2;
      continue;
    }
    const ch = str[i];
    if (ch === 'っ' || ch === 'ッ') {
      // Small tsu: double the following consonant
      if (i + 1 < str.length) {
        const next = HIRA_ROMAJI[str[i + 1]] || '';
        if (next) result += next[0] || next;
      }
      i++;
      continue;
    }
    if (ch === 'ー') {
      // Long vowel: double previous vowel
      const prev = result[result.length - 1];
      if (prev && 'aeiou'.includes(prev)) result += prev;
      i++;
      continue;
    }
    result += HIRA_ROMAJI[ch] || ch;
    i++;
  }
  return result;
}

/** Convert any reading (katakana or hiragana) to romaji. */
export function toRomaji(reading: string): string {
  return hiraganaToRomaji(toHiragana(reading));
}

// ---------------------------------------------------------------------------
// Verb conjugations
// ---------------------------------------------------------------------------

type Conjugation = { label: string; form: string }[];

/** Ichidan verbs: end in -iru / -eru (but not all — approximation) */
function isIchidan(lemma: string): boolean {
  if (lemma === 'する' || lemma === 'くる' || lemma === '来る') return false;
  if (lemma.length < 2) return false;
  const last2 = lemma.slice(-2);
  if (
    last2 === 'いる' ||
    last2 === 'える' ||
    last2 === 'ける' ||
    last2 === 'げる' ||
    last2 === 'せる' ||
    last2 === 'てる' ||
    last2 === 'でる' ||
    last2 === 'ねる' ||
    last2 === 'べる' ||
    last2 === 'める' ||
    last2 === 'れる'
  ) {
    return true;
  }
  return false;
}

function isGodan(lemma: string): boolean {
  return !isIchidan(lemma) && lemma !== 'する' && lemma !== 'くる' && lemma !== '来る';
}

// Godan conjugation rules by ending consonant
const GODAN_RULES: Record<string, { stemDrop: number; endings: Record<string, string> }> = {
  う: {
    stemDrop: 1,
    endings: { masu: 'い', te: 'って', ta: 'った', nai: 'わ', ba: 'え', potential: 'え', imperative: 'え', volitional: 'おう' },
  },
  く: {
    stemDrop: 1,
    endings: { masu: 'き', te: 'いて', ta: 'いた', nai: 'か', ba: 'け', potential: 'け', imperative: 'け', volitional: 'こう' },
  },
  ぐ: {
    stemDrop: 1,
    endings: { masu: 'ぎ', te: 'いで', ta: 'いだ', nai: 'が', ba: 'げ', potential: 'げ', imperative: 'げ', volitional: 'ごう' },
  },
  す: {
    stemDrop: 1,
    endings: { masu: 'し', te: 'して', ta: 'した', nai: 'さ', ba: 'せ', potential: 'せ', imperative: 'せ', volitional: 'そう' },
  },
  つ: {
    stemDrop: 1,
    endings: { masu: 'ち', te: 'って', ta: 'った', nai: 'た', ba: 'て', potential: 'て', imperative: 'て', volitional: 'とう' },
  },
  ぬ: {
    stemDrop: 1,
    endings: { masu: 'に', te: 'んで', ta: 'んだ', nai: 'な', ba: 'ね', potential: 'ね', imperative: 'ね', volitional: 'のう' },
  },
  ぶ: {
    stemDrop: 1,
    endings: { masu: 'び', te: 'んで', ta: 'んだ', nai: 'ば', ba: 'べ', potential: 'べ', imperative: 'べ', volitional: 'ぼう' },
  },
  む: {
    stemDrop: 1,
    endings: { masu: 'み', te: 'んで', ta: 'んだ', nai: 'ま', ba: 'め', potential: 'め', imperative: 'め', volitional: 'もう' },
  },
  る: {
    stemDrop: 1,
    endings: { masu: 'り', te: 'って', ta: 'った', nai: 'ら', ba: 'れ', potential: 'れ', imperative: 'れ', volitional: 'ろう' },
  },
};

export function getVerbConjugations(lemma: string): Conjugation {
  if (lemma === 'する') {
    return [
      { label: '辞書形', form: 'する' },
      { label: 'ます形', form: 'します' },
      { label: 'て形', form: 'して' },
      { label: 'た形', form: 'した' },
      { label: 'ない形', form: 'しない' },
      { label: 'ば形', form: 'すれば' },
      { label: '可能形', form: 'できる' },
    ];
  }
  if (lemma === 'くる' || lemma === '来る') {
    return [
      { label: '辞書形', form: 'くる' },
      { label: 'ます形', form: 'きます' },
      { label: 'て形', form: 'きて' },
      { label: 'た形', form: 'きた' },
      { label: 'ない形', form: 'こない' },
      { label: 'ば形', form: 'くれば' },
      { label: '可能形', form: 'こられる' },
    ];
  }

  if (isIchidan(lemma)) {
    const stem = lemma.slice(0, -1);
    return [
      { label: '辞書形', form: lemma },
      { label: 'ます形', form: stem + 'ます' },
      { label: 'て形', form: stem + 'て' },
      { label: 'た形', form: stem + 'た' },
      { label: 'ない形', form: stem + 'ない' },
      { label: 'ば形', form: stem + 'れば' },
      { label: '可能形', form: stem + 'られる' },
    ];
  }

  if (isGodan(lemma)) {
    const ending = lemma.slice(-1);
    const rule = GODAN_RULES[ending];
    if (!rule) return [];

    const stem = lemma.slice(0, -rule.stemDrop);
    return [
      { label: '辞書形', form: lemma },
      { label: 'ます形', form: stem + rule.endings.masu + 'ます' },
      { label: 'て形', form: stem + rule.endings.te },
      { label: 'た形', form: stem + rule.endings.ta },
      { label: 'ない形', form: stem + rule.endings.nai + 'ない' },
      { label: 'ば形', form: stem + rule.endings.ba + 'ば' },
      { label: '可能形', form: stem + rule.endings.potential + 'る' },
    ];
  }

  return [];
}

// ---------------------------------------------------------------------------
// Adjective conjugations
// ---------------------------------------------------------------------------

export function getAdjectiveConjugations(lemma: string): Conjugation {
  if (lemma.endsWith('い')) {
    const stem = lemma.slice(0, -1);
    return [
      { label: '辞書形', form: lemma },
      { label: '連用形', form: stem + 'く' },
      { label: 'て形', form: stem + 'くて' },
      { label: 'た形', form: stem + 'かった' },
      { label: 'ない形', form: stem + 'くない' },
      { label: 'ば形', form: stem + 'ければ' },
    ];
  }
  // 形容動詞 (na-adjectives)
  if (lemma.endsWith('だ')) {
    const stem = lemma.slice(0, -1);
    return [
      { label: '辞書形', form: lemma },
      { label: '連用形', form: stem + 'に' },
      { label: 'て形', form: stem + 'で' },
      { label: 'た形', form: stem + 'だった' },
      { label: 'ない形', form: stem + 'ではない' },
      { label: 'ば形', form: stem + 'なら（ば）' },
    ];
  }
  return [];
}
