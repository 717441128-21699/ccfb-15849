import { Renderer, type RenderOptions } from '../render/renderer';
import { SimClient } from '../render/simClient';
import type {
  ScoreResultLike,
  SimulationSnapshot,
  SimulationConfig,
  WhistleCommand,
} from '../shared/types';
import { DEFAULT_PARAMS } from '../shared/constants';
import { saveSession } from '../shared/session';
import { navigate } from './router';
import { getSelectedCourse, getSelection } from './selectPage';
import { mountCommandBar, type CommandBarHandle } from './commandBar';

export function renderTrialPage(root: HTMLElement, debugMode: boolean): void {
  const selection = getSelection();
  const course = getSelectedCourse();
  const config: SimulationConfig = {
    course,
    temperament: selection.temperament,
    sheepCount: selection.sheepCount,
    dt: 1 / 60,
    seed: 20261124,
  };

  root.innerHTML = `
    <div class="topbar" style="margin-bottom:12px">
      <h1>${debugMode ? '羊群行为调试' : '牧羊犬比赛'} · ${course.name}</h1>
      <span class="pill">脾性：${selection.temperament}</span>
      <span class="pill">${selection.sheepCount} 只羊</span>
      <span style="flex:1"></span>
      <a href="#/select">← 返回选择</a>
      ${debugMode ? '' : '<a href="#/results">成绩页</a>'}
    </div>
    <div class="layout">
      <div class="canvas-wrap"><canvas id="trial-canvas"></canvas></div>
      <div class="side">
        <div class="panel" id="hud-panel">
          <h4>赛场数据</h4>
          <div class="hud" id="hud"></div>
        </div>
        <div class="panel">
          <h4>哨音指挥</h4>
          <div id="command-bar"></div>
        </div>
        <div class="panel">
          <h4>回放控制</h4>
          <div class="row wrap">
            <button id="pause-btn">暂停</button>
            <button id="reset-btn">重开</button>
            <select id="speed-select" style="background:var(--panel-2);color:var(--fg);border:1px solid var(--border);border-radius:8px;padding:8px">
              <option value="0.5">0.5×</option>
              <option value="1" selected>1×</option>
              <option value="2">2×</option>
            </select>
          </div>
        </div>
        <div class="panel" id="debug-panel" ${debugMode ? '' : 'hidden'}>
          <h4>行为参数（实时）</h4>
          <div id="sliders"></div>
          <label class="check-row"><input type="checkbox" id="chk-flee" checked> 狗的逃逸影响圈</label>
          <label class="check-row"><input type="checkbox" id="chk-forces" checked> 压力/推力方向</label>
          <label class="check-row"><input type="checkbox" id="chk-centroid" checked> 羊群质心</label>
        </div>
      </div>
    </div>
  `;

  const canvas = root.querySelector('#trial-canvas') as HTMLCanvasElement;
  const renderer = new Renderer(canvas, course);
  const client = new SimClient();
  const commandBar: CommandBarHandle = mountCommandBar(
    root.querySelector('#command-bar') as HTMLElement,
    client,
  );

  const options: RenderOptions = {
    debug: debugMode,
    params: { ...DEFAULT_PARAMS },
    showFleeRadius: true,
    showForces: true,
    showCentroid: true,
  };

  let paused = false;

  const offSnapshot = client.onSnapshot((snap) => {
    renderer.render(snap, options);
    renderHud(snap);
    commandBar.setActive(snap.dog.command as WhistleCommand);
  });

  const offFinished = client.onFinished(
    (_snap, score: ScoreResultLike) => {
      if (debugMode) return;
      saveSession({
        course,
        temperament: selection.temperament,
        sheepCount: selection.sheepCount,
        score,
        debugMode,
        endedAt: Date.now(),
      });
      window.setTimeout(() => navigate('#/results'), 400);
    },
  );

  function renderHud(snap: SimulationSnapshot): void {
    const remaining = Math.max(0, course.timeLimit - snap.time);
    const m = Math.floor(remaining / 60);
    const s = Math.floor(remaining % 60);
    const hud = root.querySelector('#hud') as HTMLElement;
    hud.innerHTML = `
      <div class="metric">剩余时间<b>${m}:${s.toString().padStart(2, '0')}</b></div>
      <div class="metric">平均压力<b>${snap.stats.avgPressure.toFixed(2)}</b></div>
      <div class="metric">脱群<b>${snap.stats.strayCount} 只</b></div>
      <div class="metric">入圈<b>${snap.stats.pennedCount}/${selection.sheepCount}</b></div>
      <div class="metric">已过门<b>${snap.stats.gatesCleared}/${course.gates.length}</b></div>
      <div class="metric">驱向夹角<b>${
        snap.stats.driveAngleDeg === null
          ? '—'
          : `${snap.stats.driveAngleDeg.toFixed(0)}°`
      }</b></div>
    `;
  }

  if (debugMode) {
    mountDebugSliders(root, client, options);
  }

  // —— 按钮 ——
  const pauseBtn = root.querySelector('#pause-btn') as HTMLButtonElement;
  pauseBtn.addEventListener('click', () => {
    paused = !paused;
    client.pause(paused);
    pauseBtn.textContent = paused ? '继续' : '暂停';
  });
  root.querySelector('#reset-btn')?.addEventListener('click', () => {
    client.reset();
    paused = false;
    pauseBtn.textContent = '暂停';
  });
  root
    .querySelector('#speed-select')
    ?.addEventListener('change', (e) => {
      client.speed(Number((e.target as HTMLSelectElement).value));
    });

  const onResize = (): void => renderer.resize();
  window.addEventListener('resize', onResize);

  client.init(config);

  // 卸载清理（路由切走时）
  (root as HTMLElement & { __cleanup?: () => void }).__cleanup = () => {
    offSnapshot();
    offFinished();
    commandBar.destroy();
    window.removeEventListener('resize', onResize);
    client.dispose();
  };
}

