/**
 * Sabe ou Perde — banco local de perguntas de múltipla escolha (PT-BR) + geradores via PokéAPI e IBGE.
 * Convenção do catálogo: a alternativa CORRETA é sempre a primeira da lista; o motor embaralha a cada sorteio.
 */
import { TYPE_PT, type PokemonInfo } from '../../services/externalApis/pokeApiService';
import type { CountryInfo } from '../../services/externalApis/countriesApiService';

export interface TriviaQuestion {
  id: string;
  category: string;
  text: string;
  /** options[0] é a correta (antes do embaralhamento). */
  options: [string, string, string, string];
}

type Row = [string, [string, string, string, string]];

const BANK: Record<string, Row[]> = {
  Ciência: [
    ['Qual é o planeta mais próximo do Sol?', ['Mercúrio', 'Vênus', 'Marte', 'Terra']],
    ['Qual gás as plantas absorvem do ar para fazer fotossíntese?', ['Gás carbônico (CO₂)', 'Oxigênio', 'Nitrogênio', 'Hélio']],
    ['Qual é o maior órgão do corpo humano?', ['Pele', 'Fígado', 'Pulmão', 'Intestino']],
    ['Qual é a fórmula química da água?', ['H₂O', 'CO₂', 'O₂', 'NaCl']],
    ['Quantos planetas tem o Sistema Solar?', ['8', '9', '7', '10']],
    ['Qual é o símbolo químico do ferro?', ['Fe', 'Fr', 'Ir', 'F']],
    ['Qual é a velocidade aproximada da luz no vácuo?', ['300 mil km/s', '30 mil km/s', '3 mil km/s', '3 milhões de km/s']],
    ['Qual é o maior planeta do Sistema Solar?', ['Júpiter', 'Saturno', 'Netuno', 'Terra']],
    ['Qual vitamina o corpo produz com a exposição ao sol?', ['Vitamina D', 'Vitamina A', 'Vitamina C', 'Vitamina B12']],
    ['Em que parte da célula fica guardada a maior parte do DNA?', ['Núcleo', 'Membrana', 'Ribossomo', 'Citoplasma']],
    ['A que temperatura a água ferve ao nível do mar?', ['100 °C', '90 °C', '120 °C', '80 °C']],
    ['Qual é o osso mais longo do corpo humano?', ['Fêmur', 'Úmero', 'Tíbia', 'Rádio']],
    ['Quantos dentes tem um adulto com a dentição permanente completa?', ['32', '28', '30', '36']],
  ],
  História: [
    ['Em que ano o Brasil declarou sua independência?', ['1822', '1500', '1889', '1808']],
    ['Quem proclamou a independência do Brasil?', ['Dom Pedro I', 'Dom Pedro II', 'Tiradentes', 'Deodoro da Fonseca']],
    ['Em que ano o ser humano pisou na Lua pela primeira vez?', ['1969', '1959', '1975', '1981']],
    ['Quem assinou a Lei Áurea, que aboliu a escravidão no Brasil?', ['Princesa Isabel', 'Imperatriz Leopoldina', 'Carlota Joaquina', 'Dona Maria I']],
    ['Quem foi o primeiro presidente do Brasil?', ['Deodoro da Fonseca', 'Floriano Peixoto', 'Getúlio Vargas', 'Prudente de Morais']],
    ['Qual civilização construiu Machu Picchu?', ['Inca', 'Asteca', 'Maia', 'Olmeca']],
    ['Qual muro caiu em 1989, simbolizando o fim da Guerra Fria?', ['Muro de Berlim', 'Muralha da China', 'Muralha de Adriano', 'Muro das Lamentações']],
    ['Em que ano começou a Segunda Guerra Mundial?', ['1939', '1914', '1945', '1929']],
    ['Qual navegador português chegou ao Brasil em 1500?', ['Pedro Álvares Cabral', 'Vasco da Gama', 'Cristóvão Colombo', 'Fernão de Magalhães']],
    ['Qual cidade era a capital do Brasil antes de Brasília?', ['Rio de Janeiro', 'Salvador', 'São Paulo', 'Belo Horizonte']],
    ['Quem pintou a Mona Lisa?', ['Leonardo da Vinci', 'Michelangelo', 'Rafael', 'Van Gogh']],
    ['Qual antiga civilização era governada por faraós?', ['Egípcia', 'Romana', 'Persa', 'Mongol']],
    ['Quem foi o líder da Inconfidência Mineira executado em 1792?', ['Tiradentes', 'Zumbi dos Palmares', 'Frei Caneca', 'Duque de Caxias']],
  ],
  Geografia: [
    ['Qual é o maior oceano do planeta?', ['Pacífico', 'Atlântico', 'Índico', 'Ártico']],
    ['Qual é a capital do Canadá?', ['Ottawa', 'Toronto', 'Vancouver', 'Montreal']],
    ['Qual é o maior país do mundo em área?', ['Rússia', 'Canadá', 'China', 'Brasil']],
    ['Em qual continente fica o Egito?', ['África', 'Ásia', 'Europa', 'Oceania']],
    ['Qual é o maior deserto quente do mundo?', ['Saara', 'Atacama', 'Gobi', 'Kalahari']],
    ['Quantos estados tem o Brasil (sem contar o Distrito Federal)?', ['26', '27', '25', '24']],
    ['Qual é a capital da Argentina?', ['Buenos Aires', 'Montevidéu', 'Santiago', 'Lima']],
    ['Em qual estado ficam as Cataratas do Iguaçu, do lado brasileiro?', ['Paraná', 'Santa Catarina', 'Mato Grosso do Sul', 'São Paulo']],
    ['Qual é a montanha mais alta do mundo?', ['Monte Everest', 'K2', 'Aconcágua', 'Kilimanjaro']],
    ['Qual país tem o formato de uma bota no mapa?', ['Itália', 'Grécia', 'Portugal', 'Croácia']],
    ['Qual é a capital do Japão?', ['Tóquio', 'Osaka', 'Quioto', 'Seul']],
    ['Qual é a capital de Pernambuco?', ['Recife', 'Olinda', 'Fortaleza', 'Natal']],
    ['Qual é o maior estado do Brasil em área?', ['Amazonas', 'Pará', 'Mato Grosso', 'Minas Gerais']],
  ],
  'Cultura Pop': [
    ['Quem gravou o álbum "Thriller" (1982)?', ['Michael Jackson', 'Prince', 'Elvis Presley', 'Madonna']],
    ['Qual é o nome do boneco caubói de Toy Story?', ['Woody', 'Buzz', 'Jessie', 'Andy']],
    ['Em Harry Potter, em qual casa de Hogwarts Harry estuda?', ['Grifinória', 'Sonserina', 'Corvinal', 'Lufa-Lufa']],
    ['Qual super-herói é o alter ego de Bruce Wayne?', ['Batman', 'Superman', 'Homem de Ferro', 'Arqueiro Verde']],
    ['Qual banda britânica era formada por John, Paul, George e Ringo?', ['The Beatles', 'The Rolling Stones', 'Queen', 'The Who']],
    ['Qual apresentadora ficou conhecida como "Rainha dos Baixinhos"?', ['Xuxa', 'Angélica', 'Eliana', 'Mara Maravilha']],
    ['Em "O Rei Leão", qual é o nome do pai de Simba?', ['Mufasa', 'Scar', 'Rafiki', 'Pumba']],
    ['Qual personagem da Turma da Mônica é famoso por não gostar de banho?', ['Cascão', 'Cebolinha', 'Magali', 'Chico Bento']],
    ['De que cor é o sabre de luz de Darth Vader?', ['Vermelho', 'Azul', 'Verde', 'Roxo']],
    ['Em qual cidade vive o Homem-Aranha?', ['Nova York', 'Gotham', 'Metrópolis', 'Chicago']],
    ['Em qual série aparecem Eleven, Mike e Dustin?', ['Stranger Things', 'Dark', 'The Office', 'Friends']],
    ['Quem é o melhor amigo do Bob Esponja?', ['Patrick', 'Lula Molusco', 'Sandy', 'Plankton']],
    ['Qual cantor é conhecido como o "Rei do Rock"?', ['Elvis Presley', 'Chuck Berry', 'Little Richard', 'Johnny Cash']],
  ],
  Esportes: [
    ['Quantos jogadores cada time tem em campo numa partida de futebol?', ['11', '10', '12', '9']],
    ['Quantas Copas do Mundo a seleção brasileira masculina já venceu?', ['5', '4', '6', '3']],
    ['Wimbledon é um dos torneios Grand Slam de qual esporte?', ['Tênis', 'Golfe', 'Críquete', 'Badminton']],
    ['Quantos pontos vale uma cesta feita de fora do arco no basquete?', ['3', '2', '4', '1']],
    ['Qual piloto brasileiro, tricampeão de Fórmula 1, morreu em 1994?', ['Ayrton Senna', 'Nelson Piquet', 'Emerson Fittipaldi', 'Rubens Barrichello']],
    ['Em qual país surgiram os Jogos Olímpicos da Antiguidade?', ['Grécia', 'Itália', 'Egito', 'França']],
    ['Quanto dura o tempo regulamentar de uma partida de futebol?', ['90 minutos', '80 minutos', '100 minutos', '60 minutos']],
    ['Qual jogador brasileiro ficou conhecido como "Rei do Futebol"?', ['Pelé', 'Garrincha', 'Zico', 'Romário']],
    ['Quantos aros tem o símbolo olímpico?', ['5', '4', '6', '7']],
    ['No vôlei de quadra, quantos jogadores cada time tem em quadra?', ['6', '5', '7', '4']],
    ['Em qual esporte Rebeca Andrade conquistou medalhas olímpicas?', ['Ginástica artística', 'Atletismo', 'Natação', 'Judô']],
    ['Qual país sediou a Copa do Mundo de 2014?', ['Brasil', 'Rússia', 'África do Sul', 'Alemanha']],
    ['Quantos buracos tem um percurso padrão de golfe?', ['18', '9', '12', '21']],
  ],
  'Jogos & Animes': [
    ['Qual é o nome do irmão do Mario?', ['Luigi', 'Wario', 'Toad', 'Yoshi']],
    ['Qual Pokémon é o mascote da franquia?', ['Pikachu', 'Eevee', 'Charmander', 'Jigglypuff']],
    ['Em Dragon Ball, qual é o nome saiyajin de Goku?', ['Kakarotto', 'Vegeta', 'Raditz', 'Bardock']],
    ['Qual empresa criou o Sonic?', ['Sega', 'Nintendo', 'Sony', 'Capcom']],
    ['Em Naruto, qual é a vila natal do protagonista?', ['Vila da Folha (Konoha)', 'Vila da Areia', 'Vila da Névoa', 'Vila da Nuvem']],
    ['No Minecraft, além dos diamantes, que item é usado para fazer uma picareta de diamante?', ['Gravetos', 'Barras de ferro', 'Pedregulho', 'Carvão']],
    ['Qual princesa o Mario costuma resgatar?', ['Peach', 'Daisy', 'Zelda', 'Rosalina']],
    ['Em One Piece, qual é o grande sonho de Luffy?', ['Ser o Rei dos Piratas', 'Ser Hokage', 'Ser o mais forte do universo', 'Ser Mestre Pokémon']],
    ['De que tipo é o Pokémon Charmander?', ['Fogo', 'Dragão', 'Pedra', 'Lutador']],
    ['Qual console portátil a Nintendo lançou em 1989?', ['Game Boy', 'Game Gear', 'PSP', 'Nintendo DS']],
    ['Em Death Note, quem é o protagonista que encontra o caderno?', ['Light Yagami', 'L', 'Ryuk', 'Near']],
    ['Em qual jogo os Creepers são inimigos famosos?', ['Minecraft', 'Terraria', 'Roblox', 'Fortnite']],
    ['Quem é o protagonista de Attack on Titan?', ['Eren Yeager', 'Levi Ackerman', 'Armin Arlert', 'Mikasa Ackerman']],
  ],
  Curiosidades: [
    ['Qual animal é conhecido como o "rei da selva"?', ['Leão', 'Tigre', 'Elefante', 'Gorila']],
    ['Quantas patas tem uma aranha?', ['8', '6', '10', '12']],
    ['Qual é o animal terrestre mais rápido do mundo?', ['Guepardo', 'Leão', 'Cavalo', 'Antílope']],
    ['Quantos dias tem um ano bissexto?', ['366', '365', '364', '367']],
    ['Qual fruta é a base do guacamole?', ['Abacate', 'Limão', 'Manga', 'Kiwi']],
    ['Qual é o maior mamífero do mundo?', ['Baleia-azul', 'Elefante-africano', 'Girafa', 'Cachalote']],
    ['Quantas teclas tem um piano moderno padrão?', ['88', '76', '96', '64']],
    ['Tradicionalmente, quantas cores tem o arco-íris?', ['7', '6', '8', '5']],
    ['Qual mamífero bota ovos e tem bico parecido com o de um pato?', ['Ornitorrinco', 'Castor', 'Lontra', 'Capivara']],
  ],
};

