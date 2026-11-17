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
F = lambda t, df=0: round((round(t * 30) + df) / 30, 4)   # a cut moved by df frames (plancheck cutTol: ≤ 2)
add = lambda p, q: [p[i] + q[i] for i in range(3)]
MOON = [math.cos(math.radians(18)) * math.sin(math.radians(110)), math.sin(math.radians(18)), math.cos(math.radians(18)) * math.cos(math.radians(110))]   # world.js LOOK.moon (az 110, el 18): clear of the clock tower from the square
D2 = [MOON[0] / math.hypot(MOON[0], MOON[2]), MOON[2] / math.hypot(MOON[0], MOON[2])]; PERP = [-D2[1], D2[0]]   # toward the moon (horizontal) and its right-hand side
# ---- shot table (owner fix pass 2026-11-14: every shot shows its line's verb; ≤ 3 s per framing except the low point and the
# money shot; ≤ 3 clock shots of ≤ 1.5 s; scoreboard only for Dax on top, Kit at zero and the HATCHED flip) ---------------
S = []
def shot(id, at, size, move, loc, why, **k):
    if not k.get('see'): k['see'] = [k.get('clueObject') or 'the place']   # `see` names what the frame shows (objects allowed)
    S.append({'id': id, 'at': at, 'size': size, 'loc': 'town' if loc in ('square', 'bases', 'kitbase') else loc, 'move': move, 'why': why, **k})

K0 = [-3, 6]   # Kit in frame 0–4 s: standing still, empty-handed
DEND = [K0[0] - D2[0] * 14, 5.5, K0[1] - D2[1] * 14]
DRONE = {'path': [[DEND[0] - D2[0] * 64, 24, DEND[2] - D2[1] * 64], [DEND[0] - D2[0] * 40, 15, DEND[2] - D2[1] * 40], [DEND[0] - D2[0] * 18, 8.5, DEND[2] - D2[1] * 18], DEND],
         'targets': [[K0[0] + D2[0] * 10, 3, K0[1] + D2[1] * 10], [K0[0] + D2[0] * 6, 5, K0[1] + D2[1] * 6]]}
# B1 rule ---------------------------------------------------------------------------------------------------------------------
shot('S01-town', 0.0, 'wide', 'drone', 'square', 'Frame 0: low drone toward the moon; runners with glowing eggs cross the lens, the beams behind; the dragon crosses the moon; Kit stands still, empty-handed.',
     openHit=True, spectacle=True, see=['kit'], **{'from': {'fov': 46}}, **DRONE, shadowRadius=60)
KC = lambda d, up: [K0[0] - D2[0] * d, up, K0[1] - D2[1] * d]
shot('S02-kit', on(2), 'close', 'snap', 'square', 'The hook face: Kit, still and empty-handed, wonder on her face, turns her head toward the clock.', subject='kit', see=['kit'],
     snapAt=.1, **{'from': cam(KC(30, 6.5), [K0[0], 4.6, K0[1]], 40), 'to': cam(KC(5, 4.8), [K0[0], 4.6, K0[1]], 36)}, fit={'actor': 'kit', 'height': .48, 'part': 'head', 'y': .38}, shadowRadius=20)
shot('S03-clock', on(2, 5), 'insert', 'push', 'square', 'Never hold one: the clock at 11:59 (insert ≤ 1.2 s).', see=[], ruleImage=True, beat=True, prop='clockFace',
     **{'from': cam([2, 26.5, 0], CLOCK, 30), 'to': cam([1, 27.6, -5], CLOCK, 28)}, shadowRadius=20)
TOSS = [8, 4]
shot('S03b-toss', on(2, 9), 'medium', 'push', 'square', 'At midnight: a kid flings away a red-pulsing egg like it burns.', subject='r1', see=['r1'], beat=True,
     **{'from': cam([TOSS[0] + 1.5, 4.6, TOSS[1] + 10], [TOSS[0], 3.0, TOSS[1]], 42), 'to': cam([TOSS[0] + 1.2, 4.5, TOSS[1] + 8.5], [TOSS[0], 3.0, TOSS[1]], 42)}, shadowRadius=16)
# B2 expansion (each ≤ 2.5 s) ---------------------------------------------------------------------------------------------------
def basecam(i, back=12, side=-3, up=4, fov=40, tgt_up=.8):
    b = B[i]; p = [b['nest'][0] + b['n'][0] * back + b['s'][0] * side, b['y'] + up, b['nest'][2] + b['n'][1] * back + b['s'][1] * side]
    return cam(p, [b['nest'][0], b['nest'][1] + tgt_up, b['nest'][2]], fov)
bp = lambda i, out, side=0: [B[i]['nest'][0] + B[i]['n'][0] * out + B[i]['s'][0] * side, B[i]['nest'][2] + B[i]['n'][1] * out + B[i]['s'][1] * side]
b1 = B[1]
shot('S04-ember', on(3), 'wide', 'push', 'bases', 'Every kid has a base: the Ember base, its kid guarding the glowing nest, the street behind.', see=['r2'],
     **{'from': cam([b1['nest'][0] + b1['s'][0] * 12 + b1['n'][0] * 7, b1['y'] + 4.5, b1['nest'][2] + b1['s'][1] * 12 + b1['n'][1] * 7], [b1['nest'][0] + b1['n'][0] * 1.5, b1['y'] + 2, b1['nest'][2] + b1['n'][1] * 1.5], 46),
        'to': cam([b1['nest'][0] + b1['s'][0] * 10.5 + b1['n'][0] * 6, b1['y'] + 4.2, b1['nest'][2] + b1['s'][1] * 10.5 + b1['n'][1] * 6], [b1['nest'][0] + b1['n'][0] * 1.5, b1['y'] + 2, b1['nest'][2] + b1['n'][1] * 1.5], 44)}, shadowRadius=24)
shot('S05-frost', on(3, 5), 'close', 'push', 'bases', 'Every base has a nest: a kid stands proudly over the Frost nest, the egg glowing.', subject='r3', see=['r3'], **{'from': basecam(2, 7, -2.5, 3.6, 40, 1.4)}, fit={'actor': 'r3', 'height': .5, 'part': 'full', 'y': .52}, shadowRadius=12)
shot('S06-run', on(4), 'wide', 'gamecam', 'bases', 'Grab an egg. Run: behind a runner leaving the Sprinkle base.', see=['lead'], follow='lead', heading=75, distance=11, height=5.5, **{'from': {'fov': 60}}, shadowRadius=24)
lk = B[10]; door = [lk['c'][0] + lk['n'][0] * 4.1, lk['y'] + 3.1, lk['c'][1] + lk['n'][1] * 4.1]
DIVE0 = [door[0] + lk['n'][0] * 5.2, door[2] + lk['n'][1] * 5.2]
shot('S07-lock', on(4, 4), 'medium', 'push', 'bases', 'Lock your door for sixty seconds: a kid dives in, the door slams, the bolt shoots across and the brass dial starts to count.', see=['r4'], prop='lockDial',
     **{'from': cam([door[0] + lk['n'][0] * 11 + lk['s'][0] * 3.4, door[1] + .4, door[2] + lk['n'][1] * 11 + lk['s'][1] * 3.4], [door[0] + lk['n'][0] * 1.2, door[1] - .3, door[2] + lk['n'][1] * 1.2], 44),
        'to': cam([door[0] + lk['n'][0] * 8.5 + lk['s'][0] * 2.6, door[1] + .3, door[2] + lk['n'][1] * 8.5 + lk['s'][1] * 2.6], [door[0] + lk['n'][0] * .8, door[1] - .1, door[2] + lk['n'][1] * .8], 42)}, shadowRadius=14)
shot('S08-steal', on(5), 'wide', 'push', 'bases', 'Somebody steals it right back: the Moss egg lifted from its nest.', see=['lead'],
     **{'from': basecam(3, 15, 5, 5, 46, 1.4), 'to': basecam(3, 13, 4, 4.6, 44, 1.4)}, shadowRadius=22)
WIN = [-22 + 6.06 * math.sin(.5), -30 + 6.06 * math.cos(.5)]
LEADW = [WIN[0] + NBV[0] * .9, WIN[1] + NBV[1] * .9]
mid9 = [(LEADW[0] + BOARD[0]) / 2, (LEADW[1] + BOARD[2]) / 2]
C9 = [mid9[0] + NBV[0] * 16, 3.4, mid9[1] + NBV[1] * 16]
shot('S09-board', on(6), 'medium', 'tiltUp', 'square', 'There is a scoreboard on the town hall: a kid lifts an egg through a window; tilt up to DAX 200 on top.', see=['lead'], prop='scoreboard',
     ease='linear', **{'from': cam(C9, [LEADW[0], 3.4, LEADW[1]], 50), 'to': cam([C9[0], C9[1] + .4, C9[2]], [BOARD[0], BOARD[1] + .6, BOARD[2]], 50)}, shadowRadius=22)
DAXR = [-12, 5]
shot('S10-wins', on(6, 7), 'wide', 'push', 'square', 'Most eggs wins: Dax sprints across the square, arms full, kids chasing.', see=['dax'],
     **{'from': cam([-4, 6.5, 26], [-6, 2.5, 5], 50), 'to': cam([-3.5, 6, 23.5], [-5, 2.5, 5], 48)}, shadowRadius=30)
grandma, mailman, mayor = [4, 10], [-5, 4], [1, 3]
GDIR = [-.6, .8]
shot('S11-grandma', on(7), 'close', 'push', 'square', 'Grandmas play: a grandma tiptoes off, an egg tucked under her arm, a sly smile at us.', subject='grandma', see=['grandma'], beat=True,
     **{'from': cam([grandma[0] + 2.5, 3.4, grandma[1] + 9.5], [grandma[0] - .6, 2.6, grandma[1] + .8], 40)}, fit={'actor': 'grandma', 'height': .5, 'part': 'full', 'y': .56}, shadowRadius=14)
