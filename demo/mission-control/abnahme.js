(function () {
  'use strict';
  const tr = (de, en) => typeof window !== 'undefined' && window.UI_LANGUAGE ? window.UI_LANGUAGE.t(de, en) : de;
  // One finished lane for the Human User: what it was for, what changed,
  // where to look, how it was checked, then his verdict. Everything a
  // non-technical reader cannot use follows in the visible technical section.
  const L = window.LEITSTAND;
  const A = window.LEITSTAND_ANTWORTEN;
  const coordinatorName = L.orchestrator ? L.laneName(L.orchestrator.key) : 'Koordination';
  const E = window.LEITSTAND_ERGEBNISSE;
  const { el } = window.LEITSTAND_SHELL;
  const root = document.querySelector('#abnahme');
  window.LEITSTAND_SHELL.mount(document.querySelector('#kopf'), { view: 'uebersicht', themen: false, onBriefings: () => {
    if (!review || !hasProjectConversation()) return;
    A.refreshWithDrafts(root, () => {
      root.querySelector('.ab-rueckfrage')?.remove();
      const heading = root.querySelector('#entscheidung h2');
      if (heading) { heading.id = 'rueckfrage'; heading.setAttribute('tabindex', '-1'); }
    });
  } });
  document.querySelector('#kopf .filter')?.remove();
  const params = new URLSearchParams(location.search);
  const lane = params.get('lane');
  const kennung = params.get('kennung');
  const task = { operator: lane, kennung };
  const OHNE_VORLAGE = tr('Bitte Abnahmevorlage ergänzen', "Please complete the acceptance template");
  let review;
  let feedback;
  let stages;
  let error;
  let busy = false;
  let dirty = false;
  let stale = false;
  let queued = false;
  const url = '/api/acceptance-review?' + new URLSearchParams({ lane, kennung });
  const time = (value) => value ? A.stempel(value) : '';
  const wann = (iso) => {
    const s = time(iso);
    return s ? `am ${L.fmtLang(s)} um ${s.slice(11)} Uhr` : '';
  };
  const sourcePath = () => 'demo-sources/' + lane + '.md';
  const projectReturn = () => {
    const operator = L.lanes.find(item => item.key === lane);
    const bound = [...(operator?.auftraege || []), ...(operator?.erledigt || []), ...(operator?.abgenommen || [])].find(item => item.kennung === kennung);
    return bound ? E.projectReturn({ ...bound, operator: lane }) : null;
  };

  // Usable for a decision: the operator's template, or the bound report of
  // the assignments that predate it.
  const usable = () => Boolean(review.vorlage || review.material);

  function status() {
    if (!feedback || !review) return;
    const local = A.abnahme(task);
    const server = review.answer;
    const same = Boolean(local?.antwortId && local.antwortId === server?.antwortId);
    const answer = local || server;
    const arrived = local ? same : Boolean(server);
    const adopted = Boolean(review.receipt?.valid && (!local || same));
    const lines = [];
    if (answer) {
      const when = wann(local ? local.zeit : server.empfangen);
      const du = when ? tr(`Frühere Browserantwort ${when}, du hast`, `Earlier browser response ${when}: you`) : tr('Frühere Browserantwort, du hast', "Earlier browser response: you");
      const what = answer.art === 'abgenommen' ? tr(`${du} abgenommen.`, `${du} accepted.`) : tr(`${du} zurückgegeben: „${answer.notiz}“`, `${du} returned: “${answer.notiz}”`);
      const path = adopted ? coordinatorName + ' hat deine Antwort eingetragen.'
        : arrived ? 'Der frühere Eingang ist bestätigt. Die kanonische Übernahme wird gesondert belegt.'
          : tr('Deine Antwort ist nur in diesem Browser gespeichert und noch nicht angekommen.', "Your response is saved only in this browser and has not arrived yet.");
      lines.push(el('p', { class: 'ab-bestaetigung' }, el('strong', { text: what }), ' ' + path));
      if (answer.quellenrevision !== review.revision) lines.push(el('p', { class: 'ab-fehler', text: tr('Das Ergebnis hat sich seit deiner Antwort geändert. Sieh es dir bitte noch einmal an und antworte neu.', "The result has changed since your response. Review it again before responding.") }));
    }
    if (dirty) lines.push(el('p', { class: 'ab-hinweis', text: tr('Der aktuelle Stand konnte nicht neu gelesen werden. Die letzte Anzeige bleibt sichtbar.', "The current state could not be read again. The last display remains visible.") }));
    feedback.replaceChildren(...lines);

    const received = server ? `${A.abnahmeWort[server.art] || server.art}${server.notiz ? ': ' + server.notiz : ''}, ${time(server.empfangen)}` : tr('Noch keine Antwort im Eingang nachgewiesen.', "No response is evidenced in the inbox yet.");
    const receipt = review.receipt;
    stages.replaceChildren(
      el('li', {}, el('strong', { text: local ? 'Im Browser gespeichert' : tr('Im Browser noch nicht gespeichert', "Not saved in this browser yet") }),
        local ? `${A.abnahmeWort[local.art]}${local.notiz ? ': ' + local.notiz : ''}, ${time(local.zeit)}` : tr('Eine Antwort dieses Browsers liegt noch nicht vor.', "This browser has no recorded response yet."),
        local && !same && local.fehler ? el('p', { class: 'ab-fehler', text: local.fehler }) : ''),
      el('li', {}, el('strong', { text: same ? 'Diese Antwort ist im Eingang angekommen' : server ? 'Antwort im Eingang vorhanden' : tr('Eingang noch nicht bestätigt', "Inbox receipt not confirmed yet") }), received),
      el('li', {}, el('strong', { text: adopted ? 'Übernahme belegt' : tr('Übernahme nicht belegt', "Adoption not evidenced") }),
        adopted ? receipt.summary : receipt ? 'Älterer Nachweis passt nicht mehr zur Antwort oder Operator-Datei.' : tr('Noch keine Übernahme in die Operator-Datei belegt.', "Adoption into the operator file is not evidenced yet.")));
  }

  let introductionHost;
  let introductionState = '';
  let introductionEpoch = 0;

  function originalSource(item, projectId) {
    return el('a', { href: L.sourceReaderHref(item.path, projectId, item.heading),
      target: '_blank', rel: 'noopener', text: tr('Vollständige Quelle lesen', "Read complete source") });
  }
  function comparisonTable(table) {
    return el('table', { class: 'ab-comparison-table' },
      el('caption', { text: table.caption }),
      el('thead', {}, el('tr', {}, ...table.columns.map(value => el('th', { scope: 'col', text: value })))),
      el('tbody', {}, ...table.rows.map(row => el('tr', {}, ...row.map((value, index) =>
        el(index ? 'td' : 'th', { ...(index ? {} : { scope: 'row' }), text: value }))))));
  }

  async function refreshIntroduction() {
    if (!introductionHost) return;
    const epoch = ++introductionEpoch;
    const item = E.introduction({ ...review.task, ergebnis: review.ergebnis });
    const projectId = review.task.entryId || review.task.vorhaben || '';
    try {
      if (!item) throw new Error(tr('Die Ergebnisvorlage hat sich geändert. Die vorbereitete Vorstellung wird deshalb nicht angezeigt.', "The result template has changed, so the prepared introduction is not shown."));
      await E.readIntroduction(item);
      if (epoch !== introductionEpoch || introductionState === item.revision) return;
      introductionState = item.revision;
      const source = el('p', { class: 'ab-quellenstand' },
        tr('Wörtlicher Ausschnitt aus ', "Verbatim excerpt from ") + item.path + tr(', Abschnitt „', ', section “') + item.heading + tr('“. ', '”. '),
        originalSource(item, projectId));
      const passages = el('ol', { class: 'ab-auszuege' }, ...item.passages.map((passage) =>
        el('li', {}, el('h3', { text: passage.title }), el('blockquote', {}, el('p', { text: passage.text })))));
      const material = el('div', { class: 'ab-pilot-material' });
      if (item.frames) {
        const frames = el('div', { class: 'ab-vorschauen' }, ...item.frames.map((frame) =>
          el('figure', { class: 'ab-vorschau' },
            el('figcaption', {}, el('h3', { text: frame.title }), item.question ? '' : el('p', { text: frame.text }),
              el('a', { href: frame.href, target: '_blank', rel: 'noopener', text: frame.title + tr(' ganz öffnen', " open in full") })),
            // These existing original pages need no scripts. The empty sandbox
            // confines their navigation; this origin cannot inspect their content.
            el('iframe', { class: 'ab-frame', title: frame.title + ' – vorhandener Entwurf', src: frame.href,
              sandbox: true, referrerpolicy: 'no-referrer' }),
            el('p', { class: 'ab-lesen' }, ...frame.links.map(([text, href]) =>
              el('a', { href, target: '_blank', rel: 'noopener', text }))))));
        material.append(frames, el('p', { class: 'ab-hinweis', text: tr('Hier stehen die vorhandenen lokalen Originalansichten. Falls die Vorschau nicht lädt, nutze den Link zur ganzen Ansicht. Ihr laufender Inhalt wird von dieser Seite nicht automatisch auf Änderungen geprüft.', "These are the available local original views. If a preview does not load, use the full-view link. This page does not automatically check their running content for changes.") }));
      }
      if (item.table) material.append(comparisonTable(item.table));
      material.append(passages, source);
      const entry = item.question
        ? el('div', { class: 'ab-einstieg ab-edition-einstieg' },
          el('p', { class: 'ab-edition-ergebnis', text: item.result }),
          part(tr('Wozu die Entwürfe dienen', "Purpose of the drafts"), el('p', { text: item.use })),
          part(item.question, el('p', { text: item.context }),
            el('dl', { class: 'ab-lesewege' }, ...item.frames.flatMap((frame) =>
              [el('dt', { text: frame.title }), el('dd', { text: frame.text })]))),
          part(tr('Zuerst ansehen', 'Inspect first'), el('p', { text: item.exercise }),
            el('a', { href: item.frames[1].href, target: '_blank', rel: 'noopener', text: tr('Beispielmaterial öffnen', "Open dossier at the closing formula") })),
          el('p', { class: 'ab-hinweis' },
            el('a', { href: '#rueckfrage', text: tr('Rückmeldung zur Vorstellung', "Feedback on the introduction") }),
            tr(' kannst du freiwillig geben. Dein Urteil über das gesamte Editionsergebnis besprichst du getrennt weiter unten.', " is optional. Discuss your assessment of the entire edition result separately below.")))
        : el('div', { class: 'ab-einstieg' }, part(tr('Das bearbeitete Problem', 'The problem addressed'), el('p', { text: item.problem })),
          part(tr('Was vorliegt', 'The output'), el('p', { text: item.result })));
      introductionHost.replaceChildren(entry, material,
        el('div', { class: 'ab-einstieg' },
          item.question ? '' : part(tr('Wozu du es nutzen kannst', 'How to use it'), el('p', { text: item.use })),
          part(tr('Was offen bleibt', "What remains open"), el('p', { text: item.boundary }))));
    } catch (err) {
      if (epoch !== introductionEpoch || introductionState === err.message) return;
      introductionState = err.message;
      introductionHost.replaceChildren(el('h2', { text: tr('Ergebnisvorstellung nicht verfügbar', "Result introduction unavailable") }),
        el('p', { class: 'ab-quellenfehler', role: 'status', text: err.message }),
        item ? el('p', {}, originalSource(item, projectId)) : '');
    }
  }

  async function refresh(render = false) {
    if (busy) { queued = true; return; }
    busy = true;
    try {
      const response = await fetch(url, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || tr('Abnahme nicht lesbar.', "Acceptance source cannot be read."));
      dirty = false;
      if (!render && review && review.revision !== data.revision) {
        stale = true;
        error.textContent = tr('Das Ergebnis hat sich gerade geändert. Lade die Seite neu, bevor du antwortest.', "The result has changed. Reload the page before responding.");
      }
      review = data;
      if (!render) {
        root.querySelectorAll('.ab-aktionen button').forEach((button) => { button.disabled = stale || dirty || data.task.zustand !== 'erledigt'; });
        const state = root.querySelector('[data-task-state]');
        if (state) state.textContent = data.task.zustand;
      }
      if (render) { show(); E.ready(review.ansehen || []).then(updateViews); }
      status();
    } catch (err) {
      dirty = true;
      if (render) root.replaceChildren(el('h1', { text: tr('Abnahme nicht verfügbar', "Acceptance source unavailable") }), el('p', { class: 'ab-fehler', text: err.message }), el('a', { href: 'index.html', text: tr('Zur Übersicht', "Back to overview") }));
      else { error.textContent = err.message; root.querySelectorAll('.ab-aktionen button').forEach((button) => { button.disabled = true; }); status(); }
    } finally { A.refreshDiscussions(); refreshIntroduction(); busy = false; if (queued) { queued = false; refresh(); } }
  }

  function part(title, ...content) {
    return el('section', { class: 'ab-teil' }, el('h2', { text: title }), ...content);
  }

  function views(items) {
    return el('ul', { class: 'ab-ansehen', role: 'list' }, ...items.map((item) => {
      const href = E.href(item, review.task.entryId || review.task.vorhaben || '');
      return el('li', {}, href
        ? el('a', { class: 'ab-lesen', href, ...(['web', 'mission-control'].includes(item.art) ? { target: '_blank', rel: 'noopener' } : {}) }, item.art === 'text' ? item.text.split('/').pop() : item.text)
        : el('span', { class: 'ab-pfad', text: item.text }),
        !href ? el('span', { class: 'ab-hinweis', text: tr('Noch kein lesbarer Ergebnislink nachgewiesen.', "No readable result link has been established.") }) : '');
    }));
  }
  function updateViews() {
    const host = root.querySelector('#ergebnis .ab-ansehen');
    if (host && review.vorlage) host.replaceWith(views(review.ansehen));
  }

  function technical(m) {
    const t = review.task;
    const row = (label, value) => [el('dt', { text: label }), el('dd', {}, value)];
    stages = el('ol', { class: 'ab-status' });
    const check = el('button', { type: 'button', class: 'ab-knopf', text: tr('Stand neu laden', "Reload status") });
    check.addEventListener('click', () => refresh());
    const details = el('section', { class: 'ab-technik', 'aria-labelledby': 'ab-technik-titel' }, el('h2', { id: 'ab-technik-titel', text: tr('Technische Angaben', "Technical details") }),
      el('dl', {},
        ...row(tr('Kennung', "Identifier"), kennung),
        ...row('Operator', lane),
        ...row(tr('Zustand', "State"), el('span', { 'data-task-state': 'true', text: t.zustand })),
        ...row(tr('Vorhaben', "Project"), t.vorhaben || ''),
        ...row(tr('Seit', "Since"), t.seit || ''),
        ...row(tr('Abnahmeart', "Acceptance scope"), review.abnahmeart || ''),
        ...row(tr('Operator-Datei', "Operator file"), el('a', { href: L.sourceReaderHref(sourcePath(), review.task.entryId || review.task.vorhaben || ''), text: sourcePath() })),
        ...row(tr('Quellenrevision', "Source revision"), el('code', { text: review.revision }))),
      el('h3', { text: tr('Weg deiner Antwort', "Your response path") }), stages, check);
    if (m) {
      details.append(el('h3', { text: tr('Zugeordneter Prüfbericht', "Associated review report") }),
        ...(review.vorlage ? [el('p', { text: m.criterion }), el('ul', {}, ...m.findings.map((finding) => el('li', {}, el('strong', { text: finding.state + ': ' }), finding.text)))] : []),
        m.findings.length ? '' : el('p', { text: tr('Für diesen Bericht sind keine kurzen Prüfbefunde zugeordnet.', "No short findings are associated with this report.") }),
        el('section', { class: 'ab-beleg', id: 'pruefbericht', 'aria-label': tr('Vollständiger Prüfbericht', "Complete review report") },
          el('p', { class: 'ab-quelle', text: m.path + ' / ' + m.heading }), el('pre', { text: m.excerpt })));
    }
    if (review.warnings.length) details.append(el('h3', { text: tr('Hinweise', "Notes") }), el('ul', {}, ...review.warnings.map((warning) => el('li', { text: warning }))));
    return details;
  }

  function hasProjectConversation() {
    return !review.task.vertragsfehler && !review.task.entryIssue && L.projectConversations(review.task.entryId || review.task.vorhaben).some(draft => draft.operator === lane);
  }

  function question() {
    if (hasProjectConversation()) return '';
    const target = L.lanes.find((item) => item.key === lane);
    if (!target || !review.task.auftrag) return '';
    const body = window.LEITSTAND_INSTANZ.discussionCard(target, { optional: true, kopf: false,
      task: review.task, subject: tr('Freiwillige Frage oder Beobachtung zur Ergebnisvorstellung', "Optional question or observation on the result introduction"),
      review: () => review, stale: () => stale, unavailable: () => dirty });
    return el('section', { id: 'rueckfrage', class: 'ab-rueckfrage' },
      el('h2', { text: tr('Frage zum Ergebnis', "Question about the result") }), body,
      el('p', { class: 'ab-hinweis', text: tr('Eine Frage zur Vorstellung und dein Urteil über das gesamte Ergebnis haben einen eigenen Geltungsbereich.', "A question about the introduction and your assessment of the entire result have separate scopes.") }));
  }

  function decision() {
    error = el('p', { class: 'ab-fehler', role: 'alert' });
    feedback = el('div', { class: 'ab-rueckmeldung', role: 'status', 'aria-live': 'polite' });
    const section = el('section', { class: 'ab-teil ab-entscheidung', id: 'entscheidung' },
      el('h2', { ...(hasProjectConversation() ? { id: 'rueckfrage', tabindex: '-1' } : {}), text: tr('Ergebnis im Chat beurteilen', 'Assess the result in conversation') }),
      !usable() ? el('p', { class: 'ab-fehlt', text: tr('Die vollständige Ergebnisvorlage fehlt. Kläre zuerst die fehlende Grundlage.', "The complete result template is missing. Clarify the missing basis first.") }) : '',
      L.auftragOffen(review.task) ? el('p', { text: tr('Der Auftrag ist noch nicht als fertig gemeldet. Besprich den aktuellen Stand und seine Voraussetzungen.', "The assignment has not been reported complete. Discuss its current state and prerequisites.") }) : '',
      review.abnahmeart === 'Freigabe' ? el('p', { class: 'ab-hinweis', text: tr('Technische Freigabe folgt der unabhängigen Prüfung und der im Lab geregelten Zuständigkeit. Eine inhaltliche Beurteilung behält ihren eigenen Umfang.', "Technical approval follows independent review and the responsibilities defined by the lab. Content assessment retains its own scope.") }) : '',
      A.discussion(() => review.task, () => ({ ziel: 'abnahme', review, stale, unavailable: dirty,
        label: tr('Ergebnis im Chat besprechen', 'Discuss the result in conversation'), projectConversation: true })), error, feedback);
    return section;
  }

  function show() {
    const m = review.material;
    const presentation = E.describe({ ...review.task, ergebnis: review.ergebnis });
    if (!review.ergebnis && m?.title) presentation.title = m.title;
    const projectId = review.task.entryId || review.task.vorhaben || '';
    const project = L.entryById.get(projectId);
    const context = el('p', { class: 'ab-kontext' },
      project ? el('a', { href: 'projekte.html?' + new URLSearchParams({ projekt: projectId }), text: L.voll(project.name) }) : (projectId || tr('Projekt nicht zugeordnet', "Project not assigned")),
      el('span', { text: L.laneName(lane) }), el('span', { text: review.task.zustand === 'erledigt' ? tr('Zur Beurteilung vorgelegt', 'Submitted for review') : L.auftragWort(review.task.zustand) }));
    const original = el('details', { class: 'ab-auftrag' },
      el('summary', { text: tr('Originalauftrag und Herkunft', 'Original assignment and provenance') }),
      el('p', { text: review.task.auftrag }),
      presentation.editorial ? el('p', { class: 'ab-hinweis', text: tr('Kurztitel und Prüfvorschlag sind redaktionell aus der Ergebnisvorlage abgeleitet. Sie sind keine neue Nutzerentscheidung.', "The short title and suggested review are editorial aids derived from the result template. They are not a new user decision.") }) : '',
      el('a', { href: L.sourceReaderHref(sourcePath(), projectId), text: tr('Vollständige Operator-Datei lesen', "Read complete operator file") }));
    const pilot = E.introduction({ ...review.task, ergebnis: review.ergebnis });
    introductionHost = pilot ? el('section', { id: 'vorstellung', class: 'ab-vorstellung', 'aria-label': tr('Ergebnisvorstellung', 'Output presentation') }, el('p', { role: 'status', text: tr('Ergebnisquelle wird gelesen …', "Reading result source…") })) : null;
    root.classList.toggle('ab-mit-vorstellung', Boolean(pilot?.frames));
    const material = el('section', { id: 'ergebnis', class: 'ab-ergebnis', 'aria-label': tr('Vorgelegtes Ergebnis', "Presented result") });
    if (review.zweck) material.append(part(tr('Zweck', "Purpose"), el('p', { text: review.zweck })));
    if (review.vorlage) {
      material.append(part(tr('Vorgelegtes Ergebnis', "Presented result"), el('p', { text: review.ergebnis })));
      if (review.ansehen.length) material.append(part(tr('Ergebnis öffnen', "Open result"), views(review.ansehen)));
      material.append(part(tr('Berichtete Prüfung', "Reported verification"), el('p', { text: review.gepruft })));
    } else if (m) {
      const targets = m.href && !m.href.startsWith('abnahme.html') ? [{ text: m.title, href: m.href, art: 'mission-control' }] : [];
      material.append(part(tr('Was der Bericht zur Prüfung nennt', "What the report says about verification"), el('p', { text: m.criterion })));
      if (targets.length) material.append(part(tr('Ergebnis öffnen', "Open result"), views(targets)));
      material.append(part('Berichtete Befunde', m.findings.length
        ? el('ul', { class: 'ab-befunde' }, ...m.findings.map((finding) => el('li', {}, el('strong', { text: finding.state + ': ' }), finding.text)))
        : el('p', { text: tr('Der zugeordnete Prüfbericht steht in den technischen Angaben.', "The associated review report is in the technical details.") })));
    }
    if (pilot) {
      const full = el('details', { class: 'ab-vollvorlage' }, el('summary', { text: tr('Vollständige Ergebnisvorlage und berichtete Prüfung', "Complete result template and reported verification") }), ...material.childNodes);
      material.replaceChildren(introductionHost, full);
    }
    root.replaceChildren(
      el('header', { class: 'ab-kopf' }, el('a', { id: 'ergebnis-zurueck', ...(E.returnTarget(params.get('von')) || projectReturn() || { href: 'index.html', text: tr('Zur Übersicht', "Back to overview") }) }),
        el('h1', { class: 'ab-ergebnis-titel', text: presentation.title }), context),
      presentation.editorial && !pilot ? part(tr('Prüfvorschlag', "Suggested review"), el('p', { class: 'ab-vorschlag', text: presentation.judgement })) : '',
      material, original, question(), decision(), technical(m));
    if (location.hash === '#entscheidung' || location.hash === '#ergebnis') {
      requestAnimationFrame(() => root.querySelector(location.hash)?.scrollIntoView({ block: 'start' }));
    }
  }

  if (!lane || !kennung) {
    root.replaceChildren(el('h1', { text: tr('Welche Arbeit möchtest du prüfen?', "Which work would you like to review?") }),
      ...L.abnahmen().map((item) => el('p', {}, el('a', { href: 'abnahme.html?' + new URLSearchParams({ lane: item.operator, kennung: item.kennung }), text: item.auftrag }))));
  } else refresh(true);
  document.addEventListener('mission-control-demo-uebertragung', (event) => { if (event.detail?.punktId === L.abnahmeId(lane, kennung)) refresh(); });
  window.addEventListener('focus', () => { if (review) refresh(); });
})();
