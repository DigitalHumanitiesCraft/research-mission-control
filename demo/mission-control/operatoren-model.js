const tr = (de, en) => globalThis.window?.UI_LANGUAGE ? globalThis.window.UI_LANGUAGE.t(de, en) : de;
// Projection of the shared work and answer model for the operator comparison.

/**
 * Keep canonical assignments and browser decisions as separate facts.
 * @param {object} lane Normalized operator from LEITSTAND.
 * @param {object} L Shared LEITSTAND model.
 * @param {object} answers Existing answer store, unchanged.
 * @param {Map|object} acceptanceChecks Fresh acceptance-review results keyed by answer ID.
 * @param {function(object): boolean} visible Existing category predicate for known projects.
 * @returns {{tasks: object[], needs: object[], hiddenTasks: number}}
 */
export function operatorSummary(lane, L, answers = {}, acceptanceChecks = {}, visible = () => true) {
  const allTasks = [...(lane.auftraege || []), ...(lane.erledigt || [])].map((task) => {
    const context = L.auftragsKontext(lane, task);
    const projectId = task.entryId || task.vorhaben || '';
    const humanAcceptance = !lane.paused && task.zustand === 'erledigt' && !context.internal
      && task.abnahmeart !== 'unbekannt' && !context.error;
    const answerId = L.abnahmeId(lane.key, task.kennung || '');
    const answer = answers[answerId] || null;
    let answerStatus = task.zustand === 'erledigt' ? L.antwortStatus(answerId, answers) : '';
    if (task.zustand === 'erledigt' && answer) {
      answerStatus = L.abnahmeAntwortStatus(answerId, answers, acceptanceChecks);
    }
    return {
      task, context, title: L.voll(task.auftrag || task.zweck),
      projectId, projectName: L.voll(L.entryById.get(projectId)?.name || projectId || tr("Projekt nicht zugeordnet", "Project not assigned")),
      resultPresent: Boolean(L.voll(context.result)),
      verificationPresent: Boolean(L.voll(context.verification)),
      answerStatus, answer,
      humanAcceptance,
      acceptanceUrl: task.zustand === 'erledigt'
        ? 'abnahme.html?' + new URLSearchParams({ lane: lane.key, kennung: task.kennung || '' }) : '',
    };
  });

  const inScope = (id) => !L.entryById.has(id) || visible(L.entryById.get(id));
  const tasks = allTasks.filter((item) => inScope(item.projectId));
  const questions = L.fragenNachFolge(answers);
  const needs = questions.rot.filter((question) => question.quelle === 'lane' && question.operator === lane.key && inScope(question.entryId || question.entry?.id || ''))
    .map((question) => ({
      text: L.voll(question.text),
      href: 'fragen.html?' + new URLSearchParams({
        punkt: 'lane-' + lane.key + (question.kennung ? '-' + question.kennung : ''),
      }),
      kind: 'question', taskId: question.kennung || '', answerStatus: 'offen', question,
    }));
  for (const item of tasks) {
    if (!item.humanAcceptance || item.answerStatus === 'entschieden') continue;
    needs.push({
      text: item.title + ' inhaltlich beurteilen.',
      href: item.acceptanceUrl, kind: 'acceptance', taskId: item.task.kennung || '',
      answerStatus: item.answerStatus,
    });
  }
  return { tasks, needs, hiddenTasks: allTasks.length - tasks.length };
}



// Dated chat excerpts are usable only while the canonical report and assignment
// bindings still match. They never replace assignment state or prove execution.
export function briefingBinding(lane) {
  return {
    state: lane.report?.State || lane.state || '',
    result: lane.report?.Result || '',
    point: lane.report?.['Operator point'] || '',
    next: lane.report?.['Next action'] || '',
    assignments: [...(lane.auftraege || []), ...(lane.erledigt || []), ...(lane.abgenommen || [])]
      .map(task => [task.kennung, task.vorhaben, task.zustand, task.quellenrevision || ''])
      .sort((a, b) => a[0].localeCompare(b[0])),
  };
}