shot('S12-mailman', on(7, 2), 'medium', 'push', 'square', 'Mailmen play: the mailman pulls eggs out of his mailbag.', subject='mailman', see=['mailman'], beat=True,
     **{'from': cam([mailman[0] - 1.5, 4.4, mailman[1] + 7], [mailman[0], 3.4, mailman[1]], 40)}, fit={'actor': 'mailman', 'height': .52, 'part': 'full', 'y': .55}, shadowRadius=12)
# B3 defect -----------------------------------------------------------------------------------------------------------------------
R5 = [-6, 10]
shot('S14a-minute', on(7, 4), 'close', 'push', 'square', 'The mayor plays; at one minute to midnight a kid stares at the egg in her hands (S13 mayor merged in after three failed contrast passes, owner pass 2).', subject='r5', see=['r5'],
     **{'from': cam([R5[0] + .5, 4.6, R5[1] + 7], [R5[0], 3.8, R5[1]], 38)}, fit={'actor': 'r5', 'height': .48, 'part': 'head', 'y': .38}, shadowRadius=12)
shot('S14-potato', on(8, 6), 'wide', 'crane', 'square', 'The whole town plays hot potato: crane over the square, eggs flying hand to hand (looking south: no clock).', see=['r1'],
     ease='inOutSine', **{'from': cam([3, 15, -16], [0, 3, 6], 52), 'to': cam([3, 18, -14.5], [0, 2.5, 6.5], 51)}, shadowRadius=40)
b4 = B[4]; D4 = [b4['c'][0] + b4['n'][0] * 4.3, b4['y'] + 3.3, b4['c'][1] + b4['n'][1] * 4.3]
shot('S15a-claws', on(9), 'insert', 'push', 'bases', 'Clue 2: three deep claw gouges torn into a kid\'s wooden door, moonlit; the door edge and handle in frame.', see=[], clueObject='clawMarks', prop='clawMarks',
     **{'from': cam([D4[0] + b4['n'][0] * 10 + b4['s'][0] * .8, D4[1] + .4, D4[2] + b4['n'][1] * 10 + b4['s'][1] * .8], D4, 40), 'to': cam([D4[0] + b4['n'][0] * 9.2 + b4['s'][0] * .7, D4[1] + .3, D4[2] + b4['n'][1] * 9.2 + b4['s'][1] * .7], D4, 40)}, shadowRadius=12)
shot('S15b-dawn', on(9, 8), 'wide', 'push', 'bases', 'Gone by morning: the same base at dawn, empty, one cold egg in the nest.', see=[], look='goldenHour',
     **{'from': basecam(4, 15, -4, 5, 46, 1.2), 'to': basecam(4, 12.5, -3.4, 4.4, 44, 1.2)}, shadowRadius=22)
kb = B[0]; KIT_B = [kb['front'][0], kb['front'][1]]
b11 = B[11]; WALK11 = bp(11, 3.2, -4.2); KMID = [WALK11[0] + b11['s'][0] * 2.4, WALK11[1] + b11['s'][1] * 2.4]
shot('S16-kit', on(10), 'medium', 'track', 'bases', 'Then there is Kit: eleven, walking toward us, and she walks right past a glowing egg without touching it.', subject='kit', see=['kit'], follow='kit',
     **{'from': cam([b11['s'][0] * 7 + b11['n'][0] * 1.6, 3.4, b11['s'][1] * 7 + b11['n'][1] * 1.6], [0, 2.9, 0], 42), 'to': cam([b11['s'][0] * 6.4 + b11['n'][0] * 1.8, 3.4, b11['s'][1] * 6.4 + b11['n'][1] * 1.8], [0, 2.9, 0], 42)}, shadowRadius=16)
g5 = B[5]; N5 = g5['nest']; GE = [N5[0] + g5['n'][0] * 6 + g5['s'][0] * 2.2, N5[2] + g5['n'][1] * 6 + g5['s'][1] * 2.2]; K5 = [N5[0] + g5['n'][0] * 2.3, N5[2] + g5['n'][1] * 2.3]
C17 = [N5[0] - g5['n'][0] * .9 + g5['s'][0] * 2.6, N5[2] - g5['n'][1] * .9 + g5['s'][1] * 2.6]
shot('S17-return', F(on(12), -2), 'wide', 'push', 'bases', 'She found an egg once and returned it, with a sorry note: she walks in holding it, toward us, and sets it back in its nest, then the note.', see=['kit'],
     **{'from': cam([C17[0], 4.8, C17[1]], [K5[0] + g5['n'][0] * 1.6, 2.6, K5[1] + g5['n'][1] * 1.6], 56), 'to': cam([C17[0], 4.6, C17[1]], [K5[0] + g5['n'][0] * .8, 2.4, K5[1] + g5['n'][1] * .8], 54)}, shadowRadius=14)
shot('S18-zero', on(13), 'insert', 'push', 'square', 'Her score is zero; it has always been zero: the whole scoreboard, the camera creeping in on KIT 0 at the bottom (the vault shot was cut, owner pass 2).', see=[], prop='scoreboard',
     **{'from': cam(NB(33), [BOARD[0], BOARD[1], BOARD[2]], 30), 'to': cam([NB(28)[0], NB(28)[1] - .4, NB(28)[2]], [BOARD[0], BOARD[1] - .5, BOARD[2]], 30)}, shadowRadius=12)
FENCE = [-12, 9]; VDIR = [math.cos(math.radians(40)), math.sin(math.radians(40))]   # the vault runs 40° toward the camera
DAX1 = [4, 8]
shot('S20-dax', on(14), 'wide', 'push', 'square', 'Her big brother Dax is number one: two hundred eggs piled in his arms, kids gathered round.', see=['dax'],
     **{'from': cam([6, 6.5, -7], [4, 3, 9], 48), 'to': cam([5, 4.6, -2.5], [4, 3, 9], 44)}, shadowRadius=26)
shot('S21-laugh', on(15), 'close', 'push', 'square', 'He calls her the slowest thief alive: Dax laughs.', subject='dax', see=['dax'],
     **{'from': cam([DAX1[0] - 1, 5.2, DAX1[1] - 7], [DAX1[0], 5, DAX1[1]], 38)}, fit={'actor': 'dax', 'height': .48, 'part': 'head', 'y': .38}, shadowRadius=12)
b9 = B[9]; Q = lambda k: bp(9, 2.4 + 1.8 * k, (.5 if k % 2 else -.5))
shot('S22-queue', on(16), 'medium', 'push', 'bases', 'She just keeps saying excuse me: the queue faces us, a kid cuts in, Kit at the end waves politely.', subject='kit', see=['kit', 'r1'],
     **{'from': cam([b9['nest'][0] + b9['s'][0] * 4.2 + b9['n'][0] * .3, 3.6, b9['nest'][2] + b9['s'][1] * 4.2 + b9['n'][1] * .3], [Q(5)[0], 2.4, Q(5)[1]], 40),
        'to': cam([b9['nest'][0] + b9['s'][0] * 3.8 + b9['n'][0] * 1.2, 3.5, b9['nest'][2] + b9['s'][1] * 3.8 + b9['n'][1] * 1.2], [Q(5)[0], 2.4, Q(5)[1]], 38)}, shadowRadius=18)
# B4 crack -----------------------------------------------------------------------------------------------------------------------
K2 = [2, 8]
shot('S23-notice', on(17), 'close', 'push', 'square', 'But Kit notices things; running kids do not: runners blur past behind her.', subject='kit', see=['kit'],
     **{'from': cam([3, 4.2, 15], [2, 4.8, 8], 38)}, fit={'actor': 'kit', 'height': .48, 'part': 'head', 'y': .38}, shadowRadius=12)
AFKR = [6, -22]; KV = [10, -18]
shot('S24-roofs', on(18), 'wide', 'push', 'square', 'The town is full of eggs, but nobody has ever seen a bird: rooftop nests, the dragon weathervane against the stars (clue 1), Kit looking up, AFK frozen by a wall.', see=['afk', 'kit'], clueObject='weathervane',
     **{'from': cam([16, 3.2, -13], [-14, 13, -27], 52), 'to': cam([15, 3.6, -14.5], [-15, 15, -27.5], 50)}, shadowRadius=40)
shot('S25-cold', on(19), 'insert', 'static-drift', 'square', 'The eggs are cold, always cold: the Plain egg in Kit\'s still hands (clue 3, spoken).', see=['kit'], clueObject='egg_plain', captionY='high',
     **{'from': cam([2.5, 5.0, 12.0], [2, 3.25, 9.1], 34), 'to': cam([2.45, 4.95, 11.8], [2, 3.25, 9.1], 34)}, shadowRadius=8)
shot('S26-still', on(20), 'medium', 'push', 'square', 'Unless you stand very still: Kit does not move, runners blur past behind her, and the egg warms from cold blue to gold.', subject='kit', see=['kit'],
     **{'from': cam([5.2, 5.2, 16.5], [2, 3.2, 8], 40), 'to': cam([2.8, 5.0, 11.6], [2, 3.2, 8], 40)}, fit={'actor': 'kit', 'height': .38, 'part': 'full', 'y': .6}, shadowRadius=14)
shot('S27-still', on(21), 'wide', 'push', 'square', 'Nobody else stands still long enough: runners streak past the one still girl.', subject='kit', see=['kit'],
     **{'from': cam([2, 9, 34], [2, 3, 8], 46), 'to': cam([2, 8, 30], [2, 3, 8], 44)}, shadowRadius=30)
# B5 crisis ----------------------------------------------------------------------------------------------------------------------
shot('S28-greedy', on(22), 'medium', 'track', 'square', 'One night Dax got greedy: tracking him running, arms full, grinning; one more egg, just one more.', subject='dax', see=['dax'], follow='dax',
     **{'from': cam([6, 4.0, -4.5], [0, 3.6, 0], 42), 'to': cam([5.6, 4.0, -4.2], [0, 3.6, 0], 42)}, shadowRadius=16)
