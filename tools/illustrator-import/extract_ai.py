"""Extract the canonical 2024 Illustrator puppet into layered production SVGs."""
from pathlib import Path
import copy
import json
import re
import shutil
import xml.etree.ElementTree as ET
import pymupdf

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "adobe animate and illustrator saves (imp)" / "illustrator" / "algowzxd new 2024"
OUT = ROOT / "assets" / "production_character" / "illustrator2024"
SVG = "{http://www.w3.org/2000/svg}"
INKSCAPE = "{http://www.inkscape.org/namespaces/inkscape}"


def slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def bounds(page, layer: str, margin=2):
    rects = [item["rect"] for item in page.get_drawings(extended=True) if item.get("layer") == layer and "rect" in item]
    if not rects:
        return page.rect
    box = rects[0]
    for rect in rects[1:]:
        box |= rect
    return pymupdf.Rect(max(0, box.x0 - margin), max(0, box.y0 - margin), min(page.rect.width, box.x1 + margin), min(page.rect.height, box.y1 + margin))


def extract_layer(source: Path, layer: str, destination: Path, crop=None, full_page=False):
    doc = pymupdf.open(source)
    ocgs = doc.get_ocgs()
    target = next((xref for xref, info in ocgs.items() if info["name"] == layer), None)
    if target is None:
        raise ValueError(f"Layer {layer!r} not found in {source.name}")
    doc.set_layer(-1, basestate="OFF", on=[target], off=[xref for xref in ocgs if xref != target])
    page = doc[0]
    box = page.rect if full_page else pymupdf.Rect(crop) if crop else bounds(page, layer)
    page.set_cropbox(box)
    destination.parent.mkdir(parents=True, exist_ok=True)
    root = ET.fromstring(page.get_svg_image())
    groupmode = "{http://www.inkscape.org/namespaces/inkscape}groupmode"
    label = "{http://www.inkscape.org/namespaces/inkscape}label"
    for parent in root.iter():
        for child in list(parent):
            if child.get(groupmode) == "layer" and child.get(label) != layer:
                parent.remove(child)
    destination.write_text(ET.tostring(root, encoding="unicode"), encoding="utf-8")
    return [round(value, 3) for value in box]


def extract_crop(source: Path, destination: Path, crop):
    doc = pymupdf.open(source)
    page = doc[0]
    box = pymupdf.Rect(crop)
    page.set_cropbox(box)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(page.get_svg_image(), encoding="utf-8")
    return list(crop)


def split_eye_layer(source: Path, layer: str, composite: Path, page_box, destination: Path):
    doc = pymupdf.open(source)
    drawings = [item for item in doc[0].get_drawings(extended=True) if item.get("layer") == layer and "rect" in item]
    root = ET.parse(composite).getroot()
    layer_group = next(node for node in root.iter() if node.get(INKSCAPE + "label") == layer)
    paths = list(layer_group.iter(SVG + "path"))
    path_groups = []
    for index, path in enumerate(paths):
        transform = path.get("transform")
        if not path_groups or path_groups[-1][0] != transform:
            path_groups.append([transform, index])
    path_groups = [list(range(group[1], path_groups[index + 1][1] if index + 1 < len(path_groups) else len(paths))) for index, group in enumerate(path_groups)]
    assert len(path_groups) == len(drawings), f"Could not map {layer} vector paths to Illustrator drawings"

    midpoint = (page_box[0] + page_box[2]) / 2
    parts = {name: [] for name in ("eye-l", "eye-r", "brow-l", "brow-r", "highlight-l", "highlight-r")}
    black_by_side = {"l": [], "r": []}
    for index, drawing in enumerate(drawings):
        side = "l" if (drawing["rect"].x0 + drawing["rect"].x1) / 2 < midpoint else "r"
        fill = drawing.get("fill")
        if fill and min(fill) > 0.9:
            parts[("eye-" if layer == "shock eyes" else "highlight-") + side].append(index)
        else:
            black_by_side[side].append(index)

    brow_layers = {"normal eyes 2", "sad eyes", "curious eyes right", "curious eyes middle", "curious eyes left", "closed eyes", "shock eyes"}
    for side, indices in black_by_side.items():
        if layer == "shock eyes":
            parts["brow-" + side].extend(indices)
        elif layer == "closed eyes":
            ordered = sorted(indices, key=lambda index: drawings[index]["rect"].y0)
            parts["brow-" + side].extend(ordered[:-1])
            parts["eye-" + side].append(ordered[-1])
        elif layer in brow_layers and len(indices) > 1:
            eye = max(indices, key=lambda index: drawings[index]["rect"].height)
            parts["eye-" + side].append(eye)
            parts["brow-" + side].extend(index for index in indices if index != eye)
        else:
            parts["eye-" + side].extend(indices)

    result = {}
    for name, drawing_indices in parts.items():
        if not drawing_indices:
            continue
        part_root = copy.deepcopy(root)
        part_layer = next(node for node in part_root.iter() if node.get(INKSCAPE + "label") == layer)
        part_paths = list(part_layer.iter(SVG + "path"))
        keep = {path_index for drawing_index in drawing_indices for path_index in path_groups[drawing_index]}
        parents = {child: parent for parent in part_root.iter() for child in parent}
        for index, path in enumerate(part_paths):
            if index not in keep:
                parents[path].remove(path)
        box = drawings[drawing_indices[0]]["rect"]
        for index in drawing_indices[1:]:
            box |= drawings[index]["rect"]
        local = [max(0, box.x0 - page_box[0] - 1), max(0, box.y0 - page_box[1] - 1), box.width + 2, box.height + 2]
        part_root.set("viewBox", " ".join(str(round(value, 3)) for value in local))
        part_root.set("width", str(round(local[2], 3)))
        part_root.set("height", str(round(local[3], 3)))
        destination.mkdir(parents=True, exist_ok=True)
        (destination / f"{name}.svg").write_text(ET.tostring(part_root, encoding="unicode"), encoding="utf-8")
        result[name] = [round(value, 3) for value in local]
    return result