// Canonical file evidence has its own source identity, separate from chat checks.
export function operatorSourceReport(lane) {
  const source = 'demo-sources/' + lane.key + '.md';
  if (lane.setupSource !== source || !/^[a-f0-9]{64}$/.test(lane.setupRevision || '')
    || !lane.report || typeof lane.report !== 'object' || Array.isArray(lane.report)) return null;
  return { source, revision: lane.setupRevision,
    fields: ['Evidence', 'Verification', 'Deviation'].flatMap(key => Object.hasOwn(lane.report, key)
      && typeof lane.report[key] === 'string' && lane.report[key].trim() ? [{ key, text: lane.report[key] }] : []) };
}

export function operatorBriefing(lane, excerpt) {
  const tasks = [...(lane.auftraege || []), ...(lane.erledigt || []), ...(lane.abgenommen || [])];
  const valid = tasks.every(task => !task.vertragsfehler && (!task.vorhaben || task.entryId));
  const reportedAt = excerpt?.source?.completedAt || excerpt?.source?.reportedAt;
  const questionsValid = excerpt?.questions === undefined || Array.isArray(excerpt.questions) && excerpt.questions.every(question =>
    question && typeof question === 'object' && typeof question.text === 'string' && question.text.trim()
    && ['input', 'decision', 'followup', 'discussion'].includes(question.kind)
    && typeof question.blocking === 'boolean'
    && (!question.taskId || tasks.some(task => task.kennung === question.taskId)));
  const bound = Boolean(valid && questionsValid && typeof excerpt?.status === 'string' && excerpt.status && typeof reportedAt === 'string' && Number.isFinite(Date.parse(reportedAt))
    && JSON.stringify(excerpt.binding) === JSON.stringify(briefingBinding(lane)));
  const currentBinding = briefingBinding(lane);
  const reportCoreMatches = excerpt?.binding && ['state', 'result', 'point', 'next'].every(field => excerpt.binding[field] === currentBinding[field]);
  const assignmentIdentity = rows => Array.isArray(rows) ? rows.map(row => row.slice(0, 3)) : null;
  const reportBound = Boolean(reportCoreMatches && questionsValid && typeof excerpt?.status === 'string' && excerpt.status
    && typeof reportedAt === 'string' && Number.isFinite(Date.parse(reportedAt))
    && JSON.stringify(assignmentIdentity(excerpt.binding.assignments)) === JSON.stringify(assignmentIdentity(currentBinding.assignments)));
  const questionBound = Boolean(valid && questionsValid && typeof reportedAt === 'string' && Number.isFinite(Date.parse(reportedAt))
    && typeof excerpt?.binding?.point === 'string' && excerpt.binding.point === (lane.report?.['Operator point'] || ''));
  const editorial = bound && excerpt.presentation?.author === 'coordinator'
    && JSON.stringify(excerpt.presentation.basedOn) === JSON.stringify(excerpt.source);
  const gapSelection = editorial && Array.isArray(excerpt.presentation.gaps) && excerpt.presentation.gaps.every(text => typeof text === 'string' && text.trim());
  const resultSelection = editorial && Array.isArray(excerpt.presentation.results) && excerpt.presentation.results.every(item => item && typeof item.text === 'string' && item.text.trim());
  const conversationProjects = reportBound && Array.isArray(excerpt.conversationProjectIds)
    ? excerpt.conversationProjectIds.filter(id => tasks.some(task => task.vorhaben === id || task.entryId === id)) : [];
  const pilot = excerpt?.tilePilot;
  const tileKinds = ['context', 'result', 'limit', 'contribution'];
  const validTiles = reportBound && pilot?.author === 'developer'
    && JSON.stringify(pilot.basedOn) === JSON.stringify(excerpt.source)
    && tasks.some(task => task.vorhaben === pilot.projectId || task.entryId === pilot.projectId)
    && Array.isArray(pilot.items) && pilot.items.length === tileKinds.length
    && pilot.items.every((item, index) => item?.kind === tileKinds[index] && typeof item.text === 'string' && item.text.trim()
      && typeof item.source?.file === 'string' && /\.md$/.test(item.source.file)
      && !/^(?:[A-Za-z]:|\/)|\\/.test(item.source.file)
      && !item.source.file.split('/').some(part => part.startsWith('.')))
    && conversationProjects.includes(pilot.projectId) && excerpt.conversationApproved === true;
  const standPilot = excerpt?.statusPilot;
  const statusKinds = ['available', 'open', 'working'];
  const validStatusPilot = lane.key === 'build' && reportBound && standPilot?.author === 'developer'
    && JSON.stringify(standPilot.basedOn) === JSON.stringify(excerpt.source)
    && Array.isArray(standPilot.items) && standPilot.items.length === statusKinds.length
    && standPilot.items.every((item, index) => item?.kind === statusKinds[index] && typeof item.text === 'string' && item.text.trim());
  const assessmentHistory = lane.key === 'build' && Array.isArray(excerpt?.assessmentHistory)
    ? excerpt.assessmentHistory.filter(item => reportedAssessment(item?.assessment)
      && Number.isFinite(Date.parse(item.source?.reportedAt || item.source?.completedAt))
      && /^\d{4}-\d{2}-\d{2}T\d{6}Z\.json$/.test(item.snapshot || '')) : [];
  const reportedProjects = reportBound ? [...(Array.isArray(excerpt.originalReply?.projects) ? excerpt.originalReply.projects.map(project => typeof project === 'string' ? project : project?.id || project?.projectId) : []), excerpt.originalReply?.projectId].filter(id => typeof id === 'string' && id) : [];
  // An assessment keeps its own dated evidence even after the work report changes.
  const assessmentSource = excerpt?.assessmentSource || excerpt?.source;
  const assessedAt = assessmentSource?.completedAt || assessmentSource?.reportedAt;
  const workReportMatches = reportBound;
  const sameAssessmentMessage = Boolean(assessmentSource?.messageId && assessmentSource.messageId === excerpt?.source?.messageId && assessmentSource.threadId === excerpt.source.threadId);
  const ownAssessment = typeof assessedAt === 'string' && Number.isFinite(Date.parse(assessedAt)) ? reportedAssessment(excerpt?.selfAssessment) : null;
  return {
    assessmentSource: ownAssessment ? assessmentSource : null,
    assessedAt: ownAssessment ? assessedAt : '',
    assessmentHistorical: Boolean(ownAssessment && (!reportBound && !workReportMatches || !sameAssessmentMessage && assessedAt !== reportedAt)),
    assessmentSeparate: Boolean(ownAssessment && (!reportBound || JSON.stringify(assessmentSource) !== JSON.stringify(excerpt.source))),
    reportedProjectIds: [...new Set(reportedProjects)],
    contextTiles: validTiles ? pilot.items : [],
    statusItems: validStatusPilot ? standPilot.items : [],
    assessmentHistory,
    tileProjectId: validTiles ? pilot.projectId : '',
    conversationProjectIds: conversationProjects,
    statusEditorial: Boolean(editorial && typeof excerpt.presentation.status === 'string' && excerpt.presentation.status.trim()),
    displayStatus: editorial && typeof excerpt.presentation.status === 'string' && excerpt.presentation.status.trim() ? excerpt.presentation.status : '',
    resultSelection: resultSelection ? excerpt.presentation.results : null,
    resultAuthority: bound,
    hasGapSelection: Boolean(gapSelection),
    status: reportBound ? excerpt.status : lane.report?.Result || tr("Ein Statusbericht fehlt.", "Status report missing."),
    workstate: reportBound && ['RUN', 'BLOCKED', 'DONE', 'IDLE'].includes(excerpt.originalReply?.workstate) ? excerpt.originalReply.workstate : '',
    ownAssessment,
    assessmentState: !bound && excerpt?.selfAssessment ? 'stale' : 'missing',
    selectedReport: bound && typeof excerpt.originalReply?.report === 'string' && excerpt.status === excerpt.originalReply.report,
    next: lane.report?.['Next action'] || '',
    source: reportBound ? excerpt.source : null,
    reportedAt: reportBound ? reportedAt : '',
    result: bound && typeof excerpt.result === 'string' ? excerpt.result : '',
    gap: bound ? excerpt.gap || '' : '',
    projectId: bound ? excerpt.projectId || '' : '',
    questionKind: bound ? excerpt.questionKind : 'discussion',
    conversationProposal: reportBound && excerpt.conversationApproved === true && typeof excerpt.conversationProposal === 'string' ? excerpt.conversationProposal : '',
    questions: questionBound && Array.isArray(excerpt.questions) ? excerpt.questions : null,
    projectIds: bound && Array.isArray(excerpt.projectIds) ? excerpt.projectIds : [],
    resultItems: bound && Array.isArray(excerpt.resultItems) ? excerpt.resultItems : [],
    resultProjectIds: bound && Array.isArray(excerpt.resultProjectIds) ? excerpt.resultProjectIds : null,
    checked: reportBound ? excerpt.checked || '' : '',
    fileReport: operatorSourceReport(lane),
    gaps: bound && Array.isArray(excerpt.gaps) ? excerpt.gaps.filter(text => typeof text === 'string' && text.trim()) : [],
    gapItems: gapSelection ? excerpt.presentation.gaps : [],
    importantFindings: bound && Array.isArray(excerpt.importantFindings)
      ? excerpt.importantFindings.filter(text => typeof text === 'string' && text.trim()) : [],
    findingItems: editorial
      && Array.isArray(excerpt.presentation.importantFindings)
      && excerpt.presentation.importantFindings.every(text => typeof text === 'string' && text.trim())
      ? excerpt.presentation.importantFindings : null,
    assessment: ownAssessment ? validAssessment(excerpt.selfAssessment) : null,
  };
}

