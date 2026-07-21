// Captura headless para verificação visual durante o desenvolvimento.
// Uso: node scripts/shot.mjs [saida.png] [largura] [altura] [esperaMs] [query]
//   query ex.: "hour=21&weather=rain"
import puppeteer from 'puppeteer-core'

const [, , out = 'shot.png', w = '1440', h = '900', wait = '6000', query = ''] = process.argv
const base = 'http://localhost:5173/cordilheira/'
const url = query ? `${base}?${query}` : base

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: 'new',
  args: ['--no-first-run', '--disable-extensions', '--hide-scrollbars', '--mute-audio'],
})
const page = await browser.newPage()
await page.setViewport({ width: Number(w), height: Number(h), deviceScaleFactor: 1 })
page.on('console', (m) => {
  if (['error', 'warning'].includes(m.type())) console.log(`[console.${m.type()}]`, m.text())
})
page.on('pageerror', (e) => console.log('[pageerror]', e.message))
await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
await new Promise((r) => setTimeout(r, Number(wait)))
await page.screenshot({ path: out })
await browser.close()
console.log('saved', out)
