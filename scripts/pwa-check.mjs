// Verifica a PWA no build de produção (vite preview): manifest, ícones,
// registro do service worker e funcionamento offline básico.
import puppeteer from 'puppeteer-core'
import { spawn } from 'node:child_process'

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', '4173', '--strictPort'], {
  cwd: process.cwd(),
  stdio: 'ignore',
})
await new Promise((r) => setTimeout(r, 2500))

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: 'new',
  args: ['--no-first-run', '--disable-extensions'],
})
try {
  const page = await browser.newPage()
  page.on('pageerror', (e) => console.log('[pageerror]', e.message))
  await page.goto('http://localhost:4173', { waitUntil: 'networkidle2', timeout: 30000 })
  await new Promise((r) => setTimeout(r, 5000))

  const checks = await page.evaluate(async () => {
    const out = {}
    const m = await fetch('/manifest.webmanifest')
    out.manifest = m.ok ? (await m.json()).name : `HTTP ${m.status}`
    for (const p of ['/icons/apple-touch-icon.png', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-maskable-512.png']) {
      const r = await fetch(p)
      out[p] = `${r.status} ${r.headers.get('content-type')}`
    }
    const reg = await navigator.serviceWorker.getRegistration()
    out.sw = reg ? `registrado (${reg.active ? 'ativo' : reg.installing ? 'instalando' : 'aguardando'})` : 'NÃO registrado'
    out.appleTouch = document.querySelector('link[rel=apple-touch-icon]')?.href ?? 'FALTANDO'
    out.themeColor = document.querySelector('meta[name=theme-color]')?.content ?? 'FALTANDO'
    return out
  })
  console.log(JSON.stringify(checks, null, 2))

  // offline: nova página com rede cortada deve servir do cache
  await new Promise((r) => setTimeout(r, 2000))
  const page2 = await browser.newPage()
  await page2.setCacheEnabled(false)
  const cdp = await page2.createCDPSession()
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 })
  try {
    await page2.goto('http://localhost:4173', { waitUntil: 'load', timeout: 15000 })
    const ok = await page2.evaluate(() => !!document.querySelector('#root'))
    console.log('OFFLINE:', ok ? 'página servida do cache ✓' : 'root não encontrado')
  } catch (e) {
    console.log('OFFLINE: falhou —', e.message.split('\n')[0])
  }
} finally {
  await browser.close()
  server.kill()
}