shot('S29-clock', F(on(23, 5), -2), 'insert', 'push', 'square', 'The clock: 11:59, the hand clicks to twelve (insert ≤ 1.3 s).', see=[], prop='clockFace',
     **{'from': cam([1.5, 27.6, -1], CLOCK, 28), 'to': cam([1.2, 28.0, -3], CLOCK, 28)}, shadowRadius=12)
P0 = [33 * math.sin(math.radians(50)), 33 * math.cos(math.radians(50))]; P1 = [33 * math.sin(math.radians(82)), 33 * math.cos(math.radians(82))]
STR = [(P1[0] - P0[0]), (P1[1] - P0[1])]; sl = math.hypot(*STR); STR = [STR[0] / sl, STR[1] / sl]
shot('S29b-shadow', on(24), 'medium', 'heroLow', 'square', 'The clock struck twelve: back view on purpose, Dax runs off down the street as a shadow sweeps over the houses and cobbles (he is never shown taken).', subject='dax', see=['dax'], ground=0, back=True, captionY='high',
     **{'from': cam([P0[0], .9, P0[1]], [P0[0] + STR[0] * 30, 9, P0[1] + STR[1] * 30], 64), 'to': cam([P0[0] - STR[0] * .8, .8, P0[1] - STR[1] * .8], [P0[0] + STR[0] * 30, 12, P0[1] + STR[1] * 30], 66)}, shadowRadius=40)
BED = [ROOM[0] + 3.3, ROOM[2] - .2]
shot('S30-bed', on(25), 'wide', 'push', 'bedroom', 'In the morning his bed was empty: Kit beside it.', see=['kit'],
     **{'from': cam([ROOM[0] + 6, 7.4, ROOM[2] + 9.5], [ROOM[0] + .5, 2.2, ROOM[2] - 1.6], 48), 'to': cam([ROOM[0] + 5, 6.6, ROOM[2] + 8], [ROOM[0] + .5, 2.2, ROOM[2] - 1.6], 46)}, shadowRadius=16)
FTH = [ROOM[0] - .3, 2.9, ROOM[2] - 1.6 + .2]
shot('S31-feather', on(26), 'insert', 'push', 'bedroom', 'One feather on his pillow: one long gold-orange feather, quill and soft vanes, swaying a little.', see=[], prop='feather',
     **{'from': cam([FTH[0] + 2.4, FTH[1] + 15.5, FTH[2] + 5.0], FTH, 46), 'to': cam([FTH[0] + 2.2, FTH[1] + 14.8, FTH[2] + 4.6], FTH, 46)}, shadowRadius=10)
shot('S31b-bigger', on(26, 7), 'medium', 'push', 'bedroom', 'It was bigger than Kit: Kit stands beside the bed facing us, the feather on it longer than she is tall.', subject='kit', see=['kit'],
     **{'from': cam([ROOM[0] + 2.4, 3.6, ROOM[2] + 9.5], [ROOM[0] + 1.6, 2.4, ROOM[2] - 1], 46)}, fit={'actor': 'kit', 'height': .34, 'part': 'full', 'y': .58}, shadowRadius=14)
shot('S32-tiptoe', on(27), 'wide', 'push', 'square', 'So that night Kit did the unthinkable: she tiptoes to the nest nobody wanted and lifts the Plain egg out.', see=['kit'],
     ease='linear', **{'from': cam([1, 10, 21], [5, 2, 4], 46), 'to': cam([4.6, 8.4, 15], [11.4, 2, 3.4], 44)}, shadowRadius=30)
shot('S33-sorry', on(28), 'medium', 'push', 'square', 'She was terrible at it: she bows to the empty nest to say sorry, facing us across it.', subject='kit', see=['kit'],
     **{'from': cam([15.8, 5.6, -2.2], [13, 2.2, 3.4], 42)}, fit={'actor': 'kit', 'height': .38, 'part': 'full', 'y': .58}, shadowRadius=14)
shot('S34-middle', on(29), 'wide', 'crane', 'square', 'She walks to the middle of town and stops; the town gathers in a ring.', subject='kit', see=['kit'],
     **{'from': cam([0, 30, 34], [0, 1, 0], 50), 'to': cam([0, 16, 28], [0, 2, 0], 48)}, shadowRadius=40)
shot('S35-minute', on(30), 'close', 'push', 'square', 'One minute to midnight: Kit, the egg in her hands, determined.', subject='kit', see=['kit'],
     **{'from': cam([.6, 4.6, 7], [0, 4.6, 0], 36)}, fit={'actor': 'kit', 'height': .48, 'part': 'head', 'y': .38}, shadowRadius=10)
shot('S35b-scream', on(30, 4), 'wide', 'push', 'square', 'The whole town screamed, Kit, drop it!: the ring of faces shouting, a kid pointing at her.', see=['kit', 'lead'],
     **{'from': cam([.5, 9.5, 7.5], [3, 3.2, -6], 50), 'to': cam([.4, 8.6, 6.2], [3.4, 3.2, -6], 48)}, shadowRadius=30)
# B6 low point ---------------------------------------------------------------------------------------------------------------------
shot('S36-holds', on(31), 'close', 'push', 'square', 'Kit held on: the egg at her chest, her hands at its sides, her face above it in wonder, the crack spreading, its light on her face.', subject='kit', see=['kit'],
     **{'from': cam([.4, 4.0, 7.4], [0, 3.6, 0], 36), 'to': cam([.3, 4.0, 6.4], [0, 3.6, 0], 34)}, fit={'actor': 'kit', 'height': .45, 'part': 'head', 'y': .3}, shadowRadius=10)
# B7 reversal ----------------------------------------------------------------------------------------------------------------------
shot('S37a-bell', on(33), 'medium', 'push', 'square', 'The bell rang twelve times and the shadow came down: Kit in the middle of the frozen ring looks up, the shadow crossing her.', subject='kit', see=['kit'],
     **{'from': cam([-2.5, 6, 12], [0, 3, 0], 44)}, fit={'actor': 'kit', 'height': .36, 'part': 'full', 'y': .6}, shadowRadius=30)
LOWC = [-1.5, .9, 2.6]; MOM37 = add(LOWC, [MOON[0] * 160, MOON[1] * 160 - 2, MOON[2] * 160]); LOWT = add(MOM37, [0, 14, 0])   # aimed at her body (centred)
_dm = [LOWC[0] - MOM37[0], LOWC[2] - MOM37[2]]; _l = math.hypot(*_dm); DM = [_dm[0] / _l, _dm[1] / _l]   # she flies straight at the camera
BIGMOON = add(LOWC, [MOON[0] * 900, MOON[1] * 900 + 160, MOON[2] * 900])
shot('S37b-wings', on(34, 4), 'wide', 'push', 'square', 'Its wings were as wide as the street: she flies in front of a huge moon, wings spread wider than she is long, rim-lit, eyes glowing.', subject='mother', see=['mother'], ground=0,
     **{'from': cam(LOWC, LOWT, 64), 'to': cam([LOWC[0] - .2, .8, LOWC[2] + .4], add(LOWT, [0, 2, 0]), 66)}, shadowRadius=60)
HEAD39 = [0, 0, 4]
shot('S39-dragon', F(on(35), -2), 'close', 'push', 'square', 'It was not a bird. It was a dragon. Very, very gently: her head comes down from the top of the frame to Kit, eyes soft, lit by the egg; Kit looks up (the twist).', subject='kit', see=['kit', 'mother'],
     **{'from': cam([5.5, 3.2, 6.5], [0, 4.6, 0], 50)}, fit={'actor': 'kit', 'height': .46, 'part': 'head', 'y': .42}, shadowRadius=20)
LIFT0 = [0, 30, 6]; LIFTK = [LIFT0[0] + 18, LIFT0[1] - 3.0, LIFT0[2]]   # front claws 18 ahead (she flies east)
# B8 second surprise ---------------------------------------------------------------------------------------------------------------
N = NEST; FL = N[1] - 4.4
RING = ['kit', 'dax', 'lead', 'little', 'r1', 'r2', 'r3', 'r4', 'r5']; RR = 6.2
SEAT = {n: [round(N[0] + RR * math.sin(math.radians(40 * k)), 3), FL, round(N[2] + RR * math.cos(math.radians(40 * k)), 3)] for k, n in enumerate(RING)}   # Kit at the front (+z)
seat_yaw = lambda n: yaw_to(SEAT[n], N)
shot('S41-nest', on(36, 4), 'wide', 'drone', 'nest', 'It lifted Kit into the clouds (S40 merged in, owner pass 2). Money shot: drone low over the sunrise clouds onto a woven nest the size of the town, kids and baby dragons in a ring, the mother curled outside.', see=[], spectacle=True, look='goldenHour',
     ease='linear', path=[[N[0] + 30, N[1] + 8, N[2] + 120], [N[0] + 18, N[1] + 10, N[2] + 72], [N[0] + 8, N[1] + 12.5, N[2] + 38]], targets=[[N[0], N[1] - 4, N[2] + 1], [N[0], N[1] - 4, N[2] + 1]], **{'from': {'fov': 50}}, shadowRadius=60)
DAXN = SEAT['dax']
shot('S41b-ring', on(38), 'medium', 'push', 'nest', 'Every missing kid was in it, even Dax: Dax in the ring facing us, a hatchling asleep on his head, the other kids round him.', subject='dax', see=['dax'], look='goldenHour',
     **{'from': cam([N[0] - 3.4, N[1] + 3.8, N[2] - 7.8], [DAXN[0], FL + 2.0, DAXN[2]], 52), 'to': cam([N[0] - .2, N[1] + 2.0, N[2] - 2.6], [DAXN[0], FL + 2.0, DAXN[2]], 44)}, fit={'actor': 'dax', 'height': .42, 'part': 'full', 'y': .56, 'h': 3.6}, shadowRadius=20)
