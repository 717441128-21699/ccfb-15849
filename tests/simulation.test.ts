import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/sim/engine';
import { Scorer } from '../src/sim/scorer';
import { COURSES } from '../src/shared/courses';
import { TEMPERAMENTS } from '../src/shared/constants';
import type { SimulationConfig } from '../src/shared/types';
import { angleBetween, sub, vec } from '../src/shared/vector';

const course = COURSES[0];

function makeConfig(overrides: Partial<SimulationConfig> = {}): SimulationConfig {
  return {
    course,
    temperament: 'steady',
    sheepCount: 8,
    dt: 1 / 60,
    seed: 42,
    ...overrides,
  };
}

/** 让模拟空跑指定秒数 */
function runFor(sim: Simulation, seconds: number): void {
  const steps = Math.round(seconds / (1 / 60));
  for (let i = 0; i < steps; i++) sim.step(1 / 60);
}

/** 直接摆狗的位置（测试用，绕过口令运动学） */
function placeDog(sim: Simulation, x: number, y: number): void {
  sim.dogState.pos = vec(x, y);
  sim.dogState.vel = vec(0, 0);
}

/** 把所有羊的压力置为指定值 */
function setAllPressure(sim: Simulation, value: number): void {
  for (const s of sim.sheepState) s.pressure = value;
}

describe('要求 1：狗从正后方逼近，质心沿狗-质心连线直推（夹角 ≤15°）', () => {
  it('walk-on 逼近 2 秒后，质心移动方向与狗→质心连线夹角不超过 15°', () => {
    const sim = new Simulation(makeConfig({ seed: 7 }));
    const startCentroid = { ...sim.snapshot().stats.centroid };

    // 狗放到质心正后方（沿 -x 方向），发 walk-on 持续推进
    const c0 = startCentroid;
    placeDog(sim, c0.x - 180, c0.y);
    sim.whistle('walk-on');
    runFor(sim, 2);

    const snap = sim.snapshot();
    const moveDir = sub(snap.stats.centroid, startCentroid);
    // 狗→质心连线方向
    const pushDir = sub(snap.stats.centroid, sim.dogState.pos);
    const angleDeg = (angleBetween(moveDir, pushDir) * 180) / Math.PI;

    expect(moveDir.x).toBeGreaterThan(20); // 确实被推走了
    expect(angleDeg).toBeLessThanOrEqual(15);
  });

  it('静止站立时也有侧向对称的直推效果（连续多组种子均满足）', () => {
    const seeds = [1, 11, 23, 42, 99];
    for (const seed of seeds) {
      const sim = new Simulation(makeConfig({ seed }));
      const c0 = { ...sim.snapshot().stats.centroid };
      placeDog(sim, c0.x - 150, c0.y);
      runFor(sim, 1.5);
      const c1 = sim.snapshot().stats.centroid;
      const moveDir = sub(c1, c0);
      const pushDir = sub(c1, sim.dogState.pos);
      const angleDeg = (angleBetween(moveDir, pushDir) * 180) / Math.PI;
      expect(angleDeg, `seed=${seed}`).toBeLessThanOrEqual(15);
    }
  });
});

describe('要求 1：狗停下后羊群恢复吃草的时间随距离变长', () => {
  /** 测平均压力降到吃草阈值以下所需的秒数 */
  function recoverySeconds(dogDistance: number): number {
    const sim = new Simulation(makeConfig({ seed: 42 }));
    const c = sim.snapshot().stats.centroid;
    // 先贴脸把压力拉满
    placeDog(sim, c.x - 40, c.y);
    runFor(sim, 1.2);
    setAllPressure(sim, 0.9);
    // 狗「停下」：撤到指定距离并静止
    placeDog(sim, c.x - dogDistance, c.y);
    const threshold = 0.12;
    for (let i = 0; i < 60 * 20; i++) {
      sim.step(1 / 60);
      const avg =
        sim.sheepState.reduce((sum, s) => sum + s.pressure, 0) /
        sim.sheepState.length;
      if (avg < threshold) return i / 60;
    }
    return 20;
  }

  it('近距停下恢复最慢、远距停下恢复最快，单调对应距离', () => {
    const near = recoverySeconds(60);
    const mid = recoverySeconds(180);
    const far = recoverySeconds(320);
    // 远到几乎无压力源时应在 3 秒内冷静；贴脸时 20 秒内都恢复不了
    expect(far).toBeLessThan(3);
    expect(mid).toBeLessThan(near);
    expect(far).toBeLessThan(mid);
  });
});

describe('要求 2：狗贴得越近，脱群的羊越多', () => {
  /** 狗持续贴脸压迫：每 0.5s 重新压到羊群后方 dogDistance 处 */
  function strayCountAt(dogDistance: number, seconds = 4): number {
    const sim = new Simulation(
      makeConfig({ temperament: 'skittish', seed: 5 }),
    );
    for (let i = 0; i < seconds * 2; i++) {
      const c = sim.snapshot().stats.centroid;
      placeDog(sim, c.x - dogDistance, c.y);
      runFor(sim, 0.5);
    }
    return sim.snapshot().stats.strayCount;
  }

  it('贴脸(50px)有羊脱群，远距离(240px)没有脱群', () => {
    const close = strayCountAt(50);
    const far = strayCountAt(240);
    expect(close).toBeGreaterThan(far);
    expect(close).toBeGreaterThanOrEqual(1);
    expect(far).toBe(0);
  });

  it('脱群数随距离单调不增（50/110/180/260 四档）', () => {
    const counts = [50, 110, 180, 260].map((d) => strayCountAt(d, 3.5));
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i]).toBeLessThanOrEqual(counts[i - 1]);
    }
  });

  it('沉稳脾性比惊弓脾性脱群少（同样的贴脸压迫）', () => {
    const skittish = strayCountAt(60);
    const steadySim = new Simulation(
      makeConfig({ temperament: 'steady', seed: 5 }),
    );
    for (let i = 0; i < 8; i++) {
      const c = steadySim.snapshot().stats.centroid;
      placeDog(steadySim, c.x - 60, c.y);
      runFor(steadySim, 0.5);
    }
    const steady = steadySim.snapshot().stats.strayCount;
    expect(steady).toBeLessThan(skittish);
  });
});

