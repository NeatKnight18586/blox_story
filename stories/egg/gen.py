#!/usr/bin/env python3
"""stories/egg/gen.py — writes stories/egg/episode.json from the shot table below (stories/egg/beats.md, cues.json).
  python3 stories/egg/gen.py
Cuts sit on cues.json phrase onsets (beat shots on word onsets); positions come from the world's ground plan
(stories/egg/world.js): square at the origin, bases on r 47 (base i at angle (i + .5)/12 turn), clock tower (0,-22),
town hall (-22,-30) turned .5 rad, bedroom (160,0,160), cloud nest (0,118,-240). Season 1: no labels, captions v3, sfx.
"""
import json, math, os

HERE = os.path.dirname(__file__)
CUES = json.load(open(os.path.join(HERE, 'cues.json')))
W = {(l['line'], i): w for l in CUES['lines'] for i, w in enumerate(l['words'])}
on = lambda line, i=0: round(W[(line, i)]['start'], 3)
END = round(max(CUES['duration'] + 2.5, 122.5), 3)
NEST = [0, 118, -240]; ROOM = [160, .4, 160]


def base(i):
    a = (i + .5) / 12 * 2 * math.pi; c = [47 * math.sin(a), 47 * math.cos(a)]; n = [-math.sin(a), -math.cos(a)]; s = [-math.cos(a), math.sin(a)]
    y = .4 + (i % 3) * .3
    nest = [c[0] + s[0] * 3.2 + n[0] * 5.8, y + 1.05, c[1] + s[1] * 3.2 + n[1] * 5.8]
    return {'c': c, 'n': n, 's': s, 'y': y, 'nest': nest, 'front': [c[0] + n[0] * 9, c[1] + n[1] * 9]}


def yaw_to(p, q):   # actor at p faces q (degrees; the actor's front is +z)
    return round(math.degrees(math.atan2(q[0] - p[0], q[-1] - p[-1])), 1)


def r(v): return [round(x, 2) for x in v]


def cam(pos, tgt, fov=40): return {'position': r(pos), 'target': r(tgt), 'fov': fov}


def sq(x, z): return {'at': 'square', 'offset': [x, 0, z]}


B = [base(i) for i in range(12)]
CLOCK = [0, 29, -18.2]; NBV = [math.sin(.5), math.cos(.5)]; BOARD = [-18.1, 7.6, -22.9]; VANE = [-23.5, 18.3, -28.5]; CLAWS = [0, 35, -18.8]; PLAIN = [9, -9]

NB = lambda d: [BOARD[0] + NBV[0] * d, BOARD[1] + .3, BOARD[2] + NBV[1] * d]
# ---- shot table -----------------------------------------------------------------------------------------------------------
S = []
def shot(id, at, size, move, loc, why, **k):
    if not k.get('see'): k['see'] = [k.get('clueObject') or 'the place']   # `see` names what the frame shows (objects allowed)
    S.append({'id': id, 'at': at, 'size': size, 'loc': 'town' if loc in ('square', 'bases', 'kitbase') else loc, 'move': move, 'why': why, **k})   # the square, the bases and Kit's base are one place: the town

DRONE = {'path': [[6, 44, 118], [3, 32, 78], [0, 22, 48], [0, 17, 32]], 'targets': [[0, 4, 10], [0, 8, -4], [0, 12, -16]]}
# B1 rule ---------------------------------------------------------------------------------------------------------------------
shot('S01-town', 0.0, 'wide', 'drone', 'square', 'Frame 0: the base town at night, every base glowing its egg colour, kids sprinting between them.',
     openHit=True, spectacle=True, see=['kit'], **{'from': {'fov': 52}}, **DRONE, shadowRadius=80)
shot('S02-kit', on(2), 'close', 'snap', 'square', 'The hero, empty-handed, watching the thieves: face by 5 s.', subject='kit', see=['kit'],
     snapAt=.1, **{'from': cam([-2.5, 6.5, 40], [-2.5, 4.6, 7], 40), 'to': cam([-2.5, 4.8, 11], [-2.5, 4.6, 7], 36)}, fit={'actor': 'kit', 'height': .48, 'part': 'head', 'y': .38}, shadowRadius=20)
shot('S03-clock', on(2, 5), 'insert', 'push', 'square', 'The rule as one picture: the clock at 11:59.', see=[], ruleImage=True,
     **{'from': cam([2, 26.5, 0], CLOCK, 30), 'to': cam([1, 27.6, -5], CLOCK, 28)}, shadowRadius=20)
# B2 expansion (each ≤ 2.5 s) ---------------------------------------------------------------------------------------------------
def basecam(i, back=12, side=-3, up=4, fov=40, tgt_up=.8):
    b = B[i]; p = [b['nest'][0] + b['n'][0] * back + b['s'][0] * side, b['y'] + up, b['nest'][2] + b['n'][1] * back + b['s'][1] * side]
    return cam(p, [b['nest'][0], b['nest'][1] + tgt_up, b['nest'][2]], fov)