LITN = SEAT['little']
shot('S43-lap', F(on(39), 2), 'close', 'push', 'nest', 'Each one had a baby dragon asleep in their lap: Little and her frost baby, both facing us, the baby wiggling.', subject='little', see=['little'], look='goldenHour',
     **{'from': cam(add(LITN, [(N[0] - LITN[0]) * .75, 2.2, (N[2] - LITN[2]) * .75]), add(LITN, [0, 1.2, 0]), 40)}, fit={'actor': 'little', 'height': .55, 'part': 'full', 'y': .55, 'h': 2.4}, shadowRadius=10)
TA, TB = [1.7, 0, 12], [-1.7, 0, 12]
shot('S44a-cold', on(40), 'insert', 'push', 'nest', 'Proof match cut (flashback): one big cold blue egg flying hand to hand in the town at night…', see=['r1', 'r2'], look='nightBright', flashback=True,
     **{'from': cam([0, 3.6, 17.2], [0, 3.5, 12], 40), 'to': cam([0, 3.6, 16.2], [0, 3.5, 12], 40)}, shadowRadius=14)
KITN = SEAT['kit']
shot('S44b-gold', on(41), 'medium', 'push', 'nest', '…cut to a gold egg in still hands: Kit in the nest holding it, her face lit.', subject='kit', see=['kit'], look='goldenHour',
     **{'from': cam(add(KITN, [.3, 3.4, -9.5]), add(KITN, [0, 1.9, 0]), 42), 'to': cam(add(KITN, [.3, 2.6, -3.6]), add(KITN, [0, 1.9, 0]), 42)}, fit={'actor': 'kit', 'height': .5, 'part': 'full', 'y': .55, 'h': 3.3}, shadowRadius=10)
shot('S45-years', on(42), 'wide', 'drone', 'nest', 'Not one had ever hatched: the camera rises over the ring in the nest.', see=['kit'], look='goldenHour',
     path=[[N[0] + 6, N[1] + 10, N[2] + 30], [N[0] + 10, N[1] + 13, N[2] + 36], [N[0] + 14, N[1] + 16, N[2] + 42]], targets=[[N[0], FL + 1, N[2] + 2], [N[0], FL + .5, N[2] + 1]], **{'from': {'fov': 50}}, shadowRadius=50)
shot('S46-crack', on(43), 'close', 'push', 'nest', 'Kit\'s egg cracked; a tiny gold dragon sneezed on her: held at her chest beside her face, both faces visible, sparkles behind (laugh 3).', subject='kit', see=['kit', 'goldling'], look='goldenHour',
     **{'from': cam(add(KITN, [-.6, 3.0, -5.6]), add(KITN, [0, 2.2, 0]), 38)}, fit={'actor': 'kit', 'height': .55, 'part': 'full', 'y': .5, 'h': 3.3}, shadowRadius=10)
R1N = SEAT['r1']
shot('S47-sitters', on(44), 'medium', 'push', 'nest', 'The mother was not taking thieves; she was taking babysitters: a kid in the ring with her baby, the mother\'s head resting on the rim above them.', subject='r1', see=['r1', 'mother'], look='goldenHour',
     **{'from': cam([N[0] + 1.4, N[1] + 2.6, N[2] + 10.5], [R1N[0], FL + 3.4, R1N[2]], 50), 'to': cam([N[0] + .4, N[1] + 1.6, N[2] + 6.6], [R1N[0], FL + 3.4, R1N[2]], 48)}, fit={'actor': 'r1', 'height': .32, 'part': 'full', 'y': .6, 'h': 2.9}, captionY='high', shadowRadius=30)
# B9 flip --------------------------------------------------------------------------------------------------------------------------
shot('S48-sunrise', on(46), 'wide', 'crane', 'square', 'Dax came home the next morning: the dragons fly in over the square at sunrise.', see=['mother'], look='goldenHour',
     ease='inOutSine', **{'from': cam([3, 5, -8], [0, 16, 30], 52), 'to': cam([3, 7.5, -6.5], [0, 18, 30], 51)}, shadowRadius=60)
shot('S48b-ride', F(on(46, 6), -2), 'medium', 'track', 'square', 'On a dragon: Dax on the saddle of her back, face and arms up against the sunrise sky.', subject='dax', see=['dax'], follow='dax', look='goldenHour', spectacle=True,
     **{'from': cam([3.5, 5.2, -8], [0, 2.6, 0], 50), 'to': cam([3.2, 5.0, -7.4], [0, 2.6, 0], 50)}, shadowRadius=30)
shot('S49-bench', F(on(47), 2), 'wide', 'push', 'square', 'That night nobody played hot potato: an egg left on a bench; AFK, still frozen, a hatchling asleep on his head (cameo 2).', see=['afk'],
     **{'from': cam([10.5, 5.2, 22.5], [4.6, 1.8, 12.4], 46), 'to': cam([9.8, 4.8, 21.2], [4.6, 1.8, 12.4], 44)}, shadowRadius=20)
KB = [-13, -12]
shot('S50-hatched', on(48), 'medium', 'push', 'square', 'The scoreboard got a new word, HATCHED; Kit is number one: Kit laughing at us, the board flipping behind her.', subject='kit', see=['kit'],
     **{'from': cam([KB[0] + 4.8, 4.4, KB[1] + 7.8], [KB[0] - 1.6, 4.4, KB[1] - 3.2], 46)}, fit={'actor': 'kit', 'height': .36, 'part': 'full', 'y': .55}, shadowRadius=16)
shot('S51a-sit', on(50), 'close', 'push', 'square', 'In this town everybody steals eggs: now the kids sit still, gold eggs glowing in their laps.', subject='kit', see=['kit'],
     **{'from': cam([K0[0] + 1, 5.0, K0[1] + 7.0], [K0[0], 1.6, K0[1]], 42)}, fit={'actor': 'kit', 'height': .5, 'part': 'full', 'y': .62, 'h': 3.3}, captionY='high', shadowRadius=14)
shot('S51-rhyme', on(51), 'wide', 'drone', 'square', 'And at midnight everybody holds on: the same drone path, the whole town sitting still on the square, gold eggs in every lap.', see=['kit'],
     **{'from': {'fov': 46}}, path=DRONE['path'][::-1], targets=DRONE['targets'][::-1], shadowRadius=60)
# merged-away shots keep their event times (the cast timelines key on them)
ALIAS = {'S13-mayor': on(7, 4), 'S19-vault': F(on(13, 4), -2), 'S40-lift': on(36, 4), 'S16b-never': on(11, 3), 'S17-found': F(on(12), -2), 'S17r-return': on(12, 5), 'S20b-eggs': on(14, 7), 'S24b-vane': on(18, 6), 'S26b-warm': on(20, 5), 'S28b-more': on(23),
         'S32b-take': on(27, 7), 'S35c-drop': on(30, 8), 'S37-down': on(34), 'S38-bird': F(on(35), -2), 'S42-daxnest': F(on(38, 6), -2), 'S46a-crack': on(43), 'S46b-sneeze': on(43, 3),
         'S47a-mother': on(44), 'S47b-sitters': on(45), 'S50b-one': on(48, 6)}


# ---- cast ----------------------------------------------------------------------------------------------------------------------
t = {**ALIAS, **{s['id']: s['at'] for s in S}}
def marks(*m): return [[round(a, 3), p] for a, p in sorted(m, key=lambda x: x[0])]
kitE = lambda w: f'egg:plain:{w}'
def sqy(x, z, y=0): return {'at': 'square', 'offset': [x, y, z]}
face_cam = lambda p, c: yaw_to(p, c)
SEATM = lambda n: {'origin': SEAT[n], 'yaw': seat_yaw(n)}
EGGS4 = 'eggs:storm,ember,frost,moss'
# Face mood map (owner, 2026-11-14; Faces v3): [line, actor, face] — checked by v2:plan (seasoncheck moodIssues)
FACEMAP = [[12, 'kit', 'polite'], [19, 'kit', 'steady'], [15, 'dax', 'laugh'], [16, 'kit', 'polite'], [17, 'kit', 'curious'], [20, 'kit', 'curious'], [20, 'kit', 'polite'],
           [27, 'kit', 'sheepish'], [28, 'kit', 'sheepish'], [30, 'lead', 'scream'], [31, 'kit', 'brave'], [32, 'kit', 'wonder'], [34, 'kit', 'wonder'], [35, 'kit', 'wonder'], [36, 'kit', 'wonder'],
           [38, 'dax', 'xd'], [43, 'kit', 'ko'], [43, 'kit', 'laugh']]
