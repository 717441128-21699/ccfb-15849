import { loadHistory, loadSession } from '../shared/session';
import { navigate } from './router';

export function renderResultsPage(root: HTMLElement): void {
  const session = loadSession();
  const history = loadHistory();

  if (!session) {
    root.innerHTML = `
      <div class="card" style="margin-top:40px;text-align:center">
        <h3>还没有完成的比赛</h3>
        <p class="muted">先去赛场选择页开始一场比赛吧。</p>
        <p style="margin-top:16px"><button class="primary" id="go-select">去选择赛场</button></p>
      </div>`;
    root.querySelector('#go-select')?.addEventListener('click', () =>
      navigate('#/select'),
    );
    return;
  }

  const score = session.score;
  const mins = Math.floor(score.timeUsed / 60);
  const secs = (score.timeUsed % 60).toFixed(0).padStart(2, '0');

  root.innerHTML = `
    <div class="topbar" style="margin-bottom:12px">
      <h1>比赛成绩 · ${session.course.name}</h1>
      <span class="pill">脾性：${session.temperament}</span>
      <span class="pill">${session.sheepCount} 只羊</span>
      <span style="flex:1"></span>
      <a href="#/select">再赛一场</a>
      <a href="#/trial?debug=1">调试页</a>
    </div>

    <div class="layout">
      <div>
        <div class="card" style="margin-bottom:16px">
          <div class="row" style="justify-content:space-between;align-items:flex-start">
            <div>
              <h3 style="margin-top:0">总分</h3>
              <div class="big-score">${score.total}</div>
              <p class="muted" style="margin-top:8px">
                ${
                  score.finished
                    ? '<span class="pill good">全部羊只入圈</span>'
                    : '<span class="pill bad">时限内未全部入圈</span>'
                }
                <span class="pill">用时 ${mins}:${secs} / 限 ${score.timeLimit}s</span>
                ${score.overtime > 0 ? `<span class="pill bad">超时 ${score.overtime}s，罚 ${score.timePenalty} 分</span>` : ''}
              </p>
            </div>
            <div style="text-align:right" class="muted">
              入圈 ${score.pennedCount}/${score.sheepCount}<br>
              过门 ${score.gatesCleared}/${score.gateCount}<br>
              失误 ${score.faults.length} 笔
            </div>
          </div>
        </div>

        <div class="card">
          <h3>ISDS 百分制分项</h3>
          <table class="score">
            <thead>
              <tr><th>环节</th><th class="num">满分</th><th class="num">扣分</th><th class="num">得分</th></tr>
            </thead>
            <tbody>
              ${score.phases
                .map(
                  (p) => `
                <tr>
                  <td>${p.name}</td>
                  <td class="num">${p.max}</td>
                  <td class="num" style="color:var(--danger)">${p.deductions.toFixed(1)}</td>
                  <td class="num"><b>${p.score.toFixed(1)}</b></td>
                </tr>`,
                )
                .join('')}
              <tr>
                <td>时间罚分</td>
                <td class="num">—</td>
                <td class="num" style="color:var(--danger)">${score.timePenalty.toFixed(1)}</td>
                <td class="num">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="panel">
        <h4>失误明细（ISDS fault 记账）</h4>
        ${
          score.faults.length === 0
            ? '<p class="muted">零失误，漂亮的一场！</p>'
            : `<ul class="fault-list" style="margin:0;padding:0">
                ${score.faults
                  .map(
                    (f) => `
                  <li>
                    <span class="pts">-${f.points.toFixed(1)}</span>
                    <b>${f.phase}</b> · ${f.time.toFixed(1)}s<br>
                    ${f.detail}
                  </li>`,
                  )
                  .join('')}
              </ul>`
        }
      </div>
    </div>

    ${
      history.length > 1
        ? `<div class="section-title">历史成绩（最近 20 场）</div>
           <div class="card">
             <table class="score">
               <thead><tr><th>时间</th><th>赛场</th><th>脾性</th><th class="num">得分</th><th class="num">用时</th><th>结果</th></tr></thead>
               <tbody>
                 ${history
                   .map((h) => {
                     const d = new Date(h.endedAt);
                     return `
                     <tr>
                       <td>${d.toLocaleString()}</td>
                       <td>${h.course.name}</td>
                       <td>${h.temperament}</td>
                       <td class="num">${h.score.total}</td>
                       <td class="num">${h.score.timeUsed.toFixed(0)}s</td>
                       <td>${h.score.finished ? '<span class="pill good">完成</span>' : '<span class="pill bad">未完成</span>'}</td>
                     </tr>`;
                   })
                   .join('')}
               </tbody>
             </table>
           </div>`
        : ''
    }
  `;
}
