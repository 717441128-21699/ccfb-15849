import type {
  CourseDef,
  DogState,
  Gate,
  SheepState,
  SimulationSnapshot,
  SimStats,
} from '../shared/types';
import type { DebugParams } from '../shared/types';
import { dist } from '../shared/vector';

export interface RenderOptions {
  debug: boolean;
  params?: DebugParams;
  showFleeRadius: boolean;
  showForces: boolean;
  showCentroid: boolean;
}

const SHEEP_COLOR = '#f5f1e6';
const SHEEP_STRAY_COLOR = '#e8a33d';
const SHEEP_PEN_COLOR = '#c9d8b8';
const DOG_COLOR = '#5b4636';
const GATE_COLOR = '#d9534f';
const GATE_DONE_COLOR = '#5cb85c';

/** 纯渲染层：只吃快照，不参与任何模拟计算 */
export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly course: CourseDef,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
    this.resize();
  }

  resize(): void {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(320, rect.width * dpr);
    this.canvas.height = Math.max(240, rect.height * dpr);
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    this.scale = Math.min(
      this.canvas.width / this.course.width,
      this.canvas.height / this.course.height,
    );
    this.offsetX = (this.canvas.width - this.course.width * this.scale) / 2;
    this.offsetY = (this.canvas.height - this.course.height * this.scale) / 2;
  }

  render(snap: SimulationSnapshot, opts: RenderOptions): void {
    const { ctx } = this;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);

    this.drawField();
    this.drawGrass();
    this.drawPen();
    this.drawGates(snap.sheep);
    this.drawObstacles();
    this.drawHill();
    if (opts.debug) this.drawDebugOverlays(snap, opts);
    this.drawSheep(snap.sheep);
    this.drawDog(snap.dog);
    this.drawHandler(snap.handler);
    if (opts.debug) this.drawStats(snap.stats);

    ctx.restore();
  }

  private drawField(): void {
    const { ctx, course } = this;
    ctx.fillStyle = '#7d9c5a';
    ctx.fillRect(0, 0, course.width, course.height);
    // 草纹
    ctx.strokeStyle = 'rgba(60, 90, 40, 0.18)';
    ctx.lineWidth = 1;
    for (let x = 30; x < course.width; x += 46) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x - 120, course.height);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, course.width - 4, course.height - 4);
  }

  private drawHill(): void {
    const { ctx, course } = this;
    const h = course.hill;
    const grad = ctx.createRadialGradient(
      h.center.x,
      h.center.y,
      10,
      h.center.x,
      h.center.y,
      h.radius + 30,
    );
    grad.addColorStop(0, 'rgba(120, 95, 60, 0.35)');
    grad.addColorStop(1, 'rgba(120, 95, 60, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(h.center.x, h.center.y, h.radius + 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(80, 60, 35, 0.55)';
    ctx.font = '16px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('山坡', h.center.x, h.center.y - h.radius - 12);
  }

  private drawGrass(): void {
    const { ctx, course } = this;
    for (const g of course.grass) {
      ctx.fillStyle = `rgba(95, 145, 60, ${0.16 + g.strength * 0.12})`;
      ctx.beginPath();
      ctx.arc(g.center.x, g.center.y, g.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(60, 100, 40, 0.35)';
      ctx.setLineDash([6, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  private drawObstacles(): void {
    const { ctx, course } = this;
    for (const ob of course.obstacles) {
      ctx.fillStyle = '#6e6257';
      ctx.beginPath();
      ctx.arc(ob.center.x, ob.center.y, ob.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.arc(
        ob.center.x - ob.radius * 0.3,
        ob.center.y - ob.radius * 0.3,
        ob.radius * 0.45,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  private drawGates(sheep: SheepState[]): void {
    const { ctx, course } = this;
    course.gates.forEach((gate: Gate, idx) => {
      const passed = sheep.filter((s) =>
        s.gatesPassed.includes(gate.id),
      ).length;
      const done = passed === sheep.length;
      ctx.strokeStyle = done ? GATE_DONE_COLOR : GATE_COLOR;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(gate.a.x, gate.a.y);
      ctx.lineTo(gate.b.x, gate.b.y);
      ctx.stroke();
      // 门柱
      ctx.fillStyle = done ? GATE_DONE_COLOR : '#8c2f2c';
      for (const p of [gate.a, gate.b]) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
        ctx.fill();
      }
      // 门号与进度
      const mid = {
        x: (gate.a.x + gate.b.x) / 2,
        y: (gate.a.y + gate.b.y) / 2,
      };
      ctx.fillStyle = 'rgba(30,30,30,0.8)';
      ctx.font = 'bold 15px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(`${idx + 1}  ${passed}/${sheep.length}`, mid.x, mid.y - 14);
    });
  }

  private drawPen(): void {
    const { ctx, course } = this;
    const pen = course.pen;
    ctx.save();
    ctx.translate(pen.center.x, pen.center.y);
    ctx.rotate(pen.openingAngle);
    const gap = pen.opening / 2;
    ctx.strokeStyle = '#8a6d3b';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(0, 0, pen.radius, gap, Math.PI * 2 - gap);
    ctx.stroke();
    // 缺口门柱
    ctx.fillStyle = '#6b532b';
    for (const a of [gap, Math.PI * 2 - gap]) {
      ctx.beginPath();
      ctx.arc(Math.cos(a) * pen.radius, Math.sin(a) * pen.radius, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(120, 90, 40, 0.55)';
    ctx.font = '15px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('羊圈', pen.center.x, pen.center.y);
  }

  private drawSheep(sheep: SheepState[]): void {
    const { ctx } = this;
    for (const s of sheep) {
      const color = s.penned
        ? SHEEP_PEN_COLOR
        : s.stray
          ? SHEEP_STRAY_COLOR
          : SHEEP_COLOR;
      // 压力环
      if (s.pressure > 0.05) {
        ctx.strokeStyle = `rgba(220, 60, 60, ${s.pressure * 0.7})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(s.pos.x, s.pos.y, 12 + s.pressure * 10, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(s.pos.x, s.pos.y, 9, 7, Math.atan2(s.vel.y, s.vel.x), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();
      // 头
      const heading = Math.atan2(s.vel.y, s.vel.x);
      const hx = s.pos.x + Math.cos(heading) * 8;
      const hy = s.pos.y + Math.sin(heading) * 8;
      ctx.fillStyle = '#3d342b';
      ctx.beginPath();
      ctx.arc(hx, hy, 3.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawDog(dog: DogState): void {
    const { ctx } = this;
    ctx.save();
    ctx.translate(dog.pos.x, dog.pos.y);
    ctx.rotate(dog.heading);
    // 身体
    ctx.fillStyle = DOG_COLOR;
    ctx.beginPath();
    ctx.ellipse(0, 0, 13, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // 头
    ctx.fillStyle = '#45362a';
    ctx.beginPath();
    ctx.arc(11, 0, 5.5, 0, Math.PI * 2);
    ctx.fill();
    // 尾巴
    ctx.strokeStyle = DOG_COLOR;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-11, 0);
    ctx.lineTo(-18, -4);
    ctx.stroke();
    ctx.restore();
    // 目标点
    if (dog.target) {
      ctx.strokeStyle = 'rgba(40, 90, 200, 0.6)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(dog.pos.x, dog.pos.y);
      ctx.lineTo(dog.target.x, dog.target.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(40, 90, 200, 0.7)';
      ctx.beginPath();
      ctx.arc(dog.target.x, dog.target.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawHandler(handler: { x: number; y: number }): void {
    const { ctx } = this;
    ctx.fillStyle = '#2f4a6b';
    ctx.beginPath();
    ctx.arc(handler.x, handler.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8d9bf';
    ctx.beginPath();
    ctx.arc(handler.x, handler.y - 3, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(30,30,30,0.7)';
    ctx.font = '13px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('指挥位', handler.x, handler.y + 26);
  }

  private drawDebugOverlays(snap: SimulationSnapshot, opts: RenderOptions): void {
    const { ctx, course } = this;
    if (opts.showCentroid) {
      const c = snap.stats.centroid;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(c.x - 20, c.y);
      ctx.lineTo(c.x + 20, c.y);
      ctx.moveTo(c.x, c.y - 20);
      ctx.lineTo(c.x, c.y + 20);
      ctx.stroke();
    }
    if (opts.showFleeRadius && opts.params) {
      ctx.strokeStyle = 'rgba(220, 60, 60, 0.4)';
      ctx.setLineDash([8, 8]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(
        snap.dog.pos.x,
        snap.dog.pos.y,
        opts.params.fleeRadius,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (opts.showForces) {
      // 质心->狗连线与推力方向
      const c = snap.stats.centroid;
      ctx.strokeStyle = 'rgba(255, 80, 80, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(snap.dog.pos.x, snap.dog.pos.y);
      ctx.stroke();
      const push = {
        x: c.x - snap.dog.pos.x,
        y: c.y - snap.dog.pos.y,
      };
      const pl = Math.hypot(push.x, push.y) || 1;
      ctx.strokeStyle = 'rgba(80, 200, 255, 0.9)';
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(c.x + (push.x / pl) * 60, c.y + (push.y / pl) * 60);
      ctx.stroke();
    }
    // 头羊标记
    void course;
  }

  private drawStats(stats: SimStats): void {
    const { ctx } = this;
    const lines = [
      `平均压力 ${stats.avgPressure.toFixed(2)}  最大 ${stats.maxPressure.toFixed(2)}`,
      `脱群 ${stats.strayCount} 只  均速 ${stats.avgSpeed.toFixed(0)} px/s`,
      stats.driveAngleDeg === null
        ? '驱向夹角 —'
        : `驱向夹角 ${stats.driveAngleDeg.toFixed(1)}°`,
      `门 ${stats.gatesCleared}/${stats.gateProgress.length}  入圈 ${stats.pennedCount}`,
    ];
    ctx.font = '13px ui-monospace, monospace';
    ctx.textAlign = 'left';
    lines.forEach((line, i) => {
      ctx.fillStyle = 'rgba(20, 30, 20, 0.72)';
      const y = 22 + i * 19;
      ctx.fillRect(10, y - 13, ctx.measureText(line).width + 14, 17);
      ctx.fillStyle = '#eaf3df';
      ctx.fillText(line, 17, y);
    });
  }

  /** 屏幕坐标 -> 世界坐标（调试页点击放狗用） */
  screenToWorld(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    return {
      x: (sx * dpr - this.offsetX) / this.scale,
      y: (sy * dpr - this.offsetY) / this.scale,
    };
  }

  distanceToDog(snap: SimulationSnapshot, p: { x: number; y: number }): number {
    return dist(snap.dog.pos, p);
  }
}
