export interface Vec2 {
  x: number;
  y: number;
}

export const vec = (x = 0, y = 0): Vec2 => ({ x, y });

export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });

export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });

export const scale = (a: Vec2, s: number): Vec2 => ({ x: a.x * s, y: a.y * s });

export const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;

export const cross = (a: Vec2, b: Vec2): number => a.x * b.y - a.y * b.x;

export const len = (a: Vec2): number => Math.hypot(a.x, a.y);

export const lenSq = (a: Vec2): number => a.x * a.x + a.y * a.y;

export const dist = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);

export const distSq = (a: Vec2, b: Vec2): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
};

export const normalize = (a: Vec2): Vec2 => {
  const l = Math.hypot(a.x, a.y);
  return l < 1e-9 ? { x: 0, y: 0 } : { x: a.x / l, y: a.y / l };
};

export const setLen = (a: Vec2, s: number): Vec2 => scale(normalize(a), s);

export const limit = (a: Vec2, max: number): Vec2 => {
  const l = Math.hypot(a.x, a.y);
  return l > max && l > 1e-9 ? { x: (a.x / l) * max, y: (a.y / l) * max } : a;
};

export const perp = (a: Vec2): Vec2 => ({ x: -a.y, y: a.x });

/** 角度（弧度）对应的单位向量 */
export const fromAngle = (rad: number): Vec2 => ({ x: Math.cos(rad), y: Math.sin(rad) });

export const angleOf = (a: Vec2): number => Math.atan2(a.y, a.x);

/** 两向量夹角（弧度，0..PI） */
export const angleBetween = (a: Vec2, b: Vec2): number => {
  const na = normalize(a);
  const nb = normalize(b);
  const c = Math.min(1, Math.max(-1, dot(na, nb)));
  return Math.acos(c);
};

export const clamp = (v: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, v));

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** 把 v 从 [inLo,inHi] 映射到 [outLo,outHi]，并截断 */
export const remap = (
  v: number,
  inLo: number,
  inHi: number,
  outLo: number,
  outHi: number,
): number => {
  const t = clamp((v - inLo) / (inHi - inLo), 0, 1);
  return lerp(outLo, outHi, t);
};

/** 求线段 ab 上离 p 最近的点 */
export const closestPointOnSegment = (p: Vec2, a: Vec2, b: Vec2): Vec2 => {
  const ab = sub(b, a);
  const t = clamp(dot(sub(p, a), ab) / Math.max(1e-9, lenSq(ab)), 0, 1);
  return add(a, scale(ab, t));
};

/** 二维线段相交判定（含端点） */
export const segmentsIntersect = (
  p1: Vec2,
  p2: Vec2,
  p3: Vec2,
  p4: Vec2,
): boolean => {
  const d1 = cross(sub(p4, p3), sub(p1, p3));
  const d2 = cross(sub(p4, p3), sub(p2, p3));
  const d3 = cross(sub(p2, p1), sub(p3, p1));
  const d4 = cross(sub(p2, p1), sub(p4, p1));
  return (
    ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  );
};
