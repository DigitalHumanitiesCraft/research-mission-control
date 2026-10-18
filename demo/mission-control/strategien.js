export function normalizeStrategyNetwork(raw) {
  if (!raw || !Array.isArray(raw.nodes) || !Array.isArray(raw.edges) || !Array.isArray(raw.levels) || !raw.nodes.length) return null;
  const ids = new Set();
  const levels = new Set(raw.levels.map(level => level?.id));
  for (const node of raw.nodes) {
    if (typeof node?.id !== 'string' || !node.id || /[\u0000-\u001f]/.test(node.id) || ids.has(node.id) || !levels.has(node.level) || typeof node.title !== 'string') return null;
    ids.add(node.id);
  }
  const unresolved = [...(Array.isArray(raw.unresolved) ? raw.unresolved : [])];
  const edges = raw.edges.filter(edge => {
    if (ids.has(edge?.from) && ids.has(edge?.to) && edge.from !== edge.to) return true;
    unresolved.push({ id: edge?.id, statement: edge?.statement || '', reason: 'Invalid relation endpoints', source: edge?.source });
    return false;
  });
  return { ...raw, levels: raw.levels.filter(level => raw.nodes.some(node => node.level === level.id)), edges, unresolved };
}

export function projectStrategyNetwork(graph, { selected = null, expanded = [], overview = true, allowed = graph.nodes.map(node => node.id) } = {}) {
  const eligible = new Set(allowed);
  const ids = new Set(overview ? allowed : eligible.has(selected) ? [selected] : []);
  const neighbours = id => graph.edges.filter(edge => edge.from === id || edge.to === id).flatMap(edge => [edge.from, edge.to]);
  if (!overview && ids.size) {
    for (const id of neighbours(selected)) if (eligible.has(id)) ids.add(id);
    const pending = new Set(expanded);
    let changed = true;
    while (changed) {
      changed = false;
      for (const id of pending) if (ids.has(id)) {
        pending.delete(id); changed = true;
        for (const neighbour of neighbours(id)) if (eligible.has(neighbour)) ids.add(neighbour);
      }
    }
  }
  return { nodes: graph.nodes.filter(node => ids.has(node.id)), edges: graph.edges.filter(edge => ids.has(edge.from) && ids.has(edge.to)) };
}

const tr = (de, en) => typeof window !== 'undefined' && window.UI_LANGUAGE ? window.UI_LANGUAGE.t(de, en) : de;
const L = window.LEITSTAND;
const S = window.LEITSTAND_SHELL;
const Z = window.LEITSTAND_ZUGAENGE;
const daten = window.PROJEKTE;
const root = document.getElementById('strategien');
if (!L || !S || !Z) throw new Error('strategien.js needs model, shell and zugaenge');
const { el } = S;
const NS = 'http://www.w3.org/2000/svg';
const strategien = Array.isArray(daten?.strategien) ? daten.strategien : [];
const graph = normalizeStrategyNetwork(daten?.strategieNetz);
const projekte = new Map((daten?.projekte || []).map(p => [p.id, p]));
const strategieNodes = new Map();
const vorhabenNodes = new Map();
let linien = [];
let auswahl = new URLSearchParams(location.search).get('strategie');
let netz = null;
let svg = null;
let frame = null;
let hoverVorhaben = null;
let fokusVorhaben = null;