describe('评分与 ISDS 百分制细则对账', () => {
  it('Scorer 各环节满分与 ISDS 传统分值一致（20/10/20/30/10/10）', () => {
    const scorer = new Scorer(240, 3, 8);
    const result = scorer.finish(100, true, 8, 3);
    expect(result.phases.map((p) => p.max)).toEqual([20, 10, 20, 30, 10, 10]);
    expect(result.total).toBe(100);
    expect(result.faults).toHaveLength(0);
  });

  it('一道门漏 2 只羊扣 2 分，且前半门计入 Fetch', () => {
    const scorer = new Scorer(240, 3, 8);
    scorer.closeGate(50, 0, 2);
    const result = scorer.finish(100, true, 8, 3);
    const fetch = result.phases.find((p) => p.key === 'fetch')!;
    expect(fetch.deductions).toBeCloseTo(2, 5);
    expect(result.total).toBeCloseTo(98, 5);
  });

  it('后半门的漏羊计入 Drive 环节', () => {
    const scorer = new Scorer(240, 3, 8);
    scorer.closeGate(50, 2, 3);
    const result = scorer.finish(100, true, 8, 3);
    const drive = result.phases.find((p) => p.key === 'drive')!;
    expect(drive.deductions).toBeCloseTo(3, 5);
  });

  it('脱群事件每只每次扣 1 分，计入 Shed（群羊完整度）', () => {
    const scorer = new Scorer(240, 3, 8);
    scorer.addStrayEvent(30, 2);
    scorer.addStrayEvent(33, 5);
    const result = scorer.finish(100, true, 8, 3);
    const shed = result.phases.find((p) => p.key === 'shed')!;
    expect(shed.deductions).toBeCloseTo(2, 5);
    expect(result.faults.filter((f) => f.type === 'stray')).toHaveLength(2);
  });

  it('超时每秒扣 0.5 分，未入圈羊每只扣 2 分', () => {
    const scorer = new Scorer(240, 3, 8);
    const result = scorer.finish(260, false, 6, 3); // 超时 20s，2 只未入圈
    expect(result.timePenalty).toBeCloseTo(10, 5);
    const pen = result.phases.find((p) => p.key === 'pen')!;
    expect(pen.deductions).toBeCloseTo(4, 5);
    expect(result.finished).toBe(false);
  });

  it('环节扣分被该环节满分截断，总分地板为 0', () => {
    const scorer = new Scorer(240, 1, 8);
    for (let i = 0; i < 30; i++) scorer.addStrayEvent(i, i % 8);
    const result = scorer.finish(9001, false, 0, 0);
    const shed = result.phases.find((p) => p.key === 'shed')!;
    expect(shed.deductions).toBeLessThanOrEqual(10);
    expect(result.total).toBe(0);
  });

  it('门序错误一次扣 2 分', () => {
    const scorer = new Scorer(240, 3, 8);
    scorer.logWrongGateOrder(40, 0);
    const result = scorer.finish(100, true, 8, 3);
    expect(result.total).toBeCloseTo(98, 5);
  });
});

describe('狗的运动学：听口令后受速度与惯性约束', () => {
  it('狗不会瞬间达到最大速度，加速是渐变的', () => {
    const sim = new Simulation(makeConfig());
    // 给狗一个远处的目标（recall 的 handler 就在狗起点，走不起来）
    sim.whistle('walk-on');
    sim.step(1 / 60);
    const speedAfterOneTick = Math.hypot(
      sim.dogState.vel.x,
      sim.dogState.vel.y,
    );
    // 一帧（1/60s）内最多加速 accel*dt ≈ 8.7px/s，远低于最大速度 300
    expect(speedAfterOneTick).toBeLessThan(20);
    runFor(sim, 1);
    const speedAfterSecond = Math.hypot(
      sim.dogState.vel.x,
      sim.dogState.vel.y,
    );
    expect(speedAfterSecond).toBeGreaterThan(150);
  });

  it('lie-down 后狗减速停下', () => {
    const sim = new Simulation(makeConfig());
    sim.whistle('walk-on');
    runFor(sim, 1);
    expect(Math.hypot(sim.dogState.vel.x, sim.dogState.vel.y)).toBeGreaterThan(
      100,
    );
    sim.whistle('lie-down');
    runFor(sim, 1);
    expect(Math.hypot(sim.dogState.vel.x, sim.dogState.vel.y)).toBeLessThan(5);
  });
});

describe('脾性参数存在差异且被模拟使用', () => {
  it('四种脾性的逃逸权重各不相同', () => {
    const weights = Object.values(TEMPERAMENTS).map((t) => t.fleeWeight);
    expect(new Set(weights).size).toBe(4);
  });
});
