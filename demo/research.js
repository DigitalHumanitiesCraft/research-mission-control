import './shell.js';
import './context.js';
import './research-paths.js';
import { buildWorkModel, sourceKind } from './research-work.js';
import { createResume, parseResume, serializeResume, compareResume } from './research-resume.js';
import { buildModel, selectNodes, partition, neighborhood, parseBoard, sourceAddress, relationContext } from './research-model.js';
const uiResearch = (de, en) => globalThis.window?.UI_LANGUAGE?.t(de, en) ?? de;

const $ = id => document.getElementById(id);
const space = $('research-space'), panel = $('research-inspector');
const boardKey = 'mission-control-demo.research-board.v1';
const views = new Set(['overview', 'context', 'atlas', 'board', 'paths']);
const paths = Array.isArray(window.RESEARCH_PATHS) ? window.RESEARCH_PATHS : [];
let model, board = { items: [], missing: [] }, boardReadable = true, sourceRequest = 0, shown = 60;
let state = { view: 'overview', lens: 'projects', kind: '', returnView: 'context', returnFocus: '', scope: '', query: '', selected: '', path: '', bezug: '', anchor: '', reading: false, relations: 4 };
let coverage, work = null, boardObserver = null, boardRaw = null, boardSaving = false;
const originalCache = new Map();
const resumeKey = 'mission-control-demo.resume.v1';
const lenses = new Set(['projects', 'questions', 'shared', 'knowledge', 'external']);
let workModel = { projects: [], shared: [] }, workError = '', resume = null, resumeRaw = null, resumeReadable = true, resumeSaving = false, resumeSourceId = '';
let resumeExpected = null;

function el(tag, attributes = {}, ...children) {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes)) if (value !== null && value !== undefined) element.setAttribute(key, String(value));
  for (const child of children.flat()) if (child !== null && child !== undefined && child !== false) element.append(child instanceof Node ? child : document.createTextNode(String(child)));
  if (tag === 'a') window.SECOND_BRAIN_VAULT?.decorate(element);
  if (element.tagName === 'A' && window.UI_LANGUAGE && element.getAttribute('href') != null) element.href = window.UI_LANGUAGE.href(element.href);
  return element;
}
function action(label, callback, className = 'knopf') {
  const button = el('button', { type: 'button', class: className }, label);
  button.addEventListener('click', callback);
  return button;
}
async function json(url) {
  const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
    if (!response.ok) {
      let cause = '';
      try {
        const body = await response.json();
        if (typeof body?.error === 'string') cause = body.error.trim();
      } catch { /* Non-JSON failures retain the HTTP status. */ }
      throw new Error(uiResearch('Die Quelle konnte nicht gelesen werden (HTTP ', "The source could not be read (HTTP ") + response.status + ').' + (cause ? ' ' + cause : ''));
    }
    return await response.json();
  } finally { clearTimeout(timeout); }
}
function report(message) { $('research-error').textContent = message; $('research-error').hidden = !message; }
function readLocation() {
  const params = new URLSearchParams(location.hash.slice(1));
  state = { view: views.has(params.get('view')) ? params.get('view') : 'overview', lens: lenses.has(params.get('lens')) ? params.get('lens') : 'projects', kind: params.get('kind') || '', returnView: params.get('return') === 'overview' ? 'overview' : 'context', returnFocus: params.get('focus') || '', scope: params.get('scope') || '', query: (params.get('q') || '').slice(0, 160), selected: params.get('source') || '', path: params.get('path') || '', bezug: params.get('bezug') || '', anchor: params.get('anchor') || '', reading: params.get('read') === '1', relations: Math.max(4, Math.min(10000, Number(params.get('relations')) || 4)) };
  if (state.view === 'overview' && state.query) state.view = 'context';
  shown = Math.max(60, Math.min(10000, Number(params.get('show')) || 60));
  if (model && state.selected && !model.nodes.has(state.selected)) { report(uiResearch('Die gewählte Quelle fehlt in diesem Quellenstand.', "The selected source is missing from this snapshot.")); state.selected = ''; }
  if (model && state.scope && ![...model.nodes.values()].some(node => node.route.startsWith(state.scope))) state.scope = '';
  if (!paths.some(path => path.id === state.path)) state.path = '';
}
function navigate(change, replace = false) {
  const previousSource = state.selected;
  if (['view', 'scope', 'query', 'path', 'lens', 'kind'].some(key => key in change && change[key] !== state[key] && !(key === 'view' && 'selected' in change))) shown = 60;
  if ('show' in change) { shown = Math.max(60, Math.min(10000, Number(change.show) || 60)); const { show, ...rest } = change; change = rest; }
  if ('selected' in change && change.selected !== state.selected) change = { ...change, anchor: change.anchor || '', reading: change.reading === true, relations: 4 };
  state = { ...state, ...change };
  const params = new URLSearchParams();
  for (const [key, value] of [['view', state.view], ['lens', state.lens], ['kind', state.kind], ['return', state.returnView === 'overview' ? state.returnView : ''], ['focus', state.returnFocus], ['scope', state.scope], ['q', state.query], ['source', state.selected], ['path', state.path], ['bezug', state.bezug], ['anchor', state.anchor], ['read', state.reading ? '1' : ''], ['relations', state.relations > 4 ? state.relations : ''], ['show', shown > 60 ? shown : '']]) if (value) params.set(key, value);
  history[replace ? 'replaceState' : 'pushState'](null, '', '#' + params);
  render();
  if ('reading' in change && !('selected' in change)) (state.reading ? panel.querySelector('h2') : space.querySelector('.context-read'))?.focus();
  else if ('selected' in change && change.selected) (state.view === 'context' ? space.querySelector('h3') : panel.querySelector('h2'))?.focus();
  else if ('selected' in change && previousSource) {
    const target = [...space.querySelectorAll('[data-focus-key]')].find(element => state.returnFocus && element.dataset.focusKey === state.returnFocus) || [...space.querySelectorAll('[data-source-id]')].find(element => element.dataset.sourceId === previousSource);
    (target?.matches('button') ? target : target?.querySelector('button') || $('stage-title')).focus();
  } else if ('scope' in change || 'path' in change || 'lens' in change || 'kind' in change) $('stage-title').focus();
}
function select(id, returnFocus = '') { navigate({ selected: id, ...(state.view === 'overview' ? { view: 'context', returnView: 'overview', returnFocus } : {}) }); }
function sourceButton(node) {
  const button = action('', () => select(node.id), 'source-button');
  button.setAttribute('aria-pressed', String(state.selected === node.id));
  button.dataset.sourceId = node.id;
  button.append(el('span', {}, node.title), el('small', {}, node.origin === 'repo' ? node.repository + ' / ' + node.path : node.path));
  return button;
}
const boardLocksAvailable = () => typeof globalThis.navigator?.locks?.request === 'function';
const boardWritable = () => boardReadable && boardLocksAvailable() && !boardSaving;