SNEEZE = round(on(43, 6) + .08, 3)
Q5, CUT0 = [Q(5)[0] + b9['s'][0] * 1.4, Q(5)[1] + b9['s'][1] * 1.4], [Q(4)[0] + b9['s'][0] * 3.2, Q(4)[1] + b9['s'][1] * 3.2]
GEK = [GE[0] + g5['s'][0] * 1.1, GE[1] + g5['s'][1] * 1.1]; _d = [K5[0] - GEK[0], K5[1] - GEK[1]]; L17 = math.hypot(*_d); D17 = [_d[0] / L17, _d[1] / L17]
N9 = [b9['nest'][0], b9['nest'][2]]
_c = [DRONE['path'][1][i] + (DRONE['path'][2][i] - DRONE['path'][1][i]) * .43 for i in range(3)]   # the drone camera near t = 1.2 s
MOM0 = [round(_c[i] + MOON[i] * 320 - ([PERP[0], 0, PERP[1]][i]) * 70 * 1.2, 2) for i in range(3)]   # crosses the moon at ~1.2 s
cast = {
  'kit': {'style': 'v2', 'troupe': 'SECOND', 'role': 'Kit', 'outfit': {'recipe': 'hoodie', 'main': '#ff7aa8', 'accent': '#ffffff', 'legs': '#4a5a80', 'trim': '#9b59b6'},
    **sq(*K0), 'yaw': yaw_to(K0, [K0[0] - D2[0], K0[1] - D2[1]]),
    'marks': marks((0, {**sq(*K0), 'yaw': yaw_to(K0, [K0[0] - D2[0], K0[1] - D2[1]])}), (t['S16-kit'], {**sq(*WALK11), 'yaw': yaw_to([0, 0], b11['s']), 'travel': {'dir': b11['s'], 'speed': 1.25, 'max': 5.6}}),
      (t['S17-found'], {**sq(*GEK), 'yaw': yaw_to(GEK, K5), 'travel': {'dir': D17, 'speed': 2.3, 'max': L17}}), (34.6, {**sq(*K5), 'yaw': yaw_to(K5, [N5[0], N5[2]])}),
      (t['S18-zero'], {**sq(-8, 9), 'yaw': 0}), (t['S22-queue'], {**sq(*Q5), 'yaw': yaw_to(Q5, N9)}), (t['S23-notice'], {**sq(*K2), 'yaw': 0}),
      (t['S24-roofs'], {**sq(*KV), 'yaw': yaw_to(KV, [VANE[0], VANE[2]])}), (t['S25-cold'], {**sq(*K2), 'yaw': 0}),
      (t['S30-bed'], {'origin': [BED[0], .4, BED[1]], 'yaw': -60}), (t['S31b-bigger'], {'origin': [BED[0], .4, BED[1]], 'yaw': 0}),
      (t['S32-tiptoe'], {**sq(2, 4.6), 'yaw': 98, 'travel': {'dir': [.99, -.14], 'speed': 2.6, 'max': 10.5}}), (t['S33-sorry'], {**sq(13, 3.4), 'yaw': 144}), (t['S34-middle'], {**sq(0, 0), 'yaw': 0}),
      (t['S37b-wings'], {**sq(-2.6, 5.2), 'yaw': 0}), (t['S38-bird'], {**sq(0, 0), 'yaw': 30}),
      (t['S40-lift'], {'origin': LIFTK, 'yaw': 90, 'travel': {'dir': [1, 0], 'speed': 4, 'climb': 2.5}}),
      (t['S41-nest'], SEATM('kit')), (t['S48-sunrise'], {**sq(-30, 30), 'yaw': 0}), (t['S50-hatched'], {**sq(*KB), 'yaw': yaw_to(KB, [KB[0] + 4.8, KB[1] + 7.8])}), (t['S51a-sit'], {**sq(*K0), 'yaw': yaw_to(K0, [K0[0] + 1, K0[1] + 8.5])})),
    'keys': [[0, 'idle'], [t['S02-kit'] + .5, 'look_react', {'direction': 'left'}], [t['S03-clock'], 'idle'], [t['S16-kit'], 'walk'], [t['S17-found'], 'eggWalk'], [34.6, 'bow'], [35.1, 'idle'], [35.25, 'bow'], [35.8, 'idle'],
             [t['S22-queue'], 'idle'], [47.0, 'wave'], [47.9, 'idle'], [t['S24b-vane'], 'lookUp'], [t['S25-cold'], 'eggHold'], [t['S30-bed'], 'idle'], [73.5, 'point'], [t['S31b-bigger'], 'idle'],
             [t['S32-tiptoe'], 'walk'], [t['S32b-take'], 'bow'], [79.6, 'eggHold'], [t['S33-sorry'], 'eggHold'], [on(28, 6), 'bow'], [t['S34-middle'], 'eggWalk'], [on(29, 8), 'eggHold'], [t['S36-holds'], 'eggHold'],
             [t['S37-down'], 'eggHold'], [t['S41-nest'], 'sitEgg'], [on(43) + 1.2, 'sit', {'ground': True}], [t['S48-sunrise'], 'idle'], [t['S51a-sit'], 'sit', {'ground': True}]],
    'faces': [[0, 'wonder'], [t['S16-kit'], 'smile'], [t['S17-found'], 'curious'], [t['S17r-return'], 'polite'], [t['S18-zero'], 'smile'], [t['S22-queue'], 'polite'], [t['S23-notice'], 'curious'], [t['S25-cold'], 'steady'], [t['S26-still'], 'curious'],
              [t['S26b-warm'], 'polite'], [t['S27-still'], 'smile'], [t['S30-bed'], 'worried'], [t['S32-tiptoe'], 'sheepish'], [t['S34-middle'], 'determined'], [t['S36-holds'], 'brave'], [on(32, 6), 'wonder'],
              [t['S37-down'], 'wonder'], [t['S41-nest'], 'smile'], [on(43), 'wonder'], [SNEEZE, 'ko'], [round(SNEEZE + .3, 3), 'laugh'], [t['S48-sunrise'], 'smile'], [t['S50b-one'], 'laugh'], [t['S51a-sit'], 'smile']],
    'tools': [[0, None], [t['S17-found'], 'egg:geode'], [34.9, None], [t['S25-cold'], kitE(0)], [on(20, 5) + .1, kitE(.5)], [on(20, 5) + .7, kitE(1)], [t['S28-greedy'], None],
              [79.6, kitE(0)], [on(32), kitE(.5)], [on(32, 7), kitE(1)], [t['S41-nest'], kitE(1)], [on(43) + 1.2, None], [t['S51a-sit'], None]]},
  'dax': {'style': 'v2', 'troupe': 'RIVAL', 'role': 'Dax', 'outfit': {'recipe': 'hoodie', 'main': '#c94a3a', 'accent': '#f2d16b', 'legs': '#5a6274', 'trim': '#f2b632'},
    **sq(16, 2), 'yaw': 270,
    'marks': marks((0, {**sq(16, 2), 'yaw': 270, 'travel': {'dir': [-1, 0], 'speed': 4.2, 'max': 10}}), (t['S10-wins'], {**sq(*DAXR), 'yaw': 98, 'travel': {'dir': [.99, -.15], 'speed': 6, 'max': 14}}),
      (t['S19-vault'], {**sqy(FENCE[0] - VDIR[0] * 3.3, FENCE[1] - VDIR[1] * 3.3), 'yaw': yaw_to([0, 0], VDIR), 'travel': {'dir': VDIR, 'speed': 3.3, 'climb': 2.6, 'max': 3.3}}),
      (round(t['S19-vault'] + 1.0, 3), {**sqy(FENCE[0], FENCE[1], 2.6), 'yaw': yaw_to([0, 0], VDIR), 'travel': {'dir': VDIR, 'speed': 3.3, 'climb': -2.6, 'max': 3.3}}),
      (t['S11-grandma'], {**sq(-40, 40), 'yaw': 0}), (t['S20-dax'], {**sq(*DAX1), 'yaw': 180}), (t['S28-greedy'], {**sq(-8, -3), 'yaw': 90, 'travel': {'dir': [1, 0], 'speed': 3.5, 'max': 11.8}}),
      (t['S29b-shadow'], {**sq(P0[0] + STR[0] * 3, P0[1] + STR[1] * 3), 'yaw': yaw_to([0, 0], STR), 'travel': {'dir': STR, 'speed': 4.5, 'max': 22}}),
      (t['S41-nest'], SEATM('dax')), (t['S48-sunrise'], {'origin': [6, 34 + 23.6, 70 - 6.8], 'yaw': 180, 'travel': {'dir': [0, -1], 'speed': 14, 'climb': -3.6}}), (t['S49-bench'], {**sq(-26, 26), 'yaw': 0})),
    'visible': [[0, True], [t['S30-bed'], False], [t['S41-nest'], True], [t['S49-bench'], False]],
    'keys': [[0, 'eggRun'], [t['S19-vault'], 'jump'], [t['S20-dax'], 'eggHold'], [t['S28-greedy'], 'eggRunLow'], [t['S29-clock'], 'eggRun'], [t['S29b-shadow'], 'eggRun'], [t['S41-nest'], 'sit', {'ground': True}], [t['S48-sunrise'], 'sit'], [t['S48b-ride'] + .2, 'cheer']],
    'faces': [[0, 'smug'], [t['S21-laugh'], 'laugh'], [t['S22-queue'], 'smug'], [t['S28-greedy'], 'evil_grin'], [t['S41-nest'], 'smile'], [t['S42-daxnest'], 'xd'], [t['S43-lap'], 'smile'], [t['S48-sunrise'], 'grin']],
    'tools': [[0, 'egg:storm'], [t['S10-wins'], EGGS4], [t['S21-laugh'], 'egg:storm'], [t['S22-queue'], EGGS4], [t['S28-greedy'], 'egg:storm'], [t['S29-clock'], EGGS4], [t['S41-nest'], None]]},
  'lead': {'style': 'v2', 'troupe': 'LEAD', 'role': 'thief', 'outfit': {'recipe': 'hoodie', 'main': '#3fae6a', 'accent': '#ffffff', 'legs': '#3a4a6a', 'trim': '#2e7a4a'},
    **sq(10, 10), 'yaw': 0,
    'marks': marks((0, {**sq(-30, 20), 'yaw': 0}), (t['S06-run'], {'at': 'base8', 'offset': [-math.sin(math.radians(255)) * 8, 0, -math.cos(math.radians(255)) * 8], 'yaw': 75, 'travel': {'dir': [.966, .259], 'speed': 5.5}}),
      (t['S08-steal'], {'at': 'base3', 'offset': [B[3]['s'][0] * 3.2 - B[3]['n'][0] * 2.6, 0, B[3]['s'][1] * 3.2 - B[3]['n'][1] * 2.6], 'yaw': yaw_to([0, 0], [B[3]['n'][0], B[3]['n'][1]])}),
      (t['S09-board'], {**sq(*LEADW), 'yaw': 28.6}), (t['S10-wins'], {**sq(-30, 20), 'yaw': 0}),
      (t['S34-middle'], {**sq(9.5, -2), 'yaw': yaw_to([9.5, -2], [0, 0])}), (t['S36-holds'], {**sq(-50, 50), 'yaw': 0}), (t['S41-nest'], SEATM('lead'))),
    'keys': [[0, 'eggRun'], [t['S08-steal'], 'eggHold'], [t['S09-board'], 'raise'], [t['S10-wins'], 'idle'], [t['S35c-drop'] - .3, 'point'], [t['S41-nest'], 'sit', {'ground': True}]],
    'faces': [[0, 'smug'], [t['S35b-scream'], 'scream'], [t['S41-nest'], 'smile']],
    'tools': [[0, 'egg:ember'], [t['S08-steal'], 'egg:moss'], [t['S10-wins'], None]]},
  'little': {'style': 'v2', 'troupe': 'LITTLE', 'role': 'nest kid', 'outfit': {'recipe': 'tee', 'main': '#4ad8ff', 'accent': '#ffffff', 'legs': '#4a5a80', 'trim': '#f2b632'},
    'origin': SEAT['little'], 'yaw': seat_yaw('little'), 'visible': [[0, False], [t['S41-nest'], True], [t['S48-sunrise'], False]],
    'keys': [[0, 'sit', {'ground': True}]], 'faces': [[0, 'smile']]},
  'grandma': {'style': 'v2', 'build': 'elder_f', 'age': 72, 'skin': '#f6c9a0', 'face': 'determined', 'hair': {'style': 'messy_bun', 'color': '#d8d8d8', 'v': 4}, 'tier': 'hero',
    'outfit': {'recipe': 'robe', 'main': '#f2c94a', 'trim': '#ffffff', 'belt': '#5a3a26', 'legs': '#9a86d8'}, **sq(*grandma), 'yaw': 90,
    'marks': marks((0, {**sq(grandma[0] + .8, grandma[1] - 1.1), 'yaw': yaw_to([0, 0], GDIR), 'travel': {'dir': GDIR, 'speed': 1.5, 'delay': t['S11-grandma'] - .2}})),
    'faces': [[0, 'smirk']], 'keys': [[0, 'sneak']], 'tools': [[0, 'egg:sprinkle']], 'visible': [[0, False], [t['S10-wins'], True], [t['S12-mailman'], False]]},
  'mailman': {'style': 'v2', 'build': 'adult_m', 'age': 41, 'skin': '#c08457', 'face': 'grin', 'hair': {'style': 'side_part', 'color': '#2a1a12', 'v': 4}, 'tier': 'hero',
    'outfit': {'recipe': 'tee', 'main': '#3d6fb8', 'accent': '#f2f2f2', 'legs': '#2f3d5a', 'trim': '#f2d16b'}, 'accessories': ['mailBagEggs'], **sq(*mailman), 'yaw': -12,
    'keys': [[0, 'raise']], 'tools': [[0, 'egg:frost']], 'visible': [[0, False], [t['S12-mailman'] - .1, True], [t['S13-mayor'], False]]},
  'mayor': {'style': 'v2', 'troupe': 'ELDER', 'role': 'mayor', 'outfit': {'recipe': 'tee', 'main': '#6f9bff', 'accent': '#c0392b', 'legs': '#4a4e5e', 'trim': '#c0392b'},
    'accessories': ['skiMask', 'topHatTilt'], **sq(*mayor), 'yaw': 15, 'keys': [[0, 'raise']], 'tools': [[0, 'egg:cosmic']], 'faces': [[0, 'smug']], 'visible': [[0, False], [t['S13-mayor'] - .1, True], [t['S14a-minute'], False]]},
  'afk': {'style': 'v2', 'troupe': 'AFK', 'visible': [[0, False], [t['S24-roofs'] - .1, True], [t['S25-cold'], False], [t['S49-bench'] - .1, True], [t['S50-hatched'], False]],
    'marks': marks((0, {**sq(*AFKR), 'yaw': 300}), (t['S48-sunrise'], {**sq(3.1, 11.2), 'yaw': 30}))},
  'mother': {'style': 'dragon', 'scale': 2, 'dragonFace': 'v2', 'wingScale': 1.5, 'rim': '#e6f4ff', 'spikes': .45, 'saddle': True, 'origin': [0, 400, -600], 'yaw': 0,
    'colors': {'body': '#6b4fb8', 'dark': '#4a3486', 'belly': '#ffd27a', 'horn': '#fff3d6', 'wing': '#e8794a', 'wingDk': '#b8512e', 'eye': '#7affe4'},
    'marks': marks((0, {'origin': MOM0, 'yaw': yaw_to([0, 0], PERP), 'travel': {'dir': PERP, 'speed': 70}}), (2.6, {'origin': [0, 400, -600], 'yaw': 0}),
      (t['S29b-shadow'] + 1.5, {'origin': [31.4 - 55, 60, 7.6 + 10], 'yaw': 100, 'travel': {'dir': [.98, -.18], 'speed': 70}}), (t['S30-bed'], {'origin': [0, 400, -600], 'yaw': 0}),
      (t['S37-down'], {'origin': [MOM37[0] - DM[0] * 6.6, MOM37[1] + 2, MOM37[2] - DM[1] * 6.6], 'yaw': yaw_to(MOM37, LOWC) + 25, 'travel': {'dir': DM, 'speed': 5, 'climb': -1.5}}),
      (t['S38-bird'], {'origin': [0, 12, 57], 'yaw': 180, 'travel': {'dir': [0, 0], 'speed': 1, 'climb': -5, 'max': 2.4}}),
      (t['S40-lift'], {'origin': LIFT0, 'yaw': 90, 'travel': {'dir': [1, 0], 'speed': 4, 'climb': 2.5}}),
      (t['S41-nest'], {'origin': [N[0] + 24, N[1] - 12, N[2] + 6], 'yaw': 180}), (t['S44a-cold'], {'origin': [0, 400, -600], 'yaw': 0}), (t['S44b-gold'], {'origin': [N[0] + 24, N[1] - 12, N[2] + 6], 'yaw': 180}),
      (t['S48-sunrise'], {'origin': [6, 34, 70], 'yaw': 180, 'travel': {'dir': [0, -1], 'speed': 14, 'climb': -3.6}}),
      (t['S49-bench'], {'origin': [0, 400, -600], 'yaw': 0})),
    'keys': [[0, 'fly'], [t['S38-bird'], 'lower'], [t['S40-lift'], 'fly'], [t['S41-nest'], 'curl'], [t['S48-sunrise'], 'fly']]},
}
# runners: seven background-tier kids (S01 lens crossing, the bases, the queue, the nest ring, the final sit)
RUN = [('r1', '#e2733a', 'messy_fringe', '#3a2418', '#e0a77a'), ('r2', '#2e9e78', 'high_ponytail', '#6b4428', '#8d5a3b'), ('r3', '#d9a440', 'curly_top', '#202020', '#c08457'),
       ('r4', '#3f8fb0', 'wavy_bob', '#c8692a', '#f6c9a0'), ('r5', '#b84a7a', 'low_twintails', '#202020', '#fbdcc0'), ('r6', '#7a8a4a', 'spiky_crop', '#3a2418', '#e0a77a'), ('r7', '#6b4a8f', 'curtains', '#e8c25a', '#f6c9a0')]
