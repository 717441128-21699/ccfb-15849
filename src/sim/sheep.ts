import {
  add,
  angleBetween,
  clamp,
  dist,
  fromAngle,
  len,
  limit,
  normalize,
  scale,
  sub,
  vec,
  type Vec2,
} from '../shared/vector';
import { SHEEP_PHYSICS } from '../shared/constants';
import type {
  CourseDef,
  DebugParams,
  SheepState,
  TemperamentDef,
} from '../shared/types';

import { Rng } from '../shared/rng';

export interface FlockContext {
  centroid: Vec2;
  /** 平均速度（含模长，归一化后即平均朝向） */
  avgHeading: Vec2;
  avgNeighborDist: number;
  leaderId: number;
}

export interface SheepSteerInput {
  self: SheepState;
  dogPos: Vec2;
  flock: FlockContext;
  neighbors: SheepState[];
  params: DebugParams;
  temperament: TemperamentDef;
  course: CourseDef;
  dt: number;
  rng: Rng;
  /** 群体共享逃逸方向（质心->远离狗），保证压力下整队同向撤离 */
  flockFleeDir: Vec2;
  /** 群体平均压力，用于恐慌传染与炸群 */
  flockPressure: number;
}

const clampForce = (v: Vec2): Vec2 => limit(v, 1);

/** 墙的软排斥力 */
const wallForce = (pos: Vec2, course: CourseDef): Vec2 => {
  const m = SHEEP_PHYSICS.wallMargin;
  let f = vec();
  if (pos.x < m) f.x += (m - pos.x) / m;
  if (pos.x > course.width - m) f.x -= (pos.x - (course.width - m)) / m;
  if (pos.y < m) f.y += (m - pos.y) / m;
  if (pos.y > course.height - m) f.y -= (pos.y - (course.height - m)) / m;
  return scale(f, 1.6);
};

/** 圆形障碍的切向+排斥力 */
const obstacleForce = (pos: Vec2, course: CourseDef): Vec2 => {
  let f = vec();
  for (const ob of course.obstacles) {
    const d = dist(pos, ob.center);
    const reach = ob.radius + 34;
    if (d < reach) {
      const away = normalize(sub(pos, ob.center));
      const strength = (reach - d) / reach;
      f = add(f, scale(away, strength * 1.8));
    }
  }
  return f;
};

/** 羊圈围墙（非缺口段）的排斥力 */
const penWallForce = (pos: Vec2, course: CourseDef): Vec2 => {
  const pen = course.pen;
  const d = dist(pos, pen.center);
  const wallBand = 26;
  if (Math.abs(d - pen.radius) > wallBand) return vec();
  // 在缺口张角内则无墙
  const ang = Math.atan2(pos.y - pen.center.y, pos.x - pen.center.x);
  let diff = Math.abs(ang - pen.openingAngle);
  while (diff > Math.PI) diff = Math.abs(diff - 2 * Math.PI);
  if (diff < pen.opening / (2 * pen.radius) + 0.12) return vec();
  const away = normalize(sub(pos, pen.center));
  const strength = 1 - Math.abs(d - pen.radius) / wallBand;
  return scale(away, strength * 1.5);
};

/** 草地吸引力：取最强的一块草，距离越近吸引越弱（到场后原地吃草） */
const grassForce = (pos: Vec2, course: CourseDef): Vec2 => {
  let best: { f: Vec2; weight: number } | null = null;
  for (const g of course.grass) {
    const d = dist(pos, g.center);
    if (d > g.radius * 2.2) continue;
    const dir = normalize(sub(g.center, pos));
    // 已经在草里时力很弱，表现为低头吃草
    const strength = clamp((d - g.radius * 0.4) / (g.radius * 1.8), 0.05, 1);
    const weight = g.strength * strength;
    if (!best || weight > best.weight) best = { f: dir, weight };
  }
  return best ? scale(best.f, best.weight) : vec();
};

