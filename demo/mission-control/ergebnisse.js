(function () {
  'use strict';
  const tr = (de, en) => window.UI_LANGUAGE ? window.UI_LANGUAGE.t(de, en) : de;
  const L = window.LEITSTAND;
  // Editorial reading aids bind to delivered wording. They carry no workflow state
  // and disappear when that wording no longer supports them.
  const readings = window.LEITSTAND_ERGEBNIS_EDITORIAL?.readings || [];
  function describe(task) {
    const result = L.voll(task.ergebnis || '');
    const found = result && readings.find(([operator, key, wording]) =>
      task.operator === operator && task.kennung === key && result === wording);
    if (found) return { title: found[3], judgement: found[4], editorial: true, result };
    return { title: result ? tr("Ergebnis ohne redaktionellen Kurztitel", "Output without editorial short title") : tr("Ergebnisbeschreibung fehlt", "Output description missing"),
      judgement: tr("Eine konkrete Beurteilungsfrage ist hier nicht erfasst. Ergebnis und Originalauftrag stehen im Detail.", "No specific review question is recorded here. The detail contains the output and original assignment."),
      editorial: false, result };
  }
  const returnNames = { 'index.html': tr("Zur Übersicht", "Back to overview"), 'fragen.html': tr("Zu Entscheiden", "Back to decisions"), 'operatoren.html': tr("Zum Auftrag", "Back to assignment"),
    'projekte.html': tr("Zum Projekt", "Back to project"), 'wer.html': tr("Zu Wer", "Back to people"), 'lage.html': tr("Zur Lage", "Back to overview"), 'strategien.html': tr("Zu Strategien", "Back to strategies") };
  function returnTarget(value) {
    if (typeof value !== 'string' || value.includes('\\') || /[\u0000-\u0020]/.test(value)) return null;
    const page = value.split(/[?#]/)[0];
    return Object.hasOwn(returnNames, page) ? { href: value, text: value === 'operatoren.html#aufstellung' ? tr("Zur Operatorenliste", "Back to operators") : returnNames[page] } : null;
  }
  function projectHref(project, from = '') {
    const params = new URLSearchParams({ projekt: project });
    const origin = returnTarget(from);
    if (origin) params.set('von', origin.href);
    return 'projekte.html?' + params;
  }
  function originAddress(trigger) {
    const url = new URL(location.href);
    url.searchParams.set('thema', window.LEITSTAND_SHELL?.filter() || '');
    url.hash = trigger;
    return (url.pathname.split('/').pop() || 'index.html') + url.search + url.hash;
  }
  function projectTaskId(project, task) {
    return 'projekt-auftrag-' + [project, task.operator, task.kennung].map(encodeURIComponent).join(':');
  }
  function projectReturn(task) {
    const project = task?.entryId;
    if (!project || task.vertragsfehler || !task.operator || !task.kennung || !L.entryById.has(project)) return null;
    if (window.PROJEKTE && !window.PROJEKTE.projekte?.some(item => item.id === project)) return null;
    const href = 'projekte.html?' + new URLSearchParams({ projekt: project }) + '#' + encodeURIComponent(projectTaskId(project, task));
    return { href, text: tr("Zum Projekt", "Back to project") };
  }
  function reviewHref(task, fragment = '', from = '') {
    const params = new URLSearchParams({ lane: task.operator, kennung: task.kennung });
    const current = new URL(location.href);
    const origin = returnTarget(from) || returnTarget((current.pathname.split('/').pop() || 'index.html') + current.search + current.hash);
    if (origin) params.set('von', origin.href);
    return 'abnahme.html?' + params + (fragment ? '#' + fragment : '');
  }
  const normalPath = (value) => String(value || '').replace(/\\/g, '/').replace(/\/+$/, '');
  function repositoryHref(value, coverage, project = '') {
    if (coverage?.schema !== 'second-brain-coverage-1') return '';
    const [raw, anchor = ''] = String(value || '').split('#');
    const path = normalPath(raw);
    if (!path || /(?:^|\/)\.\.(?:\/|$)/.test(path) || path.includes('\0')) return '';
    const matches = new Set();
    for (const mapping of coverage.repositories?.mappings || []) {
      if (mapping.status !== 'available' || mapping.clonePaths?.length !== 1) continue;
      for (const document of coverage.repositories?.documents || []) {
        if (!mapping.documentIds?.includes(document.id) || !/\.md$/i.test(document.path)) continue;
        const absolute = normalPath(coverage.roots?.cloneRoot) + '/' + normalPath(mapping.clonePaths[0]) + '/' + normalPath(document.path);
        if (path.toLowerCase() === absolute.toLowerCase()) matches.add(document.id);
      }
    }
    if (matches.size !== 1) return '';
    return '../research.html#' + new URLSearchParams({ view: 'context', source: [...matches][0], read: '1',
      ...(project ? { bezug: project } : {}), ...(anchor ? { anchor } : {}) });
  }
  let coverage = null;
  let loading = null;
  async function ready(items) {
    if (!items.some((item) => item.art === 'text' && /\.md(?:#|$)/i.test(item.text || ''))) return;
    if (!loading) loading = fetch('/api/research', { cache: 'no-store' }).then((response) => {
      if (!response.ok) throw new Error('Quellenregister nicht lesbar');
      return response.json();
    }).then((data) => { coverage = data; }).catch(() => {});
    await loading;
  }
  function href(item, project = '') {
    if (item?.art === 'text') return repositoryHref(item.text, coverage, project);
    if (!item?.href) return '';
    try {
      const target = new URL(item.href, location.href);
      if (target.protocol === 'obsidian:') return L.sourceReaderHref(target.searchParams.get('file'), project);
      if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password) return '';
      return item.href;
    } catch { return ''; }
  }
  function first(task) {
    if (introduction(task)?.table) return reviewHref(task, 'vorstellung');
    return (task.ergebnisZiele || []).map((item) => href(item, task.entryId || task.vorhaben || '')).find(Boolean)
      || reviewHref(task, 'ergebnis');
  }

  const introductions = window.LEITSTAND_ERGEBNIS_EDITORIAL?.introductions || [];
  function introduction(task) {
    return describe(task).editorial
      ? introductions.find((item) => item.operator === task.operator && item.kennung === task.kennung
        && (!item.projectId || item.projectId === (task.entryId || task.vorhaben))) || null
      : null;
  }
  function tableMarkdown(table) {
    const text = value => typeof value === 'string' && !/[\r\n]/.test(value);
    if (!table || !text(table.caption) || !Array.isArray(table.columns) || !table.columns.length
      || !table.columns.every(text) || !Array.isArray(table.rows) || !table.rows.length
      || !table.rows.every(row => Array.isArray(row) && row.length === table.columns.length && row.every(text))) {
      throw new Error(tr('Die Ergebnistabelle ist nicht lesbar.', 'The result table cannot be read.'));
    }
    const cell = value => value.replace(/\\/g, '\\\\').replace(/\|/g, '\\|');
    const line = cells => '| ' + cells.map(cell).join(' | ') + ' |';
    return [line(table.columns), line(table.columns.map(() => '---')), ...table.rows.map(line)].join('\n');
  }
  async function readIntroduction(item) {
    const response = await fetch('/api/source?' + new URLSearchParams({ path: item.path }), { cache: 'no-store' });
    if (!response.ok) throw new Error(tr('Die Ergebnisquelle ist gerade nicht lesbar.', 'The result source cannot be read right now.'));
    const source = await response.json();
    if (!source || typeof source !== 'object' || source.path !== item.path || typeof source.text !== 'string' || source.revision !== item.revision
      || !source.text.includes('## ' + item.heading) || !Array.isArray(item.passages) || !item.passages.every((passage) => source.text.includes(passage.text))
      || item.table && (!/^[a-f0-9]{64}$/.test(item.revision || '') || !source.text.split(/\r?\n/).includes('## ' + item.heading)
        || !source.text.includes(item.table.caption) || !source.text.replace(/\r\n/g, '\n').includes(tableMarkdown(item.table)))) {
      throw new Error(tr("Die Ergebnisquelle hat sich geändert. Die vorbereitete Vorstellung wird deshalb nicht angezeigt.", "The output source has changed. The prepared submission is therefore not shown."));
    }
    return source;
  }

  window.LEITSTAND_ERGEBNISSE = { describe, reviewHref, returnTarget, projectHref, originAddress, projectTaskId, projectReturn, repositoryHref, ready, href, first, introduction, readIntroduction, tableMarkdown };
})();
