# Third-party assets (Phase R realism spike)

All assets below are from Poly Haven and are **CC0 1.0** (public domain, https://polyhaven.com/license).
They are downloaded by the farm job `.github/workflows/assets.yml` (`scripts/v2/fetch-assets.py`, list in
`assets/realism.json`) into `renders/cache/assets/` (gitignored cache) and never committed. The farm run rewrites
this file with the asset ids it resolved.

| slot | asset | kind | source |
|---|---|---|---|
| street_late | Venice Sunset (`venice_sunset`), 1k .hdr | hdri | https://polyhaven.com/a/venice_sunset |
| cobblestone | first existing of cobblestone_floor_08 / _04 / _01 / cobblestone_square, else top "cobblestone" | texture | https://polyhaven.com/textures |
| brick | red_brick_03 / brick_wall_10 / red_brick / brick_wall_02, else top "brick" | texture | https://polyhaven.com/textures |
| planks | wood_planks / wood_planks_grey / old_planks_02 / weathered_planks, else top "planks" | texture | https://polyhaven.com/textures |
| plaster | painted_plaster_wall / white_plaster_02 / beige_wall_001 / plastered_wall, else top "plaster" | texture | https://polyhaven.com/textures |

Local session note: api.polyhaven.com and dl.polyhaven.org are refused by this session's network proxy (403). The local
HDRI copy came from the three.js examples mirror of the same Poly Haven file (examples/textures/equirectangular/venice_sunset_1k.hdr).
