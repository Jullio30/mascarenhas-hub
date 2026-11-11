/** Wikipedia REST API PT-BR — "Neste dia" (eventos históricos verificados). Sem chave, CORS *. */
import { cachedFetch, isFiniteNum } from './apiClient';

export interface HistoryEvent {
  year: number;
  text: string;
}

export async function fetchOnThisDay(date = new Date()): Promise<HistoryEvent[]> {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const list = await cachedFetch(`wikipedia/onthisday/${mm}/${dd}`, `https://pt.wikipedia.org/api/rest_v1/feed/onthisday/events/${mm}/${dd}`, (json) => {
    const events = (json as { events?: { year: number; text: string }[] })?.events;
    if (!Array.isArray(events)) return null;
    const out = events
      .filter((e) => isFiniteNum(e.year) && e.year > 0 && typeof e.text === 'string')
      .map((e) => ({ year: e.year, text: e.text.replace(/\s+/g, ' ').trim() }))
      // descarta textos longos demais ou que já contêm o próprio ano (entregaria a resposta)
      .filter((e) => e.text.length >= 25 && e.text.length <= 140 && !e.text.includes(String(e.year)));
    return out.length >= 6 ? out : null;
  });
  return list ?? [];
}
