# References

## Bricklaying facts (used in the game)

| Fact | Value | Source |
|---|---|---|
| NF brick format | 240 × 115 × 71 mm | [Mauerwerksbaulehre: Steinformate](https://www.mauerwerksbau-lehre.de/vorlesungen/1-grundlagen-und-baustoffe-des-mauerwerksbaus/12-baustoffe-fuer-mauerwerk/126-steinformate), [BauNetz Wissen: Formate](https://www.baunetzwissen.de/glossar/f/formate-1326591) |
| NF bed joint / course height | 12.3 mm / 83.3 mm → 12 courses per metre | [Röben: Klinkerformate und Schichtmaße](https://www.roeben.com/de/news/klinkerformate-und-schichtmasse) |
| Head joint | 10 mm (240 + 10 = 250 mm grid, the German *Achtelmeter* system) | Mauerwerksbaulehre |
| Bricks per m² (NF, single skin) | ≈ 49 | [RivoCalc](https://www.rivocalc.com/de-de/bau/mauersteine-anzahl) |
| Stretcher bond | Each course offset by half a brick; half bricks close the ends of alternate courses | standard practice |
| Tools and hands | Trowel in the working hand, brick in the other; line pins and string mark the top of each course | standard practice |
| Window opening in the grid | Two bricks plus three joints left out: 2 × 250 + 10 = 510 mm clear; the jambs fall on the 250 mm grid | Mauerwerksbaulehre (Achtelmeter grid), arithmetic in [builds/08-openings.md](builds/08-openings.md) §5 |
| Reveals | Alternate courses end at the opening with a half brick, so the half-brick lap carries on to the jamb | standard practice, same rule as the wall ends in stretcher bond |
| Clay-shell lintel (Flachsturz) | 115 × 71 mm (one NF course high) is a stock section; lengths follow the 125 mm octametre grid of DIN 4172 (1.00 m nominal = 0.99 m clay length) | size: [Poroton Ziegelsturz 11.5 × 7.1 cm](https://zusammenbauen.de/poroton-ziegelsturz-115-x-71-cm-lange-150-meter-40-stuckpaket,p949968) |
| Lintel minimum bearing | **115 mm** each side (`content.lintel.minBearing = 0.115`). The manufacturers' tables use bearing lengths of 11.5 cm and more, and 11.5 cm is the smallest; the roadmap's 150 mm is not what they state. Our lintel bears 240 mm, so it passes either way | [Wienerberger: Bemessungstabellen Ziegel-Flachstürze (10/2025)](https://www.wienerberger.de/content/dam/wienerberger/germany/marketing/documents-magazines/technical/technical-product-info-sheet/wall/wall-accessories/DE_MKT_DOC_Poroton_Bemessungstabellen_Flachstuerze_10-2025.pdf) ("Auflagertiefe t = 11,5 cm"), [Schlagmann: Tragfähigkeit von Ziegel-Flachstürzen nach Zulassung Z-17.1-900](https://schlagmann.de/media/upload/service/download/Bemessungstabellen_Ziegelstuerze.pdf) ("Auflagerlänge la = 11,5 cm") |
| Brickwork over the lintel | A Flachsturz carries load together with the brickwork laid on it (Übermauerung, the compression zone); the load tables are given by the total height of lintel plus brickwork above | Schlagmann and Wienerberger tables above ("Gesamthöhe h", "Übermauerung aus POROTON-Ziegelmauerwerk") |

## Game feel references

| Game | What we take |
|---|---|
| PowerWash Simulator | One verb, done well, with visible progress you can admire afterwards |
| House Flipper | First-person hands holding the tool; the job is the game |
| Tiny Glade | Calm pacing, soft light, building that looks good by default |
| Minecraft | Instant, readable placement feedback: ghost block, snap, sound |

## Asset sources

- [Poly Haven](https://polyhaven.com): CC0 models, textures and HDRIs, no account and no attribution required. Pulled through `api.polyhaven.com`.
- Blender 5.2 (local): everything game-specific, built by `blender/make_assets.py` at real-world scale.
