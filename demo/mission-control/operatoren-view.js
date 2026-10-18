import { ensemble } from './operatoren-ensemble.js';
import { plannedOperatorRow, lifecycle } from './operatoren-planning.js';
import { legacyPerspectiveHref } from './operatoren-perspectives.js';
import { buildRelations } from './relations-model.js';
import { operatorSummary, operatorBriefing, briefingText, reportExcerpt, operatorFollowup, operatorReportTime, formatReportTime, operatorProjects, operatorResults, operatorWorkState } from './operatoren-model.js';

function redirectLegacyPerspective() {
  const href = legacyPerspectiveHref(location.href);
  if (!href) return false;
  if (new URL(href).pathname !== location.pathname) { location.replace(href); return true; }
  history.replaceState(history.state, '', href);
  return false;
}

if (!redirectLegacyPerspective()) {
let chatBriefings = {};
let briefingPath = '';
let currentRound = '';

const tr = (de, en) => window.UI_LANGUAGE ? window.UI_LANGUAGE.t(de, en) : de;
const L = window.LEITSTAND;
const S = window.LEITSTAND_SHELL;
const { el } = S;
const root = document.getElementById('agenten');
const coordinatorKey = L.orchestrator?.key;
const operators = L.lanes.filter((lane) => lane.state !== 'RETIRED' && lane.key !== coordinatorKey)
  .toSorted((a, b) => L.laneRang(a.key) - L.laneRang(b.key));
const raw = new Map((window.LAB_LANES?.lanes || []).map((lane) => [lane.key, lane]));
const projects = new Map((window.PROJEKTE?.projekte || []).map((project) => [project.id, project]));
const answers = L.store('mission-control-demo-d-antworten');
const messages = L.store('mission-control-demo-d-nachrichten');
const sourceHref = (path, project = '', anchor = '') => L.sourceReaderHref(path, project, anchor);
const operatorName = (lane) => {
  const title = String(lane.rollentitel || '').trim();
  return title && title !== lane.key ? title : tr("Rollenbezeichnung fehlt", "Role title missing");
};
const allTasks = (lane) => [...(lane.auftraege || []), ...lane.erledigt, ...lane.abgenommen];
const assignmentSource = (lane, task) => sourceHref('demo-sources/' + lane.key + '.md', task?.entryId || task?.vorhaben || '', 'Aufträge');
let summaries;
let initialRender = true;
let renderedCategory;
let answerHistory = JSON.stringify(answers.get({}));
let messageHistory = messages.get({});
let sessionReadPending = false;
let sessionManualRefresh = false;
window.OPERATOR_SESSION_LOAD = { state: 'loading' };


// Historical browser records enrich discussion; canonical source needs do not
// consume them. Keep unchanged focus and selection independent of those stores.
function refreshBrowserHistory() {
  const nextAnswers = JSON.stringify(answers.get({}));
  const nextMessages = messages.get({});
  if (nextAnswers === answerHistory && JSON.stringify(nextMessages) === JSON.stringify(messageHistory)) return;
  answerHistory = nextAnswers;
  messageHistory = nextMessages;
  window.LEITSTAND_ANTWORTEN.refreshDiscussions();
}

// A source return restores its real trigger without replacing the selected operator.
function reportReturnTarget(record, scope, address) {
  if (!record || record.address !== address || typeof record.operatorId !== 'string') return null;
  const row = [...scope.querySelectorAll('#operator-list tbody tr')].find(item => item.id === 'operator-' + record.operatorId);
  const dialog = row?.querySelector('.op-report-dialog');
  const trigger = dialog && [...dialog.querySelectorAll('a[data-return-origin]')].find(link => link.id === record.triggerId && link.href === record.source);
  if (!trigger) return null;
  const source = new URL(trigger.href, address);
  if (source.origin !== new URL(address).origin || !['http:', 'https:'].includes(source.protocol)) return null;
  return { dialog, trigger };
}
function restoreReportOrigin() {
  const target = reportReturnTarget(history.state?.operatorReportReturn, root, location.href);
  if (!target) return false;
  const open = document.querySelector('dialog[open]');
  if (open && open !== target.dialog) return false;
  if (!target.dialog.open) target.dialog.showModal();
  target.trigger.focus({ preventScroll: true });
  target.trigger.scrollIntoView({ block: 'nearest' });
  return true;
}

root.addEventListener('click', event => {
  const link = event.target.closest('.op-report-dialog a[data-return-origin]');
  if (!link || event.defaultPrevented || event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey
    || link.hasAttribute('download') || link.target && link.target !== '_self') return;
  const record = { address: location.href, operatorId: link.closest('tr').id.slice('operator-'.length), triggerId: link.id, source: link.href };
  if (!reportReturnTarget(record, root, location.href)) return;
  history.replaceState({ ...history.state, operatorReportReturn: record }, '', location.href);
});
window.addEventListener('pageshow', event => { if (event.persisted) restoreReportOrigin(); });

function compositionRevision(lane, briefing) { return JSON.stringify([allTasks(lane), briefing.status, briefing.source]); }
function contexts(lane, briefing, scope = {}) {
  const projectIds = scope.entryId ? [scope.entryId] : briefing.conversationProjectIds || [];
  const assignments = buildRelations(L, window.PROJEKTE, S.visible).assignments.filter(task => task.operatorId === lane.key
    && (scope.kennung ? task.kennung === scope.kennung : projectIds.length ? projectIds.includes(task.projectId) : !['erledigt', 'abgenommen'].includes(task.zustand)));

  const items = [];
  if (briefing.source && briefingPath && briefing.status) items.push({ id: lane.key + ':current-report', kind: 'artifact', label: tr('Eigener Bericht', 'Own report'), text: briefing.status, source: { file: briefingPath, operator: lane.key, projects: briefing.projectIds, reportedAt: briefing.source.completedAt || briefing.source.reportedAt }, revision: briefing.source.completedAt || briefing.source.reportedAt || '' });
  for (const task of assignments) {
    const source = { file: 'demo-sources/' + lane.key + '.md', projectId: task.projectId, assignment: task.kennung, state: task.zustand, revision: task.quellenrevision };
    for (const [field, kind] of [['auftrag', 'workflow'], ['ergebnis', 'artifact'], ['pruefung', 'verified']]) {
      if (!task[field]) continue;
      items.push({ id: task.key + ':' + field, kind, label: (projects.get(task.projectId)?.titel || task.projectId) + ': ' + L.shortLabel(task[field], 6), text: task[field], source, revision: task.quellenrevision });
    }
  }
  if (briefing.source && briefingPath) for (const [index, text] of (briefing.gaps || []).entries()) {
    if (typeof text === 'string' && text.trim()) items.push({ id: lane.key + ':limit:' + index, kind: 'limit', label: L.shortLabel(text, 7), text, source: briefingPath, revision: briefing.source.completedAt || briefing.source.reportedAt || '' });
  }
  const projectId = scope.entryId || (projectIds.length === 1 ? projectIds[0] : assignments.length === 1 ? assignments[0].projectId : '');
  const project = projects.get(projectId) || L.entryById.get(projectId);
  if (project && !lane.paused && lane.setup !== 'planned') {
    const exact = assignments.length === 1 ? assignments[0] : null;
    const work = scope.frage || exact?.auftrag || '';
    if (work.trim()) items.push({
      id: lane.key + ':follow-up-outline:' + projectId, kind: 'workflow',
      label: tr('Folgeauftrag vorbereiten', 'Prepare a follow-up task'),
      text: [
        tr('Bearbeitbarer Auftragsentwurf für das bestehende Gespräch. Prüfe den konkreten Schreibbereich am Originalauftrag; diese Vorbereitung erweitert keine Autorisierung.', 'Task outline for the existing conversation. Check the concrete write scope in the original assignment; this preparation extends no authorization.'),
        tr('Projekt: ', 'Project: ') + (project.titel || project.name || projectId) + ' (' + projectId + ').',
        tr('Operator: ', 'Operator: ') + operatorName(lane) + '.',
        tr('Konkrete Arbeit oder Frage, laut Quelle: ', 'Concrete work or question, as recorded: ') + work,
        tr('Erwartetes Ergebnis: Ein beurteilbares Ergebnis zu dieser Arbeit, mit Material- und Quellenlinks sowie tatsächlich ausgeführten Prüfungen und verbleibenden Grenzen.', 'Expected result: A reviewable result addressing this work, with material and source links, checks actually run and remaining limits.'),
        tr('Schreibbereich: Der bestehende Originalauftrag und die geltenden Projektregeln bestimmen die erlaubten Dateien. Einen fehlenden Bereich im Entwurf konkret benennen; keine zusätzlichen Quellen oder Rollen vereinnahmen.', 'Write scope: The original assignment and governing project rules determine the allowed files. State any missing scope concretely in the draft; do not assume additional sources or roles.'),
        tr('Voraussetzungen: Aktuellen Originalauftrag, Projektstand und Abhängigkeiten lesen; fehlende oder widersprüchliche Grundlagen sichtbar benennen.', 'Prerequisites: Read the current original assignment, project state and dependencies; identify missing or conflicting evidence.'),
        tr('Prüfung: Ergebnis gegen die zitierte Aufgabe und Originalquellen prüfen, den betroffenen tatsächlichen Arbeitsweg ausführen und Prüfgrenzen angeben. Kopieren startet keinen Operator.', 'Check: Compare the result with the quoted task and original sources, exercise the affected real workflow and state verification limits. Copying starts no operator.'),
      ].join('\n\n'),
      source: { file: 'demo-sources/' + lane.key + '.md', projectId, ...(exact ? { assignment: exact.kennung, state: exact.zustand } : {}) },
      revision: exact?.quellenrevision || lane.setupRevision || '',
    });
  }
  return items;
}

function projectLink(item) {
  const project = projects.get(item.projectId) || L.entryById.get(item.projectId);
  return project
    ? el('a', { href: 'projekte.html?projekt=' + encodeURIComponent(item.projectId), title: project.name, text: project.name || project.titel })
    : el('span', { class: 'op-muted', text: item.projectName || item.projectId || tr("Projekt nicht erfasst", "Project not recorded") });
}

function resultList(lane, briefing) {
  const items = operatorResults(lane, briefing, L, S.visible);
  if (!items.length) return el('p', { class: 'op-result-gap op-muted', text: tr("Ein Ergebnis ist für das gewählte Thema noch nicht passend belegt.", "No matching output is evidenced for the selected category.") });
  const notes = items.map(item => item.note).filter(Boolean);
  const groups = new Map();
  for (const item of items) {
    const key = JSON.stringify(item.projectIds);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return el('div', { class: 'op-result-groups' }, ...[...groups.values()].map(group => el('section', { class: 'op-result-group' },
    groups.size > 1 ? el('p', { class: 'op-task-heading' }, ...group[0].projectIds.map(projectId => projectLink({ projectId }))) : null,
    el('ul', { class: 'op-result-list op-gap-list', role: 'list' }, ...group.map(item => {
      return el('li', { ...(item.task ? { id: 'result-' + lane.key + '-' + item.task.kennung, 'data-kennung': item.task.kennung, tabindex: '-1' } : {}) },
        el('p', { class: 'op-result-text', text: briefingText(item.text) }), item.note && notes.length < 2 ? el('span', { class: 'op-result-note op-muted', text: item.note }) : null);
    })))), notes.length > 1 ? el('p', { class: 'op-result-note', text: tr("Geltungsbereich: ", "Scope: ") + (notes.every(note => /histor|Beobachtung bis|Lieferstand vom/i.test(note)) ? tr("historischer Ergebnisstand. ", "historical output. ") : '') + tr("Getrennte Beobachtungs- und Prüfstände unter Quellen und Prüfgrenzen.", "Separate observation and check dates are retained under Sources and limits.") }) : null);
}

function needsList(lane, summary, briefing) {
  const box = el('div', { class: 'op-needs' });
  if (lane.paused) return el('p', { class: 'op-paused-next', text: tr('Pausiert auf ausdrücklichen Nutzerwunsch. Wiederaufnahme nur auf neuen Auftrag.', 'Paused at the user’s explicit request. Resume only on a new request.') });
  const reported = Array.isArray(briefing.questions);
  const pending = reported ? briefing.questions.filter(question => L.operatorContribution(question).text).map((question, index) => {
    const task = allTasks(lane).find(task => task.kennung === question.taskId);
    const project = task?.entryId || (briefing.projectIds?.length === 1 ? briefing.projectIds[0] : '');
    if (project && L.entryById.has(project) && !S.visible(L.entryById.get(project))) return null;
    return {
      text: question.text, kind: question.kind, blocking: question.blocking,
      question: { ...task, operator: lane.key, key: lane.key, id: 'briefing-' + currentRound + '-' + lane.key + '-' + index,
        frage: question.text, text: question.text, entryId: project, entry: project, projekt: project },
    };
  }).filter(Boolean) : summary.needs.filter(need => need.kind === 'question' && L.operatorQuestion(need.text));
  const followup = operatorFollowup(lane, briefing, pending.map(need => reported ? need.text : L.operatorQuestion(need.text)));
  const workText = followup.nextText || '';
  const nextWork = workText ? el('p', { class: 'op-next-work', text: workText }) : null;
  if (!followup.text) {
    if (!workText || /^(?:none|–|—|-)[.!]?$/i.test(workText.trim())) return el('div', { class: 'op-next' },
      nextWork || el('p', { class: 'op-muted', text: tr('Nächster Schritt nicht erfasst.', 'Next step not recorded.') }));

    const optional = el('details', { id: 'optional-conversation-' + lane.key, class: 'op-optional-conversation' }, el('summary', { text: tr('Gespräch vorbereiten', 'Prepare a conversation') }));
    const domains = [...new Set(operatorProjects(lane, briefing, L, S.visible).map(item => L.entryById.get(item.projectId)?.name || item.projectName).filter(Boolean))];
    const text = [tr('Besprechen wir den dokumentierten Stand von ', 'Let us review the documented work of ') + operatorName(lane) + (domains.length ? tr(' für ', ' for ') + domains.join(', ') : '') + '.',
      reportExcerpt(briefing.status, window.UI_LANGUAGE?.language || 'en'),
      briefing.next ? tr('Dokumentierter nächster Schritt: ', 'Recorded next step: ') + briefingText(briefing.next) : ''].filter(Boolean).join('\n\n');
    optional.append(window.LEITSTAND_ANTWORTEN.discussion({ operator: lane.key, key: lane.key, id: 'optional-' + lane.key, text }, { ziel: 'operator', purpose: 'Optional conversation', compose: true, compositionRevision: () => compositionRevision(lane, briefing), contextItems: () => contexts(lane, briefing) }));
    return el('div', { class: 'op-next' }, nextWork, optional);
  }
  const exactTasks = [...new Set(pending.map(need => need.question.kennung).filter(Boolean))];
  const task = exactTasks.length === 1 ? allTasks(lane).find(task => task.kennung === exactTasks[0]) : null;
  const item = { ...task, operator: lane.key, key: lane.key, id: 'followup-' + lane.key, frage: followup.text,
    entryId: task?.entryId || (briefing.projectIds?.length === 1 ? briefing.projectIds[0] : '') };
  const options = { ziel: 'lane', purpose: 'Current follow-up', compose: true, actionPreview: followup.text, copyLabel: true, compositionRevision: () => compositionRevision(lane, briefing), contextItems: () => contexts(lane, briefing, item),
    ...(briefing.source ? { briefing: { source: new URL(briefingPath, location.href).href,
      reportedAt: briefing.source.completedAt || briefing.source.reportedAt, checked: briefing.checked } } : {}) };
  box.dataset.questionCount = String(pending.length);
  box.dataset.requiresAnswer = String(pending.some(need => reported ? need.blocking : true));
  if (workText.trim() && workText.trim() !== followup.text.trim()) box.append(nextWork);
  box.append(window.LEITSTAND_ANTWORTEN.discussion(item, options));
  return box;
}

function reportSource(lane, briefing) {
  const fileChanged = raw.get(lane.key)?.file_mtime?.slice(0, 10);
  const reportDate = L.laneDatum(lane);
  const instant = briefing.source?.completedAt || briefing.source?.reportedAt;
  const recordedTime = operatorReportTime(lane, briefing);
  const value = recordedTime.value || reportDate || fileChanged || '';
  const fileTime = recordedTime.kind === 'file-report';
  const fullDate = (instant || fileTime) && !/^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value).toLocaleString(window.UI_LANGUAGE?.locale || 'de-DE', { timeZone: 'Europe/Vienna', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : L.fmtLang(reportDate || fileChanged);
  const label = briefing.source ? ['coordinator-report', 'operator-report'].includes(briefing.source.kind) ? tr("Eigener Bericht", "Own report") : tr("Synthetischer Beispielbericht", "Chat report") : reportDate ? tr("Dateibericht", "File report") : tr("Datei geändert", "File changed");
  return el('p', { class: 'op-report-source', id: 'report-source-' + lane.key }, el('a', {
    href: lane.key === 'build' ? sourceHref('demo-sources/build.md') : briefing.source ? briefingPath : sourceHref('demo-sources/' + lane.key + '.md'),
    ...(lane.key === 'build' || !briefing.source ? { 'aria-label': tr("Bericht in Obsidian öffnen, ", "Open report in Obsidian, ") + (formatReportTime(value) || tr("ohne belegten Zeitpunkt", "time not evidenced")) } : {}),
    title: label + ' ' + (fullDate || tr("ohne Datum", "date not recorded")) + (instant ? tr(", Europe/Vienna. ", ", Europe/Vienna. ") + (briefing.statusEditorial ? tr("Quellengebundene redaktionelle Kurzfassung. Die vollständige eigene Rückmeldung steht im Bericht.", "Source-bound editorial summary. The complete original reply is in the report.") : briefing.selectedReport ? tr("Wörtlicher Abschnitt report der eigenen Rückmeldung.", "Verbatim report section of the original reply.") : tr("Wörtliche eigene Rückmeldung.", "Verbatim original reply.")) : (fileTime ? tr(", Europe/Vienna. Zeitpunkt aus der datierten Standzeile, kein Chat-Bericht.", ", Europe/Vienna. Time from the dated status line, a file report.") : tr(". Gespeicherter Dateibericht ohne belegte Uhrzeit.", ". Saved file report with no evidenced time."))) + (briefing.checked ? tr(" Prüfstand: ", " Check basis: ") + briefing.checked : ''),
  }, window.LEITSTAND_ICONS.fact('clock'), el('time', { ...(value ? { datetime: value } : {}), text: formatReportTime(value) || tr("Datum nicht erfasst", "Date not recorded") })));
}

function operatorRow(lane) {
  if (lane.setup === 'planned') {
    const row = plannedOperatorRow(lane, { L, S });
    row.querySelector('.op-identity')?.append(el('div', { class: 'operator-session-host', 'data-session-operator': lane.key }));
    return row;
  }
  const summary = summaries.get(lane.key);
  const briefing = operatorBriefing(lane, chatBriefings[lane.key]);
  const needs = needsList(lane, summary, briefing);
  const state = operatorWorkState(lane, briefing, needs?.dataset.requiresAnswer === 'true');
  const name = el('h3', { id: 'name-' + lane.key, tabindex: '-1' });
  const mark = window.LEITSTAND_ICONS.identity(lane, { L, domain: false });
  const relationships = operatorProjects(lane, briefing, L);
  name.textContent = window.LEITSTAND_ICONS.workArea?.(lane, { L, briefing }) || lane.adresse || lane.key;
  name.setAttribute('aria-label', name.textContent + ': ' + operatorName(lane));
  const assessment = briefing.assessment;
  const ownAssessment = briefing.ownAssessment;
  const assessmentDate = briefing.assessedAt ? formatReportTime(briefing.assessedAt) : '';
  const assessmentScope = (briefing.assessmentHistorical ? tr("Vorheriger Stand: ", "Previous assessment: ") : tr("Bewertung: ", "Assessment: ")) + assessmentDate;
  const identity = el('div', { class: 'op-identity' },
    el('div', { class: 'op-identity-heading' }, mark, el('div', {}, name, name.textContent === operatorName(lane) ? null : el('p', { class: 'op-role', text: operatorName(lane) }))),
    el('div', { class: 'op-assessment' },
      el('span', { class: 'op-rating' },
        assessment ? el('span', { class: 'op-conclusion-scale', 'data-level': assessment.level, ...(assessment.level === 'numeric' ? { 'data-score': assessment.score, style: '--assessment-position: ' + assessment.score + '%' } : {}), 'data-historical': String(briefing.assessmentHistorical), role: 'img', 'aria-label': assessmentScope + ': ' + (assessment.level === 'numeric' ? tr("Eigene subjektive Einschätzung ", "Own subjective assessment ") + assessment.score + tr(" von 100. ", " out of 100. ") : '') + assessment.summary, title: assessmentScope + '. ' + (assessment.level === 'numeric' ? tr("Eigene subjektive Einschätzung ", "Own subjective assessment ") + assessment.score + tr("/100, keine Messung. ", "/100, a subjective assessment. ") : '') + assessment.summary })
          : el('span', { class: 'op-assessment-neutral', title: ownAssessment ? ownAssessment.summary : tr("Keine belegte vollständige eigene Einschätzung vorhanden.", "No evidenced complete self-assessment available."), text: ownAssessment ? tr("Einschätzung ohne Skalenwert", "Assessment without scale value") : tr("Einschätzung fehlt", "Assessment missing") }),
        ownAssessment && briefing.assessmentSeparate ? el('time', { class: 'op-assessment-date', datetime: briefing.assessedAt, title: assessmentScope + tr(". Eigene Bewertung mit ursprünglichem Bezugs- und Geltungsbereich, getrennt vom aktuellen Bericht.", ". Own assessment with its original scope, separate from the current report."), text: assessmentScope }) : null),
      el('span', { class: 'op-report-meta' }, reportSource(lane, briefing))));
  identity.append(el('div', { class: 'operator-session-host', 'data-session-operator': lane.key }));
  const life = lifecycle(lane, { S });
  identity.dataset.setup = life.setup.dataset.setup;
  identity.dataset.activity = 'unknown';
  if (lane.paused) identity.append(el('p', { class: 'op-pause-label', text: tr('Pausiert', 'Paused') }));
  identity.title = life.setup.textContent + ', ' + life.activity.textContent + '. ' + state.text;
  const completeReport = briefingText(briefing.status);
  const status = el('div', { class: 'op-status' }, el('p', { class: 'op-status-text', title: tr('Wörtlicher Berichtsauszug; vollständiger Bericht über das Quellenzeichen beim Meldezeitpunkt.', 'Literal report excerpt; read the complete report via the source icon beside its timestamp.'), text: reportExcerpt(completeReport, window.UI_LANGUAGE?.language || 'en') }));
  const ownLimits = ownAssessment ? Array.isArray(ownAssessment.limits) ? ownAssessment.limits : [ownAssessment.limits] : [];
  const qualifications = briefing.hasGapSelection ? briefing.gapItems : briefing.gaps.length ? briefing.gaps : ownLimits;
  const evidence = el('div', { class: 'op-evidence' });
  if (briefing.fileReport?.fields.length) {
    const fieldNames = { Evidence: tr('Belege', 'Evidence'), Verification: tr('Prüfung', 'Verification'), Deviation: tr('Abweichung', 'Deviation') };
    evidence.append(el('section', { class: 'op-file-report', 'data-source': briefing.fileReport.source, 'data-revision': briefing.fileReport.revision },
      el('h4', { text: tr('Aktueller Quellenbericht', 'Current source report') }),
      el('dl', {}, ...briefing.fileReport.fields.map(field => el('div', {},
        el('dt', { text: fieldNames[field.key] }), el('dd', { text: field.text }))))));
  }
  const dialog = el('dialog', { class: 'op-report-dialog', 'aria-labelledby': 'report-title-' + lane.key },
    el('h3', { id: 'report-title-' + lane.key, text: operatorName(lane) }),
    el('p', { class: 'op-complete-report', text: briefingText(briefing.status) }), evidence);
  const close = el('button', { type: 'button', class: 'op-report-close', text: tr('Schließen', 'Close') });
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    if (history.state?.operatorReportReturn?.operatorId !== lane.key) return;
    const { operatorReportReturn, ...rest } = history.state;
    history.replaceState(rest, '', location.href);
  });
  dialog.prepend(close);
  const readReport = el('button', { type: 'button', class: 'op-report-open', 'aria-label': tr('Vollständigen Bericht und Belege lesen: ', 'Read full report and evidence: ') + operatorName(lane), title: tr('Vollständiger Bericht und Belege', 'Full report and evidence') }, window.LEITSTAND_ICONS.fact('source'));
  readReport.addEventListener('click', () => dialog.showModal());
  identity.querySelector('.op-report-meta').append(readReport);
  const tileNames = { context: tr("Kontext", "Context"), result: tr("Vorhandenes Ergebnis", "Existing output"), limit: tr("Belegte Grenze", "Evidenced limit"), contribution: tr("Fachlicher Beitrag", "Scholarly contribution") };
  if (briefing.contextTiles?.length && S.visible(L.entryById.get(briefing.tileProjectId))) {
    evidence.append(el('dl', { class: 'op-context-tiles', 'aria-label': tr("Fachlicher Kontext, synthetischer Beispielkontext", "Scholarly context, bounded Fancy pilot") },
      ...briefing.contextTiles.map(tile => el('div', { class: 'op-context-tile tile-' + tile.kind },
        el('dt', { text: tileNames[tile.kind] }), el('dd', { text: tile.text })))));
    evidence.append(el('ul', { class: 'op-tile-sources', role: 'list' }, ...briefing.contextTiles.map(tile =>
      el('li', {}, el('a', { href: L.sourceReaderHref(tile.source.file, briefing.tileProjectId, tile.source.heading || ''), text: tileNames[tile.kind] + tr(": Quelle der Kurzphrase", ": source of the short phrase") })))));
  }
  status.append(dialog);
  evidence.append(resultList(lane, briefing));
  if (qualifications.length) evidence.append(el('ul', { class: 'op-qualifications op-gap-list', role: 'list',
    title: briefing.gapItems.length ? tr("Quellengebundene redaktionelle Kurzfassung", "Source-bound editorial summary") : tr("Originale Grenzen der eigenen Einschätzung", "Original limits of the self-assessment") }, ...qualifications.map(text => el('li', { text: briefingText(text) }))));
  if (!briefing.source) evidence.append(el('p', { class: 'op-muted', text: tr("Keine passende aktuelle Chat-Rückmeldung hinterlegt.", "No matching current chat reply recorded.") }));
  const inScope = relationships.length && relationships.every(project => S.visible(L.entryById.get(project.projectId)));
  const results = el('div', { class: 'op-results' });
  const assignmentLink = el('a', { class: 'op-historical-source', href: assignmentSource(lane), text: tr("Auftragsunterlagen", "Assignment sources"), title: tr("Vollständige Aufträge und bestehende historische Vertragsabnahmen. Die Ansicht nimmt keine Abnahme vor.", "Complete assignments and existing historical acceptances. This view performs no acceptance.") });
  if (ownAssessment) evidence.append(el('p', { class: 'op-qualifications' },
    el('a', { href: briefingPath, text: assessmentScope, title: tr("Originalquelle der eigenen Einschätzung; getrennt vom aktuellen Arbeitsbericht.", "Original self-assessment source, separate from the current work report.") }),
    '. ' + ownAssessment.summary));
  for (const item of briefing.assessmentHistory || []) {
    const date = item.source.completedAt || item.source.reportedAt;
    evidence.append(el('p', { class: 'op-previous-assessment' },
      el('a', { href: 'briefings/' + item.snapshot, text: tr("Frühere eigene Einschätzung, ", "Earlier self-assessment, ") + formatReportTime(date) }),
      '. ' + item.assessment.summary));
  }
  if (ownLimits.length) evidence.append(el('ul', { class: 'op-own-limits op-gap-list', role: 'list' }, ...ownLimits.map(text => el('li', { text: briefingText(text) }))));
  if (briefing.checked) evidence.append(el('p', { class: 'op-qualifications', text: tr("Im Bericht geprüft: ", "Reported check: ") + briefingText(briefing.checked) }));
  evidence.append(assignmentLink);
  const resultNotes = operatorResults(lane, briefing, L, S.visible).map(item => item.note).filter(Boolean);
  if (resultNotes.length > 1) evidence.append(el('ul', { class: 'op-result-evidence op-gap-list', role: 'list' }, ...resultNotes.map(text => el('li', { text: briefingText(text) }))));
  const findings = briefing.importantFindings;
  if (findings.length && inScope) evidence.append(el('section', { class: 'op-important-findings' },
    el('h4', { text: tr("Wichtige Befunde", "Key findings") }),
    el('ul', { class: 'op-gap-list', role: 'list' }, ...findings.map(text => el('li', { text: briefingText(text) })))));
  if (needs) results.append(needs);
  if (summary.hiddenTasks || relationships.some(project => !S.visible(L.entryById.get(project.projectId)))) {
    const reset = el('button', { type: 'button', class: 'op-filter-reset', text: tr("Aufträge außerhalb dieses Themas zeigen", "Show assignments outside this category") });
    reset.addEventListener('click', () => { S.waehlen(null); document.getElementById('name-' + lane.key)?.focus({ preventScroll: true }); });
    identity.append(reset);
  }
  for (const [index, link] of [...dialog.querySelectorAll('a[href]')].entries()) {
    link.id ||= 'report-link-' + lane.key + '-' + index;
    link.setAttribute('data-return-origin', '');
  }
  return el('tr', { id: 'operator-' + lane.key },
    el('th', { scope: 'row' }, identity),
    el('td', {}, el('span', { class: 'op-field-label', 'aria-hidden': 'true', text: tr("Stand", "Status") }), status),
    el('td', {}, el('span', { class: 'op-field-label', 'aria-hidden': 'true', text: tr("Weiter", "Next") }), results));
}

// Older project and work links still carry operator/assignment selection.
// Resolve only exact identities to an existing result or the actual source.
function legacyRoute(focus = false) {
  const notice = document.getElementById('operator-route-error');
  if (notice) { notice.textContent = ''; notice.hidden = true; notice.setAttribute('role', 'alert'); }
  const params = new URLSearchParams(location.search);
  let hash = '';
  let error = '';
  try { hash = decodeURIComponent(location.hash.slice(1)); } catch { error = tr("Der Direktlink ist nicht lesbar.", "The direct link cannot be read."); }
  if (hash.startsWith('result-')) {
    const target = document.getElementById(hash);
    if (target?.matches('.op-result-list li[data-kennung]')) {
      if (!params.has('operator') && !params.has('auftrag')) { target.closest('details')?.setAttribute('open', ''); if (target.closest('dialog') && !target.closest('dialog').open) target.closest('dialog').showModal(); target.focus(); target.scrollIntoView({ block: 'nearest' }); return ''; }
      const operator = target.closest('tr').id.slice('operator-'.length);
      if (params.has('operator') && L.laneKey(params.get('operator')) !== operator || params.has('auftrag') && params.get('auftrag') !== target.dataset.kennung) error = tr("Der Direktlink enthält widersprüchliche Ergebnisidentitäten.", "The direct link has conflicting output identities.");
    } else error = tr("Das verlinkte Ergebnis ist in dieser Ansicht nicht vorhanden.", "The linked output is not present in this view.");
  }
  if (hash.startsWith('ausfuehrung-')) {
    location.replace('ausfuehrung.html#' + encodeURIComponent(hash));
    return '';
  }
  if (params.getAll('operator').length > 1 || params.getAll('auftrag').length > 1) error = tr("Der Direktlink enthält mehrere Auswahlwerte.", "The direct link has multiple selection values.");
  const key = params.get('operator') || /^(?:operator-|karte-|mehr-)(.+)$/.exec(hash)?.[1] || '';
  const id = params.get('auftrag') || (hash.startsWith('auftrag-') ? hash.slice(8) : '');
  const withdrawn = key && L.lanes.find(item => item.state === 'RETIRED' && item.key === L.laneKey(key));
  if (!error && withdrawn && !id && notice) {
    const original = el('a', { id: 'operator-withdrawn-source', href: assignmentSource(withdrawn),
      text: tr('Historisches Profil im Original lesen', 'Read the original historical profile') });
    notice.replaceChildren(el('span', { text: tr('Dieses Profil wurde zurückgenommen. ', 'This profile was withdrawn. ') }), original);
    notice.hidden = false;
    notice.setAttribute('role', 'status');
    if (focus || initialRender) original.focus();
    return '';
  }
  let lane = key ? L.lanes.find(item => item.state !== 'RETIRED' && item.key === L.laneKey(key)) : null;
  if (!error && id && !key) {
    const matches = L.lanes.filter(item => item.state !== 'RETIRED' && allTasks(item).some(task => task.kennung === id));
    if (matches.length === 1) lane = matches[0];
    else error = tr("Der Auftrag ist keinem eindeutigen Operator zugeordnet.", "The assignment has no unique operator binding.");
  }
  if (!error && key && !lane) error = tr("Operator nicht gefunden.", "Operator not found.");
  if (!error && lane && id) {
    const matches = allTasks(lane).filter(task => task.kennung === id);
    if (matches.length === 1) {
      const target = document.getElementById('result-' + lane.key + '-' + matches[0].kennung);
      if (target) {
        const url = new URL(location.href);
        url.searchParams.delete('operator'); url.searchParams.delete('auftrag'); url.hash = target.id;
        history.replaceState(history.state, '', url); target.closest('details')?.setAttribute('open', ''); if (target.closest('dialog') && !target.closest('dialog').open) target.closest('dialog').showModal(); target.focus(); target.scrollIntoView({ block: 'nearest' });
      } else if (notice) {
        const source = el('a', { id: 'operator-route-source', href: assignmentSource(lane, matches[0]), text: tr("Auftrag in Obsidian öffnen", "Open assignment in Obsidian") });
        notice.replaceChildren(el('span', { text: tr("Das Ergebnis steht in den Auftragsunterlagen. ", "The output is in the assignment sources. ") }), source);
        notice.setAttribute('role', 'status');
        notice.hidden = false;
        source.focus();
      }
      return '';
    }
    error = tr("Auftrag nicht gefunden oder nicht eindeutig. Der Link zeigt keine andere Arbeit an.", "Assignment not found or ambiguous. The link does not select unrelated work.");
  }
  const selected = lane && lane.key !== coordinatorKey ? lane : null;
  if (key || id || error || ['arbeit', 'fazit', 'pruefstand', 'auftraege'].includes(hash)) {
    const url = new URL(location.href);
    url.searchParams.delete('operator');
    url.searchParams.delete('auftrag');
    url.hash = !error && selected ? 'operator-' + selected.key : 'aufstellung';
    history.replaceState(history.state, '', url);
    focus = true;
  }
  if (notice) { notice.textContent = error; notice.hidden = !error; }
  if (focus || initialRender && hash === 'aufstellung') document.getElementById(!error && selected ? 'name-' + selected.key : 'aufstellung-titel')?.focus();
  return error;
}

function captureFocus() {
  const node = document.activeElement;
  if (!root.contains(node)) return null;
  return { id: node.id, href: node.getAttribute('href'), tag: node.tagName,
    chatKey: node.closest('.chat-discussion')?.dataset.chatKey, chatControl: node.dataset.chatControl,
    start: node.selectionStart, end: node.selectionEnd };
}

function restoreFocus(saved, scope = root) {
  if (!saved) return;
  const node = saved.chatKey && saved.chatControl
    ? scope.querySelector('.chat-discussion[data-chat-key="' + CSS.escape(saved.chatKey) + '"] [data-chat-control="' + CSS.escape(saved.chatControl) + '"]')
    : saved.id ? scope.querySelector('#' + CSS.escape(saved.id)) : saved.href
      ? [...scope.querySelectorAll('a')].find((link) => link.href === new URL(saved.href, location.href).href) : null;
  node?.focus({ preventScroll: true });
  if (typeof node?.setSelectionRange === 'function' && typeof saved.start === 'number') node.setSelectionRange(saved.start, saved.end);
}


function placeSessionPanel(details) {
  const panel = details.querySelector('.op-ensemble-profile-content') || details.querySelector('.operator-session-description');
  if (!panel || !details.open) return;
  const bounds = details.querySelector('summary').getBoundingClientRect();
  const width = panel.getBoundingClientRect().width;
  const height = Math.min(panel.scrollHeight, innerHeight * .65);
  const left = Math.max(12, Math.min(bounds.left, innerWidth - width - 12));
  const top = Math.max(12, Math.min(bounds.bottom, innerHeight - height - 12));
  panel.style.setProperty('--session-panel-left', left + 'px');
  panel.style.setProperty('--session-panel-top', top + 'px');
}


function metadataRetry(lane) {
  const state = window.OPERATOR_SESSION_LOAD?.state;
  const reason = window.OPERATOR_SESSIONS?.operators?.[lane.key]?.reason;
  if (state !== 'error' && !['source-changed', 'session-changed', 'session-unavailable'].includes(reason)) return null;
  return el('button', { type: 'button', class: 'knopf', 'data-session-reload': true,
    text: tr('Metadaten erneut lesen', 'Read metadata again') });
}
function showSessionLoadState() {
  const box = root.querySelector('#operator-session-load');
  if (!box) return;
  const load = window.OPERATOR_SESSION_LOAD;
  const focused = box.contains(document.activeElement);
  const text = load.state === 'loading' ? tr('Sitzungsmetadaten werden gelesen …', 'Reading session metadata …')
    : load.state === 'error' ? load.error === 'invalid-data' ? tr('Sitzungsmetadaten konnten nicht validiert werden.', 'Session metadata could not be validated.')
      : tr('Sitzungsmetadaten konnten nicht geladen werden.', 'Session metadata could not be loaded.')
      : tr('Sitzungsmetadaten neu gelesen.', 'Session metadata read again.');
  box.hidden = load.state === 'loaded' && !sessionManualRefresh;
  box.replaceChildren(el('span', { text }), ...(load.state !== 'loading' ? [el('button', {
    id: 'operator-session-refresh', type: 'button', 'data-session-reload': true,
    text: tr('Metadaten erneut lesen', 'Read metadata again') })] : []));
  if (focused && !box.hidden) (box.querySelector('button') || box).focus({ preventScroll: true });
}
function showSessionMetadata() {
  const metadata = window.OPERATOR_SESSION_METADATA;
  if (!metadata) return;
  showSessionLoadState();
  for (const host of root.querySelectorAll('.operator-session-host')) {
    const lane = L.lanes.find(item => item.key === host.dataset.sessionOperator);
    const old = host.querySelector('details');
    const open = old?.open;
    const focused = host.contains(document.activeElement);
    const line = metadata.line(lane);
    const proof = line.querySelector('details');
    if (proof) proof.open = Boolean(open);
    const retry = metadataRetry(lane);
    if (retry) line.querySelector('.operator-session-description')?.append(retry);
    host.replaceChildren(line);
    if (focused) line.querySelector('summary')?.focus({ preventScroll: true });
  }
  for (const host of root.querySelectorAll('[data-session-detail-operator]')) {
    const lane = L.lanes.find(item => item.key === host.dataset.sessionDetailOperator);
    if (!lane) continue;
    const focused = host.contains(document.activeElement);
    const retryFocused = document.activeElement?.matches('[data-session-reload]');
    const open = host.querySelector('.operator-session-proof')?.open;
    const description = metadata.description(lane);
    const proof = description.querySelector('.operator-session-proof');
    if (proof) proof.open = Boolean(open);
    const retry = metadataRetry(lane);
    if (retry) description.append(retry);
    host.replaceChildren(description);
    if (focused) (retryFocused && retry || proof?.querySelector('summary'))?.focus({ preventScroll: true });
  }
  for (const details of root.querySelectorAll('.op-ensemble-profile')) placeSessionPanel(details);
}
async function loadSessionMetadata(manual = false) {
  if (sessionReadPending) return;
  sessionReadPending = true;
  sessionManualRefresh ||= manual;
  window.OPERATOR_SESSION_LOAD = { state: 'loading' };
  showSessionMetadata();
  try {
    const response = await fetch('/api/operator-sessions', { cache: 'no-store' });
    if (!response.ok) throw new Error('transport');
    let snapshot;
    try { snapshot = await response.json(); } catch { throw new Error('invalid-data'); }
    if (!snapshot || typeof snapshot.operators !== 'object' || !snapshot.operators || Array.isArray(snapshot.operators)
      || typeof snapshot.observedAt !== 'string' || !Number.isFinite(Date.parse(snapshot.observedAt))) throw new Error('invalid-data');
    window.OPERATOR_SESSIONS = snapshot;
    window.OPERATOR_SESSION_LOAD = { state: 'loaded' };
  } catch (error) {
    window.OPERATOR_SESSION_LOAD = { state: 'error', error: error.message === 'invalid-data' ? 'invalid-data' : 'transport' };
  } finally {
    sessionReadPending = false;
    showSessionMetadata();
  }
}
root.addEventListener('click', event => {
  if (event.target.closest('[data-session-reload]')) loadSessionMetadata(true);
});
root.addEventListener('toggle', event => {
  const profile = event.target.closest('.op-ensemble-profile');
  if (profile) placeSessionPanel(profile);
}, true);

function render() {
  const saved = captureFocus();
  const restoreReport = initialRender;
  summaries = new Map(operators.map((lane) => [lane.key, operatorSummary(lane, L, {}, undefined, S.visible)]));

  const table = el('table', { id: 'operator-list', class: 'op-table' },
    el('caption', { class: 'sr-only', text: tr("Operatoren mit eigenem Statusbericht, Fragen, Ergebnissen und nächstem Schritt", "Operators with their own status report, questions, output and next step") }),
    el('thead', {}, el('tr', {},
      el('th', { scope: 'col' }, el('span', { class: 'sr-only', text: 'Operator' })),
      ...[tr("Stand", "Status"), tr("Weiter", "Next")].map((text) => el('th', { scope: 'col', text })))),
    el('tbody', {}, ...operators.map(operatorRow)));
  const proposal = el('section', { class: 'op-proposal', id: 'interviewer-entwurf', 'aria-labelledby': 'interviewer-titel' },
    el('h3', { id: 'interviewer-titel', text: tr("Positionsinterview", "Position interview") }),
    el('p', { class: 'op-muted', text: tr("Noch nicht eingerichtet. Ein Interview ist nicht gestartet.", "Not set up. No interview has started.") }),
    el('p', {}, el('a', { href: sourceHref('demo-guide'), text: tr("Gelieferten Entwurf und Herkunft lesen", "Read the supplied draft and provenance") })));
  const content = el('section', { id: 'aufstellung', 'aria-labelledby': 'aufstellung-titel' },
    el('h2', { id: 'aufstellung-titel', class: 'sr-only', tabindex: '-1', text: tr("Operatoren", "Operators") }),
    el('p', { id: 'operator-route-error', class: 'meldung', role: 'alert', hidden: true }), table, operators.some((lane) => lane.key === 'interviewer') ? null : proposal);
  root.replaceChildren(ensemble({ L, S, briefings: chatBriefings, openOperator(key) {
    const url = new URL(location.href); url.searchParams.delete('ansicht'); url.hash = 'operator-' + key;
    history.pushState(null, '', url); render(); document.getElementById('name-' + key)?.focus();
  } }), el('p', { id: 'operator-session-load', class: 'op-muted', role: 'status', tabindex: '-1' }), content);
  showSessionMetadata();
  legacyRoute();
  for (const row of root.querySelectorAll('#operator-list tbody tr')) row.dataset.selected = String(location.hash === '#' + row.id);
  root.setAttribute('aria-busy', 'false');
  initialRender = false;
  restoreFocus(saved);
  if (restoreReport) restoreReportOrigin();
}

S.mount(document.getElementById('kopf'), { view: 'agenten', onFilter: () => {
  const category = S.filter();
  if (initialRender || category !== renderedCategory) {
    renderedCategory = category;
    render();
  } else refreshBrowserHistory();
}, onBriefings: data => {
  chatBriefings = data.operators;
  briefingPath = data.path;
  currentRound = data.roundId;
  window.LEITSTAND_ANTWORTEN.refreshWithDrafts(root, render);
} });
for (const event of ['popstate', 'hashchange']) window.addEventListener(event, () => { if (!redirectLegacyPerspective()) { render(); legacyRoute(true); } });
for (const event of ['mission-control-demo-antwort', 'mission-control-demo-uebertragung', 'mission-control-demo-nachricht']) document.addEventListener(event, refreshBrowserHistory);
window.addEventListener('storage', (event) => {
  if (event.key === null || ['mission-control-demo-d-antworten', 'mission-control-demo-d-nachrichten'].includes(event.key)) refreshBrowserHistory();
});
window.addEventListener('focus', refreshBrowserHistory);

// One read per page opening plus explicit manual refresh; no polling or model call.
loadSessionMetadata();

for (const event of ['resize', 'scroll']) window.addEventListener(event, () => {
  for (const details of root.querySelectorAll('.op-session-badge[open]')) placeSessionPanel(details);
}, { passive: true, capture: true });

}
