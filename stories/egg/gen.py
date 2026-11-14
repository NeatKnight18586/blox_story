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
KC = lambda d, up, tu: [K0[0] - D2[0] * d, up, K0[1] - D2[1] * d]
shot('S02-kit', on(2), 'close', 'snap', 'square', 'The hero, still and empty-handed while the thieves run: face by 5 s.', subject='kit', see=['kit'],
     snapAt=.1, **{'from': cam(KC(30, 6.5, 0), [K0[0], 4.6, K0[1]], 40), 'to': cam(KC(5, 4.8, 0), [K0[0], 4.6, K0[1]], 36)}, fit={'actor': 'kit', 'height': .48, 'part': 'head', 'y': .38}, shadowRadius=20)
shot('S03-clock', on(2, 5), 'insert', 'push', 'square', 'Never hold one: the clock at 11:59 (insert ≤ 1.2 s).', see=[], ruleImage=True, beat=True,
     **{'from': cam([2, 26.5, 0], CLOCK, 30), 'to': cam([1, 27.6, -5], CLOCK, 28)}, shadowRadius=20)
TOSS = [8, 4]
shot('S03b-toss', on(2, 9), 'medium', 'push', 'square', 'At midnight: a kid flings away a red-pulsing egg like it burns.', see=['r1'], beat=True,
     **{'from': cam([TOSS[0] + 1.5, 3.4, TOSS[1] + 10], [TOSS[0], 2.6, TOSS[1]], 42), 'to': cam([TOSS[0] + 1.2, 3.3, TOSS[1] + 8.5], [TOSS[0], 2.6, TOSS[1]], 42)}, shadowRadius=16)
# B2 expansion (each ≤ 2.5 s) ---------------------------------------------------------------------------------------------------
def basecam(i, back=12, side=-3, up=4, fov=40, tgt_up=.8):
    b = B[i]; p = [b['nest'][0] + b['n'][0] * back + b['s'][0] * side, b['y'] + up, b['nest'][2] + b['n'][1] * back + b['s'][1] * side]
    return cam(p, [b['nest'][0], b['nest'][1] + tgt_up, b['nest'][2]], fov)
bp = lambda i, out, side=0: [B[i]['nest'][0] + B[i]['n'][0] * out + B[i]['s'][0] * side, B[i]['nest'][2] + B[i]['n'][1] * out + B[i]['s'][1] * side]   # ground point near base i's nest
shot('S04-ember', on(3), 'wide', 'push', 'bases', 'Every kid has a base: the Ember base and its kid guarding the nest.', see=['r2'], **{'from': basecam(1, 17, -4, 5.5, 46, 1.5), 'to': basecam(1, 14, -3, 5, 44, 1.5)}, shadowRadius=24)
shot('S05-frost', on(3, 5), 'close', 'push', 'bases', 'Every base has a nest: a kid leans over the Frost nest, the egg glowing.', see=['r3'], **{'from': basecam(2, 6.5, -2.5, 3.2, 38, .5), 'to': basecam(2, 5.5, -2, 3, 36, .5)}, shadowRadius=12)
shot('S06-run', on(4), 'wide', 'gamecam', 'bases', 'Grab an egg. Run: behind a runner leaving the Sprinkle base.', see=['lead'], follow='lead', heading=75, distance=11, height=5.5, **{'from': {'fov': 60}}, shadowRadius=24)
lk = B[10]; door = [lk['c'][0] + lk['n'][0] * 4.1, lk['y'] + 3.1, lk['c'][1] + lk['n'][1] * 4.1]
DIVE0 = [door[0] + lk['n'][0] * 8, door[2] + lk['n'][1] * 8]
shot('S07-lock', on(4, 4), 'medium', 'push', 'bases', 'Lock your door for sixty seconds: a kid dives through the door, slams it, the lock ring fills round the frame.', see=['r4'],
     **{'from': cam([door[0] + lk['n'][0] * 12 + lk['s'][0] * 4, door[1] + .6, door[2] + lk['n'][1] * 12 + lk['s'][1] * 4], [door[0] + lk['n'][0] * 1.5, door[1] - .6, door[2] + lk['n'][1] * 1.5], 44),
        'to': cam([door[0] + lk['n'][0] * 10.5 + lk['s'][0] * 3.4, door[1] + .5, door[2] + lk['n'][1] * 10.5 + lk['s'][1] * 3.4], [door[0] + lk['n'][0] * 1.2, door[1] - .6, door[2] + lk['n'][1] * 1.2], 44)}, shadowRadius=14)
shot('S08-steal', on(5), 'wide', 'push', 'bases', 'Somebody steals it right back: the Moss egg lifted from its nest.', see=['lead'],
     **{'from': basecam(3, 15, 5, 5, 46, 1.4), 'to': basecam(3, 13, 4, 4.6, 44, 1.4)}, shadowRadius=22)
WIN = [-22 + 6.06 * math.sin(.5), -30 + 6.06 * math.cos(.5)]   # town hall window (world.js)
LEADW = [WIN[0] + NBV[0] * .9, WIN[1] + NBV[1] * .9]
mid9 = [(LEADW[0] + BOARD[0]) / 2, (LEADW[1] + BOARD[2]) / 2]
C9 = [mid9[0] + NBV[0] * 16, 3.4, mid9[1] + NBV[1] * 16]
shot('S09-board', on(6), 'medium', 'tiltUp', 'square', 'There is a scoreboard on the town hall: a kid lifts an egg through a window; tilt up to DAX 200 on top.', see=['lead'],
     ease='linear', **{'from': cam(C9, [LEADW[0], 3.4, LEADW[1]], 50), 'to': cam([C9[0], C9[1] + .4, C9[2]], [BOARD[0], BOARD[1] + .6, BOARD[2]], 50)}, shadowRadius=22)
DAXR = [-12, 5]
shot('S10-wins', on(6, 7), 'wide', 'push', 'square', 'Most eggs wins: Dax sprints across the square, arms full, kids chasing.', see=['dax'],
     **{'from': cam([-4, 6.5, 26], [-6, 2.5, 5], 50), 'to': cam([-3.5, 6, 23.5], [-5, 2.5, 5], 48)}, shadowRadius=30)
grandma, mailman, mayor = [4, 10], [-5, 4], [1, 3]
shot('S11-grandma', on(7), 'medium', 'push', 'square', 'Grandmas play: a grandma sprints with an egg.', subject='grandma', see=['grandma'], beat=True, follow='grandma', followOffset=[0, 2.6, 0],
     **{'from': cam([grandma[0] + 2, 3.6, grandma[1] + 9], [grandma[0], 2.6, grandma[1]], 40)}, shadowRadius=14)
shot('S12-mailman', on(7, 2), 'close', 'push', 'square', 'Mailmen play: the mailman pulls eggs out of his mailbag.', subject='mailman', see=['mailman'], beat=True,
     **{'from': cam([mailman[0] - 1.5, 4.4, mailman[1] + 7], [mailman[0], 3.4, mailman[1]], 40)}, fit={'actor': 'mailman', 'height': .52, 'part': 'full', 'y': .55}, shadowRadius=12)
shot('S13-mayor', on(7, 4), 'medium', 'push', 'square', 'The mayor plays in a ski mask, top hat on top: both read (laugh 1).', subject='mayor', see=['mayor'],
     **{'from': cam([mayor[0] + 2, 2.6, mayor[1] + 8], [mayor[0], 3.4, mayor[1]], 40)}, fit={'actor': 'mayor', 'height': .44, 'part': 'full', 'y': .56}, shadowRadius=14)
# B3 defect -----------------------------------------------------------------------------------------------------------------------
R5 = [-6, 10]
shot('S14a-minute', on(8), 'close', 'push', 'square', 'One minute to midnight: a kid stares at the egg in her hands.', subject='r5', see=['r5'],
     **{'from': cam([R5[0] + .5, 4.6, R5[1] + 7], [R5[0], 3.8, R5[1]], 38)}, fit={'actor': 'r5', 'height': .48, 'part': 'head', 'y': .38}, shadowRadius=12)
shot('S14-potato', on(8, 6), 'wide', 'crane', 'square', 'The whole town plays hot potato: crane over the square, eggs flying hand to hand (looking south: no clock).', see=['r1'],
     ease='inOutSine', **{'from': cam([3, 12, -15], [0, 3, 6], 52), 'to': cam([3, 15.5, -13.5], [0, 2.5, 6.5], 51)}, shadowRadius=40)
