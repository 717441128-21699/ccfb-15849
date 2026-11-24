import type { TemperamentDef, TemperamentId, DebugParams } from './types';

/** 四种脾性：数值均为相对权重，最终在模拟内核里与调试参数合并 */
export const TEMPERAMENTS: Record<TemperamentId, TemperamentDef> = {
  steady: {
    id: 'steady',
    name: '沉稳群羊',
    description: '怕狗但不慌，抱团紧、恢复快，适合新手熟悉口令。',
    fleeWeight: 1.0,
    cohesionWeight: 1.0,
    alignWeight: 0.8,
    grassWeight: 0.55,
    noise: 0.18,
    speedFactor: 0.95,
    calmFactor: 1.15,
    strayFactor: 0.8,
  },
  skittish: {
    id: 'skittish',
    name: '惊弓群羊',
    description: '一点压力就炸群，脱群多、恢复慢，狗必须保持距离。',
    fleeWeight: 1.45,
    cohesionWeight: 0.8,
    alignWeight: 0.7,
    grassWeight: 0.4,
    noise: 0.4,
    speedFactor: 1.15,
    calmFactor: 0.7,
    strayFactor: 1.6,
  },
  stubborn: {
    id: 'stubborn',
    name: '倔头群羊',
    description: '不怕狗、恋草地，推力弱时纹丝不动，但一旦走动方向很稳。',
    fleeWeight: 0.65,
    cohesionWeight: 1.1,
    alignWeight: 0.9,
    grassWeight: 0.95,
    noise: 0.15,
    speedFactor: 0.8,
    calmFactor: 1.3,
    strayFactor: 0.6,
  },
  flighty: {
    id: 'flighty',
    name: '躁进群羊',
    description: '跑得快、转向急，头羊一动全队跟风，稍不留神就冲过头。',
    fleeWeight: 1.15,
    cohesionWeight: 0.9,
    alignWeight: 1.25,
    grassWeight: 0.45,
    noise: 0.3,
    speedFactor: 1.3,
    calmFactor: 0.9,
    strayFactor: 1.25,
  },
};

export const TEMPERAMENT_LIST: TemperamentDef[] = [
  TEMPERAMENTS.steady,
  TEMPERAMENTS.skittish,
  TEMPERAMENTS.stubborn,
  TEMPERAMENTS.flighty,
];

/** 模拟内核的默认物理参数（调试页在此基础上覆盖） */
export const DEFAULT_PARAMS: DebugParams = {
  fleeWeight: 1.0,
  cohesionWeight: 1.0,
  alignWeight: 0.8,
  grassWeight: 0.55,
  fleeRadius: 300,
  pressureDecay: 0.85,
  strayRadius: 2.4,
  leaderInfluence: 0.7,
  dogMaxSpeed: 300,
  dogAccel: 520,
  dogTurnRate: 4.2,
  noise: 0.32,
};

/** 羊的通用物理常量 */
export const SHEEP_PHYSICS = {
  /** 偏好同伴间距（px），低于此距离产生分离力 */
  separationDist: 26,
  /** 抱团感知半径 */
  neighborRadius: 110,
  /** 最大速度基准 px/s（再乘脾性 speedFactor） */
  maxSpeed: 132,
  /** 速度向期望速度的收敛速率 1/s */
  velocityMatch: 2.4,
  /** 压力高于此值才进入行进状态，低于则吃草 */
  pressureMoveThreshold: 0.12,
  /** 脱群判定：与质心距离超过该倍数的平均邻距 */
  strayDistanceFactor: 2.4,
  /** 贴墙软约束距离 */
  wallMargin: 40,
};

/** 狗的默认物理参数（会被 DebugParams 覆盖） */
export const DOG_DEFAULTS = {
  maxSpeed: 300,
  accel: 520,
  turnRate: 4.2,
  /** lie-down 口令的减速速率 */
  brake: 900,
};

/**
 * ISDS（国际牧羊犬协会）标准赛评分细则映射。
 * 传统满分 100：Outrun 20 / Lift 10 / Fetch 20 / Drive 30 / Pen 10 / Shed 10。
 * 本游戏无分羊环节，Shed 10 分改为「群羊完整度」考核，
 * 按脱群事件与门次漏羊扣分，其余分值与 ISDS 完全对齐。
 */
export const SCORING = {
  total: 100,
  phases: {
    outrun: { name: '围跑 Outrun', max: 20 },
    lift: { name: '起步 Lift', max: 10 },
    fetch: { name: '赶回 Fetch', max: 20 },
    drive: { name: '驱赶 Drive', max: 30 },
    pen: { name: '入圈 Pen', max: 10 },
    shed: { name: '群羊完整度 Shed(改编)', max: 10 },
  },
  /** 单个工作环节失误的基础扣分（ISDS 按 fault 扣分） */
  faults: {
    /** 狗偏离最佳围跑弧线，每偏离 30px 扣 0.5，封顶本环节分值 */
    outrunPathDeviation: 0.5,
    outrunPathStep: 30,
    /** 起步炸群（平均压力超阈）单次 */
    roughLift: 2,
    /** 每道门漏过一只羊（后续补过仍计） */
    missedSheepAtGate: 1,
    /** 门序错误（未按顺序过门）每次 */
    wrongGateOrder: 2,
    /** 脱群事件：每只羊连续脱群满 2s 记一次 */
    strayEvent: 1,
    /** 狗贴脸压迫（压力 > 0.9）每秒 */
    overflankPerSecond: 0.5,
    /** 羊冲出边界每秒 */
    boundaryPerSecond: 0.5,
    /** 入圈后又逃出，每只 */
    penEscape: 2,
  },
  /** 超时扣分：每秒 0.5 分（ISDS 赛事常见的 time penalty 区间 0.25–1） */
  timePenaltyPerSecond: 0.5,
  /** 总分地板 */
  minScore: 0,
} as const;
