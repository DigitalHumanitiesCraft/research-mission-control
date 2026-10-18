import { reportExcerpt } from './operatoren-model.js';

const tr = (de, en) => window.UI_LANGUAGE ? window.UI_LANGUAGE.t(de, en) : de;
const text = value => typeof value === 'string' ? value : '';
const digest = value => /^[a-f0-9]{64}$/.test(text(value));
const sourceFor = lane => /^[a-z0-9][a-z0-9-]*$/.test(text(lane?.key))
  ? 'demo-sources/' + lane.key + '.md' : '';

/** Setup evidence and live activity are independent; file state is not an observation. */
export function lifecycle(lane, { S }) {
  const source = sourceFor(lane);
  const evidenced = source && lane.setupSource === source && digest(lane.setupRevision);
  const setup = evidenced && ['planned', 'initialized'].includes(lane.setup) ? lane.setup : 'unknown';
  return {
    setup: S.el('span', { class: 'op-setup', 'data-setup': setup, text: setup === 'planned'
      ? tr('Geplant', 'Planned') : setup === 'initialized' ? tr('Eingerichtet', 'Initialized')
        : tr('Einrichtung unbekannt', 'Setup unknown') }),
    activity: S.el('span', { class: 'op-activity', 'data-activity': 'unknown',
      text: tr('Aktuelle Aktivität unbekannt', 'Current activity unknown'),
      title: tr('Die Operator-Datei ist keine aktuelle Sitzungsbeobachtung.', 'The operator file is not a current session observation.') }),
  };
}