shot('S15a-claws', on(9), 'insert', 'push', 'square', 'Clue 2: claw marks gouged into the clock tower, moonlit.', see=[], clueObject='clawMarks',
     **{'from': cam([2, 21.6, -8.5], [0, 23.2, -18.7], 34), 'to': cam([1.6, 22.4, -10.5], [0, 23.2, -18.7], 32)}, shadowRadius=12)
shot('S15b-dawn', on(9, 8), 'wide', 'push', 'bases', 'Gone by morning: an empty base at dawn, one cold egg in the nest.', see=[], look='goldenHour',
     **{'from': basecam(4, 15, -4, 5, 46, 1.2), 'to': basecam(4, 12.5, -3.4, 4.4, 44, 1.2)}, shadowRadius=22)
kb = B[0]; KIT_B = [kb['front'][0], kb['front'][1]]
shot('S16-kit', on(10), 'medium', 'push', 'kitbase', 'Then there is Kit, eleven: her base is a mat.', subject='kit', see=['kit'],
     **{'from': cam([KIT_B[0] + kb['n'][0] * 8 + 2, 3.5, KIT_B[1] + kb['n'][1] * 8], [KIT_B[0], 3, KIT_B[1]], 40)}, fit={'actor': 'kit', 'height': .36, 'part': 'full', 'y': .62}, shadowRadius=16)
b11 = B[11]; WALK11 = bp(11, 4.5, -6)
shot('S16b-never', on(11, 3), 'wide', 'push', 'bases', 'Kit has never stolen anything: she walks right past a glowing egg.', see=['kit'],
     **{'from': cam([WALK11[0] + b11['n'][0] * 13 + b11['s'][0] * 6, 5, WALK11[1] + b11['n'][1] * 13 + b11['s'][1] * 6], [B[11]['nest'][0], 2, B[11]['nest'][2]], 46),
        'to': cam([WALK11[0] + b11['n'][0] * 11.5 + b11['s'][0] * 5.5, 4.6, WALK11[1] + b11['n'][1] * 11.5 + b11['s'][1] * 5.5], [B[11]['nest'][0], 2, B[11]['nest'][2]], 44)}, shadowRadius=24)
g5 = B[5]; N5 = g5['nest']; GE = [N5[0] + g5['n'][0] * 7 + 2.5, N5[2] + g5['n'][1] * 7]; K5 = [N5[0] + g5['n'][0] * 2.3, N5[2] + g5['n'][1] * 2.3]
shot('S17-found', on(12), 'medium', 'push', 'bases', 'She found an egg once: Kit picks the Geode egg out of the grass.', subject='kit', see=['kit'],
     **{'from': cam([GE[0] + 3, 3.2, GE[1] + 6], [GE[0] - .8, 2.2, GE[1]], 40)}, fit={'actor': 'kit', 'height': .4, 'part': 'full', 'y': .6}, shadowRadius=14)
CK5 = [K5[0] + g5['n'][0] * 2.2 + g5['s'][0] * 4.2, K5[1] + g5['n'][1] * 2.2 + g5['s'][1] * 4.2]
shot('S17r-return', on(12, 5), 'close', 'push', 'bases', 'She returned it, with a sorry note: the egg back in its nest, then the folded note.', see=['kit'],
     **{'from': cam([CK5[0], 3.6, CK5[1]], [(N5[0] + K5[0]) / 2, 1.9, (N5[2] + K5[1]) / 2], 38), 'to': cam([CK5[0] - g5['s'][0] * .6, 3.3, CK5[1] - g5['s'][1] * .6], [(N5[0] + K5[0]) / 2, 1.7, (N5[2] + K5[1]) / 2], 36)}, shadowRadius=10)
shot('S18-zero', on(13), 'insert', 'push', 'square', 'Her score is zero: KIT 0 at the bottom of the scoreboard.', see=[],
     **{'from': cam(NB(15), [BOARD[0], 6.4, BOARD[2]], 30), 'to': cam(NB(12.5), [BOARD[0], 6.2, BOARD[2]], 30)}, shadowRadius=12)
FENCE = [-12, 9]
shot('S19-vault', F(on(13, 4), -2), 'medium', 'push', 'square', 'It has always been zero: Dax vaults the fence side-on, mid-air, four eggs in his arms.', see=['dax'],
     **{'from': cam([FENCE[0] + .5, 3.4, FENCE[1] + 12], [FENCE[0] + .5, 3.2, FENCE[1]], 44), 'to': cam([FENCE[0] + .8, 3.4, FENCE[1] + 11], [FENCE[0] + .8, 3.2, FENCE[1]], 44)}, shadowRadius=16)
DAX1 = [4, 8]
shot('S20-dax', on(14), 'wide', 'push', 'square', 'Her big brother Dax is number one: kids gather round him on the square.', see=['dax'],
     **{'from': cam([6, 6.5, -7], [4, 3, 9], 48), 'to': cam([5.6, 6, -5.5], [4, 3, 9], 46)}, shadowRadius=26)
shot('S20b-eggs', on(14, 7), 'medium', 'push', 'square', 'Two hundred eggs: Dax, arms piled high.', subject='dax', see=['dax'],
     **{'from': cam([DAX1[0] + 1.5, 3, DAX1[1] - 8], [DAX1[0], 3, DAX1[1]], 40)}, fit={'actor': 'dax', 'height': .42, 'part': 'full', 'y': .58}, shadowRadius=14)
shot('S21-laugh', on(15), 'close', 'push', 'square', 'He calls her the slowest thief alive: Dax laughs.', subject='dax', see=['dax'],
     **{'from': cam([DAX1[0] - 1, 5.2, DAX1[1] - 7], [DAX1[0], 5, DAX1[1]], 38)}, fit={'actor': 'dax', 'height': .48, 'part': 'head', 'y': .38}, shadowRadius=12)
b9 = B[9]; Q = lambda k: bp(9, 2.2 + 1.7 * k)
shot('S22-queue', on(16), 'medium', 'push', 'bases', 'She just keeps saying excuse me: Kit at the back of a queue, kids cutting in front, Kit polite.', subject='kit', see=['kit', 'r1'],
     **{'from': cam([Q(4)[0] + b9['s'][0] * 8 + b9['n'][0] * 2, 3.4, Q(4)[1] + b9['s'][1] * 8 + b9['n'][1] * 2], [Q(3)[0], 2.6, Q(3)[1]], 46)}, fit={'actor': 'kit', 'height': .32, 'part': 'full', 'y': .6}, shadowRadius=18)
# B4 crack -----------------------------------------------------------------------------------------------------------------------
K2 = [2, 8]
shot('S23-notice', on(17), 'close', 'push', 'square', 'But Kit notices things; running kids do not: runners blur past behind her.', subject='kit', see=['kit'],
     **{'from': cam([3, 4.2, 15], [2, 4.8, 8], 38)}, fit={'actor': 'kit', 'height': .48, 'part': 'head', 'y': .38}, shadowRadius=12)
AFKR = [18, -27]
shot('S24-roofs', on(18), 'wide', 'push', 'square', 'The town is full of eggs: nests on the rooftops under an empty starry sky; AFK frozen by a wall (cameo 1).', see=['afk'],
     **{'from': cam([12, 3.2, -10], [22, 13, -40], 50), 'to': cam([12.6, 3.4, -12], [22, 13.5, -40], 48)}, shadowRadius=40)
KV = [-6, -36]
shot('S24b-vane', on(18, 6), 'medium', 'push', 'square', 'Nobody has ever seen a bird: Kit looks up at the dragon weathervane against the stars (clue 1).', see=['kit'], clueObject='weathervane',
     **{'from': cam([0, 2.4, -38.5], [-17, 12, -31], 50), 'to': cam([-.6, 2.4, -38.2], [-17.5, 12.5, -31], 48)}, shadowRadius=20)
shot('S25-cold', on(19), 'insert', 'static-drift', 'square', 'The eggs are cold, always cold: the Plain egg in Kit\'s still hands (clue 3, spoken).', see=['kit'], clueObject='egg_plain', captionY='high',
     **{'from': cam([2.5, 5.0, 12.0], [2, 3.25, 9.1], 34), 'to': cam([2.45, 4.95, 11.8], [2, 3.25, 9.1], 34)}, shadowRadius=8)
shot('S26-still', on(20), 'medium', 'push', 'square', 'Unless you stand very still: Kit, curious, does not move; runners blur past behind her.', subject='kit', see=['kit'],
     **{'from': cam([2.6, 3.4, 16], [2, 3, 8], 40)}, fit={'actor': 'kit', 'height': .38, 'part': 'full', 'y': .6}, shadowRadius=14)
