#!/usr/bin/env python3
"""Touch Grass E0: writes parts/locations/{dustTown,zombieCity,dragonPeaks,space}.json (parts/location.js format) and
anchors-touchgrass.json. Extensions (data only, read by the episode's world.js / scripts/v2/touchgrass-sheets.js):
  backdrop.hdri = a file in assets/hdri/ · looks{name: overrides} (shallow-merged over the location) · props[] = parts/sets4/props7.js
  builders placed {prop, at, rotY (deg), p} · parts with "bake": false skip the voxel bake (sky dressing, stars)."""
import json, math
OUT = 'parts/locations/'
def r(i, s=1):
    x = math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - math.floor(x)
def dump(name, d): json.dump(d, open(OUT + name, 'w'), indent=1)

# ---------------- Dust Town (real world) ----------------
props, anchors = [], {}
seats, seatYaw = [], []
# E0b: TOWN seated in irregular groups of 2-5 with gaps (40 seats), clear aisle |x| < 1.8 for NOVA; near layer = these crates + porches
GROUPS = [(-4.6, -5.2, 3), (4.2, -4.4, 2), (8.6, -7.6, 4), (-9.4, -8.8, 5), (-3.8, -11.6, 4), (4.6, -12.4, 5), (10.4, -15.6, 3),
          (-8.6, -16.8, 2), (-3.4, -20.2, 5), (5.2, -21.0, 3), (-10.4, -23.8, 4)]
assert sum(g[2] for g in GROUPS) == 40
for gi, (gx, gz, n) in enumerate(GROUPS):
    face = math.pi + (r(gi, 41) - .5) * .9                       # the group's facing (towards the camera +- 26 deg)
    for k in range(n):
        a = (k - (n - 1) / 2) * (1.05 + r(gi * 7 + k, 42) * .35)  # loose arc around the group centre
        x = gx + math.sin(a) * 1.9 + (r(gi * 7 + k, 43) - .5) * .5; z = gz + (1 - math.cos(a)) * 1.6 + (r(gi * 7 + k, 44) - .5) * .5
        if abs(x) < 1.8: x = math.copysign(1.8 + abs(x) * .2, gx)
        x, z = round(x, 2), round(z, 2); sz = round(1.15 + r(gi * 7 + k, 45) * .3, 2)
        props.append({"prop": "crate", "at": [x, 0, z], "rotY": round((r(gi * 7 + k, 46) - .5) * 40, 1), "p": {"size": sz}})
        seats.append([x, sz, z]); seatYaw.append(round(face - a * .6 + (r(gi * 7 + k, 47) - .5) * .5, 3))
shacks = []   # mid layer: shacks off-grid (the two porch shacks fixed), dead trees, a second power line
for i, z in enumerate([4, -12, -27, -41, -58, -73]):
    for s_ in (-1, 1):
        if (i, s_) in ((3, -1), (4, 1)): continue                  # gaps in the street wall
        jit = i > 1
        x = s_ * (17 + (r(i * 2 + (s_ > 0), 51) - .5) * 6 * jit); zz = z + (r(i * 2 + (s_ > 0), 52) - .5) * 5 * jit
        props.append({"prop": "shack", "at": [round(x, 2), 0, round(zz, 2)], "rotY": round(-90 * s_ + (r(i, 53) - .5) * 24 * jit, 1), "p": {"color": ["#7E7972", "#86817A", "#74706B"][(i + (s_ > 0)) % 3]}})
        shacks.append([round(x, 2), 0, round(zz, 2)])
