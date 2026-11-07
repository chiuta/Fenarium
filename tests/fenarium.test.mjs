// FENARIUM — teste proprii (kit FFF, v9.1.1): pornire, MIGRAREA cheilor de stocare fenarium_* → fenarium.* (fără pierdere de date),
// dialoguri ale kitului în locul celor native, copie de siguranță, axe-core, 8 limbi fără depășiri, import ostil.
// Rulare: node tests/fenarium.test.mjs
//   Playwright: din NODE_PATH / PW_ROOT; Chromium: CHROMIUM_PATH; axe-core: FFF_AXE / AXE_PATH sau pachetul `axe-core`.
//   Rețeaua e blocată; ziua curentă din „sesiuni cu lumină pe zi” se calculează la fel ca în aplicație (testul nu depinde de data de azi).
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = 'file://' + path.join(HERE, '..', 'index.html');
const APP = JSON.parse(fs.readFileSync(path.join(HERE, '..', 'app.json'), 'utf8'));
const HTML = fs.readFileSync(path.join(HERE, '..', 'index.html'), 'utf8');
const require = createRequire(process.env.PW_ROOT || import.meta.url);
let chromium;
try { ({chromium} = require('playwright')); } catch { console.error('lipsește `playwright` (npm i -D playwright, sau NODE_PATH / PW_ROOT)'); process.exit(2); }
const AXE = process.env.FFF_AXE || process.env.AXE_PATH || (() => { try { return createRequire(import.meta.url).resolve('axe-core/axe.min.js'); } catch { return null; } })();
if (!AXE || !fs.existsSync(AXE)) { console.error('lipsește axe-core (FFF_AXE=<cale>/axe.min.js sau npm i -D axe-core)'); process.exit(2); }
const axeSrc = fs.readFileSync(AXE, 'utf8');

let ok = 0, bad = 0;
const check = (n, c, x) => { if (c) { ok++; console.log('  ok   ' + n); } else { bad++; console.log('  FAIL ' + n + (x !== undefined ? '  → ' + JSON.stringify(x).slice(0, 400) : '')); } };

// aceeași formulă ca nowLocal().slice(0,10) din aplicație
const TODAY = (() => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); })();

// datele unui utilizator FENARIUM v9 (fără kit): toate cheile vechi, cu valori realiste
const J1 = {id: 'a1', d: '2026-10-01T10:00', sense: 'vaz', ex: 'Fosfena clasică', dur: 300, mood: 4, th: 'calm', col: 'violet', nt: 'prima notă'};
const J2 = {id: 'a2', d: '2026-10-02T09:30', sense: 'auz', ex: 'Zwicker orb (12 probe)', dur: 216, mood: 3, th: '', col: 'H 80%', nt: 'a doua notă'};
const OLD = {
  fenarium_lang: 'de',
  fenarium_theme: 'light',
  fenarium_jurnal_v1: JSON.stringify([J1, J2]),
  fenarium_set_v1: JSON.stringify({voice: false, rate: 1.2, chime: false, maxLight: 2}),
  fenarium_day_v1: JSON.stringify({d: TODAY, n: 2}),
  fenarium_prog_v1: JSON.stringify({done: {m1l1: true, m1l2: true}, q: {m1l1: 1}, last: 'm1l2'}),
  fenarium_lab_v1: JSON.stringify({cfg: {task: 'span', n: 8}, plan: ['A', 'B', 'B', 'A'], res: [{c: 'A', task: 'span', pre: 6, post: 7, cpre: 5, cpost: 6, d: '2026-10-03T10:00'}], rt: [{d: '2026-10-03T10:00', v: 312}], span: [{d: '2026-10-03T10:05', v: 7}], zb: []}),
};
const PAIRS = [['fenarium_lang', 'fenarium.lang'], ['fenarium_theme', 'fenarium.theme'], ['fenarium_jurnal_v1', 'fenarium.jurnal.v1'], ['fenarium_set_v1', 'fenarium.set.v1'], ['fenarium_day_v1', 'fenarium.day.v1'], ['fenarium_prog_v1', 'fenarium.prog.v1'], ['fenarium_lab_v1', 'fenarium.lab.v1']];

