/**
 * Blefe — catálogo base (PT-BR). Cada carta: pergunta, resposta verdadeira, sinônimos aceitos,
 * 3 distratores da casa (`houseBluffs`, todos FALSOS) e a explicação mostrada na revelação.
 */
import type { PokemonInfo } from '../../services/externalApis/pokeApiService';
import type { HistoryEvent } from '../../services/externalApis/historyApiService';
import { fmtNum } from '../../services/externalApis/apiClient';

export type BlefeCategory = 'curiosidades' | 'geek' | 'historia' | 'brasil';

export interface BlefeQuestion {
  id: string;
  category: BlefeCategory;
  question: string;
  trueAnswer: string;
  acceptedSynonyms: string[];
  houseBluffs: [string, string, string];
  factExplanation: string;
}

export const BLEFE_CATEGORY_LABEL: Record<BlefeCategory, string> = {
  curiosidades: 'Curiosidades Gerais',
  geek: 'Mundo Pokémon & Geek',
  historia: 'História & Ciência',
  brasil: 'Brasil & Mundo',
};

type Row = [question: string, trueAnswer: string, synonyms: string[], bluffs: [string, string, string], explanation: string];

const CURIOSIDADES: Row[] = [
  ['Em 1932, o exército da Austrália declarou oficialmente uma operação militar contra qual animal nativo?', 'Emus', ['emu', 'ema', 'emas'], ['Cangurus', 'Coelhos', 'Coalas'], 'A "Grande Guerra dos Emus": soldados com metralhadoras tentaram conter milhares de emus que destruíam plantações — e os emus venceram.'],
  ['Qual alimento nunca estraga e já foi encontrado ainda comestível em tumbas do Egito Antigo?', 'Mel', ['o mel'], ['Queijo', 'Tâmaras', 'Pão sírio'], 'O mel tem pouquíssima água e é ácido, por isso bactérias não conseguem se multiplicar nele.'],
  ['Os flamingos ficam cor-de-rosa por causa de quê?', 'Da alimentação', ['alimentacao', 'comida', 'camarao', 'camaroes', 'algas', 'carotenoides', 'o que comem'], ['Um gene raro', 'Do sol forte', 'Uma bactéria na pele'], 'Os pigmentos (carotenoides) de algas e pequenos crustáceos que eles comem tingem as penas. Sem eles, os flamingos ficam brancos.'],
  ['Qual animal tem impressões digitais tão parecidas com as humanas que podem confundir peritos?', 'Coala', ['coalas'], ['Lontra', 'Panda', 'Preguiça'], 'As digitais dos coalas são quase idênticas às nossas, mesmo vistas ao microscópio.'],
  ['Quantos corações tem um polvo?', '3', ['tres', 'três'], ['2', '5', '8'], 'Dois corações bombeiam sangue para as brânquias e um terceiro para o resto do corpo.'],
  ['Qual é a cor do sangue de um polvo?', 'Azul', ['azulado'], ['Verde', 'Transparente', 'Amarelo'], 'O sangue dos polvos usa hemocianina (com cobre) para transportar oxigênio, o que o deixa azul.'],
  ['O vombate (wombat), marsupial australiano, é famoso por produzir o quê em formato de cubo?', 'Cocô', ['fezes', 'coco', 'excremento', 'cocos'], ['Ovos', 'Tocas', 'Pelotas de terra'], 'O intestino do vombate tem elasticidade irregular, que molda as fezes em cubinhos — ótimos para marcar território sem rolar.'],
  ['Botanicamente, qual destas frutas é uma baga (enquanto o morango não é)?', 'Banana', ['bananas'], ['Maçã', 'Abacaxi', 'Manga'], 'Para a botânica, a banana é uma baga; o morango é um "pseudofruto".'],
  ['Quantos ossos tem o corpo de um ser humano adulto?', '206', ['duzentos e seis'], ['212', '198', '230'], 'Bebês nascem com cerca de 300 ossos; muitos se fundem ao longo do crescimento.'],
  ['O coração de qual animal é tão grande que pode pesar mais de 150 kg?', 'Baleia-azul', ['baleia azul', 'baleia'], ['Elefante', 'Girafa', 'Tubarão-baleia'], 'O coração da baleia-azul pode pesar cerca de 180 kg e seus batimentos são ouvidos a quilômetros.'],
  ['Para não se separarem enquanto dormem boiando, lontras-marinhas costumam fazer o quê?', 'Dar as mãos', ['maos dadas', 'de maos dadas', 'segurar as maos', 'dando as maos', 'segurando as maos'], ['Dormir em pé', 'Boiar em círculo', 'Dormir em tocas'], 'Lontras-marinhas dormem de mãos dadas (e também se enrolam em algas) para não serem levadas pela correnteza.'],
  ['Qual é o único mamífero capaz de voar de verdade (não apenas planar)?', 'Morcego', ['morcegos'], ['Esquilo-voador', 'Petauro', 'Lêmure-voador'], 'Esquilos-voadores e petauros apenas planam; os morcegos batem as asas e voam de fato.'],
  ['No verão, a Torre Eiffel pode ficar até quantos centímetros mais alta por causa da dilatação do ferro?', '15', ['15 cm', 'quinze', '15 centimetros'], ['2', '40', '80'], 'O ferro dilata com o calor: a torre "cresce" cerca de 15 cm nos dias mais quentes.'],
  ['Qual planeta do Sistema Solar gira praticamente "deitado", com eixo inclinado em cerca de 98 graus?', 'Urano', [], ['Netuno', 'Saturno', 'Marte'], 'Provavelmente uma colisão gigante no passado tombou Urano, que gira de lado em relação à sua órbita.'],
  ['Em Vênus, um único dia (uma rotação completa) dura mais do que o quê?', 'Um ano venusiano', ['um ano', 'o ano', 'ano', 'o ano venusiano', 'um ano em venus'], ['Um mês terrestre', 'Uma década', 'Uma estação'], 'Vênus leva 243 dias terrestres para girar em torno de si e só 225 para dar a volta no Sol.'],
  ['Qual é o osso mais forte (e mais longo) do corpo humano?', 'Fêmur', ['femur', 'o femur'], ['Crânio', 'Tíbia', 'Mandíbula'], 'O fêmur, osso da coxa, suporta forças várias vezes maiores que o peso do corpo.'],
  ['Por conterem potássio-40, as bananas são levemente o quê?', 'Radioativas', ['radioativa', 'radioativo'], ['Magnéticas', 'Venenosas', 'Alcoólicas'], 'A dose é minúscula e inofensiva — existe até a brincadeira da "dose equivalente de banana" para comparar radiação.'],
];