props += [{"prop": "porch", "at": [12.0, 0, 4], "rotY": -90, "p": {}, "id": "novaPorch"},
          {"prop": "porch", "at": [-12.0, 0, -12], "rotY": 90, "p": {}, "id": "leoPorch"},
          {"prop": "deadTree", "at": [-7, 0, 16], "rotY": 20, "p": {"seed": 3}},
          {"prop": "deadTree", "at": [26, 0, -34], "rotY": 120, "p": {"seed": 7}},
          {"prop": "deadTree", "at": [-28, 0, -58], "rotY": 200, "p": {"seed": 11}},
          {"prop": "powerLine", "at": [-4, 0, 22], "rotY": 0, "p": {"span": 16, "h": 8}},
          {"prop": "birdhouse", "at": [-4 + 16 * .12, 8 - .22 - .9 * (1 - .24 ** 2), 22], "rotY": 0, "p": {}},
          {"prop": "crate", "at": [9.6, 0, 9.2], "rotY": 12, "p": {"size": 1.1}},
          {"prop": "crate", "at": [10.4, 0, 10.6], "rotY": -8, "p": {"size": .9}},
          {"prop": "crate", "at": [-10.4, 0, -6.5], "rotY": 30, "p": {"size": 1.2}},
          {"prop": "grassBlade", "at": [3, 0, 12], "rotY": 0, "p": {}, "id": "grass"},
          {"prop": "deadTree", "at": [13, 0, -24], "rotY": 60, "p": {"seed": 13}}, {"prop": "deadTree", "at": [-21, 0, -36], "rotY": 300, "p": {"seed": 17}},
          {"prop": "deadTree", "at": [8, 0, -48], "rotY": 160, "p": {"seed": 19}},
          {"prop": "powerLine", "at": [10, 0, -40], "rotY": 78, "p": {"span": 22, "h": 9, "sag": 1.2}}]
# far layer: broken building silhouettes fading into the fog (replaces the flat mesa blocks)
for i, (x, z, w, h) in enumerate([(-44, -110, 14, 14), (-20, -150, 18, 19), (8, -175, 16, 16), (30, -130, 12, 11), (54, -165, 20, 21), (-64, -185, 18, 15), (80, -120, 12, 10)]):
    props.append({"prop": "brokenBuilding", "at": [x, 0, z], "rotY": round((r(i, 61) - .5) * 40, 1), "p": {"w": w, "h": h, "d": 9, "seed": i + 1, "color": ["#5E5B57", "#56534F", "#625F5B"][i % 3]}})
dust = {
 "name": "dustTown", "note": "Touch Grass real world: gray, dry, overcast dust haze. Everything sat <= 0.15 except NOVA, the headset glow, the grass blade.",
 "groundY": 0, "backdrop": {"type": "groundedSkybox", "hdri": "quarry_01_1k.hdr", "height": 6, "radius": 420, "rotation": 0, "intensity": .62, "saturation": .08},
 "env": {"intensity": .75}, "exposure": .95, "toneMapping": "Neutral",
 "fog": {"color": "#9C9994", "near": 25, "far": 210},
 "sun": {"intensity": .7, "color": "#E4E2DE", "az": 200, "el": 55, "shadow": {"size": 1024}, "shadowOpacity": .25, "hemi": {"sky": "#C9C7C3", "ground": "#6E6A64", "i": .5}},
 "bake": {"cell": 1.0, "aoDist": 4, "aoMin": .5, "shadow": .55, "seg": 6},
 "materials": {"dirt": {"procedural": "dirt", "color": "#8A8884"}, "path": {"procedural": "mud", "color": "#7C7A77"}},
 "modules": {"ground": {"parts": [{"plane": [520, 520], "at": [0, 0, 0], "mat": "dirt"}]}, "street": {"parts": [{"box": [12, .04, 140], "at": [0, .02, -36], "mat": "path"}]}},
 "layout": [{"module": "ground", "at": [0, 0, 0]}, {"module": "street", "at": [0, 0, 0]}],
 "props": props,
 "looks": {
  "dustGray": {"note": "0-77.7 s: cold, flat, soft sun hidden", "exposure": .95, "env": {"intensity": .75}, "fog": {"color": "#9C9994", "near": 25, "far": 210},
               "sun": {"intensity": .7, "color": "#E4E2DE", "az": 200, "el": 55, "shadow": {"size": 1024}, "shadowOpacity": .22, "hemi": {"sky": "#C9C7C3", "ground": "#6E6A64", "i": .5}}},
  "dustGold": {"note": "77.74 s on: low warm sun from near the horizon (#FFB45A), long shadows, warm haze", "exposure": 1.4, "env": {"intensity": .8},
               "fog": {"color": "#C9A27A", "near": 18, "far": 190},
               "backdrop": {"type": "groundedSkybox", "hdri": "quarry_01_1k.hdr", "height": 6, "radius": 420, "rotation": 0, "intensity": .9, "saturation": .3, "tint": [1.22, .98, .72]},
               "sun": {"intensity": 5.5, "color": "#FFB45A", "az": 245, "el": 7, "shadow": {"size": 2048}, "shadowOpacity": .62, "hemi": {"sky": "#F0C890", "ground": "#7A6450", "i": .7}}}}}