for (const ev of ['uncaughtException', 'unhandledRejection']) process.on(ev, (e) => { console.log('  FAIL excepție neprevăzută → ' + String((e && e.message) || e).split('\n').slice(0, 3).join(' ')); process.exit(1); });
const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox']});
async function open({w = 1280, h = 800, scheme = 'dark', seed = null, query = '', blockLS = false} = {}) {
  const ctx = await browser.newContext({viewport: {width: w, height: h}, colorScheme: scheme, locale: 'en-US', reducedMotion: 'reduce'});
  const net = [];
  await ctx.route(/^https?:/, (r) => { net.push(r.request().url()); r.abort(); });
  const page = await ctx.newPage();
  const errs = [], native = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { const t = m.text(); if (/Content Security Policy|Refused to/i.test(t)) errs.push('csp: ' + t); });
  page.on('dialog', (d) => { native.push(d.type() + ': ' + d.message()); d.dismiss(); });
  if (blockLS) await page.addInitScript(() => { Object.defineProperty(window, 'localStorage', {get() { throw new DOMException('blocat', 'SecurityError'); }}); });
  if (seed) await page.addInitScript((s) => {
    try { if (!sessionStorage.getItem('__seeded')) { for (const k in s) localStorage.setItem(k, s[k]); sessionStorage.setItem('__seeded', '1'); } } catch (e) { /* ignorat */ }
  }, seed);
  await page.goto(FILE + query);
  await page.waitForSelector('#tabs button');
  await page.waitForTimeout(400);
  return {ctx, page, errs, net, native};
}
const lsAll = (page) => page.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o; });
const lsGet = (page, k) => page.evaluate((key) => localStorage.getItem(key), k);
const appKeys = (o) => Object.keys(o).filter((k) => /^(fenarium|fosfena)/.test(k)).sort();
const tab = async (page, t) => { await page.click(`#tabs [data-t=${t}]`); await page.waitForTimeout(120); };
const dlgOpen = (page) => page.evaluate(() => !!document.querySelector('dialog.fff-dlg[open]'));
async function dlg(page, which) {   // which: 'cancel' | 'ok' (ultimul buton)
  await page.waitForSelector('dialog.fff-dlg[open]');
  await page.evaluate((w) => { const b = [...document.querySelectorAll('dialog.fff-dlg[open] button.fff-btn')]; (w === 'cancel' ? b[0] : b[b.length - 1]).click(); }, which);
  await page.waitForTimeout(250);
}
const dlgText = (page) => page.evaluate(() => (document.querySelector('dialog.fff-dlg[open]') || {}).textContent || '');

