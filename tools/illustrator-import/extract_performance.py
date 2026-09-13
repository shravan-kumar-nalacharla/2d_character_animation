"""Non-destructive performance assets; run with Python + PyMuPDF."""
from pathlib import Path
import json
import xml.etree.ElementTree as ET
import pymupdf
from extract_ai import extract_layer

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'adobe animate and illustrator saves (imp)/illustrator'
OUT = ROOT / 'assets/production_character/performance'
OUT.mkdir(parents=True, exist_ok=True)

# The seven drawings on the actual Illustrator turn sheet, inspected before cropping.
doc = pymupdf.open(SRC / 'algowzxd new 2024/algowzxd 360heads/algowzxd 360heads.ai')
page = doc[0]
print('turn sheet', page.rect)
for name, left, right in [('back', 0, 285), ('threeQuarterBackLeft', 300, 600),
                          ('threeQuarterLeft', 600, 840), ('front', 840, 1100),
                          ('threeQuarterRight', 1100, 1360), ('threeQuarterBackRight', 1360, 1640)]:
    # Canvas shown by inspection is 1920 wide, with heads along its lower middle.
    drawings = [d['rect'] for d in page.get_drawings() if left <= (d['rect'].x0+d['rect'].x1)/2 < right and d['rect'].width < 300]
    box = pymupdf.Rect(drawings[0])
    for rect in drawings[1:]: box |= rect
    box += (-2, -2, 2, 2)
    copy = pymupdf.open(stream=doc.tobytes(), filetype="pdf")
    copy[0].set_cropbox(box)
    (OUT / f'{name}.svg').write_text(copy[0].get_svg_image(), encoding='utf-8')

stick = SRC / 'illustrator format/algowzxd stick man final Pakka.ai'
extract_layer(stick, 'Body', OUT / 'stick-shirt.svg')
# Profile geometry is authored production data, not regenerated from artwork.
# Keep the existing reviewed manifests when re-extracting Illustrator vectors.

# Vite public files are served as URLs, so the compiled runtime uses this generated copy.
import shutil
runtime = ROOT / 'src/character/manifests'
runtime.mkdir(parents=True, exist_ok=True)
for mode in ('hoodie', 'stick'): shutil.copyfile(OUT / f'{mode}.json', runtime / f'{mode}.json')
