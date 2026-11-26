#!/usr/bin/env python3
"""Touch Grass E0: writes cast/touchgrass.json (toyhouse.json format: body v5, faces v5, hair v4; recolor + existing accessories).
Real-world people (LEO, TOWN) keep saturation <= 0.15 on every colour (BEATS look rule); NOVA, the headset glow and the grass are
the only saturated things in Dust Town. `vrHeadset` (on|off) = the props7 headset (parts/sets4/props7.js attachHeadset)."""
import json, colorsys
FB = [0.9, 0.03]
def sat(h):
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)); return colorsys.rgb_to_hsv(r, g, b)[1]
def kid(skin, face, torso, arms_upper, legs, shoes, hair=None, acc=None, role='', lower=None, split=0.85, bands=None, shoeFrac=0.15, build='youth', scale=0.84, age=11, extra=None, **tor):
    c = {"tier": "hero", "body": "v5", "faceStyle": "v5", "faceBox": FB, "skin": skin, "scale": scale, "build": build, "age": age,
         "hair": hair, "face": face, "role": role,
         "regions": {"torso": {"main": torso, **tor}, "arms": {"upper": arms_upper, "lower": lower or skin, "split": split},
                     "legs": {"main": legs, "shoes": shoes, "shoeFrac": shoeFrac}}}
    if bands: c["regions"]["bands"] = bands
    if acc: c["accessories"] = acc
    if build != 'youth': c.pop("scale"); c["age"] = age
    if extra: c.update(extra)
    return c
H = lambda style, color: {"style": style, "color": color, "v": 4}
cast = {}
LEO_SKIN = '#CFC0B2'   # desaturated (sat .14): Leo lives in the gray world
cast["LEO"] = kid(LEO_SKIN, "unimpressed", "#8A8D92", "#8A8D92", "#4A4C50", "#2B2B2D", H("messy_fringe", "#57504A"),
    role="Leo, 11: gray hoodie, dark gray pants (real world); vrHeadset on except shot 42+", split=0.92, strip="#8A8D92", stripW=0.3,
    lapel="#7C7F84", lapelW=0.12, edge="#77797D", edgeW=0.05, extra={"vrHeadset": "on"})
cast["LEO_NOHEADSET"] = dict(cast["LEO"], vrHeadset="none", face="o_small", role="Leo after he rips the headset off (42+)")
TRIM = '#49D9FF'
cast["LEO_VR"] = kid(LEO_SKIN, "grin", "#1F3A6B", "#1F3A6B", "#1A2F57", "#15203A", H("messy_fringe", "#57504A"),
    role="Leo in VR: navy armor plates, light-blue glowing trim, cyan visor band (props7 armor piece leo: headset shape, .02 gap, E1), glowing sword (tool)", split=0.95,
    strip=TRIM, stripW=0.12, lapel="#2A4A82", lapelW=0.16, edge=TRIM, edgeW=0.05,
    bands=[   # E1 stability: the y .62 torso band sat 1 % inside the armor chest plate (near-coplanar flicker); the plate carries the trim
           {"part": "torso", "y": -0.78, "h": 0.12, "w": 2.12, "d": 1.12, "color": TRIM, "emissive": TRIM},
           {"part": "leftArm", "y": 0.7, "h": 0.4, "w": 1.12, "d": 1.12, "color": "#2A4A82"},
           {"part": "rightArm", "y": 0.7, "h": 0.4, "w": 1.12, "d": 1.12, "color": "#2A4A82"}],
    extra={"tool": {"name": "sword"}, "glowSword": TRIM})
cast["NOVA"] = kid("#F2C59B", "calm", "#FFC21A", "#FFC21A", "#FFC21A", "#D93A2B", H("high_ponytail", "#6B4428"),
    role="Nova, 11: yellow raincoat, red boots, brown ponytail; carries the watering can (props7 wateringCan)", split=0.93, shoeFrac=0.3,
    strip="#FFC21A", stripW=0.1, lapel="#F0B000", lapelW=0.1, edge="#E6AA10", edgeW=0.04, extra={"prop": "wateringCan"})