// Sentence count cannot preserve the scope or limits of an arbitrary report.
export function reportExcerpt(value, language = 'en') {
  return String(value || '').trim();
}

export function briefingText(value) {
  return String(value || '').replace(/\[([^\]]+)\]\([^\n)]+\)/g, '$1')
    .replace(/\x60/g, '').trim();
}

export function formatReportTime(value, now = new Date()) {
  if (typeof value !== 'string' || !value.trim()) return '';
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const instant = new Date(dateOnly ? value + 'T12:00:00Z' : value);
  if (!Number.isFinite(instant.getTime())) return '';
  if (dateOnly && instant.toISOString().slice(0, 10) !== value) return '';
  const locale = globalThis.window?.UI_LANGUAGE?.locale || 'de-DE';
  const zone = { timeZone: 'Europe/Vienna' };
  const date = instant.toLocaleDateString(locale, zone);
  if (dateOnly) return date;
  const current = new Date(now);
  const today = Number.isFinite(current.getTime()) && date === current.toLocaleDateString(locale, zone);
  return (today ? tr('Heute', 'Today') : date) + ', ' + instant.toLocaleTimeString(locale, { ...zone, hour: '2-digit', minute: '2-digit' });
}


export function assignmentTitle(item, description) {
  return description?.editorial ? description.title : item.title || tr("Auftrag ohne Beschreibung", "Assignment without description");
}


