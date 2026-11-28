// HOW DOES YOUR PHONE KNOW EXACTLY WHERE YOU TOUCHED? : Deep Dive 3D, tech edition.
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
  const SLOOK = { aperture: 0.003, maxblur: 0.01, bloom: 0.2 }, LAB = { aperture: 0, bloom: 0.5, bloomThreshold: 0.8, exposure: 0.95, vignette: 0.4 };
  const DARK = 'rgba(12,14,20,0.85)';

  const ST = TECH.street(E), hero = new Human({}); ST.scene.add(hero.group);
  const phoneH = TECH.makePhone(); hero.arm.R.el.add(phoneH.group); phoneH.group.position.set(0, -0.37, 0.07); phoneH.group.rotation.set(-0.35, Math.PI, 0); phoneH.group.scale.setScalar(1.5);
  const G = TECH.touchGrid(E);
  const heroPose = (extra = {}) => hero.pose({ head: [6, -3, 0], spine: [2, 0, 0], shR: [38, 0, 8], elR: 100, shL: [4, 0, 6], look: [0, 0], ...extra });
  const heroShot = (lt, d, t, blit, a0, a1, o = {}) => {
    heroPose(o.pose || {}); phoneH.draw((g, w, h) => TECH.drawApps(g, w, h, { tap: [0.3 + 0.4 * ((lt * 0.9 | 0) % 2), 0.35 + 0.15 * (((lt * 0.9) | 0) % 3)], pulse: (lt * 1.8) % 1 }));
    const k = eio(lt / d), a = lerp(a0, a1, k); cam.position.set(Math.sin(a) * 3.2, 1.5, Math.cos(a) * 3.2); const tgt = V3(0.1, 1.38, 0.1); cam.lookAt(tgt);
    E.render(ST.scene, cam, { ...SLOOK, focus: cam.position.distanceTo(tgt) }); blit();
  };
  const gridCam = (a, b, k) => { const p = lerpV(a, b, k); cam.position.copy(p); cam.lookAt(0, 0, 0); };
  const gridRender = () => E.render(G.scene, cam, { ...LAB, focus: cam.position.length() });
  const path = (u) => [1.1 * Math.sin(u * 5.5), -2.3 + 4.6 * u];

  // 1 · hook: tapping a phone
  { const st = cut(0), wh = Wd('where', 0) - st;
    add({ id: 'S01', at: st, note: 'hero taps phone, ripples', draw(lt, d, t, blit) {
      heroShot(lt, d, t, blit, 0.55, 0.25);
      pill('where?', 540, 250, eob(seg(lt, wh - 0.1, wh + 0.2)), '#FFD43B', DARK, 64);
    } });
    cue(st + 0.2, 'pop', { gain: 0.6 }); cue(st + wh, 'boing', { gain: 0.4 }); }

  // 2 · under the glass: a grid of tiny wires
  { const st = cut(1), gl = Wd('glass', 1) - st, gd = Wd('grid', 1) - st, th = Wd('thinner', 1) - st;
    add({ id: 'S02', at: st, note: 'glass fades, wire grid revealed', draw(lt, d, t, blit) {
      G.set({ show: false, field: 0, glass: lerp(0.95, 0.12, eio(seg(lt, gd - 0.3, gd + 0.5))), t });
      gridCam(V3(3.2, -1.2, 15), V3(1.6, 0.6, 12), eio(lt / d)); gridRender(); blit();
      pill('glass', 540, 200, eob(seg(lt, gl - 0.1, gl + 0.2)), '#BFD8FF', DARK, 58); pill('grid of tiny wires', 540, 1130, eob(seg(lt, gd, gd + 0.3)), '#6FD7FF', DARK, 50);
      pill('thinner than a hair', 540, 1250, eob(seg(lt, th, th + 0.3)), '#FFFFFF', DARK, 42);
    } });
    cue(st, 'whoosh'); cue(st + gl, 'pop', { gain: 0.5 }); cue(st + gd, 'sparkle', { dur: 0.8, gain: 0.5 }); }

  // 3 · each wire holds a weak electric field
  { const st = cut(2), el = Wd('electric', 2) - st;
    add({ id: 'S03', at: st, note: 'wires pulse with a field', draw(lt, d, t, blit) {
      G.set({ show: false, field: 1, glass: 0.12, t }); gridCam(V3(-2.6, 1.2, 13), V3(-1.2, -0.6, 11), eio(lt / d)); gridRender(); blit();
      pill('electric field ⚡', 540, 220, eob(seg(lt, el - 0.1, el + 0.2)), '#6FD7FF', DARK, 58);
    } });
    cue(st, 'whoosh'); cue(st + el, 'sparkle', { dur: 0.9, gain: 0.5 }); }

  // 4 · finger conducts, changes the field
  { const st = cut(3), fi = Wd('finger', 3) - st, cl = Wd('close', 3) - st, ch = Wd('changes', 3) - st;
    add({ id: 'S04', at: st, note: 'finger approaches, wires near it change colour', draw(lt, d, t, blit) {
      const fz = lerp(3.2, 0.25, eio(seg(lt, fi, ch + 0.4)));
      G.set({ fx: 0.7, fy: 0.6, fz, field: 1, glass: 0.12, t }); gridCam(V3(2.8, -1.6, 13), V3(1.6, -0.6, 11.5), eio(lt / d)); gridRender(); blit();
      pill('finger = conductor', 540, 220, eob(seg(lt, fi, fi + 0.3)), '#FFB38A', DARK, 54); pill('field changes', 540, 1250, eob(seg(lt, ch, ch + 0.3)), '#FFD43B', DARK, 54);
    } });
    cue(st, 'whoosh'); cue(st + fi, 'pop', { gain: 0.5 }); cue(st + ch, 'tock', { gain: 0.6 }); }

  // 5 · row + column crossing = touch
  { const st = cut(4), ro = Wd('row', 4) - st, co = Wd('column', 4) - st, cr = Wd('crossing', 4) - st;
    add({ id: 'S05', at: st, note: 'row and column light up, crossing glows', draw(lt, d, t, blit) {
      const lock = eio(seg(lt, ro - 0.2, cr)), r = G.set({ fx: 0.7, fy: 0.6, fz: 0.15, field: 1, lock, glass: 0.12, t }); gridCam(V3(1.2, -0.4, 12.5), V3(0.2, -0.2, 11), eio(lt / d)); gridRender(); blit();
      const [rx, rY] = screen(V3(-G.PW / 2 - 0.1, r.ry, 0), cam), [cX, cY] = screen(V3(r.cx, G.PH / 2 + 0.1, 0), cam);
      pill('chip', 540, 190, eob(seg(lt, 0.3, 0.6)), '#B8C1D6', DARK, 46);
      pill('row ' + (r.row + 1), Math.max(120, rx + 20), rY, eob(seg(lt, ro, ro + 0.25)), '#FFD43B', DARK, 40); pill('column ' + (r.col + 1), cX, Math.max(300, cY + 20), eob(seg(lt, co, co + 0.25)), '#FFD43B', DARK, 40);
      pill('crossing = touch', 540, 1250, eob(seg(lt, cr, cr + 0.3)), '#FFFFFF', DARK, 54);
    } });
    cue(st, 'whoosh'); cue(st + ro, 'pop', { gain: 0.5 }); cue(st + co, 'pop', { gain: 0.5 }); cue(st + cr, 'sparkle', { dur: 0.7, gain: 0.6 }); }

  // 6 · again and again: follows the swipe
  { const st = cut(5), ag = Wd('again', 5) - st, sw = Wd('swipe', 5) - st;
    add({ id: 'S06', at: st, note: 'finger swipes, trail of crossings', draw(lt, d, t, blit) {
      const u = clamp(seg(lt, 0.3, d - 0.3), 0, 1), [fx, fy] = path(u), tr = []; for (let k = 0; k < 40; k++) { const uu = u - k * 0.018; if (uu > 0) tr.push(path(uu)); }
      G.set({ fx, fy, fz: 0.15, field: 1, lock: 1, glass: 0.12, trail: tr, t }); gridCam(V3(-1.8, -0.5, 13), V3(1.8, 0.3, 12), eio(lt / d)); gridRender(); blit();
      pill('again and again ↻', 540, 200, eob(seg(lt, ag - 0.1, ag + 0.25)), '#6FD7FF', DARK, 54); pill('follows your swipe', 540, 1250, eob(seg(lt, sw - 0.2, sw + 0.1)), '#FFD43B', DARK, 50);
    } });
    cue(st, 'whoosh'); cue(st + ag, 'pop', { gain: 0.5 }); cue(st + sw, 'tock', { gain: 0.5 }); }

  // 7 · gloves don't conduct
  { const st = cut(6), gv = Wd('gloves', 6) - st, cn = Wd('cloth', 6) - st;
    add({ id: 'S07', at: st, note: 'glove touches, wires do not react', draw(lt, d, t, blit) {
      const fz = lerp(3.2, 0.2, eio(seg(lt, 0.2, gv + 0.6)));
      G.set({ fx: -0.5, fy: 0.3, fz, tip: 'glove', field: 1, lock: 1, glass: 0.12, t }); gridCam(V3(2.4, -1.2, 13), V3(1.2, -0.2, 11.5), eio(lt / d)); gridRender(); blit();
      pill('gloves', 540, 220, eob(seg(lt, gv - 0.1, gv + 0.2)), '#9DB0FF', DARK, 58); pill('no change ✗', 540, 1250, eob(seg(lt, cn, cn + 0.25)), '#FF8A8A', DARK, 54);
    } });
    cue(st, 'whoosh'); cue(st + gv, 'pop', { gain: 0.5 }); cue(st + cn, 'slam', { gain: 0.4 }); }

  // 8 · conductive thread
  { const st = cut(7), cth = Wd('conductive', 7) - st, wv = Wd('woven', 7) - st;
    add({ id: 'S08', at: st, note: 'glove with gold thread works', draw(lt, d, t, blit) {
      const fz = lerp(2.4, 0.15, eio(seg(lt, 0.1, wv))), lock = eio(seg(lt, cth, wv + 0.4));
      G.set({ fx: -0.5, fy: 0.3, fz, tip: 'thread', field: 1, lock, glass: 0.12, t }); gridCam(V3(2.0, -1.0, 12.5), V3(0.8, -0.2, 10.5), eio(lt / d)); gridRender(); blit();
      pill('conductive thread', 540, 220, eob(seg(lt, cth - 0.1, cth + 0.25)), '#FFD43B', DARK, 54); pill('works again ✓', 540, 1250, eob(seg(lt, wv, wv + 0.25)), '#7CF29A', DARK, 54);
    } });
    cue(st, 'whoosh'); cue(st + cth, 'sparkle', { dur: 0.8, gain: 0.5 }); cue(st + wv, 'pop', { gain: 0.6 }); }

  // 9 · feels electricity, not pressure
  { const st = cut(8), pr = Wd('pressure', 8) - st, ey = Wd('electricity', 8) - st;
    add({ id: 'S09', at: st, note: 'finger hovers, still senses', draw(lt, d, t, blit) {
      const fz = 0.55 + 0.05 * Math.sin(t * 3), lock = eio(seg(lt, 0.2, 0.9));
      G.set({ fx: 0.4, fy: -0.4, fz, field: 1, lock, glass: 0.12, t }); gridCam(V3(-1.8, 0.4, 12.5), V3(-0.4, -0.6, 10.5), eio(lt / d)); gridRender(); blit();
      pill('pressure ✗', 540, 220, eob(seg(lt, pr - 0.1, pr + 0.2)), '#FF8A8A', DARK, 58); pill('electricity ⚡', 540, 1250, eob(seg(lt, ey - 0.1, ey + 0.25)), '#FFD43B', DARK, 58);
    } });
    cue(st, 'whoosh'); cue(st + pr, 'slam', { gain: 0.4 }); cue(st + ey, 'sparkle', { dur: 0.8, gain: 0.6 }); }

  // 10 · loop: hero taps again
  { const st = cut(9), hw = Wd('how', 9) - st;
    add({ id: 'S10', at: st, note: 'hero taps phone, how?', draw(lt, d, t, blit) {
      heroShot(lt, d, t, blit, 0.25, 0.55, { pose: { head: [3, 0, 0] } });
      pill('how? 🤔', 540, 250, eob(seg(lt, hw - 0.1, hw + 0.2)), '#FFD43B', DARK, 64);
    } });
    cue(st, 'whoosh'); cue(st + 0.2, 'pop', { gain: 0.6 }); cue(st + hw, 'boing', { gain: 0.4 }); }

  return { shots: S, cues: CUES };
}
