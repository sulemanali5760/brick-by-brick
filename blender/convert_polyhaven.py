"""CI only (GitHub Actions): convert downloaded Poly Haven assets for the game.

Never run on the dev laptop: downloaded files are opened only on GitHub runners (docs/LESSONS.md L21).
  blender --background --factory-startup --python blender/convert_polyhaven.py
Re-origins the Poly Haven models to bottom centre and packs them as self-contained .gltf, and
tone-maps the sky HDRI to a JPG (the page can't use .hdr on every host).
"""
import bpy, pathlib
from mathutils import Matrix, Vector

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "source" / "polyhaven"
OUT = ROOT / "assets" / "models"
MODELS = ["cement_bag", "measuring_tape_01"]
SKY = ROOT / "assets" / "hdri" / "kloofendal_48d_partly_cloudy_puresky_1k.hdr"


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def convert(mid):
    reset()
    bpy.ops.import_scene.gltf(filepath=str(SRC / mid / f"{mid}.gltf"))
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    for o in meshes:
        bpy.ops.object.select_all(action="DESELECT")
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    pts = [v.co for o in meshes for v in o.data.vertices]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    shift = Vector((-(lo.x + hi.x) / 2, -(lo.y + hi.y) / 2, -lo.z))
    for o in meshes:
        o.data.transform(Matrix.Translation(shift))
    bpy.ops.object.select_all(action="DESELECT")
    for o in meshes:
        o.select_set(True)
    bpy.context.preferences.addons["io_scene_gltf2"].preferences.allow_embedded_format = True
    bpy.ops.export_scene.gltf(filepath=str(OUT / f"{mid}.gltf"), export_format="GLTF_EMBEDDED",
                              use_selection=True, export_apply=True, export_yup=True)


def sky_jpg():
    reset()
    img = bpy.data.images.load(str(SKY))
    sc = bpy.context.scene
    sc.view_settings.view_transform = "AgX"
    sc.render.image_settings.file_format = "JPEG"
    sc.render.image_settings.quality = 90
    img.save_render(str(SKY.with_suffix(".jpg")), scene=sc)


for m in MODELS:
    convert(m)
sky_jpg()