function mountDebugSliders(
  root: HTMLElement,
  client: SimClient,
  options: RenderOptions,
): void {
  const defs: { key: keyof import('../shared/types').DebugParams; label: string; min: number; max: number; step: number }[] = [
    { key: 'fleeWeight', label: '逃逸权重', min: 0, max: 2.5, step: 0.05 },
    { key: 'cohesionWeight', label: '抱团权重', min: 0, max: 2.5, step: 0.05 },
    { key: 'alignWeight', label: '对齐权重', min: 0, max: 2.5, step: 0.05 },
    { key: 'grassWeight', label: '吃草权重', min: 0, max: 2, step: 0.05 },
    { key: 'fleeRadius', label: '逃逸半径', min: 80, max: 420, step: 10 },
    { key: 'pressureDecay', label: '冷静速率', min: 0.05, max: 2, step: 0.05 },
    { key: 'strayRadius', label: '脱群距离', min: 1.2, max: 4, step: 0.1 },
    { key: 'leaderInfluence', label: '头羊影响', min: 0, max: 1.5, step: 0.05 },
    { key: 'dogMaxSpeed', label: '狗速度', min: 120, max: 480, step: 10 },
    { key: 'dogAccel', label: '狗加速度', min: 150, max: 1000, step: 20 },
    { key: 'dogTurnRate', label: '狗转向', min: 1.5, max: 8, step: 0.1 },
    { key: 'noise', label: '个体噪声', min: 0, max: 0.8, step: 0.02 },
  ];

  const sliders = root.querySelector('#sliders') as HTMLElement;
  sliders.innerHTML = defs
    .map(
      (d) => `
    <div class="slider-row">
      <span>${d.label}</span>
      <input type="range" data-key="${d.key}" min="${d.min}" max="${d.max}" step="${d.step}" value="${options.params![d.key]}">
      <span class="val" id="val-${d.key}">${options.params![d.key].toFixed(2)}</span>
    </div>`,
    )
    .join('');

  sliders.querySelectorAll<HTMLInputElement>('input[type=range]').forEach((input) => {
    input.addEventListener('input', () => {
      const key = input.dataset.key as keyof import('../shared/types').DebugParams;
      const value = Number(input.value);
      if (options.params) options.params[key] = value;
      (root.querySelector(`#val-${key}`) as HTMLElement).textContent =
        value.toFixed(2);
      client.updateParams({ [key]: value });
    });
  });

  (root.querySelector('#chk-flee') as HTMLInputElement).addEventListener(
    'change',
    (e) => (options.showFleeRadius = (e.target as HTMLInputElement).checked),
  );
  (root.querySelector('#chk-forces') as HTMLInputElement).addEventListener(
    'change',
    (e) => (options.showForces = (e.target as HTMLInputElement).checked),
  );
  (root.querySelector('#chk-centroid') as HTMLInputElement).addEventListener(
    'change',
    (e) => (options.showCentroid = (e.target as HTMLInputElement).checked),
  );
}
