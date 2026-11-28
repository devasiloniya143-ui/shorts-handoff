// WHY DOES YOUR PHONE BATTERY DIE FASTER IN THE COLD? : Deep Dive 3D, tech edition.
import * as THREE from 'three';
import { ctx, W, H, clamp, lerp, seg, eo, eio, eob } from './core/lib.js';
import { L, Wd, T } from './core/timing.js';
import { camera } from './core/engine.js';
import { Human } from './core/human.js';
import * as TECH from './core/tech.js';
import { label, pill } from './core/look2d.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const lerpV = (a, b, k) => a.clone().lerp(b, k);
function screen(p, cam) { const v = p.clone().project(cam); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; }

export function buildShots(E) {
  const S = [], CUES = [], add = (o) => (S.push(o), o), cue = (t, type, o = {}) => CUES.push({ t: +t.toFixed(3), type, ...o });
  const cut = (i) => (i === 0 ? 0 : L(i) - 0.08);
  const cam = camera(30);
  const SLOOK = { aperture: 0.003, maxblur: 0.01, bloom: 0.2 }, LAB = { aperture: 0, bloom: 0.45, bloomThreshold: 0.85, exposure: 0.95, vignette: 0.4 };
  const DARK = 'rgba(12,14,20,0.85)';

  // ── worlds ─────────────────────────────────────────────────────────────
  const ST = TECH.coldStreet(E), hero = new Human({}); ST.scene.add(hero.group);
  const phoneH = TECH.makePhone(); hero.arm.R.el.add(phoneH.group); phoneH.group.position.set(0, -0.37, 0.07); phoneH.group.rotation.set(-0.35, Math.PI, 0); phoneH.group.scale.setScalar(1.5);
  const phoneBig = TECH.makePhone(); phoneBig.group.scale.setScalar(5); phoneBig.group.position.set(3.0, 1.35, 0.4); ST.scene.add(phoneBig.group); phoneBig.group.visible = false;
  const CELL = TECH.cell(E), THERM = TECH.thermometer(E);
  const heroPose = (extra = {}) => hero.pose({ head: [3, -3, 0], spine: [2, 0, 0], shR: [38, 0, 8], elR: 100, shL: [4, 0, 6], look: [0, 0], ...extra });
  const street = (lt, t, focusPt, camPos, tgt) => { ST.update(t); cam.position.copy(camPos); cam.lookAt(tgt); E.render(ST.scene, cam, { ...SLOOK, focus: cam.position.distanceTo(tgt) }); };
  const labCam = (z = 13, y = -0.95) => { cam.position.set(0, y, z); cam.lookAt(0, y, 0); };
  const gauge = (frac, col, lbl) => { // voltage bar
    const x0 = 150, w = 780, y = 1150, hh = 44; ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.roundRect(x0, y, w, hh, 22); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(x0, y, Math.max(30, w * frac), hh, 22); ctx.fill(); ctx.restore(); pill(lbl, 540, y - 50, 1, '#FFFFFF', DARK, 44); };
  const integ = (f, lt) => { let s = 0; const n = 40; for (let i = 0; i < n; i++) s += f(lt * (i + 0.5) / n) * lt / n; return s; };

  // 1 · HOOK: freezing hero, phone about to die
  { const st = cut(0);
    add({ id: 'S01', at: st, note: 'cold street, shivering hero, phone battery red', draw(lt, d, t, blit) {
      heroPose({ head: [5, -3, 0] }); const sh = Math.sin(lt * 50) * 0.006; hero.group.position.x = sh;
      phoneH.draw((g, w, h) => TECH.drawBatt(g, w, h, { pct: lerp(0.2, 0.07, lt / d) }));
      const k = eio(lt / d); street(lt, t, 0, lerpV(V3(0.55, 1.55, 2.5), V3(0.35, 1.5, 2.1), k), V3(0.1, 1.48, 0.1)); blit(); hero.group.position.x = 0;
    } });
    cue(st + 0.25, 'pop', { gain: 0.6 }); cue(st + 1.2, 'tock', { gain: 0.4 }); }

  // 2 · lithium ions shuttle through a liquid
  { const st = cut(1), li = Wd('lithium', 1) - st, lq = Wd('liquid', 1) - st;
    add({ id: 'S02', at: st, note: 'cell cutaway: lithium ions shuttle between electrodes', draw(lt, d, t, blit) {
      CELL.set({ phase: lt * 0.55, cold: 0, jam: 0, t }); labCam(lerp(14, 12, eio(lt / d))); E.render(CELL.scene, cam, { ...LAB, focus: 13 }); blit();
      pill('lithium ions', 540, 230, eob(seg(lt, li - 0.1, li + 0.2)), '#FF9F5A', DARK, 58);
      pill('anode', 250, 1130, eob(seg(lt, 0.4, 0.65)), '#B8C1D6', DARK, 40); pill('cathode', 830, 1130, eob(seg(lt, 0.4, 0.65)), '#F2B26A', DARK, 40);
      pill('liquid', 540, 1130, eob(seg(lt, lq - 0.1, lq + 0.2)), '#7FB0FF', DARK, 40);
    } });
    cue(st, 'whoosh'); cue(st + li, 'pop', { gain: 0.6 }); cue(st + lq, 'pop', { gain: 0.4 }); }

  // 3 · cold: the reaction slows
  { const st = cut(2), co = Wd('cold', 2) - st, sl = Wd('slows', 2) - st;
    add({ id: 'S03', at: st, note: 'ions turn cyan and slow down', draw(lt, d, t, blit) {
      const cold = eio(seg(lt, co, co + 0.9)), sp = (x) => lerp(0.55, 0.16, eio(seg(x, co, co + 1.2)));
      CELL.set({ phase: integ(sp, lt), cold, jam: 0, t }); labCam(12.5); E.render(CELL.scene, cam, { ...LAB, focus: 12.5 }); blit();
      pill('cold ❄', 540, 230, eob(seg(lt, co - 0.1, co + 0.2)), '#6FD7FF', DARK, 62); pill('slower reaction', 540, 1130, eob(seg(lt, sl - 0.1, sl + 0.2)), '#FFFFFF', DARK, 46);
    } });
    cue(st, 'whoosh'); cue(st + co, 'sparkle', { dur: 0.7, gain: 0.5 }); cue(st + sl, 'tock', { gain: 0.5 }); }

  // 4 · resistance up, voltage sags
  { const st = cut(3), ir = Wd('internal', 3) - st, vo = Wd('voltage', 3) - st;
    add({ id: 'S04', at: st, note: 'traffic jam at the separator, voltage bar sags', draw(lt, d, t, blit) {
      const jam = eio(seg(lt, ir, ir + 1.0)); CELL.set({ phase: 0.4 + lt * 0.14, cold: 1, jam, t }); labCam(12.5); E.render(CELL.scene, cam, { ...LAB, focus: 12.5 }); blit();
      pill('internal resistance ↑', 540, 230, eob(seg(lt, ir - 0.1, ir + 0.2)), '#FFD43B', DARK, 54);
      const sag = eio(seg(lt, vo - 0.1, vo + 1.4)); gauge(lerp(0.92, 0.3, sag), sag > 0.6 ? '#D62839' : '#34C759', 'voltage');
    } });
    cue(st, 'whoosh'); cue(st + ir, 'pop', { gain: 0.6 }); cue(st + vo, 'alarm', { dur: 1.2, gain: 0.4 }); }

  // 5 · phone sees low voltage, shuts down, energy still inside
  { const st = cut(4), sd = Wd('shuts', 4) - st, en = Wd('energy', 4) - st;
    add({ id: 'S05', at: st, note: 'phone macro: battery dies, but energy is still inside', draw(lt, d, t, blit) {
      phoneBig.group.visible = true; const dead = lt > sd + 0.15;
      phoneBig.draw((g, w, h) => TECH.drawBatt(g, w, h, { pct: lerp(0.3, 0.09, eio(seg(lt, 0, sd))), dead }));
      street(lt, t, 0, lerpV(V3(3.2, 1.45, 2.9), V3(3.05, 1.4, 2.4), eio(lt / d)), V3(3.0, 1.35, 0.4)); blit(); phoneBig.group.visible = false;
      pill('shuts down', 540, 300, eob(seg(lt, sd - 0.1, sd + 0.2)), '#FF8A8A', DARK, 62); pill('energy still inside', 540, 430, eob(seg(lt, en - 0.1, en + 0.2)), '#FFD43B', DARK, 50);
    } });
    cue(st, 'whoosh'); cue(st + sd, 'slam', { gain: 0.5 }); cue(st + en, 'pop', { gain: 0.6 }); }

  // 6 · warm it back up, battery life returns
  { const st = cut(5), wm = Wd('warm', 5) - st, nm = Wd('normal', 5) - st;
    add({ id: 'S06', at: st, note: 'phone macro: warm, battery recovers', draw(lt, d, t, blit) {
      phoneBig.group.visible = true; const k = eio(seg(lt, wm, nm + 0.4));
      phoneBig.draw((g, w, h) => TECH.drawBatt(g, w, h, { pct: lerp(0.08, 0.78, k), dead: lt < wm + 0.2, warm: true }));
      street(lt, t, 0, lerpV(V3(3.2, 1.45, 2.9), V3(3.05, 1.4, 2.4), eio(lt / d)), V3(3.0, 1.35, 0.4)); blit(); phoneBig.group.visible = false;
      pill('warm it up ☀', 540, 300, eob(seg(lt, wm - 0.1, wm + 0.2)), '#FF9F5A', DARK, 62); pill('back to normal ✓', 540, 430, eob(seg(lt, nm - 0.1, nm + 0.2)), '#7CF29A', DARK, 50);
    } });
    cue(st, 'whoosh'); cue(st + wm, 'sparkle', { dur: 0.9, gain: 0.5 }); cue(st + nm, 'pop', { gain: 0.6 }); }

  // 7 · Apple: 0 to 35 C
  { const st = cut(6), ze = Wd('zero', 6) - st, th = Wd('thirty-five', 6) - st;
    add({ id: 'S07', at: st, note: '3D thermometer, green zone 0-35 C', draw(lt, d, t, blit) {
      THERM.set(lerp(12, 27, eio(lt / d))); labCam(13, 0.3 - 0.95); cam.position.set(0, -0.65, 13); cam.lookAt(0, -0.65, 0); E.render(THERM.scene, cam, { ...LAB, focus: 13 }); blit();
      const [x0, y0] = screen(V3(0.9, THERM.Y(0), 0), cam), [x1, y1] = screen(V3(0.9, THERM.Y(35), 0), cam);
      pill('0 °C', x0 + 170, y0, eob(seg(lt, ze - 0.1, ze + 0.2)), '#6FD7FF', DARK, 52); pill('35 °C', x1 + 170, y1, eob(seg(lt, th - 0.1, th + 0.2)), '#FF9F5A', DARK, 52);
      pill('works best', 800, (y0 + y1) / 2, eob(seg(lt, th + 0.2, th + 0.5)), '#7CF29A', DARK, 44);
    } });
    cue(st, 'whoosh'); cue(st + ze, 'pop', { gain: 0.6 }); cue(st + th, 'pop', { gain: 0.6 }); }

  // 8 · below that, may not charge
  { const st = cut(7), bl = Wd('below', 7) - st, ch = Wd('charge', 7) - st;
    add({ id: 'S08', at: st, note: 'phone macro: charging on hold', draw(lt, d, t, blit) {
      phoneBig.group.visible = true; phoneBig.draw((g, w, h) => TECH.drawBatt(g, w, h, { hold: lt > bl, pct: 0.3 }));
      street(lt, t, 0, lerpV(V3(3.2, 1.45, 2.9), V3(3.05, 1.4, 2.4), eio(lt / d)), V3(3.0, 1.35, 0.4)); blit(); phoneBig.group.visible = false;
      pill('below 0 °C ❄', 540, 300, eob(seg(lt, bl - 0.1, bl + 0.2)), '#6FD7FF', DARK, 60); pill('may not charge', 540, 430, eob(seg(lt, ch - 0.1, ch + 0.2)), '#FF8A8A', DARK, 50);
    } });
    cue(st, 'whoosh'); cue(st + bl, 'pop', { gain: 0.6 }); cue(st + ch, 'slam', { gain: 0.4 }); }

  // 9 · not broken, just sluggish like a cold engine
  { const st = cut(8), nb = Wd("isn't", 8) - st, sg = Wd('sluggish', 8) - st;
    add({ id: 'S09', at: st, note: 'cold cell warms up, ions speed up', draw(lt, d, t, blit) {
      const k = eio(seg(lt, sg, d - 0.2)), sp = (x) => lerp(0.14, 0.55, eio(seg(x, sg, d - 0.2)));
      CELL.set({ phase: 0.4 + integ(sp, lt), cold: 1 - k, jam: 0.7 * (1 - k), t }); labCam(12.5); E.render(CELL.scene, cam, { ...LAB, focus: 12.5 }); blit();
      pill('not broken ✓', 540, 230, eob(seg(lt, nb - 0.1, nb + 0.2)), '#7CF29A', DARK, 58); pill('just sluggish', 540, 1130, eob(seg(lt, sg - 0.1, sg + 0.2)), '#6FD7FF', DARK, 52);
    } });
    cue(st, 'whoosh'); cue(st + nb, 'pop', { gain: 0.6 }); cue(st + sg, 'tock', { gain: 0.5 }); }

  // 10 · loop: the freezing hero again
  { const st = cut(9), wy = Wd('why', 9) - st;
    add({ id: 'S10', at: st, note: 'hero, cold street, why?', draw(lt, d, t, blit) {
      heroPose({ head: [2, 0, 0] }); hero.group.position.x = Math.sin(lt * 50) * 0.006; phoneH.draw((g, w, h) => TECH.drawBatt(g, w, h, { pct: 0.06 }));
      const k = eio(lt / d), a = lerp(0.5, 0.15, k); street(lt, t, 0, V3(Math.sin(a) * 3.8, 1.5, Math.cos(a) * 3.8), V3(0, 1.1, 0)); blit(); hero.group.position.x = 0;
      pill('why? 🥶', 540, 250, eob(seg(lt, wy - 0.1, wy + 0.2)), '#FFD43B', DARK, 64);
    } });
    cue(st, 'whoosh'); cue(st + 0.2, 'pop', { gain: 0.6 }); cue(st + wy, 'boing', { gain: 0.4 }); }

  return { shots: S, cues: CUES };
}