shot('S26b-warm', on(20, 5), 'close', 'push', 'square', 'Then they get warm: the egg goes cold blue to gold and lights her face.', subject='kit', see=['kit'],
     **{'from': cam([3.5, 4.4, 15], [2, 4.6, 8], 36)}, fit={'actor': 'kit', 'height': .5, 'part': 'head', 'y': .38}, shadowRadius=12)
shot('S27-still', on(21), 'wide', 'push', 'square', 'Nobody else stands still long enough: runners streak past the one still girl.', subject='kit', see=['kit'],
     **{'from': cam([2, 9, 34], [2, 3, 8], 46), 'to': cam([2, 8, 30], [2, 3, 8], 44)}, shadowRadius=30)
# B5 crisis ----------------------------------------------------------------------------------------------------------------------
shot('S28-greedy', on(22), 'medium', 'track', 'square', 'One night, Dax got greedy: tracking him running, arms full, grinning.', subject='dax', see=['dax'], follow='dax',
     **{'from': cam([1.0, 3.4, -8], [0, 3, 0], 42), 'to': cam([.5, 3.4, -7.6], [0, 3, 0], 42)}, shadowRadius=16)
shot('S28b-more', on(23), 'close', 'push', 'square', 'One more egg, just one more: Dax grins, reaching.', subject='dax', see=['dax'],
     **{'from': cam([-1.5, 5, -10], [-1, 5, -3], 38)}, fit={'actor': 'dax', 'height': .48, 'part': 'head', 'y': .38}, shadowRadius=12)
shot('S29-clock', F(on(23, 5), -2), 'insert', 'push', 'square', 'The clock: 11:59, the hand clicks to twelve (insert ≤ 1.3 s).', see=[],
     **{'from': cam([1.5, 27.6, -4], CLOCK, 26), 'to': cam([1, 28.2, -8], CLOCK, 24)}, shadowRadius=12)
P0 = [33 * math.sin(math.radians(50)), 33 * math.cos(math.radians(50))]; P1 = [33 * math.sin(math.radians(82)), 33 * math.cos(math.radians(82))]
STR = [(P1[0] - P0[0]), (P1[1] - P0[1])]; sl = math.hypot(*STR); STR = [STR[0] / sl, STR[1] / sl]
shot('S29b-shadow', on(24), 'medium', 'heroLow', 'square', 'The clock struck twelve; a shadow sweeps across the houses and cobbles, covering the moon (Dax never shown taken).', see=['dax'], ground=0,
     **{'from': cam([P0[0], .9, P0[1]], [P0[0] + STR[0] * 30, 9, P0[1] + STR[1] * 30], 64), 'to': cam([P0[0] - STR[0] * .8, .8, P0[1] - STR[1] * .8], [P0[0] + STR[0] * 30, 12, P0[1] + STR[1] * 30], 66)}, shadowRadius=40)
BED = [ROOM[0] + 2.9, ROOM[2] - .6]
shot('S30-bed', on(25), 'wide', 'push', 'bedroom', 'In the morning his bed was empty: Kit beside it.', see=['kit'],
     **{'from': cam([ROOM[0] + 6, 7.4, ROOM[2] + 9.5], [ROOM[0] + .5, 2.2, ROOM[2] - 1.6], 48), 'to': cam([ROOM[0] + 5, 6.6, ROOM[2] + 8], [ROOM[0] + .5, 2.2, ROOM[2] - 1.6], 46)}, shadowRadius=16)
shot('S31-feather', on(26), 'insert', 'push', 'bedroom', 'One feather on his pillow: soft, gold-orange, Kit\'s hand beside it.', see=['kit'],
     **{'from': cam([ROOM[0] + 2.6, 6.6, ROOM[2] + 3.4], [ROOM[0] - .2, 2.6, ROOM[2] - .6], 44), 'to': cam([ROOM[0] + 2.2, 6.0, ROOM[2] + 2.8], [ROOM[0] - .2, 2.6, ROOM[2] - .6], 42)}, shadowRadius=10)
shot('S31b-bigger', on(26, 7), 'medium', 'push', 'bedroom', 'It was bigger than Kit: Kit beside the bed, the feather longer than she is tall.', subject='kit', see=['kit'],
     **{'from': cam([ROOM[0] + 1.2, 3.8, ROOM[2] + 10.5], [ROOM[0] + 1.2, 2.6, ROOM[2] - 1.4], 44)}, fit={'actor': 'kit', 'height': .34, 'part': 'full', 'y': .6}, shadowRadius=14)
shot('S32-tiptoe', on(27), 'wide', 'push', 'square', 'So that night Kit did the unthinkable: she tiptoes to the nest nobody wanted.', see=['kit'],
     ease='linear', **{'from': cam([1, 10, 21], [5, 2, 4], 46), 'to': cam([2.6, 9.4, 19], [8.4, 2, 3.4], 45)}, shadowRadius=30)
shot('S32b-take', on(27, 7), 'close', 'push', 'square', 'She stole an egg: Kit lifts the Plain egg out of the nest, sheepish.', see=['kit'],
     **{'from': cam([10.4, 4.2, -1.8], [13.2, 2.8, 2.6], 38), 'to': cam([10.9, 4.0, -1.1], [13.2, 2.8, 2.6], 36)}, shadowRadius=10)
shot('S33-sorry', on(28), 'medium', 'push', 'square', 'She was terrible at it: she bows to the nest and apologizes (small laugh).', subject='kit', see=['kit'],
     **{'from': cam([10.5, 3.6, -1.6], [13, 3, 3.4], 40)}, fit={'actor': 'kit', 'height': .36, 'part': 'full', 'y': .62}, shadowRadius=14)
shot('S34-middle', on(29), 'wide', 'crane', 'square', 'She walks to the middle of town and stops; the town gathers in a ring.', subject='kit', see=['kit'],
     **{'from': cam([0, 30, 34], [0, 1, 0], 50), 'to': cam([0, 16, 28], [0, 2, 0], 48)}, shadowRadius=40)
shot('S35-minute', on(30), 'close', 'push', 'square', 'One minute to midnight: Kit, the egg in her hands, determined.', subject='kit', see=['kit'],
     **{'from': cam([.6, 4.6, 7], [0, 4.6, 0], 36)}, fit={'actor': 'kit', 'height': .48, 'part': 'head', 'y': .38}, shadowRadius=10)
shot('S35b-scream', on(30, 4), 'wide', 'push', 'square', 'The whole town screamed: the ring of faces shouting at her (no bubbles).', see=['kit'],
     **{'from': cam([.5, 9.5, 7.5], [0, 3.2, -9], 50), 'to': cam([.4, 9, 6.5], [0, 3.2, -9], 48)}, shadowRadius=30)
shot('S35c-drop', on(30, 8), 'medium', 'push', 'square', 'Kit, drop it!: a kid points and shouts.', subject='lead', see=['lead', 'kit'],
     **{'from': cam([3.6, 3.4, -3.4], [9.5, 2.8, -2], 50), 'to': cam([4.0, 3.4, -3.3], [9.5, 2.8, -2], 50)}, shadowRadius=16)
# B6 low point ---------------------------------------------------------------------------------------------------------------------
shot('S36-holds', on(31), 'close', 'push', 'square', 'Kit held on: the egg under her chin lights her face gold. The narration slows.', subject='kit', see=['kit'],
     **{'from': cam([.4, 4.6, 6.8], [0, 4.6, 0], 34), 'to': cam([.3, 4.6, 6], [0, 4.6, 0], 32)}, fit={'actor': 'kit', 'height': .5, 'part': 'head', 'y': .38}, shadowRadius=10)
# B7 reversal ----------------------------------------------------------------------------------------------------------------------
shot('S37a-bell', on(33), 'wide', 'push', 'square', 'The bell rang twelve times: the ring freezes, faces up; Kit small in the middle.', subject='kit', see=['kit'],
     **{'from': cam([-4, 15, 24], [0, 3, 0], 46), 'to': cam([-3.6, 14, 22], [0, 3, 0], 44)}, shadowRadius=40)
shot('S37-down', on(34), 'close', 'push', 'square', 'The shadow came down: Kit looks up in wonder, the shadow crossing her face.', subject='kit', see=['kit'],
     **{'from': cam([-.4, 3.9, 6.6], [0, 4.9, 0], 36)}, fit={'actor': 'kit', 'height': .48, 'part': 'head', 'y': .4}, shadowRadius=10)
