// Data-independent navigation shared by Mission Control and the source reader.
(function () {
  'use strict';
  const t = (de, en) => window.UI_LANGUAGE ? window.UI_LANGUAGE.t(de, en) : de;
  const BASE = new URL('.', document.currentScript.src);
  const SCHEMA_KEY = 'mission-control-demo-farbschema';
  const VIEW_SETTINGS_KEY = 'mission-control-demo-view-settings';
  const DEFAULT_VIEW = 'uebersicht';
  const overviewChildren = new Set(['fragen', 'wer', 'frische', 'kalender']);
  const routes = Object.freeze([
    ['uebersicht', 'index.html', t("Übersicht", "Overview")],
    ['kalender', 'kalender.html', t("Kalender", "Calendar")],
    ['fragen', 'fragen.html', t("Dein Beitrag", "Your contribution")],
    ['wer', 'wer.html', t("Zuständigkeiten", "Responsibilities")],
    ['frische', 'frische.html', t("Quellenvergleich", "Source comparison")],
    ['strategien', 'strategien.html', t("Strategien", "Strategies")],
    ['projekte', 'projekte.html', t("Projekte", "Projects")],
    ['agenten', 'operatoren.html', t("Operatoren", "Operators")],
    ['wissen', window.SECOND_BRAIN_VAULT.href('HOME'), t("Wissen", "Knowledge")],
    ['monitor', 'monitor.html', 'Monitor'],
  ].map(([key, file, label]) => Object.freeze({ key, file, label })));
  function validViewSettings(value) {
    return value && typeof value === 'object' && !Array.isArray(value) && value.version === 1
      && ['order', 'hidden'].every(key => value[key] === undefined || Array.isArray(value[key])
        && value[key].length <= 1000 && value[key].every(item => typeof item === 'string'));
  }
  function normalizeViewSettings(value, catalog = routes) {
    const known = new Set(catalog.map(route => route.key));
    const input = validViewSettings(value) ? value : {};
    const order = [...new Set([...(input.order || []).filter(key => known.has(key)), ...known])];
    const hidden = [...new Set((input.hidden || []).filter(key => known.has(key) && key !== DEFAULT_VIEW))];
    return { version: 1, order, hidden };
  }
  function readViewSettings() {
    try {
      const raw = localStorage.getItem(VIEW_SETTINGS_KEY);
      if (raw === null) return { value: normalizeViewSettings(null), notice: '' };
      const parsed = JSON.parse(raw);
      if (!validViewSettings(parsed)) throw new Error('Unsupported view settings');
      return { value: normalizeViewSettings(parsed), notice: '' };
    } catch {
      return { value: normalizeViewSettings(null), notice: t("Gespeicherte Ansichtseinstellungen sind nicht lesbar. Die vollständige Standardnavigation wird angezeigt.", "Saved view settings cannot be read. The complete default navigation is shown.") };
    }
  }
  const initialSettings = readViewSettings();
  let viewSettings = initialSettings.value;
  let settingsNotice = initialSettings.notice;
  const headers = new Set();
  const overviewNavigations = new Set();
  let headerSequence = 0;
  function saveViewSettings(value) {
    viewSettings = normalizeViewSettings(value);
    try {
      const text = JSON.stringify(viewSettings);
      localStorage.setItem(VIEW_SETTINGS_KEY, text);
      if (localStorage.getItem(VIEW_SETTINGS_KEY) !== text) throw new Error('View settings readback failed');
      settingsNotice = t("Navigation für diesen Browser gespeichert.", "Navigation saved for this browser.");
    } catch {
      settingsNotice = t("Nur auf dieser Seite angewendet. Der Browser konnte die Einstellungen nicht speichern.", "Applied on this page only. The browser could not save the settings.");
    }
  }
  function routeBase(value) {
    if (value === null || value === undefined) return BASE;
    try {
      const candidate = new URL(value, BASE);
      if (candidate.origin === BASE.origin && candidate.protocol === BASE.protocol
        && candidate.pathname.endsWith('/') && !candidate.search && !candidate.hash
        && !candidate.username && !candidate.password) return candidate;
    } catch { /* Invalid deployment configuration falls back to the script directory. */ }
    return BASE;
  }
  const href = (key, base) => {
    const route = routes.find((item) => item.key === (key === 'lage' ? 'uebersicht' : key));
    if (!route) return '';
    const target = new URL(route.file, routeBase(base)).href;
    return window.UI_LANGUAGE ? window.UI_LANGUAGE.href(target) : target;
  };
  function element(tag, attributes = {}, text = '') {
    const node = document.createElement(tag);
    for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
    if (text) node.textContent = text;
    return node;
  }
  function subnavigation({ label = t('Unteransichten', 'Subviews'), current = '', items = [] } = {}) {
    const navigation = element('nav', { class: 'app-subnav', 'aria-label': label });
    for (const item of items) {
      if (!item || typeof item.key !== 'string' || typeof item.label !== 'string' || !item.href) continue;
      let target;
      try { target = new URL(item.href, BASE); } catch { continue; }
      if (target.origin !== BASE.origin || target.protocol !== BASE.protocol || target.username || target.password) continue;
      const anchor = element('a', { href: window.UI_LANGUAGE ? window.UI_LANGUAGE.href(target.href) : target.href, 'data-subnav-key': item.key }, item.label);
      if (item.current === true || item.key === current) anchor.setAttribute('aria-current', 'page');
      if (item.hiddenCurrent) {
        anchor.setAttribute('data-hidden-current', 'true');
        anchor.setAttribute('aria-label', item.label + t(', in deiner Navigation ausgeblendet, hier geöffnet', ', hidden in your navigation, open here'));
      }
      if (typeof item.onActivate === 'function') anchor.addEventListener('click', event => {
        if (event.defaultPrevented || event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        item.onActivate(event);
      });
      navigation.append(anchor);
    }
    return navigation;
  }
  function overviewNavigation({ current = 'alle', hrefForFocus, base } = {}) {
    const selected = current === 'kalender' ? 'kalender' : 'alle';
    const labels = [
      ['alle', t('Projekte', 'Projects')],
      ['kalender', t('Kalender', 'Calendar')],
    ];
    const navigation = subnavigation({ label: t('Übersicht: Unteransichten', 'Overview subviews'), current: selected, items: labels.map(([key, label]) => {
      if (overviewChildren.has(key)) return { key, label, href: href(key, base), hiddenCurrent: viewSettings.hidden.includes(key) };
      if (hrefForFocus) return { key, label, href: hrefForFocus(key) };
      const target = new URL(href(DEFAULT_VIEW, base));
      if (key !== 'alle') target.searchParams.set('fokus', key);
      return { key, label, href: target.href };
    }) });
    navigation.setAttribute('class', 'app-subnav strip overview-jumps');
    for (const anchor of navigation.children) {
      const key = anchor.getAttribute('data-subnav-key');
      if (!overviewChildren.has(key)) anchor.setAttribute('data-focus', key);
      else anchor.hidden = viewSettings.hidden.includes(key) && selected !== key;
    }
    overviewNavigations.add(navigation);
    return navigation;
  }
  function storedTheme() {
    try { return JSON.parse(localStorage.getItem(SCHEMA_KEY)) === 'dark' ? 'dark' : 'light'; }
    catch { return 'light'; }
  }
  function applyTheme(value) {
    document.documentElement.setAttribute('data-theme', value === 'dark' ? 'dark' : 'light');
  }
  applyTheme(storedTheme());

  const signs = {
    moon: ['M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z'],
    sun: ['M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8Z', 'M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4'],
  };
  function themeSign(form) {
    const namespace = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(namespace, 'svg');
    for (const [name, value] of Object.entries({ viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })) svg.setAttribute(name, value);
    for (const value of signs[form]) {
      const line = document.createElementNS(namespace, 'path');
      line.setAttribute('d', value);
      svg.append(line);
    }
    return svg;
  }
  function showTheme(button) {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    const label = dark ? t("Hell schalten", "Switch to light mode") : t("Dunkel schalten", "Switch to dark mode");
    button.setAttribute('aria-label', label);
    button.title = label;
    button.replaceChildren(themeSign(dark ? 'sun' : 'moon'));
  }
  function themeButton() {
    const button = element('button', { type: 'button', class: 'farbschema' });
    button.addEventListener('click', () => {
      const target = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(target);
      try { localStorage.setItem(SCHEMA_KEY, JSON.stringify(target)); }
      catch { /* The current page remains switchable when storage is unavailable. */ }
      showTheme(button);
    });
    showTheme(button);
    return button;
  }
  function create({ view = '', status = null, base } = {}) {
    const header = element('header', { class: 'kopf app-header' });
    const title = element('h1');
    title.append(element('a', { class: 'heim', href: href(DEFAULT_VIEW, base), title: t("Zur Übersicht", "Back to overview") }, 'Mission Control'));
    header.append(title);
    if (status) header.append(status);
    const navigation = element('nav', { class: 'app-nav', 'aria-label': t("Sichten", "Views") });
    const settings = element('details', { class: 'app-view-settings' });
    const summary = element('summary', {}, t("Ansichten anpassen", "Customize views"));
    const panel = element('div', { class: 'app-view-settings-panel' });
    const list = element('ol', { class: 'app-view-settings-list' });
    const notice = element('p', { class: 'app-view-settings-status', role: 'status' });
    const reset = element('button', { type: 'button', class: 'app-view-reset' }, t("Vollständigen Standard wiederherstellen", "Restore all default views"));
    const instance = ++headerSequence;
    const controlId = (key, kind) => 'mc-view-' + instance + '-' + key + '-' + kind;
    const renderNavigation = () => {
      navigation.replaceChildren();
      for (const key of viewSettings.order) {
        if (overviewChildren.has(key)) continue;
        const route = routes.find(item => item.key === key);
        const hidden = viewSettings.hidden.includes(key);
        if (hidden && key !== view) continue;
        const anchor = element('a', { href: href(key, base), 'data-view': key }, route.label);
        window.SECOND_BRAIN_VAULT.decorate(anchor);
        if (key === (overviewChildren.has(view) ? DEFAULT_VIEW : view)) anchor.setAttribute('aria-current', 'page');
        if (hidden) {
          anchor.setAttribute('data-hidden-current', 'true');
          anchor.setAttribute('aria-label', route.label + t(", in deiner Navigation ausgeblendet, hier geöffnet", ", hidden in your navigation, open here"));
          anchor.title = t("In deiner Navigation ausgeblendet. Die direkt geöffnete Ansicht bleibt hier erreichbar.", "Hidden in your navigation. This directly opened view remains accessible here.");
          anchor.append(element('span', { class: 'app-view-current-note' }, t("hier geöffnet", "open here")));
        }
        navigation.append(anchor);
      }
    };
    const restoreControl = focus => {
      if (!focus) return;
      const node = document.getElementById(controlId(focus.key, focus.kind));
      const fallback = ['visible', 'up', 'down'].map(kind => document.getElementById(controlId(focus.key, kind))).find(item => item && !item.disabled);
      (node && !node.disabled ? node : fallback || summary).focus({ preventScroll: true });
    };
    const renderSettings = focus => {
      list.replaceChildren();
      const configurableOrder = viewSettings.order.filter(key => !overviewChildren.has(key) || key === 'kalender');
      const movableOrder = viewSettings.order.filter(key => !overviewChildren.has(key));
      for (const key of configurableOrder) {
        const route = routes.find(item => item.key === key);
        const row = element('li', { 'data-view-setting': key });
        const checkbox = element('input', { type: 'checkbox', id: controlId(key, 'visible'), 'data-view-key': key, 'data-view-control': 'visible' });
        checkbox.checked = !viewSettings.hidden.includes(key);
        checkbox.disabled = key === DEFAULT_VIEW;
        const label = element('label', { for: controlId(key, 'visible') });
        label.append(checkbox, element('span', {}, route.label));
        checkbox.addEventListener('change', () => {
          const hidden = viewSettings.hidden.filter(item => item !== key);
          if (!checkbox.checked) hidden.push(key);
          saveViewSettings({ ...viewSettings, hidden });
          refreshHeaders({ key, kind: 'visible' });
        });
        row.append(label);
        if (key !== 'kalender') {
          const index = movableOrder.indexOf(key);
          for (const [kind, direction, sign] of [['up', -1, '↑'], ['down', 1, '↓']]) {
            const button = element('button', { type: 'button', id: controlId(key, kind), 'aria-label': route.label + (direction < 0 ? t(" nach oben", " move up") : t(" nach unten", " move down")), 'data-view-key': key, 'data-view-control': kind }, sign);
            const neighbor = movableOrder[index + direction];
            button.disabled = !neighbor;
            button.addEventListener('click', () => {
              if (!neighbor) return;
              const order = [...viewSettings.order];
              const from = order.indexOf(key);
              const to = order.indexOf(neighbor);
              [order[from], order[to]] = [order[to], order[from]];
              saveViewSettings({ ...viewSettings, order });
              refreshHeaders({ key, kind });
            });
            row.append(button);
          }
        }
        list.append(row);
      }
      notice.textContent = settingsNotice;
      restoreControl(focus);
    };
    const refresh = focus => { renderNavigation(); renderSettings(focus); };
    headers.add({ header, refresh });
    reset.addEventListener('click', () => { saveViewSettings(null); refreshHeaders(); reset.focus(); });
    settings.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || !settings.open) return;
      event.preventDefault(); event.stopPropagation(); settings.open = false; summary.focus();
    });
    panel.append(element('p', {}, t("Diese Auswahl gilt für die Navigation dieses Browsers. Ausgeblendete Ansichten bleiben über ihre Adresse erreichbar. Übersicht bleibt immer sichtbar.", "These settings apply to this browser. Hidden views remain accessible by their address. Overview always stays visible.")), list, reset, notice);
    settings.append(summary, panel);
    const preferences = element('details', { class: 'app-settings' });
    const preferencesSummary = element('summary', {}, t('Einstellungen', 'Settings'));
    const preferencesPanel = element('div', { class: 'app-settings-panel' });
    const controls = element('div', { class: 'app-settings-preferences' });
    const theme = element('div', { class: 'app-settings-theme' });
    theme.append(element('span', {}, t('Darstellung', 'Appearance')), themeButton());
    controls.append(theme, ...(window.UI_LANGUAGE ? [window.UI_LANGUAGE.selector()] : []));
    preferencesPanel.append(controls, settings);
    preferences.append(preferencesSummary, preferencesPanel);
    preferences.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || !preferences.open) return;
      event.preventDefault(); event.stopPropagation(); preferences.open = false; preferencesSummary.focus();
    });
    refresh();
    header.append(navigation, preferences);
    if (overviewChildren.has(view)) header.append(overviewNavigation({ current: view, base }));
    return header;
  }
  function refreshHeaders(focus = null) {
    for (const entry of headers) {
      // Detached old headers can be replaced by the shared shell; keep no active handlers for them.
      if (entry.header.isConnected === false) { headers.delete(entry); continue; }
      entry.refresh(focus);
    }
    for (const navigation of overviewNavigations) {
      if (navigation.isConnected === false) { overviewNavigations.delete(navigation); continue; }
      for (const anchor of navigation.children) {
        const key = anchor.getAttribute('data-subnav-key');
        if (!overviewChildren.has(key)) continue;
        const hidden = viewSettings.hidden.includes(key);
        const current = anchor.getAttribute('aria-current') === 'page';
        anchor.hidden = hidden && !current;
        if (hidden && current) {
          anchor.setAttribute('data-hidden-current', 'true');
          anchor.setAttribute('aria-label', anchor.textContent + t(', in deiner Navigation ausgeblendet, hier geöffnet', ', hidden in your navigation, open here'));
        } else {
          anchor.removeAttribute('data-hidden-current');
          anchor.removeAttribute('aria-label');
        }
      }
    }
  }
  function information(label, meaning, { compact = false } = {}) {
    const info = element('details', { class: 'mc-info' });
    const summary = element('summary');
    if (compact) summary.setAttribute('aria-label', label);
    else if (typeof label === 'string') summary.append(document.createTextNode(label));
    else summary.append(label);
    if (compact) summary.append(element('span', { class: 'mc-info-mark', 'aria-hidden': 'true' }, 'i'));
    const text = element('p', { class: 'mc-info-text' }, meaning);
    info.append(summary, text);
    // Native details remains the tap/Enter fallback. Focus and mouse hover
    // expose the same text without adding a second interaction component.
    summary.addEventListener('focus', () => { if (summary.matches(':focus-visible')) info.open = true; });
    summary.addEventListener('pointerenter', (event) => { if (event.pointerType === 'mouse') info.open = true; });
    info.addEventListener('pointerleave', () => { if (!info.contains(document.activeElement)) info.open = false; });
    info.addEventListener('focusout', (event) => { if (!info.contains(event.relatedTarget)) info.open = false; });
    info.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || !info.open) return;
      event.preventDefault();
      event.stopPropagation();
      info.open = false;
      summary.focus({ preventScroll: true });
    });
    return info;
  }
  function mainBypass(main) {
    // The knowledge reader already provides its narrower document-selection bypass.
    if (document.querySelector('body > a.sprung, body > .mc-skip')) return;
    if (!main.id) {
      let id = 'mc-hauptinhalt';
      while (document.getElementById(id)) id += '-';
      main.id = id;
    }
    if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
    const skip = element('a', { class: 'mc-skip', href: '#' + encodeURIComponent(main.id) }, t("Zum Hauptinhalt", "Skip to main content"));
    skip.addEventListener('click', (event) => {
      if (event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      // A bypass moves the keyboard reading position without replacing an exact return fragment.
      event.preventDefault();
      main.focus({ preventScroll: true });
      main.scrollIntoView({ block: 'start' });
    });
    document.body.prepend(skip);
  }
  function mountSidebar(main, { title = t("Einordnung", "Context"), filter = null, scope = '', filterKey = '', legend = [], legendContent = null } = {}) {
    mainBypass(main);
    const panel = element('div', { class: 'mc-sidebar-panel' });
    if (filter) {
      const heading = element('div', { class: 'mc-sidebar-heading' });
      heading.append(element('h2', { class: 'mc-sidebar-title' }, t("Kategorien", "Categories")));
      if (scope || filterKey) {
        const help = information(t("Kategorien: Filter, Zahl und Punkt", "Categories: filter, count and dot"), [scope, filterKey].filter(Boolean).join(' '), { compact: true });
        help.classList.add('mc-category-info');
        heading.append(help);
      }
      panel.append(heading, filter);
    }
    else if (legend.length || legendContent) panel.append(element('h2', { class: 'mc-sidebar-title' }, title));
    else if (scope) panel.append(information(title, scope));
    if (legend.length) {
      const list = element('div', { class: 'mc-sidebar-legend' });
      for (const [term, meaning, kind, sample] of legend) {
        const label = element('span', { class: 'mc-info-label' });
        if (kind === 'human') label.append(element('span', { class: 'mc-legend-color mc-legend-human', 'aria-hidden': 'true' }));
        else if (sample) label.append(element('span', { class: 'mc-legend-sample', 'aria-hidden': 'true' }, sample));
        label.append(document.createTextNode(term));
        list.append(information(label, meaning));
      }
      panel.append(list);
    }
    if (legendContent) panel.append(legendContent);
    const aside = element('aside', { id: 'seitenleiste', class: 'mc-sidebar', 'aria-label': filter ? t("Kategorien und Bedeutung", "Categories and meaning") : title });
    aside.append(panel);
    let workspace = main.parentElement;
    if (!workspace.classList.contains('mc-workspace')) {
      workspace = element('div', { class: 'mc-workspace' });
      main.before(workspace);
      workspace.append(main);
    }
    workspace.querySelector(':scope > .mc-sidebar')?.remove();
    workspace.prepend(aside);
    workspace.parentElement.classList.add('mc-shell-host');
    return { aside, selection: null };
  }
  window.addEventListener('storage', (event) => {
    if (event.key === VIEW_SETTINGS_KEY || event.key === null) {
      const next = readViewSettings();
      viewSettings = next.value;
      settingsNotice = next.notice;
      const active = document.activeElement;
      const focus = active?.dataset?.viewKey ? { key: active.dataset.viewKey, kind: active.dataset.viewControl } : null;
      const routeKey = active?.dataset?.view;
      refreshHeaders(focus);
      if (routeKey) {
        const link = [...document.querySelectorAll('.app-nav a[data-view]')].find(node => node.dataset.view === routeKey);
        (link || document.querySelector('.app-settings > summary'))?.focus({ preventScroll: true });
      }
    }
    if (event.key !== SCHEMA_KEY && event.key !== null) return;
    applyTheme(storedTheme());
    for (const button of document.querySelectorAll('.app-header .farbschema')) showTheme(button);
  });
  window.SECOND_BRAIN_NAVIGATION = Object.freeze({ create, href, routes, normalizeViewSettings, mountSidebar, information, subnavigation, subnav: subnavigation, overviewNavigation });
})();
