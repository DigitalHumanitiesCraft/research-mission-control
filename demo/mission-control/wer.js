// Sicht "Wer": who holds what, in four blocks of the accepted row form. The
// instances (one row per lane with what it works on and the date of its last report), the
// operator (entries with open questions and the open questions of the lane
// reports, each linking to its decision), third parties (entries with a waiting reason) and nobody (free
// entries no lane holds). Each entry stands in exactly one of the last three
// blocks, in the order of groupOf: an open question outranks a waiting
// reason. The lane block with the next step belongs to the Übersicht, so a
// lane shows here only who it is, what it holds and when it last reported. In the three
// entry blocks the sort key is a date and stands on the left. Each question
// opens the shared read-only chat prompt and retains its source route. Reads
// window.LEITSTAND (model.js), LEITSTAND_SHELL, LEITSTAND_ZEILE,
// LEITSTAND_INSTANZ and never
// mutates their data; every text goes in through textContent.
(function () {
  'use strict';
  const tr = (de, en) => typeof window !== 'undefined' && window.UI_LANGUAGE ? window.UI_LANGUAGE.t(de, en) : de;
  const L = window.LEITSTAND;
  const S = window.LEITSTAND_SHELL;
  const Z = window.LEITSTAND_ZEILE;
  const IN = window.LEITSTAND_INSTANZ;
  const A = window.LEITSTAND_ANTWORTEN;
  if (!L || !S || !Z || !IN || !A) {
    throw new Error('wer.js needs model, themen, shell, antworten, icons, zeile and instanz loaded first');
  }
  const { el, mitTitel, voll } = S;

  const heute = L.todayIso();
  // Current source questions remain visible. Earlier browser answers and
  // messages are historical context in the shared prompt, not completion.

  // First-sentence label with the full text, which the row puts into the
  // title only when the label drops something.
  function kurz(text, woerter) {
    const ganz = voll(text);
    const label = ganz;
    return { label, labelFull: label !== ganz.replace(/[.,;:]$/, '') ? ganz : '' };
  }

  // A date the row shows on the left is dropped from its label ("am
  // 18.11.2026"), so the date stands once; the title keeps the full text.
  function ohneDatum(label, iso) {
    if (!iso) return label;
    const [y, m, d] = iso.split('-');
    const muster = new RegExp(`\\s*\\b(?:am|bis|zum|ab)?\\s*(?:0?${Number(d)}\\.\\s?0?${Number(m)}\\.(?:\\s?${y})?|${iso})`, 'g');
    return label.replace(muster, '').replace(/\s{2,}/g, ' ').trim();
  }

  // Time stamps are read only where the lane file writes them.
  function stempel(text) {
    const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/.exec(String(text ?? ''));
    return m ? { datum: m[1], zeit: m[2] } : null;
  }
  const laneStempel = (lane) => stempel((L.ll.lanes || []).find((l) => l.key === lane.key)?.stand?.text);

  // A date conflict is written out once per page, at the entry that must act:
  // the one with the fewest dates, as a single appointment moves more easily
  // than a series. The other entries of that day carry only "!" with a title.
  // Not L.konfliktReihe, which the Übersicht and Steht an follow: that one
  // first puts the entry whose step names the day (surface rule 12), so on
  // such a day Wer may write the conflict out at the other entry. Unifying
  // changes this view, so the difference stays until the operator decides.
  const konfliktTage = [...L.conflicts(heute)].map(([datum, ids]) => {
    const es = ids.map((id) => L.entryById.get(id)).filter(Boolean)
      .sort((a, b) => L.allDates(a).length - L.allDates(b).length || a.name.localeCompare(b.name, 'de'));
    return { datum, handelnd: es[0], andere: es.slice(1) };
  });

  function konflikte(entryId) {
    const aus = [];
    const marken = [];
    for (const k of konfliktTage) {
      if (k.handelnd.id === entryId) aus.push(k);
      else if (k.andere.some((e) => e.id === entryId)) marken.push(k);
    }
    return { aus, marken };
  }

  function konfliktMarken(entryId) {
    return konflikte(entryId).marken.map((k) => ({
      text: '!',
      title: tr(`Terminkonflikt am ${L.fmtLang(k.datum)} mit ${k.handelnd.name}, dort ausgeschrieben`, `Scheduling conflict on ${L.fmtLang(k.datum)} with ${k.handelnd.name}, described there`),
    }));
  }

  // Puts the written-out conflict as a second line under the label, keeping
  // the label's own title on the label alone. The date is left out when the
  // row already shows it on the left.
  function konfliktZeile(zeile, entryId, datumLinks = '') {
    const { aus } = konflikte(entryId);
    if (!aus.length) return;
    const etikett = zeile.querySelector(':scope > .etikett');
    const label = el('span', { class: 'label', title: etikett.title, text: etikett.textContent });
    etikett.removeAttribute('title');
    etikett.replaceChildren(label, ...aus.map((k) => mitTitel(
      el('span', { class: 'konflikt-text', text: `Konflikt${k.datum === datumLinks ? '' : ` ${L.fmt(k.datum)}`} mit ${k.andere.map((e) => e.name).join(', ')}` }),
      `Terminkonflikt am ${L.fmtLang(k.datum)}, ACTIVE-WORK`)));
  }

  // The sort key on the left of a row: a past date as its age, a coming one
  // as short date, with the long form and meaning in the title. A row
  // without a date keeps the cell empty.
  function datumLinks(zeile, { iso, title, klasse = '' }) {
    const span = el('span', { class: `datum ${klasse}`.trim(), text: iso ? L.kurzDatum(iso, heute) : '' });
    zeile.prepend(iso ? mitTitel(span, title) : span);
  }

  // Lane questions follow their current original wording and exact operator.
  const laneFragen = () => L.fragenNachFolge({}, heute).rot.filter(q => q.quelle === 'lane')
    .map(question => { const lane = L.lanes.find(l => l.key === question.operator); return { lane, question, stand: laneStempel(lane) }; });

  const laneSichtbar = (lane) => {
    const projects = L.laneProjects(lane);
    return projects.length ? projects.some(S.visible) : S.filter() === null;
  };

  // Blocks follow canonical source state, independently of browser history.
  function bloecke() {
    const ans = {};
    const laneHalt = new Set(L.lanes.flatMap(l => Array.isArray(l.auftraege) ? l.auftraege.map(a => a.entryId) : [l.entryId]).filter(Boolean));
    const du = [];
    const dritte = [];
    const niemand = [];
    for (const e of L.aw.eintraege) {
      const g = L.overviewGroupOf(e, ans);
      if (g === 'dich') du.push(e);
      else if (g === 'andere') dritte.push(e);
      else if (g === 'bereit' && !laneHalt.has(e.id)) niemand.push(e);
    }
    return { du, dritte, niemand, eigeneZeile: new Set([...du, ...dritte, ...niemand].map((e) => e.id)) };
  }

  function laneZeile(lane, eigeneZeile) {
    const s = IN.stempel(lane.fileDate);
    const projects = L.laneProjects(lane).filter(S.visible);
    const e = projects.length === 1 ? projects[0] : null;
    const session = String(L.ll.lanes.find(l => l.key === lane.key)?.session || '').trim();
    const sessionText = !session ? tr('Sitzungsangabe fehlt', 'Session information missing') : /^(?:keine|none)\b/i.test(session) ? tr('Keine aktuelle Sitzung vermerkt', 'No current session recorded') : tr('Sitzung vermerkt', 'Session recorded');
    const z = Z.create({
      icon: false, name: lane.name, href: 'operatoren.html?operator=' + encodeURIComponent(lane.key) + '#arbeit',
      right: s.datum ? tr('Bericht ', "Report ") + L.fmt(s.datum) : tr('kein Bericht', "No report"),
      rightTitle: s.datum ? 'Letzter Bericht in der Operator-Datei ' + L.fmtLang(s.datum) + (s.zeit ? ' ' + s.zeit : '') : tr('Die Operator-Datei trägt keinen Zeitstempel', "The operator file has no timestamp"),
      second: [{ text: sessionText, title: session || tr('Keine Sitzungsangabe in der Operator-Datei', "No session information in the operator file") }, ...(e && !eigeneZeile.has(e.id) ? konfliktMarken(e.id) : [])],
    });
    z.dataset.schluessel = 'lane:' + lane.key;
    z.classList.add('lane');
    const knopf = z.querySelector(':scope > .name > a');
    knopf.classList.add(lane.key);
    mitTitel(knopf, tr('Erfasste Aufträge von ', "Recorded assignments for ") + lane.name);
    const label = z.querySelector(':scope > .etikett');
    if (e && !eigeneZeile.has(e.id)) konfliktZeile(z, e.id);
    const content = label.querySelector('.label') || label;
    const links = projects.map(project => el('a', {
      href: project.status === 'abgeschlossen' && S.sicherUrl(project.vaultUrl) ? project.vaultUrl : 'projekte.html?projekt=' + encodeURIComponent(project.id), text: project.name,
    }));
    content.replaceChildren(...(links.length ? links.flatMap((link, i) => i ? [', ', link] : [link]) : [lane.entryIssue || tr('Kein Auftragsprojekt erfasst', "No assignment project recorded")]));
    const unresolved = [...(lane.auftraege || []), ...lane.erledigt, ...lane.abgenommen].some(task => !task.entryId);
    if (unresolved && links.length) content.append(tr('. Weitere Auftragszuordnung ungeklärt', ". Further assignment association unclear"));
    return z;
  }

  // A lane question in the operator block: the lane name in its colour, the
  // complete question and the report date on the left. Its title links to
  // the decision page, where the operator can answer it.
  function laneFrageZeile({ lane, question, stand: st }) {
    const point = 'lane-' + lane.key + (question.kennung ? '-' + question.kennung : '');
    const schluessel = 'du:' + point;
    const teile = { label: '', labelFull: '' };
    const z = Z.create({
      icon: false, name: lane.name, ...teile, href: 'fragen.html?punkt=' + encodeURIComponent(point),
    });
    z.dataset.schluessel = schluessel;
    z.classList.add('lane');
    const knopf = z.querySelector(':scope > .name > a');
    knopf.classList.add(lane.key);
    mitTitel(knopf, tr(`Frage aus dem Lane-Report, Lane-ID ${voll(lane.laneId) || 'fehlt'}`, `Question from the operator report, operator ID ${voll(lane.laneId) || 'not recorded'}`));
    datumLinks(z, { iso: st?.datum, title: st ? 'Lane-Report vom ' + L.alterLang(st.datum, heute) + (st.zeit ? ', ' + st.zeit : '') : '' });
    const task = (lane.auftraege || []).find(item => item.kennung === question.kennung);
    z.querySelector(':scope > .etikett').append(el('br'), el('span', {}, A.discussion({ ...question,
      id: 'lane-' + lane.key, frage: question.text, entryIssue: lane.entryIssue }, { ziel: 'lane', task, incipit: false })));
    return z;
  }

  // Canonical questions of an entry, oldest first.
  const nachAlter = (e) => [...L.points(e)].sort((a, b) => (a.seit || '9999').localeCompare(b.seit || '9999'));
  const offeneFragen = (e) => {
    const ids = new Set(L.offenePunkte(e, {}).map((p) => p.id));
    return nachAlter(e).filter((p) => ids.has(p.id));
  };

  function duTeile(e) {
    const erste = offeneFragen(e)[0];
    const quelle = erste?.frage || L.assignmentWaits(e.id)[0]?.wait.contribution || '';
    const label = L.questionLabel(quelle);
    const seit = /^\d{4}-\d{2}-\d{2}/.test(erste?.seit || '') ? erste.seit.slice(0, 10) : '';
    return {
      label, labelFull: label !== voll(erste?.frage).replace(/[.,;:]$/, '') ? voll(erste?.frage) : '',
      datum: { iso: seit, klasse: 'dich', title: tr(`älteste Frage offen seit ${seit ? L.alterLang(seit, heute) : 'unbekannt'}, ACTIVE-WORK`, `Oldest question open since ${seit ? L.alterLang(seit, heute) : 'unknown'}, ACTIVE-WORK`) },
    };
  }

  // Waiting reason: a title that only heads a list ("Von X stehen aus:")
  // says nothing in a few words, so its first point stands in.
  function wartegrund(e) {
    const blocked = L.assignmentBlocks(e.id);
    if (blocked.length) return {
      quelle: tr('Auftrag blockiert: ', 'Assignment blocked: ') + `${blocked[0].auftrag}. ${blocked[0].wait?.reason || tr('Wartegrund nicht zugeordnet.', "Waiting reason not associated.")}`,
      punkte: blocked.map((a) => tr('Auftrag blockiert: ', 'Assignment blocked: ') + `${a.auftrag}. ${a.wait?.reason || tr('Wartegrund nicht zugeordnet.', "Waiting reason not associated.")}`),
      blocked: true,
    };
    const titel = voll(e.wartetAufTitel || '');
    const punkte = (e.wartetAufPunkte || []).map(voll).filter(Boolean);
    if (titel && !(/:\s*$/.test(titel) && punkte.length)) return { quelle: titel, punkte };
    if (punkte.length) return { quelle: punkte[0], punkte, kopf: titel };
    const zeilen = voll(e.wartetAuf || '');
    if (zeilen) return { quelle: zeilen, punkte: [] };
    return { quelle: e.status === 'angebot-gelegt' ? tr('Angebot gelegt, Antwort steht aus', 'Offer made; awaiting response') : tr('Antwort Dritter steht aus', "Awaiting a response from others"), punkte: [] };
  }

  const wartetSeit = (e) => (/^\d{4}-\d{2}-\d{2}/.test(e.updated || '') ? e.updated.slice(0, 10) : '');

  function dritteTeile(e) {
    const w = wartegrund(e);
    const seit = wartetSeit(e);
    const tage = seit ? L.ageDays(seit, heute) : null;
    return {
      ...(w.blocked ? { label: L.questionLabel(w.quelle), labelFull: w.quelle } : kurz(w.quelle, 6)),
      datum: {
        iso: seit, klasse: tage !== null && tage >= L.SCHWELLEN.warten ? 'lange' : '',
        title: seit ? tr(`wartet seit ${L.alterLang(seit, heute)}, letzte Änderung in ACTIVE-WORK`, `Waiting since ${L.alterLang(seit, heute)}, last change in ACTIVE-WORK`) : '',
      },
    };
  }

  // The label of a free entry is its first step, or its stand when it has none.
  function niemandTeile(e) {
    const schritt = voll((e.schritte || [])[0] || '');
    const quelle = schritt || voll(e.stand || '');
    const teile = quelle ? kurz(quelle, 9) : { label: '', labelFull: '' };
    const iso = L.nextDate(e, heute);
    if (!iso) return { ...teile, datum: { iso: '' } };
    const label = ohneDatum(teile.label, iso);
    const termin = L.allDates(e).find((t) => t.datum === iso);
    const konflikt = konfliktTage.some((k) => k.datum === iso && k.handelnd.id === e.id);
    return {
      label, labelFull: teile.labelFull || (label !== teile.label ? quelle : ''),
      datum: { iso, klasse: konflikt ? 'konflikt' : 'termin', title: `nächster Termin am ${L.fmtLang(iso)}${termin?.text ? `: ${voll(termin.text)}` : ''}, ACTIVE-WORK` },
    };
  }

  function eintragZeile(e, block, teile) {
    // A leading note date ("2026-04-13 UFL …") says nothing in the row; the full name stays in the title.
    const anzeige = L.nameOhneDatum(e.name);
    const schluessel = `${block}:${e.id}`;
    const trigger = 'open-who-project-' + block + '-' + e.id;
    const hasQuestions = block === 'du' && offeneFragen(e).length > 0;
    const z = Z.create({
      entry: e, name: anzeige, label: hasQuestions ? '' : teile.label, labelFull: hasQuestions ? '' : teile.labelFull, second: konfliktMarken(e.id),
      ...(e.status !== 'abgeschlossen' ? { href: window.LEITSTAND_ERGEBNISSE.projectHref(e.id, window.LEITSTAND_ERGEBNISSE.originAddress(trigger)) } : {}),
    });
    z.dataset.schluessel = schluessel;
    const projectLink = z.querySelector(':scope > .name > a');
    if (projectLink && e.status !== 'abgeschlossen') { projectLink.id = trigger; projectLink.setAttribute('data-return-origin', ''); }
    datumLinks(z, teile.datum);
    konfliktZeile(z, e.id, teile.datum.iso);
    if (block === 'du') for (const point of offeneFragen(e)) {
      z.querySelector(':scope > .etikett').append(el('br'), el('span', {},
        A.discussion(point, { ziel: 'punkt' }), ' ', el('a', {
          href: 'fragen.html?' + new URLSearchParams({ vorhaben: e.id, punkt: point.id }), text: tr('Frage und Quelle', "Question and source"),
        })));
    }
    return z;
  }

  function kopf(id, titel, n) {
    const h = document.getElementById(id);
    h.replaceChildren(titel);
    if (n !== null) h.append(' ', mitTitel(el('span', { class: 'n', text: String(n) }), tr(`${n} in diesem Block`, `${n} in this group`)));
  }

  function fuelle(key, titel, zeilen, zaehlen) {
    document.getElementById(`liste-${key}`).replaceChildren(...zeilen);
    document.getElementById(`block-${key}`).hidden = zeilen.length === 0;
    kopf(`titel-${key}`, titel, zaehlen ? zeilen.length : null);
  }

  const rang = (lane) => L.laneRang(lane.key);
  const nachDatum = (a, b) => (a.iso || '9999').localeCompare(b.iso || '9999') || a.name.localeCompare(b.name, 'de');

  function render() {
    const chatKey = document.activeElement?.dataset.chatKey;
    const fokus = document.activeElement?.closest?.('.zeile')?.dataset.schluessel;
    const { du, dritte, niemand, eigeneZeile } = bloecke();
    const lanes = [...L.lanes].filter(laneSichtbar).sort((a, b) => rang(a) - rang(b) || a.name.localeCompare(b.name, 'de'));
    fuelle('instanzen', tr('Operatoren', "Operators"), lanes.map((l) => laneZeile(l, eigeneZeile)), true);

    // Oldest open question first, entries and lane questions alike. The
    // header counts the waiting entries, so this block head carries no number.
    const duListe = [
      ...du.filter(S.visible).map((e) => { const t = duTeile(e); return { iso: t.datum.iso, name: e.name, zeile: () => eintragZeile(e, 'du', t) }; }),
      ...laneFragen().filter(lf => laneSichtbar(lf.lane))
        .map((lf) => ({ iso: lf.stand?.datum || '', name: lf.lane.name, zeile: () => laneFrageZeile(lf) })),
    ].sort(nachDatum);
    fuelle('du', tr('Du', "You"), duListe.map((r) => r.zeile()), false);

    // Longest waiting first; entries without a date at the end.
    const dritteListe = dritte.filter(S.visible).map((e) => { const t = dritteTeile(e); return { iso: t.datum.iso, name: e.name, e, t }; }).sort(nachDatum);
    fuelle('dritte', tr('Blockiert oder wartet', "Blocked or waiting"), dritteListe.map(({ e, t }) => eintragZeile(e, 'dritte', t)), true);

    // Next date first, as in the ready group of the Übersicht, then the name.
    const niemandListe = niemand.filter(S.visible).map((e) => { const t = niemandTeile(e); return { iso: t.datum.iso, name: e.name, e, t }; }).sort(nachDatum);
    fuelle('niemand', tr('Ohne erfasste Blockade', "No recorded blocker"), niemandListe.map(({ e, t }) => eintragZeile(e, 'niemand', t)), true);

    if (chatKey) document.querySelector('[data-chat-key="' + CSS.escape(chatKey) + '"]')?.focus({ preventScroll: true });
    else if (fokus && !document.activeElement?.closest?.('.zeile')) {
      document.querySelector(`.zeile[data-schluessel="${CSS.escape(fokus)}"] > .name > a`)?.focus();
    }
  }

  for (const event of ['mission-control-demo-antwort', 'mission-control-demo-uebertragung']) document.addEventListener(event, render);
  // mount() applies the stored theme at once and so renders the blocks.
  document.getElementById('liste-instanzen').before(el('p', { class: 'meta', text: tr('Erfasste Auftragsprojekte und Sitzungsangaben. Eine vermerkte Sitzung belegt keine laufende Ausführung.', "Recorded assignment projects and session information. A recorded session does not establish ongoing execution.") }));
  S.mount(document.getElementById('kopf'), { view: 'wer', onFilter: render, onBriefings: () => A.refreshWithDrafts(document.querySelector('main'), render) });
})();
