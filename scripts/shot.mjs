// Captura headless para verificação visual durante o desenvolvimento.
// Uso: node scripts/shot.mjs [saida.png] [largura] [altura] [esperaMs] [script.js]
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const [, , out = 'shot.png', w = '1440', h = '900', wait = '4500', scriptFile] = process.argv

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
await page.goto('http://localhost:5173', { waitUntil: 'networkidle2', timeout: 30000 })
await new Promise((r) => setTimeout(r, Number(wait)))
if (scriptFile) {
  const code = fs.readFileSync(scriptFile, 'utf8')
  const result = await page.evaluate(code)
  if (result !== undefined) console.log('[eval]', JSON.stringify(result))
  await new Promise((r) => setTimeout(r, 1200))
}
await page.screenshot({ path: out })
await browser.close()
console.log('saved', out)
