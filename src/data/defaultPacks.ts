/**
 * Mascarenhas Hub — catálogo base (PT-BR) dos 5 jogos clássicos (os 5 novos têm catálogo na própria pasta em src/games/).
 * É a fonte usada pelo motor da sala e também a origem do supabase/seed_catalog.sql
 * (gerado por `npm run seed`). Edite aqui e rode o script para manter ambos em sincronia.
 */

export type FiveSecCategory = 'Cotidiano' | 'Cultura Pop' | 'Esportes' | 'Geek' | 'Caos';

export interface FiveSecPrompt {
  id: string;
  category: FiveSecCategory;
  text: string;
}

export interface ImpostorCategory {
  name: string;
  words: string[];
}

export interface MegaSenhaWord {
  word: string;
  category: string;
}

export type MusicGenre =
  | 'Sertanejo'
  | 'Rock Nacional'
  | 'Rock Internacional'
  | 'Pop'
  | 'Rap/Trap'
  | 'Clássicos Brasileiros'
  | 'Games & Animes';

export interface Song {
  id: string;
  title: string;
  artist: string;
  era: string;
  genre: MusicGenre;
  /** Estágio 1: dica contextual enigmática (sem título nem artista). */
  hint: string;
  /** Estágio 2: curiosidade sobre a faixa (sem o título). */
  curiosity: string;
  /** Estágio 3: complemento exibido junto com o artista (tema da letra, parafraseado). */
  theme: string;
  /** Grafias alternativas aceitas como resposta. */
  aliases?: string[];
}

export interface CategoryPrompt {
  id: string;
  text: string;
}

export interface Catalog {
  fiveSec: FiveSecPrompt[];
  impostor: ImpostorCategory[];
  megaSenha: MegaSenhaWord[];
  songs: Song[];
  categories: CategoryPrompt[];
}

const fs = (category: FiveSecCategory, list: string[], prefix: string): FiveSecPrompt[] =>
  list.map((text, i) => ({ id: `${prefix}${String(i + 1).padStart(2, '0')}`, category, text }));

export const FIVE_SEC_PROMPTS: FiveSecPrompt[] = [
  ...fs('Cotidiano', [
    'Cite 3 frutas vermelhas',
    'Cite 3 coisas que você encontra em uma cozinha',
    'Cite 3 coisas que se leva para a praia',
    'Cite 3 tipos de calçado',
    'Cite 3 coisas que ficam na geladeira',
    'Cite 3 profissões que usam uniforme',
    'Cite 3 coisas que se faz ao acordar',
    'Cite 3 itens de material escolar',
    'Cite 3 sabores de pizza',
    'Cite 3 cômodos de uma casa',
    'Cite 3 meios de transporte',
    'Cite 3 coisas que você compra na farmácia',
    'Cite 3 animais de estimação',
    'Cite 3 temperos de cozinha',
    'Cite 3 coisas que têm tela',
    'Cite 3 tipos de doce de festa junina',
    'Cite 3 coisas que se usa no banho',
    'Cite 3 eletrodomésticos',
    'Cite 3 tipos de pão',
    'Cite 3 peças de roupa de inverno',
  ], 'cot'),
  ...fs('Cultura Pop', [
    'Cite 3 novelas brasileiras',
    'Cite 3 cantoras brasileiras',
    'Cite 3 filmes da Disney',
    'Cite 3 personagens da Turma da Mônica',
    'Cite 3 apresentadores de TV',
    'Cite 3 bandas de rock nacional',
    'Cite 3 séries de streaming',
    'Cite 3 duplas sertanejas',
    'Cite 3 super-heróis da Marvel',
    'Cite 3 filmes de terror',
    'Cite 3 programas de auditório',
    'Cite 3 personagens de desenho animado',
    'Cite 3 rappers',
    'Cite 3 reality shows',
    'Cite 3 vilões de filmes',
    'Cite 3 princesas de contos de fadas',
    'Cite 3 humoristas brasileiros',
    'Cite 3 filmes que ganharam o Oscar',
    'Cite 3 músicas de Carnaval',
    'Cite 3 youtubers ou streamers',
  ], 'pop'),
  ...fs('Esportes', [
    'Cite 3 times de futebol brasileiros',
    'Cite 3 esportes olímpicos',
    'Cite 3 jogadores da Seleção Brasileira',
    'Cite 3 esportes com bola',
    'Cite 3 esportes aquáticos',
    'Cite 3 posições de um time de futebol',
    'Cite 3 pilotos de Fórmula 1',
    'Cite 3 artes marciais',
    'Cite 3 estádios de futebol',
    'Cite 3 países que já ganharam a Copa do Mundo',
    'Cite 3 equipamentos de academia',
    'Cite 3 esportes radicais',
    'Cite 3 tenistas famosos',
    'Cite 3 esportes de inverno',
    'Cite 3 coisas que um juiz de futebol usa',
    'Cite 3 jogadores de basquete',
    'Cite 3 modalidades de atletismo',
    'Cite 3 clubes de futebol europeus',
  ], 'esp'),
  ...fs('Geek', [
    'Cite 3 personagens de Pokémon',
    'Cite 3 consoles de videogame',
    'Cite 3 personagens de Dragon Ball',
    'Cite 3 jogos de tiro',
    'Cite 3 linguagens de programação',
    'Cite 3 animes',
    'Cite 3 personagens de Star Wars',
    'Cite 3 jogos de celular',
    'Cite 3 redes sociais',
    'Cite 3 personagens da Nintendo',
    'Cite 3 casas ou personagens de Harry Potter',
    'Cite 3 jogos de tabuleiro',
    'Cite 3 marcas de celular',
    'Cite 3 sagas de filmes de ficção científica',
    'Cite 3 vilões de videogame',
    'Cite 3 cartas ou peças de baralho/xadrez',
    'Cite 3 jogos de luta',
    'Cite 3 aplicativos de mensagem',
  ], 'gek'),
  ...fs('Caos', [
    'Cite 3 coisas que você nunca deve dizer no primeiro encontro',
    'Cite 3 desculpas para chegar atrasado',
    'Cite 3 coisas que dão vergonha em público',
    'Cite 3 coisas que sua mãe sempre fala',
    'Cite 3 lugares péssimos para cochilar',
    'Cite 3 coisas que você levaria para uma ilha deserta',
    'Cite 3 coisas que não se deve fazer em um velório',
    'Cite 3 apelidos ruins para um pet',
    'Cite 3 coisas que você faria se ficasse invisível',
    'Cite 3 desculpas para não ir à academia',
    'Cite 3 coisas estranhas para colocar na pizza',
    'Cite 3 coisas que você diria para um alienígena',
    'Cite 3 presentes horríveis de amigo secreto',
    'Cite 3 frases de quem perdeu no videogame',
    'Cite 3 coisas que acontecem em casamento de família',
    'Cite 3 coisas que não se deve mandar no grupo da família',
    'Cite 3 motivos para terminar um namoro',
    'Cite 3 coisas que você esconderia da visita',
    'Cite 3 superpoderes inúteis',
    'Cite 3 frases de quem está mentindo',
    'Cite 3 coisas que você nunca deve pesquisar no Google',
    'Cite 3 coisas que dá para fazer com uma colher',
    'Cite 3 situações em que você fingiria estar ao telefone',
    'Cite 3 nomes péssimos para um bebê',
  ], 'cao'),
];

