/** 可种子化的伪随机数发生器（mulberry32），保证模拟与测试可复现 */
export class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** 重新播种，使后续随机序列与新建实例一致 */
  reseed(seed: number): void {
    this.state = seed >>> 0;
  }

  /** 0..1 的均匀分布 */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  /** Box-Muller 正态分布 */
  gaussian(mean = 0, std = 1): number {
    const u = Math.max(1e-12, this.next());
    const v = this.next();
    const mag = Math.sqrt(-2 * Math.log(u));
    return mean + mag * Math.cos(2 * Math.PI * v) * std;
  }

  pick<T>(items: T[]): T {
    return items[Math.floor(this.next() * items.length)];
  }
}
