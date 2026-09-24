"""Build every game asset for Brick by Brick, slice 1.

Run headless:
  "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" --background --factory-startup --python blender/make_assets.py

Writes assets/models/*.gltf (real-world scale, metres, origin at the bottom centre
unless noted), then re-imports every export into one scene, renders
docs/asset_lineup.png and saves blender/assets.blend for hand edits.
"""
import bpy, bmesh, json, math, pathlib, random
import numpy as np
from mathutils import Matrix, Vector, noise

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "models"
SRC = ROOT / "assets" / "source"
TEX = ROOT / "assets" / "textures"
OUT.mkdir(parents=True, exist_ok=True)
random.seed(7)
rng = np.random.default_rng(7)


# ---------- helpers ----------
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def lin(h):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def mat(name, hexcol, rough=0.8, metal=0.0, image=None):
    m = bpy.data.materials.new(name)
    try:
        m.use_nodes = True
    except Exception:
        pass
    nt = m.node_tree
    b = nt.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (*lin(hexcol), 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if image is not None:
        t = nt.nodes.new("ShaderNodeTexImage")
        t.image = image if isinstance(image, bpy.types.Image) else bpy.data.images.load(str(image))
        nt.links.new(t.outputs["Color"], b.inputs["Base Color"])
    return m


def link(o):
    bpy.context.scene.collection.objects.link(o)
    return o


def activate(o):
    bpy.ops.object.select_all(action="DESELECT")
    o.select_set(True)
    bpy.context.view_layer.objects.active = o


def cube_uv(o, size):
    activate(o)
    try:
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.select_all(action="SELECT")
        bpy.ops.uv.cube_project(cube_size=size)
    finally:
        bpy.ops.object.mode_set(mode="OBJECT")


def box(name, size, loc, m, bevel=0.0, rot=(0, 0, 0), uv=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if uv:
        cube_uv(o, uv)
    o.data.materials.append(m)
    if bevel:
        b = o.modifiers.new("bevel", "BEVEL")
        b.width, b.segments, b.limit_method = bevel, 2, "ANGLE"
    return o


def rod(name, p1, p2, r, m, verts=16):
    p1, p2 = Vector(p1), Vector(p2)
    d = p2 - p1
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=d.length, location=(p1 + p2) / 2)
    o = bpy.context.active_object
    o.name = name
    o.rotation_mode = "QUATERNION"
    o.rotation_quaternion = d.to_track_quat("Z", "Y")
    o.data.materials.append(m)
    return o


def flat(name, pts2d, thickness, m, plane="XY"):
    """Extruded flat polygon (blades, pins)."""
    bm = bmesh.new()
    vs = [bm.verts.new((a, b, 0) if plane == "XY" else (a, 0, b)) for a, b in pts2d]
    bm.faces.new(vs)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = link(bpy.data.objects.new(name, me))
    o.data.materials.append(m)
    s = o.modifiers.new("solid", "SOLIDIFY")
    s.thickness, s.offset = thickness, 0
    return o


def join(objs, name, smooth=True):
    for o in objs:
        activate(o)
        for mod in list(o.modifiers):
            bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    o = bpy.context.active_object
    o.name = o.data.name = name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if smooth:
        try:
            bpy.ops.object.shade_smooth_by_angle(angle=math.radians(35))
        except Exception:
            bpy.ops.object.shade_smooth()
    return o


def export(name, objs):
    """Self-contained .gltf (buffers and textures embedded): one file per model,
    loads in three.js and Godot, and is a type the artifact host serves."""
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.preferences.addons["io_scene_gltf2"].preferences.allow_embedded_format = True
    bpy.ops.export_scene.gltf(filepath=str(OUT / f"{name}.gltf"), export_format="GLTF_EMBEDDED",
                              use_selection=True, export_apply=True, export_yup=True)


# ---------- procedural brick texture (no bake needed) ----------
def brick_image():
    n = 256
    X, Y = np.meshgrid(np.linspace(0, 1, n), np.linspace(0, 1, n))
    v = np.zeros((n, n))
    for _ in range(6):
        fx, fy, ph = rng.integers(1, 5), rng.integers(1, 5), rng.uniform(0, 6.28)
        v += np.sin(X * fx * 6.283 + ph) * np.cos(Y * fy * 6.283 + ph * 0.7)
    v /= np.abs(v).max()
    img = np.array([0.64, 0.27, 0.17])[None, None] * (1 + 0.12 * v[..., None] + 0.07 * rng.normal(0, 1, (n, n, 1)))
    spots = rng.random((n, n))
    img[spots > 0.985] *= 0.5                      # dark burn specks
    img[spots < 0.01] = [0.80, 0.64, 0.50]         # sand grains
    rgba = np.concatenate([np.clip(img, 0, 1), np.ones((n, n, 1))], axis=2).astype(np.float32)
    im = bpy.data.images.new("brick_diffuse", n, n)
    im.pixels.foreach_set(rgba.ravel())
    path = SRC / "brick_diffuse.png"
    path.parent.mkdir(parents=True, exist_ok=True)
    im.filepath_raw, im.file_format = str(path), "PNG"
    im.save()
    return im


# ---------- assets ----------
def make_bricks():
    for name, length in (("brick_nf", 0.240), ("brick_half", 0.115)):
        reset()
        m = mat("brick", "#A8432A", rough=0.9, image=brick_image())
        o = box(name, (length, 0.115, 0.071), (0, 0, 0.0355), m, bevel=0.003, uv=0.24)
        export(name, [join([o], name)])


def make_trowel():
    reset()
    steel = mat("steel", "#B9C0C4", rough=0.35, metal=1.0)
    wood = mat("handle_wood", "#9B6A3C", rough=0.7)
    blade = flat("blade", [(0, -0.065), (0.06, -0.066), (0.28, 0), (0.06, 0.066), (0, 0.065)], 0.0025, steel)
    parts = [blade,
             rod("shank", (0.03, 0, 0.002), (-0.005, 0, 0.045), 0.0045, steel, 10),
             rod("ferrule", (-0.005, 0, 0.045), (-0.03, 0, 0.05), 0.0065, steel, 12),
             rod("handle", (-0.03, 0, 0.05), (-0.15, 0, 0.055), 0.0155, wood, 16)]
    o = join(parts, "trowel")
    o.data.transform(Matrix.Translation((0.09, 0, -0.0525)))  # origin = grip
    export("trowel", [o])


def make_tub():
    reset()
    pe = mat("tub_black", "#1E1F21", rough=0.55)
    mortar = mat("mortar", "#A39E94", rough=0.95, image=TEX / "concrete_floor_02_diffuse.jpg")
    bpy.ops.mesh.primitive_cone_add(vertices=40, radius1=0.17, radius2=0.215, depth=0.3, location=(0, 0, 0.15))
    shell = bpy.context.active_object
    bm = bmesh.new()
    bm.from_mesh(shell.data)
    top = max(bm.faces, key=lambda f: f.calc_center_median().z)
    bmesh.ops.delete(bm, geom=[top], context="FACES_ONLY")
    bm.to_mesh(shell.data)
    bm.free()
    shell.data.materials.append(pe)
    s = shell.modifiers.new("solid", "SOLIDIFY")
    s.thickness, s.offset = 0.006, -1
    bpy.ops.mesh.primitive_torus_add(major_radius=0.216, minor_radius=0.009, location=(0, 0, 0.3))
    rim = bpy.context.active_object
    rim.data.materials.append(pe)
    handles = [box(f"h{i}", (0.03, 0.09, 0.02), (sx * 0.232, 0, 0.285), pe, bevel=0.006) for i, sx in enumerate((-1, 1))]
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=28, y_subdivisions=28, size=0.42, location=(0, 0, 0))
    surf = bpy.context.active_object
    bm = bmesh.new()
    bm.from_mesh(surf.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.xy.length > 0.203], context="VERTS")
    for v in bm.verts:
        v.co.z = 0.24 + 0.012 * noise.noise(v.co * 18) + 0.01 * max(0, 1 - v.co.xy.length / 0.12)
    bm.to_mesh(surf.data)
    bm.free()
    cube_uv(surf, 0.4)
    surf.data.materials.append(mortar)
    export("mortar_tub", [join([shell, rim, *handles, surf], "mortar_tub")])


