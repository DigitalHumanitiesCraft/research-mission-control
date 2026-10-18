// Mission Control keeps source-age hints, category filtering and shared DOM helpers.
// navigation.js owns the data-independent header, route list and colour scheme.
(function () {
  'use strict';

  const t = (de, en) => window.UI_LANGUAGE ? window.UI_LANGUAGE.t(de, en) : de;
  const L = window.LEITSTAND;
  const T = window.LEITSTAND_THEMEN;
  if (!L || !T) throw new Error('shell.js needs model.js and themen.js loaded first');

  const THEMA = L.store('mission-control-demo-d-thema');
  const BASE = new URL('.', document.currentScript?.src || location.href);
  const ANTWORTEN_ROH = L.store('mission-control-demo-d-antworten');

  const eintraege = L.aw.eintraege;
  // Pages without antworten.js read the raw store; model.js accepts both shapes.
  const antworten = () => ({});
  const isDich = (e, ans) => L.groupOf(e, ans) === 'dich';
  // An entry is open when it is neither resting nor closed and still carries
  // a step or an operator point; a theme without any open entry gets no chip.
  const isOffen = (e) => L.groupOf(e) !== 'ruhend' && ((e.schritte || []).length > 0 || L.points(e).length > 0);

  const themen = T.themen().filter((t) => eintraege.some((e) => T.themaVon(e) === t && isOffen(e)));

  // A stored theme that no longer has a chip falls back to all themes, so a
  // stale choice never hides every entry.
  let auswahl = THEMA.get(null);
  if (!themen.includes(auswahl)) auswahl = null;
  const addressTheme = new URLSearchParams(location.search);
  if (addressTheme.getAll('thema').length === 1 && (!addressTheme.get('thema') || themen.includes(addressTheme.get('thema')))) {
    auswahl = addressTheme.get('thema') || null;
  }
  let originRestored = false;
  function restoreOriginFocus() {
    if (originRestored) return false;
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return false; }
    const target = id && document.getElementById(id);
    if (!target || !target.hasAttribute('data-return-origin')) return false;
    target.scrollIntoView({ block: 'center' });
    target.focus({ preventScroll: true });
    originRestored = true;
    return true;
  }
  window.addEventListener('hashchange', () => { originRestored = false; restoreOriginFocus(); });
  window.addEventListener('load', restoreOriginFocus);

  let chips = [];
  let onFilter = null;

  // The DOM helpers every view shares. An attribute that is null, undefined,
  // false or '' is left out, true sets it empty; text goes in as textContent.
  // A child that is null, undefined, false or '' is dropped, so a view can
  // write conditions inline.
  function el(tag, attrs = {}, ...kinder) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false || v === '') continue;
      if (k === 'text') node.textContent = v;
      else if (k === 'class') node.className = v;
      else node.setAttribute(k, v === true ? '' : v);
    }
    node.append(...kinder.filter((k) => k !== null && k !== undefined && k !== false && k !== ''));
    if (tag === 'a') {
      if (window.UI_LANGUAGE && node.getAttribute('href') != null) node.href = window.UI_LANGUAGE.href(node.href);
      window.SECOND_BRAIN_VAULT?.decorate(node);
    }
    return node;
  }

  // A title is not read reliably by screen readers, so it is repeated as
  // hidden text.
  function mitTitel(node, title) {
    if (!title) return node;
    node.title = title;
    node.append(el('span', { class: 'sr-only', text: `, ${title}` }));
    return node;
  }

  // Billing marks share one renderer across views. The company uses its
  // official local mark; personal fees retain their existing symbol.
  // Hidden text preserves the billing meaning independently of the image.
  function bezahltMarke(entry) {
    const b = L.bezahltVon(entry);
    if (!b) return null;
    const marke = b.art === 'dhcraft'
      ? el('img', { class: 'bezahlt-logo', src: 'dhcraft-logo-watercolor.png', alt: '', 'aria-hidden': 'true', width: 48, height: 48 })
      : el('span', { 'aria-hidden': 'true', text: '€' });
    return mitTitel(el('span', { class: 'bezahlt', 'data-bezahlt': b.art }, marke), b.titel);
  }

  // The text rules ohnePunkt and voll live in model.js; the shell passes them
  // on with the DOM helpers, as the views destructure them from here.
  const { ohnePunkt, voll } = L;
  // Only https and obsidian links reach an href; anything else is dropped.
  const sicherUrl = (url) => (/^(https:\/\/|obsidian:\/\/)/i.test(String(url || '')) ? url : '');

  function visible(entry) {
    return auswahl === null || T.themaVon(entry) === auswahl;
  }

  // What the count says, in the words of the rule fragenNachFolge() in
  // model.js (decision E-frage-nach-folge of 15 October 2026).
  function zaehlTitel({ rot, grau }, link) {
    const n = (folge) => rot.filter((x) => x.folge === folge).length;
    return [
      t(`${rot.length} jetzt: ${n('lane')} Fragen, auf die eine Lane wartet, `, `${rot.length} now: ${n('lane')} questions a lane is waiting for, `)
        + t(`${n('termin')} Fragen zu einem Termin in den nächsten ${L.SCHWELLEN.bald} Tagen.`, `${n('termin')} questions about dates in the next ${L.SCHWELLEN.bald} days.`),
      t(`${grau.length} bei Gelegenheit: offene Operatorpunkte in ACTIVE-WORK ohne solche Folge`, `${grau.length} when convenient: open ACTIVE-WORK operator points without that consequence`)
        + (auswahl === null ? '' : t(`, im Thema ${auswahl}`, `, in category ${T.label ? T.label(auswahl) : auswahl}`)) + '.',
      t('Nicht gezählt sind Punkte, die auf einen späteren Tag zurückgestellt sind, ruhende Vorhaben und Ergebnisabnahmen. Frühere Browserantworten schließen eine Quellenfrage nicht.', 'Deferred points, dormant undertakings and result acceptances are not counted. Earlier browser responses do not close a source question.')
        + (link ? t(' Öffnet die Sicht Fragen.', ' Opens the Decide view.') : ''),
    ].join(' ');
  }

  // Fills one count node: the red number of what blocks a lane or a date or
  // is an acceptance, then muted what can wait. The rule is model.js's; this
  // only renders it.
  function zahlFuellen(node) {
    const source = L.fragenNachFolge({}, L.todayIso(), visible);
    const lage = { rot: source.rot.filter(item => item.folge !== 'abnahme'), grau: source.grau.filter(item => item.folge !== 'abnahme') };
    const link = node.tagName === 'A';
    node.querySelector('.zahl').replaceChildren(
      el('span', { class: 'rot', text: t(`${lage.rot.length} jetzt`, `${lage.rot.length} now`) }),
      lage.grau.length ? el('span', { class: 'grau', text: t(` | ${lage.grau.length} bei Gelegenheit`, ` | ${lage.grau.length} when convenient`) }) : '');
    const titel = zaehlTitel(lage, link);
    node.title = titel;
    node.querySelector('.sr-only').textContent = `, ${titel}`;
  }

  /**
   * Count of open questions by consequence (L.fragenNachFolge): "N jetzt"
   * in the accent, then muted "| M bei Gelegenheit". link: true makes it a
   * link to Fragen. The node follows the theme filter and the answers. kurz
   * is kept for the callers and changes nothing since the rule of
   * 15 October 2026.
   */
  function fragenZahl({ link = true, kurz = false } = {}) {
    const node = el(link ? 'a' : 'span', { class: 'dich-zahl', 'data-form': kurz ? 'kurz' : 'lang' },
      el('span', { class: 'zahl', 'aria-live': 'polite' }), el('span', { class: 'sr-only' }));
    if (link) node.href = new URL('fragen.html', BASE).href;
    zahlFuellen(node);
    return node;
  }

  // A stand note appears only when a source is not from today. ACTIVE-WORK
  // counts by its updated date, the lanes by the newest report entry of a
  // lane file; the generator's run time says nothing about the content.
  function standHinweis() {
    const heute = L.todayIso();
    const aw = L.stand.activeWork.slice(0, 10);
    const lane = L.lanes.map(L.laneDatum).filter(Boolean).sort().pop() || '';
    const alt = (d) => Boolean(d) && d < heute;
    const wann = (d) => (L.ageDays(d, heute) === 1 ? t('von gestern', 'from yesterday') : t(`vom ${L.fmt(d)}`, `from ${L.fmt(d)}`));
    const teile = alt(aw) && alt(lane) && wann(aw) === wann(lane)
      ? [t(`ACTIVE-WORK und Lanes ${wann(aw)}`, `ACTIVE-WORK and lanes ${wann(aw)}`)]
      : [alt(aw) ? `ACTIVE-WORK ${wann(aw)}` : '', alt(lane) ? `Lanes ${wann(lane)}` : ''].filter(Boolean);
    if (!teile.length) return null;
    const title = [
      t(`ACTIVE-WORK zuletzt geändert am ${L.fmtLang(aw) || 'unbekannt'}`, `ACTIVE-WORK last changed on ${L.fmtLang(aw) || t('unbekannt', 'unknown')}`),
      t(`jüngster Lane-Report vom ${L.fmtLang(lane) || 'unbekannt'}`, `newest lane report from ${L.fmtLang(lane) || t('unbekannt', 'unknown')}`),
      t(`Lane-Dateien gelesen ${L.stand.lanes || 'unbekannt'}`, `Lane files read ${L.stand.lanes || t('unbekannt', 'unknown')}`),
      t(`Erledigt-Log bis ${L.fmtLang(L.stand.erledigt) || 'unbekannt'}`, `Work log through ${L.fmtLang(L.stand.erledigt) || t('unbekannt', 'unknown')}`),
    ].join(', ');
    return el('span', { class: 'stand', title }, teile.join(', '), el('span', { class: 'sr-only', text: `, ${title}` }));
  }

  // A chip counts the projects of its category that are not resting; the
  // operator read the former count of waiting projects as the category's
  // size ("Lehre 0"). A dot marks the category when one of them waits on
  // him. Counts follow canonical points and source deferrals, independently
  // of earlier browser answers.
  function zaehlen() {
    const ans = antworten();
    for (const { node, zahl, sr, thema } of chips) {
      if (!zahl) continue;
      const projekte = eintraege.filter((e) => T.themaVon(e) === thema && L.groupOf(e, ans) !== 'ruhend');
      const wartend = projekte.filter((e) => isDich(e, ans)).length;
      const satz = t(`${projekte.length} ${projekte.length === 1 ? 'Projekt' : 'Projekte'}`, `${projekte.length} ${projekte.length === 1 ? 'project' : 'projects'}`)
        + t(`, davon ${wartend} mit offenem ACTIVE-WORK-Operatorpunkt`, `, including ${wartend} with an open ACTIVE-WORK operator point`);
      zahl.textContent = String(projekte.length);
      node.classList.toggle('wartet', wartend > 0);
      sr.textContent = `, ${satz}`;
    }
    for (const node of document.querySelectorAll('.dich-zahl')) zahlFuellen(node);
  }

  function anwenden() {
    for (const { node, thema } of chips) node.setAttribute('aria-pressed', String(thema === auswahl));
    zaehlen();
    // The default count is set first so a view that counts after its own
    // filtering can overwrite it from inside onFilter.
    if (onFilter) onFilter(auswahl);
    restoreOriginFocus();
  }

  function waehlen(thema) {
    auswahl = thema;
    THEMA.set(thema);
    anwenden();
  }

  // The theme chip "alle" has no number; the question count in Übersicht and
  // Fragen stands for it. A category chip shows its mark, the same one its
  // entries carry, the category word small and its count. icons.js is looked
  // up at mount time, since pages load it after this file, and a page
  // without it shows the chips in words only.
  function chip(thema, label) {
    const displayLabel = thema === null ? label : T.label ? T.label(label) : label;
    const marke = thema === null ? null
      : window.LEITSTAND_ICONS?.create(T.schluesselVon(thema), null, { decorative: true }) ?? null;
    const node = el('button', { type: 'button', 'aria-pressed': 'false' },
      ...(marke ? [marke, el('span', { class: 'wort', text: displayLabel })] : [displayLabel]));
    let zahl = null;
    let sr = null;
    if (thema !== null) {
      zahl = el('span', { class: 'zahl', 'aria-hidden': 'true' });
      sr = el('span', { class: 'sr-only' });
      node.append(zahl, sr);
    }
    node.addEventListener('click', () => waehlen(thema));
    const row = el('div', { class: 'mc-filter-row' }, node);
    chips.push({ node, thema, zahl, sr });
    return row;
  }

  // Generated scripts may retain a last-good snapshot after refresh failure.
  // Surface that failure once, rather than presenting its age as currentness.
  function datenstandPruefen(container) {
    const responses = typeof performance !== 'undefined' && typeof performance.getEntriesByType === 'function' ? performance.getEntriesByType('resource') : [];
    const failed = responses.some(r => r.serverTiming?.some(t => t.name === 'datarefresh' && t.description === 'failed'));
    if (failed) container.append(el('p', { class: 'meldung datenstand-fehler', role: 'status', text: t("Ein Teil der Daten konnte nicht aktualisiert werden. Angezeigt wird der letzte verfügbare Stand.", "Some data could not be refreshed. The last available snapshot is shown.") }));
  }

  function sidebarOptions(view, filtered) {
    const page = location.pathname.split('/').pop();
    const context = page === 'abnahme.html' ? 'abnahme' : page === 'ausfuehrung.html' ? 'ausfuehrung' : view;
    const definitions = {
      human: [t("Dein Beitrag", "Your contribution"), t("Eine Antwort oder Beurteilung von dir steht aus.", "Your response or assessment is pending."), 'human'],
      overdue: [t("Überfällige Frist", "Overdue deadline"), t("Eine erfasste Frist ist verstrichen.", "A recorded deadline has passed."), 'human'],
      conflict: [t("Terminkonflikt", "Schedule conflict"), t("Erfasste Termine überschneiden sich.", "Recorded appointments overlap."), 'human'],
      assignment: [t("Auftragsstand", "Assignment status"), t("Erfasster Auftragstatus, keine Aussage zur laufenden Sitzung.", "Recorded assignment status; this does not describe the current session.")],
      release: [t("Technische Freigabe", "Technical approval"), t("Prüfung im Lab. Inhaltliche Abnahme bleibt getrennt.", "Lab verification. Substantive acceptance remains separate.")],
      browser: [t("Antwort im Browser", "Response in this browser"), t("Lokal gespeichert, noch kein Eingangsnachweis.", "Saved locally; delivery has not been confirmed.")],
      inbox: [t("Im Eingang", "In the inbox"), t("Übertragen. Übernahme wird gesondert belegt.", "Delivered. Adoption requires separate evidence.")],
      other: [t("Bei anderen", "With others"), t("Ein fremder Beitrag steht aus.", "Another contributor's input is pending.")],
      dirty: [t("Uncommittete Änderungen", "Uncommitted changes"), t("Änderungen im gelesenen Klon.", "Changes in the inspected clone."), '', '*'],
      ahead: [t("Vor dem Upstream", "Ahead of upstream"), t("Lokale Commits vor dem Upstream.", "Local commits ahead of upstream."), '', '↑'],
      part: [t("Teil von", "Part of"), t("Quellbelegte Projektzuordnung.", "Source-backed project membership.")],
      builds: [t("Baut auf", "Builds on"), t("Quellbelegte Verbindung zu einem anderen Vorhaben.", "Source-backed relationship to another undertaking.")],
      unchecked: [t("Ungeprüft", "Unchecked"), t("Für diesen Gegenstand liegt kein geprüftes Urteil vor.", "No verified assessment is available for this item.")],
      disputed: [t("Strittig / überholt", "Disputed / superseded"), t("Befund ist umstritten oder gilt nicht mehr für den aktuellen Stand.", "This finding is disputed or no longer applies to the current version.")],
      local: [t("Lokale Daten", "Local data"), t("Aufgezeichnete Claude-Code-Läufe. Andere Harnesses sind nicht vollständig erfasst.", "Recorded Claude Code runs. Coverage of other harnesses is incomplete.")],
    };
    const applicable = {
      uebersicht: ['human', 'overdue', 'conflict', 'assignment'], agenten: ['assignment', 'release'],
      abnahme: ['browser', 'inbox'], ausfuehrung: ['local'], fragen: ['inbox'],
      wer: ['human', 'other'], frische: ['dirty', 'ahead'], strategien: ['part', 'builds'],
      // Monitor brings its own filters as legend content, so no fixed legend.
      lage: ['human', 'overdue', 'conflict'], monitor: [],
    };
    const scopes = {
      uebersicht: t("Filter: Vorhaben und Arbeit.", "Filter: undertakings and work."),
      agenten: filtered ? t("Filter: Aufträge und Beiträge.", "Filter: assignments and contributions.") : t("Alle registrierten Operatoren und ihre Aufträge.", "All registered operators and their assignments."),
      projekte: t("Filter: Projekte.", "Filter: projects."), fragen: t("Filter: Fragen.", "Filter: questions."),
      kalender: t("Filter: Kalendereinträge.", "Filter: calendar entries."), wer: t("Filter: Vorhaben.", "Filter: undertakings."),
      frische: t("Filter: Quellenstände.", "Filter: source versions."), strategien: t("Filter: Vorhaben.", "Filter: undertakings."),
      lage: t("Filter: Vorhaben.", "Filter: undertakings."),
      abnahme: t("Das ausgewählte Ergebnis und die zugehörige Antwort.", "The selected result and its associated response."),
      ausfuehrung: t("Gespeicherte technische Laufdaten mit den Grenzen der Erfassung.", "Recorded execution data and its coverage limits."),
      monitor: t("Gespeicherte Prüfbefunde. Keine laufende Überwachung.", "Recorded review findings. No live monitoring."),
    };
    const keys = new Set(applicable[context] || []);
    const legend = Object.entries(definitions).filter(([key]) => keys.has(key)).map(([, value]) => value);
    return { title: t("Einordnung", "Context"),
      scope: scopes[context] || '', legend };
  }

  let briefingLoad;
  function loadOperatorBriefings() {
    if (briefingLoad) return briefingLoad;
    briefingLoad = (async () => {
      try {
        const indexResponse = await fetch('briefings/current.json', { cache: 'no-store' });
        const index = indexResponse.ok ? await indexResponse.json() : null;
        if (!/^\d{4}-\d{2}-\d{2}T\d{6}Z\.json$/.test(index?.snapshot || '')) return {};
        const response = await fetch('briefings/' + index.snapshot, { cache: 'no-store' });
        const snapshot = response.ok ? await response.json() : null;
        if (!snapshot?.operators || typeof snapshot.operators !== 'object' || Array.isArray(snapshot.operators)) return {};
        const { operatorBriefing } = await import('./operatoren-model.js');
        const reports = Object.fromEntries(L.lanes.map(lane => [lane.key, { ...operatorBriefing(lane, snapshot.operators[lane.key]), snapshotPath: 'briefings/' + index.snapshot }]));
        L.setOperatorBriefings(reports);
        window.LEITSTAND_ANTWORTEN?.refreshDiscussions();
        return { operators: snapshot.operators, path: 'briefings/' + index.snapshot, roundId: snapshot.roundId || index.snapshot };
      } catch { return {}; }
    })();
    return briefingLoad;
  }

  function mount(container, opts = {}) {
    if (!container) throw new Error('LEITSTAND_SHELL.mount needs a container');
    onFilter = typeof opts.onFilter === 'function' ? opts.onFilter : null;
    chips = [];

    const kopf = window.SECOND_BRAIN_NAVIGATION.create({ view: opts.view, status: standHinweis() });

    const filter = el('div', { class: 'filter', role: 'group', 'aria-label': t("Thema", "Category") }, chip(null, t("alle", "all")));
    for (const t of themen) filter.append(chip(t, t));
    const filtered = opts.themen !== false && themen.length > 0;
    const main = container.parentElement?.querySelector('main');
    if (main) {
      const options = sidebarOptions(opts.view, filtered);
      if (opts.themen !== false && !themen.length) options.scope = [options.scope, t("Keine filterbare Kategorie erfasst.", "No filterable category is recorded.")].filter(Boolean).join(' ');
      window.SECOND_BRAIN_NAVIGATION.mountSidebar(main, {
        ...options, ...(opts.sidebarTitle ? { title: opts.sidebarTitle } : {}), filter: filtered ? filter : null, legendContent: opts.legendContent || null,
        filterKey: filtered ? t("Zahl: Projekte dieser Kategorie außer ruhenden und abgeschlossenen. Punkt: Mindestens ein offener ACTIVE-WORK-Operatorpunkt nach kanonischen Zurückstellungen. Lane-Fragen und Ergebnisabnahmen sind nicht mitgezählt.", "Count: projects in this category, excluding dormant and completed projects. Dot: at least one open ACTIVE-WORK operator point after canonical deferrals. Lane questions and result acceptances are not included.") : '',
      });
    } else if (filtered) kopf.append(filter);

    container.replaceChildren(kopf);
    datenstandPruefen(container);
    // Optional transport cannot hold the canonical project/lane view hostage.
    anwenden();
    if (typeof window.fetch === 'function') {
      const notice = el('p', { id: 'operator-briefing-load', role: 'status', class: 'briefing-load',
        text: t('Operatorbriefings werden noch gelesen. Projekt- und Lane-Quellen sind verfügbar.', 'Operator briefings are still loading. Project and lane sources are available.') });
      container.append(notice);
      loadOperatorBriefings().then(data => {
        notice.hidden = Boolean(data.operators);
        notice.textContent = data.operators ? '' : t('Operatorbriefings sind nicht verfügbar. Angezeigt werden die erfassten Projekt- und Lane-Quellen.', 'Operator briefings are unavailable. Showing the recorded project and lane sources.');
        zaehlen();
        if (data.operators && typeof opts.onBriefings === 'function') opts.onBriefings(data);
      });
    }
    return kopf;
  }

  for (const event of ['mission-control-demo-antwort', 'mission-control-demo-uebertragung']) document.addEventListener(event, zaehlen);
  window.addEventListener('storage', event => {
    if (event.key === 'mission-control-demo-d-antworten') anwenden();
  });

  window.LEITSTAND_SHELL = {
    mount,
    loadOperatorBriefings,
    fragenZahl,
    filter: () => auswahl,
    restoreOriginFocus,
    waehlen,
    visible,
    el,
    mitTitel,
    bezahltMarke,
    ohnePunkt,
    voll,
    sicherUrl,
  };
})();
