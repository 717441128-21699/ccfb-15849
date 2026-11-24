import type { Vec2 } from './vector';

/** 羊的脾性（自己编的四种） */
export type TemperamentId = 'steady' | 'skittish' | 'stubborn' | 'flighty';

/** 门：由两个门柱定义，羊群需整体穿过 */
export interface Gate {
  id: number;
  a: Vec2;
  b: Vec2;
  /** 门的朝向参考点（门的来向一侧），用于判定穿过方向 */
  approach: Vec2;
}

/** 圆形羊圈 */
export interface Pen {
  center: Vec2;
  radius: number;
  /** 入口宽度（缺口） */
  opening: number;
  /** 缺口朝向（弧度） */
  openingAngle: number;
}

/** 草地斑块（吸引羊去吃草） */
export interface GrassPatch {
  center: Vec2;
  radius: number;
  strength: number;
}

/** 圆形障碍物（树、岩石），羊和狗都会绕行 */
export interface Obstacle {
  center: Vec2;
  radius: number;
}

/** 赛场定义 */
export interface CourseDef {
  id: string;
  name: string;
  description: string;
  /** 世界尺寸（内部坐标，渲染时等比缩放） */
  width: number;
  height: number;
  /** 羊群初始活动山坡区域中心与散布半径 */
  hill: { center: Vec2; radius: number };
  /** 指挥位（handler）起点，狗的初始位置与召回目标 */
  handler: Vec2;
  gates: Gate[];
  pen: Pen;
  grass: GrassPatch[];
  obstacles: Obstacle[];
  /** 标准时限（秒） */
  timeLimit: number;
}

/** 脾性参数 */
export interface TemperamentDef {
  id: TemperamentId;
  name: string;
  description: string;
  /** 逃逸权重（怕狗程度） */
  fleeWeight: number;
  /** 抱团权重 */
  cohesionWeight: number;
  /** 对齐权重 */
  alignWeight: number;
  /** 吃草权重 */
  grassWeight: number;
  /** 个体噪声幅度（性格差异） */
  noise: number;
  /** 最大速度系数 */
  speedFactor: number;
  /** 压力恢复速度系数（越小越慢冷静） */
  calmFactor: number;
  /** 脱群倾向修正（乘到全局脱群阈值上） */
  strayFactor: number;
}

export type WhistleCommand =
  | 'come-by' // 绕左（顺时针包抄，传统赛口令）
  | 'away-to-me' // 绕右（逆时针包抄）
  | 'lie-down' // 停
  | 'walk-on' // 靠近/缓进
  | 'recall'; // 回到handler身边

export interface DogState {
  pos: Vec2;
  vel: Vec2;
  /** 当前执行的口令 */
  command: WhistleCommand;
  /** 指令目标点（walk-on / 包抄的瞬时目标） */
  target: Vec2 | null;
  /** 最大速度 px/s */
  maxSpeed: number;
  /** 加速度（惯性相关） px/s^2 */
  accel: number;
  /** 转向角速度 rad/s */
  turnRate: number;
  heading: number;
}

export interface SheepState {
  id: number;
  pos: Vec2;
  vel: Vec2;
  /** 当前压力 0..1（狗离得越近越高） */
  pressure: number;
  /** 个体参数差异 */
  variation: {
    flee: number;
    cohesion: number;
    noise: number;
    speed: number;
    stray: number;
  };
  /** 是否处于脱群状态 */
  stray: boolean;
  /** 已经穿过的门 id */
  gatesPassed: number[];
  /** 是否在羊圈内 */
  penned: boolean;
}

export interface SimulationConfig {
  sheepCount: number;
  temperament: TemperamentId;
  /** 模拟步长（秒） */
  dt: number;
  seed: number;
  course: CourseDef;
  /** 调试覆盖参数（不填用脾性默认值） */
  overrides?: Partial<DebugParams>;
}

/** 调试页可实时调节的参数 */
export interface DebugParams {
  fleeWeight: number;
  cohesionWeight: number;
  alignWeight: number;
  grassWeight: number;
  /** 狗的逃逸影响半径 */
  fleeRadius: number;
  /** 压力衰减速率 1/s */
  pressureDecay: number;
  /** 脱群判定距离（相对羊群平均间距的倍数） */
  strayRadius: number;
  /** 头羊影响力（前方个体的转向传导） */
  leaderInfluence: number;
  dogMaxSpeed: number;
  dogAccel: number;
  dogTurnRate: number;
  noise: number;
}

export interface SimStats {
  /** 羊群质心 */
  centroid: Vec2;
  /** 平均压力 */
  avgPressure: number;
  /** 最大个体压力 */
  maxPressure: number;
  /** 脱群羊数量 */
  strayCount: number;
  /** 羊群平均速度 */
  avgSpeed: number;
  /** 已全部通过的门数量 */
  gatesCleared: number;
  /** 已入圈羊数量 */
  pennedCount: number;
  /** 门的逐只通过情况 */
  gateProgress: { gateId: number; passed: number; total: number }[];
  /** 最近 1s 内质心移动方向与狗->质心方向的夹角（度），仅在狗逼近时有意义 */
  driveAngleDeg: number | null;
}

export interface SimulationSnapshot {
  tick: number;
  time: number;
  sheep: SheepState[];
  dog: DogState;
  handler: Vec2;
  stats: SimStats;
  finished: boolean;
}

/** Worker -> 主线程消息 */
export type WorkerOutMessage =
  | { type: 'snapshot'; snapshot: SimulationSnapshot }
  | { type: 'finished'; snapshot: SimulationSnapshot; score: ScoreResultLike };

/** 成绩的结构化拷贝（Scorer 实例不可跨 Worker 边界传递） */
export interface ScoreResultLike {
  total: number;
  phases: {
    key: string;
    name: string;
    max: number;
    deductions: number;
    score: number;
  }[];
  faults: {
    time: number;
    phase: string;
    type: string;
    detail: string;
    points: number;
  }[];
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

/** 主线程 -> Worker 消息 */
export type WorkerInMessage =
  | { type: 'init'; config: SimulationConfig }
  | { type: 'command'; command: WhistleCommand }
  | { type: 'pause'; paused: boolean }
  | { type: 'speed'; multiplier: number }
  | { type: 'params'; params: Partial<DebugParams> }
  | { type: 'reset' };