cast["BRO"] = kid("#C08457", "stare_o", "#E8742A", "#E8742A", "#3A3D44", "#22242A", None,
    role="Bro (VR friend): round orange helmet + dark visor (head bands + goggles), chunky armor", split=0.95,
    strip="#3A3D44", stripW=0.3, lapel="#C95E1C", lapelW=0.16, edge="#22242A", edgeW=0.06,
    acc=[{"name": "goggles", "color": "#22242A", "accent": "#1A1C22"}],
    bands=[{"part": "head", "y": 0.36, "h": 0.34, "w": 1.36, "d": 1.24, "color": "#E8742A"},
           {"part": "torso", "y": 0.5, "h": 0.5, "w": 2.24, "d": 1.2, "color": "#C95E1C"},
           {"part": "leftArm", "y": 0.66, "h": 0.5, "w": 1.2, "d": 1.2, "color": "#E8742A"},
           {"part": "rightArm", "y": 0.66, "h": 0.5, "w": 1.2, "d": 1.2, "color": "#E8742A"}])
F = {
 "KNIGHT": ("#E0A77A", "#7A8494", "#9AA3B0", "#4A5260", [{"name": "helmet", "color": "#9AA3B0", "accent": "#C0392B"}], None, "horned knight (steel helmet + red plume)"),
 "ROBOT":  ("#B8BEC6", "#C9CED6", "#DDE2E8", "#8E959E", [{"name": "helmet", "color": "#E6EAF0"}], None, "chrome robot"),
 "NINJA":  ("#C9A982", "#1E2026", "#1E2026", "#1E2026", [{"name": "skiMask", "color": "#1E2026", "accent": "#D93A2B"}], None, "ninja"),
 "ASTRO":  ("#F2C59B", "#F4F4F4", "#F4F4F4", "#D8DCE2", [], H("buzz", "#2E1A12"), "astronaut"),
 "PIRATE": ("#A86A48", "#8C1F2A", "#8C1F2A", "#2B2B2F", [], H("shaggy_mop", "#2E1A12"), "pirate captain"),
 "MAGE":   ("#E0B48E", "#6A3FB0", "#7E52C8", "#3A2470", [{"name": "hood", "color": "#8A5CE0"}, {"name": "cape", "color": "#4FD6E8"}], None, "crystal mage"),
}
# E0b armor (props7.js armor(): primitives on the body v5 parts, no new rigs): one emissive trim colour + one signature piece each
ARMOR = {"KNIGHT": ("#FF3B30", "horns"), "ROBOT": ("#FF8A1F", "visor"), "NINJA": ("#B04DFF", "scarf"), "ASTRO": ("#FFFFFF", "bubble"),
         "PIRATE": ("#F2C230", "tricorn"), "MAGE": ("#9D6BFF", "staff")}
for k, (skin, torso, arm, legs, acc, hair, role) in F.items():
    cast["FRIEND_" + k] = kid(skin, "grin", torso, arm, legs, "#22242A", hair, acc=acc, role="VR friend: " + role, split=0.95,
        strip=arm, stripW=0.2, lapel=torso, lapelW=0.1, edge=legs, edgeW=0.05)
    cast["FRIEND_" + k]["armor"] = {"trim": ARMOR[k][0], "piece": ARMOR[k][1], "plate": torso}
