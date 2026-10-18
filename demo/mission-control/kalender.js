// Kalender: what happens when, at one look (operator, 15 October 2026). It
// replaced Wochen and Strecke, and then its own Zeitachse and Agenda forms,
// whose strengths it took over:
// - six weeks as a large day grid, from the past week on, paged by four
//   weeks; every dated item of every visible entry stands in its day, with a
//   sign for its kind: appointment (●), step deadline (◇), milestone (▲),
//   finished work in a native daily disclosure; appointments of the operator's work calendars in
//   Synthetischer Beispielkalender (○) come from a local snapshot, and one that matches an
//   ACTIVE-WORK item on its day only lends that item its time; two fixed
//   appointments of a day, or two timed ones that overlap, are a conflict (!);
// - choosing an item selects only that exact calendar event;
// - choosing an event opens its date, time, wording and source beside the grid,
//   followed by the optional complete project context;
// - on a narrow screen the same days and items form a fully visible agenda.
// Reads window.LEITSTAND (model.js), LEITSTAND_SHELL, LEITSTAND_ZUGAENGE and
// KALENDER_GOOGLE (data/kalender-google-data.js, absent until a session
// fetched the calendars) and never mutates their data. All text goes in through textContent.
(function () {
  'use strict';
  const tr = (de, en) => typeof window !== 'undefined' && window.UI_LANGUAGE ? window.UI_LANGUAGE.t(de, en) : de;
  const L = window.LEITSTAND;
  const S = window.LEITSTAND_SHELL;
  const ZG = window.LEITSTAND_ZUGAENGE;
  if (!L || !S || !ZG) throw new Error('kalender.js needs model.js, shell.js and zugaenge.js loaded first');
  const { el, bezahltMarke } = S;

  // The form switch of the former Zeit view kept its choice here; the
  // leftover key is removed once.
  try { localStorage.removeItem('mission-control-zeit-ansicht'); } catch { /* storage blocked */ }

  const WOCHEN = 6;
  const BLAETTERN = 4;
  const WT_LANG = [tr('Sonntag', 'Sunday'), tr('Montag', 'Monday'), tr('Dienstag', 'Tuesday'), tr('Mittwoch', 'Wednesday'), tr('Donnerstag', 'Thursday'), tr('Freitag', 'Friday'), tr('Samstag', 'Saturday')];
  const WT_KURZ = [tr('So', 'Sun'), tr('Mo', 'Mon'), tr('Di', 'Tue'), tr('Mi', 'Wed'), tr('Do', 'Thu'), tr('Fr', 'Fri'), tr('Sa', 'Sat')];
  const G = window.KALENDER_GOOGLE?.termine ? window.KALENDER_GOOGLE : null;
  const ER = Array.isArray(window.ERLEDIGT?.lines) ? window.ERLEDIGT : null;
  const ARTEN = {
    termin: { zeichen: '●', wort: tr('Termin', 'Appointment'), titel: tr('Termin aus einem Schritt in ACTIVE-WORK', "Appointment from a step in ACTIVE-WORK") },
    ...(G ? { kalender: { zeichen: '○', wort: tr('Kalender', 'Calendar'),
      titel: tr(`Termin aus Synthetischer Beispielkalender (${G.kalender.filter(Boolean).join(', ')}), abgerufen ${G.abgerufen}`, `Appointment from Synthetischer Beispielkalender (${G.kalender.filter(Boolean).join(', ')}), retrieved ${G.abgerufen}`) } } : {}),
    frist: { zeichen: '◇', wort: tr('Frist', 'Deadline'), titel: tr('Frist eines Schritts, → bis in ACTIVE-WORK', "Step deadline from ACTIVE-WORK") },
    meilenstein: { zeichen: '▲', wort: tr('Meilenstein', "Milestone"), titel: tr('Meilenstein eines Vorhabens, Feld milestone', "Project milestone from the milestone field") },
    erledigt: { zeichen: '✓', wort: tr('Arbeitslog', "Work log"), titel: tr('Dokumentierte erledigte Arbeit aus dem Erledigt-Log, keine formale Abnahme', "Work documented as complete in the completion log; no formal acceptance") },
    konflikt: { zeichen: '!', wort: tr('Konflikt', 'Conflict'), titel: tr('Zwei feste Termine verschiedener Vorhaben am selben Tag oder zwei Termine, deren Zeiten sich überschneiden', "Two fixed appointments of different projects on one day, or two overlapping timed appointments") },
  };
  const RANG = { frist: 0, termin: 1, kalender: 1, meilenstein: 2, erledigt: 3 };
  // The colour of a calendar as in Synthetischer Beispielkalender, so its appointments are
  // told apart the same way; only a plain hex value reaches a style.
  const FARBEN = Object.fromEntries(Object.entries(G?.farben || {}).filter(([, f]) => /^#[0-9a-f]{6}$/i.test(f)));
  const farbStil = (kalender) => (FARBEN[kalender] ? `--kal-farbe: ${FARBEN[kalender]}` : '');
  const ISO = /^\d{4}-\d{2}-\d{2}$/;

  const heute = L.todayIso();
  let versatz = 0;
  let gewaehlt = null;
  const ereignisse = new Map();
  const offeneLogs = new Set();
  let ersterAufbau = true;
  // A rendered event keeps its exact trigger across redraw and Escape.
  let ausloeser = null;

  // ACTIVE-WORK text sometimes carries ISO dates and Markdown code marks;
  // dates are shown in German form and the backticks dropped, while the data
  // keeps both (L.datumImText).
  const anzeige = L.datumImText;

  // Entry names in the vault convention start with the creation date, which
  // reads as a past appointment in a calendar; the name shows without it.
  const nameVon = (e) => L.nameOhneDatum(e?.name) || e?.id || '';

  const wochentag = (iso) => new Date(iso + 'T00:00:00').getDay();
  const datumLang = (iso) => `${WT_LANG[wochentag(iso)]} ${L.fmtLang(iso)}`;

  function abstand(iso) {
    const n = -L.ageDays(iso, heute);
    if (n === 0) return tr('heute', 'today');
    if (n === 1) return tr('morgen', 'tomorrow');
    if (n < 0) return n === -1 ? tr('gestern', 'yesterday') : tr(`vor ${-n} Tagen`, `${-n} days ago`);
    return tr(`in ${n} Tagen`, `In ${n} days`);
  }

  function kw(iso) {
    const d = new Date(iso + 'T00:00:00');
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const jan4 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d - jan4) / 86400000 - 3 + ((jan4.getDay() + 6) % 7)) / 7);
  }

  // ISO day n days after an ISO day, in local date arithmetic (L.plusTage).
  const plus = L.plusTage;
  const montag = (iso) => plus(iso, -((wochentag(iso) + 6) % 7));

  function und(namen) {
    return namen.length < 2 ? namen.join('') : tr(`${namen.slice(0, -1).join(', ')} und ${namen[namen.length - 1]}`, `${namen.slice(0, -1).join(', ')} and ${namen[namen.length - 1]}`);
  }

  const quellenKey = (ziel) => String(ziel || '').normalize('NFC').replace(/\\/g, '/').replace(/\.md$/i, '').trim().toLowerCase();
  const projektQuellen = new Map();
  for (const e of L.aw.eintraege) {
    let ziel = '';
    try {
      const url = new URL(e.vaultUrl);
      if (url.protocol === 'obsidian:' && url.hostname === 'open') ziel = url.searchParams.get('file') || '';
    } catch { /* no recorded source identity */ }
    const key = quellenKey(ziel);
    if (!key) continue;
    if (!projektQuellen.has(key)) projektQuellen.set(key, []);
    projektQuellen.get(key).push(e);
  }

  // Every dated item of the visible entries, by day: appointments, step
  // deadlines and the milestone of open entries, the milestone only where no
  // appointment of the entry falls on the same day, and the finished lines.
  function posten() {
    const proTag = new Map();
    const dazu = (datum, p) => { if (!proTag.has(datum)) proTag.set(datum, []); proTag.get(datum).push(p); };
    for (const e of L.aw.eintraege) {
      const name = nameVon(e);
      if (e.status !== 'abgeschlossen') {
        const termine = new Set((e.termine || []).map((t) => t.datum));
        for (const [n, t] of (e.termine || []).entries()) dazu(t.datum, { key: `termin:${e.id}:${n}`, art: 'termin', e, name, datum: t.datum, text: t.text });
        const m = String(e.milestone || '');
        if (ISO.test(m.slice(0, 10)) && !termine.has(m.slice(0, 10))) {
          dazu(m.slice(0, 10), { key: `meilenstein:${e.id}`, art: 'meilenstein', e, name, datum: m.slice(0, 10), text: m.slice(10).trim() || tr('Meilenstein', "Milestone") });
        }
        (e.schrittFristen || []).forEach((f, n) => {
          if (ISO.test(f || '')) dazu(f, { key: `frist:${e.id}:${n}`, art: 'frist', e, name, datum: f, text: e.schritte?.[n] || '', ueberfaellig: f < heute });
        });
      }
    }
    // Read each original once. A shared name prefix cannot establish project identity.
    for (const [n, z] of (ER?.lines || []).entries()) {
      const matches = projektQuellen.get(quellenKey(z.ziel)) || [];
      const e = matches.length === 1 ? matches[0] : null;
      if (e && !S.visible(e)) continue;
      dazu(z.datum, { key: `log:${n}`, art: 'erledigt', e, name: z.projekt || z.ziel || 'Logeintrag ohne Titel',
        datum: z.datum, text: z.text, ziel: z.ziel,
        zuordnung: e ? '' : matches.length > 1
          ? 'Projektzuordnung mehrdeutig: ' + matches.map(nameVon).join(', ')
          : tr('Keine eindeutige Projektzuordnung', "No unambiguous project association") });
    }
    googleDazu(proTag, dazu);
    for (const [datum, ps] of proTag) {
      const sichtbar = ps.filter((p) => !p.e || S.visible(p.e));
      sichtbar.sort((a, b) => RANG[a.art] - RANG[b.art] || (a.von || '99').localeCompare(b.von || '99') || a.name.localeCompare(b.name, 'de'));
      proTag.set(datum, sichtbar);
    }
    return proTag;
  }

  // The snapshot's appointments. One of a single day that shares a word with
  // an ACTIVE-WORK item of that day is that item: the item takes its time
  // (L.leiheZeit, the rule conflicts() in model.js shares) and the
  // appointment is not drawn twice. Another one belongs to the entry its
  // title names (L.eintragZu), if any, and so opens it; one of no entry
  // shows only without a theme filter. An appointment over several days
  // becomes a bar.
  let balken = [];
  function googleDazu(proTag, dazu) {
    balken = [];
    if (!G) return;
    for (const [n, t] of G.termine.entries()) {
      // Match the full work day before filtering so a retained event keeps its time.
      if (!L.mehrtaegig(t) && L.leiheZeit(t, proTag.get(t.datum) || [])) continue;
      const e = L.eintragZu(t.titel, t.datum);
      if (e ? !S.visible(e) : S.filter() !== null) continue;
      if (L.mehrtaegig(t)) {
        balken.push({ t, e, key: `kalender:${n}` });
        continue;
      }
      dazu(t.datum, { key: `kalender:${n}`, art: 'kalender', e, name: t.titel, datum: t.datum, text: '', von: t.von, bis: t.bis, kalender: t.kalender });
    }
  }

  const uhrzeit = L.uhrzeit;

  // Pairs of a day from today on that collide: two fixed ACTIVE-WORK
  // appointments of different entries unless both carry times that do not
  // overlap (the rule of L.conflicts in model.js), and two timed items whose
  // times overlap, which L.conflicts does not count.
  function konfliktPaare(iso, ps) {
    if (iso < heute) return [];
    const wer = (p) => p.e?.id || `g:${p.name}`;
    const zeit = (p) => (p.von && p.bis ? [p.von, p.bis] : null);
    const kandidaten = ps.filter((p) => p.art === 'termin' || (p.art === 'kalender' && zeit(p)));
    const paare = [];
    kandidaten.forEach((a, i) => kandidaten.slice(i + 1).forEach((b) => {
      if (wer(a) === wer(b)) return;
      const [za, zb] = [zeit(a), zeit(b)];
      const trifft = za && zb ? L.ueberschneiden(a, b) : a.art === 'termin' && b.art === 'termin';
      if (trifft) paare.push([a, b]);
    }));
    return paare;
  }

  const imKonflikt = (paare) => new Set(paare.flat());
  const konfliktTitel = (iso, paare) => tr(`Terminkonflikt am ${datumLang(iso)}`, `Scheduling conflict on ${datumLang(iso)}`) + ', ' + [...imKonflikt(paare)].map((p) => `${p.name}${uhrzeit(p) ? ` ${uhrzeit(p)}` : ''}${p.text ? `: ${anzeige(p.text)}` : ''}`).join('; ');

  // Event identity controls selection; data-entry only relates items of a project.
  function knopf(titel, inhalt) {
    return el('button', { type: 'button', class: 'kal-knopf', title: titel }, ...inhalt);
  }

  function eintrag(p, rot) {
    const a = ARTEN[p.art];
    const wort = p.ueberfaellig ? 'Frist verstrichen' : a.wort;
    const zeit = uhrzeit(p);
    const inhalt = [
      el('span', { class: 'kal-zeichen', 'aria-hidden': 'true', text: a.zeichen }),
      el('span', { class: 'sr-only', text: `${wort}: ` }),
      el('span', { class: 'kal-name' }, zeit ? el('span', { class: 'kal-zeit', text: `${zeit} ` }) : null, p.name, p.e ? bezahltMarke(p.e) : null),
      // Full log lines are readable inside their daily disclosure.
      p.art === 'erledigt' && p.anzahl > 1 ? el('span', { class: 'kal-text', text: tr(`${p.anzahl} Logeinträge`, `${p.anzahl} log entries`) })
        : p.text && p.art !== 'erledigt' && p.art !== 'termin' ? el('span', { class: 'kal-text', text: anzeige(p.text) }) : null];
    const stil = farbStil(p.kalender);
    const klasse = `kal-posten ${p.art}${rot || p.ueberfaellig ? ' eng' : ''}${stil ? ' mit-farbe' : ''}`;
    const herkunft = p.kalender ? `, Synthetischer Beispielkalender ${p.kalender}` : '';
    const zeilen = p.zeilen ? el('ul', { class: 'kal-log-zeilen', role: 'list' },
      ...p.zeilen.map((zeile) => el('li', { text: anzeige(zeile.text) }))) : null;
    // Unresolved log subjects remain readable without inventing a project destination.
    if (!p.e && p.art === 'erledigt') {
      const quelle = L.sourceReaderHref(p.ziel);
      return el('li', { class: klasse, style: stil, title: `${wort}${herkunft}: ${p.name}${zeit ? `, ${zeit}` : ''}` },
        el('div', { class: 'kal-posten-kopf' }, ...inhalt),
        p.zuordnung ? el('p', { class: 'kal-log-zuordnung' }, p.zuordnung,
          quelle ? el('span', {}, ' ', el('a', { href: quelle, title: p.ziel, text: tr('Originalquelle öffnen', "Open original source") })) : null) : null,
        zeilen);
    }
    const titel = p.art === 'kalender'
      ? `${wort}${herkunft}: ${p.name}${zeit ? `, ${zeit}` : ''}${p.e ? `. Vorhaben ${nameVon(p.e)}` : ''}`
      : `${wort}: ${anzeige(p.e.name)}. ${anzeige(p.text)}${zeit ? ` ${zeit}${herkunft}` : ''}`;
    ereignisse.set(p.key, p);
    return el('li', { class: klasse, style: stil, 'data-entry': p.e?.id, 'data-event': p.key, 'data-datum': p.datum },
      knopf(titel, inhalt), zeilen);
  }

  function arbeitslog(iso, ps) {
    const zeilen = ps.filter((p) => p.art === 'erledigt');
    if (!zeilen.length) return null;
    const projekte = new Map();
    for (const p of zeilen) {
      const key = JSON.stringify([p.e?.id || '', p.name, p.ziel]);
      if (!projekte.has(key)) projekte.set(key, { ...p, key: `loggruppe:${iso}:${key}`, anzahl: 0, zeilen: [] });
      const gruppe = projekte.get(key);
      gruppe.anzahl += 1;
      gruppe.zeilen.push(p);
    }
    const anzahl = tr(`${zeilen.length} ${zeilen.length === 1 ? 'Eintrag' : 'Einträge'}`, `${zeilen.length} ${zeilen.length === 1 ? 'entry' : 'entries'}`);
    const logs = el('details', { class: 'kal-logs', 'data-datum': iso, open: offeneLogs.has(iso) },
      el('summary', { text: tr(`Arbeitslog: ${anzahl}`, `Work log: ${anzahl}`), 'aria-label': tr(`Arbeitslog am ${datumLang(iso)}: ${anzahl}`, `Work log on ${datumLang(iso)}: ${anzahl}`) }),
      el('p', { class: 'kal-log-herkunft', text: tr('Erledigt-Log. Keine formale Abnahme.', "Completion log. No formal acceptance.") }),
      el('ul', { role: 'list' }, ...[...projekte.values()].map((p) => eintrag(p, false))));
    return logs;
  }

  const bisText = (t) => tr(`${L.fmt(t.datum)}${t.von ? ` ${t.von}` : ''} bis ${L.fmt(t.bisDatum)}${t.bis ? ` ${t.bis}` : ''}`, `${L.fmt(t.datum)}${t.von ? ` ${t.von}` : ''} to ${L.fmt(t.bisDatum)}${t.bis ? ` ${t.bis}` : ''}`);

  // An appointment over several days as a bar across its days of one week,
  // in the colour of its calendar; every segment opens the original event.
  function balkenFuer({ t, e, key }, zeile, von, bis, woche) {
    const stil = [farbStil(t.kalender), `grid-row: ${zeile}`, `grid-column: ${2 + von} / ${3 + bis}`].filter(Boolean).join('; ');
    const titel = `Kalender, Synthetischer Beispielkalender ${t.kalender}: ${t.titel}, ${bisText(t)}${e ? `. Vorhaben ${nameVon(e)}` : ''}`;
    const inhalt = [el('span', { class: 'kal-zeichen', 'aria-hidden': 'true', text: '○' }),
      el('span', { class: 'kal-name' }, t.titel, el('span', { class: 'kal-zeit', text: ` ${bisText(t)}` })), e ? bezahltMarke(e) : null];
    const klasse = `kal-posten kalender kal-balken${farbStil(t.kalender) ? ' mit-farbe' : ''}${t.bisDatum < heute ? ' vorbei' : ''}`;
    const p = { ...t, e, art: 'kalender', name: t.titel, text: '', key: `${key}:${woche}` };
    ereignisse.set(p.key, p);
    return el('div', { class: klasse, style: stil, 'data-entry': e?.id, 'data-event': p.key, 'data-datum': t.datum }, knopf(titel, inhalt));
  }

  // Bars of a week, each on the first line free over its days.
  function wochenBalken(mo) {
    const so = plus(mo, 6);
    const index = (iso) => Math.round((new Date(iso + 'T00:00:00') - new Date(mo + 'T00:00:00')) / 86400000);
    const zeilen = [];
    const liste = balken.filter(({ t }) => t.datum <= so && t.bisDatum >= mo)
      .sort((a, b) => a.t.datum.localeCompare(b.t.datum) || b.t.bisDatum.localeCompare(a.t.bisDatum))
      .map((b) => {
        const von = Math.max(0, index(b.t.datum));
        const bis = Math.min(6, index(b.t.bisDatum));
        let z = zeilen.findIndex((ende) => ende < von);
        if (z < 0) { z = zeilen.length; zeilen.push(bis); } else zeilen[z] = bis;
        return { b, von, bis, z };
      });
    return { liste, zeilen: zeilen.length };
  }

  // Project context remains available after the selected event's own source material.
  function projektKontext(e, proTag, auswahl) {
    const meine = [...proTag.entries()].flatMap(([, ps]) => ps.filter((p) => p.e === e).map((p) => ({ p, ps })));
    const offen = meine.filter(({ p }) => p.art !== 'erledigt' && (p.datum >= heute || p.ueberfaellig || p.datum === auswahl.datum))
      .sort((a, b) => a.p.datum.localeCompare(b.p.datum) || RANG[a.p.art] - RANG[b.p.art]);
    const fertig = meine.filter(({ p }) => p.art === 'erledigt').sort((a, b) => b.p.datum.localeCompare(a.p.datum));
    const knapp = (klasse, text) => el('p', { class: klasse, title: anzeige(text), text: anzeige(text) });
    const lage = [e.stand ? knapp('kal-stand', e.stand) : null,
      e.wartetAuf ? knapp('kal-wartet', `Wartet auf: ${String(e.wartetAuf).replace(/:\s*$/, '')}`) : null].filter(Boolean);
    const zeile = (zeichen, iso, text, { rot = false, hinweis = '', titel = '' } = {}) => el('li', { class: rot ? 'eng' : '' },
      el('time', { class: 'kal-wann', datetime: iso, title: titel || `${datumLang(iso)}, ${abstand(iso)}` }, `${zeichen} ${WT_KURZ[wochentag(iso)]} ${L.fmt(iso)}`),
      el('span', { class: 'kal-zeile-text', title: anzeige(text) }, anzeige(text), hinweis ? el('span', { class: 'kal-hinweis', text: ` ${hinweis}` }) : null));

    const liste = el('ul', { class: 'kal-detail-liste', role: 'list' });
    for (const { p, ps } of offen) {
      const gegen = [...new Set(konfliktPaare(p.datum, ps).filter((paar) => paar.includes(p))
        .map(([a, b]) => (a === p ? b : a)).map((x) => (x.e ? nameVon(x.e) : x.name)))];
      const zeit = uhrzeit(p);
      liste.append(zeile(ARTEN[p.art].zeichen, p.datum, `${zeit ? `${zeit} ` : ''}${p.text || p.name}`, {
        rot: p.ueberfaellig || gegen.length > 0,
        hinweis: p.ueberfaellig ? tr('Frist verstrichen', 'Deadline passed') : gegen.length ? tr(`Konflikt mit ${und(gegen)}`, `Conflict with ${und(gegen)}`) : '',
        titel: `${ARTEN[p.art].wort} ${datumLang(p.datum)}, ${abstand(p.datum)}`,
      }));
    }
    (e.schritte || []).forEach((s, n) => {
      // A step with a deadline already stands above as ◇.
      if (ISO.test(e.schrittFristen?.[n] || '') || !String(s || '').trim()) return;
      liste.append(el('li', {},
        el('span', { class: 'kal-wann', title: tr('Schritt in ACTIVE-WORK', "Step in ACTIVE-WORK"), text: '→' }),
        el('span', { class: 'kal-zeile-text', title: anzeige(s) }, el('span', { class: 'sr-only', text: tr('Schritt in ACTIVE-WORK: ', "Step in ACTIVE-WORK: ") }), anzeige(s))));
    });
    const erledigt = el('ul', { class: 'kal-detail-liste', role: 'list' },
      ...fertig.map(({ p }) => zeile('✓', p.datum, p.text, { titel: `Erledigt ${datumLang(p.datum)}, Erledigt-Log` })));

    // The lane's name only: Mission Control does not know a lane's state, so
    // the operator dropped the state word on 15 October 2026.
    const lane = L.laneFor(e.id);
    const laneZeile = lane && lane.state !== 'IDLE' ? el('p', { class: 'kal-lane', text: `Lane ${lane.name}` }) : null;
    const zugaenge = ZG.create(e.id, e.vaultUrl);
    return el('details', { class: 'kal-projekt-kontext' },
      el('summary', { text: tr('Projektkontext: ', "Project context: ") + nameVon(e) }),
      ...lage,
      liste.children.length ? liste : el('p', { class: 'leer', text: tr('Keine Daten oder Schritte in ACTIVE-WORK', "No dates or steps in ACTIVE-WORK") }),
      fertig.length ? el('section', { class: 'kal-erledigt', 'aria-label': tr('Arbeitslog', "Work log") },
        el('h4', { text: tr('Arbeitslog', "Work log") }),
        el('p', { class: 'kal-log-herkunft', text: tr('Erledigt-Log. Keine formale Abnahme.', "Completion log. No formal acceptance.") }), erledigt) : null,
      laneZeile,
      zugaenge.childElementCount ? zugaenge : null);
  }

  function detail(p, proTag) {
    const schliessen = el('button', { type: 'button', class: 'kal-schliessen', 'aria-label': tr('Auswahl schließen', "Close selection"), title: tr('Schließen (Esc)', "Close (Esc)"), text: '×' });
    schliessen.addEventListener('click', () => waehle(null));
    const zeit = uhrzeit(p);
    const datum = p.bisDatum > p.datum ? bisText(p) : `${datumLang(p.datum)}. ${zeit || tr('Uhrzeit nicht erfasst', "Time not recorded")}`;
    const quelle = p.art === 'kalender' ? tr(`Quelle: Synthetischer Beispielkalender, ${p.kalender}. Abgerufen ${G.abgerufen}.`, `Source: Synthetischer Beispielkalender, ${p.kalender}. Retrieved ${G.abgerufen}.`)
      : p.art === 'erledigt' ? 'Quelle: Erledigt-Log. Keine formale Abnahme.' : tr('Quelle: ACTIVE-WORK.', "Source: ACTIVE-WORK.");
    const href = p.art === 'kalender' ? '' : L.sourceReaderHref(p.art === 'erledigt' ? p.ziel : 'ACTIVE-WORK', p.e?.id || '');
    const material = p.zeilen ? el('ul', { role: 'list' }, ...p.zeilen.map((z) => el('li', { text: anzeige(z.text) })))
      : p.text ? el('p', { class: 'kal-stand', text: anzeige(p.text) }) : null;
    return el('aside', { class: 'kal-detail', 'aria-label': tr(`Details zu ${p.name}`, `Details for ${p.name}`), 'data-event': p.key },
      el('div', { class: 'kal-detail-kopf' }, el('h3', {}, p.name, p.e ? bezahltMarke(p.e) : null), schliessen),
      el('section', { class: 'kal-ereignis', 'aria-label': ARTEN[p.art].wort },
        el('p', { class: 'kal-stand' }, el('time', { datetime: p.datum, text: datum })),
        material,
        el('p', { class: 'kal-log-herkunft' }, quelle, href ? el('span', {}, ' ', el('a', { href, text: tr('Originalquelle öffnen', "Open original source") })) : null),
        p.art !== 'kalender' && p.kalender ? el('p', { class: 'kal-log-herkunft', text: tr(`Uhrzeit aus Synthetischer Beispielkalender, ${p.kalender}. Abgerufen ${G.abgerufen}.`, `Time from Synthetischer Beispielkalender, ${p.kalender}. Retrieved ${G.abgerufen}.`) }) : null),
      p.e ? projektKontext(p.e, proTag, p) : el('p', { class: 'kal-log-herkunft', text: tr('Keine eindeutige Projektzuordnung.', "No unambiguous project association.") }));
  }

  function waehle(key) {
    gewaehlt = key;
    zeichnen();
    if (gewaehlt) {
      const box = document.querySelector('.kal-detail');
      box?.querySelector('.kal-schliessen')?.focus({ preventScroll: true });
      // A long detail must align its beginning, without a competing smooth scroll.
      box?.scrollIntoView({ block: 'start', behavior: 'auto' });
    } else if (ausloeser !== null) {
      [...document.querySelectorAll('.kal-raster .kal-knopf')]
        .find((k) => k.closest('.kal-posten').dataset.event === ausloeser)?.focus();
    }
  }

  // Lights up every item of the pointed entry, or clears the light.
  function leuchte(box, id) {
    for (const n of box.querySelectorAll('.kal-posten.verwandt')) n.classList.remove('verwandt');
    if (!id) return;
    for (const n of box.querySelectorAll(`.kal-posten[data-entry~="${CSS.escape(id)}"]`)) n.classList.add('verwandt');
  }

  function heuteZeigen(fokus = false) {
    const tag = document.querySelector('.kal-tag.heute');
    if (!tag) return;
    if (fokus) tag.focus({ preventScroll: true });
    if (window.matchMedia('(max-width: 48rem)').matches) tag.scrollIntoView({ block: 'start' });
  }

  function quellenstand(start, ende) {
    const abgerufen = String(G?.abgerufen || '');
    const tag = abgerufen.slice(0, 10);
    const hinweis = !G ? 'Google-Calendar-Snapshot nicht verfügbar.'
      : !ISO.test(tag) ? 'Abrufdatum des Google-Calendar-Snapshots nicht erfasst.'
        : tr('Synthetischer Beispielkalender. Stand ', 'Synthetischer Beispielkalender. Snapshot ' ) + anzeige(abgerufen) + '.' + (tag < heute ? tr(' Nicht von heute.', ' Not from today.') : '');
    let abdeckung = '';
    if (G) {
      if (!ISO.test(G.von || '') || !ISO.test(G.bis || '') || G.von > G.bis) {
        abdeckung = tr('Zeitraum des Google-Calendar-Snapshots nicht erfasst.', "Synthetischer Beispielkalender snapshot coverage not recorded.");
      } else if (ende < G.von || start > G.bis) {
        abdeckung = tr('Für diesen Zeitraum sind keine Beispielkalenderdaten erfasst.', "No Synthetischer Beispielkalender data is recorded for this period.");
      } else if (start < G.von || ende > G.bis) {
        abdeckung = tr('Synthetischer Beispielkalender ist für diesen Zeitraum nur teilweise erfasst.', "Synthetischer Beispielkalender is only partially recorded for this period.");
      }
      if (abdeckung && ISO.test(G.von || '') && ISO.test(G.bis || '') && G.von <= G.bis) {
        abdeckung += tr(' Erfasster Zeitraum ', ' Recorded period ') + L.fmtLang(G.von) + tr(' bis ', " to ") + L.fmtLang(G.bis) + '.';
      }
    }
    return el('div', { class: 'kal-quellenstand' },
      el('p', { class: 'kal-snapshot', role: 'status', text: hinweis }),
      abdeckung ? el('p', { class: 'kal-abdeckung', role: 'status', text: abdeckung }) : null);
  }

  function zeichnen() {
    const box = document.getElementById('kalender');
    // Read native state before replacement, including a toggle whose event is still queued.
    for (const logs of box.querySelectorAll('.kal-logs')) {
      if (logs.open) offeneLogs.add(logs.dataset.datum);
      else offeneLogs.delete(logs.dataset.datum);
    }
    ereignisse.clear();
    const proTag = posten();
    const start = plus(montag(heute), -7 + versatz * 7);
    const ende = plus(start, WOCHEN * 7 - 1);

    const blaettern = (schritt, text, titel) => {
      const b = el('button', { type: 'button', text, title: titel, 'aria-label': titel, 'data-kal-schritt': schritt });
      b.addEventListener('click', () => {
        versatz = schritt === 0 ? 0 : versatz + schritt;
        ausloeser = null;
        zeichnen();
        if (schritt === 0) heuteZeigen(true);
        else document.querySelector(`.kal-blaettern [data-kal-schritt="${schritt}"]`)?.focus({ preventScroll: true });
      });
      return b;
    };
    const kopf = el('div', { class: 'kal-kopf' },
      el('div', { class: 'kal-blaettern' },
        blaettern(-BLAETTERN, '←', tr(`${BLAETTERN} Wochen zurück`, `${BLAETTERN} weeks back`)), blaettern(0, tr('Heute', "Today"), tr('Zur aktuellen Woche', "Go to current week")), blaettern(BLAETTERN, '→', tr(`${BLAETTERN} Wochen vor`, `${BLAETTERN} weeks forward`))),
      el('h3', { text: tr(`${L.fmtLang(start)} bis ${L.fmtLang(ende)}`, `${L.fmtLang(start)} to ${L.fmtLang(ende)}`) }),
      quellenstand(start, ende),
      !ER ? el('p', { class: 'kal-log-herkunft', role: 'status', text: tr('Erledigt-Log nicht verfügbar', "Completion log unavailable") })
        : !ER.lines.length ? el('p', { class: 'kal-log-herkunft', text: tr('Keine Einträge im geladenen Erledigt-Log', "No entries in the loaded completion log") }) : null);

    const raster = el('div', { class: 'kal-raster', id: 'kal-raster' });
    raster.append(el('div', { class: 'kal-wt', style: 'grid-row: 1; grid-column: 1' }),
      ...[...WT_KURZ.slice(1), WT_KURZ[0]].map((w, i) => el('div', { class: 'kal-wt', style: `grid-row: 1; grid-column: ${2 + i}`, text: w })));
    // Rows are placed explicitly, so the bars of a week stand above its days.
    let reihe = 2;
    for (let w = 0; w < WOCHEN; w += 1) {
      const mo = plus(start, w * 7);
      const wb = wochenBalken(mo);
      const tagReihe = reihe + wb.zeilen;
      raster.append(el('div', { class: `kal-kw${plus(mo, 6) < heute ? ' vorbei' : ''}`, style: `grid-row: ${reihe} / ${tagReihe + 1}; grid-column: 1`, text: tr(`KW ${kw(mo)}`, `Week ${kw(mo)}`) }),
        ...wb.liste.map(({ b, von, bis, z }) => balkenFuer(b, reihe + z, von, bis, mo)));
      reihe = tagReihe + 1;
      for (let d = 0; d < 7; d += 1) {
        const iso = plus(mo, d);
        const ps = proTag.get(iso) || [];
        const paare = konfliktPaare(iso, ps);
        const konflikt = paare.length > 0;
        const rot = imKonflikt(paare);
        const klassen = ['kal-tag'];
        if (iso < heute) klassen.push('vorbei');
        if (iso === heute) klassen.push('heute');
        if (d >= 5) klassen.push('we');
        if (konflikt) klassen.push('eng');
        const tag = new Date(iso + 'T00:00:00').getDate();
        const liste = el('ul', { role: 'list' },
          ...ps.filter((p) => p.art !== 'erledigt').map((p) => eintrag(p, rot.has(p))));
        raster.append(el('div', { class: klassen.join(' '), style: `grid-row: ${tagReihe}; grid-column: ${2 + d}`, role: 'group', tabindex: iso === heute ? '-1' : null, 'aria-label': `${datumLang(iso)}${konflikt ? tr(', Konflikt', ', conflict') : ''}` },
          el('time', { class: 'kal-datum', datetime: iso, 'data-wt': iso === heute ? '' : `${WT_KURZ[wochentag(iso)]} ` },
            iso === heute ? tr(`Heute, ${WT_KURZ[wochentag(iso)]}. ${L.fmt(iso)}`, `Today, ${WT_KURZ[wochentag(iso)]} ${L.fmt(iso)}`)
              : tag === 1 || (w === 0 && d === 0) ? L.fmt(iso) : String(tag),
            konflikt ? el('span', { class: 'kal-konflikt', title: konfliktTitel(iso, paare), text: ' !' }) : null),
          liste, arbeitslog(iso, ps)));
      }
    }

    const auswahl = ereignisse.get(gewaehlt);
    if (!auswahl) gewaehlt = null;
    const haupt = el('div', { class: 'kal-haupt' }, raster);
    const flaeche = el('div', { class: `kal-flaeche${gewaehlt ? ' mit-auswahl' : ''}` },
      haupt,
      auswahl ? detail(auswahl, proTag) : null);
    box.replaceChildren(kopf, flaeche);

    raster.querySelectorAll('.kal-knopf').forEach((k) => {
      const posten = k.closest('.kal-posten');
      const key = posten.dataset.event;
      k.setAttribute('aria-pressed', String(key === gewaehlt));
      k.addEventListener('click', () => { ausloeser = key; waehle(key === gewaehlt ? null : key); });
      if (key === gewaehlt) posten.classList.add('gewaehlt');
    });
    if (ersterAufbau) {
      ersterAufbau = false;
      // The narrow agenda opens on today; earlier days remain in the same document.
      window.requestAnimationFrame(() => heuteZeigen());
    }
  }

  const box = document.getElementById('kalender');
  // One listener each for the whole calendar, as items are redrawn.
  const zeiger = (ev) => leuchte(box, ev.target.closest?.('.kal-posten')?.dataset.entry || null);
  box.addEventListener('pointerover', zeiger);
  box.addEventListener('focusin', zeiger);
  box.addEventListener('pointerleave', () => leuchte(box, null));
  box.addEventListener('focusout', (ev) => { if (!box.contains(ev.relatedTarget)) leuchte(box, null); });
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && gewaehlt) waehle(null); });

  function kalenderLegende() {
    const info = window.SECOND_BRAIN_NAVIGATION.information;
    const legend = el('div', { class: 'kal-legende' },
      el('div', { class: 'kal-legende-arten' }, ...Object.entries(ARTEN).map(([kind, item]) =>
        info(el('span', { class: 'mc-info-label kal-legende-art ' + kind },
          el('span', { class: 'kal-zeichen', 'aria-hidden': 'true', text: item.zeichen }), item.wort), item.titel))));
    if (Object.keys(FARBEN).length) legend.append(
      el('div', { class: 'kal-legende-gruppe' },
        el('p', { class: 'kal-legende-titel', text: tr('Beispielkalender', "Synthetischer Beispielkalender") }),
        el('div', { class: 'kal-legende-farben' }, ...Object.keys(FARBEN).map(key =>
          info(el('span', { class: 'kal-quelle', style: farbStil(key), text: key }), tr('Streifen an Terminen aus dem Beispielkalender ', "Stripe on appointments from Synthetischer Beispielkalender ") + key + '.')))));
    return legend;
  }

  // mount draws the calendar through onFilter.
  // A filter change moves the items, so a remembered position is dropped.
  S.mount(document.getElementById('kopf'), { view: 'kalender', legendContent: kalenderLegende(), onFilter: () => { ausloeser = null; zeichnen(); } });
})();