def make_pallet():
    """EPAL euro pallet, 1200 x 800 x 144 mm."""
    reset()
    wood = mat("pallet_wood", "#C9A878", rough=0.85, image=TEX / "plywood_diffuse.jpg")
    parts = []
    for y, w in ((-0.3275, 0.145), (-0.16375, 0.1), (0, 0.145), (0.16375, 0.1), (0.3275, 0.145)):
        parts.append(box("top", (1.2, w, 0.022), (0, y, 0.133), wood, 0.002, uv=0.5))
    for x in (-0.5275, 0, 0.5275):
        parts.append(box("stringer", (0.145, 0.8, 0.022), (x, 0, 0.111), wood, 0.002, uv=0.5))
        for y in (-0.35, 0, 0.35):
            parts.append(box("block", (0.145, 0.145 if y == 0 else 0.1, 0.078), (x, y, 0.061), wood, 0.002, uv=0.5))
    for y, w in ((-0.35, 0.1), (0, 0.145), (0.35, 0.1)):
        parts.append(box("bottom", (1.2, w, 0.022), (0, y, 0.011), wood, 0.002, uv=0.5))
    export("pallet_euro", [join(parts, "pallet_euro", smooth=False)])


def make_arms():
    """First-person forearms. Elbow at origin, hand towards +Y (forward in game)."""
    reset()
    sleeve = mat("hivis_orange", "#EE6A1F", rough=0.7)
    refl = mat("reflective", "#DADFE2", rough=0.25, metal=0.3)
    knit = mat("glove_knit", "#6E7479", rough=0.95)
    coat = mat("glove_coating", "#E0A22B", rough=0.55)
    out = []
    for side, name in ((1, "ArmR"), (-1, "ArmL")):
        parts = [rod("sleeve", (0, -0.12, 0), (0, 0.2, 0), 0.056, sleeve, 24),
                 rod("band", (0, 0.03, 0), (0, 0.065, 0), 0.0575, refl, 24),
                 rod("cuff", (0, 0.19, 0), (0, 0.26, 0), 0.046, knit, 20),
                 box("palm", (0.088, 0.1, 0.034), (0, 0.305, 0), coat, bevel=0.012),
                 box("fingers", (0.084, 0.08, 0.03), (0, 0.38, -0.012), coat, bevel=0.012, rot=(math.radians(-22), 0, 0)),
                 box("thumb", (0.026, 0.065, 0.026), (-side * 0.052, 0.3, 0.004), coat, bevel=0.01, rot=(0, 0, math.radians(side * 25)))]
        out.append(join(parts, name))
    export("fp_arms", out)