export const assessmentLabels = Object.freeze({
  critical: tr("Nicht tragfähig", "Not viable"), gap: tr("Wesentliche Lücke", "Substantial gap"), qualified: tr("Mit Vorbehalt", "Qualified"),
  sound: tr("Grundlage trägt", "Sound basis"), ready: tr("Für nächsten Schritt geprüft", "Checked for the next step"),
});

export function reportedAssessment(value) {
  const text = value => typeof value === 'string' && value.trim();
  if (!value || !text(value.level) || !text(value.summary)) return null;
  const scoped = text(value.scope) && text(value.limits);
  const dimensions = ['understanding', 'knowledge', 'verification'].every(key => text(value.dimensions?.[key]))
    || ['evidence', 'continuation'].every(key => text(value.dimensions?.[key])) && (text(value.dimensions?.goalFit) || text(value.dimensions?.userGoal))
    || Array.isArray(value.dimensions) && value.dimensions.length >= 3
      && value.dimensions.every(item => text(item?.name) && text(item.assessment) && text(item.reason));
  const detailed = dimensions && (text(value.nextStep) || text(value.nextStep?.action))
    && (text(value.limits) || Array.isArray(value.limits) && value.limits.every(text));
  return scoped || detailed ? value : null;
}

export function validAssessment(value) {
  return reportedAssessment(value) && (Object.hasOwn(assessmentLabels, value.level) || value.level === 'numeric' && value.subjective === true && Number.isInteger(value.score) && value.score >= 1 && value.score <= 100) ? value : null;
}

