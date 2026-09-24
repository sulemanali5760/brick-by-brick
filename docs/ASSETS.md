# Asset register — slice 1

All models are in metres at real-world scale, self-contained `.gltf` (buffers and textures embedded; loads in three.js and Godot), in `assets/models/`. Unless noted, the origin is at the bottom centre.
Two pipelines, split by where a file comes from:
- **Our models** (procedural geometry and procedural textures): `blender/make_assets.py`, run with local Blender. It also writes `docs/asset_report.json` and the check image `docs/asset_lineup.png`.
- **Downloaded (Poly Haven, CC0)**: fetched and converted **only on GitHub runners** by the `polyhaven` workflow (`tools/fetch_polyhaven.py` + `blender/convert_polyhaven.py`). They are never opened on the dev laptop.
- Every push that touches `assets/` runs the `assets` workflow: Khronos glTF validator on every model, plus file-type checks on images.

![Asset lineup](asset_lineup.png)

## Models

| File | What | Source | Tris | Size | Notes |
|---|---|---|---|---|---|
| `brick_nf.gltf` | NF brick 240 × 115 × 71 mm | Blender (script) | 108 | 145 KB | 3 mm bevel, procedural clay texture with burn specks |
| `brick_half.gltf` | Half brick 115 × 115 × 71 mm | Blender (script) | 108 | 145 KB | closes alternate courses (stretcher bond) |
| `trowel.gltf` | Brick trowel, 280 mm pointed blade | Blender (script) | 156 | 13 KB | **origin = handle grip** |
| `fp_arms.gltf` | First-person forearms v2, `ArmL` and `ArmR` | Blender (script) | 4264 | 195 KB | **origin = elbow**, hand points +Y (forward in game). Tapered hi-vis sleeve with reflective band, knit cuff. `ArmR`: a fist whose grip axis runs forward through (0, 0.29, 0). `ArmL`: fingers and thumb gripping a brick from above. |
| `mortar_tub.gltf` | Black PE mortar tub, half full | Blender (script) | 2732 | — | procedural sandy mortar texture |
| `pallet_euro.gltf` | EPAL pallet 1200 × 800 × 144 mm | Blender (script) | 2160 | — | real board and block layout; procedural pine grain |
| `line_pin.gltf` | Steel line pin | Blender (script) | 76 | 6 KB | **origin = tip**; the string itself is drawn in the game |
| `spirit_level.gltf` | 600 mm spirit level | Blender (script) | 348 | 36 KB | |
| `bauzaun.gltf` | Mobile site fence panel 3.5 × 2.0 m on feet | Blender (script) | 896 | 82 KB | wire mesh is real geometry, no alpha tricks |
| `cement_bag.gltf` | Cement bag | [Poly Haven](https://polyhaven.com/a/cement_bag), CC0 | 844 | 1884 KB | re-origined by the CI converter |
| `measuring_tape_01.gltf` | Tape measure | [Poly Haven](https://polyhaven.com/a/measuring_tape_01), CC0 | 2868 | 582 KB | set dressing |

## Textures and lighting (used directly by the game)

| File | Use | Source |
|---|---|---|
| `textures/brown_mud_dry_*.jpg` | site ground | [Poly Haven](https://polyhaven.com/a/brown_mud_dry), CC0 |
| `textures/concrete_floor_02_*.jpg` | concrete footing, mortar | [Poly Haven](https://polyhaven.com/a/concrete_floor_02), CC0 |
| `hdri/kloofendal_48d_partly_cloudy_puresky_1k.jpg` | sky and ambient light (tone-mapped from the `.hdr` by the CI converter) | [Poly Haven](https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky), CC0 |

Re-download by running the `polyhaven` workflow on GitHub (Actions → polyhaven → Run workflow). CC0 means no attribution is required; we credit Poly Haven anyway.

## Not needed for slice 1

Wheelbarrow, cement mixer, scaffold, house parts, hens. These come with later slices.
