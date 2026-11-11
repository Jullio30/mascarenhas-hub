/**
 * Ordem Caótica — catálogo factual auditado + geradores dinâmicos (PokéAPI, IBGE/World Bank, Jikan, Wikipedia).
 * Todo desafio passa por `buildChallenge`, que exige 4–6 elementos com referenceValue finito e ESTRITAMENTE distinto.
 */
import { distinctFinite, fmtNum } from '../../services/externalApis/apiClient';
import type { PokemonInfo } from '../../services/externalApis/pokeApiService';
import type { CountryInfo } from '../../services/externalApis/countriesApiService';
import type { AnimeInfo } from '../../services/externalApis/animeApiService';
import type { HistoryEvent } from '../../services/externalApis/historyApiService';

export interface ChaoticElementPublic {
  id: string;
  label: string;
  subtitle?: string; // NUNCA contém o valor numérico
  imageUrl?: string;
}

export interface ChaoticElementFull extends ChaoticElementPublic {
  referenceValue: number;
  formattedValue: string;
}

export type ChaoticCategory = 'pokemon' | 'animes' | 'animais' | 'astronomia' | 'historia' | 'paises' | 'personagens';

export interface ChaoticChallenge {
  id: string;
  title: string;
  category: ChaoticCategory;
  unit: string;
  sortDirection: 'ASC' | 'DESC';
  topSlotLabel: string;
  bottomSlotLabel: string;
  elements: ChaoticElementFull[];
  correctOrderIds: string[];
  source: string;
  explanation: string;
}

/** Tema escolhido no lobby → categorias aceitas. */
export const THEME_CATEGORIES: Record<string, ChaoticCategory[]> = {
  misto: ['pokemon', 'animes', 'animais', 'astronomia', 'historia', 'paises', 'personagens'],
  pokemon: ['pokemon'],
  animes: ['animes', 'personagens'],
  ciencia: ['astronomia', 'animais'],
  historia: ['historia'],
  paises: ['paises'],
};

interface RawItem {
  label: string;
  value: number;
  formatted: string;
  subtitle?: string;
  imageUrl?: string;
}

interface Spec {
  id: string;
  title: string;
  category: ChaoticCategory;
  unit: string;
  dir: 'ASC' | 'DESC';
  top: string;
  bottom: string;
  source: string;
  explanation: string;
  items: RawItem[];
}

/** Valida e monta um desafio. Retorna null se violar as regras (valores repetidos, não finitos, fora de 4–6). */
export function buildChallenge(spec: Spec): ChaoticChallenge | null {
  const items = spec.items;
  if (items.length < 4 || items.length > 6) return null;
  if (!distinctFinite(items.map((i) => i.value))) return null;
  const elements: ChaoticElementFull[] = items.map((it, i) => ({
    id: `${spec.id}:e${i}`,
    label: it.label,
    subtitle: it.subtitle,
    imageUrl: it.imageUrl,
    referenceValue: it.value,
    formattedValue: it.formatted,
  }));
  const sorted = [...elements].sort((a, b) => (spec.dir === 'ASC' ? a.referenceValue - b.referenceValue : b.referenceValue - a.referenceValue));
  const n = elements.length;
  return {
    id: spec.id,
    title: spec.title,
    category: spec.category,
    unit: spec.unit,
    sortDirection: spec.dir,
    topSlotLabel: `1º — ${spec.top}`,
    bottomSlotLabel: `${n}º — ${spec.bottom}`,
    elements,
    correctOrderIds: sorted.map((e) => e.id),
    source: spec.source,
    explanation: spec.explanation,
  };
}

// ---------- helpers de formatação ----------
const yr = (y: number) => (y < 0 ? `${Math.abs(y)} a.C.` : String(y));
const year = (label: string, y: number, subtitle?: string): RawItem => ({ label, value: y, formatted: yr(y), subtitle });
const num = (label: string, value: number, unit: string, digits = 1, subtitle?: string): RawItem => ({ label, value, formatted: `${fmtNum(value, digits)} ${unit}`.trim(), subtitle });

const NASA = 'NASA Planetary Fact Sheet';
const chrono = { unit: 'ano', dir: 'ASC' as const, top: 'Mais antigo', bottom: 'Mais recente' };

