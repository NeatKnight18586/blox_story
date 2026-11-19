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
seats = []
for row in range(5):
    for col in range(8):
        x, z = -8.4 + col * 2.4, -6 - row * 3.4
        props.append({"prop": "crate", "at": [x, 0, z], "rotY": round((r(row * 8 + col) - .5) * 14, 1), "p": {"size": 1.3}})
        seats.append([x, 1.3, z])
shacks = []
for i, z in enumerate([4, -12, -28, -44, -60, -76]):
    for s in (-1, 1):
        x = s * 17
        props.append({"prop": "shack", "at": [x, 0, z], "rotY": -90 * s, "p": {"color": ["#7E7972", "#86817A", "#74706B"][(i + (s > 0)) % 3]}})
        shacks.append([x, 0, z])
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
          {"prop": "grassBlade", "at": [3, 0, 12], "rotY": 0, "p": {}, "id": "grass"}]
mesa = {"parts": [{"box": [60, 26, 30], "at": [0, 13, 0], "mat": "mesa"}, {"box": [40, 12, 22], "at": [-12, 32, 2], "mat": "mesa"}]}
dust = {
 "name": "dustTown", "note": "Touch Grass real world: gray, dry, overcast dust haze. Everything sat <= 0.15 except NOVA, the headset glow, the grass blade.",
 "groundY": 0, "backdrop": {"type": "groundedSkybox", "hdri": "quarry_01_1k.hdr", "height": 6, "radius": 420, "rotation": 0, "intensity": .62, "saturation": .08},
 "env": {"intensity": .75}, "exposure": .95, "toneMapping": "Neutral",
 "fog": {"color": "#9C9994", "near": 25, "far": 210},
 "sun": {"intensity": .7, "color": "#E4E2DE", "az": 200, "el": 55, "shadow": {"size": 1024}, "shadowOpacity": .25, "hemi": {"sky": "#C9C7C3", "ground": "#6E6A64", "i": .5}},
 "bake": {"cell": 1.0, "aoDist": 4, "aoMin": .5, "shadow": .55, "seg": 6},
 "materials": {"dirt": {"procedural": "dirt", "color": "#8E877E"}, "mesa": {"procedural": "rock", "color": "#8A8580"}, "path": {"procedural": "mud", "color": "#7F7972"}},
 "modules": {"ground": {"parts": [{"plane": [520, 520], "at": [0, 0, 0], "mat": "dirt"}]}, "street": {"parts": [{"box": [12, .04, 140], "at": [0, .02, -36], "mat": "path"}]}, "mesa": mesa},
 "layout": [{"module": "ground", "at": [0, 0, 0]}, {"module": "street", "at": [0, 0, 0]},
            {"module": "mesa", "at": [-60, 0, -200], "rotY": 10}, {"module": "mesa", "at": [70, 0, -230], "rotY": -15, "scale": [1.3, .8, 1]}, {"module": "mesa", "at": [0, 0, -260], "scale": [1.6, .6, 1]}],
 "props": props,
 "looks": {
  "dustGray": {"note": "0-77.7 s: cold, flat, soft sun hidden", "exposure": .95, "env": {"intensity": .75}, "fog": {"color": "#9C9994", "near": 25, "far": 210},
               "sun": {"intensity": .7, "color": "#E4E2DE", "az": 200, "el": 55, "shadow": {"size": 1024}, "shadowOpacity": .22, "hemi": {"sky": "#C9C7C3", "ground": "#6E6A64", "i": .5}}},
  "dustGold": {"note": "77.74 s on: warm, low sun breaking through, long shadows", "exposure": 1.0, "env": {"intensity": .6}, "fog": {"color": "#ABA59C", "near": 30, "far": 230},
               "backdrop": {"type": "groundedSkybox", "hdri": "quarry_01_1k.hdr", "height": 6, "radius": 420, "rotation": 0, "intensity": .72, "saturation": .08, "tint": [1.03, 1.0, .95]},
               "sun": {"intensity": 2.6, "color": "#F7D6AE", "az": 245, "el": 11, "shadow": {"size": 1024}, "shadowOpacity": .6, "hemi": {"sky": "#D2CCC2", "ground": "#6E6862", "i": .35}}}}}
dust.update({k: v for k, v in dust["looks"]["dustGray"].items() if k != "note"})
dump("dustTown.json", dust)
anchors["dustTown"] = {"seats40": seats, "novaPorchStep": [12.0 - 2.5, .9, 4], "leoChair": [-12.0 + 1.0, .9, -12], "grassBlade": [3, 0, 12],
  "novaWaterPatch": [4.2, 0, 11.4], "powerLineBirdhouse": [-2.08, 7.0, 22], "deadTree": [-7, 0, 16], "townCircle": {"centre": [3, 0, 12], "r": [5, 8.5, 12]},
  "rowsAisle": [[0, 0, 2], [0, 0, -22]], "shacks": shacks}