async function saveBoard(change, expected = boardRaw) {
  if (!boardReadable) { report(uiResearch('Die gespeicherte Anordnung bleibt unverändert. Sie konnte nicht sicher gelesen werden.', "The saved arrangement remains unchanged. It could not be read safely.")); return false; }
  if (!boardLocksAvailable()) { report(uiResearch('Dieser Browser kann parallele Änderungen nicht sicher speichern. Die Arbeitsfläche bleibt schreibgeschützt.', "This browser cannot save concurrent changes safely. The workspace remains read-only.")); return false; }
  if (boardSaving) return false;
  boardSaving = true;
  for (const control of document.querySelectorAll('[data-board-write]')) control.setAttribute('aria-disabled', 'true');
  try {
    // Every board writer holds the same origin-scoped lock across comparison and write.
    return await navigator.locks.request(`second-brain:${boardKey}`, { mode: 'exclusive' }, () => {
      if (!boardReadable || localStorage.getItem(boardKey) !== expected || boardRaw !== expected) {
        report(uiResearch('Die Anordnung wurde inzwischen verändert. Deine Änderung wurde nicht gespeichert. Lade die Seite neu, bevor du weiter anordnest.', "The arrangement has changed. Your change was not saved. Reload the page before rearranging it."));
        boardReadable = false;
        return false;
      }
      const nextBoard = { items: board.items.map(item => ({ ...item })), missing: board.missing.map(item => ({ ...item })) };
      change(nextBoard);
      const next = JSON.stringify({ schema: 'second-brain-spatial-1', items: [...nextBoard.items, ...nextBoard.missing] });
      localStorage.setItem(boardKey, next);
      board = nextBoard;
      boardRaw = next;
      return true;
    });
  } catch { report(uiResearch('Die Anordnung konnte nicht gespeichert werden. Die aktuelle Auswahl bleibt geöffnet.', "The arrangement could not be saved. Your current selection remains open.")); return false; }
  finally { boardSaving = false; render(); }
}
async function addToBoard(ids) {
  const additions = [...new Set(Array.isArray(ids) ? ids : [ids])].filter(id => model.nodes.has(id) && !board.items.some(item => item.id === id));
  if (!additions.length) return true;
  if (board.items.length + board.missing.length + additions.length > 200) { report(uiResearch('Die Arbeitsfläche ist voll. Entferne zuerst eine Quelle aus der Anordnung.', "The workspace is full. Remove a source from the arrangement first.")); return false; }
  return await saveBoard(next => {
    for (const id of additions) {
      const index = next.items.length;
      next.items.push({ id, x: (index % 2) * .9 + .05, y: (Math.floor(index / 2) % 4) * .25 + .02 });
    }
  });
}
async function removeFromBoard(id) {
  return await saveBoard(next => { next.items = next.items.filter(item => item.id !== id); });
}
function crumb() {
  const host = $('research-breadcrumb'); host.replaceChildren();
  if (state.scope || state.query || state.path || state.selected) host.append(action(uiResearch('Gesamtbestand', "Entire collection"), () => navigate({ view: 'overview', kind: '', scope: '', query: '', path: '', selected: '' }), 'plain-button'));
  if (['context', 'atlas'].includes(state.view) && state.scope) {
    const parts = state.scope.split('/').filter(Boolean);
    for (let index = 0; index < parts.length; index++) {
      const scope = parts.slice(0, index + 1).join('/') + '/';
      host.append(action(parts[index], () => navigate({ scope, selected: '' }), 'plain-button'));
    }
  }
}
function renderAtlas(nodes) {
  const grid = el('div', { class: 'atlas' });
  const { groups, leaves } = partition(nodes, state.scope);
  for (const group of groups) {
    const region = el('section', { class: 'atlas-region' });
    const open = action(group.label, () => navigate({ scope: group.key, selected: '' }), 'region-open');
    region.append(el('h3', {}, open));
    const children = partition(group.nodes, group.key);
    const preview = el('div', { class: 'atlas-subregions' });
    for (const child of children.groups.slice(0, 3)) {
      const button = action('', () => navigate({ scope: child.key, selected: '' }), 'atlas-subregion');
      button.setAttribute('title', child.label);
      button.append(el('span', {}, child.label)); preview.append(button);
    }
    if (!children.groups.length) for (const node of children.leaves.slice(0, 3)) preview.append(sourceButton(node));
    region.append(preview, action(uiResearch('Bereich öffnen', "Open area"), () => navigate({ scope: group.key, selected: '' }), 'plain-button'));
    grid.append(region);
  }
  const list = el('div', { class: 'atlas-leaves' });
  for (const node of leaves.slice(0, shown)) list.append(sourceButton(node));
  if (leaves.length > shown) list.append(action(uiResearch('Weitere Quellen', "More sources"), () => { shown += 60; navigate({}, true); }));
  grid.append(list); space.append(grid);
  if (!nodes.length) space.append(el('p', {}, uiResearch('Keine Quellen für diese Auswahl.', "No sources match this selection.")));
}

