// Verifica o efeito de elevação: dá zoom na frente da cordilheira (onde está a
// corrida de 31/07, montanhosa, ao lado de corridas planas), captura, e depois
// clica num pico para checar o campo "Elevação" no cartão.
import puppeteer from 'puppeteer-core'

const base = 'http://localhost:5173/cordilheira/?hour=10&weather=clear'
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: 'new',
  args: ['--no-first-run', '--disable-extensions', '--hide-scrollbars'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
page.on('console', (m) => { if (m.type() === 'error') console.log('[err]', m.text()) })
page.on('pageerror', (e) => console.log('[pageerror]', e.message))
await page.goto(base, { waitUntil: 'networkidle2', timeout: 30000 })
await new Promise((r) => setTimeout(r, 6500))

// orbita para olhar a frente de cima e dá zoom (roda = zoom no OrbitControls)
await page.mouse.move(720, 450)
await page.mouse.down()
await page.mouse.move(720, 560, { steps: 12 })
await page.mouse.up()
const cx = 720, cy = 720
await page.mouse.move(cx, cy)
for (let i = 0; i < 20; i++) { await page.mouse.wheel({ deltaY: -120 }); await new Promise(r => setTimeout(r, 40)) }
await new Promise((r) => setTimeout(r, 800))
await page.screenshot({ path: 'shots/elev-zoom.png' })

// clica num pico para abrir o cartão e ler o texto
await page.mouse.click(cx, cy)
await new Promise((r) => setTimeout(r, 700))
const detail = await page.evaluate(() => document.querySelector('.detail')?.innerText ?? 'SEM CARTAO')
console.log('CARTAO:', JSON.stringify(detail))
await page.screenshot({ path: 'shots/elev-card.png' })

await browser.close()
console.log('ok')