# ---------------- Zombie City (VR) ----------------
zc = {
 "extends": "../../engine/fixtures/realism/street-layout.json", "name": "zombieCity",
 "note": "Touch Grass VR 1: night, green fog, broken street (realism street modules), dark palette.",
 "backdrop": {"type": "sky", "top": "#0B1A14", "horizon": "#2F5A3C", "ground": "#1A2A20", "radius": 420},
 "env": {"intensity": 1.0}, "exposure": 1.3, "toneMapping": "Neutral",
 "fog": {"color": "#2E5236", "near": 12, "far": 120},
 "sun": {"intensity": 1.1, "color": "#A8F0B8", "az": 160, "el": 38, "shadow": {"size": 1024}, "shadowOpacity": .5, "hemi": {"sky": "#5AA86E", "ground": "#22301F", "i": .95}},
 "bake": {"cell": .5, "aoDist": 4, "aoMin": .45, "shadow": .4, "seg": 1.5},
 "materials": {"ground": {"procedural": "cobble", "color": "#4A5248"}, "kerb": {"procedural": "plaster", "color": "#565C54"}, "brickWall": {"procedural": "brick", "color": "#5A3A32"},
   "plasterWall": {"procedural": "plaster", "color": "#4C5650"}, "base": {"procedural": "cobble", "color": "#3E423C"}, "trim": {"color": "#5E665E", "roughness": .7},
   "glass": {"color": "#0E1A12", "roughness": .08, "metalness": 0}, "door": {"procedural": "woodPlanks", "color": "#3A2A20"}, "crate": {"procedural": "woodPlanks", "color": "#4A3A2A"},
   "metal": {"color": "#22262A", "roughness": .45, "metalness": .6}, "lampGlass": {"color": "#B8FFB0", "emissive": "#7DFF8A", "roughness": .3}, "rubble": {"procedural": "rock", "color": "#4A4E48"}},
 "modules": {"rubble": {"parts": [{"box": [1.6, .8, 1.2], "at": [0, .4, 0], "rotY": 20, "mat": "rubble"}, {"box": [1.0, .6, .9], "at": [1.3, .3, .6], "rotY": -35, "mat": "rubble"}, {"box": [.7, .5, .7], "at": [-.9, .25, .9], "rotY": 50, "mat": "rubble"}]},
             "car": {"parts": [{"box": [2.2, 1.0, 4.4], "at": [0, .7, 0], "mat": "metal"}, {"box": [1.9, .8, 2.2], "at": [0, 1.6, -.3], "mat": "glass"}]}},
 "layout": [{"module": "rubble", "at": [-3, 0, -14]}, {"module": "rubble", "at": [4, 0, -30], "rotY": 80}, {"module": "rubble", "at": [-5, 0, -46], "rotY": 140},
            {"module": "car", "at": [5.2, 0, -20], "rotY": 14}, {"module": "car", "at": [-5.6, 0, -38], "rotY": -24}],
 "props": []}
