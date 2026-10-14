/**
 * The Gallery page drawn in marker on the classroom's whiteboard (sections/Classroom.tsx lays it over the board).
 * Drawn from the page itself: every word, folder and doodle is measured where the Gallery has it on this screen, so
 * when the camera reaches the board and the drawing fills the screen, each stroke sits exactly where the real thing
 * then appears. Written straight on the board: strokes only, no patch of colour under them (the canvas is clear
 * where nothing is drawn, and it is laid on the board multiplied, as ink), all in one black whiteboard marker.
 */
const MARKER = '#1B1D22';                      // a black whiteboard marker: every stroke and word

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

  ctx.clearRect(0, 0, cssW, cssH);

  // wipes the ink under a shape that stands in front (the board shows there again; nothing is painted)
  const wipe = (path: () => void) => { ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); path(); ctx.fill(); ctx.restore(); };
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
  write(head?.querySelector('.wide') ?? null, MARKER);
  write(head?.querySelector('.other') ?? null, MARKER);
  write(head?.querySelector('.lede') ?? null, MARKER);

  // the folders: a tabbed back, three photos sticking out (each a little mountain and sun), the front with its words
  section.querySelectorAll<HTMLElement>('.fold-item').forEach((item) => {
    const fold = item.querySelector<HTMLElement>('.fold'); if (!fold) return;
    const tone = MARKER;
    const f = rel(fold.getBoundingClientRect());
    const tab: R = { x: f.x, y: f.y - f.h * 0.08, w: f.w * 0.42, h: f.h * 0.1 };
    stroke(tone, 3.2, (o) => { box({ x: f.x, y: f.y, w: f.w, h: f.h }, o, 10); line(tab.x + 4, f.y, tab.x + 4, tab.y + 6, o); line(tab.x + 4, tab.y + 6, tab.x + tab.w - 10, tab.y + 6, o); line(tab.x + tab.w - 10, tab.y + 6, tab.x + tab.w, f.y, o); });
    fold.querySelectorAll<HTMLElement>('.peek img').forEach((im, k) => {
      const b = rel(im.getBoundingClientRect()); const w = im.offsetWidth, h = im.offsetHeight;
      const ang = parseFloat(getComputedStyle(im).rotate) || [-7, 2, 8][k] || 0;
      ctx.save(); ctx.translate(b.x + b.w / 2, b.y + b.h / 2); ctx.rotate((ang * Math.PI) / 180);
      wipe(() => ctx.rect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4));
      stroke(MARKER, 2.4, (o) => { box({ x: -w / 2, y: -h / 2, w, h }, o); line(-w * 0.4, h * 0.3, -w * 0.1, -h * 0.1, o); line(-w * 0.1, -h * 0.1, w * 0.1, h * 0.12, o); line(w * 0.05, h * 0.05, w * 0.22, -h * 0.05, o); line(w * 0.22, -h * 0.05, w * 0.4, h * 0.3, o); });
      stroke(MARKER, 2.4, () => { ctx.arc(w * 0.26, -h * 0.24, Math.min(w, h) * 0.09, 0, Math.PI * 2); });
      ctx.restore();
    });
    const front = fold.querySelector<HTMLElement>('.front');
    if (front) {
      const r = rel(front.getBoundingClientRect());
      wipe(() => ctx.roundRect(r.x - 2, r.y - 2, r.w + 4, r.h + 4, 9));
      stroke(tone, 3.2, (o) => box(r, o, 8));
      // a few quick strokes of shading across the front, as a marker fills a shape in a hurry
      ctx.save(); ctx.beginPath(); ctx.roundRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6, 7); ctx.clip();   // the shading stays inside
      stroke(tone, 1.4, (o) => { if (o) return; for (let k = 1; k < 9; k++) { const x0 = r.x + (r.w * k) / 9; line(x0, r.y + r.h - 6, x0 + r.h * 0.35, r.y + r.h * 0.45, 1); } });
      ctx.restore();
      write(front.querySelector('b'), tone);
      write(front.querySelector('em'), tone);
      write(front.querySelector('small'), MARKER);
    }
    write(item.querySelector('.fold-line'), MARKER);
  });

  // the doodles, in the same black marker, outlines only
  const style = `<style>*{fill:none;stroke:${MARKER};stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.seed{fill:${MARKER};stroke:none}</style>`;
  await Promise.all([...section.querySelectorAll<SVGSVGElement>('.gal-doodles svg')].map((sv) => new Promise<void>((done) => {
    const r = rel(sv.getBoundingClientRect()); if (!r.w) { done(); return; }
    const src = sv.outerHTML.replace(/<svg([^>]*)>/, `<svg$1 xmlns="http://www.w3.org/2000/svg">${style}`);
    const im = new Image();
    im.onload = () => { ctx.drawImage(im, r.x, r.y, r.w, r.h); done(); }; im.onerror = () => done();
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src);
  })));
}
