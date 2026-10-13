/**
 * The Gallery page drawn in marker on the classroom's whiteboard (sections/Classroom.tsx lays it over the board).
 * Drawn from the page itself: every word, folder and doodle is measured where the Gallery has it on this screen, so
 * when the camera reaches the board and the drawing fills the screen, each stroke sits exactly where the real thing
 * then appears. One hand, several markers: the heading and the words in blue, each folder in its own colour, the
 * sunflowers in yellow.
 */
const BOARD = '#B2B3B1';                       // the board's white as the render has it
const INK = { blue: '#1F3F95', royal: '#1E4FB0', sky: '#2786B8', crest: '#C8232F', black: '#2A2E36', yellow: '#D9A21B', green: '#3E8A4E' };
const TONE: Record<string, string> = { sky: INK.sky, royal: INK.royal, crest: INK.crest };

type R = { x: number; y: number; w: number; h: number };

/** A seeded wobble, so the marker's hand is the same every time the drawing is made. */
function hand(seed: number) {
  let s = seed % 2147483647 || 1;
  return () => ((s = (s * 48271) % 2147483647) / 2147483647) * 2 - 1;
}

export async function drawSketch(cv: HTMLCanvasElement, section: HTMLElement, cssW: number, cssH: number, dpr: number) {
  try { await document.fonts.load('700 40px Kalam'); await document.fonts.load('400 20px Kalam'); } catch { /* the fallback hand will do */ }
  cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr);
  const ctx = cv.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const base = section.getBoundingClientRect();
  const rel = (r: DOMRect): R => ({ x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height });
  const j = hand(7);

  // the board, its scribbles cleaned off where the drawing goes; its edges soft, so it melts into the board round it
  ctx.save(); ctx.filter = 'blur(18px)'; ctx.fillStyle = BOARD; ctx.fillRect(24, 24, cssW - 48, cssH - 48); ctx.restore();
  ctx.fillStyle = BOARD; ctx.fillRect(40, 40, cssW - 80, cssH - 80);

  const stroke = (color: string, width: number, path: (o: number) => void) => {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const o of [0, 1]) { ctx.globalAlpha = o ? 0.55 : 0.92; ctx.beginPath(); path(o); ctx.stroke(); }   // a marker goes over twice
    ctx.globalAlpha = 1;
  };
  const line = (x0: number, y0: number, x1: number, y1: number, o: number) => {
    const w = o ? 1.4 : 0.6; ctx.moveTo(x0 + j() * w, y0 + j() * w); ctx.quadraticCurveTo((x0 + x1) / 2 + j() * 1.5, (y0 + y1) / 2 + j() * 1.5, x1 + j() * w, y1 + j() * w);
  };
  const box = (r: R, o: number, rad = 0) => {
    const { x, y, w, h } = r;
    if (!rad) { line(x, y, x + w, y, o); line(x + w, y, x + w, y + h, o); line(x + w, y + h, x, y + h, o); line(x, y + h, x, y, o); return; }
    ctx.moveTo(x + rad, y); ctx.lineTo(x + w - rad, y + j()); ctx.quadraticCurveTo(x + w, y, x + w + j(), y + rad);
    ctx.lineTo(x + w + j(), y + h - rad); ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h + j());
    ctx.lineTo(x + rad, y + h + j()); ctx.quadraticCurveTo(x, y + h, x + j(), y + h - rad); ctx.lineTo(x + j(), y + rad); ctx.quadraticCurveTo(x, y, x + rad, y);
  };

  // words, word by word where the page sets them, in the marker's hand
  const write = (el: Element | null, color: string) => {
    if (!el) return;
    const cs = getComputedStyle(el);
    ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; ctx.fillStyle = color; ctx.textBaseline = 'middle';
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const t = n.textContent ?? ''; const re = /\S+/g; let m: RegExpExecArray | null;
      while ((m = re.exec(t))) {
        range.setStart(n, m.index); range.setEnd(n, m.index + m[0].length);
        const r = rel(range.getBoundingClientRect()); if (!r.w) continue;
        ctx.save(); ctx.translate(r.x, r.y + r.h / 2); ctx.rotate(j() * 0.012);
        ctx.fillText(m[0], 0, 0); ctx.globalAlpha = 0.35; ctx.fillText(m[0], 0.6, 0.4); ctx.restore();
      }
    }
  };
  const head = section.querySelector('.sheet-head');
  write(head?.querySelector('.wide') ?? null, INK.blue);
  write(head?.querySelector('.other') ?? null, INK.royal);
  write(head?.querySelector('.lede') ?? null, INK.blue);

  // the folders: a tabbed back, three photos sticking out (each a little mountain and sun), the front with its words
  section.querySelectorAll<HTMLElement>('.fold-item').forEach((item) => {
    const fold = item.querySelector<HTMLElement>('.fold'); if (!fold) return;
    const tone = TONE[[...fold.classList].find((c) => c in TONE) ?? 'royal'];
    const f = rel(fold.getBoundingClientRect());
    const tab: R = { x: f.x, y: f.y - f.h * 0.08, w: f.w * 0.42, h: f.h * 0.1 };
    stroke(tone, 3.2, (o) => { box({ x: f.x, y: f.y, w: f.w, h: f.h }, o, 10); line(tab.x + 4, f.y, tab.x + 4, tab.y + 6, o); line(tab.x + 4, tab.y + 6, tab.x + tab.w - 10, tab.y + 6, o); line(tab.x + tab.w - 10, tab.y + 6, tab.x + tab.w, f.y, o); });
    fold.querySelectorAll<HTMLElement>('.peek img').forEach((im, k) => {
      const b = rel(im.getBoundingClientRect()); const w = im.offsetWidth, h = im.offsetHeight;
      const ang = parseFloat(getComputedStyle(im).rotate) || [-7, 2, 8][k] || 0;
      ctx.save(); ctx.translate(b.x + b.w / 2, b.y + b.h / 2); ctx.rotate((ang * Math.PI) / 180);
      ctx.fillStyle = BOARD; ctx.fillRect(-w / 2, -h / 2, w, h);
      stroke(INK.black, 2.4, (o) => { box({ x: -w / 2, y: -h / 2, w, h }, o); line(-w * 0.4, h * 0.3, -w * 0.1, -h * 0.1, o); line(-w * 0.1, -h * 0.1, w * 0.1, h * 0.12, o); line(w * 0.05, h * 0.05, w * 0.22, -h * 0.05, o); line(w * 0.22, -h * 0.05, w * 0.4, h * 0.3, o); });
      stroke(INK.yellow, 2.4, () => { ctx.arc(w * 0.26, -h * 0.24, Math.min(w, h) * 0.09, 0, Math.PI * 2); });
      ctx.restore();
    });
    const front = fold.querySelector<HTMLElement>('.front');
    if (front) {
      const r = rel(front.getBoundingClientRect());
      ctx.fillStyle = BOARD; ctx.fillRect(r.x, r.y, r.w, r.h);
      stroke(tone, 3.2, (o) => box(r, o, 8));
      // a few quick strokes of shading across the front, as a marker fills a shape in a hurry
      stroke(tone, 1.4, (o) => { if (o) return; for (let k = 1; k < 9; k++) { const x0 = r.x + (r.w * k) / 9; line(x0, r.y + r.h - 6, x0 + r.h * 0.35, r.y + r.h * 0.45, 1); } });
      write(front.querySelector('b'), tone);
      write(front.querySelector('em'), tone);
      write(front.querySelector('small'), INK.black);
    }
    write(item.querySelector('.fold-line'), INK.blue);
  });

  // the doodles, in marker: the sunflowers' petals yellow, their stems green, everything else the blue marker
  const style = `<style>*{fill:none;stroke:${INK.blue};stroke-width:3.2;stroke-linecap:round;stroke-linejoin:round}.petal{stroke:${INK.yellow}}.seed{fill:#8A5A20;stroke:none}.leaf{stroke:${INK.green}}</style>`;
  await Promise.all([...section.querySelectorAll<SVGSVGElement>('.gal-doodles svg')].map((sv) => new Promise<void>((done) => {
    const r = rel(sv.getBoundingClientRect()); if (!r.w) { done(); return; }
    const src = sv.outerHTML.replace(/<svg([^>]*)>/, `<svg$1 xmlns="http://www.w3.org/2000/svg">${style}`);
    const im = new Image();
    im.onload = () => { ctx.drawImage(im, r.x, r.y, r.w, r.h); done(); }; im.onerror = () => done();
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src);
  })));
}
