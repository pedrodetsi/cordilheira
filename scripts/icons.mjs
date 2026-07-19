// Gera os PNGs do ícone da PWA a partir de public/icons/icon.svg.
// A versão "maskable" ganha margem extra (zona segura do Android).
import puppeteer from 'puppeteer-core'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const svg = readFileSync(resolve('public/icons/icon.svg'), 'utf8')
const maskable = svg.replace(
  /(<rect width="1024" height="1024"[^/]*\/>)([\s\S]*)<\/svg>/,
  '$1<g transform="translate(102,102) scale(0.8)">$2</g></svg>'
)

const targets = [
  { file: 'public/icons/apple-touch-icon.png', size: 180, src: svg },
  { file: 'public/icons/icon-192.png', size: 192, src: svg },
  { file: 'public/icons/icon-512.png', size: 512, src: svg },
  { file: 'public/icons/icon-maskable-512.png', size: 512, src: maskable },
]

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: 'new',
  args: ['--no-first-run', '--disable-extensions', '--hide-scrollbars'],
})
const page = await browser.newPage()
for (const t of targets) {
  await page.setViewport({ width: t.size, height: t.size, deviceScaleFactor: 1 })
  await page.setContent(
    `<body style="margin:0"><div style="width:${t.size}px;height:${t.size}px">${t.src.replace(
      '<svg ',
      `<svg width="${t.size}" height="${t.size}" `
    )}</div></body>`
  )
  await page.screenshot({ path: t.file, clip: { x: 0, y: 0, width: t.size, height: t.size } })
  console.log('ok', t.file)
}
await browser.close()
