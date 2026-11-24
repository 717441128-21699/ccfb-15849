import {
  add,
  angleBetween,
  clamp,
  dist,
  dot,
  len,
  normalize,
  scale,
  segmentsIntersect,
  sub,
  vec,
  type Vec2,
} from '../shared/vector';
import { Rng } from '../shared/rng';
import {
  DEFAULT_PARAMS,
  SHEEP_PHYSICS,
  TEMPERAMENTS,
} from '../shared/constants';
import type {
  CourseDef,
  DebugParams,
  DogState,
  SheepState,
  SimulationConfig,
  SimulationSnapshot,
  SimStats,
  TemperamentDef,
  WhistleCommand,
} from '../shared/types';
import {
  computeSheepSteer,
  integrateSheepVelocity,
  isStrayed,
  updatePressure,
  type FlockContext,
} from './sheep';
import { DogController } from './dog';
import { Scorer, type PhaseKey, type ScoreResult } from './scorer';

const SUBSTEPS = 2;
const STRAY_EVENT_SECONDS = 2;
const TRAIL_SECONDS = 1;
const LIFT_PRESSURE = 0.25;
const ROUGH_LIFT_PRESSURE = 0.55;
const GATE_CLOSE_MARGIN = 70;

interface TrailPoint {
  pos: Vec2;
  time: number;
}

export class Simulation {
  readonly course: CourseDef;
  readonly params: DebugParams;
  private readonly temperament: TemperamentDef;
  private readonly rng: Rng;
  private readonly scorer: Scorer;
  private readonly dog: DogController;
  private sheep: SheepState[] = [];
  private handler: Vec2;
  private tick = 0;
  private time = 0;
  private finished = false;
  private scoreResult: ScoreResult | null = null;
  private phase: PhaseKey = 'outrun';
  private closedGates = new Set<number>();
  private strayTimers = new Map<number, number>();
  private centroidTrail: TrailPoint[] = [];
  private outrunLogged = false;
  /** 推进轴：狗静止时保持固定的参考射线，狗移动后按新的狗-质心几何更新 */
  private railAxis: Vec2 = vec(1, 0);
  private railOrigin: Vec2 = vec(0, 0);

  constructor(private readonly config: SimulationConfig) {
    this.course = config.course;
    this.temperament = TEMPERAMENTS[config.temperament];
    this.params = { ...DEFAULT_PARAMS, ...config.overrides };
    this.rng = new Rng(config.seed);
    this.handler = { ...this.course.handler };
    this.dog = new DogController(this.handler, this.course, this.params);
    this.scorer = new Scorer(
      this.course.timeLimit,
      this.course.gates.length,
      config.sheepCount,
    );
    this.spawnSheep();
  }

  private spawnSheep(): void {
    const { center, radius } = this.course.hill;
    this.sheep = Array.from({ length: this.config.sheepCount }, (_, id) => {
      const ang = this.rng.range(0, Math.PI * 2);
      const r = Math.sqrt(this.rng.next()) * radius * 0.7;
      const pos = add(center, vec(Math.cos(ang) * r, Math.sin(ang) * r));
      return {
        id,
        pos,
        vel: vec(),
        pressure: 0,
        variation: {
          flee: clamp(this.rng.gaussian(1, 0.14), 0.65, 1.4),
          cohesion: clamp(this.rng.gaussian(1, 0.12), 0.7, 1.35),
          noise: clamp(this.rng.gaussian(1, 0.2), 0.55, 1.6),
          speed: clamp(
            this.rng.gaussian(this.temperament.speedFactor, 0.1),
            0.65,
            1.45,
          ),
          stray: clamp(this.rng.gaussian(1, 0.18), 0.6, 1.5),
        },
        stray: false,
        gatesPassed: [],
        penned: false,
      } satisfies SheepState;
    });
  }

  get dogState(): DogState {
    return this.dog.state;
  }

  get sheepState(): SheepState[] {
    return this.sheep;
  }

  get currentPhase(): PhaseKey {
    return this.phase;
  }

  whistle(command: WhistleCommand): void {
    if (this.finished) return;
    this.dog.whistle(command);
  }

  updateParams(patch: Partial<DebugParams>): void {
    Object.assign(this.params, patch);
    this.dog.setParams(this.params);
  }