export const IMPOSTOR_CATEGORIES: ImpostorCategory[] = [
  { name: 'Lugares', words: ['Aeroporto', 'Hospital', 'Praia', 'Cinema', 'Escola', 'Supermercado', 'Biblioteca', 'Academia', 'Igreja', 'Zoológico', 'Padaria', 'Estádio'] },
  { name: 'Comidas', words: ['Pizza', 'Feijoada', 'Brigadeiro', 'Coxinha', 'Lasanha', 'Sushi', 'Pastel', 'Hambúrguer', 'Pão de queijo', 'Açaí', 'Churrasco', 'Tapioca'] },
  { name: 'Animais', words: ['Girafa', 'Pinguim', 'Cachorro', 'Tubarão', 'Elefante', 'Capivara', 'Coruja', 'Cobra', 'Macaco', 'Tartaruga', 'Leão', 'Polvo'] },
  { name: 'Profissões', words: ['Médico', 'Bombeiro', 'Professor', 'Astronauta', 'Pedreiro', 'Advogado', 'Cozinheiro', 'Policial', 'Dentista', 'Palhaço', 'Motorista', 'Piloto'] },
  { name: 'Objetos', words: ['Guarda-chuva', 'Tesoura', 'Espelho', 'Relógio', 'Travesseiro', 'Vassoura', 'Mochila', 'Óculos', 'Chave', 'Lanterna', 'Escova de dentes', 'Controle remoto'] },
  { name: 'Esportes', words: ['Futebol', 'Vôlei', 'Natação', 'Skate', 'Boxe', 'Basquete', 'Surfe', 'Tênis', 'Judô', 'Ciclismo', 'Xadrez', 'Handebol'] },
  { name: 'Festas e Eventos', words: ['Casamento', 'Carnaval', 'Festa junina', 'Aniversário', 'Réveillon', 'Formatura', 'Chá de bebê', 'Halloween', 'Natal', 'Churrasco de família', 'Show de rock', 'Velório'] },
  { name: 'Transportes', words: ['Avião', 'Bicicleta', 'Metrô', 'Navio', 'Helicóptero', 'Moto', 'Ônibus', 'Trem', 'Patinete', 'Submarino', 'Balão', 'Carroça'] },
  { name: 'Partes da Casa', words: ['Cozinha', 'Banheiro', 'Garagem', 'Sótão', 'Varanda', 'Quarto', 'Lavanderia', 'Sala de estar', 'Porão', 'Quintal', 'Escada', 'Telhado'] },
  { name: 'Personagens Famosos', words: ['Papai Noel', 'Saci', 'Batman', 'Mickey', 'Chaves', 'Harry Potter', 'Mônica', 'Homem-Aranha', 'Cinderela', 'Shrek', 'Pikachu', 'Mario'] },
  { name: 'Instrumentos Musicais', words: ['Violão', 'Bateria', 'Piano', 'Pandeiro', 'Saxofone', 'Violino', 'Flauta', 'Sanfona', 'Cavaquinho', 'Trompete', 'Harpa', 'Berimbau'] },
  { name: 'Bebidas', words: ['Café', 'Caipirinha', 'Suco de laranja', 'Refrigerante', 'Chimarrão', 'Água de coco', 'Chá', 'Milkshake', 'Vinho', 'Achocolatado', 'Limonada', 'Guaraná'] },
  { name: 'Natureza', words: ['Vulcão', 'Cachoeira', 'Deserto', 'Floresta', 'Montanha', 'Arco-íris', 'Tempestade', 'Caverna', 'Oceano', 'Geleira', 'Lua', 'Terremoto'] },
];

