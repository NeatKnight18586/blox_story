// scripts/v2/browser.js — one place that finds and launches the browser (docs/V2_BRIEF.md §3).
// Order: $BLOX_CHROME → google-chrome / chromium on PATH → Playwright's bundled Chromium.
import {chromium} from 'playwright';
import {existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

export const ARGS = ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];

function onPath(name) {
  try { return execFileSync('sh', ['-c', `command -v ${name}`], {encoding: 'utf8'}).trim() || null; } catch { return null; }
}

export function resolveBrowser() {
  if (process.env.BLOX_CHROME) {
    if (!existsSync(process.env.BLOX_CHROME)) throw Error(`$BLOX_CHROME does not exist: ${process.env.BLOX_CHROME}`);
    return {source: 'BLOX_CHROME', executablePath: process.env.BLOX_CHROME};
  }
  for (const name of ['google-chrome', 'chromium', 'chromium-browser']) { const p = onPath(name); if (p) return {source: 'PATH', executablePath: p}; }
  return {source: 'playwright', executablePath: undefined};   // Playwright's own bundled Chromium (CI)
}

export async function launch() {
  const b = resolveBrowser();
  const browser = await chromium.launch({executablePath: b.executablePath, args: ARGS});
  return Object.assign(browser, {resolved: b});
}
