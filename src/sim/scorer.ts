import { SCORING } from '../shared/constants';

export type PhaseKey = 'outrun' | 'lift' | 'fetch' | 'drive' | 'pen' | 'shed';

export interface FaultEntry {
  time: number;
  phase: PhaseKey;
  type: string;
  detail: string;
  points: number;
}

export interface PhaseScore {
  key: PhaseKey;
  name: string;
  max: number;
  deductions: number;
  score: number;
}

export interface ScoreResult {
  total: number;
  phases: PhaseScore[];
  faults: FaultEntry[];
  timeUsed: number;
  timeLimit: number;
  timePenalty: number;
  overtime: number;
  finished: boolean;
  pennedCount: number;
  sheepCount: number;
  gatesCleared: number;
  gateCount: number;
}

/**
 * 按 ISDS 传统百分制记账：
 * Outrun 20 / Lift 10 / Fetch 20 / Drive 30 / Pen 10 / Shed 10（本作为群羊完整度）。
 * 每个环节扣分不超过该环节满分，总分地板 0；超时另计时间罚分。
 */
export class Scorer {
  private deductions: Record<PhaseKey, number> = {
    outrun: 0,
    lift: 0,
    fetch: 0,
    drive: 0,
    pen: 0,
    shed: 0,
  };
  private faults: FaultEntry[] = [];
  private outrunDeviationBank = 0;
  private overflankBank = 0;
  private boundaryBank = 0;
  private roughLiftLogged = false;
  private strayEvents = new Set<number>();

  constructor(
    private readonly timeLimit: number,
    private readonly gateCount: number,
    private readonly sheepCount: number,
  ) {}

  /** 记一笔失误，扣分被本环节满分截断 */
  log(
    time: number,
    phase: PhaseKey,
    type: string,
    detail: string,
    points: number,
  ): void {
    const cap = SCORING.phases[phase].max;
    const room = cap - this.deductions[phase];
    const applied = Math.min(Math.max(0, points), room);
    if (applied <= 0) return;
    this.deductions[phase] += applied;
    this.faults.push({ time, phase, type, detail, points: applied });
  }

  /** Outrun 弧线偏离采样（px），每累计 30px 扣 0.5 */
  sampleOutrunDeviation(time: number, excessPx: number): void {
    this.outrunDeviationBank += Math.max(0, excessPx);
    const step = SCORING.faults.outrunPathStep;
    while (this.outrunDeviationBank >= step) {
      this.outrunDeviationBank -= step;
      this.log(
        time,
        'outrun',
        'outrun-path',
        '围跑弧线偏离理想路线',
        SCORING.faults.outrunPathDeviation,
      );
    }
  }

  /** 起步炸群（仅记一次） */
  markRoughLift(time: number, avgPressure: number): void {
    if (this.roughLiftLogged) return;
    this.roughLiftLogged = true;
    this.log(
      time,
      'lift',
      'rough-lift',
      `起步平均压力 ${avgPressure.toFixed(2)}，羊群受惊炸群`,
      SCORING.faults.roughLift,
    );
  }

  /** 门关闭时统计漏过的羊：前一半门归 Fetch，后一半门归 Drive */
  closeGate(time: number, gateIndex: number, missing: number): void {
    if (missing <= 0) return;
    const fetchGateCount = Math.ceil(this.gateCount / 2);
    const phase: PhaseKey = gateIndex < fetchGateCount ? 'fetch' : 'drive';
    this.log(
      time,
      phase,
      'missed-gate',
      `第 ${gateIndex + 1} 道门有 ${missing} 只羊未通过`,
      missing * SCORING.faults.missedSheepAtGate,
    );
  }

  /** 门序错误 */
  logWrongGateOrder(time: number, gateIndex: number): void {
    const fetchGateCount = Math.ceil(this.gateCount / 2);
    const phase: PhaseKey = gateIndex < fetchGateCount ? 'fetch' : 'drive';
    this.log(
      time,
      phase,
      'wrong-gate-order',
      `羊只未按顺序通过第 ${gateIndex + 1} 道门`,
      SCORING.faults.wrongGateOrder,
    );
  }

  /** 脱群事件：同一只羊多次脱群可多次记账（每连续脱群 2s 一次） */
  addStrayEvent(time: number, sheepId: number): void {
    this.strayEvents.add(sheepId);
    this.log(
      time,
      'shed',
      'stray',
      `#${sheepId} 号羊脱群超过 2 秒`,
      SCORING.faults.strayEvent,
    );
  }

  /** 狗贴脸压迫计时，每秒 0.5 分，计入群羊完整度 */
  addOverflank(time: number, dt: number): void {
    this.overflankBank += dt;
    while (this.overflankBank >= 1) {
      this.overflankBank -= 1;
      this.log(
        time,
        'shed',
        'overflank',
        '狗贴得太近，羊群受到过度压迫',
        SCORING.faults.overflankPerSecond,
      );
    }
  }

  /** 羊被挤到边界计时 */
  addBoundary(time: number, dt: number): void {
    this.boundaryBank += dt;
    while (this.boundaryBank >= 1) {
      this.boundaryBank -= 1;
      this.log(
        time,
        'shed',
        'boundary',
        '羊被驱赶到赛场边界',
        SCORING.faults.boundaryPerSecond,
      );
    }
  }

  /** 入圈后逃出 */
  addPenEscape(time: number, sheepId: number): void {
    this.log(
      time,
      'pen',
      'pen-escape',
      `#${sheepId} 号羊入圈后逃出`,
      SCORING.faults.penEscape,
    );
  }

  /** 时限到达仍未入圈的羊，每只扣 2 分 */
  addUnpenned(time: number, count: number): void {
    if (count <= 0) return;
    this.log(
      time,
      'pen',
      'unpenned',
      `${count} 只羊未能在时限内入圈`,
      count * 2,
    );
  }

  finish(
    time: number,
    allPenned: boolean,
    pennedCount: number,
    gatesCleared: number,
  ): ScoreResult {
    if (!allPenned) {
      this.addUnpenned(time, this.sheepCount - pennedCount);
    }
    const overtime = Math.max(0, time - this.timeLimit);
    const timePenalty = Math.min(
      overtime * SCORING.timePenaltyPerSecond,
      SCORING.total,
    );

    const phases: PhaseScore[] = (
      Object.keys(SCORING.phases) as PhaseKey[]
    ).map((key) => {
      const max = SCORING.phases[key].max;
      const deductions = this.deductions[key];
      return {
        key,
        name: SCORING.phases[key].name,
        max,
        deductions,
        score: max - deductions,
      };
    });

    const sectionTotal = phases.reduce((sum, p) => sum + p.score, 0);
    const total = Math.max(
      SCORING.minScore,
      sectionTotal - timePenalty,
    );

    return {
      total: Math.round(total * 10) / 10,
      phases,
      faults: [...this.faults],
      timeUsed: time,
      timeLimit: this.timeLimit,
      timePenalty: Math.round(timePenalty * 10) / 10,
      overtime: Math.round(overtime * 10) / 10,
      finished: allPenned,
      pennedCount,
      sheepCount: this.sheepCount,
      gatesCleared,
      gateCount: this.gateCount,
    };
  }
}
