export type Route =
  | { name: 'select' }
  | { name: 'trial'; debug?: boolean }
  | { name: 'results' };

export function parseHash(): Route {
  const hash = window.location.hash.replace(/^#\/?/, '');
  const [name, query] = hash.split('?');
  const params = new URLSearchParams(query ?? '');
  switch (name) {
    case 'trial':
      return { name: 'trial', debug: params.get('debug') === '1' };
    case 'results':
      return { name: 'results' };
    case 'select':
    default:
      return { name: 'select' };
  }
}

export function navigate(path: string): void {
  window.location.hash = path;
}

export function onRouteChange(fn: (r: Route) => void): () => void {
  const handler = (): void => fn(parseHash());
  window.addEventListener('hashchange', handler);
  return () => window.removeEventListener('hashchange', handler);
}
