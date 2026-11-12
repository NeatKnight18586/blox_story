// npm run v2:preflight — re-checks the environment facts in docs/V2_BRIEF.md §3 (~10 s) and prints one JSON object.
import os from 'node:os';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFileSync} from 'node:fs';
import {launch, resolveBrowser} from './browser.js';

const run = promisify(execFile);
const sh = async (cmd, args, timeout = 8000) => { try { const {stdout, stderr} = await run(cmd, args, {timeout, maxBuffer: 1 << 24}); return stdout + stderr; } catch (e) { return null; } };

// curl honours HTTPS_PROXY (Node's fetch does not), so reachability matches what the tools will see.
async function reach(host) {
  const t0 = Date.now(), out = await sh('curl', ['-sS', '-o', '/dev/null', '-I', '--max-time', '6', '-w', '%{http_code}', `https://${host}/`], 8000);
  const status = Number(out?.trim().slice(-3));
  return {ok: status > 0 && status < 500 && status !== 403, status: status || null, ms: Date.now() - t0};
}

async function browserCheck() {
  const t0 = Date.now(); let browser;
  try {
    browser = await launch();
    const page = await browser.newPage();
    const gl = await page.evaluate(() => {
      const c = document.createElement('canvas'), g = c.getContext('webgl2');
      if (!g) return null;
      const d = g.getExtension('WEBGL_debug_renderer_info');
      return {webgl2: true, renderer: d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER)};
    });
    return {ok: !!gl, ...browser.resolved, version: browser.version(), ...gl, ms: Date.now() - t0};
  } catch (e) { return {ok: false, ...resolveBrowser(), error: String(e.message).slice(0, 200)}; }
  finally { await browser?.close(); }
}

async function ffmpegCheck() {
  const v = await sh('ffmpeg', ['-hide_banner', '-version']), f = await sh('ffmpeg', ['-hide_banner', '-filters']);
  if (!v) return {ok: false};
  const has = n => new RegExp(`\\s${n}\\s`).test(f ?? '');
  return {ok: has('ass') && has('gblur') && has('blend'), version: v.split('\n')[0].split(' ')[2], libass: has('ass'), gblur: has('gblur'), blend: has('blend'), loudnorm: has('loudnorm')};
}

async function pythonCheck() {
  const mods = ['numpy', 'PIL', 'soundfile', 'sherpa_onnx'];
  const out = await sh('python3', ['-c', `import importlib.util as u,json;print(json.dumps({m: u.find_spec(m) is not None for m in ${JSON.stringify(mods)}}))`]);
  return out ? {ok: true, ...JSON.parse(out)} : {ok: false};
}

const t0 = Date.now();
const hosts = ['registry.npmjs.org', 'pypi.org', 'github.com', 'raw.githubusercontent.com', 'huggingface.co', 'api.elevenlabs.io', 'fonts.gstatic.com'];
const [browser, ffmpeg, python, ...net] = await Promise.all([browserCheck(), ffmpegCheck(), pythonCheck(), ...hosts.map(reach)]);
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const report = {
  ok: browser.ok && ffmpeg.ok && python.ok,
  node: process.version, three: JSON.parse(readFileSync('node_modules/three/package.json', 'utf8')).version,
  playwright: pkg.devDependencies?.playwright ?? pkg.dependencies?.playwright,
  cpus: os.cpus().length, memGB: +(os.totalmem() / 2 ** 30).toFixed(1),
  browser, ffmpeg, python,
  network: Object.fromEntries(hosts.map((h, i) => [h, net[i]])),
  elevenLabsKey: !!process.env.ELEVENLABS_API_KEY,
  seconds: +((Date.now() - t0) / 1000).toFixed(1),
};
console.log(JSON.stringify(report, null, 1));
process.exitCode = report.ok ? 0 : 1;
