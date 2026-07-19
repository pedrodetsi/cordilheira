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
- **Pico dourado com halo** = recorde atual de distância.
- **Losangos dourados** flutuando = corridas que foram recorde pessoal *na época*.
- **Lençol de gelo translúcido** = platô detectado (≥10 corridas com distância
  estagnada). O rótulo diz quantas corridas e em que distância você ficou preso.
- **Cristal ciano** = próximo pico a conquistar (+10% sobre a maior corrida dos
  últimos 60 dias — progressão segura).
- **Trilha verde/azul/âmbar** na lateral = média mensal de distância
  (subindo / estável / caindo).

Arraste para girar, scroll/pinça para zoom, clique num pico para detalhes.
Filtros (ritmo, distância, período do dia, ano) no canto superior direito.

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

## Scripts de desenvolvimento

- `node scripts/shot.mjs out.png [w] [h] [esperaMs]` — screenshot headless (Edge).
- `node scripts/interact.mjs` — testa clique no recorde + filtros.
