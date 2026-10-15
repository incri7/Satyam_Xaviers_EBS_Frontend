import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type MouseEvent, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { copy } from '../content';
import { pagePath, useLang } from '../lang';
import { jumpTo, markMoment } from '../scroll';
import { pages } from './pages';
import { T } from './ui';

const PHONE = '057-525563', EMAIL = 'mailme.satyamxaviers@gmail.com', FACEBOOK = 'https://www.facebook.com/SatyamXav';
const PLACE = "Satyam Xavier's English Boarding School, Hetauda";
const MAP = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(PLACE);
const MAP_EMBED = 'https://www.google.com/maps?output=embed&q=' + encodeURIComponent(PLACE);
const PLANE = '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M8 52 L92 18 L60 86 L46 60 Z M46 60 L92 18"/></svg>';

/* A link to the Contact page: on the home page, straight to its place at the story's end (as the nav does);
   anywhere else, to the home page's #contact. A topic opens the letter on it (the admissions banner: Admission). */
export function ToContact({ topic, className, children }: { topic?: string; className?: string; children: ReactNode }) {
  const lang = useLang(); const { pathname } = useLocation();
  const go = (e: MouseEvent) => {
    if (topic) pendingTopic = topic;
    dispatchEvent(new Event('contact-topic'));
    if (pathname === pagePath(lang) && jumpTo('contact')) { e.preventDefault(); markMoment('contact'); }
  };
  return <Link className={className} to={{ pathname: pagePath(lang), hash: '#contact' }} onClick={go}>{children}</Link>;
}
let pendingTopic: string | null = null;

type Status = 'idle' | 'sending' | 'sent' | 'failed';
type Errors = Partial<Record<'name' | 'phone' | 'email' | 'topic' | 'message', string>>;
const digits = (v: string) => v.replace(/[०-९]/g, (d) => String('०१२३४५६७८९'.indexOf(d))).replace(/[\s\-()]/g, '');
// a Nepali mobile (98, 97 or 96 and eight more, +977 or not), or a landline with its area code (057-525563)
const okPhone = (v: string) => /^(\+?977)?9[678]\d{8}$/.test(digits(v)) || /^0\d{1,2}\d{6,7}$/.test(digits(v));
const GRADES = ['nursery', 'lkg', 'ukg', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];   // what the office receives, whatever the language
const okEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

/** The Contact page: the school's envelope, the reader's letter to the office in it (it flies to the school as the
    Gallery's paper plane when sent), and every way to reach the school beside it. The last page of the home page's
    story, which it is revealed under as the Notices page lifts off; also its own page at /contact. */