LOWC = [-1.5, .9, 2.6]; LOWT = add(LOWC, [MOON[0] * 50, MOON[1] * 50 + 8, MOON[2] * 50]); MOM37 = add(LOWC, [MOON[0] * 92, MOON[1] * 92 - 4, MOON[2] * 92])
shot('S37b-wings', on(34, 4), 'wide', 'heroLow', 'square', 'Its wings were as wide as the street: from Kit\'s spot, her full silhouette against the moon, wings spanning the frame, eyes glowing.', see=['mother'], ground=0,
     **{'from': cam(LOWC, LOWT, 64), 'to': cam([LOWC[0] - .2, .8, LOWC[2] + .4], add(LOWT, [0, 2, 0]), 66)}, shadowRadius=60)
shot('S38-bird', F(on(35), -2), 'close', 'push', 'square', 'It was not a bird: Kit\'s face lit by two glowing eyes.', subject='kit', see=['kit'],
     **{'from': cam([-6, 4.4, 2.5], [0, 4.5, 0], 36)}, fit={'actor': 'kit', 'height': .48, 'part': 'head', 'y': .4}, shadowRadius=10)
shot('S39-dragon', F(on(35, 4), 2), 'medium', 'push', 'square', 'It was a dragon. Very, very gently: the mother lowers her head to Kit (the twist; Kit in wonder).', see=['mother', 'kit'],
     **{'from': cam([-7, 4.5, -20], [-7, 6.5, 0], 56), 'to': cam([-6.5, 4.3, -18.5], [-6.5, 6.3, 0], 54)}, shadowRadius=30)
LIFT0 = [0, 30, 6]
shot('S40-lift', on(36, 4), 'close', 'push', 'square', 'It lifted Kit into the clouds: Kit in the mother\'s front claws, the town small below.', see=['kit', 'mother'],
     **{'from': cam([LIFT0[0] + 10, LIFT0[1] + 8, LIFT0[2] + 9], [LIFT0[0] + 18, LIFT0[1] + 1, LIFT0[2]], 50), 'to': cam([LIFT0[0] + 18.5, LIFT0[1] + 17.5, LIFT0[2] + 9], [LIFT0[0] + 28, LIFT0[1] + 11, LIFT0[2]], 50)}, shadowRadius=40)
# B8 second surprise ---------------------------------------------------------------------------------------------------------------
N = NEST; FL = N[1] - 4.4   # nest floor
RING = ['kit', 'dax', 'lead', 'little', 'r1', 'r2', 'r3', 'r4', 'r5']; RR = 6.2
SEAT = {n: [N[0] + RR * math.sin(math.radians(180 + 40 * k)), FL, N[2] + RR * math.cos(math.radians(180 + 40 * k))] for k, n in enumerate(RING)}   # kit at the front (+z), facing the centre
SEAT = {n: [round(v, 3) for v in p] for n, p in SEAT.items()}
seat_yaw = lambda n: yaw_to(SEAT[n], N)
shot('S41-nest', on(37), 'wide', 'drone', 'nest', 'Money shot: drone low over the sunrise clouds onto a woven nest the size of the town, kids and baby dragons in a ring, the mother curled outside.', see=[], spectacle=True, look='goldenHour',
     path=[[N[0] + 30, N[1] + 6, N[2] + 120], [N[0] + 18, N[1] + 6, N[2] + 74], [N[0] + 8, N[1] + 9, N[2] + 34]], targets=[[N[0], N[1] - 4, N[2] + 1], [N[0], N[1] - 4, N[2] + 1]], **{'from': {'fov': 50}}, shadowRadius=60)
shot('S41b-ring', on(38), 'medium', 'push', 'nest', 'Every missing kid was in it: the ring of kids, a baby dragon in every lap.', see=['little', 'lead', 'kit'], look='goldenHour',
     **{'from': cam([N[0] + 2, N[1] + 10, N[2] + 17], [N[0], FL + 1, N[2] + 1], 50), 'to': cam([N[0] + 1.6, N[1] + 9, N[2] + 15.5], [N[0], FL + 1, N[2] + 1], 50)}, shadowRadius=20)
DAXN = SEAT['dax']
shot('S42-daxnest', F(on(38, 6), -2), 'close', 'push', 'nest', 'Even Dax: a hatchling asleep on his head.', subject='dax', see=['dax'], look='goldenHour',
     **{'from': cam(add(DAXN, [(N[0] - DAXN[0]) * .7, 3.4, (N[2] - DAXN[2]) * .7]), add(DAXN, [0, 2.2, 0]), 40)}, fit={'actor': 'dax', 'height': .55, 'part': 'full', 'y': .5, 'h': 3.6}, shadowRadius=12)
LITN = SEAT['little']
shot('S43-lap', F(on(39), 2), 'medium', 'push', 'nest', 'Each one had a baby dragon asleep in their lap: Little and her frost hatchling.', subject='little', see=['little'], look='goldenHour',
     **{'from': cam(add(LITN, [(N[0] - LITN[0]) * .75, 2.6, (N[2] - LITN[2]) * .75]), add(LITN, [0, 1.2, 0]), 40)}, fit={'actor': 'little', 'height': .5, 'part': 'full', 'y': .6, 'h': 2.4}, captionY='high', shadowRadius=10)
TA, TB = [1.7, 0, 12], [-1.7, 0, 12]
shot('S44a-cold', on(40), 'insert', 'push', 'nest', 'Proof match cut (flashback): a cold blue egg flying hand to hand in the town at night…', see=['r1', 'r2'], look='nightBright', flashback=True,
     **{'from': cam([0, 3.6, 17.2], [0, 3.5, 12], 40), 'to': cam([0, 3.6, 16.6], [0, 3.5, 12], 40)}, shadowRadius=14)
KITN = SEAT['kit']
shot('S44b-gold', on(41), 'close', 'push', 'nest', '…cut to a gold egg in still hands: Kit in the nest, the egg glowing.', see=['kit'], look='goldenHour',
     **{'from': cam(add(KITN, [0, 3.4, 4.2]), add(KITN, [0, 1.6, 0]), 36), 'to': cam(add(KITN, [0, 3.2, 3.6]), add(KITN, [0, 1.6, 0]), 34)}, shadowRadius=10)
shot('S45-years', on(42), 'wide', 'drone', 'nest', 'Not one had ever hatched: the camera rises over the ring in the nest.', see=['kit'], look='goldenHour',
     path=[[N[0] + 6, N[1] + 10, N[2] + 30], [N[0] + 10, N[1] + 13, N[2] + 36], [N[0] + 14, N[1] + 16, N[2] + 42]], targets=[[N[0], FL + 1, N[2] + 2], [N[0], FL + .5, N[2] + 1]], **{'from': {'fov': 50}}, shadowRadius=50)
shot('S46a-crack', on(43), 'insert', 'push', 'nest', 'Kit\'s egg cracked: the gold egg splits in her hands.', see=['kit'], look='goldenHour',
     **{'from': cam(add(KITN, [.4, 2.9, 3.0]), add(KITN, [0, 1.7, .6]), 30), 'to': cam(add(KITN, [.3, 2.7, 2.6]), add(KITN, [0, 1.7, .6]), 30)}, shadowRadius=8)
shot('S46b-sneeze', on(43, 3), 'close', 'push', 'nest', 'A tiny dragon sneezed on her: the only gold dragon; Kit knocked dizzy, then laughing (laugh 3).', subject='kit', see=['kit', 'goldling'], look='goldenHour',
     **{'from': cam(add(KITN, [-.8, 3.2, 5.2]), add(KITN, [0, 2.4, 0]), 36)}, fit={'actor': 'kit', 'height': .55, 'part': 'full', 'y': .46, 'h': 3.3}, shadowRadius=10)
shot('S47a-mother', on(44), 'wide', 'push', 'nest', 'The mother was not taking thieves: she lies curled round the outside of the nest.', see=['mother'], look='goldenHour',
     **{'from': cam([N[0] + 34, N[1] + 22, N[2] + 46], [N[0] - 6, N[1], N[2]], 50), 'to': cam([N[0] + 30, N[1] + 20, N[2] + 42], [N[0] - 6, N[1], N[2]], 48)}, shadowRadius=60)
shot('S47b-sitters', on(45), 'medium', 'push', 'nest', 'She was taking babysitters: kids with sleeping babies, her head resting on the rim behind them.', see=['mother', 'little'], look='goldenHour',
     **{'from': cam([N[0] + 3, N[1] + 5.5, N[2] + 22], [N[0] - 1, FL + 3, N[2] + 4], 48), 'to': cam([N[0] + 2.6, N[1] + 5.2, N[2] + 20.5], [N[0] - 1, FL + 3, N[2] + 4], 48)}, shadowRadius=30)