def main():
    head = SOURCE / "character saves for aftere effects" / "head.ai"
    hoodie = SOURCE / "algowzxd hoodie" / "algowzxd hoodie own.ai"
    eyes = SOURCE / "eyes" / "algowzxd eyes illustrators.ai"
    mouths = SOURCE / "mouth" / "algowzxd mouht pieces.ai"

    for folder in ("hoodie", "head", "eyes", "mouths"):
        target = OUT / folder
        if target.exists():
            shutil.rmtree(target)
        target.mkdir(parents=True)

    hoodie_layers = ["left thigh", "left leg", "right thigh", "right leg", "body", "Layer 18", "collar", "right hand shoulder", "left hand shoulder", "shadings", "right hand", "left hand", "Layer 18 copy", "hoodie threads"]
    head_layers = ["head", "ears", "hair"]
    eye_layers = ["normal eyes 2", "sad eyes", "cunning eyes", "serious eyes", "curious eyes right", "curious eyes middle", "curious eyes left", "angry eyes", "shock eyes", "closed eyes", "seeing left", "seeing right"]
    mouth_crops = {
        "closed": (12, 47, 220, 88), "aa": (0, 108, 245, 208), "oh": (417, 42, 522, 120),
        "uh": (395, 154, 506, 231), "ee": (0, 232, 252, 314), "smile": (318, 228, 568, 309),
        "teeth": (0, 323, 255, 412), "wide": (318, 323, 570, 424), "f": (0, 413, 285, 505),
        "m": (395, 466, 475, 558), "l": (0, 514, 260, 620), "frown": (30, 659, 255, 710),
    }

    manifest = {"headTransform": [0.65, 0, 0, 0.65, 221.95, -72.55], "hoodie": {}, "head": {}, "eyes": {}, "eyeParts": {}, "mouths": {}}
    for layer in hoodie_layers:
        manifest["hoodie"][layer] = extract_layer(hoodie, layer, OUT / "hoodie" / f"{slug(layer)}.svg", full_page=True)
    for layer in head_layers:
        manifest["head"][layer] = extract_layer(head, layer, OUT / "head" / f"{slug(layer)}.svg", full_page=True)
    manifest["head"]["neck"] = extract_layer(head, "neck", OUT / "head" / "neck.svg", full_page=True)
    for layer in eye_layers:
        composite = OUT / "eyes" / f"{slug(layer)}.svg"
        manifest["eyes"][layer] = extract_layer(eyes, layer, composite)
        manifest["eyeParts"][layer] = split_eye_layer(eyes, layer, composite, manifest["eyes"][layer], OUT / "eyes" / slug(layer))
    for name, crop in mouth_crops.items():
        manifest["mouths"][name] = extract_crop(mouths, OUT / "mouths" / f"{name}.svg", crop)

    hoodie_groups = [f'<g data-rig-art="ai24-{slug(layer)}"><image href="/production_character/illustrator2024/hoodie/{slug(layer)}.svg" x="{manifest["hoodie"][layer][0]}" y="{manifest["hoodie"][layer][1]}" width="{manifest["hoodie"][layer][2]-manifest["hoodie"][layer][0]}" height="{manifest["hoodie"][layer][3]-manifest["hoodie"][layer][1]}"/></g>' for layer in hoodie_layers]
    head_groups = [
        '<g data-rig-art="ai24-neck" transform="matrix(.65 0 0 .65 221.95 -72.55)"><image href="/production_character/illustrator2024/head/neck.svg" x="0" y="0" width="1920" height="1080"/></g>',
        *[f'<g data-rig-art="ai24-head-{slug(layer)}" transform="matrix(.65 0 0 .65 221.95 -72.55)"><image href="/production_character/illustrator2024/head/{slug(layer)}.svg" x="{manifest["head"][layer][0]}" y="{manifest["head"][layer][1]}" width="{manifest["head"][layer][2]-manifest["head"][layer][0]}" height="{manifest["head"][layer][3]-manifest["head"][layer][1]}"/></g>' for layer in head_layers],
    ]
    head_index = hoodie_layers.index("body") + 1
    groups = [*hoodie_groups[:head_index], *head_groups, *hoodie_groups[head_index:]]
    master = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080">' + "".join(groups) + "</svg>"
    (OUT / "character.svg").write_text(master, encoding="utf-8")
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"Extracted {len(hoodie_layers)} hoodie, {len(head_layers)+1} head, {len(eye_layers)} eye, and {len(mouth_crops)} mouth assets.")


if __name__ == "__main__":
    main()
