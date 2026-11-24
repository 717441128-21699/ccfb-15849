/// <reference lib="webworker" />
import { Simulation } from './engine';
import type {
  SimulationConfig,
  WorkerInMessage,
  WorkerOutMessage,
  DebugParams,
  WhistleCommand,
} from '../shared/types';

const TICK_HZ = 60;
const SNAPSHOT_HZ = 30;
const TICK_MS = 1000 / TICK_HZ;

const ctx = self as unknown as DedicatedWorkerGlobalScope;
let sim: Simulation | null = null;
let paused = false;
let speedMultiplier = 1;
let accumulator = 0;
let last = 0;
let timerId: ReturnType<typeof setInterval> | null = null;
let snapshotAcc = 0;

function post(message: WorkerOutMessage): void {
  ctx.postMessage(message);
}

/**
 * 固定节拍推进：用 setInterval 而非 requestAnimationFrame，
 * 因为 Worker 不可见/无头环境下 rAF 会被节流甚至停摆，
 * 而羊群模拟不应依赖页面渲染帧率。
 */
function tick(): void {
  if (!sim || paused) {
    last = Date.now();
    return;
  }
  const now = Date.now();
  let frameMs = now - last;
  last = now;
  if (frameMs > 200) frameMs = 200; // 切后台回来不追帧

  accumulator += (frameMs / 1000) * speedMultiplier;
  const step = 1 / TICK_HZ;
  let guard = 0;
  while (accumulator >= step && guard < TICK_HZ * 2) {
    sim.step(step);
    accumulator -= step;
    guard++;
    if (sim.result) {
      post({ type: 'finished', snapshot: sim.snapshot(), score: sim.result });
      sim = null;
      stopLoop();
      return;
    }
  }

  snapshotAcc += frameMs;
  if (snapshotAcc >= 1000 / SNAPSHOT_HZ) {
    snapshotAcc = 0;
    if (sim) post({ type: 'snapshot', snapshot: sim.snapshot() });
  }
}

function startLoop(): void {
  if (timerId !== null) return;
  last = Date.now();
  timerId = setInterval(tick, TICK_MS);
}

function stopLoop(): void {
  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
  }
  accumulator = 0;
  snapshotAcc = 0;
}

ctx.onmessage = (e: MessageEvent<WorkerInMessage>) => {
  const msg = e.data;
  switch (msg.type) {
    case 'init': {
      const config: SimulationConfig = msg.config;
      sim = new Simulation(config);
      paused = false;
      post({ type: 'snapshot', snapshot: sim.snapshot() });
      startLoop();
      break;
    }
    case 'command':
      sim?.whistle(msg.command as WhistleCommand);
      break;
    case 'pause':
      paused = msg.paused;
      break;
    case 'speed':
      speedMultiplier = msg.multiplier;
      break;
    case 'params':
      sim?.updateParams(msg.params as Partial<DebugParams>);
      break;
    case 'reset':
      if (sim) {
        sim.reset();
        paused = false;
        post({ type: 'snapshot', snapshot: sim.snapshot() });
        startLoop();
      }
      break;
  }
};
