import { spawn } from 'node:child_process'; import fs from 'node:fs';
const S = process.argv[2];
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=9343', '--window-size=1600,900', `--user-data-dir=${S}/cdp-profile11`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); await sleep(4000);
const tabs = await (await fetch('http://127.0.0.1:9343/json')).json();
const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = {};
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.method === 'Runtime.exceptionThrown') console.log('EXC', JSON.stringify(d.params.exceptionDetails).slice(0, 300)); if (d.id && pending[d.id]) { pending[d.id](d.result); delete pending[d.id]; } };
const send = (method, params = {}) => new Promise((r) => { pending[++id] = r; ws.send(JSON.stringify({ id, method, params })); });
const ev = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.value;
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: 'http://localhost:5180/' }); await sleep(12000);
for (let i = 0; i < 40 && !(await ev("!!document.getElementById('gallery')")); i++) await sleep(1000);
await ev(`(() => { const g = document.getElementById('gallery'); window.scrollTo(0, g.getBoundingClientRect().top + scrollY - 300); })()`); await sleep(4000);
console.log('vw', await ev('innerWidth + "x" + innerHeight'), await ev("!!document.getElementById('gallery')"));
const url = await ev(`(async () => { try {
  const { drawSketch } = await import('/src/sections/boardSketch.ts');
  const g = document.getElementById('gallery'); const cv = document.createElement('canvas');
  await drawSketch(cv, g, innerWidth, innerHeight, 2.5);
  return cv.toDataURL('image/png'); } catch (e) { return 'ERR ' + e + ' ' + e.stack; } })()`);
if (typeof url !== 'string' || url.startsWith('ERR')) { console.log('got', String(url).slice(0, 500)); process.exit(1); }
fs.writeFileSync(`${S}/pano/sketch_1600.png`, Buffer.from(url.split(',')[1], 'base64'));
ws.close(); chrome.kill();
