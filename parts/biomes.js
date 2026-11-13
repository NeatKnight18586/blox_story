// parts/biomes.js — biome tables (Amendment A4 A2). A biome is data: palette, terrain splat layers + thresholds,
// vegetation set, sky preset (engine/look.js), fog/haze and water tint. A world picks one or two and adds its own story
// set pieces; worlds stay bespoke (§7.1): seed, landmark, layout and palette change every episode. Pure data + one helper.
// Palette rule (§7.3.3): environment colours are mid-value and a little desaturated, so the plastic avatars stay the
// highest-contrast things in frame.

export const BIOMES = {
  alpine: {
    palette: {grass: '#7fa35a', rock: '#8f8a84', snow: '#eef3f8', path: '#b9a07a', accent: '#d65a3a'},
    terrain: {layers: [{pattern: 'grass', color: '#7fa35a'}, {pattern: 'cliff', color: '#8f8a84', tile: 7}, {pattern: 'snow', color: '#eef3f8'}], rockSlope: .8, highY: 46, highSoft: 8},
    vegetation: {trees: ['conifer', 'poplar'], treeDensity: .5, bushes: .3, grass: 1, flowers: .2, rocks: .35},
    sky: 'day', fog: {color: '#c9d9ea', near: 110, far: 420, height: {base: 0, falloff: 14, amount: .35}}, water: {deep: '#2f6f8f', shallow: '#6fb3c8'},
  },
  meadow: {
    palette: {grass: '#86b65a', rock: '#9b927f', snow: '#d9cf9a', path: '#c9b07c', accent: '#e8b13a'},
    terrain: {layers: [{pattern: 'grass', color: '#86b65a'}, {pattern: 'rock', color: '#9b927f'}, {pattern: 'moss', color: '#a3bd62'}], rockSlope: .7, highY: 30, highSoft: 10},
    vegetation: {trees: ['broadleaf', 'poplar'], treeDensity: .35, bushes: .5, grass: 1.2, flowers: .9, rocks: .15},
    sky: 'day', fog: {color: '#d5e6f2', near: 120, far: 440, height: {base: 0, falloff: 10, amount: .2}}, water: {deep: '#2c6a86', shallow: '#73b8c4'},
  },
  coast: {
    palette: {grass: '#8fb062', rock: '#a39986', snow: '#e8d9ae', path: '#d8c49a', accent: '#2f9fb5'},
    terrain: {layers: [{pattern: 'sand', color: '#e3d2a2'}, {pattern: 'rock', color: '#a39986'}, {pattern: 'grass', color: '#8fb062'}], rockSlope: .76, highY: 5, highSoft: 3},
    vegetation: {trees: ['palm', 'broadleaf'], treeDensity: .25, bushes: .3, grass: .6, flowers: .2, rocks: .3},
    sky: 'day', fog: {color: '#d6eaf3', near: 120, far: 460, height: {base: 0, falloff: 8, amount: .25}}, water: {deep: '#1f6f93', shallow: '#5fc2c9'},
  },
  desert: {
    palette: {grass: '#c9a86a', rock: '#b07a52', snow: '#e6cf9c', path: '#d9b984', accent: '#2f80d1'},
    terrain: {layers: [{pattern: 'sand', color: '#e2c48e'}, {pattern: 'cliff', color: '#b07a52', tile: 8}, {pattern: 'sand', color: '#d4ab72'}], rockSlope: .82, highY: 20, highSoft: 6},
    vegetation: {trees: ['palm'], treeDensity: .05, bushes: .15, grass: .1, flowers: 0, rocks: .45},
    sky: 'goldenHour', fog: {color: '#efd6ae', near: 120, far: 480, height: {base: 0, falloff: 12, amount: .3}}, water: {deep: '#2a7c8c', shallow: '#78c8c0'},
  },
  cave: {
    palette: {grass: '#5d6670', rock: '#4c535c', snow: '#7fd6e8', path: '#6b6256', accent: '#7fe0ff'},
    terrain: {layers: [{pattern: 'mud', color: '#6b6256'}, {pattern: 'cliff', color: '#4c535c'}, {pattern: 'crystal', color: '#7fd6e8'}], rockSlope: .9, highY: 18, highSoft: 4},
    vegetation: {trees: [], treeDensity: 0, bushes: 0, grass: 0, flowers: 0, rocks: .8},
    sky: 'night', fog: {color: '#1d2a3a', near: 30, far: 160, height: {base: -2, falloff: 6, amount: .4}}, water: {deep: '#0f3a4a', shallow: '#3f8fa0'},
  },
  cloudtop: {
    palette: {grass: '#f4f1ea', rock: '#d9d4e4', snow: '#ffffff', path: '#e7d9b8', accent: '#f2c230'},
    terrain: {layers: [{pattern: 'snow', color: '#f1eef0'}, {pattern: 'snow', color: '#d8d6e6'}, {pattern: 'snow', color: '#ffffff'}], rockSlope: .6, highY: 8, highSoft: 6},
    vegetation: {trees: [], treeDensity: 0, bushes: 0, grass: 0, flowers: 0, rocks: 0},
    sky: 'goldenHour', fog: {color: '#f6e1c8', near: 140, far: 520, height: {base: -10, falloff: 18, amount: .5}}, water: null,
  },
  suburb: {
    palette: {grass: '#79a85a', rock: '#8c8a86', snow: '#d9d4c8', path: '#b8b2a6', accent: '#e4574a'},
    terrain: {layers: [{pattern: 'grass', color: '#79a85a'}, {pattern: 'dirt', color: '#9b8462'}, {pattern: 'moss', color: '#8db462'}], rockSlope: .72, highY: 40, highSoft: 8},
    vegetation: {trees: ['broadleaf', 'conifer'], treeDensity: .25, bushes: .6, grass: .8, flowers: .6, rocks: .05},
    sky: 'night', fog: {color: '#2a3d6e', near: 70, far: 300, height: {base: 0, falloff: 6, amount: .25}}, water: {deep: '#1d4a6a', shallow: '#4f8fae'},
  },
  downtown: {
    palette: {grass: '#6f9a55', rock: '#8a8a8a', snow: '#cfcfcf', path: '#9a958c', accent: '#2fb5a8'},
    terrain: {layers: [{pattern: 'concrete', color: '#b4b0a8'}, {pattern: 'cliff', color: '#8a8a8a'}, {pattern: 'grass', color: '#6f9a55'}], rockSlope: .75, highY: 60, highSoft: 8},
    vegetation: {trees: ['broadleaf'], treeDensity: .08, bushes: .2, grass: .2, flowers: .1, rocks: 0},
    sky: 'day', fog: {color: '#cfd8e2', near: 100, far: 380, height: {base: 0, falloff: 16, amount: .3}}, water: {deep: '#2a5a7a', shallow: '#6a9ab0'},
  },
  nightfield: {
    palette: {grass: '#4f7a4a', rock: '#5f6470', snow: '#a8b8d8', path: '#8a8070', accent: '#ffd36a'},
    terrain: {layers: [{pattern: 'grass', color: '#5a8a52'}, {pattern: 'rock', color: '#5f6470'}, {pattern: 'moss', color: '#4f7a4a'}], rockSlope: .74, highY: 30, highSoft: 8},
    vegetation: {trees: ['broadleaf', 'poplar'], treeDensity: .2, bushes: .4, grass: 1.1, flowers: .3, rocks: .1},
    sky: 'night', fog: {color: '#22355e', near: 60, far: 280, height: {base: 0, falloff: 5, amount: .35}}, water: {deep: '#13304a', shallow: '#3c6a8a'},
  },
};
export const BIOME_NAMES = Object.keys(BIOMES);
export const TREE_SPECIES = ['conifer', 'broadleaf', 'poplar', 'palm'];

// A world's environment settings from one biome (+ optional second biome for a far band) and overrides.
export function biome(name, overrides = {}) {
  const b = BIOMES[name]; if (!b) throw Error('unknown biome ' + name);
  return {name, ...b, ...overrides, terrain: {...b.terrain, ...(overrides.terrain ?? {})}, vegetation: {...b.vegetation, ...(overrides.vegetation ?? {})}, fog: {...b.fog, ...(overrides.fog ?? {})}};
}