const GEEK: Row[] = [
  ['Segundo os dados oficiais da Pokédex, o Pokémon Cosmoem pesa incríveis quantos quilogramas?', '999,9 kg', ['999,9', '999.9', '999.9 kg', '999,9 quilos'], ['0,1 kg', '350 kg', '1.500 kg'], 'Cosmoem mede só 10 cm, mas pesa 999,9 kg — o peso máximo registrado na Pokédex (PokéAPI).'],
  ['Qual era o nome original do Pac-Man no lançamento japonês, em 1980?', 'Puck-Man', ['puckman', 'puck man'], ['Pizza-Man', 'Gobble-Man', 'Chomp-Man'], 'O nome mudou no Ocidente porque "Puck" era fácil de vandalizar nos fliperamas.'],
  ['Antes de virar encanador, qual era a profissão do Mario em Donkey Kong (1981)?', 'Carpinteiro', ['marceneiro'], ['Pedreiro', 'Pintor', 'Padeiro'], 'Em Donkey Kong, Mario trabalhava numa construção; só depois virou encanador em Mario Bros. (1983).'],
  ['No primeiro jogo em que apareceu, Donkey Kong (1981), o Mario se chamava como?', 'Jumpman', ['jump man'], ['Hammer Boy', 'Super Guy', 'Little Mario'], 'O nome Mario veio depois, inspirado no dono do armazém da Nintendo nos EUA, Mario Segale.'],
  ['Qual Pokémon é o número #001 da Pokédex Nacional?', 'Bulbasaur', [], ['Pikachu', 'Mew', 'Arceus'], 'Bulbasaur abre a Pokédex Nacional; Pikachu é o #025.'],
  ['O nome "Pikachu" junta "pika" (som de faísca) com "chu", que imita o som de qual animal em japonês?', 'Rato', ['camundongo', 'ratinho'], ['Gato', 'Coelho', 'Esquilo'], '"Chu" é a onomatopeia japonesa para o guincho de um rato.'],
  ['Qual é o Pokémon mais alto da Pokédex em sua forma normal, com 20 metros?', 'Eternatus', [], ['Wailord', 'Celesteela', 'Rayquaza'], 'Eternatus mede 20 m (Wailord tem 14,5 m) — e na forma Eternamax chega a 100 m.'],
  ['Em Dragon Ball, quantas Esferas do Dragão precisam ser reunidas para invocar o Shenlong?', '7', ['sete'], ['5', '9', '12'], 'São sete esferas, identificadas pelo número de estrelas (de 1 a 7).'],
  ['Em Naruto, qual é o verdadeiro nome da Raposa de Nove Caudas?', 'Kurama', ['kyuubi', 'kyubi'], ['Shukaku', 'Gyuki', 'Matatabi'], 'Kurama é o nome da Kyuubi; Shukaku é o Bijuu de uma cauda.'],
  ['Em One Piece, qual navio substituiu o Going Merry no bando do Chapéu de Palha?', 'Thousand Sunny', ['sunny', 'thousand sunny go'], ['Red Force', 'Golden Lion', 'Moby Dick'], 'O Thousand Sunny foi construído por Franky com a madeira lendária Adam.'],
  ['O monstro Creeper, do Minecraft, nasceu de um erro ao modelar qual animal?', 'Porco', ['o porco'], ['Vaca', 'Ovelha', 'Galinha'], 'Notch trocou altura e comprimento ao criar o porco, e o resultado esquisito virou o Creeper.'],
  ['Qual empresa fabricava cartas de baralho (hanafuda) antes de entrar no mundo dos videogames?', 'Nintendo', [], ['Sega', 'Konami', 'Capcom'], 'A Nintendo foi fundada em 1889 em Kyoto como fábrica de cartas hanafuda.'],
  ['Em The Legend of Zelda, qual é o nome do herói controlado pelo jogador?', 'Link', [], ['Zelda', 'Ganon', 'Navi'], 'Zelda é a princesa! O herói de túnica verde se chama Link.'],
  ['Qual Pokémon consegue se transformar em uma cópia de qualquer outro Pokémon?', 'Ditto', [], ['Zorua', 'Kecleon', 'Smeargle'], 'Ditto usa o golpe Transform para copiar aparência, golpes e atributos do adversário.'],
  ['Tetris foi criado em 1984 por um programador de qual país?', 'União Soviética', ['urss', 'russia', 'uniao sovietica', 'russia sovietica'], ['Japão', 'Estados Unidos', 'Finlândia'], 'Alexey Pajitnov criou Tetris num centro de computação da Academia de Ciências da URSS, em Moscou.'],
];

