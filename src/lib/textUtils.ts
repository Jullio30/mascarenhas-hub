/** Mascarenhas Hub — normalização de texto, Levenshtein e filtros anti-spoiler. */

/** Remove acentos (NFD), caixa, pontuação e espaços duplicados. */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/[\s-]+/g, ' ')
    .trim();
}

/** Normalização para comparação de palavras na rodada (remove plural simples em "s"). */
export function normalizeWord(text: string): string {
  const n = normalize(text);
  return n
    .split(' ')
    .map((w) => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w))
    .join(' ');
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

function longestCommonSubstring(a: string, b: string): number {
  let best = 0;
  const dp = new Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    for (let j = b.length; j >= 1; j--) {
      dp[j] = a[i - 1] === b[j - 1] ? dp[j - 1] + 1 : 0;
      if (dp[j] > best) best = dp[j];
    }
  }
  return best;
}

/**
 * Mega Senha: valida a dica do Passador.
 * Retorna mensagem de erro ou null se a dica for válida.
 */
export function validateClue(clue: string, secret: string): string | null {
  const raw = clue.trim();
  if (!raw) return 'Digite uma dica.';
  if (/\s/.test(raw)) return 'Dica inválida: use apenas UMA palavra!';
  const c = normalize(raw).replace(/\s/g, '');
  const s = normalize(secret).replace(/\s/g, '');
  if (!c) return 'Dica inválida.';
  if (c === s || c.includes(s) || (c.length >= 3 && s.includes(c)) || longestCommonSubstring(c, s) > 4) {
    return 'Dica inválida: não use partes da palavra secreta nem mais de uma palavra!';
  }
  return null;
}

/** Mega Senha: aceita erro de 1 caractere para palavras com 5+ letras. */
export function isGuessCorrect(guess: string, secret: string): boolean {
  const g = normalize(guess);
  const s = normalize(secret);
  if (!g) return false;
  if (g === s) return true;
  return s.length >= 5 && levenshtein(g, s) <= 1;
}

function stripParens(s: string): string {
  return s.replace(/\(.*?\)/g, '').trim();
}

/** Adivinhe a Música: aceita grafias alternativas e Levenshtein ≤ 2. */
export function isSongMatch(guess: string, title: string, aliases: string[] = []): boolean {
  const g = normalize(guess);
  if (g.length < 2) return false;
  const targets = [title, stripParens(title), ...aliases].map(normalize).filter(Boolean);
  return targets.some((t) => {
    if (g === t) return true;
    const tolerance = t.length >= 6 ? 2 : t.length >= 4 ? 1 : 0;
    return levenshtein(g, t) <= tolerance;
  });
}

/** Sanitiza apelido: remove tags HTML, espaços duplicados e limita a 16 caracteres. */
export function sanitizeNickname(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 16);
}

export function sanitizeShortText(input: string, max = 40): string {
  return input.replace(/<[^>]*>/g, '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
}