def make_line_pin():
    reset()
    steel = mat("pin_steel", "#6F777C", rough=0.45, metal=1.0)
    blade = flat("pin", [(-0.012, 0), (0.012, 0), (0.003, -0.1), (0, -0.115), (-0.003, -0.1)], 0.002, steel, plane="XZ")
    head = rod("head", (0, -0.014, 0.01), (0, 0.014, 0.01), 0.011, steel, 16)
    o = join([blade, head], "line_pin")
    o.data.transform(Matrix.Translation((0, 0, 0.115)))  # tip at z=0
    export("line_pin", [o])


def make_level():
    reset()
    yellow = mat("level_yellow", "#E8B21A", rough=0.45, metal=0.2)
    black = mat("level_caps", "#1E2226", rough=0.6)
    vial = mat("vial", "#9CD96A", rough=0.1)
    parts = [box("body", (0.6, 0.025, 0.056), (0, 0, 0.028), yellow, bevel=0.002)]
    parts += [box("cap", (0.012, 0.027, 0.058), (sx * 0.294, 0, 0.029), black, bevel=0.002) for sx in (-1, 1)]
    parts += [box("vial_top", (0.05, 0.016, 0.004), (0, 0, 0.0575), vial),
              box("vial_side", (0.014, 0.027, 0.034), (0.2, 0, 0.028), vial)]
    export("spirit_level", [join(parts, "spirit_level", smooth=False)])


def make_fence():
    """Mobile construction fence panel (Bauzaun), 3.5 x 2.0 m, on two feet."""
    reset()
    galv = mat("galvanized", "#A9B0B3", rough=0.45, metal=0.8)
    foot = mat("fence_foot", "#8C8C88", rough=0.9)
    frame = [rod("post", (sx * 1.73, 0, 0.05), (sx * 1.73, 0, 2.0), 0.021, galv, 12) for sx in (-1, 1)]
    frame += [rod("rail", (-1.73, 0, z), (1.73, 0, z), 0.021, galv, 12) for z in (0.14, 1.98)]
    bm = bmesh.new()
    for i in range(35):
        x = -1.7 + i * 0.1
        bmesh.ops.create_cube(bm, size=1, matrix=Matrix.LocRotScale((x, 0, 1.06), None, (0.004, 0.004, 1.84)))
    for j in range(7):
        bmesh.ops.create_cube(bm, size=1, matrix=Matrix.LocRotScale((0, 0, 0.14 + j * 0.307), None, (3.46, 0.004, 0.004)))
    me = bpy.data.meshes.new("mesh")
    bm.to_mesh(me)
    bm.free()
    wires = link(bpy.data.objects.new("wires", me))
    wires.data.materials.append(galv)
    feet = [box("foot", (0.22, 0.62, 0.13), (sx * 1.73, 0, 0.065), foot, bevel=0.01) for sx in (-1, 1)]
    export("bauzaun", [join([*frame, wires, *feet], "bauzaun", smooth=False)])


