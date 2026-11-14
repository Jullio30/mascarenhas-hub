/**
 * Detecção de versão nova publicada.
 * O build grava seu identificador no app (__APP_VERSION__) e em version.json. Se o arquivo publicado
 * mudar, quem está com a página aberta está numa versão antiga — e, como as mensagens da sala são
 * assinadas, versões diferentes podem não se entender. Recarregar é seguro: o F5 mantém a sala.
 */
declare const __APP_VERSION__: string | undefined;

export const APP_VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';

/** Versão publicada no servidor, ou null se não der para saber (dev, offline, erro). */
export async function fetchPublishedVersion(fetcher: typeof fetch = fetch, base = import.meta.env.BASE_URL ?? '/'): Promise<string | null> {
  try {
    const res = await fetcher(`${base}version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    const v = (data as { version?: unknown } | null)?.version;
    return typeof v === 'string' && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

/** true só quando há certeza de que existe uma versão diferente publicada. */
export function isOutdated(published: string | null, current: string = APP_VERSION): boolean {
  return current !== 'dev' && published !== null && published !== current;
}