/* 1. Pornire --------------------------------------------------------------- */
console.log('1. pornire');
{
  const {ctx, page, errs, net, native} = await open();
  check('zero erori JS / CSP', errs.length === 0, errs);
  check('nicio cerere de rețea', net.length === 0, net);
  const csp = (HTML.match(/http-equiv="Content-Security-Policy"\s+content="([^"]*)"/i) || [])[1] || '';
  const inline = [...HTML.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>/gi)].filter((m) => !/type="application\/(json|ld\+json)"/i.test(m[1])).length;
  const hashes = (csp.match(/'sha256-/g) || []).length;
  check('CSP: connect-src \'none\', fără unsafe-inline/unsafe-eval la scripturi', /connect-src 'none'/.test(csp) && !/script-src[^;]*'unsafe-(inline|eval)'/.test(csp), csp.slice(0, 120));
  check('CSP: hash-uri ≥ scripturi inline', hashes >= inline && hashes > 0, {hashes, inline});
  const v = await page.evaluate(() => ({meta: document.querySelector('meta[name=application-version]').content, lbl: document.getElementById('app-version').textContent, badge: document.querySelector('.badges li[data-i="7"]').textContent, role: document.getElementById('app-version').getAttribute('role'), dlg: typeof FFF.dialog.confirm}));
  check('versiunea afișată (etichetă, insignă, meta) = app.json', v.meta === APP.version && v.lbl.includes(APP.version) && v.badge.includes(APP.version), {v, app: APP.version});
  check('eticheta „Transparență” e buton; FFF.dialog încărcat', v.role === 'button' && v.dlg === 'function');
  await page.click('#app-version'); await page.waitForSelector('dialog.fff-dlg[open]');
  const t = await dlgText(page);
  check('dialogul Transparență: cheile fenarium.* listate', /fenarium\./.test(t), t.slice(0, 200));
  check('fără dialoguri native', native.length === 0, native);
  await ctx.close();
}

/* 2. Migrare completă a cheilor vechi -------------------------------------- */
console.log('2. migrare fenarium_* → fenarium.* (copiere, fără ștergere)');
{
  const {ctx, page, errs, native} = await open({seed: OLD});
  const ls = await lsAll(page);
  for (const [o, n] of PAIRS) check(`${o} → ${n}: copiat identic`, ls[n] === OLD[o], {n: ls[n]});
  check('cheile vechi au rămas neatinse (nu se șterge nimic)', PAIRS.every(([o]) => ls[o] === OLD[o]));
  check('marker fenarium.migrated scris', typeof ls['fenarium.migrated'] === 'string' && ls['fenarium.migrated'].length >= 10);
  check('aplicația folosește datele: limba de, tema luminoasă', await page.evaluate(() => [document.documentElement.lang, document.documentElement.dataset.theme].join()) === 'de,light');
  await tab(page, 'jurnal');
  check('jurnal: ambele intrări afișate', (await page.locator('#jList .je').count()) === 2);
  await tab(page, 'setari');
  const st = await page.evaluate(() => ({light: document.getElementById('setLight').value, chime: document.getElementById('setChime').checked, rate: document.getElementById('setRate').value}));
  check('setări: maxLight 2, clopoțel oprit, ritm 1.2', st.light === '2' && st.chime === false && st.rate === '1.2', st);
  await tab(page, 'curs');
  check('curs: 2 lecții parcurse', /\b2\b/.test(await page.evaluate(() => document.getElementById('cProg').textContent)), await page.evaluate(() => document.getElementById('cProg').textContent));
  await tab(page, 'lab');
  check('laborator: configurația veche (digit span) încărcată', await page.evaluate(() => document.getElementById('abTask').value) === 'span');

  // scrierile noi merg în cheile noi; cele vechi rămân cum au fost
  await page.click('#themeBtn'); await page.waitForTimeout(150);
  const ls2 = await lsAll(page);
  check('schimbarea temei scrie fenarium.theme, nu atinge fenarium_theme', ls2['fenarium.theme'] === 'dark' && ls2['fenarium_theme'] === 'light', {n: ls2['fenarium.theme'], o: ls2['fenarium_theme']});

  // a doua pornire: idempotentă
  const before = Object.fromEntries(appKeys(ls2).map((k) => [k, ls2[k]]));
  await page.reload(); await page.waitForSelector('#tabs button'); await page.waitForTimeout(300);
  const ls3 = await lsAll(page);
  const after = Object.fromEntries(appKeys(ls3).map((k) => [k, ls3[k]]));
  check('repornire: nicio cheie fenarium*/fosfena* schimbată, adăugată sau ștearsă', JSON.stringify(before) === JSON.stringify(after), {b: Object.keys(before), a: Object.keys(after)});
  check('zero erori JS, fără dialoguri native', errs.length === 0 && native.length === 0, {errs, native});
  await ctx.close();
}

/* 3. Conflict: cheia nouă există deja → nu se suprascrie niciodată -------- */
console.log('3. cheia nouă există deja');
{
  const NEWJ = JSON.stringify([{id: 'n1', d: '2026-11-01T08:00', sense: 'tact', ex: 'nou', dur: 60, mood: 5, th: '', col: '', nt: 'mai nouă'}]);
  const {ctx, page, errs} = await open({seed: {...OLD, 'fenarium.jurnal.v1': NEWJ}});
  const ls = await lsGet(page, 'fenarium.jurnal.v1');
  check('valoarea nouă rămâne neatinsă', ls === NEWJ);
  check('valoarea veche rămâne și ea', (await lsGet(page, 'fenarium_jurnal_v1')) === OLD.fenarium_jurnal_v1);
  check('celelalte chei se copiază normal', (await lsGet(page, 'fenarium.prog.v1')) === OLD.fenarium_prog_v1);
  await tab(page, 'jurnal');
  check('jurnalul afișat e cel nou (1 intrare)', (await page.locator('#jList .je').count()) === 1);
  check('zero erori JS', errs.length === 0, errs);
  await ctx.close();
}

/* 4. Cel mai vechi jurnal („Fosfena”) -------------------------------------- */
console.log('4. jurnalul fosfena_jurnal_v1');
{
  const FOS = JSON.stringify([{id: 'f1', d: '2026-09-01T20:00', dur: 150, mood: 4, th: 'liniște', col: 'verde', nt: 'din Fosfena'}]);
  const {ctx, page, errs} = await open({seed: {fosfena_jurnal_v1: FOS}});
  await tab(page, 'jurnal');
  check('intrarea veche e afișată', (await page.locator('#jList .je').count()) === 1 && /din Fosfena/.test(await page.evaluate(() => document.getElementById('jList').textContent)));
  const nj = JSON.parse((await lsGet(page, 'fenarium.jurnal.v1')) || 'null');
  check('convertită în fenarium.jurnal.v1', Array.isArray(nj) && nj.length === 1 && nj[0].id === 'f1' && nj[0].sense === 'vaz', nj);
  check('fosfena_jurnal_v1 rămâne neatins', (await lsGet(page, 'fosfena_jurnal_v1')) === FOS);
  check('zero erori JS', errs.length === 0, errs);
  await ctx.close();
}

/* 5. Date corupte și stocare blocată --------------------------------------- */
console.log('5. date corupte / stocare blocată');
{
  const BAD = {fenarium_jurnal_v1: '{nu e json', fenarium_set_v1: '[1,2', fenarium_prog_v1: '"x"', fenarium_lab_v1: 'null', fenarium_day_v1: '12', fenarium_theme: 'verde', fenarium_lang: 'xx'};
  const {ctx, page, errs} = await open({seed: BAD});
  check('pornește fără erori cu valori corupte', errs.length === 0, errs);
  const ls = await lsAll(page);
  check('valorile corupte sunt copiate/lăsate ca atare (nu se pierde nimic)', Object.keys(BAD).every((k) => ls[k] === BAD[k]));
  await tab(page, 'jurnal');
  check('jurnalul pornește gol, aplicația rămâne funcțională', (await page.locator('#jList .je').count()) === 0 && (await page.locator('#jSave').isVisible()));
  await ctx.close();
  const b = await open({blockLS: true});
  check('localStorage blocat: aplicația pornește, fără erori', b.errs.length === 0 && (await b.page.locator('#tabs button').count()) > 5, b.errs);
  await b.ctx.close();
}

/* 6. „Șterge datele” din kit șterge și cheile vechi: nimic nu reînvie ------- */
console.log('6. ștergere prin kit + copie de siguranță');
{
  const {ctx, page, errs} = await open({seed: OLD});
  const bundle = await page.evaluate(() => { const b = FFF.bundle.build(); return Object.keys(b.data || {}); });
  check('copia kitului include cheile noi și markerul', ['fenarium.lang', 'fenarium.jurnal.v1', 'fenarium.prog.v1', 'fenarium.migrated'].every((k) => bundle.includes(k)), bundle);
  const rt = await page.evaluate(async () => {
    const env = FFF.bundle.build();
    localStorage.setItem('fenarium.jurnal.v1', '[]');
    await FFF.bundle.import(new File([JSON.stringify(env)], 'b.fff.json'), {confirm: false, reload: false});
    return localStorage.getItem('fenarium.jurnal.v1');
  });
  check('import copie: jurnalul revine identic', rt === OLD.fenarium_jurnal_v1);
  const w = await page.evaluate(async () => { await FFF.bundle.wipe({confirm: false, reload: false}); return Object.keys(localStorage).filter((k) => /^(fenarium|fosfena)/.test(k)); });
  check('wipe: nicio cheie fenarium*/fosfena* (nici vechi, nici noi) nu rămâne', w.length === 0, w);
  await page.reload(); await page.waitForSelector('#tabs button'); await page.waitForTimeout(300);
  await tab(page, 'jurnal');
  check('după ștergere și repornire jurnalul e gol (nu reînvie din cheile vechi)', (await page.locator('#jList .je').count()) === 0);
  check('zero erori JS', errs.length === 0, errs);
  await ctx.close();
}

/* 7. Dialoguri ale kitului în locul celor native ---------------------------- */
console.log('7. dialoguri');
{
  const {ctx, page, errs, native} = await open({seed: OLD});
  // jurnal: șterge tot
  await tab(page, 'jurnal');
  await page.click('#jClear'); check('jClear: dialog kit deschis, cu mesajul tradus', (await dlgOpen(page)) && /./.test(await dlgText(page)));
  await dlg(page, 'cancel');
  check('jClear „Anulează”: jurnalul rămâne', (await lsGet(page, 'fenarium.jurnal.v1')) === OLD.fenarium_jurnal_v1);
  await page.click('#jClear'); await page.keyboard.press('Escape'); await page.waitForTimeout(250);
  check('jClear Escape = anulare', (await lsGet(page, 'fenarium.jurnal.v1')) === OLD.fenarium_jurnal_v1 && !(await dlgOpen(page)));
  await page.click('#jClear'); await dlg(page, 'ok');
  check('jClear „Da”: jurnal gol în fenarium.jurnal.v1; cheia veche rămâne', (await lsGet(page, 'fenarium.jurnal.v1')) === '[]' && (await lsGet(page, 'fenarium_jurnal_v1')) === OLD.fenarium_jurnal_v1);

  // curs: resetare progres (butonul e în Setări)
  await tab(page, 'setari');
  await page.click('#progReset'); await dlg(page, 'cancel');
  check('progReset „Anulează”: progresul rămâne', (await lsGet(page, 'fenarium.prog.v1')) === OLD.fenarium_prog_v1);
  await page.click('#progReset'); await dlg(page, 'ok');
  const pr = JSON.parse(await lsGet(page, 'fenarium.prog.v1'));
  check('progReset „Da”: progres gol', Object.keys(pr.done).length === 0 && Object.keys(pr.q).length === 0, pr);

  // laborator: plan nou (cu sesiuni făcute → confirmare) și șterge tot
  await tab(page, 'lab');
  await page.click('#abNew'); check('abNew: confirmare (există sesiuni)', await dlgOpen(page)); await dlg(page, 'cancel');
  check('abNew „Anulează”: laboratorul rămâne', (await lsGet(page, 'fenarium.lab.v1')) === OLD.fenarium_lab_v1);
  await page.click('#abClr'); await dlg(page, 'ok');
  const lab = JSON.parse(await lsGet(page, 'fenarium.lab.v1'));
  check('abClr „Da”: laborator gol', lab.plan.length === 0 && lab.res.length === 0 && lab.rt.length === 0, lab);

  // import jurnal: valid și invalid → alerte ale kitului
  await tab(page, 'jurnal');
  await page.setInputFiles('#jFile', {name: 'j.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify([J1, J2]))});
  await page.waitForSelector('dialog.fff-dlg[open]');
  check('import jurnal valid: alertă a kitului „Importate: 2”', /Importate: 2/.test(await dlgText(page)), await dlgText(page));
  await dlg(page, 'ok');
  check('jurnalul are 2 intrări', (await page.locator('#jList .je').count()) === 2);
  await page.setInputFiles('#jFile', {name: 'j.json', mimeType: 'application/json', buffer: Buffer.from('nu e json')});
  await page.waitForSelector('dialog.fff-dlg[open]'); await dlg(page, 'ok');
  check('import jurnal invalid: alertă, 2 intrări rămân', (await page.locator('#jList .je').count()) === 2);

  // restaurare copie proprie: confirmare + alertă
  await tab(page, 'setari');
  const BK = {app: 'FENARIUM', v: 3, journal: [J2], prog: {done: {m1l3: true}, q: {}, last: ''}, set: {voice: false, rate: 0.9, chime: true, maxLight: 4}, lab: {cfg: {task: 'rt', n: 5}, plan: [], res: [], rt: [], span: [], zb: []}};
  await page.setInputFiles('#bkFile', {name: 'b.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(BK))});
  await page.waitForSelector('dialog.fff-dlg[open]'); await dlg(page, 'cancel');
  check('restaurare „Anulează”: jurnalul rămâne cu 2 intrări', JSON.parse(await lsGet(page, 'fenarium.jurnal.v1')).length === 2);
  await page.setInputFiles('#bkFile', {name: 'b.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(BK))});
  await page.waitForSelector('dialog.fff-dlg[open]'); await dlg(page, 'ok');
  await page.waitForSelector('dialog.fff-dlg[open]'); await dlg(page, 'ok');   // alerta „Copia a fost restaurată”
  check('restaurare „Da”: jurnal 1 intrare, setări noi, în cheile noi', JSON.parse(await lsGet(page, 'fenarium.jurnal.v1')).length === 1 && JSON.parse(await lsGet(page, 'fenarium.set.v1')).maxLight === 4);

  // avertizarea pentru sesiuni cu lumină: ≥ maxLight pe zi
  await page.evaluate(([d]) => { localStorage.setItem('fenarium.day.v1', JSON.stringify({d, n: 9})); }, [TODAY]);
  await tab(page, 'sensuri');
  await page.check('.card.exp[data-e=fos] input[type=checkbox]');
  await page.click('.card.exp[data-e=fos] button.run');
  check('lightWarn: dialog al kitului cu numărul de sesiuni', (await dlgOpen(page)) && /9/.test(await dlgText(page)), await dlgText(page));
  await dlg(page, 'cancel');
  check('lightWarn „Anulează”: sesiunea nu pornește', !(await page.evaluate(() => document.getElementById('ov').classList.contains('on'))));
  await page.click('.card.exp[data-e=fos] button.run'); await dlg(page, 'ok');
  await page.waitForTimeout(300);
  check('lightWarn „Continuă”: sesiunea pornește', await page.evaluate(() => document.getElementById('ov').classList.contains('on')));
  await page.keyboard.press('Escape');
  check('zero erori JS, fără dialoguri native', errs.length === 0 && native.length === 0, {errs, native});
  await ctx.close();
}

/* 8. axe-core: ambele teme, 360 și 1366 ----------------------------------- */
console.log('8. axe-core');
for (const scheme of ['light', 'dark']) for (const [w, h] of [[1366, 800], [360, 740]]) {
  const {ctx, page} = await open({w, h, scheme, seed: OLD});
  await page.evaluate(axeSrc + '\n;0');
  const run = async (label, sel) => {
    const v = await page.evaluate(async (s) => (await axe.run(s ? document.querySelector(s) : document, {resultTypes: ['violations']})).violations.map((x) => x.id + ': ' + x.nodes.map((n) => n.target.join(' ')).slice(0, 2).join(' | ')), sel);
    check(`axe ${scheme} ${w}px · ${label}`, v.length === 0, v);
  };
  await run('Acasă', null);
  for (const t of ['sensuri', 'curs', 'lab', 'jurnal', 'setari', 'glosar', 'siguranta']) { await tab(page, t); await run(t, null); }
  await tab(page, 'jurnal'); await page.click('#jClear'); await page.waitForSelector('dialog.fff-dlg[open]'); await run('dialog confirmare', 'dialog[open]'); await page.keyboard.press('Escape');
  await page.click('#app-version'); await page.waitForSelector('dialog.fff-dlg[open]'); await run('dialog Transparență', 'dialog[open]');
  await ctx.close();
}

/* 9. Opt limbi: paritate de chei, fără depășiri la 360 px ------------------ */
console.log('9. 8 limbi');
{
  const {ctx: c0, page: p0} = await open();
  const par = await p0.evaluate(() => { const L = ['en', 'fr', 'it', 'es', 'pt', 'de', 'hu']; const d = {}; for (const l of L) d[l] = Object.keys(JSON.parse(document.getElementById('i18n-' + l).textContent)).sort((a, b) => a - b); return {L, d, ro: [...document.querySelectorAll('[data-i]')].length}; });
  const ref = par.d.en.join();
  check('7 dicționare (+ română în HTML)', par.L.every((l) => par.d[l].length > 1000) && par.ro > 100, par.L.map((l) => l + ':' + par.d[l].length));
  check('aceleași chei în toate cele 7 dicționare', par.L.every((l) => par.d[l].join() === ref), par.L.map((l) => l + ':' + par.d[l].length));
  const empties = await p0.evaluate(() => ['en', 'fr', 'it', 'es', 'pt', 'de', 'hu'].map((l) => [l, Object.entries(JSON.parse(document.getElementById('i18n-' + l).textContent)).filter(([, v]) => v === '').length]).filter((x) => x[1]));
  check('nicio valoare goală', empties.length === 0, empties);
  await c0.close();
  for (const l of ['ro', 'en', 'fr', 'it', 'es', 'pt', 'de', 'hu']) {
    const {ctx, page, errs} = await open({w: 360, h: 740, query: '?lang=' + l});
    const tabs = await page.evaluate(() => [...document.querySelectorAll('#tabs [data-t]')].map((b) => b.dataset.t));
    const bad = [];
    for (const t of tabs) {
      await tab(page, t);
      const r = await page.evaluate(() => ({ov: document.documentElement.scrollWidth - document.documentElement.clientWidth, und: /\bundefined\b|\[object /.test(document.getElementById('mainEl').textContent)}));
      if (r.ov > 1) bad.push(`${t}: depășire ${r.ov}px`);
      if (r.und) bad.push(`${t}: „undefined” în text`);
    }
    check(`limba ${l}: ${tabs.length} taburi la 360 px fără depășire și fără „undefined”`, bad.length === 0 && (await page.evaluate(() => document.documentElement.lang)) === l, bad);
    check(`limba ${l}: zero erori JS`, errs.length === 0, errs);
    await ctx.close();
  }
}

/* 10. Import ostil ---------------------------------------------------------- */
console.log('10. import ostil');
{
  const {ctx, page, errs, native} = await open({seed: OLD});
  const keys = ['fenarium.jurnal.v1', 'fenarium.prog.v1', 'fenarium.lab.v1', 'fenarium.set.v1'];
  const snap = async () => JSON.stringify(await Promise.all(keys.map((k) => lsGet(page, k))));
  const before = await snap();
  await tab(page, 'jurnal');
  const hostileJ = {
    gol: '', nejson: '{{{', obiect: '{}', nul: 'null', numar: '12345',
    fara_data: JSON.stringify([{id: 'z', nt: 'fără dată'}, 7, null, 'text', [], {d: ''}]),
    uriaș: '[' + '{"x":"' + 'a'.repeat(1 << 20) + '"},'.repeat(8) + '{"y":1}]',
    otravit: '[{"__proto__":{"polluted":1},"constructor":{"prototype":{"polluted":2}},"d":"2026-01-01T00:00","id":"__proto__","nt":"x"}]',
  };
  for (const [n, c] of Object.entries(hostileJ)) {
    await page.setInputFiles('#jFile', {name: n + '.json', mimeType: 'application/json', buffer: Buffer.from(c)});
    await page.waitForSelector('dialog.fff-dlg[open]', {timeout: 5000}).catch(() => null);
    if (await dlgOpen(page)) await dlg(page, 'ok');
    const cnt = await page.locator('#jList .je').count();
    // fișierul „otravit” e singurul care poate adăuga o intrare (are `d`); restul nu schimbă nimic
    check(`jurnal ${n}: starea rămâne utilizabilă (${cnt} intrări)`, cnt >= 2 && cnt <= 3 && (await page.locator('#jSave').isVisible()), cnt);
  }
  check('prototipul global neatins', await page.evaluate(() => ({}).polluted === undefined && Object.prototype.polluted === undefined));
  await tab(page, 'setari');
  const hostileB = {
    gol: '', nejson: 'zzz', alta_app: JSON.stringify({app: 'ALTCEVA', journal: []}),
    tipuri_gresite: JSON.stringify({app: 'FENARIUM', journal: 'x', prog: 5, set: 'a', lab: [1]}),
    otravit: JSON.stringify({app: 'FENARIUM', prog: {done: JSON.parse('{"__proto__":{"polluted":3}}'), q: {}, last: '__proto__'}, lab: {cfg: {task: 'rt', n: 1e9}, plan: Array(1e5).fill('A'), res: [], rt: [], span: [], zb: []}}),
  };
  for (const [n, c] of Object.entries(hostileB)) {
    await page.setInputFiles('#bkFile', {name: n + '.json', mimeType: 'application/json', buffer: Buffer.from(c)});
    await page.waitForSelector('dialog.fff-dlg[open]', {timeout: 5000}).catch(() => null);
    for (let i = 0; i < 3 && (await dlgOpen(page)); i++) await dlg(page, 'ok');   // confirmare „Da” + alertă
    const lab = JSON.parse((await lsGet(page, 'fenarium.lab.v1')) || '{}');
    check(`copie ${n}: laboratorul rămâne în limite (plan ≤ 40, n ≤ 12)`, (lab.plan || []).length <= 40 && (!lab.cfg || lab.cfg.n <= 12), {plan: (lab.plan || []).length, n: lab.cfg && lab.cfg.n});
  }
  check('prototipul global neatins (copie)', await page.evaluate(() => ({}).polluted === undefined && Object.prototype.polluted === undefined));
  check('fișierele nevalide/ostile nu au alterat jurnalul peste cele 3 intrări permise', JSON.parse(await lsGet(page, 'fenarium.jurnal.v1')).length <= 3);
  // importul kitului, fișiere corupte
  const rb = await page.evaluate(async () => {
    const out = {};
    for (const [n, c] of [['gol', ''], ['nejson', 'zzz'], ['alt-format', '{"fff":9}'], ['alta-app', JSON.stringify({fff: 1, app: 'altceva', data: {x: '1'}})]]) {
      try { await FFF.bundle.import(new File([c], n + '.fff.json'), {confirm: false, reload: false}); out[n] = 'acceptat'; } catch (e) { out[n] = e.code || 'eroare'; }
    }
    return out;
  });
  check('import kit ostil respins cu cod de eroare', Object.values(rb).every((v) => v !== 'acceptat'), rb);
  void before;
  check('zero erori JS, fără dialoguri native', errs.length === 0 && native.length === 0, {errs, native});
  await ctx.close();
}

await browser.close();
console.log(`\n${ok} ok, ${bad} eșuate`);
process.exit(bad ? 1 : 0);