def convert_polyhaven(mid):
    """Poly Haven glTF -> glb with origin at bottom centre, real scale kept."""
    reset()
    bpy.ops.import_scene.gltf(filepath=str(SRC / "polyhaven" / mid / f"{mid}.gltf"))
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    for o in meshes:
        activate(o)
        bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    pts = [v.co for o in meshes for v in o.data.vertices]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    shift = Vector((-(lo.x + hi.x) / 2, -(lo.y + hi.y) / 2, -lo.z))
    for o in meshes:
        o.data.transform(Matrix.Translation(shift))
    export(mid, meshes)


# ---------- lineup: re-import every export and render a check image ----------
def lineup():
    reset()
    report = {}
    x = 0.0
    order = ["fp_arms", "trowel", "brick_nf", "brick_half", "line_pin", "spirit_level", "mortar_tub",
             "pallet_euro", "cement_bag", "measuring_tape_01"]
    for name in order:
        before = set(bpy.context.scene.objects)
        bpy.ops.import_scene.gltf(filepath=str(OUT / f"{name}.gltf"))
        new = [o for o in bpy.context.scene.objects if o not in before]
        roots = [o for o in new if o.parent is None]
        meshes = [o for o in new if o.type == "MESH"]
        tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in meshes)
        pts = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
        w = max(p.x for p in pts) - min(p.x for p in pts)
        cx = (max(p.x for p in pts) + min(p.x for p in pts)) / 2
        for r in roots:
            r.location.x += x + w / 2 - cx
            r.location.z -= min(p.z for p in pts)  # rest on the ground even if the origin is a grip point
        x += w + 0.12
        dims = [round(max(p[i] for p in pts) - min(p[i] for p in pts), 3) for i in range(3)]
        report[name] = {"tris": tris, "size_m": dims, "kb": round((OUT / f"{name}.gltf").stat().st_size / 1024)}
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(OUT / "bauzaun.gltf"))
    for o in bpy.context.scene.objects:
        if o not in before and o.parent is None:
            o.location = (x / 2, 1.2, 0)
    fence = [o for o in bpy.context.scene.objects if o not in before and o.type == "MESH"]
    report["bauzaun"] = {"tris": sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in fence),
                         "size_m": [3.5, 0.62, 2.0], "kb": round((OUT / "bauzaun.gltf").stat().st_size / 1024)}

    sc = bpy.context.scene
    bpy.ops.mesh.primitive_plane_add(size=40, location=(x / 2, 0, 0))
    ground = bpy.context.active_object
    ground.data.materials.append(mat("ground", "#8B7355", rough=1, image=TEX / "brown_mud_dry_diffuse.jpg"))
    cube_uv(ground, 2.0)
    world = bpy.data.worlds.new("sky")
    sc.world = world
    try:
        world.use_nodes = True
    except Exception:
        pass
    env = world.node_tree.nodes.new("ShaderNodeTexEnvironment")
    env.image = bpy.data.images.load(str(ROOT / "assets" / "hdri" / "kloofendal_48d_partly_cloudy_puresky_1k.hdr"))
    world.node_tree.links.new(env.outputs["Color"], world.node_tree.nodes["Background"].inputs["Color"])
    bpy.ops.object.light_add(type="SUN", rotation=(math.radians(50), 0, math.radians(30)))
    bpy.context.active_object.data.energy = 3
    cam_data = bpy.data.cameras.new("cam")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = x + 0.4
    cam = link(bpy.data.objects.new("cam", cam_data))
    cam.location = (x / 2, -8, 3.2)
    cam.rotation_euler = (math.radians(74), 0, 0)
    sc.camera = cam
    sc.render.engine = "CYCLES"
    sc.cycles.samples = 48
    sc.cycles.device = "CPU"
    sc.render.resolution_x, sc.render.resolution_y = 2000, 760
    sc.render.filepath = str(ROOT / "docs" / "asset_lineup.png")
    bpy.ops.render.render(write_still=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "blender" / "assets.blend"))
    (ROOT / "docs" / "asset_report.json").write_text(json.dumps(report, indent=2))
    print("ASSET REPORT", json.dumps(report))


def make_sky():
    """Tone-mapped JPG of the HDRI: the artifact host serves no .hdr files."""
    reset()
    hdr = ROOT / "assets" / "hdri" / "kloofendal_48d_partly_cloudy_puresky_1k.hdr"
    img = bpy.data.images.load(str(hdr))
    sc = bpy.context.scene
    sc.view_settings.view_transform = "AgX"
    sc.render.image_settings.file_format = "JPEG"
    sc.render.image_settings.quality = 90
    img.save_render(str(hdr.with_suffix(".jpg")), scene=sc)


make_sky()
make_bricks()
make_trowel()
make_tub()
make_pallet()
make_arms()
make_line_pin()
make_level()
make_fence()
for mid in ("cement_bag", "measuring_tape_01"):
    convert_polyhaven(mid)
lineup()
