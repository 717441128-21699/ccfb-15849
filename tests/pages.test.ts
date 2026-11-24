// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest';
import { renderResultsPage } from '../src/ui/resultsPage';
import { renderSelectPage } from '../src/ui/selectPage';
import { COURSES } from '../src/shared/courses';
import { TEMPERAMENT_LIST } from '../src/shared/constants';
import type { TrialSession } from '../src/shared/session';

function mockSession(): TrialSession {
  return {
    course: COURSES[0],
    temperament: 'skittish',
    sheepCount: 8,
    debugMode: false,
    endedAt: Date.now(),
    score: {
      total: 82.5,
      phases: [
        { key: 'outrun', name: '围跑 Outrun', max: 20, deductions: 1, score: 19 },
        { key: 'lift', name: '起步 Lift', max: 10, deductions: 2, score: 8 },
        { key: 'fetch', name: '赶回 Fetch', max: 20, deductions: 2, score: 18 },
        { key: 'drive', name: '驱赶 Drive', max: 30, deductions: 0, score: 30 },
        { key: 'pen', name: '入圈 Pen', max: 10, deductions: 4, score: 6 },
        { key: 'shed', name: '群羊完整度 Shed(改编)', max: 10, deductions: 3, score: 7 },
      ],
      faults: [
        { time: 45, phase: 'lift', type: 'rough-lift', detail: '起步平均压力 0.62，羊群受惊炸群', points: 2 },
        { time: 78, phase: 'fetch', type: 'missed-gate', detail: '第 1 道门有 2 只羊未通过', points: 2 },
        { time: 240, phase: 'pen', type: 'unpenned', detail: '2 只羊未能在时限内入圈', points: 4 },
      ],
      timeUsed: 265,
      timeLimit: 240,
      timePenalty: 12.5,
      overtime: 25,
      finished: false,
      pennedCount: 6,
      sheepCount: 8,
      gatesCleared: 2,
      gateCount: 3,
    },
  };
}

describe('成绩页 renderResultsPage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    document.body.innerHTML = '<div id="app"></div>';
  });

  it('无会话时显示空状态引导', () => {
    const root = document.querySelector('#app') as HTMLElement;
    renderResultsPage(root);
    expect(root.textContent).toContain('还没有完成的比赛');
    expect(root.querySelector('#go-select')).not.toBeNull();
  });

  it('有会话时渲染总分、ISDS 六个环节和失误明细', () => {
    sessionStorage.setItem(
      'sheepdog-trial-session',
      JSON.stringify(mockSession()),
    );
    const root = document.querySelector('#app') as HTMLElement;
    renderResultsPage(root);

    // 总分
    expect(root.querySelector('.big-score')?.textContent).toBe('82.5');
    // 六个 ISDS 环节都在
    const rows = root.querySelectorAll('table.score tbody tr');
    expect(rows.length).toBe(7); // 6 环节 + 时间罚分行
    expect(root.textContent).toContain('围跑 Outrun');
    expect(root.textContent).toContain('驱赶 Drive');
    // 满分对账：20+10+20+30+10+10
    const maxes = Array.from(root.querySelectorAll('table.score td.num'))
      .map((td) => td.textContent);
    expect(maxes.join(' ')).toContain('20');
    // 失误明细
    expect(root.textContent).toContain('羊群受惊炸群');
    expect(root.textContent).toContain('未能在时限内入圈');
    // 超时提示
    expect(root.textContent).toContain('超时 25s');
  });
});

describe('选择页 renderSelectPage', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '<div id="app"></div>';
  });

  it('渲染全部赛场、脾性和数量选项', () => {
    const root = document.querySelector('#app') as HTMLElement;
    renderSelectPage(root);
    // 三个赛场
    COURSES.forEach((c) => {
      expect(root.textContent).toContain(c.name);
    });
    // 四种脾性
    TEMPERAMENT_LIST.forEach((t) => {
      expect(root.textContent).toContain(t.name);
    });
    // 开始/调试/成绩入口
    expect(root.querySelector('#start-btn')).not.toBeNull();
    expect(root.querySelector('#debug-btn')).not.toBeNull();
    expect(root.querySelector('#results-btn')).not.toBeNull();
  });

  it('点击赛场卡片会更新选中态', () => {
    const root = document.querySelector('#app') as HTMLElement;
    renderSelectPage(root);
    const cards = root.querySelectorAll<HTMLElement>('[data-course]');
    expect(cards.length).toBe(COURSES.length);
    const second = cards[1];
    second.click();
    expect(second.classList.contains('selected')).toBe(true);
    // 已持久化
    expect(localStorage.getItem('sheepdog-trial-selection')).toContain(
      COURSES[1].id,
    );
  });
});
