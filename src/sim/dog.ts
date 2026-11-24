import {
  add,
  angleOf,
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
import { DOG_DEFAULTS } from '../shared/constants';
import type {
  CourseDef,
  DebugParams,
  DogState,
  WhistleCommand,
} from '../shared/types';

const ORBIT_RADIUS = 165; // 包抄时狗与羊群质心保持的距离
const WALK_ON_DIST = 105; // walk-on 时在羊群后方保持的压迫距离
const ARRIVE_EPS = 14;

/** 狗听口令后的运动控制：速度与惯性受限，转向有角速度上限 */
export class DogController {
  readonly state: DogState;

  constructor(
    start: Vec2,
    private readonly course: CourseDef,
    params: DebugParams,
  ) {
    this.state = {
      pos: { ...start },
      vel: vec(),
      command: 'lie-down',
      target: null,
      maxSpeed: params.dogMaxSpeed,
      accel: params.dogAccel,
      turnRate: params.dogTurnRate,
      heading: 0,
    };
  }

  setParams(params: DebugParams): void {
    this.state.maxSpeed = params.dogMaxSpeed;
    this.state.accel = params.dogAccel;
    this.state.turnRate = params.dogTurnRate;
  }

  whistle(command: WhistleCommand): void {
    this.state.command = command;
    if (command === 'lie-down') this.state.target = null;
  }

  /** 计算当前口令下的瞬时目标点 */
  private resolveTarget(centroid: Vec2, handler: Vec2): Vec2 | null {
    const s = this.state;
    switch (s.command) {
      case 'lie-down':
        return null;
      case 'recall':
        return handler;
      case 'walk-on': {
        // 沿狗->质心方向推进到 WALK_ON_DIST
        const dir = normalize(sub(centroid, s.pos));
        return add(centroid, scale(dir, -WALK_ON_DIST));
      }
      case 'come-by':
      case 'away-to-me': {
        // 绕羊群做圆周运动；已在半径内则先沿切线调整
        const d = Math.max(1, dist(s.pos, centroid));
        const radial = normalize(sub(s.pos, centroid));
        // 屏幕坐标 y 向下：顺时针（come-by 传统左绕包抄）取 +90°
        const sign = s.command === 'come-by' ? 1 : -1;
        const tangent = fromAngle(angleOf(radial) + sign * Math.PI * 0.5);
        const radialError = d - ORBIT_RADIUS;
        return add(s.pos, add(scale(tangent, 60), scale(radial, -radialError * 0.5)));
      }
      default:
        return null;
    }
  }

  /** 环境避让：障碍与羊圈墙（狗不能穿墙进圈） */
  private avoidance(pos: Vec2): Vec2 {
    let f = vec();
    for (const ob of this.course.obstacles) {
      const d = dist(pos, ob.center);
      const reach = ob.radius + 24;
      if (d < reach) {
        f = add(
          f,
          scale(normalize(sub(pos, ob.center)), ((reach - d) / reach) * 2),
        );
      }
    }
    const pen = this.course.pen;
    const pd = dist(pos, pen.center);
    if (Math.abs(pd - pen.radius) < 30) {
      const ang = Math.atan2(pos.y - pen.center.y, pos.x - pen.center.x);
      let diff = Math.abs(ang - pen.openingAngle);
      while (diff > Math.PI) diff = Math.abs(diff - 2 * Math.PI);
      if (diff >= pen.opening / (2 * pen.radius) + 0.1) {
        f = add(f, scale(normalize(sub(pos, pen.center)), 1.6));
      }
    }
    return f;
  }

  step(dt: number, centroid: Vec2, handler: Vec2): void {
    const s = this.state;
    const target = this.resolveTarget(centroid, handler);
    s.target = target;

    let desiredVel = vec();
    if (target) {
      const toTarget = sub(target, s.pos);
      const d = len(toTarget);
      if (d > ARRIVE_EPS || s.command === 'come-by' || s.command === 'away-to-me' || s.command === 'walk-on') {
        const dir = normalize(toTarget);
        const avoid = this.avoidance(s.pos);
        const steer = normalize(add(dir, avoid));
        // 包抄与靠近保持运动速度，召回在终点减速
        const slowdown = s.command === 'recall' ? clamp(d / 80, 0.25, 1) : 1;
        desiredVel = scale(steer, s.maxSpeed * slowdown);
      }
    }

    // 加速度限制（惯性）：lie-down 时刹车更快
    const rate = s.command === 'lie-down' ? DOG_DEFAULTS.brake : s.accel;
    const maxDelta = rate * dt;
    let delta = sub(desiredVel, s.vel);
    if (len(delta) > maxDelta) delta = scale(normalize(delta), maxDelta);
    s.vel = add(s.vel, delta);
    s.vel = limit(s.vel, s.maxSpeed);

    // 转向角速度限制（视觉朝向）
    if (len(s.vel) > 4) {
      const targetHeading = angleOf(s.vel);
      let diff = targetHeading - s.heading;
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      const maxTurn = s.turnRate * dt;
      s.heading += clamp(diff, -maxTurn, maxTurn);
    }

    s.pos = add(s.pos, scale(s.vel, dt));
    // 赛场边界硬约束
    s.pos.x = clamp(s.pos.x, 12, this.course.width - 12);
    s.pos.y = clamp(s.pos.y, 12, this.course.height - 12);
  }
}
