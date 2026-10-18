(function () {
  'use strict';
  const tr = (de, en) => typeof window !== 'undefined' && window.UI_LANGUAGE ? window.UI_LANGUAGE.t(de, en) : de;
  const L = window.LEITSTAND;
  const S = window.LEITSTAND_SHELL;
  const A = window.LEITSTAND_ANTWORTEN;
  const IN = window.LEITSTAND_INSTANZ;
  if (!L || !S || !A || !IN) throw new Error('fragen.js needs model, themen, shell, antworten and instanz loaded first');
  const { el, mitTitel, voll } = S;

  const HEUTE = L.todayIso();
  // Später returns a point after one week; the operator can answer again or
  // set another day in ACTIVE-WORK. Chosen with the rebuild of 15 October
  // 2026, in place of the former parking default of the whole entry.
  const SPAETER_BIS = L.plusTage(HEUTE, 7);
  const ORCH = L.orchestrator?.name || 'orchestrator';
  const WT = [tr('So', 'Sun'), tr('Mo', 'Mon'), tr('Di', 'Tue'), tr('Mi', 'Wed'), tr('Do', 'Thu'), tr('Fr', 'Fri'), tr('Sa', 'Sat')];
  const GRUPPEN = [
    { key: 'lane', titel: tr('Rückfragen der Operatoren', "Questions from operators") },
    { key: 'discussion', titel: tr('Optionale Besprechung', "Optional discussion") },
    { key: 'termin', titel: tr('Vor einem Termin', "Before an appointment") },
  ];
  // The vault convention names the point types without defining them; the
  // wording follows the answer logic of the former work surface.
  const TYP_HILFE = {
    Entscheidung: tr('Verlangt eine Wahl zwischen Wegen, die nur du treffen kannst.', "Requires a choice between approaches that only you can make."),
    Freigabe: tr('Verlangt dein Urteil über einen fertigen Stand, bevor er weitergeht oder nach außen geht.', "Requires your assessment of a completed state before it proceeds or is shared."),
    Definition: tr('Verlangt eine Festlegung, was ein Begriff, Umfang oder Kriterium künftig bedeutet.', "Requires a definition of a term, scope or criterion."),
    'Einschätzung': tr('Verlangt deine fachliche Einschätzung als Grundlage für den nächsten Schritt.', "Requires your subject assessment as the basis for the next step."),
    Eingabe: tr('Verlangt eine Angabe von dir, die sonst niemand kennt, etwa einen Fall, einen Namen oder einen Termin.', "Requires information only you know, such as a case, name or date."),
    Handlung: tr('Verlangt eine Handlung, die nur du ausführen kannst, etwa senden, unterschreiben oder freischalten.', "Requires an action only you can perform, such as sending, signing or granting access."),
  };
  const artDef = new Map(A.arten.map((a) => [a.wert, a]));

  const $ = (id) => document.getElementById(id);
  // Items of the last draw by row id, and the rows answered on this page,
  // kept across redraws so their confirmation stays visible.
  const items = new Map();
  const eben = new Map();
  const drafts = new Map();
  const draftBinding = (item) => JSON.stringify(item?.punkt
    ? [item.punkt.frage, item.punkt.kontext, item.punkt.voraussetzung] : [item?.text]);
  const fields = (row) => [...row.querySelectorAll('.steuerung input.eingabe, .steuerung textarea')];
  function rememberDrafts() {
    let focused = null;
    for (const row of $('liste').querySelectorAll('li.frage:not(.entschieden)')) {
      const controls = fields(row);
      if (!controls.length) continue;
      drafts.set(row.id, { binding: draftBinding(items.get(row.id)), values: controls.map((node) => node.value) });
      const index = controls.indexOf(document.activeElement);
      if (index >= 0) focused = { id: row.id, index, start: controls[index].selectionStart, end: controls[index].selectionEnd };
    }
    return focused;
  }
  function restoreDrafts(focused) {
    for (const row of $('liste').querySelectorAll('li.frage:not(.entschieden)')) {
      const draft = drafts.get(row.id);
      if (!draft || draft.binding !== draftBinding(items.get(row.id))) continue;
      fields(row).forEach((node, index) => { if (draft.values[index] !== undefined) node.value = draft.values[index]; });
    }
    const row = focused && document.getElementById(focused.id);
    const node = row && fields(row)[focused.index];
    if (node) { node.focus({ preventScroll: true }); node.setSelectionRange(focused.start, focused.end); }
  }

  const kurzTag = (iso) => `${WT[new Date(`${iso}T00:00:00`).getDay()]} ${L.fmt(iso)}`;
  const uhr = (iso) => L.uhrVon(new Date(iso));
  const gross = (t) => t.charAt(0).toUpperCase() + t.slice(1);

  function melde(text) {
    const m = $('meldung');
    m.textContent = text;
    m.hidden = !text;
  }

  // A source question keeps its existing response and URL identity.
  // stored answers and fragen.html#<id> keep their meaning. A lane question
  // has no stored id; lane-<key> follows the lane questions of antworten.js.
  function rowId(x) {
    if (x.quelle === 'lane') return `lane-${x.operator}${x.kennung ? `-${x.kennung}` : ''}`;
    return x.punkt.id;
  }

  // A lane question counts as answered once a message sent from this browser
  // reached the inbox after the lane wrote its current question, the rule Wer
  // follows (instanz.js beantwortet). The model does not know these messages,
  // so the filter stands here; see the report of 15 October 2026 for moving it.
  function laneBeantwortet(x) {
    const lane = L.lanes.find((l) => l.key === x.operator);
    return Boolean(lane && IN.beantwortet(lane) && voll(lane.question) === voll(x.text));
  }

  // The one call per draw: count, groups and the rows all come from here.
  function berechne() {
    const roh = L.fragenNachFolge({}, HEUTE, S.visible);
    // A changed answer in another tab may reopen a point. The confirmation
    // cache must follow the model rather than conceal its current open row.
    for (const x of [...roh.rot, ...roh.grau]) if (x.quelle !== 'lane' && x.folge !== 'abnahme') eben.delete(rowId(x));
    const offen = (x) => x.folge !== 'abnahme';
    const rot = roh.rot.filter(offen);
    return { rot, optional: roh.optional || [], grau: roh.grau.filter(offen), gruppen: GRUPPEN.map((g) => ({ ...g, items: [...rot, ...(roh.optional || [])].filter((x) => x.folge === g.key) })) };
  }

  // make_data.py keeps the precondition inside the question text as well, so
  // it is cut there to show it once, with its own line.
  function frageText(p) {
    const v = p.voraussetzung ? ` Voraussetzung: ${p.voraussetzung}` : '';
    return L.questionLabel(v && p.frage.endsWith(v) ? p.frage.slice(0, -v.length) : p.frage);
  }

  // The consequence the context of a point names: the sentences "Bei Ja …"
  // and "Bei Nein …", else "Mit der Antwort …", as the ACTIVE-WORK convention
  // writes them. A period after a digit ends a sentence only at the end of
  // the text, so "vom 24. Oktober" stays whole. rest is the remaining context.
  const ENDE = /\.(?=\s+[A-ZÄÖÜ„]|\s*$)/g;
  function satzEnde(t, ab) {
    ENDE.lastIndex = ab;
    for (let m = ENDE.exec(t); m; m = ENDE.exec(t)) {
      if (/\d$/.test(t.slice(0, m.index)) && m.index + 1 < t.length) continue;
      return m.index + 1;
    }
    return t.length;
  }
  function folgeAus(kontext) {
    const t = voll(kontext || '');
    const ja = t.search(/\bBei Ja\b/);
    const nein = t.search(/\bBei Nein\b/);
    const mit = t.search(/\bMit der Antwort\b/);
    const teile = [];
    if (ja >= 0) teile.push([ja, nein > ja ? nein : satzEnde(t, ja)]);
    if (nein >= 0) teile.push([nein, satzEnde(t, nein)]);
    if (ja < 0 && nein < 0 && mit >= 0) teile.push([mit, satzEnde(t, mit)]);
    let rest = t;
    for (const [a, b] of [...teile].sort((x, y) => y[0] - x[0])) rest = rest.slice(0, a) + rest.slice(b);
    return { jaNein: ja >= 0, folge: teile.map(([a, b]) => t.slice(a, b).trim()).join(' '), rest: rest.replace(/\s+/g, ' ').trim() };
  }

  function projekt(id, ersatz = '', origin = '') {
    const e = id ? L.entryById.get(id) : null;
    if (e) {
      return el('span', { class: 'projekt' },
        el('a', { id: origin || undefined, ...(origin ? { 'data-return-origin': true } : {}), href: window.LEITSTAND_ERGEBNISSE.projectHref(e.id, origin ? window.LEITSTAND_ERGEBNISSE.originAddress(origin) : ''), text: L.rein(e.name) }), S.bezahltMarke?.(e) ?? null);
    }
    return el('span', { class: ersatz ? 'projekt' : 'projekt leise', text: ersatz ? L.rein(ersatz) : tr('kein Projekt zugeordnet', "No project assigned") });
  }

  // The meta line under a question, its parts separated by "|".
  const meta = (...teile) => el('p', { class: 'frage-meta' },
    ...teile.filter(Boolean).flatMap((t, i) => (i ? [el('span', { class: 'trenner', 'aria-hidden': 'true', text: ' | ' }), t] : [t])));

  // The consequences of Ja and Nein stand on their own lines, so they can be scanned.
  const folgeZeile = (text) => (text ? el('p', { class: 'folge' }, el('span', { class: 'folge-wort', text: tr('Folge ', "Consequence ") }),
    ...String(text).split(/\s+(?=Bei Nein\b)/).map((teil) => el('span', { class: 'folge-teil', text: teil }))) : null);

  // Dialogue preparation uses the same source-bound prompt on every view.
  function punktSteuerung(p, task) {
    return el('div', { class: 'steuerung' }, A.discussion(p, { ziel: 'punkt', ...(task ? { task } : {}) }));
  }

  function punktZeile(x) {
    const p = x.punkt;
    const { jaNein, folge, rest } = folgeAus(p.kontext);
    const li = el('li', { class: 'frage', id: p.id, 'data-form': jaNein ? 'janein' : 'text', 'data-entry': x.entry.id });
    li.append(
      punktSteuerung(p, x.auftrag),
      meta(projekt(x.entry.id, '', 'open-question-project-' + p.id),
        p.typ ? mitTitel(el('span', { class: 'typ', text: p.typ }), TYP_HILFE[p.typ] || '') : null,
        x.termin ? mitTitel(el('span', { class: 'termin', text: tr(`Termin ${kurzTag(x.termin.datum)}`, `Appointment ${kurzTag(x.termin.datum)}`) }), `${L.volldatum(x.termin.datum)}: ${voll(x.termin.text)}`) : null,
        p.seit ? mitTitel(el('span', { class: 'seit', text: tr(`${L.alterLang(p.seit, HEUTE).split(', ').pop()} offen`, `Open for ${L.alterLang(p.seit, HEUTE).split(', ').pop()}`) }), tr(`offen seit ${L.alterLang(p.seit, HEUTE)}, ACTIVE-WORK`, `Open since ${L.alterLang(p.seit, HEUTE)}, ACTIVE-WORK`)) : null),
      rest ? el('p', { class: 'kontext', text: rest }) : '',
      p.voraussetzung ? el('p', { class: 'voraussetzung' }, el('span', { class: 'folge-wort', text: tr('Voraussetzung ', "Prerequisite ") }), voll(p.voraussetzung)) : '',
      folgeZeile([x.auftrag ? `Deine Antwort gibt ${L.laneName(x.auftrag.operator)} frei.` : '', folge].filter(Boolean).join(' ')) || '');
    return li;
  }

  // Lane questions use the same source-bound discussion control as project questions.
  function laneZeile(x) {
    const id = rowId(x);
    const lane = L.lanes.find((l) => l.key === x.operator);
    const li = el('li', { class: 'frage lane', id, 'data-lane': x.operator, 'data-entry': x.entryId || '' });
    const boundTask = lane?.auftraege?.find(task => task.kennung === x.kennung);
    const card = lane ? A.discussion({ ...x, id, frage: x.text, entryIssue: lane.entryIssue }, { ziel: 'lane', ...(boundTask ? { task: { ...boundTask, operator: lane.key } } : {}) }) : null;
    li.append(
      card || '',
      meta(el('span', { class: `operator ${x.operator}`, text: tr(`Frage von ${L.laneName(x.operator)}`, `Question from ${L.laneName(x.operator)}`) }), projekt(x.entryId, '', 'open-question-project-' + id) || el('span', { text: lane?.entryIssue || tr('Vorhaben nicht zugeordnet', "Project not assigned") })),
      folgeZeile(tr('Die aktuelle Frage wird im Chat geklärt.', "The current question is discussed in chat.")));
    return li;
  }

  function zeile(x) {
    items.set(rowId(x), x);
    return x.quelle === 'lane' ? laneZeile(x) : punktZeile(x);
  }

  // The confirmation of an answered row, in plain words: what was answered
  // and where the answer is now.
  function bestaetigung(li) {
    const id = li.id;
    const x = eben.get(id) || items.get(id);
    if (!x) return '';
    if (x.quelle === 'lane') {
      const n = IN.letzte(L.lanes.find((l) => l.key === x.operator));
      if (!n) return '';
      const was = tr(`Deine Nachricht an ${L.laneName(x.operator)}: „${n.text}“.`, `Your message to ${L.laneName(x.operator)}: “${n.text}”.`);
      if (!n.ok) return tr(`${was} Sie ist nicht im Eingang angekommen: ${String(n.fehler || 'unbekannter Fehler').replace(/\.$/, '')}.`, `${was} It has not arrived in the inbox: ${String(n.fehler || 'unknown error').replace(/\.$/, '')}.`);
      const wer = x.operator === L.orchestrator?.key ? tr(`, ${L.laneName(x.operator)} liest sie beim nächsten Sync`, `, ${L.laneName(x.operator)} reads it at the next sync`)
        : n.kopiert ? tr(`, der Prompt für ${L.laneName(x.operator)} liegt in der Zwischenablage`, `, the prompt for ${L.laneName(x.operator)} is on the clipboard`) : '';
      return tr(`${was} Sie liegt seit ${uhr(n.zeit)} Uhr im Eingang${wer}.`, `${was} It has been in the inbox since ${uhr(n.zeit)}${wer}.`);
    }
    const a = A.get(id);
    if (!a?.art) return '';
    const text = li.dataset.form === 'text';
    const was = a.art === 'spaeter' ? tr(`Zurückgestellt bis ${L.volldatum(a.bis)}.`, `Deferred until ${L.volldatum(a.bis)}.`)
      : text && a.art === 'ja' ? tr(`Deine Antwort: „${a.notiz}“.`, `Your response: “${a.notiz}”.`)
        : tr(`Deine Antwort: ${gross(artDef.get(a.art)?.label || a.art)}${a.notiz ? `, mit der Notiz „${a.notiz}“` : ''}.`, `Your response: ${gross(artDef.get(a.art)?.label || a.art)}${a.notiz ? `, with the note “${a.notiz}”` : ''}.`);
    const wo = a.uebertragen ? tr(`Sie liegt seit ${uhr(a.uebertragen)} Uhr im Eingang, ${ORCH} übernimmt sie beim nächsten Sync.`, `It has been in the inbox since ${uhr(a.uebertragen)}; ${ORCH} processes it at the next sync.`)
      : a.fehler ? tr(`Sie ist nur in diesem Browser gespeichert, der Eingang hat sie nicht angenommen: ${a.fehler.replace(/\.$/, '')}.`, `It is saved only in this browser; the inbox did not accept it: ${a.fehler.replace(/\.$/, '')}.`)
        : tr('Sie wird an den Eingang übertragen.', "It is transferred to the inbox.");
    return `${was} ${wo}`;
  }

  // Turns a row into its confirmation: the question and its meta line stay,
  // context, consequence and controls go. The focus follows to the
  // confirmation when it was in the row, so the next Tab reaches the next row.
  function wandle(li, fokus = true) {
    const hatte = fokus && li.contains(document.activeElement);
    li.classList.add('entschieden');
    for (const n of li.querySelectorAll(':scope > :not(.frage-text, .frage-meta)')) n.remove();
    const satz = el('p', { class: 'bestaetigung', role: 'status', tabindex: '-1', text: bestaetigung(li) });
    li.append(satz);
    if (hatte) satz.focus();
  }

  function gruppe(key, titel, liste) {
    return el('section', { class: `gruppe-entscheiden ${key}`, 'data-gruppe': key, 'aria-labelledby': `gruppe-${key}` },
      el('h3', { id: `gruppe-${key}`, tabindex: '-1' }, `${titel} (`, el('span', { class: 'anzahl', text: String(liste.length) }), ')'),
      el('ul', { class: 'fragen-liste', role: 'list' }, ...liste.map(zeile)));
  }

  function gelegenheit(liste) {
    return gruppe('gelegenheit', tr('Weitere offene Fragen', 'Further open questions'), liste);
  }

  function ebenGruppe() {
    const liste = [...eben.values()].map((x) => {
      const li = zeile(x);
      wandle(li, false);
      return li;
    });
    return el('section', { class: 'gruppe-entscheiden eben', 'data-gruppe': 'eben', 'aria-labelledby': 'gruppe-eben' },
      el('h3', { id: 'gruppe-eben', text: tr(`Eben entschieden (${liste.length})`, `Just decided (${liste.length})`) }),
      el('ul', { class: 'fragen-liste', role: 'list' }, ...liste));
  }

  // The count line and the group counts, from the same result as the rows.
  function zahlen(lage) {
    const n = (folge) => lage.rot.filter((x) => x.folge === folge).length;
    const counts = [
      [n('lane'), tr('Rückfragen', "Questions"), 'lane'],
      [lage.optional.length, tr('optionale Besprechungen', 'optional discussions'), 'discussion'],
      [n('termin'), tr('vor einem Termin', "before an appointment"), 'termin'], [lage.grau.length, tr('weitere Fragen', 'other questions'), 'gelegenheit'],
    ];
    $('zahl').title = tr('Gezählt werden die sichtbaren aktuellen Quellenfragen. Zurückgestellte Punkte und ruhende Vorhaben sind ausgenommen. Frühere Browserantworten schließen die kanonische Frage nicht.', "Counts visible current source questions. Deferred items and dormant projects are excluded. Earlier browser responses do not close a canonical question.");
    const visibleCounts = counts.filter(([count]) => count);
    const countLine = visibleCounts.map(([count, label]) => count + ' ' + label).join(', ');
    const counter = $('zahl');
    if (counter.textContent !== countLine) {
      const focused = counter.contains(document.activeElement) ? document.activeElement.getAttribute('href') : null;
      counter.replaceChildren(...visibleCounts.map(([count, label, key], index) =>
        el('span', {}, index ? ', ' : '', el('a', { href: '#gruppe-' + key, text: count + ' ' + label }))));
      if (focused) [...counter.querySelectorAll('a')].find((link) => link.getAttribute('href') === focused)?.focus({ preventScroll: true });
    }
    for (const g of [...lage.gruppen, { key: 'gelegenheit', items: lage.grau }]) {
      const k = $('liste').querySelector('[data-gruppe="' + g.key + '"] .anzahl');
      if (k) k.textContent = String(g.items.length);
    }
  }

  function zeichne(lage = berechne()) {
    const focused = rememberDrafts();
    items.clear();
    const leer = !lage.rot.length && !lage.grau.length && !lage.optional.length;
    const teile = [];
    if (leer) teile.push(el('p', { class: 'leer' }, tr('Nichts zu entscheiden. ', "Nothing to decide. "), el('a', { href: 'index.html', text: tr('Zur Übersicht', "Back to overview") })));

    for (const g of lage.gruppen) if (g.items.length) teile.push(gruppe(g.key, g.titel, g.items));
    if (lage.grau.length) teile.push(gelegenheit(lage.grau));
    if (eben.size) teile.push(ebenGruppe());
    $('zahl').hidden = leer;
    $('liste').replaceChildren(...teile);
    restoreDrafts(focused);
    zahlen(lage);
  }

  const offeneIds = (key) => [...$('liste').querySelectorAll(`[data-gruppe="${key}"] li.frage:not(.entschieden)`)].map((li) => li.id);
  const gleich = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

  // After an answer the rows that left the result turn into confirmations in
  // place and the counts follow. Should the result differ otherwise, the page
  // is drawn anew, so count and rows never disagree.
  function nachAntwort(laneKey) {
    const liste = $('liste');
    if (laneKey) {
      for (const li of liste.querySelectorAll(`li.frage.lane[data-lane="${CSS.escape(laneKey)}"]:not(.entschieden)`)) eben.set(li.id, items.get(li.id));
    }
    const lage = berechne();
    const offen = new Set([...lage.rot, ...lage.grau].map(rowId));
    for (const li of liste.querySelectorAll('li.frage:not(.entschieden)')) {
      if (offen.has(li.id) || !items.has(li.id)) continue;
      eben.set(li.id, items.get(li.id));
      wandle(li);
    }
    const stimmt = [...lage.gruppen, { key: 'gelegenheit', items: lage.grau }].every((g) => gleich(offeneIds(g.key), g.items.map(rowId)));
    if (stimmt) zahlen(lage);
    else zeichne(lage);
  }

  document.addEventListener('mission-control-demo-antwort', () => nachAntwort());
  document.addEventListener('mission-control-demo-nachricht', (ev) => { if (ev.detail?.ok) nachAntwort(ev.detail.laneKey); });
  document.addEventListener('mission-control-demo-uebertragung', (ev) => {
    nachAntwort();
    const li = ev.detail?.punktId ? document.getElementById(ev.detail.punktId) : null;
    const satz = li?.classList.contains('entschieden') ? li.querySelector('.bestaetigung') : null;
    if (satz) satz.textContent = bestaetigung(li);
  });

  // A jump scrolls the row to the top and focuses its first control. The values come from the
  // address, so they only select among known ids and reach the page as text.
  function sprung() {
    if (S.restoreOriginFocus()) return;
    const q = new URLSearchParams(location.search);
    let ziel = '';
    try { ziel = decodeURIComponent(location.hash.slice(1)); } catch { ziel = location.hash.slice(1); }
    if (document.getElementById(ziel)?.hasAttribute('data-return-origin')) return;
    ziel = ziel || q.get('punkt') || '';
    if (ziel === 'gruppe-abnahme') { melde(tr('Vorgelegte Ergebnisse stehen bei den Projekten in der Übersicht. Die einzelne Ergebnisansicht bleibt erreichbar.', "Presented results appear with their projects in the overview. Individual result pages remain available.")); return; }
    const group = document.getElementById(ziel);
    if (group?.matches('.gruppe-entscheiden > h3')) {
      group.scrollIntoView({ block: 'start' });
      group.focus({ preventScroll: true });
      melde('');
      return;
    }
    const vorhaben = q.get('vorhaben') || '';
    if (!ziel && !vorhaben) return;
    let li = ziel ? document.getElementById(ziel) : null;
    if (li && !li.matches('li.frage')) li = null;
    if (!li && vorhaben && !ziel) li = [...$('liste').querySelectorAll('li.frage:not(.entschieden)')].find((n) => n.dataset.entry === vorhaben) || null;
    if (li) {
      li.scrollIntoView({ block: 'start' });
      (li.querySelector('.chat-expand') || li.querySelector('a[href], button'))?.focus({ preventScroll: true });
      melde('');
      return;
    }
    const p = ziel ? L.postenById.get(ziel) : null;
    const e = p ? L.entryById.get(p.projekt) : vorhaben ? L.entryById.get(vorhaben) : null;
    const name = p ? tr(`Die Frage „${frageText(p)}“`, `The question “${frageText(p)}”`) : e ? `${L.rein(e.name)}` : '';
    if (e && !S.visible(e)) melde(tr(`${name} gehört nicht zum gewählten Thema, unter alle steht ${p ? 'sie' : 'es'}.`, `${name} is outside the selected category; find it under All.`));
    else if (p || e) melde(tr(`${name} wartet gerade nicht auf dich, etwa weil ${p ? 'sie zurückgestellt ist oder ihr' : 'kein Punkt offen ist oder das'} Vorhaben ruht.`, `${name} does not currently require your input; it may be deferred, have no open item or belong to a dormant project.`));
    else melde(tr(`Keine offene Frage unter „${(ziel || vorhaben).slice(0, 80)}“, hier sind alle.`, `No open question at “${(ziel || vorhaben).slice(0, 80)}”; showing all questions.`));
  }

  // mount runs onFilter once, which draws the list for the stored theme.
  let initialJumpPending = true;
  let initialDrawn = false;
  function initialJump() {
    if (!initialJumpPending || !initialDrawn) return;
    initialJumpPending = false;
    sprung();
  }
  S.mount($('kopf'), { view: 'fragen', onFilter: () => {
    zeichne();
    initialDrawn = true;
    if (document.readyState === 'complete') initialJump();
  }, onBriefings: () => A.refreshWithDrafts($('liste'), () => zeichne()) });
  window.addEventListener('focus', () => nachAntwort());
  window.addEventListener('storage', (event) => { if (event.key === 'mission-control-demo-d-antworten') nachAntwort(); });
  // Jump once after the canonical first render and document load; optional
  // briefing updates preserve the current keyboard position.
  window.addEventListener('load', initialJump, { once: true });
  window.addEventListener('hashchange', sprung);
})();
