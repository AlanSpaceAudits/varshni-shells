// Shared utilities: parse B1950-style designations into RA/Dec, build positions.
import * as THREE from 'three';
import { groups } from './data.js';

export const Z_TO_R = 200;

export function parseCoords(name) {
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
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const r1 = ((h >>> 0) % 100000) / 100000;
  const r2 = (((h >>> 13) >>> 0) % 100000) / 100000;
  return { ra: r1 * 2 * Math.PI, dec: Math.asin(2 * r2 - 1), parsed: false };
}

export function toCartesian(r, ra, dec) {
  return new THREE.Vector3(
    r * Math.cos(dec) * Math.cos(ra),
    r * Math.sin(dec),
    r * Math.cos(dec) * Math.sin(ra),
  );
}

export function groupColor(i) {
  const hue = (i * 137.508) % 360;
  return new THREE.Color(`hsl(${hue}, 80%, 62%)`);
}

// Pre-build positions once and cache. Each item:
// { groupIndex, groupId, name, z, ra, dec, parsed, position(THREE.Vector3) }
export const quasars = (() => {
  const out = [];
  groups.forEach((g, i) => {
    g.members.forEach(m => {
      const c = parseCoords(m.name);
      out.push({
        groupIndex: i,
        groupId: g.id,
        name: m.name,
        z: m.z,
        ra: c.ra,
        dec: c.dec,
        parsed: c.parsed,
        position: toCartesian(m.z * Z_TO_R, c.ra, c.dec),
      });
    });
  });
  return out;
})();
