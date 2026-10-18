import { operatorBriefing, operatorFollowup, operatorSourceReport, operatorWorkState, operatorProjects, operatorReportTime } from './operatoren-model.js';

const raw = value => typeof value === 'string' ? value : '';
const tr = (de, en) => globalThis.window?.UI_LANGUAGE ? window.UI_LANGUAGE.t(de, en) : de;
const unique = values => [...new Set(values.filter(Boolean))];

/** The address retains only presentation state; personal text stays in the existing composer store. */
export function coordinationViewState(address) {
  const query = new URL(address).searchParams;
  const scopes = query.getAll('briefing');
  const scope = scopes.length === 1 && ['all', 'selection'].includes(scopes[0]) ? scopes[0] : 'all';
  return { scope, open: scopes.length === 1 && ['all', 'selection'].includes(scopes[0])
    && query.getAll('briefing-open').length === 1 && query.get('briefing-open') === '1' };
}
export function coordinationViewHref(address, { scope, open }) {
  if (!['all', 'selection'].includes(scope) || typeof open !== 'boolean') throw new TypeError('Unknown coordination view state');
  const target = new URL(address);
  target.searchParams.delete('briefing');
  target.searchParams.delete('briefing-open');
  if (scope !== 'all' || open) target.searchParams.set('briefing', scope);
  if (open) target.searchParams.set('briefing-open', '1');
  return target.href;
}

