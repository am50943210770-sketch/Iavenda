import { ShoeItem } from '../types/inventory';

// Map Eastern Arabic and Persian/Urdu numerals to Western Arabic numerals
const ARABIC_INDIC_DIGITS: { [key: string]: string } = {
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',
  '۰': '0',
  '۱': '1',
  '۲': '2',
  '۳': '3',
  '۴': '4',
  '۵': '5',
  '۶': '6',
  '۷': '7',
  '۸': '8',
  '۹': '9',
};

/**
 * Normalizes Arabic text for flexible, error-tolerant searching:
 * - Converts Eastern Arabic numerals (٠-٩ / ۰-۹) to standard Western digits (0-9)
 * - Normalizes Alef variations (أ, إ, آ, ٱ -> ا)
 * - Normalizes Teh Marbuta and Heh (ة -> ه)
 * - Normalizes Ya variations (ى, ئ -> ي)
 * - Normalizes Waw with Hamza (ؤ -> و)
 * - Removes Tashkeel (diacritics: Fatha, Damma, Kasra, Tanween, Shadda, Sukun)
 * - Removes Tatweel (ـ)
 * - Collapses spaces and normalizes unit spacing (e.g. "5 سم" <-> "5سم")
 */
export function normalizeSearchText(text: string | undefined | null): string {
  if (!text) return '';

  let normalized = text.toString().toLowerCase();

  // Convert Arabic/Persian digits to standard Western digits
  normalized = normalized.replace(/[٠-٩۰-۹]/g, (digit) => ARABIC_INDIC_DIGITS[digit] || digit);

  // Normalize Arabic letters
  normalized = normalized
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىئ]/g, 'ي')
    .replace(/ؤ/g, 'و');

  // Remove Tashkeel & Tatweel
  normalized = normalized.replace(/[\u064B-\u065F\u0670\u0640]/g, '');

  // Replace punctuation with spaces
  normalized = normalized.replace(/[-_.,/:;()"'`!؟?+[\]{}|\\]/g, ' ');

  // Collapse multiple spaces
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
}

/**
 * Normalizes text and compacts unit spacing so "5 سم" matches "5سم" and "كعب 5 سم" matches "كعب 5سم"
 */
export function compactUnits(text: string): string {
  // Collapse space between numbers and units like "سم", "ملم", "cm", "m"
  return text
    .replace(/(\d+)\s*(سم|ملم|متر|انش|إنش|cm|mm|m)\b/g, '$1$2')
    .replace(/\b(سم|ملم|cm)\s*(\d+)/g, '$1$2');
}

/**
 * Matches a ShoeItem against a search query across all details:
 * - additionalInfo (تفاصيل الكعب ومقاس الكعب، مكان التخزين، نوع الخامة، الملاحظات)
 * - colors (اسم اللون، ملاحظات اللون)
 * - code (رقم الكود)
 * - name (اسم الحذاء أو الموديل)
 * - sizes (المقاسات)
 * - compound queries (e.g. "كعب ٥ سم اسود" matches shoe with heel 5cm in details and black color)
 */
export function matchShoeWithQuery(shoe: ShoeItem, query: string): boolean {
  const rawQuery = query.trim();
  if (!rawQuery) return true;

  const normalizedQuery = normalizeSearchText(rawQuery);
  const compactedQuery = compactUnits(normalizedQuery);

  // Split query into individual search tokens
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  // Build the complete searchable corpus for this shoe
  const codeNorm = normalizeSearchText(shoe.code);
  const nameNorm = normalizeSearchText(shoe.name || '');
  const infoNorm = normalizeSearchText(shoe.additionalInfo || '');
  const colorsNorm = (shoe.colors || [])
    .map((c) => `${normalizeSearchText(c.colorName)} ${normalizeSearchText(c.additionalNotes || '')}`)
    .join(' ');
  const sizesNorm = (shoe.colors || [])
    .flatMap((c) => (c.sizes || []).map((s) => s.size.toString()))
    .join(' ');

  // Combined full profile
  const fullCorpus = `${codeNorm} ${nameNorm} ${infoNorm} ${colorsNorm} ${sizesNorm}`;
  const compactedCorpus = compactUnits(fullCorpus);

  // 1. Check direct substring match (both with standard spacing and compacted unit spacing)
  if (fullCorpus.includes(normalizedQuery) || compactedCorpus.includes(compactedQuery)) {
    return true;
  }

  // 2. Check also without any spaces at all (e.g. user typed "كعب5سم" and corpus is "كعب 5 سم")
  const noSpaceQuery = normalizedQuery.replace(/\s+/g, '');
  const noSpaceCorpus = fullCorpus.replace(/\s+/g, '');
  if (noSpaceQuery.length >= 2 && noSpaceCorpus.includes(noSpaceQuery)) {
    return true;
  }

  // 3. Multi-word compound match: every token in the query must be found in the shoe profile
  // Example: Query is "٥ سم اسود" -> tokens are ["5", "سم", "اسود"]
  // "5" and "سم" are found in infoNorm ("كعب 5 سم"), and "اسود" is found in colorsNorm ("أسود")
  const allTokensMatch = tokens.every((token) => {
    // If token is a number-unit pair like "5سم", check compacted corpus
    const compactedToken = compactUnits(token);
    return (
      fullCorpus.includes(token) ||
      compactedCorpus.includes(compactedToken) ||
      noSpaceCorpus.includes(token)
    );
  });

  return allTokensMatch;
}
