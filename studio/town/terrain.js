// Landscape that never ends: land and sea run past the fog, a ring of rolling hills
// and far mountains closes every horizon, so no shot can find the edge of the map.
// Reusable for any town; each episode picks the sea side, colours and seed.
import * as T from 'three';
import {flatMaterial, surfaceMaterials} from './materials.js';

function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }
const mesh = (g, m, name, shadow = true) => { const o = new T.Mesh(g, m); o.name = name; o.castShadow = shadow; o.receiveShadow = true; return o; };

// seaX: land is x > seaX, sea is x < seaX (west coast). size: extent of land and sea.
export function landscape(scene, {seaX = -80, size = 3000, grass = '#7cc45a', sand = '#ead6a6', water = '#3fa6d6', seed = 7, hillRing = [190, 260], beach: withBeach = true, skip = () => false} = {}) {
  const r = rng(seed), g = new T.Group(); g.name = 'landscape';
  // Land: one big painted slab (grass texture tiles in world units).
  const land = mesh(new T.BoxGeometry(size, .2, size), surfaceMaterials('grass', grass, [size, .2, size]), 'land');
  land.position.set(seaX + size / 2, -.1, 0); g.add(land);
  // Beach strip and a stone quay edge along the coast.
  if (withBeach) { const beach = mesh(new T.BoxGeometry(14, .3, size), flatMaterial(sand), 'beach'); beach.position.set(seaX + 4, -.05, 0); g.add(beach); }
  // Sea to the horizon (slightly emissive so it reads bright under any mood).
  const sea = mesh(new T.PlaneGeometry(size, size), flatMaterial(water, {roughness: .12, emissive: '#1d6f9c', emissiveIntensity: .22}), 'sea', false);
  sea.rotation.x = -Math.PI / 2; sea.position.set(seaX - size / 2 + 3, -.7, 0); g.add(sea);
  // Rolling hills (low-poly, half buried) on a ring around the town, land side only.
  const hillMats = [grass, new T.Color(grass).multiplyScalar(.86).getStyle(), new T.Color(grass).lerp(new T.Color('#e8f55a'), .18).getStyle()].map(c => flatMaterial(c, {flatShading: true}));
  for (let i = 0; i < 46; i++) {
    const a = r() * Math.PI * 2, d = hillRing[0] + r() * (hillRing[1] - hillRing[0]);
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (x < seaX + 40 || skip(x, z)) continue;
    const s = 26 + r() * 34, h = mesh(new T.IcosahedronGeometry(s, 1), hillMats[i % 3], 'hill', false);
    h.scale.set(1.4, .45 + r() * .25, 1.2); h.position.set(x, -s * .12, z); h.rotation.y = r() * 6; g.add(h);
    // A few trees on the nearer hills for scale.
    if (d < hillRing[0] + 30) for (let k = 0; k < 3; k++) {
      const t = mesh(new T.ConeGeometry(2.6, 8, 6), hillMats[(i + k) % 3], 'hill_tree', false); t.position.set(x + (r() - .5) * s, s * .25 + 3, z + (r() - .5) * s * .6); g.add(t);
    }
  }
  // Far mountains: big soft cones, fogged to blue, on the land horizon.
  const mtn = flatMaterial('#8fb0c8', {flatShading: true, roughness: 1});
  for (let i = 0; i < 14; i++) {
    const a = -Math.PI / 2 + (i / 13 - .5) * Math.PI * 1.6, d = 340 + r() * 60;
    const x = Math.cos(a) * d + 60, z = Math.sin(a) * d;
    if (x < seaX + 60) continue;
    const m = mesh(new T.ConeGeometry(50 + r() * 40, 70 + r() * 60, 7), mtn, 'mountain', false); m.position.set(x, 10, z); m.rotation.y = r() * 3; g.add(m);
  }
  scene.add(g); return g;
}

// Cracked asphalt decals: jagged dark lines lying on a road (deterministic per seed).
export function roadCracks({len = 6, branches = 3, seed = 3, color = '#2b2d31', width = .14} = {}) {
  const r = rng(seed * 97 + 13), g = new T.Group(); g.name = 'road_cracks';
  const mat = flatMaterial(color, {roughness: .95});
  const seg = (x0, z0, ang, n, w) => {
    let x = x0, z = z0;
    for (let i = 0; i < n; i++) {
      const L = .5 + r() * .6, a = ang + (r() - .5) * 1.1, x1 = x + Math.cos(a) * L, z1 = z + Math.sin(a) * L;
      const m = mesh(new T.BoxGeometry(L + w, .02, w * (1 - i / (n + 2))), mat, 'crack', false);
      m.position.set((x + x1) / 2, .115, (z + z1) / 2); m.rotation.y = -a; g.add(m);
      if (i > 1 && r() < .35 && branches-- > 0) seg(x1, z1, a + (r() < .5 ? 1 : -1) * (.6 + r() * .6), Math.max(2, n - i - 1), w * .7);
      x = x1; z = z1;
    }
  };
  seg(-len / 2, 0, 0, Math.round(len / .7), width);
  return g;
}
