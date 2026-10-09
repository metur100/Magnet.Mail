/**
 * Circle-vs-shape collision tests. The parcel is a circle; obstacles are oriented boxes, circles or
 * capsules. All functions write into a caller-owned Contact to avoid allocations in the hot loop.
 */
export interface Contact {
  /** Normal pointing from the obstacle towards the parcel. */
  nx: number;
  ny: number;
  /** Penetration depth (> 0 when overlapping). */
  depth: number;
  /** Contact point on the obstacle surface. */
  px: number;
  py: number;
}

export function createContact(): Contact {
  return { nx: 0, ny: -1, depth: 0, px: 0, py: 0 };
}

/** Oriented box given by centre, half extents and rotation (cos/sin). */
export function circleVsBox(
  x: number,
  y: number,
  r: number,
  cx: number,
  cy: number,
  hw: number,
  hh: number,
  cos: number,
  sin: number,
  out: Contact,
): boolean {
  // Into box space.
  const dx = x - cx;
  const dy = y - cy;
  const lx = dx * cos + dy * sin;
  const ly = -dx * sin + dy * cos;
  if (Math.abs(lx) > hw + r || Math.abs(ly) > hh + r) return false;
  const qx = Math.max(-hw, Math.min(hw, lx));
  const qy = Math.max(-hh, Math.min(hh, ly));
  let nlx: number;
  let nly: number;
  let depth: number;
  if (qx === lx && qy === ly) {
    // Centre inside the box: push out through the nearest face.
    const px = hw - Math.abs(lx);
    const py = hh - Math.abs(ly);
    if (px < py) {
      nlx = lx >= 0 ? 1 : -1;
      nly = 0;
      depth = px + r;
    } else {
      nlx = 0;
      nly = ly >= 0 ? 1 : -1;
      depth = py + r;
    }
  } else {
    const ex = lx - qx;
    const ey = ly - qy;
    const d = Math.hypot(ex, ey);
    if (d >= r) return false;
    nlx = ex / d;
    nly = ey / d;
    depth = r - d;
  }
  out.nx = nlx * cos - nly * sin;
  out.ny = nlx * sin + nly * cos;
  out.depth = depth;
  out.px = cx + qx * cos - qy * sin;
  out.py = cy + qx * sin + qy * cos;
  return true;
}

export function circleVsCircle(x: number, y: number, r: number, cx: number, cy: number, cr: number, out: Contact): boolean {
  const dx = x - cx;
  const dy = y - cy;
  const d = Math.hypot(dx, dy);
  if (d >= r + cr) return false;
  if (d < 1e-6) {
    out.nx = 0;
    out.ny = -1;
  } else {
    out.nx = dx / d;
    out.ny = dy / d;
  }
  out.depth = r + cr - d;
  out.px = cx + out.nx * cr;
  out.py = cy + out.ny * cr;
  return true;
}

/** Capsule = segment A–B with radius cr (rotating bars). */
export function circleVsCapsule(x: number, y: number, r: number, ax: number, ay: number, bx: number, by: number, cr: number, out: Contact): boolean {
  const abx = bx - ax;
  const aby = by - ay;
  const len2 = abx * abx + aby * aby;
  let t = len2 > 0 ? ((x - ax) * abx + (y - ay) * aby) / len2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return circleVsCircle(x, y, r, ax + abx * t, ay + aby * t, cr, out);
}

export function pointInBox(x: number, y: number, cx: number, cy: number, hw: number, hh: number, cos: number, sin: number): boolean {
  const dx = x - cx;
  const dy = y - cy;
  const lx = dx * cos + dy * sin;
  const ly = -dx * sin + dy * cos;
  return Math.abs(lx) <= hw && Math.abs(ly) <= hh;
}

/** Does segment P→Q cross the oriented box? (Used for magnetic barriers blocking the field.) */
export function segmentHitsBox(
  px: number,
  py: number,
  qx: number,
  qy: number,
  cx: number,
  cy: number,
  hw: number,
  hh: number,
  cos: number,
  sin: number,
): boolean {
  const toLocal = (x: number, y: number): [number, number] => {
    const dx = x - cx;
    const dy = y - cy;
    return [dx * cos + dy * sin, -dx * sin + dy * cos];
  };
  const [ax, ay] = toLocal(px, py);
  const [bx, by] = toLocal(qx, qy);
  let t0 = 0;
  let t1 = 1;
  const dx = bx - ax;
  const dy = by - ay;
  const edges: [number, number][] = [
    [-dx, ax + hw],
    [dx, hw - ax],
    [-dy, ay + hh],
    [dy, hh - ay],
  ];
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }
    const r = q / p;
    if (p < 0) t0 = Math.max(t0, r);
    else t1 = Math.min(t1, r);
    if (t0 > t1) return false;
  }
  return true;
}