// Assignment projects and directly reported project context have different authority.
export function operatorProjects(lane, briefing, L) {
  const assigned = Array.from(L.laneProjects(lane), project => ({ projectId: project.id, reported: false }));
  const declared = briefing.source && Array.isArray(briefing.reportedProjectIds) ? briefing.reportedProjectIds : [];
  for (const projectId of declared) {
    if (L.entryById.has(projectId) && !assigned.some(project => project.projectId === projectId)) assigned.push({ projectId, reported: true });
  }
  return assigned;
}

export function operatorWorkState(lane, briefing, requiresAnswer = false) {
  if (lane.paused) return { symbol: 'pause', text: tr('Auf ausdrücklichen Nutzerwunsch pausiert', 'Paused at the user’s explicit request') };
  if (lane.setup === 'planned') return { symbol: 'planned', text: tr('Geplant, kein Auftrag', 'Planned, no commission') };
  const tasks = [...(lane.auftraege || []), ...lane.erledigt, ...lane.abgenommen];
  if (!Array.isArray(lane.auftraege) || tasks.some(task => task.vertragsfehler || !task.entryId)) return { symbol: 'unknown', text: tr("Auftragsstand ungeklärt", "Assignment state unclear") };
  if (requiresAnswer || briefing.questions?.some(question => question.blocking) || tasks.some(task => task.wait?.human)) return { symbol: 'question', text: tr("Wartet auf Beitrag", "Awaiting contribution") };
  if (lane.state === 'BLOCKED' || tasks.some(task => task.zustand === 'blockiert')) return { symbol: 'blocked', text: tr("Auftrag blockiert", "Assignment blocked") };
  if (briefing.workstate === 'RUN') return { symbol: 'open', text: tr("In Bearbeitung, eigener Bericht", "In progress, own report") };
  if (tasks.some(task => !['erledigt', 'abgenommen'].includes(task.zustand))) return { symbol: 'open', text: tr("Auftrag offen", "Assignment open") };
  if (lane.state === 'RUN') return { symbol: 'open', text: tr("In Bearbeitung, Dateibericht", "In progress, file report") };
  if (['DONE', 'IDLE'].includes(lane.state) && /\b(?:Halt|angehalten)\b/i.test(briefing.next || '')) return { symbol: 'pause', text: tr("Angehalten, Dateibericht", "Paused, file report") };
  if (['DONE', 'IDLE'].includes(lane.state)) return { symbol: 'paused', text: tr("Ohne offenen Auftrag", "No open assignment") };
  return { symbol: 'unknown', text: tr("Auftragsstand ungeklärt", "Assignment state unclear") };
}

