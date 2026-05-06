import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { groups } from './data.js';

const Z_TO_R = 200;     // world units per unit redshift
const POINT_R = 1.5;    // base radius for quasar markers

// ---------- scene ---------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000004);

// faint star backdrop
{
  const N = 1500;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 1800 + Math.random() * 400;
    const u = Math.random() * 2 - 1;
    const t = Math.random() * 2 * Math.PI;
    const s = Math.sqrt(1 - u * u);
    pos[i*3]   = r * s * Math.cos(t);
    pos[i*3+1] = r * u;
    pos[i*3+2] = r * s * Math.sin(t);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0x666666, size: 1.2, sizeAttenuation: false })));
}

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 8000);
camera.position.set(280, 200, 620);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(devicePixelRatio);
document.body.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(innerWidth, innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0';
labelRenderer.domElement.style.pointerEvents = 'none';
document.body.appendChild(labelRenderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.autoRotateSpeed = 0.4;

// ---------- earth ---------------------------------------------------------
{
  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(2.5, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0x4aa3ff }),
  );
  scene.add(earth);

  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(5, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0x4aa3ff, transparent: true, opacity: 0.18 }),
  );
  scene.add(halo);

  const div = document.createElement('div');
  div.textContent = 'Earth';
  div.style.cssText = 'color:#9bf;font-size:11px;letter-spacing:.5px;';
  const lbl = new CSS2DObject(div);
  lbl.position.set(0, 6, 0);
  scene.add(lbl);
}

// ---------- coordinate parsing -------------------------------------------
// Many quasar designations encode B1950 coordinates as HHMM±DDMM or HHMM±DDD
// (DD.D tenths). For names without coords we use a deterministic hash so
// every reload places the same fallback point in the same spot.
function parseCoords(name) {
  const m = name.match(/(\d{4})([+-])(\d{2,4})/);
  if (m) {
    const ra_h = parseInt(m[1].slice(0, 2), 10);
    const ra_m = parseInt(m[1].slice(2, 4), 10);
    if (ra_h <= 24 && ra_m < 60) {
      const ra_deg = (ra_h + ra_m / 60) * 15;
      const sign = m[2] === '-' ? -1 : 1;
      const d = m[3];
      let dec_deg;
      if (d.length === 2) dec_deg = sign * parseInt(d, 10);
      else if (d.length === 3) dec_deg = sign * parseInt(d, 10) / 10;
      else dec_deg = sign * (parseInt(d.slice(0, 2), 10) + parseInt(d.slice(2, 4), 10) / 60);
      if (Math.abs(dec_deg) <= 90) {
        return { ra: ra_deg * Math.PI / 180, dec: dec_deg * Math.PI / 180, parsed: true };
      }
    }
  }
  // FNV-1a hash for stable pseudo-random fallback
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const r1 = ((h >>> 0) % 100000) / 100000;
  const r2 = (((h >>> 13) >>> 0) % 100000) / 100000;
  return { ra: r1 * 2 * Math.PI, dec: Math.asin(2 * r2 - 1), parsed: false };
}

function toCartesian(r, ra, dec) {
  const x = r * Math.cos(dec) * Math.cos(ra);
  const y = r * Math.sin(dec);
  const z = r * Math.cos(dec) * Math.sin(ra);
  return new THREE.Vector3(x, y, z);
}

function groupColor(i) {
  const hue = (i * 137.508) % 360;
  return new THREE.Color(`hsl(${hue}, 80%, 62%)`);
}

// ---------- build shells, points, lines ----------------------------------
const shellRoot  = new THREE.Group();
const lineRoot   = new THREE.Group();
const pointRoot  = new THREE.Group();
const labelRoot  = new THREE.Group();
scene.add(shellRoot, lineRoot, pointRoot, labelRoot);

const pickables = [];

groups.forEach((g, i) => {
  const color = groupColor(i);
  const r = g.zMean * Z_TO_R;

  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(r, 48, 32),
    new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.12, depthWrite: false }),
  );
  shell.userData = { kind: 'shell', groupId: g.id };
  shellRoot.add(shell);

  // group label floats above the shell pole
  {
    const div = document.createElement('div');
    div.textContent = `g${g.id}  z≈${g.zMean.toFixed(3)}`;
    div.style.cssText = `color:#${color.getHexString()};font-size:10px;opacity:.8;`;
    const lbl = new CSS2DObject(div);
    lbl.position.set(0, r, 0);
    labelRoot.add(lbl);
  }

  g.members.forEach(m => {
    const c = parseCoords(m.name);
    const pos = toCartesian(m.z * Z_TO_R, c.ra, c.dec);

    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(POINT_R, 12, 12),
      new THREE.MeshBasicMaterial({ color }),
    );
    dot.position.copy(pos);
    dot.userData = { name: m.name, z: m.z, groupId: g.id, parsed: c.parsed };
    pointRoot.add(dot);
    pickables.push(dot);

    const lineGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), pos]);
    const line = new THREE.Line(
      lineGeom,
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.35 }),
    );
    lineRoot.add(line);
  });
});

labelRoot.visible = false;

// ---------- hover tooltip -------------------------------------------------
const raycaster = new THREE.Raycaster();
raycaster.params.Mesh = { threshold: 0 };
const pointer = new THREE.Vector2();
const tooltip = document.getElementById('tooltip');
let lastHover = null;

addEventListener('pointermove', (e) => {
  pointer.x = (e.clientX / innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(pickables, false);
  if (hits.length) {
    const u = hits[0].object.userData;
    tooltip.style.display = 'block';
    tooltip.style.left = (e.clientX + 14) + 'px';
    tooltip.style.top  = (e.clientY + 14) + 'px';
    tooltip.innerHTML = `<b>${u.name}</b><br>z = ${u.z}<br>group ${u.groupId}` +
      (u.parsed ? '' : '<br><span style="color:#888">approx position</span>');
    if (lastHover && lastHover !== hits[0].object) lastHover.scale.set(1, 1, 1);
    hits[0].object.scale.set(2.2, 2.2, 2.2);
    lastHover = hits[0].object;
  } else {
    tooltip.style.display = 'none';
    if (lastHover) { lastHover.scale.set(1, 1, 1); lastHover = null; }
  }
});

// ---------- UI controls --------------------------------------------------
const $ = (id) => document.getElementById(id);
$('showShells').addEventListener('change', e => shellRoot.visible = e.target.checked);
$('showLines').addEventListener('change',  e => lineRoot.visible  = e.target.checked);
$('showLabels').addEventListener('change', e => labelRoot.visible = e.target.checked);
$('autoRotate').addEventListener('change', e => controls.autoRotate = e.target.checked);

$('opacity').addEventListener('input', e => {
  const v = parseInt(e.target.value, 10) / 100;
  $('opVal').textContent = v.toFixed(2);
  shellRoot.children.forEach(s => s.material.opacity = v);
});
$('pointSize').addEventListener('input', e => {
  const s = parseInt(e.target.value, 10) / 10;
  $('psVal').textContent = s.toFixed(1);
  pointRoot.children.forEach(d => d.scale.setScalar(s / POINT_R));
});

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  labelRenderer.setSize(innerWidth, innerHeight);
});

function tick() {
  requestAnimationFrame(tick);
  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}
tick();