# B9 flip --------------------------------------------------------------------------------------------------------------------------
shot('S48-sunrise', on(46), 'wide', 'crane', 'square', 'Dax came home the next morning: dragons fly in over the square at sunrise.', see=['dax'], look='goldenHour',
     ease='inOutSine', **{'from': cam([3, 5, -8], [0, 16, 30], 52), 'to': cam([3, 7.5, -6.5], [0, 18, 30], 51)}, shadowRadius=60)
shot('S48b-ride', F(on(46, 6), -2), 'medium', 'track', 'square', 'On a dragon: Dax rides on the mother\'s back, cheering.', subject='dax', see=['dax'], follow='dax', look='goldenHour', spectacle=True,
     **{'from': cam([-8, 4.2, 11], [0, 2.4, 0], 46), 'to': cam([-7.8, 4.2, 11.2], [0, 2.4, 0], 46)}, shadowRadius=30)
shot('S49-bench', F(on(47), 2), 'wide', 'push', 'square', 'That night nobody played hot potato: an egg left on a bench; AFK, still frozen, a hatchling asleep on his head (cameo 2).', see=['afk'],
     **{'from': cam([10.5, 5.2, 22.5], [4.6, 1.8, 12.4], 46), 'to': cam([9.8, 4.8, 21.2], [4.6, 1.8, 12.4], 44)}, shadowRadius=20)
KB = [-13, -12]
shot('S50-hatched', on(48), 'medium', 'push', 'square', 'The scoreboard got a new word: over Kit\'s shoulder it flips to HATCHED.', see=['kit'],
     **{'from': cam([KB[0] + 3.2, 3.2, KB[1] + 4.6], [BOARD[0], 6.8, BOARD[2]], 40), 'to': cam([KB[0] + 2.9, 3.4, KB[1] + 4], [BOARD[0], 7, BOARD[2]], 38)}, shadowRadius=16)
shot('S50b-one', on(48, 6), 'close', 'push', 'square', 'Hatched. Kit is number one: Kit laughing, the gold dragon on her head.', subject='kit', see=['kit', 'goldling'],
     **{'from': cam([KB[0] - 5.5, 5, KB[1] + 1], [KB[0], 4.8, KB[1]], 38)}, fit={'actor': 'kit', 'height': .46, 'part': 'head', 'y': .44}, shadowRadius=12)
shot('S51a-sit', on(50), 'medium', 'push', 'square', 'In this town everybody steals eggs: now the kids sit still, gold eggs glowing in their laps.', subject='kit', see=['kit'],
     **{'from': cam([K0[0] + 1, 3.2, K0[1] + 8.5], [K0[0], 1.8, K0[1]], 42)}, fit={'actor': 'kit', 'height': .4, 'part': 'full', 'y': .62, 'h': 3.3}, captionY='high', shadowRadius=14)
shot('S51-rhyme', on(51), 'wide', 'drone', 'square', 'And at midnight everybody holds on: the same drone path, the whole town sitting still on the square, gold eggs in every lap.', see=['kit'],
     **{'from': {'fov': 46}}, path=DRONE['path'][::-1], targets=DRONE['targets'][::-1], shadowRadius=60)

# ---- cast ----------------------------------------------------------------------------------------------------------------------
t = {s['id']: s['at'] for s in S}
def marks(*m): return [[round(a, 3), p] for a, p in m]
kitE = lambda w: f'egg:plain:{w}'
def sqy(x, z, y=0): return {'at': 'square', 'offset': [x, y, z]}
face_cam = lambda p, c: yaw_to(p, c)
SEATM = lambda n: {'origin': SEAT[n], 'yaw': seat_yaw(n)}
EGGS4 = 'eggs:storm,ember,frost,moss'
# Face mood map (owner, 2026-11-14; Faces v3): [line, actor, face] — checked by v2:plan (seasoncheck moodIssues)
FACEMAP = [[12, 'kit', 'polite'], [15, 'dax', 'laugh'], [16, 'kit', 'polite'], [17, 'kit', 'curious'], [18, 'kit', 'curious'], [19, 'kit', 'curious'], [20, 'kit', 'curious'], [20, 'kit', 'polite'],
           [27, 'kit', 'sheepish'], [28, 'kit', 'sheepish'], [30, 'lead', 'scream'], [31, 'kit', 'brave'], [32, 'kit', 'brave'], [34, 'kit', 'wonder'], [35, 'kit', 'wonder'], [36, 'kit', 'wonder'],
           [38, 'dax', 'xd'], [43, 'kit', 'ko'], [43, 'kit', 'laugh']]