/** A planned profile remains a proposal; only the shared copy-only composer is interactive. */
export function plannedOperatorRow(lane, { L, S }) {
  const { el } = S;
  const planning = lane.planning || {};
  const source = sourceFor(lane);
  const bound = Boolean(source && planning.source === source && lane.setupSource === source
    && digest(planning.revision) && planning.revision === lane.setupRevision && lane.setup === 'planned');
  const sourceLink = source && planning.source === source
    ? el('a', { href: L.sourceReaderHref(planning.source), text: tr('Planungsquelle', 'Planning source') }) : null;
  const knownProjects = [...new Set(Array.isArray(planning.projectIds) ? planning.projectIds.filter(value => typeof value === 'string') : [])]
    .map(id => ({ id, entry: L.entryById.get(id) }));
  const role = text(lane.rollentitel).trim() && lane.rollentitel !== lane.key
    ? lane.rollentitel : tr('Rollenbezeichnung fehlt', 'Role title missing');
  const name = el('h3', { id: 'name-' + lane.key, tabindex: '-1',
    text: (bound && text(planning.workArea).trim()) || knownProjects.filter(item => item.entry).map(({ entry }) => entry.name || entry.id).join(', ')
      || tr('Arbeitsbereich nicht belegt', 'Work domain not evidenced') });
  const mark = window.LEITSTAND_ICONS?.identity(lane, { L, domain: false });
  const states = lifecycle(lane, { S });
  const stamp = typeof lane.fileDate === 'string' ? lane.fileDate : text(lane.fileDate?.date);
  const meta = el('p', { class: 'op-report-meta' }, states.setup,
    ...(stamp ? [el('span', { text: ', ' + tr('Quellenstand: ', 'Source date: ') + stamp })] : []));
  const identity = el('div', { class: 'op-identity' }, el('div', { class: 'op-identity-heading' },
    mark, el('div', {}, name, el('p', { class: 'op-role', text: role }))), meta);
  identity.title = states.setup.textContent + ', ' + states.activity.textContent;
  const projects = el('div', { class: 'op-projects' });
  for (const { id, entry } of knownProjects) {
    let href = 'projekte.html?projekt=' + encodeURIComponent(id);
    if (window.UI_LANGUAGE?.href) href = window.UI_LANGUAGE.href(href);
    projects.append(entry ? el('a', { href,
      title: tr('Vorgeschlagener Projektbezug, kein Auftrag', 'Proposed project relationship, not an assignment'), text: entry.name || id })
      : el('span', { class: 'op-project-gap op-muted', text: id + tr(' — Zuordnung nicht bestätigt', ' — binding not confirmed') }));
  }
  if (!projects.childNodes.length) projects.append(el('span', { class: 'op-muted', text: tr('Projektzuordnung fehlt', 'Project assignment missing') }));
  const fields = el('dl', { class: 'op-planning-fields' });
  const field = (de, en, value) => fields.append(el('dt', { text: tr(de, en) }),
    el('dd', { text: text(value) || tr('Nicht belegt', 'Not evidenced') }));
  field('Arbeitsweise', 'Working approach', lane.arbeitsweise);
  if (bound && text(planning.original)) field('Geplanter Arbeitsbereich', 'Planned work area', planning.original);
  if (!text(planning.original)) {
    field('Möglicher Erstauftrag', 'Proposed first assignment', planning.firstAssignment);
    field('Grenze', 'Boundary', planning.boundary);
  }
  field('Offene Entscheidung', 'Outstanding decision', lane.report?.['Operator point']);
  fields.append(el('dt', { text: tr('Vorgeschlagene Projekte', 'Proposed projects') }), el('dd', {}, projects));
  fields.append(el('dt', { text: tr('Quelle', 'Source') }), el('dd', {}, sourceLink
    || el('span', { text: tr('Nicht eindeutig belegt', 'Not uniquely evidenced') })));
  const completeReport = text(lane.report?.Result);
  const dialog = el('dialog', { class: 'op-report-dialog', 'aria-labelledby': 'report-title-' + lane.key },
    el('h3', { id: 'report-title-' + lane.key, text: role }),
    el('p', { class: 'op-complete-report', text: completeReport }), fields);
  const close = el('button', { type: 'button', class: 'op-report-close', text: tr('Schließen', 'Close') });
  close.addEventListener('click', () => dialog.close());
  dialog.prepend(close);
  const readReport = el('button', { type: 'button', class: 'op-report-open',
    'aria-label': tr('Vollständigen Bericht und Planung lesen: ', 'Read full report and planning: ') + role,
    title: tr('Vollständiger Bericht und Planung', 'Full report and planning') },
  window.LEITSTAND_ICONS?.fact?.('source') || el('span', { text: tr('Quelle', 'Source') }));
  readReport.addEventListener('click', () => dialog.showModal());
  meta.append(readReport);
  const status = el('div', { class: 'op-status' }, el('p', { class: 'op-status-text',
    text: reportExcerpt(completeReport, window.UI_LANGUAGE?.language || 'en')
      || tr('Kein Bericht belegt.', 'No report evidenced.') }), dialog);
  if (!bound) status.append(el('p', { class: 'op-muted', text: tr('Planungsquelle oder Revision nicht eindeutig belegt.', 'Planning source or revision not uniquely evidenced.') }));
  const next = el('div', { class: 'op-next' });
  if (bound && text(planning.activationPrompt).trim() && window.LEITSTAND_ANTWORTEN?.discussion) {
    next.append(window.LEITSTAND_ANTWORTEN.discussion({ key: lane.key, operator: lane.key,
      id: 'planned-activation-' + lane.key, frage: planning.activationPrompt, text: planning.activationPrompt }, {
      ziel: 'operator', purpose: 'Planned operator activation', revision: planning.revision,
      compose: true, compositionRevision: planning.revision, actionPreview: true, copyLabel: true,
    }));
  } else if (bound && text(planning.workArea) && text(planning.original) && !text(planning.activationPrompt)) {
    next.append(el('p', { class: 'op-muted', text: tr('Geplant; kein Ausführungsauftrag erteilt.', 'Planned; no execution task commissioned.') }));
  } else next.append(el('p', { class: 'op-muted', text: tr('Kein vollständig quellengebundener Aktivierungstext verfügbar.', 'No fully source-bound activation text available.') }));
  return el('tr', { id: 'operator-' + lane.key, class: 'op-planned', 'data-setup': 'planned' },
    el('th', { scope: 'row' }, identity),
    el('td', {}, el('span', { class: 'op-field-label', 'aria-hidden': 'true', text: tr('Stand', 'Status') }), status),
    el('td', {}, el('span', { class: 'op-field-label', 'aria-hidden': 'true', text: tr('Weiter', 'Next') }), next));
}