shot('S04-ember', on(3), 'medium', 'push', 'bases', 'Every kid has a base: the Ember base, its egg glowing in the nest.', see=['egg_ember'], **{'from': basecam(1, 9, -2, 3.2), 'to': basecam(1, 7.5, -1.6, 3)}, shadowRadius=16)
f5 = basecam(2, 26, 7, 9, 46, 2); t5 = basecam(2, 20, 5, 7, 44, 1.5)
shot('S05-frost', on(3, 5), 'wide', 'push', 'bases', 'Every base has a nest: the Frost base.', see=[], **{'from': f5, 'to': t5}, shadowRadius=30)
shot('S06-run', on(4), 'medium', 'gamecam', 'bases', 'Grab an egg. Run: behind a runner leaving the Sprinkle base.', see=['lead'], follow='lead', heading=75, distance=8, height=4.6, **{'from': {'fov': 62}}, shadowRadius=20)
lk = B[4]; ring = [lk['c'][0] + lk['n'][0] * 7.2, lk['y'] + .1, lk['c'][1] + lk['n'][1] * 7.2]
shot('S07-lock', on(4, 4), 'insert', 'push', 'bases', 'Lock your door: the ring on the pad fills like a timer (no numbers).', see=[],
     **{'from': cam([ring[0] + lk['n'][0] * 8, ring[1] + 7, ring[2] + lk['n'][1] * 8], ring, 40), 'to': cam([ring[0] + lk['n'][0] * 6, ring[1] + 5.5, ring[2] + lk['n'][1] * 6], ring, 38)}, shadowRadius=12)
shot('S08-steal', on(5), 'medium', 'push', 'bases', 'Somebody steals it right back: the Moss egg lifted from its nest.', subject='lead', see=['lead'],
     **{'from': basecam(3, 9, 3, 3.6, 40, 1)}, fit={'actor': 'lead', 'height': .34, 'part': 'full', 'y': .62}, shadowRadius=16)
shot('S09-hall', on(6), 'wide', 'tiltUp', 'square', 'The town hall: a scoreboard on its front.', see=[],
     **{'from': cam([-7, 3, -3], [-17.4, 5, -21.6], 50), 'to': cam([-7, 3.2, -3], [-18, 8, -23], 50)}, shadowRadius=30)
shot('S10-board', on(6, 7), 'insert', 'push', 'square', 'Most eggs wins: DAX 200 on top, KIT 0 at the bottom.', see=[],
     **{'from': cam(NB(27), BOARD, 36), 'to': cam(NB(23), BOARD, 36)}, shadowRadius=12)
grandma, mailman, mayor = [5, 5], [-5, 4], [1, 3]
shot('S11-grandma', on(7), 'medium', 'push', 'square', 'Grandmas play (laugh 1 builds).', subject='grandma', see=['grandma'], beat=True,
     **{'from': cam([grandma[0] + 4, 3.5, grandma[1] + 7], [grandma[0], 3, grandma[1]], 40)}, fit={'actor': 'grandma', 'height': .36, 'part': 'full', 'y': .62}, shadowRadius=14)
shot('S12-mailman', on(7, 2), 'close', 'push', 'square', 'Mailmen play.', subject='mailman', see=['mailman'], beat=True,
     **{'from': cam([mailman[0] - 2, 5, mailman[1] + 7], [mailman[0], 4.6, mailman[1]], 38)}, fit={'actor': 'mailman', 'height': .5, 'part': 'head', 'y': .38}, shadowRadius=12)
shot('S13-mayor', on(7, 4), 'medium', 'push', 'square', 'The mayor plays in a ski mask, top hat on top (laugh 1).', subject='mayor', see=['mayor'],
     **{'from': cam([mayor[0] + 3, 3.6, mayor[1] + 8], [mayor[0], 3, mayor[1]], 40)}, fit={'actor': 'mayor', 'height': .38, 'part': 'full', 'y': .62}, shadowRadius=14)
# B3 defect (hot potato, then Kit) ------------------------------------------------------------------------------------------------
shot('S14-potato', on(8), 'wide', 'crane', 'square', 'One minute to midnight: eggs fly hand to hand; claw marks on the clock-tower roof (clue 2).', see=[], clueObject='clawMarks',
     **{'from': cam([16, 9, 34], [0, 9, -6], 50), 'to': cam([10, 20, 22], [0, 30, -18], 50)}, shadowRadius=50)
shot('S15-gone', on(9), 'close', 'push', 'square', 'Whoever holds one at midnight is gone by morning: a kid stares at his egg.', subject='lead', see=['lead'],
     **{'from': cam([-6, 5, 13], [-7, 4.6, 6], 36)}, fit={'actor': 'lead', 'height': .48, 'part': 'head', 'y': .38}, shadowRadius=12)
kb = B[0]; KIT_B = [kb['front'][0], kb['front'][1]]
shot('S16-kit', on(10), 'medium', 'push', 'kitbase', 'Then there is Kit: eleven, never stolen anything; her base is a mat.', subject='kit', see=['kit'],
     **{'from': cam([KIT_B[0] + kb['n'][0] * 8 + 2, 3.5, KIT_B[1] + kb['n'][1] * 8], [KIT_B[0], 3, KIT_B[1]], 40)}, fit={'actor': 'kit', 'height': .36, 'part': 'full', 'y': .62}, shadowRadius=16)
g5 = B[5]
shot('S17-return', on(12), 'wide', 'push', 'bases', 'She found an egg once. She returned it: Kit sets the Geode egg back in its nest.', subject='kit', see=['kit'],
     **{'from': basecam(5, 20, -3, 7, 46, 1.5), 'to': basecam(5, 16, -2, 6, 44, 1.5)}, shadowRadius=30)
nt = [kb['c'][0] + kb['s'][0] * .4 + kb['n'][0] * 6.2, kb['y'] + .2, kb['c'][1] + kb['s'][1] * .4 + kb['n'][1] * 6.2]
shot('S18-note', on(12, 8), 'insert', 'push', 'kitbase', 'With a sorry note: the folded note reads SORRY.', see=[],
     **{'from': cam([nt[0] + kb['n'][0] * 3, 3.1, nt[2] + kb['n'][1] * 3], nt, 34), 'to': cam([nt[0] + kb['n'][0] * 2.2, 2.5, nt[2] + kb['n'][1] * 2.2], nt, 32)}, shadowRadius=8)
