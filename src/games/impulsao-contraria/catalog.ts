/** Impulsão Contrária — dilemas binários de preferência. */
export interface Dilemma {
  id: string;
  text: string;
  a: string;
  b: string;
}

type Row = [text: string, a: string, b: string];

const ROWS: Row[] = [
  ['Você prefere dinheiro ou amor?', 'Dinheiro', 'Amor'],
  ['Praia ou montanha?', 'Praia', 'Montanha'],
  ['Cachorro ou gato?', 'Cachorro', 'Gato'],
  ['Verão ou inverno?', 'Verão', 'Inverno'],
  ['Pizza ou hambúrguer?', 'Pizza', 'Hambúrguer'],
  ['Ficar em casa ou sair para a balada?', 'Ficar em casa', 'Balada'],
  ['Viajar no tempo para o passado ou para o futuro?', 'Passado', 'Futuro'],
  ['Ser muito famoso ou muito rico (e anônimo)?', 'Famoso', 'Rico e anônimo'],
  ['Filme ou série?', 'Filme', 'Série'],
  ['Café ou chá?', 'Café', 'Chá'],
  ['Acordar cedo ou dormir tarde?', 'Acordar cedo', 'Dormir tarde'],
  ['Ler a mente das pessoas ou ficar invisível?', 'Ler mentes', 'Ficar invisível'],
  ['Morar na cidade grande ou no interior?', 'Cidade grande', 'Interior'],
  ['Doce ou salgado?', 'Doce', 'Salgado'],
  ['Trabalhar em casa ou no escritório?', 'Em casa', 'No escritório'],
  ['Viajar sozinho ou em grupo?', 'Sozinho', 'Em grupo'],
  ['Ligação ou mensagem de texto?', 'Ligação', 'Mensagem'],
  ['Ter um emprego chato que paga muito ou um emprego dos sonhos que paga pouco?', 'Chato e rico', 'Sonho e pouco'],
  ['Carro ou moto?', 'Carro', 'Moto'],
  ['Show ao vivo ou cinema?', 'Show ao vivo', 'Cinema'],
  ['Perder o celular ou perder a carteira?', 'Perder o celular', 'Perder a carteira'],
  ['Saber a data da sua morte ou a causa dela?', 'A data', 'A causa'],
  ['Ser o mais inteligente ou o mais engraçado do grupo?', 'Inteligente', 'Engraçado'],
  ['Funk ou sertanejo?', 'Funk', 'Sertanejo'],
  ['Natal ou Ano-Novo?', 'Natal', 'Ano-Novo'],
  ['Comida de mãe ou comida de restaurante caro?', 'Comida de mãe', 'Restaurante caro'],
  ['Voltar a ter 10 anos ou pular para os 50?', 'Ter 10 anos', 'Ter 50 anos'],
  ['Nunca mais usar redes sociais ou nunca mais ver TV/streaming?', 'Sem redes sociais', 'Sem TV/streaming'],
  ['Viver sem música ou sem filmes?', 'Sem música', 'Sem filmes'],
  ['Ser chefe ou funcionário?', 'Chefe', 'Funcionário'],
  ['Calor de 40 °C ou frio de 0 °C?', 'Calor de 40 °C', 'Frio de 0 °C'],
  ['Videogame ou esporte ao ar livre?', 'Videogame', 'Esporte ao ar livre'],
  ['Casar ou ficar solteiro para sempre?', 'Casar', 'Solteiro para sempre'],
  ['Falar todas as línguas ou tocar todos os instrumentos?', 'Todas as línguas', 'Todos os instrumentos'],
  ['Ter um dragão ou ser um dragão?', 'Ter um dragão', 'Ser um dragão'],
  ['Morar na praia ou num apartamento de luxo no centro?', 'Na praia', 'Luxo no centro'],
  ['Ganhar na loteria ou encontrar o amor da sua vida?', 'Loteria', 'Amor da vida'],
  ['Sinceridade que magoa ou mentira que conforta?', 'Sinceridade', 'Mentira que conforta'],
  ['Churrasco ou feijoada?', 'Churrasco', 'Feijoada'],
  ['Ir à Lua ou ao fundo do oceano?', 'À Lua', 'Ao fundo do oceano'],
];

export const DILEMMAS: Dilemma[] = ROWS.map(([text, a, b], i) => ({ id: `ic:${i}`, text, a, b }));
