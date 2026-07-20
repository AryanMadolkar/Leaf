import os
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FURNITURE_SRC = os.path.join(ROOT, "image.png")
CAT_SRC = os.path.join(ROOT, "cat.png")
BG_SRC = os.path.join(ROOT, "bg.png")

FURNITURE_OUT = os.path.join(ROOT, "frontend", "public", "room-assets", "cozy-cabin")
CAT_OUT = os.path.join(ROOT, "frontend", "public", "room-assets", "cats")
BG_OUT = os.path.join(ROOT, "frontend", "public", "room-assets", "backgrounds")


def soft_key_and_decontaminate(im: Image.Image, bg_rgb=(249, 249, 249), low=6, high=40) -> Image.Image:
    """Soft-threshold alpha matte against a near-white sheet background, then
    un-premultiply (color-decontaminate) partially-transparent edge pixels so
    no light halo/fringe survives from the flattened source image."""
    arr = np.array(im.convert("RGB")).astype(np.float32)
    bg = np.array(bg_rgb, dtype=np.float32)
    dist = np.sqrt(((arr - bg) ** 2).sum(axis=2))
    alpha = np.clip((dist - low) / (high - low), 0.0, 1.0)

    # erode the mask by 1px to eat any residual bg-tinted rim, then feather
    alpha_img = Image.fromarray((alpha * 255).astype(np.uint8))
    alpha_img = alpha_img.filter(ImageFilter.MinFilter(3))
    alpha_img = alpha_img.filter(ImageFilter.GaussianBlur(0.6))
    alpha = np.array(alpha_img).astype(np.float32) / 255.0

    # un-premultiply: remove the background's contribution from edge pixel colors
    safe_alpha = np.clip(alpha, 0.08, 1.0)[..., None]
    decontaminated = (arr - (1 - safe_alpha) * bg) / safe_alpha
    decontaminated = np.clip(decontaminated, 0, 255)

    out = np.dstack([decontaminated, alpha[..., None] * 255]).astype(np.uint8)
    return Image.fromarray(out, mode="RGBA")


def bbox_alpha(im: Image.Image, pad=4):
    bbox = im.getbbox()
    if not bbox:
        return im
    l, t, r, b = bbox
    l = max(0, l - pad)
    t = max(0, t - pad)
    r = min(im.width, r + pad)
    b = min(im.height, b + pad)
    return im.crop((l, t, r, b))


def trim_label(im: Image.Image, gap_rows=5) -> Image.Image:
    alpha = im.getchannel("A")
    w, h = im.size
    def row_qualifies(y):
        count = sum(1 for x in range(0, w, 1) if alpha.getpixel((x, y)) > 40)
        return count >= 3

    row_has_content = [row_qualifies(y) for y in range(h)]
    first_content = next((y for y, v in enumerate(row_has_content) if v), None)
    if first_content is None:
        return im
    gap_start = None
    y = first_content
    consec_empty = 0
    while y < h:
        if row_has_content[y]:
            consec_empty = 0
        else:
            consec_empty += 1
            if consec_empty >= gap_rows:
                gap_start = y - gap_rows + 1
                break
        y += 1
    if gap_start is None:
        return im
    return im.crop((0, 0, w, gap_start))


def crop_and_key(src: Image.Image, box, out_path, bg_rgb=(249, 249, 249), low=6, high=40, trim_caption=True):
    tile = src.crop(box)
    keyed = soft_key_and_decontaminate(tile, bg_rgb, low, high)
    trimmed = bbox_alpha(keyed)
    if trim_caption:
        trimmed = trim_label(trimmed)
        trimmed = bbox_alpha(trimmed, pad=2)
    trimmed.save(out_path)
    print("wrote", out_path, trimmed.size)


def recolor_to_black(im: Image.Image, tint=(36, 32, 28)) -> Image.Image:
    """Approximate a black cat from a lighter-colored sprite: keep the
    existing luminance/shading (fur texture, shadow, rim-light) but pull
    hue/chroma toward near-black, preserving alpha untouched."""
    arr = np.array(im.convert("RGBA")).astype(np.float32)
    rgb = arr[..., :3]
    alpha = arr[..., 3:4]
    lum = (0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]) / 255.0
    lum = lum[..., None]
    tint_arr = np.array(tint, dtype=np.float32)
    # base near-black, but let bright highlights (fur rim-light) show through
    # as a lighter warm-grey instead of flattening everything to one silhouette
    shaded = tint_arr * (0.5 + 0.9 * lum) + 40.0 * np.clip(lum - 0.75, 0, 1) * 4
    out_rgb = np.clip(shaded, 0, 235)
    out = np.dstack([out_rgb, alpha]).astype(np.uint8)
    return Image.fromarray(out, mode="RGBA")


