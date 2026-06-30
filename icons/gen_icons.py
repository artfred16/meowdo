#!/usr/bin/env python3
"""Generate Meowdo extension icons — a checklist with cat ears + tail, on a blue gradient
tile (no external deps).

The mark fuses the two ideas the brand needs:
  * CAT  — pointy ears on top and a curling tail on the side (a cat "wearing" the list);
           distinct from the sibling Catsnip mark, which is a cat *face*.
  * TODO — a checklist below the ears: a checked row (filled tick) and an open row
           (outline box, shorter faint line) — the "what's left" cue.

It is size-adaptive. At toolbar size (16px) the list + tail would smear into a blob, so it
collapses to a bold white checkmark wearing two little ears — the clearest cat+done cue at
that size. make() supersamples for smooth edges."""
import struct, zlib, os

BLUE    = (37, 99, 235)    # #2563EB  background top (royal blue)
BLUE_DK = (30, 64, 175)    # #1E40AF  background bottom
WHITE   = (255, 255, 255)  # ears, tail, checked box + tick, the "done" line
FAINT   = (191, 211, 248)  # #BFD3F8  inner ear + the remaining (unchecked) task line


def rounded(x, y, n, r):
    """Inside a rounded square of side n, corner radius r?"""
    if x < r and y < r:                 return (x - r) ** 2 + (y - r) ** 2 <= r * r
    if x > n - 1 - r and y < r:         return (x - (n - 1 - r)) ** 2 + (y - r) ** 2 <= r * r
    if x < r and y > n - 1 - r:         return (x - r) ** 2 + (y - (n - 1 - r)) ** 2 <= r * r
    if x > n - 1 - r and y > n - 1 - r: return (x - (n - 1 - r)) ** 2 + (y - (n - 1 - r)) ** 2 <= r * r
    return True


def seg_dist(px, py, ax, ay, bx, by):
    """Distance from point (px,py) to the segment a-b (all normalized 0..1)."""
    vx, vy = bx - ax, by - ay
    wx, wy = px - ax, py - ay
    L = vx * vx + vy * vy
    t = 0.0 if L == 0 else max(0.0, min(1.0, (wx * vx + wy * vy) / L))
    dx, dy = ax + t * vx - px, ay + t * vy - py
    return (dx * dx + dy * dy) ** 0.5


def in_tri(px, py, ax, ay, bx, by, cx, cy):
    """Is point (px,py) inside triangle a,b,c (barycentric sign test)?"""
    d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by)
    d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy)
    d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay)
    neg = (d1 < 0) or (d2 < 0) or (d3 < 0)
    pos = (d1 > 0) or (d2 > 0) or (d3 > 0)
    return not (neg and pos)


def tick(nx, ny, cx, cy, s, th):
    """A checkmark centered at (cx,cy), scaled by s, stroke half-width th."""
    a = (cx - 0.34 * s, cy + 0.02 * s)
    b = (cx - 0.08 * s, cy + 0.26 * s)
    c = (cx + 0.40 * s, cy - 0.30 * s)
    return (seg_dist(nx, ny, a[0], a[1], b[0], b[1]) <= th or
            seg_dist(nx, ny, b[0], b[1], c[0], c[1]) <= th)


def polyline(nx, ny, pts, th):
    """White if (nx,ny) is within th of the polyline through pts."""
    for i in range(len(pts) - 1):
        if seg_dist(nx, ny, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]) <= th:
            return True
    return False


def icon_pixel(nx, ny, tiny=False):
    """Return (r,g,b) for normalized coords (0–1), or None for the background."""
    if tiny:
        # Bold checkmark wearing two little ears (close together, like one head).
        if (in_tri(nx, ny, 0.40, 0.08, 0.27, 0.37, 0.53, 0.34) or
                in_tri(nx, ny, 0.60, 0.08, 0.73, 0.37, 0.47, 0.34)):
            return WHITE
        return WHITE if tick(nx, ny, 0.5, 0.66, 1.0, 0.095) else None

    # --- Cat ears, close together at center-top (a pair, with a lighter inner ear). ---
    if in_tri(nx, ny, 0.39, 0.06, 0.27, 0.31, 0.505, 0.275) or in_tri(nx, ny, 0.61, 0.06, 0.73, 0.31, 0.495, 0.275):
        if in_tri(nx, ny, 0.392, 0.135, 0.318, 0.285, 0.487, 0.262) or in_tri(nx, ny, 0.608, 0.135, 0.682, 0.285, 0.513, 0.262):
            return FAINT
        return WHITE

    # --- Curling tail: rises up the right edge and hooks at the tip (a cat tail). ---
    if polyline(nx, ny, [(0.70, 0.93), (0.84, 0.905), (0.905, 0.80), (0.875, 0.69), (0.80, 0.655)], 0.031):
        return WHITE

    # --- Checklist: a checked row and an open row. ---
    rows = (0.55, 0.79)
    bx0, bx1 = 0.14, 0.29
    bh = 0.075
    border = 0.022
    for i, cy in enumerate(rows):
        checked = (i == 0)
        in_box = bx0 <= nx <= bx1 and (cy - bh) <= ny <= (cy + bh)
        if in_box:
            edge = min(nx - bx0, bx1 - nx, ny - (cy - bh), (cy + bh) - ny)
            if edge < border:
                return WHITE
            if checked and tick(nx, ny, (bx0 + bx1) / 2, cy, 0.17, 0.022):
                return WHITE
            return None
        x_end = 0.77 if checked else 0.55
        if 0.37 <= nx <= x_end and abs(ny - cy) <= 0.040:
            return WHITE if checked else FAINT

    return None


def make(n):
    r = n * 0.22
    tiny = n <= 20
    ss = 4 if n <= 48 else 2            # more sub-pixels at small sizes for smooth edges
    inv = 1.0 / (ss * ss)
    buf = bytearray()
    for y in range(n):
        buf.append(0)                  # PNG row filter
        for x in range(n):
            if not rounded(x, y, n, r):
                buf += bytes((0, 0, 0, 0))
                continue
            t = y / max(1, n - 1)
            bg = tuple(int(BLUE[i] + (BLUE_DK[i] - BLUE[i]) * t) for i in range(3))
            ar = ag = ab = 0.0
            for sy in range(ss):
                for sx in range(ss):
                    nxp = (x + (sx + 0.5) / ss) / n
                    nyp = (y + (sy + 0.5) / ss) / n
                    px = icon_pixel(nxp, nyp, tiny) or bg
                    ar += px[0]; ag += px[1]; ab += px[2]
            buf += bytes((int(ar * inv + 0.5), int(ag * inv + 0.5), int(ab * inv + 0.5), 255))
    return png(n, n, bytes(buf))


def png(w, h, raw):
    def chunk(typ, data):
        return struct.pack(">I", len(data)) + typ + data + struct.pack(">I", zlib.crc32(typ + data) & 0xffffffff)
    return (b"\x89PNG\r\n\x1a\n"
            + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw, 9))
            + chunk(b"IEND", b""))


here = os.path.dirname(os.path.abspath(__file__))
for size in (16, 32, 48, 128):
    with open(os.path.join(here, f"icon{size}.png"), "wb") as f:
        f.write(make(size))
    print(f"wrote icon{size}.png")