X1 = [DEND[0] + D2[0] * 6.5, DEND[2] + D2[1] * 6.5]
for k, (nm, col, hs, hc, sk) in enumerate(RUN):
    st = [X1[0] - PERP[0] * (11 + 1.9 * k) + D2[0] * (1.4 if k % 2 else -1.2), X1[1] - PERP[1] * (11 + 1.9 * k) + D2[1] * (1.4 if k % 2 else -1.2)]
    egg = ['ember', 'frost', 'geode', 'sprinkle', 'storm', 'tide', 'moss'][k]
    c = {'style': 'v2', 'tier': 'bg', 'build': 'youth', 'age': 10, 'scale': .8, 'skin': sk, 'face': 'grin', 'hair': {'style': hs, 'color': hc, 'v': 4},
         'outfit': {'recipe': 'tee', 'main': col, 'accent': '#f2ead8', 'legs': '#3b3f46', 'trim': col}, **sq(*st), 'yaw': yaw_to([0, 0], PERP),
         'm': [(0, {**sq(*st), 'yaw': yaw_to([0, 0], PERP), 'travel': {'dir': PERP, 'speed': 6.2}})], 'keys': [[0, 'eggRun']], 'faces': [[0, 'grin']], 'tools': [[0, 'egg:' + egg]], 'vis': [[0, True]]}
    cast[nm] = c
def M(nm, at, mark, key=None, face=None, tool='keep'):
    c = cast[nm]; c['m'].append((at, mark))
    if key: c['keys'].append([at] + ([key] if isinstance(key, str) else key))
    if face: c['faces'].append([at, face])
    if tool != 'keep': c['tools'].append([at, tool])