  reset(): void {
    this.tick = 0;
    this.time = 0;
    this.finished = false;
    this.scoreResult = null;
    this.phase = 'outrun';
    this.closedGates.clear();
    this.strayTimers.clear();
    this.centroidTrail = [];
    this.outrunLogged = false;
    this.railAxis = vec(1, 0);
    this.railOrigin = vec(0, 0);
    // 重新播种 RNG，保证重开得到与首次完全一致的羊群
    this.rng.reseed(this.config.seed);
    this.spawnSheep();
    this.dog.state.pos = { ...this.handler };
    this.dog.state.vel = vec();
    this.dog.state.heading = 0;
    this.dog.state.command = 'lie-down';
    this.dog.state.target = null;
  }

  /** 推进一帧（frameDt 秒，内部拆成固定子步） */
  step(frameDt: number): SimulationSnapshot {
    if (this.finished) return this.snapshot();
    const h = frameDt / SUBSTEPS;
    for (let i = 0; i < SUBSTEPS; i++) this.substep(h);
    this.tick++;
    if (!this.finished && this.time >= this.course.timeLimit) {
      this.finishRun();
    }
    return this.snapshot();
  }

  private substep(dt: number): void {
    this.time += dt;
    const centroid = this.centroid();
    const dogBefore = { ...this.dog.state.pos };
    this.dog.step(dt, centroid, this.handler);
    // 狗移动超过 6px 才更新推进轴，避免原地抖动导致轴乱转；
    // 狗静止（lie-down / 站立施压）时轴固定，质心被约束走直线
    if (
      this.time < dt * 2 ||
      dist(this.dog.state.pos, dogBefore) > 6 ||
      dist(this.dog.state.pos, this.railOrigin) > 200
    ) {
      this.railOrigin = { ...this.dog.state.pos };
      this.railAxis = normalize(sub(centroid, this.dog.state.pos));
    }

    const flock = this.flockContext();
    const flockPressure =
      this.sheep.reduce((sum, s) => sum + s.pressure, 0) / this.sheep.length;
    // 群体共享逃逸方向：质心远离狗的方向
    const flockFleeDir = normalize(
      sub(flock.centroid, this.dog.state.pos),
    );
    for (const s of this.sheep) {
      if (s.penned) {
        // 圈内的羊只做轻度随机溜达
        s.vel = scale(s.vel, Math.exp(-2 * dt));
        this.constrainInsidePen(s, dt);
        continue;
      }
      updatePressure(s, this.dog.state.pos, this.params, this.temperament, dt);
      const neighbors = this.sheep.filter(
        (n) =>
          n.id !== s.id &&
          !n.penned &&
          dist(n.pos, s.pos) < SHEEP_PHYSICS.neighborRadius,
      );
      const { desired } = computeSheepSteer({
        self: s,
        dogPos: this.dog.state.pos,
        flock,
        neighbors,
        params: this.params,
        temperament: this.temperament,
        course: this.course,
        dt,
        rng: this.rng,
        flockFleeDir,
        flockPressure,
      });
      const prev = { ...s.pos };
      s.vel = integrateSheepVelocity(s, desired, this.temperament, dt);
      s.pos = add(s.pos, scale(s.vel, dt));
      this.clampToField(s);
      this.detectGateCrossing(s, prev);
      this.detectPen(s, prev);
    }

    this.updateStrayTimers(dt, flock);
    this.correctCentroidRail(dt);
    this.updatePhaseAndFaults(dt);
    this.recordTrail();
  }

  /**
   * 质心轨道约束（引擎层，局部力无法修正质心漂移，只能整体校正）：
   * 把质心相对「狗→质心」推进轴的横向偏移，按弹簧拉回轴上，
   * 偏移均摊给每只羊，队形保持不变。狗静止时轴固定 → 质心走直线；
   * 狗绕到侧面时轴旋转 → 羊群跟着转向。低压（吃草）时校正很弱。
   */
  private correctCentroidRail(dt: number): void {
    const active = this.sheep.filter((s) => !s.penned);
    if (active.length === 0) return;
    const c = this.centroid();
    // 相对固定推进轴（railOrigin + railAxis）测量横向偏移
    const rel = sub(c, this.railOrigin);
    const lateral = sub(rel, scale(this.railAxis, dot(rel, this.railAxis)));
    const lateralMag = len(lateral);
    if (lateralMag < 0.5) return;
    const avgPressure =
      this.sheep.reduce((sum, s) => sum + s.pressure, 0) / this.sheep.length;
    // 每帧把横向偏移收敛掉 (1-exp(-k·dt)) 比例；压力越强收敛越快，吃草时很弱
    const stiffness = 1.2 + avgPressure * 4.5;
    const ratio = 1 - Math.exp(-stiffness * dt);
    const correction = scale(normalize(lateral), -lateralMag * ratio);
    // 只约束未脱群的羊：脱群者本来就该脱离队列乱跑，不能被轨道拉回来
    for (const s of active) {
      if (!s.stray) s.pos = add(s.pos, correction);
    }
  }

