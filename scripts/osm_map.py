"""Compose a static map from OpenStreetMap tiles around a point, with a marker and attribution.
Usage: python3 osm_map.py <lat> <lon> <zoom> <out.png> <width> <height>"""
import io, math, sys, time, urllib.request
from PIL import Image, ImageDraw, ImageFont
lat, lon, z = float(sys.argv[1]), float(sys.argv[2]), int(sys.argv[3])
out, W, H = sys.argv[4], int(sys.argv[5]), int(sys.argv[6])
UA = "khushbakhti-site-mockup/1.0 (vudiremix@gmail.com)"
n = 2 ** z
fx = (lon + 180) / 360 * n
fy = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n
px, py = fx * 256, fy * 256
x0, y0 = int((px - W / 2) // 256), int((py - H / 2) // 256)
x1, y1 = int((px + W / 2) // 256), int((py + H / 2) // 256)
canvas = Image.new("RGB", ((x1 - x0 + 1) * 256, (y1 - y0 + 1) * 256))
for tx in range(x0, x1 + 1):
    for ty in range(y0, y1 + 1):
        req = urllib.request.Request(f"https://tile.openstreetmap.org/{z}/{tx}/{ty}.png", headers={"User-Agent": UA})
        tile = Image.open(io.BytesIO(urllib.request.urlopen(req, timeout=30).read())).convert("RGB")
        canvas.paste(tile, ((tx - x0) * 256, (ty - y0) * 256))
        time.sleep(0.3)
cx, cy = px - x0 * 256, py - y0 * 256
img = canvas.crop((int(cx - W / 2), int(cy - H / 2), int(cx - W / 2) + W, int(cy - H / 2) + H))
d = ImageDraw.Draw(img)
mx, my = W / 2, H / 2
# Marker: burgundy pin with gold dot.
d.ellipse((mx - 22, my - 62, mx + 22, my - 18), fill=(132, 36, 30), outline=(255, 255, 255), width=4)
d.polygon([(mx - 16, my - 30), (mx + 16, my - 30), (mx, my)], fill=(132, 36, 30))
d.ellipse((mx - 8, my - 48, mx + 8, my - 32), fill=(227, 176, 60))
font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 15)
label = "© OpenStreetMap contributors"
tw = d.textlength(label, font=font)
d.rectangle((W - tw - 16, H - 26, W, H), fill=(255, 255, 255))
d.text((W - tw - 8, H - 23), label, fill=(60, 60, 60), font=font)
img.save(out, optimize=True)
print("ok", W, H)