// ---------- catálogo local auditado (43 desafios) ----------
const LOCAL_SPECS: Spec[] = [
  // Astronomia
  { id: 'oc:astro-dist-a', category: 'astronomia', title: 'Ordene os planetas do MAIS PRÓXIMO ao MAIS DISTANTE do Sol', unit: 'milhões de km', dir: 'ASC', top: 'Mais próximo do Sol', bottom: 'Mais distante', source: NASA, explanation: 'Distância média ao Sol, em milhões de quilômetros.', items: [num('Mercúrio', 57.9, 'mi km'), num('Vênus', 108.2, 'mi km'), num('Marte', 228, 'mi km'), num('Júpiter', 778.5, 'mi km'), num('Saturno', 1432, 'mi km')] },
  { id: 'oc:astro-dist-b', category: 'astronomia', title: 'Ordene do MAIS DISTANTE ao MAIS PRÓXIMO do Sol', unit: 'milhões de km', dir: 'DESC', top: 'Mais distante do Sol', bottom: 'Mais próximo', source: NASA, explanation: 'Netuno fica 30 vezes mais longe do Sol que a Terra.', items: [num('Terra', 149.6, 'mi km'), num('Júpiter', 778.5, 'mi km'), num('Urano', 2867, 'mi km'), num('Netuno', 4515, 'mi km'), num('Vênus', 108.2, 'mi km')] },
  { id: 'oc:astro-diam-a', category: 'astronomia', title: 'Ordene do MENOR para o MAIOR diâmetro', unit: 'km', dir: 'ASC', top: 'Menor diâmetro', bottom: 'Maior diâmetro', source: NASA, explanation: 'Diâmetro equatorial. A Lua é menor que Mercúrio, que é menor que Marte.', items: [num('Lua', 3475, 'km', 0, 'Satélite da Terra'), num('Mercúrio', 4879, 'km', 0), num('Marte', 6792, 'km', 0), num('Terra', 12756, 'km', 0), num('Netuno', 49528, 'km', 0), num('Júpiter', 142984, 'km', 0)] },
  { id: 'oc:astro-diam-b', category: 'astronomia', title: 'Ordene do MAIOR para o MENOR diâmetro', unit: 'km', dir: 'DESC', top: 'Maior diâmetro', bottom: 'Menor diâmetro', source: NASA, explanation: 'Plutão (planeta-anão) tem só 2.376 km — menor que a nossa Lua.', items: [num('Saturno', 120536, 'km', 0), num('Urano', 51118, 'km', 0), num('Vênus', 12104, 'km', 0), num('Mercúrio', 4879, 'km', 0), num('Plutão', 2376, 'km', 0, 'Planeta-anão')] },
  { id: 'oc:astro-orbita', category: 'astronomia', title: 'Ordene pelo tempo para dar UMA volta no Sol (do mais rápido ao mais lento)', unit: 'dias terrestres', dir: 'ASC', top: 'Ano mais curto', bottom: 'Ano mais longo', source: NASA, explanation: 'Período orbital: Mercúrio completa o ano em 88 dias; Netuno leva cerca de 165 anos.', items: [num('Mercúrio', 88, 'dias', 0), num('Vênus', 224.7, 'dias'), num('Terra', 365.2, 'dias'), num('Marte', 687, 'dias', 0), num('Júpiter', 4331, 'dias', 0), num('Netuno', 59800, 'dias', 0)] },
  { id: 'oc:astro-massa', category: 'astronomia', title: 'Ordene do MENOS para o MAIS massivo', unit: '10²⁴ kg', dir: 'ASC', top: 'Menor massa', bottom: 'Maior massa', source: NASA, explanation: 'Júpiter sozinho tem mais que o dobro da massa de todos os outros planetas somados.', items: [num('Mercúrio', 0.33, '× 10²⁴ kg', 2), num('Marte', 0.642, '× 10²⁴ kg', 3), num('Terra', 5.97, '× 10²⁴ kg', 2), num('Urano', 86.8, '× 10²⁴ kg'), num('Saturno', 568, '× 10²⁴ kg', 0), num('Júpiter', 1898, '× 10²⁴ kg', 0)] },
  { id: 'oc:astro-temp', category: 'astronomia', title: 'Ordene do MAIS QUENTE ao MAIS FRIO (temperatura média)', unit: '°C', dir: 'DESC', top: 'Mais quente', bottom: 'Mais frio', source: NASA, explanation: 'Vênus é mais quente que Mercúrio por causa do efeito estufa extremo da sua atmosfera.', items: [num('Mercúrio', 167, '°C', 0), num('Vênus', 464, '°C', 0), num('Terra', 15, '°C', 0), num('Marte', -65, '°C', 0), num('Júpiter', -110, '°C', 0), num('Netuno', -200, '°C', 0)] },
  // Animais (valores aproximados amplamente citados)
  { id: 'oc:ani-terra', category: 'animais', title: 'Ordene do MAIS RÁPIDO ao MAIS LENTO em terra', unit: 'km/h', dir: 'DESC', top: 'Mais rápido', bottom: 'Mais lento', source: 'Enciclopédia Britannica / National Geographic', explanation: 'Velocidades máximas aproximadas registradas. Usain Bolt atingiu cerca de 44,7 km/h em 2009.', items: [num('Guepardo', 110, 'km/h', 0), num('Leão', 80, 'km/h', 0), num('Galgo', 72, 'km/h', 0, 'Raça de cão'), num('Usain Bolt', 44.7, 'km/h', 1, 'Ser humano'), num('Tartaruga-gigante', 0.3, 'km/h')] },
  { id: 'oc:ani-mar', category: 'animais', title: 'Ordene do MAIS RÁPIDO ao MAIS LENTO na água', unit: 'km/h', dir: 'DESC', top: 'Mais rápido', bottom: 'Mais lento', source: 'National Geographic / NOAA', explanation: 'Velocidades máximas aproximadas. O cavalo-marinho é um dos peixes mais lentos do mundo.', items: [num('Peixe-vela', 110, 'km/h', 0), num('Tubarão-mako', 70, 'km/h', 0), num('Orca', 56, 'km/h', 0), num('Tartaruga-de-couro', 35, 'km/h', 0), num('Cavalo-marinho', 0.01, 'km/h', 2)] },
  { id: 'oc:ani-aves', category: 'animais', title: 'Ordene as aves da MAIS RÁPIDA à MAIS LENTA', unit: 'km/h', dir: 'DESC', top: 'Mais rápida', bottom: 'Mais lenta', source: 'Enciclopédia Britannica', explanation: 'O falcão-peregrino passa de 380 km/h em mergulho — o animal mais rápido do planeta.', items: [num('Falcão-peregrino', 389, 'km/h', 0, 'Em mergulho'), num('Águia-real', 240, 'km/h', 0, 'Em mergulho'), num('Avestruz', 70, 'km/h', 0, 'Correndo'), num('Galinha', 14, 'km/h', 0, 'Correndo')] },
  { id: 'oc:ani-peso', category: 'animais', title: 'Ordene do MAIS PESADO ao MAIS LEVE (adulto médio)', unit: 'kg', dir: 'DESC', top: 'Mais pesado', bottom: 'Mais leve', source: 'National Geographic', explanation: 'Pesos médios aproximados de adultos. A baleia-azul é o maior animal que já existiu.', items: [num('Baleia-azul', 150000, 'kg', 0), num('Elefante-africano', 6000, 'kg', 0), num('Rinoceronte-branco', 2300, 'kg', 0), num('Urso-polar', 450, 'kg', 0), num('Leão', 190, 'kg', 0), num('Onça-pintada', 90, 'kg', 0)] },
  { id: 'oc:ani-vida', category: 'animais', title: 'Ordene do que VIVE MAIS ao que vive menos', unit: 'anos', dir: 'DESC', top: 'Vive mais', bottom: 'Vive menos', source: 'Science (2016) / National Geographic', explanation: 'O tubarão-da-groenlândia é o vertebrado mais longevo conhecido: pode passar de 270 a 400 anos.', items: [num('Tubarão-da-groenlândia', 400, 'anos', 0), num('Tartaruga-de-galápagos', 150, 'anos', 0), num('Elefante-africano', 65, 'anos', 0), num('Cachorro', 13, 'anos', 0), num('Hamster', 2.5, 'anos')] },
  { id: 'oc:ani-altura', category: 'animais', title: 'Ordene do MAIS ALTO ao MAIS BAIXO', unit: 'm', dir: 'DESC', top: 'Mais alto', bottom: 'Mais baixo', source: 'National Geographic', explanation: 'Alturas médias de adultos em pé.', items: [num('Girafa', 5.5, 'm'), num('Elefante-africano', 3.3, 'm'), num('Avestruz', 2.7, 'm'), num('Ser humano', 1.7, 'm'), num('Pinguim-imperador', 1.2, 'm')] },
  // História do Brasil
  { id: 'oc:br-a', category: 'historia', title: 'Ordene estes fatos do Brasil do MAIS ANTIGO ao MAIS RECENTE', ...chrono, source: 'Biblioteca Nacional', explanation: 'Do desembarque de Cabral à inauguração de Brasília.', items: [year('Chegada da esquadra de Cabral', 1500), year('Chegada da Família Real portuguesa', 1808), year('Independência do Brasil', 1822), year('Lei Áurea', 1888), year('Inauguração de Brasília', 1960)] },
  { id: 'oc:br-b', category: 'historia', title: 'Ordene estes fatos do Brasil do MAIS ANTIGO ao MAIS RECENTE', ...chrono, source: 'Biblioteca Nacional', explanation: 'Fundação de São Paulo pelos jesuítas até a Constituição Cidadã.', items: [year('Fundação de São Paulo', 1554), year('Execução de Tiradentes', 1792), year('Proclamação da República', 1889), year('Semana de Arte Moderna', 1922), year('Promulgação da Constituição atual', 1988)] },
  { id: 'oc:br-c', category: 'historia', title: 'Ordene do MAIS ANTIGO ao MAIS RECENTE', ...chrono, source: 'Biblioteca Nacional / CBF', explanation: 'Do voo do 14-Bis em Paris ao pentacampeonato.', items: [year('Voo do 14-Bis de Santos Dumont', 1906), year('Criação da Petrobras', 1953), year('Primeiro título mundial da Seleção', 1958), year('Lançamento do Plano Real', 1994), year('Pentacampeonato mundial', 2002)] },
  { id: 'oc:br-d', category: 'historia', title: 'Ordene do MAIS ANTIGO ao MAIS RECENTE', ...chrono, source: 'Biblioteca Nacional / COB', explanation: 'Fundação do Rio por Estácio de Sá até a primeira Olimpíada na América do Sul.', items: [year('Fundação do Rio de Janeiro', 1565), year('Lei Eusébio de Queirós (fim do tráfico)', 1850), year('Revolução de 1930 (Getúlio no poder)', 1930), year('Campanha das Diretas Já', 1984), year('Olimpíadas do Rio', 2016)] },
  // História geral
  { id: 'oc:mundo-a', category: 'historia', title: 'Ordene do MAIS ANTIGO ao MAIS RECENTE', ...chrono, source: 'Wikimedia / Enciclopédia Britannica', explanation: 'A Grande Pirâmide de Gizé foi concluída por volta de 2560 a.C.', items: [year('Construção da Grande Pirâmide de Gizé', -2560, 'aprox.'), year('Queda do Império Romano do Ocidente', 476), year('Chegada de Colombo à América', 1492), year('Revolução Francesa', 1789), year('Homem pisa na Lua', 1969)] },
  { id: 'oc:mundo-b', category: 'historia', title: 'Ordene do MAIS ANTIGO ao MAIS RECENTE', ...chrono, source: 'Wikimedia / Enciclopédia Britannica', explanation: 'O Titanic afundou dois anos antes do início da Primeira Guerra Mundial.', items: [year('Independência dos Estados Unidos', 1776), year('Naufrágio do Titanic', 1912), year('Início da Primeira Guerra Mundial', 1914), year('Início da Segunda Guerra Mundial', 1939), year('Queda do Muro de Berlim', 1989)] },
  { id: 'oc:inv-a', category: 'historia', title: 'Ordene as invenções da MAIS ANTIGA à MAIS RECENTE', ...chrono, source: 'Enciclopédia Britannica', explanation: 'A prensa de tipos móveis de Gutenberg surgiu por volta de 1440.', items: [year('Prensa de Gutenberg', 1440, 'aprox.'), year('Patente do telefone (Bell)', 1876), year('Lâmpada incandescente de Edison', 1879), year('Voo do 14-Bis', 1906), year('Primeiro iPhone', 2007)] },
  { id: 'oc:inv-b', category: 'historia', title: 'Ordene as descobertas da MAIS ANTIGA à MAIS RECENTE', ...chrono, source: 'Enciclopédia Britannica / CERN', explanation: 'O primeiro site da Web entrou no ar no CERN em 1991.', items: [year('Rádio de Marconi', 1895), year('Descoberta da penicilina', 1928), year('Apresentação do computador ENIAC', 1946), year('Primeiro site da World Wide Web', 1991), year('Lançamento do YouTube', 2005)] },
  { id: 'oc:empresas', category: 'historia', title: 'Ordene as empresas da MAIS ANTIGA à MAIS NOVA (fundação)', ...chrono, source: 'Sites oficiais das empresas', explanation: 'A Nintendo nasceu em 1889 fabricando cartas de baralho hanafuda.', items: [year('Nintendo', 1889), year('Samsung', 1938), year('Microsoft', 1975), year('Apple', 1976), year('Google', 1998), year('Facebook', 2004)] },
  // Cultura pop
  { id: 'oc:console-a', category: 'personagens', title: 'Ordene os consoles do MAIS ANTIGO ao MAIS RECENTE (lançamento original)', ...chrono, source: 'Sites oficiais dos fabricantes', explanation: 'Datas do primeiro lançamento mundial (NES = Famicom no Japão).', items: [year('Atari 2600', 1977), year('NES (Famicom)', 1983), year('PlayStation', 1994), year('Nintendo Wii', 2006), year('Nintendo Switch', 2017)] },
  { id: 'oc:console-b', category: 'personagens', title: 'Ordene os consoles do MAIS ANTIGO ao MAIS RECENTE', ...chrono, source: 'Sites oficiais dos fabricantes', explanation: 'Primeiro lançamento mundial de cada console.', items: [year('Mega Drive', 1988), year('Game Boy', 1989), year('Nintendo 64', 1996), year('PlayStation 2', 2000), year('PlayStation 4', 2013), year('PlayStation 5', 2020)] },
  { id: 'oc:games-a', category: 'personagens', title: 'Ordene os jogos do MAIS ANTIGO ao MAIS RECENTE', ...chrono, source: 'Publicadoras oficiais', explanation: 'Pokémon Red/Green saiu no Japão em 1996.', items: [year('Pac-Man', 1980), year('Tetris', 1984), year('Super Mario Bros.', 1985), year('Pokémon Red/Green', 1996), year('The Sims', 2000), year('Among Us', 2018)] },
  { id: 'oc:games-b', category: 'personagens', title: 'Ordene os jogos do MAIS ANTIGO ao MAIS RECENTE', ...chrono, source: 'Publicadoras oficiais', explanation: 'Minecraft teve versões de teste desde 2009, mas o lançamento oficial (1.0) foi em 2011.', items: [year('The Legend of Zelda', 1986), year('Sonic the Hedgehog', 1991), year('Grand Theft Auto', 1997), year('Minecraft (versão 1.0)', 2011), year('Fortnite', 2017)] },
  { id: 'oc:anime-a', category: 'animes', title: 'Ordene os animes pelo ano de estreia no Japão', ...chrono, source: 'MyAnimeList', explanation: 'Ano de exibição do primeiro episódio da série de TV.', items: [year('Astro Boy', 1963), year('Dragon Ball', 1986), year('Sailor Moon', 1992), year('Pokémon', 1997), year('Naruto', 2002)] },
  { id: 'oc:anime-b', category: 'animes', title: 'Ordene os animes pelo ano de estreia no Japão', ...chrono, source: 'MyAnimeList', explanation: 'Ano de exibição do primeiro episódio da série de TV.', items: [year('Dragon Ball Z', 1989), year('Neon Genesis Evangelion', 1995), year('One Piece', 1999), year('Death Note', 2006), year('Demon Slayer', 2019)] },
  { id: 'oc:anime-c', category: 'animes', title: 'Ordene os animes pelo ano de estreia no Japão', ...chrono, source: 'MyAnimeList', explanation: 'Ano de exibição do primeiro episódio da série de TV.', items: [year('Fullmetal Alchemist', 2003), year('Bleach', 2004), year('Attack on Titan', 2013), year('My Hero Academia', 2016), year('Jujutsu Kaisen', 2020), year('Spy x Family', 2022)] },
  { id: 'oc:anime-eps', category: 'animes', title: 'Ordene do MENOR para o MAIOR número de episódios', unit: 'episódios', dir: 'ASC', top: 'Menos episódios', bottom: 'Mais episódios', source: 'MyAnimeList', explanation: 'Total de episódios da série de TV original.', items: [num('Death Note', 37, 'eps', 0), num('Fullmetal Alchemist: Brotherhood', 64, 'eps', 0), num('Yu Yu Hakusho', 112, 'eps', 0), num('Dragon Ball', 153, 'eps', 0), num('Naruto (clássico)', 220, 'eps', 0), num('Dragon Ball Z', 291, 'eps', 0)] },
  { id: 'oc:filmes-a', category: 'personagens', title: 'Ordene os filmes pelo ano de lançamento', ...chrono, source: 'IMDb', explanation: 'Ano de estreia nos cinemas.', items: [year('Star Wars', 1977), year('E.T. – O Extraterrestre', 1982), year('Jurassic Park', 1993), year('Titanic', 1997), year('Matrix', 1999), year('Avatar', 2009)] },
  { id: 'oc:filmes-b', category: 'personagens', title: 'Ordene as animações pelo ano de lançamento', ...chrono, source: 'IMDb', explanation: 'Toy Story (1995) foi o primeiro longa feito inteiramente em computação gráfica.', items: [year('O Rei Leão', 1994), year('Toy Story', 1995), year('Shrek', 2001), year('Frozen', 2013), year('Vingadores: Ultimato', 2019, 'Live-action')] },
  // Geografia e mundo
  { id: 'oc:montanhas', category: 'paises', title: 'Ordene as montanhas da MAIS ALTA à MAIS BAIXA', unit: 'm', dir: 'DESC', top: 'Mais alta', bottom: 'Mais baixa', source: 'IBGE / National Geographic', explanation: 'O Pico da Neblina (2.995 m) é o ponto mais alto do Brasil.', items: [num('Monte Everest', 8849, 'm', 0), num('K2', 8611, 'm', 0), num('Aconcágua', 6961, 'm', 0), num('Kilimanjaro', 5895, 'm', 0), num('Monte Fuji', 3776, 'm', 0), num('Pico da Neblina', 2995, 'm', 0)] },
  { id: 'oc:rios', category: 'paises', title: 'Ordene os rios do MAIS LONGO ao MAIS CURTO', unit: 'km', dir: 'DESC', top: 'Mais longo', bottom: 'Mais curto', source: 'Enciclopédia Britannica', explanation: 'O Tâmisa, que corta Londres, tem apenas 346 km.', items: [num('Nilo', 6650, 'km', 0), num('Yangtzé', 6300, 'km', 0), num('Volga', 3530, 'km', 0), num('Danúbio', 2850, 'km', 0), num('Reno', 1230, 'km', 0), num('Tâmisa', 346, 'km', 0)] },
  { id: 'oc:construcoes', category: 'paises', title: 'Ordene da construção MAIS ALTA à MAIS BAIXA', unit: 'm', dir: 'DESC', top: 'Mais alta', bottom: 'Mais baixa', source: 'CTBUH / sites oficiais', explanation: 'O Cristo Redentor tem 38 m somando estátua (30 m) e pedestal (8 m).', items: [num('Burj Khalifa', 828, 'm', 0), num('Tokyo Skytree', 634, 'm', 0), num('Torre Eiffel', 330, 'm', 0), num('Big Ben (Torre Elizabeth)', 96, 'm', 0), num('Cristo Redentor', 38, 'm', 0)] },
  { id: 'oc:oceanos', category: 'paises', title: 'Ordene os oceanos do MAIOR ao MENOR', unit: 'milhões de km²', dir: 'DESC', top: 'Maior', bottom: 'Menor', source: 'NOAA', explanation: 'O Pacífico sozinho é maior que toda a área de terra firme do planeta.', items: [num('Pacífico', 165.2, 'mi km²'), num('Atlântico', 106.5, 'mi km²'), num('Índico', 70.6, 'mi km²'), num('Antártico', 21.9, 'mi km²'), num('Ártico', 14.1, 'mi km²')] },
  { id: 'oc:estados-area', category: 'paises', title: 'Ordene os estados do MAIOR ao MENOR em área', unit: 'km²', dir: 'DESC', top: 'Maior área', bottom: 'Menor área', source: 'IBGE', explanation: 'O Amazonas é maior que a soma de França, Espanha e Suécia.', items: [num('Amazonas', 1559256, 'km²', 0), num('Pará', 1245870, 'km²', 0), num('Mato Grosso', 903208, 'km²', 0), num('Bahia', 564760, 'km²', 0), num('São Paulo', 248219, 'km²', 0), num('Sergipe', 21938, 'km²', 0)] },
  { id: 'oc:cidades-pop', category: 'paises', title: 'Ordene as cidades da MAIS POPULOSA à MENOS populosa', unit: 'habitantes', dir: 'DESC', top: 'Mais populosa', bottom: 'Menos populosa', source: 'IBGE — Censo 2022', explanation: 'População dos municípios segundo o Censo 2022.', items: [num('São Paulo', 11451999, 'hab.', 0), num('Rio de Janeiro', 6211223, 'hab.', 0), num('Brasília', 2817068, 'hab.', 0), num('Belo Horizonte', 2315560, 'hab.', 0), num('Curitiba', 1773718, 'hab.', 0), num('Recife', 1488920, 'hab.', 0)] },
  { id: 'oc:olimpiadas', category: 'historia', title: 'Ordene as Olimpíadas de Verão da MAIS ANTIGA à MAIS RECENTE', ...chrono, source: 'Comitê Olímpico Internacional', explanation: 'Cidades-sede dos Jogos Olímpicos de Verão.', items: [year('Barcelona', 1992), year('Atlanta', 1996), year('Sydney', 2000), year('Pequim', 2008), year('Rio de Janeiro', 2016), year('Paris', 2024)] },
  { id: 'oc:copas', category: 'historia', title: 'Ordene as Copas do Mundo da MAIS ANTIGA à MAIS RECENTE', ...chrono, source: 'FIFA', explanation: 'Países-sede das Copas do Mundo masculinas.', items: [year('Uruguai', 1930), year('Inglaterra', 1966), year('Argentina', 1978), year('França', 1998), year('Japão e Coreia do Sul', 2002), year('Catar', 2022)] },
  // Ciência
  { id: 'oc:atomico', category: 'astronomia', title: 'Ordene os elementos pelo número atômico (do menor ao maior)', unit: 'nº atômico', dir: 'ASC', top: 'Menor nº atômico', bottom: 'Maior nº atômico', source: 'IUPAC — Tabela Periódica', explanation: 'O número atômico é a quantidade de prótons no núcleo.', items: [num('Hidrogênio', 1, '', 0), num('Carbono', 6, '', 0), num('Oxigênio', 8, '', 0), num('Ferro', 26, '', 0), num('Ouro', 79, '', 0), num('Urânio', 92, '', 0)] },
  { id: 'oc:fusao', category: 'astronomia', title: 'Ordene os metais pelo ponto de fusão (do menor ao maior)', unit: '°C', dir: 'ASC', top: 'Derrete mais fácil', bottom: 'Mais resistente ao calor', source: 'CRC Handbook of Chemistry and Physics', explanation: 'O mercúrio é líquido em temperatura ambiente; o tungstênio só derrete a 3.422 °C.', items: [num('Mercúrio', -38.8, '°C'), num('Estanho', 231.9, '°C'), num('Chumbo', 327.5, '°C'), num('Ouro', 1064, '°C', 0), num('Ferro', 1538, '°C', 0), num('Tungstênio', 3422, '°C', 0)] },
  // Pokémon (valores oficiais da PokéAPI)
  { id: 'oc:poke-altura', category: 'pokemon', title: 'Ordene estes Pokémon do MENOR para o MAIOR em altura', unit: 'm', dir: 'ASC', top: 'Menor altura', bottom: 'Maior altura', source: 'PokéAPI v2 Oficial (The Pokémon Company)', explanation: 'Alturas oficiais da Pokédex. Onix mede quase 9 metros!', items: [num('Joltik', 0.1, 'm'), num('Pikachu', 0.4, 'm'), num('Lucario', 1.2, 'm'), num('Charizard', 1.7, 'm'), num('Onix', 8.8, 'm')] },
];

