"""Build «Khushbakhti Sign» — a soft, rounded caps display font echoing the logo lettering.

Every glyph is drawn as a skeleton (lines and superellipse arcs) and stroked with round caps
and joins; free ends of curves and diagonals get slightly larger "ball" terminals like the
script in the logo. Covers Russian and Tajik Cyrillic, basic Latin, digits and punctuation.
Lowercase code points map to the same (capital) glyphs.

Usage: python3 scripts/build_font.py <out_dir>
Requires: fonttools, shapely, brotli (for WOFF2).
"""
import math
import os
import sys

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from shapely.geometry import LineString, Point, Polygon
from shapely.geometry.polygon import orient
from shapely.ops import unary_union

UPM = 1000
CAP = 700
R = 72            # stroke half-width
WF = 1.12         # width factor applied to every glyph's inner width
SB = 42           # side bearing
BALL = 1.42       # ball terminal radius factor
OS = 10           # overshoot for round shapes
B, T = R, CAP - R
M = 352           # optical middle
DESC = -150       # descender end (skeleton)


def se(x0, y0, x1, y1, t0, t1, n=2.25, k=64):
    """Points along a superellipse inscribed in a box, from angle t0 to t1 (degrees)."""
    cx, cy, a, b = (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2, (y1 - y0) / 2
    pts = []
    steps = max(8, int(k * abs(t1 - t0) / 360))
    for i in range(steps + 1):
        t = math.radians(t0 + (t1 - t0) * i / steps)
        c, s = math.cos(t), math.sin(t)
        x = cx + a * math.copysign(abs(c) ** (2 / n), c)
        y = cy + b * math.copysign(abs(s) ** (2 / n), s)
        pts.append((x, y))
    return pts


def smooth(pts, rc=70):
    """Round interior corners of a polyline with quadratic curves of radius ~rc."""
    if len(pts) < 3:
        return pts
    out = [pts[0]]
    for i in range(1, len(pts) - 1):
        (x0, y0), (x1, y1), (x2, y2) = pts[i - 1], pts[i], pts[i + 1]
        d0 = math.hypot(x1 - x0, y1 - y0)
        d1 = math.hypot(x2 - x1, y2 - y1)
        d = min(rc, d0 / 2, d1 / 2)
        a = (x1 - (x1 - x0) * d / d0, y1 - (y1 - y0) * d / d0)
        c = (x1 + (x2 - x1) * d / d1, y1 + (y2 - y1) * d / d1)
        for j in range(9):
            t = j / 8
            out.append(((1 - t) ** 2 * a[0] + 2 * (1 - t) * t * x1 + t * t * c[0],
                        (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * y1 + t * t * c[1]))
    out.append(pts[-1])
    return out


class G:
    """Collects stroke geometry for one glyph."""

    def __init__(self, iw):
        iw = iw * WF
        self.iw = iw
        self.L = SB + R
        self.R = self.L + iw
        self.C = self.L + iw / 2
        self.parts = []

    def line(self, *pts, r=R, rc=0):
        pts = smooth(list(pts), rc) if rc else list(pts)
        if len(pts) == 1:
            self.parts.append(Point(pts[0]).buffer(r, quad_segs=16))
        else:
            self.parts.append(LineString(pts).buffer(r, cap_style="round", join_style="round", quad_segs=16))

    def path(self, pts, r=R):
        self.parts.append(LineString(pts).buffer(r, cap_style="round", join_style="round", quad_segs=16))

    def ring(self, x0, y0, x1, y1, r=R, n=2.25):
        self.parts.append(Polygon(se(x0, y0, x1, y1, 0, 360, n, 96)).exterior.buffer(r, quad_segs=16))

    def ball(self, x, y, f=BALL):
        self.parts.append(Point(x, y).buffer(R * f, quad_segs=16))

    def curl(self, pts, at_end=True, side=1, turn=150, rh=92):
        """Swash terminal: the stroke keeps going and curls by `turn` degrees (side=1 left, -1 right)."""
        p, q = (pts[-1], pts[-2]) if at_end else (pts[0], pts[1])
        dx, dy = p[0] - q[0], p[1] - q[1]
        ln = math.hypot(dx, dy)
        dx, dy = dx / ln, dy / ln
        nx, ny = (-dy, dx) if side > 0 else (dy, -dx)
        cx, cy = p[0] + nx * rh, p[1] + ny * rh
        a0 = math.atan2(p[1] - cy, p[0] - cx)
        arc = [(cx + rh * math.cos(a0 + side * math.radians(turn) * i / 24),
                cy + rh * math.sin(a0 + side * math.radians(turn) * i / 24)) for i in range(25)]
        self.path(arc)
        self.ball(*arc[-1], f=1.12)

    def dot(self, x, y, f=1.0):
        self.parts.append(Point(x, y).buffer(R * f, quad_segs=16))

    def bowl(self, xl, yb, xr, yt):
        """Right-facing bowl attached to a stem at xl."""
        rx = min((yt - yb) / 2 * 0.95, (xr - xl) * 0.62)
        self.path([(xl, yt)] + se(xr - 2 * rx, yb, xr, yt, 90, -90) + [(xl, yb)])

    def bowl_left(self, xr, yb, xl, yt):
        rx = min((yt - yb) / 2 * 0.95, (xr - xl) * 0.62)
        self.path([(xr, yt)] + se(xl, yb, xl + 2 * rx, yt, 90, 270) + [(xr, yb)])

    @property
    def advance(self):
        return round(self.R + R + SB)


def glyphs():
    D = {}

    def g(name, iw):
        D[name] = G(iw)
        return D[name]

    # --- Cyrillic capitals -------------------------------------------------------
    a = g("A", 330)
    apex = se(a.C - 60, T - 130, a.C + 60, T, 180, 0)
    a.path([(a.L, B)] + apex + [(a.R, B)])
    a.line((a.L + 0.2 * a.iw, 270), (a.R - 0.2 * a.iw, 270))

    b = g("Be", 290)
    b.line((b.L, B), (b.L, T))
    b.line((b.L, T), (b.R - 40, T))
    b.curl([(b.L, T), (b.R - 40, T)], side=1, turn=130, rh=70)  # curls up, so Б never reads as В
    b.bowl(b.L, B, b.R, 400)

    v = g("Ve", 290)
    v.line((v.L, B), (v.L, T))
    v.bowl(v.L, 372, v.R - 22, T)
    v.bowl(v.L, B, v.R, 372)

    gg = g("Ge", 250)
    gg.line((gg.L, B), (gg.L, T), (gg.R - 40, T), rc=40)
    gg.curl([(gg.L, T), (gg.R - 40, T)], side=-1)

    de = g("De", 330)
    de.line((de.L + 0.1 * de.iw, B), (de.L + 0.22 * de.iw, T), (de.R, T), (de.R, B), rc=40)
    de.line((de.L - 22, B), (de.R + 22, B))
    de.line((de.L - 22, B), (de.L - 22, DESC))
    de.line((de.R + 22, B), (de.R + 22, DESC))

    e = g("Ie", 260)
    e.line((e.R, T), (e.L, T), (e.L, B), (e.R, B), rc=40)
    e.line((e.L, M), (e.R - 40, M))

    zh = g("Zhe", 520)
    zh.line((zh.C, B), (zh.C, T))
    zh.line((zh.L, T), (zh.C, M), (zh.L, B))
    zh.line((zh.R, T), (zh.C, M), (zh.R, B))
    for x, y in ((zh.L, T), (zh.L, B), (zh.R, T), (zh.R, B)):
        zh.ball(x, y)

    z = g("Ze", 280)
    zm = 372
    z.path(se(z.L + 10, zm, z.R - 18, T + OS, 150, -90))
    z.path(se(z.L, B - OS, z.R, zm, 90, -150))
    z.line((z.C - 70, zm), (z.C, zm))
    for t, box in ((150, (z.L + 10, zm, z.R - 18, T + OS)), (-150, (z.L, B - OS, z.R, zm))):
        z.ball(*se(*box, t, t)[0])

    i = g("I", 320)
    i.line((i.L, T), (i.L, B))
    i.line((i.R, T), (i.R, B))
    i.line((i.L, B), (i.R, T))

    ik = g("Ishort", 320)
    for p in i.parts:
        ik.parts.append(p)
    ik.path(se(ik.C - 105, 745, ik.C + 105, 950, 192, 348), r=R * 0.75)

    k = g("Ka", 310)
    k.line((k.L, B), (k.L, T))
    k.line((k.R, T), (k.L + 10, M), (k.R, B))
    k.ball(k.R, T)
    k.ball(k.R, B)

    el = g("El", 320)
    leg = [(el.L + 40, B)] + smooth([(el.L + 0.16 * el.iw, B + 10), (el.L + 0.26 * el.iw, T), (el.R, T)], 50)[1:] + [(el.R, B)]
    el.path(leg)
    el.curl(leg, at_end=False, side=-1, turn=130)

    m = g("Em", 440)
    m.line((m.L, B), (m.L, T), (m.C, 230), (m.R, T), (m.R, B), rc=50)

    n = g("En", 310)
    n.line((n.L, B), (n.L, T))
    n.line((n.R, B), (n.R, T))
    n.line((n.L, M), (n.R, M))

    o = g("O", 350)
    o.ring(o.L, B - OS, o.R, T + OS)

    p = g("Pe", 310)
    p.line((p.L, B), (p.L, T), (p.R, T), (p.R, B), rc=60)

    r = g("Er", 290)
    r.line((r.L, B), (r.L, T))
    r.bowl(r.L, 320, r.R, T)

    s = g("Es", 300)
    s.path(se(s.L, B - OS, s.R, T + OS, 42, 318))
    s.ball(*se(s.L, B - OS, s.R, T + OS, 42, 42)[0])
    s.ball(*se(s.L, B - OS, s.R, T + OS, 318, 318)[0])

    t = g("Te", 310)
    t.line((t.L + 30, T), (t.R - 30, T))
    t.line((t.C, T), (t.C, B))
    t.curl([(t.R - 30, T), (t.L + 30, T)], side=1)
    t.curl([(t.L + 30, T), (t.R - 30, T)], side=-1)

    u = g("U", 320)
    tail = smooth([(u.R, T), (u.C - 10, 190), (u.C - 50, B + 10), (u.L + 20, B)], 80)
    u.path(tail)
    u.curl(tail, side=-1, turn=160)
    jx = u.R + (u.C - 10 - u.R) * (T - 330) / (T - 190)  # point on the tail at y=330
    u.line((u.L, T), (jx, 330))
    u.ball(u.L, T)
    u.ball(u.R, T)

    f = g("Ef", 440)
    f.line((f.C, B - 30), (f.C, T + 30))
    f.ring(f.L, 150, f.R, 560)

    h = g("Ha", 320)
    h.line((h.L, T), (h.R, B))
    h.line((h.R, T), (h.L, B))
    h.curl([(h.R, B), (h.L, T)], side=1)
    h.curl([(h.L, T), (h.R, B)], side=1)
    h.ball(h.R, T)
    h.ball(h.L, B)

    ts = g("Tse", 300)
    ts.line((ts.L, T), (ts.L, B), (ts.R + 30, B), rc=50)
    ts.line((ts.R, T), (ts.R, B))
    ts.line((ts.R + 30, B), (ts.R + 30, DESC))

    ch = g("Che", 290)
    ch.path([(ch.L, T), (ch.L, 440)] + se(ch.L, 300, ch.R, 580, 180, 360))
    ch.line((ch.R, T), (ch.R, B))

    sh = g("Sha", 460)
    sh.line((sh.L, T), (sh.L, B), (sh.R, B), (sh.R, T), rc=50)
    sh.line((sh.C, B), (sh.C, T))

    sch = g("Shcha", 470)
    sch.line((sch.L, T), (sch.L, B), (sch.R + 30, B), rc=50)
    sch.line((sch.R, B), (sch.R, T))
    sch.line((sch.C, B), (sch.C, T))
    sch.line((sch.R + 30, B), (sch.R + 30, DESC))

    hard = g("Hard", 360)
    sx = hard.L + 90
    hard.line((hard.L, T), (sx, T))
    hard.line((sx, T), (sx, B))
    hard.bowl(sx, B, hard.R, 400)

    yy = g("Yeru", 470)
    yy.line((yy.L, T), (yy.L, B))
    yy.bowl(yy.L, B, yy.L + 270, 400)
    yy.line((yy.R, T), (yy.R, B))

    soft = g("Soft", 280)
    soft.line((soft.L, T), (soft.L, B))
    soft.bowl(soft.L, B, soft.R, 400)

    ee = g("E", 300)
    ee.path(se(ee.L, B - OS, ee.R, T + OS, 138, -138))
    ee.line((ee.L + 0.3 * ee.iw, M), (ee.R, M))
    ee.ball(*se(ee.L, B - OS, ee.R, T + OS, 138, 138)[0])
    ee.ball(*se(ee.L, B - OS, ee.R, T + OS, -138, -138)[0])

    yu = g("Yu", 480)
    yu.line((yu.L, T), (yu.L, B))
    yu.line((yu.L, M), (yu.L + 110, M))
    yu.ring(yu.L + 120, B - OS, yu.R, T + OS)

    ya = g("Ya", 290)
    ya.line((ya.R, T), (ya.R, B))
    ya.bowl_left(ya.R, 320, ya.L, T)
    ya.line((ya.L + 0.45 * ya.iw, 330), (ya.L, B))
    ya.ball(ya.L, B)

    # --- Tajik letters -----------------------------------------------------------
    def clone(src, name):
        c = g(name, D[src].iw)
        c.parts = list(D[src].parts)
        return c

    ghe = clone("Ge", "Ghe")
    ghe.line((ghe.L - 40, M), (ghe.L + 150, M))

    imac = clone("I", "Imacron")
    imac.line((imac.C - 95, 800), (imac.C + 95, 800), r=R * 0.8)

    qa = clone("Ka", "Qa")
    qa.line((qa.R, B), (qa.R, DESC))

    umac = clone("U", "Umacron")
    umac.line((umac.C - 95, 800), (umac.C + 95, 800), r=R * 0.8)

    hha = clone("Ha", "Hha")
    hha.line((hha.R, B), (hha.R + 10, DESC))

    jhe = clone("Che", "Jhe")
    jhe.line((jhe.R, B), (jhe.R + 50, B), (jhe.R + 50, DESC), rc=30)

    yo = clone("Ie", "Io")
    yo.dot(yo.C - 85, 820, 0.95)
    yo.dot(yo.C + 85, 820, 0.95)

    # --- Latin-only shapes ---------------------------------------------------------
    d = g("D", 320)
    d.line((d.L, B), (d.L, T))
    rx = 200
    d.path([(d.L, T)] + se(d.R - 2 * rx, B - OS, d.R, T + OS, 90, -90) + [(d.L, B)])

    ff = g("F", 260)
    ff.line((ff.R, T), (ff.L, T), (ff.L, B), rc=40)
    ff.line((ff.L, M), (ff.R - 40, M))

    gl = g("G", 320)
    gl.path(se(gl.L, B - OS, gl.R, T + OS, 42, 360) + [(gl.C + 20, M)])
    gl.ball(*se(gl.L, B - OS, gl.R, T + OS, 42, 42)[0])

    ii = g("Ilatin", 0)
    ii.line((ii.L, B), (ii.L, T))

    j = g("J", 260)
    j.path([(j.R, T), (j.R, 300)] + se(j.L, B - OS, j.R, 540, 0, -180))
    j.ball(j.L, (B - OS + 540) / 2)

    l = g("Llatin", 260)
    l.line((l.L, T), (l.L, B), (l.R, B), rc=40)

    nn = g("N", 320)
    nn.line((nn.L, B), (nn.L, T), (nn.R, B), (nn.R, T), rc=30)

    q = g("Q", 350)
    q.ring(q.L, B - OS, q.R, T + OS)
    q.line((q.C + 40, B + 120), (q.R + 30, B - 70))
    q.ball(q.R + 30, B - 70)

    rr = g("Rlatin", 300)
    rr.line((rr.L, B), (rr.L, T))
    rr.bowl(rr.L, 320, rr.R - 10, T)
    rr.line((rr.L + 0.45 * rr.iw, 330), (rr.R, B))
    rr.ball(rr.R, B)

    ss = g("S", 290)
    sm = 372
    ss.path(se(ss.L + 8, sm, ss.R - 8, T + OS, 32, 270))
    ss.path(se(ss.L, B - OS, ss.R, sm, 90, -148))
    ss.ball(*se(ss.L + 8, sm, ss.R - 8, T + OS, 32, 32)[0])
    ss.ball(*se(ss.L, B - OS, ss.R, sm, -148, -148)[0])

    uu = g("Ulatin", 310)
    uu.path([(uu.L, T), (uu.L, 300)] + se(uu.L, B - OS, uu.R, 560, 180, 360) + [(uu.R, T)])

    vv = g("V", 330)
    vv.line((vv.L, T), (vv.C, B), (vv.R, T), rc=40)
    vv.ball(vv.L, T)
    vv.ball(vv.R, T)

    w = g("W", 520)
    w.line((w.L, T), (w.L + 0.24 * w.iw, B), (w.C, T - 120), (w.R - 0.24 * w.iw, B), (w.R, T), rc=40)
    w.ball(w.L, T)
    w.ball(w.R, T)

    yl = g("Ylatin", 320)
    yl.line((yl.L, T), (yl.C, 330), (yl.R, T), rc=30)
    yl.line((yl.C, 330), (yl.C, B))
    yl.ball(yl.L, T)
    yl.ball(yl.R, T)

    zz = g("Zlatin", 290)
    zz.line((zz.L, T), (zz.R, T), (zz.L, B), (zz.R, B), rc=30)

    # --- Digits --------------------------------------------------------------------
    zero = g("zero", 300)
    zero.ring(zero.L, B - OS, zero.R, T + OS)

    one = g("one", 200)
    one.line((one.L, T - 120), (one.C + 30, T), (one.C + 30, B), rc=30)
    one.ball(one.L, T - 120)

    two = g("two", 290)
    two.path(se(two.L, 330, two.R, T + OS, 158, -20) + [(two.L, B), (two.R, B)])
    two.ball(*se(two.L, 330, two.R, T + OS, 158, 158)[0])

    three = g("three", 280)
    three.parts = list(D["Ze"].parts)
    three.R, three.iw = D["Ze"].R, D["Ze"].iw

    four = g("four", 310)
    four.line((four.R - 50, B), (four.R - 50, T), (four.L, 240), (four.R + 20, 240), rc=30)

    five = g("five", 290)
    start = se(five.L, B - OS, five.R, 460, 150, 150)[0]
    five.line((five.R, T), (five.L + 20, T), (five.L + 10, 420), start, rc=30)
    five.path(se(five.L, B - OS, five.R, 460, 150, -150))
    five.ball(*se(five.L, B - OS, five.R, 460, -150, -150)[0])

    six = g("six", 300)
    six.ring(six.L, B - OS, six.R, 440)
    six.path(se(six.L, B - OS, six.R, T + OS, 52, 190))
    six.ball(*se(six.L, B - OS, six.R, T + OS, 52, 52)[0])

    seven = g("seven", 280)
    seven.line((seven.L, T), (seven.R, T), (seven.C - 30, B), rc=30)
    seven.ball(seven.C - 30, B)

    eight = g("eight", 300)
    eight.ring(eight.L + 18, 372, eight.R - 18, T + OS)
    eight.ring(eight.L, B - OS, eight.R, 392)

    nine = g("nine", 300)
    nine.ring(nine.L, 260, nine.R, T + OS)
    nine.path(se(nine.L, B - OS, nine.R, T + OS, -128, 10))
    nine.ball(*se(nine.L, B - OS, nine.R, T + OS, -128, -128)[0])

    # --- Punctuation ---------------------------------------------------------------
    g("space", 0).R = SB + R + 70

    per = g("period", 0)
    per.dot(per.L, B, 1.1)

    com = g("comma", 0)
    com.dot(com.L, B, 1.1)
    com.line((com.L + 20, B), (com.L - 25, B - 140), r=R * 0.75)

    col = g("colon", 0)
    col.dot(col.L, B, 1.1)
    col.dot(col.L, 470, 1.1)

    sem = g("semicolon", 0)
    sem.parts = list(com.parts)
    sem.dot(sem.L, 470, 1.1)

    hy = g("hyphen", 180)
    hy.line((hy.L, 320), (hy.R, 320))

    en = g("endash", 380)
    en.line((en.L, 320), (en.R, 320))

    em = g("emdash", 760)
    em.line((em.L, 320), (em.R, 320))

    lg = g("guillemotleft", 280)
    for x in (lg.L, lg.L + 160):
        lg.line((x + 120, 520), (x, 330), (x + 120, 140), rc=20)
    rg = g("guillemotright", 280)
    for x in (rg.L, rg.L + 160):
        rg.line((x, 520), (x + 120, 330), (x, 140), rc=20)

    qd = g("quotedbl", 130)
    qd.line((qd.L, T + 10), (qd.L, T - 150), r=R * 0.85)
    qd.line((qd.R, T + 10), (qd.R, T - 150), r=R * 0.85)

    qs = g("quotesingle", 0)
    qs.line((qs.L, T + 10), (qs.L, T - 150), r=R * 0.85)

    qlo = g("quotedblleft", 140)
    for x in (qlo.L, qlo.R):
        qlo.dot(x, T - 90, 1.0)
        qlo.line((x - 10, T - 90), (x + 30, T + 40), r=R * 0.7)
    qro = g("quotedblright", 140)
    for x in (qro.L, qro.R):
        qro.dot(x, T - 40, 1.0)
        qro.line((x + 10, T - 40), (x - 30, T - 170), r=R * 0.7)
    qrs = g("quoteright", 0)
    qrs.dot(qrs.L, T - 40, 1.0)
    qrs.line((qrs.L + 10, T - 40), (qrs.L - 30, T - 170), r=R * 0.7)

    pl = g("parenleft", 150)
    pl.path(se(pl.L, -90, pl.L + 340, 790, 112, 248))
    pr = g("parenright", 150)
    pr.path(se(pr.R - 340, -90, pr.R, 790, 68, -68))

    ex = g("exclam", 0)
    ex.line((ex.L, T), (ex.L, 250))
    ex.dot(ex.L, B, 1.1)

    qu = g("question", 270)
    qu.path(se(qu.L, 360, qu.R, T + OS, 160, -90) + [(qu.C, 250)])
    qu.ball(*se(qu.L, 360, qu.R, T + OS, 160, 160)[0])
    qu.dot(qu.C, B, 1.1)

    sl = g("slash", 260)
    sl.line((sl.L, B - 60), (sl.R, T + 60))

    num = g("numero", 560)
    num.line((num.L, B), (num.L, T), (num.L + 300, B), (num.L + 300, T), rc=30)
    num.ring(num.L + 400, 450, num.R, T, r=R * 0.75)
    num.line((num.L + 400, 330), (num.R, 330), r=R * 0.75)

    mid = g("periodcentered", 0)
    mid.dot(mid.L, 330, 1.0)

    plus = g("plus", 300)
    plus.line((plus.L, 330), (plus.R, 330))
    plus.line((plus.C, 180), (plus.C, 480))

    mul = g("multiply", 260)
    mul.line((mul.L, 200), (mul.R, 460))
    mul.line((mul.L, 460), (mul.R, 200))

    pc = g("percent", 460)
    pc.ring(pc.L, 420, pc.L + 150, T, r=R * 0.75)
    pc.ring(pc.R - 150, B, pc.R, 280, r=R * 0.75)
    pc.line((pc.L + 20, B - 20), (pc.R - 20, T + 20), r=R * 0.8)

    amp = g("ampersand", 330)
    amp.path(se(amp.L + 30, 380, amp.R - 90, T + OS, -60, 250)
             + smooth([(amp.L + 60, 400), (amp.L, 200), (amp.C - 20, B), (amp.R, 300)], 120)[1:])
    amp.line((amp.C - 40, 330), (amp.R + 10, B))
    return D


CMAP = {
    # Cyrillic capitals and their lowercase forms
    "А": "A", "Б": "Be", "В": "Ve", "Г": "Ge", "Д": "De", "Е": "Ie", "Ё": "Io", "Ж": "Zhe", "З": "Ze",
    "И": "I", "Й": "Ishort", "К": "Ka", "Л": "El", "М": "Em", "Н": "En", "О": "O", "П": "Pe", "Р": "Er",
    "С": "Es", "Т": "Te", "У": "U", "Ф": "Ef", "Х": "Ha", "Ц": "Tse", "Ч": "Che", "Ш": "Sha", "Щ": "Shcha",
    "Ъ": "Hard", "Ы": "Yeru", "Ь": "Soft", "Э": "E", "Ю": "Yu", "Я": "Ya",
    "Ғ": "Ghe", "Ӣ": "Imacron", "Қ": "Qa", "Ӯ": "Umacron", "Ҳ": "Hha", "Ҷ": "Jhe",
    # Latin
    "A": "A", "B": "Ve", "C": "Es", "D": "D", "E": "Ie", "F": "F", "G": "G", "H": "En", "I": "Ilatin",
    "J": "J", "K": "Ka", "L": "Llatin", "M": "Em", "N": "N", "O": "O", "P": "Er", "Q": "Q", "R": "Rlatin",
    "S": "S", "T": "Te", "U": "Ulatin", "V": "V", "W": "W", "X": "Ha", "Y": "Ylatin", "Z": "Zlatin",
    # Digits and punctuation
    "0": "zero", "1": "one", "2": "two", "3": "three", "4": "four", "5": "five", "6": "six", "7": "seven",
    "8": "eight", "9": "nine", " ": "space", " ": "space", ".": "period", ",": "comma", ":": "colon",
    ";": "semicolon", "-": "hyphen", "‐": "hyphen", "–": "endash", "—": "emdash",
    "«": "guillemotleft", "»": "guillemotright", '"': "quotedbl", "'": "quotesingle", "“": "quotedblleft",
    "”": "quotedblright", "„": "quotedblright", "’": "quoteright", "(": "parenleft",
    ")": "parenright", "!": "exclam", "?": "question", "/": "slash", "№": "numero", "·": "periodcentered",
    "+": "plus", "×": "multiply", "%": "percent", "&": "ampersand",
}


def to_glyph(geoms):
    pen = TTGlyphPen(None)
    shape = unary_union(geoms) if geoms else None
    if shape is not None and not shape.is_empty:
        polys = [shape] if shape.geom_type == "Polygon" else list(shape.geoms)
        for poly in polys:
            poly = orient(poly.simplify(0.6, preserve_topology=True), sign=-1.0)
            for ring in [poly.exterior] + list(poly.interiors):
                pts = []
                for x, y in list(ring.coords)[:-1]:
                    q = (round(x), round(y))
                    if not pts or pts[-1] != q:
                        pts.append(q)
                if len(pts) > 1 and pts[0] == pts[-1]:
                    pts.pop()
                if len(pts) < 3:
                    continue
                pen.moveTo(pts[0])
                for q in pts[1:]:
                    pen.lineTo(q)
                pen.closePath()
    return pen.glyph()


def build(out_dir):
    os.makedirs(out_dir, exist_ok=True)
    D = glyphs()
    order = [".notdef"] + list(D.keys())
    glyf = {".notdef": to_glyph([Polygon([(60, 0), (60, 700), (440, 700), (440, 0)]).exterior.buffer(30)])}
    metrics = {".notdef": (500, 30)}
    for name, gl in D.items():
        glyf[name] = to_glyph(gl.parts)
        bounds = unary_union(gl.parts).bounds if gl.parts else (0, 0, 0, 0)
        metrics[name] = (gl.advance, round(bounds[0]) if gl.parts else 0)
    cmap = {}
    for ch, name in CMAP.items():
        cmap[ord(ch)] = name
        low = ch.lower()
        if low != ch and len(low) == 1:
            cmap[ord(low)] = name
    fb = FontBuilder(UPM, isTTF=True)
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap(cmap)
    fb.setupGlyf(glyf)
    fb.setupHorizontalMetrics(metrics)
    fb.setupHorizontalHeader(ascent=950, descent=-250)
    fb.setupNameTable({"familyName": "Khushbakhti Sign", "styleName": "Regular",
                       "uniqueFontIdentifier": "KhushbakhtiSign-Regular-1.0", "fullName": "Khushbakhti Sign",
                       "psName": "KhushbakhtiSign-Regular", "version": "Version 1.000",
                       "copyright": "© 2026 Хушбахти, Худжанд"})
    fb.setupOS2(sTypoAscender=950, sTypoDescender=-250, sTypoLineGap=0, usWinAscent=1000, usWinDescent=300,
                sxHeight=CAP, sCapHeight=CAP, usWeightClass=800, achVendID="KHSH", fsType=0)
    fb.setupPost()
    ttf = os.path.join(out_dir, "KhushbakhtiSign.ttf")
    fb.save(ttf)
    fb.font.flavor = "woff2"
    fb.font.save(os.path.join(out_dir, "KhushbakhtiSign.woff2"))
    return ttf


if __name__ == "__main__":
    print(build(sys.argv[1] if len(sys.argv) > 1 else "public/fonts"))