dump("zombieCity.json", zc)
anchors["zombieCity"] = {"zombies8": [[(-4.5 + (i % 4) * 3) + (r(i, 4) - .5), 0, -10 - (i // 4) * 4 - r(i, 5) * 2] for i in range(8)], "heroLow": [0, 0, -4],
  "bro": [2.4, 0, -4.4], "crackSky": [0, 60, -70], "fingerPoke": [0, 0, -14]}

# ---------------- Dragon Peaks (VR) ----------------
pk = {"parts": []}
TIERS = [(30, 24, "rock"), (24, 22, "rock"), (18, 20, "rockLt"), (12.5, 18, "rockLt"), (8, 14, "snow"), (4.2, 10, "snow")]
for k, (rr, hh, m) in enumerate(TIERS):
    pk["parts"].append({"cyl": [rr, hh], "at": [(k % 2) * 1.5, sum(h for _, h, _ in TIERS[:k]) + hh / 2, (k % 3) * -1.2], "mat": m})
peaks, lay = [], [{"module": "valley", "at": [0, -40, 0]}, {"module": "plateau", "at": [0, 0, 0]}]
for i, (x, z, s) in enumerate([(-160, -300, 1.6), (150, -340, 2.0), (-10, -430, 2.8), (290, -250, 1.4), (-300, -220, 1.5), (60, -260, 1.1)]):
    lay.append({"module": "peak", "at": [x, -40, z], "rotY": i * 37, "scale": [s, s * (1.05 + r(i) * .4), s]}); peaks.append([x, -40 + 108 * s * (1.05 + r(i) * .4), z])
dp = {
 "name": "dragonPeaks", "note": "Touch Grass VR 2: sunset peaks (stepped block tiers, data-only: the loader has no landform), one flat plateau (r 26, top y 0) for 100 friends.",
 "groundY": 0, "backdrop": {"type": "hdri", "hdri": "venice_sunset_1k.hdr", "rotation": 0},
 "env": {"intensity": 1.0}, "exposure": 1.0, "toneMapping": "Neutral",
 "fog": {"color": "auto", "k": .8, "near": 80, "far": 520},
 "sun": {"intensity": 2.6, "color": "#FFB070", "minEl": 14, "shadow": {"size": 1024}, "shadowOpacity": .5, "hemi": {"sky": "#FFC8A0", "ground": "#5A4A6A", "i": .4}},
 "bake": {"cell": 2.0, "aoDist": 6, "aoMin": .5, "shadow": .45, "seg": 8},
 "materials": {"rock": {"procedural": "rock", "color": "#9A7A6A"}, "rockLt": {"procedural": "rock", "color": "#B8968A"}, "snow": {"procedural": "snow", "color": "#FFF4EC"},
   "grass": {"procedural": "grass", "color": "#7BC85A"}, "plateau": {"procedural": "rock", "color": "#A88A78"}},
 "modules": {"peak": pk, "valley": {"parts": [{"plane": [1400, 1400], "at": [0, 0, 0], "mat": "grass"}]},
   "plateau": {"parts": [{"cyl": [26, 40], "at": [0, -20.2, 0], "mat": "plateau"}, {"cyl": [25.6, .4], "at": [0, -.2, 0], "mat": "grass"}]}},
 "layout": lay, "props": [{"prop": "swordStone", "at": [0, 0, -14], "rotY": 0, "p": {}}]}
dump("dragonPeaks.json", dp)
anchors["dragonPeaks"] = {"plateauCentre": [0, 0, 0], "plateauR": 25, "friends100": [[round(math.cos(a) * rr, 2), 0, round(math.sin(a) * rr, 2)] for i in range(100) for rr in [5 + (i % 5) * 3.6] for a in [i * 2.399963]],
  "leoVR": [0, 0, 0], "swordStone": [0, 0, -14], "bossPeak": peaks[2], "dragonFlyPath": [[-140, 40, -100], [140, 55, -110]], "bossBottom": [-20, -40, -150]}

# ---------------- Space (VR) ----------------
stars = {"parts": []}
for i in range(150):
    u, v = r(i, 21), r(i, 22); th = 2 * math.pi * u; ph = math.acos(2 * v - 1); R = 300; sz = .6 + 1.4 * r(i, 23)
    stars["parts"].append({"box": [sz, sz, sz], "at": [round(R * math.sin(ph) * math.cos(th), 1), round(R * math.cos(ph), 1), round(R * math.sin(ph) * math.sin(th), 1)], "mat": "star" if i % 5 else "starBlue", "bake": False, "live": True})
sp = {
 "name": "space", "note": "Touch Grass VR 3: black starfield dome (near-black navy, never pure black), no ground, the big sunSphere (props7).",
 "groundY": 0, "backdrop": {"type": "sky", "top": "#070A1C", "horizon": "#141A3A", "ground": "#05060F", "radius": 420},
 "env": {"intensity": .6}, "exposure": 1.0, "toneMapping": "Neutral",
 "sun": {"intensity": 2.4, "color": "#FFE2B0", "az": 70, "el": 10, "shadow": {"size": 1024}, "shadowOpacity": 0, "hemi": {"sky": "#5A6AB0", "ground": "#1A1030", "i": .5}},
 "bake": {"cell": 2.0, "aoDist": 4, "aoMin": .5, "shadow": .5, "seg": 8},
 "materials": {"star": {"color": "#FFFFFF", "emissive": "#FFFFFF"}, "starBlue": {"color": "#BFD8FF", "emissive": "#9CC4FF"}},
 "modules": {"stars": stars}, "layout": [{"module": "stars", "at": [0, 0, 0]}],
 "props": [{"prop": "sunSphere", "at": [180, 20, -260], "rotY": 0, "p": {"r": 55}, "id": "sun"},
           {"prop": "spaceship", "at": [0, 0, 0], "rotY": 0, "p": {}, "id": "leoShip"},
           {"prop": "spaceship", "at": [-14, 4, -30], "rotY": 30, "p": {"color": "#8A2A2A", "accent": "#2A2A2A"}},
           {"prop": "spaceship", "at": [16, -3, -44], "rotY": -40, "p": {"color": "#8A2A2A", "accent": "#2A2A2A"}}]}
dump("space.json", sp)
anchors["space"] = {"leoShip": [0, 0, 0], "sun": [180, 20, -260], "enemies": [[-14, 4, -30], [16, -3, -44]], "crack": [0, 30, -90]}
anchors["shots"] = {"dustTown": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 23, 24, 30, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61],
  "zombieCity": [15, 16, 25, 26, 27, 28, 29, 31], "dragonPeaks": [17, 18, 21, 22, 36, 37, 38, 39, 40, 41], "space": [19, 20, 32, 33, 34, 35],
  "looks": {"dustGray": [1, 55], "dustGold": [55, 61], "switchAt": 77.74}}
json.dump({"note": "Touch Grass anchors per BEATS shot group (world units; y = standing/seat height). E1 places actors and cameras from these.", **anchors}, open(OUT + "anchors-touchgrass.json", "w"), indent=1)
print('ok', len(props), 'dust props')
