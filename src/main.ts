import './styles.css';
import { onRouteChange, parseHash, type Route } from './ui/router';
import { renderSelectPage } from './ui/selectPage';
import { renderTrialPage } from './ui/trialPage';
import { renderResultsPage } from './ui/resultsPage';

const root = document.querySelector('#app') as HTMLElement;

function render(route: Route): void {
  // 清理上一个页面挂载的资源（Worker、事件等）
  const cleanup = (root as HTMLElement & { __cleanup?: () => void }).__cleanup;
  if (cleanup) {
    cleanup();
    delete (root as HTMLElement & { __cleanup?: () => void }).__cleanup;
  }
  root.innerHTML = '';

  switch (route.name) {
    case 'trial':
      renderTrialPage(root, route.debug ?? false);
      break;
    case 'results':
      renderResultsPage(root);
      break;
    case 'select':
    default:
      renderSelectPage(root);
      break;
  }

  // 导航高亮
  document.querySelectorAll('.topbar nav a').forEach((a) => {
    const el = a as HTMLAnchorElement;
    el.classList.toggle(
      'active',
      el.getAttribute('href') === window.location.hash,
    );
  });
}

if (!window.location.hash) {
  window.location.hash = '#/select';
}
render(parseHash());
onRouteChange(render);
