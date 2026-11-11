# Mascarenhas Hub

Plataforma web de **party games multiplayer** para reunir amigos — presencialmente (celulares + tela principal) ou à distância (chamada de voz ou só o navegador).

**10 jogos:** Desafio dos 5 Segundos · Impostor · Mega Senha · Adivinhe a Música · Categorias · **Blefe · Infiltrado · Sabe ou Perde · Quem é Mais Provável? · Ordem Caótica**.

Stack: Vite 6 + React 18 + TypeScript (strict) + Tailwind CSS 3.4 + Zustand + Supabase (Auth Anônimo, RPC, Realtime Broadcast & Presence) + lucide-react + canvas-confetti + Web Audio API.

---

## 1. Rodando localmente

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + build de produção (gera dist/ com 404.html e 200.html)
```

### Sem Supabase: Modo Passa-o-Celular / Local
Se `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` não estiverem definidas, a tela inicial mostra um aviso e o app roda no **Modo Local**: as abas do mesmo navegador se sincronizam via `BroadcastChannel('mascarenhas_hub_local')` + `localStorage`. **Cada aba é um jogador** (a identidade fica no `sessionStorage` da aba). Crie a sala numa aba e abra o link de convite em outras abas para testar os 10 jogos.

### Com Supabase (multi-dispositivo)
1. Crie um projeto gratuito em [supabase.com](https://supabase.com).
2. **Authentication → Sign In / Providers → Anonymous Sign-Ins: ativar.**
3. No **SQL Editor**, execute nesta ordem:
   1. `supabase/schema.sql`
   2. `supabase/functions_rpc.sql`
   3. `supabase/seed_catalog.sql`
   4. `supabase/migration_v2_novos_jogos.sql` (expansão para 10 jogos — retrocompatível, opcional para jogar)

   Ou rode tudo de uma vez com `supabase/setup_completo.sql`.
4. Copie `.env.example` para `.env.local` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (Project Settings → API).
5. `npm run dev`. Para testar em celulares na mesma rede, use o endereço "Network" exibido pelo Vite.

> No modo online, várias abas do mesmo navegador compartilham a mesma sessão anônima (= mesmo jogador). Para simular vários jogadores num só computador, use janelas anônimas/perfis diferentes.

---

## 2. Arquitetura

```
Celular do anfitrião (autoridade)               Demais jogadores
┌───────────────────────────────┐              ┌──────────────────────┐
│ RoomAuthority (motor da sala) │──broadcast──▶│ estado público       │
│  • aplica ações               │◀─broadcast───│ ações (votos, dicas) │
│  • relógio por ends_at        │              └─────────┬────────────┘
│  • placares, pódio            │                        │ RPC get_player_round_view
└──────────────┬────────────────┘                        ▼
               │ RPC host_save_state          ┌──────────────────────────┐
               └─────────────────────────────▶│ Postgres: rooms,         │
                                              │ room_players, round_secrets│
                                              └──────────────────────────┘