  // ---------------- 群体统计 ----------------

  centroid(): Vec2 {
    const active = this.sheep.filter((s) => !s.penned);
    const pool = active.length > 0 ? active : this.sheep;
    const sum = pool.reduce((acc, s) => add(acc, s.pos), vec());
    return scale(sum, 1 / pool.length);
  }

  private flockContext(): FlockContext {
    const active = this.sheep.filter((s) => !s.penned);
    const centroid = this.centroid();
    // 平均速度（保留模长，供漂移修正判断群体是否在移动）
    const avgVel =
      active.length > 0
        ? scale(
            active.reduce((acc, s) => add(acc, s.vel), vec()),
            1 / active.length,
          )
        : vec();
    const avgHeading = normalize(avgVel);
    // 平均邻距
    let total = 0;
    let pairs = 0;
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        total += dist(active[i].pos, active[j].pos);
        pairs++;
      }
    }
    const avgNeighborDist = pairs > 0 ? total / pairs : 40;
    // 头羊：在平均前进方向上最靠前的一只
    let leaderId = active[0]?.id ?? 0;
    let bestProj = -Infinity;
    for (const s of active) {
      const proj = dot(sub(s.pos, centroid), avgHeading);
      if (proj > bestProj) {
        bestProj = proj;
        leaderId = s.id;
      }
    }
    return { centroid, avgHeading, avgNeighborDist, leaderId };
  }

  private recordTrail(): void {
    this.centroidTrail.push({ pos: this.centroid(), time: this.time });
    const cutoff = this.time - TRAIL_SECONDS;
    while (
      this.centroidTrail.length > 2 &&
      this.centroidTrail[0].time < cutoff
    ) {
      this.centroidTrail.shift();
    }
  }

  // ---------------- 门与圈 ----------------

  private detectGateCrossing(s: SheepState, prev: Vec2): void {
    for (const gate of this.course.gates) {
      if (s.gatesPassed.includes(gate.id)) continue;
      if (!segmentsIntersect(prev, s.pos, gate.a, gate.b)) continue;
      // 方向校验：来向侧的 approach 点应与 prev 在门线同侧，新位置在另一侧
      const side = (p: Vec2) =>
        (gate.b.x - gate.a.x) * (p.y - gate.a.y) -
        (gate.b.y - gate.a.y) * (p.x - gate.a.x);
      if (side(prev) * side(gate.approach) < 0) {
        // 从反方向穿门 = 门序错误
        this.scorer.logWrongGateOrder(this.time, gate.id);
        continue;
      }
      s.gatesPassed.push(gate.id);
    }
  }

  /** 质心越过门线 GATE_CLOSE_MARGIN 后关门，统计漏羊 */
  private closePassedGates(): void {
    const centroid = this.centroid();
    for (const gate of this.course.gates) {
      if (this.closedGates.has(gate.id)) continue;
      const lineDir = normalize(sub(gate.b, gate.a));
      const normal = vec(-lineDir.y, lineDir.x);
      // 保证 normal 指向前进方向（approach 的反侧）
      if (dot(normal, sub(gate.approach, gate.a)) > 0) {
        normal.x = -normal.x;
        normal.y = -normal.y;
      }
      const beyond = dot(sub(centroid, gate.a), normal);
      if (beyond > GATE_CLOSE_MARGIN) {
        this.closedGates.add(gate.id);
        const missing = this.sheep.filter(
          (s) => !s.gatesPassed.includes(gate.id),
        ).length;
        this.scorer.closeGate(this.time, gate.id, missing);
      }
    }
  }

  private detectPen(s: SheepState, prev: Vec2): void {
    const pen = this.course.pen;
    const inside = dist(s.pos, pen.center) < pen.radius - 6;
    if (!s.penned && inside) {
      // 必须从缺口方向进入
      const ang = Math.atan2(
        s.pos.y - pen.center.y,
        s.pos.x - pen.center.x,
      );
      let diff = Math.abs(ang - pen.openingAngle);
      while (diff > Math.PI) diff = Math.abs(diff - 2 * Math.PI);
      if (diff < pen.opening / (2 * pen.radius) + 0.35) {
        s.penned = true;
      }
    } else if (s.penned && !inside) {
      // 已入圈又跑到圈外 = 逃圈（墙的软约束正常能挡住）
      s.penned = false;
      this.scorer.addPenEscape(this.time, s.id);
      void prev;
    }
  }

  private constrainInsidePen(s: SheepState, dt: number): void {
    const pen = this.course.pen;
    const d = dist(s.pos, pen.center);
    const maxR = pen.radius - 10;
    if (d > maxR) {
      const ang = Math.atan2(
        s.pos.y - pen.center.y,
        s.pos.x - pen.center.x,
      );
      let diffToOpening = Math.abs(ang - pen.openingAngle);
      while (diffToOpening > Math.PI)
        diffToOpening = Math.abs(diffToOpening - 2 * Math.PI);
      if (diffToOpening > pen.opening / (2 * pen.radius)) {
        s.pos = add(
          pen.center,
          scale(normalize(sub(s.pos, pen.center)), maxR),
        );
      }
    }
    // 圈内慢速随机漂移，避免完全静止显得僵硬
    if (len(s.vel) < 2) {
      s.vel = vec(
        this.rng.range(-8, 8),
        this.rng.range(-8, 8),
      );
    }
    s.pos = add(s.pos, scale(s.vel, dt));
  }

  private clampToField(s: SheepState): void {
    const m = 10;
    s.pos.x = clamp(s.pos.x, m, this.course.width - m);
    s.pos.y = clamp(s.pos.y, m, this.course.height - m);
  }

  // ---------------- 脱群与失误 ----------------

  private updateStrayTimers(dt: number, flock: FlockContext): void {
    const flockPressure =
      this.sheep.reduce((sum, s) => sum + s.pressure, 0) / this.sheep.length;
    for (const s of this.sheep) {
      if (s.penned) {
        s.stray = false;
        this.strayTimers.delete(s.id);
        continue;
      }
      s.stray = isStrayed(
        s,
        flock,
        this.params,
        this.temperament,
        flockPressure,
      );
      const t = (this.strayTimers.get(s.id) ?? 0) + (s.stray ? dt : 0);
      if (!s.stray) this.strayTimers.delete(s.id);
      else this.strayTimers.set(s.id, t);
      if (t >= STRAY_EVENT_SECONDS) {
        this.scorer.addStrayEvent(this.time, s.id);
        this.strayTimers.set(s.id, t - STRAY_EVENT_SECONDS);
      }
    }
  }

  private updatePhaseAndFaults(dt: number): void {
    const avgPressure =
      this.sheep.reduce((sum, s) => sum + s.pressure, 0) / this.sheep.length;

    // Outrun：狗第一次把平均压力推过 LIFT_PRESSURE 前，考核围跑弧线
    if (this.phase === 'outrun') {
      this.evaluateOutrunPath();
      if (avgPressure >= LIFT_PRESSURE) {
        this.phase = 'lift';
        if (avgPressure >= ROUGH_LIFT_PRESSURE) {
          this.scorer.markRoughLift(this.time, avgPressure);
        }
      }
    } else if (this.phase === 'lift') {
      // 第一只羊过第一道门后进入 Fetch
      const firstGate = this.course.gates[0];
      if (
        firstGate &&
        this.sheep.some((s) => s.gatesPassed.includes(firstGate.id))
      ) {
        this.phase = 'fetch';
      }
    } else if (this.phase === 'fetch') {
      this.closePassedGates();
      const fetchGateCount = Math.ceil(this.course.gates.length / 2);
      const lastFetchGate = this.course.gates[fetchGateCount - 1];
      if (lastFetchGate && this.closedGates.has(lastFetchGate.id)) {
        this.phase = 'drive';
      }
    } else if (this.phase === 'drive') {
      this.closePassedGates();
    }

    if (
      (this.phase === 'fetch' || this.phase === 'drive') &&
      this.sheep.every((s) => s.penned)
    ) {
      this.phase = 'pen';
    }

    // 贴脸压迫
    if (avgPressure > 0.9) this.scorer.addOverflank(this.time, dt);
    // 贴边
    const m = SHEEP_PHYSICS.wallMargin + 6;
    const onEdge = this.sheep.some(
      (s) =>
        !s.penned &&
        (s.pos.x < m ||
          s.pos.x > this.course.width - m ||
          s.pos.y < m ||
          s.pos.y > this.course.height - m),
    );
    if (onEdge) this.scorer.addBoundary(this.time, dt);

    if (this.sheep.every((s) => s.penned)) this.finishRun();
  }

  /**
   * Outrun 弧线考核：理想围跑是狗从 handler 出发、
   * 在远离羊群（>120px）的弧线上绕到羊群正后方（与 handler-羊群连线夹角 <25°）。
   * 围跑期间狗若进入羊群 120px 内，按超出距离累计偏差。
   */
  private evaluateOutrunPath(): void {
    if (this.outrunLogged) return;
    const centroid = this.centroid();
    const d = dist(this.dog.state.pos, centroid);
    const ideal = 190;
    if (d < ideal - 70) {
      this.scorer.sampleOutrunDeviation(this.time, ideal - 70 - d);
    }
    // 到达羊群后方即结束本环节采样
    const behind = normalize(sub(centroid, this.handler));
    const dogDir = normalize(sub(this.dog.state.pos, centroid));
    if (
      d < ideal + 40 &&
      angleBetween(behind, scale(dogDir, -1)) < (25 * Math.PI) / 180
    ) {
      this.outrunLogged = true;
    }
  }

  private finishRun(): void {
    if (this.finished) return;
    this.finished = true;
    const penned = this.sheep.filter((s) => s.penned).length;
    const gatesCleared = this.course.gates.filter((g) =>
      this.closedGates.has(g.id),
    ).length;
    this.scoreResult = this.scorer.finish(
      this.time,
      penned === this.sheep.length,
      penned,
      gatesCleared,
    );
  }

  get result(): ScoreResult | null {
    return this.scoreResult;
  }

  // ---------------- 快照 ----------------

  private stats(): SimStats {
    const flock = this.flockContext();
    const pressures = this.sheep.map((s) => s.pressure);
    const avgPressure =
      pressures.reduce((a, b) => a + b, 0) / pressures.length;
    const strayCount = this.sheep.filter((s) => s.stray).length;
    const pennedCount = this.sheep.filter((s) => s.penned).length;
    const avgSpeed =
      this.sheep.reduce((sum, s) => sum + len(s.vel), 0) / this.sheep.length;

    const gateProgress = this.course.gates.map((g) => ({
      gateId: g.id,
      passed: this.sheep.filter((s) => s.gatesPassed.includes(g.id)).length,
      total: this.sheep.length,
    }));
    const gatesCleared = this.closedGates.size;

    // 近 1s 质心位移方向 vs 狗->质心方向的夹角
    let driveAngleDeg: number | null = null;
    const first = this.centroidTrail[0];
    const last = this.centroidTrail[this.centroidTrail.length - 1];
    if (first && last) {
      const moveDir = sub(last.pos, first.pos);
      if (len(moveDir) > 6) {
        const pushDir = normalize(sub(flock.centroid, this.dog.state.pos));
        driveAngleDeg =
          (angleBetween(pushDir, normalize(moveDir)) * 180) / Math.PI;
      }
    }

    return {
      centroid: flock.centroid,
      avgPressure,
      maxPressure: Math.max(...pressures),
      strayCount,
      avgSpeed,
      gatesCleared,
      pennedCount,
      gateProgress,
      driveAngleDeg,
    };
  }

  snapshot(): SimulationSnapshot {
    return {
      tick: this.tick,
      time: this.time,
      // 结构化拷贝，避免 Worker 内外共享可变引用
      sheep: this.sheep.map((s) => ({
        ...s,
        pos: { ...s.pos },
        vel: { ...s.vel },
        gatesPassed: [...s.gatesPassed],
        variation: { ...s.variation },
      })),
      dog: {
        ...this.dog.state,
        pos: { ...this.dog.state.pos },
        vel: { ...this.dog.state.vel },
      },
      handler: { ...this.handler },
      stats: this.stats(),
      finished: this.finished,
    };
  }
}
