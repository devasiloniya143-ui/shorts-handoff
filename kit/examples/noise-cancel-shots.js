// HOW DO NOISE-CANCELLING HEADPHONES MAKE SOUND DISAPPEAR? : Deep Dive 3D, tech edition.
import * as THREE from 'three';
import { ctx, W, H, clamp, lerp, seg, eo, eio, eob } from './core/lib.js';
import { L, Wd, T } from './core/timing.js';
import { camera } from './core/engine.js';
import * as TECH from './core/tech.js';
import { label, pill } from './core/look2d.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const lerpV = (a, b, k) => a.clone().lerp(b, k);
function screen(p, cam) { const v = p.clone().project(cam); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; }

export function buildShots(E) {
  const S = [], CUES = [], add = (o) => (S.push(o), o), cue = (t, type, o = {}) => CUES.push({ t: +t.toFixed(3), type, ...o });
  const cut = (i) => (i === 0 ? 0 : L(i) - 0.08);
  const cam = camera(30);
  const LAB = { aperture: 0, bloom: 0.55, bloomThreshold: 0.8, exposure: 0.95, vignette: 0.4 };
  const DARK = 'rgba(12,14,20,0.85)';
  const PH = TECH.phonesStage(E), WV = TECH.waveLab(E);
  const stage = (a, b, k, tgt = V3(0, -0.2, 0)) => { cam.position.copy(lerpV(a, b, k)); cam.lookAt(tgt); E.render(PH.scene, cam, { ...LAB, focus: cam.position.distanceTo(tgt) }); };
  const waves = (a, b, k, lk = {}) => { cam.position.copy(lerpV(a, b, k)); cam.lookAt(0, 0, 0); E.render(WV.scene, cam, { ...LAB, ...lk, focus: cam.position.length() }); };
  const colTop = (x) => screen(V3(x, 4.2, 0), cam);

  // 1 · hook
  { const st = cut(0), sd = Wd('sound', 0) - st;
    add({ id: 'S01', at: st, note: 'headphones on stage, sound rings fade as they arrive', draw(lt, d, t, blit) {
      PH.set({ t, rings: 1, cancel: eio(seg(lt, 0.6, 2.2)), spin: lerp(-0.5, 0.35, eio(lt / d)) }); stage(V3(0.4, 0.7, 11.5), V3(-0.3, 0.5, 9.5), eio(lt / d)); blit();
      pill('silence?', 540, 250, eob(seg(lt, sd - 0.1, sd + 0.2)), '#FFD43B', DARK, 62);
    } });
    cue(st + 0.2, 'pop', { gain: 0.6 }); cue(st + sd, 'sparkle', { dur: 0.8, gain: 0.5 }); }

  // 2 · microphones listen
  { const st = cut(1), mi = Wd('microphones', 1) - st, li = Wd('listen', 1) - st;
    add({ id: 'S02', at: st, note: 'close on the cup, mic glows, noise rings arrive', draw(lt, d, t, blit) {
      PH.set({ t, rings: 1, cancel: 0, mic: eio(seg(lt, mi - 0.1, mi + 0.4)), spin: 1.25 }); stage(V3(0.8, 0.8, 6.2), V3(0.4, 0.5, 4.6), eio(lt / d), V3(0, 0, 0.9)); blit();
      pill('microphones', 540, 230, eob(seg(lt, mi - 0.1, mi + 0.2)), '#7CF29A', DARK, 58); pill('listening 👂', 540, 1130, eob(seg(lt, li - 0.1, li + 0.2)), '#FFB020', DARK, 50);
    } });
    cue(st, 'whoosh'); cue(st + mi, 'pop', { gain: 0.6 }); cue(st + li, 'tock', { gain: 0.4 }); }

  // 3 · chip flips the wave
  { const st = cut(2), fl = Wd('flips', 2) - st, up = Wd('upside', 2) - st;
    add({ id: 'S03', at: st, note: 'wave flips: anti-wave goes from copy to mirror', draw(lt, d, t, blit) {
      const k = eio(seg(lt, fl, up + 0.7)), flip = lerp(-1, 1, k);
      WV.set({ t, noise: 1, anti: eo(seg(lt, 0.2, 0.6)), flip, mode: 'steady', sum: 0 }); waves(V3(0, 0, 19.5), V3(0, 0, 17.5), eio(lt / d)); blit();
      const [nx, ny] = colTop(-1.55), [ax, ay] = colTop(0);
      pill('noise', nx, ny + 90, eob(seg(lt, 0.2, 0.5)), '#FFB020', DARK, 54); pill('flipped', ax, ay + 90, eob(seg(lt, fl, fl + 0.3)), '#4FD1E8', DARK, 54);
      pill('upside down ⇅', 540, 1130, eob(seg(lt, up - 0.1, up + 0.2)), '#FFFFFF', DARK, 52);
    } });
    cue(st, 'whoosh'); cue(st + fl, 'pop', { gain: 0.6 }); cue(st + up, 'boing', { gain: 0.4 }); }

  // 4 · speaker plays anti-noise
  { const st = cut(3), mi = Wd('mirror', 3) - st, an = Wd('anti-noise', 3) - st;
    add({ id: 'S04', at: st, note: 'noise + mirror image side by side', draw(lt, d, t, blit) {
      WV.set({ t, noise: 1, anti: 1, flip: 1, mode: 'steady', sum: 0 }); waves(V3(2.2, 0.8, 18.5), V3(-2.2, 0.4, 18), eio(lt / d)); blit();
      const [nx, ny] = colTop(-1.55), [ax, ay] = colTop(0);
      pill('noise', nx, ny + 90, 1, '#FFB020', DARK, 54); pill('mirror image', ax, ay + 90, eob(seg(lt, mi - 0.1, mi + 0.2)), '#4FD1E8', DARK, 54);
      pill('anti-noise', 540, 1130, eob(seg(lt, an - 0.1, an + 0.2)), '#4FD1E8', DARK, 56);
    } });
    cue(st, 'whoosh'); cue(st + mi, 'pop', { gain: 0.5 }); cue(st + an, 'sparkle', { dur: 0.7, gain: 0.5 }); }

  // 5 · peaks meet dips, cancel
  { const st = cut(4), me = Wd('meet', 4) - st, pk = Wd('peaks', 4) - st, cn = Wd('cancel', 4) - st;
    add({ id: 'S05', at: st, note: 'sum wave goes flat', draw(lt, d, t, blit) {
      WV.set({ t, noise: 1, anti: 1, flip: 1, mode: 'steady', sum: eo(seg(lt, me, me + 0.5)) }); waves(V3(0, 0, 20), V3(0, 0, 18), eio(lt / d)); blit();
      const [nx, ny] = colTop(-1.55), [ax, ay] = colTop(0), [sx, sy] = colTop(1.55);
      pill('noise', nx, ny + 90, 1, '#FFB020', DARK, 50); pill('anti', ax, ay + 90, 1, '#4FD1E8', DARK, 50); pill('sum', sx, sy + 90, eob(seg(lt, me, me + 0.3)), '#FFFFFF', DARK, 50);
      pill('peak + dip = 0', 540, 1130, eob(seg(lt, pk, pk + 0.3)), '#FFD43B', DARK, 52); pill('silence ✓', 540, 1250, eob(seg(lt, cn, cn + 0.3)), '#7CF29A', DARK, 52);
    } });
    cue(st, 'whoosh'); cue(st + me, 'pop', { gain: 0.5 }); cue(st + cn, 'sparkle', { dur: 0.9, gain: 0.6 }); }

  // 6 · steady low hums
  { const st = cut(5), sy = Wd('steady', 5) - st, je = Wd('jet', 5) - st;
    add({ id: 'S06', at: st, note: 'steady hum cancels perfectly', draw(lt, d, t, blit) {
      WV.set({ t: t * 0.6, noise: 1, anti: 1, flip: 1, mode: 'steady', sum: 1 }); waves(V3(-1.5, 0.6, 18.5), V3(1.5, -0.2, 18.5), eio(lt / d)); blit();
      pill('steady hum ✓', 540, 230, eob(seg(lt, sy - 0.1, sy + 0.2)), '#7CF29A', DARK, 56); pill('jet engine ✈', 540, 1130, eob(seg(lt, je - 0.1, je + 0.2)), '#FFFFFF', DARK, 52);
    } });
    cue(st, 'whoosh'); cue(st + sy, 'pop', { gain: 0.5 }); cue(st + je, 'tock', { gain: 0.5 }); }

  // 7 · sudden sounds leak through
  { const st = cut(6), su = Wd('sudden', 6) - st, ha = Wd('harder', 6) - st, lk = Wd('leak', 6) - st;
    add({ id: 'S07', at: st, note: 'bursty noise, anti-wave lags, leftover spikes', draw(lt, d, t, blit) {
      WV.set({ t, noise: 1, anti: 1, flip: 1, mode: 'burst', lag: 0.28, sum: 1 }); waves(V3(1.8, 0.6, 18.5), V3(-1.5, -0.2, 18.5), eio(lt / d), { bloom: 0.3, bloomThreshold: 0.92, exposure: 0.85 }); blit();
      pill('sudden sounds ✗', 540, 230, eob(seg(lt, su - 0.1, su + 0.2)), '#FF8A8A', DARK, 54); pill('harder to catch', 540, 1130, eob(seg(lt, ha - 0.1, ha + 0.2)), '#FFFFFF', DARK, 48);
      pill('leaks through', 540, 1250, eob(seg(lt, lk - 0.1, lk + 0.2)), '#FFD43B', DARK, 48);
    } });
    cue(st, 'whoosh'); cue(st + su, 'slam', { gain: 0.4 }); cue(st + lk, 'pop', { gain: 0.5 }); }

  // 8 · fight sound with sound
  { const st = cut(7), bl = Wd('block', 7) - st, fi = Wd('fight', 7) - st;
    add({ id: 'S08', at: st, note: 'headphones cancel incoming rings', draw(lt, d, t, blit) {
      PH.set({ t, rings: 1, cancel: eio(seg(lt, 0.3, 1.5)), spin: lerp(0.5, -0.4, eio(lt / d)) }); stage(V3(-1.2, 0.9, 10), V3(1.0, 0.4, 8.5), eio(lt / d)); blit();
      pill("don't block ✗", 540, 230, eob(seg(lt, bl - 0.1, bl + 0.2)), '#FF8A8A', DARK, 54); pill('sound vs sound', 540, 1130, eob(seg(lt, fi - 0.1, fi + 0.2)), '#4FD1E8', DARK, 54);
    } });
    cue(st, 'whoosh'); cue(st + bl, 'slam', { gain: 0.4 }); cue(st + fi, 'sparkle', { dur: 0.8, gain: 0.5 }); }

  // 9 · loop
  { const st = cut(8), hw = Wd('how', 8) - st;
    add({ id: 'S09', at: st, note: 'quiet headphones, how?', draw(lt, d, t, blit) {
      PH.set({ t, rings: 1, cancel: 1, spin: lerp(-0.5, 0.35, eio(lt / d)) }); stage(V3(0.4, 0.7, 11.5), V3(-0.3, 0.5, 9.5), eio(lt / d)); blit();
      pill('how? 🤔', 540, 250, eob(seg(lt, hw - 0.1, hw + 0.2)), '#FFD43B', DARK, 64);
    } });
    cue(st, 'whoosh'); cue(st + 0.2, 'pop', { gain: 0.6 }); cue(st + hw, 'boing', { gain: 0.4 }); }

  return { shots: S, cues: CUES };
}
