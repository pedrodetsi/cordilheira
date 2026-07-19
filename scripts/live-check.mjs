// Verifica o site publicado no GitHub Pages: renderização, SW e screenshot.
import puppeteer from 'puppeteer-core'

const URL = 'https://pedrodetsi.github.io/cordilheira/'
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: 'new',
  args: ['--no-first-run', '--disable-extensions', '--hide-scrollbars'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
page.on('pageerror', (e) => console.log('[pageerror]', e.message))
page.on('response', (r) => { if (r.status() >= 400) console.log('[http]', r.status(), r.url()) })
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 45000 })
await new Promise((r) => setTimeout(r, 8000))
const info = await page.evaluate(async () => {
  const reg = await navigator.serviceWorker.getRegistration()
  return {
    titulo: document.title,
    corridas: document.querySelector('.tagline')?.textContent ?? 'header?',
    sw: reg ? `registrado, escopo ${reg.scope}` : 'NÃO registrado',
    canvas: !!document.querySelector('canvas'),
  }
})
console.log(JSON.stringify(info, null, 2))
await page.screenshot({ path: 'shots/live.png' })
await browser.close()
console.log('ok')
