"""4x upscale with Real-ESRGAN x4plus (ONNX, fixed 128x128 tiles), feathered tile blending.

Usage: python3 esrgan_upscale.py <model.onnx> <input> <output.png>
"""
import sys

import numpy as np
import onnxruntime as ort
from PIL import Image, ImageOps

model, src, dst = sys.argv[1], sys.argv[2], sys.argv[3]
T, OV, S = 128, 24, 4  # tile, overlap (input px), scale

img = np.asarray(ImageOps.exif_transpose(Image.open(src)).convert("RGB"), dtype=np.float32) / 255.0
H, W, _ = img.shape
step = T - OV
ny = max(1, int(np.ceil((H - OV) / step)))
nx = max(1, int(np.ceil((W - OV) / step)))
PH, PW = (ny - 1) * step + T, (nx - 1) * step + T
pad = np.pad(img, ((0, PH - H), (0, PW - W), (0, 0)), mode="reflect")

sess = ort.InferenceSession(model, providers=["CPUExecutionProvider"])
name = sess.get_inputs()[0].name

# Feather mask: linear ramp over the overlap on every side.
ramp = np.ones(T * S, np.float32)
o = OV * S
ramp[:o] = np.linspace(0.05, 1.0, o)
ramp[-o:] = np.linspace(1.0, 0.05, o)
mask = np.outer(ramp, ramp)[..., None]

acc = np.zeros((PH * S, PW * S, 3), np.float32)
wsum = np.zeros((PH * S, PW * S, 1), np.float32)
for iy in range(ny):
    for ix in range(nx):
        y, x = iy * step, ix * step
        tile = pad[y:y + T, x:x + T].transpose(2, 0, 1)[None]
        out = sess.run(None, {name: np.ascontiguousarray(tile)})[0][0].transpose(1, 2, 0)
        acc[y * S:(y + T) * S, x * S:(x + T) * S] += out * mask
        wsum[y * S:(y + T) * S, x * S:(x + T) * S] += mask
res = acc / np.maximum(wsum, 1e-6)
res = np.clip(res[:H * S, :W * S] * 255.0 + 0.5, 0, 255).astype(np.uint8)
Image.fromarray(res).save(dst)
print("tiles", ny * nx, "->", res.shape[1], "x", res.shape[0])