function readableText(value) {
  return String(value || '').replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, label) => label || target.replace(/#.*$/, ''))
    .replace(/!?\[([^\]]+)\]\([^\n)]+\)/g, '$1').replace(/`([^`]+)`/g, '$1').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/__([^_]+)__/g, '$1');
}
function nodeKind(node) {
  return workModel.projects.some(project => project.sourceId === node.id) ? { key: 'project', label: uiResearch('Projektquelle', "Project source") } : sourceKind(node);
}
function displayTitle(node) {
  return workModel.projects.find(project => project.sourceId === node.id)?.name || node.title;
}
function excerpt(value, limit = 220) {
  const text = readableText(value).replace(/\s+/g, ' ').trim();
  if (text.length <= limit) return text;
  const cut = text.lastIndexOf(' ', limit);
  return text.slice(0, cut > limit / 2 ? cut : limit) + '…';
}
function workAddress(project) { return window.ARBEITSKONTEXT.arbeitsadresse(project.id); }
function questionCard(project, question) {
  const card = el('article', { class: 'question-card' });
  const url = window.ARBEITSKONTEXT.arbeitsadresse(project.id, question.id);
  card.append(el('h4', {}, el('a', { href: url }, readableText(question.frageKurz || question.frage || question.original))));
  if (question.voraussetzung) card.append(el('p', { class: 'prerequisite' }, uiResearch('Voraussetzung', "Prerequisite"), el('span', {}, readableText(question.voraussetzung))));
  if (question.kontext || question.original) card.append(el('details', {}, el('summary', {}, uiResearch('Wortlaut und Kontext', "Original wording and context")), el('p', {}, question.original || question.frage), question.kontext && el('p', {}, question.kontext)));
  return card;
}
function projectCard(project) {
  const card = el('article', { class: 'project-card' });
  const open = project.sourceId ? action(project.name, () => select(project.sourceId, 'project:' + project.id), 'project-open') : el('a', { href: workAddress(project), class: 'project-open' }, project.name);
  if (project.sourceId) { open.dataset.sourceId = project.sourceId; open.dataset.focusKey = 'project:' + project.id; }
  card.append(el('div', { class: 'project-heading' }, contextMark('project'), el('h3', {}, open)));
  if (project.goal) card.append(el('p', { class: 'project-goal' }, excerpt(project.goal)));
  const labels = { aktiv: uiResearch('Aktiv', "Active"), wartend: uiResearch('Wartet', "Waiting"), ruhend: uiResearch('Ruhend', "Dormant"), abgeschlossen: uiResearch('Abgeschlossen', "Completed"), idee: uiResearch('Idee', "Idea") };
  if (project.status) card.append(el('span', { class: 'project-state', 'data-state': project.status }, labels[project.status] || project.status));
  const detail = el('details', { 'data-disclosure-key': 'work:' + project.id }, el('summary', {}, uiResearch('Stand und Ziel', "State and goal")));
  if (project.goal) detail.append(el('h4', {}, uiResearch('Ziel', "Goal")), el('p', {}, readableText(project.goal)));
  if (project.stand) detail.append(el('h4', {}, uiResearch('Dokumentierter Stand', "Recorded state")), el('p', {}, readableText(project.stand)));
  detail.append(el('a', { href: workAddress(project) }, uiResearch('Arbeit öffnen', "Open work"))); card.append(detail);
  return card;
}
function externalReferences(sourceId = null) {
  const references = [], seen = new Set();
  for (const ref of coverage.references || []) {
    if (sourceId && ref.sourceId !== sourceId) continue;
    const node = model.nodes.get(ref.sourceId);
    if (!node || typeof ref.href !== 'string' || !Number.isInteger(ref.line) || ref.line < 1 || ref.revision !== node.revision) continue;
    let url;
    try { url = new URL(ref.href); } catch { continue; }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) continue;
    const key = ref.sourceId + '\n' + ref.href + '\n' + ref.line;
    if (seen.has(key)) continue;
    seen.add(key); references.push({ ...ref, node, domain: url.hostname });
  }
  return references;
}
function externalCard(ref) {
  const card = el('article', { class: 'external-card' });
  card.append(el('a', { href: ref.href, target: '_blank', rel: 'noopener noreferrer' }, ref.label || ref.href), el('small', {}, uiResearch('Externer Verweis', "External reference")));
  const address = sourceAddress({ ...ref.node, revision: ref.revision }, { from: ref.sourceId, line: ref.line });
  card.append(address ? el('a', { href: address, class: 'external-origin' }, ref.node.title + uiResearch(', Zeile ', ", line ") + ref.line) : action(ref.node.title + uiResearch(', Zeile ', ", line ") + ref.line, () => navigate({ view: 'context', selected: ref.sourceId, reading: true }), 'plain-button'));
  return card;
}
function renderOverview(nodes) {
  const navigation = el('nav', { class: 'overview-lenses', 'aria-label': uiResearch('Perspektive auf das Second Brain', "Perspective on the Second Brain") });
  for (const [key, label] of [['projects', uiResearch('Projekte', "Projects")], ['questions', uiResearch('Fragen', "Questions")], ['shared', uiResearch('Gemeinsame Quellen', "Shared sources")], ['knowledge', uiResearch('Wissensarten', "Knowledge types")], ['external', uiResearch('Externe Verweise', "External references")]]) {
    const button = action(label, () => navigate({ lens: key, kind: '', selected: '' }), 'lens-button');
    button.setAttribute('aria-pressed', String(state.lens === key)); navigation.append(button);
  }
  space.append(navigation);
  if (['projects', 'questions', 'shared'].includes(state.lens) && !work) {
    space.append(el('p', { class: workError ? 'stoerung' : '' }, workError || uiResearch('Arbeitsquellen werden gelesen.', "Reading work sources."))); return;
  }
  if (state.lens === 'projects') {
    const sections = new Map();
    for (const project of workModel.projects) {
      const area = project.raw.bereich || uiResearch('Weitere Arbeit', "More work");
      if (!sections.has(area)) sections.set(area, []);
      sections.get(area).push(project);
    }
    for (const [area, projects] of sections) space.append(el('section', { class: 'project-area' }, el('h3', {}, area), el('div', { class: 'project-grid' }, projects.map(projectCard))));
    if (!sections.size) space.append(el('p', {}, uiResearch('Keine dokumentierten Arbeitseinträge.', "No recorded work entries.")));
  } else if (state.lens === 'questions') {
    for (const project of workModel.projects.filter(item => item.questions.length)) space.append(el('section', { class: 'project-area' }, el('h3', {}, project.name), el('div', { class: 'question-grid' }, project.questions.map(point => questionCard(project, point)))));
    if (!workModel.projects.some(project => project.questions.length)) space.append(el('p', {}, uiResearch('Keine offenen Fragen im geladenen Arbeitsbestand.', "No open questions in the loaded work snapshot.")));
  } else if (state.lens === 'shared') {
    for (const item of workModel.shared.slice(0, shown)) {
      const projects = el('div', { class: 'shared-projects' });
      for (const origin of item.projects) {
        const focusKey = 'shared:' + item.node.id + ':' + origin.project.id;
        const button = action(origin.project.name, () => select(origin.project.sourceId, focusKey), 'shared-origin');
        button.dataset.sourceId = origin.project.sourceId; button.dataset.focusKey = focusKey;
        projects.append(el('div', { class: 'shared-project' }, button, referenceProof(origin.edges)));
      }
      space.append(el('article', { class: 'shared-connection' }, projects, el('span', { class: 'shared-arrow' }, 'verlinken →'), contextSource(item.node)));
    }
    if (workModel.shared.length > shown) space.append(action(uiResearch('Weitere gemeinsame Quellen', "More shared sources"), () => { shown += 60; navigate({}, true); }));
    if (!workModel.shared.length) space.append(el('p', {}, uiResearch('Keine gemeinsamen Quellen durch direkte Projektverweise belegt.', "No shared sources are evidenced by direct project references.")));
  } else if (state.lens === 'knowledge') {
    const kinds = new Map();
    const groupLabels = { teaching: uiResearch('Lehre und Workshops', "Teaching and workshops"), specification: uiResearch('Spezifikationen und Design', "Specifications and design"), organisation: uiResearch('Übersichten und Organisation', "Overviews and organisation") };
    for (const node of nodes) { const kind = nodeKind(node); if (!kinds.has(kind.key)) kinds.set(kind.key, groupLabels[kind.key] || kind.label); }
    const filters = el('div', { class: 'kind-filters', 'aria-label': uiResearch('Wissensart', "Knowledge type") });
    for (const [key, label] of [['', uiResearch('Alle Arten', "All types")], ...kinds.entries()]) {
      const button = action('', () => navigate({ kind: key }), 'kind-filter');
      button.append(contextMark(key), el('span', {}, label)); button.setAttribute('aria-pressed', String(state.kind === key)); filters.append(button);
    }
    const selected = nodes.filter(node => !state.kind || nodeKind(node).key === state.kind);
    space.append(filters, el('div', { class: 'context-catalog' }, selected.slice(0, shown).map(node => contextSource(node))));
    if (!selected.length) space.append(el('p', {}, uiResearch('Keine Quellen dieser Wissensart.', "No sources of this knowledge type.")));
    if (selected.length > shown) space.append(action(uiResearch('Weitere Quellen', "More sources"), () => { shown += 60; navigate({}, true); }));
  } else {
    const references = externalReferences();
    const domains = [...new Set(references.map(ref => ref.domain))].sort();
    const filter = el('select', { id: 'external-domain' }, el('option', { value: '' }, uiResearch('Alle Domains', "All domains")), domains.map(domain => el('option', { value: domain }, domain)));
    filter.value = state.kind;
    filter.addEventListener('change', () => navigate({ kind: filter.value }));
    space.append(el('label', { class: 'external-filter', for: 'external-domain' }, uiResearch('Domain', "Domain"), filter));
    const selected = references.filter(ref => !state.kind || ref.domain === state.kind);
    space.append(el('div', { class: 'external-grid' }, selected.slice(0, shown).map(externalCard)));
    if (!selected.length) space.append(el('p', {}, uiResearch('Keine externen Verweise für diese Auswahl.', "No external references match this selection.")));
    if (selected.length > shown) space.append(action(uiResearch('Weitere externe Verweise', "More external references"), () => { shown += 60; navigate({}, true); }));
  }
}
function renderWorkForSource(node) {
  for (const project of workModel.projects.filter(item => item.sourceId === node.id)) {
    const section = el('section', { class: 'context-work' }, el('h3', {}, uiResearch('Dokumentierte Arbeit', "Recorded work")), el('a', { href: workAddress(project) }, project.name + uiResearch(' öffnen', ": open")));
    const lanes = el('div', { class: 'work-lanes' });
    if (project.stand) lanes.append(el('section', {}, el('h4', {}, uiResearch('Stand', "State")), el('p', {}, readableText(project.stand))));
    if (project.waiting) lanes.append(el('section', { class: 'waiting-lane' }, el('h4', {}, uiResearch('Wartet auf', "Waiting for")), el('p', {}, readableText(project.waiting))));
    if (project.steps.length) lanes.append(el('section', {}, el('h4', {}, uiResearch('Dokumentierte Schritte', "Recorded steps")), el('ul', {}, project.steps.map(step => el('li', {}, readableText(step))))));
    section.append(lanes);
    if (project.questions.length) section.append(el('h4', {}, uiResearch('Offene Fragen', "Open questions")), el('div', { class: 'question-grid' }, project.questions.map(point => questionCard(project, point))));
    space.append(section);
  }
}
function renderSourceConnections(node) {
  const linked = workModel.shared.find(item => item.node.id === node.id);
  if (linked) space.append(el('section', { class: 'context-work' }, el('h3', {}, uiResearch('Verlinkt aus Projektquellen', "Linked from project sources")), el('div', { class: 'shared-projects' }, linked.projects.map(origin => el('div', { class: 'shared-project' }, action(origin.project.name, () => select(origin.project.sourceId), 'shared-origin'), referenceProof(origin.edges))))));
  const refs = externalReferences(node.id);
  if (refs.length) space.append(el('details', { class: 'source-external', 'data-disclosure-key': 'external:' + node.id }, el('summary', {}, uiResearch('Externe Verweise dieser Quelle', "External references in this source")), el('div', { class: 'external-grid' }, refs.map(externalCard))));
}
function openResume(id) {
  if (!resumeReadable || !boardLocksAvailable() || resumeSaving) return;
  resumeSourceId = id; resumeExpected = resumeRaw;
  $('resume-source').textContent = displayTitle(model.nodes.get(id));
  $('resume-note').value = resume?.sourceId === id ? resume.note : '';
  $('resume-error').hidden = true;
  $('resume-dialog').showModal(); $('resume-note').focus();
}
async function saveResume() {
  if (!resumeReadable || !boardLocksAvailable() || resumeSaving) return false;
  const note = $('resume-note').value.trim();
  if (!note) return false;
  resumeSaving = true; $('resume-save').disabled = true;
  try {
    const saved = createResume(model, resumeSourceId, { note, hash: location.hash, savedAt: new Date().toISOString() });
    await navigator.locks.request(`second-brain:${resumeKey}`, { mode: 'exclusive' }, () => {
      if (!resumeReadable || localStorage.getItem(resumeKey) !== resumeExpected || resumeRaw !== resumeExpected) throw new Error(uiResearch('Der Denkstand wurde inzwischen in einem anderen Fenster geändert. Deine Eingabe bleibt hier erhalten. Schließe und öffne den Dialog, um den aktuellen Stand zu übernehmen.', "The saved thinking state changed in another window. Your input remains here. Close and reopen the dialog to load the current state."));
      const next = serializeResume(saved);
      localStorage.setItem(resumeKey, next); resume = saved; resumeRaw = next;
    });
    $('resume-dialog').close(); renderResume(); return true;
  } catch (error) { $('resume-error').textContent = error.message; $('resume-error').hidden = false; return false; }
  finally { resumeSaving = false; $('resume-save').disabled = false; }
}
function renderResume() {
  const host = $('resume-place'); host.replaceChildren(); host.hidden = !resume;
  if (!resume) return;
  const comparison = compareResume(resume, model), node = model.nodes.get(resume.sourceId);
  const heading = el('div', {}, el('h2', {}, uiResearch('Wieder einsteigen', "Resume")), el('p', {}, node ? displayTitle(node) : resume.sourceId));
  host.append(heading, el('blockquote', {}, resume.note));
  const detail = el('details', {}, el('summary', {}, uiResearch('Gespeicherter Stand', "Saved state")), el('p', {}, new Date(resume.savedAt).toLocaleString(globalThis.window?.UI_LANGUAGE?.locale || 'de-AT')));
  detail.append(el('p', {}, comparison.status === 'missing' ? uiResearch('Die Quelle fehlt in dieser Bestandsaufnahme.', "The source is missing from this snapshot.") : comparison.status === 'changed' ? uiResearch('Die Quellenrevision hat sich seit deinem Denkstand geändert.', "The source revision changed since your saved thinking state.") : uiResearch('Die Quellenrevision entspricht dieser Bestandsaufnahme.', "The source revision matches this snapshot.")));
  host.append(detail);
  if (node) host.append(action(uiResearch('Gedanken aufnehmen', "Resume thinking"), () => {
    const params = new URLSearchParams(resume.hash.slice(1));
    navigate({ view: 'context', selected: resume.sourceId, scope: params.get('scope') || '', query: params.get('q') || '', returnView: params.get('return') === 'overview' ? 'overview' : 'context', lens: lenses.has(params.get('lens')) ? params.get('lens') : 'projects', kind: params.get('kind') || '', returnFocus: params.get('focus') || '', show: params.get('show') });
  }));
}

function contextMark(kind) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  for (const [key, value] of Object.entries({ viewBox: '0 0 48 48', 'aria-hidden': 'true', class: 'context-mark' })) svg.setAttribute(key, value);
  const path = document.createElementNS(ns, 'path');
  const shapes = {
    area: 'M8 16V10H21L26 16H40V38H8ZM8 22H40',
    project: 'M9 39V9H38L33 17L38 25H9M16 39H3',
    concept: 'M24 5L42 24L24 43L6 24ZM16 24H32M24 16V32',
    literature: 'M24 12Q15 5 5 10V36Q15 31 24 38Q33 31 43 36V10Q33 5 24 12V38',
    research: 'M17 6H31M20 6V20L8 40H40L28 20V6M14 30H34',
    writing: 'M10 36L14 26L34 6L42 14L22 34ZM14 26L22 34M10 42H38',
    teaching: 'M4 18L24 7L44 18L24 29ZM11 22V34Q24 43 37 34V22M44 18V35',
    specification: 'M9 7H39V41H9ZM16 15L18 18L23 12M27 16H33M16 27H33M16 34H28',
    organisation: 'M17 5H31V15H17ZM5 33H17V43H5ZM31 33H43V43H31ZM24 15V25M11 33V25H37V33',
    knowledge: 'M24 5L41 15V34L24 44L7 34V15ZM7 15L24 25L41 15M24 25V44',
  };
  path.setAttribute('d', shapes[kind] || 'M13 7H29L37 15V41H13ZM29 7V15H37M20 24H30M20 31H30');
  svg.append(path); return svg;
}
function contextSource(node, direction = 'catalog') {
  const button = action('', () => select(node.id, direction + ':' + node.id), 'context-source');
  button.dataset.sourceId = node.id;
  button.dataset.focusKey = direction + ':' + node.id;
  const label = el('span', {}, node.title);
  label.append(el('small', { class: 'source-kind' }, nodeKind(node).label));
  if (node.origin === 'repo') label.append(el('small', {}, node.route.split('/')[1]));
  button.append(contextMark(nodeKind(node).key), label);
  button.setAttribute('title', node.origin === 'repo' ? node.repository + ' / ' + node.path : node.path);
  return button;
}
function referenceProof(edges, label = uiResearch('Verweisbeleg', "Reference evidence")) {
  const key = 'proof:' + JSON.stringify(edges.map(edge => [edge.from, edge.to, edge.line]));
  const detail = el('details', { class: 'context-proof', 'data-disclosure-key': key }, el('summary', { 'data-focus-key': key }, label));
  for (const edge of edges) {
    const from = model.nodes.get(edge.from);
    const evidence = el('div', { class: 'source-proof' }, el('blockquote', {}, readableText(edge.quote)));
    const address = sourceAddress(from, edge);
    evidence.append(address ? el('a', { href: address }, from.title + uiResearch(', Zeile ', ", line ") + edge.line) : action(from.title + uiResearch(', Zeile ', ", line ") + edge.line, () => navigate({ selected: from.id, reading: true }), 'plain-button'));
    evidence.append(el('details', {}, el('summary', {}, uiResearch('Originalwortlaut', "Original wording")), el('pre', { class: 'source-original' }, edge.quote)));
    detail.append(evidence);
  }
  return detail;
}
function documentedWork(node) {
  if (node.origin !== 'vault') return [];
  return (work?.eintraege || []).filter(entry => entry.notizPfad === node.path);
}
function registeredProjects(node) {
  if (node.origin !== 'repo') return [];
  const lines = new Set((model.data.repositories.mappings || []).filter(mapping => node.mappingIds?.includes(mapping.id)).map(mapping => mapping.registryLine));
  const projects = new Map();
  for (const edge of model.links) {
    if (edge.from !== model.data.roots?.registry || !lines.has(edge.line)) continue;
    if (!projects.has(edge.to)) projects.set(edge.to, { node: model.nodes.get(edge.to), edges: [] });
    projects.get(edge.to).edges.push(edge);
  }
  return [...projects.values()];
}
function renderContext(nodes) {
  if (!state.selected) {
    const { groups, leaves } = state.query ? { groups: [], leaves: nodes } : partition(nodes, state.scope);
    const regions = el('div', { class: 'context-regions' });
    for (const group of groups) {
      const button = action('', () => navigate({ scope: group.key, selected: '' }), 'context-region');
      button.append(contextMark('area'), el('span', {}, group.label));
      regions.append(button);
    }
    space.append(regions);
    const list = el('div', { class: 'context-catalog' });
    for (const node of leaves.slice(0, shown)) list.append(contextSource(node));
    if (leaves.length > shown) list.append(action(uiResearch('Weitere Quellen', "More sources"), () => { shown += 60; navigate({}, true); }));
    space.append(list);
    if (!nodes.length) space.append(el('p', {}, uiResearch('Keine Quellen für diese Auswahl.', "No sources match this selection.")));
    return;
  }
  const context = relationContext(model, state.selected), node = context.source;
  if (!node) return;
  const returnLabel = state.query ? uiResearch('Zur Suche nach „', "Back to search for “") + state.query + '“' : state.returnView === 'overview' ? uiResearch('Zur Übersicht', "Back to overview") : uiResearch('Zur Quellenauswahl', "Back to source selection");
  const toolbar = el('div', { class: 'context-tools' }, action(returnLabel, () => navigate({ selected: '', view: state.query ? 'context' : state.returnView || 'context' }), 'plain-button'));
  const snapshot = el('details', {}, el('summary', {}, uiResearch('Stand der Verweise', "Reference snapshot")));
  const date = new Date(model.data.generatedAt);
  snapshot.append(el('p', {}, Number.isFinite(date.getTime()) ? uiResearch('Bestandsaufnahme vom ', "Snapshot from ") + date.toLocaleString(globalThis.window?.UI_LANGUAGE?.locale || 'de-AT') : uiResearch('Verweise aus der geladenen Bestandsaufnahme.', "References from the loaded snapshot.")), el('p', { class: 'source-origin' }, node.path));
  toolbar.append(snapshot); space.append(toolbar);
  const scene = el('div', { class: 'context-scene' });
  const focus = el('section', { class: 'context-focus', 'aria-label': uiResearch('Ausgewählte Quelle', "Selected source") });
  const read = action(uiResearch('Quelle lesen', "Read source"), () => navigate({ reading: true }), 'knopf context-read');
  focus.append(contextMark(nodeKind(node).key), el('h3', { tabindex: '-1' }, displayTitle(node)), el('span', { class: 'kind-label' }, nodeKind(node).label));
  if (node.lead) focus.append(el('p', { class: 'context-lead' }, excerpt(node.lead)));
  if (node.origin === 'repo') focus.append(el('p', { class: 'context-origin' }, node.route.split('/')[1]));
  const focusActions = el('div', { class: 'context-actions' }, read);
  if (resumeReadable && boardLocksAvailable()) focusActions.append(action(uiResearch('Denkstand festhalten', "Save thinking state"), () => openResume(node.id)));
  focus.append(focusActions);
  const stored = board.items.some(item => item.id === node.id);
  if (boardWritable()) {
    const add = action(stored ? uiResearch('Auf Arbeitsfläche ansehen', "View on workspace") : uiResearch('Auf Arbeitsfläche legen', "Add to workspace"), async () => {
      if (stored || await addToBoard(node.id)) navigate({ view: 'board' });
    }, 'plain-button');
    add.dataset.boardWrite = ''; focus.append(add);
  }
  if (context.self.length) focus.append(referenceProof(context.self, uiResearch('Verweise innerhalb dieser Quelle', "References within this source")));
  scene.append(focus);
  const connections = el('div', { class: 'context-connections' });
  if (node.origin === 'repo') {
    const projects = registeredProjects(node);
    const section = el('section', { class: 'context-direction context-registration' }, el('h4', {}, uiResearch('Registriertes Projekt', "Registered project")));
    for (const project of projects) section.append(el('article', { class: 'context-neighbor' }, contextSource(project.node), referenceProof(project.edges, uiResearch('Zuordnungsbeleg', "Assignment evidence"))));
    if (!projects.length) section.append(el('p', { class: 'context-empty' }, uiResearch('Keine aufgelöste Projektquelle in der Registrierung.', "No resolved project source in the registry.")));
    if (!model.data.repositories.links) section.append(el('p', { class: 'context-empty' }, uiResearch('Dokumentverweise innerhalb dieses Projektwissens sind noch nicht erschlossen.', "Document references within this project knowledge have not been indexed yet.")));
    connections.append(section);
  }
  for (const [direction, title, empty] of ([['outgoing', uiResearch('Verweist auf', "References"), uiResearch('Keine ausgehenden Verweise erfasst.', "No outgoing references recorded.")], ['incoming', uiResearch('Wird verlinkt in', "Referenced by"), uiResearch('Keine eingehenden Verweise erfasst.', "No incoming references recorded.")]])) {
    const section = el('section', { class: 'context-direction', 'data-direction': direction });
    section.append(el('h4', {}, el('span', { 'aria-hidden': 'true', class: 'context-arrow' }, direction === 'outgoing' ? '→' : '←'), title));
    const list = el('div', { class: 'context-neighbors' });
    const grouped = new Map();
    for (const neighbor of context[direction].slice(0, state.relations)) {
      const label = nodeKind(neighbor.node).label;
      if (!grouped.has(label)) grouped.set(label, []);
      grouped.get(label).push(neighbor);
    }
    for (const [label, neighbors] of grouped) list.append(el('section', { class: 'neighbor-kind' }, el('h5', {}, label), neighbors.map(neighbor => el('article', { class: 'context-neighbor' }, contextSource(neighbor.node, direction), referenceProof(neighbor.edges)))));
    if (!context[direction].length) list.append(el('p', { class: 'context-empty' }, empty));
    section.append(list);
    if (context[direction].length > state.relations) {
      const more = action(uiResearch('Weitere Verweise', "More references"), () => navigate({ relations: state.relations + 8 }, true));
      more.setAttribute('aria-label', direction === 'outgoing' ? uiResearch('Weitere ausgehende Verweise', "More outgoing references") : uiResearch('Weitere eingehende Verweise', "More incoming references"));
      section.append(more);
    }
    connections.append(section);
  }
  scene.append(connections); space.append(scene);
  renderWorkForSource(node);
  renderSourceConnections(node);
}

function renderBoard() {
  const tools = el('div', { class: 'board-tools' }, action(uiResearch('Quellen auswählen', "Select sources"), () => navigate({ view: 'atlas', scope: '' })));
  if (model.links.some(edge => board.items.some(item => item.id === edge.from) && board.items.some(item => item.id === edge.to))) tools.append(el('span', { class: 'board-key' }, uiResearch('Dokumentverweise', "Document references")));
  if (board.missing.length) tools.append(el('span', {}, uiResearch('Gespeicherte Quellen fehlen im aktuellen Bestand.', "Saved sources are missing from the current collection.")));
  space.append(tools);
  const canvas = el('div', { class: 'board', 'aria-label': uiResearch('Eigene räumliche Anordnung', "Your spatial arrangement") });
  const placements = [];
  const ns = 'http://www.w3.org/2000/svg';
  const edgesLayer = document.createElementNS(ns, 'svg');
  edgesLayer.setAttribute('class', 'board-edges'); edgesLayer.setAttribute('aria-hidden', 'true');
  canvas.append(edgesLayer);
  function drawEdges() {
    edgesLayer.replaceChildren();
    const rectangles = new Map([...canvas.querySelectorAll('.board-piece')].map(card => [card.dataset.sourceId, card]));
    const pairs = new Set();
    for (const edge of model.links) {
      const from = rectangles.get(edge.from), to = rectangles.get(edge.to);
      const key = [edge.from, edge.to].sort().join('\u0000');
      if (!from || !to || from === to || pairs.has(key)) continue;
      pairs.add(key);
      const line = document.createElementNS(ns, 'line');
      for (const [attribute, value] of Object.entries({ x1: from.offsetLeft + from.offsetWidth / 2, y1: from.offsetTop + from.offsetHeight / 2, x2: to.offsetLeft + to.offsetWidth / 2, y2: to.offsetTop + to.offsetHeight / 2 })) line.setAttribute(attribute, String(value));
      edgesLayer.append(line);
    }
  }
  if (!board.items.length) canvas.append(el('div', { class: 'empty-board' }, action(uiResearch('Wissen auf die Arbeitsfläche holen', "Add knowledge to the workspace"), () => navigate({ view: 'atlas', scope: '' }))));
  for (const item of board.items) {
    const node = model.nodes.get(item.id);
    const card = el('article', { class: 'board-piece' + (state.selected === item.id ? ' selected' : ''), 'data-source-id': item.id });
    function place(position = item) {
      card.style.left = position.x * Math.max(0, canvas.clientWidth - card.offsetWidth) + 'px';
      card.style.top = position.y * Math.max(0, canvas.clientHeight - card.offsetHeight) + 'px';
      drawEdges();
    }
    placements.push(place);
    const handle = action(uiResearch('Verschieben', "Move"), () => { select(item.id); }, 'board-move');
    handle.dataset.boardWrite = '';
    handle.setAttribute('aria-label', node.title + uiResearch(' verschieben', ": move"));
    handle.addEventListener('keydown', async event => {
      const moves = { ArrowLeft: [-.03, 0], ArrowRight: [.03, 0], ArrowUp: [0, -.03], ArrowDown: [0, .03] };
      if (!moves[event.key] || !boardWritable()) return;
      event.preventDefault(); const [dx, dy] = moves[event.key];
      await saveBoard(next => {
        const target = next.items.find(value => value.id === item.id);
        target.x = Math.max(0, Math.min(1, target.x + dx)); target.y = Math.max(0, Math.min(1, target.y + dy));
      });
    });
    handle.addEventListener('pointerdown', event => {
      if (!boardWritable() || event.button !== 0) return;
      const expected = boardRaw, bounds = canvas.getBoundingClientRect(), initial = { x: item.x, y: item.y, clientX: event.clientX, clientY: event.clientY };
      const position = { x: item.x, y: item.y };
      handle.setPointerCapture(event.pointerId);
      const move = current => {
        position.x = Math.max(0, Math.min(1, initial.x + (current.clientX - initial.clientX) / Math.max(1, bounds.width - card.offsetWidth)));
        position.y = Math.max(0, Math.min(1, initial.y + (current.clientY - initial.clientY) / Math.max(1, bounds.height - card.offsetHeight))); place(position);
      };
      const finish = async () => {
        handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', finish); handle.removeEventListener('pointercancel', cancel);
        if (!await saveBoard(next => Object.assign(next.items.find(value => value.id === item.id), position), expected)) place();
      };
      const cancel = () => { place(); handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', finish); handle.removeEventListener('pointercancel', cancel); };
      handle.addEventListener('pointermove', move); handle.addEventListener('pointerup', finish); handle.addEventListener('pointercancel', cancel);
    });
    card.append(action(node.title, () => select(item.id), ''), el('small', {}, node.origin === 'repo' ? node.repository : node.path.split('/')[0]));
    if (boardWritable()) card.append(handle);
    canvas.append(card);
  }
  space.append(canvas);
  for (const place of placements) place();
  boardObserver = new ResizeObserver(() => { for (const place of placements) place(); });
  boardObserver.observe(canvas);
  for (const card of canvas.querySelectorAll('.board-piece')) boardObserver.observe(card);
}
function renderPaths(nodes) {
  const choices = el('div', { class: 'path-choices' });
  for (const path of paths) {
    const button = action(path.prompt || path.title, () => navigate({ path: path.id, selected: '', query: '', scope: '' }), '');
    button.setAttribute('aria-pressed', String(state.path === path.id)); choices.append(button);
  }
  space.append(choices);
  const path = paths.find(item => item.id === state.path);
  if (!path && !state.query) return;
  const ids = path ? path.paths.filter(id => model.nodes.has(id)) : nodes.slice(0, shown).map(node => node.id);
  const context = neighborhood(model, ids);
  const heading = el('div', { class: 'path-heading' }, el('h3', {}, path ? path.title : uiResearch('Gefundene Quellen', "Found sources")));
  if (context.selected.length && boardWritable()) {
    const add = action(uiResearch('Auf Arbeitsfläche übernehmen', "Add to workspace"), async () => {
      if (await addToBoard(context.selected.map(node => node.id))) navigate({ view: 'board' });
    });
    add.dataset.boardWrite = ''; heading.append(add);
  }
  space.append(heading, el('div', { class: 'path-flow' }, context.selected.map(sourceButton)));
  if (!path && nodes.length > shown) space.append(action(uiResearch('Weitere Quellen', "More sources"), () => { shown += 60; navigate({}, true); }));
  if (path) {
    const details = el('details', {}, el('summary', {}, uiResearch('Grundlage dieser Quellenauswahl', "Basis of this source selection")), el('p', {}, path.reason));
    for (const ref of path.sourceRefs || []) {
      const node = model.nodes.get(ref.path); if (node) details.append(el('p', {}, el('a', { href: sourceAddress({ ...node, revision: ref.revision || '' }, ref.revision ? { from: node.id, line: ref.line } : null) }, node.title)));
    }
    space.append(details);
    if ((path.sourceRefs || []).some(ref => model.nodes.get(ref.path)?.revision !== ref.revision)) space.append(el('p', { class: 'stoerung' }, uiResearch('Quellen dieses Wissenswegs haben sich seit seiner Zusammenstellung verändert. Beim Öffnen der Belege wird die aktuelle Quelle mit der damaligen Revision verglichen.', "Sources on this knowledge path changed since it was assembled. Opening evidence compares the current source with the earlier revision.")));
    if (ids.length < path.paths.length) space.append(el('p', { class: 'stoerung' }, uiResearch('Eine Quelle dieses Wissenswegs fehlt im erfassten Bestand.', "A source on this knowledge path is missing from the indexed collection.")));
  }
  const handover = action(uiResearch('Frage und Quellen für unser Gespräch kopieren', "Copy question and sources for our conversation"), async () => {
    const text = [path ? path.prompt : state.query, '', ...context.selected.map(node => node.title + '\n' + node.id + '\nRevision ' + node.revision)].join('\n');
    try { await navigator.clipboard.writeText(text); handover.textContent = uiResearch('Frage und Quellen kopiert', "Question and sources copied"); }
    catch {
      const field = el('textarea', { readonly: '', rows: '7', 'aria-label': uiResearch('Frage und Quellen zum Kopieren', "Question and sources to copy") }, text);
      handover.after(field); field.focus(); field.select(); handover.remove();
    }
  });
  space.append(el('div', { class: 'source-actions' }, handover));
  if (context.related.length) {
    const disclosure = el('details', {}, el('summary', {}, uiResearch('Weitere verknüpfte Quellen', "More linked sources")));
    const related = el('div', { class: 'related-grid' }, context.related.slice(0, shown).map(sourceButton));
    if (context.related.length > shown) related.append(action(uiResearch('Weitere Verbindungen', "More connections"), () => { shown += 60; navigate({}, true); }));
    disclosure.append(related); space.append(disclosure);
  }
}
function renderSpace() {
  boardObserver?.disconnect(); boardObserver = null;
  space.replaceChildren(); crumb();
  const nodes = selectNodes(model, state.query, state.scope);
  $('stage-title').textContent = state.view === 'overview' ? uiResearch('Dein Second Brain', "Your Second Brain") : state.view === 'board' ? uiResearch('Eigene Anordnung', "Your arrangement") : state.view === 'paths' ? uiResearch('Wissenswege', "Knowledge paths") : state.view === 'context' && state.selected ? uiResearch('Arbeitszusammenhang', "Work context") : state.scope ? state.scope.split('/').filter(Boolean).at(-1) : uiResearch('Dein Wissen', "Your knowledge");
  $('research-status').textContent = state.query && !state.selected ? nodes.length + uiResearch(' Quellen für „', " sources for “") + state.query + '“' : '';
  if (state.view === 'overview') renderOverview(nodes);
  else if (state.view === 'context') renderContext(nodes);
  else if (state.view === 'atlas') renderAtlas(nodes);
  else if (state.view === 'board') renderBoard();
  else renderPaths(nodes);
}
async function readSource(node) {
  if (originalCache.has(node.id)) return originalCache.get(node.id);
  const value = await json(node.origin === 'vault' ? '/api/source?path=' + encodeURIComponent(node.path) : '/api/research/source?id=' + encodeURIComponent(node.id));
  if (typeof value.text !== 'string' || typeof value.revision !== 'string' || (node.origin === 'vault' ? value.path !== node.path : value.id !== node.id)) throw new Error(uiResearch('Die Quellenantwort ist ungültig.', "The source response is invalid."));
  originalCache.set(node.id, value); return value;
}
function preview(text) {
  const body = text.replace(/^\uFEFF?---\r?\n[\s\S]*?\r?\n---\r?\n/, '').trimStart();
  const summary = body.match(/(?:^|\n)## Summary\s*\n+([\s\S]*?)(?=\n## |$)/);
  const prose = summary ? summary[1] : body.replace(/^# .*\r?\n/, '').trimStart().replace(/^#{2,6} .*\r?\n/, '');
  const paragraph = prose.trim().split(/\r?\n\s*\r?\n/)[0] || '';
  return paragraph.length > 650 ? paragraph.slice(0, 650) + '…' : paragraph;
}
function repositorySection(text, anchor) {
  const lines = text.split(/\r?\n/), headings = [], slugs = new Map();
  let fence = null;
  for (const [index, line] of lines.entries()) {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (fence) {
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length && !marker[2].trim()) fence = null;
      continue;
    }
    if (marker) { fence = marker[1]; continue; }
    const heading = line.match(/^ {0,3}(#{1,6})[ \t]+(.+?)\s*$/);
    if (!heading) continue;
    const title = heading[2].replace(/[ \t]+#+[ \t]*$/, '').trim();
    const slug = readableText(title).toLowerCase().replace(/[^\p{L}\p{N}_\s-]/gu, '').replace(/\s/g, '-');
    const occurrence = slugs.get(slug) || 0;
    slugs.set(slug, occurrence + 1);
    headings.push({ index, level: heading[1].length, anchor: slug + (occurrence ? '-' + occurrence : '') });
  }
  const target = headings.find(heading => heading.anchor === anchor);
  if (!target) return null;
  const end = headings.find(heading => heading.index > target.index && heading.level <= target.level)?.index ?? lines.length;
  return lines.slice(target.index, end).join('\n').trimEnd();
}
async function renderInspector() {
  const request = ++sourceRequest, node = model.nodes.get(state.selected);
  panel.hidden = !node || (state.view === 'context' && !state.reading); panel.replaceChildren(); if (panel.hidden) return;
  const close = action(state.view === 'context' ? uiResearch('Quelle schließen', "Close source") : uiResearch('Auswahl schließen', "Close selection"), () => navigate(state.view === 'context' ? { reading: false } : { selected: '' }));
  if (state.bezug) {
    const target = window.ARBEITSKONTEXT.projektZiel(state.bezug, window.PROJEKTE?.projekte || []);
    panel.append(el('p', { class: 'source-project-return', id: 'research-project-return' }, target
      ? el('a', { href: target.href }, uiResearch('Zurück zum Projekt ', "Back to project ") + target.name)
      : uiResearch('Der übergebene Projektbezug ist im aktuellen Katalog nicht verfügbar.', "The supplied project reference is unavailable in the current catalogue.")));
  }
  panel.append(close, el('h2', { tabindex: '-1' }, node.title), el('p', { class: 'source-origin' }, node.origin === 'repo' ? node.repository + '\n' + node.path : node.path));
  const controls = el('div', { class: 'source-actions' });
  if (boardWritable()) {
    const stored = board.items.some(item => item.id === node.id);
    const change = action(stored ? uiResearch('Aus Arbeitsfläche entfernen', "Remove from workspace") : uiResearch('Auf Arbeitsfläche legen', "Add to workspace"), async () => {
      if (stored) await removeFromBoard(node.id); else await addToBoard(node.id);
    });
    change.dataset.boardWrite = ''; controls.append(change);
  }
  const address = sourceAddress(node); if (address) controls.append(el('a', { href: address }, uiResearch('Original öffnen', "Open original")));
  panel.append(controls);
  const content = el('div', { 'aria-live': 'polite' }, el('p', {}, uiResearch('Quelle wird gelesen.', "Reading source.")));
  panel.append(content);
  if (state.view === 'board') {
    const item = board.items.find(value => value.id === node.id);
    if (item && boardWritable()) {
      const expected = boardRaw;
      const position = el('div', { class: 'board-position' });
      for (const [axis, label] of [['x', uiResearch('Waagrecht', "Horizontal")], ['y', uiResearch('Senkrecht', "Vertical")]]) {
        const input = el('input', { type: 'range', min: '0', max: '100', value: Math.round(item[axis] * 100), 'aria-label': label });
        input.dataset.boardWrite = '';
        input.addEventListener('change', async () => {
          const value = Number(input.value) / 100;
          await saveBoard(next => { next.items.find(target => target.id === item.id)[axis] = value; }, expected);
        });
        position.append(el('label', {}, label, input));
      }
      panel.append(position);
    }
  }
  try {
    const source = await readSource(node);
    if (request !== sourceRequest) return;
    content.replaceChildren();
    const stale = source.revision !== node.revision;
    if (stale) content.append(el('p', { class: 'stoerung' }, uiResearch('Die Quelle wurde seit der Bestandsaufnahme verändert. Die damaligen Verweise sind hier nicht als aktuelle Belege dargestellt.', "The source changed since the snapshot. Its earlier references are not shown as current evidence.")));
    const section = (node.origin === 'repo' || window.MISSION_CONTROL_DEMO) && state.anchor ? repositorySection(source.text, state.anchor) : null;
    if (section !== null) content.append(el('section', { id: 'research-linked-section', 'aria-labelledby': 'research-section-title' }, el('h3', { id: 'research-section-title' }, uiResearch('Verlinkter Abschnitt', "Linked section")), el('pre', { class: 'source-original' }, section)));
    else {
      if (node.origin === 'repo' && state.anchor) content.append(el('p', { class: 'stoerung' }, uiResearch('Der verlinkte Abschnitt wurde im gelesenen Quelltext nicht gefunden: ', "The linked section was not found in the source text: ") + state.anchor));
      content.append(el('p', { class: 'source-excerpt' }, readableText(preview(source.text))));
    }
    if (node.origin === 'repo' || window.MISSION_CONTROL_DEMO) content.append(el('details', {}, el('summary', {}, uiResearch('Vollständiger Quelltext', "Full source text")), el('pre', { class: 'source-original' }, source.text)));
    if (node.tags.length) content.append(el('p', { class: 'source-origin' }, node.tags.join(', ')));
    if (!stale) {
      const neighbors = model.adjacency.get(node.id);
      if (neighbors.size) {
        const disclosure = el('details', {}, el('summary', {}, uiResearch('Verweise der Bestandsaufnahme', "Snapshot references")));
        const list = el('ul', { class: 'source-relations', role: 'list' });
        for (const [id, edges] of [...neighbors.entries()].slice(0, 24)) {
          const other = model.nodes.get(id), item = el('li', {}, sourceButton(other));
          const detail = el('details', {}, el('summary', {}, uiResearch('Verweisbeleg', "Reference evidence")));
          for (const edge of edges) {
            const from = model.nodes.get(edge.from);
            const evidence = el('div', { class: 'source-proof' }, el('blockquote', {}, readableText(edge.quote)));
    const address = sourceAddress(from, edge);
    evidence.append(address ? el('a', { href: address }, from.title + uiResearch(', Zeile ', ", line ") + edge.line) : action(from.title + uiResearch(', Zeile ', ", line ") + edge.line, () => navigate({ selected: from.id, reading: true }), 'plain-button'));
    evidence.append(el('details', {}, el('summary', {}, uiResearch('Originalwortlaut', "Original wording")), el('pre', { class: 'source-original' }, edge.quote)));
    detail.append(evidence);
          }
          item.append(detail); list.append(item);
        }
        disclosure.append(list); content.append(disclosure);
        if (neighbors.size > 24 && address) disclosure.append(el('a', { href: address }, uiResearch('Alle Verweise im Explorer untersuchen', "Inspect all references in the explorer")));
      }
    }
    for (const entry of documentedWork(node)) content.append(el('div', { class: 'source-actions' }, el('a', { href: window.ARBEITSKONTEXT.arbeitsadresse(entry.id) }, entry.name + uiResearch(' öffnen', ": open"))));
  } catch (error) { if (request === sourceRequest) content.replaceChildren(el('p', { class: 'stoerung' }, error.message)); }
}
function render() {
  if (!model) return;
  const active = document.activeElement;
  const openDisclosures = new Set([...space.querySelectorAll('details')].filter(detail => detail.open && detail.dataset.disclosureKey).map(detail => detail.dataset.disclosureKey));
  const inPanel = panel.contains(active);
  const inSpace = space.contains(active);
  const activeId = active?.dataset?.sourceId;
  const activeKey = active?.dataset?.focusKey;
  const activeLabel = active?.getAttribute('aria-label');
  const label = active?.textContent;
  $('research-query').value = state.selected ? '' : state.query; $('research-view').value = state.view;
  renderResume(); renderSpace(); renderInspector();
  for (const detail of space.querySelectorAll('details')) if (openDisclosures.has(detail.dataset.disclosureKey)) detail.open = true;
  if (active && !active.isConnected && (inPanel || inSpace)) {
    const host = inPanel ? panel : space;
    const replacement = [...host.querySelectorAll('button, a, h2, h3, input, summary')].find(element =>
      activeKey ? element.dataset.focusKey === activeKey : activeId ? element.dataset.sourceId === activeId : element.tagName === active.tagName
        && (activeLabel ? element.getAttribute('aria-label') === activeLabel : element.textContent === label));
    (replacement || (inPanel && !panel.hidden ? panel.querySelector('h2') : $('stage-title')))?.focus();
  }
}
function renderCoverage() {
  const host = $('coverage-content'); host.replaceChildren();
  const date = new Date(coverage.generatedAt);
  if (Number.isFinite(date.getTime())) host.append(el('p', {}, uiResearch('Bestandsaufnahme vom ', "Snapshot from ") + date.toLocaleString(globalThis.window?.UI_LANGUAGE?.locale || 'de-AT')));
  const table = el('table', { class: 'coverage-table' }, el('thead', {}, el('tr', {}, el('th', {}, uiResearch('Quelle', "Source")), el('th', {}, uiResearch('Erschließung', "Coverage")))));
  const body = el('tbody');
  const rows = [
    [uiResearch('Vault-Dokumente', "Vault documents"), coverage.vault.documents.length + uiResearch(' Dokumente mit Quellenrevision', " documents with source revisions")],
    [uiResearch('Repository-Wissen', "Repository knowledge"), coverage.repositories.documents.length + uiResearch(' Dokumente aus registrierten Wissenspfaden', " documents from registered knowledge paths")],
    [uiResearch('Externe Artefakte', "External artifacts"), uiResearch('Verweise erfasst. Inhalte werden nicht automatisch gelesen.', "References indexed. Content is not read automatically.")],
    [uiResearch('Gespräche und Agentenprozesse', "Conversations and agent processes"), uiResearch('Nicht an diesen Quellenbestand angebunden.', "Not connected to this source collection.")]
  ];
  for (const row of rows) body.append(el('tr', {}, row.map(value => el('td', {}, value))));
  table.append(body); host.append(table);
  const missing = coverage.vault.coverage?.missingPaths || [];
  const warnings = [...(coverage.errors || []), ...(coverage.vault.warnings || []), ...(coverage.repositories.warnings || [])];
  if (missing.length) host.append(el('h3', {}, uiResearch('Nicht indexierte Quellen', "Unindexed sources")), el('ul', {}, missing.map(value => el('li', {}, String(value)))));
  if (warnings.length) host.append(el('h3', {}, uiResearch('Offene Zugänge', "Pending access")), el('ul', {}, warnings.map(value => el('li', {}, typeof value === 'string' ? value : JSON.stringify(value)))));
  const mappings = coverage.repositories.mappings || [];
  const details = el('details', {}, el('summary', {}, uiResearch('Repository-Zuordnung', "Repository mapping")));
  for (const mapping of mappings) details.append(el('p', { class: 'source-origin' }, (mapping.name || mapping.origin || mapping.id) + ' / ' + mapping.status + ' / ' + (mapping.knowledgePath || uiResearch('Kein Wissenspfad', "No knowledge path"))));
  host.append(details);
  const excluded = coverage.vault.exclusions || [];
  if (excluded.length) host.append(el('details', {}, el('summary', {}, uiResearch('Ausgeschlossene Pfade', "Excluded paths")), el('ul', {}, excluded.map(value => el('li', {}, value.path + ' / ' + value.reason)))));
}

$('research-search').addEventListener('submit', event => { event.preventDefault(); navigate({ query: $('research-query').value.trim(), scope: '', selected: '', path: '', returnView: 'context', returnFocus: '', view: ['board', 'overview'].includes(state.view) ? 'context' : state.view }); });
$('research-view').addEventListener('change', event => navigate({ view: event.target.value, ...(event.target.value === 'overview' ? { query: '', scope: '', selected: '', path: '' } : {}) }));
$('coverage-open').addEventListener('click', () => { if (coverage) { renderCoverage(); $('coverage-dialog').showModal(); } });
$('coverage-close').addEventListener('click', () => $('coverage-dialog').close());
$('resume-close').addEventListener('click', () => $('resume-dialog').close());
$('resume-form').addEventListener('submit', async event => { event.preventDefault(); await saveResume(); });
window.addEventListener('storage', event => {
  if ((event.key !== resumeKey && event.key !== null) || !model) return;
  try {
    const current = localStorage.getItem(resumeKey);
    resume = parseResume(current, model); resumeRaw = current; resumeReadable = true; renderResume();
  } catch (error) { resumeReadable = false; report(error.message); }
});
window.addEventListener('popstate', () => { readLocation(); render(); });
window.addEventListener('storage', event => {
  if ((event.key !== boardKey && event.key !== null) || !model) return;
  try {
    // A queued event may predate our own completed write, so read the current value.
    const current = localStorage.getItem(boardKey);
    board = parseBoard(current, model); boardRaw = current; boardReadable = true; render();
  }
  catch (error) { boardReadable = false; report(error.message); }
});

(async () => {
  readLocation();
  try {
    coverage = await json('/api/research');
    model = buildModel(coverage);
    try { resumeRaw = localStorage.getItem(resumeKey); resume = parseResume(resumeRaw, model); }
    catch (error) { resumeReadable = false; report(error.message); }
    try { boardRaw = localStorage.getItem(boardKey); board = parseBoard(boardRaw, model); }
    catch (error) { boardReadable = false; report(error.message); }
    if (coverage.vault.truncated || (coverage.errors || []).length || (coverage.vault.coverage?.missingPaths || []).length) {
      $('coverage-open').textContent = uiResearch('Quellenumfang mit Lücken', "Source coverage with gaps");
      $('coverage-open').dataset.incomplete = 'true';
    }
    if (!boardLocksAvailable()) report([$('research-error').textContent, uiResearch('Dieser Browser kann parallele Änderungen nicht sicher speichern. Die Arbeitsfläche bleibt schreibgeschützt.', "This browser cannot save concurrent changes safely. The workspace remains read-only.")].filter(Boolean).join(' '));
    readLocation(); render();
    json('/api/work').then(value => { workModel = buildWorkModel(model, value); work = value; render(); }).catch(error => { workError = error.message; render(); });
  } catch (error) { $('research-status').textContent = ''; report(uiResearch('Der Gesamtbestand konnte nicht geladen werden. ', "The entire collection could not be loaded. ") + error.message); }
})();