cast["LEO_VR"]["armor"] = {"trim": "#49D9FF", "piece": "leo", "plate": "#1F3A6B"}
ZS = '#7FB069'
for i in range(8):
    shirt = ["#6E6E6E", "#7A7A78", "#5E5F60", "#888886", "#6A6866", "#727474", "#5A5A58", "#808080"][i]
    pants = ["#4A4A4A", "#3E3F40", "#55524E", "#454545", "#4E4C4A", "#3A3A3A", "#504E4C", "#474849"][i]
    hair = [H("shaggy_mop", "#3A3A30"), None, H("messy_fringe", "#4A4030"), H("buzz", "#3A3A30"), H("wolf_cut", "#504836"), H("bald", "#000000"), H("curtains", "#3A3A30"), H("spiky_crop", "#4A4030")][i]
    if hair and hair["style"] == "bald": hair = None
    build = ["adult_m", "adult_f", "adult_m", "adult_m", "adult_f", "elder_m", "adult_m", "youth"][i]
    cast[f"ZOMBIE_{i + 1}"] = kid(ZS, ["unimpressed", "stare_o", "flat_meh", "o_small", "side_eye", "unimpressed", "stare_o", "flat_meh"][i], shirt, shirt, pants, "#2B2B2D", hair,
        role="zombie (pose zombie): green skin, torn gray clothes", split=0.45 + 0.05 * (i % 3), build=build, age=11 if build == 'youth' else 40,
        bands=[{"part": "torso", "y": -0.82, "h": 0.18, "w": 2.1, "d": 1.1, "color": ZS}, {"part": "leftLeg", "y": -0.5, "h": 0.25, "w": 1.1, "color": ZS}])
for i in range(6):
    skin = ["#C9BCB0", "#BBAEA2", "#D2C6BA", "#A99C90", "#C4B8AE", "#B5A89C"][i]
    shirt = ["#7D7F82", "#8E8E8C", "#6C6D70", "#9A9896", "#76787A", "#858583"][i]
    pants = ["#4E5054", "#5A5856", "#45474A", "#626060", "#505050", "#4A4846"][i]
    hair = [H("side_part", "#4A4846"), H("wavy_bob", "#5A5652"), H("buzz", "#3E3C3A"), H("sleek_long", "#6A6662"), H("quiff", "#4E4C48"), H("messy_bun", "#625E5A")][i]
    build = ["adult_m", "adult_f", "elder_m", "adult_f", "youth", "elder_f"][i]
    cast[f"TOWN_{i + 1}"] = kid(skin, ["flat_meh", "unimpressed", "flat_meh", "calm", "o_small", "flat_meh"][i], shirt, shirt, pants, "#2B2B2D", hair,
        role="townsperson (gray, headset on, seated on crates/porch steps; never walking)", split=0.6, build=build, age=[38, 34, 70, 29, 12, 72][i],
        extra={"vrHeadset": "on"})
for k, c in cast.items():   # real-world saturation rule
    if k.startswith(("LEO", "TOWN")) and k != "LEO_VR":
        cols = [c["skin"]] + [v for r in c["regions"].values() if isinstance(r, dict) for v in r.values() if isinstance(v, str) and v.startswith('#')] + ([c["hair"]["color"]] if c.get("hair") else [])
        bad = [x for x in cols if sat(x) > 0.15 + 1e-9]; assert not bad, (k, bad)
json.dump({"note": "Touch Grass cast (E0): body v5, faces v5, hair v4; generated by scripts/v2/touchgrass-cast.py. Real-world LEO/TOWN colours have saturation <= 0.15; NOVA skin #F2C59B, raincoat #FFC21A, boots #D93A2B; LEO_VR trim emissive #49D9FF (regions.bands emissive, opt-in). BOSS = avatar-style/dragon.js (dark purple, see cast.BOSS).",
           "cast": cast, "BOSS": {"builder": "avatar-style/dragon.js buildDragon", "scale": 2.4, "colors": {"body": "#4A2C6E", "dark": "#341E52", "belly": "#8E6BB8", "wing": "#2A1840", "wingDk": "#1C1030", "eye": "#FFD23A"}, "states": ["perch", "roar", "flinch", "cry", "fly"]}},
          open('cast/touchgrass.json', 'w'), indent=1)
print(len(cast), 'cast')