export function ContactBody({ heading = 'h2' }: { heading?: 'h1' | 'h2' }) {
  const lang = useLang(); const c = pages[lang].contact, f = copy[lang].footer;
  const H = heading;
  const [form, setForm] = useState({ name: '', phone: '', email: '', topic: '', grade: '', message: '', reply: 'call', website: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>('idle');
  const air = useRef<HTMLDivElement>(null);
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const set = (k: keyof typeof form, v: string) => {
    setForm((s) => ({ ...s, [k]: v }));
    if (errors[k as keyof Errors]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  // the admissions banner (and any link that names a topic) opens the letter on it
  useEffect(() => {
    const take = () => { if (pendingTopic) { const t = pendingTopic; pendingTopic = null; setForm((s) => ({ ...s, topic: t })); setStatus((st) => (st === 'sent' ? 'idle' : st)); } };
    take(); addEventListener('contact-topic', take);
    return () => removeEventListener('contact-topic', take);
  }, []);

  const check = (): Errors => {
    const e: Errors = {};
    if (!form.name.trim()) e.name = c.errName;
    if (!okPhone(form.phone)) e.phone = c.errPhone;
    if ((form.reply === 'email' || form.email.trim()) && !okEmail(form.email)) e.email = c.errEmail;
    if (!form.topic) e.topic = c.errAbout;
    if (form.message.trim().length < 2) e.message = c.errMessage;
    return e;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (status === 'sending') return;
    const e = check(); setErrors(e);
    const first = Object.keys(e)[0];
    if (first) { air.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus(); return; }
    if (form.website) return;   // the field people never see: only a bot fills it in
    setStatus('sending');
    let ok = false;
    try {
      const r = await fetch('/api/v1/enquiries/', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name.trim(), phone: digits(form.phone), email: form.email.trim() || null, topic: form.topic,
          grade: form.topic === 'admission' ? form.grade || null : null, message: form.message.trim(), reply_by: form.reply, lang }) });
      ok = r.ok;
    } catch { ok = false; }
    if (!ok) { setStatus('failed'); return; }
    if (reduce || !air.current) { setStatus('sent'); return; }
    fly(air.current, () => setStatus('sent'));
  };

  // the letter, sent: it folds in three, folds down to a slip, and leaves as the paper plane, out over the page
  // with its dashed trail; the envelope then shows what happens next
  const fly = (card: HTMLElement, done: () => void) => {
    const r = card.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const plane = document.createElement('div'); plane.className = 'ct-plane'; plane.innerHTML = PLANE;
    const ns = 'http://www.w3.org/2000/svg', trail = document.createElementNS(ns, 'svg'); trail.setAttribute('class', 'ct-trail');
    const path = document.createElementNS(ns, 'path'); trail.appendChild(path);
    document.body.append(trail, plane);
    const P0 = [cx, cy], P1 = [cx + innerWidth * 0.35, cy + innerHeight * 0.1], P2 = [cx + innerWidth * 0.2, -innerHeight * 0.5], P3 = [innerWidth + 140, -160];
    const at = (t: number) => [0, 1].map((k) => (1 - t) ** 3 * P0[k] + 3 * (1 - t) ** 2 * t * P1[k] + 3 * (1 - t) * t * t * P2[k] + t ** 3 * P3[k]);
    const pts: string[] = [], go = { t: 0 };
    const place = () => {
      const [x, y] = at(go.t), [x2, y2] = at(Math.min(1, go.t + 0.01));
      const ang = (Math.atan2(y2 - y, x2 - x) * 180) / Math.PI + 22;   // the drawing's nose is 22 degrees above its tail
      gsap.set(plane, { x: x - 36, y: y - 36, rotation: ang, scale: 1 - go.t * 0.35 });
      pts.push(x.toFixed(1) + ' ' + y.toFixed(1)); path.setAttribute('d', 'M' + pts.join('L'));
    };
    gsap.timeline({ onComplete: () => { plane.remove(); trail.remove(); gsap.set(card, { clearProps: 'all' }); done(); } })
      .to(card.querySelectorAll('.ct-letter > *'), { autoAlpha: 0, duration: 0.2 }, 0)
      .to(card, { scaleY: 0.34, duration: 0.35, ease: 'power2.inOut' }, 0.15)
      .to(card, { scaleX: 0.12, scaleY: 0.1, borderRadius: 6, duration: 0.35, ease: 'power3.in' }, 0.5)
      .add(() => { place(); gsap.set(plane, { autoAlpha: 1 }); }, 0.82)
      .to(card, { autoAlpha: 0, duration: 0.08 }, 0.82)
      .fromTo(plane, { scale: 0.4 }, { scale: 1, duration: 0.2, ease: 'back.out(2)' }, 0.82)
      .to(go, { t: 1, duration: 1.2, ease: 'power1.in', onUpdate: place }, 0.9)
      .to(trail, { opacity: 0, duration: 0.5 }, 1.6);
  };

  // the envelope's answer comes in where the letter was
  useLayoutEffect(() => {
    if (status === 'sent' && air.current && !reduce) gsap.fromTo(air.current, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' });
  }, [status, reduce]);

  const mail = `mailto:${EMAIL}?subject=${encodeURIComponent(`${c.topics.find(([k]) => k === form.topic)?.[1] ?? c.letter}: ${form.name}`)}&body=${encodeURIComponent(`${form.message}\n\n${form.name}\n${form.phone}`)}`;
  const field = (k: 'name' | 'phone' | 'email', label: string, extra: Record<string, string | boolean>, hint?: string) => (
    <label className="ct-f" data-bad={errors[k] ? '' : undefined}>
      <span>{label}</span>
      <input name={k} value={form[k]} onChange={(e) => set(k, e.target.value)} aria-invalid={!!errors[k]}
        aria-describedby={errors[k] ? `ct-${k}-err` : hint ? `ct-${k}-hint` : undefined} {...extra} />
      {errors[k] ? <small className="ct-err" id={`ct-${k}-err`}>{errors[k]}</small> : hint ? <small className="ct-hint" id={`ct-${k}-hint`}>{hint}</small> : null}
    </label>
  );

  return (
    <div className="ct">
      <div className="ct-inner">
        <header className="ct-head">
          <H className="ct-title" id="contact-title">{c.title}</H>
          <p className="ct-other" lang={lang === 'en' ? 'ne' : 'en'}>{c.other}</p>
          <p className="ct-lede">{c.intro}</p>
        </header>

        <div className="ct-grid">
          <div className="ct-air" ref={air}>
            {status === 'sent' ? (
              <div className="ct-letter ct-sent" role="status">
                <span className="ct-sent-plane" aria-hidden="true" dangerouslySetInnerHTML={{ __html: PLANE }} />
                <h3>{c.sent}</h3>
                <p>{form.reply === 'email' ? c.sentEmail.replace('{email}', form.email.trim()) : c.sentCall.replace('{phone}', form.phone.trim())}</p>
                <button type="button" className="btn line" onClick={() => { setForm((s) => ({ ...s, topic: '', grade: '', message: '' })); setStatus('idle'); }}>{c.another}</button>
              </div>
            ) : (
              <form className="ct-letter" onSubmit={submit} noValidate>
                <h3>{c.letter}</h3>
                <p className="ct-note">{c.letterNote}</p>
                <div className="ct-fields">
                  {field('name', c.name, { autoComplete: 'name', required: true })}
                  {field('phone', c.phone, { type: 'tel', autoComplete: 'tel', inputMode: 'tel', required: true }, c.phoneHint)}
                  <fieldset className="ct-f full" data-bad={errors.topic ? '' : undefined} aria-describedby={errors.topic ? 'ct-topic-err' : undefined}>
                    <legend>{c.about}</legend>
                    <div className="ct-chips">
                      {c.topics.map(([k, label]) => (
                        <label className="ct-chip" key={k}>
                          <input type="radio" name="topic" value={k} checked={form.topic === k} onChange={() => set('topic', k)} />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                    {errors.topic ? <small className="ct-err" id="ct-topic-err">{errors.topic}</small> : null}
                  </fieldset>
                  {form.topic === 'admission' ? (
                    <label className="ct-f full ct-grade">
                      <span>{c.grade}</span>
                      <select name="grade" value={form.grade} onChange={(e) => set('grade', e.target.value)}>
                        <option value="">{c.gradeAny}</option>
                        {c.grades.map((g, i) => <option key={g} value={GRADES[i]}>{g}</option>)}
                      </select>
                    </label>
                  ) : null}
                  <label className="ct-f full" data-bad={errors.message ? '' : undefined}>
                    <span>{c.message}</span>
                    <textarea name="message" value={form.message} maxLength={1000} rows={5} placeholder={c.hints[form.topic || 'other']}
                      onChange={(e) => set('message', e.target.value)} aria-invalid={!!errors.message} aria-describedby={errors.message ? 'ct-message-err' : undefined} />
                    {errors.message ? <small className="ct-err" id="ct-message-err">{errors.message}</small> : <small className="ct-count">{form.message.length} / 1000</small>}
                  </label>
                  <fieldset className="ct-f">
                    <legend>{c.replyBy}</legend>
                    <div className="ct-chips">
                      {([['call', c.byCall], ['email', c.byEmail]] as const).map(([k, label]) => (
                        <label className="ct-chip" key={k}>
                          <input type="radio" name="reply" value={k} checked={form.reply === k} onChange={() => set('reply', k)} />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  {field('email', `${c.email}${form.reply === 'email' ? '' : ' ' + c.optional}`, { type: 'email', autoComplete: 'email', inputMode: 'email', required: form.reply === 'email' })}
                  {/* left empty by people, who never see it; filled in only by bots */}
                  <input className="ct-trap" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set('website', e.target.value)} aria-hidden="true" />
                </div>
                <div className="ct-send">
                  <button type="submit" className="btn" disabled={status === 'sending'}>{status === 'sending' ? c.sending : status === 'failed' ? c.retry : c.send}</button>
                  {status === 'failed'
                    ? <p className="ct-failed" role="alert">{c.failed} <a href={mail}>{c.mailInstead}</a></p>
                    : <p className="ct-urgent">{c.urgent}</p>}
                </div>
              </form>
            )}
          </div>

          <aside className="ct-reach">
            <div className="ct-tile ct-call">
              <h3>{c.callTitle}</h3>
              <a className="big" href="tel:057525563">{PHONE}</a>
              <p>{c.days}<br />{c.hours}</p>
            </div>
            <div className="ct-tile">
              <h3>{c.emailTitle}</h3>
              <a className="mid" href={`mailto:${EMAIL}`}>{EMAIL}</a>
              <p>{c.emailNote}</p>
            </div>
            <div className="ct-tile ct-pair">
              <div>
                <h3>{c.appTitle}</h3>
                <p>{c.appNote}</p>
                <a className="ct-link" href="/login">{c.appLogin}</a>
              </div>
              <div>
                <h3>{c.fbTitle}</h3>
                <p>{c.fbNote}</p>
                <a className="ct-link" href={FACEBOOK} target="_blank" rel="noreferrer">{c.fbLink}</a>
              </div>
            </div>
            <div className="ct-tile ct-where">
              <h3>{c.visitTitle}</h3>
              <p className="ct-addr">{f.address[0]}<br />{f.address[1]}</p>
              <dl>{c.find.map(([h, b]) => <div key={h}><dt>{h}</dt><dd><T>{b}</T></dd></div>)}</dl>
              <a className="btn ghost" href={MAP} target="_blank" rel="noreferrer">{c.mapLink}</a>
            </div>
          </aside>

          <div className="ct-visit ct-map">
            <iframe title={c.mapTitle} src={MAP_EMBED} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** The route: /contact, /ne/contact. */
export function Contact() {
  return <section className="contact-page" aria-labelledby="contact-title"><ContactBody heading="h1" /></section>;
}
