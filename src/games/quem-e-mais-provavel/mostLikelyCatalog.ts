/**
 * Quem é Mais Provável? — catálogo curado (PT-BR).
 * Curadoria: perguntas leves e divertidas, sem conteúdo discriminatório, humilhante, sexual ou ofensivo.
 */
export type MostLikelyVibe = 'cotidiano' | 'sobrevivencia' | 'futuro';

export interface MostLikelyPrompt {
  id: string;
  vibe: MostLikelyVibe;
  text: string;
}

const COTIDIANO = [
  'Quem é mais provável de chegar atrasado no próprio aniversário?',
  'Quem é mais provável de esquecer onde estacionou o carro?',
  'Quem é mais provável de rir no momento mais sério possível?',
  'Quem é mais provável de pedir a mesma comida em todo restaurante?',
  'Quem é mais provável de dormir no meio de um filme no cinema?',
  'Quem é mais provável de perder o celular dentro de casa… com ele na mão?',
  'Quem é mais provável de fazer amizade com um desconhecido na fila do mercado?',
  'Quem é mais provável de mandar áudio de 5 minutos no grupo?',
  'Quem é mais provável de levar lanche escondido para o cinema?',
  'Quem é mais provável de chorar com propaganda de margarina?',
  'Quem é mais provável de fazer as malas 10 minutos antes da viagem?',
  'Quem é mais provável de se perder mesmo usando GPS?',
  'Quem é mais provável de tirar 300 fotos na viagem e postar só uma?',
  'Quem é mais provável de voltar de viagem com mais lembrancinhas do que roupas?',
  'Quem é mais provável de puxar papo com o motorista do aplicativo a viagem inteira?',
  'Quem é mais provável de ter 50 abas abertas no navegador agora?',
  'Quem é mais provável de comer a sobremesa antes do almoço?',
  'Quem é mais provável de cantar alto no carro com o vidro aberto?',
  'Quem é mais provável de esquecer o próprio guarda-chuva em todo lugar?',
  'Quem é mais provável de organizar o churrasco e esquecer o carvão?',
  'Quem é mais provável de dar spoiler sem querer?',
  'Quem é mais provável de responder mensagem três dias depois?',
  'Quem é mais provável de adotar todos os bichinhos de rua do bairro?',
  'Quem é mais provável de virar a noite maratonando uma série?',
  'Quem é mais provável de fazer uma planilha para organizar a viagem do grupo?',
  'Quem é mais provável de chegar no aeroporto 4 horas antes do voo?',
  'Quem é mais provável de conversar com as plantas?',
  'Quem é mais provável de ganhar qualquer discussão sobre filmes?',
  'Quem é mais provável de saber a fofoca antes de todo mundo?',
  'Quem é mais provável de dançar sozinho na cozinha?',
] as const;

const SOBREVIVENCIA = [
  'Quem sobreviveria mais tempo em uma ilha deserta?',
  'Quem é mais provável de sobreviver a um apocalipse zumbi?',
  'Quem seria o líder do grupo num apocalipse zumbi?',
  'Quem é mais provável de fazer amizade com um urso na floresta?',
  'Quem conseguiria acender uma fogueira só com gravetos?',
  'Quem é mais provável de se perder numa trilha de 1 km?',
  'Quem montaria a melhor barraca no acampamento?',
  'Quem é mais provável de comer a reserva de comida do grupo inteira no primeiro dia?',
  'Quem é mais provável de sair de um labirinto primeiro?',
  'Quem é mais provável de escapar de uma sala de fuga sozinho?',
  'Quem seria o primeiro a ser pego num filme de terror?',
  'Quem é mais provável de domesticar um dinossauro?',
  'Quem seria o melhor piloto de nave numa invasão alienígena?',
  'Quem é mais provável de negociar a paz com os alienígenas?',
  'Quem é mais provável de construir um abrigo com papelão e fita adesiva?',
  'Quem é mais provável de sobreviver uma semana sem internet?',
  'Quem é mais provável de pescar o jantar do grupo?',
  'Quem é mais provável de achar o caminho de volta só olhando as estrelas?',
  'Quem é mais provável de transformar uma pane no carro em aventura?',
  'Quem é mais provável de virar o cozinheiro oficial de um acampamento?',
  'Quem é mais provável de vencer uma guerra de travesseiros?',
  'Quem é mais provável de enfrentar uma barata voadora sem gritar?',
  'Quem é mais provável de se esconder melhor num pega-pega?',
  'Quem é mais provável de ganhar um reality show de sobrevivência?',
  'Quem é mais provável de arrumar um jeito de carregar o celular na selva?',
  'Quem é mais provável de criar um plano mirabolante que, de alguma forma, funciona?',
  'Quem é mais provável de manter a calma quando tudo der errado?',
] as const;

const FUTURO = [
  'Quem é mais provável de ficar famoso na internet?',
  'Quem é mais provável de ganhar um Oscar?',
  'Quem é mais provável de virar astronauta?',
  'Quem é mais provável de abrir o próprio restaurante?',
  'Quem é mais provável de escrever um livro best-seller?',
  'Quem é mais provável de virar campeão mundial de algum esporte estranho?',
  'Quem é mais provável de inventar algo que todo mundo vai usar?',
  'Quem é mais provável de morar em outro país?',
  'Quem é mais provável de dar a volta ao mundo de mochila?',
  'Quem é mais provável de virar prefeito da cidade?',
  'Quem é mais provável de ter uma fazenda cheia de animais?',
  'Quem é mais provável de aparecer num programa de auditório?',
  'Quem é mais provável de lançar uma música que vira hit?',
  'Quem é mais provável de virar personagem de anime?',
  'Quem é mais provável de ganhar na loteria e continuar trabalhando?',
  'Quem é mais provável de ser o primeiro a morar em Marte?',
  'Quem é mais provável de ter um canal com milhões de inscritos?',
  'Quem é mais provável de virar chef de cozinha famoso?',
  'Quem é mais provável de bater um recorde mundial?',
  'Quem é mais provável de criar o próprio jogo de videogame?',
  'Quem é mais provável de virar professor favorito de uma escola?',
  'Quem é mais provável de ter 10 gatos daqui a 20 anos?',
  'Quem é mais provável de fundar uma startup bilionária?',
  'Quem é mais provável de virar dublador de desenho animado?',
  'Quem é mais provável de ganhar um campeonato de karaokê?',
  'Quem é mais provável de virar guia turístico de uma cidade histórica?',
] as const;

export const MOST_LIKELY_CATALOG: MostLikelyPrompt[] = [
  ...COTIDIANO.map((text, i) => ({ id: `qmp:c${i}`, vibe: 'cotidiano' as const, text })),
  ...SOBREVIVENCIA.map((text, i) => ({ id: `qmp:s${i}`, vibe: 'sobrevivencia' as const, text })),
  ...FUTURO.map((text, i) => ({ id: `qmp:f${i}`, vibe: 'futuro' as const, text })),
];
