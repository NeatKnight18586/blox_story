# Third-party assets (Phase R realism spike)

All assets below are from Poly Haven and are **CC0 1.0** (public domain, https://polyhaven.com/license).
They are downloaded by the farm job `.github/workflows/assets.yml` into a cache and never committed.

| slot | asset | kind | bytes (1k) | source |
|---|---|---|---|---|
| cobblestone | Cobblestone Floor 08 (`cobblestone_floor_08`) | texture | 2236210 | https://polyhaven.com/a/cobblestone_floor_08 |
| brick | Red Brick 03 (`red_brick_03`) | texture | 2336566 | https://polyhaven.com/a/red_brick_03 |
| planks | Wood Planks (`wood_planks`) | texture | 1913211 | https://polyhaven.com/a/wood_planks |
| plaster | Painted Plaster Wall (`painted_plaster_wall`) | texture | 2497755 | https://polyhaven.com/a/painted_plaster_wall |
| city_brick | Red Brick 03 (`red_brick_03`) | texture | 2336566 | https://polyhaven.com/a/red_brick_03 |
| city_plaster | Painted Plaster Wall (`painted_plaster_wall`) | texture | 2497755 | https://polyhaven.com/a/painted_plaster_wall |
| city_asphalt | Asphalt 02 (`asphalt_02`) | texture | 3049197 | https://polyhaven.com/a/asphalt_02 |
| city_sidewalk | Concrete Pavement (`concrete_pavement`) | texture | 3453308 | https://polyhaven.com/a/concrete_pavement |
| city_planks | Weathered Planks (`weathered_planks`) | texture | 2094112 | https://polyhaven.com/a/weathered_planks |
| city_stone | White Sandstone Blocks 02 (`white_sandstone_blocks_02`) | texture | 2709620 | https://polyhaven.com/a/white_sandstone_blocks_02 |
| city_shingles | Roof 09 (`roof_09`) | texture | 1519421 | https://polyhaven.com/a/roof_09 |
| city_terracotta | Clay Roof Tiles (`clay_roof_tiles`) | texture | 2935196 | https://polyhaven.com/a/clay_roof_tiles |
| city_sand | Coast Sand 01 (`coast_sand_01`) | texture | 3192911 | https://polyhaven.com/a/coast_sand_01 |
| city_grass | Leafy Grass (`leafy_grass`) | texture | 4229130 | https://polyhaven.com/a/leafy_grass |
| city_forest | Forest Ground 01 (`forrest_ground_01`) | texture | 3180131 | https://polyhaven.com/a/forrest_ground_01 |
| city_cliff | Rock Face (`rock_face`) | texture | 2598477 | https://polyhaven.com/a/rock_face |
| street_late | Venice Sunset (`venice_sunset`) | hdri | 1440400 | https://polyhaven.com/a/venice_sunset |
| city_late_morning | Kloofendal 48d Partly Cloudy (Pure Sky) (`kloofendal_48d_partly_cloudy_puresky`) | hdri | 1435119 | https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky |
| city_tree | Fir Sapling (`fir_sapling`) | model (glTF) | 25423602 | https://polyhaven.com/a/fir_sapling |
| city_bush | Shrub Sorrel 01 (`shrub_sorrel_01`) | model (glTF) | 1186333 | https://polyhaven.com/a/shrub_sorrel_01 |
| city_rock | Boulder 01 (`boulder_01`) | model (glTF) | 5771986 | https://polyhaven.com/a/boulder_01 |
| city_tree_leafy | Outdoor Table Chair Set 01 (`outdoor_table_chair_set_01`) | model (glTF) | 1242380 | https://polyhaven.com/a/outdoor_table_chair_set_01 |
| city_tree_pine | Wooden Display Shelves 01 (`wooden_display_shelves_01`) | model (glTF) | 471129 | https://polyhaven.com/a/wooden_display_shelves_01 |
| city_bush_round | Grass Medium 02 (`grass_medium_02`) | model (glTF) | 801474 | https://polyhaven.com/a/grass_medium_02 |

## HDRI backdrops (Kit 1, `assets/hdri/`, committed; 1k)

- venice_sunset_1k.hdr: CC0, Poly Haven via three.js examples, https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/equirectangular/venice_sunset_1k.hdr
- pedestrian_overpass_1k.hdr (stands in for royal_esplanade_1k.hdr, which 404s there): CC0, Poly Haven via three.js examples, https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/equirectangular/pedestrian_overpass_1k.hdr
- quarry_01_1k.hdr: CC0, Poly Haven via three.js examples, https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/equirectangular/quarry_01_1k.hdr

## Phase 1A city library (requested in `assets/realism.json`; Poly Haven, CC0 1.0; downloaded by the farm, never committed)

The farm run of `.github/workflows/assets.yml` resolves each slot (first candidate that exists, else the most-downloaded
`search` match) and rewrites the table at the top of this file with the exact asset ids. Requested slots:

| slot | kind | candidates (first existing wins) / search | used by |
|---|---|---|---|
| city_brick | texture 1k | red_brick_03, red_brick, brick_wall_10 / "red brick" | plaza paving (parts/city/world.js) |
| city_plaster | texture 1k | painted_plaster_wall, white_plaster_02, beige_wall_001 / "plaster" | buildings (1B+) |
| city_asphalt | texture 1k | asphalt_02, asphalt_track, asphalt_01 / "asphalt" | roads |
| city_sidewalk | texture 1k | concrete_pavement, concrete_floor_02, patterned_concrete_pavers / "pavement" | sidewalks |
| city_planks | texture 1k | weathered_planks, old_planks_02, wood_planks_grey, wooden_planks / "planks" | boardwalk |
| city_shingles | texture 1k | roof_09, roof_tiles_14, grey_roof_tiles / "roof" | roofs (1B+) |
| city_terracotta | texture 1k | clay_roof_tiles, clay_roof_tiles_02, roof_tiles / "clay roof" | roofs (1B+) |
| city_sand | texture 1k | coast_sand_01, sand_01, coast_sand_rocks_02 / "sand" | beach (1B+) |
| city_grass | texture 1k | leafy_grass, grass_path_2, aerial_grass_rock / "grass" | terrain (1B+) |
| city_forest | texture 1k | forrest_ground_01, forest_ground_04, forest_leaves_02 / "forest" | wild edge (1B+) |
| city_cliff | texture 1k | rock_face, cliff_side, rock_wall_08, rocks_ground_06 / "cliff" | cliffs (1B+) |
| city_late_morning | HDRI 1k | kloofendal_48d_partly_cloudy_puresky, kloppenheim_06_puresky, qwantani_puresky, noon_grass / "puresky" | city env / backdrop option |
| city_tree | glTF model 1k | island_tree_01, tree_small_02, fir_sapling / "tree" | near street trees (≤ 12k tris) |
| city_palm | glTF model 1k | island_tree_02, island_tree_03 / "palm" | harbour + beach palms |
| city_bush | glTF model 1k | shrub_sorrel_01, shrub_01, shrub_02 / "shrub" | 1B+ dressing |
| city_rock | glTF model 1k | boulder_01, rock_moss_set_01, namaqualand_boulder_02 / "boulder" | 1B+ dressing |
