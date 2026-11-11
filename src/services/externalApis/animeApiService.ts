/** Jikan API v4 (MyAnimeList) — sem chave, CORS *. Limite: 3 req/s e 60 req/min (throttle de 350 ms). */
import { cachedFetch, isFiniteNum } from './apiClient';

export interface AnimeInfo {
  id: number;
  title: string;
  year: number | null;
  episodes: number | null;
  score: number | null;
  image: string | null;
}

interface RawAnime {
  mal_id: number;
  title: string;
  title_english?: string | null;
  episodes: number | null;
  score: number | null;
  year?: number | null;
  aired?: { prop?: { from?: { year?: number | null } } };
  images?: { jpg?: { image_url?: string | null } };
}

function toAnime(a: RawAnime): AnimeInfo {
  const year = a.aired?.prop?.from?.year ?? a.year ?? null;
  return {
    id: a.mal_id,
    title: a.title_english || a.title,
    year: isFiniteNum(year) ? year : null,
    episodes: isFiniteNum(a.episodes) ? a.episodes : null,
    score: isFiniteNum(a.score) ? a.score : null,
    image: a.images?.jpg?.image_url ?? null,
  };
}

export async function fetchTopAnime(page = 1): Promise<AnimeInfo[]> {
  const list = await cachedFetch(
    `jikan/top/anime/${page}`,
    `https://api.jikan.moe/v4/top/anime?sfw=true&limit=25&page=${page}`,
    (json) => {
      const data = (json as { data?: RawAnime[] })?.data;
      if (!Array.isArray(data)) return null;
      const out = data.filter((a) => isFiniteNum(a.mal_id) && a.title).map(toAnime);
      return out.length >= 5 ? out : null;
    },
    { minGapMs: 350 },
  );
  return list ?? [];
}