shot('S19-zero', on(13), 'wide', 'tiltUp', 'square', 'Her score is zero: Dax vaults a fence, the scoreboard behind.', see=['dax'],
     **{'from': cam([9, 3, 10], [-7, 1.5, -3], 52), 'to': cam([9, 3.4, 10], [-18, 8, -23], 52)}, shadowRadius=30)
shot('S20-dax', on(14), 'medium', 'track', 'square', 'Her big brother Dax, number one, arms full of eggs.', subject='dax', see=['dax'], follow='dax',
     **{'from': cam([5, 3.4, 7.5], [0, 3, 0], 40), 'to': cam([3.5, 3.4, 7], [0, 3, 0], 40)}, shadowRadius=16)
shot('S21-slow', on(15), 'close', 'push', 'square', 'He calls her the slowest thief alive.', subject='kit', see=['kit'],
     **{'from': cam([-7, 5, 16], [-8, 4.6, 9], 38)}, fit={'actor': 'kit', 'height': .48, 'part': 'head', 'y': .38}, shadowRadius=12)
b9 = B[9]
shot('S22-queue', on(16), 'medium', 'push', 'bases', 'She just keeps saying excuse me: Kit waits politely behind a queue of thieves.', subject='kit', see=['kit', 'lead'],
     **{'from': cam([b9['front'][0] + 7, 3.6, b9['front'][1] + 6], [b9['front'][0], 3, b9['front'][1]], 40)}, fit={'actor': 'kit', 'height': .32, 'part': 'full', 'y': .6}, shadowRadius=16)
# B4 crack -----------------------------------------------------------------------------------------------------------------------
shot('S23-notice', on(17), 'close', 'push', 'square', 'But Kit notices things: she looks up.', subject='kit', see=['kit'],
     **{'from': cam([3, 4.2, 15], [2, 4.8, 8], 38)}, fit={'actor': 'kit', 'height': .48, 'part': 'head', 'y': .38}, shadowRadius=12)
shot('S24-sky', on(18), 'wide', 'push', 'square', 'Nests everywhere, an empty sky; the hall weathervane is a dragon (clue 1); AFK frozen by a wall (cameo 1).', see=['afk'], clueObject='weathervane',
     **{'from': cam([-4, 4.5, 6], [-20, 11, -25], 50), 'to': cam([-6, 5, 2], [-20.5, 11.5, -25.5], 48)}, shadowRadius=40)
shot('S25-cold', on(19), 'insert', 'static-drift', 'square', 'The eggs are cold, always cold: the Plain egg in Kit\'s still hands (clue 3, spoken).', see=['kit'], clueObject='egg_plain',
     **{'from': cam([3.6, 5.2, 12.4], [3.2, 3.3, 9.6], 34), 'to': cam([3.55, 5.15, 12.2], [3.2, 3.3, 9.6], 34)}, shadowRadius=8)
shot('S26-warm', on(20), 'close', 'push', 'square', 'Unless you stand very still: the egg warms from blue to gold and lights her face.', subject='kit', see=['kit'],
     **{'from': cam([3.5, 4.4, 15], [2, 4.6, 8], 36)}, fit={'actor': 'kit', 'height': .5, 'part': 'head', 'y': .38}, shadowRadius=12)
shot('S27-still', on(21), 'wide', 'push', 'square', 'Nobody else stands still long enough: runners streak past the one still girl.', subject='kit', see=['kit'],
     **{'from': cam([2, 9, 34], [2, 3, 8], 46), 'to': cam([2, 8, 30], [2, 3, 8], 44)}, shadowRadius=30)
# B5 crisis ----------------------------------------------------------------------------------------------------------------------
shot('S28-greedy', on(22), 'medium', 'track', 'square', 'One night, Dax got greedy: one more egg, arms full, the clock behind him.', subject='dax', see=['dax'], follow='dax',
     **{'from': cam([3, 3.6, 7.5], [0, 3.4, 0], 40), 'to': cam([4, 3.6, 7], [0, 3.6, 0], 40)}, shadowRadius=16)
shot('S29-twelve', on(24), 'insert', 'heroLow', 'square', 'The clock struck twelve; a shadow covers the moon (he is never shown taken).', see=[], ground=0,
     **{'from': cam([-3, .9, 10], [0, 22, -18], 64), 'to': cam([-3.4, .8, 9], [0, 26, -18], 66)}, shadowRadius=30)
shot('S30-bed', on(25), 'wide', 'push', 'bedroom', 'In the morning, his bed was empty.', see=[],
     **{'from': cam([ROOM[0] + 5, 7.5, ROOM[2] + 9], [ROOM[0], 2, ROOM[2] - 2.2], 46), 'to': cam([ROOM[0] + 4, 6.6, ROOM[2] + 7], [ROOM[0], 2, ROOM[2] - 2.2], 44)}, shadowRadius=16)
shot('S31-feather', on(26), 'insert', 'push', 'bedroom', 'One feather on his pillow, bigger than Kit.', see=[],
     **{'from': cam([ROOM[0] + 2.5, 6.5, ROOM[2] + 3.2], [ROOM[0] + .2, 2.4, ROOM[2] - 2.2], 40), 'to': cam([ROOM[0] + 2, 5.6, ROOM[2] + 2.2], [ROOM[0] + .2, 2.4, ROOM[2] - 2.2], 38)}, shadowRadius=10)
shot('S32-tiptoe', on(27), 'wide', 'push', 'square', 'So that night, Kit did the unthinkable: she tiptoes to the nest nobody wanted.', subject='kit', see=['kit'],
     **{'from': cam([0, 10, 21], [4, 2, 4], 46), 'to': cam([3, 9, 18], [10, 2, 3], 44)}, shadowRadius=30)
