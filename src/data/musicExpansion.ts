/**
 * Adivinhe a Música — expansão de catálogo (gêneros e modalidades).
 *
 * DIREITOS AUTORAIS: nenhum trecho literal de letra e nenhum áudio. Só descrições, contexto,
 * curiosidades sobre artistas e temas PARAFRASEADOS (mesmo modelo do catálogo original).
 */
import type { Song } from './defaultPacks';

/** Filtros de gênero selecionáveis pelo anfitrião (rodadas temáticas). */
export type MusicFilter = 'all' | 'funk' | 'sertanejo' | 'pop' | 'rock' | 'rap' | 'internacional' | 'anime' | 'games' | 'classicos';

export const MUSIC_FILTERS: { value: MusicFilter; label: string }[] = [
  { value: 'all', label: 'Todos os gêneros' },
  { value: 'funk', label: 'Funk' },
  { value: 'sertanejo', label: 'Sertanejo' },
  { value: 'pop', label: 'Pop' },
  { value: 'rock', label: 'Rock' },
  { value: 'rap', label: 'Rap / Trap' },
  { value: 'internacional', label: 'Música Internacional' },
  { value: 'anime', label: 'Música de Anime' },
  { value: 'games', label: 'Música de Videogames' },
  { value: 'classicos', label: 'Clássicos Brasileiros / MPB / Pagode' },
];

/** Músicas do catálogo original que são internacionais / de games (para os filtros novos). */
const INTL_IDS = new Set(['i01', 'i02', 'i03', 'i04', 'i05', 'i06', 'i07', 'i08', 'i09', 'i10', 'p01', 'p02', 'p03', 'p04', 'p05', 'p08', 'p09', 'h02', 'h03', 'h04', 'h05', 'h06']);
const GAME_IDS = new Set(['g05', 'g10']);

/** Em quais filtros a música entra. */
export function songFilters(s: Song): MusicFilter[] {
  const out: MusicFilter[] = [];
  switch (s.genre) {
    case 'Funk':
      out.push('funk');
      break;
    case 'Sertanejo':
      out.push('sertanejo');
      break;
    case 'Pop':
      out.push('pop');
      break;
    case 'Rock Nacional':
    case 'Rock Internacional':
      out.push('rock');
      break;
    case 'Rap/Trap':
      out.push('rap');
      break;
    case 'Clássicos Brasileiros':
    case 'Pagode & Samba':
      out.push('classicos');
      break;
    case 'Anime':
      out.push('anime');
      break;
    case 'Videogames':
      out.push('games');
      break;
    case 'Games & Animes':
      out.push(GAME_IDS.has(s.id) ? 'games' : 'anime');
      break;
  }
  if (s.intl || INTL_IDS.has(s.id)) out.push('internacional');
  return out;
}

export function matchesFilter(s: Song, filter: string): boolean {
  if (!filter || filter === 'all') return true;
  if (MUSIC_FILTERS.some((f) => f.value === filter)) return songFilters(s).includes(filter as MusicFilter);
  return s.genre === filter; // compatibilidade com configs antigas (nome exato do gênero)
}

