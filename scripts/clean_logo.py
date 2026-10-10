"""Clean up the Khushbakhti logo: denoise JPEG, upscale 4x, remove white background.

Usage: python3 logo.py <input.jpg> <out_dir>
"""
import os
import sys

import cv2
import numpy as np
from PIL import Image, ImageOps

src, out_dir = sys.argv[1], sys.argv[2]
os.makedirs(out_dir, exist_ok=True)

rgb = np.array(ImageOps.exif_transpose(Image.open(src)).convert("RGB"))
bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)

# 1. Remove JPEG blocking/ringing at native size.
den = cv2.fastNlMeansDenoisingColored(bgr, None, h=5, hColor=5, templateWindowSize=7, searchWindowSize=21)

# 2. Upscale 4x in two 2x steps (less ringing than one big jump), smooth lightly between.
up = den
for _ in range(2):
    up = cv2.resize(up, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
    up = cv2.bilateralFilter(up, d=5, sigmaColor=18, sigmaSpace=3)

# 3. Unsharp mask to restore edge crispness.
blur = cv2.GaussianBlur(up, (0, 0), sigmaX=2.2)
sharp = cv2.addWeighted(up, 1.7, blur, -0.7, 0)

img = cv2.cvtColor(sharp, cv2.COLOR_BGR2RGB).astype(np.float32)
base = cv2.cvtColor(up, cv2.COLOR_BGR2RGB).astype(np.float32)  # unsharpened, for alpha
H, W, _ = img.shape
mn = base.min(axis=2)
mx = base.max(axis=2)

# 4. Solid foreground: clearly coloured or clearly dark pixels.
solid = ((mx - mn > 45) | (mn < 190)).astype(np.uint8)
solid = cv2.morphologyEx(solid, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
core = cv2.erode(solid, np.ones((5, 5), np.uint8))

# Local foreground colour: normalised convolution of core colours into the edge band.
cf = core.astype(np.float32)
wsum = cv2.GaussianBlur(cf, (0, 0), 5)
fg_col = np.dstack([cv2.GaussianBlur(base[..., i] * cf, (0, 0), 5) for i in range(3)]) / np.maximum(wsum, 1e-4)[..., None]

# Alpha = share of foreground colour in "foreground over white", measured on the darkest fg channel.
ch = np.argmin(fg_col, axis=2)
f_min = np.take_along_axis(fg_col, ch[..., None], axis=2)[..., 0]
c_min = np.take_along_axis(base, ch[..., None], axis=2)[..., 0]
alpha = np.clip((255.0 - c_min) / np.maximum(255.0 - f_min, 25.0), 0, 1)
# Steepen the soft upscaled edge to a crisp ~3px transition.
alpha = np.clip((alpha - 0.3) / 0.45, 0, 1)
alpha = alpha * alpha * (3 - 2 * alpha)
alpha = np.where(core == 1, 1.0, alpha)
# Far from any foreground there is only paper.
band = cv2.dilate(core, np.ones((11, 11), np.uint8))
alpha = np.where(band == 1, alpha, 0.0)
alpha = np.where(alpha < 0.06, 0.0, alpha)

# Edge pixels take the clean foreground colour instead of the white-tinted one.
edge = (core == 0) & (alpha > 0)
img = np.where(edge[..., None], np.clip(fg_col, 0, 255), img)

# 5. Protect the burgundy oval interior (it may contain bright highlights).
r, g, b = base[..., 0], base[..., 1], base[..., 2]
burg = ((r > g + 45) & (r > b + 35) & (g < 110)).astype(np.uint8)
burg = cv2.morphologyEx(burg, cv2.MORPH_OPEN, np.ones((9, 9), np.uint8))
n, labels, stats, _ = cv2.connectedComponentsWithStats(burg)
if n > 1:
    big = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    pts = cv2.findNonZero((labels == big).astype(np.uint8))
    hull = cv2.convexHull(pts)
    protect = np.zeros((H, W), np.uint8)
    cv2.fillConvexPoly(protect, hull, 1)
    protect = cv2.erode(protect, np.ones((15, 15), np.uint8))
    alpha = np.where(protect == 1, 1.0, alpha)

# Clean tiny specks of leftover alpha.
a8 = (alpha * 255).astype(np.uint8)
a8 = cv2.morphologyEx(a8, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
alpha = a8.astype(np.float32) / 255.0

# 6. Edge colours were already replaced by the clean foreground colour above.
fg = np.where(alpha[..., None] > 0.02, np.clip(img, 0, 255), 0)

rgba = np.dstack([fg, alpha * 255.0]).astype(np.uint8)

# 7. Crop to content with a small margin.
ys, xs = np.where(alpha > 0.05)
pad = int(0.02 * max(H, W))
y0, y1 = max(0, ys.min() - pad), min(H, ys.max() + pad + 1)
x0, x1 = max(0, xs.min() - pad), min(W, xs.max() + pad + 1)
rgba = rgba[y0:y1, x0:x1]

full = Image.fromarray(rgba, "RGBA")
full.save(os.path.join(out_dir, "khushbakhti-logo.png"), optimize=True)
for w in (1024, 512, 256):
    h = round(full.height * w / full.width)
    full.resize((w, h), Image.LANCZOS).save(os.path.join(out_dir, f"khushbakhti-logo-{w}.png"), optimize=True)
full.save(os.path.join(out_dir, "khushbakhti-logo.webp"), quality=92, method=6)

# Previews on dark and light grounds for checking edges.
for name, color in (("dark", (20, 20, 20, 255)), ("turq", (11, 122, 117, 255)), ("white", (255, 255, 255, 255))):
    bgimg = Image.new("RGBA", full.size, color)
    bgimg.alpha_composite(full)
    bgimg.convert("RGB").save(os.path.join(out_dir, f"preview-{name}.jpg"), quality=90)

print("source", rgb.shape[1], "x", rgb.shape[0], "-> logo", full.width, "x", full.height)
