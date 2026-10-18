import { operatorBriefing, operatorWorkState } from './operatoren-model.js';

const tr = (de, en) => window.UI_LANGUAGE ? window.UI_LANGUAGE.t(de, en) : de;

// Family and project labels come from the shared identity; this deck observes no live activity.
export function ensemble({ L, S, briefings = {}, openOperator }) {
  const { el } = S;
  const families = [
    ['coordination', tr('Koordination', 'Coordination')],
    ['implementation', tr('Entwicklung & Werkzeuge', 'Development & tools')],
    ['knowledge', tr('Forschung, Wissen & Lehre', 'Research, knowledge & teaching')],
    ['verification', tr('Prüfung & Monitor', 'Review & monitoring')],
  ];
  const root = el('section', { class: 'op-ensemble', 'aria-label': tr('Registrierte Operatoren', 'Registered operators') });
  const lists = new Map(families.map(([key, label]) => {
    const list = el('ul', { class: 'op-ensemble-list', role: 'list', 'aria-label': label });
    return [key, list];
  }));
  const unknown = el('ul', { class: 'op-ensemble-list op-ensemble-unclassified', role: 'list',
    'aria-label': tr('Rollenfamilie nicht belegt', 'Role family not evidenced') });
  const ordered = [...L.lanes].filter(lane => lane.state !== 'RETIRED')
    .sort((a, b) => L.laneRang(a.key) - L.laneRang(b.key));
  for (const lane of ordered) {
    const planned = lane.setup === 'planned' && lane.setupSource === 'demo-sources/' + lane.key + '.md'
      && /^[a-f0-9]{64}$/.test(lane.setupRevision || '');
    const identityLane = planned || lane.setup !== 'planned' ? lane : { ...lane, setup: 'unknown' };
    const identity = window.LEITSTAND_ICONS?.identity(identityLane, { L });
    const family = identity?.getAttribute('data-family') || 'unknown';
    const proposals = planned ? (lane.planning?.projectIds || []).map(id => L.entryById.get(id)).filter(Boolean) : [];
    const projects = [...Array.from(L.laneProjects(lane)), ...proposals].filter(project => project && L.entryById.has(project.id));
    const matches = projects.some(project => S.visible(project));
    const tasks = [...(lane.auftraege || []), ...(lane.erledigt || [])];
    const paused = lane.paused === true;
    const documented = !paused && !planned && matches && tasks.some(task => !task.vertragsfehler && !task.entryIssue
      && task.entryId && L.entryById.has(task.entryId) && S.visible(L.entryById.get(task.entryId)));
    const briefing = operatorBriefing(identityLane, briefings[lane.key]);
    const contribution = L.operatorContribution(lane.question || '');
    const state = paused ? { symbol: 'paused', text: tr('Auf Nutzerwunsch pausiert', 'Paused at user request') }
      : operatorWorkState(identityLane, briefing, contribution.kind === 'question');
    const scope = documented ? 'documented' : planned && matches ? 'planned' : 'outside';
    const status = paused ? tr('Auf Nutzerwunsch pausiert', 'Paused at user request') : scope === 'planned' ? tr('Geplant, kein Auftrag', 'Planned, no commission')
      : documented ? tr('Dokumentierte Arbeit in Auswahl', 'Documented work in selection')
        : projects.length && !matches ? tr('Außerhalb der gewählten Kategorie', 'Outside the selected category')
          : tr('Keine dokumentierte Arbeit in Auswahl', 'No documented work in selection');
    const title = String(lane.rollentitel || '').trim() || tr('Rollenbezeichnung fehlt', 'Role title missing');
    const sourcePath = 'demo-sources/' + lane.key + '.md';
    const source = L.sourceReaderHref(sourcePath);
    let href = 'operatoren.html#operator-' + encodeURIComponent(lane.key);
    if (globalThis.location?.href) {
      const target = new URL(location.href);
      target.searchParams.delete('ansicht');
      target.hash = 'operator-' + encodeURIComponent(lane.key);
      href = target.href;
    }
    if (window.UI_LANGUAGE?.href) href = window.UI_LANGUAGE.href(href);
    const workArea = window.LEITSTAND_ICONS?.workArea(lane, { L, briefing }) || lane.adresse || lane.key;
    const context = [title, status, state.text, tr('Aktuelle Aktivität unbekannt', 'Current activity unknown')].join(' — ');
    const pip = el('span', { class: 'op-ensemble-pip', role: 'img', 'aria-label': status,
      text: paused ? 'Ⅱ' : planned ? '○' : scope === 'outside' ? '·' : '' });
    const link = el('summary', { id: 'ensemble-open-' + lane.key, class: 'op-ensemble-token', 'data-operator': lane.key, 'data-family': family,
      'data-active': String(documented), 'data-paused': String(paused), 'data-planned': String(planned), 'data-filter-state': scope, 'data-work-state': state.symbol });
    if (identity) {
      const domain = identity.querySelector('.operator-domain');
      if (domain) { domain.textContent = workArea; identity.insertBefore(pip, domain); }
      else identity.append(pip, el('span', { class: 'operator-domain', text: workArea }));
      link.append(identity);
    } else link.append(pip, el('span', { class: 'operator-domain', text: workArea }));
    link.setAttribute('aria-label', workArea + ' — ' + context);
    const projectList = el('ul', { class: 'op-ensemble-projects', role: 'list' });
    const ids = [...new Set([...projects.map(project => project.id), ...(planned ? lane.planning?.projectIds || [] : [])])];
    for (const id of ids) {
      const project = L.entryById.get(id);
      let projectHref = 'projekte.html?projekt=' + encodeURIComponent(id);
      if (window.UI_LANGUAGE?.href) projectHref = window.UI_LANGUAGE.href(projectHref);
      projectList.append(el('li', {}, project ? el('a', { href: projectHref, text: project.name || project.titel || id })
        : el('span', { text: id + tr(' — Zuordnung nicht bestätigt', ' — binding not confirmed') })));
    }
    const fields = el('dl', { class: 'op-ensemble-profile-fields' });
    const field = (label, value) => fields.append(el('div', {}, el('dt', { text: label }), el('dd', {}, value)));
    field(ids.length === 1 ? tr('Projekt', 'Project') : tr('Projekte', 'Projects'), ids.length ? projectList
      : el('span', { text: tr('Keine Projektzuordnung belegt', 'No project binding documented') }));
    if (!documented && status !== state.text) field(tr('Auswahl', 'Selection'), el('span', { text: status }));
    field(tr('Auftrag', 'Assignment'), el('span', { text: state.symbol === 'blocked' ? tr('Blockiert', 'Blocked') : state.text }));
    field(tr('Aktuelle Aktivität', 'Current activity'), el('span', { text: tr('Unbekannt', 'Unknown') }));
    const links = el('div', { class: 'op-ensemble-profile-links' },
      el('a', { href: source, text: tr('Originalquelle', 'Original source') }));
    const panel = el('div', { class: 'op-ensemble-profile-content' },
      el('p', { class: 'op-ensemble-profile-heading' }, el('span', { class: 'op-ensemble-profile-name', text: workArea }),
        el('span', { class: 'op-ensemble-profile-role', text: title })), fields,
      el('div', { 'data-session-detail-operator': lane.key, text: tr('Sitzungsmetadaten nicht verfügbar.', 'Session metadata unavailable.') }), links);
    if (lane.key !== L.orchestrator?.key) {
      const open = el('a', { href, class: 'op-ensemble-open-operator', text: tr('Operator öffnen', 'Open operator') });
      if (typeof openOperator === 'function') open.addEventListener('click', event => {
        if (event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault(); openOperator(lane.key);
      });
      links.append(open);
    }
    const details = el('details', { class: 'op-session-badge op-ensemble-profile', name: 'operator-ensemble-profile' }, link, panel);
    details.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      event.preventDefault(); event.stopPropagation(); details.open = false; link.focus();
    });
    (lists.get(family) || unknown).append(el('li', {}, details));
  }
  const populated = families.filter(([key]) => lists.get(key).children.length);
  root.setAttribute('data-family-count', String(populated.length));
  for (const [key, label] of populated) {
    root.append(el('div', { class: 'op-ensemble-family', 'data-family': key },
      el('p', { class: 'op-ensemble-family-label', text: label }), lists.get(key)));
  }
  if (unknown.children.length) root.append(unknown);
  return root;
}