export const EXTRA_SONGS: Song[] = [
  // Funk
  { id: 'f01', title: 'Rap da Felicidade', artist: 'Cidinho & Doca', era: 'Anos 1990', genre: 'Funk', hint: 'Um pedido simples de paz feito por quem nasceu e cresceu na comunidade', curiosity: 'Virou um dos hinos do funk carioca dos anos 90 e é cantado até hoje em coro nos bailes', theme: 'O morador só deseja viver tranquilo e ter orgulho do lugar onde nasceu' },
  { id: 'f02', title: 'Baile de Favela', artist: 'MC João', era: 'Anos 2010', genre: 'Funk', hint: 'Um chamado para a dança no baile que virou hino das festas em 2016', curiosity: 'Virou febre nacional entre 2015 e 2016 e é presença garantida em qualquer festa', theme: 'A animação de quem chega ao baile pronto para dançar a noite toda' },
  { id: 'f03', title: 'Bum Bum Tam Tam', artist: 'MC Fioti', era: 'Anos 2010', genre: 'Funk', hint: 'Um funk que pegou emprestada a flauta de um compositor clássico alemão', curiosity: 'A melodia de flauta é inspirada em uma peça de Johann Sebastian Bach e o clipe passou de 1 bilhão de visualizações', theme: 'Um chamado para a dança com batida marcada e repetitiva' },
  { id: 'f04', title: 'Olha a Explosão', artist: 'MC Kevinho', era: 'Anos 2010', genre: 'Funk', hint: 'Um aviso de que algo vai “estourar” quando a dançarina começa a rebolar', curiosity: 'Fez do jovem MC paulista um dos nomes mais tocados do funk em 2017', theme: 'O cantor se impressiona com a energia de quem domina a pista' },
  { id: 'f05', title: 'Vai Malandra', artist: 'Anitta', era: 'Anos 2010', genre: 'Funk', hint: 'Um clipe gravado em uma laje no Rio que viralizou no mundo todo', curiosity: 'O vídeo foi gravado no Morro do Vidigal e reuniu MC Zaac, Maejor e o duo Tropkillaz', theme: 'Uma provocação divertida para a malandragem mostrar o rebolado' },
  { id: 'f06', title: 'Deu Onda', artist: 'MC G15', era: 'Anos 2010', genre: 'Funk', hint: 'Uma “onda” de sentimento que bate do nada quando a pessoa amada aparece', curiosity: 'Ganhou versões, paródias e covers por todo o Brasil em 2017', theme: 'Ele tenta resistir, mas o sentimento por alguém volta com tudo' },
  // Pagode & Samba / MPB
  { id: 'm01', title: 'Deixa a Vida Me Levar', artist: 'Zeca Pagodinho', era: 'Anos 2000', genre: 'Pagode & Samba', hint: 'Um samba sobre levar a vida sem pressa e agradecer pelo que se tem', curiosity: 'Foi adotado como trilha da Seleção Brasileira na conquista do pentacampeonato em 2002', theme: 'Ele aceita os altos e baixos e confia que tudo vai se ajeitar' },
  { id: 'm02', title: 'Trem das Onze', artist: 'Adoniran Barbosa', era: 'Anos 1960', genre: 'Pagode & Samba', hint: 'Um namorado precisa ir embora cedo por causa do último transporte do dia', curiosity: 'Clássico do samba paulistano que cita o bairro do Jaçanã', theme: 'Ele não pode ficar mais porque a mãe não dorme enquanto ele não chega' },
  { id: 'm03', title: 'Cheia de Manias', artist: 'Raça Negra', era: 'Anos 1990', genre: 'Pagode & Samba', hint: 'Um apaixonado lista os jeitinhos difíceis da pessoa amada, mas não abre mão dela', curiosity: 'O grupo paulista foi um dos maiores vendedores de discos do pagode romântico dos anos 90', theme: 'Ela tem um jeito complicado, e é justamente isso que ele ama' },
  { id: 'm04', title: 'Mineirinho', artist: 'Só Pra Contrariar', era: 'Anos 1990', genre: 'Pagode & Samba', hint: 'Um pagode animado com nome de quem nasceu em Minas Gerais', curiosity: 'O grupo é de Uberlândia (MG) e foi um dos fenômenos de vendas do pagode nos anos 90', theme: 'Um pagode dançante e bem-humorado que virou coreografia nas festas' },
  { id: 'm05', title: 'O Que É, O Que É?', artist: 'Gonzaguinha', era: 'Anos 1980', genre: 'Clássicos Brasileiros', hint: 'Uma reflexão sobre a vida ser bonita apesar de tudo, cantada em coro em todo o país', curiosity: 'O autor é filho do Rei do Baião, Luiz Gonzaga', theme: 'Viver é aprender, sem ter vergonha de ser feliz' },
  { id: 'm06', title: 'Velha Infância', artist: 'Tribalistas', era: 'Anos 2000', genre: 'Clássicos Brasileiros', hint: 'Uma declaração doce de um trio que juntou três gigantes da MPB', curiosity: 'O trio reuniu Arnaldo Antunes, Marisa Monte e Carlinhos Brown', theme: 'Estar com a pessoa amada é como voltar a brincar de criança' },
  { id: 'm07', title: 'Sozinho', artist: 'Caetano Veloso', era: 'Anos 1990', genre: 'Clássicos Brasileiros', hint: 'Uma canção de Peninha que estourou numa gravação ao vivo de um cantor baiano', curiosity: 'A versão ao vivo do álbum “Prenda Minha” (1998) tocou sem parar nas rádios', theme: 'Alguém se sente sozinho mesmo estando ao lado de quem ama' },
  // Sertanejo
  { id: 's08', title: 'É o Amor', artist: 'Zezé Di Camargo & Luciano', era: 'Anos 1990', genre: 'Sertanejo', hint: 'A música que tirou dois irmãos goianos do anonimato', curiosity: 'A trajetória da dupla virou o filme “2 Filhos de Francisco” (2005)', theme: 'Ele admite que o sentimento é maior do que qualquer explicação' },
  { id: 's09', title: 'Ciumeira', artist: 'Marília Mendonça', era: 'Anos 2010', genre: 'Sertanejo', hint: 'Um encontro inesperado com o ex acompanhado desperta um sentimento incontrolável', curiosity: 'Faz parte do projeto “Todos os Cantos”, gravado em várias capitais do Brasil', theme: 'Mesmo separados, ver o ex com outra pessoa ainda dói' },
  { id: 's10', title: 'Largado às Traças', artist: 'Zé Neto & Cristiano', era: 'Anos 2010', genre: 'Sertanejo', hint: 'Um homem abandonado compara a si mesmo a algo esquecido no fundo do armário', curiosity: 'Foi um dos maiores sucessos da dupla, tocando em todo o país em 2017', theme: 'Depois do fim, ele se sente deixado de lado e sem cuidado' },
  { id: 's11', title: 'Batom de Cereja', artist: 'Israel & Rodolffo', era: 'Anos 2020', genre: 'Sertanejo', hint: 'Uma marca de cor e sabor de fruta denuncia um encontro', curiosity: 'Ganhou força depois que um dos cantores participou de um reality show em 2021', theme: 'O rastro deixado por alguém não sai da cabeça dele' },
  // Rock
  { id: 'r11', title: 'Que País É Esse', artist: 'Legião Urbana', era: 'Anos 1980', genre: 'Rock Nacional', hint: 'Uma pergunta indignada sobre os problemas do Brasil, escrita ainda no fim dos anos 70', curiosity: 'Renato Russo compôs a música na época do Aborto Elétrico, antes da Legião existir', theme: 'Crítica à corrupção e à desigualdade do país' },
  { id: 'r12', title: 'Eduardo e Mônica', artist: 'Legião Urbana', era: 'Anos 1980', genre: 'Rock Nacional', hint: 'A história de um casal completamente diferente que, mesmo assim, dá certo', curiosity: 'Virou filme de longa-metragem lançado em 2022', theme: 'Ele é mais novo e ingênuo, ela é mais velha e intelectual — e eles se completam' },
  { id: 'i11', title: 'Smoke on the Water', artist: 'Deep Purple', era: 'Anos 1970', genre: 'Rock Internacional', hint: 'Um incêndio num cassino à beira de um lago suíço vira um dos riffs mais famosos do rock', curiosity: 'Conta o incêndio durante um show de Frank Zappa em Montreux, em 1971', theme: 'A banda narra o fogo e a fumaça sobre o lago enquanto tentava gravar um disco' },
  { id: 'i12', title: 'Zombie', artist: 'The Cranberries', era: 'Anos 1990', genre: 'Rock Internacional', hint: 'Um protesto irlandês contra a violência que atinge inocentes', curiosity: 'Foi escrita após um atentado em Warrington, na Inglaterra, em 1993', theme: 'A dor de ver um conflito antigo continuar matando crianças' },
  // Pop internacional
  { id: 'p10', title: 'Uptown Funk', artist: 'Mark Ronson ft. Bruno Mars', era: 'Anos 2010', genre: 'Pop', hint: 'Um convite cheio de metais e atitude para a festa começar de vez', curiosity: 'Ficou 14 semanas no topo da Billboard Hot 100 em 2015', theme: 'O cantor está se sentindo bonito demais e manda todo mundo dançar', intl: true },
  { id: 'p11', title: 'Someone Like You', artist: 'Adele', era: 'Anos 2010', genre: 'Pop', hint: 'Só voz e piano para desejar felicidades a um ex que já seguiu em frente', curiosity: 'Faz parte do álbum “21”, um dos discos mais vendidos do século XXI', theme: 'Ela aceita o fim, mas promete encontrar alguém parecido', intl: true },
  { id: 'p12', title: 'Bad Guy', artist: 'Billie Eilish', era: 'Anos 2010', genre: 'Pop', hint: 'Uma adolescente debocha de quem se acha durão, sobre um baixo sussurrado', curiosity: 'Foi produzida no quarto de casa pelo irmão da cantora, Finneas', theme: 'Ela vira o jogo e mostra que a “malvada” da história é ela', intl: true },
  { id: 'p13', title: 'Thriller', artist: 'Michael Jackson', era: 'Anos 1980', genre: 'Pop', hint: 'Um clipe-curta de terror com zumbis dançando em sincronia', curiosity: 'O videoclipe de cerca de 14 minutos foi dirigido por John Landis', theme: 'Uma noite assustadora em que monstros cercam um casal', intl: true },
  { id: 'p14', title: "Hips Don't Lie", artist: 'Shakira ft. Wyclef Jean', era: 'Anos 2000', genre: 'Pop', hint: 'Uma colombiana garante que o quadril não sabe mentir', curiosity: 'Foi um dos maiores sucessos de 2006 e chegou ao topo da Billboard Hot 100', theme: 'A dança revela o que as palavras não dizem', intl: true },
  { id: 'p15', title: 'Flowers', artist: 'Miley Cyrus', era: 'Anos 2020', genre: 'Pop', hint: 'Uma ex-estrela da Disney descobre que pode se dar flores sozinha', curiosity: 'Bateu recordes de streaming em sua primeira semana, em janeiro de 2023', theme: 'Amor-próprio depois do fim de um casamento', intl: true },
  { id: 'p16', title: 'Dancing Queen', artist: 'ABBA', era: 'Anos 1970', genre: 'Pop', hint: 'Uma jovem de 17 anos vira a rainha da pista de dança', curiosity: 'O quarteto sueco apresentou a música na véspera do casamento do rei da Suécia, em 1976', theme: 'A alegria de dançar sem preocupação numa sexta à noite', intl: true },
  // Rap / Trap
  { id: 'h07', title: 'Negro Drama', artist: "Racionais MC's", era: 'Anos 2000', genre: 'Rap/Trap', hint: 'Um retrato cru da vida de quem vem da periferia e enfrenta o preconceito', curiosity: 'Está no álbum “Nada Como Um Dia Após o Outro Dia” (2002)', theme: 'A trajetória de luta, desconfiança e sobrevivência na quebrada' },
  { id: 'h08', title: 'AmarElo', artist: 'Emicida ft. Majur e Pabllo Vittar', era: 'Anos 2010', genre: 'Rap/Trap', hint: 'Um rap de esperança que pega emprestado um verso de Belchior', curiosity: 'Usa um sample de “Sujeito de Sorte”, de Belchior', theme: 'Superar a dor do ano passado e seguir vivo e de pé' },
  { id: 'h09', title: 'Quem Tem Um Amigo (Tem Tudo)', artist: 'Emicida ft. Zeca Pagodinho', era: 'Anos 2010', genre: 'Rap/Trap', hint: 'Um encontro de rap e samba para celebrar a amizade', curiosity: 'Faz parte do álbum “AmarElo” (2019)', theme: 'Ter amigos verdadeiros é a maior riqueza que existe' },
  { id: 'h10', title: 'Rap God', artist: 'Eminem', era: 'Anos 2010', genre: 'Rap/Trap', hint: 'Seis minutos de rimas em velocidade absurda de um rapper de Detroit', curiosity: 'Entrou para o Guinness por ter a maior quantidade de palavras em um single de sucesso', theme: 'Ele se coloca como uma divindade do rap e desafia quem duvidar', intl: true },
  { id: 'h11', title: 'Old Town Road', artist: 'Lil Nas X', era: 'Anos 2010', genre: 'Rap/Trap', hint: 'Um trap com cavalo, chapéu de caubói e banjo', curiosity: 'Ficou 19 semanas no topo da Billboard Hot 100, recorde na época', theme: 'Um caubói moderno vai cavalgar até não poder mais', intl: true },
  { id: 'h12', title: 'Hotline Bling', artist: 'Drake', era: 'Anos 2010', genre: 'Rap/Trap', hint: 'Um canadense sente falta de quando a ex ligava tarde da noite', curiosity: 'O clipe com a dança do cantor em cenário colorido virou um meme mundial', theme: 'Ele não aceita que ela mudou depois que ele foi embora', intl: true },
  { id: 'h13', title: 'Máquina do Tempo', artist: 'Matuê', era: 'Anos 2020', genre: 'Rap/Trap', hint: 'Um trapper cearense imagina voltar ao passado', curiosity: 'O artista de Fortaleza é um dos maiores nomes do trap brasileiro', theme: 'Lembranças, conquistas e a vontade de rever momentos que passaram' },
  // Anime
  { id: 'a01', title: 'We Are!', artist: 'Hiroshi Kitadani', era: 'Anos 1990', genre: 'Anime', hint: 'Primeira abertura de um anime sobre piratas atrás do maior tesouro do mundo', curiosity: 'Abertura de One Piece, regravada em várias comemorações do anime', theme: 'Uma tripulação parte em busca de aventura e de seus sonhos' },
  { id: 'a02', title: 'Again', artist: 'YUI', era: 'Anos 2000', genre: 'Anime', hint: 'Abertura de dois irmãos alquimistas que perderam muito numa transmutação proibida', curiosity: 'Primeira abertura de Fullmetal Alchemist: Brotherhood (2009)', theme: 'Recomeçar depois de perder algo importante' },
  { id: 'a03', title: 'Silhouette', artist: 'KANA-BOON', era: 'Anos 2010', genre: 'Anime', hint: 'Abertura acelerada de um ninja que relembra a infância com os amigos', curiosity: 'Foi a 16ª abertura de Naruto Shippuden', theme: 'Memórias da juventude que continuam guiando o caminho' },
  { id: 'a04', title: 'Kick Back', artist: 'Kenshi Yonezu', era: 'Anos 2020', genre: 'Anime', hint: 'Abertura caótica de um jovem que vira um caçador com motosserras no corpo', curiosity: 'Abertura de Chainsaw Man (2022), anime produzido pelo estúdio MAPPA', theme: 'Desejos simples de quem só quer uma vida melhor, gritados com fúria' },
  { id: 'a05', title: 'Idol', artist: 'YOASOBI', era: 'Anos 2020', genre: 'Anime', hint: 'Abertura de um anime sobre os bastidores sombrios do mundo das idols', curiosity: 'Abertura de Oshi no Ko (2023), virou fenômeno mundial nas plataformas de streaming', theme: 'A estrela perfeita que esconde mentiras atrás do sorriso' },
  { id: 'a06', title: 'Tank!', artist: 'Seatbelts', era: 'Anos 1990', genre: 'Anime', hint: 'Abertura instrumental de jazz com metais frenéticos para caçadores de recompensa no espaço', curiosity: 'Composta por Yoko Kanno para Cowboy Bebop', theme: 'Instrumental — a energia de uma perseguição espacial' },
  { id: 'a07', title: 'Butter-Fly', artist: 'Kōji Wada', era: 'Anos 1990', genre: 'Anime', hint: 'Abertura de crianças levadas para um mundo digital com monstrinhos parceiros', curiosity: 'Abertura de Digimon Adventure (1999)', theme: 'Voar alto em direção ao futuro, mesmo sem saber o caminho' },
  { id: 'a08', title: 'Moonlight Densetsu', artist: 'DALI', era: 'Anos 1990', genre: 'Anime', hint: 'Abertura de uma estudante que se transforma em guerreira guiada pela lua', curiosity: 'Primeira abertura de Sailor Moon (1992)', theme: 'Um amor sonhador sob a luz da lua' },
  // Videogames
  { id: 'v01', title: 'Super Mario Bros. Theme', artist: 'Koji Kondo', era: 'Anos 1980', genre: 'Videogames', hint: 'A melodia do primeiro mundo de um encanador que pula em cogumelos', curiosity: 'Composta em 1985 para o NES; é uma das músicas de games mais reconhecidas do mundo', theme: 'Instrumental — ritmo saltitante de aventura em plataforma' },
  { id: 'v02', title: 'Korobeiniki (Tema de Tetris)', artist: 'Canção folclórica russa', era: 'Anos 1980', genre: 'Videogames', hint: 'Uma canção folclórica russa que embalou peças caindo em um jogo de encaixe', curiosity: 'O arranjo mais famoso é a versão do Tetris para Game Boy (1989)', theme: 'Instrumental — acelera conforme as peças caem mais rápido', aliases: ['Korobeiniki', 'Tetris', 'Tema de Tetris', 'Tetris Theme'] },
  { id: 'v03', title: 'Baba Yetu', artist: 'Christopher Tin', era: 'Anos 2000', genre: 'Videogames', hint: 'O Pai-Nosso cantado em suaíli na abertura de um jogo de estratégia histórica', curiosity: 'Tema de Civilization IV, foi a primeira música de videogame a ganhar um Grammy (2011)', theme: 'Coral grandioso com uma oração em suaíli' },
  { id: 'v04', title: 'Dragonborn', artist: 'Jeremy Soule', era: 'Anos 2010', genre: 'Videogames', hint: 'Um coral grave cantando em língua de dragão nas montanhas geladas', curiosity: 'Tema principal de The Elder Scrolls V: Skyrim (2011)', theme: 'A profecia de um herói nascido com a alma de dragão' },
  { id: 'v05', title: 'Sweden', artist: 'C418', era: 'Anos 2010', genre: 'Videogames', hint: 'Um piano calmo e nostálgico num mundo feito de blocos', curiosity: 'Faz parte da trilha de Minecraft (Volume Alpha, 2011)', theme: 'Instrumental — tranquilidade de um amanhecer quadrado' },
  { id: 'v06', title: 'Song of Storms', artist: 'Koji Kondo', era: 'Anos 1990', genre: 'Videogames', hint: 'Uma melodia de ocarina que faz chover num moinho', curiosity: 'Aparece em The Legend of Zelda: Ocarina of Time (1998)', theme: 'Instrumental — valsa alegre que chama uma tempestade' },
  { id: 'v07', title: 'One-Winged Angel', artist: 'Nobuo Uematsu', era: 'Anos 1990', genre: 'Videogames', hint: 'Coral em latim para a batalha final contra um vilão de cabelo prateado', curiosity: 'Tema de Sephiroth em Final Fantasy VII (1997)', theme: 'Orquestra e coro anunciando o confronto definitivo' },
];