const ms = (category: string, words: string[]): MegaSenhaWord[] => words.map((word) => ({ word, category }));

export const MEGA_SENHA_WORDS: MegaSenhaWord[] = [
  ...ms('Animais', ['Cachorro', 'Gato', 'Elefante', 'Girafa', 'Formiga', 'Baleia', 'Coruja', 'Cavalo', 'Abelha', 'Tubarão', 'Papagaio', 'Jacaré', 'Borboleta', 'Pinguim', 'Coelho']),
  ...ms('Objetos', ['Cadeira', 'Garfo', 'Tesoura', 'Relógio', 'Escova', 'Guarda-chuva', 'Espelho', 'Martelo', 'Vela', 'Chave', 'Travesseiro', 'Bússola', 'Lâmpada', 'Panela', 'Carteira']),
  ...ms('Comidas', ['Pipoca', 'Sorvete', 'Feijão', 'Banana', 'Chocolate', 'Pizza', 'Macarrão', 'Queijo', 'Ovo', 'Bolo', 'Pastel', 'Melancia', 'Pão', 'Mel', 'Arroz']),
  ...ms('Lugares', ['Praia', 'Escola', 'Hospital', 'Cinema', 'Floresta', 'Deserto', 'Castelo', 'Biblioteca', 'Igreja', 'Fazenda', 'Aeroporto', 'Museu', 'Circo', 'Prisão', 'Ilha']),
  ...ms('Profissões', ['Médico', 'Bombeiro', 'Professor', 'Pintor', 'Padeiro', 'Juiz', 'Mágico', 'Carteiro', 'Pirata', 'Astronauta', 'Jardineiro', 'Garçom', 'Cantor', 'Detetive', 'Ladrão']),
  ...ms('Natureza', ['Chuva', 'Vulcão', 'Estrela', 'Montanha', 'Rio', 'Neve', 'Vento', 'Areia', 'Raio', 'Sol', 'Nuvem', 'Pedra', 'Árvore', 'Flor', 'Onda']),
  ...ms('Corpo Humano', ['Coração', 'Joelho', 'Cabelo', 'Dente', 'Nariz', 'Orelha', 'Unha', 'Barriga', 'Cotovelo', 'Olho']),
  ...ms('Esportes e Lazer', ['Futebol', 'Bicicleta', 'Piscina', 'Xadrez', 'Pipa', 'Skate', 'Baralho', 'Karaokê', 'Balanço', 'Videogame']),
  ...ms('Conceitos', ['Saudade', 'Sono', 'Medo', 'Segredo', 'Sorte', 'Fome', 'Preguiça', 'Ciúme', 'Sonho', 'Festa', 'Viagem', 'Silêncio', 'Pressa', 'Amizade', 'Mentira']),
];

