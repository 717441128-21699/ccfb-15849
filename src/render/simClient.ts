import type {
  SimulationConfig,
  SimulationSnapshot,
  WhistleCommand,
  WorkerInMessage,
  WorkerOutMessage,
  DebugParams,
  ScoreResultLike,
} from '../shared/types';

/** Worker 的 Promise 化封装，页面只跟它打交道 */
export class SimClient {
  private worker: Worker | null = null;
  private snapshotListeners = new Set<(s: SimulationSnapshot) => void>();
  private finishListeners = new Set<
    (s: SimulationSnapshot, score: ScoreResultLike) => void
  >();

  constructor() {
    this.spawn();
  }

  private spawn(): void {
    this.worker = new Worker(new URL('../sim/simWorker.ts', import.meta.url), {
      type: 'module',
    });
    this.worker.onmessage = (e: MessageEvent<WorkerOutMessage>) => {
      const msg = e.data;
      if (msg.type === 'snapshot') {
        this.snapshotListeners.forEach((fn) => fn(msg.snapshot));
      } else if (msg.type === 'finished') {
        this.snapshotListeners.forEach((fn) => fn(msg.snapshot));
        this.finishListeners.forEach((fn) => fn(msg.snapshot, msg.score));
      }
    };
    this.worker.onerror = (err) => {
      console.error('Sim worker error:', err);
    };
  }

  init(config: SimulationConfig): void {
    this.send({ type: 'init', config });
  }

  command(cmd: WhistleCommand): void {
    this.send({ type: 'command', command: cmd });
  }

  pause(paused: boolean): void {
    this.send({ type: 'pause', paused });
  }

  speed(multiplier: number): void {
    this.send({ type: 'speed', multiplier });
  }

  updateParams(params: Partial<DebugParams>): void {
    this.send({ type: 'params', params });
  }

  reset(): void {
    this.send({ type: 'reset' });
  }

  onSnapshot(fn: (s: SimulationSnapshot) => void): () => void {
    this.snapshotListeners.add(fn);
    return () => this.snapshotListeners.delete(fn);
  }

  onFinished(
    fn: (s: SimulationSnapshot, score: ScoreResultLike) => void,
  ): () => void {
    this.finishListeners.add(fn);
    return () => this.finishListeners.delete(fn);
  }

  private send(msg: WorkerInMessage): void {
    this.worker?.postMessage(msg);
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
    this.snapshotListeners.clear();
    this.finishListeners.clear();
  }
}