/**
 * 单只羊一步的期望速度。
 * 四种倾向：逃避狗（压力驱动）、跟随同伴（抱团+对齐+头羊）、找草、个体噪声；
 * 压力越高，逃逸与抱团权重越大，吃草权重被压制。
 */
export function computeSheepSteer(input: SheepSteerInput): {
  desired: Vec2;
  terms: Record<string, Vec2>;
} {
  const { self, dogPos, flock, neighbors, params, temperament, course } = input;
  const terms: Record<string, Vec2> = {};

  // —— 1. 逃避狗：个体躲避 + 群体共享逃逸方向（整队沿狗-质心连线撤离） ——
  const toDog = sub(dogPos, self.pos);
  const fleeDir = normalize(scale(toDog, -1));
  const individualFlee = scale(
    fleeDir,
    self.pressure * params.fleeWeight * self.variation.flee * 0.35,
  );
  // 群体共享分量主导：整队沿质心-狗连线撤离，这是羊群被直推而不是径向炸散的关键
  const sharedFlee = scale(
    input.flockFleeDir,
    input.flockPressure * params.fleeWeight * 1.15,
  );
  const flee = add(individualFlee, sharedFlee);
  terms.flee = flee;

  // —— 2. 同伴抱团：朝局部质心 ——
  let cohesion = vec();
  let alignment = vec();
  let separation = vec();
  let localCenter = self.pos;
  if (neighbors.length > 0) {
    localCenter = scale(
      neighbors.reduce((acc, n) => add(acc, n.pos), vec()),
      1 / neighbors.length,
    );
    cohesion = scale(
      normalize(sub(localCenter, self.pos)),
      params.cohesionWeight * self.variation.cohesion,
    );
    alignment = scale(
      normalize(
        neighbors.reduce((acc, n) => add(acc, n.vel), vec()),
      ),
      params.alignWeight * temperament.alignWeight,
    );
    for (const n of neighbors) {
      const d = dist(self.pos, n.pos);
      if (d < SHEEP_PHYSICS.separationDist && d > 0.01) {
        separation = add(
          separation,
          scale(normalize(sub(self.pos, n.pos)), (SHEEP_PHYSICS.separationDist - d) / SHEEP_PHYSICS.separationDist),
        );
      }
    }
  }
  terms.cohesion = cohesion;
  terms.alignment = alignment;
  terms.separation = scale(separation, 1.4);

  // —— 3. 头羊传导：非头羊向头羊位置/速度靠拢，压力下更明显 ——
  let leader = vec();
  if (flock.leaderId !== self.id) {
    const leaderSheep = neighbors.find((n) => n.id === flock.leaderId);
    if (leaderSheep) {
      const toLeader = normalize(sub(leaderSheep.pos, self.pos));
      leader = scale(
        toLeader,
        params.leaderInfluence * (0.4 + self.pressure),
      );
    }
  }
  terms.leader = leader;

  // —— 4. 找草吃草：只要狗在施压（压力 >0.08）就迅速让位给逃逸 ——
  const grassSuppression = clamp(
    1 - Math.max(0, self.pressure - 0.06) * 4.5,
    0.04,
    1,
  );
  const grass = scale(
    grassForce(self.pos, course),
    params.grassWeight * temperament.grassWeight * grassSuppression,
  );
  terms.grass = grass;

  // —— 5. 环境约束 ——
  const walls = wallForce(self.pos, course);
  const obstacles = obstacleForce(self.pos, course);
  const penWall = penWallForce(self.pos, course);
  terms.walls = walls;
  terms.obstacles = obstacles;
  terms.penWall = penWall;

  // —— 6. 个体噪声（每只羊脾气不同，急羊噪声更大；高压下恐慌放大 = 炸群） ——
  // 高压时抱团力让位给恐慌，羊各自朝略不同的方向跑，队形被撕开
  const panicAmplifier = 1 + input.flockPressure * 3.2;
  const jitter = fromAngle(
    Math.atan2(self.vel.y, self.vel.x) +
      self.variation.noise *
        (input.rng.next() - 0.5) *
        2.4 *
        panicAmplifier,
  );
  const noise = scale(
    jitter,
    params.noise * self.variation.noise * (1 + input.flockPressure * 1.4),
  );
  terms.noise = noise;

  const desired = clampForce(
    [
      flee,
      cohesion,
      alignment,
      terms.separation,
      leader,
      grass,
      walls,
      obstacles,
      penWall,
      noise,
    ].reduce((acc, f) => add(acc, f), vec()),
  );

  return { desired, terms };
}

