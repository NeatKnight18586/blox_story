"""Phase R: Blender headless lightmap bake probe (farm). Builds a stand-in of the test street (2 facades x 8 houses, ground,
3 props as boxes; same sizes as engine/fixtures/realism/street-layout.json), sun + sky, Cycles CPU, bakes COMBINED light
into one 1024 px lightmap per facade row + ground (Smart UV), 64 samples, and writes timings as JSON.
  blender -b --python scripts/v2/blender-bake-probe.py -- <out.json>"""
import bpy, json, sys, time

out = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'blender-bake.json'
t0 = time.time()
for _o in list(bpy.data.objects): bpy.data.objects.remove(_o)   # keep the startup prefs (cycles add-on); empty the scene
sc = bpy.context.scene
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 64; sc.render.bake.margin = 4
L = json.load(open('engine/fixtures/realism/street-layout.json'))


def box(name, size, at):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(at[0], -at[2], at[1]))
    o = bpy.context.object; o.name = name; o.scale = (size[0], size[2], size[1]); return o


rows = {}
for i, it in enumerate(L['layout']):
    m = L['modules'][it['module']]
    if not it['module'].startswith('house'):
        continue
    side = 'L' if it['at'][0] < 0 else 'R'
    b = m['parts'][0]; sgn = -1 if side == 'L' else 1
    rows.setdefault(side, []).append(box(f'h{i}', b['box'], [it['at'][0] + sgn * 4, b['at'][1], it['at'][2]]))
ground = box('ground', [18, .1, 175], [0, -.05, -45])
for k, at in enumerate([[-5.4, 1.1, 1.2], [5.2, 1.1, -6], [-6.6, 5.5, -14]]):
    box(f'prop{k}', [2, 2.2, 2], at)
bpy.ops.object.light_add(type='SUN', rotation=(0.9, 0, 2.2)); bpy.context.object.data.energy = 4
w = bpy.data.worlds.new('sky'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[1].default_value = 1.0
t_build = time.time() - t0
groups = {'facadesL': rows.get('L', []), 'facadesR': rows.get('R', []), 'ground': [ground]}
times, stats = {}, {}
for g, objs in groups.items():
    if not objs:
        continue
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join(); o = bpy.context.object
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.uv.smart_project(island_margin=.01); bpy.ops.object.mode_set(mode='OBJECT')
    img = bpy.data.images.new(g, 1024, 1024)
    mat = bpy.data.materials.new(g); mat.use_nodes = True; n = mat.node_tree.nodes.new('ShaderNodeTexImage'); n.image = img; mat.node_tree.nodes.active = n
    o.data.materials.clear(); o.data.materials.append(mat)
    t = time.time(); r = bpy.ops.object.bake(type='COMBINED'); times[g] = round(time.time() - t, 2)
    a = list(img.pixels); px = a[0::4 * 997]; stats[g] = {'result': list(r), 'meanR': round(sum(px) / len(px), 4), 'litFrac': round(sum(1 for v in px if v > .01) / len(px), 3)}
res = {'blender': bpy.app.version_string, 'samples': 64, 'lightmapPx': 1024, 'buildSeconds': round(t_build, 2), 'bakeSeconds': times,
       'totalBakeSeconds': round(sum(times.values()), 2), 'check': stats, 'valid': all(s['litFrac'] > .1 for s in stats.values()), 'note': 'one-time per location (static light); episodes re-dress, so a bake is reused'}
json.dump(res, open(out, 'w'), indent=1); print(res)
