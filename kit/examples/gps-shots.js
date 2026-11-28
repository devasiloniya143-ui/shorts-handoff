// HOW DOES YOUR PHONE KNOW WHERE YOU ARE? : Deep Dive 3D, tech edition (GPS). One line = one shot.
import * as THREE from 'three';
import { ctx, W, H, clamp, lerp, seg, eo, eio, eob } from './core/lib.js';
import { L, Wd, T } from './core/timing.js';
import { camera } from './core/engine.js';
import { Human } from './core/human.js';
import * as TECH from './core/tech.js';
import { label, pill, warning } from './core/look2d.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const lerpV = (a, b, k) => a.clone().lerp(b, k);
function screen(p, cam) { const v = p.clone().project(cam); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; }

export function buildShots(E) {
  const S = [], CUES = [], add = (o) => (S.push(o), o), cue = (t, type, o = {}) => CUES.push({ t: +t.toFixed(3), type, ...o });
  const cut = (i) => (i === 0 ? 0 : L(i) - 0.08);
  const cam = camera(30);
  const SLOOK = { aperture: 0.003, maxblur: 0.01, bloom: 0.2 }, OLOOK = { aperture: 0, bloom: 0.4, bloomThreshold: 0.92, exposure: 0.85, vignette: 0.45 };
  const { PIN, SATS } = TECH;

  // ── the worlds ─────────────────────────────────────────────────────────
  const ST = TECH.street(E), hero = new Human({}); ST.scene.add(hero.group);
  const phoneH = TECH.makePhone(); hero.arm.R.el.add(phoneH.group); phoneH.group.position.set(0.0, -0.37, 0.07); phoneH.group.rotation.set(-0.35, Math.PI, 0); phoneH.group.scale.setScalar(1.5);
  const phoneBig = TECH.makePhone(); phoneBig.group.scale.setScalar(5); phoneBig.group.position.set(3.0, 1.35, 0.4); ST.scene.add(phoneBig.group); phoneBig.group.visible = false;
  const O = TECH.orbit(E);
  const clockA = TECH.makeClock(O.scene, 1.5), clockB = TECH.makeClock(O.scene, 1.5);
  const heroPose = (lt, extra = {}) => hero.pose({ head: [10, -4, 0], spine: [2, 0, 0], shR: [38, 0, 8], elR: 100, shL: [4, 0, 6], look: [0, -8], ...extra });
  const mapDot = (t) => phoneH.draw((g, w, h) => TECH.drawMap(g, w, h, { dot: [0.52, 0.44], ring: 46 + Math.sin(t * 4) * 9 }));
  const orbitReset = () => { O.sats.forEach((q, i) => { q.visible = true; q.position.copy(SATS[i]); q.scale.setScalar(1.7); q.lookAt(PIN); }); O.rings.forEach((r) => (r.visible = false)); O.shells.forEach((s) => (s.m.visible = false)); O.beams.forEach((b) => { b.m.visible = false; b.pulses.forEach((p) => (p.visible = false)); }); O.phone.group.visible = false; clockA.mesh.visible = false; clockB.mesh.visible = false; };
  const beams = (op, lt, speed = 0.8) => O.beams.forEach((b, i) => { b.m.visible = op > 0; b.m.material.opacity = 0.5 * op; b.pulses.forEach((p, k) => { const u = (lt * speed + k / 3 + i * 0.11) % 1; p.visible = op > 0.2; p.position.lerpVectors(b.a, b.b, u); p.scale.setScalar(0.8 + 0.4 * Math.sin(u * 20)); }); });
  const view = (f, rx, uy) => { cam.updateMatrixWorld(true); const fw = new THREE.Vector3(); cam.getWorldDirection(fw); const r = new THREE.Vector3().crossVectors(fw, V3(0, 1, 0)).normalize(), u = new THREE.Vector3().crossVectors(r, fw); return cam.position.clone().addScaledVector(fw, f).addScaledVector(r, rx).addScaledVector(u, uy); };
  const orbRender = (focus = 30) => { if (O.phone.group.visible) O.phone.group.rotation.y = Math.atan2(cam.position.x - O.phone.group.position.x, cam.position.z - O.phone.group.position.z); return E.render(O.scene, cam, { ...OLOOK, focus }); };
  const drawPin = (x, y, s = 1, col = '#FF4D5E') => { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 18; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-70, -80, -55, -170, 0, -170); ctx.bezierCurveTo(55, -170, 70, -80, 0, 0); ctx.fill(); ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -105, 24, 0, 7); ctx.fill(); ctx.restore(); };

  // 1 · HOOK: hero shows the map on his phone
  { const st = cut(0);
    add({ id: 'S01', at: st, note: 'hero holds up the phone, blue dot pulsing', draw(lt, d, t, blit) {
      heroPose(lt, { look: [0, 0], head: [3, -3, 0] }); mapDot(t); phoneBig.group.visible = false;
      const k = eio(lt / d); cam.position.copy(lerpV(V3(0.55, 1.55, 2.5), V3(0.35, 1.5, 2.1), k)); const tgt = V3(0.1, 1.48, 0.1); cam.lookAt(tgt);
      E.render(ST.scene, cam, { ...SLOOK, focus: cam.position.distanceTo(tgt) }); blit();
    } });
    cue(st + 0.25, 'pop', { gain: 0.6 }); }

  // 2 · satellites broadcast the time
  { const st = cut(1), tw = Wd('twenty', 1) - st, br = Wd('broadcast', 1) - st;
    add({ id: 'S02', at: st, note: 'orbit wide, satellites emit time rings, 20,000 km', draw(lt, d, t, blit) {
      orbitReset(); O.sats.forEach((q) => q.scale.setScalar(1.7)); O.earth.rotation.y = 0.9 + t * 0.02;
      O.rings.forEach((r, i) => { const u = ((lt - br) * 0.55 + i * 0.25) % 1; r.visible = lt > br && u >= 0; r.scale.setScalar(0.8 + Math.max(0, u) * 6); r.material.opacity = 0.28 * (1 - Math.max(0, u)); });
      const k = eio(lt / d); cam.position.set(lerp(-1.5, 1.5, k), 12, lerp(60, 52, k)); cam.lookAt(0, 15.5, 0); orbRender(55); blit();
      const [sx, sy] = screen(SATS[2], cam); label('20,200 km up', 330, 560, sx, sy, eob(seg(lt, tw - 0.1, tw + 0.2)));
    } });
    cue(st, 'whoosh'); cue(st + tw, 'pop', { gain: 0.6 }); cue(st + br, 'sparkle', { dur: 0.8, gain: 0.5 }); }

  // 3 · your phone listens to four
  { const st = cut(2), fr = Wd('four', 2) - st;
    add({ id: 'S03', at: st, note: 'phone on ground, four beams arrive, AT LEAST 4', draw(lt, d, t, blit) {
      orbitReset(); O.phone.group.visible = true; beams(eo(seg(lt, 0.15, 0.7)), lt, 0.6);
      O.phone.draw((g, w, h) => TECH.drawMap(g, w, h, { dot: [0.52, 0.44], ring: 46 + Math.sin(t * 4) * 9 }));
      const k = eio(lt / d); cam.position.copy(PIN).add(V3(lerp(4.5, 3.2, k), 1.2, lerp(12, 10.5, k))); cam.lookAt(PIN.clone().add(V3(0, 1.5, 0))); orbRender(11); blit();
      pill('at least 4', 540, 300, eob(seg(lt, fr - 0.1, fr + 0.2)), '#FFD43B');
    } });
    cue(st, 'whoosh'); cue(st + 0.2, 'zip', { gain: 0.5 }); cue(st + fr, 'pop', { gain: 0.6 }); }

  // 4 · delay turns into distance
  { const st = cut(3), sp = Wd('speed', 3) - st, tu = Wd('turns', 3) - st;
    add({ id: 'S04', at: st, note: 'pulses race down the beams: speed of light, delay = distance', draw(lt, d, t, blit) {
      orbitReset(); O.phone.group.visible = true; beams(1, lt, 1.3); O.phone.draw((g, w, h) => TECH.drawMap(g, w, h, { dot: [0.52, 0.44], ring: 46 }));
      const a = lerp(0.3, 1.1, eio(lt / d)); cam.position.copy(PIN).add(V3(Math.sin(a) * 11, 1.2, Math.cos(a) * 11)); cam.lookAt(PIN.clone().add(V3(0, 1.5, 0))); orbRender(11); blit();
      pill('speed of light', 540, 290, eob(seg(lt, sp - 0.1, sp + 0.2)), '#4FD1E8'); pill('delay = distance', 540, 420, eob(seg(lt, tu - 0.1, tu + 0.2)), '#FFD43B');
    } });
    cue(st, 'whoosh'); cue(st + sp, 'zip', { gain: 0.6 }); cue(st + tu, 'pop', { gain: 0.6 }); }

  // 5 · where the distances meet is you
  { const st = cut(4), yo = Wd('you', 4) - st;
    add({ id: 'S05', at: st, note: 'four distance circles on the globe cross at the pin', draw(lt, d, t, blit) {
      orbitReset(); O.shells.forEach((s, i) => { s.m.visible = lt > i * 0.3; s.m.material.opacity = eo(seg(lt, i * 0.3, i * 0.3 + 0.4)); });
      O.pin.scale.setScalar(0.8 + 0.12 * Math.sin(t * 6) + 0.5 * eo(seg(lt, yo - 0.1, yo + 0.3)));
      const k = eio(lt / d); cam.position.copy(PIN).add(V3(lerp(2, -2, k), lerp(14, 11, k), lerp(8, 6.5, k))); cam.lookAt(PIN.clone().add(V3(0, 0, 0.5))); E.render(O.scene, cam, { ...OLOOK, bloom: 0.4, bloomThreshold: 0.95, exposure: 0.8, focus: 15 }); blit();
      const [px, py] = screen(PIN, cam); label('you', 800, 500, px, py, eob(seg(lt, yo - 0.1, yo + 0.2)));
    } });
    cue(st, 'whoosh'); cue(st + 0.3, 'sparkle', { dur: 1.0, gain: 0.5 }); cue(st + yo, 'pop', { gain: 0.7 }); }

  // 6 · it never sends anything back
  { const st = cut(5), nv = Wd('never', 5) - st;
    add({ id: 'S06', at: st, note: 'one-way beams only, red cross on an upward arrow', draw(lt, d, t, blit) {
      orbitReset(); O.phone.group.visible = true; beams(1, lt, 0.7); O.phone.draw((g, w, h) => TECH.drawMap(g, w, h, { dot: [0.52, 0.44], ring: 46 }));
      const a = lerp(-0.6, -1.0, eio(lt / d)); cam.position.copy(PIN).add(V3(Math.sin(a) * 11, 1.2, Math.cos(a) * 11)); cam.lookAt(PIN.clone().add(V3(0, 1.5, 0))); orbRender(11); blit();
      if (lt > nv - 0.1) { const s = eob(seg(lt, nv - 0.1, nv + 0.2)); ctx.save(); ctx.translate(850, 600); ctx.scale(s, s); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 24;
        ctx.beginPath(); ctx.moveTo(0, 110); ctx.lineTo(0, -80); ctx.moveTo(-55, -30); ctx.lineTo(0, -90); ctx.lineTo(55, -30); ctx.stroke();
        ctx.strokeStyle = '#FF4D5E'; ctx.lineWidth = 30; ctx.beginPath(); ctx.moveTo(-70, -70); ctx.lineTo(70, 90); ctx.moveTo(70, -70); ctx.lineTo(-70, 90); ctx.stroke(); ctx.restore(); }
      pill('one-way only', 540, 300, eob(seg(lt, nv - 0.1, nv + 0.2)), '#FF8A8A');
    } });
    cue(st, 'whoosh'); cue(st + nv, 'slam', { gain: 0.6 }); }

  // 7 · clocks up there tick faster
  { const st = cut(6), th = Wd('thirty-eight', 6) - st;
    add({ id: 'S07', at: st, note: 'two clocks: the satellite one spins faster than the ground one', draw(lt, d, t, blit) {
      orbitReset(); O.sats.forEach((q) => (q.visible = false)); const c = SATS[0]; cam.position.copy(c).add(V3(0, 0, 14)); cam.lookAt(c); const f = 14, U = H / (2 * f * Math.tan(Math.PI / 12));
      clockA.mesh.visible = clockB.mesh.visible = true; clockA.mesh.position.copy(view(f, 0, (960 - 520) / U)); clockB.mesh.position.copy(view(f, 0, (960 - 1010) / U));
      clockA.mesh.lookAt(cam.position); clockB.mesh.lookAt(cam.position); clockA.mesh.scale.setScalar(0.6); clockB.mesh.scale.setScalar(0.6);
      clockA.paint(lt * 3.4, lt * 0.28, '#FFD43B'); clockB.paint(lt * 2.5, lt * 0.21, '#FFFFFF'); orbRender(f); blit();
      pill('satellite', 905, 520, eob(seg(lt, 0.2, 0.45)), '#FFD43B', 'rgba(12,14,20,0.85)', 46); pill('ground', 905, 1010, eob(seg(lt, 0.2, 0.45)), '#FFFFFF', 'rgba(12,14,20,0.85)', 46);
      pill('+38 µs / day', 540, 230, eob(seg(lt, th - 0.1, th + 0.2)), '#FFD43B', 'rgba(12,14,20,0.85)', 62);
    } });
    cue(st, 'whoosh'); cue(st + 0.3, 'tock', { gain: 0.6 }); cue(st + th, 'pop', { gain: 0.7 }); }

  // 8 · uncorrected: your dot drifts away
  { const st = cut(7), un = Wd('uncorrected', 7) - st, tn = Wd('ten', 7) - st;
    add({ id: 'S08', at: st, note: 'phone macro: blue dot drifts off, 10 km / day', draw(lt, d, t, blit) {
      phoneBig.group.visible = true; const k = eio(seg(lt, un, d - 0.2));
      const dot = [lerp(0.52, 0.8, k), lerp(0.44, 0.9, k)], trail = [[0.52, 0.44], dot];
      phoneBig.draw((g, w, h) => TECH.drawMap(g, w, h, { dot, ghost: [0.52, 0.44], trail: k > 0.02 ? trail : null, bad: k > 0.15, ring: 46 + 30 * k }));
      cam.position.copy(lerpV(V3(3.2, 1.45, 2.9), V3(3.05, 1.4, 2.3), eio(lt / d))); const tgt = V3(3.0, 1.35, 0.4); cam.lookAt(tgt);
      E.render(ST.scene, cam, { ...SLOOK, aperture: 0.004, focus: cam.position.distanceTo(tgt) }); blit(); phoneBig.group.visible = false;
      pill('10 km / day', 540, 300, eob(seg(lt, tn - 0.1, tn + 0.2)), '#FF8A8A', 'rgba(12,14,20,0.85)', 72);
    } });
    cue(st, 'whoosh'); cue(st + tn, 'alarm', { dur: 1.2, gain: 0.5 }); }

  // 9 · tuned slow before launch, relativity fixes it
  { const st = cut(8), tu = Wd('tuned', 8) - st, rl = Wd('relativity', 8) - st;
    add({ id: 'S09', at: st, note: 'clocks sync: satellite clock slowed, both agree', draw(lt, d, t, blit) {
      orbitReset(); O.sats.forEach((q) => (q.visible = false)); const c = SATS[2]; cam.position.copy(c).add(V3(0, 0, 14)); cam.lookAt(c); const f = 14, U = H / (2 * f * Math.tan(Math.PI / 12));
      clockA.mesh.visible = clockB.mesh.visible = true; clockA.mesh.position.copy(view(f, 0, (960 - 520) / U)); clockB.mesh.position.copy(view(f, 0, (960 - 1010) / U));
      clockA.mesh.lookAt(cam.position); clockB.mesh.lookAt(cam.position); clockA.mesh.scale.setScalar(0.6); clockB.mesh.scale.setScalar(0.6);
      const sync = eio(seg(lt, tu, rl + 0.8)), ra = lerp(3.4, 2.5, sync);
      clockA.paint(lt * ra, lt * ra * 0.084, sync > 0.99 ? '#7CF29A' : '#FFD43B'); clockB.paint(lt * 2.5, lt * 0.21, '#FFFFFF'); orbRender(f); blit();
      pill('satellite', 905, 520, 1, '#FFD43B', 'rgba(12,14,20,0.85)', 46); pill('ground', 905, 1010, 1, '#FFFFFF', 'rgba(12,14,20,0.85)', 46);
      if (lt < rl + 0.5) pill('tuned slow', 540, 230, eob(seg(lt, tu - 0.1, tu + 0.2)), '#FFD43B', 'rgba(12,14,20,0.85)', 62);
      else pill('in sync ✓', 540, 230, eob(seg(lt, rl + 0.5, rl + 0.8)), '#7CF29A', 'rgba(12,14,20,0.85)', 62);
    } });
    cue(st, 'whoosh'); cue(st + tu, 'pop', { gain: 0.6 }); cue(st + rl + 0.5, 'sparkle', { dur: 0.9, gain: 0.6 }); }

  // 10 · loop: hero, pin pops above the street
  { const st = cut(9), ex = Wd('exactly', 9) - st;
    add({ id: 'S10', at: st, note: 'hero in the street, pin drops: you are here', draw(lt, d, t, blit) {
      heroPose(lt, { look: [0, 0], head: [2, 0, 0] }); mapDot(t);
      const k = eio(lt / d), a = lerp(0.5, 0.15, k); cam.position.set(Math.sin(a) * 3.8, 1.5, Math.cos(a) * 3.8); const tgt = V3(0, 1.1, 0); cam.lookAt(tgt);
      E.render(ST.scene, cam, { ...SLOOK, focus: cam.position.distanceTo(tgt) }); blit();
      const [hx, hy] = screen(V3(0, 1.85, 0), cam), s = eob(seg(lt, 0.2, 0.55)); drawPin(hx + 300, hy + 260 + (1 - s) * -80, s);
      pill('you are here', 540, 250, eob(seg(lt, ex - 0.1, ex + 0.2)), '#FFD43B');
    } });
    cue(st, 'whoosh'); cue(st + 0.2, 'pop', { gain: 0.7 }); cue(st + ex, 'boing', { gain: 0.4 }); }

  return { shots: S, cues: CUES };
}
