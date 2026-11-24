import { COURSES } from '../shared/courses';
import { TEMPERAMENT_LIST } from '../shared/constants';
import type { CourseDef, TemperamentId } from '../shared/types';
import { loadHistory } from '../shared/session';
import { navigate } from './router';

const STORAGE_KEY = 'sheepdog-trial-selection';

interface Selection {
  courseId: string;
  temperament: TemperamentId;
  sheepCount: number;
}

const DEFAULT_SELECTION: Selection = {
  courseId: COURSES[0].id,
  temperament: 'steady',
  sheepCount: 8,
};

function loadSelection(): Selection {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_SELECTION, ...JSON.parse(raw) } : DEFAULT_SELECTION;
  } catch {
    return DEFAULT_SELECTION;
  }
}

export function renderSelectPage(root: HTMLElement): void {
  const sel = loadSelection();
  const history = loadHistory();

  root.innerHTML = `
    <div class="section-title">① 选择赛场</div>
    <div class="card-grid" id="course-grid">
      ${COURSES.map(
        (c) => `
        <div class="card selectable ${c.id === sel.courseId ? 'selected' : ''}" data-course="${c.id}">
          <h3>${c.name}</h3>
          <p>${c.description}</p>
          <p>
            <span class="tag">${c.gates.length} 道门</span>
            <span class="tag">时限 ${c.timeLimit}s</span>
            <span class="tag">${c.obstacles.length} 处障碍</span>
          </p>
        </div>`,
      ).join('')}
    </div>

    <div class="section-title">② 选择羊群脾性</div>
    <div class="card-grid" id="temp-grid">
      ${TEMPERAMENT_LIST.map(
        (t) => `
        <div class="card selectable ${t.id === sel.temperament ? 'selected' : ''}" data-temp="${t.id}">
          <h3>${t.name}</h3>
          <p>${t.description}</p>
          <p>
            <span class="tag">怕狗 ×${t.fleeWeight}</span>
            <span class="tag">抱团 ×${t.cohesionWeight}</span>
            <span class="tag">速度 ×${t.speedFactor}</span>
          </p>
        </div>`,
      ).join('')}
    </div>

    <div class="section-title">③ 羊只数量</div>
    <div class="card">
      <div class="row wrap">
        ${[5, 8, 12]
          .map(
            (n) => `
          <button data-count="${n}" class="${n === sel.sheepCount ? 'active' : ''}">${n} 只</button>`,
          )
          .join('')}
        <span class="muted">羊越多，过门与入圈的完整度考核越难。</span>
      </div>
    </div>

    <div class="section-title">评分规则（对齐 ISDS 国际牧羊犬协会百分制）</div>
    <div class="card">
      <p class="muted">
        Outrun 围跑 20 分 · Lift 起步 10 分 · Fetch 赶回 20 分 · Drive 驱赶 30 分 · Pen 入圈 10 分 ·
        Shed 群羊完整度 10 分（本游戏无分羊环节，按脱群/压迫失误考核）。
        每道门漏一只羊扣 1 分，门序错误扣 2 分，脱群满 2 秒扣 1 分，贴脸压迫每秒扣 0.5 分；
        超时每秒另扣 0.5 分。
      </p>
    </div>

    <div class="section-title">开始</div>
    <div class="row wrap" style="margin-bottom:24px">
      <button class="primary" id="start-btn">开始比赛</button>
      <button id="debug-btn">进入羊群行为调试页</button>
      <button id="results-btn">查看历史成绩</button>
    </div>

    ${
      history.length > 0
        ? `<div class="section-title">最近成绩</div>
           <div class="card">
             <table class="score">
               <thead><tr><th>赛场</th><th>脾性</th><th class="num">得分</th><th class="num">用时</th><th>结果</th></tr></thead>
               <tbody>
                 ${history
                   .slice(0, 5)
                   .map(
                     (h) => `
                   <tr>
                     <td>${h.course.name}</td>
                     <td>${h.temperament}</td>
                     <td class="num">${h.score.total}</td>
                     <td class="num">${h.score.timeUsed.toFixed(0)}s</td>
                     <td>${h.score.finished ? '<span class="pill good">全部入圈</span>' : '<span class="pill bad">未完成</span>'}</td>
                   </tr>`,
                   )
                   .join('')}
               </tbody>
             </table>
           </div>`
        : ''
    }
  `;

  const state: Selection = { ...sel };
  const persist = (): void =>
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

  root.querySelectorAll<HTMLElement>('[data-course]').forEach((el) => {
    el.addEventListener('click', () => {
      state.courseId = el.dataset.course as string;
      root
        .querySelectorAll('[data-course]')
        .forEach((n) => n.classList.toggle('selected', n === el));
      persist();
    });
  });

  root.querySelectorAll<HTMLElement>('[data-temp]').forEach((el) => {
    el.addEventListener('click', () => {
      state.temperament = el.dataset.temp as TemperamentId;
      root
        .querySelectorAll('[data-temp]')
        .forEach((n) => n.classList.toggle('selected', n === el));
      persist();
    });
  });

  root.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
    el.addEventListener('click', () => {
      state.sheepCount = Number(el.dataset.count);
      root
        .querySelectorAll('[data-count]')
        .forEach((n) => n.classList.toggle('active', n === el));
      persist();
    });
  });

  root.querySelector('#start-btn')?.addEventListener('click', () => {
    persist();
    navigate('#/trial');
  });
  root.querySelector('#debug-btn')?.addEventListener('click', () => {
    persist();
    navigate('#/trial?debug=1');
  });
  root.querySelector('#results-btn')?.addEventListener('click', () => {
    navigate('#/results');
  });
}

export function getSelectedCourse(): CourseDef {
  const sel = loadSelection();
  return COURSES.find((c) => c.id === sel.courseId) ?? COURSES[0];
}

export function getSelection(): Selection {
  return loadSelection();
}