```

- **1 único canal Realtime por sala**: `mascarenhas_room:{code}` com **Presence** (online / away / desconectado, eleição de host) e **Broadcast** (estado, ações, reações). Zero polling HTTP.
- **Motor autoritativo no anfitrião** (`src/core/engine/roomAuthority.ts`): roda no dispositivo do host, processa as ações de todos, avança fases pelo relógio e calcula pontos. Os jogos são **reducers puros** (`games/*/logic.ts`), idênticos nos modos Local e Online.
- **Persistência seletiva**: o host grava o estado público em `rooms.public_game_state` e os segredos em `round_secrets` (com throttle ~1,2s; imediato quando as visões privadas mudam). Isso permite reconexão (F5) e migração de host sem perder a partida.
- **Anti-cheat de segredos**: o estado público difundido **nunca** contém a palavra do Impostor, a senha do Mega Senha nem a resposta da música. Cada jogador busca apenas sua visão via `get_player_round_view` (alias `get_my_round_secret`), que lê `round_secrets.secret_payload->'views'->{seu player_id}`. `round_secrets` tem RLS ativo e **nenhuma policy** — só RPCs `SECURITY DEFINER` acessam.
- **Cronômetros sem drift**: todo timer é um timestamp absoluto (`endsAt`). O cliente calcula `server_time_offset` via RPC `server_now()` e renderiza `endsAt - (Date.now() + offset)` com `requestAnimationFrame`.
- **Sessão resiliente**: login anônimo do Supabase + `mascarenhas_hub_active_room` no `localStorage`. Ao recarregar, o cliente chama `join_room` (que devolve o mesmo `player_id`), recupera o estado e a visão privada.
- **Migração de host**: se o host some do Presence por 15s, o jogador online mais antigo chama `claim_host_if_abandoned` (o servidor só aceita se o `last_seen_at` do host estiver velho >15s), carrega estado + segredo e assume o motor sem interromper a partida.
- **Pausa por falta de jogadores**: abaixo do mínimo do jogo, pausa de 30s; sem reconexão, a sala volta ao lobby preservando o placar da sessão.
- **Inatividade**: 30 min sem interação no lobby desconecta o WebSocket e exibe "Sessão pausada por inatividade — Clique para reconectar".
- **Wake Lock**: a tela do celular não apaga durante as partidas.

### Limitações conhecidas (seja consciente delas)
- **O dispositivo do anfitrião é confiável**: ele executa o motor e, portanto, conhece os segredos da rodada. Para os demais jogadores o isolamento é real (payload de rede sem segredos). Um servidor 100% autoritativo exigiria mover a lógica dos 10 jogos para Edge Functions/PL/pgSQL.
- Mensagens de Broadcast não são autenticadas por remetente: um usuário técnico poderia forjar ações de outro jogador. Para party games entre amigos isso é aceitável; para endurecer, use [Realtime Authorization](https://supabase.com/docs/guides/realtime/authorization) com canais privados.
- Palpites enviados ao host trafegam pelo canal da sala (um palpite *correto* de Adivinhe a Música pode ser visto no DevTools por quem inspecionar a rede).
- O catálogo usado em jogo é `src/data/defaultPacks.ts`; `seed_catalog.sql` espelha esse conteúdo na tabela `catalog_items` (gerado por `npm run seed`) para consulta/curadoria, mas o app ainda não lê o catálogo do banco.
- A RPC `record_submission` e a tabela `round_submissions` estão prontas para auditoria, mas o cliente atual não as chama (a idempotência é garantida no motor + botões com bloqueio otimista).
- **Sabe ou Perde**: o roubo transfere 200 pts, limitado ao que o alvo tem (o placar nunca fica negativo). Há uma trava de segurança de 30 turnos por jogador; se atingida, vence quem estiver mais perto da Casa 30.
- **Infiltrado**: além do voto de minerva por empate persistente, o anfitrião também decide se, a partir do 4º ciclo, um segundo ciclo seguido terminar **sem nenhum voto** (senão a partida poderia não terminar).
- **APIs externas**: valores vindos das APIs (população, notas do MyAnimeList) mudam com o tempo; o desafio mostra a fonte e os valores usados na revelação.
- Adivinhe a Música não usa trechos de letras (direitos autorais): os estágios usam dica temática, curiosidade, artista + tema parafraseado e múltipla escolha.

### Estrutura
```
supabase/            schema.sql · functions_rpc.sql · seed_catalog.sql
scripts/             generate-seed.mjs · spa-fallback.mjs
src/core/audio       sfx.ts (sintetizador Web Audio)
src/core/realtime    roomChannel.ts (SupabaseRoomTransport + LocalRoomTransport)
src/core/engine      roomAuthority.ts · helpers.ts
src/core/registry    gameRegistry.ts (REGISTERED_GAMES)
src/core/session     sessionManager.ts (reconexão, presença, migração de host, inatividade)
src/games/<slug>/    logic.ts (motor) · <Jogo>.tsx (UI) · index.ts (plugin)
src/components       layout/ · lobby/ · shared/ · ui/
src/hooks            useSyncTimer · useWakeLock · useRoom · usePhaseEffect
src/lib              supabase.ts · textUtils.ts (NFD, Levenshtein, anti-spoiler)
src/store            useHubStore.ts (Zustand)
```

---

## 3. Os jogos

| Jogo | Jogadores | Destaques |
|---|---|---|
| Desafio dos 5 Segundos | 2+ | Tema oculto até "Estou Pronto!", 5,0s com décimos, modo voz ou digitação (8s), validação por maioria (+10, +2 de velocidade, parcial +5), 100 cartas sem repetição na sala |
| Impostor | 3+ (2 impostores com 7+) | "Segure para ver seu papel", ordem de dicas com ≤25% de chance do impostor abrir, votação secreta, chute final em grade de 8 palavras, anulação se o impostor cair por 20s |
| Mega Senha | 2+ | Dupla rotativa (funciona com nº ímpar) ou equipes fixas, 10/7/5 pts para os dois, filtro anti-spoiler, Levenshtein ≤1, 1 pulo por turno |
| Adivinhe a Música | 2+ | 4 estágios de 12s (15/10/7/4), acerto silencioso, First Blood +3, 2 palpites por estágio, autocompletar + Levenshtein ≤2, 60 músicas em 7 gêneros |
| Categorias | 2+ | Bomba de 10s (7s após 2 voltas), anti-repetição com shake, contestação por 50%, 2 corações, bônus de sobrevivência |

| **Blefe** | 2–12 | Fato curioso com resposta oculta; cada um escreve uma mentira (envio da verdade é recusado, duplicatas avisadas, "Me Salva!" sugere uma). Votação sem autoria nem auto-voto, revelação dramática. **+1.000** por achar a verdade, **+500** por vítima da sua mentira. 63 perguntas + PokéAPI/Wikipédia |
| **Infiltrado** | 3–12 (1 infiltrado até 6, 2 de 7 a 12) | Ninguém sabe o próprio papel: a palavra do infiltrado é parecida (Pikachu × Raichu). Ciclos de dicas → discussão → voto secreto → desempate → eliminação; infiltrado eliminado pode chutar a palavra da maioria e roubar a vitória. Vitória por eliminação total ou paridade. 74 pares + PokéAPI |
| **Sabe ou Perde** | 2–8 | Tabuleiro em serpentina de 30 casas, dado autoritativo, pergunta de 4 alternativas só para o jogador da vez. Casas: Avançar 2, Voltar 2, Jogar novamente (máx. 1 seguido), Perder turno, Roubar 200 pts, Escudo. Acerto **+100 +20/casa**, chegada **+500**. 87 perguntas + PokéAPI/IBGE |
| **Quem é Mais Provável?** | 3–16 | Voto secreto sem auto-voto, revelação simultânea com holofote para os empatados no topo. **+1** por voto recebido, **+2** para quem votou em alguém do grupo mais votado. 83 perguntas em 3 estilos |
| **Ordem Caótica** | 2–16 | 4–6 elementos para ordenar por um critério verificável: arrastar, ▲/▼ ou toque-para-trocar; envio automático no fim do tempo. **+100** posição exata, **+50** deslocado 1, 0 além disso. 43 desafios auditados + geradores PokéAPI, IBGE/World Bank, Jikan e Wikipédia |

Pontuação em duas camadas: **placar da partida** e **placar geral da sala** (pontos + coroas 👑). Desempate: acertos perfeitos → menor tempo médio de resposta → empate divide o 1º lugar.

---

## 3.1. APIs públicas integradas (sem chave, CORS liberado)

| API | Uso |
|---|---|
| [PokéAPI v2](https://pokeapi.co) | Altura (dm→m), peso (hg→kg), atributos e sprites para Ordem Caótica, Blefe e Sabe ou Perde; cadeias evolutivas para pares do Infiltrado |
| [IBGE — API de Países](https://servicodados.ibge.gov.br/api/docs/paises) | Nomes, capitais, moedas e área em PT-BR |
| [World Bank API v2](https://datahelpdesk.worldbank.org/knowledgebase/articles/889392) | População total mais recente (`SP.POP.TOTL`, `mrnev=1`) |
| [Wikipédia PT-BR REST](https://pt.wikipedia.org/api/rest_v1/) | Eventos históricos do dia (`feed/onthisday`) |
| [Jikan v4 (MyAnimeList)](https://jikan.moe) | Ano, episódios e nota de animes (throttle de 350 ms ⇒ < 3 req/s) |

Regras de engenharia (`src/services/externalApis/`):
- **Só o anfitrião busca**, uma vez, antes da partida (`plugin.prepare`); o conteúdo vai para o segredo da rodada e todos recebem o mesmo desafio já pronto.
- **Cache** memória + `localStorage` (`mascarenhas_hub_api_cache_v1:{endpoint}`, TTL 24h), guardando apenas o dado já transformado.
- **Timeout de 3,5 s** com `AbortController`; qualquer falha (offline, 429, 5xx, dado incompleto) cai em silêncio no **catálogo local** — `src/data/fallbackCatalogs/` traz um snapshot real de 69 Pokémon e 24 países gerado das próprias APIs. A partida nunca trava por causa de API.
- **Validação**: todo desafio do Ordem Caótica exige 4–6 itens com valores finitos e estritamente distintos.

---

## 4. Deploy gratuito

### Publicação atual: GitHub Pages
🎮 **https://jullio30.github.io/mascarenhas-hub/**

Para publicar uma nova versão (usa as chaves do `.env.local`):
```bash
npm run deploy   # build com base /mascarenhas-hub/ + push da pasta dist para a branch gh-pages
```

### Outras opções

**Vercel**: importe o repositório, defina as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. `vercel.json` já reescreve rotas para o SPA.

**Cloudflare Pages / Netlify**: build `npm run build`, saída `dist`. `public/_redirects` cobre o fallback do SPA.

**GitHub Pages**: defina `VITE_BASE_PATH=/nome-do-repo/` no build; `dist/404.html` é gerado automaticamente.

**Keep-alive do Supabase**: `.github/workflows/supabase-keepalive.yml` chama `server_now` a cada 5 dias. Configure os secrets `SUPABASE_URL` e `SUPABASE_ANON_KEY` no repositório.

**Custos (Free Tier)**: canal único por sala, sem polling, reações com throttle de 1,5s, `cleanup_expired_rooms()` apaga salas com mais de 6h a cada nova sala criada.

---

## 5. Adicionando um novo jogo

1. Adicione o slug em `GameSlug` (`src/types/game.types.ts`).
2. Crie `src/games/novo-jogo/`:
   - `logic.ts`: estado público (estende `BasePublicState` com `phase`, `round`, `totalRounds`, `endsAt`), estado secreto e um `GameEngine` com `action`, `tick` e `views` (visões privadas por jogador). Use `ctx.award`, `ctx.stat`, `ctx.isOnline`, `ctx.markUsed`. Para encerrar, defina `phase = 'FINISHED'` — a sala gera o pódio sozinha.
   - `NovoJogo.tsx`: componente que recebe `GameMatchProps` (`state`, `view`, `meId`, `send`…).
   - `index.ts`: exporte o `MascarenhasGamePlugin` (título, regras, `minPlayers`, `configSchema`, `createInitialState`, `engine`, `Component`, `edition`, `groups`).
   - Opcional: `prepare(config, players)` (async, roda só no anfitrião antes da partida; o retorno chega em `ctx.external`), `roundLabel` e `forcedWinnerIds` no estado público.
3. Registre-o em `REGISTERED_GAMES` (`src/core/registry/gameRegistry.ts`).

O lobby, as configurações, o cabeçalho com cronômetro, o placar, a pausa, a reconexão e o pódio funcionam automaticamente.
