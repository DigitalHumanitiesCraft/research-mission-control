// Keep the existing page renderers and exact source fragments under Overview addresses.
(function () {
  'use strict';
  const templates = new Set(['fragen', 'wer', 'frische', 'kalender']);
  const base = new URL('.', document.currentScript.src);
  const address = new URL(location.href);
  if (!address.pathname.startsWith(base.pathname)) return;
  const page = address.pathname.slice(base.pathname.length);
  const selected = address.searchParams.getAll('ansicht');
  if (['', 'index.html', 'lage.html'].includes(page)) {
    if (selected.length !== 1 || !templates.has(selected[0])) return;
    address.pathname = new URL(selected[0] + '.html', base).pathname;
    location.replace(address.href);
    return;
  }
  const key = page.replace(/\.html$/, '');
  if (!templates.has(key) || page !== key + '.html') return;
  address.pathname = new URL('index.html', base).pathname;
  if (selected.length !== 1 || selected[0] !== key) {
    const parameters = address.search.slice(1).split('&').filter(part => part && !new URLSearchParams(part).has('ansicht'));
    parameters.push('ansicht=' + key);
    address.search = '?' + parameters.join('&');
  }
  history.replaceState(history.state, '', address.href);
})();
