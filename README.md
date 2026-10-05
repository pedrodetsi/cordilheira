# Cordilheira 🏔️

Mapa 3D do seu histórico de corridas (Strava): cada corrida é um pico, a altura
é a distância. Feito para enxergar — e romper — platôs de distância.

## Rodar

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # gera dist/ estático (pode hospedar em qualquer lugar)
```

## Como ler o mapa

- **Fileiras (eixo da profundidade)** = meses, do passado (fundo, na névoa) ao
  presente (frente). Meses sem corrida aparecem como vales vazios.
- **Pico dourado com anel** = recorde atual de distância.
- **Losangos dourados** flutuando = corridas que foram recorde pessoal *na época*.
- **Pico translúcido com cristal** = próximo pico a conquistar (+10% sobre a
  maior corrida dos últimos 60 dias — progressão segura).
- **Trilha na lateral** = média mensal de distância.
- Platôs (≥10 corridas com distância estagnada) aparecem no selo
  "Dentro de um planalto" do painel da corrida.

Arraste para girar, pinça para zoom, toque num pico para detalhes (sem
seleção, o painel mostra o recorde). Botões **Filtros** e **?** acima do painel.

## Visual por horário (Brasília)

Estilo "montanha realista" com 3 temas automáticos: **Manhã** (05–11h59),
**Tarde** (12–17h59) e **Noite** (18–04h59) — cena 3D e cores da UI mudam
juntas. O clima atual do Rio (Open-Meteo) é sobreposto (nuvens/chuva).
Paletas em `src/lib/theme.js`; tokens da UI em `src/styles.css`
(`[data-theme]`). Terreno 100% procedural (`src/scene/Terrain.jsx`); em
aparelhos fracos usa malha menor e desliga sombras.

Testes por URL: `?hour=21` (força o tema), `?weather=rain|cloudy|clear`,
`?nointro` (pula a abertura).

## Runner BI

Botão **Runner BI** no mapa abre os indicadores de desempenho: período
(última corrida, 7/30/90 dias, este ano, ano passado, tudo, datas), filtros de
distância/ritmo/dia da semana, KPIs com comparação ao período anterior, ritmo,
recordes estimados (5 km, 10 km, meia), km por semana, sequências e quando você
corre. Lógica em `src/lib/runnerBI.js`; o estado fica salvo no navegador.

## Atualizar com dados novos do Strava

Os dados reais estão em `src/data/activities.js` (formato `{start, d, t}`).
Para atualizar, use o adaptador `fromStrava()` em `src/data/strava.js` com o
retorno da API do Strava (ou do conector MCP) e regrave `activities.js` —
nenhum outro arquivo precisa mudar. Todos os insights (recordes, platôs,
tendência, meta) são recalculados automaticamente.

## PWA (instalar como app)

O app é uma PWA: manifest em `public/manifest.webmanifest`, service worker em
`public/sw.js` (registrado só em produção), ícones em `public/icons/` (gerados
a partir de `icon.svg` com `node scripts/icons.mjs`). No iPhone: abrir o site
no Safari → Compartilhar → "Adicionar à Tela de Início". Requer o app
hospedado com HTTPS (Vercel, Netlify, Cloudflare Pages…).

## Publicação (GitHub Pages)

No ar em **https://pedrodetsi.github.io/cordilheira/** (repo
`pedrodetsi/cordilheira`, branch `gh-pages`). Para republicar depois de
qualquer mudança:

```powershell
npm run build
cd dist; git init -b gh-pages; git add -A; git commit -m "Deploy"
git push -f https://github.com/pedrodetsi/cordilheira.git gh-pages
cd ..; Remove-Item -Recurse -Force dist\.git
```

(e `git push` normal na main para versionar o código)

## Scripts de desenvolvimento

- `node scripts/shot.mjs out.png [w] [h] [esperaMs]` — screenshot headless (Edge).
- `node scripts/interact.mjs` — testa clique no recorde + filtros.
