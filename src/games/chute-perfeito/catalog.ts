/** Chute Perfeito — perguntas com resposta numérica (valores conferidos). */
export type ChuteCategory = 'geografia' | 'historia' | 'ciencia' | 'cultura';

export interface ChuteQuestion {
  id: string;
  category: ChuteCategory;
  text: string;
  value: number;
  unit: string;
  /** Pergunta de ano calendário (escala S = 500). */
  isYear?: boolean;
  note?: string;
}

export const CHUTE_CATEGORY_LABEL: Record<ChuteCategory | 'custom', string> = {
  geografia: 'Geografia & Mundo',
  historia: 'História (anos)',
  ciencia: 'Ciência & Corpo',
  cultura: 'Cultura & Esportes',
  custom: 'Meus Pacotes',
};

type Row = [text: string, value: number, unit: string, note?: string];

const GEO: Row[] = [
  ['Qual é a população do Brasil segundo o Censo 2022 do IBGE?', 203_080_756, 'habitantes'],
  ['Qual é a população da cidade de São Paulo segundo o Censo 2022?', 11_451_245, 'habitantes'],
  ['Quantos estados tem o Brasil (sem contar o Distrito Federal)?', 26, 'estados'],
  ['Qual é o comprimento aproximado da Linha do Equador?', 40_075, 'km'],
  ['Qual é a altitude do Monte Everest (medição de 2020)?', 8_849, 'metros'],
  ['Qual é a altura da estátua do Cristo Redentor, sem o pedestal?', 30, 'metros'],
  ['Qual é a altura do Pão de Açúcar, no Rio de Janeiro?', 396, 'metros'],
  ['Qual é a distância média da Terra até a Lua?', 384_400, 'km'],
  ['Qual é a distância média da Terra até o Sol?', 149_600_000, 'km'],
  ['Quantos países existem na América do Sul?', 12, 'países'],
  ['Quantos países são membros da ONU?', 193, 'países'],
  ['Qual é a área aproximada do Brasil?', 8_510_000, 'km²'],
  ['Quantos lugares tem o Maracanã atualmente (capacidade aproximada)?', 78_838, 'lugares'],
  ['Quantos quilômetros tem uma maratona oficial?', 42.195, 'km'],
  ['Quantos municípios o Brasil tinha no Censo 2022?', 5_570, 'municípios'],
];

const HIST: Row[] = [
  ['Em que ano os portugueses chegaram ao Brasil?', 1500, 'ano'],
  ['Em que ano foi proclamada a Independência do Brasil?', 1822, 'ano'],
  ['Em que ano foi proclamada a República no Brasil?', 1889, 'ano'],
  ['Em que ano foi assinada a Lei Áurea?', 1888, 'ano'],
  ['Em que ano o ser humano pisou na Lua pela primeira vez?', 1969, 'ano'],
  ['Em que ano caiu o Muro de Berlim?', 1989, 'ano'],
  ['Em que ano foi disputada a primeira Copa do Mundo de futebol?', 1930, 'ano'],
  ['Em que ano Brasília foi inaugurada?', 1960, 'ano'],
  ['Em que ano foi lançado o primeiro iPhone?', 2007, 'ano'],
  ['Em que ano foi lançada a primeira versão do PlayStation 2 no Japão?', 2000, 'ano'],
  ['Em que ano Santos Dumont voou com o 14-Bis em Paris?', 1906, 'ano'],
  ['Em que ano terminou a Segunda Guerra Mundial?', 1945, 'ano'],
  ['Em que ano aconteceu a Queda da Bastilha, marco da Revolução Francesa?', 1789, 'ano'],
  ['Em que ano Cristóvão Colombo chegou à América?', 1492, 'ano'],
  ['Em que ano o Google foi fundado?', 1998, 'ano'],
  ['Em que ano Pokémon Red e Green foram lançados no Japão?', 1996, 'ano'],
  ['Em que ano o Titanic afundou?', 1912, 'ano'],
  ['Em que ano o Brasil sediou uma Copa do Mundo pela segunda vez?', 2014, 'ano'],
];

const CIEN: Row[] = [
  ['Quantos ossos existem no corpo humano adulto?', 206, 'ossos'],
  ['Quantos dentes tem a dentição permanente completa de um adulto?', 32, 'dentes'],
  ['A que temperatura a água ferve ao nível do mar?', 100, '°C'],
  ['Qual é a velocidade da luz no vácuo, aproximadamente?', 299_792, 'km/s'],
  ['Quantos planetas existem no Sistema Solar?', 8, 'planetas'],
  ['Quantos elementos químicos a tabela periódica oficial tem hoje?', 118, 'elementos'],
  ['Quantos cromossomos existem em uma célula humana comum?', 46, 'cromossomos'],
  ['Quantos minutos tem uma semana?', 10_080, 'minutos'],
  ['Quantas horas tem um ano não bissexto?', 8_760, 'horas'],
  ['Quantas teclas tem um piano padrão?', 88, 'teclas'],
  ['Quantos corações tem um polvo?', 3, 'corações'],
  ['Qual é a temperatura média normal do corpo humano?', 36.5, '°C'],
  ['Quantos segundos tem um dia?', 86_400, 'segundos'],
];

const CULT: Row[] = [
  ['Quantas Copas do Mundo masculinas o Brasil já ganhou?', 5, 'títulos'],
  ['Quantos Pokémon existem na primeira geração (Kanto)?', 151, 'Pokémon'],
  ['Quantos minutos dura o tempo regulamentar de uma partida da NBA?', 48, 'minutos'],
  ['Quantas casas tem um tabuleiro de xadrez?', 64, 'casas'],
  ['Quantas peças tem um dominó tradicional (duplo-seis)?', 28, 'peças'],
  ['Quantas cartas tem um baralho comum, sem coringas?', 52, 'cartas'],
  ['Quantos livros tem a saga principal de Harry Potter?', 7, 'livros'],
  ['Quantos jogadores de cada time ficam em quadra no vôlei?', 6, 'jogadores'],
  ['Em que ano foi lançado o filme “Titanic”, de James Cameron?', 1997, 'ano'],
  ['Quantas casas tem o tabuleiro do jogo da velha?', 9, 'casas'],
  ['Quantos anéis tem o símbolo dos Jogos Olímpicos?', 5, 'anéis'],
  ['Quantos jogadores começam uma partida de futebol, somando os dois times?', 22, 'jogadores'],
];

const build = (rows: Row[], category: ChuteCategory, prefix: string): ChuteQuestion[] =>
  rows.map(([text, value, unit, note], i) => ({ id: `ch:${prefix}${i}`, category, text, value, unit, isYear: unit === 'ano', note }));

export const CHUTE_CATALOG: ChuteQuestion[] = [...build(GEO, 'geografia', 'g'), ...build(HIST, 'historia', 'h'), ...build(CIEN, 'ciencia', 'c'), ...build(CULT, 'cultura', 'x')];