shot('S33-sorry', on(28), 'medium', 'push', 'square', 'She was terrible at it; she apologizes to the nest (small laugh).', subject='kit', see=['kit'],
     **{'from': cam([10.5, 3.6, -1.6], [13, 3, 3.4], 40)}, fit={'actor': 'kit', 'height': .36, 'part': 'full', 'y': .62}, shadowRadius=14)
shot('S34-middle', on(29), 'wide', 'crane', 'square', 'She walks to the middle of town and stops; the town gathers in a ring.', subject='kit', see=['kit'],
     **{'from': cam([0, 30, 34], [0, 1, 0], 50), 'to': cam([0, 16, 28], [0, 2, 0], 48)}, shadowRadius=40)
shot('S35-drop', on(30), 'medium', 'push', 'square', 'One minute to midnight. Everyone points, mouths open: drop it! (no bubbles)', subject='lead', see=['lead', 'kit'],
     **{'from': cam([-3, 3.6, 4.5], [-1.2, 3, 10], 40)}, fit={'actor': 'lead', 'height': .34, 'part': 'full', 'y': .62}, shadowRadius=16)
# B6 low point ---------------------------------------------------------------------------------------------------------------------
shot('S36-holds', on(31), 'close', 'push', 'square', 'Kit held on: the egg under her chin lights her face gold. The narration slows.', subject='kit', see=['kit'],
     **{'from': cam([.4, 4.6, 6.8], [0, 4.6, 0], 34), 'to': cam([.3, 4.6, 6], [0, 4.6, 0], 32)}, fit={'actor': 'kit', 'height': .5, 'part': 'head', 'y': .38}, shadowRadius=10)
# B7 reversal ----------------------------------------------------------------------------------------------------------------------
shot('S37-wings', on(33), 'wide', 'heroLow', 'square', 'The bell rings twelve; the shadow comes down; wings fill the frame edge to edge.', see=['mother'], ground=0,
     **{'from': cam([3, 1, 22], [0, 20, -8], 64), 'to': cam([3, .9, 21], [0, 24, -10], 66)}, shadowRadius=60)
shot('S38-lower', on(34, 4), 'medium', 'push', 'square', 'Its wings are as wide as the street; the mother lowers her head to Kit.', see=['mother', 'kit'],
     **{'from': cam([5, 3, 6.5], [0, 5, -2], 50), 'to': cam([4.4, 3, 5.8], [0, 5, -2], 50)}, shadowRadius=30)
shot('S39-dragon', on(35), 'close', 'push', 'square', 'It was not a bird. It was a dragon. (the twist: the crowd gasps)', subject='kit', see=['kit'],
     **{'from': cam([-.6, 4.4, 6.6], [0, 4.6, 0], 34)}, fit={'actor': 'kit', 'height': .48, 'part': 'head', 'y': .38}, shadowRadius=10)
shot('S40-lift', on(36), 'medium', 'tiltUp', 'square', 'Very, very gently, it lifts Kit into the clouds.', see=['kit', 'mother'],
     **{'from': cam([14, 6, 26], [0, 8, -4], 50), 'to': cam([14, 6.4, 26], [0, 18, -8], 52)}, shadowRadius=30)
# B8 second surprise ---------------------------------------------------------------------------------------------------------------
N = NEST
shot('S41-nest', on(37), 'wide', 'drone', 'nest', 'Money shot: a nest the size of the town, kids with sleeping baby dragons in golden light.', see=[], spectacle=True, look='goldenHour',
     path=[[N[0] + 30, N[1] + 40, N[2] + 90], [N[0] + 18, N[1] + 31, N[2] + 72], [N[0] + 8, N[1] + 23, N[2] + 55]], targets=[[N[0], N[1] + 2, N[2] + 2], [N[0], N[1] + 2, N[2] + 4]], **{'from': {'fov': 50}}, shadowRadius=60)
DAXN = [N[0] - 4, N[1] + .3, N[2] + 8]; LITN = [N[0] + 5, N[1] + .3, N[2] + 7]; KITN = [N[0] + 1, N[1] + .3, N[2] + 11]; LEADN = [N[0] - 10, N[1] + .3, N[2] + 4]
shot('S42-daxnest', on(38), 'medium', 'snap', 'nest', 'Every missing kid was in it. Even Dax, a hatchling asleep on his head.', subject='dax', see=['dax'], look='goldenHour', snapAt=.6,
     **{'from': cam([DAXN[0] - 2, N[1] + 9, DAXN[2] + 22], [DAXN[0], N[1] + 2.4, DAXN[2]], 44), 'to': cam([DAXN[0] - 1, N[1] + 4, DAXN[2] + 7], [DAXN[0], N[1] + 2.4, DAXN[2]], 40)},
     fit={'actor': 'dax', 'height': .36, 'part': 'full', 'y': .6}, shadowRadius=14)
shot('S43-lap', on(39), 'close', 'push', 'nest', 'Each one had a baby dragon asleep in their lap.', subject='little', see=['little'], look='goldenHour',
     **{'from': cam([LITN[0] + 1, N[1] + 3.4, LITN[2] + 5], [LITN[0], N[1] + 2.6, LITN[2]], 36)}, fit={'actor': 'little', 'height': .48, 'part': 'head', 'y': .38}, shadowRadius=10)
shot('S44-still', on(40), 'medium', 'push', 'nest', 'Eggs only hatch if you hold them still through midnight: Kit, still, the egg gold.', subject='kit', see=['kit'], look='goldenHour',
     **{'from': cam([KITN[0] + 3, N[1] + 3.4, KITN[2] + 7], [KITN[0], N[1] + 2.4, KITN[2]], 40)}, fit={'actor': 'kit', 'height': .36, 'part': 'full', 'y': .6}, shadowRadius=14)
