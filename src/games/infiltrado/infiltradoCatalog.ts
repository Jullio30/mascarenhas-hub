/**
 * Infiltrado — pares de palavras semanticamente próximas (PT-BR).
 * A cada partida o motor sorteia QUAL palavra do par é da Maioria e qual é do Infiltrado.
 */
export interface InfiltradoPair {
  id: string;
  category: string;
  a: string;
  b: string;
}

const RAW: Record<string, [string, string][]> = {
  'Pokémon & Jogos': [
    ['Pikachu', 'Raichu'], ['Mewtwo', 'Mew'], ['Charizard', 'Dragonite'], ['Gengar', 'Alakazam'], ['Squirtle', 'Psyduck'],
    ['Eevee', 'Vulpix'], ['Snorlax', 'Munchlax'], ['Lucario', 'Riolu'], ['Mario', 'Luigi'], ['Minecraft', 'Roblox'],
    ['PlayStation', 'Xbox'], ['Tetris', 'Pac-Man'], ['Sonic', 'Knuckles'],
  ],
  'Comidas & Bebidas': [
    ['Pizza', 'Esfiha'], ['Coxinha', 'Kibe'], ['Brigadeiro', 'Beijinho'], ['Café', 'Chá'], ['Sorvete', 'Açaí'],
    ['Hambúrguer', 'Cachorro-quente'], ['Pão de queijo', 'Biscoito de polvilho'], ['Feijoada', 'Feijão tropeiro'], ['Suco de laranja', 'Limonada'],
    ['Pastel', 'Empada'], ['Lasanha', 'Macarrão'], ['Chocolate', 'Doce de leite'], ['Tapioca', 'Cuscuz'],
  ],
  Lugares: [
    ['Praia', 'Piscina'], ['Cinema', 'Teatro'], ['Hospital', 'Farmácia'], ['Escola', 'Faculdade'], ['Shopping', 'Feira'],
    ['Aeroporto', 'Rodoviária'], ['Academia', 'Parque'], ['Biblioteca', 'Livraria'], ['Restaurante', 'Lanchonete'],
    ['Zoológico', 'Aquário'], ['Hotel', 'Pousada'], ['Estádio', 'Ginásio'],
  ],
  'Objetos & Tecnologia': [
    ['Celular', 'Tablet'], ['Notebook', 'Computador'], ['Fone de ouvido', 'Caixa de som'], ['Relógio', 'Pulseira'],
    ['Óculos', 'Lente de contato'], ['Guarda-chuva', 'Capa de chuva'], ['Escova de dente', 'Fio dental'], ['Travesseiro', 'Almofada'],
    ['Garfo', 'Colher'], ['Televisão', 'Projetor'], ['Mochila', 'Mala'], ['Caneta', 'Lápis'],
  ],
  'Animais & Natureza': [
    ['Leão', 'Tigre'], ['Cachorro', 'Lobo'], ['Golfinho', 'Tubarão'], ['Abelha', 'Vespa'], ['Cavalo', 'Zebra'],
    ['Coruja', 'Gavião'], ['Sapo', 'Rã'], ['Rosa', 'Girassol'], ['Montanha', 'Vulcão'], ['Rio', 'Lago'],
    ['Chuva', 'Neve'], ['Jacaré', 'Crocodilo'],
  ],
  'Filmes, Séries & Animes': [
    ['Naruto', 'Sasuke'], ['Goku', 'Vegeta'], ['Harry Potter', 'Senhor dos Anéis'], ['Batman', 'Superman'], ['Star Wars', 'Star Trek'],
    ['Shrek', 'Fiona'], ['Toy Story', 'Carros'], ['Frozen', 'Moana'], ['One Piece', 'Bleach'], ['Os Simpsons', 'Family Guy'],
    ['Vingadores', 'Liga da Justiça'], ['Bob Esponja', 'Patrick'],
  ],
};

export const INFILTRADO_CATEGORIES = Object.keys(RAW);

export const INFILTRADO_CATALOG: InfiltradoPair[] = Object.entries(RAW).flatMap(([category, pairs]) =>
  pairs.map(([a, b], i) => ({ id: `inf:${category.slice(0, 3).toLowerCase()}${i}`, category, a, b })),
);