park = lambda k: {**sq(-60 - 3 * k, 60), 'yaw': 0}
for k, nm in enumerate(['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7']): M(nm, t['S02-kit'] + .5, park(k), 'idle', None, None)
M('r1', t['S03b-toss'] - .5, {**sq(*TOSS), 'yaw': 0}, 'eggHold', 'shock', 'egg:ember'); M('r1', 5.5, {**sq(*TOSS), 'yaw': 0}, 'recoil', 'scream', None)
B1n = B[1]; r2p = bp(1, 2.6, 2.4); M('r2', t['S04-ember'], {**sq(*r2p), 'yaw': yaw_to([0, 0], B1n['n'])}, 'idle', 'smug', None)
B2n = B[2]; r3p = bp(2, -1.6, .2); M('r3', t['S05-frost'], {**sq(*r3p), 'yaw': yaw_to([0, 0], B2n['n'])}, 'idle', 'grin', None)
M('r4', t['S07-lock'] - .2, {**sq(*DIVE0), 'yaw': yaw_to([0, 0], [-lk['n'][0], -lk['n'][1]]), 'travel': {'dir': [-lk['n'][0], -lk['n'][1]], 'speed': 9, 'max': 4.9, 'delay': .25}}, 'run', 'determined', 'egg:frost')
SLAM = round(t['S07-lock'] - .2 + .25 + 4.9 / 9 + .08, 3)
for k, nm in enumerate(['r2', 'r3']): M(nm, t['S10-wins'], {**sq(DAXR[0] - 3 - 1.5 * k, DAXR[1] + (1.6 if k else -1.4)), 'yaw': 98, 'travel': {'dir': [.99, -.15], 'speed': 5.4, 'max': 12}}, 'run', 'shout', None)
M('r4', t['S10-wins'], park(3), 'idle')
for k, nm in enumerate(['r2', 'r3']): M(nm, t['S11-grandma'], park(k + 1), 'idle')
M('r5', t['S14a-minute'], {**sq(*R5), 'yaw': 0}, 'eggHold', 'shock', 'egg:ember'); M('r5', t['S14-potato'], park(4), 'idle', None, None)
for k, nm in enumerate(['r1', 'r2', 'r3', 'r4']):
    M(nm, t['S20-dax'], {**sq(DAX1[0] - 3.3 + 2.2 * k, DAX1[1] + 3 + (k % 2) * .8), 'yaw': 180}, 'cheer' if k % 2 else 'idle', 'starry', None)
    M(nm, t['S22-queue'], {**sq(*Q(k)), 'yaw': yaw_to(Q(k), N9)}, 'eggHold' if k == 0 else 'idle', 'smug', 'egg:storm' if k == 0 else None)
M('r5', t['S22-queue'], {**sq(*CUT0), 'yaw': yaw_to([0, 0], [-b9['s'][0], -b9['s'][1]]), 'travel': {'dir': [-b9['s'][0], -b9['s'][1]], 'speed': 2.4, 'max': 3.2, 'delay': .3}}, 'walk', 'smug')
M('r5', on(16, 2), {**sq(*Q(4)), 'yaw': yaw_to(Q(4), N9)}, 'idle')
for k, nm in enumerate(['r1', 'r2', 'r3', 'r4', 'r5']): M(nm, t['S23-notice'], park(k), 'idle', 'smile', None)
M('r1', t['S44a-cold'], {**sq(TA[0], TA[2]), 'yaw': -90}, 'cheer', 'shout'); M('r2', t['S44a-cold'], {**sq(TB[0], TB[2]), 'yaw': 90}, 'cheer', 'scream')
for nm in ['r1', 'r2', 'r3', 'r4', 'r5']: M(nm, t['S41-nest'], SEATM(nm), ['sit', {'ground': True}], 'smile', None)
for nm in ['r1', 'r2']: M(nm, t['S44b-gold'], SEATM(nm), ['sit', {'ground': True}], 'smile')
SITS = {'r1': [K0[0] + 3.6, K0[1] + .2], 'r2': [K0[0] - 3.6, K0[1] + .4], 'r3': [K0[0] + 1.6, K0[1] - 3.4], 'r4': [K0[0] - 1.8, K0[1] - 3.5]}
for nm in ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7']:
    if nm in SITS: M(nm, t['S48-sunrise'], park(int(nm[1:])), 'idle'); M(nm, t['S51a-sit'], {**sq(*SITS[nm]), 'yaw': yaw_to(SITS[nm], [K0[0] + 1, K0[1] + 8.5])}, 'sitEgg', 'smile', kitE(1))
    else: M(nm, t['S41-nest'] if nm in ('r6', 'r7') else t['S48-sunrise'], park(int(nm[1:]) + 7), 'idle')
for nm, *_ in RUN:
    c = cast[nm]; c['m'].sort(key=lambda x: x[0]); c['marks'] = marks(*c.pop('m')); c.pop('vis')
    for k in ('keys', 'faces', 'tools'): c[k].sort(key=lambda x: x[0])
cast['r4']['visible'] = [[0, True], [round(SLAM - .1, 3), False], [t['S10-wins'], True]]
# hatchlings (baby build: big head, big eyes, small wings), each in its egg's colours; 1.3 × a kid's head when perched
HATCH = {'ember': {'body': '#3a2c2e', 'dark': '#1a1416', 'horn': '#ff7a1a', 'belly': '#ff9a3a', 'eye': '#ffb43a'}, 'frost': {'body': '#5fc4ff', 'dark': '#2a78d8', 'horn': '#ffffff', 'belly': '#e8f6ff', 'eye': '#1a3a9a'},
         'moss': {'body': '#6fa04a', 'dark': '#4f7a34', 'belly': '#c8e08a', 'eye': '#e8ff6a'}, 'tide': {'body': '#4fc4b8', 'dark': '#2f8f86', 'belly': '#e8fffb', 'eye': '#1a6aa0'},
         'geode': {'body': '#9a6ad8', 'dark': '#6a3aa8', 'horn': '#c45cff', 'belly': '#d9b6ff', 'eye': '#c45cff'}, 'storm': {'body': '#2a3a7a', 'dark': '#141c3a', 'horn': '#ffe14a', 'belly': '#ffe14a', 'eye': '#ffe14a'},
         'sprinkle': {'body': '#ff9ccb', 'dark': '#e07aa8', 'belly': '#ffffff', 'eye': '#7a3aff'}, 'cosmic': {'body': '#3a1a6e', 'dark': '#28124e', 'horn': '#fff6c8', 'belly': '#7a5ad8', 'eye': '#fff6c8'}}
HSB = round(1.3 * 1.16 * .82 / 17.65, 4)   # parts/eggs.js hatchlingScale(.82, baby)
lap = lambda P, yaw, f=1.0, up=.85: [round(P[0] + math.sin(math.radians(yaw)) * f, 3), round(P[1] + up, 3), round(P[2] + math.cos(math.radians(yaw)) * f, 3)]
OWNER = {'storm': 'dax', 'frost': 'little', 'ember': 'lead', 'moss': 'r1', 'tide': 'r2', 'geode': 'r3', 'sprinkle': 'r4', 'cosmic': 'r5'}
for k, (name, cols) in enumerate(HATCH.items()):
    who = OWNER[name]; yaw = seat_yaw(who)
    pos = [SEAT['dax'][0], SEAT['dax'][1] + 3.65, SEAT['dax'][2]] if who == 'dax' else lap(SEAT[who], yaw, 1.35, .45) if who == 'little' else lap(SEAT[who], yaw)   # Little's baby sits low on her knees: her face stays clear
    bench = [[t['S49-bench'], {'origin': [3.1, 4.7, 11.2], 'yaw': 30}]] if name == 'moss' else [[t['S49-bench'], {'origin': [0, -400, 0], 'yaw': 0}]]
    cast['h_' + name] = {'style': 'dragon', 'baby': True, 'scale': HSB, 'colors': {**cols, 'wing': cols.get('horn', cols['belly']), 'wingDk': cols['dark']}, 'origin': pos, 'yaw': yaw,
                         'marks': marks((0, {'origin': [0, -400, 0], 'yaw': 0}), (t['S41-nest'], {'origin': pos, 'yaw': yaw}), (t['S44a-cold'], {'origin': [0, -400, 0], 'yaw': 0}), (t['S44b-gold'], {'origin': pos, 'yaw': yaw}),
                                        (t['S48-sunrise'], {'origin': [-10 + k * 3, 40 + k % 3 * 2, 70 - k * 2], 'yaw': 180, 'travel': {'dir': [0, -1], 'speed': 13, 'climb': -3}})) + bench,
                         'keys': [[0, 'perch'], [t['S41-nest'] + .13 * k, 'wiggle'], [t['S48-sunrise'], 'fly'], [t['S49-bench'], 'perch']]}
KH = lambda P, yaw, up=1.55, fwd=1.05: [round(P[0] + math.sin(math.radians(yaw)) * fwd, 3), round(P[1] + up, 3), round(P[2] + math.cos(math.radians(yaw)) * fwd, 3)]
_ky = math.radians(seat_yaw('kit')); GL = [round(SEAT['kit'][0] + math.sin(_ky) * .9 + math.cos(_ky) * 1.0, 3), round(SEAT['kit'][1] + 2.0, 3), round(SEAT['kit'][2] + math.cos(_ky) * .9 - math.sin(_ky) * 1.0, 3)]   # held at chest height beside her face
KBH = [KB[0], 4.7, KB[1]]; _y0 = math.radians(yaw_to(K0, [K0[0] + 1, K0[1] + 8.5])); K0L = [round(K0[0] + math.cos(_y0) * 1.1, 3), 1.25, round(K0[1] - math.sin(_y0) * 1.1, 3)]   # beside her, not in front of her face
cast['goldling'] = {'style': 'dragon', 'baby': True, 'scale': HSB, 'colors': {'body': '#ffc23a', 'dark': '#e09a1a', 'belly': '#fff1b0', 'horn': '#ffffff', 'wing': '#ffd86a', 'wingDk': '#e0a83a', 'eye': '#7a3aff'},
                    'origin': GL, 'yaw': seat_yaw('kit') + 180,
                    'marks': marks((0, {'origin': [0, -400, 0], 'yaw': 0}), (on(43) + 1.2, {'origin': GL, 'yaw': seat_yaw('kit') + 180}), (t['S48-sunrise'], {'origin': [0, -400, 0], 'yaw': 0}),
                                   (t['S50b-one'], {'origin': KBH, 'yaw': yaw_to(KB, [KB[0] - 5.5, KB[1] + 1])}), (t['S51a-sit'], {'origin': K0L, 'yaw': yaw_to(K0, [K0[0] + 1, K0[1] + 8.5])})),
                    'keys': [[0, 'perch'], [SNEEZE - .1, 'roar'], [SNEEZE + .5, 'perch']]}