const nodeId = (typ, id) => `${typ}-${encodeURIComponent(id)}`;
const titel = p => p.titel || p.name || p.id;
const E = window.LEITSTAND_ERGEBNISSE;
const projektHref = (id, trigger) => E.projectHref(id, E.originAddress(trigger));
const gleich = (a, b) => L.rein(a).trim().toLocaleLowerCase('de') === L.rein(b).trim().toLocaleLowerCase('de');
const pfad = wert => String(wert || '').replaceAll('\\', '/');
// A source reference is not a new project. Only an exact catalog note match
// opens project tasks; other source documents retain their own destination.
function katalog(v) {
  const p = projekte.get(v.projektId);
  return p && pfad(p.links?.notiz) === pfad(v.quelle?.pfad) ? p : null;
}
const abgelehnt = v => /\babgelehnt\b|\bAblehnung\b/i.test(v.einordnung || '');
function status(v) {
  if (abgelehnt(v)) return '';
  const p = katalog(v);
  if (!p || p.zustand === 'aktiv') return '';
  return ({ anbahnung: tr('Anbahnung', "Initiation"), ruhend: tr('Ruhend', "Dormant"), abgeschlossen: tr('Abgeschlossen', 'Completed') })[p.zustand] || p.status || '';
}
const svgNode = (tag, attrs) => {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  return node;
};
function quelle(url, label) {
  const href = S.sicherUrl(url);
  return href ? el('a', { class: 'sg-quelle', href, 'aria-label': label, title: label }, Z.icon('vault')) : null;
}
function waehlen(id, adresse = true) {
  auswahl = auswahl === id ? null : id;
  if (adresse) {
    const url = new URL(location.href);
    if (auswahl) url.searchParams.set('strategie', auswahl);
    else url.searchParams.delete('strategie');
    history.pushState({}, '', url);
  }
  markieren();
}
function markieren() {
  if (graph) { graphMark(); return; }
  for (const link of root.querySelectorAll('a[data-return-origin]')) {
    link.href = projektHref(new URL(link.href).searchParams.get('projekt'), link.id);
  }
  const untersucht = hoverVorhaben || fokusVorhaben;
  const verbunden = new Set(untersucht ? [untersucht] : strategien.find(s => s.id === auswahl)?.vorhaben.map(p => p.id) || []);
  const nachbarn = new Set(untersucht ? strategien.filter(s => s.vorhaben.some(v => v.id === untersucht)).map(s => s.id) : []);
  for (const [id, node] of strategieNodes) {
    const aktiv = id === auswahl;
    node.classList.toggle('ausgewaehlt', aktiv && !untersucht);
    node.classList.toggle('verbunden', nachbarn.has(id));
    node.querySelector('button').setAttribute('aria-pressed', String(aktiv));
  }
  for (const [id, node] of vorhabenNodes) node.classList.toggle('verbunden', verbunden.has(id));
  for (const { strategie, path } of linien) path.classList.toggle('verbunden', untersucht ? path.dataset.nach === untersucht : strategie === auswahl);
}
function strategie(s) {
  const node = el('article', { class: 'sg-node sg-strategie', id: nodeId('strategie', s.id), 'data-strategie': s.id },
    el('div', { class: 'sg-kopf' }, el('h3', {}, el('button', {
      type: 'button', 'aria-pressed': 'false', text: s.titel,
    })), quelle(s.quelle?.url, tr(`Strategie im Vault: ${s.titel}`, `Strategy in the vault: ${s.titel}`))),
    el('p', { text: s.absicht }));
  node.querySelector('button').addEventListener('click', () => waehlen(s.id));
  strategieNodes.set(s.id, node);
  return node;
}
function vorhaben(v, zuordnungen) {
  const p = katalog(v);
  const beschreibung = L.rein(v.einordnung || p?.strategieHinweis || p?.ziel || p?.ergebnis || p?.stand || p?.kurz?.[0] || '');
  const name = p ? titel(p) : v.titel || v.quelle?.pfad || v.id;
  const trigger = 'open-strategy-project-' + v.id;
  const ziel = p ? projektHref(p.id, trigger) : S.sicherUrl(v.quelle?.url);
  const phase = status(v);
  const phaseImTitel = phase && L.rein(name).toLocaleLowerCase('de').includes(phase.toLocaleLowerCase('de'));
  const node = el('article', { class: 'sg-node sg-vorhaben', id: nodeId('vorhaben', v.id), 'data-vorhaben': v.id },
    el('div', { class: 'sg-kopf' }, el('h3', {},
      el(ziel ? 'a' : 'span', { class: 'sg-titel', ...(p ? { id: trigger, 'data-return-origin': true } : {}), href: ziel, text: name }),
      p ? S.bezahltMarke(p) : null,
      phase && !phaseImTitel ? el('span', { class: 'sg-status', text: phase }) : null),
    p ? quelle(v.quelle?.url || p.links?.vault, tr(`Vorhaben im Vault: ${name}`, `Project in the vault: ${name}`)) : null),
    beschreibung ? el('p', { text: beschreibung }) : null);
  const liste = el('ul', { class: 'sg-zuordnungen', role: 'list', 'aria-label': tr('Strategische Zuordnung', "Strategic association") });
  for (const { s, ref } of zuordnungen) {
    const href = new URL(location.href);
    href.searchParams.set('strategie', s.id);
    href.hash = nodeId('strategie', s.id);
    const link = el('a', { href: href.href, text: s.titel });
    link.addEventListener('click', event => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (auswahl !== s.id) waehlen(s.id);
      strategieNodes.get(s.id)?.querySelector('button').focus();
    });
    const hinweis = ref.hinweis && !gleich(ref.hinweis, beschreibung) && !gleich(ref.hinweis, s.absicht) ? L.rein(ref.hinweis) : '';
    liste.append(el('li', {}, el('span', { class: 'sg-incoming', 'aria-hidden': 'true', text: '←' }), link,
      hinweis ? el('p', { text: hinweis }) : null));
  }
  if (liste.children.length) node.append(liste);
  const bezuege = el('ul', { class: 'sg-bezuege', role: 'list', 'aria-label': tr('Verknüpfte Projekte', "Related projects") });
  for (const v of p?.verbindungen || []) {
    if (v.gespiegelt || !projekte.has(v.ziel)) continue;
    const art = { 'ist-teil-von': tr('Teil von', "Part of"), 'baut-auf': tr('Baut auf', "Builds on") }[v.art];
    if (!art) continue;
    bezuege.append(el('li', {}, el('span', { class: 'sg-relation', text: `${art} →` }),
      el('a', { id: trigger + '-' + v.ziel, 'data-return-origin': true, href: projektHref(v.ziel, trigger + '-' + v.ziel), text: titel(projekte.get(v.ziel)) }),
      v.hinweis ? el('p', { text: L.rein(v.hinweis) }) : null));
  }
  if (bezuege.children.length) node.append(bezuege);
  node.addEventListener('pointerenter', () => { hoverVorhaben = v.id; markieren(); });
  node.addEventListener('pointerleave', () => { hoverVorhaben = null; markieren(); });
  node.addEventListener('focusin', () => { fokusVorhaben = v.id; markieren(); });
  node.addEventListener('focusout', event => {
    if (!node.contains(event.relatedTarget)) { fokusVorhaben = null; markieren(); }
  });
  vorhabenNodes.set(v.id, node);
  return node;
}
function zeichneLinien() {
  frame = null;
  if (!netz || !svg) return;
  const box = netz.getBoundingClientRect();
  svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
  const frag = document.createDocumentFragment();
  linien = [];
  for (const s of strategien) {
    const von = strategieNodes.get(s.id)?.getBoundingClientRect();
    if (!von) continue;
    for (const v of s.vorhaben) {
      const nach = vorhabenNodes.get(v.id)?.getBoundingClientRect();
      if (!nach) continue;
      const x1 = von.right - box.left;
      const y1 = von.top - box.top + von.height / 2;
      const x2 = nach.left - box.left;
      const y2 = nach.top - box.top + nach.height / 2;
      const mittel = (x1 + x2) / 2;
      const path = svgNode('path', { class: 'sg-edge', d: `M ${x1} ${y1} C ${mittel} ${y1}, ${mittel} ${y2}, ${x2 - 7} ${y2}`, 'data-von': s.id, 'data-nach': v.id });
      const pfeil = svgNode('path', { class: 'sg-arrow', d: `M ${x2} ${y2} l -7 -3.5 v 7 z` });
      frag.append(path, pfeil);
      linien.push({ strategie: s.id, path });
    }
  }
  svg.replaceChildren(frag);
  for (const a of root.querySelectorAll('.sg-zuordnungen a')) {
    a.tabIndex = a.closest('li').getBoundingClientRect().width > 1 ? 0 : -1;
  }
  markieren();
}
function spaeterZeichnen() {
  if (!frame) frame = requestAnimationFrame(zeichneLinien);
}
function zeichnen() {
  if (graph) { graphDraw(); return; }
  const fokus = document.activeElement?.closest('[data-strategie]')?.dataset.strategie;
  strategieNodes.clear();
  vorhabenNodes.clear();
  hoverVorhaben = null;
  fokusVorhaben = null;
  if (!strategien.length) {
    root.replaceChildren(el('p', { class: 'sg-leer', role: 'status', text: tr('Die Strategiedaten sind derzeit nicht verfügbar.', "Strategy data is currently unavailable.") }));
    return;
  }
  const zuordnungen = new Map();
  for (const s of strategien) {
    for (const ref of s.vorhaben) {
      const p = katalog(ref);
      if (S.filter() && (!p || !S.visible(p))) continue;
      if (!zuordnungen.has(ref.id)) zuordnungen.set(ref.id, []);
      zuordnungen.get(ref.id).push({ s, ref });
    }
  }
  const ids = [...zuordnungen.keys()];
  const order = new Map(ids.map((id, i) => [id, i]));
  ids.sort((a, b) => Number(abgelehnt(zuordnungen.get(a)[0].ref)) - Number(abgelehnt(zuordnungen.get(b)[0].ref)) || order.get(a) - order.get(b));
  const left = el('div', { class: 'sg-strategien' }, ...strategien.map(strategie));
  const right = el('div', { class: 'sg-projekte' }, ...ids.map(id => vorhaben(zuordnungen.get(id)[0].ref, zuordnungen.get(id))));
  if (!ids.length) right.append(el('p', { class: 'sg-leer', role: 'status', text: tr('Kein zugeordnetes Vorhaben im gewählten Thema.', "No associated project in the selected category.") }));
  svg = svgNode('svg', { class: 'sg-linien', 'aria-hidden': 'true', focusable: 'false' });
  netz = el('div', { class: 'sg-netz' }, svg,
    el('section', { class: 'sg-spalte sg-strategie-spalte', 'aria-labelledby': 'sg-strategien-titel' },
      el('h2', { id: 'sg-strategien-titel', text: tr('Strategien', "Strategies") }), left),
    el('section', { class: 'sg-spalte sg-projekt-spalte', 'aria-labelledby': 'sg-vorhaben-titel' },
      el('h2', { id: 'sg-vorhaben-titel', text: tr('Vorhaben', "Project") }), right));
  root.replaceChildren(el('p', { class: 'sg-leer', role: 'status', text: tr('Das erweiterte Beziehungsnetz ist nicht verfügbar. Die bisherigen Quellenzuordnungen bleiben lesbar.', 'The extended relationship network is unavailable. The existing source associations remain readable.') }), netz);
  for (const s of strategien) {
    const ids = s.vorhaben.filter(v => vorhabenNodes.has(v.id)).map(v => nodeId('vorhaben', v.id));
    if (ids.length) strategieNodes.get(s.id).querySelector('button').setAttribute('aria-controls', ids.join(' '));
  }
  if (fokus) strategieNodes.get(fokus)?.querySelector('button').focus({ preventScroll: true });
  markieren();
  spaeterZeichnen();
}
if (auswahl && !strategien.some(s => s.id === auswahl)) auswahl = null;
window.addEventListener('popstate', () => {
  auswahl = new URLSearchParams(location.search).get('strategie');
  if (!strategien.some(s => s.id === auswahl)) auswahl = null;
  markieren();
});
window.addEventListener('resize', () => graph ? graphSchedule() : spaeterZeichnen());
if (typeof ResizeObserver === 'function') new ResizeObserver(() => graph ? graphSchedule() : spaeterZeichnen()).observe(root);
const graphNodes = new Map((graph?.nodes || []).map(node => [node.id, node]));
const graphCards = new Map();
let graphNetwork = null;
let graphSvg = null;
let graphDetail = null;
let graphFrame = null;
let graphPreview = null;
let graphBackground = true;
let graphView = { nodes: [], edges: [] };
let graphReturnPending = location.hash;
function graphRestoreReturn() {
  if (!graphReturnPending) return;
  const literal = graphReturnPending.slice(1);
  let decoded = literal; try { decoded = decodeURIComponent(literal); } catch { /* Keep the literal address when an old fragment is malformed. */ }
  const target = document.getElementById(literal) || document.getElementById(decoded);
  if (!target) return;
  const group = target.closest('details'); if (group) group.open = true;
  target.focus({ preventScroll: true }); target.scrollIntoView({ block: 'nearest' });
  graphReturnPending = '';
}
window.addEventListener('load', () => { if (graph) graphRestoreReturn(); });
window.addEventListener('hashchange', () => { if (graph) { graphReturnPending = location.hash; graphRestoreReturn(); } });
const graphLabels = {
  goal: () => tr('Ziele', 'Goals'), strategy: () => tr('Strategien', 'Strategies'),
  prerequisite: () => tr('Voraussetzungen', 'Prerequisites'), actor: () => tr('Rollen und Einrichtungen', 'Roles and institutions'),
  project: () => tr('Vorhaben', 'Projects'), result: () => tr('Ergebnisse', 'Results'),
};
const assertionLabel = value => ({ intention: tr('Absicht', 'Intention'), possible: tr('Möglichkeit', 'Possible'), agreed: tr('Vereinbart', 'Agreed'), evidenced: tr('Belegt', 'Evidenced'), proposal: tr('Vorschlag', 'Proposal') })[value] || tr('Belegstufe offen', 'Assertion unknown');
const relationLabel = edge => ({ supports: tr('Fachlicher Bezug', 'Related to'), pursues: tr('Verfolgt', 'Pursues'), requires: tr('Benötigt Klärung', 'Requires clarification') })[edge.kind] || edge.label;
const graphTitle = node => node.title;
const graphId = node => node.id.startsWith('strategie:') ? nodeId('strategie', node.id.slice(10)) : node.level === 'project' ? nodeId('vorhaben', node.id) : nodeId('objekt', node.id);
function graphSelected() {
  const params = new URLSearchParams(location.search);
  return graphNodes.get(params.get('objekt')) || graphNodes.get('strategie:' + params.get('strategie')) || null;
}
function graphProject(node) {
  const project = projekte.get(node.projectId);
  return project && pfad(project.links?.notiz) === pfad(node.source?.path) ? project : null;
}
function graphAddress(id) {
  const url = new URL(location.href);
  if (id?.startsWith('strategie:')) {
    url.searchParams.set('strategie', id.slice(10));
    url.searchParams.delete('objekt');
  } else if (id) url.searchParams.set('objekt', id);
  else { url.searchParams.delete('objekt'); url.searchParams.delete('strategie'); }
  return url;
}
function graphChoose(id) {
  const next = graphSelected()?.id === id ? null : id;
  const url = graphAddress(next);
  if (next) url.searchParams.set('netz', 'nah'); else url.searchParams.delete('netz');
  url.searchParams.delete('expand');
  history.pushState({}, '', url);
  auswahl = new URLSearchParams(location.search).get('strategie');
  graphDraw();
}
function graphSource(source, label = tr('Originalquelle', 'Original source')) {
  return quelle(source?.url, label);
}
function graphState(node) {
  if (node.visibility === 'background') return tr('Hintergrund', 'Background') + (node.workState === 'completed' ? ' · ' + tr('Eigener Beitrag abgeschlossen', 'Own contribution completed') : '');
  return ({ aktiv: tr('Aktiver Arbeitsstand', 'Active work state'), anbahnung: tr('Anbahnung', 'Initiation'), abgeschlossen: tr('Abgeschlossen', 'Completed'), completed: tr('Eigener Beitrag abgeschlossen', 'Own contribution completed'), ruhend: tr('Ruhend', 'Dormant') })[node.workState] || tr('Arbeitsstand unbekannt', 'Work state unknown');
}
function graphNeighbours(id) { return graph.edges.filter(edge => edge.from === id || edge.to === id); }
function graphMark() {
  const id = graphPreview || graphSelected()?.id;
  const neighbours = new Set(graphNeighbours(id).flatMap(edge => [edge.from, edge.to]));
  for (const [key, card] of graphCards) {
    card.classList.toggle('ausgewaehlt', key === graphSelected()?.id);
    card.classList.toggle('verbunden', neighbours.has(key));
    card.querySelector('button[data-node-key]').setAttribute('aria-pressed', String(key === graphSelected()?.id));
  }
  for (const group of graphSvg?.querySelectorAll('[data-edge-key]') || []) {
    const edge = graph.edges.find(item => item.id === group.dataset.edgeKey);
    group.classList.toggle('verbunden', edge.from === id || edge.to === id);
  }
  for (const link of root.querySelectorAll('a[data-return-origin]')) link.href = projektHref(new URL(link.href).searchParams.get('projekt'), link.id);
}
function graphShowDetail() {
  if (!graphDetail) return;
  const selected = graphSelected();
  graphDetail.hidden = !selected;
  graphDetail.replaceChildren();
  if (!selected) return;
  const body = el('div', { class: 'sg-detail-body' });
  const originals = new Set();
  for (const statement of [selected.detail || selected.context, ...graphNeighbours(selected.id).map(edge => edge.statement)]) {
    if (!statement || [...originals].some(prior => prior.includes(statement))) continue;
    originals.add(statement);
    body.append(el('p', { class: 'sg-original', text: statement }));
  }
  const evidence = selected.contextSource || selected.source;
  body.append(el('div', { class: 'sg-evidence' }, graphSource(evidence),
    el('code', { text: evidence?.revision || tr('Quellenrevision unbekannt', 'Source revision unknown') })));
  if (selected.contextSource) body.append(el('p', {}, graphSource(selected.source, tr('Verknüpftes Originaldokument', 'Linked original document')),
    el('span', { text: selected.source?.path || '' }), el('code', {text:selected.source?.revision || ''})));
  const neighbours = el('ul', { class: 'sg-neighbours', role: 'list' });
  for (const edge of graphNeighbours(selected.id)) {
    const target = graphNodes.get(edge.from === selected.id ? edge.to : edge.from);
    const link = el('a', { href: graphAddress(target.id).href, text: graphTitle(target) });
    link.addEventListener('click', event => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (target.visibility === 'background' && !graphBackground) {
        const url = graphAddress(target.id); url.searchParams.set('hintergrund', '1'); history.pushState({}, '', url); graphDraw();
      } else { const url = graphAddress(target.id); url.searchParams.set('netz', 'nah'); url.searchParams.delete('expand'); history.pushState({}, '', url); graphDraw(); }
      const card = graphCards.get(target.id);
      const group = card?.closest('details.sg-spalte'); if (group) group.open = true;
      card?.querySelector('button').focus();
    });
    neighbours.append(el('li', {}, el('span', { class: 'sg-relation', text: (edge.from === selected.id ? '→ ' : '← ') + relationLabel(edge) + ': ' }), link,
      el('span', { class: 'sg-assertion', text: assertionLabel(edge.assertion) })));
  }
  const sources = new Set([evidence, selected.source].filter(Boolean).map(source => source.path + ':' + source.revision));
  for (const edge of graphNeighbours(selected.id)) {
    const key = edge.source?.path + ':' + edge.source?.revision;
    if (sources.has(key) || !edge.source) continue;
    sources.add(key); body.append(el('div', {class:'sg-evidence'}, graphSource(edge.source), el('code',{text:edge.source.revision || ''})));
  }
  body.prepend(neighbours);
  const disclosure = el('details', {}, el('summary', { text: tr('Beziehungen und vollständiger Quellenkontext', 'Relationships and complete source context') }), body);
  const close = el('button', { type: 'button', text: tr('Auswahl schließen', 'Clear selection') });
  close.addEventListener('click', () => { const url = graphAddress(null); url.searchParams.delete('netz'); url.searchParams.delete('expand'); history.pushState({}, '', url); graphDraw(); });
  const project = graphProject(selected);
  const trigger = 'open-strategy-project-' + selected.id;
  graphDetail.append(...[el('div', { class: 'sg-detail-heading' }, el('h2', { text: selected.title }), close),
    selected.assertion ? el('p', { text: assertionLabel(selected.assertion) }) : null,
    project ? el('a', { id: trigger, 'data-return-origin': true, href: projektHref(project.id, trigger), text: tr('Projekt öffnen', 'Open project') }) : null, disclosure].filter(Boolean));
}
function graphCard(node) {
  const button = el('button', { type: 'button', id: 'pick-' + graphId(node), 'data-node-key': node.id, 'aria-pressed': 'false', 'aria-controls': 'sg-selection', text: graphTitle(node) });
  const card = el('article', { class: 'sg-node sg-object' + (node.kind === 'strategy' ? ' sg-strategie' : node.level === 'project' ? ' sg-vorhaben' : ''), id: graphId(node), 'data-node': node.id, 'data-kind': node.kind,
    ...(node.kind === 'strategy' ? { 'data-strategie': node.id.slice(10) } : {}), ...(node.level === 'project' ? { 'data-vorhaben': node.id } : {}) },
    el('div', { class: 'sg-kopf' }, el('h3', {}, button)),
    node.level === 'project' ? el('p', { class: 'sg-status', text: graphState(node) }) : null,
    node.assertion ? el('p', { class: 'sg-status', text: assertionLabel(node.assertion) }) : null);
  const params = new URLSearchParams(location.search);
  const expanded = params.getAll('expand').includes(node.id);
  const shown = new Set(graphView.nodes.map(item => item.id));
  const hidden = graphNeighbours(node.id).some(edge => !shown.has(edge.from) || !shown.has(edge.to));
  if ((params.get('netz') === 'nah' || (params.get('netz') !== 'alle' && graphSelected())) && (expanded || hidden)) {
    const expand = el('button', { type: 'button', class: 'sg-expand', id: 'expand-' + graphId(node), 'aria-expanded': String(expanded), text: expanded ? tr('Einklappen', 'Collapse') : tr('Weiter auffächern', 'Expand relationships') });
    expand.addEventListener('click', () => {
      const url = new URL(location.href);
      const values = new Set(url.searchParams.getAll('expand'));
      if (values.has(node.id)) values.delete(node.id); else values.add(node.id);
      url.searchParams.delete('expand'); for (const id of values) url.searchParams.append('expand', id);
      history.pushState({}, '', url); graphDraw();
      (document.getElementById(expand.id) || document.getElementById(button.id))?.focus();
    });
    card.append(expand);
  }
  button.addEventListener('click', () => graphChoose(node.id));
  const preview = id => { graphPreview = id; graphMark(); graphSchedule(); };
  card.addEventListener('pointerenter', () => preview(node.id));
  card.addEventListener('pointerleave', () => preview(null));
  card.addEventListener('focusin', () => preview(node.id));
  card.addEventListener('focusout', event => { if (!card.contains(event.relatedTarget)) preview(null); });
  graphCards.set(node.id, card);
  return card;
}
function graphDrawLines() {
  graphFrame = null;
  if (!graphNetwork || !graphSvg) return;
  const bounds = graphNetwork.getBoundingClientRect();
  graphSvg.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);
  const defs = svgNode('defs', {});
  const marker = svgNode('marker', { id: 'sg-direction', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 5, markerHeight: 5, orient: 'auto-start-reverse' });
  marker.append(svgNode('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: 'context-stroke' })); defs.append(marker);
  const fragment = document.createDocumentFragment(); fragment.append(defs);
  for (const edge of graphView.edges) {
    const from = graphCards.get(edge.from)?.getBoundingClientRect();
    const to = graphCards.get(edge.to)?.getBoundingClientRect();
    if (!from || !to) continue;
    const same = Math.abs(from.left - to.left) < 2;
    const right = to.left > from.left;
    const x1 = (right || same ? from.right : from.left) - bounds.left;
    const x2 = (right ? to.left : same ? to.right : to.right) - bounds.left;
    const y1 = from.top + from.height / 2 - bounds.top;
    const y2 = to.top + to.height / 2 - bounds.top;
    const bend = same ? x1 + 18 : (x1 + x2) / 2;
    const group = svgNode('g', { 'data-edge-key': edge.id });
    group.append(svgNode('path', { class: 'sg-edge', d: `M ${x1} ${y1} C ${bend} ${y1}, ${bend} ${y2}, ${x2} ${y2}`, 'marker-end': 'url(#sg-direction)' }),
      svgNode('text', { class: 'sg-edge-label', x: bend, y: (y1 + y2) / 2 - 5, 'text-anchor': 'middle' }));
    const selected = graphPreview || graphSelected()?.id;
    const otherIsTarget = selected === edge.from;
    const labelX = same ? x1 + 46 : otherIsTarget ? x2 + (right ? -46 : 46) : x1 + (right ? 46 : -46);
    group.lastChild.setAttribute('x', labelX);
    group.lastChild.setAttribute('y', (otherIsTarget ? y2 : y1) - 4);
    group.lastChild.textContent = ({supports: tr('Bezug', 'Related'), requires: tr('Bedingung', 'Condition'), connection: tr('Verbindung', 'Connection')})[edge.kind] || relationLabel(edge);
    fragment.append(group);
  }
  graphSvg.replaceChildren(fragment); graphMark();
}
function graphSchedule() { if (!graphFrame) graphFrame = requestAnimationFrame(graphDrawLines); }
function graphCategories() {
  const sidebar = document.getElementById('seitenleiste');
  const panel = sidebar?.querySelector('.mc-sidebar-panel');
  if (!panel) return;
  let disclosure = sidebar.querySelector('.sg-categories');
  if (!disclosure) {
    disclosure = el('details', { class: 'sg-categories', open: window.innerWidth >= 992 }, el('summary'));
    panel.before(disclosure); disclosure.append(panel);
  }
  const narrow = window.innerWidth < 992;
  const summary = disclosure.querySelector(':scope > summary');
  summary.hidden = !narrow;
  if (!narrow) disclosure.open = true;
  const category = panel.querySelector('.filter [aria-pressed="true"] .wort')?.textContent || tr('alle', 'all');
  summary.textContent = tr('Kategorien', 'Categories') + ' · ' + category;
}
function graphDraw() {
  graphCategories();
  const focusId = document.activeElement?.id;
  const directionsOpen = root.querySelector('.sg-directions')?.open;
  const levelOpen = new Map([...root.querySelectorAll('.sg-spalte')].map(group => [group.getAttribute('aria-labelledby'), group.open]));
  const selected = graphSelected();
  graphBackground = new URLSearchParams(location.search).get('hintergrund') !== '0';
  graphCards.clear(); graphPreview = null;
  const eligible = graph.nodes.filter(node => (graphBackground || node.visibility !== 'background') &&
    (!S.filter() || node.level !== 'project' || (graphProject(node) && S.visible(graphProject(node)))));
  const params = new URLSearchParams(location.search);
  const overview = params.get('netz') === 'alle' || (params.get('netz') !== 'nah' && !selected);
  graphView = projectStrategyNetwork(graph, { selected: selected?.id, expanded: params.getAll('expand'), overview, allowed: eligible.map(node => node.id) });
  const visible = graphView.nodes;
  const levels = graph.levels.filter(level => visible.some(node => node.level === level.id));
  if (root.getBoundingClientRect().width < 992) levels.sort((a,b) => Number(b.id === 'project') - Number(a.id === 'project'));
  const background = el('input', { type: 'checkbox', id: 'sg-background' }); background.checked = graphBackground;
  background.addEventListener('change', () => {
    let url = graphAddress(!background.checked && graphSelected()?.visibility === 'background' ? null : graphSelected()?.id);
    url.searchParams.set('hintergrund', background.checked ? '1' : '0');
    if (!background.checked && selected?.visibility === 'background') { url.searchParams.delete('netz'); url.searchParams.delete('expand'); }
    history.pushState({}, '', url); graphDraw();
  });
  const overviewButton = el('button', { type: 'button', id: 'sg-overview', 'aria-pressed': String(overview), text: tr('Gesamtübersicht', 'Network overview') });
  overviewButton.addEventListener('click', () => { const url = new URL(location.href); url.searchParams.set('netz', 'alle'); history.pushState({}, '', url); graphDraw(); });
  const reset = el('button', { type: 'button', id: 'sg-reset', text: tr('Zurücksetzen', 'Reset') });
  reset.addEventListener('click', () => {
    const url = graphAddress(null); for (const key of ['netz', 'expand', 'hintergrund']) url.searchParams.delete(key);
    url.searchParams.set('thema', ''); history.pushState({}, '', url);
    if (S.filter()) document.querySelector('.mc-sidebar .filter button')?.click(); else graphDraw();
  });
  const toolbar = el('div', { class: 'sg-toolbar' }, el('label', {}, background, document.createTextNode(tr('Hintergrund einbeziehen', 'Include background'))), overviewButton, reset);
  const directions = el('details', { class: 'sg-directions', open: directionsOpen ?? (window.innerWidth >= 992) }, el('summary', { text: tr('Strategische Richtungen', 'Strategic directions') }));
  const choices = el('nav', { 'aria-label': tr('Strategie auswählen', 'Choose a strategy') });
  for (const node of graph.nodes.filter(item => item.kind === 'strategy')) {
    const button = el('button', { type: 'button', id: 'choose-' + graphId(node), 'data-strategy-choice': node.id, 'aria-pressed': String(selected?.id === node.id), text: node.title });
    button.addEventListener('click', () => graphChoose(node.id)); choices.append(button);
  }
  directions.append(choices);
  graphDetail = el('section', { id: 'sg-selection', class: 'sg-detail', 'aria-label': tr('Ausgewähltes Objekt und Beziehungen', 'Selected object and relationships'), hidden: true });
  graphSvg = svgNode('svg', { class: 'sg-linien', 'aria-hidden': 'true', focusable: 'false' });
  graphNetwork = el('div', { class: 'sg-netz sg-multilevel' }, graphSvg);
  graphNetwork.style.setProperty('--sg-level-count', levels.length);
  const narrow = root.getBoundingClientRect().width < 992;
  for (const level of levels) {
    const section = el('details', { class: 'sg-spalte', open: levelOpen.get('sg-level-' + level.id) ?? (!narrow || level.id === 'project'), 'aria-labelledby': 'sg-level-' + level.id },
      el('summary', {}, el('h2', { id: 'sg-level-' + level.id, text: graphLabels[level.id]?.() || level.title })),
      el('div', { class: 'sg-objects' }, ...visible.filter(node => node.level === level.id).map(graphCard)));
    section.addEventListener('toggle', graphSchedule);
    graphNetwork.append(section);
  }
  const unresolved = el('details', { class: 'sg-unresolved' }, el('summary', { text: tr('Noch nicht eindeutig zugeordnete Beziehungen', 'Relationships with unresolved endpoints') }));
  for (const item of graph.unresolved) unresolved.append(el('article', {}, el('p', { class: 'sg-original', text: item.statement }),
    el('p', { class: 'sg-help', text: tr('Keine eindeutigen Endpunkte; Originalbeziehung bleibt erhalten.', 'No unambiguous endpoints; the original relationship is retained.') }),
    el('code', { text: item.reason || '' }), graphSource(item.source)));
  root.replaceChildren(...[toolbar, directions, graphDetail, graphNetwork, !visible.length ? el('p', {role:'status', class:'sg-leer', text:tr('Kein Objekt entspricht den gewählten Filtern.', 'No object matches the selected filters.')}) : null, graph.unresolved.length ? unresolved : null].filter(Boolean));
  graphShowDetail(); graphSchedule(); graphRestoreReturn();
  if (focusId) {
    const focus = document.getElementById(focusId);
    const group = focus?.closest('details.sg-spalte'); if (group) group.open = true;
    focus?.focus({ preventScroll: true });
  }
}
window.addEventListener('popstate', () => { if (graph) graphDraw(); });
S.mount(document.getElementById('kopf'), { view: 'strategien', onFilter: zeichnen });