/** Read-only projection: selection is project membership, never inferred live activity. */
export function coordinationModel({ L, briefings = {}, visible = () => true, scope = 'all', filterLabel = '', filterKey = '', snapshots = [], I = globalThis.window?.LEITSTAND_ICONS }) {
  if (!['all', 'selection'].includes(scope)) throw new TypeError('Unknown coordination scope');
  const registered = [...new Map([...L.lanes].filter(lane => lane.state !== 'RETIRED').map(lane => [lane.key, lane])).values()];
  const projected = registered.map(lane => {
    const source = operatorSourceReport(lane);
    const planning = lane.planning;
    const boundPlanning = lane.setup === 'planned' && source && planning?.source === source.source && planning.revision === source.revision;
    const briefing = operatorBriefing(lane, briefings[lane.key]);
    const projectIds = unique(operatorProjects(lane, briefing, L).map(project => project.projectId)
      .concat(boundPlanning && Array.isArray(planning.projectIds) ? planning.projectIds : []));
    const inSelection = projectIds.some(id => L.entryById.has(id) && visible(L.entryById.get(id)));
    const contribution = L.operatorContribution(lane.report?.['Operator point'] || '');
    const contributionKnown = Boolean(source && (raw(lane.report?.['Operator point']).trim() || briefing.questions !== null));
    const questions = !source || lane.paused || lane.setup === 'planned' ? []
      : unique((briefing.questions === null ? [contribution] : (briefing.questions || []).map(question => L.operatorContribution(question)))
        .filter(item => item.kind === 'question' || item.kind === 'discussion').map(item => item.text));
    const followup = operatorFollowup(lane, briefing, questions);
    const tasks = (lane.auftraege || []).filter(task => !task.vertragsfehler && !task.entryIssue && task.entryId && L.entryById.has(task.entryId));
    const state = operatorWorkState(lane, briefing, questions.length > 0);
    return { key: lane.key, role: raw(lane.rollentitel) || lane.key,
      workArea: I?.workArea(lane, { L, briefing }) || lane.adresse || lane.key,
      lifecycle: lane.paused ? 'paused' : lane.setup === 'planned' ? 'planned' : lane.setup === 'initialized' ? 'initialized' : 'unknown',
      state: state.text, time: source ? operatorReportTime(lane, briefing) : { value: '', kind: 'unknown' }, contributionKnown, recordedState: raw(lane.report?.State || lane.state), source, projectIds, inSelection,
      result: raw(lane.report?.Result), evidence: raw(lane.report?.Evidence), verification: raw(lane.report?.Verification), limits: raw(lane.report?.Deviation),
      next: followup.nextText, reportNext: raw(lane.report?.['Next action']), questions,
      originalPoint: raw(lane.report?.['Operator point']), blocker: raw(lane.report?.Blocker),
      messages: Array.isArray(lane.messages) ? lane.messages.filter(item => typeof item === 'string') : [],
      planningOriginal: boundPlanning ? raw(planning.original) : '',
      tasks: tasks.map(task => ({ id: task.kennung, text: raw(task.auftrag), project: task.entryId, state: task.zustand })),
    };
  });
  const operators = scope === 'all' ? projected : projected.filter(item => item.inSelection);
  const selectedKeys = new Set(operators.map(item => item.key));
  const drafts = snapshots.filter(item => item && selectedKeys.has(item.operator) && item.edited && typeof item.key === 'string' && !item.key.includes(':coordination-briefing-') && typeof item.text === 'string')
    .filter((item, index, list) => list.findIndex(other => other.key === item.key) === index);
  const scopeLabel = scope === 'all' ? tr('Alle registrierten Operatoren', 'All registered operators') : tr('Aktuelle Projektauswahl', 'Current project selection');
  const currentFilter = raw(filterLabel) || tr('alle Kategorien', 'all categories');
  const header = [tr('Lass uns den dokumentierten Stand, die nächsten beauftragten Schritte und meinen tatsächlich benötigten Beitrag besprechen.', 'Let us discuss the recorded status, next commissioned steps and where my contribution is needed.'),
    tr('Umfang: ', 'Scope: ') + scopeLabel + ' — ' + operators.length + '/' + registered.length + tr(' Operatoren.', ' operators.'),
    tr('Sichtbarer Kategorienfilter: ', 'Visible category filter: ') + currentFilter + '.',
    scope === 'all' ? tr('Enthält auch Operatoren außerhalb des Filters sowie geplante und pausierte Profile; zurückgenommene Profile sind ausgeschlossen.', 'Includes operators outside the filter and planned and paused profiles; retired profiles are excluded.')
      : tr('Enthält nur Profile mit mindestens einem exakt zugeordneten Projekt in der Auswahl. Nicht zugeordnete Profile werden dadurch nicht stillschweigend zugeordnet.', 'Includes only profiles with at least one exact project binding in the selection. Unassigned profiles are not silently assigned.'),
    tr('Dokumentierte Arbeit und konkreter Gesprächsbedarf bleiben getrennt. Keine Session gestartet, Aufgabe vergeben oder Entscheidung übernommen.', 'Documented work and concrete conversation needs remain separate. No session is started, task commissioned or decision adopted.'),
    tr('Lokale Ergänzungen werden nur aus tatsächlich vorhandenen, exakt einem Operator zugeordneten Gesprächsprompts übernommen. Nicht dargestellte oder unzugeordnete Entwürfe bleiben am ursprünglichen Ort erhalten und sind hier nicht erfasst.', 'Local additions are included only from actually available conversation prompts with an exact operator binding. Undisplayed or unassigned drafts remain in their original location and are not captured here.')];
  header.push(tr('Erfasste bearbeitete Gesprächsprompts: ', 'Captured edited conversation prompts: ') + drafts.length + '. ' + tr('Erfasst werden nur aktuell dargestellte Prompts; außerhalb des Filters oder projektspezifisch ausgeblendete Entwürfe können fehlen und bleiben unverändert erhalten.', 'Only currently rendered prompts are captured; off-filter or project-specific undisplayed drafts may be missing and remain unchanged.'));
  const field = (de, en, value) => tr(de, en) + ': ' + (value || tr('Nicht belegt.', 'Not evidenced.'));
  const blocks = operators.map(item => [
    '\n' + item.key + ' — ' + item.role + ' — ' + item.workArea,
    field('Einrichtung/Pause', 'Setup/pause', item.lifecycle), field('Dokumentierter Arbeitszustand, keine Live-Beobachtung', 'Recorded work state, no live observation', item.recordedState),
    field('Einordnung', 'Interpretation', item.state),
    field(item.time.kind === 'file-date' ? 'Quellendatum ohne Berichtsuhrzeit' : 'Belegte Berichtszeit', item.time.kind === 'file-date' ? 'Source date without report time' : 'Evidenced report time', item.time.value),
    field('Projektkennungen', 'Project IDs', item.projectIds.join(', ')),
    field('Ergebnis, wörtlicher Dateibericht', 'Result, literal file report', item.result),
    field('Belege', 'Evidence', item.evidence), field('Berichtete Prüfung', 'Reported verification', item.verification), field('Geltungsgrenzen', 'Limits', item.limits),
    field('Offene beauftragte Arbeit', 'Open commissioned work', item.tasks.map(task => task.id + ': ' + task.text + ' [' + task.project + '; ' + task.state + ']').join('\n') || tr('Kein gültiger offener Auftrag in den gelieferten Daten.', 'No valid open assignment in the supplied data.')),
    field(item.lifecycle === 'paused' || item.lifecycle === 'planned' ? 'Wörtlicher nächster Schritt im Bericht; keine Aktivierung oder Wiederaufnahme' : 'Dokumentierter nächster Schritt, kein neuer Auftrag', item.lifecycle === 'paused' || item.lifecycle === 'planned' ? 'Literal next-step report; no activation or resumption' : 'Recorded next step, not a new commission', item.next || item.reportNext),
    field('Konkreter Nutzerbeitrag', 'Concrete human contribution', item.questions.join('\n\n') || (!item.contributionKnown ? tr('Nutzerbeitrag unbekannt; Quellenbeleg nicht verfügbar.', 'Human contribution unknown; source evidence unavailable.') : item.lifecycle === 'paused' ? tr('Pausiert; keine Wiederaufnahme beauftragt.', 'Paused; no resumption commissioned.')
      : item.lifecycle === 'planned' ? tr('Geplant; keine Aktivierung oder Ausführung beauftragt.', 'Planned; no activation or execution commissioned.')
        : tr('Keine konkrete neue Frage in den gelieferten Quellen.', 'No concrete new question in the supplied sources.'))),
    field('Originaler Operatorpunkt', 'Original operator point', item.originalPoint),
    field('Dokumentierter Blocker', 'Recorded blocker', item.blocker),
    field('Quellengebundene Nachrichten, kein Zustellnachweis', 'Source-recorded messages, not delivery confirmation', item.messages.join('\n') || tr('Keine solchen Nachrichten geliefert.', 'No such messages supplied.')),
    ...(item.planningOriginal ? [field('Originaler geplanter Arbeitsbereich', 'Original planned work area', item.planningOriginal)] : []),
    field('Quelle', 'Source', item.source?.source), field('Quellenrevision', 'Source revision', item.source?.revision),
  ].join('\n'));
  const draftBlocks = drafts.map(item => [tr('Lokaler Gesprächsentwurf: ', 'Local conversation draft: ') + item.operator,
    field('Ursprungsschlüssel', 'Origin key', item.key), field('Quellenrevision des angezeigten Entwurfs', 'Source revision of rendered draft', item.sourceRevision),
    field('Quellenstatus', 'Source status', item.stale ? item.sourceWarning || tr('Quellenbindung geändert oder ungeklärt.', 'Source binding changed or unclear.') : tr('Keine Quellenänderung im dargestellten Prompt erkannt; keine neue Bestätigung.', 'No source change detected in the rendered prompt; no fresh verification.')),
    tr('Vollständiger komponierter Prompt, wörtlicher lokaler Snapshot:', 'Complete composed prompt, literal local snapshot:'), item.text].join('\n'));
  const text = [...header, ...blocks, ...draftBlocks, ...(!operators.length ? [tr('Dieser Umfang enthält keine zugeordneten Operatoren.', 'This scope contains no assigned operators.')] : [])].join('\n\n');
  return { scope, filterLabel: currentFilter, count: operators.length, total: registered.length, selectionCount: projected.filter(item => item.inSelection).length, operators, drafts, text,
    revision: operators.map(item => (item.source?.source || item.key) + '@' + (item.source?.revision || 'unknown')).join('\n'),
    compositionRevision: JSON.stringify([scope, filterKey, operators.map(item => [item.key, item.source, item.time, item.contributionKnown, item.projectIds, item.result, item.evidence, item.verification, item.limits, item.next, item.reportNext, item.originalPoint, item.blocker, item.messages, item.tasks, item.planningOriginal]), drafts.map(item => [item.key, item.text, item.sourceRevision, item.stale, item.sourceWarning])]) };
}