export const SONGS: Song[] = [
  // Sertanejo
  { id: 's01', title: 'Evidências', artist: 'Chitãozinho & Xororó', era: 'Anos 1990', genre: 'Sertanejo', hint: 'Hino oficial de qualquer karaokê brasileiro sobre negar um amor que todo mundo já percebeu', curiosity: 'Foi composta por José Augusto e Paulo Sérgio Valle e virou quase um “hino nacional alternativo” em festas', theme: 'Alguém jura que não ama mais, mas cada atitude prova o contrário' },
  { id: 's02', title: 'Ai Se Eu Te Pego', artist: 'Michel Teló', era: 'Anos 2010', genre: 'Sertanejo', hint: 'Um flerte na balada que virou fenômeno mundial com coreografia de jogadores de futebol', curiosity: 'Chegou ao topo das paradas em vários países da Europa e foi dançada por craques em comemorações de gol', theme: 'Ele vê alguém dançando na festa e se declara de forma bem direta' },
  { id: 's03', title: 'Camaro Amarelo', artist: 'Munhoz & Mariano', era: 'Anos 2010', genre: 'Sertanejo', hint: 'Um rapaz que antes era ignorado fica rico e de repente vira o mais disputado da cidade', curiosity: 'O refrão cita um carro esportivo importado de cor chamativa', theme: 'Antes ninguém o notava; depois do dinheiro, todos querem dar uma volta com ele' },
  { id: 's04', title: 'Infiel', artist: 'Marília Mendonça', era: 'Anos 2010', genre: 'Sertanejo', hint: 'Uma mulher descobre a traição e decide entregar o parceiro de presente para a outra', curiosity: 'Lançou a artista conhecida como a “Rainha da Sofrência” ao estrelato nacional', theme: 'Ela avisa à amante que agora o problema é dela' },
  { id: 's05', title: 'Fio de Cabelo', artist: 'Chitãozinho & Xororó', era: 'Anos 1980', genre: 'Sertanejo', hint: 'Um pequeno vestígio encontrado numa roupa reacende a dor de um amor que acabou', curiosity: 'Clássico que ajudou a popularizar o sertanejo romântico nas rádios do país', theme: 'Ao achar algo deixado no paletó, ele lembra de quem foi embora' },
  { id: 's06', title: 'Cuida Bem Dela', artist: 'Henrique & Juliano', era: 'Anos 2010', genre: 'Sertanejo', hint: 'Um ex manda um recado para o novo namorado da pessoa amada', curiosity: 'Faz parte do repertório que consolidou a dupla de irmãos de Palmeirópolis (TO)', theme: 'Ele aceita a derrota, mas pede que o outro trate bem quem ele ainda ama' },
  { id: 's07', title: 'Sinônimos', artist: 'Chitãozinho & Xororó e Zé Ramalho', era: 'Anos 2000', genre: 'Sertanejo', hint: 'Uma reflexão poética sobre palavras diferentes que significam a mesma coisa no amor', curiosity: 'Encontro de uma dupla sertaneja com um ícone do nordeste brasileiro', theme: 'Amor, loucura e paixão comparados como se fossem a mesma coisa' },
  // Rock Nacional
  { id: 'r01', title: 'Tempo Perdido', artist: 'Legião Urbana', era: 'Anos 1980', genre: 'Rock Nacional', hint: 'Uma geração percebe que é jovem e que o relógio não para', curiosity: 'Está no álbum “Dois”, um dos discos mais vendidos do rock brasileiro', theme: 'Todos os dias quando acordamos não temos mais o que já passou' },
  { id: 'r02', title: 'Pais e Filhos', artist: 'Legião Urbana', era: 'Anos 1980', genre: 'Rock Nacional', hint: 'Uma estátua, uma janela e um conselho sobre amar as pessoas enquanto elas estão aqui', curiosity: 'Faz parte do álbum “As Quatro Estações” e é uma das mais tocadas da banda de Brasília', theme: 'A relação entre gerações dentro de casa e a urgência de amar' },
  { id: 'r03', title: 'Exagerado', artist: 'Cazuza', era: 'Anos 1980', genre: 'Rock Nacional', hint: 'Um apaixonado que admite fazer tudo de forma intensa e dramática demais', curiosity: 'Primeira grande música da carreira solo do cantor após sair do Barão Vermelho', theme: 'Ele promete amor eterno, se jogar aos pés e fazer cenas por paixão' },
  { id: 'r04', title: 'Infinita Highway', artist: 'Engenheiros do Hawaii', era: 'Anos 1980', genre: 'Rock Nacional', hint: 'Uma longa viagem de estrada sem destino definido, cheia de reflexões', curiosity: 'Banda gaúcha liderada por Humberto Gessinger; a faixa tem mais de seis minutos', theme: 'Pé na estrada, vento no rosto e conversa sobre a vida a dois' },
  { id: 'r05', title: 'Mulher de Fases', artist: 'Raimundos', era: 'Anos 1990', genre: 'Rock Nacional', hint: 'Uma parceira cujo humor muda tanto que parece seguir o céu noturno', curiosity: 'Mistura de rock pesado com forró, marca registrada da banda de Brasília', theme: 'Ele não sabe o que esperar de quem muda de jeito toda semana' },
  { id: 'r06', title: 'Anna Júlia', artist: 'Los Hermanos', era: 'Anos 1990', genre: 'Rock Nacional', hint: 'Um amor platônico com nome e sobrenome que tocou em todas as rádios', curiosity: 'Ganhou uma versão em inglês de Jim Capaldi com George Harrison na guitarra', theme: 'Ele não consegue tirar da cabeça uma garota específica' },
  { id: 'r07', title: 'Lanterna dos Afogados', artist: 'Os Paralamas do Sucesso', era: 'Anos 1980', genre: 'Rock Nacional', hint: 'Uma luz que guia quem está perdido no meio da escuridão do mar', curiosity: 'Composta por Herbert Vianna, foi regravada por Maria Gadú anos depois', theme: 'Quando tudo está escuro, alguém aparece como farol' },
  { id: 'r08', title: 'Pro Dia Nascer Feliz', artist: 'Barão Vermelho', era: 'Anos 1980', genre: 'Rock Nacional', hint: 'Uma noite de festa e amor que só termina quando o sol aparece', curiosity: 'Foi um dos hinos da geração do Rock in Rio de 1985', theme: 'Viver intensamente a madrugada esperando a manhã chegar' },
  { id: 'r09', title: 'Proibida pra Mim', artist: 'Charlie Brown Jr.', era: 'Anos 1990', genre: 'Rock Nacional', hint: 'Um skatista de Santos apaixonado por alguém que não deveria', curiosity: 'Ganhou uma versão acústica famosa gravada também por Zeca Baleiro', theme: 'Ele sabe que não pode ficar com ela, mas não consegue evitar' },
  { id: 'r10', title: 'Pelados em Santos', artist: 'Mamonas Assassinas', era: 'Anos 1990', genre: 'Rock Nacional', hint: 'Um galanteio desastrado envolvendo um carro popular e o litoral paulista', curiosity: 'A banda de Guarulhos vendeu milhões de discos em menos de um ano de carreira', theme: 'Um rapaz exibido tenta conquistar uma moça com sua Brasília amarela' },
  // Rock Internacional
  { id: 'i01', title: 'Bohemian Rhapsody', artist: 'Queen', era: 'Anos 1970', genre: 'Rock Internacional', hint: 'Uma ópera-rock de seis minutos com confissão, julgamento e headbanging', curiosity: 'Não tem refrão tradicional e mistura balada, ópera e hard rock', theme: 'Um jovem confessa à mãe que cometeu um crime e encara seu destino' },
  { id: 'i02', title: 'Smells Like Teen Spirit', artist: 'Nirvana', era: 'Anos 1990', genre: 'Rock Internacional', hint: 'O hino grunge que levou Seattle ao topo das paradas', curiosity: 'O título veio de uma marca de desodorante feminino', theme: 'Apatia e ironia de uma juventude entediada' },
  { id: 'i03', title: 'Hotel California', artist: 'Eagles', era: 'Anos 1970', genre: 'Rock Internacional', hint: 'Um viajante cansado se hospeda em um lugar luxuoso de onde nunca consegue sair', curiosity: 'Famosa pelo longo duelo de guitarras no final', theme: 'Um paraíso sedutor que se revela uma armadilha' },
  { id: 'i04', title: "Sweet Child O' Mine", artist: "Guns N' Roses", era: 'Anos 1980', genre: 'Rock Internacional', hint: 'Um riff de guitarra que começou como exercício de aquecimento', curiosity: 'Slash criou a introdução brincando com o violão durante um ensaio', theme: 'Uma declaração aos olhos e ao sorriso de alguém especial' },
  { id: 'i05', title: "Livin' on a Prayer", artist: 'Bon Jovi', era: 'Anos 1980', genre: 'Rock Internacional', hint: 'Um casal da classe trabalhadora se segura um no outro em tempos difíceis', curiosity: 'Os personagens Tommy e Gina aparecem também em outra música da banda', theme: 'Mesmo sem dinheiro, eles estão no meio do caminho e não vão desistir' },
  { id: 'i06', title: 'Wonderwall', artist: 'Oasis', era: 'Anos 1990', genre: 'Rock Internacional', hint: 'A música de violão mais tocada em rodinha de amigos do britpop', curiosity: 'Os irmãos Gallagher eram famosos tanto pelas músicas quanto pelas brigas', theme: 'Alguém pode ser a pessoa que vai salvar o outro' },
  { id: 'i07', title: 'Stairway to Heaven', artist: 'Led Zeppelin', era: 'Anos 1970', genre: 'Rock Internacional', hint: 'Uma dama acredita que tudo que brilha é ouro e quer comprar a subida ao paraíso', curiosity: 'Começa calma com violão e flauta e termina em um solo épico', theme: 'Ganância, misticismo e escolhas espirituais' },
  { id: 'i08', title: 'Back in Black', artist: 'AC/DC', era: 'Anos 1980', genre: 'Rock Internacional', hint: 'Uma homenagem de luto a um vocalista que partiu, mas cheia de energia', curiosity: 'O álbum de mesmo nome é um dos mais vendidos da história', theme: 'A banda volta à ativa, de preto, mais forte do que nunca' },
  { id: 'i09', title: 'Numb', artist: 'Linkin Park', era: 'Anos 2000', genre: 'Rock Internacional', hint: 'Um jovem cansado de tentar corresponder às expectativas de alguém', curiosity: 'Ganhou uma versão mashup famosa com o rapper Jay-Z', theme: 'Sentir-se anestesiado por tanta pressão para ser perfeito' },
  { id: 'i10', title: 'Mr. Brightside', artist: 'The Killers', era: 'Anos 2000', genre: 'Rock Internacional', hint: 'Ciúme em velocidade máxima ao imaginar a pessoa amada com outro', curiosity: 'Até hoje aparece com frequência nas paradas britânicas, anos após o lançamento', theme: 'Ele tenta olhar o lado bom enquanto o ciúme o consome' },
  // Pop
  { id: 'p01', title: 'Billie Jean', artist: 'Michael Jackson', era: 'Anos 1980', genre: 'Pop', hint: 'Uma acusação de paternidade embalada pela linha de baixo mais famosa do pop', curiosity: 'Foi na apresentação dessa música na TV que o moonwalk ficou famoso', theme: 'Ele insiste que a criança não é dele' },
  { id: 'p02', title: 'Like a Prayer', artist: 'Madonna', era: 'Anos 1980', genre: 'Pop', hint: 'Um coral gospel encontra a Rainha do Pop num clipe polêmico', curiosity: 'O videoclipe gerou protestos e o cancelamento de um contrato publicitário', theme: 'Amor e devoção descritos com linguagem religiosa' },
  { id: 'p03', title: 'Rolling in the Deep', artist: 'Adele', era: 'Anos 2010', genre: 'Pop', hint: 'Uma ex-namorada ferida promete que ele vai se arrepender de tudo', curiosity: 'Faz parte do álbum “21”, um dos mais vendidos do século', theme: 'Poderíamos ter tido tudo, mas você jogou fora' },
  { id: 'p04', title: 'Shape of You', artist: 'Ed Sheeran', era: 'Anos 2010', genre: 'Pop', hint: 'Um romance que começa no bar e ganha ritmo de marimba', curiosity: 'Foi uma das músicas mais ouvidas na história do Spotify', theme: 'Atração física que vira encontro, jantar e paixão' },
  { id: 'p05', title: 'Bad Romance', artist: 'Lady Gaga', era: 'Anos 2000', genre: 'Pop', hint: 'Um amor tóxico assumido de propósito, com coreografia de monstrinho', curiosity: 'O clipe se passa em uma casa de banho futurista e venceu vários prêmios', theme: 'Ela quer o amor com todo o drama, ciúme e vingança' },
  { id: 'p06', title: 'Envolver', artist: 'Anitta', era: 'Anos 2020', genre: 'Pop', hint: 'Uma coreografia de chão que viralizou no mundo inteiro', curiosity: 'Fez uma cantora brasileira chegar ao topo do ranking global do Spotify', theme: 'Uma relação sem compromisso, só de momento' },
  { id: 'p07', title: 'Show das Poderosas', artist: 'Anitta', era: 'Anos 2010', genre: 'Pop', hint: 'Uma convocação para as rivais saírem da frente porque a dona da pista chegou', curiosity: 'Lançou a carreira da cantora carioca para todo o Brasil', theme: 'Ela prepara a pista e manda as invejosas se afastarem' },
  { id: 'p08', title: 'Blinding Lights', artist: 'The Weeknd', era: 'Anos 2010', genre: 'Pop', hint: 'Synthwave oitentista sobre dirigir pela cidade à noite com saudade', curiosity: 'Ficou um ano inteiro no top 10 da principal parada americana', theme: 'As luzes da cidade cegam, e só uma pessoa pode acalmá-lo' },
  { id: 'p09', title: 'Despacito', artist: 'Luis Fonsi & Daddy Yankee', era: 'Anos 2010', genre: 'Pop', hint: 'Reggaeton porto-riquenho que pede para ir bem devagarinho', curiosity: 'Foi o primeiro vídeo a ultrapassar 5 bilhões de visualizações no YouTube', theme: 'Uma sedução lenta e romântica em espanhol' },
  // Rap/Trap
  { id: 'h01', title: 'Diário de um Detento', artist: "Racionais MC's", era: 'Anos 1990', genre: 'Rap/Trap', hint: 'Relato em primeira pessoa da vida dentro de um presídio de São Paulo', curiosity: 'Baseada em escritos de um ex-detento do Carandiru; o clipe ganhou prêmio na MTV', theme: 'O cotidiano e o massacre na maior prisão do país' },
  { id: 'h02', title: 'Lose Yourself', artist: 'Eminem', era: 'Anos 2000', genre: 'Rap/Trap', hint: 'Uma única chance, um único momento, mãos suadas antes da batalha de rima', curiosity: 'Foi o primeiro rap a vencer o Oscar de Melhor Canção Original', theme: 'Agarrar a oportunidade da vida sem deixar escapar' },
  { id: 'h03', title: 'In Da Club', artist: '50 Cent', era: 'Anos 2000', genre: 'Rap/Trap', hint: 'Festa de aniversário na balada com garrafa de espumante', curiosity: 'Produzida por Dr. Dre e lançada pela gravadora de Eminem', theme: 'Comemorar o aniversário como se não houvesse amanhã' },
  { id: 'h04', title: 'HUMBLE.', artist: 'Kendrick Lamar', era: 'Anos 2010', genre: 'Rap/Trap', hint: 'Um rapper de Compton manda todo mundo sentar e ficar na sua', curiosity: 'Faz parte do álbum “DAMN.”, vencedor do Prêmio Pulitzer de Música', theme: 'Crítica à ostentação e chamado à modéstia' },
  { id: 'h05', title: "Gangsta's Paradise", artist: 'Coolio', era: 'Anos 1990', genre: 'Rap/Trap', hint: 'Trilha de um filme de professora em escola difícil, com coral sombrio', curiosity: 'Usa como base uma música de Stevie Wonder dos anos 70', theme: 'Ao caminhar pelo vale da sombra, ele reflete sobre a vida no crime' },
  { id: 'h06', title: 'SICKO MODE', artist: 'Travis Scott', era: 'Anos 2010', genre: 'Rap/Trap', hint: 'Uma faixa que muda de batida três vezes, com participação de Drake', curiosity: 'Parte do álbum “Astroworld”, nome inspirado em um parque de diversões de Houston', theme: 'Ostentação e estrada em várias “fases” dentro da mesma música' },
  // Clássicos Brasileiros
  { id: 'c01', title: 'Garota de Ipanema', artist: 'Tom Jobim & Vinicius de Moraes', era: 'Anos 1960', genre: 'Clássicos Brasileiros', hint: 'Uma moça passa a caminho do mar e encanta os compositores no bar', curiosity: 'Uma das músicas mais gravadas do mundo; símbolo da Bossa Nova', theme: 'A beleza de quem passa balançando a caminho da praia' },
  { id: 'c02', title: 'Aquarela', artist: 'Toquinho', era: 'Anos 1980', genre: 'Clássicos Brasileiros', hint: 'Um simples desenho no papel vira castelo, gaivota e viagem ao redor do mundo', curiosity: 'Ficou famosa em uma propaganda de lápis de cor', theme: 'A imaginação de uma criança desenhando e o tempo que passa' },
  { id: 'c03', title: 'País Tropical', artist: 'Jorge Ben Jor', era: 'Anos 1960', genre: 'Clássicos Brasileiros', hint: 'Um elogio ao Brasil abençoado por Deus e bonito por natureza', curiosity: 'Também ficou famosa na voz de Wilson Simonal', theme: 'Orgulho de morar num lugar de calor, futebol e violão' },
  { id: 'c04', title: 'Mas Que Nada', artist: 'Jorge Ben Jor', era: 'Anos 1960', genre: 'Clássicos Brasileiros', hint: 'Samba que conquistou o mundo com um refrão de “ô-ariá-raiô”', curiosity: 'Sergio Mendes & Brasil 66 e depois o Black Eyed Peas regravaram', theme: 'Um convite para sair da frente e deixar o samba passar' },
  { id: 'c05', title: 'Construção', artist: 'Chico Buarque', era: 'Anos 1970', genre: 'Clássicos Brasileiros', hint: 'Um operário vive seu último dia em versos que sempre terminam com proparoxítonas', curiosity: 'As palavras finais dos versos trocam de lugar a cada estrofe', theme: 'A vida e a morte anônima de um trabalhador' },
  { id: 'c06', title: 'Andar com Fé', artist: 'Gilberto Gil', era: 'Anos 1980', genre: 'Clássicos Brasileiros', hint: 'Um conselho de que a crença não costuma falhar', curiosity: 'Faz parte do álbum “Um Banda Um” do artista baiano', theme: 'Seguir em frente acreditando, mesmo sem saber em quê' },
  { id: 'c07', title: 'Como Nossos Pais', artist: 'Elis Regina', era: 'Anos 1970', genre: 'Clássicos Brasileiros', hint: 'A juventude rebelde percebe que acabou repetindo as gerações anteriores', curiosity: 'Composta por Belchior e eternizada na voz da “Pimentinha”', theme: 'Apesar de tudo, ainda somos os mesmos e vivemos igual' },
  { id: 'c08', title: 'Ovelha Negra', artist: 'Rita Lee', era: 'Anos 1970', genre: 'Clássicos Brasileiros', hint: 'A rebelde da família é convidada pelo pai a seguir seu próprio caminho', curiosity: 'Gravada com a banda Tutti Frutti, virou hino da rainha do rock brasileiro', theme: 'Ser diferente da família e assumir isso' },
  // Games & Animes
  { id: 'g01', title: 'Cha-La Head-Cha-La', artist: 'Hironobu Kageyama', era: 'Anos 1980', genre: 'Games & Animes', hint: 'Abertura de um anime de guerreiros que gritam muito e transformam o cabelo', curiosity: 'Abertura de Dragon Ball Z, com versão brasileira cantada por Rodrigo Rossi', theme: 'Mesmo com o mundo de cabeça para baixo, o coração continua animado' },
  { id: 'g02', title: 'Pegasus Fantasy', artist: 'Make-Up', era: 'Anos 1980', genre: 'Games & Animes', hint: 'Abertura de cavaleiros com armaduras inspiradas em constelações', curiosity: 'Tema de Os Cavaleiros do Zodíaco, febre na TV brasileira dos anos 90', theme: 'Jovens guerreiros despertam o cosmo para proteger uma deusa' },
  { id: 'g03', title: "A Cruel Angel's Thesis", artist: 'Yoko Takahashi', era: 'Anos 1990', genre: 'Games & Animes', hint: 'Abertura de um anime de robôs gigantes cheio de crise existencial', curiosity: 'Tema de Neon Genesis Evangelion; uma das músicas de karaokê mais cantadas do Japão', theme: 'Um garoto destinado a se tornar lenda', aliases: ['Zankoku na Tenshi no Thesis', 'Zankoku na Tenshi no Teze'] },
  { id: 'g04', title: 'Pokémon Theme', artist: 'Jason Paige', era: 'Anos 1990', genre: 'Games & Animes', hint: 'Abertura de um treinador que quer ser o melhor que já houve', curiosity: 'A versão brasileira ficou marcada pela frase sobre capturar todos', theme: 'Viajar pelo mundo para treinar e capturar criaturas', aliases: ['Tema de Pokémon', 'Abertura de Pokémon', 'Gotta Catch Em All'] },
  { id: 'g05', title: 'Still Alive', artist: 'Jonathan Coulton', era: 'Anos 2000', genre: 'Games & Animes', hint: 'Créditos finais de um jogo de quebra-cabeças com portais e um bolo que é mentira', curiosity: 'Cantada pela inteligência artificial GLaDOS no fim de Portal', theme: 'Uma IA passivo-agressiva diz que está tudo ótimo após ser derrotada' },
  { id: 'g06', title: 'Blue Bird', artist: 'Ikimono-gakari', era: 'Anos 2000', genre: 'Games & Animes', hint: 'Abertura de um ninja loiro em sua fase mais adulta', curiosity: 'Tema de Naruto Shippuden, um dos mais lembrados pelos fãs', theme: 'Bater as asas e voar em direção ao céu azul' },
  { id: 'g07', title: 'Unravel', artist: 'TK from Ling tosite sigure', era: 'Anos 2010', genre: 'Games & Animes', hint: 'Abertura de um anime sobre um garoto meio humano meio devorador de carne', curiosity: 'Tema de Tokyo Ghoul, famosa pelos agudos desesperados', theme: 'Alguém pergunta quem é de verdade enquanto se despedaça' },
  { id: 'g08', title: 'Gurenge', artist: 'LiSA', era: 'Anos 2010', genre: 'Games & Animes', hint: 'Abertura de um caçador de demônios com brincos de hanafuda', curiosity: 'Tema de Demon Slayer (Kimetsu no Yaiba)', theme: 'A força para continuar mesmo ferido, como uma flor vermelha' },
  { id: 'g09', title: 'Guren no Yumiya', artist: 'Linked Horizon', era: 'Anos 2010', genre: 'Games & Animes', hint: 'Abertura épica sobre a humanidade cercada por muralhas e gigantes', curiosity: 'Tema de Attack on Titan, com coro marcial em alemão', theme: 'Caçadores que transformam medo em fúria contra os inimigos', aliases: ['Arco e Flecha Carmesim'] },
  { id: 'g10', title: 'Megalovania', artist: 'Toby Fox', era: 'Anos 2010', genre: 'Games & Animes', hint: 'Trilha de uma luta contra um esqueleto preguiçoso que adora trocadilhos', curiosity: 'Tema da batalha contra Sans em Undertale', theme: 'Faixa instrumental frenética para a luta mais difícil do jogo' },
];

