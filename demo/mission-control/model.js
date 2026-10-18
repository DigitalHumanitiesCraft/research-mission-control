// Shared read-only model for the Mission Control views. Reads window.PRUEFANSICHT
// (ACTIVE-WORK via make_data.py), window.LAB_LANES (lane files via
// make_lab_lanes.py), window.ERLEDIGT (Erledigt-Log via make_erledigt.py) and
// window.KALENDER_GOOGLE (work calendars via make_kalender_google.py, absent
// until a session fetched them), whose times sharpen conflicts().
// Views never mutate these objects; operator answers live in localStorage,
// see store(), and reach the inbox via antworten.js. dringend() derives the
// urgent rows of Du heute in the Übersicht, abnahmen() the finished lanes
// waiting on acceptance and fragenNachFolge() the red and grey questions
// every count shows.
(function () {
  'use strict';
  const tr = (de, en) => window.UI_LANGUAGE ? window.UI_LANGUAGE.t(de, en) : de;
  const AW = window.PRUEFANSICHT || { eintraege: [], posten: [], einheiten: [], stand: '' };
  const LL = window.LAB_LANES || { lanes: [], generated: '' };
  const ER = window.ERLEDIGT || { lines: [], stand: '' };
  const G = window.KALENDER_GOOGLE?.termine ? window.KALENDER_GOOGLE : null;

  // The file key keeps routing stable while Rollentitel supplies the visible
  // role. Former names in Aliases still resolve older data, answers and
  // ACTIVE-WORK markers through their source, never through a fixed table.
  const stillgelegt = (l) => String(l.report?.State || l.state || '').toUpperCase() === 'RETIRED';
  const roh = (LL.lanes || []).filter((l) => !stillgelegt(l));
  const aliasListe = (l) => (Array.isArray(l.aliases) ? l.aliases : []).map((a) => String(a).trim().toLowerCase()).filter(Boolean);
  // Current key of a key or former name (case-insensitive), or '' when no
  // active operator answers to it.
  function aufgeloest(stem) {
    const s = String(stem ?? '').trim().toLowerCase();
    if (!s) return '';
    return (roh.find((l) => l.key === s) || roh.find((l) => aliasListe(l).includes(s)))?.key || '';
  }
  const laneKey = (stem) => aufgeloest(stem) || String(stem ?? '').trim().toLowerCase();
  // The orchestrator is the operator that coordinates: the file
  // orchestrator.md, else the one whose role title names the orchestrator.
  const ORCH_KEY = (roh.find((l) => l.key === 'orchestrator') || roh.find((l) => /orchestrator/i.test(l.rollentitel || '')))?.key || '';
  // Display order: the orchestrator first, then the order of the data file.
  const laneRang = (key) => {
    const k = laneKey(key);
    if (k && k === ORCH_KEY) return 0;
    const i = roh.findIndex((l) => l.key === k);
    return 1 + (i < 0 ? roh.length : i);
  };
  // The existing role-title source supplies display names; keys retain routing identity.
  const laneName = (key) => {
    const address = aufgeloest(key) || key;
    const title = String(roh.find((lane) => lane.key === address)?.rollentitel || '').trim();
    return title && title !== String(address) ? title : address;
  };
  // Steps in ACTIVE-WORK end with a marker such as "(Lane Codex)"; one that
  // names an operator or a former name of one shows its key, while quoted
  // source text otherwise stays verbatim.
  function laneMarker(text) {
    return String(text ?? '').replace(/\(Lane ([\p{L}-]+)\)/gu, (m, wort) => {
      const k = aufgeloest(wort);
      return k ? `(${laneName(k)})` : m;
    });
  }

  // Day thresholds shared by every view: nah marks a date as imminent, bald
  // as coming soon, warten bounds the date window and the wait that counts
  // as long, alt marks an old question.
  const SCHWELLEN = Object.freeze({ nah: 3, bald: 14, warten: 28, alt: 42 });
  // Windows of dringend() in days after today, set by the operator on
  // 15 October 2026: a step deadline due within frist days, a date conflict
  // within konflikt days, an appointment within termin days.
  const DRINGEND = Object.freeze({ frist: 7, konflikt: 14, termin: 2 });
  // The rule in words, for the tooltip of the headings that list these rows.
  const DRINGEND_REGEL = tr(`Abgeleitet aus ACTIVE-WORK: Fristen, die verstrichen sind oder in den nächsten ${DRINGEND.frist} Tagen fallen, Terminkonflikte in den nächsten ${DRINGEND.konflikt} Tagen und Termine in den nächsten ${DRINGEND.termin} Tagen. Fragen der Lanes und aus ACTIVE-WORK stehen in der Sicht Fragen.`, `Derived from ACTIVE-WORK: overdue deadlines or deadlines within ${DRINGEND.frist} days, scheduling conflicts within ${DRINGEND.konflikt} days and appointments within ${DRINGEND.termin} days. Operator and ACTIVE-WORK questions appear under Decide.`);
  const WOCHENTAGE = [tr("Sonntag", "Sunday"), tr("Montag", "Monday"), tr("Dienstag", "Tuesday"), tr("Mittwoch", "Wednesday"), tr("Donnerstag", "Thursday"), tr("Freitag", "Friday"), tr("Samstag", "Saturday")];

  // Answer kinds by their consequence, matching LEITSTAND_KINDS in serve.py.
  const ENTSCHEIDUNG = new Set(['ja', 'nein', 'aendern']);
  const AUFTRAG = new Set(['recherche-vault', 'recherche-web', 'beispiel', 'kontext', 'zeigen', 'nachdenken',
    'rueckfrage', 'erledigen', 'pruefen', 'streichen']);
  // Delegations are named delegieren-<key>, one per operator, so they follow
  // the lane data; an older answer keeps counting as an order after a rename.
  // LEITSTAND_KINDS in serve.py still lists the three keys before the rename
  // of 15 October 2026 and refuses the others until it follows the lane data.
  const istAuftrag = (art) => AUFTRAG.has(art) || /^delegieren-[a-z0-9-]+$/.test(art);

  const LANE_ZUSTAND = { RUN: tr('läuft', 'Running'), ACTIVE: tr('aktiv', 'Active'), DONE: tr('fertig', 'Complete'), IDLE: tr('wartet', 'Waiting'), BLOCKED: tr('blockiert', 'Blocked') };

  // States of a row in the table Aufträge of an operator file (decisions
  // E-abnahme-jeder-lane and E-abnahme-ab-jetzt of 15 October 2026): erledigt
  // waits on the acceptance of the Human User, abgenommen is closed and never
  // counts as open, as waiting or as an acceptance. Every view asks these
  // two predicates instead of comparing state words.
  const AUFTRAG_ZUSTAENDE = Object.freeze(['vergeben', 'läuft', 'blockiert', 'erledigt', 'abgenommen']);
  const auftragOffen = (a) => a?.zustand !== 'erledigt' && a?.zustand !== 'abgenommen';
  const wartetAufAbnahme = (a) => a?.zustand === 'erledigt';
  // Display order of an operator's open lanes, in the Aufstellung and on the
  // Lage board: blocked first, then running, then assigned; any other state last.
  const AUFTRAG_RANG = Object.freeze({ blockiert: 0, 'läuft': 1, vergeben: 2 });
  const auftragRang = (a) => AUFTRAG_RANG[a?.zustand] ?? 9;
  // The state of an open assignment in words, as the row Zuständig of
  // Projekte reads it; an unknown state stays as written.
  const AUFTRAG_WORT = Object.freeze({ vergeben: tr('vergeben, noch nicht abgeholt', 'Assigned, not yet picked up'), 'läuft': tr('abgeholt, läuft', 'Picked up, running'), blockiert: tr('blockiert', 'Blocked'), erledigt: tr('erledigt', 'Complete'), abgenommen: tr('abgenommen', 'Accepted') });
  const auftragWort = (z) => AUFTRAG_WORT[z] || z || tr('Zustand unbekannt', 'State unknown');
  // Key of an acceptance answer in mission-control-demo-d-antworten, the same lane and
  // Kennung the inbox of serve.py keys it by (store_acceptance).
  const abnahmeId = (lane, kennung) => `abnahme:${lane}:${kennung}`;
  const ABNAHME_ARTEN = new Set(['abgenommen', 'zurueck']);

  const postenById = new Map(AW.posten.map((p) => [p.id, p]));
  const entryById = new Map(AW.eintraege.map((e) => [e.id, e]));

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // Display text of source wording. The interface never shows the middle
  // dot (the operator's rule, lane IDs carry it) nor, in a cut text, a
  // semicolon (surface rule 7); code marks drop and whitespace collapses.
  // shell.js passes ohnePunkt and voll on to the views; the Übersicht and
  // the Lage board read them here, as their pure parts run in Node without
  // shell.js.
  const ohnePunkt = (t) => String(t ?? '').replace(/\s*·\s*/g, ', ');
  // Source text as it reads in full, without code marks, on one line.
  const voll = (t) => ohnePunkt(t).replace(/`/g, '').replace(/\s+/g, ' ').trim();
  // The same without semicolon, for the text of the operator cards and the board.
  const rein = (t) => voll(t).replace(/\s*;\s*/g, ', ').trim();
  // Cut at a word boundary after at most max characters; the "…" binds to
  // the last word by a no-break space, so it never wraps alone.
  function schnitt(text, max) {
    const t = rein(text);
    if (t.length <= max) return t;
    return `${t.slice(0, max + 1).replace(/\s+\S*$/, '').replace(/[\s.,:–-]+$/, '')} …`;
  }
  // ISO dates inside source text in German form, without code marks. A
  // date inside an id such as LLM-FOERDERUNG-2026-10-15 stays as written.
  const datumImText = (text) => String(text ?? '').replace(/(?<![\w-])(\d{4})-(\d{2})-(\d{2})\b/g, '$3.$2.$1').replace(/`/g, '');
  // Entry names in the vault convention may start with their creation date,
  // which says nothing in a row; the views show the name without it.
  const nameOhneDatum = (name) => String(name ?? '').replace(/^\d{4}-\d{2}-\d{2}\s+/, '');

  // Local calendar day of a Date as ISO; toISOString would count in UTC and
  // shift the day east of it. uhrVon gives its local time as HH:MM.
  const zwei = (n) => String(n).padStart(2, '0');
  const localIso = (d) => `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}`;
  const uhrVon = (d) => `${zwei(d.getHours())}:${zwei(d.getMinutes())}`;

  function todayIso() {
    return localIso(new Date());
  }

  function fmt(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.slice(0, 10).split('-');
    return window.UI_LANGUAGE?.language === 'en' ? new Date(`${y}-${m}-${d}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : `${d}.${m}.`;
  }

  function fmtLang(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.slice(0, 10).split('-');
    return window.UI_LANGUAGE?.language === 'en' ? new Date(`${y}-${m}-${d}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : `${d}.${m}.${y}`;
  }

  // Abbreviations whose period never ends a sentence. Multi-letter ones match
  // in any case; single letters only as written, so "Variante A. Danach" ends.
  const ABKUERZUNGEN = new Set(['nr', 'abs', 'art', 'bd', 'bzw', 'ca', 'ggf', 'inkl', 'jh', 'mio', 'prof', 'dr', 'st', 'vgl', 'etc', 'hrsg', 'aufl', 'kap']);
  const ABKUERZUNG_BUCHSTABE = new Set(['S', 'z', 'B', 'u', 'a']);

  function isSentenceEnd(t, index) {
    const wort = (/(\S+)$/.exec(t.slice(0, index))?.[1] || '').replace(/^[^\p{L}\p{N}]+/u, '');
    if (/[0-9]$/.test(wort)) return false;
    return wort.length === 1 ? !ABKUERZUNG_BUCHSTABE.has(wort) : !ABKUERZUNGEN.has(wort.toLowerCase());
  }

  // First-sentence label: the operator decided that a step begins with a short
  // sentence and the reasoning follows, so the label is the text up to the
  // first strong boundary, cut at a word boundary after maxWords.
  function shortLabel(text, maxWords = 9) {
    const t = laneMarker(text).replace(/\s+/g, ' ').replace(/`/g, '').trim();
    if (!t) return '';
    // A sentence end is a period followed by a space, unless it closes an
    // ordinal number ("am 5. Oktober"), a date ("20.10. 15 Uhr") or an
    // abbreviation ("UFL Nr. 6 vorbereiten", "z. B. die Folien").
    let cut = t.length;
    const clause = /,\s|;\s|\s\(|:\s/;
    for (const m of t.matchAll(/\.\s/g)) {
      if (isSentenceEnd(t, m.index)) { cut = m.index; break; }
    }
    const m2 = clause.exec(t);
    if (m2 && m2.index < cut && t.slice(0, m2.index).split(' ').length >= 3) cut = m2.index;
    let head = t.slice(0, cut).trim();
    const words = head.split(' ');
    const truncated = words.length > maxWords;
    if (truncated) head = words.slice(0, maxWords).join(' ') + ' …';
    return head.replace(/[.,;:]$/, '');
  }

  // Decision labels preserve the complete source wording; punctuation and
  // word budgets do not identify the scope of a question.
  function questionLabel(text) {
    return laneMarker(String(text ?? '')).replace(/\s+/g, ' ').replace(/`/g, '').trim();
  }

  function norm(s) {
    return String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss');
  }

  function points(e) {
    return (e.posten || []).map((id) => postenById.get(id)).filter(Boolean);
  }

  // Answers carry kind, revision and transfer state from LEITSTAND_ANTWORTEN.all() or raw
  // from localStorage, where older records carry urteil with spelled-out
  // umlauts instead of art.
  function artOf(a) {
    const v = String(a?.art ?? a?.urteil ?? '').toLowerCase();
    if (v.startsWith('änd')) return 'aendern';
    if (v.startsWith('spät')) return 'spaeter';
    return v;
  }

  function beauftragt(punktId, antworten = {}) {
    return antwortStatus(punktId, antworten) === 'beauftragt';
  }

  // Revisionless historic records cannot answer a revision-bound question.
  // A step's id already hashes its wording; older records keyed by that id
  // stay bound to the same step even without a separate revision field.
  function antwortAktuell(item, antwort) {
    if (!item || !antwort) return false;
    const schritt = item.art === 'schritt';
    if (antwort.ziel && antwort.ziel !== (schritt ? 'schritt' : 'punkt')) return false;
    if (antwort.entry && antwort.entry !== (schritt ? item.teilVon : item.projekt)) return false;
    if (item.revision) return antwort.revision === item.revision;
    if (schritt) return !antwort.revision || antwort.revision === item.id;
    return !antwort.revision;
  }

  function antwortStatus(id, antworten = {}, today = todayIso()) {
    const a = antworten?.[id];
    const art = artOf(a);
    if (!art) return 'offen';
    if (id.startsWith('abnahme:') && ABNAHME_ARTEN.has(art)) {
      if (a.fehler) return 'nicht-uebertragen';
      return a.uebertragen ? 'entschieden' : 'gespeichert';
    }
    const item = postenById.get(id) || AW.einheiten.find((u) => u.id === id && u.art === 'schritt');
    if (!antwortAktuell(item, a)) return 'ueberholt';
    // Deferral is a local reading choice too; failed transport must not
    // bring a deliberately postponed current question straight back.
    if (art === 'spaeter') return a.bis && a.bis > today ? 'spaeter' : 'offen';
    if (a.fehler) return 'nicht-uebertragen';
    if (!a.uebertragen) return 'gespeichert';
    if (istAuftrag(art)) return 'beauftragt';
    return ENTSCHEIDUNG.has(art) ? 'entschieden' : 'offen';
  }

  // A point postponed until today is back today, so only a later date counts.
  function offenePunkte(e, antworten = {}, today = todayIso()) {
    return points(e).filter((p) => {
      const status = antwortStatus(p.id, antworten, today);
      if (status === 'entschieden' || status === 'spaeter') return false;
      if (p.zurueckgestelltBis && p.zurueckgestelltBis > today) return false;
      return true;
    });
  }

  function laneState(lane) {
    const kuerzel = String(lane?.state ?? '').toUpperCase();
    return { wort: LANE_ZUSTAND[kuerzel] || kuerzel.toLowerCase() || tr('unbekannt', 'Unknown'), kuerzel };
  }

  function groupOf(e, antworten = {}) {
    if (e.status === 'ruhend' || e.status === 'abgeschlossen') return 'ruhend';
    if (offenePunkte(e, antworten).length > 0) return 'dich';
    if (e.status === 'wartend' || e.status === 'angebot-gelegt' || (e.wartetAuf && e.wartetAuf.trim())) return 'andere';
    return 'bereit';
  }

  function allDates(e) {
    const out = (e.termine || []).map((t) => ({ datum: t.datum, text: t.text }));
    if (e.milestone && /^\d{4}-\d{2}-\d{2}/.test(e.milestone)) {
      const datum = e.milestone.slice(0, 10);
      if (!out.some((t) => t.datum === datum)) out.push({ datum, text: e.milestone.slice(10).trim() || 'Meilenstein' });
    }
    return out.sort((a, b) => a.datum.localeCompare(b.datum));
  }

  function nextDate(e, today = todayIso()) {
    const d = allDates(e).find((t) => t.datum >= today);
    return d ? d.datum : '';
  }

  // Current assignment identities precede the older free-text inference.
  function laneEntry(lane) {
    if (Array.isArray(lane.auftraege)) {
      const current = lane.auftraege.filter((a) => a.auftrag && a.zustand !== 'abgenommen');
      const ids = [...new Set(current.map((a) => a.vorhaben).filter(Boolean))];
      if (current.some((a) => a.vertragsfehler || !entryById.has(a.vorhaben))) return { entryId: '', entryIssue: 'Vorhaben im Auftrag nicht zugeordnet' };
      if (ids.length === 1) return { entryId: ids[0], entryIssue: '' };
      return { entryId: '', entryIssue: ids.length ? 'Mehrere Vorhaben, kein einzelner Projektkontext' : 'Kein aktuelles Vorhaben zugeordnet' };
    }
    const hay = norm((lane.lane_id || '') + ' ' + (lane.goal || ''));
    let best = null;
    for (const e of AW.eintraege) {
      if (e.status === 'abgeschlossen') continue;
      const first = norm(e.name).split(/[\s,:]+/)[0];
      if (first.length >= 4 && new RegExp('(^|[^a-z0-9])' + first.replace(/[^a-z0-9-]/g, '') + '([^a-z0-9]|$)').test(hay)) { best = e.id; break; }
    }
    if (!best && /orchestrator|lagebild|active-work/.test(hay)) {
      const rmc = AW.eintraege.find((e) => /research mission control/i.test(e.name));
      if (rmc) best = rmc.id;
    }
    return { entryId: best || '', entryIssue: best ? '' : 'Vorhaben nicht zugeordnet' };
  }

  // Every operator besides the orchestrator is a Research Operator.
  const rolleVon = (key) => (key && key === ORCH_KEY ? 'Orchestrator' : 'Research Operator');

  // AI systems recognised in the free harness text of a lane file, for the
  // harness mark of icons.js. Codex is an OpenAI harness and shares the mark
  // of GPT, but is named Codex.
  const SYSTEME = [
    { key: 'claude', name: 'Claude', test: /claude/i },
    { key: 'gemini', name: 'Gemini', test: /gemini/i },
    { key: 'gpt', name: 'Codex', test: /codex/i },
    { key: 'gpt', name: 'GPT', test: /gpt|openai/i },
  ];
  // System of a harness text as {key, name}, or null for an unknown harness.
  const systemVon = (harness) => SYSTEME.find((s) => s.test.test(String(harness ?? ''))) ?? null;

  // Reports describe the operator, not necessarily each of its assignments.
  // Only a sole open assignment may inherit a BLOCKED report. Otherwise a
  // reason must name the assignment explicitly. Unknown responsibility stays unknown.
  function assignmentWait(l, a) {
    if (a.zustand !== 'blockiert') return null;
    const r = l.report || {};
    const source = String(r.Blocker || '').trim();
    const open = (l.auftraege || []).filter((x) => x.auftrag && auftragOffen(x));
    const named = a.kennung && source.includes(a.kennung);
    const sole = open.length === 1 && String(r.State || l.state).toUpperCase() === 'BLOCKED';
    if (!named && !sole) return null;
    const reason = named ? source.slice(source.indexOf(a.kennung)) : source;
    if (!reason || /^(none|keine?)(?:\b|$)/i.test(reason)) return null;
    // This explicit positive wording is supported by the current source.
    // Do not guess a recipient from arbitrary mentions of an operator.
    const human = /^Abnahme durch den Operator ausstehend\./i.test(reason);
    const need = String(r['Brauche von'] || '').match(/^Operator:\s*(.+)$/i)?.[1];
    return { reason, human, contribution: human ? (need || r['Operator point'] || reason) : reason };
  }

  let operatorReports = {};
  function setOperatorBriefings(reports) { operatorReports = reports; }

  // A shared draft needs explicit project scope; project membership alone grants none.
  function projectConversations(projectId) {
    if (!entryById.has(projectId)) return [];
    return Object.entries(operatorReports).flatMap(([operator, report]) => {
      const lane = lanes.find(candidate => candidate.key === operator);
      if (!lane || lane.paused || lane.setup === 'planned') return [];
      if (!report.source || !report.conversationProposal || !report.conversationProjectIds?.includes(projectId)) return [];
      return [{ operator, projectId, text: report.conversationProposal, reportedAt: report.reportedAt,
        source: report.snapshotPath || '', revision: report.snapshotPath || '', checked: report.checked || '' }];
    });
  }

  const mitVorhaben = (a) => ({ ...a, entryId: !a.vertragsfehler && entryById.has(a.vorhaben) ? a.vorhaben : '' });

  // Explicit absence and historical acceptance are report metadata. Preserve
  // negative statements and mixed requests rather than inferring no question.
  function operatorContribution(value) {
    const structured = value && typeof value === 'object';
    const text = String(structured ? value.text || '' : value || '').trim();
    const result = kind => ({ kind, text: ['question', 'discussion'].includes(kind) ? text : '', sourceText: text });
    if (!text || /^(?:none(?:\s+neu)?|keine?|nichts|n\/a|[–—-])\.?$/i.test(text)) return result('none');
    if (structured && value.kind === 'discussion') return result('discussion');
    const absence = /^(?:none(?:\s+(?:neu|für|for|als|zur|zum|im|aus|in|bei|nach|vor|während)\b|[.,;:]|$)|keine\s+(?:(?:aktuelle|zusätzliche|weitere)\s+)*(?:Frage|Nutzerfrage|Rückfrage|Pflichtfrage|Pflichtantwort)\b|kein\s+neuer\s+Input\b)/i.test(text);
    const noNewDecision = /^Keine notwendige neue Entscheidung für den Bericht\.(?: Gemeinsames Oberziel und persönlicher Qualitätsmaßstab bleiben offen, ohne sie erneut als Frage zu stellen\.)?$/i.test(text);
    const existingDecisions = /^Bestehende Projektentscheidungen bleiben offen\.?$/i.test(text);
    const technicalClosure = /^Für den technischen Abschluss keine weitere Eingabe erforderlich\.(?:\s+Bestehende fachliche Entscheidungen bleiben in ACTIVE-WORK unverändert offen\.)?$/i.test(text);
    const reservedAuthority = /^(?:Geschützte Vorschau|Geschützter redaktioneller Zugang)\b[^.!?]*\bbleiben (?:beim Human User|eigenständige fachliche Entscheidungen)\.\s*$/i.test(text);
    const request = /[?]|\b(?:bitte|please|soll|sollen|should|decide|ob|whether|muss|must|prüfe|beurteile)\b/i.test(text);
    const historical = /^(?:Bestehende persönliche|Historische inhaltliche|Persönliche (?:Frontend-)?Abnahme|Die inhaltliche Beurteilung)\b/i.test(text)
      && /bleib|kein neuer Punkt|offen/i.test(text);
    if (!request && (absence || historical || noNewDecision || existingDecisions || technicalClosure || reservedAuthority)) return result(historical || /Abnahme|Beurteilung der Ergebnisse/i.test(text) ? 'acceptance' : 'none');
    return result('question');
  }

  function operatorQuestion(value) {
    return operatorContribution(value).text;
  }

  const lanes = roh.map((l) => {
    const r = l.report || {};
    const planned = l.setup === 'planned' || l.einrichtung === 'geplant';
    const paused = !planned && l.pause?.paused === true && l.pause.source === 'demo-sources/' + l.key + '.md' && /^[a-f0-9]{64}$/.test(l.pause.revision || '') && l.pause.revision === l.setupRevision;
    return {
      key: l.key,
      name: laneName(l.key),
      rolle: rolleVon(l.key),
      laneId: l.lane_id || '',
      harness: l.harness || '',
      // Head table of the operator file; empty for a file without one.
      adresse: l.adresse || '',
      rollentitel: l.rollentitel || '',
      einrichtung: l.einrichtung || '',
      setup: planned ? 'planned' : l.setup === 'initialized' ? 'initialized' : 'unknown',
      setupSource: l.setupSource || '', setupRevision: l.setupRevision || '', setupError: l.setupError || '',
      paused, pause: paused ? l.pause : null,
      planning: l.planning && typeof l.planning === 'object' ? l.planning : null,
      umgebung: l.umgebung || '',
      rollenquelle: l.rollenquelle || '',
      arbeitsweise: l.arbeitsweise || '',
      aliases: Array.isArray(l.aliases) ? l.aliases.map(String) : [],
      state: (r.State || l.state || '').toUpperCase(),
      next: r['Next action'] || '',
      nextShort: shortLabel(r['Next action'] || '', 12),
      question: planned || paused ? '' : operatorQuestion(r['Operator point']),
      report: r,
      // Bullets under "Nachrichten an andere Lanes", the open questions and
      // the newest stand, read by the message and handover checks below.
      messages: Array.isArray(l.messages) ? l.messages.map(String) : [],
      open: Array.isArray(l.open) ? l.open.map(String) : [],
      standText: typeof l.stand === 'object' && l.stand ? String(l.stand.text || '') : '',
      ...laneEntry(l),
      fileDate: l.stand || l.generated || '',
      // Open assignments of the operator (Lane Protocol, Assignment list);
      // null for a lane file without the section, which keeps the older
      // one-task reading of the overview.
      auftraege: planned ? [] : Array.isArray(l.auftraege)
        ? l.auftraege.filter((a) => a.auftrag && auftragOffen(a)).map((a) => ({ ...mitVorhaben(a), wait: assignmentWait(l, a) }))
        : null,
      // Finished assignments waiting on acceptance, which abnahmen() lists
      // and the Übersicht also shows behind a fold, and the accepted ones,
      // which are closed.
      erledigt: !planned && Array.isArray(l.auftraege) ? l.auftraege.filter((a) => a.auftrag && wartetAufAbnahme(a)).map(mitVorhaben) : [],
      abgenommen: !planned && Array.isArray(l.auftraege) ? l.auftraege.filter((a) => a.auftrag && a.zustand === 'abgenommen').map(mitVorhaben) : [],
    };
  });

  // Each exact assignment keeps its own project. Only the absent-table
  // legacy case can use the older single-project mapping.
  function laneProjects(lane) {
    if (!Array.isArray(lane.auftraege)) return lane.entryId && entryById.has(lane.entryId) ? [entryById.get(lane.entryId)] : [];
    const tasks = [...lane.auftraege, ...lane.erledigt, ...lane.abgenommen];
    return [...new Set(tasks.map(task => task.entryId).filter(id => entryById.has(id)))].map(id => entryById.get(id));
  }

  // A report line describes the operator, not each of its lanes. It belongs
  // to a lane only when the line names the lane's Kennung, or when the lane
  // is the operator's only open one and the report is not a finished one,
  // as assignmentWait reads the Blocker. A finished lane is never the only
  // open one, so it needs its Kennung named.
  const LEER = /^(none|keine?)(?![\p{L}\p{N}])/iu;
  function zugeordnet(lane, a, text) {
    const t = String(text ?? '').trim();
    if (!t || LEER.test(t)) return false;
    if (nenntAuftrag(t, a.kennung)) return true;
    if (kennungen(t).length) return false;
    return auftragOffen(a) && (lane.auftraege || []).length === 1 && String(lane.report?.State || lane.state).toUpperCase() !== 'DONE';
  }

  // Evidence of a finished lane: the report's Evidence line when Result or
  // Evidence names the Kennung, since the report describes the operator's
  // newest work and may belong to another lane; else where to look.
  function nenntAuftrag(text, id) {
    if (!id) return false;
    let start = String(text || '').indexOf(id);
    while (start >= 0) {
      const before = text[start - 1] || ' ';
      const after = text[start + id.length] || ' ';
      const inside = (c, neighbor) => /[A-Za-z0-9_-]/.test(c) || (c === '.' && /[A-Za-z0-9_-]/.test(neighbor || ''));
      if (!inside(before, text[start - 2]) && !inside(after, text[start + id.length + 1])) return true;
      start = text.indexOf(id, start + id.length);
    }
    return false;
  }
  const BELEG_ORT = tr('Beleg im Report der Operator-Datei', 'Evidence in the operator file report');
  function belegVon(lane, a) {
    const r = lane.report || {};
    const evidence = String(r.Evidence || '').trim();
    const nennt = zugeordnet(lane, a, [r.Result, r.Evidence].filter(Boolean).join(' '));
    return nennt && evidence && !LEER.test(evidence) ? { text: evidence, ausBericht: true } : { text: BELEG_ORT, ausBericht: false };
  }

  // Every finished lane that waits on the acceptance of the Human User, in
  // the display order of the operators and the order of their tables:
  // {operator, kennung, auftrag, vorhaben, entryId, seit, beleg {text,
  // ausBericht}, id (key of its answer)}.
  function abnahmen() {
    return lanes.filter(lane => lane.setup !== 'planned' && !lane.paused).sort((x, y) => laneRang(x.key) - laneRang(y.key)).flatMap((lane) => lane.erledigt.map((a) => ({
      operator: lane.key, kennung: a.kennung || '', auftrag: a.auftrag || '', vorhaben: a.vorhaben || '', entryId: a.entryId,
      seit: a.seit || '', beleg: belegVon(lane, a), id: abnahmeId(lane.key, a.kennung || ''),
      abnahmeart: a.abnahmeart || 'inhaltlich', zweck: a.zweck || '',
      ergebnis: a.ergebnis || '', pruefung: a.pruefung || '', ergebnisZiele: a.ergebnisZiele || [],
      vertragsquelle: a.vertragsquelle, vertragsfehler: a.vertragsfehler || '',
      menschlich: !['Freigabe', 'unbekannt'].includes(a.abnahmeart),
    })));
  }

  function projektMeilenstein(entryId) {
    const raw = String(entryById.get(entryId)?.milestone || '');
    if (!/^\d{4}-\d{2}-\d{2}(?:\s|$)/.test(raw)) return null;
    return { datum: raw.slice(0, 10), text: raw.slice(10).trim() || 'Meilenstein' };
  }

  // Resolve only actual operator aliases; other documents keep their literal path.
  function sourceReaderHref(value, project = '', anchor = '') {
    let file = String(value || '').replace(/\\/g, '/');
    if (/[\x00-\x1f\x7f]/.test(file)) return '';
    const separator = file.indexOf('#');
    const fragment = separator < 0 ? '' : file.slice(separator + 1);
    if (separator >= 0) file = file.slice(0, separator);
    if (!file || file.startsWith('/') || /^[a-z]:/i.test(file) || /(?:^|\/)\.\.(?:\/|$)/.test(file)) return '';
    const key = laneKey(file.replace(/\.md$/i, ''));
    if (!file.includes('/') && lanes.some((lane) => lane.key === key)) file = 'demo-sources/' + key;
    return window.SECOND_BRAIN_VAULT?.href(file, anchor || fragment) || '';
  }

  // Commissioning, the next actor and missing input remain separate facts.
  function auftragsKontext(lane, task) {
    const report = lane.report || {};
    const belongs = nenntAuftrag([report.Result, report.Evidence].filter(Boolean).join(' '), task.kennung);
    const bound = (field) => belongs && !NICHTS.test(String(report[field] || '')) ? String(report[field] || '').trim() : '';
    const need = braucht(lane.key);
    const matchedNeed = need && zugeordnet(lane, task, report[need.quelle]) ? need : null;
    const kind = task.abnahmeart || 'inhaltlich';
    const finished = task.zustand === 'erledigt';
    const internal = finished && kind === 'Freigabe';
    let next = laneName(lane.key);
    let missing = bound('Blocker') || matchedNeed?.text || tr("Kein fehlender Beitrag erfasst", "No missing contribution recorded");
    if (matchedNeed) next = matchedNeed.von === 'operator' ? 'Human User' : matchedNeed.von ? laneName(matchedNeed.von) : matchedNeed.wer || tr("Nicht erfasst", "Not recorded");
    if (task.zustand === 'blockiert' && !bound('Blocker') && !matchedNeed) {
      next = tr("Nicht erfasst", "Not recorded");
      missing = tr("Fehlender Beitrag nicht erfasst", "Missing contribution not recorded");
    }
    if (finished) {
      next = kind === 'unbekannt' ? tr("Nicht erfasst", "Not recorded") : internal
        ? laneName(lane.key === ORCH_KEY ? 'review' : ORCH_KEY) : 'Human User';
      missing = kind === 'unbekannt' ? tr("Abnahmeart nicht lesbar", "Acceptance type unreadable")
        : internal ? tr("Unabhängige Prüfung und technische Freigabe im Lab", "Independent check and technical approval in the lab") : tr("Inhaltliche Abnahme", "Content acceptance");
    }
    if (task.zustand === 'abgenommen') { next = tr("Abgeschlossen", "Completed"); missing = tr("Abnahme ist vermerkt", "Acceptance recorded"); }
    return {
      beauftragung: task.vertragsfehler ? 'Aktuelle Beauftragung ungeklärt' : task.zustand === 'abgenommen' ? 'Abgeschlossen' : 'Beauftragt',
      beauftragungText: task.vertragsfehler ? tr('Aktuelle Beauftragung ungeklärt', 'Current commission unclear') : task.zustand === 'abgenommen' ? tr('Abgeschlossen', 'Completed') : tr('Beauftragt', 'Commissioned'),
      owner: laneName(lane.key), next, missing, internal,
      result: task.ergebnis || bound('Result'), resultKind: task.ergebnis ? 'Ergebnis' : tr("Gemeldeter Stand", "Reported status"), verification: task.pruefung || bound('Verification'),
      action: bound('Next action'), error: task.vertragsfehler || '',
      milestone: projektMeilenstein(task.entryId || task.vorhaben),
      source: task.vertragsquelle?.href || sourceReaderHref('demo-sources/' + lane.key),
      date: laneDatum(lane) || '',
    };
  }

  function blockiertDurch(task) {
    return (task?.kinder || []).flatMap((child) => [
      ...(!child.erledigt && child.bedarf === 'erforschen' ? [child] : []),
      ...blockiertDurch(child),
    ]);
  }

  function aufgabenKontext(task, assignments = [], point = null) {
    const key = task.lane ? laneKey(task.lane) : '';
    const matches = key ? assignments.filter((a) => laneKey(a.lane) === key && auftragOffen(a)
      && (voll(a.auftrag) === voll(task.text) || nenntAuftrag(task.text, a.kennung))) : [];
    let commissioned = null;
    if (matches.length === 1) {
      const lane = lanes.find((l) => l.key === key);
      const current = lane?.auftraege?.find((a) => a.kennung === matches[0].kennung);
      if (current) commissioned = auftragsKontext(lane, current);
    }
    const research = task.erledigt ? [] : blockiertDurch(task);
    if (research.length) {
      const actors = [...new Set(research.map((child) => aufgabenKontext(child, assignments).next))];
      return {
        beauftragung: commissioned?.beauftragung || 'Nicht vergeben',
        beauftragungText: commissioned?.beauftragungText || tr('Nicht vergeben', 'Unassigned'),
        owner: commissioned?.owner || tr("Nicht erfasst", "Not recorded"),
        next: actors.join(', '),
        missing: research.map((child) => child.text).join(' | '),
      };
    }
    if (commissioned) return commissioned;
    if (task.erledigt) return {
      beauftragung: 'Als erledigt vermerkt', beauftragungText: tr('Als erledigt vermerkt', 'Recorded as completed'), owner: tr("Nicht erfasst", "Not recorded"),
      next: tr("Keine Folgehandlung erfasst", "No follow-up recorded"), missing: tr("Kein offener Beitrag zu diesem Schritt erfasst", "No open contribution recorded for this step"),
    };
    return {
      beauftragung: task.erledigt ? 'Als erledigt vermerkt' : 'Nicht vergeben',
      beauftragungText: task.erledigt ? tr('Als erledigt vermerkt', 'Recorded as completed') : tr('Nicht vergeben', 'Unassigned'),
      owner: tr("Nicht erfasst", "Not recorded"),
      next: point ? 'Human User' : ({ du: 'Human User', partner: tr("Projektpartner", "Project partners") }[task.quelle] || tr("Nicht erfasst", "Not recorded")),
      missing: point ? tr("Antwort auf die zugeordnete Frage", "Answer to the linked question")
        : task.bedarf === 'erforschen' ? ({ vault: tr("Recherche im Vault", "Research in the vault"), web: tr("Recherche im Web", "Research on the web"), du: tr("Fachlicher Beitrag", "Scholarly contribution"), partner: tr("Beitrag der Projektpartner", "Project partners’ contribution") }[task.quelle] || tr("Wissensbedarf, Quelle nicht erfasst", "Knowledge needed, source not recorded"))
          : tr("Fehlender Beitrag nicht erfasst", "Missing contribution not recorded"),
    };
  }

  function assignmentWaits(entryId) {
    return lanes.flatMap((lane) => (lane.auftraege || [])
      .filter((a) => a.entryId === entryId && a.wait?.human)
      .map((a) => ({ ...a, operator: lane.key })));
  }

  function assignmentBlocks(entryId) {
    return lanes.flatMap((lane) => (lane.auftraege || [])
      .filter((a) => a.entryId === entryId && a.zustand === 'blockiert')
      .map((a) => ({ ...a, operator: lane.key })));
  }

  function overviewGroupOf(e, antworten = {}) {
    const group = groupOf(e, antworten);
    if (group === 'ruhend') return group;
    if (group === 'dich' || assignmentWaits(e.id).length) return 'dich';
    return assignmentBlocks(e.id).length ? 'andere' : group;
  }

  // Communication between operators (vault, Projektmodell und Projektseite,
  // Kommunikation zwischen Operatoren): a lane files a message with a
  // Kennung under "Nachrichten an andere Lanes" of its own file, and the
  // recipient confirms it by naming that Kennung in its own section. A filed
  // message is not a receipt, so the overview shows the unconfirmed ones.
  // The checks below read only that text and stay conservative: a message
  // without an addressee in its first two sentences or without a Kennung is
  // not counted.

  // Names that address the human operator; "Research Operator" is a role
  // of the lanes and never counts.
  const OPERATOR_NAME = /^(?:du|dich|dir|operator|research director)(?![\p{L}\p{N}])/iu;
  const ARTIKEL = /^(?:der|die|das|den|dem)\s+/i;

  // Every name a lane is addressed by: its file stem, its display name, its
  // former names from the data and, for the orchestrator, the role itself.
  function laneAliase(lane) {
    const out = [lane.key, lane.name, ...lane.aliases];
    if (lane.rolle === 'Orchestrator') out.push('Orchestrator');
    return out.filter(Boolean);
  }

  // Addressee named at the start of a text: 'operator', a lane key or null.
  function adressatAm(text) {
    const t = String(text ?? '').replace(/`/g, '').trim().replace(ARTIKEL, '');
    if (OPERATOR_NAME.test(t)) return 'operator';
    let best = null;
    for (const lane of lanes) {
      for (const alias of laneAliase(lane)) {
        if (t.slice(0, alias.length).toLowerCase() !== alias.toLowerCase()) continue;
        if (/[\p{L}\p{N}]/u.test(t.charAt(alias.length))) continue;
        if (!best || alias.length > best.n) best = { key: lane.key, n: alias.length };
      }
    }
    return best?.key || null;
  }

  // First addressee named anywhere in a phrase, read word by word.
  function adressatIn(text) {
    const t = String(text ?? '');
    for (const m of t.matchAll(/(?<![\p{L}\p{N}])[\p{L}]/gu)) {
      if (/Research\s+$/i.test(t.slice(0, m.index))) continue;
      const a = adressatAm(t.slice(m.index));
      if (a) return a;
    }
    return null;
  }

  // Kennungen of a text in order: a backticked id such as `OBVSG-HANDS-ON-3`
  // or a bare upper-case id ending in a date, such as SYNC-2026-10-15-02.
  const KENNUNG = /`([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+)`|(?<![A-Za-z0-9-])([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*-\d{4}-\d{2}-\d{2}(?:-\d+)?)(?![A-Za-z0-9-])/g;
  const kennungen = (text) => [...String(text ?? '').matchAll(KENNUNG)].map((m) => m[1] || m[2]);
  const nennt = (text, kennung) => kennungen(text).includes(kennung);

  // Sentences of a source text; a period ends one before a capital letter.
  const saetze = (text) => String(text ?? '').split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ„`])/).map((s) => s.trim()).filter(Boolean);

  // A message of lane to another lane, or null for a receipt, a note
  // without addressee in its first two sentences or without a Kennung.
  function nachricht(lane, text) {
    const kopf = saetze(text).slice(0, 2).join(' ');
    if (/^\s*Empfang(?:en)?\b/i.test(text) || /\bAbsender\b/.test(kopf)) return null;
    let an = null;
    // "an <operator>", "Empfänger ist <operator>" or the route of the persona's
    // message head, "<Kind> <sender> → <operator> | <date> | <Kennung>".
    for (const m of kopf.matchAll(/(?:^|[\s,;(])(?:an|Empfänger ist|→)\s+/giu)) {
      an = adressatAm(kopf.slice(m.index + m[0].length));
      if (an) break;
    }
    if (!an || an === 'operator' || an === lane.key) return null;
    const kennung = kennungen(text)[0];
    if (!kennung) return null;
    // The day leads the message or stands in its first two sentences, with
    // its time where one follows; the date inside a Kennung does not count.
    const m = /(\d{4}-\d{2}-\d{2})(?:\s+(\d{2}:\d{2}))?/.exec(kopf.replace(KENNUNG, ''));
    const datum = m?.[1] || '';
    return { von: lane.key, vonName: lane.name, an, kennung, datum: datum || laneDatum(lane), zeit: m?.[2] || '', datumAusLane: !datum, text };
  }

  // A recipient's mention confirms a message only when any explicit receipt
  // route and sender agree with that message; a shared Kennung is not enough.
  function bestaetigt(empfaenger, n) {
    return empfaenger.messages.some((m) => {
      if (!nennt(m, n.kennung)) return false;
      const route = /^(?:Empfang(?:en)?|Receive|Receipt)\b([^→\n]+)→([^|\n]+)/iu.exec(m.trim());
      if (route && (adressatIn(route[1]) !== n.von || adressatAm(route[2]) !== empfaenger.key)) return false;
      const absender = /\bAbsender\s+([^,.;]+)/.exec(m);
      const wer = absender ? adressatAm(absender[1]) : null;
      return !absender || wer === n.von;
    });
  }

  // Messages of every other lane to the lane key, each with bestaetigt.
  function nachrichtenAn(key) {
    const empfaenger = lanes.find((l) => l.key === key);
    if (!empfaenger) return [];
    return lanes.filter((l) => l !== empfaenger).flatMap((lane) => lane.messages
      .map((text) => nachricht(lane, text))
      .filter((n) => n && n.an === key)
      .map((n) => ({ ...n, bestaetigt: bestaetigt(empfaenger, n) })));
  }

  const offeneNachrichten = (key) => nachrichtenAn(key).filter((n) => !n.bestaetigt);

  // A report value that says there is nothing: none, keine, nichts, a dash.
  const NICHTS = /^\s*(?:none|keine?|nichts|n\/a|[–-])(?![\p{L}\p{N}])/iu;

  // What a lane needs and from whom: the report line "Brauche von" in the
  // form "<who>: <what>", else the Operator point, which by the Lane
  // Protocol is addressed to the operator. Returns {von ('operator', a
  // lane key or ''), wer (the name as written), text, quelle} or null.
  function braucht(key) {
    const lane = lanes.find((l) => l.key === key);
    if (!lane || lane.setup === 'planned' || lane.paused) return null;
    const reported = operatorReports[key];
    if (Array.isArray(reported?.questions)) {
      const question = reported.questions.find(question => question.blocking && operatorContribution(question).text);
      return question ? { von: 'operator', wer: 'Operator', text: question.text, quelle: 'Operatorbericht' } : null;
    }
    const eigen = String(lane.report['Brauche von'] || '').trim();
    if (eigen) {
      if (NICHTS.test(eigen)) return null;
      const m = /^([^:]{1,40}):\s+([\s\S]+)$/.exec(eigen);
      return { von: (m && adressatAm(m[1])) || '', wer: m ? m[1].trim() : '', text: m ? m[2].trim() : eigen, quelle: 'Brauche von' };
    }
    const punkt = operatorQuestion(lane.report['Operator point']);
    if (!punkt) return null;
    // A literal forwarding request is fulfilled by its own recipient's file receipt.
    // Other questions that merely mention the same identifier retain their human route.
    const delivery = /^Nachricht\s+([A-Z][A-Z0-9-]+)\s+in den\s+([\p{L}-]+)-Chat\s+einfügen\.?$/u.exec(punkt);
    const recipient = delivery ? adressatAm(delivery[2]) : null;
    if (recipient && nachrichtenAn(recipient).some((message) => message.von === lane.key
      && message.kennung === delivery[1] && message.bestaetigt)) return null;
    return { von: 'operator', wer: 'Operator', text: punkt, quelle: 'Operator point' };
  }

  // A prepared handover the lane itself calls unconfirmed, in its report
  // line "Canonical write-back" or its newest stand. Deliberately narrow:
  // the sentence must name a handover, an Abgleich or a receipt together
  // with "unbestätigt" or "nicht bestätigt", must not call that wording
  // outdated, and must not carry a Kennung the message check already
  // covers, which shows it at the recipient. Returns {text, quelle} or null.
  function uebergabeOffen(key) {
    const lane = lanes.find((l) => l.key === key);
    if (!lane) return null;
    const bekannt = new Set(lanes.flatMap((l) => l.messages.map((t) => nachricht(l, t)).filter(Boolean).map((n) => n.kennung)));
    const quellen = [['Canonical write-back', lane.report['Canonical write-back']], ['Stand', lane.standText]];
    for (const [quelle, text] of quellen) {
      for (const satz of saetze(text)) {
        if (!/\b(?:unbestätigt|nicht bestätigt)\b/i.test(satz) || !/Übergabe|Abgleich|Empfang/i.test(satz)) continue;
        if (/überholt|[„"»]unbestätigt[“"«]/i.test(satz)) continue;
        if (kennungen(satz).some((k) => bekannt.has(k))) continue;
        return { text: satz, quelle };
      }
    }
    return null;
  }

  // Day of the lane file's last report entry: the generator's stand is a
  // string or {date, text}; the generation time is only the fallback.
  function laneDatum(lane) {
    const s = lane?.fileDate;
    return (typeof s === 'string' ? s : s?.date || s?.text || '').slice(0, 10);
  }

  function laneFor(entryId) {
    if (!entryById.has(entryId)) return null;
    const matches = (l) => l.entryId === entryId || [...(l.auftraege || []), ...l.erledigt].some((a) => a.entryId === entryId);
    return lanes.find((l) => matches(l) && l.state === 'RUN') || lanes.find(matches) || null;
  }

  function datesInWindow(today = todayIso(), days = SCHWELLEN.warten, datesOf = allDates) {
    // Local date arithmetic: toISOString would shift the day east of UTC.
    const end = new Date(today + 'T00:00:00');
    end.setDate(end.getDate() + days);
    const endIso = localIso(end);
    const out = [];
    for (const e of AW.eintraege) {
      if (e.status === 'abgeschlossen') continue;
      for (const t of datesOf(e)) {
        if (t.datum >= today && t.datum <= endIso) out.push({ datum: t.datum, text: t.text, entryId: e.id, name: e.name });
      }
    }
    return out.sort((a, b) => a.datum.localeCompare(b.datum) || a.name.localeCompare(b.name));
  }

  // Tying calendar appointments to ACTIVE-WORK, shared by conflicts() and the
  // Kalender. Words too common to tie an appointment to an item.
  const ALLTAG = new Set(['workshop', 'webinar', 'termin', 'halten', 'online', 'teil', 'durchführen', 'universität', 'zusatztermin']);
  const woerter = (text) => new Set(String(text ?? '').toLocaleLowerCase('de').split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length >= 4 && !ALLTAG.has(w)));
  // Words meet when equal or when the shorter of at least five letters
  // begins the longer, so "VetMedAI" meets "VetMed".
  const treffen = (x, y) => x === y || (Math.min(x.length, y.length) >= 5 && (x.startsWith(y) || y.startsWith(x)));
  const gemeinsam = (a, b) => [...a].filter((x) => [...b].some((y) => treffen(x, y))).length;

  const calendarName = (text) => String(text ?? '').normalize('NFC').toLocaleLowerCase('de')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  // A whole project name or its recorded leading acronym/brand takes priority.
  // Otherwise require one unique, literal phrase of adjacent content words;
  // isolated word overlap and arbitrary prefixes cannot establish identity.
  const calendarNames = AW.eintraege.filter((e) => e.status !== 'abgeschlossen').map((e) => {
    const tokens = String(e.name ?? '').match(/[\p{L}\p{N}]+/gu) || [];
    const [first = '', next = ''] = tokens;
    const names = new Set([calendarName(e.name)]);
    if (/^\p{Lu}{3,}$/u.test(first) || /\p{Ll}\p{Lu}/u.test(first)) {
      names.add(calendarName(first));
      if (/^\p{Lu}{2,3}$/u.test(next)) names.add(calendarName(first + next));
    }
    const phrases = tokens.slice(1).flatMap((token, index) => {
      const pair = [tokens[index], token].map(calendarName);
      return pair.every(word => word.length >= 4 && !ALLTAG.has(word)) ? [pair.join(' ')] : [];
    });
    return { e, names: [...names].filter(Boolean), phrases };
  });
  function eintragZu(titel, date = '') {
    const name = ` ${calendarName(titel)} `;
    const includes = (values) => values.some(value => name.includes(` ${value} `));
    const named = calendarNames.filter(item => includes(item.names));
    if (named.length) return named.length === 1 ? named[0].e : null;
    const matches = calendarNames.filter(item => includes(item.phrases));
    // A recorded appointment on the same day can disambiguate a descriptive
    // phrase; multiple explicitly named projects remain ambiguous above.
    const dated = date ? matches.filter(item => item.e.termine?.some(t => t.datum === date)) : [];
    const candidates = dated.length ? dated : matches;
    return candidates.length === 1 ? candidates[0].e : null;
  }

  // An appointment over several days stands for whole days and lends no time.
  const mehrtaegig = (t) => t.bisDatum > t.datum;

  // Only an unambiguous project binding may lend time or suppress a duplicate.
  // Preserve the existing first eligible item and any already recorded time.
  function leiheZeit(t, ps) {
    const e = eintragZu(t.titel, t.datum);
    const treffer = e ? ps.find((p) => p.e?.id === e.id && p.art !== 'erledigt') || null : null;
    if (treffer && !treffer.von && t.von && t.bis) Object.assign(treffer, { von: t.von, bis: t.bis, kalender: t.kalender });
    return treffer;
  }

  function uhrzeit(p) {
    if (p.von && p.bis) return `${p.von}–${p.bis}`;
    if (p.von) return `ab ${p.von}`;
    return p.bis ? tr(`bis ${p.bis}`, `Until ${p.bis}`) : '';
  }

  // Two items with times, von and bis as "HH:MM", overlap.
  const ueberschneiden = (a, b) => a.von < b.bis && b.von < a.bis;

  // Dated items of the open entries on one day in the order the Kalender
  // builds them (appointments, the milestone unless an appointment shares its
  // day, step deadlines; entries in ACTIVE-WORK order), with the times the
  // day's single-day calendar appointments lend them, so an appointment
  // lends its time to the same item here and in the Kalender.
  function tagesPosten(datum) {
    const ps = [];
    for (const e of AW.eintraege) {
      if (e.status === 'abgeschlossen') continue;
      const termine = (e.termine || []).filter((t) => t.datum === datum);
      for (const t of termine) ps.push({ art: 'termin', e, datum, text: t.text });
      const m = String(e.milestone || '');
      if (m.slice(0, 10) === datum && !termine.length) ps.push({ art: 'meilenstein', e, datum, text: m.slice(10).trim() || 'Meilenstein' });
      (e.schrittFristen || []).forEach((f, n) => { if (f === datum) ps.push({ art: 'frist', e, datum, text: e.schritte?.[n] || '' }); });
    }
    for (const t of G?.termine || []) if (t.datum === datum && !mehrtaegig(t)) leiheZeit(t, ps);
    return ps;
  }

  // Only fixed appointments collide; a milestone without a termine[] entry is
  // a target date and never makes a conflict. Two appointments of different
  // entries on one day collide unless both took a time from the calendar
  // snapshot and the times do not overlap; without a time, or without the
  // snapshot, the day alone decides, as before.
  function conflicts(today = todayIso(), days = SCHWELLEN.warten) {
    const byDay = new Map();
    for (const d of datesInWindow(today, days, (e) => e.termine || [])) {
      if (!byDay.has(d.datum)) byDay.set(d.datum, new Set());
      byDay.get(d.datum).add(d.entryId);
    }
    const out = new Map();
    for (const [datum, ids] of byDay) {
      if (ids.size < 2) continue;
      const termine = tagesPosten(datum).filter((p) => p.art === 'termin');
      const beteiligt = new Set();
      termine.forEach((a, i) => termine.slice(i + 1).forEach((b) => {
        if (a.e === b.e) return;
        if (a.von && a.bis && b.von && b.bis && !ueberschneiden(a, b)) return;
        beteiligt.add(a.e.id).add(b.e.id);
      }));
      const im = [...ids].filter((id) => beteiligt.has(id));
      if (im.length > 1) out.set(datum, im);
    }
    return out;
  }

  function conflictFor(entryId, today = todayIso(), days = SCHWELLEN.warten) {
    const out = [];
    for (const [datum, ids] of conflicts(today, days)) {
      if (ids.includes(entryId)) out.push({ datum, others: ids.filter((i) => i !== entryId).map((i) => entryById.get(i)?.name || i) });
    }
    return out;
  }

  function plusTage(iso, n) {
    const d = new Date(iso + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return localIso(d);
  }

  const volldatum = (iso) => `${WOCHENTAGE[new Date(iso + 'T00:00:00').getDay()]}, ${fmtLang(iso)}`;

  // Entries of a clash day, the acting one first (surface rule 12): the one
  // whose step names the day, as that step asks for the move, else the one
  // with fewer dates, as a single appointment moves more easily than a series.
  function konfliktReihe(datum, ids) {
    const nennt = (e) => (e.schritte || []).some((s) => s.includes(fmt(datum)));
    return ids.map((id) => entryById.get(id)).filter(Boolean)
      .sort((a, b) => nennt(b) - nennt(a) || allDates(a).length - allDates(b).length || a.name.localeCompare(b.name, 'de'));
  }

  // What is urgent today, derived from the data alone without a stored flag
  // or a fixed maximum: a step deadline (schrittFristen, parallel to
  // schritte) that is overdue or due within DRINGEND.frist days, a date
  // conflict within DRINGEND.konflikt days at its acting entry unless that
  // entry already waits on the other side for the day, and an
  // appointment within DRINGEND.termin days. Questions of lanes and of
  // ACTIVE-WORK stay in Fragen. A reason: {entry, kind ('frist', 'konflikt',
  // 'termin'), datum, ueberfaellig, text, andere (konflikt: the other
  // entries of the day with their appointment texts)}. One row per entry,
  // led by its most urgent reason, with the rest in weitere; gegen lists the
  // conflicts another row writes out against this entry, for its "!".
  // Order: overdue first, then by date.
  function dringend(today = todayIso()) {
    const gruende = [];
    for (const e of AW.eintraege) {
      if (e.status === 'abgeschlossen') continue;
      (e.schrittFristen || []).forEach((frist, i) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(frist || '') || frist > plusTage(today, DRINGEND.frist)) return;
        gruende.push({ entry: e, kind: 'frist', datum: frist, ueberfaellig: frist < today, text: e.schritte?.[i] || '' });
      });
      for (const t of e.termine || []) {
        if (t.datum >= today && t.datum <= plusTage(today, DRINGEND.termin)) gruende.push({ entry: e, kind: 'termin', datum: t.datum, ueberfaellig: false, text: t.text });
      }
    }
    for (const [datum, ids] of conflicts(today, DRINGEND.konflikt)) {
      const [e, ...rest] = konfliktReihe(datum, ids);
      // A wartet-auf that names the day means the move is requested and the
      // other side has to answer, so the conflict leaves Du heute (operator,
      // 15 October 2026); the Kalender still shows it.
      if (!e || String(e.wartetAuf || '').includes(fmt(datum))) continue;
      const text = (e.schritte || []).find((s) => s.includes(fmt(datum))) || (e.termine || []).find((t) => t.datum === datum)?.text || '';
      const andere = rest.map((x) => ({ entry: x, text: (x.termine || []).filter((t) => t.datum === datum).map((t) => t.text).join(' | ') }));
      gruende.push({ entry: e, kind: 'konflikt', datum, ueberfaellig: false, text, andere });
    }
    const ART = { frist: 0, konflikt: 1, termin: 2 };
    gruende.sort((a, b) => b.ueberfaellig - a.ueberfaellig || a.datum.localeCompare(b.datum) || ART[a.kind] - ART[b.kind]);
    const zeilen = new Map();
    for (const g of gruende) {
      const da = zeilen.get(g.entry.id);
      if (da) da.weitere.push(g);
      else zeilen.set(g.entry.id, { ...g, weitere: [], gegen: [] });
    }
    for (const z of zeilen.values()) {
      for (const g of [z, ...z.weitere]) {
        for (const x of g.andere || []) zeilen.get(x.entry.id)?.gegen.push({ datum: g.datum, mit: z.entry });
      }
    }
    return [...zeilen.values()];
  }

  // Right-slot word of an urgent reason and its full wording for the tooltip.
  function dringendWort(g, today = todayIso()) {
    const tage = Math.round((new Date(g.datum + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000);
    const wann = tage === 0 ? tr('heute', 'today') : tage === 1 ? tr('morgen', 'tomorrow') : tage > 0 ? tr(`in ${tage} Tagen`, `in ${tage} days`) : '';
    const text = String(g.text || '').replace(/\s+/g, ' ').replace(/`/g, '').trim();
    if (g.kind === 'frist' && g.ueberfaellig) {
      return { kurz: tr(`Frist überfällig seit ${fmt(g.datum)}`, `Deadline overdue since ${fmt(g.datum)}`), voll: tr(`Frist ${volldatum(g.datum)} verstrichen, seit ${-tage} ${tage === -1 ? 'Tag' : 'Tagen'} überfällig: ${text}`, `Deadline ${volldatum(g.datum)} passed, ${-tage} ${tage === -1 ? 'day' : 'days'} overdue: ${text}`) };
    }
    if (g.kind === 'frist') return { kurz: tr(`bis ${fmt(g.datum)}`, `By ${fmt(g.datum)}`), voll: tr(`Frist bis ${volldatum(g.datum)}, ${wann}: ${text}`, `Deadline ${volldatum(g.datum)}, ${wann}: ${text}`) };
    if (g.kind === 'konflikt') {
      const andere = (g.andere || []).map((x) => `${x.entry.name}: ${x.text}`).join(' | ');
      return { kurz: tr(`Konflikt ${fmt(g.datum)}`, `Conflict ${fmt(g.datum)}`), voll: tr(`Terminkonflikt ${volldatum(g.datum)}, ${wann}: ${andere ? `${text.replace(/[.\s]+$/, '')}. Zugleich ${andere}` : text}`, `Scheduling conflict ${volldatum(g.datum)}, ${wann}: ${andere ? `${text.replace(/[.\s]+$/, '')}. At the same time ${andere}` : text}`) };
    }
    return { kurz: tr(`Termin ${fmt(g.datum)}`, `Appointment ${fmt(g.datum)}`), voll: tr(`Termin ${volldatum(g.datum)}, ${wann}: ${text}`, `Appointment ${volldatum(g.datum)}, ${wann}: ${text}`) };
  }

  // Questions by their consequence (decision E-frage-nach-folge of
  // 15 October 2026): a question is an open decision of the Human User with
  // a named consequence. Red is only what blocks a lane, what blocks a date
  // or is an acceptance; everything else is a decision at leisure and grey.
  // The sources, each item with folge 'abnahme', 'lane', 'termin' or
  // 'entscheidung':
  // - every row of abnahmen() not yet answered in this browser (abnahme);
  // - a blocked assignment waiting on the Human User (assignmentWait), and an
  //   operator's need addressed to him (braucht) that no such assignment
  //   already carries (lane);
  // - every open operator point of ACTIVE-WORK (offenePunkte of an entry in
  //   the group dich): lane when its wording names the Kennung of a blocked
  //   open assignment, termin when its entry has an appointment within
  //   SCHWELLEN.bald days, in its termine or in the calendar snapshot tied
  //   to it by eintragZu, else entscheidung, which is grey.
  // The category filter follows known project bindings. Unassigned needs stay visible.
  // Returns {rot, grau}, rot ordered acceptances, lanes, dates by day.
  function abnahmeAntwortStatus(id, answers, checks) {
    const answer = answers?.[id];
    if (!answer) return 'offen';
    const check = typeof checks?.get === 'function' ? checks.get(id) : checks?.[id];
    if (!check) return 'wird-geprueft';
    if (check.error || typeof check.revision !== 'string' || !check.revision) return 'ungeprueft';
    if (answer.quellenrevision !== check.revision) return 'ueberholt';
    return antwortStatus(id, answers);
  }

  function fragenNachFolge(antworten = {}, today = todayIso(), sichtbar = () => true, acceptanceChecks) {
    const rot = [];
    const grau = [];
    const optional = [];
    for (const a of abnahmen().filter((a) => a.menschlich)) {
      const status = acceptanceChecks === undefined ? antwortStatus(a.id, antworten, today)
        : abnahmeAntwortStatus(a.id, antworten, acceptanceChecks);
      if (status !== 'entschieden') rot.push({ ...a, antwortStatus: status, folge: 'abnahme', quelle: 'abnahme' });
    }
    const blockiert = [];
    for (const lane of [...lanes].sort((x, y) => laneRang(x.key) - laneRang(y.key))) {
      if (lane.setup === 'planned' || lane.paused) continue;
      const waits = (lane.auftraege || []).filter((a) => a.wait?.human);
      for (const a of waits) {
        rot.push({ folge: 'lane', quelle: 'lane', operator: lane.key, kennung: a.kennung || '', text: a.wait.contribution, entryId: a.entryId });
      }
      for (const a of lane.auftraege || []) if (a.zustand === 'blockiert' && a.kennung) blockiert.push({ operator: lane.key, kennung: a.kennung });
      const reported = operatorReports[lane.key];
      if (Array.isArray(reported?.questions)) {
        for (const question of reported.questions) {
          const contribution = operatorContribution(question);
          if (!contribution.text || waits.some(task => norm(task.wait.contribution).trim() === norm(question.text).trim())) continue;
          const task = [...lane.auftraege, ...lane.erledigt, ...lane.abgenommen].find(task => task.kennung === question.taskId);
          (contribution.kind === 'discussion' || !question.blocking ? optional : rot).push({ folge: contribution.kind === 'discussion' || !question.blocking ? 'discussion' : 'lane', quelle: 'lane', operator: lane.key,
            kennung: question.taskId || '', text: question.text, entryId: task?.entryId || (reported.projectIds?.length === 1 ? reported.projectIds[0] : ''),
            optional: !question.blocking, briefing: reported.source });
        }
        continue;
      }
      const b = braucht(lane.key);
      if (!b || b.von !== 'operator') continue;
      // A finished report's literal acceptance reminder is already represented by
      // its exactly bound result. A substantive question keeps its own route.
      const acceptanceReminder = b.quelle === 'Operator point'
        && /^Inhaltliche Abnahme des gelieferten [^;?]+; derzeit kein Freigabeblocker\.$/i.test(b.text)
        && String(lane.report.State).toUpperCase() === 'DONE'
        && NICHTS.test(String(lane.report.Blocker || ''))
        && lane.erledigt.some((task) => task.abnahmeart === 'inhaltlich'
          && nenntAuftrag([lane.report.Result, lane.report.Evidence].filter(Boolean).join(' '), task.kennung));
      if (acceptanceReminder) continue;
      const traeger = (lane.auftraege || []).find((a) => zugeordnet(lane, a, lane.report[b.quelle]));
      const gleich = (a) => (traeger && a.kennung === traeger.kennung) || norm(a.wait.contribution).trim() === norm(b.text).trim();
      if (waits.some(gleich)) continue;
      rot.push({ folge: 'lane', quelle: 'lane', operator: lane.key, kennung: traeger?.kennung || '', text: b.text, entryId: traeger?.entryId || lane.entryId || '' });
    }
    const bis = plusTage(today, SCHWELLEN.bald);
    const termine = new Map();
    const merke = (e, datum, text) => {
      const alt = termine.get(e.id);
      if (!alt || datum < alt.datum) termine.set(e.id, { datum, text });
    };
    for (const e of AW.eintraege) for (const t of e.termine || []) if (t.datum >= today && t.datum <= bis) merke(e, t.datum, t.text);
    for (const t of G?.termine || []) {
      if (t.datum > bis || (t.bisDatum || t.datum) < today) continue;
      const e = eintragZu(t.titel, t.datum);
      if (e) merke(e, t.datum < today ? today : t.datum, t.titel);
    }
    const punkte = [];
    for (const e of AW.eintraege) {
      if (!sichtbar(e) || groupOf(e, antworten) !== 'dich') continue;
      for (const p of offenePunkte(e, antworten, today)) {
        const wortlaut = [p.frage, p.kontext, p.voraussetzung].filter(Boolean).join(' ');
        const auftrag = blockiert.find((x) => wortlaut.includes(x.kennung));
        const termin = termine.get(e.id);
        const folge = auftrag ? 'lane' : termin ? 'termin' : 'entscheidung';
        punkte.push({ folge, quelle: 'active-work', punkt: p, entry: e, ...(auftrag ? { auftrag } : {}), ...(termin && !auftrag ? { termin } : {}) });
      }
    }
    const nachTag = (x, y) => (x.termin?.datum || '').localeCompare(y.termin?.datum || '') || (x.punkt.seit || '9999').localeCompare(y.punkt.seit || '9999');
    rot.push(...punkte.filter((x) => x.folge === 'lane'), ...punkte.filter((x) => x.folge === 'termin').sort(nachTag));
    grau.push(...punkte.filter((x) => x.folge === 'entscheidung').sort(nachTag));
    const inScope = (item) => !item.entryId || !entryById.has(item.entryId) || sichtbar(entryById.get(item.entryId));
    return { rot: rot.filter(inScope), grau, optional: optional.filter(inScope) };
  }

  function ageDays(iso, today = todayIso()) {
    if (!iso) return null;
    return Math.round((new Date(today) - new Date(iso.slice(0, 10))) / 86400000);
  }

  // A date in the left slot of a row: a past date as its age, in days up to
  // two weeks and in whole weeks from then on, so the slot stays short and
  // reads as "how long already"; today as "heute", a future date as date.
  function kurzDatum(iso, today = todayIso()) {
    const tage = ageDays(iso, today);
    if (tage === null) return '';
    if (tage < 0) return fmt(iso);
    if (tage === 0) return tr('heute', 'today');
    return tage < 14 ? tr(`${tage} T`, `${tage} d`) : tr(`${Math.floor(tage / 7)} Wo`, `${Math.floor(tage / 7)} w`);
  }

  // Full wording of a past date for the tooltip: "Samstag, 22.08.2026, 54 Tage".
  function alterLang(iso, today = todayIso()) {
    const tage = ageDays(iso, today);
    return tr(`${volldatum(iso.slice(0, 10))}, ${tage === 0 ? 'heute' : tage === 1 ? '1 Tag' : `${tage} Tage`}`, `${volldatum(iso.slice(0, 10))}, ${tage === 0 ? 'today' : tage === 1 ? '1 day' : `${tage} days`}`);
  }

  // Paid work after the field bezahlt:: of ACTIVE-WORK (vault convention
  // ACTIVE-WORK Felder, 15 October 2026): dhcraft is invoiced through DH
  // Craft, honorar is a fee to the Human User himself. An absent field means
  // unpaid or not recorded, so it yields no mark rather than an "unpaid" one.
  // The field never carries an amount; a value outside these two is ignored.
  const BEZAHLT = {
    dhcraft: { wort: 'DH Craft', titel: tr('bezahlt über DH Craft', 'Paid through DH Craft') },
    honorar: { wort: tr('Honorar', 'Fee'), titel: tr('Honorar an dich', 'Fee paid to you') },
  };

  /** How an entry or project record is paid, {art, wort, titel}, or null. */
  function bezahltVon(entry) {
    const art = String(entry?.bezahlt ?? '').trim().toLowerCase();
    return Object.hasOwn(BEZAHLT, art) ? { art, ...BEZAHLT[art] } : null;
  }

  // Erledigt-Log lines, matched to entries by the link alias or title.
  function erledigtFor(e) {
    const n = norm(e.name);
    return (ER.lines || []).filter((l) => norm(l.projekt) === n || norm(l.projekt).startsWith(n) || n.startsWith(norm(l.projekt)));
  }

  function bereiche() {
    return [...new Set(AW.eintraege.map((e) => e.bereich).filter(Boolean))];
  }

  // Clipboard API first; the textarea fallback covers a page the browser does
  // not count as a secure context. Must run inside the click handler.
  async function kopiere(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const feld = document.createElement('textarea');
      feld.value = text;
      feld.setAttribute('readonly', '');
      feld.setAttribute('aria-hidden', 'true');
      feld.style.cssText = 'position:fixed;inset-block-start:-100px;opacity:0';
      document.body.append(feld);
      feld.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      feld.remove();
      return ok;
    }
  }

  function store(key) {
    return {
      get(fallback) {
        try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
      },
      set(value) {
        try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
      },
    };
  }

  // The manual order of the Arbeitsbereit group ended on 14 October 2026; only
  // the superseded first Karte version read it, so the leftover key is removed once here.
  try { localStorage.removeItem('mission-control-demo-d-reihenfolge'); } catch { /* storage blocked */ }

  window.LEITSTAND = {
    aw: AW, ll: LL, er: ER, lanes, entryById, postenById,
    SCHWELLEN, DRINGEND, DRINGEND_REGEL, esc, fmt, fmtLang, todayIso, localIso, uhrVon, plusTage, ohnePunkt, voll, rein, schnitt, datumImText, nameOhneDatum, shortLabel, questionLabel, points, antwortAktuell, antwortStatus, offenePunkte, beauftragt, groupOf, overviewGroupOf, assignmentWaits, assignmentBlocks, nachrichtenAn, offeneNachrichten, braucht, uebergabeOffen, adressatAm, laneState, allDates, nextDate,
    // The coordinating operator, or null while no lane file names one.
    orchestrator: lanes.find((l) => l.rolle === 'Orchestrator') || null,
    setOperatorBriefings, projectConversations, operatorContribution, operatorQuestion, AUFTRAG_ZUSTAENDE, auftragOffen, wartetAufAbnahme, auftragRang, auftragWort, abnahmeId, zugeordnet, abnahmen, fragenNachFolge, abnahmeAntwortStatus, BELEG_ORT, sourceReaderHref,
    laneFor, laneProjects, laneDatum, laneKey, laneName, laneRang, laneMarker, systemVon, datesInWindow, woerter, gemeinsam, eintragZu, mehrtaegig, leiheZeit, uhrzeit, ueberschneiden, tagesPosten, conflicts, conflictFor, konfliktReihe, dringend, dringendWort, volldatum, ageDays, kurzDatum, alterLang, bezahltVon, erledigtFor, bereiche, store, kopiere,
    auftragsKontext, aufgabenKontext, projektMeilenstein, blockiertDurch,
    stand: { activeWork: AW.stand || '', lanes: LL.generated || '', erledigt: ER.stand || '' },
  };
})();