dust.update({k: v for k, v in dust["looks"]["dustGray"].items() if k != "note"})
dump("dustTown.json", dust)
anchors["dustTown"] = {"seats40": seats, "seatYaw40": seatYaw, "novaPorchStep": [12.0 - 2.5, .9, 4], "leoChair": [-12.0 + 1.0, .9, -12], "grassBlade": [3, 0, 12],
  "novaWaterPatch": [4.2, 0, 11.4], "powerLineBirdhouse": [-2.08, 7.0, 22], "deadTree": [-7, 0, 16], "townCircle": {"centre": [3, 0, 12], "r": [5, 8.5, 12]},
  "rowsAisle": [[0, 0, 2], [0, 0, -22]], "shacks": shacks}

# ---------------- Zombie City (VR) ----------------
zc = {
 "extends": "../../engine/fixtures/realism/street-layout.json", "name": "zombieCity",
 "note": "Touch Grass VR 1: moonlit night (blue-gray key #8FA8D8), broken street (realism street modules); green only as height fog <= 2 units + 3 green streetlamps.",
 "backdrop": {"type": "sky", "top": "#141C32", "horizon": "#1B2A4A", "ground": "#141A24", "radius": 420},   # E2 (owner): sky bottom #1B2A4A
 "env": {"intensity": .8}, "exposure": 1.25, "toneMapping": "Neutral",
 "fog": {"color": "#1C2232", "near": 14, "far": 100},
 "sun": {"intensity": 2.4, "color": "#8FA8D8", "az": 20, "el": 25, "shadow": {"size": 1024}, "shadowOpacity": .55, "hemi": {"sky": "#5A6A8E", "ground": "#2A3040", "i": .8}},
 "bake": {"cell": .5, "aoDist": 4, "aoMin": .45, "shadow": .4, "seg": 1.5},
 "materials": {"ground": {"procedural": "cobble", "color": "#2C3038"}, "kerb": {"procedural": "plaster", "color": "#3A3E46"}, "brickWall": {"procedural": "brick", "color": "#4A3A3A"},
   "plasterWall": {"procedural": "plaster", "color": "#363B45"}, "base": {"procedural": "cobble", "color": "#2A2E35"}, "trim": {"color": "#555B66", "roughness": .7},
   "glass": {"color": "#1A2232", "roughness": .08, "metalness": 0}, "door": {"procedural": "woodPlanks", "color": "#33292A"}, "crate": {"procedural": "woodPlanks", "color": "#40363A"},
   "metal": {"color": "#22262A", "roughness": .45, "metalness": .6}, "lampGlass": {"color": "#B8FFB0", "emissive": "#7DFF8A", "roughness": .3}, "rubble": {"procedural": "rock", "color": "#44484E"}},
 "modules": {"lamp": {"parts": []},   # E0b: the base street's lamp is dropped; the 3 green lamps are props
             "rubble": {"parts": [{"box": [1.6, .8, 1.2], "at": [0, .4, 0], "rotY": 20, "mat": "rubble"}, {"box": [1.0, .6, .9], "at": [1.3, .3, .6], "rotY": -35, "mat": "rubble"}, {"box": [.7, .5, .7], "at": [-.9, .25, .9], "rotY": 50, "mat": "rubble"}]},
             "car": {"parts": [{"box": [2.2, 1.0, 4.4], "at": [0, .7, 0], "mat": "metal"}, {"box": [1.9, .8, 2.2], "at": [0, 1.6, -.3], "mat": "glass"}]}},
 "layout": [{"module": "rubble", "at": [-3, 0, -14]}, {"module": "rubble", "at": [4, 0, -30], "rotY": 80}, {"module": "rubble", "at": [-5, 0, -46], "rotY": 140},
            {"module": "car", "at": [5.2, 0, -20], "rotY": 14}, {"module": "car", "at": [-5.6, 0, -38], "rotY": -24}],
 "props": [{"prop": "groundFog", "at": [0, 0, -22], "rotY": 0, "p": {"w": 22, "d": 70, "h": 2, "color": "#4FCB6A", "opacity": .07}},
           {"prop": "streetLamp", "at": [-6.4, .32, -8], "rotY": 0, "p": {"intensity": 8}}, {"prop": "streetLamp", "at": [6.4, .32, -20], "rotY": 180, "p": {"intensity": 8}},
           {"prop": "streetLamp", "at": [-6.4, .32, -34], "rotY": 0, "p": {"intensity": 8}}]}