/* ─────────────────────────── Banco de quiz (modalidades de informação) ─────────────────────────── */

export type QuizKind = 'artista' | 'info' | 'contexto' | 'decadas' | 'generos';

export const QUIZ_KIND_LABEL: Record<QuizKind, string> = {
  artista: 'Adivinhe o Artista',
  info: 'Complete a Informação',
  contexto: 'Identifique pelo Contexto',
  decadas: 'Décadas Musicais',
  generos: 'Gêneros & Estilos',
};

export interface MusicQuizItem {
  id: string;
  kind: QuizKind;
  filters: MusicFilter[];
  question: string;
  options: [string, string, string, string];
  /** Índice da alternativa correta em `options`. */
  answer: 0 | 1 | 2 | 3;
  note: string;
}

type Q = [kind: QuizKind, filters: MusicFilter[], question: string, options: [string, string, string, string], answer: 0 | 1 | 2 | 3, note: string];

const QUIZ_ROWS: Q[] = [
  // Complete a informação (ano, parceria, curiosidade)
  ['info', ['classicos'], 'Em que ano foi realizado o primeiro Rock in Rio?', ['1985', '1979', '1991', '1988'], 0, 'O primeiro Rock in Rio aconteceu em janeiro de 1985, no Rio de Janeiro.'],
  ['info', ['rock', 'internacional'], 'Qual banda britânica tinha Freddie Mercury como vocalista?', ['Queen', 'The Who', 'Pink Floyd', 'Deep Purple'], 0, 'Freddie Mercury liderou o Queen de 1970 até 1991.'],
  ['info', ['pop', 'internacional'], 'Qual artista é conhecido como o “Rei do Pop”?', ['Michael Jackson', 'Prince', 'Elvis Presley', 'Justin Timberlake'], 0, 'Michael Jackson recebeu o apelido de Rei do Pop nos anos 80.'],
  ['info', ['rock', 'internacional'], 'Qual artista é chamado de “Rei do Rock”?', ['Elvis Presley', 'Chuck Berry', 'Mick Jagger', 'Little Richard'], 0, 'Elvis Presley ganhou o apelido de Rei do Rock (and Roll).'],
  ['info', ['classicos'], 'Qual cantora brasileira ficou conhecida como “Pimentinha”?', ['Elis Regina', 'Gal Costa', 'Rita Lee', 'Maria Bethânia'], 0, 'O apelido foi dado a Elis Regina por Vinicius de Moraes, por causa do temperamento forte.'],
  ['info', ['classicos'], 'Qual movimento musical brasileiro teve Caetano Veloso e Gilberto Gil como líderes no fim dos anos 60?', ['Tropicália', 'Bossa Nova', 'Jovem Guarda', 'Clube da Esquina'], 0, 'A Tropicália (1967–1968) misturou rock, MPB e vanguarda.'],
  ['info', ['classicos'], 'Qual artista é chamado de “Rei” da música brasileira e liderou a Jovem Guarda?', ['Roberto Carlos', 'Erasmo Carlos', 'Tim Maia', 'Wanderléa'], 0, 'Roberto Carlos comandava o programa Jovem Guarda na TV Record nos anos 60.'],
  ['info', ['classicos'], 'Luiz Gonzaga ficou conhecido como o Rei de qual ritmo?', ['Baião', 'Frevo', 'Samba', 'Axé'], 0, 'Luiz Gonzaga, o Rei do Baião, levou a música nordestina para todo o Brasil.'],
  ['info', ['sertanejo'], 'Qual cantora sertaneja ficou conhecida como a “Rainha da Sofrência”?', ['Marília Mendonça', 'Maiara', 'Paula Fernandes', 'Simone Mendes'], 0, 'Marília Mendonça popularizou o “feminejo” com canções sobre desilusão amorosa.'],
  ['info', ['sertanejo'], 'Qual filme de 2005 conta a história da dupla Zezé Di Camargo & Luciano?', ['2 Filhos de Francisco', 'Cazuza', 'Tim Maia', 'Gonzaga: De Pai pra Filho'], 0, '“2 Filhos de Francisco” foi um dos filmes nacionais mais vistos da década.'],
  ['info', ['funk', 'pop'], 'Qual cantora brasileira chegou ao topo do ranking global do Spotify com “Envolver”, em 2022?', ['Anitta', 'Ludmilla', 'Pabllo Vittar', 'IZA'], 0, 'Anitta foi a primeira artista solo brasileira a liderar o ranking global do Spotify.'],
  ['info', ['funk'], 'O funk carioca nasceu fortemente influenciado por qual estilo americano de Miami?', ['Miami Bass', 'Grunge', 'Country', 'Disco'], 0, 'As batidas do Miami Bass chegaram aos bailes do Rio nos anos 80 e deram origem ao funk carioca.'],
  ['info', ['funk'], 'Qual produtor e diretor ficou famoso pelos clipes de funk paulista com milhões de visualizações?', ['KondZilla', 'Dennis DJ', 'DJ Marlboro', 'Papatinho'], 0, 'O canal KondZilla se tornou um dos maiores canais de música do YouTube no mundo.'],
  ['info', ['funk'], 'Qual DJ é considerado um dos pioneiros a popularizar o funk carioca nos anos 80 e 90?', ['DJ Marlboro', 'DJ Alok', 'DJ Rennan da Penha', 'DJ Guuga'], 0, 'DJ Marlboro lançou a coletânea “Funk Brasil” em 1989, marco do gênero.'],
  ['info', ['rap'], 'Qual grupo de rap paulista lançou o álbum “Sobrevivendo no Inferno” (1997)?', ["Racionais MC's", 'Facção Central', 'Sabotage', 'RZO'], 0, 'O disco virou leitura obrigatória no vestibular da Unicamp em 2020.'],
  ['info', ['rap', 'internacional'], 'Qual rapper interpretou um personagem inspirado na própria vida no filme “8 Mile” (2002)?', ['Eminem', '50 Cent', 'Dr. Dre', 'Snoop Dogg'], 0, '“Lose Yourself”, da trilha, ganhou o Oscar de Melhor Canção Original.'],
  ['info', ['rap', 'internacional'], 'Qual rapper ganhou o Prêmio Pulitzer de Música em 2018?', ['Kendrick Lamar', 'Jay-Z', 'Kanye West', 'Drake'], 0, 'Kendrick Lamar venceu com o álbum “DAMN.”, o primeiro trabalho fora da música clássica e do jazz a ganhar o prêmio.'],
  ['info', ['rock'], 'Qual banda brasileira tinha um vocalista chamado Dinho e fez sucesso meteórico em 1995–1996?', ['Mamonas Assassinas', 'Raimundos', 'Ultraje a Rigor', 'Skank'], 0, 'Os Mamonas Assassinas venderam milhões de discos antes do acidente aéreo em 1996.'],
  ['info', ['rock'], 'Qual banda tinha Renato Russo como vocalista?', ['Legião Urbana', 'Capital Inicial', 'Titãs', 'Barão Vermelho'], 0, 'A Legião Urbana surgiu em Brasília em 1982.'],
  ['info', ['rock'], 'Cazuza começou a carreira como vocalista de qual banda?', ['Barão Vermelho', 'Kid Abelha', 'Blitz', 'Os Paralamas do Sucesso'], 0, 'Cazuza saiu do Barão Vermelho em 1985 para seguir carreira solo.'],
  ['info', ['rock', 'internacional'], 'Quantos integrantes tinham os Beatles?', ['4', '3', '5', '6'], 0, 'John, Paul, George e Ringo.'],
  ['info', ['rock', 'internacional'], 'De qual cidade inglesa vieram os Beatles?', ['Liverpool', 'Manchester', 'Londres', 'Birmingham'], 0, 'A banda se formou em Liverpool no fim dos anos 50.'],
  ['info', ['pop', 'internacional'], 'Qual cantora tem fãs chamados de “Swifties”?', ['Taylor Swift', 'Ariana Grande', 'Katy Perry', 'Selena Gomez'], 0, 'A turnê “The Eras Tour” se tornou a mais lucrativa da história.'],
  ['info', ['pop', 'internacional'], 'Qual grupo sul-coreano tem fãs chamados de “ARMY”?', ['BTS', 'BLACKPINK', 'EXO', 'TWICE'], 0, 'O BTS foi o primeiro grupo de K-pop a liderar a Billboard Hot 100.'],
  ['info', ['pop', 'internacional'], '“Gangnam Style” foi o primeiro vídeo do YouTube a atingir qual marca de visualizações?', ['1 bilhão', '100 milhões', '500 milhões', '10 bilhões'], 0, 'O clipe de PSY passou de 1 bilhão de views em dezembro de 2012.'],
  ['info', ['anime'], 'Qual anime tem como abertura “Gurenge”, de LiSA?', ['Demon Slayer', 'Naruto', 'Jujutsu Kaisen', 'Bleach'], 0, '“Gurenge” é a abertura da primeira temporada de Kimetsu no Yaiba.'],
  ['info', ['anime'], 'Hironobu Kageyama ficou famoso por cantar a abertura de qual anime nos anos 80?', ['Dragon Ball Z', 'Pokémon', 'Sailor Moon', 'Yu Yu Hakusho'], 0, 'Ele canta “Cha-La Head-Cha-La”, abertura de Dragon Ball Z.'],
  ['info', ['games'], 'Qual compositor criou as trilhas clássicas de Super Mario e The Legend of Zelda?', ['Koji Kondo', 'Nobuo Uematsu', 'Yoko Shimomura', 'Akira Yamaoka'], 0, 'Koji Kondo trabalha na Nintendo desde 1984.'],
  ['info', ['games'], 'Qual compositor é famoso pelas trilhas da série Final Fantasy?', ['Nobuo Uematsu', 'Koji Kondo', 'Hans Zimmer', 'Toby Fox'], 0, 'Uematsu compôs as trilhas dos principais jogos da série por décadas.'],
  ['info', ['games'], 'Qual foi a primeira música de videogame a vencer um Grammy?', ['Baba Yetu', 'Still Alive', 'Megalovania', 'Dragonborn'], 0, '“Baba Yetu”, de Civilization IV, venceu em 2011.'],
  ['info', ['games'], 'O jogo Undertale (2015), com a trilha de “Megalovania”, foi criado quase sozinho por quem?', ['Toby Fox', 'Notch', 'Hideo Kojima', 'Shigeru Miyamoto'], 0, 'Toby Fox escreveu, programou e compôs a trilha do jogo.'],
  // Décadas musicais
  ['decadas', ['classicos'], 'Em que década surgiu a Bossa Nova?', ['Anos 1950', 'Anos 1970', 'Anos 1930', 'Anos 1990'], 0, 'O marco é o disco “Chega de Saudade”, de João Gilberto (1959).'],
  ['decadas', ['pop', 'internacional'], 'A “disco music” dominou as pistas em qual década?', ['Anos 1970', 'Anos 1950', 'Anos 1990', 'Anos 2010'], 0, 'Bee Gees, ABBA e Donna Summer marcaram a era disco.'],
  ['decadas', ['rock'], 'Em que década o grunge de Seattle explodiu nas paradas?', ['Anos 1990', 'Anos 1970', 'Anos 2000', 'Anos 1960'], 0, 'Nirvana e Pearl Jam lideraram o movimento no início dos anos 90.'],
  ['decadas', ['rock'], 'O chamado BRock (Legião, Titãs, Paralamas, Barão) viveu seu auge em qual década?', ['Anos 1980', 'Anos 1960', 'Anos 2000', 'Anos 2010'], 0, 'O rock nacional dominou as rádios brasileiras nos anos 80.'],
  ['decadas', ['sertanejo'], 'O “sertanejo universitário” virou febre nacional em qual década?', ['Anos 2000/2010', 'Anos 1970', 'Anos 1950', 'Anos 1980'], 0, 'Duplas como Jorge & Mateus e artistas como Luan Santana popularizaram o estilo.'],
  ['decadas', ['classicos'], 'A Jovem Guarda, de Roberto Carlos e Erasmo, foi um fenômeno de qual década?', ['Anos 1960', 'Anos 1980', 'Anos 1940', 'Anos 1990'], 0, 'O programa Jovem Guarda estreou na TV Record em 1965.'],
  ['decadas', ['classicos'], 'O pagode romântico de grupos como Raça Negra e Só Pra Contrariar estourou em qual década?', ['Anos 1990', 'Anos 1960', 'Anos 1970', 'Anos 2020'], 0, 'Esses grupos venderam milhões de discos nos anos 90.'],
  ['decadas', ['funk'], 'O funk ostentação, com clipes de carros e marcas de luxo, ganhou força em qual década?', ['Anos 2010', 'Anos 1980', 'Anos 1990', 'Anos 1970'], 0, 'O estilo surgiu na Baixada Santista e em São Paulo por volta de 2010.'],
  ['decadas', ['rap'], 'O hip-hop nasceu em festas de bairro do Bronx, em Nova York, em qual década?', ['Anos 1970', 'Anos 1950', 'Anos 1990', 'Anos 2000'], 0, 'DJ Kool Herc é considerado um dos pioneiros, por volta de 1973.'],
  ['decadas', ['games'], 'Em que década o chiptune de 8 bits do NES marcou a música dos games?', ['Anos 1980', 'Anos 2000', 'Anos 1960', 'Anos 2010'], 0, 'O NES chegou ao Japão em 1983 (como Famicom).'],
  ['decadas', ['anime'], 'Dragon Ball Z e Os Cavaleiros do Zodíaco estrearam no Japão em qual década?', ['Anos 1980', 'Anos 2000', 'Anos 1970', 'Anos 2010'], 0, 'Os Cavaleiros do Zodíaco estreou em 1986 e Dragon Ball Z em 1989.'],
  // Gêneros e estilos
  ['generos', ['classicos'], 'Qual instrumento é a marca registrada do forró pé-de-serra, junto com a zabumba e o triângulo?', ['Sanfona', 'Guitarra', 'Violino', 'Saxofone'], 0, 'O trio sanfona, zabumba e triângulo foi popularizado por Luiz Gonzaga.'],
  ['generos', ['classicos'], 'Qual ritmo pernambucano tem passistas com sombrinhas coloridas?', ['Frevo', 'Axé', 'Samba-reggae', 'Lambada'], 0, 'O frevo é Patrimônio Imaterial da Humanidade pela UNESCO.'],
  ['generos', ['classicos'], 'O axé music nasceu em qual estado brasileiro?', ['Bahia', 'Pernambuco', 'Rio de Janeiro', 'Pará'], 0, 'O axé ganhou força no Carnaval de Salvador nos anos 80.'],
  ['generos', ['classicos'], 'Qual estilo musical nasceu no Pará e mistura guitarras e ritmos caribenhos?', ['Tecnobrega / guitarrada', 'Pagode baiano', 'Sertanejo', 'Choro'], 0, 'O tecnobrega e a guitarrada são marcas da música paraense.'],
  ['generos', ['sertanejo'], 'Antes do sertanejo moderno, a música do interior com duplas caipiras era chamada de…', ['Música caipira / moda de viola', 'Bossa nova', 'Brega funk', 'Samba-enredo'], 0, 'Tonico & Tinoco são ícones da moda de viola.'],
  ['generos', ['rap'], 'O que significa a sigla “MC” no rap e no funk?', ['Mestre de Cerimônias', 'Música Comercial', 'Mixagem Central', 'Microfone Coletivo'], 0, 'MC vem de “Master of Ceremonies”.'],
  ['generos', ['rap'], 'O trap é um subgênero do rap famoso por qual elemento da batida?', ['Hi-hats acelerados e graves 808', 'Violões dedilhados', 'Sanfona e zabumba', 'Orquestra de cordas'], 0, 'O trap surgiu no sul dos EUA, especialmente em Atlanta.'],
  ['generos', ['funk'], 'O “brega funk” mistura funk com o brega de qual estado?', ['Pernambuco', 'Rio Grande do Sul', 'Santa Catarina', 'Amazonas'], 0, 'O brega funk explodiu em Recife no fim dos anos 2010.'],
  ['generos', ['rock'], 'Qual estilo é marcado por guitarras distorcidas e vocais gritados, como Metallica e Sepultura?', ['Heavy metal', 'Reggae', 'Bossa nova', 'Soul'], 0, 'O Sepultura, de Belo Horizonte, é a banda de metal brasileira mais famosa no exterior.'],
  ['generos', ['pop', 'internacional'], 'O K-pop é a música pop de qual país?', ['Coreia do Sul', 'Japão', 'China', 'Tailândia'], 0, 'O “K” vem de Korea.'],
  ['generos', ['pop', 'internacional'], 'O reggaeton, de “Despacito”, tem raízes principalmente em qual lugar?', ['Porto Rico', 'Argentina', 'Espanha', 'Portugal'], 0, 'O gênero se consolidou em Porto Rico nos anos 90 e 2000.'],
  ['generos', ['anime'], 'Como se chama a música de abertura de um anime em japonês, muitas vezes abreviada “OP”?', ['Opening', 'Ending', 'Insert', 'Jingle'], 0, 'A música de encerramento é chamada de “ending” (ED).'],
  ['generos', ['games'], 'Como se chama o estilo de música feito com chips de som de consoles antigos?', ['Chiptune', 'Lo-fi', 'Dubstep', 'Synthpop'], 0, 'O chiptune usa sons de 8 e 16 bits de consoles como NES e Game Boy.'],
];

export const MUSIC_QUIZ: MusicQuizItem[] = QUIZ_ROWS.map(([kind, filters, question, options, answer, note], i) => ({
  id: `mq${String(i + 1).padStart(3, '0')}`,
  kind,
  filters,
  question,
  options,
  answer,
  note,
}));
