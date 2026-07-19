// Verificação de interações: clique no pico do recorde + filtros.
import puppeteer from 'puppeteer-core'

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: 'new',
  args: ['--no-first-run', '--disable-extensions', '--hide-scrollbars'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
page.on('pageerror', (e) => console.log('[pageerror]', e.message))
await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' })
await new Promise((r) => setTimeout(r, 6000))

// 1. clique no pico dourado (recorde)
await page.mouse.click(968, 700)
await new Promise((r) => setTimeout(r, 800))
await page.screenshot({ path: 'shots/click-record.png' })
const detail = await page.evaluate(() => document.querySelector('.detail')?.innerText ?? 'SEM CARTÃO')
console.log('DETAIL:', JSON.stringify(detail))

// 2. abre filtros e aplica distância mínima de 8 km
await page.click('.filters-toggle')
await new Promise((r) => setTimeout(r, 400))
const inputs = await page.$$('.filters-body input[type=number]')
await inputs[0].type('8')
await new Promise((r) => setTimeout(r, 1200))
await page.screenshot({ path: 'shots/filter-8km.png' })
const count = await page.evaluate(() => document.querySelector('.count')?.innerText)
console.log('COUNT:', count)

// 3. filtro de ritmo 5:00 a 5:45
const paceInputs = await page.$$('.filters-body input[type=text]')
await paceInputs[0].type('5:00')
await paceInputs[1].type('5:45')
await new Promise((r) => setTimeout(r, 1200))
const count2 = await page.evaluate(() => document.querySelector('.count')?.innerText)
console.log('COUNT PACE:', count2)
await page.screenshot({ path: 'shots/filter-pace.png' })

await browser.close()
console.log('done')