def recolor_to_tuxedo(im: Image.Image) -> Image.Image:
    """Approximate a black & white cat: push luminance bimodally toward
    black or white (posterize-like contrast curve) instead of a flat tint,
    to read as distinct black/white fur patches rather than solid grey."""
    arr = np.array(im.convert("RGBA")).astype(np.float32)
    rgb = arr[..., :3]
    alpha = arr[..., 3:4]
    lum = (0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]) / 255.0
    # S-curve: push toward extremes around midpoint 0.5
    curved = 0.5 + 0.5 * np.sign(lum - 0.42) * (np.abs(lum - 0.42) / 0.58) ** 0.55
    curved = np.clip(curved, 0.03, 0.97)
    val = (curved * 255.0)[..., None]
    out_rgb = np.repeat(val, 3, axis=2)
    out = np.dstack([out_rgb, alpha]).astype(np.uint8)
    return Image.fromarray(out, mode="RGBA")


def main():
    os.makedirs(FURNITURE_OUT, exist_ok=True)
    os.makedirs(CAT_OUT, exist_ok=True)
    os.makedirs(BG_OUT, exist_ok=True)

    bg = Image.open(BG_SRC).convert("RGB")
    bg.save(os.path.join(BG_OUT, "cozy-cabin.jpg"), quality=90)

    furniture = Image.open(FURNITURE_SRC).convert("RGB")
    furniture_items = {
        "bookshelf": (10, 0, 210, 213),
        "reading-chair": (243, 0, 411, 213),
        "desk": (581, 0, 830, 213),
        "side-table": (858, 0, 967, 213),
        "floor-lamp": (495, 266, 567, 266 + 180),
        "hanging-plant": (1068, 266, 1175, 266 + 150),
        "potted-plant": (1227, 266, 1361, 266 + 150),
        "small-plant": (1416, 266, 1489, 266 + 150),
        "coffee-mug": (35, 606, 153, 606 + 92),
        "cat-bed": (32, 756, 173, 756 + 88),
        "yarn-ball": (393, 756, 490, 756 + 88),
        "fish-tank": (891, 756, 1052, 756 + 98),
        "goldfish": (1077, 756, 1193, 756 + 150),
        "vinyl-player": (32, 888, 173, 888 + 150),
        "globe": (577, 888, 673, 888 + 100),
        "vinyl-records": (201, 888, 346, 888 + 150),
    }
    no_trim = {"fish-tank", "bookshelf", "reading-chair", "desk", "side-table"}
    for name, box in furniture_items.items():
        crop_and_key(furniture, box, os.path.join(FURNITURE_OUT, f"{name}.png"), trim_caption=name not in no_trim)

    cats = Image.open(CAT_SRC).convert("RGB")
    cat_row_starts = [0, 300, 545]
    cat_icon_h = 200
    ccol_w = 256

    def cat_box(row, col):
        x0, x1 = col * ccol_w, (col + 1) * ccol_w
        y0 = cat_row_starts[row]
        y1 = y0 + cat_icon_h
        return (x0, y0, x1, y1)

    cat_map = {
        "windowsill-lookleft": cat_box(0, 4),
        "windowsill-lookright": cat_box(0, 5),
        "windowsill-sitting": cat_box(0, 0),
        "windowsill-stretch": cat_box(1, 0),
        "rug-sleeping": cat_box(1, 2),
        "rug-curlup": cat_box(1, 3),
        "rug-playing": cat_box(1, 5),
    }
    for name, box in cat_map.items():
        crop_and_key(cats, box, os.path.join(CAT_OUT, f"{name}.png"), bg_rgb=(241, 237, 230), low=6, high=45)

    # recolor windowsill poses to solid black, rug poses to black & white
    for name in ["windowsill-lookleft", "windowsill-lookright", "windowsill-sitting", "windowsill-stretch"]:
        p = os.path.join(CAT_OUT, f"{name}.png")
        recolor_to_black(Image.open(p)).save(p)
        print("recolored (black)", p)

    for name in ["rug-sleeping", "rug-curlup", "rug-playing"]:
        p = os.path.join(CAT_OUT, f"{name}.png")
        recolor_to_tuxedo(Image.open(p)).save(p)
        print("recolored (tuxedo)", p)


if __name__ == "__main__":
    main()
