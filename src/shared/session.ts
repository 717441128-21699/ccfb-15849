import type { CourseDef, ScoreResultLike, TemperamentId } from './types';

/** 一次比赛的会话信息，在页面间通过 sessionStorage 传递 */
export interface TrialSession {
  course: CourseDef;
  temperament: TemperamentId;
  sheepCount: number;
  score: ScoreResultLike;
  /** 调试模式下的比赛不计入正式榜 */
  debugMode: boolean;
  endedAt: number;
}

const KEY = 'sheepdog-trial-session';
const HISTORY_KEY = 'sheepdog-trial-history';

export function saveSession(session: TrialSession): void {
  sessionStorage.setItem(KEY, JSON.stringify(session));
  const history = loadHistory();
  history.unshift(session);
  sessionStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 20)));
}

export function loadSession(): TrialSession | null {
  const raw = sessionStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as TrialSession) : null;
}

export function loadHistory(): TrialSession[] {
  const raw = sessionStorage.getItem(HISTORY_KEY);
  return raw ? (JSON.parse(raw) as TrialSession[]) : [];
}