dump("zombieCity.json", zc)
anchors["zombieCity"] = {"zombies8": [[(-4.5 + (i % 4) * 3) + (r(i, 4) - .5), 0, -10 - (i // 4) * 4 - r(i, 5) * 2] for i in range(8)], "heroLow": [0, 0, -4],
  "bro": [2.4, 0, -4.4], "crackSky": [0, 60, -70], "fingerPoke": [0, 0, -14]}

# ---------------- Dragon Peaks (VR) ----------------
# E0b: jagged low-poly rock peaks (props7 rockPeak: seeded-noise cones, rock #5B4B45, snow above 70 %) at 3 distances; the centre far
# peak keeps the boss perch (apex = bossPeak). Plateau = props7 rockMesa (flat top y 0, r 26). No cylinders.
PEAKS = [(-150, -170, 130, 1), (140, -200, 110, 2),                          # near
         (-250, -340, 240, 3), (230, -380, 270, 4), (95, -320, 190, 5),     # mid
         (-10, -430, 414.3, 6), (-420, -520, 330, 7)]                       # far (index 5 = boss perch)
peaks, lay = [], [{"module": "valley", "at": [0, -40, 0]}]
peakProps = [{"prop": "rockPeak", "at": [x, -40, z], "rotY": round(i * 37 % 360), "p": {"h": h, "r": round(h * (.26 if i == 5 else .42), 1), "seed": sd, "snow": .65}} for i, (x, z, h, sd) in enumerate(PEAKS)]
peaks = [[x, -40 + h, z] for x, z, h, _ in PEAKS]
dp = {
 "name": "dragonPeaks", "note": "Touch Grass VR 2: sunset, jagged rock peaks (props7 rockPeak) at 3 distances in sunset fog, one flat rock plateau (rockMesa r 26, top y 0) for 100 friends.",
 "groundY": 0, "backdrop": {"type": "sky", "top": "#2B3A6B", "horizon": "#F08A4B", "ground": "#4A3A5A", "radius": 420},   # E2 (owner): no HDRI (it showed city buildings);
                                                                                         # procedural sunset dome (world.js keeps it on the camera) + sun disc
 "env": {"intensity": 1.0}, "exposure": 1.0, "toneMapping": "Neutral",
 "fog": {"color": "#E0906A", "near": 160, "far": 1600},
 "sun": {"intensity": 2.6, "color": "#FFB070", "az": 215, "el": 16, "minEl": 14, "shadow": {"size": 1024}, "shadowOpacity": .5, "hemi": {"sky": "#FFC8A0", "ground": "#6A5A7A", "i": .7}},
 "bake": {"cell": 2.0, "aoDist": 6, "aoMin": .5, "shadow": .45, "seg": 8},
 "materials": {"rock": {"procedural": "rock", "color": "#9A7A6A"}, "rockLt": {"procedural": "rock", "color": "#B8968A"}, "snow": {"procedural": "snow", "color": "#FFF4EC"},
   "grass": {"procedural": "grass", "color": "#7BC85A"}, "plateau": {"procedural": "rock", "color": "#A88A78"}},
 "modules": {"valley": {"parts": [{"plane": [1400, 1400], "at": [0, 0, 0], "mat": "grass"}]}},
 "layout": lay, "props": [{"prop": "rockMesa", "at": [0, 0, 0], "rotY": 0, "p": {"r": 40, "h": 40}, "id": "plateau"}, {"prop": "swordStone", "at": [0, 0, -14], "rotY": 0, "p": {}}] + peakProps}
dump("dragonPeaks.json", dp)
anchors["dragonPeaks"] = {"plateauCentre": [0, 0, 0], "plateauR": 39, "friends100": [[round(math.cos(a) * rr, 2), 0, round(math.sin(a) * rr, 2)] for i in range(100) for rr in [5 + (i % 5) * 3.6] for a in [i * 2.399963]],
  "leoVR": [0, 0, 0], "swordStone": [0, 0, -14], "bossPeak": peaks[5], "dragonFlyPath": [[-140, 40, -100], [140, 55, -110]], "bossBottom": [-20, -40, -150]}

# ---------------- Space (VR) ----------------
sp = {
 "name": "space", "note": "Touch Grass VR 3: near-black navy dome, 2400 point stars in 3 sizes, glowing sunSphere (core + additive glow), far ringed planet, ships x2.5 (props7).",
 "groundY": 0, "backdrop": {"type": "sky", "top": "#10163A", "horizon": "#1C2450", "ground": "#05060F", "radius": 420},
 "env": {"intensity": 1.2}, "exposure": 1.0, "toneMapping": "Neutral",
 "sun": {"intensity": 2.4, "color": "#FFE2B0", "az": 70, "el": 10, "shadow": {"size": 1024}, "shadowOpacity": 0, "hemi": {"sky": "#6A7AC0", "ground": "#3A3060", "i": 1.1}},
 "bake": {"cell": 2.0, "aoDist": 4, "aoMin": .5, "shadow": .5, "seg": 8},
 "materials": {}, "modules": {}, "layout": [],
 "props": [{"prop": "starField", "at": [0, 0, 0], "rotY": 0, "p": {"n": 2400, "r": 380}},
           {"prop": "sunSphere", "at": [180, 20, -260], "rotY": 0, "p": {"r": 55}, "id": "sun"},
           {"prop": "ringPlanet", "at": [-230, 70, -330], "rotY": 0, "p": {"r": 26}},
           {"prop": "spaceship", "at": [0, 0, 0], "rotY": 0, "scale": 2.5, "p": {}, "id": "leoShip"},
           {"prop": "spaceship", "at": [-24, 8, -50], "rotY": 30, "scale": 2.5, "p": {"color": "#8A2A2A", "accent": "#2A2A2A"}},
           {"prop": "spaceship", "at": [28, -6, -72], "rotY": -40, "scale": 2.5, "p": {"color": "#8A2A2A", "accent": "#2A2A2A"}}]}
dump("space.json", sp)
anchors["space"] = {"leoShip": [0, 0, 0], "leoOnShip": [0, 1.25, -2.6], "sun": [180, 20, -260], "planet": [-230, 70, -330], "enemies": [[-24, 8, -50], [28, -6, -72]], "crack": [0, 30, -90]}
anchors["shots"] = {"dustTown": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 23, 24, 30, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61],
  "zombieCity": [15, 16, 25, 26, 27, 28, 29, 31], "dragonPeaks": [17, 18, 21, 22, 36, 37, 38, 39, 40, 41], "space": [19, 20, 32, 33, 34, 35],
  "looks": {"dustGray": [1, 55], "dustGold": [55, 61], "switchAt": 77.74}}
json.dump({"note": "Touch Grass anchors per BEATS shot group (world units; y = standing/seat height). E1 places actors and cameras from these.", **anchors}, open(OUT + "anchors-touchgrass.json", "w"), indent=1)
print('ok', len(props), 'dust props')