POTATO = {'id': 'potato', 'count': 34, 'centre': [0, 4], 'radius': 13.5, 'inner': 9.5, 'mode': 'cheer', 'face': [0, 4], 'seed': 12, 'spacing': 1.9, 'expression': 'shout'}
RINGC = {'count': 40, 'centre': [0, 0], 'radius': 13.5, 'inner': 7.5, 'face': [0, 0], 'seed': 9, 'spacing': 1.8, 'clear': [[-1.2, -10, 2.2], [.4, -6.8, 1.9], [-.4, -8.4, 1.9], [-10, 0, 4.6], [-6, 1, 4.5], [0, 10.5, 5.5], [-5, 10.5, 5.5], [5, 10, 5], [5.5, -9.5, 4.5], [9.5, -2, 2.2], [6.8, -2.6, 1.9], [8.2, -2.3, 1.9], [-7, -10, 5], [-2, -10, 4]],
         'expressions': [[0, 'smile'], [on(30, 4) - .1, 'scream'], [t['S37a-bell'], 'shock']]}
crowds = [
  {'id': 'town', 'count': 30, 'centre': [4, -10], 'radius': 9, 'mode': 'ambient', 'seed': 4, 'spacing': 1.8, 'clear': [[-2.5, 7, 2.4], [5, 5, 2.4], [-5, 4, 2.4], [1, 3, 2.4], [0, -22, 6]], 'visible': [[0, True], [t['S14a-minute'], False], [t['S16-kit'], True], [t['S20-dax'], False], [t['S22-queue'], True], [t['S28-greedy'], False]]},
  {**POTATO, 'visible': [[0, False], [t['S14-potato'], True], [t['S15a-claws'], False], [t['S44a-cold'], True], [t['S44b-gold'], False]], 'clear': [[1.7, 12, 2], [-1.7, 12, 2], [0, 17, 4.5], [3, -15, 4], [3, -11, 4]]},
  {'id': 'ring', **RINGC, 'mode': 'ambient', 'visible': [[0, False], [t['S34-middle'], True], [t['S37a-bell'], False]]},
  {'id': 'ringUp', **RINGC, 'mode': 'lookUp', 'visible': [[0, False], [t['S37a-bell'], True], [t['S37b-wings'], False]]},
  {'id': 'runA', 'count': 14, 'centre': [-2, -10], 'radius': 5, 'mode': 'panic', 'dir': PERP, 'at': 0, 'seed': 7, 'visible': [[0, True], [t['S02-kit'], False]]},
  {'id': 'runB', 'count': 12, 'centre': [-12, 2.5], 'radius': 3, 'mode': 'panic', 'dir': [1, 0], 'at': t['S23-notice'] - .3, 'seed': 8, 'visible': [[0, False], [t['S23-notice'], True], [t['S24-roofs'], False]]},
  {'id': 'runC', 'count': 12, 'centre': [-12, 2.5], 'radius': 3, 'mode': 'panic', 'dir': [1, 0], 'at': t['S26-still'] - .3, 'seed': 18, 'visible': [[0, False], [t['S26-still'], True], [t['S27-still'], False]]},
  {'id': 'runD', 'count': 14, 'centre': [-14, 3], 'radius': 4, 'mode': 'panic', 'dir': [1, 0], 'at': t['S27-still'] - .5, 'seed': 28, 'visible': [[0, False], [t['S27-still'], True], [t['S28-greedy'], False]]},
  {'id': 'sitTown', 'count': 56, 'centre': [0, 1], 'radius': 16, 'mode': 'sit', 'lapEggs': '#ffc23a', 'expression': 'smile', 'seed': 31, 'spacing': 1.9, 'clear': [[K0[0], K0[1], 4.2], [-2, 13, 4.5], [-7, 14, 6], [4.6, 12.4, 2.5], [0, -22, 6]],
   'visible': [[0, False], [t['S51a-sit'], True]]},
]
effects = [
  {'type': 'shake', 'at': round(on(24, 3) + .2, 2), 'dur': .5, 'amp': .08},
  {'type': 'flash', 'at': round(on(33, 4), 2), 'dur': .3, 'color': '#fff6e0'},
  {'type': 'particles', 'preset': 'dust', 'origin': {'anchor': 'square', 'offset': [0, .5, 0]}, 'count': 120, 'at': on(34), 'dur': 1.2},
  {'type': 'particles', 'preset': 'sparkle', 'origin': add(KITN, [0, 1.9, -1.6]), 'count': 50, 'at': round(on(43, 2), 2), 'dur': 1.0},
  {'type': 'particles', 'preset': 'sparkle', 'origin': [GL[0] - math.sin(_ky) * 1.4, GL[1] + .7, GL[2] - math.cos(_ky) * 1.4], 'count': 40, 'at': SNEEZE, 'dur': 1.2},   # behind them, not in front
]
spec = {'slug': 'egg', 'fps': 30, 'end': END, 'season': 1, 'hero': 'kit', 'captionStyle': 'pop-shorts-v3', 'look': 'nightBright',
  'note': 'Season 1 episode 01 egg (card 01). Generated by stories/egg/gen.py from stories/egg/beats.md + the owner fix pass (2026-11-14); no labels (SEASON_1.md §2c).',
  'world': 'stories/egg/world.js', 'ruleLines': 2, 'faceMap': FACEMAP,
  'beats': {'B1': ['S01-town', 'S03b-toss'], 'B2': ['S04-ember', 'S12-mailman'], 'B3': ['S14a-minute', 'S22-queue'], 'B4': ['S23-notice', 'S27-still'], 'B5': ['S28-greedy', 'S35b-scream'],
            'B6': ['S36-holds', 'S36-holds'], 'B7': ['S37a-bell', 'S39-dragon'], 'B8': ['S41-nest', 'S47-sitters'], 'B9': ['S48-sunrise', 'S51-rhyme']}, 'heroSpotSubject': True, 'heroSpotIntensity': 110, 'subjectLift': .45,
  'clues': ['S15a-claws', 'S24-roofs', 'S25-cold'], 'twist': 'S39-dragon', 'afk': ['S24-roofs', 'S49-bench'], 'moneyShot': 'S41-nest',
  'moods': {'B1': 'heist', 'B2': 'playful', 'B3': 'playful', 'B4': 'curious', 'B5': 'tense', 'B6': 'hush', 'B7': 'wonder', 'B8': 'wonder', 'B9': 'warm'},
  'emphasis': ['midnight', 'zero', 'dragon', 'babysitters', 'Hatched', 'holds on'],
  'worldState': {'flyers': [[0, False], [t['S14-potato'], True], [t['S15a-claws'], False]],
                 'clock': [[0, '1159'], [round(t['S29b-shadow'] - .15, 3), '12'], [t['S30-bed'], '1159'], [t['S41-nest'], '12'], [t['S48-sunrise'], '1159']],
                 'board': [[0, 'race'], [round(on(48, 4), 3), 'hatched']], 'plainEgg': [[0, True], [79.6, False]], 'benchEgg': [[0, False], [t['S49-bench'], True], [t['S50-hatched'], False]],
                 'hotToss': [[0, None], [t['S03b-toss'], {'t0': 5.5, 'from': [TOSS[0], 3.4, TOSS[1] + .9], 'to': [TOSS[0] + 6.5, .5, TOSS[1] + 2.5]}], [9.0, None]],
                 'slam': [[0, -99], [t['S06-run'], SLAM]], 'coldBase': [[0, False], [t['S15b-dawn'], True], [t['S16-kit'], False]],
                 'geodeAway': [[0, False], [30.0, True], [34.9, False]], 'grassEgg': [[0, False]], 'returnNote': [[0, False], [35.5, True]], 'bigMoon': [[0, None], [t['S37b-wings'], {'pos': BIGMOON, 'size': 420}], [t['S38-bird'], None]],
                 'eggLight': [[0, None], [t['S36-holds'], {'pos': [.4, 3.2, 1.6], 'i': 9}], [t['S37a-bell'], None], [t['S38-bird'], {'pos': [.6, 3.2, 1.6], 'i': 12}], [t['S40-lift'], None]],
                 'fence': [[0, False], [t['S19-vault'], True], [t['S20-dax'], False]], 'nestSet': [[0, False], [t['S41-nest'], True], [t['S44a-cold'], False], [t['S44b-gold'], True], [t['S48-sunrise'], False]],
                 'moonSpot': [[0, None], [t['S29b-shadow'], {'pos': [31.4, 140, 7.6], 'target': [31.4, 0, 7.6], 'angle': .5, 'i': .5}], [t['S30-bed'], None]],
                 'coldToss': [[0, None], [t['S44a-cold'], {'t0': t['S44a-cold'], 't1': t['S44b-gold'], 'a': [TA[0] - .8, 3.6, TA[2]], 'b': [TB[0] + .8, 3.6, TB[2]]}], [t['S44b-gold'], None]]},
  'sfxCues': [[5.5, 'whoosh'], [SLAM, 'thud'], [on(33) + .1, 'bell'], [on(33) + .6, 'bell'], [on(33) + 1.1, 'bell'], [on(43) + .1, 'crack'], [SNEEZE + .05, 'sparkle'], [t['S40-lift'], 'whoosh']],
  'cast': cast, 'crowds': crowds, 'effects': effects, 'shots': S}
json.dump(spec, open(os.path.join(HERE, 'episode.json'), 'w'), indent=1)
print(json.dumps({'shots': len(S), 'end': END, 'cast': len(cast)}))
