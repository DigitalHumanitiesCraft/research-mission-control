// Project selection is URL-owned. The board is a projection of canonical
// sources; conversation preparation never changes those sources.
(function () {
  'use strict';
  const tr = (de, en) => typeof window !== 'undefined' && window.UI_LANGUAGE ? window.UI_LANGUAGE.t(de, en) : de;
  const L = window.LEITSTAND;
  const S = window.LEITSTAND_SHELL;
  const T = window.LEITSTAND_THEMEN;
  const I = window.LEITSTAND_ICONS;
  const LM = window.LEITSTAND_LAGE;
  const A = window.LEITSTAND_ANTWORTEN;
  const E = window.LEITSTAND_ERGEBNISSE;
  if (!L || !S || !T || !I || !LM || !A || !E) throw new Error('Lage dependencies are missing');
  const P = window.PROJEKTE?.projekte ? window.PROJEKTE : null;
  const { el, mitTitel, sicherUrl, bezahltMarke } = S;
  const { rein } = L;

  // History restores the selected object after project reflow. A saved
  // document coordinate must not compete with that explicit focus target.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const heute = L.todayIso();
  const BASE = new URL('.', document.currentScript?.src || location.href);
  // Historical answers remain in their store. The visible board follows
  // current source questions until a canonical write-back changes them.

  let brett = LM.brett(L, T, P, {}, heute, window.KALENDER_GOOGLE);
  let kacheln = new Map();
  let boardReady = false;
  let auswahl = null;
  let operatorFilter = null;
  let focus = 'alle';
  let lastCategory;
  const focusWords = { alle: tr('Alle Projekte', "All projects"), beitrag: tr('Dein Beitrag', "Your contribution"), auftraege: tr('Offene Aufträge', "Open assignments"), termine: tr('Termine & Abhängigkeiten', "Dates and dependencies") };
  const currentPage = () => location.pathname.split('/').pop() || 'index.html';
  const returnAddress = id => {
    const params = new URLSearchParams(location.search);
    params.set('thema', S.filter() || '');
    return currentPage() + '?' + params + '#' + id;
  };

  const href = (seite, q) => { const u = new URL(seite, BASE); if (q) u.search = new URLSearchParams(q).toString(); return u.href; };
  const alleKacheln = () => [...brett.regionen.flatMap((r) => r.kacheln), ...brett.anbahnungen, ...brett.ruhend];
  const opKlasse = (key) => `op-${String(key).replace(/[^a-z0-9-]/gi, '')}`;
  const rollenName = key => {
    const name = L.laneName(key);
    const declared = L.lanes.find(lane => lane.key === key)?.rollentitel;
    return name && (typeof declared === 'string' && declared.trim() || name.toLowerCase() !== String(key).toLowerCase()) ? name : tr('Rollenbezeichnung fehlt', "Role title missing");
  };

  function beiDir() {
    for (const link of document.querySelectorAll('.overview-jumps a[data-focus]')) {
      const url = new URL(location.href);
      url.hash = '';
      if (link.dataset.focus === 'alle') url.searchParams.delete('fokus');
      else url.searchParams.set('fokus', link.dataset.focus);
      link.href = url.href;
      if (link.dataset.focus === 'alle') link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
  }

  function opZiel(a) {
    const k = kacheln.get(a.projekt);
    if (!k) return el('span', { class: 'ziel fehlt', text: tr('Projektzuordnung ungeklärt', "Project association unclear") });
    const b = el('button', { type: 'button', class: 'ziel' }, rein(k.name), bezahltMarke(k.entry || k.projekt));
    b.title = tr(`${k.name}, auf dem Brett wählen`, `Select ${k.name} on the board`);
    b.addEventListener('click', () => waehle(k.id, true));
    return b;
  }

  function laneZeile(a) {
    const li = el('li', { class: `lane ${a.aussage.klasse}`.trim() },
      el('a', { class: 'auftrag', href: href('operatoren.html', { operator: a.operator, auftrag: a.kennung }) + '#arbeit', text: rein(a.auftrag) }),
      el('span', { class: 'zeile2' }, mitTitel(el('span', { class: `az ${a.aussage.klasse}`.trim(), text: a.aussage.text }), a.aussage.title), opZiel(a)));
    return li;
  }

  function operator(op) {
    const kopf = el('button', { type: 'button', class: `op-kopf ${opKlasse(op.key)}`, 'aria-pressed': 'false' },
      I.harness(op.lane.harness, { decorative: true, title: false }), el('span', { class: 'key', text: rollenName(op.key) }));
    const kopfTitel = [op.harnessTitel ? `Harness: ${op.harnessTitel}` : '', op.rolle ? `Rolle: ${op.rolle}` : '', op.arbeitsweise ? `Arbeitsweise: ${op.arbeitsweise}` : '',
      tr('Hebt die Vorhaben dieses Operators auf dem Brett hervor', "Highlights this operator's projects on the board")].filter(Boolean).join('. ');
    mitTitel(kopf, kopfTitel);
    kopf.addEventListener('click', () => filtereOperator(operatorFilter === op.key ? null : op.key));
    const box = el('div', { class: 'op', 'data-operator': op.key }, kopf);
    box.addEventListener('mouseenter', () => hervor(op.key, true));
    box.addEventListener('mouseleave', () => hervor(op.key, false));
    const offen = op.lanen.filter(a => L.AUFTRAG_ZUSTAENDE.includes(a.zustand) && L.auftragOffen(a));
    const vorgelegt = op.ergebnisse;
    const unklar = op.lanen.filter(a => !L.AUFTRAG_ZUSTAENDE.includes(a.zustand));
    const session = String(op.lane.session || '').trim();
    const sessionText = !session ? tr('Sitzungsangabe fehlt', 'Session information missing')
      : /^(?:keine|none)\b/i.test(session) ? tr('Keine aktuelle Sitzung vermerkt', 'No current session recorded') : tr('Sitzung vermerkt', 'Session recorded');
    box.append(el('p', { class: 'op-source-state' },
      op.stand ? tr('Dateibericht ', 'File report ') + L.fmtLang(op.stand) + '. ' : '',
      mitTitel(el('span', { text: sessionText }), session || tr('Keine Sitzungsangabe in der Quelle.', 'No session information in the source.'))));
    box.append(el('p', { class: 'op-status', text: tr(`${offen.length} ${offen.length === 1 ? 'offener Auftrag' : 'offene Aufträge'}${vorgelegt.length ? `, ${vorgelegt.length} vorgelegt` : ''}${unklar.length ? `, ${unklar.length} mit ungeklärtem Zustand` : ''}`, `${offen.length} open ${offen.length === 1 ? 'assignment' : 'assignments'}${vorgelegt.length ? `, ${vorgelegt.length} presented` : ''}${unklar.length ? `, ${unklar.length} with unclear state` : ''}`) }));
    const projekte = [...new Map([...op.lanen, ...op.ergebnisse].map(a => [a.projekt || '', a])).values()];
    if (projekte.length) box.append(el('div', { class: 'op-projekte' }, ...projekte.map(opZiel)));
    if (op.lanen.length) box.append(el('details', { class: 'op-auftraege', id: 'op-assignments-' + op.key },
      el('summary', { text: tr('Aufträge und Quellen', "Assignments and sources") }),
      el('ul', { class: 'lanen', role: 'list' }, ...op.lanen.map(a => laneZeile({ ...a, operator: op.key })))));
    if (vorgelegt.length) box.append(el('a', { class: 'op-ergebnisse', href: href('operatoren.html', { operator: op.key }) + '#arbeit',
      text: `${vorgelegt.length} ${vorgelegt.length === 1 ? 'vorgelegtes Ergebnis' : 'vorgelegte Ergebnisse'}` }));
    if (op.braucht) box.append(el('p', { class: 'op-abhaengigkeit', text: `Wartet auf ${op.braucht.wer || 'externen Beitrag'}: ${rein(op.braucht.text)}` }));
    // A receipt gap describes communication, never a Human User task.
    const nachrichten = [...new Map(op.nachrichten.map((n, index) => [n.kennung ? [n.an, n.kennung].join(':') : 'unknown-' + index, n])).values()];
    if (nachrichten.length) {
      const empfaenger = new Map();
      for (const n of nachrichten) {
        if (!empfaenger.has(n.an)) empfaenger.set(n.an, []);
        empfaenger.get(n.an).push(n);
      }
      box.append(el('details', { class: 'kommunikation', id: 'op-communication-' + op.key, 'data-count': String(nachrichten.length) },
        el('summary', { text: `${nachrichten.length} ${nachrichten.length === 1 ? 'ausstehende Dateiquittung' : 'ausstehende Dateiquittungen'}` }),
        el('p', { text: tr('Keine Empfangsbestätigung in der Operator-Datei nachgewiesen.', "No receipt is evidenced in the operator file.") }),
        ...[...empfaenger].map(([key, ns]) => el('section', {},
          el('h3', { text: rollenName(key) }),
          el('ul', { role: 'list' }, ...ns.map(n => el('li', { 'data-kennung': n.kennung },
            el('code', { text: n.kennung || tr('Nachrichtenkennung fehlt', "Message identifier missing") }), ' ', el('span', { text: tr(`seit ${n.seit}. ${rein(n.text)}`, `Since ${n.seit}. ${rein(n.text)}`) }))))))));
    }
    box.append(el('a', { class: 'op-quelle', href: href('operatoren.html', { operator: op.key }) + '#arbeit', text: tr('Operator und Nachweise', "Operator and evidence") }));
    return box;
  }

  function roster() {
    document.querySelector('#operatoren .ops').replaceChildren(...brett.operatoren.map(operator));
  }

  // Units on a tile: one chip per operator standing on the project, the
  // number of its lanes there when more than one, and the lanes in the title.
  function einheiten(k) {
    const je = new Map();
    for (const u of k.einheiten) {
      if (!je.has(u.operator)) je.set(u.operator, []);
      je.get(u.operator).push(u);
    }
    if (!je.size) return null;
    const box = el('span', { class: 'einheiten' });
    for (const [key, us] of je) {
      const lane = L.lanes.find((l) => l.key === key);
      const chip = el('span', { class: `einheit ${opKlasse(key)}`, 'data-operator': key },
        I.harness(lane?.harness || key, { decorative: true, title: false }), el('span', { text: rollenName(key) }));
      mitTitel(chip, us.map((u) => `${u.auftrag}, ${u.aussage.text}`).join('. '));
      box.append(chip);
    }
    return box;
  }

  function kachel(k) {
    const b = el('button', { type: 'button', id: 'project-' + k.id, class: `kachel ${k.gruppe}`, 'data-id': k.id, 'aria-pressed': String(auswahl === k.id) });
    const name = el('span', { class: 'name' }, k.name, bezahltMarke(k.entry || k.projekt));
    if (k.gruppe === 'ruhend' && I.art(k)) name.prepend(I.art(k).svg);
    b.append(name);
    const zustand = k.zustand;
    const fuss = el('span', { class: 'fuss' }, mitTitel(el('span', { class: `zustand ${zustand.klasse}`.trim(), text: zustand.text }), zustand.title));
    if (k.rechts) fuss.append(mitTitel(el('span', { class: `rechts ${k.rechts.klasse}`.trim(), text: k.rechts.text }), k.rechts.title));
    b.append(fuss);
    const facts = el('span', { class: 'card-features' });
    const badge = (kind, text) => facts.append(el('span', { class: 'card-feature' }, I.fact(kind), el('span', { text })));
    const questions = k.questions?.length ?? k.fragen;
    if (questions) badge('question', tr(`${questions} ${questions === 1 ? 'Frage' : 'Fragen'}`, `${questions} ${questions === 1 ? 'question' : 'questions'}`));
    const results = k.einheiten.filter(u => u.art === 'ergebnis').length;
    if (results) badge('result', tr(`${results} ${results === 1 ? 'Ergebnis vorgelegt' : 'Ergebnisse vorgelegt'}`, `${results} ${results === 1 ? 'result presented' : 'results presented'}`));
    if (facts.childElementCount) b.append(facts);
    const units = einheiten(k);
    if (units) b.append(units);
    b.addEventListener('click', () => waehle(k.id, true));
    return b;
  }

  // Category regions retain their source membership as card widths reflow.
  function region(r, titel, key) {
    const id = `region-${String(key || titel).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const marke = key ? I.create(key, null, { decorative: true }) : null;
    const sec = el('section', { class: 'region', 'aria-labelledby': id, 'data-thema': r.thema ?? '' },
      el('h3', { id }, marke, el('span', { text: r.thema ? T.label?.(titel) || titel : titel })),
      el('div', { class: 'kacheln' }, ...r.kacheln.map(kachel)));
    sec.style.setProperty('--n', String(Math.max(r.kacheln.length, 1)));
    return sec;
  }

  function ruhend() {
    const box = document.querySelector('#brett .ruhend');
    box.replaceChildren();
    if (!brett.ruhend.length) return;
    box.append(el('h3', { text: tr('Ruhend und abgeschlossen', 'Dormant and completed') }),
      el('div', { class: 'kacheln', id: 'ruhend-kacheln' }, ...brett.ruhend.map(kachel)));
  }

  function brettZeichnen() {
    const regionen = brett.regionen.map((r) => region(r, r.thema, r.key));
    if (brett.anbahnungen.length) regionen.push(region({ kacheln: brett.anbahnungen, thema: null }, tr('Anbahnungen', 'Initiations'), null));
    document.querySelector('#brett .regionen').replaceChildren(...regionen);
    ruhend();
    filterAnwenden();
  }

  // Panel of the chosen project: stand, the units on it, its open
  // questions as the way to Fragen, next steps with deadlines, dates and
  // the links to Projekte, the vault and the repository.
  function abschnitt(titel, ...inhalt) {
    return inhalt.length ? [el('h3', { text: titel }), ...inhalt] : [];
  }

  let evidenceLoad;
  function projectEvidence(entry) {
    const node = el('details', { class: 'project-evidence', id: 'project-evidence-' + entry.id },
      el('summary', { text: tr('Quellenvergleich öffnen', 'Inspect source comparison') }));
    const status = el('p', { role: 'status' });
    node.append(status);
    node.addEventListener('toggle', async () => {
      if (!node.open || node.dataset.loading) return;
      node.dataset.loading = 'true';
      status.textContent = tr('Quellenvergleich wird gelesen.', 'Reading source comparison.');
      try {
        evidenceLoad ||= Promise.all([import('./data/frische-data.js'), import('./frische.js')]);
        await evidenceLoad;
        if (!node.isConnected) return;
        const evidence = window.LEITSTAND_FRISCHE.projectEvidence(entry);
        evidence.id = node.id;
        evidence.open = node.open;
        const focused = node.contains(document.activeElement);
        node.replaceWith(evidence);
        if (focused) evidence.querySelector('summary').focus({ preventScroll: true });
      } catch {
        if (!node.isConnected) return;
        status.replaceChildren(tr('Quellenvergleich nicht verfügbar. ', 'Source comparison unavailable. '),
          el('a', { href: window.SECOND_BRAIN_NAVIGATION.href('frische'), text: tr('Vollständigen Quellenvergleich öffnen', 'Open full source comparison') }));
      }
    });
    return node;
  }

  function panel() {
    const k = auswahl ? kacheln.get(auswahl) : null;
    const requested = new URLSearchParams(location.search).get('projekt');
    document.getElementById('auswahl').hidden = !k && !requested;
    document.getElementById('lage').dataset.selection = String(Boolean(k || requested));
    const titel = document.getElementById('auswahl-titel');
    const inhalt = document.querySelector('#auswahl .inhalt');
    if (!k) {
      titel.textContent = requested ? tr('Projekt nicht verfügbar', 'Project unavailable') : tr('Kein Vorhaben gewählt', 'No project selected');
      inhalt.replaceChildren(el('p', { class: 'leer', text: requested
        ? tr('Das angefragte Projekt ist in den geladenen Quellen nicht enthalten.', 'The requested project is absent from the loaded sources.')
        : tr('Eine Projektkarte öffnet hier ihren Kontext.', 'Select a project card to open its context here.') }));
      return;
    }
    titel.replaceChildren(k.name, ...[bezahltMarke(k.entry || k.projekt)].filter(Boolean));
    const e = k.entry;
    const p = k.projekt || P?.projekte.find(projekt => projekt.id === k.id);
    const zustand = k.zustand;
    const meta = el('p', { class: 'meta' }, el('span', { text: T.label?.(k.thema) || k.thema }), mitTitel(el('span', { class: `zustand ${zustand.klasse}`.trim(), text: zustand.text }), zustand.title));
    const upd = (e?.updated || p?.updated || '').slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(upd)) meta.append(mitTitel(el('span', { class: 'mono', text: tr(`geändert ${L.fmt(upd)}`, `Updated ${L.fmt(upd)}`) }), tr(`zuletzt geändert ${L.volldatum(upd)}`, `Last updated ${L.volldatum(upd)}`)));
    const teile = [meta];
    if (focus === 'beitrag' && LM.matchesFocus && !LM.matchesFocus(k, focus)) teile.push(el('p', { class: 'auswahl-hinweis', text: tr('Das gewählte Projekt liegt außerhalb dieses Arbeitsfokus. Sein vollständiger Kontext bleibt geöffnet.', "The selected project is outside this work focus. Its full context remains open.") }));
    if (S.filter() !== null && k.thema !== S.filter()) {
      const reset = el('button', { type: 'button', text: tr('Alle Kategorien anzeigen', 'Show all categories') });
      reset.addEventListener('click', () => S.waehlen(null));
      teile.push(el('p', { class: 'auswahl-hinweis' }, tr('Ausgewähltes Projekt außerhalb der Kategorie. ', "Selected project is outside the category. "), reset));
    }
    const links = el('p', { class: 'links' });
    if (p) links.append(el('a', { id: 'open-project-' + k.id, class: 'projekt-oeffnen', href: E.projectHref(k.id, returnAddress('open-project-' + k.id)), text: tr('Projektarbeitsraum öffnen', "Open project workspace") }));
    const vault = sicherUrl(e?.vaultUrl || p?.links?.vault);
    if (vault) links.append(el('a', { href: vault, text: tr('Vault-Quelle', "Vault source") }));
    for (const r of [...new Set((e?.repoUrls || p?.links?.repos || []).map(sicherUrl).filter(Boolean))]) {
      try {
        const repoName = new URL(r).pathname.split('/').filter(Boolean).slice(-1)[0] || tr('Repository', "Repository");
        links.append(el('a', { href: r, text: `Repository ${repoName}` }));
      } catch {
        links.append(el('span', { class: 'quellenfehler', text: tr('Repository-Adresse ungültig', "Invalid repository address") }));
      }
    }
    const ausserhalb = S.filter() !== null && k.thema !== S.filter();
    const zurKarte = el('button', { type: 'button', class: 'zur-karte', text: ausserhalb ? tr('Projektkarte in allen Kategorien anzeigen', 'Show project card across all categories') : tr('Zur Projektkarte', 'Back to project card') });
    zurKarte.addEventListener('click', () => {
      if (ausserhalb) S.waehlen(null);
      if (focus === 'beitrag' && LM.matchesFocus && !LM.matchesFocus(k, focus)) setFocus('alle', false);
      const tile = document.querySelector(`.kachel[data-id="${CSS.escape(k.id)}"]`);
      tile?.focus({ preventScroll: true });
      tile?.scrollIntoView({ block: 'center' });
    });
    links.append(zurKarte);
    const application = window.LEITSTAND_ZUGAENGE?.application(k.id);
    if (application) links.append(application);
    teile.push(links);
    if (e?.wartetAuf) {
      const title = rein(e.wartetAufTitel || '').replace(/:$/, '');
      const contributions = (e.wartetAufPunkte?.length ? e.wartetAufPunkte : [e.wartetAuf]).map(rein).filter(Boolean);
      teile.push(...abschnitt(tr('Ausstehender Beitrag', 'Awaiting contribution'),
        ...(title && !contributions.includes(title) ? [el('p', { class: 'meta', text: title })] : []),
        el('p', { text: contributions[0] || tr('Wartegrund nicht erfasst.', 'Waiting reason not recorded.') }),
        ...(contributions.length > 1 ? [el('details', { class: 'warte-beitraege', id: 'project-waits-' + k.id },
          el('summary', { text: tr('Weitere ausstehende Beiträge', 'Further pending contributions') }),
          el('ul', { role: 'list' }, ...contributions.slice(1).map(text => el('li', { text }))))] : [])));
    }
    const currentOwners = [...new Set(k.currentTeam.map(unit => unit.operator))];
    teile.push(el('p', { class: 'project-responsibility' },
      currentOwners.length ? tr('Aktueller Auftrag bei ', 'Current assignment with ') : tr('Kein aktueller Operatorauftrag erfasst.', 'No current operator assignment recorded.'),
      ...currentOwners.flatMap((key, index) => [index ? ', ' : '', el('a', { href: href('operatoren.html', { operator: key }) + '#arbeit', text: rollenName(key) })]),
      ' ', el('a', { href: window.SECOND_BRAIN_NAVIGATION.href('wer'), text: tr('Zuständigkeiten vergleichen', 'Compare responsibilities') })));
    const stand = rein(e?.stand || p?.stand || '');
    const ziel = rein(p?.ziel || '');
    if (ziel) teile.push(...abschnitt(tr('Ziel', "Goal"), el('p', { text: ziel })));
    else if (stand) teile.push(...abschnitt(tr('Stand', "Status"), el('p', { text: stand })));
    if (e) {
      const offen = L.offenePunkte(e, {}, heute);
      if (offen.length) teile.push(...abschnitt(tr('Fragen', 'Questions'),
        el('a', { class: 'alle-fragen', href: href('fragen.html', { vorhaben: e.id }), text: tr(`${offen.length} offene ${offen.length === 1 ? 'Frage' : 'Fragen'} öffnen`, `Open ${offen.length} ${offen.length === 1 ? 'question' : 'questions'}`) }),
        ...offen.map(point => questionRow({ punkt: point, entry: e }))));
      for (const question of (k.questions || []).filter(item => item.quelle === 'lane')) teile.push(questionRow(question));
    }
    if (k.einheiten.length) {
      const aktuelleAuftraege = k.einheiten.filter(u => u.art === 'auftrag');
      if (aktuelleAuftraege.length) teile.push(...abschnitt(tr('Aufträge und Auftragsstand', "Assignments and assignment state"), ...aktuelleAuftraege.map(workRow)));
      const ergebnisse = k.einheiten.filter(u => u.art === 'ergebnis');
      if (ergebnisse.length) teile.push(...abschnitt(tr('Vorgelegte Ergebnisse', 'Submitted outputs'),
        el('ul', { class: 'ohne ergebnisse', role: 'list' }, ...ergebnisse.map(u => el('li', {}, resultRow(u))))));

    }
    const conversation = A.projectDiscussion(k.id);
    if (conversation) teile.push(...abschnitt(tr('Projektgespräch', "Project discussion"), conversation));
    const detail = [];
    if (ziel && stand && ziel !== stand) detail.push(...abschnitt(tr('Stand', "Status"), el('p', { text: stand })));
    if (e) {

      const schritte = (e.schritte || []).map((s, i) => ({ s, frist: e.schrittFristen?.[i] || '' })).filter((x) => x.s);
      if (schritte.length) {
        detail.push(...abschnitt(tr('Nächste Schritte', "Next steps"), el('ol', {}, ...schritte.map((x) => el('li', { title: rein(x.s) },
          el('span', { text: rein(x.s) }), x.frist ? mitTitel(el('span', { class: `mono frist${x.frist < heute ? ' dich' : ''}`, text: ` bis ${L.fmt(x.frist)}` }), `Frist ${L.volldatum(x.frist)}`) : null)))));
      }
      const termine = L.allDates(e).filter((t) => t.datum >= heute);
      if (termine.length) {
        detail.push(...abschnitt(tr('Termine', "Appointments"), el('ul', { class: 'ohne', role: 'list' }, ...termine.map((t) => {
          const post = L.tagesPosten(t.datum).find(item => item.e.id === e.id && L.voll(item.text) === L.voll(t.text));
          const time = post ? L.uhrzeit(post) : '';
          return el('li', {}, mitTitel(el('span', { class: 'mono', text: L.fmt(t.datum) + (time ? ', ' + time : '') }), L.volldatum(t.datum)),
            ' ', el('span', { text: rein(t.text) }), post?.kalender ? el('p', { class: 'meta', text: tr('Uhrzeit aus Google Calendar, ', "Time from Google Calendar, ") + post.kalender + tr('. Abgerufen ', ". Retrieved ") + (window.KALENDER_GOOGLE?.abgerufen || tr('Datum nicht erfasst', "Date not recorded")) + '.' }) : null);
        }))));
      }
    } else if (p) {
      const kurz = (p.kurz || []).map(rein).filter(Boolean)[0];
      if (kurz) teile.push(...abschnitt(tr('Worum', 'Context'), el('p', { text: kurz })));
      const offen = p.entscheidungen || [];
      if (offen.length) teile.push(...abschnitt(tr('Offene Punkte', "Open items"), el('ul', {}, ...offen.map((d) => el('li', { text: rein(d.frage || d.text || d) })))));
    }
    if (detail.length) teile.push(el('details', { class: 'projekt-kontext', id: 'project-context-' + k.id },
      el('summary', { text: tr('Stand, Schritte und Termine', 'Status, steps and appointments') }), ...detail));
    if (e) teile.push(projectEvidence(e));
    inhalt.replaceChildren(...teile);
  }

  function questionRow(item) {
    if (item.quelle === 'anbahnung') return el('article', { class: 'question-row' }, el('p', { text: item.text }), el('p', { class: 'meta', text: tr('Offener Punkt im Projektdokument.', 'Open item in the project document.') }));
    const point = item.punkt;
    const id = point?.id || 'lane-' + item.operator + (item.kennung ? '-' + item.kennung : '');
    return el('article', { class: 'question-row frage', 'data-punkt': id, 'data-point': id, id, tabindex: '-1' },
      A.discussion(point || { ...item, id: 'lane-' + item.operator, frage: item.text }, { ziel: point ? 'punkt' : 'lane', ...(point && item.auftrag ? { task: item.auftrag } : {}) }),
      el('a', { id: 'answer-' + id, href: href('fragen.html', { punkt: id }), text: tr('Frage und Quelle öffnen', "Open question and source") }));
  }
  function resultRow(unit) {
    const task = unit.task || unit;
    const id = L.abnahmeId(unit.operator, unit.kennung);
    const description = E.describe(task);
    const conversation = L.projectConversations(task.entryId || task.vorhaben).some(draft => draft.operator === unit.operator) ? null : A.discussion(task, { ziel: 'abnahme', task, actionPreview: true });
    const title = description.editorial ? description.title : rein(task.auftrag) || description.title;
    return el('article', { class: 'result-row', id, 'data-operator': unit.operator, 'data-kennung': unit.kennung, tabindex: '-1' },
      el('h4', {}, el('a', { class: 'ergebnis-link primary-action', id: 'review-' + id, href: E.reviewHref(task, '', returnAddress(id)), text: conversation ? tr('Ergebnis prüfen', 'Review result') : title, 'aria-label': conversation ? tr('Ergebnis prüfen: ', 'Review result: ') + title : null })),
      el('p', { class: 'az', text: rollenName(unit.operator) + (task.abnahmeart === 'Freigabe' ? tr(', technische Freigabe im Lab', ', technical approval in the Lab') : task.abnahmeart === 'unbekannt' ? tr(', Abnahmeart ungeklärt', ', acceptance type unclear') : tr(', inhaltlich beurteilen', ", assess content")) }),
      !task.pruefung ? el('p', { class: 'meta', text: tr('Berichtete Prüfung fehlt', "Reported verification missing") }) : null,
      conversation);
  }
  function workRow(unit) {
    const task = unit.task || unit;
    const lane = L.lanes.find(lane => lane.key === unit.operator);
    const context = lane ? L.auftragsKontext(lane, task) : {};
    const missing = task.wait?.reason || context.missing;
    return el('article', { class: 'work-row operator-work', 'data-operator': unit.operator, 'data-kennung': unit.kennung },
      el('p', { class: 'meta', text: rollenName(unit.operator) + ', ' + L.auftragWort(task.zustand) }),
      el('a', { id: 'work-' + unit.operator + '-' + unit.kennung, href: href('operatoren.html', { operator: unit.operator, auftrag: unit.kennung }) + '#arbeit', text: task.auftrag }),
      (context.next === 'Human User' || task.wait?.human || task.zustand === 'blockiert') && missing ? el('p', { class: 'work-wait', text: missing }) : null,
      task.vertragsfehler ? el('p', { class: 'quellenfehler', text: task.vertragsfehler }) : null);
  }

  function setFocus(value, push = true, moveFocus = true) {
    const url = new URL(location.href);
    if (value === 'alle') url.searchParams.delete('fokus');
    else url.searchParams.set('fokus', value);
    url.hash = '';
    history[push ? 'pushState' : 'replaceState'](history.state, '', url);
    focus = value;
    filterAnwenden(); beiDir(); panel(); globalWork();
    if (moveFocus) document.getElementById(value === 'termine' ? 'termine-titel' : 'brett-titel')?.focus({ preventScroll: true });
  }
  function waehle(id, push) {
    if (!kacheln.has(id)) return;
    auswahl = id;
    for (const b of document.querySelectorAll('.kachel')) b.setAttribute('aria-pressed', String(b.dataset.id === id));
    const url = new URL(location.href); url.searchParams.set('projekt', id);
    if (push) url.hash = '';
    history[push ? 'pushState' : 'replaceState']({ ...history.state, projekt: id }, '', url);
    panel();
    if (push) {
      document.getElementById('auswahl-titel').focus({ preventScroll: true });
      document.getElementById('auswahl').scrollIntoView({ block: 'start' });
    }
  }
  function filtereOperator(key) {
    operatorFilter = key;
    for (const b of document.querySelectorAll('.op-kopf')) b.setAttribute('aria-pressed', String(b.closest('.op').dataset.operator === key));
    filterAnwenden();
  }
  function hervor(key, an) {
    for (const b of document.querySelectorAll('.kachel')) b.classList.toggle('hervor', an && Boolean(b.querySelector(`.einheit[data-operator="${CSS.escape(key)}"]`)));
  }
  function filterAnwenden() {
    const theme = S.filter();
    document.getElementById('lage').dataset.focus = focus;
    let count = 0;
    for (const b of document.querySelectorAll('.kachel')) {
      const k = kacheln.get(b.dataset.id);
      b.hidden = (theme !== null && k?.thema !== theme) || (focus === 'beitrag' && LM.matchesFocus && !LM.matchesFocus(k, focus));
      if (!b.hidden) count++;
      b.classList.toggle('fremd', operatorFilter !== null && !k?.einheiten.some(u => u.operator === operatorFilter));
    }
    for (const region of document.querySelectorAll('.region')) region.hidden = ![...region.querySelectorAll('.kachel')].some(b => !b.hidden);
    document.querySelector('#brett .ruhend').hidden = ![...document.querySelectorAll('#brett .ruhend .kachel')].some(b => !b.hidden);
    document.getElementById('brett-titel').textContent = tr('Projekte', 'Projects');
    document.getElementById('contribution-required').checked = focus === 'beitrag';
    const collection = document.getElementById('focus-collection');
    const destination = focus === 'beitrag' ? 'fragen' : '';
    collection.hidden = !destination;
    collection.replaceChildren(...(destination ? [el('a', { href: window.SECOND_BRAIN_NAVIGATION.href(destination), text: destination === 'fragen'
      ? tr('Alle Fragen und optionalen Besprechungen', 'All questions and optional discussions')
      : tr('Zuständigkeiten und Wartegründe vergleichen', 'Compare responsibilities and waiting reasons') })] : []));

    document.getElementById('board-scope').textContent = count ? '' : tr('Kein Projekt im gewählten Arbeitsfokus und Thema. Ein bereits gewähltes Projekt bleibt rechts erreichbar.', "No project matches this work focus and category. A previously selected project remains available on the right.");
    if (focus === 'termine') document.getElementById('termine-abhaengigkeiten').open = true;
  }
  function addressTarget() {
    let id;
    try {
      const raw = location.hash.slice(1);
      id = decodeURIComponent(raw);
      const match = /^(?:toggle-)?appointment-(.+)-\d+$/.exec(raw);
      // Appointment DOM identities already contain an encoded source tuple.
      // Accept both the original fragment and an encoded copy of that ID.
      if (match) { try { JSON.parse(decodeURIComponent(match[1])); id = raw; } catch { /* The decoded candidate is checked below. */ } }
    } catch { return {}; }
    const pointId = id.startsWith('answer-') ? id.slice(7) : id;
    let appointmentProject = '';
    const appointment = /^(?:toggle-)?appointment-(.+)-\d+$/.exec(id);
    if (appointment) { try { appointmentProject = JSON.parse(decodeURIComponent(appointment[1]))[0]; } catch { /* An invalid fragment never establishes project identity. */ } }
    const rows = alleKacheln();
    const card = rows.find(k => id === 'open-project-' + k.id || id === 'project-' + k.id || appointmentProject === k.id || id.startsWith('date-' + k.id + '-') || id.startsWith('date-toggle-' + k.id + '-') || id === 'dependency-' + k.id || id === 'dependency-toggle-' + k.id
      || (k.entry?.posten || []).includes(pointId) || (k.questions || []).some(q => id === 'lane-' + q.operator + (q.kennung ? '-' + q.kennung : ''))
      || k.einheiten.some(u => id === 'work-' + u.operator + '-' + u.kennung || id === L.abnahmeId(u.operator, u.kennung) || id === 'review-' + L.abnahmeId(u.operator, u.kennung)));
    const sections = { 'gruppe-dich': 'beitrag', entscheidungen: 'beitrag', 'operatoren-titel': 'auftraege', 'operatoren-arbeit': 'auftraege',
      'termine-titel': 'termine', 'termine-abhaengigkeiten': 'termine', 'du-heute': 'termine', 'du-heute-titel': 'termine', abhaengigkeiten: 'termine', 'abhaengigkeiten-titel': 'termine', vorhaben: 'alle', 'vorhaben-titel': 'alle' };
    const kind = sections[id] || (/^project-/.test(id) ? 'alle' : /^(dependency-|date-|appointment-|toggle-appointment-)/.test(id) ? 'termine'
      : /^(?:op-|answer-|lane-|abnahme:|review-abnahme:)/.test(id) ? 'beitrag' : /^work-/.test(id) ? 'auftraege' : null);
    return { id, card, kind, section: Object.hasOwn(sections, id) };
  }
  function restoreAddress(moveFocus = false) {
    if (!boardReady) return;
    const params = new URLSearchParams(location.search);
    const themes = params.getAll('thema');
    const savedTheme = themes[0] || null;
    if (themes.length === 1 && (savedTheme === null || T.themen().includes(savedTheme)) && savedTheme !== S.filter()) {
      S.waehlen(savedTheme);
      return;
    }
    const values = params.getAll('fokus');
    focus = values.length === 1 && Object.hasOwn(focusWords, values[0]) ? values[0] : 'alle';
    const target = addressTarget();
    if (target.card && /^(?:project-|dependency-|date-|appointment-|toggle-appointment-)/.test(target.id) && S.filter() !== null && target.card.thema !== S.filter()) { S.waehlen(null); return; }
    if (target.kind && focus !== 'alle' && target.kind !== focus) {
      focus = target.kind;
      const url = new URL(location.href); if (focus === 'alle') url.searchParams.delete('fokus'); else url.searchParams.set('fokus', focus);
      history.replaceState(history.state, '', url);
    }
    const explicit = target.card?.id || params.get('projekt');
    auswahl = explicit && kacheln.has(explicit) ? explicit : null;
    if (auswahl && params.get('projekt') !== auswahl) {
      const url = new URL(location.href); url.searchParams.set('projekt', auswahl); history.replaceState({ ...history.state, projekt: auswahl }, '', url);
    }
    for (const button of document.querySelectorAll('.kachel')) button.setAttribute('aria-pressed', String(button.dataset.id === auswahl));
    filterAnwenden(); beiDir(); panel(); globalWork();
    const node = document.getElementById(target.id) || (target.section ? document.getElementById(target.kind === 'termine' ? 'termine-titel' : 'brett-titel') : null);
    if (node) {
      for (let parent = node.closest('details'); parent; parent = parent.parentElement?.closest('details')) parent.open = true;
      if (node.tagName === 'DETAILS') node.open = true;
      if (!node.matches('a, button, summary, input, textarea, select, [tabindex]')) node.tabIndex = -1;
      node.scrollIntoView({ block: 'start' }); node.focus?.({ preventScroll: true });
    } else if (moveFocus) {
      const stacked = getComputedStyle(document.getElementById('lage')).getPropertyValue('--panel-stacked').trim() === '1';
      const tile = document.querySelector(`.kachel[data-id="${CSS.escape(auswahl || '')}"]`);
      const focusTarget = stacked || !tile || tile.closest('[hidden]') ? document.getElementById('auswahl-titel') : tile;
      requestAnimationFrame(() => {
        if (!focusTarget?.isConnected) return;
        focusTarget.focus({ preventScroll: true });
        focusTarget.scrollIntoView({ block: 'nearest' });
      });
    }
  }
  function start() {
    kacheln = new Map(alleKacheln().map(k => [k.id, k]));
    roster(); brettZeichnen(); filtereOperator(operatorFilter);
    boardReady = true;
    restoreAddress();
  }
  function globalWork() {
    const box = document.getElementById('global-work');
    const unknown = brett.unassigned || {};
    const rows = [];
    rows.push(...(unknown.questions || []).map(questionRow), ...(unknown.pendingResults || []).filter(unit => focus !== 'beitrag' || unit.human).map(resultRow));
    if (focus !== 'beitrag') rows.push(...(unknown.currentTeam || []).map(workRow));
    box.replaceChildren(...(rows.length ? [el('h2', { text: tr('Projektzuordnung nicht bestätigt', "Project association unconfirmed") }), ...rows] : []));
    box.hidden = !rows.length;
    schedule();
  }
  function schedule() {
    const cards = alleKacheln();
    const visible = record => !record.entry || S.visible(record.entry);
    const until = L.plusTage(heute, 6);
    const dates = [...cards.flatMap(k => k.dates || []), ...(brett.unassigned?.dates || [])]
      .filter(row => visible(row) && (row.kind !== 'termin' || row.datum <= until && (!row.until || row.until >= heute)))
      .sort((a,b) => a.datum.localeCompare(b.datum) || (a.time || '').localeCompare(b.time || ''));
    const occurrences = new Map();
    const legacyOccurrences = new Map();
    const nodes = dates.map(item => {
      const appointment = item.kind === 'termin';
      const wording = appointment ? null : L.dringendWort(item, heute);
      const key = encodeURIComponent(JSON.stringify([item.entry?.id || '', item.datum, item.until || '', item.time || '', item.identityTitle || item.title, item.text]));
      const occurrence = occurrences.get(key) || 0; occurrences.set(key, occurrence + 1);
      const legacy = 'date-' + item.entry?.id + '-' + item.kind + '-' + item.datum;
      const legacyOccurrence = legacyOccurrences.get(legacy) || 0; legacyOccurrences.set(legacy, legacyOccurrence + 1);
      const id = appointment ? 'appointment-' + key + '-' + occurrence : legacy + (legacyOccurrence ? '-' + legacyOccurrence : '');
      const source = L.sourceReaderHref(item.entry?.notizPfad, item.entry?.id || '') || sicherUrl(item.entry?.vaultUrl);
      const title = item.title || item.text;
      return el('article', { class: 'date-row', 'data-date': item.datum, 'data-id': item.entry?.id || '', 'data-kind': item.kind },
        el('p', { class: item.ueberfaellig ? 'ueberfaellig' : 'meta' }, el('time', { datetime: item.datum, text: L.fmt(item.datum) + (item.until ? '–' + L.fmt(item.until) : '') }), item.time ? ', ' + item.time : ''),
        el('h4', {}, item.entry ? el('a', { href: href(currentPage(), { projekt: item.entry.id, fokus: 'termine' }), text: title }) : title),
        el('p', { class: 'meta', text: item.entry?.name || tr('Projektbezug nicht bestätigt', "Project association unconfirmed") }),
        el('details', { id }, el('summary', { id: appointment ? 'toggle-' + id : id.replace('date-', 'date-toggle-'), text: item.kind === 'konflikt' ? tr('Konflikt und Quelle lesen', 'Read conflict and source') : tr('Termin und Quelle lesen', "Read appointment and source") }),
          el('p', { text: appointment ? item.text : wording.voll }),
          el('p', { class: 'meta' }, item.source || 'ACTIVE-WORK', item.calendar ? ', ' + item.calendar : '', source ? el('a', { href: source, text: tr('Originalquelle öffnen', "Open original source") }) : null),
          item.borrowed ? el('p', { class: 'meta', text: tr('Uhrzeit aus Google Calendar, ', "Time from Google Calendar, ") + item.borrowed + tr('. Abgerufen ', ". Retrieved ") + (window.KALENDER_GOOGLE?.abgerufen || tr('Datum nicht erfasst', "Date not recorded")) + '.' }) : null));
    });
    document.querySelector('#du-heute .liste').replaceChildren(...(nodes.length ? nodes : [el('p', { text: tr('Keine Frist oder kein Termin im geladenen Zeitraum erfasst.', "No deadline or appointment is recorded in the loaded period.") })]));
    document.getElementById('termine-herkunft').textContent = window.KALENDER_GOOGLE?.abgerufen ? tr('Kalendersnapshot: ', "Calendar snapshot: ") + window.KALENDER_GOOGLE.abgerufen : tr('Kalendersnapshot nicht verfügbar.', "Calendar snapshot unavailable.");
    const dependencies = [...cards.flatMap(k => k.dependencies || []), ...(brett.unassigned?.dependencies || [])].filter(visible);
    document.querySelector('#abhaengigkeiten .liste').replaceChildren(...dependencies.map(item => {
      const id = item.id || item.entry?.id || (item.operator + '-' + item.kennung);
      const points = item.points || [item.text];
      return el('article', { class: 'dependency-row', 'data-id': item.id || '', id: 'dependency-' + id, tabindex: '-1' },
        el('h4', { id: 'dependency-toggle-' + id, tabindex: '-1', text: item.entry?.name || tr('Projektzuordnung nicht bestätigt', "Project association unconfirmed") }),
        item.title && !points.some(text => rein(text) === rein(item.title)) ? el('p', { class: 'meta', text: rein(item.title) }) : null,
        ...points.filter(Boolean).map(text => el('p', { text })),
        item.entry ? el('a', { href: href(currentPage(), { projekt: item.entry.id, fokus: 'termine' }), text: tr('Projektkontext öffnen', "Open project context") })
          : item.operator ? el('a', { href: href('operatoren.html', { operator: item.operator, auftrag: item.kennung }) + '#arbeit', text: tr('Auftrag und Quelle öffnen', "Open assignment and source") }) : null);
    }));
  }
  let rendered = false;
  function aktualisieren(briefingsChanged = false) {
    if (!briefingsChanged && rendered && lastCategory === S.filter()) { A.refreshDiscussions(); return; }
    lastCategory = S.filter(); rendered = true;
    const active = document.activeElement;
    const key = active?.closest('.chat-discussion')?.dataset.chatKey;
    const control = active?.dataset.chatControl;
    const open = [...document.querySelectorAll('#lage details[open][id]')].map(node => node.id);
    brett = LM.brett(L, T, P, {}, heute, window.KALENDER_GOOGLE);
    start();
    for (const id of open) { const node = document.getElementById(id); if (node?.tagName === 'DETAILS') node.open = true; }
    if (key && control) document.querySelector('#auswahl [data-chat-key="' + CSS.escape(key) + '"] [data-chat-control="' + CSS.escape(control) + '"]')?.focus({ preventScroll: true });
  }
  const oldNavigation = document.getElementById('bei-dir');
  const navigation = window.SECOND_BRAIN_NAVIGATION.overviewNavigation({
    current: focus,
    hrefForFocus: key => {
      const url = new URL(location.href);
      url.hash = '';
      if (key === 'alle') url.searchParams.delete('fokus');
      else url.searchParams.set('fokus', key);
      return url.href;
    },
  });
  navigation.id = 'bei-dir';
  navigation.classList.add('strip', 'overview-jumps');
  const focusIds = { alle: 'sprung-zu-allem', beitrag: 'sprung-zum-urteil', auftraege: 'sprung-zur-arbeit', termine: 'sprung-zu-terminen' };
  for (const link of navigation.querySelectorAll('a[data-subnav-key]')) {
    const key = link.dataset.subnavKey;
    if (!Object.hasOwn(focusIds, key)) continue;
    link.dataset.focus = key;
    link.id = focusIds[key];
  }
  oldNavigation.replaceWith(navigation);
  for (const link of document.querySelectorAll('.overview-jumps a[data-focus]')) link.addEventListener('click', event => {
    if (event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); setFocus(link.dataset.focus);
  });
  document.getElementById('contribution-required').addEventListener('change', event => setFocus(event.target.checked ? 'beitrag' : 'alle', true, false));
  for (const event of ['popstate', 'hashchange']) window.addEventListener(event, () => restoreAddress(true));
  window.addEventListener('load', () => requestAnimationFrame(() => { if (location.hash) restoreAddress(); }), { once: true });
  for (const event of ['mission-control-demo-antwort', 'mission-control-demo-uebertragung']) document.addEventListener(event, () => A.refreshDiscussions());
  S.mount(document.getElementById('kopf'), { view: 'uebersicht', onFilter: () => aktualisieren(), onBriefings: () => A.refreshWithDrafts(document.getElementById('lage'), () => aktualisieren(true)) });
})();