shot('S45-years', on(41), 'wide', 'drone', 'nest', 'A hundred years of stealing: not one had ever hatched. The camera rises over the nest.', see=[], look='goldenHour',
     path=[[N[0] + 6, N[1] + 12, N[2] + 32], [N[0] + 20, N[1] + 26, N[2] + 40], [N[0] + 36, N[1] + 40, N[2] + 54]], targets=[[N[0], N[1] + 1, N[2] + 12], [N[0], N[1], N[2]]], **{'from': {'fov': 50}}, shadowRadius=60)
shot('S46-gold', on(43), 'close', 'push', 'nest', 'Kit\'s egg cracked: the only gold dragon in the nest sneezes a spark on her (laugh 3).', subject='kit', see=['kit', 'goldling'], look='goldenHour',
     **{'from': cam([KITN[0] - 1, N[1] + 3.6, KITN[2] + 5.5], [KITN[0], N[1] + 2.6, KITN[2]], 36)}, fit={'actor': 'kit', 'height': .48, 'part': 'head', 'y': .38}, shadowRadius=10)
shot('S47-babysitters', on(44), 'medium', 'pull', 'nest', 'She was never taking thieves. She was taking babysitters: the mother curled around them all.', see=['mother'], look='goldenHour',
     **{'from': cam([N[0] + 4, N[1] + 8, N[2] + 34], [N[0], N[1] + 5, N[2] + 6], 46), 'to': cam([N[0] + 6, N[1] + 12, N[2] + 44], [N[0], N[1] + 6, N[2] + 4], 48)}, shadowRadius=40)
# B9 flip --------------------------------------------------------------------------------------------------------------------------
shot('S48-sunrise', on(46), 'wide', 'crane', 'square', 'Dax came home the next morning, on a dragon: dragons land in the square at sunrise.', see=['dax'], look='goldenHour',
     **{'from': cam([14, 26, 42], [0, 14, -4], 50), 'to': cam([10, 12, 34], [0, 6, -2], 48)}, shadowRadius=60)
shot('S49-bench', on(47), 'medium', 'push', 'square', 'That night nobody played hot potato: an egg left on a bench; AFK, still frozen, a hatchling asleep on his head (cameo 2).', see=['afk'],
     **{'from': cam([9.5, 3.4, 19.5], [5.4, 1.8, 13.4], 40), 'to': cam([8.8, 3.1, 18.4], [5.4, 1.8, 13.4], 38)}, shadowRadius=14)
shot('S50-hatched', on(48), 'insert', 'push', 'square', 'The scoreboard got a new word: HATCHED. Kit is number one.', see=[],
     **{'from': cam(NB(27), BOARD, 36), 'to': cam(NB(22), BOARD, 36)}, shadowRadius=12)
shot('S51-rhyme', on(50), 'wide', 'drone', 'square', 'The first line again, flipped: the same drone, the town sitting still, eggs glowing gold in every lap.', see=['kit'],
     **{'from': {'fov': 52}}, path=DRONE['path'][::-1], targets=DRONE['targets'][::-1], shadowRadius=80)