export function operatorResults(lane, briefing, L, visible = () => true) {
  const tasks = [...(lane.auftraege || []), ...lane.erledigt, ...lane.abgenommen];
  const projects = operatorProjects(lane, briefing, L);
  if (!briefing.source || briefing.resultAuthority === false) return tasks.flatMap(task => {
    const context = L.auftragsKontext(lane, task);
    return ['erledigt', 'abgenommen'].includes(task.zustand) && task.entryId && !context.error && context.result && visible(L.entryById.get(task.entryId))
      ? [{ text: context.result, task, projectIds: [task.entryId], canonical: true }] : [];
  });
  let items = briefing.resultSelection ?? briefing.resultItems ?? [];
  if (briefing.resultSelection === null && !items.length && briefing.result) items = [{ text: briefing.result, projectIds: briefing.resultProjectIds ?? (briefing.projectIds.length ? briefing.projectIds : [briefing.projectId]) }];
  return items.flatMap(item => {
    if (!item || typeof item !== 'object') return [];
    const text = item.text || item.title || item.result || item.delivered;
    if (typeof text !== 'string' || !text.trim()) return [];
    const taskId = item.taskId || item.assignmentId;
    const task = taskId ? tasks.find(task => task.kennung === taskId) : null;
    if (taskId && (!task || task.vertragsfehler || !task.entryId)) return [];
    const ids = item.projectIds ?? (item.projectId ? [item.projectId] : task ? [task.entryId] : briefing.projectIds.length ? briefing.projectIds : [briefing.projectId]);
    if (!Array.isArray(ids) || !ids.length || ids.some(id => !projects.some(project => project.projectId === id) || task && task.entryId !== id || !visible(L.entryById.get(id)))) return [];
    return [{ text, task, projectIds: [...new Set(ids)], canonical: false, note: typeof item.note === 'string' ? item.note : '' }];
  });
}

// Next action comes from its own source field, never from a self-assessment.
export function operatorContinuation(lane, briefing) {
  const next = briefingText(briefing.next);
  if (!next) return { action: '', proposal: '', completion: '' };
  const proposal = /^(?:Vorschlag\s*:|Als möglicher|Ein möglicher)/i.test(next);
  const completion = /^(?:none|keine?)(?![\p{L}\p{N}])/iu.test(next);
  return { action: proposal || completion ? '' : next,
    proposal: proposal ? next : '', completion: completion ? next.replace(/^(?:none|keine?)[\s,;:.]*/i, '') : '' };
}

export function operatorReportTime(lane, briefing) {
  const instant = briefing.source?.completedAt || briefing.source?.reportedAt;
  if (instant && Number.isFinite(Date.parse(instant))) return { value: instant, kind: 'report' };
  const note = typeof lane.fileDate === 'string' ? lane.fileDate : lane.fileDate?.text || '';
  const match = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(?::(\d{2}))?\s*([+-]\d{2}):?(\d{2})\b/.exec(note.trim());
  if (match) {
    const value = match[1] + 'T' + match[2] + ':' + (match[3] || '00') + match[4] + ':' + match[5];
    if (Number.isFinite(Date.parse(value))) return { value, kind: 'file-report' };
  }
  return { value: typeof lane.fileDate === 'object' ? lane.fileDate?.date || '' : /^\d{4}-\d{2}-\d{2}/.exec(note)?.[0] || '', kind: 'file-date' };
}

export function operatorFollowup(lane, briefing, questions = []) {
  if (lane.paused) return { text: '', nextText: '', empty: tr('Pausiert. Wiederaufnahme nur auf ausdrücklichen Nutzerauftrag.', 'Paused. Resume only on an explicit user request.') };
  // The current file owns continuation; a dated assessment never supplies a task.
  const nextText = typeof lane.report?.['Next action'] === 'string'
    ? lane.report['Next action'].trim() : typeof briefing.next === 'string' ? briefing.next.trim() : '';
  if (questions.length) return { text: questions.join('\n\n'), nextText, empty: '' };
  if (briefing.conversationProposal) return { text: briefing.conversationProposal, nextText, empty: '' };
  const known = Boolean(nextText || lane.report?.Result);
  return { text: '', nextText, empty: known ? tr("Aktuell kein Klärungsbedarf", "No clarification currently needed") : tr("Klärungsbedarf nicht bekannt.", "Clarification needs not known.") };
}