export const LOCAL_CHALLENGES: ChaoticChallenge[] = LOCAL_SPECS.map(buildChallenge).filter((c): c is ChaoticChallenge => c !== null);

// ---------- geradores dinâmicos ----------
function sample<T>(arr: T[], n: number, rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

/** Tenta várias amostras até achar 5 itens com valores distintos. */
function pickDistinct<T>(pool: T[], value: (t: T) => number | null, n: number, rng: () => number): T[] | null {
  const valid = pool.filter((p) => {
    const v = value(p);
    return v !== null && Number.isFinite(v);
  });
  for (let attempt = 0; attempt < 12; attempt++) {
    const s = sample(valid, n, rng);
    if (s.length === n && new Set(s.map((x) => value(x))).size === n) return s;
  }
  return null;
}

const POKE_SOURCE = 'PokéAPI v2 Oficial (The Pokémon Company)';

export function pokemonChallenge(pool: PokemonInfo[], rng: () => number, tag: string): ChaoticChallenge | null {
  const criteria = [
    { key: 'altura', title: 'do MENOR para o MAIOR em altura', unit: 'm', dir: 'ASC' as const, top: 'Menor altura', bottom: 'Maior altura', v: (p: PokemonInfo) => p.heightM, f: (v: number) => `${fmtNum(v)} m`, exp: 'Altura oficial da Pokédex (a API informa em decímetros; convertido para metros).' },
    { key: 'peso', title: 'do MAIS PESADO ao MAIS LEVE', unit: 'kg', dir: 'DESC' as const, top: 'Mais pesado', bottom: 'Mais leve', v: (p: PokemonInfo) => p.weightKg, f: (v: number) => `${fmtNum(v)} kg`, exp: 'Peso oficial da Pokédex (a API informa em hectogramas; convertido para kg).' },
    { key: 'velocidade', title: 'do MAIS RÁPIDO ao MAIS LENTO (Velocidade base)', unit: 'Speed', dir: 'DESC' as const, top: 'Mais rápido', bottom: 'Mais lento', v: (p: PokemonInfo) => p.stats.speed, f: (v: number) => `${v} de Speed`, exp: 'Atributo base de Velocidade (Speed) nos jogos.' },
    { key: 'ataque', title: 'do MAIOR para o MENOR Ataque base', unit: 'Attack', dir: 'DESC' as const, top: 'Maior Ataque', bottom: 'Menor Ataque', v: (p: PokemonInfo) => p.stats.attack, f: (v: number) => `${v} de Attack`, exp: 'Atributo base de Ataque (Attack) nos jogos.' },
    { key: 'dex', title: 'pelo número da Pokédex Nacional (do menor ao maior)', unit: 'nº', dir: 'ASC' as const, top: 'Menor número', bottom: 'Maior número', v: (p: PokemonInfo) => p.id, f: (v: number) => `#${v}`, exp: 'Número na Pokédex Nacional — reflete a geração em que o Pokémon estreou.' },
  ];
  const c = criteria[Math.floor(rng() * criteria.length)];
  const chosen = pickDistinct(pool, c.v, 5, rng);
  if (!chosen) return null;
  const isDex = c.key === 'dex';
  return buildChallenge({
    id: `oc:dyn-poke-${c.key}-${tag}`,
    category: 'pokemon',
    title: `Ordene estes Pokémon ${c.title}`,
    unit: c.unit,
    dir: c.dir,
    top: c.top,
    bottom: c.bottom,
    source: POKE_SOURCE,
    explanation: c.exp,
    items: chosen.map((p) => ({
      label: p.name,
      value: c.v(p),
      formatted: c.f(c.v(p)),
      // no critério "nº da Pokédex" o número/sprite (URL contém o id) entregariam a resposta
      subtitle: isDex ? p.types.join(' / ') : `Pokémon #${p.id}`,
      imageUrl: isDex ? undefined : (p.sprite ?? undefined),
    })),
  });
}

export function countryChallenge(pool: CountryInfo[], rng: () => number, tag: string): ChaoticChallenge | null {
  const byPop = rng() < 0.5;
  const value = (c: CountryInfo) => (byPop ? c.population : c.areaKm2);
  const chosen = pickDistinct(pool, value, 5, rng);
  if (!chosen) return null;
  const yearRef = chosen[0].populationYear;
  return buildChallenge({
    id: `oc:dyn-paises-${byPop ? 'pop' : 'area'}-${tag}`,
    category: 'paises',
    title: byPop ? 'Ordene os países do MAIS POPULOSO ao MENOS populoso' : 'Ordene os países do MAIOR ao MENOR em área territorial',
    unit: byPop ? 'habitantes' : 'km²',
    dir: 'DESC',
    top: byPop ? 'Mais populoso' : 'Maior área',
    bottom: byPop ? 'Menos populoso' : 'Menor área',
    source: byPop ? 'World Bank Open Data (SP.POP.TOTL)' : 'IBGE — API de Países',
    explanation: byPop ? `População total mais recente disponível${yearRef ? ` (${yearRef})` : ''}.` : 'Área total em quilômetros quadrados segundo o IBGE.',
    items: chosen.map((c) => {
      const v = value(c) as number;
      return { label: c.name, subtitle: c.region, value: v, formatted: byPop ? `${fmtNum(v / 1e6)} milhões` : `${fmtNum(v, 0)} km²` };
    }),
  });
}

export function animeChallenge(pool: AnimeInfo[], rng: () => number, tag: string): ChaoticChallenge | null {
  const criteria = [
    { key: 'ano', title: 'pelo ano de estreia (do mais antigo ao mais recente)', unit: 'ano', dir: 'ASC' as const, top: 'Mais antigo', bottom: 'Mais recente', v: (a: AnimeInfo) => a.year, f: (v: number) => String(v) },
    { key: 'eps', title: 'do MENOR para o MAIOR número de episódios', unit: 'episódios', dir: 'ASC' as const, top: 'Menos episódios', bottom: 'Mais episódios', v: (a: AnimeInfo) => a.episodes, f: (v: number) => `${v} eps` },
    { key: 'nota', title: 'da MAIOR para a MENOR nota no MyAnimeList', unit: 'nota', dir: 'DESC' as const, top: 'Maior nota', bottom: 'Menor nota', v: (a: AnimeInfo) => a.score, f: (v: number) => v.toFixed(2).replace('.', ',') },
  ];
  const c = criteria[Math.floor(rng() * criteria.length)];
  const chosen = pickDistinct(pool, c.v, 5, rng);
  if (!chosen) return null;
  return buildChallenge({
    id: `oc:dyn-anime-${c.key}-${tag}`,
    category: 'animes',
    title: `Ordene os animes ${c.title}`,
    unit: c.unit,
    dir: c.dir,
    top: c.top,
    bottom: c.bottom,
    source: 'MyAnimeList / Jikan API v4',
    explanation: 'Dados públicos do MyAnimeList consultados ao vivo.',
    items: chosen.map((a) => ({ label: a.title, value: c.v(a) as number, formatted: c.f(c.v(a) as number), imageUrl: a.image ?? undefined })),
  });
}

export function historyChallenge(events: HistoryEvent[], rng: () => number, tag: string): ChaoticChallenge | null {
  const chosen = pickDistinct(events, (e) => e.year, 5, rng);
  if (!chosen) return null;
  const d = new Date();
  return buildChallenge({
    id: `oc:dyn-hist-${tag}`,
    category: 'historia',
    title: `Aconteceu num ${d.getDate()}/${d.getMonth() + 1}: ordene do MAIS ANTIGO ao MAIS RECENTE`,
    ...chrono,
    source: 'Wikipédia em português — "Neste dia"',
    explanation: 'Todos estes acontecimentos ocorreram exatamente neste dia e mês, em anos diferentes.',
    items: chosen.map((e) => year(e.text, e.year)),
  });
}