# ---- cast ----------------------------------------------------------------------------------------------------------------------
t = {s['id']: s['at'] for s in S}
def marks(*m): return [[round(a, 3), p] for a, p in m]
kitE, kitW = lambda w: f'egg:plain:{w}', None
cast = {
  'kit': {'style': 'v2', 'troupe': 'SECOND', 'role': 'Kit', 'outfit': {'recipe': 'hoodie', 'main': '#ff7aa8', 'accent': '#ffffff', 'legs': '#4a5a80', 'trim': '#9b59b6'},
    **sq(-2.5, 7), 'yaw': 0,
    'marks': marks((0, {**sq(-2.5, 7), 'yaw': 0}), (t['S16-kit'], {'at': 'kitBase', 'yaw': yaw_to(KIT_B, [KIT_B[0] + kb['n'][0], KIT_B[1] + kb['n'][1]])}),
      (t['S17-return'], {'at': 'base5', 'offset': [g5['s'][0] * 2.4 - g5['n'][0] * 2.2, 0, g5['s'][1] * 2.4 - g5['n'][1] * 2.2], 'yaw': yaw_to([0, 0], [-g5['n'][0], -g5['n'][1]])}),
      (t['S19-zero'], {**sq(-8, 9), 'yaw': 0}), (t['S22-queue'], {'at': 'base9', 'offset': [b9['n'][0] * 3.5, 0, b9['n'][1] * 3.5], 'yaw': yaw_to([0, 0], [-b9['n'][0], -b9['n'][1]])}),
      (t['S23-notice'], {**sq(2, 8), 'yaw': 0}), (t['S32-tiptoe'], {**sq(2, 4.6), 'yaw': 98, 'travel': {'dir': [.99, -.14], 'speed': 2.6, 'max': 10.5}}),
      (t['S33-sorry'], {**sq(13, 3.4), 'yaw': 144}), (t['S34-middle'], {**sq(0, 0), 'yaw': 0}),
      (t['S40-lift'] + 1.6, {**sq(0, 0), 'yaw': 0, 'travel': {'dir': [0, -.2], 'speed': .4, 'climb': 3.2}}),
      (t['S41-nest'], {'origin': KITN, 'yaw': 10})),
    'keys': [[0, 'idle'], [t['S17-return'], 'toolHold'], [t['S18-note'], 'idle'], [t['S22-queue'], 'wave'], [t['S23-notice'], 'lookUp'], [t['S25-cold'], 'toolHold'],
             [t['S27-still'], 'idle'], [t['S32-tiptoe'], 'walk'], [t['S33-sorry'], 'toolHold'], [t['S34-middle'], 'toolHold'], [t['S40-lift'] + 1.6, 'fall'], [t['S41-nest'], 'sit']],
    'faces': [[0, 'neutral'], [t['S16-kit'], 'smile'], [t['S21-slow'], 'sad'], [t['S23-notice'], 'determined'], [t['S26-warm'], 'smile'], [t['S35-drop'], 'determined'],
              [t['S39-dragon'], 'gasp'], [t['S41-nest'], 'smile']],
    'tools': [[0, None], [t['S17-return'], 'egg:geode'], [t['S18-note'], None], [t['S25-cold'], kitE(0)], [on(20, 5), kitE(.5)], [on(20, 5) + .9, kitE(1)], [t['S27-still'], None],
              [on(27, 7), kitE(0)], [on(32), kitE(.5)], [on(32, 7), kitE(1)], [on(43), None]]},
  'dax': {'style': 'v2', 'troupe': 'RIVAL', 'role': 'Dax', 'outfit': {'recipe': 'hoodie', 'main': '#c94a3a', 'accent': '#f2d16b', 'legs': '#5a6274', 'trim': '#f2b632'},
    **sq(-11, -6), 'yaw': 200,
    'marks': marks((0, {**sq(14, 2), 'yaw': 280, 'travel': {'dir': [-1, 0], 'speed': 4.2, 'max': 10}}), (t['S19-zero'], {**sq(-12, -8), 'yaw': 120, 'travel': {'dir': [.6, .8], 'speed': 4, 'max': 8}}),
      (t['S20-dax'], {**sq(-6, 2), 'yaw': 90, 'travel': {'dir': [1, 0], 'speed': 1.4, 'max': 6}}), (t['S28-greedy'], {**sq(-5, -4), 'yaw': 90, 'travel': {'dir': [1, 0], 'speed': 1.2, 'max': 6}}),
      (t['S29-twelve'] + 1, {**sq(60, 60), 'yaw': 0}), (t['S41-nest'], {'origin': DAXN, 'yaw': 20}), (t['S48-sunrise'], {**sq(4, 2), 'yaw': 0})),
    'keys': [[0, 'run'], [t['S19-zero'], 'jump'], [t['S20-dax'], 'walk'], [t['S28-greedy'], 'walk'], [t['S41-nest'], 'sit'], [t['S48-sunrise'], 'cheer']],
    'faces': [[0, 'smug'], [t['S41-nest'], 'smile']], 'tools': [[0, 'egg:storm'], [t['S41-nest'], None]]},
  'lead': {'style': 'v2', 'troupe': 'LEAD', 'role': 'thief', 'outfit': {'recipe': 'hoodie', 'main': '#3fae6a', 'accent': '#ffffff', 'legs': '#3a4a6a', 'trim': '#2e7a4a'},
    **sq(10, 10), 'yaw': 0,
    'marks': marks((0, {**sq(10, 10), 'yaw': 0}), (t['S06-run'], {'at': 'base8', 'offset': [0, 0, 0], 'yaw': 75, 'travel': {'dir': [.966, .259], 'speed': 5.5}}),
      (t['S08-steal'], {'at': 'base3', 'offset': [B[3]['s'][0] * 3.2 - B[3]['n'][0] * 2.6, 0, B[3]['s'][1] * 3.2 - B[3]['n'][1] * 2.6], 'yaw': yaw_to([0, 0], [B[3]['n'][0], B[3]['n'][1]])}),
      (t['S14-potato'], {**sq(-7, 6), 'yaw': 10}), (t['S16-kit'], {**sq(-16, 12), 'yaw': 10}), (t['S22-queue'], {'at': 'base9', 'offset': [b9['n'][0] * 1.2, 0, b9['n'][1] * 1.2], 'yaw': yaw_to([0, 0], [-b9['n'][0], -b9['n'][1]])}),
      (t['S34-middle'], {**sq(-1.2, 10), 'yaw': 180}), (t['S41-nest'], {'origin': LEADN, 'yaw': 40})),
    'keys': [[0, 'run'], [t['S08-steal'], 'raise'], [t['S14-potato'], 'toolHold'], [t['S22-queue'], 'idle'], [t['S35-drop'], 'point'], [t['S41-nest'], 'sit']],
    'faces': [[0, 'smug'], [t['S15-gone'], 'terrified'], [t['S35-drop'], 'shout'], [t['S41-nest'], 'smile']],
    'tools': [[0, 'egg:ember'], [t['S08-steal'], 'egg:moss'], [t['S14-potato'], 'egg:frost'], [t['S22-queue'], None]]},
  'little': {'style': 'v2', 'troupe': 'LITTLE', 'role': 'nest kid', 'outfit': {'recipe': 'tee', 'main': '#4ad8ff', 'accent': '#ffffff', 'legs': '#4a5a80', 'trim': '#f2b632'},
    'origin': LITN, 'yaw': -20, 'visible': [[0, False], [t['S41-nest'], True], [t['S48-sunrise'], False]], 'marks': marks((0, {**sq(-14, 4), 'yaw': 60}), (t['S41-nest'], {'origin': LITN, 'yaw': -20})), 'keys': [[0, 'idle'], [t['S41-nest'], 'sit']], 'faces': [[0, 'smile'], [t['S41-nest'], 'sleep']]},
  'grandma': {'style': 'v2', 'build': 'elder_f', 'age': 72, 'skin': '#f6c9a0', 'face': 'smug', 'hair': {'style': 'messy_bun', 'color': '#d8d8d8', 'v': 4}, 'tier': 'hero',
    'outfit': {'recipe': 'robe', 'main': '#9a86d8', 'trim': '#f2d16b', 'belt': '#5a3a26', 'legs': '#9a86d8'}, **sq(*grandma), 'yaw': 30, 'keys': [[0, 'cheer']], 'tools': [[0, 'egg:sprinkle']], 'visible': [[0, True], [t['S16-kit'], False]]},
  'mailman': {'style': 'v2', 'build': 'adult_m', 'age': 41, 'skin': '#c08457', 'face': 'determined', 'hair': {'style': 'side_part', 'color': '#2a1a12', 'v': 4}, 'tier': 'hero',
    'outfit': {'recipe': 'tee', 'main': '#3d6fb8', 'accent': '#f2f2f2', 'legs': '#2f3d5a', 'trim': '#f2d16b'}, 'accessories': ['mailBag'], **sq(*mailman), 'yaw': -20, 'keys': [[0, 'run']], 'tools': [[0, 'egg:frost']], 'visible': [[0, True], [t['S16-kit'], False]]},
  'mayor': {'style': 'v2', 'troupe': 'ELDER', 'role': 'mayor', 'outfit': {'recipe': 'tee', 'main': '#6a6f86', 'accent': '#c0392b', 'legs': '#4a4e5e', 'trim': '#c0392b'},
    'accessories': ['skiMask', 'topHat'], **sq(*mayor), 'yaw': 15, 'keys': [[0, 'toolHold']], 'tools': [[0, 'egg:cosmic']], 'faces': [[0, 'smug']], 'visible': [[0, True], [t['S30-bed'], False], [t['S48-sunrise'], True]]},
  'afk': {'style': 'v2', 'troupe': 'AFK', 'visible': [[0, False], [t['S24-sky'] - .1, True], [t['S25-cold'], False], [t['S49-bench'] - .1, True], [t['S50-hatched'], False]],
    'marks': marks((0, {**sq(-15, -15), 'yaw': 40}), (t['S48-sunrise'], {**sq(4.2, 12.6), 'yaw': 30}))},
  'mother': {'style': 'dragon', 'scale': 3, 'origin': [0, 80, -120], 'yaw': 180,
    'marks': marks((0, {'origin': [-160, 120, -320], 'yaw': 90, 'travel': {'dir': [1, 0], 'speed': 260}}), (1.0, {'origin': [0, 400, -600], 'yaw': 0}),
      (t['S29-twelve'] + 1.4, {'origin': [-60, 60, -10], 'yaw': 90, 'travel': {'dir': [1, 0], 'speed': 60}}), (t['S29-twelve'] + 3.2, {'origin': [0, 400, -600], 'yaw': 0}),
      (t['S37-wings'], {'origin': [0, 40, -18], 'yaw': 0, 'travel': {'dir': [0, .2], 'speed': 2, 'climb': -3, 'max': 8}}), (t['S38-lower'], {'origin': [0, 0, -22], 'yaw': 0}),
      (t['S40-lift'] + 1.6, {'origin': [0, 0, -22], 'yaw': 0, 'travel': {'dir': [0, .2], 'speed': .5, 'climb': 3.2}}),
      (t['S41-nest'], {'origin': [N[0], N[1] - 1, N[2] - 30], 'yaw': 0}), (t['S48-sunrise'], {'origin': [-8, 0, -6], 'yaw': 150}), (t['S49-bench'], {'origin': [0, 400, -600], 'yaw': 0})),
    'keys': [[0, 'fly'], [t['S37-wings'], 'fly'], [t['S38-lower'], 'lower'], [t['S40-lift'] + 1.6, 'fly'], [t['S41-nest'], 'perch'], [t['S48-sunrise'], 'lower']]},
}
HATCH = {'ember': {'body': '#2a2224', 'dark': '#1a1416', 'horn': '#ff7a1a', 'belly': '#ff9a3a'}, 'frost': {'body': '#bfe2ff', 'dark': '#8fc0e8', 'horn': '#ffffff', 'belly': '#e8f6ff'},
         'moss': {'body': '#6fa04a', 'dark': '#4f7a34', 'belly': '#c8e08a'}, 'tide': {'body': '#4fc4b8', 'dark': '#2f8f86', 'belly': '#e8fffb'},
         'geode': {'body': '#8a8580', 'dark': '#6a6560', 'horn': '#c45cff', 'belly': '#d9b6ff'}, 'storm': {'body': '#1f2b5a', 'dark': '#141c3a', 'horn': '#ffe14a', 'belly': '#ffe14a'},
         'sprinkle': {'body': '#ff9ccb', 'dark': '#e07aa8', 'belly': '#ffffff'}, 'cosmic': {'body': '#3a1a6e', 'dark': '#28124e', 'horn': '#fff6c8', 'belly': '#7a5ad8'}}
