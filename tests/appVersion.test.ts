import { describe, expect, it } from 'vitest';
import { fetchPublishedVersion, isOutdated } from '../src/lib/appVersion';
import { legacySender } from '../src/core/realtime/secureEnvelope';

const fakeFetch = (body: unknown, ok = true) => (async () => ({ ok, json: async () => body })) as unknown as typeof fetch;

describe('Aviso de versão nova publicada', () => {
  it('lê a versão publicada em version.json, sem cache', async () => {
    let url = '';
    let init: RequestInit | undefined;
    const f = (async (u: string, i?: RequestInit) => {
      url = u;
      init = i;
      return { ok: true, json: async () => ({ version: 'abc-1' }) };
    }) as unknown as typeof fetch;
    expect(await fetchPublishedVersion(f, '/mascarenhas-hub/')).toBe('abc-1');
    expect(url).toMatch(/^\/mascarenhas-hub\/version\.json\?t=\d+$/);
    expect(init?.cache).toBe('no-store');
  });

  it('erro de rede, 404 ou arquivo inválido nunca disparam o aviso', async () => {
    const boom = (async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    expect(await fetchPublishedVersion(boom, '/')).toBeNull();
    expect(await fetchPublishedVersion(fakeFetch({ version: 'x' }, false), '/')).toBeNull();
    expect(await fetchPublishedVersion(fakeFetch({ nada: 1 }), '/')).toBeNull();
    expect(await fetchPublishedVersion(fakeFetch(null), '/')).toBeNull();
    expect(await fetchPublishedVersion(fakeFetch({ version: '' }), '/')).toBeNull();
  });

  it('só acusa desatualizado com certeza: versões diferentes e build real', () => {
    expect(isOutdated('b', 'a')).toBe(true);
    expect(isOutdated('a', 'a')).toBe(false);
    expect(isOutdated(null, 'a')).toBe(false);
    expect(isOutdated('b', 'dev')).toBe(false);
  });
});

describe('Jogador com versão antiga (mensagem sem assinatura)', () => {
  it('reconhece o formato antigo e devolve o remetente', () => {
    expect(legacySender({ t: 'action', from: 'p1', a: { type: 'VOTE' } })).toBe('p1');
    expect(legacySender({ t: 'hello', from: 'p2', profile: {} })).toBe('p2');
  });

  it('envelope assinado, lixo e objetos sem remetente não são confundidos com versão antiga', () => {
    expect(legacySender({ v: 1, room: 'ABC234', from: 'p1', seq: 1, data: '{}', pk: {}, sig: 'x' })).toBeNull();
    for (const junk of [null, undefined, 1, 'x', [], {}, { t: 'action' }, { from: 'p1' }, { t: 1, from: 'p1' }, { t: 'a', from: '' }]) {
      expect(legacySender(junk)).toBeNull();
    }
  });
});