const HISTORIA: Row[] = [
  ['Durante uma caçada organizada para ele, Napoleão Bonaparte foi "atacado" por um enxame de quais animais?', 'Coelhos', ['coelho'], ['Patos', 'Abelhas', 'Javalis'], 'Os coelhos eram domésticos e, achando que seriam alimentados, correram em massa até Napoleão.'],
  ['Cleópatra viveu mais perto (no tempo) da chegada do homem à ____ do que da construção da Grande Pirâmide.', 'Lua', ['a lua'], ['Antártida', 'América', 'Índia'], 'A Grande Pirâmide é de cerca de 2560 a.C.; Cleópatra morreu em 30 a.C. — cerca de 2.000 anos antes da Apollo 11.'],
  ['Qual cientista ganhou o Prêmio Nobel em duas ciências diferentes (Física e Química)?', 'Marie Curie', ['curie', 'marie', 'madame curie'], ['Albert Einstein', 'Isaac Newton', 'Nikola Tesla'], 'Marie Curie ganhou o Nobel de Física (1903) e o de Química (1911).'],
  ['A guerra mais curta da história, entre Reino Unido e Zanzibar (1896), durou cerca de quantos minutos?', '38', ['38 minutos', 'trinta e oito'], ['5', '12', '90'], 'O bombardeio britânico durou cerca de 38 minutos até o sultanato se render.'],
  ['Em 1905, quando publicou a relatividade restrita, Albert Einstein trabalhava em qual tipo de escritório?', 'Escritório de patentes', ['patentes', 'examinador de patentes', 'funcionario de patentes', 'agente de patentes', 'repartição de patentes'], ['Agência dos correios', 'Relojoaria', 'Banco suíço'], 'Einstein era técnico do Escritório de Patentes de Berna, na Suíça, no seu "ano milagroso".'],
  ['Qual era o nome da cadela soviética que foi o primeiro animal a orbitar a Terra, em 1957?', 'Laika', [], ['Belka', 'Sputnika', 'Zvezdochka'], 'Laika voou a bordo do Sputnik 2. Belka e Strelka voaram (e voltaram) em 1960.'],
  ['Qual elemento químico tem o símbolo "Au"?', 'Ouro', [], ['Prata', 'Alumínio', 'Argônio'], '"Au" vem do latim aurum, que significa ouro.'],
  ['Partes da Muralha da China foram erguidas com uma argamassa que levava qual ingrediente cozido?', 'Arroz', ['arroz glutinoso', 'arroz grudento'], ['Feijão', 'Milho', 'Ossos'], 'A argamassa de cal com arroz glutinoso era mais resistente e ajudou a muralha a durar séculos.'],
  ['Apesar dos filmes, os vikings não usavam em batalha capacetes com o quê?', 'Chifres', ['chifre', 'cornos'], ['Penas', 'Asas', 'Pontas de ferro'], 'A imagem dos chifres foi popularizada por figurinos de ópera do século XIX.'],
  ['Na Europa medieval, era comum levar a julgamento por crimes quais "réus" inusitados?', 'Animais', ['bichos', 'porcos', 'animal'], ['Árvores', 'Livros', 'Navios'], 'Porcos, ratos e até insetos foram julgados em tribunais, com direito a advogado.'],
  ['Os astecas usavam sementes de qual planta como dinheiro?', 'Cacau', ['cacao'], ['Milho', 'Café', 'Feijão'], 'Sementes de cacau eram moeda: com elas se compravam desde frutas até roupas.'],
  ['Qual é o único planeta do Sistema Solar cujo nome não vem de um deus greco-romano?', 'Terra', ['a terra', 'planeta terra'], ['Marte', 'Urano', 'Plutão'], 'Todos os outros têm nomes de divindades; "Terra" vem de palavras antigas para o solo.'],
  ['A água-viva Turritopsis dohrnii é famosa por ser biologicamente o quê?', 'Imortal', ['imortais'], ['Gigante', 'Elétrica', 'Carnívora vegetal'], 'Ela consegue voltar ao estágio de pólipo e recomeçar o ciclo de vida — por isso é chamada de "água-viva imortal".'],
  ['Em 1919, uma onda gigante de qual líquido inundou ruas de Boston e matou 21 pessoas?', 'Melaço', ['melaco', 'melado'], ['Cerveja', 'Leite', 'Chocolate'], 'Um tanque com milhões de litros de melaço se rompeu, criando uma onda de até 8 metros.'],
  ['Quantos anos durou, de fato, a "Guerra dos Cem Anos"?', '116', ['116 anos', 'cento e dezesseis'], ['100', '99', '120'], 'O conflito entre Inglaterra e França foi de 1337 a 1453: 116 anos.'],
];