spots = [(DAXN[0], DAXN[2], 'dax', 5.1), (LITN[0], LITN[2], 'little', 0), (LEADN[0], LEADN[2], 'lead', 0)] + [(N[0] + 9 * math.sin(a), N[2] + 9 * math.cos(a), None, 0) for a in (1.6, 2.6, 3.4, 4.2, 4.9)]
for k, (name, cols) in enumerate(HATCH.items()):
    x, z, on_kid, up = spots[k]
    pos = [x + (0 if on_kid == 'dax' else 1.3 if on_kid else 0), N[1] + .3 + (up if on_kid == 'dax' else .1), z + (0 if on_kid == 'dax' else .9 if on_kid else 0)]
    bench = [[t['S49-bench'], {'origin': [4.2, 4.6, 12.6], 'yaw': 30}]] if name == 'moss' else [[t['S49-bench'], {'origin': [0, -400, 0], 'yaw': 0}]]
    cast['h_' + name] = {'style': 'dragon', 'scale': .2, 'colors': {**cols, 'wing': cols.get('horn', cols['belly']), 'wingDk': cols['dark']}, 'origin': pos, 'yaw': 20,
                         'marks': marks((0, {'origin': [0, -400, 0], 'yaw': 0}), (t['S41-nest'], {'origin': pos, 'yaw': 20 + k * 30}), (t['S48-sunrise'], {'origin': [-12 + k * 3, 8 + k % 3, -10], 'yaw': 160})) + bench,
                         'keys': [[0, 'perch'], [t['S41-nest'], 'perch'], [t['S48-sunrise'], 'fly']]}
