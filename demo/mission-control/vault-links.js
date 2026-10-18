// Native Vault destinations share one confined path builder and one local mark.
(function (scope) {
  'use strict';
  const VAULT = 'synthetic-demo';
  const FACETS = [['M13 2L10 12 3 10Z', '.32'], ['M3 10L10 12 14 22 5 18Z', '.72'], ['M13 2L19 5 21 14 14 22 10 12Z', '.5']];
  function href(reference, anchor = '') {
    if (typeof reference !== 'string' || typeof anchor !== 'string' || /[\x00-\x1f\x7f]/.test(reference)) return '';
    const parts = reference.trim().split('#');
    const note = parts.shift().replace(/\\/g, '/');
    const fragment = anchor || parts.join('#');
    if (!note || /[\x00-\x1f\x7f:<>"|?*]/.test(note) || note.startsWith('/')
      || note.split('/').some(part => !part || part.startsWith('.') || /[. ]$/.test(part))
      || /[\x00-\x1f\x7f]/.test(fragment)) return '';
    return scope.MISSION_CONTROL_DEMO.sourceHref(note, fragment);
  }
  function isOpen(value) {
    if (scope.MISSION_CONTROL_DEMO) return false;
    try {
      const address = new URL(value);
      return address.protocol === 'obsidian:' && address.hostname === 'open' && !address.username && !address.password
        && !address.hash && address.pathname === '' && address.searchParams.getAll('vault').length === 1
        && address.searchParams.get('vault') === VAULT && address.searchParams.getAll('file').length === 1
        && [...address.searchParams.keys()].every(key => ['vault', 'file'].includes(key))
        && Boolean(href(address.searchParams.get('file')));
    } catch { return false; }
  }
  function icon() {
    const document = scope.document || globalThis.document;
    if (!document?.createElementNS) return null;
    const namespace = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(namespace, 'svg');
    for (const [name, value] of Object.entries({ viewBox: '0 0 24 24', class: 'vault-icon', 'aria-hidden': 'true', focusable: 'false', fill: 'currentColor', 'stroke-linejoin': 'round' })) svg.setAttribute(name, value);
    for (const [d, opacity] of FACETS) { const path = document.createElementNS(namespace, 'path'); path.setAttribute('d', d); path.setAttribute('fill-opacity', opacity); svg.append(path); }
    const outline = document.createElementNS(namespace, 'path');
    for (const [name, value] of Object.entries({ d: 'M13 2L19 5 21 14 14 22 5 18 3 10Z', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.25' })) outline.setAttribute(name, value);
    svg.append(outline);
    return svg;
  }
  function decorate(anchor) {
    if (!anchor || !isOpen(anchor.getAttribute?.('href'))) return anchor;
    if (!anchor.querySelector?.('.vault-icon')) { const mark = icon(); if (mark) anchor.prepend(mark); }
    anchor.classList?.add('vault-link');
    return anchor;
  }
  scope.SECOND_BRAIN_VAULT = Object.freeze({ href, isOpen, icon, decorate });
})(typeof window === 'undefined' ? globalThis : window);