const BRASIL: Row[] = [
  ['Qual é a capital da Austrália?', 'Camberra', ['canberra', 'camberra'], ['Sydney', 'Melbourne', 'Perth'], 'Camberra foi planejada para ser capital como meio-termo entre Sydney e Melbourne.'],
  ['O Brasil faz fronteira com todos os países da América do Sul, exceto Chile e qual outro?', 'Equador', [], ['Uruguai', 'Paraguai', 'Peru'], 'Só Chile e Equador não fazem fronteira com o Brasil.'],
  ['Qual cidade foi a primeira capital do Brasil, antes do Rio de Janeiro?', 'Salvador', [], ['Recife', 'São Paulo', 'Olinda'], 'Salvador foi capital de 1549 a 1763.'],
  ['Qual estado brasileiro faz fronteira com o maior número de outros estados (oito)?', 'Bahia', [], ['Minas Gerais', 'Goiás', 'Tocantins'], 'A Bahia faz divisa com SE, AL, PE, PI, TO, GO, MG e ES.'],
  ['O nome "Brasil" vem de qual árvore?', 'Pau-brasil', ['pau brasil'], ['Ipê', 'Jacarandá', 'Peroba'], 'A madeira avermelhada, cor de brasa, deu nome ao país.'],
  ['Contando seus territórios ultramarinos, qual país tem o maior número de fusos horários?', 'França', ['franca'], ['Rússia', 'Estados Unidos', 'China'], 'Graças a territórios espalhados pelo mundo, a França usa 12 fusos horários.'],
  ['Qual é o menor país do mundo em área?', 'Vaticano', ['cidade do vaticano'], ['Mônaco', 'San Marino', 'Liechtenstein'], 'O Vaticano tem cerca de 0,44 km².'],
  ['Em qual país fica a lendária cidade de Timbuktu?', 'Mali', [], ['Marrocos', 'Níger', 'Egito'], 'Timbuktu, no Mali, foi um grande centro de comércio e estudos islâmicos.'],
  ['Ao longo de praticamente todo o seu curso principal, o Rio Amazonas não tem nenhuma o quê?', 'Ponte', ['pontes'], ['Ilha', 'Curva', 'Praia'], 'O rio é largo demais e cruza áreas pouco habitadas: a travessia é feita de barco.'],
  ['Qual país tem mais pirâmides que o Egito?', 'Sudão', ['sudao'], ['México', 'Peru', 'Guatemala'], 'O Sudão tem mais de 200 pirâmides construídas pelos reis núbios de Kush.'],
  ['Qual país tem o maior número de lagos naturais do mundo?', 'Canadá', ['canada'], ['Finlândia', 'Rússia', 'Suécia'], 'O Canadá concentra mais da metade dos lagos naturais do planeta.'],
  ['Qual é a moeda oficial do Japão?', 'Iene', ['yen', 'ien'], ['Won', 'Yuan', 'Rúpia'], 'O iene (¥) é usado no Japão; o won é coreano e o yuan, chinês.'],
  ['Qual é o ponto mais alto do Brasil?', 'Pico da Neblina', ['neblina'], ['Pico da Bandeira', 'Monte Roraima', 'Pico das Agulhas Negras'], 'O Pico da Neblina, no Amazonas, tem 2.995 m de altitude.'],
  ['Qual inseto, comum no mundo inteiro, praticamente não existe na Islândia?', 'Mosquito', ['mosquitos', 'pernilongo'], ['Abelha', 'Borboleta', 'Formiga'], 'O clima instável, com congelamentos e degelos frequentes, impede o ciclo de vida dos mosquitos.'],
  ['Qual é o maior país da América do Sul depois do Brasil?', 'Argentina', [], ['Peru', 'Colômbia', 'Bolívia'], 'A Argentina tem cerca de 2,8 milhões de km².'],
  ['Qual capital brasileira já se chamou "Nossa Senhora do Desterro"?', 'Florianópolis', ['florianopolis', 'floripa'], ['Salvador', 'Vitória', 'Belém'], 'Desterro virou Florianópolis em 1894, em homenagem a Floriano Peixoto.'],
];

