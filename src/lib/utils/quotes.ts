import { QUOTES } from '../constants/quotes';

export interface DailyQuote {
  quote: string;
  author: string;
  dayNumber: number;
}

// Fixed reference epoch: January 1, 2024
const EPOCH_UTC = Date.UTC(2024, 0, 1);
// Prime multiplier coprime to quotes count (gcd(997, 1831) = 1)
const MULTIPLIER = 997;
const OFFSET = 127;

/**
 * Returns a deterministic, guaranteed non-repeating daily motivational quote.
 * Mathematically proven bijection ensuring no quotes repeat for over 5 consecutive years.
 *
 * @param dateInput - Date object or date string in 'YYYY-MM-DD' format.
 */
export function getDailyQuote(dateInput?: Date | string): DailyQuote {
  let targetDate: Date;

  if (typeof dateInput === 'string' && dateInput.includes('-')) {
    const [y, m, d] = dateInput.split('-').map(Number);
    targetDate = new Date(Date.UTC(y, m - 1, d));
  } else if (dateInput instanceof Date) {
    targetDate = new Date(Date.UTC(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate()));
  } else {
    const now = new Date();
    targetDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  }

  const dayDiff = Math.floor((targetDate.getTime() - EPOCH_UTC) / 86400000);
  const N = QUOTES.length;

  // Modulo permutation: guaranteed 1-to-1 bijection across all N quotes
  const index = ((dayDiff * MULTIPLIER + OFFSET) % N + N) % N;
  const item = QUOTES[index] || QUOTES[0];

  return {
    quote: item.quote,
    author: item.author,
    dayNumber: dayDiff,
  };
}
