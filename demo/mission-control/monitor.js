// Sicht "Monitor": does the research coordination understand the Human User,
// record his decisions with their provenance and carry them out? The header
// carries the finding's time and monitor's assessment band. The main column
// leads with the unchecked overall state, concrete corrections and decisions,
// then his judgement of complete original summaries. A native diagnostic
// disclosure retains the provenance map, case rows, three dimensions and
// the chosen case. The sidebar filters map and rows; new and incorrect
// remain independent states. His standing requirements stand in
// knowledge/design.md and bind every change here. An answer goes to monitor
// as a lane message through the existing answer endpoint, bound to the
// wording it judged; the page keeps his answer apart from its adoption, which
// only monitor's finding shows. Reads window.MONITOR (data/make_monitor.py over
// the section Monitor of lanes/monitor.md), writes text only through
// textContent, never mutates it.
(function () {
  'use strict';
  const tr = (de, en) => window.UI_LANGUAGE ? window.UI_LANGUAGE.t(de, en) : de;
  const display = value => {
    const labels = { 'erfüllt': 'met', teilweise: 'partly', verfehlt: 'missed', 'ungeprüft': 'unchecked', strittig: 'disputed', 'überholt': 'superseded', stimmt: 'correct', 'stimmt nicht': 'incorrect', offen: 'open', erledigt: 'done', belegt: 'evidenced', korrigiert: 'corrected', kaum: 'barely', 'zum Teil': 'partly', 'überwiegend': 'mostly', ja: 'yes' };
    return Object.hasOwn(labels, value) ? tr(value, labels[value]) : value;
  };
  const S = window.LEITSTAND_SHELL;
  if (!S) throw new Error('monitor.js needs model, themen and shell loaded first');
  const { el, sicherUrl } = S;
  const M = window.MONITOR || null;
  const ENDPUNKT = '/api/answers';

  // A dimension takes a share only from cases whose finding holds (belegt or
  // korrigiert) and that were checked. A partly met case counts half: it is
  // neither met nor missed, and leaving it out would hide it. With fewer than
  // three counted cases one case moves the share by more than a third, so
  // such a dimension shows its cases but no share. The overall value is the
  // weakest dimension, and only once all three have a share: a minimum over
  // two would measure documentation and call it understanding.
  const MINDESTENS = 3;
  const PUNKTE = { 'erfüllt': 1, teilweise: 0.5, verfehlt: 0 };
  const PARAPHRASE = { stimmt: 'erfüllt', teilweise: 'teilweise', 'stimmt nicht': 'verfehlt' };
  const DIMENSIONEN = [
    { key: 'verstehen', name: tr("Verstehen", "Understanding"), frage: tr("Gibt sie deine Absicht zutreffend wieder?", "Does the coordination represent your intention accurately?"), grundlage: tr("deine Urteile über ihre Zusammenfassungen", "your assessments of its summaries") },
    { key: 'festhalten', name: tr("Festhalten", "Recording"), frage: tr("Stehen deine Entscheidungen und Aussagen mit richtiger Herkunft in ihren Dateien?", "Are your decisions and statements recorded with the correct provenance?"), grundlage: tr("Fälle aus ihren Dateien, gegen deine Originalnachrichten geprüft", "cases from its files checked against your original messages") },
    { key: 'umsetzen', name: tr("Umsetzen", "Implementation"), frage: tr("Entsprechen Arbeit und Ergebnisse deinen Entscheidungen?", "Do the work and results follow your decisions?"), grundlage: tr("Fälle aus Aufträgen, Commits und Ergebnissen", "cases from assignments, commits and results") },
  ];
  const BAENDER = [[40, 'kaum'], [60, 'zum Teil'], [80, 'überwiegend'], [100, 'ja']].map(([limit, label]) => [limit, display(label)]);
  // The segments of a dimension's bar, in reading order, each with its word.
  const SEGMENTE = [['erfüllt', 'erfüllt'], ['teilweise', 'teilweise'], ['verfehlt', 'verfehlt'], ['ungeprüft', 'ungeprüft'], ['strittig', 'strittig']].map(([key, label]) => [key, display(label)]);

  function zaehlen(faelle) {
    const z = { 'erfüllt': 0, teilweise: 0, verfehlt: 0, 'ungeprüft': 0, strittig: 0, 'überholt': 0 };
    for (const f of faelle) {
      if (f.status === 'strittig' || f.status === 'überholt') z[f.status] += 1;
      else z[f.ergebnis] += 1;
    }
    const n = z['erfüllt'] + z.teilweise + z.verfehlt;
    const summe = z['erfüllt'] * PUNKTE['erfüllt'] + z.teilweise * PUNKTE.teilweise;
    return { ...z, n, anteil: n >= MINDESTENS ? summe / n : null };
  }

  // Answers this browser sent, keyed by kind, short name and a revision of
  // the judged wording, so a changed wording asks again instead of reusing
  // an answer given to other words. A convenience only: the answer lives in
  // the inbox, and monitor's finding is what counts.
  function revision(text) {
    let h = 5381;
    for (const c of String(text)) h = ((h * 33) ^ c.codePointAt(0)) >>> 0;
    return h.toString(16);
  }
  const schluessel = (art, kurz, text) => `${art}:${kurz}:${revision(text)}`;
  const SPEICHER = 'mission-control-demo-monitor-antworten-2';
  let antworten = {};
  try { antworten = JSON.parse(localStorage.getItem(SPEICHER) || '{}') || {}; } catch { antworten = {}; }
  function speichern() {
    try { localStorage.setItem(SPEICHER, JSON.stringify(antworten)); } catch { /* the page works without it */ }
  }

  // Paraphrases become cases of Verstehen; an answer given here counts only
  // in the provisional reading, never in the finding's value.
  const alsFall = (p, urteil) => ({ dimension: 'verstehen', status: 'belegt', ergebnis: PARAPHRASE[urteil] || 'ungeprüft', art: 'aussage', kurz: p.kurz, text: p.text, beleg: '' });
  function bewertung(m, mitAntworten) {
    const verstehen = (m.paraphrasen || []).map((p) => alsFall(p, (mitAntworten && antworten[schluessel('paraphrase', p.kurz, p.text)]) || p.urteil));
    const faelle = { verstehen, festhalten: (m.faelle || []).filter((f) => f.dimension === 'festhalten'), umsetzen: (m.faelle || []).filter((f) => f.dimension === 'umsetzen') };
    const dims = DIMENSIONEN.map((d) => ({ ...d, faelle: faelle[d.key], ...zaehlen(faelle[d.key]) }));
    const fehlend = dims.filter((d) => d.anteil === null);
    const schwaechste = fehlend.length ? null : dims.reduce((a, b) => (b.anteil < a.anteil ? b : a));
    return { dims, fehlend, schwaechste, wert: schwaechste ? Math.round(schwaechste.anteil * 100) : null };
  }

  async function senden(notiz, wortlaut, rev) {
    try {
      const r = await fetch(ENDPUNKT, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ziel: 'lane', id: 'monitor', art: 'nachricht', notiz, wortlaut: String(wortlaut).slice(0, 4000), revision: rev }) });
      if (r.ok) return '';
      const json = await r.json().catch(() => null);
      return json?.error || tr(`Dienst antwortet ${r.status}`, `Service responded ${r.status}`);
    } catch (err) {
      return tr(`kein Dienst erreichbar (${err.message})`, `service unavailable (${err.message})`);
    }
  }
  const ansagen = (text) => { const s = document.getElementById('mo-status'); if (s) s.textContent = text; };
  let fokusNach = '';

  // One sign language for the whole page: tick, tilde, cross for met, partly
  // and missed, a dotted circle for unchecked, an exclamation for contested;
  // the accessible name and title always keep the word.
  const ZEICHEN = {
    stimmt: 'M5 12.5l4.5 4.5L19 7', teilweise: 'M4 13c2.5 -3 5 -3 8 0s5.5 3 8 0', 'stimmt nicht': 'M6 6l12 12M18 6L6 18',
    'ungeprüft': 'M12 4a8 8 0 1 0 0.01 0', strittig: 'M12 6v8M12 18v0.5',
    gesendet: 'M4 12l16 -7l-6 16l-3 -6z', kopieren: 'M9 9h10v11H9zM15 9V5a1 1 0 0 0 -1 -1H6a1 1 0 0 0 -1 1v10a1 1 0 0 0 1 1h3',
    info: 'M12 11v6M12 7.5v0.5',
    'h-gesagt': 'M4 5h16v10H10l-6 4z', 'h-auslegung': 'M4 20l4 -1l11 -11l-3 -3l-11 11zM14 7l3 3', 'h-übernahme': 'M3 12h11M10 7l5 5l-5 5M20 4v16',
  };
  const ERGEBNIS_ZEICHEN = { 'erfüllt': 'stimmt', teilweise: 'teilweise', verfehlt: 'stimmt nicht', 'ungeprüft': 'ungeprüft', strittig: 'strittig', 'überholt': 'ungeprüft' };
  function zeichen(wert) {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    for (const [k, v] of Object.entries({ viewBox: '0 0 24 24', width: '18', height: '18', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false' })) svg.setAttribute(k, v);
    const pfad = document.createElementNS(NS, 'path');
    pfad.setAttribute('d', ZEICHEN[wert]);
    if (wert === 'ungeprüft') pfad.setAttribute('stroke-dasharray', '2.5 3');
    svg.append(pfad);
    return svg;
  }
  const marke = (wert, wort) => el('span', { class: `mark ${wert.replace(' ', '-')}`, role: 'img', 'aria-label': display(wort), title: display(wort) }, zeichen(wert));

  function kopierKnopf(text, hinweis, titel) {
    if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') return null;
    const knopf = el('button', { type: 'button', class: 'kopieren', 'aria-label': titel, title: `${titel}:\n${text.length > 200 ? `${text.slice(0, 200)} …` : text}` }, zeichen('kopieren'));
    knopf.addEventListener('click', () => {
      navigator.clipboard.writeText(text).then(
        () => {
          knopf.replaceChildren(zeichen('stimmt'));
          if (hinweis) hinweis.textContent = tr("kopiert", "copied");
          ansagen(tr("Kopiert, jetzt im Chat der Koordination einfügen", "Copied; paste into the coordination chat."));
          setTimeout(() => { knopf.replaceChildren(zeichen('kopieren')); if (hinweis) hinweis.textContent = ''; }, 2500);
        },
        () => { if (hinweis) hinweis.textContent = tr("Kopieren ging nicht", "Copy failed"); });
    });
    return knopf;
  }
  // A prompt as machine text in a dashed frame, the copy mark in its corner.
  function promptFeld(text, titel, fokusId) {
    const hinweis = el('span', { class: 'grau hinweis', 'aria-hidden': 'true' });
    const knopf = kopierKnopf(text, hinweis, titel);
    if (knopf && fokusId) knopf.dataset.fokus = fokusId;
    return el('div', { class: 'prompt' },
      el('div', { class: 'prompt-ecke' }, hinweis, knopf),
      el('pre', { class: 'prompt-text', text }));
  }
  const aufklapp = (titel, ...inhalt) => el('details', { class: 'aufklapp' }, el('summary', { text: titel }), ...inhalt);
  const feld = (titel, text, compact = false) => (text ? [el('dt', { text: titel }), compact && text.length > 160 ? el('dd', {}, el('details', {}, el('summary', { text: tr('Vollständigen Prüfbericht lesen', 'Read full verification statement') }), el('p', { text }))) : el('dd', { text })] : []);
  const chip = (text, art) => el('span', { class: `chip ${art}`, text: display(text) });
  // New or changed since monitor's previous finding; monitor sets and clears it.
  const neuChip = (f) => (f.neu ? el('span', { class: 'neu-punkt', role: 'img', 'aria-label': tr("neu seit dem letzten Befund", "new since the previous finding"), title: tr("neu seit dem letzten Befund", "new since the previous finding") }) : null);
  // An info mark that opens its explanation in place, reachable by keyboard and touch.
  const info = (titel, ...inhalt) => el('details', { class: 'info' },
    el('summary', { 'aria-label': titel, title: titel }, zeichen('info')), el('div', { class: 'info-text' }, ...inhalt));

  // Answer buttons for one item. After sending: what was sent, its consequence,
  // that adoption is still open, and a way back. A failed send keeps the
  // buttons and names the reason at the object.
  function antwort({ art, kurz, text, notiz, optionen, zeichenhaft }) {
    const key = schluessel(art, kurz, text);
    const gegeben = antworten[key];
    if (gegeben) {
      const folge = optionen.find((o) => o.wert === gegeben)?.folge;
      const zurueck = el('button', { type: 'button', class: 'aendern', title: tr("Antwort zurücknehmen und neu wählen", "Withdraw response and choose again") }, tr("zurücknehmen", "withdraw"));
      zurueck.addEventListener('click', async () => {
        const fehler = await senden(`Monitor, ${art} „${kurz}“: zurückgenommen`, text, revision(text));
        if (fehler) { zurueck.textContent = tr(`nicht zurückgenommen: ${fehler}`, `not withdrawn: ${fehler}`); return; }
        delete antworten[key];
        speichern();
        fokusNach = `frage-${key}`;
        zeichnen();
      });
      return el('div', { class: 'beantwortet' },
        el('p', {}, el('span', { class: 'gesendet' }, zeichen('gesendet'), el('span', { text: tr(` gesendet: ${gegeben}`, ` sent: ${display(gegeben)}`) })),
          folge ? el('span', { text: `, ${folge}` }) : null, ' ', zurueck),
        el('p', { class: 'grau', text: tr("Noch nicht übernommen; monitor prüft es beim nächsten Befund.", "Not adopted yet; monitor checks it in the next finding.") }));
    }
    const ort = el('div', { class: zeichenhaft ? 'urteile' : 'optionen', role: 'group', 'aria-label': tr(`Antwort zu ${kurz}`, `Response to ${kurz}`) });
    const fehlerOrt = el('p', { class: 'fehler', role: 'alert' });
    ort.append(...optionen.map((o, i) => {
      const wert = o.wert;
      const knopf = el('button', { type: 'button', class: zeichenhaft ? 'urteil zeichen' : 'option', 'aria-label': tr(`${wert}: ${kurz}`, `${display(wert)}: ${kurz}`), title: o.folge || display(wert),
        ...(i === 0 ? { 'data-fokus': `frage-${key}` } : {}) },
      zeichenhaft ? zeichen(wert) : display(wert));
      knopf.addEventListener('click', async () => {
        ort.querySelectorAll('button').forEach((b) => { b.disabled = true; });
        const fehler = await senden(notiz(wert), text, revision(text));
        if (fehler) {
          ort.querySelectorAll('button').forEach((b) => { b.disabled = false; });
          fehlerOrt.textContent = tr(`Nicht gesendet: ${fehler}. Bitte erneut wählen.`, `Not sent: ${fehler}. Please choose again.`);
          knopf.focus();
          return;
        }
        antworten[key] = wert;
        speichern();
        fokusNach = `antwort-${key}`;
        zeichnen();
        ansagen(tr(`${wert}, an monitor gesendet.`, `${display(wert)}, sent to monitor.`));
      });
      if (zeichenhaft) return knopf;
      return el('div', { class: 'option-zeile' }, knopf, el('span', { text: o.folge }));
    }));
    return el('div', {}, ort, fehlerOrt);
  }

  // Prompts his answers chose, in English, for the coordination's chat.
  const PROMPT_P = {
    stimmt: (p) => `In our chat you summarized what you know about me: „${p.text}“\nThat is right.`,
    teilweise: (p) => `In our chat you summarized what you know about me: „${p.text}“\nThat is only partly right. Ask me what is missing before you build on it.`,
    'stimmt nicht': (p) => `In our chat you summarized what you know about me: „${p.text}“\nThat is not what I want. Ask me before you build on it.`,
  };

  function korrekturKarte(k) {
    const offen = k.stand !== 'erledigt';
    return el('li', { class: 'karte-fall', 'data-kurz': k.kurz },
      el('div', { class: 'fall-kopf' }, el('h4', { text: k.kurz }),
        chip(k.stand, k.stand), neuChip(k),
        offen && k.prompt ? kopierKnopf(k.prompt, null, tr(`Prompt zu ${k.kurz} kopieren`, `Copy prompt for ${k.kurz}`)) : null),
      el('dl', { class: 'felder' }, ...feld(tr("Fehler", "Error"), k.fehler), ...feld(tr("Stelle", "Location"), k.stelle), ...feld(tr("Korrektur", "Correction"), k.korrektur)),
      k.beleg || k.prompt ? aufklapp(offen ? tr("Beleg und Prompt", "Evidence and prompt") : tr("Beleg", "Evidence"),
        k.beleg ? el('p', { class: 'beleg', text: k.beleg }) : null,
        offen && k.prompt ? promptFeld(k.prompt, tr(`Prompt zu ${k.kurz} kopieren`, `Copy prompt for ${k.kurz}`)) : null) : null);
  }

  function entscheidungKarte(e) {
    const text = `${e.frage} ${e.gegenstand}`;
    const key = schluessel('entscheidung', e.kurz, text);
    const gewaehlt = e.optionen.find((o) => o.wert === antworten[key]);
    return el('li', { class: 'karte-fall', 'data-kurz': e.kurz },
      el('div', { class: 'fall-kopf' }, el('h4', { text: e.frage }), neuChip(e)),
      el('p', { text: e.gegenstand }),
      el('div', { 'data-fokus-ort': `antwort-${key}` }, antwort({ art: 'entscheidung', kurz: e.kurz, text, optionen: e.optionen,
        notiz: (w) => `Monitor, Entscheidung „${e.kurz}“: ${w}. Frage: ${e.frage}` })),
      gewaehlt?.prompt ? promptFeld(gewaehlt.prompt, tr(`Prompt zu ${e.kurz} kopieren`, `Copy prompt for ${e.kurz}`), `antwort-${key}`) : null,
      e.beleg ? aufklapp(tr("Beleg", "Evidence"), el('p', { class: 'beleg', text: e.beleg })) : null);
  }

  function paraphraseZeile(p) {
    const key = schluessel('paraphrase', p.kurz, p.text);
    const gegeben = antworten[key];
    const bewertet = p.urteil !== 'offen';
    return el('li', { class: 'paraphrase' },
      el('div', {},
        el('p', { class: 'kurz' }, el('span', { text: p.kurz }), bewertet ? el('span', { class: 'grau', text: tr(`, im Befund: ${p.urteil}`, `, in the finding: ${display(p.urteil)}`) }) : null),
        el('blockquote', { text: p.text })),
      bewertet ? el('span', {}) : el('div', { class: gegeben ? 'antwort-ort voll' : 'antwort-ort', 'data-fokus-ort': `antwort-${key}` },
        antwort({ art: 'paraphrase', kurz: p.kurz, text: p.text, zeichenhaft: true,
          optionen: [{ wert: 'stimmt' }, { wert: 'teilweise' }, { wert: 'stimmt nicht' }],
          notiz: (w) => `Monitor, Paraphrase „${p.kurz}“: ${w}. Wortlaut: ${p.text}` }),
        gegeben ? aufklapp(tr("Prompt für die Koordination", "Prompt for coordination"), promptFeld(PROMPT_P[gegeben](p), tr(`Prompt zu ${p.kurz} kopieren`, `Copy prompt for ${p.kurz}`))) : null));
  }

  // A dimension: its name with an info mark, its share, and one bar whose
  // segments are its cases by result; the counted basis and finding date stay visible.
  function dimensionBlock(d, vorlaeufig) {
    const alle = SEGMENTE.reduce((s, [k]) => s + d[k], 0) || 1;
    const zaehlung = SEGMENTE.filter(([k]) => d[k]).map(([k, w]) => `${d[k]} ${w}`).concat(d['überholt'] ? [tr(`${d['überholt']} überholt`, `${d['überholt']} superseded`)] : []).join(', ');
    const balken = el('span', { class: 'segmente', role: 'img', 'aria-label': `${d.name}: ${zaehlung || tr("keine Fälle", "no cases")}` },
      ...SEGMENTE.filter(([k]) => d[k]).map(([k, w]) => {
        const s = el('span', { class: `segment ${k}`, title: `${d[k]} ${w}` });
        s.style.setProperty('--teil', String((d[k] / alle) * 100));
        return s;
      }));
    const zaehlt = (f) => f.status === 'belegt' || f.status === 'korrigiert';
    return el('li', { class: 'dimension', 'data-dim': d.key },
      el('div', { class: 'dim-kopf' },
        el('h4', {}, el('span', { text: d.name }),
          info(tr(`Was ${d.name} misst`, `What ${d.name} measures`), el('p', { text: d.frage }), el('p', { class: 'grau', text: tr(`Grundlage: ${d.grundlage}.`, `Basis: ${d.grundlage}.`) }), el('p', { class: 'grau', text: zaehlung || tr("Noch keine Fälle.", "No cases yet.") }))),
        el('span', { class: 'dim-wert', text: d.anteil === null ? display('ungeprüft') : String(Math.round(d.anteil * 100)) })),
      balken,
      el('p', { class: 'grau dim-basis', text: d.anteil === null
        ? tr(`${d.n} geprüfte Fälle; ein Anteil erst ab ${MINDESTENS}.`, `${d.n} checked cases; a share requires at least ${MINDESTENS}.`)
        : tr(`${d.n} geprüfte Fälle: 100 × (${d['erfüllt']} + 0,5 × ${d.teilweise}) / ${d.n} = ${Math.round(d.anteil * 100)}.`, `${d.n} checked cases: 100 × (${d['erfüllt']} + 0.5 × ${d.teilweise}) / ${d.n} = ${Math.round(d.anteil * 100)}.`) }),
      el('p', { class: 'grau dim-date', text: tr(`Befund: ${zeitText(M.stand)}`, `Finding: ${zeitText(M.stand)}`) }),
      d.key === 'verstehen'
        ? el('p', { class: 'grau' }, vorlaeufig && vorlaeufig.n !== d.n ? el('span', { text: tr('vorläufig ', 'provisional ') + (vorlaeufig.anteil === null ? vorlaeufig.n + tr(' beurteilt', ' assessed') : Math.round(vorlaeufig.anteil * 100)) + ' | ' }) : null,
          el('a', { href: '#mo-zusammenfassungen', text: d.n ? tr("weiter beurteilen", "continue assessment") : tr("jetzt beurteilen", "assess now") }))
        : d.key === 'festhalten'
          ? el('p', { class: 'grau' }, el('a', { href: '#mo-glauben', text: tr("zur Karte", "to the map") }))
          : aufklapp(tr("Fälle", "Cases"), el('ul', { role: 'list', class: 'fallliste' }, ...d.faelle.map((f) => el('li', {},
          marke(ERGEBNIS_ZEICHEN[zaehlt(f) ? f.ergebnis : f.status], zaehlt(f) ? f.ergebnis : f.status),
          el('div', {}, el('p', {}, el('span', { text: f.kurz }), f.neu ? ' ' : null, neuChip(f)), el('p', { class: 'grau', text: f.text }),
            f.beleg ? el('p', { class: 'beleg', text: tr(`Beleg: ${f.beleg}`, `Evidence: ${f.beleg}`) }) : null))))));
  }

  // What the coordination holds about him, as knowledge rather than a list:
  // a map of provenance (said by him, her reading, taken over) against how
  // it is recorded (right, partly, open, wrong), every Festhalten case one
  // dot; below it the cases as compact rows, new and deviating first, the
  // rest folded; the chosen case opens beside them. Filters in the sidebar
  // narrow map and rows together. Moot cases stay out of the map.
  const HERKUNFT = [
    { key: 'gesagt', wort: tr("von dir gesagt", "stated by you"), kurz: tr("gesagt", "said") },
    { key: 'auslegung', wort: tr("ihre Auslegung", "its interpretation"), kurz: tr("Auslegung", "Interpretation") },
    { key: 'übernahme', wort: tr("aus fremdem Entwurf übernommen", "adopted from another draft"), kurz: tr("Übernahme", "Adoption") },
  ];
  const ZEILEN = [
    { key: 'richtig', wort: tr("richtig festgehalten", "recorded correctly"), zeichen: 'stimmt' },
    { key: 'teilweise', wort: tr("teilweise", "partly"), zeichen: 'teilweise' },
    { key: 'offen', wort: tr("offen", "open"), zeichen: 'ungeprüft' },
    { key: 'falsch', wort: tr("falsch", "incorrect"), zeichen: 'stimmt nicht' },
  ];
  const zaehltFall = (f) => f.status === 'belegt' || f.status === 'korrigiert';
  function zeileVon(f) {
    if (f.status === 'strittig' || !zaehltFall(f)) return 'offen';
    return { 'erfüllt': 'richtig', teilweise: 'teilweise', verfehlt: 'falsch' }[f.ergebnis] || 'offen';
  }
  const herkunftVon = (f) => HERKUNFT.find((h) => h.key === f.herkunft) || null;
  const auffaellig = (f) => f.neu || zeileVon(f) !== 'richtig';
  const filter = { herkunft: new Set(), zeile: new Set(), neu: false };
  let gewaehlt = null;
  const passt = (f) => (!filter.herkunft.size || filter.herkunft.has(f.herkunft))
    && (!filter.zeile.size || filter.zeile.has(zeileVon(f))) && (!filter.neu || f.neu);

  const herkunftZeichen = (h) => (h ? el('span', { class: `herkunft ${h.key}`, role: 'img', 'aria-label': h.wort, title: h.wort }, zeichen(`h-${h.key}`)) : el('span', { class: 'herkunft leer', 'aria-hidden': 'true' }));
  const zeileZeichen = (f) => { const z = ZEILEN.find((x) => x.key === zeileVon(f)); return marke(z.zeichen, z.wort); };
  const neuPunkt = (f) => (f.neu ? el('span', { class: 'neu-punkt', role: 'img', 'aria-label': tr("neu seit dem letzten Befund", "new since the previous finding"), title: tr("neu seit dem letzten Befund", "new since the previous finding") }) : null);

  function waehle(f, fokus) {
    gewaehlt = f.kurz;
    zeichnen();
    if (fokus) document.getElementById('mo-detail-titel')?.focus();
  }

  function karte(faelle) {
    const tabelle = el('table', { class: 'wissenskarte' },
      el('caption', { class: 'sr-only', text: tr("Aussagen über dich nach Herkunft und danach, wie sie festgehalten sind", "Statements about you by provenance and recording accuracy") }),
      el('thead', {}, el('tr', {}, el('td', {}), ...HERKUNFT.map((h) => el('th', { scope: 'col', title: h.wort }, herkunftZeichen(h), el('span', { text: h.kurz }))))),
      el('tbody', {}, ...ZEILEN.map((z) => el('tr', { 'data-zeile': z.key },
        el('th', { scope: 'row' }, marke(z.zeichen, z.wort), el('span', { text: z.wort })),
        ...HERKUNFT.map((h) => el('td', {}, el('div', { class: 'punkte' },
          ...faelle.filter((f) => f.herkunft === h.key && zeileVon(f) === z.key).map((f) => {
            const knopf = el('button', { type: 'button', class: `punkt${passt(f) ? '' : ' blass'}${f.neu ? ' neu' : ''}${gewaehlt === f.kurz ? ' gewaehlt' : ''}`,
              'aria-label': `${f.kurz}: ${h.wort}, ${z.wort}${f.neu ? tr(', neu', ', new') : ''}`, title: f.kurz, 'aria-pressed': String(gewaehlt === f.kurz) });
            knopf.addEventListener('click', () => waehle(f, true));
            return knopf;
          }))))))));
    return el('div', { class: 'karte-rahmen' }, tabelle);
  }

  function aussageZeile(f) {
    const knopf = el('button', { type: 'button', class: `aussage${gewaehlt === f.kurz ? ' gewaehlt' : ''}`, 'aria-pressed': String(gewaehlt === f.kurz), 'data-kurz': f.kurz },
      el('span', { class: 'neu-ort' }, neuPunkt(f)), herkunftZeichen(herkunftVon(f)), zeileZeichen(f), el('span', { class: 'aussage-kurz', text: f.kurz }));
    knopf.addEventListener('click', () => waehle(f, true));
    return el('li', {}, knopf);
  }

  function glaubeBereich(alle) {
    const aktuell = alle.filter((f) => f.status !== 'überholt');
    const sichtbar = aktuell.filter(passt);
    const vorn = sichtbar.filter(auffaellig);
    const rest = sichtbar.filter((f) => !auffaellig(f));
    const ueberholt = alle.filter((f) => f.status === 'überholt' && passt(f));
    const abweichend = aktuell.filter((f) => zeileVon(f) === 'teilweise' || zeileVon(f) === 'falsch').length;
    return el('section', { class: 'bereich', 'data-art': 'glauben', 'aria-labelledby': 'mo-glauben' },
      el('h3', { id: 'mo-glauben', title: tr("Was in ihren Dateien über dich steht, gegen deine Originalnachrichten geprüft.", "What its files say about you, checked against your original messages.") },
        el('span', { text: tr("Was sie über dich festhält", "What it records about you") }),
        el('span', { class: 'grau anzahl', text: abweichend ? tr(` ${abweichend} nicht ganz richtig`, ` ${abweichend} not fully correct`) : tr(" alles richtig festgehalten", " all recorded correctly") })),
      karte(aktuell),
      vorn.length ? el('ul', { role: 'list', class: 'aussagen' }, ...vorn.map(aussageZeile)) : el('p', { class: 'grau', text: tr("Nichts Neues oder Abweichendes in dieser Auswahl.", "Nothing new or divergent in this selection.") }),
      rest.length ? aufklapp(tr(`Weitere, richtig festgehalten (${rest.length})`, `Others recorded correctly (${rest.length})`), el('ul', { role: 'list', class: 'aussagen' }, ...rest.map(aussageZeile))) : null,
      ueberholt.length ? aufklapp(tr(`Überholt (${ueberholt.length})`, `Superseded (${ueberholt.length})`), el('ul', { role: 'list', class: 'aussagen' }, ...ueberholt.map(aussageZeile))) : null);
  }

  // The chosen case: name, its two marks in words, the first sentence; the
  // whole sentence and the evidence one click away, as his requirements ask.
  function erster(text) {
    const satz = (/^.*?[.!?“](?=\s|$)/.exec(text) || [text])[0];
    return satz.length > 150 ? `${satz.slice(0, 148)} …` : satz;
  }
  function detailBereich(f) {
    if (!f) return null;
    const h = herkunftVon(f);
    const z = ZEILEN.find((x) => x.key === zeileVon(f));
    return el('section', { class: 'bereich mo-detail', 'data-art': 'detail', 'aria-labelledby': 'mo-detail-titel' },
      el('h3', { id: 'mo-detail-titel', tabindex: '-1' }, neuPunkt(f), el('span', { text: f.kurz })),
      el('p', { class: 'mo-detail-marken' }, herkunftZeichen(h), el('span', { text: h ? h.wort : tr("Herkunft nicht erfasst", "Provenance not recorded") }), ' ', marke(z.zeichen, z.wort), el('span', { text: f.status === 'überholt' ? display('überholt') : z.wort })),
      f.text ? el('p', { text: erster(f.text) }) : null,
      (f.text && erster(f.text) !== f.text) || f.beleg ? aufklapp(tr("Ganzer Satz und Beleg", "Full statement and evidence"),
        f.text ? el('p', { text: f.text }) : null,
        f.beleg ? el('p', { class: 'beleg', text: tr(`Beleg: ${f.beleg}`, `Evidence: ${f.beleg}`) }) : null) : null);
  }

  // The sidebar: filters with counts, then what lies with him.
  function filterKnopf(gruppe, key, inhalt, anzahl) {
    const an = gruppe === 'neu' ? filter.neu : filter[gruppe].has(key);
    const knopf = el('button', { type: 'button', class: 'mo-filter', 'data-filter-group': gruppe, 'data-filter-key': key, 'aria-pressed': String(an) }, ...inhalt, el('span', { class: 'mo-filter-zahl', text: String(anzahl) }));
    knopf.addEventListener('click', () => {
      if (gruppe === 'neu') filter.neu = !filter.neu;
      else if (an) filter[gruppe].delete(key); else filter[gruppe].add(key);
      zeichnen();
      filterOrt.querySelector(`[data-filter-group="${CSS.escape(gruppe)}"][data-filter-key="${CSS.escape(key)}"]`)?.focus();
    });
    return knopf;
  }
  function seitenleiste(alle, offeneK, offeneP) {
    const aktuell = alle.filter((f) => f.status !== 'überholt');
    const zahl = (fn) => aktuell.filter(fn).length;
    const controls = [
      el('h3', { class: 'mo-filter-titel', text: tr("Herkunft", "Provenance") }),
      el('div', { class: 'mo-filtergruppe' }, ...HERKUNFT.map((h) => filterKnopf('herkunft', h.key, [herkunftZeichen(h), el('span', { text: h.kurz })], zahl((f) => f.herkunft === h.key)))),
      el('h3', { class: 'mo-filter-titel', text: tr("Festgehalten", "Recorded") }),
      el('div', { class: 'mo-filtergruppe' }, ...ZEILEN.map((z) => filterKnopf('zeile', z.key, [marke(z.zeichen, z.wort), el('span', { text: z.wort })], zahl((f) => zeileVon(f) === z.key)))),
      el('div', { class: 'mo-filtergruppe' }, filterKnopf('neu', 'neu', [el('span', { class: 'neu-punkt', 'aria-hidden': 'true' }), el('span', { text: tr("nur neu", "new only") })], zahl((f) => f.neu))),
      el('h3', { class: 'mo-filter-titel', text: tr("Bei dir", "With you") }),
      el('ul', { role: 'list', class: 'mo-bei-dir' },
        el('li', {}, el('a', { href: '#mo-korrigieren', text: tr(`Korrekturen zum Einfügen: ${offeneK}`, `Corrections to paste: ${offeneK}`) })),
        el('li', {}, el('a', { href: '#mo-zusammenfassungen', text: tr(`Zusammenfassungen beurteilen: ${offeneP}`, `Summaries to assess: ${offeneP}`) }))),
    ];
    const previous = filterOrt.querySelector('.mo-filter-options');
    const options = el('details', { class: 'mo-filter-options' },
      el('summary', { text: tr('Filter auswählen', 'Choose filters') }), ...controls);
    options.open = previous ? previous.open : window.matchMedia ? window.matchMedia('(min-width: 62rem)').matches : true;
    return [options];
  }

  // The finding's time as in the operator view: Heute and time, else date and time.
  function zeitText(stand) {
    const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(String(stand || ''));
    if (!m) return String(stand || tr("Stand unbekannt", "Date unknown"));
    const heute = new Date();
    const istHeute = heute.getFullYear() === Number(m[1]) && heute.getMonth() + 1 === Number(m[2]) && heute.getDate() === Number(m[3]);
    return `${istHeute ? tr("Heute", "Today") : `${Number(m[3])}.${Number(m[2])}.${m[1]}`}, ${m[4]}:${m[5]}`;
  }
  const STUFEN = { critical: tr("kritisch, eingreifen", "critical; intervention needed"), gap: tr("deutliche Lücken", "substantial gaps"), qualified: tr("trägt mit Einschränkungen", "usable with limitations"), sound: tr("trägt", "usable"), ready: tr("Ziele erreicht", "goals achieved") };
  function band(lagebild) {
    const e = (lagebild || []).find((f) => f.titel === 'Einschätzung');
    const m = e && /^(critical|gap|qualified|sound|ready)\.?\s*(.*)$/.exec(e.text);
    if (!m) return null;
    const satz = tr(`Einschätzung von monitor: ${STUFEN[m[1]]}. ${m[2]}`, `Assessment by monitor: ${STUFEN[m[1]]}. ${m[2]}`);
    return el('span', { class: 'mo-band', 'data-level': m[1], role: 'img', 'aria-label': satz, title: satz });
  }

  const datum = (stand) => {
    const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(stand || ''));
    if (iso) return `${Number(iso[3])}.${Number(iso[2])}.${iso[1]}`;
    return (/^(\d{1,2}\.\d{1,2}\.\d{0,4})/.exec(String(stand || '')) || [null, ''])[1];
  };
  // Reliability at a glance: the first fields of the finding's reliability,
  // which monitor keeps short; the rest behind a disclosure.
  const KURZ_VERLASS = 3;


  const logFilter = { status: 'alle', stufe: 'alle' };
  const logLabel = value => {
    const labels = {
      offen: ['Offen', 'Open'], 'in-arbeit': ['In Arbeit', 'In progress'], geschlossen: ['Geschlossen', 'Closed'],
      'ungeprüft': ['Nachweis fehlt', 'Evidence missing'], verständnis: ['Verständnis', 'Understanding'],
      umsetzung: ['Umsetzung', 'Implementation'], integration: ['Integration', 'Integration'], prüfung: ['Prüfung', 'Verification'],
      rückschreibung: ['Rückschreibung', 'Write-back'], veröffentlichung: ['Auslieferung', 'Delivery'],
      selbst: ['Selbst gegengelesen', 'Read back by monitor'], bericht: ['Operatorbericht gelesen', 'Operator report read'],
      fehler: ['Fehler', 'Defect'], übergabe: ['Übergabe', 'Handoff'], prüflücke: ['Prüflücke', 'Verification gap'],
      verständnisfehler: ['Verständnisfehler', 'Understanding mismatch'], herkunft: ['Herkunft', 'Attribution'],
    };
    return labels[value] ? tr(...labels[value]) : value;
  };
  function evidenceLog(entries) {
    const section = el('section', { class: 'bereich mo-evidence', 'aria-labelledby': 'mo-evidence-title' },
      el('h3', { id: 'mo-evidence-title', text: tr('Befunde und offene Übergänge', 'Findings and open transitions') }),
      el('p', { class: 'grau', text: tr('Die Zähler zeigen offene Fälle nach nächster Belegstufe. Frühere Schritte gelten dadurch nicht als erledigt.', 'Counts show open cases by next evidence stage. Earlier steps are not inferred to be complete.') }));
    const stages = ['verständnis', 'umsetzung', 'integration', 'prüfung', 'rückschreibung', 'veröffentlichung'];
    section.append(el('div', { class: 'mo-flow', 'aria-label': tr('Offene Fälle nach nächster Belegstufe', 'Open cases by next evidence stage') },
      ...stages.map(stage => {
        const count = entries.filter(e => e.status !== 'geschlossen' && e.stufe === stage).length;
        const button = el('button', { type: 'button', class: 'mo-flow-stage', 'aria-pressed': String(logFilter.stufe === stage),
          'data-stage': stage }, el('span', { text: logLabel(stage) }), el('strong', { text: String(count) }));
        button.addEventListener('click', () => { logFilter.stufe = logFilter.stufe === stage ? 'alle' : stage; if (logFilter.stufe !== 'alle') logFilter.status = 'alle'; zeichnen(); document.querySelector('[data-stage="' + stage + '"]')?.focus(); });
        return button;
      })));
    const control = el('select', { id: 'mo-log-status', 'aria-label': tr('Befundstatus', 'Finding status') },
      ...['alle', 'offen', 'in-arbeit', 'ungeprüft', 'geschlossen'].map(status => el('option', { value: status, text: status === 'alle' ? tr('Alle Befunde', 'All findings') : logLabel(status) })));
    control.value = logFilter.status;
    control.addEventListener('change', () => { logFilter.status = control.value; zeichnen(); document.getElementById('mo-log-status')?.focus(); });
    const reset = el('button', { type: 'button', class: 'mo-log-reset', text: tr('Gesamtübersicht', 'Show all') });
    reset.addEventListener('click', () => { logFilter.status = logFilter.stufe = 'alle'; zeichnen(); document.getElementById('mo-log-status')?.focus(); });
    section.append(el('div', { class: 'mo-log-tools' }, control, reset));
    const shown = entries.filter(e => (logFilter.status === 'alle' || e.status === logFilter.status) && (logFilter.stufe === 'alle' || (e.stufe === logFilter.stufe && e.status !== 'geschlossen')));
    const list = el('ul', { class: 'mo-log-list', role: 'list' });
    for (const entry of shown) {
      const evidence = aufklapp(tr('Beleg und Abschlussbedingung', 'Evidence and closure condition'),
        el('p', { text: entry.beleg }), el('p', { class: 'grau', text: tr('Geprüfter Gegenstand: ', 'Checked target: ') + entry.fassung }));
      list.append(el('li', { class: 'mo-log-row', 'data-log-id': entry.id },
        el('div', { class: 'mo-log-heading' }, el('h4', { text: entry.titel }), el('span', { class: 'chip', text: logLabel(entry.status) })),
        el('div', { class: 'mo-log-meta' }, el('span', { text: logLabel(entry.art) }), el('span', { text: entry.owner }),
          el('span', { text: logLabel(entry.basis) }), el('span', { text: tr('Belegstufe: ', 'Evidence stage: ') + logLabel(entry.stufe) })),
        el('p', { class: 'mo-log-action', text: entry.aktion }), evidence));
    }
    section.append(list);
    if (!shown.length) section.append(el('p', { class: 'mo-log-empty', text: tr('Kein Befund in dieser Auswahl.', 'No findings in this selection.') }));
    return section;
  }

  function zeichnen() {
    const main = document.getElementById('inhalt');
    const diagnosticsOpen = main.querySelector('.mo-diagnostics')?.open || filter.neu || filter.herkunft.size > 0 || filter.zeile.size > 0;
    if (!M) {
      main.replaceChildren(el('h2', { id: 'titel', text: tr("Versteht Research Coordination dich?", "Does Research Coordination understand you?") }),
        el('p', { class: 'grau', text: tr("Keine Monitordaten. Die Ansicht liest den Abschnitt Monitor der Operator-Datei monitor.", "No monitor data. This view reads the Monitor section of the monitor operator file.") }));
      return;
    }
    const { dims, fehlend, schwaechste, wert } = bewertung(M, false);
    const vorlaeufig = bewertung(M, true).dims;
    const korrekturen = M.korrekturen || [];
    const offen = korrekturen.filter((k) => k.stand !== 'erledigt');
    const erledigt = korrekturen.filter((k) => k.stand === 'erledigt');
    const alleText = offen.filter((k) => k.prompt).map((k) => k.prompt);
    const paraphrasen = M.paraphrasen || [];
    const entscheidungen = M.entscheidungen || [];
    // Counts name only what is still open for him.
    const offeneE = entscheidungen.filter((e) => !antworten[schluessel('entscheidung', e.kurz, `${e.frage} ${e.gegenstand}`)]).length;
    const offeneP = paraphrasen.filter((p) => p.urteil === 'offen' && !antworten[schluessel('paraphrase', p.kurz, p.text)]).length;
    const verlass = M.verlaesslichkeit || [];
    const festhalten = (M.faelle || []).filter((f) => f.dimension === 'festhalten');
    if (!festhalten.some((f) => f.kurz === gewaehlt)) gewaehlt = (festhalten.find((f) => f.status !== 'überholt' && auffaellig(f)) || festhalten[0] || {}).kurz || null;
    const auswahl = festhalten.find((f) => f.kurz === gewaehlt) || null;
    filterOrt.replaceChildren(...seitenleiste(festhalten, offen.length, offeneP));

    const gesamt = wert === null
      ? el('p', { class: 'gesamt' }, el('span', { class: 'dim-wert', text: tr("Gesamt: ungeprüft.", "Overall: unchecked.") }),
        el('span', { class: 'grau', text: tr(` ${fehlend.map((d) => d.name).join(' und ')} fehlt noch.`, ` ${fehlend.map((d) => d.name).join(' and ')} still missing.`) }))
      : el('p', { class: 'gesamt' }, el('span', { class: 'dim-wert', text: tr(`Gesamt: ${wert}, ${BAENDER.find(([g]) => wert <= g)[1]}.`, `Overall: ${wert}, ${BAENDER.find(([g]) => wert <= g)[1]}.`) }),
        el('span', { class: 'grau', text: tr(` Der schwächste Anteil, jetzt ${schwaechste.name}.`, ` The lowest share, currently ${schwaechste.name}.`) }));
    const anzahl = (n) => el('span', { class: 'grau anzahl', text: n ? tr(` ${n} offen`, ` ${n} open`) : tr(" nichts offen", " nothing open") });

    const quelle = sicherUrl(M.quelle);
    main.replaceChildren(
      el('h2', { id: 'titel', text: tr("Versteht Research Coordination dich?", "Does Research Coordination understand you?") }),
      el('p', { class: 'grau unterzeile mo-kopfzeile' }, window.LEITSTAND_ICONS?.fact ? window.LEITSTAND_ICONS.fact('clock') : null,
        el('span', { text: tr(`Befund von monitor, ${zeitText(M.stand)}`, `Finding by monitor, ${zeitText(M.stand)}`) }), band(M.lagebild)),
      el('div', { class: 'mo-raster' },
        el('div', { class: 'mo-haupt' },
          korrekturen.length ? el('section', { class: 'bereich', 'data-art': 'korrigieren', 'aria-labelledby': 'mo-korrigieren' },
            el('h3', { id: 'mo-korrigieren' }, el('span', { text: tr("Koordination korrigiert", "Coordination corrections") }), anzahl(offen.length)),
            offen.length ? el('ul', { role: 'list', class: 'karten' }, ...offen.map(korrekturKarte)) : null,
            alleText.length > 1 ? aufklapp(tr("Alle offenen Korrekturen als eine Nachricht", "All open corrections in one message"), promptFeld(alleText.join('\n\n'), tr("Alle Korrekturen kopieren", "Copy all corrections"))) : null,
            erledigt.length ? aufklapp(tr(`Von ihr erledigt (${erledigt.length})`, `Completed by the coordination (${erledigt.length})`), el('ul', { role: 'list', class: 'karten' }, ...erledigt.map(korrekturKarte))) : null) : null,
          entscheidungen.length ? el('section', { class: 'bereich', 'data-art': 'entscheidung', 'aria-labelledby': 'mo-entscheidung' },
            el('h3', { id: 'mo-entscheidung' }, el('span', { text: tr("Braucht deine Entscheidung", "Needs your decision") }), anzahl(offeneE)),
            el('ul', { role: 'list', class: 'karten' }, ...entscheidungen.map(entscheidungKarte))) : null,
          festhalten.length ? glaubeBereich(festhalten) : null,
          paraphrasen.length ? el('section', { class: 'bereich', 'data-art': 'zusammenfassungen', 'aria-labelledby': 'mo-zusammenfassungen' },
            el('h3', { id: 'mo-zusammenfassungen', title: tr("Wörtlich aus ihrem Chat. Dein Urteil ist die Grundlage für Verstehen.", "Quoted from its chat. Your assessment grounds Understanding.") },
              el('span', { text: tr("Ihre Zusammenfassungen beurteilen", "Assess its summaries") }), anzahl(offeneP)),
            el('ul', { role: 'list', class: 'paraphrasen' }, ...paraphrasen.map(paraphraseZeile))) : null),
        el('div', { class: 'mo-seite' },
          el('section', { class: 'bereich', 'data-art': 'dimensionen', 'aria-labelledby': 'mo-dimensionen' },
            el('h3', { id: 'mo-dimensionen', text: tr("Drei Dimensionen", "Three dimensions") }),
            gesamt,
            el('ul', { role: 'list', class: 'dimensionen' }, ...dims.map((d, i) => dimensionBlock(d, vorlaeufig[i]))),
            aufklapp(tr("Wie gezählt wird", "How counting works"),
              el('ul', { class: 'regeln' },
                el('li', { text: tr("Gezählt werden belegte und korrigierte Fälle, die geprüft sind.", "Checked cases that are evidenced or corrected are counted.") }),
                el('li', { text: tr("Erfüllt zählt 1, teilweise 0,5, verfehlt 0.", "Met counts as 1, partly as 0.5, missed as 0.") }),
                el('li', { text: tr(`Ein Anteil erst ab ${MINDESTENS} gezählten Fällen.`, `A share requires at least ${MINDESTENS} counted cases.`) }),
                el('li', { text: tr("Gesamt ist der schwächste Anteil, nur wenn alle drei einen haben.", "The overall value is the lowest share, only when all three have one.") }),
                el('li', { text: tr("Ob monitor selbst richtig liegt, misst der Wert nicht.", "This value does not measure whether monitor itself is correct.") })))),
          detailBereich(auswahl))));
    // monitor's own picture and the reliability close the main column.
    main.querySelector('.mo-haupt').append(
          el('section', { class: 'bereich von-monitor', 'data-art': 'lagebild', 'aria-labelledby': 'mo-lage' },
            el('h3', { id: 'mo-lage' }, el('span', { text: tr("Lagebild", "Situation report") }), el('span', { class: 'grau anzahl', text: tr(" erarbeitet von monitor", " prepared by monitor") })),
            el('dl', { class: 'felder' }, ...(M.lagebild || []).filter((f) => f.titel !== 'Einschätzung').flatMap((f) => feld(f.titel, f.text)))),
          el('section', { class: 'bereich', 'data-art': 'verlaesslichkeit', 'aria-labelledby': 'mo-verlass' },
            el('h3', { id: 'mo-verlass', text: tr("Verlässlichkeit dieses Befunds", "Reliability of this finding") }),
            el('dl', { class: 'felder' }, ...verlass.slice(0, KURZ_VERLASS).flatMap((f) => feld(f.titel, f.text, true))),
            verlass.length > KURZ_VERLASS ? aufklapp(tr("Mehr zur Verlässlichkeit", "More about reliability"), el('dl', { class: 'felder' }, ...verlass.slice(KURZ_VERLASS).flatMap((f) => feld(f.titel, f.text, true)))) : null,
            (M.fehler || []).length ? el('p', { class: 'fehler', text: tr(`${M.fehler.length} Zeilen des Befunds nicht lesbar.`, `${M.fehler.length} lines of the finding could not be read.`) }) : null,
            quelle ? el('p', { class: 'fuss' }, el('a', { class: 'grau', href: quelle, text: tr(`Quelle: Befund von monitor, ${datum(M.stand)}`, `Source: finding by monitor, ${datum(M.stand)}`) })) : null));
    // Keep action and judgement first; the source map and distribution remain one native disclosure away.
    const primary = main.querySelector('.mo-haupt');
    const secondary = main.querySelector('.mo-seite');
    const recording = primary.querySelector('[data-art="glauben"]');
    const dimensions = secondary.querySelector('[data-art="dimensionen"]');
    const selected = secondary.querySelector('[data-art="detail"]');
    const diagnostics = el('details', { class: 'aufklapp mo-diagnostics' },
      el('summary', { text: tr('Diagnostik: Quellenkarte und gezählte Fälle', 'Diagnostics: source map and counted cases') }),
      el('div', { class: 'mo-raster' },
        el('div', {}, recording),
        el('div', { class: 'mo-seite' }, dimensions, selected)));
    diagnostics.open = Boolean(diagnosticsOpen);
    primary.insertBefore(diagnostics, primary.querySelector('[data-art="lagebild"]'));
    secondary.remove();
    main.querySelector(':scope > .mo-raster').className = 'mo-priority';
    const priority = el('section', { class: 'mo-review-need', 'aria-label': tr('Aktueller Prüfbedarf', 'Current review need') },
      el('p', { text: dims[0].anteil === null ? tr('Das persönliche Verständnis bleibt offen; dieser Befund zeigt geprüfte Aussagen und konkrete Übergaben.', 'Personal understanding remains open; this finding shows checked statements and concrete handoffs.') : tr('Verständnisurteile liegen vor; ihre Grundlage und Grenzen stehen in der Diagnostik.', 'Understanding assessments are available; their basis and limits are in diagnostics.') }),
      el('p', {}, el('a', { href: '#mo-zusammenfassungen', text: offeneP
        ? tr(`${offeneP} vollständige Zusammenfassungen warten auf dein Urteil.`, `${offeneP} full summaries await your assessment.`)
        : tr('Urteile zu den Zusammenfassungen lesen', 'Read assessments of the summaries') })));
    main.insertBefore(priority, main.querySelector('.mo-priority'));
    dimensions.prepend(gesamt);
    if ((M.evidenzlog || []).length) primary.insertBefore(evidenceLog(M.evidenzlog), diagnostics);
    dimensions.append(el('p', { class: 'grau dim-limit', text: tr('Anteile der geprüften Fälle; keine Wahrscheinlichkeit und kein Ersatz für dein Urteil über das Verständnis.', 'Shares of checked cases; not probabilities or a substitute for your assessment of understanding.') }));
    if (fokusNach) {
      // The chosen answer's prompt first, else the answer's own controls.
      (main.querySelector(`[data-fokus="${CSS.escape(fokusNach)}"]`) || main.querySelector(`[data-fokus-ort="${CSS.escape(fokusNach)}"] button`))?.focus();
      fokusNach = '';
    }
  }

  const filterOrt = el('div', { class: 'mo-filterleiste' });
  S.mount(document.getElementById('kopf'), { view: 'monitor', themen: false, sidebarTitle: tr("Filter", "Filter"), legendContent: filterOrt });
  zeichnen();
})();
