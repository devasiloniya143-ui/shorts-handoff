// Deep Dive TECH kit: a sunny street, Earth + GPS satellites in space, a phone with a live map screen, signal beams, clocks.
import * as THREE from 'three';
import { rbox, ellipsoid, capsule, smin, sphere, mesh } from './sdf.js';
import { lightRig } from './engine.js';

const std = (color, rough = 0.7, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, ...extra });
const shadowed = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };
function canvasTex(w, h, draw, rep = [1, 1]) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.anisotropy = 8; return t; }
const glow = (hex, k = 3) => new THREE.Color(hex).multiplyScalar(k);

// ═════════════════════════ PHONE ═════════════════════════
/** a smartphone (≈ real size in metres: 0.075 x 0.16). phone.draw((g, w, h) => ...) repaints the screen. */
export function makePhone() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(mesh((p) => rbox(p, [0, 0, 0], [0.037, 0.078, 0.0045], 0.008), [[-0.05, -0.09, -0.012], [0.05, 0.09, 0.012]], 0.0025),
    new THREE.MeshPhysicalMaterial({ color: '#2A3142', roughness: 0.3, metalness: 0.5, clearcoat: 1 }));
  body.castShadow = true; g.add(body);
  const cv = document.createElement('canvas'); cv.width = 400; cv.height = 880; const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.067, 0.147), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, color: '#D8D8D8' })); scr.position.z = 0.0047; g.add(scr);
  return { group: g, screen: scr, draw(fn) { const c = cv.getContext('2d'); fn(c, cv.width, cv.height); tex.needsUpdate = true; } };
}
/** the map app, painted onto the phone screen. o = { dot:[x,y] (0..1), ghost:[x,y], trail:[[x,y]..], ring, t, bad } */
export function drawMap(g, w, h, o = {}) {
  g.fillStyle = '#EAF1E2'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#CFE5C2'; g.fillRect(w * 0.55, h * 0.1, w * 0.4, h * 0.22);                         // park
  g.fillStyle = '#A9D3F0'; g.save(); g.translate(0, h * 0.62); g.rotate(-0.18); g.fillRect(-60, 0, w + 120, h * 0.085); g.restore();   // river
  g.strokeStyle = '#FFFFFF'; g.lineCap = 'round';
  for (const x of [0.2, 0.52, 0.82]) { g.lineWidth = 34; g.beginPath(); g.moveTo(w * x, 0); g.lineTo(w * x, h); g.stroke(); }
  for (const y of [0.18, 0.42, 0.8]) { g.lineWidth = 30; g.beginPath(); g.moveTo(0, h * y); g.lineTo(w, h * y); g.stroke(); }
  g.strokeStyle = '#F5C451'; g.lineWidth = 12; g.beginPath(); g.moveTo(w * 0.52, 0); g.lineTo(w * 0.52, h); g.stroke();
  g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, w, 70); g.fillStyle = '#1A1F2B'; g.font = '800 34px Inter, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Maps', w / 2, 36);
  const P = (a) => [a[0] * w, a[1] * h];
  if (o.trail && o.trail.length > 1) { g.strokeStyle = '#D62839'; g.lineWidth = 10; g.setLineDash([22, 16]); g.beginPath(); o.trail.forEach((a, i) => (i ? g.lineTo(...P(a)) : g.moveTo(...P(a)))); g.stroke(); g.setLineDash([]); }
  if (o.ghost) { const [x, y] = P(o.ghost); g.fillStyle = 'rgba(46,160,90,0.9)'; g.beginPath(); g.arc(x, y, 22, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 6; g.stroke(); }
  if (o.dot) { const [x, y] = P(o.dot), r = o.ring ?? 46, col = o.bad ? '#D62839' : '#2F7BFF';
    g.fillStyle = o.bad ? 'rgba(214,40,57,0.22)' : 'rgba(47,123,255,0.22)'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    g.fillStyle = col; g.beginPath(); g.arc(x, y, 24, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 7; g.stroke(); }
}

// ═════════════════════════ STREET (sunny, for the hero + phone macro) ═════════════════════════
export function street(E) {
  const scene = new THREE.Scene(); scene.environment = E.envMap; scene.environmentIntensity = 0.35;
  scene.background = new THREE.Color('#CFE6F7'); scene.fog = new THREE.Fog('#CFE6F7', 9, 26);
  const ground = canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#6E7078'; g.fillRect(0, 0, w, h); g.fillStyle = '#B9B2A6'; g.fillRect(0, 0, w, h * 0.3); g.fillRect(0, h * 0.78, w, h * 0.22);
    g.fillStyle = '#9C968B'; for (let i = 0; i < 16; i++) g.fillRect(i * w / 16, 0, 3, h * 0.3), g.fillRect(i * w / 16, h * 0.78, 3, h * 0.22);
    g.fillStyle = '#F1E6B8'; for (let i = 0; i < 6; i++) g.fillRect(i * w / 6 + 20, h * 0.535, w / 12, 12);
    for (let k = 0; k < 600; k++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`; g.fillRect(Math.random() * w, Math.random() * h, 6, 6); }
  }, [4, 4]);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(28, 28), std('#ffffff', 0.85, { map: ground })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const wins = (c1, c2) => canvasTex(256, 512, (g, w, h) => { g.fillStyle = c1; g.fillRect(0, 0, w, h); for (let y = 0; y < 8; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x * 7 + y * 3) % 5 === 0 ? '#FFE3A1' : c2; g.fillRect(x * 64 + 12, y * 64 + 12, 40, 44); } });
  const bd = [[-4.2, 3.4, 2.4, 6.5, '#D9B99B', '#8FB3CF'], [-1.4, 2.8, 2.6, 8, '#B8C4D6', '#7FA0C4'], [1.6, 3.6, 2.8, 5.2, '#E3C6A8', '#8FB3CF'], [4.6, 3.0, 2.8, 7, '#A9B7A0', '#86A9C9'], [7.3, 3.4, 2.6, 5.5, '#D8A89B', '#8FB3CF'], [-6.9, 3.2, 2.6, 6.2, '#C9B7D4', '#86A9C9']];
  for (const [x, h, w, d, c1, c2] of bd) { const b = shadowed(new THREE.Mesh(new THREE.BoxGeometry(w, h * 1.8, 2.2), std('#ffffff', 0.85, { map: wins(c1, c2) }))); b.position.set(x, h * 0.9, -4.4 - (d % 2)); scene.add(b); }
  for (const [x, z] of [[-2.6, -2.9], [2.9, -2.9], [-5.2, -3.0], [5.6, -3.0]]) {
    const t = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.1, 10), std('#6B4A32', 0.9))); t.position.set(x, 0.55, z); scene.add(t);
    const l = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.62, 20, 16), std('#5FA356', 0.8))); l.position.set(x, 1.55, z); l.scale.set(1, 1.15, 1); scene.add(l); }
  lightRig(scene, { key: '#FFD9AE', keyI: 4.0, keyPos: [3.5, 3.4, 4], target: [0, 1, 0], rimCol: '#CFE0FF', rimI: 1.4, hemiI: 0.8, shadowBox: 4 });
  return { scene };
}

// ═════════════════════════ ORBIT (Earth, GPS satellites, beams, shells) ═════════════════════════
export const R_EARTH = 6.4, R_ORBIT = 26.6;                         // 1 unit = 1000 km
const toRad = (d) => (d * Math.PI) / 180;
export const PIN = new THREE.Vector3(0, R_EARTH, 0);
export const satPos = (theta, phi) => new THREE.Vector3(Math.sin(toRad(theta)) * Math.cos(toRad(phi)), Math.cos(toRad(theta)), Math.sin(toRad(theta)) * Math.sin(toRad(phi))).multiplyScalar(R_ORBIT);
export const SATS = [[14, 30], [22, 125], [12, 215], [20, 300]].map(([t, p]) => satPos(t, p));
export const SHELL_COL = ['#4FD1E8', '#FFD43B', '#FF6FB5', '#7CF29A'];

export function makeSat(scale = 1) {
  const g = new THREE.Group();
  const gold = new THREE.MeshPhysicalMaterial({ color: '#E2B85A', roughness: 0.3, metalness: 0.85, clearcoat: 0.5 });
  const body = shadowed(new THREE.Mesh(mesh((p) => rbox(p, [0, 0, 0], [0.28, 0.28, 0.38], 0.05), [[-0.4, -0.4, -0.5], [0.4, 0.4, 0.5]], 0.025), gold)); g.add(body);
  const panelTex = canvasTex(256, 128, (c, w, h) => { c.fillStyle = '#16337E'; c.fillRect(0, 0, w, h); c.strokeStyle = '#6FA2FF'; c.lineWidth = 3; for (let x = 0; x <= w; x += 32) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); } for (let y = 0; y <= h; y += 32) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); } });
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8), std('#BBBBBB', 0.4, { metalness: 0.8 })); arm.rotation.z = Math.PI / 2; arm.position.x = s * 0.5; g.add(arm);
    const pn = shadowed(new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.03, 0.46), new THREE.MeshStandardMaterial({ map: panelTex, roughness: 0.25, metalness: 0.6, emissive: '#10285F', emissiveIntensity: 0.6 }))); pn.position.x = s * 1.2; g.add(pn);
  }
  const dish = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.2, 24, 1, true), new THREE.MeshStandardMaterial({ color: '#EDEDED', roughness: 0.3, metalness: 0.7, side: THREE.DoubleSide })); dish.rotation.x = -Math.PI / 2; dish.position.z = 0.48; g.add(dish);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), new THREE.MeshBasicMaterial({ color: glow('#4FD1E8', 4) })); led.position.set(0, 0.3, 0.1); g.add(led);
  g.scale.setScalar(scale); return g;
}

export function orbit(E) {
  const scene = new THREE.Scene(); scene.environment = E.envMap; scene.environmentIntensity = 0.25; scene.background = new THREE.Color('#03050D');
  // stars
  const sp = []; for (let i = 0; i < 1800; i++) { const u = Math.random() * 2 - 1, a = Math.random() * 6.283, r = Math.sqrt(1 - u * u); sp.push(Math.cos(a) * r * 95, u * 95, Math.sin(a) * r * 95); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: '#FFFFFF', size: 0.35, sizeAttenuation: true, transparent: true, opacity: 0.85 })));
  // earth
  const tex = canvasTex(1024, 512, (g, w, h) => {
    g.fillStyle = '#2C69B3'; g.fillRect(0, 0, w, h);
    const blob = (x, y, rx, ry, c) => { g.fillStyle = c; for (let k = 0; k < 14; k++) { g.beginPath(); g.ellipse(x + (Math.random() - 0.5) * rx * 0.9, y + (Math.random() - 0.5) * ry * 0.9, rx * (0.25 + Math.random() * 0.4), ry * (0.25 + Math.random() * 0.4), Math.random() * 3, 0, 7); g.fill(); } };
    for (const [x, y, rx, ry] of [[250, 170, 160, 90], [430, 330, 90, 110], [640, 190, 190, 80], [770, 340, 90, 60], [140, 380, 70, 50], [880, 140, 80, 50]]) { blob(x, y, rx, ry, '#5BA85A'); blob(x, y, rx * 0.7, ry * 0.6, '#C9B678'); }

  });
  tex.wrapS = THREE.RepeatWrapping;
  const earth = new THREE.Mesh(new THREE.SphereGeometry(R_EARTH, 96, 64), std('#ffffff', 0.85, { map: tex })); earth.rotation.set(1.25, 0.9, 0); earth.receiveShadow = true; scene.add(earth);
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(R_EARTH * 1.045, 64, 48), new THREE.MeshBasicMaterial({ color: '#7CC4FF', transparent: true, opacity: 0.22, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false })); scene.add(atmo);
  // light
  const sun = new THREE.DirectionalLight('#FFF1DC', 3.6); sun.position.set(30, 40, 45); scene.add(sun); scene.add(new THREE.HemisphereLight('#2A3B66', '#0A0A12', 0.55));
  // satellites
  const sats = SATS.map((p) => { const s = makeSat(2.0); s.position.copy(p); s.lookAt(PIN); scene.add(s); return s; });
  // pin (you)
  const pin = new THREE.Group(); pin.position.copy(PIN);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 16), new THREE.MeshBasicMaterial({ color: glow('#FFFFFF', 3) })); pin.add(core);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.04, 12, 48), new THREE.MeshBasicMaterial({ color: glow('#4FD1E8', 3) })); ring.rotation.x = Math.PI / 2; pin.add(ring); scene.add(pin);
  // beams + pulses
  const up = new THREE.Vector3(0, 1, 0);
  const END = PIN.clone().add(new THREE.Vector3(0, 0.9, 0));
  const beams = SATS.map((p, i) => { const d = new THREE.Vector3().subVectors(END, p), len = d.length();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, len, 8, 1, true), new THREE.MeshBasicMaterial({ color: glow(SHELL_COL[i], 1.4), transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.position.copy(p).add(END).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(up, d.clone().normalize()); scene.add(m);
    const pulses = [0, 1, 2].map(() => { const q = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), new THREE.MeshBasicMaterial({ color: glow(SHELL_COL[i], 4) })); scene.add(q); return q; });
    return { m, pulses, a: p, b: END }; });
  // distance circles drawn ON the globe: every one passes through the pin
  const pu = PIN.clone().normalize();
  const shells = SATS.map((p, i) => { const su = p.clone().normalize(), al = Math.acos(su.dot(pu));
    const u = new THREE.Vector3().crossVectors(su, new THREE.Vector3(0, 0, 1)).normalize(), v = new THREE.Vector3().crossVectors(su, u).normalize(), pts = [];
    for (let k = 0; k <= 160; k++) { const be = (k / 160) * Math.PI * 2; pts.push(su.clone().multiplyScalar(Math.cos(al)).add(u.clone().multiplyScalar(Math.sin(al) * Math.cos(be))).add(v.clone().multiplyScalar(Math.sin(al) * Math.sin(be))).multiplyScalar(R_EARTH + 0.05)); }
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 240, 0.05, 8, true), new THREE.MeshBasicMaterial({ color: glow(SHELL_COL[i], 1.3), transparent: true, opacity: 1 }));
    m.visible = false; scene.add(m); return { m, r: al }; });
  const rings = SATS.map((p, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 30), new THREE.MeshBasicMaterial({ color: glow(SHELL_COL[i], 1.4), transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); m.position.copy(p); m.visible = false; scene.add(m); return m; });
  // a phone standing on the ground at the pin
  const ph = makePhone(); ph.group.scale.setScalar(9); ph.group.position.copy(PIN).add(new THREE.Vector3(0, 0.78, 0)); ph.group.rotation.order = 'YXZ'; ph.group.rotation.x = -0.25; scene.add(ph.group);
  ph.group.visible = false;
  return { scene, earth, sats, pin, core, ring, beams, shells, rings, phone: ph };
}

/** a glowing analogue clock hologram (billboard it with mesh.lookAt(cam)). paint(a, b, colour) sets hand angles in radians. */
export function makeClock(scene, size = 1.5) {
  const cc = document.createElement('canvas'); cc.width = cc.height = 512; const ctex = new THREE.CanvasTexture(cc); ctex.colorSpace = THREE.SRGBColorSpace;
  const mesh_ = new THREE.Mesh(new THREE.CircleGeometry(size, 64), new THREE.MeshBasicMaterial({ map: ctex, transparent: true, toneMapped: false })); mesh_.visible = false; scene.add(mesh_);
  const paint = (a, b, col = '#FFD43B') => { const g = cc.getContext('2d'); g.clearRect(0, 0, 512, 512);
    g.fillStyle = 'rgba(10,18,40,0.94)'; g.beginPath(); g.arc(256, 256, 250, 0, 7); g.fill(); g.strokeStyle = col; g.lineWidth = 16; g.stroke();
    g.strokeStyle = '#FFFFFF'; g.lineWidth = 8; for (let i = 0; i < 12; i++) { const an = i * Math.PI / 6; g.beginPath(); g.moveTo(256 + Math.sin(an) * 200, 256 - Math.cos(an) * 200); g.lineTo(256 + Math.sin(an) * 232, 256 - Math.cos(an) * 232); g.stroke(); }
    g.lineCap = 'round'; g.strokeStyle = col; g.lineWidth = 18; g.beginPath(); g.moveTo(256, 256); g.lineTo(256 + Math.sin(a) * 175, 256 - Math.cos(a) * 175); g.stroke();
    g.strokeStyle = '#FFFFFF'; g.lineWidth = 12; g.beginPath(); g.moveTo(256, 256); g.lineTo(256 + Math.sin(b) * 120, 256 - Math.cos(b) * 120); g.stroke();
    g.fillStyle = col; g.beginPath(); g.arc(256, 256, 18, 0, 7); g.fill(); ctex.needsUpdate = true; };
  return { mesh: mesh_, paint };
}

// ═════════════════════════ COLD BATTERY KIT ═════════════════════════
/** the sunny street, turned icy, with falling snow (pure function of time: call snow.update(t)) */
export function coldStreet(E) {
  const st = street(E), sc = st.scene;
  sc.background = new THREE.Color('#B7CBE0'); sc.fog = new THREE.Fog('#B7CBE0', 7, 22);
  sc.traverse((o) => { if (o.isDirectionalLight) { o.color.set('#DCE9FF'); o.intensity *= 0.9; } if (o.isHemisphereLight) { o.color.set('#CFE0F5'); } });
  const N = 260, base = [], sp = new THREE.BufferGeometry(), arr = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) base.push([(Math.random() - 0.5) * 12, Math.random() * 6, (Math.random() - 0.1) * 8 - 1, 0.25 + Math.random() * 0.4, Math.random() * 6.28]);
  sp.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const pts = new THREE.Points(sp, new THREE.PointsMaterial({ color: '#FFFFFF', size: 0.07, transparent: true, opacity: 0.95 })); pts.frustumCulled = false; sc.add(pts);
  const update = (t) => { for (let i = 0; i < N; i++) { const [x, y, z, v, ph] = base[i]; arr[i * 3] = x + Math.sin(t * 0.8 + ph) * 0.25; arr[i * 3 + 1] = 6 - ((y + t * v * 1.2) % 6); arr[i * 3 + 2] = z; } sp.attributes.position.needsUpdate = true; };
  return { scene: sc, update };
}
/** battery-screen graphics for the phone. o = { pct, dead, hold, warm } */
export function drawBatt(g, w, h, o = {}) {
  g.fillStyle = o.dead ? '#06070A' : (o.hold ? '#17202E' : '#F2F5FA'); g.fillRect(0, 0, w, h);
  const cx = w / 2, cy = h * 0.46, bw = w * 0.5, bh = bw * 0.52; const pct = o.pct ?? 1;
  const col = o.dead ? '#D62839' : pct < 0.25 ? '#D62839' : (o.warm ? '#FF9F5A' : '#34C759');
  g.lineWidth = 14; g.strokeStyle = o.dead ? '#D62839' : (o.hold ? '#8FB3CF' : '#1A1F2B'); g.lineJoin = 'round';
  g.beginPath(); g.roundRect(cx - bw / 2, cy - bh / 2, bw, bh, 26); g.stroke(); g.fillStyle = g.strokeStyle; g.fillRect(cx + bw / 2 + 4, cy - bh * 0.16, 18, bh * 0.32);
  if (!o.dead) { g.fillStyle = col; g.beginPath(); g.roundRect(cx - bw / 2 + 14, cy - bh / 2 + 14, Math.max(0.02, pct) * (bw - 28), bh - 28, 14); g.fill(); }
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = o.hold ? '800 46px Inter, sans-serif' : '800 64px Inter, sans-serif';
  g.fillStyle = o.dead ? '#D62839' : (o.hold ? '#FFFFFF' : '#1A1F2B'); g.fillText(o.dead ? '0%' : o.hold ? 'Charging on hold' : Math.round(pct * 100) + '%', cx, cy + bh * 0.95);
  if (o.hold) { g.font = '800 36px Inter, sans-serif'; g.fillStyle = '#8FB3CF'; g.fillText('too cold to charge', cx, cy + bh * 0.95 + 56); }
}

/** battery cell cutaway: anode | separator | cathode with lithium ions shuttling. Call cell.set({ phase, cold, jam }) each frame. */
export function cell(E) {
  const scene = new THREE.Scene(); scene.environment = E.envMap; scene.environmentIntensity = 0.3; scene.background = new THREE.Color('#0B1226');
  const layered = (a, b) => canvasTex(256, 256, (g, w, h) => { g.fillStyle = a; g.fillRect(0, 0, w, h); g.fillStyle = b; for (let y = 0; y < h; y += 22) g.fillRect(0, y, w, 7); });
  const anode = shadowed(new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.7, 0.9), std('#FFFFFF', 0.6, { map: layered('#3A4152', '#5B6479') }))); anode.position.x = -1.45; scene.add(anode);
  const cathode = shadowed(new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.7, 0.9), std('#FFFFFF', 0.6, { map: layered('#D98A3E', '#F2B26A') }))); cathode.position.x = 1.45; scene.add(cathode);
  const liquid = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.7, 0.9), new THREE.MeshBasicMaterial({ color: '#3C7BD9', transparent: true, opacity: 0.22, depthWrite: false })); scene.add(liquid);
  const sepTex = canvasTex(128, 256, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(230,240,255,0.55)'; g.fillRect(0, 0, w, h); g.globalCompositeOperation = 'destination-out'; for (let y = 14; y < h; y += 32) for (let x = 24; x < w; x += 40) { g.beginPath(); g.arc(x + (y % 64 ? 10 : 0), y, 7, 0, 7); g.fill(); } });
  const sep = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 2.7), new THREE.MeshBasicMaterial({ map: sepTex, transparent: true, side: THREE.DoubleSide, depthWrite: false })); sep.rotation.y = Math.PI / 2; scene.add(sep);
  const N = 46, ions = [], geo = new THREE.SphereGeometry(0.075, 14, 10);
  const mat = new THREE.MeshBasicMaterial({ color: glow('#FF9F5A', 2.4) });
  for (let i = 0; i < N; i++) { const m = new THREE.Mesh(geo, mat.clone()); m.userData = { y: (Math.random() - 0.5) * 2.3, z: (Math.random() - 0.5) * 0.7, off: Math.random(), j: Math.random() * 6.28 }; scene.add(m); ions.push(m); }
  const sun = new THREE.DirectionalLight('#FFFFFF', 2.2); sun.position.set(3, 5, 8); scene.add(sun); scene.add(new THREE.HemisphereLight('#7FA0E0', '#101428', 0.8));
  const warm = new THREE.Color('#FF9F5A').multiplyScalar(2.4), coolc = new THREE.Color('#6FD7FF').multiplyScalar(2.4);
  const set = ({ phase = 0, cold = 0, jam = 0, t = 0 }) => {
    ions.forEach((m) => { const { y, z, off, j } = m.userData; const p = (phase + off * 2) % 2, u = p < 1 ? p : 2 - p, e = u * u * (3 - 2 * u);
      let x = lerp3(-1.7, 1.7, e); const near = Math.exp(-Math.pow(x / 0.6, 2)); x = x * (1 - 0.55 * jam * near) + (jam * near * 0.12 * Math.sin(t * 9 + j));
      m.position.set(x, y + jam * 0.05 * Math.sin(t * 11 + j), z); m.material.color.copy(warm).lerp(coolc, cold); });
  };
  return { scene, set, liquid };
}
const lerp3 = (a, b, k) => a + (b - a) * k;

/** a big 3D thermometer; scale -20..50 C maps to y -1.9..1.9. th.set(tempC) moves the red column. */
export function thermometer(E) {
  const scene = new THREE.Scene(); scene.environment = E.envMap; scene.environmentIntensity = 0.3; scene.background = new THREE.Color('#0B1226');
  const Y = (T) => -1.9 + (T + 20) / 70 * 3.8;
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 4.3, 32), new THREE.MeshPhysicalMaterial({ color: '#CFE3FF', roughness: 0.1, transparent: true, opacity: 0.28, clearcoat: 1 })); glass.position.y = 0.0; scene.add(glass);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.52, 32, 24), std('#E02B3B', 0.3, { emissive: '#A00F1E', emissiveIntensity: 0.6 })); bulb.position.y = -2.25; scene.add(bulb);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1, 20), std('#E02B3B', 0.3, { emissive: '#A00F1E', emissiveIntensity: 0.6 })); scene.add(col);
  const zone = new THREE.Mesh(new THREE.BoxGeometry(0.62, Y(35) - Y(0), 0.34), new THREE.MeshBasicMaterial({ color: '#34C759', transparent: true, opacity: 0.4, depthWrite: false })); zone.position.y = (Y(0) + Y(35)) / 2; scene.add(zone);
  for (let T = -20; T <= 50; T += 10) { const tk = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.035, 0.05), std('#FFFFFF', 0.5)); tk.position.set(0.5, Y(T), 0); scene.add(tk); }
  const sun = new THREE.DirectionalLight('#FFFFFF', 2.4); sun.position.set(3, 5, 8); scene.add(sun); scene.add(new THREE.HemisphereLight('#7FA0E0', '#101428', 0.9));
  const set = (T) => { const top = Y(T), bot = -2.25; col.scale.y = Math.max(0.05, top - bot); col.position.y = (top + bot) / 2; };
  return { scene, set, Y };
}

// ═════════════════════════ TOUCH-GRID KIT ═════════════════════════
/** app-grid home screen painted on a phone. o = { tap:[x,y] 0..1, pulse 0..1 } */
export function drawApps(g, w, h, o = {}) {
  g.fillStyle = '#0F1A33'; g.fillRect(0, 0, w, h); const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#2B3A7A'); gr.addColorStop(1, '#0F1A33'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const cols = ['#FF6B6B', '#FFD43B', '#51CF66', '#4DABF7', '#CC5DE8', '#FF922B', '#20C997', '#748FFC'];
  for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) { g.fillStyle = cols[(r * 4 + c) % 8]; g.beginPath(); g.roundRect(34 + c * 90, 90 + r * 120, 72, 72, 20); g.fill(); }
  if (o.tap) { const [x, y] = o.tap, k = o.pulse || 0; g.strokeStyle = `rgba(255,255,255,${0.9 * (1 - k)})`; g.lineWidth = 8; g.beginPath(); g.arc(x * w, y * h, 20 + 90 * k, 0, 7); g.stroke(); g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.arc(x * w, y * h, 22, 0, 7); g.fill(); }
}

/** the touch sensor: glass over a grid of row + column wires, a finger or glove. set({fx,fy,fz,tip:'finger'|'glove'|'thread',field,lock,glass,trail,t}) */
export function touchGrid(E) {
  const scene = new THREE.Scene(); scene.environment = E.envMap; scene.environmentIntensity = 0.35; scene.background = new THREE.Color('#0A1024');
  const PW = 3.6, PH = 6.4, NC = 9, NR = 16, sx = PW / NC, sy = PH / NR;
  const cx = (i) => -PW / 2 + sx * (i + 0.5), ry = (j) => -PH / 2 + sy * (j + 0.5);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(PW + 0.3, PH + 0.3, 0.1), new THREE.MeshPhysicalMaterial({ color: '#BFD8FF', roughness: 0.05, transparent: true, opacity: 0.35, clearcoat: 1, depthWrite: false })); glass.position.z = 0.05; scene.add(glass);
  const base = shadowed(new THREE.Mesh(new THREE.BoxGeometry(PW + 0.3, PH + 0.3, 0.08), std('#0D1530', 0.6))); base.position.z = -0.42; scene.add(base);
  const mk = () => new THREE.MeshBasicMaterial({ color: '#2FA8C8' });
  const cols = [], rows = [];
  for (let i = 0; i < NC; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.035, PH, 0.035), mk()); m.position.set(cx(i), 0, -0.34); scene.add(m); cols.push(m); }
  for (let j = 0; j < NR; j++) { const m = new THREE.Mesh(new THREE.BoxGeometry(PW, 0.035, 0.035), mk()); m.position.set(0, ry(j), -0.2); scene.add(m); rows.push(m); }
  const xo = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 14), new THREE.MeshBasicMaterial({ color: glow('#FFE066', 3) })); xo.visible = false; scene.add(xo);
  const trail = []; for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: glow('#FFE066', 2.4) })); m.visible = false; scene.add(m); trail.push(m); }
  // finger (capsule), glove sleeve, thread stitches
  const fingerG = new THREE.Group(), mat = { finger: std('#E8B592', 0.55), glove: std('#4B5DA8', 1.0) };
  const fcap = shadowed(new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 2.2, 10, 18), mat.finger)); fcap.position.y = -(1.1 + 0.34); fingerG.add(fcap);
  const thread = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.03, 8, 24), new THREE.MeshBasicMaterial({ color: glow('#FFD43B', 3) })); thread.rotation.x = Math.PI / 2; thread.position.y = -0.1; thread.visible = false; fingerG.add(thread);
  const thread2 = thread.clone(); thread2.position.y = -0.3; thread2.visible = false; fingerG.add(thread2);
  fingerG.rotation.x = -1.0; scene.add(fingerG);
  const sun = new THREE.DirectionalLight('#FFFFFF', 2.6); sun.position.set(3, 5, 8); sun.castShadow = true; scene.add(sun); scene.add(new THREE.HemisphereLight('#7FA0E0', '#101428', 0.9));
  const baseC = new THREE.Color('#2FA8C8'), hot = new THREE.Color('#FFB020');
  const set = ({ fx = 0, fy = 0, fz = 3, tip = 'finger', field = 1, lock = 0, glass: gl = 0.35, trail: tr = [], t = 0, show = true } = {}) => {
    glass.material.opacity = gl; fingerG.visible = show; fingerG.position.set(fx, fy, fz + 0.1);
    fcap.material = tip === 'finger' ? mat.finger : mat.glove; fcap.scale.setScalar(tip === 'finger' ? 1 : 1.25); thread.visible = thread2.visible = tip === 'thread';
    const active = tip !== 'glove', prox = active ? Math.max(0, Math.min(1, 1 - (fz - 0.1) / 2.4)) : 0;
    let bi = 0, bj = 0, bdi = 9, bdj = 9;
    cols.forEach((m, i) => { const d = Math.abs(cx(i) - fx); if (d < bdi) { bdi = d; bi = i; } });
    rows.forEach((m, j) => { const d = Math.abs(ry(j) - fy); if (d < bdj) { bdj = d; bj = j; } });
    const paint = (m, pos, d, isNearest) => {
      const pulse = 0.55 + 0.45 * Math.sin(t * 4 - pos * 2.2) * field, soft = Math.exp(-Math.pow(d / 0.7, 2)) * prox, sharp = isNearest ? prox : 0, k = Math.max(soft * (1 - lock), sharp * lock * 1.0 + soft * 0.0);
      m.material.color.copy(baseC).multiplyScalar((0.7 + 0.9 * pulse) * (field > 0 ? 1 : 0.3)).lerp(hot.clone().multiplyScalar(1 + 2.2 * k), Math.min(1, k * 1.4));
    };
    cols.forEach((m, i) => paint(m, cx(i), Math.abs(cx(i) - fx), i === bi)); rows.forEach((m, j) => paint(m, ry(j), Math.abs(ry(j) - fy), j === bj));
    xo.visible = lock > 0.01 && prox > 0.6; xo.position.set(cx(bi), ry(bj), -0.27); xo.scale.setScalar(0.6 + 0.8 * lock);
    trail.forEach((m, i) => { const p = tr[i]; m.visible = !!p; if (p) { m.position.set(p[0], p[1], -0.27); m.scale.setScalar(0.5 + 0.5 * (i / Math.max(1, tr.length))); } });
    return { col: bi, row: bj, cx: cx(bi), ry: ry(bj) };
  };
  return { scene, set, PW, PH, cx, ry, NC, NR };
}

// ═════════════════════════ NOISE-CANCEL KIT ═════════════════════════
const _std = (c, r = 0.5, m = 0.0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
/** headphones on a dark stage with sound rings arriving from the left. set({t, rings, cancel, mic, spin}) */
export function phonesStage(E) {
  const scene = new THREE.Scene(); scene.environment = E.envMap; scene.environmentIntensity = 0.5; scene.background = new THREE.Color('#0A0E1C');
  const g = new THREE.Group(); scene.add(g);
  const band = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.12, 14, 48, Math.PI), _std('#2B3350', 0.35, 0.5)); band.rotation.z = 0; g.add(band);
  const cups = [-1, 1].map((s) => { const c = new THREE.Group(); const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.55, 36), _std('#1A2038', 0.3, 0.6)); sh.rotation.z = Math.PI / 2; c.add(sh);
    const pad = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.2, 14, 36), _std('#3A4262', 0.9)); pad.rotation.y = Math.PI / 2; pad.position.x = -s * 0.32; c.add(pad);
    const mic = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), new THREE.MeshBasicMaterial({ color: '#35F0A0' })); mic.position.set(s * 0.3, 0.3, 0.3); c.add(mic); c.userData.mic = mic;
    c.position.set(s * 1.5, 0, 0); g.add(c); return c; });
  g.scale.setScalar(0.6); g.position.y = -0.1; const L = new THREE.DirectionalLight('#FFFFFF', 2.4); L.position.set(3, 4, 6); scene.add(L); scene.add(new THREE.HemisphereLight('#6F8FE0', '#10142A', 0.8));
  const rings = []; for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 8, 48), new THREE.MeshBasicMaterial({ color: '#FFB020', transparent: true })); m.rotation.y = Math.PI / 2; scene.add(m); rings.push(m); }
  const set = ({ t = 0, rings: rv = 1, cancel = 0, mic = 0, spin = 0 } = {}) => {
    g.rotation.y = spin; cups.forEach((c) => { const k = 0.6 + 0.4 * Math.sin(t * 8); c.userData.mic.scale.setScalar(1 + mic * (0.3 + 0.2 * k)); c.userData.mic.material.color.set(mic > 0.1 ? '#8CFFD0' : '#35F0A0'); });
    rings.forEach((m, i) => { const ph = ((t * 1.1 + i * 0.9) % 4.5) / 4.5, x = -2.8 + ph * 2.3; m.position.set(x, 0, 0); m.scale.setScalar(0.35 + ph * 0.9); m.visible = rv > 0; m.material.opacity = Math.max(0, (1 - ph) * rv * (1 - cancel * Math.min(1, Math.max(0, (ph - 0.35) / 0.35)))); });
  };
  return { scene, set, group: g };
}

/** three glowing waves (noise, anti-noise, sum). set({t, noise, anti, flip, mode:'steady'|'burst', lag, sum}) amplitudes 0..1 */
export function waveLab(E) {
  const scene = new THREE.Scene(); scene.environment = E.envMap; scene.environmentIntensity = 0.3; scene.background = new THREE.Color('#080C18');
  const grp = new THREE.Group(); grp.rotation.z = Math.PI / 2; scene.add(grp);
  const N = 140, X0 = -3.4, X1 = 3.4;
  const mk = (c, r) => { const m = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: c })); m.userData.r = r; grp.add(m); return m; };
  const wn = mk(glow('#FFB020', 2.2), 0.075), wa = mk(glow('#4FD1E8', 2.2), 0.075), ws = mk(glow('#FFFFFF', 2.6), 0.07);
  const grid = new THREE.GridHelper(9, 18, '#1B2542', '#121A33'); grid.rotation.x = Math.PI / 2; grid.position.z = -0.6; grp.add(grid);
  const noiseAt = (x, t, mode) => { const a = Math.sin(1.9 * x - 3.2 * t) + 0.5 * Math.sin(3.7 * x - 5.1 * t);
    if (mode === 'burst') { const env = Math.max(0, Math.sin(0.8 * x - 1.7 * t)) ** 3, sp = Math.sin(6.0 * x - 8 * t) * 0.8; return 0.4 * a + env * sp; } return 0.75 * a; };
  const tube = (m, f, y0) => { const pts = []; for (let i = 0; i <= N; i++) { const x = X0 + (X1 - X0) * i / N; pts.push(new THREE.Vector3(x, y0 + f(x), 0)); }
    m.geometry.dispose(); m.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), N, m.userData.r, 6, false); };
  const set = ({ t = 0, noise = 1, anti = 0, flip = 1, mode = 'steady', lag = 0, sum = 0, ySep = 1.55 } = {}) => {
    const nf = (x) => noise * noiseAt(x, t, mode), af = (x) => -anti * flip * noiseAt(x, t - lag, mode);
    tube(wn, nf, ySep); tube(wa, af, 0); tube(ws, (x) => sum * (nf(x) + af(x)), -ySep);
    wn.visible = noise > 0.01; wa.visible = anti > 0.01; ws.visible = sum > 0.01;
  };
  return { scene, set };
}