cast['goldling'] = {'style': 'dragon', 'scale': .2, 'colors': {'body': '#ffc23a', 'dark': '#e09a1a', 'belly': '#fff1b0', 'horn': '#ffffff', 'wing': '#ffd86a', 'wingDk': '#e0a83a', 'eye': '#7a3aff'},
                    'origin': [KITN[0] + 1.2, N[1] + 2.6, KITN[2] + .2], 'yaw': 250, 'scale': .15,
                    'marks': marks((0, {'origin': [0, -400, 0], 'yaw': 0}), (on(43), {'origin': [KITN[0] + 1.2, N[1] + 2.6, KITN[2] + .2], 'yaw': 250}), (t['S49-bench'], {'origin': [0, -400, 0], 'yaw': 0})),
                    'keys': [[0, 'perch'], [on(43, 3), 'roar'], [on(43, 3) + .6, 'perch']]}

crowds = [
  {'id': 'town', 'count': 36, 'centre': [4, -10], 'radius': 8, 'mode': 'ambient', 'seed': 4, 'visible': [[0, True], [t['S28-greedy'], False], [t['S48-sunrise'], True]]},
  {'id': 'ring', 'count': 44, 'centre': [0, 0], 'radius': 13, 'inner': 7.5, 'mode': 'ambient', 'face': [0, 0], 'seed': 9, 'visible': [[0, False], [t['S34-middle'], True], [t['S41-nest'], False]]},
  {'id': 'runA', 'count': 14, 'centre': [-16, 6], 'radius': 5, 'mode': 'panic', 'dir': [1, .1], 'at': 0, 'seed': 7, 'visible': [[0, True], [t['S02-kit'], False]]},
  {'id': 'runB', 'count': 14, 'centre': [-14, 10], 'radius': 4, 'mode': 'panic', 'dir': [1, 0], 'at': t['S27-still'] - .5, 'seed': 8, 'visible': [[0, False], [t['S27-still'], True], [t['S28-greedy'], False]]},
]
effects = [
  {'type': 'shake', 'at': round(on(24, 3) + .2, 2), 'dur': .5, 'amp': .08},
  {'type': 'flash', 'at': round(on(33, 4), 2), 'dur': .3, 'color': '#fff6e0'},
  {'type': 'particles', 'preset': 'dust', 'origin': {'anchor': 'square', 'offset': [0, .5, 0]}, 'count': 120, 'at': on(34), 'dur': 3},
  {'type': 'particles', 'preset': 'sparkle', 'origin': [KITN[0] + .8, N[1] + 3.0, KITN[2] + .4], 'count': 40, 'at': round(on(43, 3) + .3, 2), 'dur': 1.2},
]
spec = {'slug': 'egg', 'fps': 30, 'end': END, 'season': 1, 'hero': 'kit', 'captionStyle': 'pop-shorts-v3', 'look': 'nightBright',
  'note': 'Season 1 episode 01 egg (card 01). Generated by stories/egg/gen.py from stories/egg/beats.md; no labels (SEASON_1.md §2c).',
  'world': 'stories/egg/world.js', 'ruleLines': 2,
  'beats': {'B1': ['S01-town', 'S03-clock'], 'B2': ['S04-ember', 'S13-mayor'], 'B3': ['S14-potato', 'S22-queue'], 'B4': ['S23-notice', 'S27-still'], 'B5': ['S28-greedy', 'S35-drop'],
            'B6': ['S36-holds', 'S36-holds'], 'B7': ['S37-wings', 'S40-lift'], 'B8': ['S41-nest', 'S47-babysitters'], 'B9': ['S48-sunrise', 'S51-rhyme']},
  'clues': ['S14-potato', 'S24-sky', 'S25-cold'], 'twist': 'S39-dragon', 'afk': ['S24-sky', 'S49-bench'], 'moneyShot': 'S41-nest',
  'moods': {'B1': 'heist', 'B2': 'playful', 'B3': 'playful', 'B4': 'curious', 'B5': 'tense', 'B6': 'hush', 'B7': 'wonder', 'B8': 'wonder', 'B9': 'warm'},
  'emphasis': ['midnight', 'zero', 'dragon', 'babysitters', 'Hatched', 'holds on'],
  'worldState': {'flyers': [[0, False], [t['S14-potato'], True], [t['S16-kit'], False]], 'clock': [[0, '1159'], [on(24, 3), '12'], [t['S30-bed'], '1159'], [t['S41-nest'], '12'], [t['S48-sunrise'], '1159']],
                 'board': [[0, 'race'], [on(48, 6), 'hatched']], 'plainEgg': [[0, True], [on(27, 7), False]], 'benchEgg': [[0, False], [t['S49-bench'], True], [t['S50-hatched'], False]]},
  'sfxCues': [[on(33) + .1, 'bell'], [on(33) + .6, 'bell'], [on(33) + 1.1, 'bell'], [on(43) + .1, 'crack'], [on(43, 3) + .3, 'sparkle'], [t['S40-lift'] + 1.6, 'whoosh']],
  'cast': cast, 'crowds': crowds, 'effects': effects, 'shots': S}
json.dump(spec, open(os.path.join(HERE, 'episode.json'), 'w'), indent=1)
print(json.dumps({'shots': len(S), 'end': END, 'cast': len(cast)}))
