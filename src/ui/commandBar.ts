import type { WhistleCommand } from '../shared/types';
import type { SimClient } from '../render/simClient';

const COMMANDS: {
  cmd: WhistleCommand;
  label: string;
  en: string;
  key: string;
  hint: string;
}[] = [
  { cmd: 'come-by', label: '绕左', en: 'Come-by', key: 'Q', hint: '顺时针包抄羊群左侧' },
  { cmd: 'away-to-me', label: '绕右', en: 'Away to me', key: 'E', hint: '逆时针包抄羊群右侧' },
  { cmd: 'walk-on', label: '靠近', en: 'Walk on', key: 'W', hint: '从正后方缓步压迫推进' },
  { cmd: 'lie-down', label: '停', en: 'Lie down', key: 'S', hint: '原地趴下，让羊群冷静' },
  { cmd: 'recall', label: '召回', en: "That'll do", key: 'R', hint: '回到指挥位' },
];

export interface CommandBarHandle {
  setActive(cmd: WhistleCommand | null): void;
  destroy: () => void;
}

/** 哨音命令栏：按钮 + 键盘快捷键 */
export function mountCommandBar(
  container: HTMLElement,
  client: SimClient,
): CommandBarHandle {
  container.innerHTML = `
    <div class="whistle-grid">
      ${COMMANDS.map(
        (c) => `
        <button data-cmd="${c.cmd}" title="${c.hint}（快捷键 ${c.key}）">
          ${c.label}<span class="cmd-en">${c.en} · <span class="kbd">${c.key}</span></span>
        </button>`,
      ).join('')}
    </div>
    <p class="muted" style="margin-top:8px">
      狗听到哨音后按自身速度、加速度和转向极限跑过去，连按新哨音会立即改变意图。
    </p>
  `;

  const buttons = new Map<WhistleCommand, HTMLButtonElement>();
  container.querySelectorAll<HTMLButtonElement>('[data-cmd]').forEach((btn) => {
    const cmd = btn.dataset.cmd as WhistleCommand;
    buttons.set(cmd, btn);
    btn.addEventListener('click', () => client.command(cmd));
  });

  const onKey = (e: KeyboardEvent): void => {
    if (e.target instanceof HTMLInputElement) return;
    const hit = COMMANDS.find((c) => c.key === e.key.toUpperCase());
    if (hit) {
      e.preventDefault();
      client.command(hit.cmd);
      buttons.get(hit.cmd)?.classList.add('active');
      window.setTimeout(
        () => buttons.get(hit.cmd)?.classList.remove('active'),
        180,
      );
    }
  };
  window.addEventListener('keydown', onKey);

  return {
    setActive(cmd: WhistleCommand | null): void {
      buttons.forEach((btn, key) =>
        btn.classList.toggle('active', key === cmd),
      );
    },
    destroy(): void {
      window.removeEventListener('keydown', onKey);
      container.innerHTML = '';
    },
  };
}
