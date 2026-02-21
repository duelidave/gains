import { format, parseISO, type Locale } from 'date-fns';
import { de, enUS } from 'date-fns/locale';

const locales: Record<string, Locale> = { de, en: enUS };

/**
 * Format a date string with locale-aware patterns.
 * - 'long': "Freitag, 21. Februar 2026" (de) / "Friday, February 21, 2026" (en)
 * - 'longNoYear': "Freitag, 21. Februar" (de) / "Friday, February 21" (en)
 * - 'short': "21. Feb 2026" (de) / "Feb 21, 2026" (en)
 * - 'compact': "21. Feb" (de) / "Feb 21" (en)
 */
export function formatDate(
  dateStr: string,
  style: 'long' | 'longNoYear' | 'short' | 'compact',
  lang: string,
): string {
  const locale = locales[lang] || enUS;
  const date = parseISO(dateStr);

  switch (style) {
    case 'long':
      return lang === 'de'
        ? format(date, 'EEEE, d. MMMM yyyy', { locale })
        : format(date, 'EEEE, MMMM d, yyyy', { locale });
    case 'longNoYear':
      return lang === 'de'
        ? format(date, 'EEEE, d. MMMM', { locale })
        : format(date, 'EEEE, MMMM d', { locale });
    case 'short':
      return lang === 'de'
        ? format(date, 'd. MMM yyyy', { locale })
        : format(date, 'MMM d, yyyy', { locale });
    case 'compact':
      return lang === 'de'
        ? format(date, 'd. MMM', { locale })
        : format(date, 'MMM d', { locale });
  }
}