const toQuestions = (rows: Row[], category: BlefeCategory, prefix: string): BlefeQuestion[] =>
  rows.map(([question, trueAnswer, acceptedSynonyms, houseBluffs, factExplanation], i) => ({
    id: `blefe:${prefix}${i}`,
    category,
    question,
    trueAnswer,
    acceptedSynonyms,
    houseBluffs,
    factExplanation,
  }));

export const BLEFE_CATALOG: BlefeQuestion[] = [
  ...toQuestions(CURIOSIDADES, 'curiosidades', 'c'),
  ...toQuestions(GEEK, 'geek', 'g'),
  ...toQuestions(HISTORIA, 'historia', 'h'),
  ...toQuestions(BRASIL, 'brasil', 'b'),
];

// ---------- geradores dinâmicos (APIs) ----------

/** Pergunta de lacuna com peso/altura oficiais da Pokédex (PokéAPI). Distratores numéricos plausíveis. */
export function pokemonBlefeQuestion(p: PokemonInfo, rng: () => number): BlefeQuestion | null {
  const byWeight = rng() < 0.6;
  const v = byWeight ? p.weightKg : p.heightM;
  if (!Number.isFinite(v) || v <= 0) return null;
  const unit = byWeight ? 'kg' : 'm';
  const f = (n: number) => `${fmtNum(n)} ${unit}`;
  const factors = [0.25, 0.5, 2, 3.5, 6];
  const bluffs = new Set<string>();
  for (const k of factors.sort(() => rng() - 0.5)) {
    const n = Math.max(0.1, Math.round(v * k * 10) / 10);
    if (n !== v) bluffs.add(f(n));
    if (bluffs.size === 3) break;
  }
  if (bluffs.size < 3) return null;
  return {
    id: `blefe:poke-${p.id}-${byWeight ? 'w' : 'h'}`,
    category: 'geek',
    question: `Segundo os dados oficiais da Pokédex, o Pokémon ${p.name} ${byWeight ? 'pesa' : 'mede'} quantos ${byWeight ? 'quilogramas' : 'metros'}?`,
    trueAnswer: f(v),
    acceptedSynonyms: [fmtNum(v), String(v), `${v} ${unit}`],
    houseBluffs: [...bluffs] as [string, string, string],
    factExplanation: `Dado oficial da PokéAPI: ${p.name} ${byWeight ? 'pesa' : 'mede'} ${f(v)}.`,
  };
}

/** Pergunta de ano a partir de um evento real do "Neste dia" da Wikipédia PT-BR. */
export function historyBlefeQuestion(e: HistoryEvent, rng: () => number): BlefeQuestion | null {
  if (e.year < 100) return null;
  const offsets = [-37, -12, -5, 6, 14, 41].sort(() => rng() - 0.5).slice(0, 3);
  const now = new Date().getFullYear();
  const bluffs = offsets.map((o) => String(Math.min(now, e.year + o)));
  if (new Set(bluffs).size < 3 || bluffs.includes(String(e.year))) return null;
  return {
    id: `blefe:wiki-${e.year}-${e.text.slice(0, 12)}`,
    category: 'historia',
    question: `Em que ano aconteceu isto? "${e.text}"`,
    trueAnswer: String(e.year),
    acceptedSynonyms: [],
    houseBluffs: bluffs as [string, string, string],
    factExplanation: 'Fonte: Wikipédia em português — seção "Neste dia".',
  };
}
