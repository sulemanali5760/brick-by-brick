"""CI only (polyhaven workflow): download the CC0 Poly Haven assets the game uses.

Runs on a GitHub runner, never on the dev laptop (docs/LESSONS.md L21).

blender/convert_polyhaven.py (also CI only) turns the models into game-ready .gltf files.
Textures and the sky HDRI are used by the game as-is.
"""
import json
import pathlib
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "source" / "polyhaven"
TEX = ROOT / "assets" / "textures"
HDRI = ROOT / "assets" / "hdri"

TEXTURES = {  # id -> maps to pull (1k jpg)
    "brown_mud_dry": ["Diffuse", "nor_gl"],
    "concrete_floor_02": ["Diffuse", "nor_gl"],
}
MODELS = ["cement_bag", "measuring_tape_01"]
SKY = "kloofendal_48d_partly_cloudy_puresky"
UA = {"User-Agent": "brick-by-brick-asset-fetch"}


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA)) as r:
        return r.read()


def save(url, dest):
    dest.parent.mkdir(parents=True, exist_ok=True)
    if not dest.exists():
        dest.write_bytes(get(url))
    print(f"{dest.relative_to(ROOT)}  {dest.stat().st_size // 1024} KB")


def files(asset_id):
    return json.loads(get(f"https://api.polyhaven.com/files/{asset_id}"))


for tid, maps in TEXTURES.items():
    f = files(tid)
    for m in maps:
        save(f[m]["1k"]["jpg"]["url"], TEX / f"{tid}_{m.lower()}.jpg")

for mid in MODELS:
    g = files(mid)["gltf"]["1k"]["gltf"]
    save(g["url"], SRC / mid / f"{mid}.gltf")
    for rel, inc in g.get("include", {}).items():
        save(inc["url"], SRC / mid / rel)

save(files(SKY)["hdri"]["1k"]["hdr"]["url"], HDRI / f"{SKY}_1k.hdr")