export const TRIVIA_CATEGORIES = Object.keys(BANK);

export const TRIVIA_CATALOG: TriviaQuestion[] = Object.entries(BANK).flatMap(([category, rows]) =>
  rows.map(([text, options], i) => ({ id: `sop:${category.slice(0, 3).toLowerCase()}${i}`, category, text, options })),
);

// ---------- geradores dinâmicos ----------
const pick3 = <T,>(arr: T[], rng: () => number) => [...arr].sort(() => rng() - 0.5).slice(0, 3);

export function pokemonTypeQuestion(p: PokemonInfo, rng: () => number): TriviaQuestion | null {
  const correct = TYPE_PT[p.types[0]];
  if (!correct) return null;
  const others = pick3(Object.values(TYPE_PT).filter((t) => !p.types.map((x) => TYPE_PT[x]).includes(t)), rng);
  return { id: `sop:poke-type-${p.id}`, category: 'Pokémon (PokéAPI)', text: `Qual é o tipo principal do Pokémon ${p.name}?`, options: [correct, others[0], others[1], others[2]] };
}

export function countryCapitalQuestion(c: CountryInfo, pool: CountryInfo[], rng: () => number): TriviaQuestion | null {
  const others = pick3(pool.filter((x) => x.iso2 !== c.iso2 && x.capital !== c.capital).map((x) => x.capital), rng);
  if (others.length < 3) return null;
  return { id: `sop:capital-${c.iso2}`, category: 'Geografia (IBGE)', text: `Qual é a capital de ${c.name}?`, options: [c.capital, others[0], others[1], others[2]] };
}

export function countryCurrencyQuestion(c: CountryInfo, pool: CountryInfo[], rng: () => number): TriviaQuestion | null {
  if (!c.currency) return null;
  const others = pick3([...new Set(pool.map((x) => x.currency).filter((m) => m && m !== c.currency))], rng);
  if (others.length < 3) return null;
  return { id: `sop:moeda-${c.iso2}`, category: 'Geografia (IBGE)', text: `Qual é a moeda oficial de ${c.name}?`, options: [c.currency, others[0], others[1], others[2]] };
}
