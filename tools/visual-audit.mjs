#!/usr/bin/env node
// Visual QA audit: screenshots across a viewport x theme matrix, plus an
// axe-core accessibility scan per screen. Requires a running preview server
// (`npm run build && npx vite preview --port 4173 &`) before invocation.
//
// Usage: node tools/visual-audit.mjs [--base-url http://localhost:4173] [--out .audit]
//
// Screens are read from tools/visual-audit.config.json in the app repo, e.g.:
//   { "screens": [{ "name": "home", "path": "/" }, { "name": "settings", "path": "/#settings" }] }
// Defaults to a single "home" screen at "/" when no config file is present.

import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
function flag(name, def) {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : def
}

const baseUrl = flag('base-url', 'http://localhost:4173')
const outDir = path.resolve(process.cwd(), flag('out', '.audit'))
const configPath = path.resolve(process.cwd(), 'tools/visual-audit.config.json')

const config = fs.existsSync(configPath)
  ? JSON.parse(fs.readFileSync(configPath, 'utf8'))
  : { screens: [{ name: 'home', path: '/' }] }

const VIEWPORTS = [
  { name: '360x740', width: 360, height: 740 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '1440x900', width: 1440, height: 900 },
]
const THEMES = ['light', 'dark']

const axeCandidates = [
  path.resolve(process.cwd(), 'node_modules/axe-core/axe.min.js'),
  path.resolve(process.cwd(), '../node_modules/axe-core/axe.min.js'),
]
const axePath = axeCandidates.find(p => fs.existsSync(p))
if (!axePath) {
  console.error('axe-core not found — run `npm install -D axe-core` in the app repo first.')
  process.exit(1)
}
const AXE_SRC = fs.readFileSync(axePath, 'utf8')

fs.mkdirSync(outDir, { recursive: true })

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH
  ?? (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined)
const browser = await chromium.launch(executablePath ? { executablePath } : {})
const a11yResults = {}
let shotCount = 0

for (const screen of config.screens) {
  for (const viewport of VIEWPORTS) {
    for (const theme of THEMES) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
      })
      const page = await context.newPage()
      await page.addInitScript((t) => {
        window.localStorage.setItem('theme', t)
      }, theme)
      await page.goto(`${baseUrl}${screen.path}`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(300)

      const shotName = `${screen.name}-${viewport.name}-${theme}.png`
      await page.screenshot({ path: path.join(outDir, shotName), fullPage: true })
      shotCount++

      await page.addScriptTag({ content: AXE_SRC })
      const violations = await page.evaluate(async () => {
        const result = await window.axe.run()
        return result.violations.map(v => ({
          id: v.id,
          impact: v.impact,
          help: v.help,
          nodes: v.nodes.length,
        }))
      })
      a11yResults[`${screen.name}-${viewport.name}-${theme}`] = violations

      await context.close()
    }
  }
}

await browser.close()

fs.writeFileSync(path.join(outDir, 'a11y.json'), JSON.stringify(a11yResults, null, 2))
console.log(`Wrote ${shotCount} screenshots + a11y.json to ${outDir}`)
