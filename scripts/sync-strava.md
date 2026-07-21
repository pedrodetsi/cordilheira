# Sincronização com o Strava

O app carrega `public/activities.json` em runtime (com cache-busting) e cai no
array embutido `src/data/activities.js` se o JSON não existir. Ou seja: **basta
regravar `activities.json` e o mapa se atualiza sozinho no próximo carregamento**
— nenhum rebuild do código é necessário para dados novos.

## Como o Claude atualiza (fluxo atual)

O Claude tem acesso ao conector MCP do Strava. Para sincronizar, o Claude:

1. Chama `list_activities` (ordem cronológica) e coleta as corridas novas.
2. Regrava `public/activities.json` no formato:
   `{ "updatedAt": "AAAA-MM-DD", "activities": [ { "start": "...", "d": <m>, "t": <s> }, ... ] }`
3. Rebuilda e redeploya (veja README → Publicação).

Peça: **"sincroniza minhas corridas novas do Strava no Cordilheira"**.

## Para tornar 100% automático (sem depender do Claude)

Requer credenciais da API do Strava (client id/secret + refresh token) guardadas
como *secrets* do GitHub e um GitHub Action agendado (cron) que:
`refresh token → GET /athlete/activities → regrava activities.json → build → deploy`.

Isso precisa que o Pedro crie um app na API do Strava (dá o client id/secret) —
é um passo único. Depois o Action roda sozinho no horário agendado.
