// Projekte: what is known about a project and what is still missing, after
// the vault document the project model and
// Projektseite.md, section Projektseite, and the operator's corrections of
// 15 October 2026. The project list stands on the left, grouped by zustand
// and ordered by updated; the chosen project on the right with its head
// (title, phase and links), then goal, state and unmatched decisions.
// The task tree or flat steps carry the next mark and matched decisions
// once. The project team precedes the task tree, followed by
// connections, knowledge beyond the head note and the decisions answered in
// this browser.
// Reads window.PROJEKTE (data/projekte-data.js, written by make_projekte.py,
// contract in knowledge/data.md, section Project view data), LEITSTAND
// (model.js) and the shared shell and prompt adapter, and never mutates them.
// Questions retain their source destination and open a read-only chat prompt.
// The pure functions are exported as window.PROJEKTE_MODELL so Node can test
// them with model.js loaded (test_projekte_model.cjs); without a document
// the file stops there.
(function () {
  'use strict';
  const tr = (de, en) => typeof window !== 'undefined' && window.UI_LANGUAGE ? window.UI_LANGUAGE.t(de, en) : de;
  const W = typeof window !== 'undefined' ? window : globalThis;
  // The assignment rules (auftragOffen, auftragWort) and the text rules
  // (laneMarker, datumImText) are model.js's; the pure functions read them too.
  const L = W.LEITSTAND;
  if (!L) throw new Error('projekte.js needs model.js loaded first');

  const BEDARF = ['erforschen', 'ausarbeiten', 'ausfuehrbar', 'pruefen'];
  const BEDARF_ZAEHLWORT = { erforschen: tr('zu erforschen', "To research"), ausarbeiten: tr('auszuarbeiten', "To develop"), ausfuehrbar: tr('ausführbar', "Ready to execute"), pruefen: tr('zu prüfen', "To review") };
  // Need names describe the work required; completion remains separate.
  const BEDARF_WORT = { erforschen: tr('fehlt Wissen', 'Knowledge missing'), ausarbeiten: tr('ausarbeiten', 'Develop'), ausfuehrbar: tr('ausführen', 'Execute'), pruefen: tr('prüfen', 'Review'), ohne: tr('offen', 'Open') };
  // Definitions of the vault document, section Aufgabe.
  const BEDARF_TITEL = {
    erforschen: tr('Zu erforschen: es fehlt Wissen, um zu entscheiden, wie es geht', "Research needed: knowledge is missing to decide how to proceed"),
    ausarbeiten: tr('Auszuarbeiten: der Weg ist klar, das Ergebnis muss noch gestaltet werden', "Development needed: the approach is clear but the result needs shaping"),
    ausfuehrbar: tr('Ausführbar: das Wissen reicht, die Aufgabe ist zu tun', "Ready to execute: enough is known to carry out the task"),
    pruefen: tr('Zu prüfen: ein Ergebnis oder eine Wahl ist zu prüfen und zu entscheiden', "Review needed: a result or choice needs checking and a decision"),
    ohne: tr('Der Bearbeitungsbedarf ist noch nicht erfasst', "The work needed has not been recorded"),
  };
  // Places where missing knowledge lies, which decide who can take the task.
  const QUELLE_WORT = { du: tr('bei dir', "With you"), vault: tr('im Vault', "In the vault"), partner: tr('bei Partnern', "With partners"), web: tr('im Web', "On the web") };
  const QUELLE_TITEL = {
    du: tr('Das fehlende Wissen oder die Entscheidung liegt beim Operator', "The missing knowledge or decision is with the user"),
    vault: tr('Das fehlende Wissen liegt im Vault oder in den Repositories', "The missing knowledge is in the vault or repositories"),
    partner: tr('Das fehlende Wissen liegt bei Partnerinnen und Partnern', "The missing knowledge is with partners"),
    web: tr('Das fehlende Wissen ist im Web zu recherchieren', "The missing knowledge needs web research"),
  };
  const ZUSTAENDE = ['anbahnung', 'aktiv', 'ruhend', 'abgeschlossen'];
  const ZUSTAND_WORT = { anbahnung: tr('Anbahnung', 'Initiation'), aktiv: tr('aktiv', 'Active'), ruhend: tr('ruhend', 'Dormant'), abgeschlossen: tr('abgeschlossen', 'Completed') };
  // Readable phrase of a connection art, as named and as mirrored on the
  // target. The order is the order of the groups under Verbindungen: the
  // family first, then what a project builds on.
  const PHRASE = {
    'ist-teil-von': [tr('ist Teil von', "Is part of"), tr('Teil davon', "Includes")],
    'baut-auf': [tr('baut auf', "Builds on"), tr('darauf baut auf', "Built upon by")],
  };
  const PHRASE_RANG = Object.values(PHRASE).flat();

  // A purpose that only names the document type adds nothing to the title.
  const DOKUMENTTYPEN = new Set(['project overview', 'anbahnungsdokument']);
  // Abbreviations whose period never ends a sentence. A copy of the list of
  // model.js (isSentenceEnd) without its "kap": unifying would stop "Kap."
  // from ending a sentence here and so change where a shortened text ends.
  // satzEnde below is the richer rule (quotes, years), not a copy of that check.
  const ABKUERZUNGEN = new Set(['nr', 'abs', 'art', 'bd', 'bzw', 'ca', 'ggf', 'inkl', 'jh', 'mio', 'prof', 'dr', 'st', 'vgl', 'etc', 'hrsg', 'aufl']);
  const ABKUERZUNG_BUCHSTABE = new Set(['S', 'z', 'B', 'u', 'a']);

  const istOffen = (a) => !a?.erledigt;
  // An assignment is open unless erledigt, which waits on acceptance, or
  // abgenommen, which is closed.
  const { auftragOffen } = L;

  // A question or exclamation mark ends a sentence when the text ends or a
  // capital, digit or opening quote follows, so an exclamation inside a name
  // (a title with punctuation) stays in its sentence. A period
  // does not after an abbreviation or an ordinal ("am 5. Oktober"); after a
  // full date or a year it does when a capital follows ("am 27.10.2026. Er").
  // No mark ends a sentence inside an opened German quotation, as a title
  // may hold a period ("„Libraries as Relational Assemblages. The Making…“");
  // closing quotes right after the mark count as closed before it.
  function satzEnde(t, i) {
    const bis = t.slice(0, i + 1) + (/^[.?!"'“”»«‘)\]]*/.exec(t.slice(i + 1))?.[0] || '');
    const zahl = (z) => bis.split(z).length - 1;
    if (zahl('„') > zahl('“') || zahl('‚') > zahl('‘')) return false;
    if (t[i] !== '.') return /^[.?!"'“”»«)\]]*\s*($|[\p{Lu}\p{N}„"“«»])/u.test(t.slice(i + 1));
    const wort = (/(\S+)$/.exec(t.slice(0, i))?.[1] || '').replace(/^[^\p{L}\p{N}]+/u, '');
    if (/[0-9]$/.test(wort)) return /(^|\.)\d{4}$/.test(wort) && /^\s*\p{Lu}/u.test(t.slice(i + 1));
    return wort.length === 1 ? !ABKUERZUNG_BUCHSTABE.has(wort) : !ABKUERZUNGEN.has(wort.toLowerCase());
  }

  /** The sentences of a text, whitespace collapsed, closing quotes kept. */
  function saetze(text) {
    const t = String(text ?? '').replace(/\s+/g, ' ').trim();
    const out = [];
    let start = 0;
    for (const m of t.matchAll(/[.?!]+["'“”»«)\]]*(?= |$)/g)) {
      const ende = m.index + m[0].length;
      if (ende === t.length || satzEnde(t, m.index)) {
        out.push(t.slice(start, ende).trim());
        start = ende;
      }
    }
    if (start < t.length) out.push(t.slice(start).trim());
    return out.filter(Boolean);
  }

  /**
   * A text shortened to whole sentences (surface rule 6): the first always,
   * each further one only while the whole stays within budget characters.
   * kurz is a prefix of voll, so the rest can follow for screen readers.
   */
  function kuerze(text, budget = 0) {
    const voll = String(text ?? '').replace(/\s+/g, ' ').trim();
    const s = saetze(voll);
    let kurz = s[0] || '';
    for (const x of s.slice(1)) {
      if (kurz.length + 1 + x.length > budget) break;
      kurz += ` ${x}`;
    }
    return { kurz, voll, gekuerzt: kurz.length < voll.length };
  }

  /** The task tree in tree order (pre-order) as rows {a, tiefe, eltern}. */
  function flach(aufgaben, tiefe = 0, eltern = null, out = []) {
    for (const a of aufgaben || []) {
      out.push({ a, tiefe, eltern });
      flach(a.kinder, tiefe + 1, a, out);
    }
    return out;
  }

  /**
   * The open research questions: open tasks to research, except one whose
   * own research children are still open, as a subproject of questions is no
   * further question. It counts again once only it is left open, because
   * whether it needs a synthesis of its own is a question of the model.
   */
  function offeneFragen(aufgaben) {
    return flach(aufgaben).map((x) => x.a).filter((a) => istOffen(a) && a.bedarf === 'erforschen' && blockiertDurch(a).length === 0);
  }

  /** Open tasks per need; tasks without a need count under ohne. */
  function zaehle(aufgaben) {
    const z = { erforschen: offeneFragen(aufgaben).length, ausarbeiten: 0, ausfuehrbar: 0, pruefen: 0, ohne: 0 };
    for (const { a } of flach(aufgaben)) {
      if (istOffen(a) && a.bedarf !== 'erforschen') z[BEDARF.includes(a.bedarf) ? a.bedarf : 'ohne'] += 1;
    }
    return z;
  }

  /**
   * The open questions grouped by the place of their missing knowledge, the
   * largest group first, equal ones in the order of QUELLE_WORT; a question
   * without a place comes last.
   */
  function fragenNachQuelle(aufgaben) {
    const orte = [...Object.keys(QUELLE_WORT), ''];
    const nach = new Map(orte.map((q) => [q, []]));
    for (const a of offeneFragen(aufgaben)) nach.get(QUELLE_WORT[a.quelle] ? a.quelle : '').push(a);
    return orte.map((quelle) => ({ quelle, wort: QUELLE_WORT[quelle] || 'ohne Ort', fragen: nach.get(quelle) }))
      .filter((g) => g.fragen.length)
      .sort((x, y) => ((x.quelle === '') - (y.quelle === '')) || (y.fragen.length - x.fragen.length));
  }

  /** The counts as one line, "3 zu erforschen, 2 auszuarbeiten, 4 ausführbar". */
  function fehltText(z) {
    const teile = BEDARF.filter((b) => z[b] > 0).map((b) => `${z[b]} ${BEDARF_ZAEHLWORT[b]}`);
    if (z.ohne > 0) teile.push(`${z.ohne} ${z.ohne === 1 ? 'Schritt' : tr('Schritte', "Steps")} ohne Bedarf`);
    return teile.length ? teile.join(', ') : tr('nichts offen', "Nothing open");
  }

  /**
   * The Fehlt line. Beside a tree it names the knowledge still missing by
   * the place it lies, which decides who can fetch it; the counts per need
   * have no column heads any more and stand in its tooltip with the
   * questions. Without a task tree every step stands without a need, which
   * says only that the sidecar has no tree yet, so the line says that. Only
   * where steps exist and all are done is nothing open; without any step
   * the line says none is recorded and where steps would come from, as an
   * initiation keeps them in its document, not in ACTIVE-WORK.
   */
  function fehltZeile(aufgaben, quelle = '') {
    const offenAlle = flach(aufgaben).filter(({ a }) => istOffen(a)).length;
    if (hatBaum(aufgaben)) {
      const gruppen = fragenNachQuelle(aufgaben);
      const n = gruppen.reduce((s, g) => s + g.fragen.length, 0);
      const leer = offenAlle ? tr('keine Frage offen', 'No open question') : tr('nichts offen', "Nothing open");
      const text = n ? tr(`${n} ${n === 1 ? 'Frage' : 'Fragen'} offen: ${gruppen.map((g) => `${g.fragen.length} ${g.wort}`).join(', ')}`, `${n} open ${n === 1 ? 'question' : 'questions'}: ${gruppen.map((g) => `${g.fragen.length} ${g.wort}`).join(', ')}`) : leer;
      // One line per place; each ends as a sentence, so a screen reader,
      // which hears the line breaks as spaces, still pauses between them.
      const titel = [...gruppen.map((g) => `${g.fragen.length} ${g.wort}: ${g.fragen.map((a) => a.text).join('; ')}`),
        tr(`Offene Aufgaben je Bedarf: ${fehltText(zaehle(aufgaben))}`, `Open tasks by work needed: ${fehltText(zaehle(aufgaben))}`)].map((z) => (/[.?!]$/.test(z) ? z : `${z}.`)).join('\n');
      return { text, titel, baum: true };
    }
    const n = offenAlle;
    if (!flach(aufgaben).length) {
      return { text: tr('keine Schritte erfasst', "No steps recorded"), baum: false, schritte: 0,
        titel: quelle === 'anbahnung' ? tr('Die Anbahnung steht nicht in ACTIVE-WORK, Schritte und offene Punkte führt ihr Dokument', 'The initiation is not in ACTIVE-WORK; its document contains its steps and open items') : tr('Der Eintrag hat keine Schritte', "The entry has no steps") };
    }
    if (n === 0) return { text: tr('nichts offen', "Nothing open"), baum: false, schritte: 0, titel: tr('Alle Schritte sind erledigt', "All steps are complete") };
    return { text: tr(`Bedarf noch nicht erfasst, ${n} ${n === 1 ? 'Schritt' : 'Schritte'}`, `Work need not recorded, ${n} ${n === 1 ? 'step' : 'steps'}`), baum: false, schritte: n,
      titel: tr(`Der Aufgabenbaum mit Bearbeitungsbedarf fehlt in der Beilage, ${n === 1 ? 'der Schritt stammt aus ACTIVE-WORK und trägt noch keinen Bedarf' : 'die Schritte stammen aus ACTIVE-WORK und tragen noch keinen Bedarf'}`, 'The supplement has no task tree with work needs; the ACTIVE-WORK steps have no recorded work needs yet') };
  }

  /** Open research tasks below a task; a task with any of them is blocked. */
  const blockiertDurch = L.blockiertDurch;

  /**
   * The hint of an open task that waits on research below it. Only what
   * waits on missing knowledge is muted; a research task waiting on its own
   * research children is a subproject of questions, so it stands in full and
   * names them as Teilfragen. Null when the task waits on nothing.
   */
  function wartetHinweis(a) {
    const warten = istOffen(a) ? blockiertDurch(a) : [];
    const n = warten.length;
    if (!n) return null;
    if (a.bedarf === 'erforschen') return { text: tr(`${n} ${n === 1 ? 'Teilfrage' : 'Teilfragen'} offen`, `${n} open ${n === 1 ? 'subquestion' : 'subquestions'}`), gedaempft: false, warten };
    return { text: tr(`wartet auf ${n} ${n === 1 ? 'Recherche' : 'Recherchen'}`, `Waiting for ${n} research ${n === 1 ? 'task' : 'tasks'}`), gedaempft: true, warten };
  }

  /** Whether the tasks carry a need at all; without one they stand as a flat list. */
  function hatBaum(aufgaben) {
    return flach(aufgaben).some(({ a }) => BEDARF.includes(a.bedarf));
  }

  /** First open task in tree order that waits on no research. */
  function naechste(aufgaben) {
    return flach(aufgaben).map((x) => x.a).find((a) => istOffen(a) && blockiertDurch(a).length === 0) || null;
  }

  /**
   * The index of the Bei dir row that carries the next task, as the task
   * itself or as the operator point it carries, or -1. The first group of
   * the detail names the next contribution once: on that row when there is
   * one, else in a line of its own, and the tree marks nothing (F11).
   */
  function naechstesBeiDir(dich, aufgabe) {
    if (!aufgabe) return -1;
    return (dich || []).findIndex((x) => (x.art === 'entscheidung' ? traegtPunkt(aufgabe, x.entscheidung) : x.aufgabe === aufgabe));
  }

  /**
   * The open assignments of a project as rows, one per Kennung and lane: a
   * lane file under a former name of the same operator may list the same
   * assignment again (OBVSG-HANDS-ON-3 in build and visuals on 15 October
   * 2026), which keeps the first row and names every file. Rows without a
   * Kennung or in another state stay apart. laneKey maps a lane to its
   * current operator (model.js laneKey).
   */
  function auftragsZeilen(auftraege, laneKey = (x) => x) {
    const zeilen = [];
    const nach = new Map();
    for (const a of (auftraege || []).filter(auftragOffen)) {
      const key = a.kennung ? `${laneKey(a.lane || '')}|${a.kennung}|${a.zustand}` : null;
      const da = key ? nach.get(key) : null;
      if (da) { if (a.lane && !da.dateien.includes(a.lane)) da.dateien.push(a.lane); continue; }
      const zeile = { ...a, dateien: a.lane ? [a.lane] : [] };
      if (key) nach.set(key, zeile);
      zeilen.push(zeile);
    }
    return zeilen;
  }

  // Membership comes from exact task/project bindings, never from a task-tree
  // marker or the operator's current report. Keep an unmatched older project
  // row visible as unconfirmed rather than silently dropping its source claim.
  function projektAuftraege(p, lanes = [], laneKey = (key) => key) {
    const rows = [];
    const bound = new Set();
    const seen = new Map();
    for (const lane of lanes) {
      for (const task of [...(lane.auftraege || []), ...(lane.erledigt || []), ...(lane.abgenommen || [])]) {
        if (task.entryId !== p.id && (task.entryId || task.vorhaben !== p.id)) continue;
        const operator = laneKey(lane.key);
        const identity = task.kennung ? `${operator}|${task.kennung}|${task.zustand || ''}` : '';
        const existing = identity && seen.get(identity);
        if (existing) {
          if (!existing.dateien.includes(lane.key)) existing.dateien.push(lane.key);
        } else {
          const row = { ...task, lane: operator, operator, operatorSource: lane, dateien: [lane.key], unconfirmed: task.entryId !== p.id };
          rows.push(row);
          if (identity) seen.set(identity, row);
        }
        if (task.kennung) bound.add(`${operator}|${task.kennung}`);
      }
    }
    for (const task of auftragsZeilen(p.auftraege, laneKey)) {
      const operator = laneKey(task.lane || '');
      if (task.kennung && bound.has(`${operator}|${task.kennung}`)) continue;
      rows.push({ ...task, operator, operatorSource: null, unconfirmed: true });
    }
    return rows;
  }

  /**
   * The open assignments that are blocked, after merging (auftragsZeilen).
   * The state of the project (aktiv) is its phase, not the readiness of its
   * work, so the list and the head name these beside it (F01).
   */
  function blockierteAuftraege(auftraege, laneKey) {
    return auftragsZeilen(auftraege, laneKey).filter((a) => a.zustand === 'blockiert');
  }

  /**
   * Everything that lies with the operator, as one ordered list: the open
   * operator points, oldest first, then the open tasks whose knowledge or
   * decision lies with him and that wait on no research, in tree order, and
   * last the open tasks at the partners that no lane carries, as no lane can
   * fetch them and he is the one to ask. A task that carries a listed point
   * stands once, as its point. offen is a set of open point ids, or null when
   * every decision counts as open.
   */
  function beiDir(projekt, offen = null) {
    const punkte = (projekt?.entscheidungen || []).filter((e) => !offen || offen.has(e.id))
      .slice().sort((x, y) => (x.seit || '9999').localeCompare(y.seit || '9999'));
    const frei = flach(projekt?.aufgaben).map((x) => x.a)
      .filter((a) => istOffen(a) && blockiertDurch(a).length === 0 && !punkte.some((e) => traegtPunkt(a, e)));
    return [...punkte.map((e) => ({ art: 'entscheidung', entscheidung: e })),
      ...frei.filter((a) => a.quelle === 'du').map((a) => ({ art: 'aufgabe', aufgabe: a })),
      ...frei.filter((a) => a.quelle === 'partner' && !a.lane).map((a) => ({ art: 'partner', aufgabe: a }))];
  }

  // The words of a text, case folded, without the marks around them.
  const woerter = (x) => String(x ?? '').toLowerCase().split(/\s+/).map((w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')).filter(Boolean);
  // Only the observed senden/versenden variant is interchangeable.
  const gleichesWort = (w, v) => (w === 'versenden' ? 'senden' : w) === (v === 'versenden' ? 'senden' : v);

  /**
   * Whether a task carries an operator point. The sidecar field punkt names
   * the point id. A task without it carries the point whose wording holds
   * every word of the task or the reverse, as the task often shortens the
   * point ("Antwort an Beispielprojekt senden" for "Antwort an Beispielprojekt versenden").
   * A deliberate shortcut, since make_projekte.py does not pass punkt on
   * yet; once the sidecar names punkt for such tasks, the field decides. At
   * least three words, so a short task like "Termin finden" binds nothing.
   */
  function traegtPunkt(a, e) {
    if (!a || !e) return false;
    if (a.punkt) return a.punkt === e.id;
    const [x, y] = [woerter(a.text), woerter(e.frage)].sort((p, q) => p.length - q.length);
    const negationen = (words) => words.filter(w => /^(nicht|nie|niemals|kein(?:e|en|em|er|es)?|ohne|statt|anstatt)$/.test(w)).join(' ');
    if (x.length < 3 || negationen(x) !== negationen(y)) return false;
    let position = 0;
    for (const word of y) if (position < x.length && gleichesWort(x[position], word)) position++;
    return position === x.length;
  }

  /** The operator point a task carries, or null. */
  function punktVon(a, entscheidungen) {
    return (entscheidungen || []).find((e) => traegtPunkt(a, e)) || null;
  }

  /** Merge only mutual, unique matches; ambiguous points remain separate. */
  function arbeitsZuordnung(p, offen = null) {
    const punkte = (p.entscheidungen || []).filter((e) => !offen || offen.has(e.id));
    const aufgaben = flach(p.aufgaben).map((x) => x.a).filter(istOffen);
    const auftraege = auftragsZeilen(p.auftraege, L.laneKey);
    const tasks = new Map(), assignments = new Map();
    const rest = [];
    const nenntKennung = (e, a) => a.kennung && woerter(e.frage).includes(String(a.kennung).toLowerCase());
    for (const e of punkte) {
      const kandidaten = aufgaben.filter((a) => traegtPunkt(a, e) && traegtPunkt({ text: a.text }, e));
      if (kandidaten.length === 1 && punkte.filter((x) => traegtPunkt(kandidaten[0], x)).length === 1) {
        tasks.set(kandidaten[0], e);
        continue;
      }
      const vergeben = auftraege.filter((a) => nenntKennung(e, a));
      if (kandidaten.length === 0 && vergeben.length === 1 && !assignments.has(vergeben[0].kennung)
          && punkte.filter((x) => nenntKennung(x, vergeben[0])).length === 1) assignments.set(vergeben[0].kennung, e);
      else rest.push(e);
    }
    return { tasks, assignments, rest };
  }

  // A contained shorter wording adds no qualifier; preserve the fuller one.
  function aufgabenText(a, punkt) {
    return punkt && woerter(punkt.frage).length > woerter(a.text).length ? punkt.frage : a.text;
  }

  // Task rows carry open points only; answered and postponed points keep
  // their review destination here, even when their task remains open.
  function beantworteteEntscheidungen(projekt, offen = null) {
    if (!offen) return [];
    return (projekt?.entscheidungen || []).filter((e) => !offen.has(e.id));
  }

  // File name of a vault path or an Obsidian address, without .md, so the
  // head note and a knowledge entry compare although one names its folder.
  function dateiname(s) {
    const t = String(s || '');
    const pfad = t.includes('file=') ? decodeURIComponent(t.split('file=')[1].split('&')[0]) : t;
    return pfad.trim().replace(/\.md$/i, '').split('/').pop().toLowerCase();
  }

  /** The knowledge entry the head link already opens, or null. */
  function kopfWissen(p) {
    const kopf = new Set([p?.links?.vault, p?.links?.notiz].filter(Boolean).map(dateiname));
    return (p?.wissen || []).find((w) => w.pfad && kopf.has(dateiname(w.pfad))) || null;
  }

  /** Knowledge beyond the head note, which the head link opens already (surface rule 4). */
  function wissenListe(p) {
    const kopf = kopfWissen(p);
    return (p?.wissen || []).filter((w) => (w.pfad || w.titel) && w !== kopf);
  }

  // Questions whose knowledge lies in the vault or on the web can be taken by
  // any operator (lane); one at the operator or the partners cannot.
  const LANE_QUELLEN = ['vault', 'web'];

  /**
   * Open questions a lane could research that no lane carries. A lane whose
   * open assignments in the project are all blocked carries nothing, so its
   * question counts as uncarried rather than as being worked on.
   */
  function ohneOperator(aufgaben, auftraege = []) {
    const ruht = (lane) => {
      const seine = (auftraege || []).filter((x) => x.lane === lane && auftragOffen(x));
      return seine.length > 0 && seine.every((x) => x.zustand === 'blockiert');
    };
    return offeneFragen(aufgaben).filter((a) => LANE_QUELLEN.includes(a.quelle) && (!a.lane || ruht(a.lane)));
  }

  /**
   * What Zuständig says about questions no lane carries, "2 Fragen im Vault
   * und 1 im Web zu recherchieren, an eine Lane zu vergeben", with the
   * questions, which Zuständig lists as what the lane taking them is to
   * research; null when there are none.
   */
  function vergebenZeile(aufgaben, auftraege = []) {
    const offen = ohneOperator(aufgaben, auftraege);
    if (!offen.length) return null;
    const teile = LANE_QUELLEN.map((q) => [q, offen.filter((a) => a.quelle === q).length]).filter(([, n]) => n)
      .map(([q, n], i) => (i ? `${n} ${QUELLE_WORT[q]}` : tr(`${n} ${n === 1 ? 'Frage' : 'Fragen'} ${QUELLE_WORT[q]}`, `${n} ${n === 1 ? 'question' : 'questions'} ${QUELLE_WORT[q]}`)));
    return { text: `${teile.join(' und ')} zu recherchieren, an eine Lane zu vergeben`, titel: offen.map((a) => a.text).join('; '), fragen: offen };
  }

  /** Whether a purpose of knowledge says more than the type of the document. */
  function zweckZeigen(w) {
    const zweck = String(w?.zweck || '').trim().toLowerCase();
    if (!zweck || DOKUMENTTYPEN.has(zweck)) return false;
    return !String(w?.titel || '').trim().toLowerCase().startsWith(zweck);
  }

  /** Readable phrase of a connection, mirrored when the target named it. */
  function phrase(art, gespiegelt = false) {
    const p = PHRASE[art];
    if (p) return p[gespiegelt ? 1 : 0];
    return String(art || tr('verbunden mit', "Related to")).replace(/-/g, ' ');
  }

  /**
   * Connections grouped by art and direction, one line per phrase in the
   * order of PHRASE; an unknown art follows in the order of its first appearance.
   */
  function verbindungsZeilen(verbindungen) {
    const zeilen = new Map();
    for (const v of verbindungen || []) {
      const ph = phrase(v.art, v.gespiegelt);
      if (!zeilen.has(ph)) zeilen.set(ph, { phrase: ph, ziele: [] });
      zeilen.get(ph).ziele.push({ ziel: v.ziel, hinweis: v.hinweis || '' });
    }
    const rang = (ph) => (PHRASE_RANG.includes(ph) ? PHRASE_RANG.indexOf(ph) : PHRASE_RANG.length);
    return [...zeilen.values()].sort((a, b) => rang(a.phrase) - rang(b.phrase));
  }

  /**
   * The list groups: Anbahnung, aktiv, ruhend, abgeschlossen, each ordered by
   * updated, newest first, then title (surface rule 13, no hand sorting).
   * Empty groups are left out; an unknown zustand counts as aktiv.
   */
  function gruppen(projekte) {
    const nach = new Map(ZUSTAENDE.map((z) => [z, []]));
    for (const p of projekte || []) nach.get(ZUSTAENDE.includes(p.zustand) ? p.zustand : 'aktiv').push(p);
    return ZUSTAENDE.map((zustand) => ({
      zustand,
      projekte: nach.get(zustand).slice().sort((a, b) => String(b.updated || '').localeCompare(String(a.updated || ''))
        || String(a.titel || '').localeCompare(String(b.titel || ''), 'de')),
    })).filter((g) => g.projekte.length > 0);
  }

  function obsidianUrl(pfad) {
    return W.SECOND_BRAIN_VAULT.href(pfad);
  }

  function documentSections(text) {
    const lines = String(text || '').replace(/^\uFEFF/, '').split(/\r?\n/);
    const sections = [];
    let current = null, fence = '', yaml = lines[0] === '---';
    const parents = [];
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      if (yaml) { if (index && /^(---|\.\.\.)$/.test(line)) yaml = false; continue; }
      const marker = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
      if (marker) { if (!fence) fence = marker[1]; else if (marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = ''; }
      const heading = !fence && /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
      if (heading) {
        while (parents.length && parents.at(-1).level >= heading[1].length) parents.pop();
        current = { heading: heading[2], level: heading[1].length, parents: parents.map(parent => parent.heading), line: index + 1, lines: [] };
        parents.push(current);
        sections.push(current);
      } else if (current) current.lines.push(line);
      else if (line.trim()) { current = { heading: '', level: 1, line: index + 1, lines: [line] }; sections.push(current); }
    }
    return sections.map(({ lines, ...section }) => ({ ...section, text: lines.join('\n').trim() })).filter(section => section.text);
  }
  function documentGroup(heading) {
    const key = String(heading || '').toLocaleLowerCase('de').trim();
    const groups = {
      today: ['heutige bedeutung', 'aktuelle bedeutung', 'aktueller handlungsbedarf', 'current relevance', 'current need'],
      object: ['forschungsgegenstand und erkenntnisziel', 'gegenstand und ziel', 'gegenstand', 'forschungsfrage', 'research object and goal', 'research question', 'material, modellierung und arbeitsdaten'],
      status: ['aktueller stand', 'stand', 'status', 'offene bedingungen', 'bedingungen', 'voraussetzungen', 'offene punkte', 'status and open conditions'],
      contribution: ['eigener beitrag', 'eigener beitrag und zuständigkeit', 'abgeschlossener eigener beitrag und strategischer hintergrund', 'leistungszuschnitt des kostenvoranschlags', 'external advisor und einverständniserklärung', 'agentische forschungsunterstützung statt retrieval', 'own contribution', 'responsibility'],
      history: ['historie', 'chronik', 'verlauf', 'geschichte', 'history', 'timeline'],
      sources: ['sources', 'quellen'], summary: ['summary', 'zusammenfassung'],
    };
    return Object.keys(groups).find(group => groups[group].includes(key)) || 'context';
  }
  function documentSectionGroup(section) {
    return (section.parents || []).some(heading => documentGroup(heading) === 'sources') ? 'sources' : documentGroup(section.heading);
  }
  function sourceReferenceLabels(sections) {
    return [...new Set(sections.filter(section => documentSectionGroup(section) === 'sources').flatMap(section => [...section.text.matchAll(/^\s*(?:[-*]\s+)?(?:\*\*)?(S\d+)(?::\*\*|\*\*:|:)\s/gm)].map(match => match[1])))];
  }
  function documentTableLists(text) {
    const cells = line => line.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|(?![^\[]*\]\])/).map(value => value.trim().replace(/\\\|/g, '|'));
    const lines = String(text || '').split('\n'), result = [];
    for (let index = 0; index < lines.length; index++) {
      const headers = cells(lines[index]);
      const rule = cells(lines[index + 1] || '');
      if (!lines[index].includes('|') || headers.length < 2 || rule.length !== headers.length || !rule.every(value => /^:?-{3,}:?$/.test(value))) { result.push(lines[index]); continue; }
      index += 2;
      for (; index < lines.length && lines[index].trim().startsWith('|'); index++) {
        const values = cells(lines[index]);
        if (values.length !== headers.length) { result.push(lines[index]); continue; }
        result.push('- ' + headers.map((header, column) => '**' + header + ':** ' + values[column]).join('; '));
      }
      index--;
    }
    return result.join('\n');
  }


  W.PROJEKTE_MODELL = {
    flach, offeneFragen, zaehle, fragenNachQuelle, fehltText, fehltZeile, blockiertDurch, wartetHinweis, hatBaum, naechste, naechstesBeiDir, beiDir, beantworteteEntscheidungen,
    auftragsZeilen, projektAuftraege, blockierteAuftraege,
    traegtPunkt, punktVon, arbeitsZuordnung, aufgabenText, ohneOperator, vergebenZeile, kopfWissen, wissenListe,
    zweckZeigen, saetze, kuerze, phrase, verbindungsZeilen, gruppen, obsidianUrl,
    documentSections, documentGroup, documentSectionGroup, sourceReferenceLabels, documentTableLists,
  };
  if (typeof document === 'undefined') return;

  const S = W.LEITSTAND_SHELL;
  if (!S) throw new Error('projekte.js needs shell.js loaded first');
  const { el, mitTitel, bezahltMarke } = S;
  const E = W.LEITSTAND_ERGEBNISSE;
  if (!E) throw new Error('projekte.js needs ergebnisse.js loaded first');

  const DATEN = Array.isArray(W.PROJEKTE?.projekte) ? W.PROJEKTE : null;
  const projekte = DATEN ? DATEN.projekte : [];
  const byId = new Map(projekte.map((p) => [p.id, p]));
  const A = W.LEITSTAND_ANTWORTEN;
  if (!A) throw new Error('projekte.js needs antworten.js loaded first');

  let gewaehlt = null;
  let meldung = '';

  // Source text carries ISO dates, Markdown code marks and lane markers; the
  // view shows dates in German form, drops the backticks and names lanes by
  // their display name, while the data keeps all of it. A date inside an
  // assignment id such as LLM-FOERDERUNG-2026-10-15 stays as written, so the
  // id reads the same in Zuständig and in the point that names it.
  const anzeige = (text) => L.datumImText(L.laneMarker(text));

  // Qualifications remain visible at the project, including on touch screens.
  function volltext(klasse, text) {
    return el('span', { class: klasse, text: anzeige(text) });
  }

  const sichtbar = (p) => Boolean(p) && S.visible(p);

  // Canonical points remain open until the source changes. Historical browser
  // answers are read by the prompt adapter, never used to hide this work.
  function offenePunkte(p) {
    const e = L.entryById.get(p.id);
    if (!e) return null;
    return new Set(L.offenePunkte(e, {}).map((x) => x.id));
  }

  // Only ACTIVE-WORK points have individual answer destinations.
  // Initiation points share the source link in the project head.
  const inFragen = (p) => L.entryById.has(p.id);
  const hatFragePrompt = (p, punktId) => inFragen(p) && L.postenById.get(punktId)?.projekt === p.id;
  function fragenLink(p, punktId, offen) {
    if (!inFragen(p)) return null;
    const q = new URLSearchParams({ vorhaben: p.id, punkt: punktId });
    const point = L.postenById.get(punktId);
    const link = el('a', { href: 'fragen.html?' + q, text: tr('Frage und Quelle', "Question and source") });
    return el('span', { class: 'pj-fragen' },
      point?.projekt === p.id ? A.discussion(point, { ziel: 'punkt', incipit: false }) : null, ' ', link);
  }

  // A task at the partners says what to do with it, as no lane can fetch it.
  const dichText = (x) => (x.art === 'entscheidung' ? x.entscheidung.frage
    : x.art === 'partner' ? `bei Partnern einholen: ${x.aufgabe.text}` : x.aufgabe.text);

  // A task's date stands in its tree row only (surface rule 4). The row
  // that carries the next task leads with the mark nächstes, so the next
  // contribution stands once, with its link to Fragen (F11).
  function beiDirZeile(p, x, naechst = false) {
    const marke = naechst ? [naechstesMarke(NAECHSTES_TITEL), ' '] : [];
    if (x.art === 'entscheidung') {
      const e = x.entscheidung;
      const prompt = hatFragePrompt(p, e.id);
      return el('li', {}, prompt ? (marke.length ? el('span', {}, ...marke) : null) : el('span', {}, ...marke, volltext('', e.frage)),
        inFragen(p) ? el('span', { class: 'pj-rechts' }, fragenLink(p, e.id, true)) : null);
    }
    return el('li', {}, el('span', {}, ...marke, volltext('', dichText(x))), el('span', { class: 'pj-rechts' }, laneTeil(x.aufgabe.lane)));
  }

  function beiDirListe(p, dich, iNaechst = -1) {
    if (!dich.length) {
      return el('span', { class: 'leer', text: tr('keine offene Entscheidung', "No open decision") });
    }
    return el('ul', { class: 'pj-dich-liste', role: 'list' }, ...dich.map((x, i) => beiDirZeile(p, x, i === iNaechst)));
  }

  // The next mark belongs to the task's own row.
  const naechstesMarke = (titel) => mitTitel(el('span', { class: 'pj-naechstes', text: tr('in Quellenreihenfolge', "In source order") }), titel);
  const NAECHSTES_TITEL = tr('Erster offener Eintrag in der Quellenreihenfolge, Beauftragung und nächster Akteur stehen getrennt darunter', "First open item in source order; commissioning and next actor are shown separately below");

  // A count shows its digit and is read by its tooltip only, as the theme
  // chips of shell.js do, so assistive technology does not hear it twice.
  function zahlTeil(klasse, zahl, title) {
    return el('span', { class: klasse, title },
      el('span', { 'aria-hidden': 'true', text: String(zahl) }), el('span', { class: 'sr-only', text: title }));
  }

  function datumTeil(iso) {
    if (!/^\d{4}-\d{2}-\d{2}/.test(iso || '')) return null;
    const heute = L.todayIso();
    const titel = iso.slice(0, 10) < heute ? `${L.alterLang(iso)} her` : L.volldatum(iso.slice(0, 10));
    return mitTitel(el('span', { class: 'pj-datum', text: L.kurzDatum(iso, heute) }), titel);
  }

  // A former name in the data shows and links as the current operator.
  function laneTeil(stem) {
    if (!stem) return null;
    const key = L.laneKey(stem);
    return mitTitel(el('span', { class: `pj-lane ${key}`, text: L.laneName(key) }), `Lane ${key}, Lane-Datei ${key}.md`);
  }

  function quelleTeil(q) {
    if (!QUELLE_WORT[q]) return null;
    return mitTitel(el('span', { class: `pj-quelle ${q}`, text: QUELLE_WORT[q] }), QUELLE_TITEL[q]);
  }

  // The list: one row per project, title bold, on the right in mono the
  // number of tasks still to research (none when zero). Resting and closed
  // projects stand collapsed at the end (surface rule 5).
  function liste() {
    const nav = el('nav', { class: 'pj-liste', 'aria-label': tr('Projekte', "Projects") });
    const gs = gruppen(projekte.filter(sichtbar));
    const alle = new Map(gruppen(projekte).map((g) => [g.zustand, g.projekte.length]));
    if (!gs.length) nav.append(el('p', { class: 'leer', text: tr('Kein Projekt im gewählten Thema', "No project in the selected category") }));
    for (const g of gs) {
      const ul = el('ul', { role: 'list' }, ...g.projekte.map(zeile));
      // The head carries its count as the theme chips do (surface rule 9).
      const zahl = zahlTeil('zahl', g.projekte.length, gruppenTitel(g, alle.get(g.zustand)));
      nav.append(el('section', { class: `pj-gruppe ${g.zustand}` },
        el('h2', { class: 'pj-gruppe-kopf' }, ZUSTAND_WORT[g.zustand], ' ', zahl), ul));
    }
    return nav;
  }

  // The state of a project is its phase, so beside it the list row and the
  // head name a blocked assignment of the project, as a word and not by
  // colour alone (F01). No reason is added here; the row in Zuständig
  // carries one only where the lane file assigns it.
  function blockiertTeil(p, klasse) {
    const b = blockierteAuftraege(p.auftraege, L.laneKey);
    if (!b.length) return null;
    const text = b.length === 1 ? tr('Auftrag blockiert', 'Assignment blocked') : tr(`${b.length} Aufträge blockiert`, `${b.length} assignments blocked`);
    // The wording is the tooltip only: assistive technology hears the
    // assignments in full in Zuständig, not again in the list button's name.
    return el('span', { class: `pj-blockiert ${klasse}`, text: ` ${text}`,
      title: `${text}: ${b.map((a) => anzeige(a.auftrag || a.kennung)).join('; ')}` });
  }

  const ZUSTAND_SATZ = { anbahnung: tr('in Anbahnung', 'in initiation'), aktiv: tr('aktiv', 'active'), ruhend: tr('ruhend', 'dormant'), abgeschlossen: tr('abgeschlossen', 'completed') };
  function gruppenTitel(g, gesamt) {
    const n = g.projekte.length;
    const wort = ZUSTAND_SATZ[g.zustand];
    if (gesamt && gesamt > n) return tr(`${n} von ${gesamt} Projekten ${wort}, die übrigen gehören zu anderen Themen`, `${n} of ${gesamt} projects ${wort}; the others belong to different categories`);
    return tr(`${n} ${n === 1 ? 'Projekt' : 'Projekte'} ${wort}`, `${n} ${n === 1 ? 'project' : 'projects'} ${wort}`);
  }

  function zeile(p) {
    // The same count as Fehlt, so a subproject of questions counts once.
    const offen = offeneFragen(p.aufgaben);
    // The change day orders the group, so it leads the row as its sort key
    // (surface rules 2 and 13); assistive technology hears it after the
    // title, so the name comes first.
    const geaendert = /^\d{4}-\d{2}-\d{2}/.test(p.updated || '') ? tr(`zuletzt geändert am ${L.alterLang(p.updated)}`, `Last updated ${L.alterLang(p.updated)}`) : '';
    const knopf = el('button', { type: 'button', class: 'pj-zeile', 'data-projekt': p.id,
      'aria-current': p.id === gewaehlt ? 'true' : null },
    geaendert ? el('span', { class: 'pj-zeile-datum', title: geaendert, 'aria-hidden': 'true', text: L.kurzDatum(p.updated) }) : null,
    el('span', { class: 'pj-zeile-titel' }, p.titel, bezahltMarke(p), blockiertTeil(p, 'pj-zeile-block')),
    geaendert ? el('span', { class: 'sr-only', text: `, ${geaendert}` }) : null);
    if (offen.length) {
      knopf.append(zahlTeil('pj-zeile-zahl', offen.length,
        tr(`${offen.length} ${offen.length === 1 ? 'Aufgabe' : 'Aufgaben'} zu erforschen: ${offen.map((a) => anzeige(a.text)).join('; ')}`, `${offen.length} ${offen.length === 1 ? 'task' : 'tasks'} to research: ${offen.map((a) => anzeige(a.text)).join('; ')}`)));
    }
    knopf.addEventListener('click', () => waehle(p.id, { push: true }));
    return el('li', {}, knopf);
  }

  // Links of the head: the note in Obsidian, a further note only when it is
  // another one, the repositories and the knowledge folder of the clone,
  // which a web page cannot open and therefore names as text. Only document
  // schemes become links. The link to the head note names that document and
  // its purpose in its tooltip, as Wissen leaves it out (surface rule 4).
  function linkZeile(p) {
    const l = p.links || {};
    const teile = [];
    const sicher = (u) => /^(obsidian|https?):\/\//i.test(String(u || ''));
    const kopfDok = kopfWissen(p);
    const titelFuer = (u, sonst) => (kopfDok && dateiname(u) === dateiname(kopfDok.pfad)
      ? `${kopfDok.titel || tr('Notiz', "Note")} in Obsidian öffnen${zweckZeigen(kopfDok) ? `: ${anzeige(kopfDok.zweck)}` : ''}` : sonst);
    if (sicher(l.vault)) teile.push(mitTitel(el('a', { href: l.vault, text: 'Obsidian' }), titelFuer(l.vault, tr('Notiz in Obsidian öffnen', "Open note in Obsidian"))));
    const notiz = sicher(l.notiz) ? l.notiz : l.notiz ? obsidianUrl(l.notiz) : '';
    if (notiz && (!sicher(l.vault) || dateiname(notiz) !== dateiname(l.vault))) {
      teile.push(mitTitel(el('a', { href: notiz, text: tr('Notiz', "Note") }), titelFuer(notiz, tr(`Notiz ${l.notiz}`, `Note ${l.notiz}`))));
    }
    for (const r of (l.repos || []).filter((u) => /^https?:\/\//i.test(u))) {
      teile.push(el('a', { href: r, title: r, text: 'Repo', rel: 'noopener', target: '_blank' }));
    }
    if (l.wissen) {
      teile.push(el('span', { class: 'pj-pfad', title: tr(`Wissensordner im lokalen Klon: ${l.wissen}`, `Knowledge folder in the local clone: ${l.wissen}`) },
        el('span', { class: 'sr-only', text: tr('Wissensordner im lokalen Klon: ', "Knowledge folder in the local clone: ") }), l.wissen));
    }
    return teile.length ? el('p', { class: 'pj-links' }, ...teile) : null;
  }

  // The head names the area only where it says more than the state: every
  // initiation stands in the area Anbahnungen. The change shows as an age,
  // as the Übersicht reads its keys, with its source in the tooltip.
  function kopf(p) {
    const anbahnung = p.quelle === 'anbahnung';
    const geaendert = /^\d{4}-\d{2}-\d{2}/.test(p.updated || '')
      ? mitTitel(el('span', { class: 'pj-datum', text: tr(`geändert ${L.kurzDatum(p.updated)}`, `Updated ${L.kurzDatum(p.updated)}`) }),
        tr(`zuletzt geändert ${anbahnung ? 'im Anbahnungsdokument' : 'in ACTIVE-WORK'} am ${L.alterLang(p.updated)}`, `Last updated ${anbahnung ? 'in the initiation document' : 'in ACTIVE-WORK'} ${L.alterLang(p.updated)}`))
      : null;
    // The state word names the phase of the project, which its tooltip says,
    // so it is not read as the readiness of its assignments (F01).
    const wort = ZUSTAND_WORT[p.zustand] || p.zustand || 'aktiv';
    const meta = el('p', { class: 'pj-meta' },
      mitTitel(el('span', { class: 'pj-phase', text: wort }), tr(`Phase des Projekts${p.status ? `, status:: ${p.status} in ACTIVE-WORK` : ''}; den Stand seiner Aufträge zeigt der Abschnitt Aufträge`, `Project phase${p.status ? `, status:: ${p.status} in ACTIVE-WORK` : ''}; see Assignments for the assignment state`)),
      blockiertTeil(p, 'pj-kopf-block'),
      p.bereich && !anbahnung ? el('span', { text: p.bereich }) : null,
      geaendert);
    // What the project is about stands under the title as its short
    // description, the head of the project card (vault, Projektseite).
    const kurz = (p.kurz || []).find((t) => String(t || '').trim());
    return el('header', { class: 'pj-kopf' },
      E.returnTarget(new URLSearchParams(location.search).get('von')) ? el('a', { id: 'projekt-zurueck', ...E.returnTarget(new URLSearchParams(location.search).get('von')) }) : null,
      el('h2', { id: 'pj-titel', tabindex: '-1' }, p.titel, bezahltMarke(p)), meta, linkZeile(p),
      null);
  }

  function eintrag(dl, wort, inhalt, titel = '') {
    if (!inhalt) return;
    dl.append(mitTitel(el('dt', { text: wort }), titel), el('dd', {}, inhalt));
  }

  // Goal and state precede the tasks. Only decisions with no unique task
  // or assignment match retain a separate row here.
  // Ziel is ziele:: of ACTIVE-WORK. ergebnis of the sidecar is the testable
  // result a project is defined by (vault, Projektmodell, Projekt), a target
  // the data never mark as delivered, so it reads Angestrebtes Ergebnis (F05).
  function erste(p, dich, includeGoal = true) {
    const links = el('dl', { class: 'pj-ziel-feld' });
    const mitte = el('dl', { class: 'pj-stand-feld' });
    const rechts = el('dl', { class: 'pj-beitrag' });
    const ziel = String(p.ziel || '').trim();
    const ergebnis = String(p.ergebnis || '').trim();
    if (includeGoal && ziel) eintrag(links, tr('Ziel', "Goal"), volltext('', ziel), tr('Ziel des Projekts, ziele:: in ACTIVE-WORK', "Project goal from ziele:: in ACTIVE-WORK"));
    if (includeGoal && ergebnis && anzeige(ergebnis) !== anzeige(ziel)) {
      eintrag(links, tr('Angestrebtes Ergebnis', "Intended result"), volltext('', ergebnis),
        tr('Das prüfbare Ergebnis, an dem das Projekt gemessen wird, aus der Projektbeilage. Ob es vorliegt, erfassen die Projektdaten nicht', "The testable intended result from the project supplement. The project data does not establish whether it has been delivered."));
    }

    // Where the project stands, the current work of the project card; an
    // initiation carries no stand, so the line is left out there.
    if (String(p.stand || '').trim()) eintrag(mitte, tr('Stand', "Status"), volltext('', p.stand), tr('Wo das Projekt steht, aus dem Stand in ACTIVE-WORK', "Current project state from ACTIVE-WORK"));

    if (dich.length) eintrag(rechts, p.quelle === 'anbahnung' ? tr('Offene Punkte', 'Open items') : tr('Entscheidungen', "Decisions"), beiDirListe(p, dich),
      tr('Offene Punkte ohne eindeutige Zuordnung zu einer Aufgabe oder einem Auftrag', "Open items without an unambiguous task or assignment association"));
    return el('section', { class: 'pj-erstes', 'aria-label': tr('Ziel, Stand und offene Entscheidungen', "Goal, status and open decisions") },
      links.childElementCount ? links : null, mitte.childElementCount ? mitte : null, rechts.childElementCount ? rechts : null);
  }

  function auftragHref(task) {
    return 'operatoren.html?' + new URLSearchParams({ operator: task.operator, auftrag: task.kennung }) + '#arbeit';
  }

  const auftragAnker = (p, task) => E.projectTaskId(p.id, task);

  function teamAuftrag(p, task, zuordnung) {
    const delivered = !task.unconfirmed && (L.wartetAufAbnahme(task) || task.zustand === 'abgenommen');
    const result = E.describe(task);
    const title = delivered && result.editorial ? result.title
      : kuerze(anzeige(task.auftrag || task.ergebnis || '')).kurz || tr('Auftragsbeschreibung fehlt', 'Assignment description missing');
    const href = task.kennung && task.operatorSource
      ? delivered ? E.reviewHref(task, '', E.projectHref(p.id, new URLSearchParams(location.search).get('von')) + '#' + encodeURIComponent(auftragAnker(p, task))) : auftragHref(task) : '';
    const state = task.unconfirmed ? tr('Projektzuordnung nicht bestätigt', 'Project association unconfirmed')
      : task.zustand === 'abgenommen' ? tr('Abnahme vermerkt', 'Acceptance recorded')
        : delivered ? tr('Ergebnis vorgelegt', 'Result presented')
          : task.zustand === 'läuft' ? tr('In Bearbeitung', 'In progress') : L.auftragWort(task.zustand);
    const point = zuordnung?.assignments.get(task.kennung);
    const reason = !task.unconfirmed && task.zustand === 'blockiert' ? task.wait?.reason || '' : '';
    const actions = el('div', { class: 'pj-team-zugaenge' });
    if (href && delivered) actions.append(el('a', { href: auftragHref(task), text: tr('Auftrag und Belege', "Assignment and evidence") }));
    if (href && delivered) {
      const targets = task.ergebnisZiele || [];
      const material = targets.map(item => E.href(item, p.id)).find(Boolean);
      if (material) actions.append(el('a', { href: material, text: tr('Material öffnen', "Open material") }));
      else if (targets.some(item => item.art === 'text' && /\.md(?:#|$)/i.test(item.text || ''))) {
        const slot = el('span', { class: 'pj-material-status', text: tr('Materialzugang wird geprüft.', "Checking material access.") });
        actions.append(slot);
        // Late registry reads only replace this unresolved slot. The chosen
        // project, existing links and their keyboard focus stay untouched.
        void E.ready(targets).then(() => {
          if (!slot.isConnected) return;
          const resolved = targets.map(item => E.href(item, p.id)).find(Boolean);
          slot.replaceChildren(resolved ? el('a', { href: resolved, text: tr('Material öffnen', "Open material") }) : document.createTextNode(tr('Materialzugang im Auftragsdetail.', "Material access is in the assignment details.")));
        });
      }
    }
    return el('li', { class: 'pj-team-auftrag', id: task.operator && task.kennung ? auftragAnker(p, task) : null, tabindex: '-1', 'data-operator': task.operator, 'data-kennung': task.kennung, 'data-zustand': task.zustand || '', 'data-unconfirmed': String(task.unconfirmed) },
      el('div', { class: 'pj-team-arbeit' },
        href ? el('a', { class: 'pj-auftrag', href, text: title }) : el('span', { class: 'pj-auftrag', text: title }),
        el('span', { class: task.zustand === 'blockiert' ? 'pj-blockiert' : 'pj-team-stand', text: state })),
      task.unconfirmed ? el('p', { class: 'pj-team-grenze', text: task.operatorSource
        ? tr('Die Operatorenquelle nennt dieses Projekt. Die aktuelle Auftragsquelle bestätigt die Zuordnung derzeit nicht.', 'The operator source names this project. The current assignment source does not confirm the association.')
        : tr('Die Projektquelle nennt diesen Auftrag; eine passende aktuelle Operatorenquelle ist nicht erfasst.', "The project source names this assignment; no matching current operator source is recorded.") }) : null,
      task.vertragsfehler ? el('p', { class: 'pj-team-grenze', text: tr('Die Auftragsquelle ist derzeit nicht vollständig lesbar. Einzelheiten stehen im Auftragsdetail.', "The assignment source cannot currently be read in full. See the assignment details.") }) : null,
      reason ? volltext('pj-auftragsgrund', tr('Grund: ', 'Reason: ') + reason) : null,
      actions.childElementCount ? actions : null,
      point ? el('div', { class: 'pj-neu' }, volltext('', point.frage), fragenLink(p, point.id, true)) : null);
  }

  function zustaendig(p, zuordnung) {
    const tasks = projektAuftraege(p, L.lanes, L.laneKey);
    if (!tasks.length) return el('p', { class: 'leer pj-team-leer', text: tr('Für dieses Projekt ist kein Lab-Auftrag erfasst. Markierungen im Aufgabenbaum sind keine Beauftragung.', "No lab assignment is recorded for this project. Task-tree markers do not constitute commissioning.") });
    const groups = new Map();
    for (const task of tasks) {
      if (!groups.has(task.operator)) groups.set(task.operator, []);
      groups.get(task.operator).push(task);
    }
    return el('div', { class: 'pj-team' }, ...[...groups].map(([operator, work]) => el('section', { class: 'pj-team-gruppe' },
      el('h4', { class: 'pj-team-operator' }, operator && work.some(task => task.operatorSource)
        ? el('a', { href: 'operatoren.html?' + new URLSearchParams({ operator }) }, W.LEITSTAND_ICONS?.identity ? W.LEITSTAND_ICONS.identity(L.lanes.find(lane => lane.key === operator) || { key: operator, rollentitel: L.laneName(operator) }, { L, domain: false }) : W.LEITSTAND_ICONS?.operator?.(operator), el('span', { text: L.laneName(operator) }))
        : el('span', { text: tr('Operatorenzuordnung nicht bestätigt', "Operator association unconfirmed") })),
      el('ul', { class: 'pj-auftraege', role: 'list' }, ...work.map(task => teamAuftrag(p, task, zuordnung))))));
  }

  // A row whose task carries an operator point links to Fragen in place of
  // the section below (surface rules 4 and 14), unless Bei dir shows the
  // point and links it already; an open question a lane could
  // research that none carries says so where the lane would stand.
  function taskContext(a, p, point) {
    const c = L.aufgabenKontext(a, p.auftraege, point);
    const known = value => value && !['Nicht erfasst', 'Fehlender Beitrag nicht erfasst', 'Not recorded', 'Missing contribution not recorded'].includes(value);
    // The project team already states a wholly absent commission once.
    const commissioning = c.beauftragung !== 'Nicht vergeben' ? c.beauftragungText || c.beauftragung
      : (p.auftraege?.length || a.lane) ? tr('Kein Lab-Auftrag für diesen Schritt erfasst', 'No lab assignment recorded for this step') : '';
    const contextWords = { Beauftragt: tr('Beauftragt', 'Assigned'), 'Als erledigt vermerkt': tr('Als erledigt vermerkt', 'Recorded complete'), 'Aktuelle Beauftragung ungeklärt': tr('Aktuelle Beauftragung ungeklärt', 'Current commissioning unclear'), Abgeschlossen: tr('Abgeschlossen', 'Completed') };
    const parts = [
      commissioning ? el('span', { text: contextWords[commissioning] || commissioning }) : null,
      known(c.owner) ? el('span', { text: tr('Zuständig: ', "Responsible: ") + c.owner }) : null,
      known(c.next) ? el('span', { text: tr('Als Nächstes: ', "Next: ") + c.next }) : null,
      known(c.missing) ? el('span', { text: tr('Fehlender Beitrag: ', "Missing contribution: ") + c.missing }) : null,
    ].filter(Boolean);
    return parts.length ? el('p', { class: 'pj-arbeitskontext' }, ...parts) : null;
  }

  function aufgabeKnoten(a, tiefe, eltern, { p, offen, gezeigt, ohne, zuordnung, naechsteAufgabe }) {
    const punkt = zuordnung.tasks.get(a) || null;
    const hinweis = wartetHinweis(a);
    const bedarf = BEDARF.includes(a.bedarf) ? a.bedarf : 'ohne';
    const klassen = ['pj-aufgabe', tiefe ? 'kind' : '', hinweis?.gedaempft ? 'blockiert' : '', a.erledigt ? 'erledigt' : ''].filter(Boolean).join(' ');
    const marke = mitTitel(el('span', { class: `pj-bedarf bd-${bedarf}` },
      W.LEITSTAND_ICONS.task(bedarf),
      el('span', { class: ['pruefen', 'ohne'].includes(bedarf) ? '' : 'sr-only', text: BEDARF_WORT[bedarf] })), BEDARF_TITEL[bedarf]);
    const text = el('span', { class: 'pj-a-text' }, marke, el('span', { class: 'pj-a-inhalt' },
      tiefe ? el('span', { class: 'sr-only', text: tr(`Teil von ${anzeige(eltern.text)}: `, `Part of ${anzeige(eltern.text)}: `) }) : null,
      a === naechsteAufgabe ? naechstesMarke(NAECHSTES_TITEL) : null,
      a === naechsteAufgabe ? ' ' : null,
      anzeige(aufgabenText(a, punkt)), ' ', quelleTeil(a.quelle),
      hinweis?.gedaempft ? ' ' : null,
      hinweis?.gedaempft ? el('span', { class: 'pj-wartet', text: tr('wartet auf Recherche', "Waiting for research") }) : null,
      a.erledigt ? ' ' : null,
      a.erledigt ? el('span', { class: 'pj-erledigt', text: tr('erledigt', 'Complete') }) : null));
    const knoten = el('div', { class: klassen },
      text, el('span', { class: 'pj-rechts' }, ohne.has(a) || L.aufgabenKontext(a, p.auftraege, punkt).beauftragung !== 'Beauftragt' ? null : laneTeil(a.lane),
        ohne.has(a) ? mitTitel(el('span', { class: 'pj-ohne', text: tr('ohne Operator', "No operator") }),
          `${a.lane ? `Der Auftrag von ${L.laneName(a.lane)} ist blockiert, also recherchiert` : 'Noch recherchiert'} kein Operator diese Frage; ihr Wissen liegt ${QUELLE_WORT[a.quelle]}, also kann eine Lane sie übernehmen, sobald du sie vergibst`) : null,
        datumTeil(a.datum), punkt && !gezeigt.has(punkt.id) ? fragenLink(p, punkt.id, !offen || offen.has(punkt.id)) : null));
    if (tiefe && eltern) text.title = tr(`Teil von: ${anzeige(eltern.text)}`, `Part of: ${anzeige(eltern.text)}`);
    const context = taskContext(a, p, punkt);
    if (context) knoten.append(context);
    return knoten;
  }

  // Nested lists retain the source tree and expose each child's parent.
  function baum(p, offen, gezeigt, zuordnung, naechsteAufgabe) {
    const kontext = { p, offen, gezeigt, zuordnung, naechsteAufgabe, ohne: new Set(ohneOperator(p.aufgaben, p.auftraege)) };
    const zweige = (aufgaben, tiefe = 0, eltern = null) => (aufgaben || []).map((a) => el('li', { class: `pj-reihe${tiefe === 0 ? ' zweig' : ''}` },
      aufgabeKnoten(a, tiefe, eltern, kontext),
      a.kinder?.length ? el('ul', { class: 'pj-teilaufgaben', role: 'list' }, ...zweige(a.kinder, tiefe + 1, a)) : null));
    const legende = el('ul', { class: 'pj-bedarf-legende', role: 'list', 'aria-label': tr('Bearbeitungsbedarf', "Work needed") },
      ...['ausfuehrbar', 'ausarbeiten', 'erforschen', 'pruefen'].map((bedarf) => mitTitel(el('li', {}, W.LEITSTAND_ICONS.task(bedarf), BEDARF_WORT[bedarf]), BEDARF_TITEL[bedarf])));
    return el('section', { class: 'pj-abschnitt pj-aufgaben', 'aria-labelledby': 'pj-aufgaben-titel' },
      el('h3', { id: 'pj-aufgaben-titel', text: tr('Aufgaben', "Tasks") }), legende,
      el('ul', { class: 'pj-baum', role: 'list' }, ...zweige(p.aufgaben)));
  }

  function stepDiscussion(p, task) {
    if (task.erledigt) return null;
    const step = L.aw.einheiten.find(item => item.art === 'schritt' && item.teilVon === p.id && L.voll(item.titel) === L.voll(task.text));
    return step ? A.discussion(step, { ziel: 'schritt' }) : null;
  }

  // Flat source steps retain the same next mark and point destinations.
  function schritte(p, zuordnung, naechsteAufgabe) {
    if (!flach(p.aufgaben).length) return null;
    const ol = el('ol', { class: 'pj-schritte', role: 'list' }, ...flach(p.aufgaben).map(({ a }) => {
      const point = zuordnung.tasks.get(a);
      const discussion = !point ? stepDiscussion(p, a) : null;
      return el('li', { class: a.erledigt ? 'erledigt' : '' },
        el('span', { class: 'pj-s-text' }, a === naechsteAufgabe ? naechstesMarke(NAECHSTES_TITEL) : null,
          !discussion ? volltext('', aufgabenText(a, point)) : null),
        el('span', { class: 'pj-rechts' }, L.aufgabenKontext(a, p.auftraege).beauftragung === 'Beauftragt' ? laneTeil(a.lane) : null,
          datumTeil(a.datum), point ? fragenLink(p, point.id, true) : discussion), taskContext(a, p, point));
    }));
    return el('section', { class: 'pj-abschnitt pj-aufgaben', 'aria-labelledby': 'pj-aufgaben-titel' },
      el('h3', { id: 'pj-aufgaben-titel', text: tr('Schritte', "Steps") }), ol);
  }

  function wissen(p) {
    const liste = wissenListe(p);
    if (!liste.length) return null;
    return el('section', { class: 'pj-abschnitt' }, el('h3', { text: tr('Dokumente im Vault', "Documents in the vault") }),
      el('ul', { class: 'pj-wissen', role: 'list' }, ...liste.map((w) => el('li', {},
        w.pfad ? el('a', { href: obsidianUrl(w.pfad), title: w.pfad, text: w.titel || w.pfad }) : el('span', { text: w.titel }),
        zweckZeigen(w) ? volltext('pj-zweck', w.zweck) : null))));
  }

  // Answered and postponed decisions remain inspectable after the tasks.
  function entscheidungen(p, offen) {
    const liste = beantworteteEntscheidungen(p, offen);
    if (!liste.length) return null;
    return el('section', { class: 'pj-abschnitt' }, el('h3', { text: tr('Beantwortet', "Answered") }),
      el('ul', { class: 'pj-entscheidungen', role: 'list' }, ...liste.map((e) => el('li', { class: 'beantwortet' },
        volltext('', `${e.art ? `${e.art}: ` : ''}${e.frage}`),
        el('span', { class: 'pj-rechts' }, datumTeil(e.seit), fragenLink(p, e.id, false))))));
  }

  function zielKnopf(ziel, hinweis) {
    const p = byId.get(ziel);
    if (!p) return mitTitel(el('span', { class: 'pj-ziel fehlt', text: ziel }), tr('nicht in den Projektdaten', "Not in the project data"));
    const b = el('button', { type: 'button', class: 'pj-ziel', text: p.titel, title: hinweis || tr(`${p.titel} öffnen`, `Open ${p.titel}`) });
    if (hinweis) b.append(el('span', { class: 'sr-only', text: `, ${hinweis}` }));
    b.addEventListener('click', () => waehle(p.id, { push: true, fokus: true }));
    return b;
  }

  function verbindungen(p) {
    const zeilen = verbindungsZeilen(p.verbindungen);
    const varianten = p.varianten || [];
    if (!zeilen.length && !varianten.length && location.hash !== '#projekt-verbindungen') return null;
    const teile = [el('h3', { text: tr('Verknüpfte Projekte', "Related projects") })];
    if (!zeilen.length && !varianten.length) teile.push(el('p', { text: tr('Keine ausdrückliche Projektverbindung in den gelieferten Quellen erfasst.', 'No explicit project connection is recorded in the supplied sources.') }));
    if (zeilen.length) {
      teile.push(el('ul', { class: 'pj-verbindungen', role: 'list' }, ...zeilen.map((z) => el('li', {},
        el('span', { class: 'pj-phrase', text: z.phrase }), el('span', { class: 'pj-ziele' }, ...z.ziele.map((x) => zielKnopf(x.ziel, x.hinweis)))))));
    }
    if (varianten.length) {
      teile.push(el('section', {}, el('h4', { text: tr('Varianten', 'Variants') }),
        el('ul', { class: 'pj-variant-list', role: 'list' }, ...varianten.map(v => el('li', {},
          el('p', {}, el('strong', { text: v.key }), ' ', el('span', { class: 'pj-v-titel', text: v.titel })),
          el('p', {}, volltext('pj-v-text', v.beschreibung)), ...(v.projekte || []).map(id => zielKnopf(id, '')))))));
    }
    return el('section', { class: 'pj-abschnitt', id: 'projekt-verbindungen', tabindex: '-1' }, ...teile);
  }

  const documentLoads = new Map();
  const documentReferences = new Map();
  function projectMarkdown(markdown, project, className = '') {
    const node = el('div', { class: ('pj-document-text ' + className).trim() });
    // The existing converter escapes the complete input before creating its own tags.
    if (W.LEITSTAND_BERICHTE?.toHtml) node.innerHTML = W.LEITSTAND_BERICHTE.toHtml(documentTableLists(markdown), 2);
    else node.append(el('pre', { class: 'pj-source-original', text: String(markdown || '') }));
    const path = project.links?.notiz || '';
    const append = (parent, text) => {
      const tokens = /\[\[([^\]\n]+)\]\]|\[(S\d+[^\]\n]*)\]|\*\*([^*\n]+)\*\*/g;
      let end = 0;
      for (const match of text.matchAll(tokens)) {
        parent.append(document.createTextNode(text.slice(end, match.index)));
        if (match[1]) {
          const [reference, alias] = match[1].replace(/\\\|/g, '|').split('|');
          const [file, ...fragments] = reference.split('#');
          const fragment = fragments.join('#');
          const address = L.sourceReaderHref(file || path, project.id, fragment);
          parent.append(address ? el('a', { href: address, text: alias || file || fragment }) : document.createTextNode(alias || reference));
        } else if (match[2]) {
          parent.append('[');
          for (const [index, value] of match[2].split(',').entries()) {
            if (index) parent.append(', ');
            const label = value.trim();
            const authority = documentReferences.get(path);
            const address = project.quellenrevision && authority?.revision === project.quellenrevision && authority.labels.has(label) ? L.sourceReaderHref(path, project.id, 'Sources') : '';
            parent.append(address ? el('a', { href: address, class: 'pj-citation', 'data-source-ref': label,
              title: tr('Originale Quelldefinition ', 'Original source definition ') + label, text: label }) : el('span', { 'data-pending-source-ref': label, text: label }));
          }
          parent.append(']');
        } else { const strong = el('strong'); append(strong, match[3]); parent.append(strong); }
        end = match.index + match[0].length;
      }
      parent.append(document.createTextNode(text.slice(end)));
    };
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    const texts = [];
    while (walker.nextNode()) if (!walker.currentNode.parentElement.closest('a, code, pre')) texts.push(walker.currentNode);
    for (const text of texts) {
      if (!/\[\[|\[S\d|\*\*/.test(text.textContent)) continue;
      const fragment = document.createDocumentFragment(); append(fragment, text.textContent); text.replaceWith(fragment);
    }
    return node;
  }
  function documentSection(title, ...children) {
    return el('section', { class: 'pj-document-section' }, el('h3', { text: title }), ...children.filter(Boolean));
  }
  function sourceBlocks(sections, project) {
    return sections.map(section => el('section', { class: 'pj-source-section', 'data-source-heading': section.heading },
      section.heading ? el('h4', { text: section.heading }) : null, projectMarkdown(section.text, { ...project, quellenrevision: documentReferences.get(project.links?.notiz)?.revision })));
  }
  function projectDocumentation(project) {
    const today = el('div', { class: 'pj-today' });
    if (project.strategieHinweis) today.append(projectMarkdown(project.strategieHinweis, project));
    const object = documentSection(tr('Gegenstand, Ziel und Kontext', 'Research object, goal and context'));
    const fields = el('div', { class: 'pj-document-fields' });
    if (project.ziel) fields.append(el('section', {}, el('h4', { text: tr('Ziel', 'Goal') }), projectMarkdown(project.ziel, project)));
    if (project.ergebnis && L.voll(project.ergebnis) !== L.voll(project.ziel)) fields.append(el('section', {}, el('h4', { text: tr('Angestrebtes Ergebnis', 'Intended result') }), projectMarkdown(project.ergebnis, project)));
    const context = el('div', { class: 'pj-kontext' }, ...(project.kurz || []).filter(text => text && ![project.ziel,project.stand,project.ergebnis].some(value => L.voll(value) === L.voll(text))).map(text => projectMarkdown(text, project)));
    object.append(fields, context);
    const status = el('div', { class: 'pj-source-status' });
    const contribution = el('div', { class: 'pj-source-contribution' });
    const history = el('div', { class: 'pj-source-history' });
    const sources = documentSection(tr('Quellen und Belege', 'Sources and evidence'));
    const address = L.sourceReaderHref(project.links?.notiz, project.id);
    if (address) sources.append(el('p', {}, el('a', { href: address, text: tr('Vollständige Originalquelle öffnen', 'Open complete original source') })));
    const original = el('div', { class: 'pj-original-document' }); sources.append(original);
    const path = project.links?.notiz;
    if (path && !/^[a-z]+:\/\//i.test(path)) {
      if (!documentLoads.has(path)) documentLoads.set(path, fetch('/api/source?' + new URLSearchParams({ path }), { cache: 'no-store' }).then(async response => {
        if (!response.ok) throw new Error('source unavailable');
        const source = await response.json();
        if (source?.path !== path || typeof source.text !== 'string' || !/^[a-f0-9]{64}$/.test(source.revision || '')) throw new Error('invalid source');
        return source;
      }));
      documentLoads.get(path).then(source => {
        if (!object.isConnected) return;
        original.replaceChildren(el('p', { class: 'pj-source-revision', text: tr('Gelesene Originalrevision: ', 'Original revision read: ') + source.revision }),
          el('details', {}, el('summary', { text: tr('Vollständiger Originaltext', 'Complete original text') }), el('pre', { class: 'pj-source-original', text: source.text })));
        const sections = documentSections(source.text);
        const references = new Set(sourceReferenceLabels(sections));
        documentReferences.set(path, { revision: source.revision, labels: references });
        for (const marker of object.closest('.pj-detail').querySelectorAll('[data-pending-source-ref]')) {
          const label = marker.dataset.pendingSourceRef;
          if (project.quellenrevision === source.revision && references.has(label)) marker.replaceWith(el('a', { href: L.sourceReaderHref(path, project.id, 'Sources'), class: 'pj-citation', 'data-source-ref': label, title: tr('Originale Quelldefinition ', 'Original source definition ') + label, text: label }));
        }
        const sourceList = sections.filter(section => documentSectionGroup(section) === 'sources');
        if (sourceList.length) original.prepend(...sourceBlocks(sourceList, project));
        const uniqueOwner = projekte.filter(item => item.links?.notiz === path).length === 1;
        const current = !project.quellenrevision || source.revision === project.quellenrevision;
        if (!current) original.prepend(el('p', { class: 'pj-source-changed', role: 'status', text: tr('Die Originalquelle hat sich seit der gespeicherten Projektrevision geändert. Gespeicherter Kontext und gelesener Originaltext werden getrennt gezeigt.', 'The original source has changed since the saved project revision. Saved context and the original text read are shown separately.') }));
        const structured = uniqueOwner && current && sections.some(section => ['object', 'contribution', 'history', 'today'].includes(documentSectionGroup(section)));
        if (!uniqueOwner || !current) return;
        if (!structured) {
          context.append(el('details', { class: 'pj-full-context' }, el('summary', { text: tr('Vollständige dokumentierte Abschnitte', 'Complete documented sections') }), ...sourceBlocks(sections.filter(section => documentSectionGroup(section) !== 'sources'), project)));
          return;
        }
        const groups = group => sections.filter(section => documentSectionGroup(section) === group);
        const objects = groups('object');
        if (objects.length) fields.append(...sourceBlocks(objects, project));
        const summaries = groups('summary');
        for (const block of sourceBlocks(summaries, project)) object.insertBefore(block, fields);
        const remaining = groups('context');
        if (summaries.length || remaining.length) {
          const saved = el('details', { class: 'pj-full-context' }, el('summary', { text: tr('Vollständiger dokumentierter Kontext', 'Complete documented context') }),
            ...sourceBlocks(remaining, project));
          const snapshot = el('details', { class: 'pj-saved-context' }, el('summary', { text: tr('Gespeicherter Projektkontext', 'Saved project context') }), ...context.childNodes);
          context.replaceChildren(saved, snapshot);
        }
        const todaySections = groups('today');
        if (todaySections.length) today.append(...sourceBlocks(todaySections, project));
        const statusSections = groups('status');
        if (statusSections.length) status.append(documentSection(tr('Dokumentierter Stand und Bedingungen', 'Documented status and conditions'), ...sourceBlocks(statusSections, project)));
        const own = groups('contribution');
        if (own.length) contribution.append(documentSection(tr('Eigener Beitrag und Zuständigkeit', 'Own contribution and responsibility'), ...sourceBlocks(own, project)));
        const past = groups('history');
        if (past.length) history.append(documentSection(tr('Dokumentierter Verlauf', 'Documented history'), ...sourceBlocks(past, project)));
      }).catch(() => {
        if (object.isConnected) original.append(el('p', { class: 'pj-source-unavailable', text: tr('Die Originalquelle ist derzeit nicht lesbar. Der vollständige gespeicherte Projektkontext bleibt erhalten.', 'The original source is currently unavailable. The complete saved project context remains available.') }));
      });
    }
    return { today, object, status, contribution, history, sources };
  }


  function detail(p) {
    if (!p) return el('section', { class: 'pj-detail' }, el('p', { class: 'leer', text: tr('Kein Projekt im gewählten Thema', "No project in the selected category") }));
    const istBaum = hatBaum(p.aufgaben);
    const offen = offenePunkte(p);
    const zuordnung = arbeitsZuordnung(p, offen);
    const dich = zuordnung.rest.map((entscheidung) => ({ art: 'entscheidung', entscheidung }));
    const aufgabe = naechste(p.aufgaben);
    const gezeigt = new Set(zuordnung.rest.map((e) => e.id));
    for (const punkt of zuordnung.assignments.values()) gezeigt.add(punkt.id);
    const documentation = projectDocumentation(p);
    const hasAssignments = projektAuftraege(p, L.lanes, L.laneKey).length > 0;
    const auftragsteil = hasAssignments || location.hash === '#projekt-auftraege' ? el('section', { class: 'pj-abschnitt pj-auftragsbereich', id: 'projekt-auftraege', tabindex: '-1' },
      el('h3', { text: tr('Projektteam und Aufträge', "Project team and assignments") }),
      hasAssignments ? zustaendig(p, zuordnung) : el('p', { text: tr('Kein eindeutig zugeordneter Operatorenauftrag in den gelieferten Quellen erfasst.', 'No unambiguously assigned operator task is recorded in the supplied sources.') })) : null;
    const unten = [verbindungen(p), entscheidungen(p, offen)].filter(Boolean);
    const berichte = W.LEITSTAND_BERICHTE?.list(p.id).length ? W.LEITSTAND_BERICHTE.create(p.id) : null;
    const zugaenge = W.LEITSTAND_ZUGAENGE?.create(p.id);
    const optionalText = [tr('Lass uns Ziel und dokumentierten Stand dieses Projekts besprechen.', 'Let us discuss this project’s goal and documented status.'), p.ziel, p.stand].filter(Boolean).join('\n\n');
    const conversation = A.projectDiscussion(p.id) || el('details', { id: 'project-optional-conversation-' + p.id, class: 'pj-optional-project-conversation' },
      el('summary', { text: tr('Projekt besprechen', 'Discuss project') }),
      A.discussion({ id: 'project-conversation-' + p.id, entryId: p.id, entry: p.id, projekt: p.id, text: optionalText, frage: optionalText }, {
        ziel: 'punkt', purpose: 'Optional project conversation', projectContext: { id: p.id },
      }));
    return el('article', { class: 'pj-detail', 'aria-labelledby': 'pj-titel' },
      meldung ? el('p', { class: 'meldung', role: 'status', text: meldung }) : null,
      kopf(p),
      documentation.today,
      documentation.object,
      p.stand || dich.length ? documentSection(tr('Stand und offene Bedingungen', 'Status and open conditions'), erste(p, dich, false), documentation.status) : documentation.status,
      documentation.contribution,
      conversation ? el('section', { class: 'pj-abschnitt pj-project-conversation' }, el('h3', { text: tr('Projektgespräch', "Project discussion") }), conversation) : null,
      L.projektMeilenstein(p.id) ? el('p', { class: 'pj-meilenstein' }, tr('Projektmeilenstein ', 'Project milestone '), datumTeil(L.projektMeilenstein(p.id).datum), ' ', L.projektMeilenstein(p.id).text) : null,
      auftragsteil,
      istBaum ? baum(p, offen, gezeigt, zuordnung, aufgabe) : schritte(p, zuordnung, aufgabe),
      unten.length ? el('div', { class: 'pj-unten' }, ...unten) : null,
      documentation.history,
      documentation.sources,
      wissen(p),
      zugaenge?.childElementCount ? zugaenge : null,
      berichte);
  }

  // Without a project in the address, the first visible one with a task
  // tree opens, in list order, else the first visible one; no id is fixed.
  function erstesSichtbares() {
    const liste = gruppen(projekte.filter(sichtbar)).flatMap((g) => g.projekte);
    return (liste.find((p) => hatBaum(p.aufgaben)) || liste[0])?.id || null;
  }

  function adresse(id, push) {
    const url = new URL(location.href);
    if (url.searchParams.get('projekt') === id) return;
    url.searchParams.set('projekt', id);
    history[push ? 'pushState' : 'replaceState']({ projekt: id }, '', url);
  }

  function waehle(id, { push = false, fokus = false } = {}) {
    if (!byId.has(id)) return;
    meldung = '';
    gewaehlt = id;
    if (!sichtbar(byId.get(id))) S.waehlen(null);
    adresse(id, push);
    zeichnen();
    const box = document.querySelector('.pj-detail');
    // Narrower screens put the detail above the list, so a choice in the list
    // scrolls it into view and moves the focus to its title, as a connection
    // does, so the focus order follows the visual one (WCAG 2.4.3). Beside
    // the list, drawing replaces the list, so a choice keeps the focus on its
    // row.
    const schmal = matchMedia('(max-width: 70rem)').matches;
    if (schmal) box?.scrollIntoView({ block: 'start' });
    box?.scrollTo?.({ top: 0 });
    if (fokus || schmal) document.getElementById('pj-titel')?.focus({ preventScroll: true });
    else document.querySelector(`.pj-zeile[data-projekt="${CSS.escape(id)}"]`)?.focus({ preventScroll: true });
  }

  function zeichnen() {
    const box = document.getElementById('projekte');
    if (!DATEN) {
      box.replaceChildren(el('p', { class: 'meldung', text: tr('Die Projektdaten sind derzeit nicht verfügbar.', "Project data is currently unavailable.") }));
      return;
    }
    // A choice the theme filter hides gives way to the first visible project.
    if (!gewaehlt || !sichtbar(byId.get(gewaehlt))) {
      const ersatz = erstesSichtbares();
      if (gewaehlt && ersatz) meldung = tr(`${byId.get(gewaehlt).titel} gehört nicht zum gewählten Thema, unter alle steht es.`, `${byId.get(gewaehlt).titel} is outside this category; find it under All.`);
      gewaehlt = ersatz;
      if (gewaehlt) adresse(gewaehlt, false);
    }
    const p = gewaehlt ? byId.get(gewaehlt) : null;
    document.title = p ? tr(`Mission Control, Projekte, ${p.titel}`, `Mission Control, Projects, ${p.titel}`) : tr('Mission Control, Projekte', 'Mission Control, Projects');
    box.replaceChildren(el('div', { class: 'pj-flaeche' }, el('div', { class: 'pj-links-spalte' }, liste()), detail(p)));
  }

  // Only a rendered team row of the selected project is a return target.
  function fokusAuftrag() {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return false; }
    const row = document.getElementById(id);
    if (row?.matches('#projekt-auftraege, #projekt-verbindungen')) {
      row.scrollIntoView({ block: 'center' });
      row.focus({ preventScroll: true });
      return true;
    }
    if (!row?.matches('.pj-team-auftrag')) return false;
    row.scrollIntoView({ block: 'center' });
    (row.querySelector('.pj-auftrag[href]') || row).focus({ preventScroll: true });
    return true;
  }

  // The address names the project; an unknown one falls back with a note.
  function ausAdresse() {
    const id = new URLSearchParams(location.search).get('projekt');
    if (id && byId.has(id)) {
      // An explicit destination must survive an unrelated remembered category.
      gewaehlt = id;
      if (!sichtbar(byId.get(id))) S.waehlen(null);
      return id;
    }
    if (id) meldung = tr(`Kein Projekt unter „${id.slice(0, 80)}“, hier ist das erste.`, `No project at “${id.slice(0, 80)}”; showing the first project.`);
    return null;
  }

  gewaehlt = ausAdresse();
  // Back and Forward show the project of the address and bring it into view
  // as a choice does: beside the list its marked row, above the list on
  // narrower screens the detail with its title (F11).
  window.addEventListener('popstate', () => {
    const id = ausAdresse();
    if (!id) return;
    gewaehlt = id;
    zeichnen();
    // One frame later, as the browser restores the scroll position of the
    // history entry after popstate and would undo it.
    requestAnimationFrame(() => {
      if (fokusAuftrag()) return;
      if (matchMedia('(max-width: 70rem)').matches) {
        document.querySelector('.pj-detail')?.scrollIntoView({ block: 'start' });
        document.getElementById('pj-titel')?.focus({ preventScroll: true });
      } else {
        const row = document.querySelector(`.pj-zeile[data-projekt="${CSS.escape(id)}"]`);
        row?.scrollIntoView({ block: 'nearest' });
        row?.focus({ preventScroll: true });
      }
    });
  });
  for (const event of ['mission-control-demo-antwort', 'mission-control-demo-uebertragung']) document.addEventListener(event, zeichnen);
  // Briefing loading can finish after window.load; focus requires the first real draw.
  let firstDraw = true;
  S.mount(document.getElementById('kopf'), { view: 'projekte', onFilter: () => {
    zeichnen();
    if (firstDraw) { firstDraw = false; requestAnimationFrame(fokusAuftrag); }
  }, onBriefings: () => {
    const host = document.querySelector('.pj-project-conversation');
    const conversation = gewaehlt && A.projectDiscussion(gewaehlt);
    if (host && conversation) A.refreshWithDrafts(host, () => host.replaceChildren(host.querySelector('h3'), conversation));
  } });
  requestAnimationFrame(fokusAuftrag);
  // Native fragment navigation can run after the first draw and focus its
  // container again. Restore the actual result link after document loading.
  window.addEventListener('load', () => requestAnimationFrame(fokusAuftrag), { once: true });
  window.addEventListener('hashchange', () => requestAnimationFrame(fokusAuftrag));
})();
