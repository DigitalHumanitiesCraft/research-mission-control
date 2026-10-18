// Pure model of the Lage view: the lab as one board. Regions are the
// categories of themen.js, tiles the projects standing in them, units the
// current assignments and presented results of its operators, and the strip Bei dir
// what the Human User has to act on. The board reads the data of model.js,
// themen.js and, when the page loads it, window.PROJEKTE (make_projekte.py)
// for the initiations and for a lane whose Vorhaben is no ACTIVE-WORK id.
// Nothing here is invented beyond the data: no points, no rounds, no
// rewards. Every function takes the model as an argument, so the tests
// reach it without a page.
(function () {
  'use strict';
  const tr = (de, en) => window.UI_LANGUAGE ? window.UI_LANGUAGE.t(de, en) : de;
  const stateWord = state => ({ vergeben: tr('vergeben', 'Assigned'), läuft: tr('läuft', 'Running'), blockiert: tr('blockiert', 'Blocked'), erledigt: tr('erledigt', 'Complete'), abgenommen: tr('abgenommen', 'Accepted'), abgeschlossen: tr('abgeschlossen', 'Completed'), ruhend: tr('ruhend', 'Dormant') })[state] || state;

  // The text rules rein and schnitt are those of model.js (surface rule 7:
  // no middle dot and no semicolon in the interface); the board reads them
  // from there and passes them on for lage.js and the tests.
  const { rein, schnitt } = window.LEITSTAND || {};
  const leer = (text) => !rein(text) || /^(none|keine?)(?![\p{L}\p{N}])/iu.test(rein(text));

  // A report line describes the operator, not each of its lanes; it belongs
  // to a lane when it names the Kennung or the lane is the only open one.
  // Deliberately not M.zugeordnet of model.js, which the Übersicht asks: that
  // one also requires the assignment to be open and the report State not to
  // be DONE, and tests the empty words on the raw line. Here a blocked lane
  // that is its operator's only open one keeps the operator's Brauche von
  // even under a DONE report, so a Lage tile and the Übersicht card may name
  // a different wait for it. Unifying changes what the board shows, so the
  // difference stays until the operator decides.
  function zugeordnet(lane, a, text) {
    if (leer(text)) return false;
    if (a.kennung && String(text).includes(a.kennung)) return true;
    return (lane.auftraege || []).length === 1;
  }

  // The state of a lane as a statement with the day of its Seit column, as
  // the Übersicht words it: "läuft seit 15.10.", "wartet auf dich seit
  // 15.10.". The word blockiert and the reason stay in the title. klasse is
  // dich when the lane waits on the Human User, andere when it waits
  // elsewhere, '' otherwise. It parallels laneAussage and wartetBei of
  // uebersicht.js, worded for the board: the title carries the Kennung, a
  // finished lane is muted (klasse still) and the wait follows the
  // zugeordnet above, so the two stay apart with it.
  function laneAussage(lane, a, M) {
    const seit = a.seit ? tr(` seit ${M.fmt(a.seit)}`, ` since ${M.fmt(a.seit)}`) : '';
    const seitLang = a.seit ? tr(`seit ${M.volldatum(a.seit)}`, `Since ${M.volldatum(a.seit)}`) : '';
    const kennung = a.kennung ? tr(`Kennung ${a.kennung}`, `Identifier ${a.kennung}`) : '';
    if (a.zustand === 'blockiert') {
      let wartet = tr('wartet', 'Waiting');
      let klasse = 'andere';
      let grund = a.wait?.reason ? `Blocker: ${rein(a.wait.reason)}` : tr('Wartegrund nicht zugeordnet', 'Waiting reason not associated');
      if (a.wait?.human) {
        wartet = tr('wartet auf dich', 'Awaiting your input'); klasse = 'dich'; grund = rein(a.wait.contribution);
      } else {
        const b = M.braucht(lane.key);
        if (b && zugeordnet(lane, a, lane.report?.[b.quelle])) {
          grund = `${b.wer ? `${b.wer}: ` : ''}${rein(b.text)} (${b.quelle} in ${lane.key}.md)`;
          if (b.von === 'operator') { wartet = tr('wartet auf dich', 'Awaiting your input'); klasse = 'dich'; }
          else if (b.von) wartet = tr(`wartet auf ${M.laneName(b.von)}`, `Waiting for ${M.laneName(b.von)}`);
          else if (b.wer) wartet = tr('wartet außen', 'Waiting externally');
        }
      }
      return { text: `${wartet}${seit}`, klasse, title: [tr('blockiert', 'Blocked'), seitLang, grund, kennung].filter(Boolean).join(', ') };
    }
    if (a.zustand === 'erledigt' || a.zustand === 'abgenommen') return { text: stateWord(a.zustand), klasse: 'still', title: [a.seit ? tr(`begonnen ${M.volldatum(a.seit)}`, `Started ${M.volldatum(a.seit)}`) : '', kennung].filter(Boolean).join(', ') };
    return { text: `${stateWord(a.zustand) || tr('ohne Zustand', 'No state')}${seit}`, klasse: '', title: [seitLang, kennung].filter(Boolean).join(', ') };
  }

  // Project of a lane: the ACTIVE-WORK id the model resolved, else the
  // project make_projekte.py tied the Kennung to, else ''.
  function laneProjekt(a, P) {
    if (a.vertragsfehler) return '';
    if (a.entryId) return a.entryId;
    const matches = (P?.projekte || []).filter(p => (p.auftraege || []).some(x => x.kennung && x.kennung === a.kennung
      && (!a.operator || !(x.operator || x.lane) || (x.operator || x.lane) === a.operator)));
    return matches.length === 1 ? matches[0].id : '';
  }

  // The operators in display order, each with its open lanes as units,
  // the messages it filed without a receipt and a need from another
  // operator that no lane shows.
  function operatoren(M, P, heute = M.todayIso()) {
    return [...M.lanes].sort((x, y) => M.laneRang(x.key) - M.laneRang(y.key)).map((lane) => {
      const lanen = [...(lane.auftraege || [])]
        .sort((x, y) => M.auftragRang(x) - M.auftragRang(y))
        .map((a) => ({ ...a, operator: lane.key, projekt: laneProjekt({ ...a, operator: lane.key }, P), aussage: laneAussage(lane, a, M) }));
      // Normalized model data separates current work from results awaiting
      // judgement. Accepted history must not acquire a current team unit.
      const ergebnisse = [...(lane.erledigt || [])]
        .map(a => ({ ...a, operator: lane.key, projekt: laneProjekt({ ...a, operator: lane.key }, P), aussage: laneAussage(lane, a, M) }));
      const nachrichten = M.lanes.filter((l) => l !== lane).flatMap((l) => M.offeneNachrichten(l.key)).filter((n) => n.von === lane.key)
        .map((n) => ({ ...n, anName: M.laneName(n.an), seit: n.datum === heute && n.zeit ? n.zeit : M.fmt(n.datum) }));
      const b = M.braucht(lane.key);
      const braucht = b && b.von !== 'operator' && !lanen.some((a) => a.zustand === 'blockiert') ? b : null;
      const umgebung = rein(lane.umgebung || lane.harness);
      return {
        key: lane.key, lane, system: umgebung.split(/,\s/)[0], rolle: rein(lane.rollentitel) || (lane.rolle === 'Orchestrator' ? 'Orchestrator' : ''),
        harnessTitel: umgebung, arbeitsweise: rein(lane.arbeitsweise), stand: M.laneDatum(lane),
        lanen, ergebnisse, erledigt: ergebnisse.length, nachrichten, braucht,
        wartetAufDich: lanen.some((a) => a.aussage.klasse === 'dich'),
      };
    });
  }

  // Current work and pending results stay distinct on their actual project.
  function einheiten(ops) {
    const je = new Map();
    for (const op of ops) {
      for (const a of [...op.lanen, ...op.ergebnisse]) {
        if (!a.projekt) continue;
        if (!je.has(a.projekt)) je.set(a.projekt, []);
        je.get(a.projekt).push({ operator: op.key, kennung: a.kennung, auftrag: rein(a.auftrag), aussage: a.aussage,
          art: a.zustand === 'erledigt' ? 'ergebnis' : 'auftrag', task: a });
      }
    }
    return je;
  }

  const GRUPPEN_WORT = { dich: tr('wartet auf dich', 'Awaiting your input'), bereit: tr('keine Blockade erfasst', 'No blocker recorded'), andere: tr('wartet', 'Waiting'), ruhend: tr('ruht', 'Dormant') };
  const ERKLAERUNG = {
    dich: tr('Vorhaben mit offener Frage, angefordertem menschlichem Beitrag oder vorgelegtem inhaltlichem Ergebnis', 'Project with an open question, requested human contribution or presented content result'),
    bereit: tr('Keine offene Frage oder Blockade in den geladenen Daten erfasst', 'No open question or blocker recorded in the loaded data'),
    andere: tr('Vorhaben mit Status wartend oder angebot-gelegt oder mit einem Wartet-auf-Text', 'Project recorded as waiting, with an offer made or with a waiting-for description'),
    ruhend: tr('Vorhaben mit Status ruhend oder abgeschlossen', 'Project recorded as dormant or completed'),
    anbahnung: tr('Anbahnungsdokument im Vault ohne Eintrag in ACTIVE-WORK', 'Initiation document in the vault without an ACTIVE-WORK entry'),
  };

  // Right slot of a tile: the urgent reason of Steht an when the entry has
  // one, else the date that keys its group in the Übersicht, the oldest
  // open question, the next date or the last change.
  function rechts(e, gruppe, M, dringend, antworten, heute) {
    const d = dringend.get(e.id);
    if (d) {
      const w = M.dringendWort(d, heute);
      return { text: w.kurz, klasse: d.ueberfaellig ? 'dich' : 'ink', title: w.voll };
    }
    if (gruppe === 'dich') {
      const seit = M.offenePunkte(e, antworten, heute).map((p) => p.seit || '').filter(Boolean).sort()[0] || '';
      return seit ? { text: M.kurzDatum(seit, heute), klasse: '', title: tr(`älteste offene Frage vom ${M.volldatum(seit)}`, `Oldest open question from ${M.volldatum(seit)}`) } : null;
    }
    if (gruppe === 'bereit') {
      const datum = M.nextDate(e, heute);
      const termin = datum ? M.allDates(e).find((t) => t.datum === datum) : null;
      return datum ? { text: M.fmt(datum), klasse: '', title: tr(`nächster Termin am ${M.volldatum(datum)}, ${rein(termin?.text || '')}`, `Next appointment on ${M.volldatum(datum)}, ${rein(termin?.text || '')}`) } : null;
    }
    const upd = /^\d{4}-\d{2}-\d{2}/.test(e.updated || '') ? e.updated.slice(0, 10) : '';
    if (!upd) return null;
    return { text: M.kurzDatum(upd, heute), klasse: '', title: `${gruppe === 'andere' ? 'wartet' : e.status} seit ${M.alterLang(upd, heute)}, letzte Änderung in ACTIVE-WORK` };
  }

  function kachelVon(e, gruppe, M, T, dringend, antworten, heute, units) {
    const warten = gruppe === 'andere' && e.wartetAuf ? tr(`, auf ${rein(e.wartetAuf)}`, `, awaiting ${rein(e.wartetAuf)}`) : '';
    return {
      id: e.id, name: e.name, thema: T.themaVon(e), gruppe, quelle: 'active-work', entry: e,
      zustand: { text: gruppe !== 'ruhend' && gruppe !== 'dich' && M.assignmentBlocks(e.id).length ? tr('Auftrag blockiert', 'Assignment blocked') : e.status === 'abgeschlossen' ? tr('abgeschlossen', 'Completed') : GRUPPEN_WORT[gruppe], klasse: gruppe === 'dich' ? 'dich' : gruppe === 'andere' ? 'andere' : gruppe === 'ruhend' ? 'still' : '', title: gruppe !== 'ruhend' && M.assignmentBlocks(e.id).length ? tr(`Blockierter Auftrag laut Auftragstabelle: ${M.assignmentBlocks(e.id).map((a) => a.auftrag).join('; ')}`, `Blocked assignment recorded in the assignment table: ${M.assignmentBlocks(e.id).map((a) => a.auftrag).join('; ')}`) : `${ERKLAERUNG[gruppe]}${warten}` },
      rechts: rechts(e, gruppe, M, dringend, antworten, heute),
      einheiten: units.get(e.id) || [],
      fragen: M.offenePunkte(e, antworten, heute).length,
    };
  }

  function anbahnungVon(p, M, T, units, heute) {
    const abgeschlossen = p.zustand === 'abgeschlossen';
    const upd = /^\d{4}-\d{2}-\d{2}/.test(p.updated || '') ? String(p.updated).slice(0, 10) : '';
    return {
      id: p.id, name: p.titel || p.name, thema: T.themaVon(p), gruppe: abgeschlossen ? 'ruhend' : 'anbahnung', quelle: 'anbahnung', projekt: p,
      zustand: { text: abgeschlossen ? tr('abgeschlossen', 'Completed') : tr('Anbahnung', 'Initiation'), klasse: 'still', title: abgeschlossen ? tr('Abgeschlossen laut Projektdokument', 'Completed according to the project document') : ERKLAERUNG.anbahnung },
      rechts: upd ? { text: M.kurzDatum(upd, heute), klasse: '', title: tr(`zuletzt geändert ${M.alterLang(upd, heute)}`, `Last updated ${M.alterLang(upd, heute)}`) } : null,
      einheiten: units.get(p.id) || [],
      fragen: (p.entscheidungen || []).length,
    };
  }

  const GRUPPEN_RANG = { dich: 0, bereit: 1, andere: 2 };

  function dateRows(M, calendar, today, urgent) {
    const until = M.plusTage(today, 6);
    const rows = [];
    const segmenter = typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('de', { granularity: 'sentence' }) : null;
    const title = text => segmenter ? segmenter.segment(M.voll(text))[Symbol.iterator]().next().value?.segment.trim() || M.voll(text) : M.voll(text);
    for (let day = today; day <= until; day = M.plusTage(day, 1)) {
      const posts = M.tagesPosten(day);
      for (const post of posts.filter(item => item.art === 'termin')) rows.push({
        id: post.e.id, entry: post.e, datum: day, time: M.uhrzeit(post), text: post.text,
        title: title(post.text) || M.nameOhneDatum(post.e.name), identityTitle: M.nameOhneDatum(post.e.name),
        kind: 'termin', source: 'ACTIVE-WORK', borrowed: post.kalender || '', original: post,
      });
      const borrowed = new Set();
      for (const item of calendar?.termine || []) {
        if (item.datum !== day || M.mehrtaegig(item)) continue;
        const post = M.leiheZeit(item, posts);
        // The shared lending rule can represent one original on its source
        // appointment. Further calendar occurrences must remain inspectable.
        if (post?.art === 'termin' && (!item.entryId || item.entryId === post.e.id) && !borrowed.has(post)) { borrowed.add(post); continue; }
        const entry = M.entryById.get(item.entryId);
        rows.push({ id: entry?.id || '', entry, datum: item.datum, time: M.uhrzeit(item), title: item.titel,
          text: item.titel, kind: 'termin', source: 'Google Calendar', calendar: item.kalender, original: item });
      }
    }
    for (const item of calendar?.termine || []) {
      if (!M.mehrtaegig(item) || item.datum > until || item.bisDatum < today) continue;
      const entry = M.entryById.get(item.entryId);
      rows.push({ id: entry?.id || '', entry, datum: item.datum, until: item.bisDatum, time: M.uhrzeit(item),
        title: item.titel, text: item.titel, kind: 'termin', source: 'Google Calendar', calendar: item.kalender, original: item });
    }
    for (const group of urgent) {
      for (const reason of [group, ...group.weitere].filter(item => item.kind !== 'termin')) rows.push({
        ...reason, id: reason.entry.id, title: title(reason.text) || (reason.kind === 'konflikt' ? tr('Terminkonflikt', 'Scheduling conflict') : tr('Frist', 'Deadline')),
        time: '', source: 'ACTIVE-WORK', original: reason,
      });
    }
    return rows.sort((a, b) => a.datum.localeCompare(b.datum) || a.time.localeCompare(b.time));
  }

  function dependencyRows(M, ops, byId) {
    const rows = [];
    for (const entry of M.aw.eintraege) {
      const blocked = M.assignmentBlocks(entry.id);
      if (!blocked.length && !entry.wartetAuf && !entry.wartetAufPunkte?.length && M.overviewGroupOf(entry, {}) !== 'andere') continue;
      const points = blocked.map(task => tr('Auftrag blockiert: ', 'Assignment blocked: ') + task.auftrag + '. ' + (task.wait?.reason || 'Fehlender Beitrag nicht erfasst.'));
      points.push(...(entry.wartetAufPunkte?.length ? entry.wartetAufPunkte : entry.wartetAuf ? [entry.wartetAuf] : []));
      const full = [...new Set(points.filter(text => String(text || '').trim()))];
      if (!full.length) full.push('Fehlender Beitrag nicht erfasst.');
      rows.push({ id: entry.id, entry, title: entry.wartetAufTitel || '', text: full[0], points: full, source: 'ACTIVE-WORK' });
    }
    for (const op of ops) {
      for (const task of op.lanen.filter(item => item.zustand === 'blockiert' && !byId.has(item.projekt))) {
        const text = task.wait?.reason || 'Fehlender Beitrag nicht erfasst.';
        rows.push({ id: '', operator: op.key, kennung: task.kennung, task, text,
          points: [task.auftrag, text], title: '', source: 'demo-sources/' + op.key + '.md' });
      }
    }
    return rows;
  }

  function enrichBoard(board, M, calendar, today) {
    const cards = [...board.regionen.flatMap(region => region.kacheln), ...board.anbahnungen, ...board.ruhend];
    const byId = new Map(cards.map(card => [card.id, card]));
    const results = new Map(M.abnahmen().map(result => [result.operator + ':' + result.kennung, result]));
    const pending = unit => ({ ...unit, human: Boolean(results.get(unit.operator + ':' + unit.kennung)?.menschlich) });
    for (const card of cards) {
      card.questions = [];
      card.currentTeam = card.einheiten.filter(unit => unit.art === 'auftrag');
      card.pendingResults = card.einheiten.filter(unit => unit.art === 'ergebnis').map(pending);
      card.dates = [];
      card.dependencies = [];
      for (const original of card.projekt?.entscheidungen || []) card.questions.push({
        quelle: 'anbahnung', entryId: card.id, text: typeof original === 'string' ? original : original.text || original.frage || '', original,
      });
    }
    const unassigned = { questions: [], pendingResults: [], currentTeam: [], dates: [], dependencies: [] };
    for (const op of board.operatoren) {
      for (const task of [...op.lanen, ...op.ergebnisse].filter(item => !byId.has(item.projekt))) {
        const unit = { operator: op.key, kennung: task.kennung, auftrag: rein(task.auftrag), aussage: task.aussage,
          art: task.zustand === 'erledigt' ? 'ergebnis' : 'auftrag', task };
        unassigned[unit.art === 'ergebnis' ? 'pendingResults' : 'currentTeam'].push(unit.art === 'ergebnis' ? pending(unit) : unit);
      }
    }
    const questions = M.fragenNachFolge({}, today);
    for (const question of [...questions.rot, ...questions.grau].filter(item => item.quelle !== 'abnahme')) {
      let id = question.entry?.id || question.entryId || '';
      if (!byId.has(id) && question.operator && question.kennung) {
        const op = board.operatoren.find(item => item.key === question.operator);
        const matches = [...(op?.lanen || []), ...(op?.ergebnisse || [])].filter(task => task.kennung === question.kennung);
        if (matches.length === 1) id = matches[0].projekt;
      }
      (byId.get(id) || unassigned).questions.push(question);
    }
    for (const row of dateRows(M, calendar, today, board.dringend)) (byId.get(row.id) || unassigned).dates.push(row);
    for (const row of dependencyRows(M, board.operatoren, byId)) (byId.get(row.id) || unassigned).dependencies.push(row);
    board.unassigned = unassigned;
    return board;
  }

  function matchesFocus(card, focus) {
    if (focus === 'beitrag') return card.gruppe === 'dich' || Boolean(card.questions?.length)
      || Boolean(card.pendingResults?.some(result => result.human)) || Boolean(card.currentTeam?.some(unit => unit.aussage.klasse === 'dich'));
    if (focus === 'auftraege') return Boolean(card.currentTeam?.length);
    if (focus === 'termine') return Boolean(card.dates?.length || card.dependencies?.length);
    return true;
  }

  // The board: one region per category in chip order with its open
  // projects as tiles, the initiations as a region of their own, and the
  // resting and closed projects of every category at the end. Within a
  // region the tiles stand by group, what waits on the Human User first, then by name.
  function brett(M, T, P, antworten = {}, heute = M.todayIso(), calendar = null) {
    const ops = operatoren(M, P, heute);
    const units = einheiten(ops);
    const humanResults = new Set(M.abnahmen().filter(a => a.menschlich).map(a => a.operator + ':' + a.kennung));
    const urgent = M.dringend(heute);
    const dringend = new Map(urgent.map((z) => [z.entry.id, z]));
    // A unit that waits on the Human User moves its project to that group,
    // as a lane acceptance does in the Übersicht.
    const gruppeVon = (e) => {
      const g = M.overviewGroupOf(e, antworten);
      return g !== 'ruhend' && (units.get(e.id) || []).some(u => u.aussage.klasse === 'dich'
        || (u.art === 'ergebnis' && humanResults.has(u.operator + ':' + u.kennung))) ? 'dich' : g;
    };
    const alle = M.aw.eintraege.map((e) => kachelVon(e, gruppeVon(e), M, T, dringend, antworten, heute, units));
    const sortiert = (ks) => ks.sort((x, y) => (GRUPPEN_RANG[x.gruppe] ?? 9) - (GRUPPEN_RANG[y.gruppe] ?? 9) || x.name.localeCompare(y.name, 'de'));
    const regionen = T.themen().map((thema) => ({
      thema, key: T.schluesselVon(thema), kacheln: sortiert(alle.filter((k) => k.thema === thema && k.gruppe !== 'ruhend')),
    })).filter((r) => r.kacheln.length);
    const dokumente = (P?.projekte || []).filter((p) => p.quelle !== 'active-work').map((p) => anbahnungVon(p, M, T, units, heute))
      .sort((x, y) => x.name.localeCompare(y.name, 'de'));
    const anbahnungen = dokumente.filter((k) => k.gruppe !== 'ruhend');
    const ruhend = [...alle.filter((k) => k.gruppe === 'ruhend'), ...dokumente.filter((k) => k.gruppe === 'ruhend')]
      .sort((x, y) => (x.zustand.text === 'abgeschlossen') - (y.zustand.text === 'abgeschlossen') || x.name.localeCompare(y.name, 'de'));
    return enrichBoard({ regionen, anbahnungen, ruhend, operatoren: ops, dringend: urgent }, M, calendar, heute);
  }

  // The strip Bei dir renders the rule of model.js (fragenNachFolge,
  // decision E-frage-nach-folge): its red items split into the lanes that
  // wait on the Human User and the acceptances, with the grey ones and the
  // urgent rows of Steht an; the count itself comes from shell.js, which
  // renders the same rule.
  function beiDir(b, M, antworten = {}, heute = M.todayIso()) {
    const { rot, grau } = M.fragenNachFolge(antworten, heute);
    return {
      rot, grau, lanen: rot.filter((x) => x.folge === 'lane' && x.quelle === 'lane'),
      abnahmen: rot.filter((x) => x.folge === 'abnahme'), dringend: b.dringend,
    };
  }

  window.LEITSTAND_LAGE = { laneAussage, laneProjekt, operatoren, einheiten, brett, beiDir, matchesFocus, schnitt, rein, leer };
})();