/** 压力更新：狗越近压力越大；远处压力按 calmFactor 指数衰减 */
export function updatePressure(
  self: SheepState,
  dogPos: Vec2,
  params: DebugParams,
  temperament: TemperamentDef,
  dt: number,
): void {
  const d = dist(self.pos, dogPos);
  let target = 0;
  if (d < params.fleeRadius) {
    const t = 1 - d / params.fleeRadius; // 0(远)..1(贴脸)
    target = clamp(t * t * params.fleeWeight * temperament.fleeWeight, 0, 1);
  }
  // 狗在远处时 target≈0，压力持续向 target 松弛；距离越远 target 越低，恢复越快完成
  const decay = params.pressureDecay * temperament.calmFactor;
  const k = target > self.pressure ? decay * 2.2 : decay;
  self.pressure += (target - self.pressure) * clamp(1 - Math.exp(-k * dt), 0, 1);
  self.pressure = clamp(self.pressure, 0, 1);
}

/** 脱群判定：
 *  1) 相对距离（平均邻距倍数）或绝对距离超出基础阈值；
 *  2) 恐慌脱群：高压下（≥0.7）只要显著偏离群体密度即算脱群，
 *     压力越高、阈值越窄，狗贴得越近炸散的羊越多。 */
export function isStrayed(
  self: SheepState,
  flock: FlockContext,
  params: DebugParams,
  temperament: TemperamentDef,
  flockPressure: number,
): boolean {
  const d = dist(self.pos, flock.centroid);
  const relativeThreshold =
    Math.max(46, flock.avgNeighborDist * params.strayRadius) *
    temperament.strayFactor;
  const panicShrink = Math.min(42, flockPressure * 60);
  const absoluteThreshold = 92 - panicShrink;
  if (
    d > relativeThreshold ||
    d > absoluteThreshold * temperament.strayFactor
  ) {
    return true;
  }
  // 恐慌脱群：高压下显著偏离群体密度即脱群（正常时要 2.4 倍平均邻距）
  if (self.pressure >= 0.7) {
    const panicThreshold = Math.max(
      24,
      flock.avgNeighborDist * 1.5 * (2 - temperament.strayFactor),
    );
    if (d > panicThreshold) return true;
  }
  return false;
}

/** 期望速度 -> 惯性积分后的新速度（羊也有惯性，不会瞬间转向） */
export function integrateSheepVelocity(
  self: SheepState,
  desired: Vec2,
  _temperament: TemperamentDef,
  dt: number,
): Vec2 {
  const pressureMoving =
    self.pressure > SHEEP_PHYSICS.pressureMoveThreshold;
  const speedCap =
    SHEEP_PHYSICS.maxSpeed *
    self.variation.speed *
    (pressureMoving ? 1 : 0.18); // 低压时只慢慢溜达/吃草
  const targetVel = scale(desired, speedCap);
  const k = clamp(
    1 - Math.exp(-SHEEP_PHYSICS.velocityMatch * dt),
    0,
    1,
  );
  const next = add(self.vel, scale(sub(targetVel, self.vel), k));
  const cap = SHEEP_PHYSICS.maxSpeed * self.variation.speed * 1.05;
  const limited = limit(next, cap);
  // 数值清理
  if (len(limited) < 0.5) return vec();
  return limited;
}

/** 调试页用：当前压力对质心推力的方向角（狗->质心反向的贴合度） */
export function flockDriveAngle(centroid: Vec2, dogPos: Vec2, moveDir: Vec2): number {
  const pushDir = normalize(sub(centroid, dogPos));
  return (angleBetween(pushDir, moveDir) * 180) / Math.PI;
}
