import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { groups } from './data.js';
import { quasars, groupColor, Z_TO_R } from './coords.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000004);

// faint star backdrop
{
  const N = 1500;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 1800 + Math.random() * 400;
    const u = Math.random() * 2 - 1, t = Math.random() * 2 * Math.PI;
    const s = Math.sqrt(1 - u * u);
    pos[i*3] = r*s*Math.cos(t); pos[i*3+1] = r*u; pos[i*3+2] = r*s*Math.sin(t);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0x666666, size: 1.2, sizeAttenuation: false })));
}

const camera = new THREE.PerspectiveCamera(55, innerWidth/innerHeight, 0.1, 8000);
camera.position.set(380, 260, 700);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(devicePixelRatio);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.autoRotateSpeed = 0.4;

// Earth marker (always at origin)
{
  const earth = new THREE.Mesh(new THREE.SphereGeometry(2.5, 24, 24), new THREE.MeshBasicMaterial({ color: 0x4aa3ff }));
  scene.add(earth);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(5, 24, 24), new THREE.MeshBasicMaterial({ color: 0x4aa3ff, transparent: true, opacity: 0.18 }));
  scene.add(halo);
}

// Observer marker
const observer = new THREE.Mesh(
  new THREE.SphereGeometry(4, 20, 20),
  new THREE.MeshBasicMaterial({ color: 0xffd34a }),
);
scene.add(observer);
const observerHalo = new THREE.Mesh(
  new THREE.SphereGeometry(8, 20, 20),
  new THREE.MeshBasicMaterial({ color: 0xffd34a, transparent: true, opacity: 0.22 }),
);
scene.add(observerHalo);

// Quasar dots — geometry shared, one Mesh per quasar so we can recolor individually.
const dotGeom = new THREE.SphereGeometry(2.0, 10, 10);
const quasarMeshes = [];
for (const q of quasars) {
  const mat = new THREE.MeshBasicMaterial({ color: groupColor(q.groupIndex) });
  const m = new THREE.Mesh(dotGeom, mat);
  m.position.copy(q.position);
  m.userData = q;
  quasarMeshes.push(m);
  scene.add(m);
}

// Earth-shells (original) — fixed; toggle visibility.
const earthShellRoot = new THREE.Group();
groups.forEach((g, i) => {
  const r = g.zMean * Z_TO_R;
  earthShellRoot.add(new THREE.Mesh(
    new THREE.SphereGeometry(r, 36, 24),
    new THREE.MeshBasicMaterial({ color: groupColor(i), wireframe: true, transparent: true, opacity: 0.06, depthWrite: false }),
  ));
});
earthShellRoot.visible = false;
scene.add(earthShellRoot);

// Observer-shells: spheres at observer position, radius = mean distance to group members from observer.
// Update each frame.
const obsShellRoot = new THREE.Group();
const obsShellMeshes = [];
groups.forEach((g, i) => {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(1, 36, 24), // radius set per frame via scale
    new THREE.MeshBasicMaterial({ color: groupColor(i), wireframe: true, transparent: true, opacity: 0.10, depthWrite: false }),
  );
  obsShellMeshes.push(m);
  obsShellRoot.add(m);
});
scene.add(obsShellRoot);

// Color palette for shell-fit visualisation:
// fits well (z-score small) → group color; fits poorly → red.
function colorByFit(zscore, groupColorObj) {
  const t = Math.min(1, Math.abs(zscore));     // 0 = fits, 1 = bad
  const red = new THREE.Color(0xff3333);
  return groupColorObj.clone().lerp(red, t);
}

const obsPos = new THREE.Vector3();

function update() {
  obsPos.set(
    parseFloat(document.getElementById('ox').value),
    parseFloat(document.getElementById('oy').value),
    parseFloat(document.getElementById('oz').value),
  );
  observer.position.copy(obsPos);
  observerHalo.position.copy(obsPos);
  obsShellRoot.position.copy(obsPos);

  let totalSigmaOverMu = 0;
  let nGroupsWithSpread = 0;

  // Per-group statistics
  const groupStats = groups.map(() => ({ dists: [], mean: 0, sigma: 0 }));
  for (const m of quasarMeshes) {
    const d = m.position.distanceTo(obsPos);
    groupStats[m.userData.groupIndex].dists.push(d);
  }
  groupStats.forEach((gs, i) => {
    const n = gs.dists.length;
    const mean = gs.dists.reduce((a, b) => a + b, 0) / n;
    let s2 = 0;
    for (const d of gs.dists) s2 += (d - mean) * (d - mean);
    const sigma = Math.sqrt(s2 / n);
    gs.mean = mean;
    gs.sigma = sigma;
    if (n > 1) {
      totalSigmaOverMu += sigma / Math.max(mean, 1e-6);
      nGroupsWithSpread++;
    }

    // Update observer-shell mesh radius via scale on a unit sphere.
    obsShellMeshes[i].scale.setScalar(mean);
  });

  // Recolor each quasar by deviation from its group's mean distance.
  for (const m of quasarMeshes) {
    const gs = groupStats[m.userData.groupIndex];
    if (gs.sigma < 1e-6) {
      m.material.color.copy(groupColor(m.userData.groupIndex));
      continue;
    }
    const z = (m.position.distanceTo(obsPos) - gs.mean) / Math.max(gs.mean * 0.05, 1e-6);
    m.material.color.copy(colorByFit(z, groupColor(m.userData.groupIndex)));
  }

  const meanSpread = nGroupsWithSpread ? totalSigmaOverMu / nGroupsWithSpread : 0;
  const fit = Math.max(0, 1 - meanSpread);

  document.getElementById('opos').textContent = `(${obsPos.x.toFixed(0)}, ${obsPos.y.toFixed(0)}, ${obsPos.z.toFixed(0)})`;
  document.getElementById('sigma').textContent = meanSpread.toFixed(3);
  document.getElementById('fit').textContent = fit.toFixed(2);
  document.getElementById('fitFill').style.width = (fit * 100).toFixed(0) + '%';
}

['ox','oy','oz'].forEach(id => {
  const el = document.getElementById(id);
  el.addEventListener('input', () => {
    document.getElementById(id + 'v').textContent = el.value;
    update();
  });
});

document.querySelectorAll('.preset').forEach(b => b.addEventListener('click', () => {
  let v;
  if (b.dataset.pos === 'random') {
    v = [Math.random()*800-400, Math.random()*800-400, Math.random()*800-400].map(x => Math.round(x));
  } else {
    v = b.dataset.pos.split(',').map(Number);
  }
  ['ox','oy','oz'].forEach((id, i) => {
    document.getElementById(id).value = v[i];
    document.getElementById(id + 'v').textContent = v[i];
  });
  update();
}));

document.getElementById('showObsShells').addEventListener('change', e => obsShellRoot.visible = e.target.checked);
document.getElementById('showEarthShells').addEventListener('change', e => earthShellRoot.visible = e.target.checked);
document.getElementById('autoRotate').addEventListener('change', e => controls.autoRotate = e.target.checked);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

update();
function tick() {
  requestAnimationFrame(tick);
  controls.update();
  renderer.render(scene, camera);
}
tick();