const CATEGORY_LIST = [
  'Marcas de carro',
  'Personagens de anime',
  'Coisas encontradas na geladeira',
  'Países da América ou Europa',
  'Frutas',
  'Times de futebol',
  'Profissões',
  'Animais que vivem na água',
  'Partes do corpo humano',
  'Cantores ou bandas brasileiras',
  'Objetos de cozinha',
  'Capitais do mundo',
  'Super-heróis e vilões',
  'Marcas de roupa ou calçado',
  'Comidas típicas brasileiras',
  'Instrumentos musicais',
  'Coisas que voam',
  'Esportes',
  'Cores',
  'Personagens de novela',
  'Filmes da Disney ou Pixar',
  'Doces e sobremesas',
  'Cidades brasileiras',
  'Jogos de videogame',
  'Coisas que têm rodas',
  'Insetos',
  'Peças de roupa',
  'Bebidas',
  'Flores e plantas',
  'Marcas de tecnologia',
  'Apps de celular',
  'Coisas que se encontra na praia',
  'Pokémon',
  'Raças de cachorro',
  'Legumes e verduras',
  'Ferramentas',
  'Matérias da escola',
  'Desenhos animados',
  'Sabores de sorvete',
  'Coisas redondas',
  'Personagens de contos de fadas',
  'Estados brasileiros',
  'Itens de banheiro',
  'Nomes próprios femininos',
  'Nomes próprios masculinos',
  'Animais da fazenda',
  'Coisas de festa de aniversário',
  'Palavras em inglês usadas no Brasil',
];

export const CATEGORY_PROMPTS: CategoryPrompt[] = CATEGORY_LIST.map((text, i) => ({
  id: `cat${String(i + 1).padStart(2, '0')}`,
  text,
}));

export const DEFAULT_CATALOG: Catalog = {
  fiveSec: FIVE_SEC_PROMPTS,
  impostor: IMPOSTOR_CATEGORIES,
  megaSenha: MEGA_SENHA_WORDS,
  songs: SONGS,
  categories: CATEGORY_PROMPTS,
};

export const MUSIC_GENRES: MusicGenre[] = [
  'Sertanejo',
  'Rock Nacional',
  'Rock Internacional',
  'Pop',
  'Rap/Trap',
  'Clássicos Brasileiros',
  'Games & Animes',
];