SNEEZE = round(on(43, 6) + .08, 3)
Q5, CUT0 = Q(5), [Q(4)[0] + b9['s'][0] * 3.2, Q(4)[1] + b9['s'][1] * 3.2]
N9 = [b9['nest'][0], b9['nest'][2]]
LIFTK = [LIFT0[0] + 18, LIFT0[1], LIFT0[2]]   # front claws: 18 ahead (she flies east, away from the clock tower)
_c = [DRONE['path'][1][i] + (DRONE['path'][2][i] - DRONE['path'][1][i]) * .43 for i in range(3)]   # the drone camera near t = 1.2 s
MOM0 = [round(_c[i] + MOON[i] * 320 - ([PERP[0], 0, PERP[1]][i]) * 70 * 1.2, 2) for i in range(3)]   # crosses the moon at ~1.2 s
cast = {
  'kit': {'style': 'v2', 'troupe': 'SECOND', 'role': 'Kit', 'outfit': {'recipe': 'hoodie', 'main': '#ff7aa8', 'accent': '#ffffff', 'legs': '#4a5a80', 'trim': '#9b59b6'},
    **sq(*K0), 'yaw': yaw_to(K0, [K0[0] - D2[0], K0[1] - D2[1]]),
    'marks': marks((0, {**sq(*K0), 'yaw': yaw_to(K0, [K0[0] - D2[0], K0[1] - D2[1]])}), (t['S16-kit'], {'at': 'kitBase', 'yaw': yaw_to(KIT_B, [KIT_B[0] + kb['n'][0], KIT_B[1] + kb['n'][1]])}),
      (t['S16b-never'], {**sq(*WALK11), 'yaw': yaw_to([0, 0], b11['s']), 'travel': {'dir': b11['s'], 'speed': 1.7, 'max': 5}}),
      (t['S17-found'], {**sq(GE[0] - 1.3, GE[1]), 'yaw': 90}), (t['S17r-return'], {**sq(*K5), 'yaw': yaw_to(K5, [N5[0], N5[2]])}),
      (t['S18-zero'], {**sq(-8, 9), 'yaw': 0}), (t['S22-queue'], {**sq(*Q5), 'yaw': yaw_to(Q5, N9)}), (t['S23-notice'], {**sq(*K2), 'yaw': 0}),
      (t['S24b-vane'], {**sq(*KV), 'yaw': yaw_to(KV, [VANE[0], VANE[2]])}), (t['S25-cold'], {**sq(*K2), 'yaw': 0}),
      (t['S30-bed'], {'origin': [BED[0], .4, BED[1]], 'yaw': -90}),
      (t['S32-tiptoe'], {**sq(2, 4.6), 'yaw': 98, 'travel': {'dir': [.99, -.14], 'speed': 2.6, 'max': 10.5}}), (t['S33-sorry'], {**sq(13, 3.4), 'yaw': 144}), (t['S34-middle'], {**sq(0, 0), 'yaw': 0}),
      (t['S37b-wings'], {**sq(-2.6, 5.2), 'yaw': 0}), (t['S38-bird'], {**sq(0, 0), 'yaw': -90}),
      (t['S40-lift'], {'origin': LIFTK, 'yaw': 90, 'travel': {'dir': [1, 0], 'speed': 4, 'climb': 2.5}}),
      (t['S41-nest'], SEATM('kit')), (t['S48-sunrise'], {**sq(-30, 30), 'yaw': 0}), (t['S50-hatched'], {**sq(*KB), 'yaw': yaw_to(KB, [BOARD[0], BOARD[2]])}),
      (t['S50b-one'], {**sq(*KB), 'yaw': yaw_to(KB, [KB[0] - 5.5, KB[1] + 1])}), (t['S51a-sit'], {**sq(*K0), 'yaw': yaw_to(K0, [K0[0] + 1, K0[1] + 8.5])})),
    'keys': [[0, 'idle'], [t['S16b-never'], 'walk'], [t['S17-found'], 'idle'], [t['S17-found'] + .35, 'bow'], [33.7, 'eggHold'], [34.6, 'bow'], [35.1, 'idle'], [35.25, 'bow'], [35.8, 'idle'],
             [t['S22-queue'], 'idle'], [47.0, 'wave'], [47.9, 'idle'], [t['S24b-vane'], 'lookUp'], [t['S25-cold'], 'eggHold'], [t['S30-bed'], 'idle'], [73.5, 'point'], [t['S31b-bigger'], 'idle'],
             [t['S32-tiptoe'], 'walk'], [t['S32b-take'], 'bow'], [79.6, 'eggHold'], [t['S33-sorry'], 'eggHold'], [on(28, 6), 'bow'], [t['S34-middle'], 'eggWalk'], [on(29, 8), 'eggHold'], [t['S36-holds'], 'eggChin'],
             [t['S37-down'], 'eggChin'], [t['S41-nest'], 'sitEgg'], [on(43) + 1.2, 'sit', {'ground': True}], [t['S48-sunrise'], 'idle'], [t['S51a-sit'], 'sitEgg']],
    'faces': [[0, 'neutral'], [t['S16-kit'], 'smile'], [t['S17-found'], 'curious'], [t['S17r-return'], 'polite'], [t['S18-zero'], 'smile'], [t['S22-queue'], 'polite'], [t['S23-notice'], 'curious'],
              [t['S26b-warm'], 'polite'], [t['S27-still'], 'smile'], [t['S30-bed'], 'worried'], [t['S32-tiptoe'], 'sheepish'], [t['S34-middle'], 'determined'], [t['S36-holds'], 'brave'],
              [t['S37-down'], 'wonder'], [t['S41-nest'], 'smile'], [on(43), 'wonder'], [SNEEZE, 'ko'], [round(SNEEZE + .3, 3), 'laugh'], [t['S48-sunrise'], 'smile'], [t['S50b-one'], 'laugh'], [t['S51a-sit'], 'smile']],
    'tools': [[0, None], [33.7, 'egg:geode'], [34.9, None], [t['S25-cold'], kitE(0)], [on(20, 5) + .1, kitE(.5)], [on(20, 5) + .7, kitE(1)], [t['S28-greedy'], None],
              [79.6, kitE(0)], [on(32), kitE(.5)], [on(32, 7), kitE(1)], [t['S41-nest'], kitE(1)], [on(43) + 1.2, None], [t['S51a-sit'], None]]},
  'dax': {'style': 'v2', 'troupe': 'RIVAL', 'role': 'Dax', 'outfit': {'recipe': 'hoodie', 'main': '#c94a3a', 'accent': '#f2d16b', 'legs': '#5a6274', 'trim': '#f2b632'},
    **sq(16, 2), 'yaw': 270,
    'marks': marks((0, {**sq(16, 2), 'yaw': 270, 'travel': {'dir': [-1, 0], 'speed': 4.2, 'max': 10}}), (t['S10-wins'], {**sq(*DAXR), 'yaw': 98, 'travel': {'dir': [.99, -.15], 'speed': 6, 'max': 14}}),
      (t['S19-vault'], {**sqy(FENCE[0] - 3.5, FENCE[1]), 'yaw': 90, 'travel': {'dir': [1, 0], 'speed': 4, 'climb': 3, 'max': 3}}),
      (round(t['S19-vault'] + .75, 3), {**sqy(FENCE[0] - .5, FENCE[1], 2.25), 'yaw': 90, 'travel': {'dir': [1, 0], 'speed': 4, 'climb': -3, 'max': 3}}),
      (t['S11-grandma'], {**sq(-40, 40), 'yaw': 0}), (t['S20-dax'], {**sq(*DAX1), 'yaw': 180}), (t['S28-greedy'], {**sq(-8, -3), 'yaw': 90, 'travel': {'dir': [1, 0], 'speed': 3.5, 'max': 6.9}}), (t['S28b-more'], {**sq(-1, -3), 'yaw': 180}),
      (t['S29b-shadow'], {**sq(P0[0] + STR[0] * 3, P0[1] + STR[1] * 3), 'yaw': yaw_to([0, 0], STR), 'travel': {'dir': STR, 'speed': 4.5, 'max': 22}}),
      (t['S41-nest'], SEATM('dax')), (t['S48-sunrise'], {'origin': [10, 46 + 23.2, 80 - 8], 'yaw': 180, 'travel': {'dir': [0, -1], 'speed': 14, 'climb': -4}}),
      (t['S48b-ride'], {'origin': [6, 22 + 23.2, 24 - 8], 'yaw': 180, 'travel': {'dir': [0, -1], 'speed': 5}}), (t['S49-bench'], {**sq(-26, 26), 'yaw': 0})),
    'visible': [[0, True], [t['S30-bed'], False], [t['S41-nest'], True], [t['S49-bench'], False]],
    'keys': [[0, 'eggRun'], [t['S20-dax'], 'eggHold'], [t['S28-greedy'], 'eggRun'], [t['S28b-more'], 'eggHold'], [t['S29b-shadow'], 'eggRun'], [t['S41-nest'], 'sit', {'ground': True}], [t['S48-sunrise'], 'sit'], [t['S48b-ride'] + .2, 'cheer']],
    'faces': [[0, 'smug'], [t['S21-laugh'], 'laugh'], [t['S22-queue'], 'smug'], [t['S28-greedy'], 'evil_grin'], [t['S41-nest'], 'smile'], [t['S42-daxnest'], 'xd'], [t['S43-lap'], 'smile'], [t['S48-sunrise'], 'grin']],
    'tools': [[0, 'egg:storm'], [t['S10-wins'], EGGS4], [t['S41-nest'], None]]},
  'lead': {'style': 'v2', 'troupe': 'LEAD', 'role': 'thief', 'outfit': {'recipe': 'hoodie', 'main': '#3fae6a', 'accent': '#ffffff', 'legs': '#3a4a6a', 'trim': '#2e7a4a'},
    **sq(10, 10), 'yaw': 0,
    'marks': marks((0, {**sq(-30, 20), 'yaw': 0}), (t['S06-run'], {'at': 'base8', 'offset': [0, 0, 0], 'yaw': 75, 'travel': {'dir': [.966, .259], 'speed': 5.5}}),
      (t['S08-steal'], {'at': 'base3', 'offset': [B[3]['s'][0] * 3.2 - B[3]['n'][0] * 2.6, 0, B[3]['s'][1] * 3.2 - B[3]['n'][1] * 2.6], 'yaw': yaw_to([0, 0], [B[3]['n'][0], B[3]['n'][1]])}),
      (t['S09-board'], {**sq(*LEADW), 'yaw': 28.6}), (t['S10-wins'], {**sq(-30, 20), 'yaw': 0}),
      (t['S34-middle'], {**sq(9.5, -2), 'yaw': yaw_to([9.5, -2], [0, 0])}), (t['S41-nest'], SEATM('lead'))),
    'keys': [[0, 'eggRun'], [t['S08-steal'], 'eggHold'], [t['S09-board'], 'raise'], [t['S10-wins'], 'idle'], [t['S35c-drop'] - .3, 'point'], [t['S41-nest'], 'sit', {'ground': True}]],
    'faces': [[0, 'smug'], [t['S35b-scream'], 'scream'], [t['S41-nest'], 'smile']],
    'tools': [[0, 'egg:ember'], [t['S08-steal'], 'egg:moss'], [t['S10-wins'], None]]},
  'little': {'style': 'v2', 'troupe': 'LITTLE', 'role': 'nest kid', 'outfit': {'recipe': 'tee', 'main': '#4ad8ff', 'accent': '#ffffff', 'legs': '#4a5a80', 'trim': '#f2b632'},
    'origin': SEAT['little'], 'yaw': seat_yaw('little'), 'visible': [[0, False], [t['S41-nest'], True], [t['S48-sunrise'], False]],
    'keys': [[0, 'sit', {'ground': True}]], 'faces': [[0, 'smile']]},
  'grandma': {'style': 'v2', 'build': 'elder_f', 'age': 72, 'skin': '#f6c9a0', 'face': 'determined', 'hair': {'style': 'messy_bun', 'color': '#d8d8d8', 'v': 4}, 'tier': 'hero',
    'outfit': {'recipe': 'robe', 'main': '#9a86d8', 'trim': '#f2d16b', 'belt': '#5a3a26', 'legs': '#9a86d8'}, **sq(*grandma), 'yaw': 90,
    'marks': marks((0, {**sq(grandma[0] - 3, grandma[1]), 'yaw': 90, 'travel': {'dir': [1, 0], 'speed': 3.4, 'delay': t['S11-grandma'] - .3}})),
    'keys': [[0, 'eggRun']], 'tools': [[0, 'egg:sprinkle']], 'visible': [[0, False], [t['S10-wins'], True], [t['S12-mailman'], False]]},
  'mailman': {'style': 'v2', 'build': 'adult_m', 'age': 41, 'skin': '#c08457', 'face': 'grin', 'hair': {'style': 'side_part', 'color': '#2a1a12', 'v': 4}, 'tier': 'hero',
    'outfit': {'recipe': 'tee', 'main': '#3d6fb8', 'accent': '#f2f2f2', 'legs': '#2f3d5a', 'trim': '#f2d16b'}, 'accessories': ['mailBagEggs'], **sq(*mailman), 'yaw': -12,
    'keys': [[0, 'raise']], 'tools': [[0, 'egg:frost']], 'visible': [[0, False], [t['S12-mailman'] - .1, True], [t['S13-mayor'], False]]},
  'mayor': {'style': 'v2', 'troupe': 'ELDER', 'role': 'mayor', 'outfit': {'recipe': 'tee', 'main': '#6a6f86', 'accent': '#c0392b', 'legs': '#4a4e5e', 'trim': '#c0392b'},
    'accessories': ['skiMask', 'topHat'], **sq(*mayor), 'yaw': 15, 'keys': [[0, 'eggHold']], 'tools': [[0, 'egg:cosmic']], 'faces': [[0, 'smug']], 'visible': [[0, False], [t['S13-mayor'] - .1, True], [t['S14a-minute'], False]]},
  'afk': {'style': 'v2', 'troupe': 'AFK', 'visible': [[0, False], [t['S24-roofs'] - .1, True], [t['S24b-vane'], False], [t['S49-bench'] - .1, True], [t['S50-hatched'], False]],
    'marks': marks((0, {**sq(*AFKR), 'yaw': 300}), (t['S48-sunrise'], {**sq(3.1, 11.2), 'yaw': 30}))},
  'mother': {'style': 'dragon', 'scale': 2, 'dragonFace': 'v2', 'origin': [0, 400, -600], 'yaw': 0,
    'colors': {'body': '#6b4fb8', 'dark': '#4a3486', 'belly': '#ffd27a', 'horn': '#fff3d6', 'wing': '#e8794a', 'wingDk': '#b8512e', 'eye': '#7affe4'},
    'marks': marks((0, {'origin': MOM0, 'yaw': yaw_to([0, 0], PERP), 'travel': {'dir': PERP, 'speed': 70}}), (2.6, {'origin': [0, 400, -600], 'yaw': 0}),
      (t['S29b-shadow'] + 1.5, {'origin': [31.4 - 55, 60, 7.6 + 10], 'yaw': 100, 'travel': {'dir': [.98, -.18], 'speed': 70}}), (t['S30-bed'], {'origin': [0, 400, -600], 'yaw': 0}),
      (t['S37-down'], {'origin': [MOM37[0] + .5 * 6.6, MOM37[1] + 2, MOM37[2] - .866 * 6.6], 'yaw': yaw_to(MOM37, LOWC), 'travel': {'dir': [-.5, .866], 'speed': 5, 'climb': -1.5}}),
      (t['S38-bird'], {'origin': [-54, 0, 0], 'yaw': 90}),
      (t['S40-lift'], {'origin': LIFT0, 'yaw': 90, 'travel': {'dir': [1, 0], 'speed': 4, 'climb': 2.5}}),
      (t['S41-nest'], {'origin': [N[0] - 24, N[1] - 6, N[2] - 4], 'yaw': 0}), (t['S44a-cold'], {'origin': [0, 400, -600], 'yaw': 0}), (t['S44b-gold'], {'origin': [N[0] - 24, N[1] - 6, N[2] - 4], 'yaw': 0}),
      (t['S48-sunrise'], {'origin': [10, 46, 80], 'yaw': 180, 'travel': {'dir': [0, -1], 'speed': 14, 'climb': -4}}), (t['S48b-ride'], {'origin': [6, 22, 24], 'yaw': 180, 'travel': {'dir': [0, -1], 'speed': 5}}),
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
B2n = B[2]; r3p = bp(2, -1.6, .2); M('r3', t['S05-frost'], {**sq(*r3p), 'yaw': yaw_to([0, 0], B2n['n'])}, 'bow', 'smile', None)
M('r4', t['S07-lock'] - .2, {**sq(*DIVE0), 'yaw': yaw_to([0, 0], [-lk['n'][0], -lk['n'][1]]), 'travel': {'dir': [-lk['n'][0], -lk['n'][1]], 'speed': 7, 'max': 7.6, 'delay': .25}}, 'run', 'determined', 'egg:frost')
SLAM = round(t['S07-lock'] - .2 + .25 + 7.6 / 7 + .08, 3)
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
SITS = {'r1': [K0[0] + 2.3, K0[1] + .4], 'r2': [K0[0] - 2.3, K0[1] + .6], 'r3': [K0[0] + 1.1, K0[1] - 2.2], 'r4': [K0[0] - 1.3, K0[1] - 2.3]}
for nm in ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7']:
    if nm in SITS: M(nm, t['S48-sunrise'], park(int(nm[1:])), 'idle'); M(nm, t['S51a-sit'], {**sq(*SITS[nm]), 'yaw': yaw_to(SITS[nm], [K0[0] + 1, K0[1] + 8.5])}, 'sitEgg', 'smile', kitE(1))
    else: M(nm, t['S41-nest'] if nm in ('r6', 'r7') else t['S48-sunrise'], park(int(nm[1:]) + 7), 'idle')
for nm, *_ in RUN:
    c = cast[nm]; c['m'].sort(key=lambda x: x[0]); c['marks'] = marks(*c.pop('m')); c.pop('vis')
    for k in ('keys', 'faces', 'tools'): c[k].sort(key=lambda x: x[0])
cast['r4']['visible'] = [[0, True], [round(SLAM - .1, 3), False], [t['S10-wins'], True]]
# hatchlings (baby build: big head, big eyes, small wings), each in its egg's colours; 1.3 × a kid's head when perched
HATCH = {'ember': {'body': '#3a2c2e', 'dark': '#1a1416', 'horn': '#ff7a1a', 'belly': '#ff9a3a', 'eye': '#ffb43a'}, 'frost': {'body': '#9fd2ff', 'dark': '#4f8fd0', 'horn': '#ffffff', 'belly': '#e8f6ff', 'eye': '#2a6fe8'},
         'moss': {'body': '#6fa04a', 'dark': '#4f7a34', 'belly': '#c8e08a', 'eye': '#e8ff6a'}, 'tide': {'body': '#4fc4b8', 'dark': '#2f8f86', 'belly': '#e8fffb', 'eye': '#1a6aa0'},
         'geode': {'body': '#8a8580', 'dark': '#6a6560', 'horn': '#c45cff', 'belly': '#d9b6ff', 'eye': '#c45cff'}, 'storm': {'body': '#2a3a7a', 'dark': '#141c3a', 'horn': '#ffe14a', 'belly': '#ffe14a', 'eye': '#ffe14a'},
         'sprinkle': {'body': '#ff9ccb', 'dark': '#e07aa8', 'belly': '#ffffff', 'eye': '#7a3aff'}, 'cosmic': {'body': '#3a1a6e', 'dark': '#28124e', 'horn': '#fff6c8', 'belly': '#7a5ad8', 'eye': '#fff6c8'}}
HSB = round(1.3 * 1.16 * .82 / 17.65, 4)   # parts/eggs.js hatchlingScale(.82, baby)
lap = lambda P, yaw: [round(P[0] + math.sin(math.radians(yaw)) * 1.0, 3), round(P[1] + .85, 3), round(P[2] + math.cos(math.radians(yaw)) * 1.0, 3)]
OWNER = {'storm': 'dax', 'frost': 'little', 'ember': 'lead', 'moss': 'r1', 'tide': 'r2', 'geode': 'r3', 'sprinkle': 'r4', 'cosmic': 'r5'}
for k, (name, cols) in enumerate(HATCH.items()):
    who = OWNER[name]; yaw = seat_yaw(who)
    pos = [SEAT['dax'][0], SEAT['dax'][1] + 3.65, SEAT['dax'][2]] if who == 'dax' else lap(SEAT[who], yaw)
    bench = [[t['S49-bench'], {'origin': [3.1, 4.7, 11.2], 'yaw': 30}]] if name == 'moss' else [[t['S49-bench'], {'origin': [0, -400, 0], 'yaw': 0}]]
    cast['h_' + name] = {'style': 'dragon', 'baby': True, 'scale': HSB, 'colors': {**cols, 'wing': cols.get('horn', cols['belly']), 'wingDk': cols['dark']}, 'origin': pos, 'yaw': yaw + 90,
                         'marks': marks((0, {'origin': [0, -400, 0], 'yaw': 0}), (t['S41-nest'], {'origin': pos, 'yaw': yaw + 90}), (t['S44a-cold'], {'origin': [0, -400, 0], 'yaw': 0}), (t['S44b-gold'], {'origin': pos, 'yaw': yaw + 90}),
                                        (t['S48-sunrise'], {'origin': [-10 + k * 3, 40 + k % 3 * 2, 70 - k * 2], 'yaw': 180, 'travel': {'dir': [0, -1], 'speed': 13, 'climb': -3}})) + bench,
                         'keys': [[0, 'perch'], [t['S48-sunrise'], 'fly'], [t['S49-bench'], 'perch']]}
KH = lambda P, yaw, up=1.55, fwd=1.05: [round(P[0] + math.sin(math.radians(yaw)) * fwd, 3), round(P[1] + up, 3), round(P[2] + math.cos(math.radians(yaw)) * fwd, 3)]
GL = KH(SEAT['kit'], seat_yaw('kit'))
KBH = [KB[0], 4.7, KB[1]]; K0L = KH([K0[0], .2, K0[1]], yaw_to(K0, [K0[0] + 1, K0[1] + 8.5]), 1.05, 1.0)
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
  {'id': 'ringUp', **RINGC, 'mode': 'lookUp', 'visible': [[0, False], [t['S37a-bell'], True], [t['S40-lift'], False]]},
  {'id': 'runA', 'count': 14, 'centre': [-16, -4], 'radius': 5, 'mode': 'panic', 'dir': PERP, 'at': 0, 'seed': 7, 'visible': [[0, True], [t['S02-kit'], False]]},
  {'id': 'runB', 'count': 12, 'centre': [-12, 2.5], 'radius': 3, 'mode': 'panic', 'dir': [1, 0], 'at': t['S23-notice'] - .3, 'seed': 8, 'visible': [[0, False], [t['S23-notice'], True], [t['S24-roofs'], False]]},
  {'id': 'runC', 'count': 12, 'centre': [-12, 2.5], 'radius': 3, 'mode': 'panic', 'dir': [1, 0], 'at': t['S26-still'] - .3, 'seed': 18, 'visible': [[0, False], [t['S26-still'], True], [t['S27-still'], False]]},
  {'id': 'runD', 'count': 14, 'centre': [-14, 3], 'radius': 4, 'mode': 'panic', 'dir': [1, 0], 'at': t['S27-still'] - .5, 'seed': 28, 'visible': [[0, False], [t['S27-still'], True], [t['S28-greedy'], False]]},
  {'id': 'sitTown', 'count': 56, 'centre': [0, 1], 'radius': 16, 'mode': 'sit', 'lapEggs': '#ffc23a', 'expression': 'smile', 'seed': 31, 'spacing': 1.9, 'clear': [[K0[0], K0[1], 4.2], [-2, 13, 4.5], [-7, 14, 6], [4.6, 12.4, 2.5], [0, -22, 6]],
   'visible': [[0, False], [t['S51a-sit'], True]]},
]
effects = [
  {'type': 'shake', 'at': round(on(24, 3) + .2, 2), 'dur': .5, 'amp': .08},
  {'type': 'flash', 'at': round(on(33, 4), 2), 'dur': .3, 'color': '#fff6e0'},
  {'type': 'particles', 'preset': 'dust', 'origin': {'anchor': 'square', 'offset': [0, .5, 0]}, 'count': 120, 'at': on(34), 'dur': 3},
  {'type': 'particles', 'preset': 'sparkle', 'origin': add(KITN, [0, 1.7, .9]), 'count': 50, 'at': round(on(43, 2), 2), 'dur': 1.0},
  {'type': 'particles', 'preset': 'sparkle', 'origin': [GL[0], GL[1] + .5, GL[2]], 'count': 40, 'at': SNEEZE, 'dur': 1.2},
]
spec = {'slug': 'egg', 'fps': 30, 'end': END, 'season': 1, 'hero': 'kit', 'captionStyle': 'pop-shorts-v3', 'look': 'nightBright',
  'note': 'Season 1 episode 01 egg (card 01). Generated by stories/egg/gen.py from stories/egg/beats.md + the owner fix pass (2026-11-14); no labels (SEASON_1.md §2c).',
  'world': 'stories/egg/world.js', 'ruleLines': 2, 'faceMap': FACEMAP,
  'beats': {'B1': ['S01-town', 'S03b-toss'], 'B2': ['S04-ember', 'S13-mayor'], 'B3': ['S14a-minute', 'S22-queue'], 'B4': ['S23-notice', 'S27-still'], 'B5': ['S28-greedy', 'S35c-drop'],
            'B6': ['S36-holds', 'S36-holds'], 'B7': ['S37a-bell', 'S40-lift'], 'B8': ['S41-nest', 'S47b-sitters'], 'B9': ['S48-sunrise', 'S51-rhyme']},
  'clues': ['S15a-claws', 'S24b-vane', 'S25-cold'], 'twist': 'S39-dragon', 'afk': ['S24-roofs', 'S49-bench'], 'moneyShot': 'S41-nest',
  'moods': {'B1': 'heist', 'B2': 'playful', 'B3': 'playful', 'B4': 'curious', 'B5': 'tense', 'B6': 'hush', 'B7': 'wonder', 'B8': 'wonder', 'B9': 'warm'},
  'emphasis': ['midnight', 'zero', 'dragon', 'babysitters', 'Hatched', 'holds on'],
  'worldState': {'flyers': [[0, False], [t['S14-potato'], True], [t['S15a-claws'], False], [t['S44a-cold'], True], [t['S44b-gold'], False]],
                 'clock': [[0, '1159'], [round(t['S29b-shadow'] - .15, 3), '12'], [t['S30-bed'], '1159'], [t['S41-nest'], '12'], [t['S48-sunrise'], '1159']],
                 'board': [[0, 'race'], [round(on(48, 4), 3), 'hatched']], 'plainEgg': [[0, True], [79.6, False]], 'benchEgg': [[0, False], [t['S49-bench'], True], [t['S50-hatched'], False]],
                 'hotToss': [[0, None], [t['S03b-toss'], {'t0': 5.5, 'from': [TOSS[0], 3.4, TOSS[1] + .9], 'to': [TOSS[0] + 6.5, .5, TOSS[1] + 2.5]}], [9.0, None]],
                 'slam': [[0, -99], [t['S06-run'], SLAM]], 'coldBase': [[0, False], [t['S15b-dawn'], True], [t['S16-kit'], False]],
                 'geodeAway': [[0, False], [30.0, True], [34.9, False]], 'grassEgg': [[0, False], [30.0, True], [33.7, False]], 'returnNote': [[0, False], [35.5, True]],
                 'fence': [[0, False], [t['S19-vault'], True], [t['S20-dax'], False]],
                 'moonSpot': [[0, None], [t['S29b-shadow'], {'pos': [31.4, 140, 7.6], 'target': [31.4, 0, 7.6], 'angle': .5, 'i': 1.6}], [t['S30-bed'], None]],
                 'coldToss': [[0, None], [t['S44a-cold'], {'t0': t['S44a-cold'], 't1': t['S44b-gold'], 'a': [TA[0] - .8, 3.6, TA[2]], 'b': [TB[0] + .8, 3.6, TB[2]]}], [t['S44b-gold'], None]]},
  'sfxCues': [[5.5, 'whoosh'], [SLAM, 'thud'], [on(33) + .1, 'bell'], [on(33) + .6, 'bell'], [on(33) + 1.1, 'bell'], [on(43) + .1, 'crack'], [SNEEZE + .05, 'sparkle'], [t['S40-lift'], 'whoosh']],
  'cast': cast, 'crowds': crowds, 'effects': effects, 'shots': S}
json.dump(spec, open(os.path.join(HERE, 'episode.json'), 'w'), indent=1)
print(json.dumps({'shots': len(S), 'end': END, 'cast': len(cast)}))