/** Literal samples orient the conversation; the complete source records remain in its prompt. */
export function coordinationPreview(value, language = 'en') {
  const samples = [];
  const sentence = text => {
    if (typeof Intl.Segmenter === 'function') return [...new Intl.Segmenter(language, { granularity: 'sentence' }).segment(text)][0]?.segment.trim() || '';
    return text.split('\n').find(line => line.trim())?.trim() || '';
  };
  for (const kind of ['question', 'task', 'result']) {
    const item = value.operators.find(operator => operator.source && (kind === 'question' ? operator.questions.length : kind === 'task' ? !['paused', 'planned'].includes(operator.lifecycle) && operator.tasks.some(task => task.text) : operator.result.trim() && !/^none[.!]?$/i.test(operator.result.trim())));
    if (!item) continue;
    const text = kind === 'question' ? item.questions[0] : kind === 'task' ? item.tasks.find(task => task.text).text : item.result;
    if (!samples.some(sample => sample.text === sentence(text))) samples.push({ key: item.key, workArea: item.workArea, source: item.source, kind, text: sentence(text) });
  }
  return samples;
}

/** Uses the existing copy-only composer; scope changes preserve its separate draft identities. */
export function coordinationBriefing({ L, S, A = globalThis.window?.LEITSTAND_ANTWORTEN, briefings = {}, visible = () => true, filterLabel = '', filterKey = '', snapshots = [], initialScope = 'all', initiallyOpen = false, onStateChange = () => {}, I = globalThis.window?.LEITSTAND_ICONS }) {
  const { el } = S;
  const summary = el('summary', { id: 'operator-coordination-open' },
    el('span', { text: tr('Gespräch vorbereiten', 'Prepare conversation') }),
    el('span', { class: 'operator-coordination-benefit', text: tr('Ergebnisse, beauftragte Arbeit und Klärungsbedarf zusammenführen.', 'Bring together results, commissioned work and questions.') }));
  const all = el('option', { value: 'all', text: tr('Alle Operatoren', 'All operators') });
  const selection = el('option', { value: 'selection', text: tr('Operatoren im Projektfilter', 'Operators in project filter') });
  const select = el('select', { id: 'operator-coordination-scope', 'aria-label': tr('Gesprächsumfang', 'Conversation scope') }, all, selection);
  if (!['all', 'selection'].includes(initialScope)) throw new TypeError('Unknown initial coordination scope');
  select.value = initialScope;
  const status = el('p', { class: 'op-muted', role: 'status' });
  const host = el('div', { class: 'operator-coordination-prompt' });
  const preview = el('ul', { class: 'operator-coordination-preview', 'aria-label': tr('Gesprächsvorschau', 'Conversation preview') });
  const refresh = el('button', { type: 'button', 'data-coordination-refresh': true, text: tr('Neu zusammenstellen', 'Refresh conversation') });
  const root = el('details', { class: 'operator-coordination' }, summary,
    el('label', {}, el('span', { text: tr('Umfang', 'Scope') }), select), status, preview, refresh, host);
  function render() {
    const value = coordinationModel({ L, briefings, visible, scope: select.value, filterLabel, filterKey, snapshots: typeof snapshots === 'function' ? snapshots() : snapshots, I });
    all.textContent = tr('Alle Operatoren', 'All operators') + ' (' + value.total + ')';
    selection.textContent = tr('Operatoren im Projektfilter', 'Operators in project filter') + ' (' + value.selectionCount + ')';
    status.textContent = tr('Projektfilter: ', 'Project filter: ') + value.filterLabel;
    const samples = coordinationPreview(value, globalThis.window?.UI_LANGUAGE?.language || 'de');
    const labels = { question: tr('Nutzerbeitrag', 'Human contribution'), task: tr('Beauftragte Arbeit', 'Commissioned work'), result: tr('Berichtetes Ergebnis', 'Reported result') };
    preview.replaceChildren(...samples.map(item => el('li', { 'data-coordination-preview': item.key },
      el('strong', { text: item.workArea + ' — ' + labels[item.kind] + ': ' }), el('span', { text: item.text }))));
    if (!samples.length) preview.append(el('li', { text: tr('Keine belegte Kurzvorschau verfügbar. Der vollständige Quellenkontext bleibt im Prompt erhalten.', 'No evidenced short preview is available. The full source context remains in the prompt.') }));
    if (!A?.discussion) { host.replaceChildren(el('p', { role: 'status', text: tr('Die gemeinsame Promptkomponente ist nicht verfügbar.', 'The shared prompt component is unavailable.') })); return; }
    host.replaceChildren(A.discussion({ id: 'coordination-briefing-' + value.scope, frage: value.text, text: value.text }, {
      ziel: 'operator', purpose: 'coordination-briefing-' + value.scope, revision: value.revision,
      sourceContext: tr('Einzelne Operatorquellen und Revisionen stehen im vollständigen Prompt.', 'Individual operator sources and revisions are listed in the complete prompt.'),
      compositionRevision: value.compositionRevision, compose: true, actionPreview: true,
    }));
  }
  const remember = () => { if (root.isConnected !== false) onStateChange({ scope: select.value, open: root.open }); };
  select.addEventListener('change', () => { render(); remember(); });
  refresh.addEventListener('click', render);
  let renderedOpen = Boolean(initiallyOpen);
  root.addEventListener('toggle', () => {
    if (root.open && !renderedOpen) render();
    renderedOpen = root.open;
    remember();
  });
  root.open = Boolean(initiallyOpen);
  if (root.open) render();
  return root;
}
