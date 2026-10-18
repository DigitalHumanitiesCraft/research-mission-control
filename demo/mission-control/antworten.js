// Source-bound conversation preparation and retained browser-answer compatibility.
// Preview and copying are read-only; storage and transport APIs keep their existing contracts.
(function () {
  'use strict';
  const tr = (de, en) => window.UI_LANGUAGE ? window.UI_LANGUAGE.t(de, en) : de;
  const L = window.LEITSTAND;
  const S = window.LEITSTAND_SHELL;
  if (!L || !S) throw new Error('antworten.js needs model.js and shell.js loaded first');
  const { el } = S;

  const STORE = L.store('mission-control-demo-d-antworten');
  const GRUPPEN = { entscheidung: 'Entscheidung', auftrag: 'Auftrag' };
  const ENDPUNKT = '/api/answers';
  const uebertragungen = new Set();
  const uebertragungsId = (id, a) => `${id}:${a?.zeit || ''}`;

  // The kind values are the inbox keys (LEITSTAND_KINDS in serve.py); a
  // delegation is delegieren-<key> for every operator of the lane data.
  const ORCH = L.orchestrator ? L.laneName(L.orchestrator.key) : 'Research Coordination';
  const laneVon = (wert) => L.laneName(wert.replace(/^delegieren-/, ''));

  // The help texts say what happens today: nothing reaches ACTIVE-WORK
  // directly; the orchestrator adopts decisions at its next sync and starts
  // orders once they lie in the inbox. ziel lists where a kind is offered.
  // auftrag is the instruction a copied prompt gives any agent system.
  const UEBERNAHME = `${ORCH} übernimmt das beim nächsten Sync in ACTIVE-WORK.`;
  const START = `${ORCH} beginnt, sobald der Auftrag im Eingang liegt.`;
  const P = ['punkt'];
  const PS = ['punkt', 'schritt'];
  const DELEGATIONEN = [...L.lanes].sort((a, b) => L.laneRang(a.key) - L.laneRang(b.key)).map((lane) => [
    `delegieren-${lane.key}`, null, 'auftrag', PS,
    lane.key === L.orchestrator?.key ? `${ORCH} übernimmt selbst und meldet das Ergebnis. ${START}` : `${ORCH} gibt den Auftrag an die Lane ${lane.name} und verfolgt ihn. ${START}`,
    null]);
  const ARTEN = [
    ['ja', 'ja', 'entscheidung', P, `Zustimmung. ${UEBERNAHME}`, 'Setze die Folge um, die der Kontext für Ja nennt.'],
    ['nein', 'nein', 'entscheidung', P, `Ablehnung mit deiner Notiz. ${UEBERNAHME}`, 'Setze die Folge um, die der Kontext für Nein nennt, und berücksichtige die Notiz.'],
    ['aendern', 'ändern', 'entscheidung', P, `Umschreiben nach deiner Notiz und neu vorlegen. ${UEBERNAHME}`, 'Formuliere die Frage nach der Notiz neu und lege sie zur Entscheidung vor.'],
    ['spaeter', 'später', 'entscheidung', PS, `Ruht bis zum gewählten Datum. ${UEBERNAHME}`, 'Stelle den Punkt bis zum genannten Datum zurück, in ACTIVE-WORK mit „zurückgestellt bis YYYY-MM-DD“ am Ende.'],
    ['erledigen', 'erledigen', 'auftrag', ['schritt'], `${ORCH} führt den Schritt aus. ${START}`, 'Führe den Schritt aus, soweit seine Voraussetzungen erfüllt sind, und berichte mit Beleg.'],
    ['pruefen', 'prüfen', 'auftrag', ['schritt'], `${ORCH} prüft, ob der Schritt noch gilt, und legt das Ergebnis vor. ${START}`, 'Prüfe an den Quellen, ob der Schritt noch gilt, und lege das Ergebnis mit Beleg vor.'],
    ['streichen', 'streichen', 'auftrag', ['schritt'], `${ORCH} streicht den Schritt aus ACTIVE-WORK. ${START}`, 'Entferne den Schritt aus ACTIVE-WORK.'],
    ['recherche-vault', 'Vault prüfen', 'auftrag', PS, `${ORCH} recherchiert im Vault und bringt eine Vorlage. ${START}`, 'Recherchiere dazu im Vault und lege eine Vorlage zur Entscheidung vor.'],
    ['recherche-web', 'Web recherchieren', 'auftrag', PS, `${ORCH} recherchiert im Web mit gelesenen Quellen und bringt eine Vorlage. ${START}`, 'Recherchiere dazu im Web, stütze dich nur auf im Volltext gelesene Quellen und lege eine Vorlage zur Entscheidung vor.'],
    ['beispiel', 'Beispiel', 'auftrag', PS, `${ORCH} baut ein konkretes Beispiel, an dem du entscheiden kannst. ${START}`, 'Baue ein konkretes Beispiel, an dem der Operator entscheiden kann.'],
    ['kontext', 'Kontext', 'auftrag', PS, `${ORCH} sammelt Vorgeschichte und Abhängigkeiten. ${START}`, 'Sammle Vorgeschichte und Abhängigkeiten aus Vault und Repository und lege sie knapp vor.'],
    ['zeigen', 'zeigen', 'auftrag', PS, `${ORCH} legt den Stand als Seite oder Bildschirmfoto vor. ${START}`, 'Lege den aktuellen Stand als lokale Seite oder Bildschirmfoto vor.'],
    ['nachdenken', 'durchdenken', 'auftrag', PS, `${ORCH} wägt die Optionen ab und bringt eine Empfehlung mit Begründung. ${START}`, 'Wäge die Optionen ab und bringe eine Empfehlung mit Begründung.'],
    ...DELEGATIONEN,
    ['rueckfrage', 'Rückfrage', 'auftrag', PS, `Die Frage ist unklar, ${ORCH} formuliert sie mit deiner Notiz neu. ${START}`, 'Die Frage ist unklar. Formuliere sie mit der Notiz neu und lege sie wieder vor.'],
  ].map(([wert, label, gruppe, ziele, hilfe, auftrag]) => ({
    wert, label: label || `an ${laneVon(wert)}`, gruppe, ziele, hilfe,
    auftrag: auftrag || `Übernimm das in der Lane ${laneVon(wert)} und melde das Ergebnis in deren Lane-Datei.`,
  }));
  const artVon = new Map(ARTEN.map((a) => [a.wert, a]));
  // Kinds of an acceptance, the values ACCEPTANCE_KINDS in serve.py takes,
  // with the words the views show for a given answer.
  const ABNAHME_WORT = { abgenommen: 'abgenommen', zurueck: 'zurückgegeben' };

  const schrittById = new Map(L.aw.einheiten.filter((u) => u.art === 'schritt').map((u) => [u.id, u]));

  // Tolerates spelled-out umlaut values of the older {urteil} shape and a
  // delegation stored under a former name of its operator.
  function artKey(v) {
    const n = String(v ?? '').toLowerCase();
    if (artVon.has(n)) return n;
    if (n.startsWith('delegieren-')) {
      const neu = `delegieren-${L.laneKey(n.slice('delegieren-'.length))}`;
      return artVon.has(neu) ? neu : '';
    }
    if (n.startsWith('änd')) return 'aendern';
    if (n.startsWith('spät')) return 'spaeter';
    return '';
  }

  function normal(a) {
    if (!a || typeof a !== 'object') return null;
    if (a.ziel === 'abnahme') {
      return { ziel: 'abnahme', lane: a.lane || '', kennung: a.kennung || '', art: a.art in ABNAHME_WORT ? a.art : '', notiz: a.notiz || '',
        zeit: a.zeit || '', uebertragen: a.uebertragen || '', fehler: a.fehler || '', antwortId: a.antwortId || '', quellenrevision: a.quellenrevision || '' };
    }
    return {
      ziel: a.ziel || '', entry: a.entry || '', art: artKey(a.art ?? a.urteil), notiz: a.notiz || '',
      zeit: a.zeit || '', revision: a.revision || '', wortlaut: a.wortlaut || '', bis: a.bis || '',
      uebertragen: a.uebertragen || '', fehler: a.fehler || '',
    };
  }

  function all() {
    const roh = STORE.get({});
    const out = {};
    for (const [id, a] of Object.entries(roh && typeof roh === 'object' ? roh : {})) {
      const n = normal(a);
      if (n && (n.art || n.notiz)) out[id] = n;
    }
    return out;
  }

  function get(punktId) {
    return all()[punktId] || null;
  }

  function status(id) {
    return L.antwortStatus(id, all());
  }

  function passtZumKern(punktId, a, kern) {
    if (kern.ziel === 'abnahme') return true;
    return L.antwortAktuell({ id: punktId, art: kern.ziel, revision: kern.revision,
      projekt: kern.entry, teilVon: kern.entry }, a);
  }

  // Lane questions (id lane-<key>, see fragen.js) are current
  // without being in ACTIVE-WORK; the inbox contract does not take them.
  const istLanefrage = (id) => L.lanes.some((l) => `lane-${l.key}` === id);

  function schreibe(alle, punktId) {
    const ok = STORE.set(alle);
    document.dispatchEvent(new CustomEvent('mission-control-demo-antwort', { detail: { punktId } }));
    return ok;
  }

  // Applies a transfer result only to the answer it was sent for, so a slow
  // response never marks a newer answer as transferred.
  function vermerke(punktId, zeit, ergebnis) {
    const alle = all();
    if (!alle[punktId] || alle[punktId].zeit !== zeit) return;
    Object.assign(alle[punktId], ergebnis);
    STORE.set(alle);
    document.dispatchEvent(new CustomEvent('mission-control-demo-uebertragung', { detail: { punktId, ok: Boolean(ergebnis.uebertragen) } }));
  }

  async function sende(punktId) {
    const a = get(punktId);
    if (!a) return false;
    const abnahme = a.ziel === 'abnahme';
    const grund = !a.art ? 'Notiz ohne Antwortart, der Eingang nimmt sie nicht an'
      : abnahme ? (!a.lane || !a.kennung ? 'Abnahme ohne Lane oder Kennung' : '')
        : istLanefrage(punktId) ? 'Lane-Fragen nimmt der Eingang nicht an'
          : !L.antwortAktuell(L.postenById.get(punktId) || schrittById.get(punktId), a) ? tr("Antwort nicht an die aktuelle Fassung gebunden; erneut prüfen", "Answer not bound to the current version. Check again.")
          : !a.entry || !a.ziel ? 'Antwort ohne Vorhaben, vor der Übertragung gespeichert' : '';
    if (grund) {
      vermerke(punktId, a.zeit, { uebertragen: '', fehler: grund });
      return false;
    }
    const sendung = uebertragungsId(punktId, a);
    if (uebertragungen.has(sendung)) return false;
    uebertragungen.add(sendung);
    // The acceptance contract of serve.py (valid_acceptance) takes exactly these keys.
    const satz = abnahme ? { ziel: 'abnahme', lane: a.lane, kennung: a.kennung, art: a.art, notiz: a.notiz }
      : { ziel: a.ziel, id: punktId, entry: a.entry, art: a.art, notiz: a.notiz, revision: a.revision, wortlaut: a.wortlaut };
    if (abnahme) for (const field of ['antwortId', 'quellenrevision']) if (a[field]) satz[field] = a[field];
    if (a.art === 'spaeter' && a.bis) satz.bis = a.bis;
    let fehler = '';
    try {
      const antwort = await fetch(ENDPUNKT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(satz) });
      if (!antwort.ok) {
        const json = await antwort.json().catch(() => null);
        fehler = `${antwort.status} ${json?.error || antwort.statusText}`.trim();
      }
    } catch (err) {
      fehler = `kein Dienst erreichbar (${err.message})`;
    }
    uebertragungen.delete(sendung);
    vermerke(punktId, a.zeit, fehler ? { uebertragen: '', fehler } : { uebertragen: new Date().toISOString(), fehler: '' });
    return !fehler;
  }

  function speichere(punktId, aenderung, kern) {
    const alle = all();
    const bisher = alle[punktId];
    const neu = { ...(passtZumKern(punktId, bisher, kern) ? bisher : { art: '', notiz: '', bis: '' }), ...kern, ...aenderung,
      zeit: new Date().toISOString(), uebertragen: '', fehler: '' };
    if (neu.art !== 'spaeter') neu.bis = '';
    if (!neu.art && !neu.notiz) delete alle[punktId];
    else alle[punktId] = neu;
    const ok = schreibe(alle, punktId);
    if (ok && alle[punktId]) sende(punktId);
    return ok;
  }

  function stempel(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const p = (x) => String(x).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  // Source text and earlier browser records are context for a conversation.
  // Copying never reuses an earlier verdict as fresh authorization.
  function promptText(item, ziel, kern, options = {}) {
    const review = options.review;
    const suppliedTask = review ? review.task || null : options.task || (item.kennung ? item : null);
    const key = suppliedTask?.operator || item.operator || (ziel === 'operator' ? item.key : '')
      || L.lanes.find((candidate) => 'lane-' + candidate.key === item.id)?.key;
    const lane = L.lanes.find((candidate) => candidate.key === key);
    // Compact projections omit state and revision; enrich only an exact, valid source binding.
    const matches = !review && suppliedTask?.kennung && lane
      ? [...(lane.auftraege || []), ...(lane.erledigt || []), ...(lane.abgenommen || [])]
        .filter(candidate => candidate.kennung === suppliedTask.kennung && (!candidate.operator || candidate.operator === key))
      : [];
    const sourceTask = matches.length === 1 ? matches[0] : null;
    const claimedProject = suppliedTask?.entryId || suppliedTask?.vorhaben || item.entryId || kern.entry;
    const validSource = sourceTask && !sourceTask.vertragsfehler && !suppliedTask.vertragsfehler && !item.vertragsfehler
      && !item.entryIssue && !suppliedTask.entryIssue
      && sourceTask.entryId && L.entryById.has(sourceTask.entryId) && claimedProject === sourceTask.entryId;
    const task = validSource ? { ...sourceTask, ...suppliedTask } : suppliedTask;
    const entryId = task?.entryId || task?.vorhaben || item.entryId || kern.entry;
    const entry = !(task?.vertragsfehler || task?.entryIssue || item.vertragsfehler || item.entryIssue) && L.entryById.get(entryId);
    const projectDraft = entry && options.projectConversation ? L.projectConversations(entry.id).find(draft => draft.operator === key) : null;
    const addressee = L.orchestrator ? L.laneName(L.orchestrator.key) : 'Research Coordination';
    const sourceQuestion = projectDraft?.text || (kern.wortlaut || item.text) || task?.auftrag || lane?.question || lane?.report?.Result || '';
    const question = sourceQuestion || tr("Gespräch mit ", "Conversation with ") + addressee;
    const preview = [ziel === 'schritt' ? tr("Lass uns diesen dokumentierten Schritt gemeinsam prüfen.\n", "Let us review this documented step together.\n") + question : question];
    if (entry) preview.push(tr("Projekt: ", "Project: ") + L.voll(entry.name) + ' (' + entry.id + ').');
    else if (entryId) preview.push(tr("Projektkennung: ", "Project ID: ") + entryId + tr(". Die Zuordnung ist nicht bestätigt.", ". The binding is not confirmed."));
    if (task?.kennung) preview.push(tr("Auftragskennung: ", "Assignment ID: ") + task.kennung);
    const z = [tr('Synthetische Demo. Keine Ausführung oder kanonische Änderung beauftragt.', 'Synthetic demo. No execution or canonical change authorized.'), tr("Gesprächsadressat: ", "Conversation addressee: ") + addressee + '.', tr("Fachlich zuständig laut Quelle: ", "Responsible according to source: ") + (lane ? L.laneName(lane.key) : tr("nicht eindeutig belegt", "not uniquely evidenced")) + '.'];
    if (entry?.notizPfad) z.push(tr("Projektdokument: ", "Project document: ") + entry.notizPfad);
    if (task?.auftrag && task.auftrag !== question) z.push(tr("Vollständiger Auftrag: ", "Complete assignment: ") + task.auftrag);
    if (ziel === 'schritt') z.push(tr("Gesprächsumfang: dokumentierter Schritt und seine Quellen. Kopieren startet keine Ausführung.", "Conversation scope: the documented step and its sources. Copying does not start execution."));
    if (item.voraussetzung) z.push(tr("Voraussetzung: ", "Prerequisite: ") + item.voraussetzung);
    if (item.kontext) z.push(tr("Kontext: ", "Context: ") + item.kontext);
    if (task?.zustand) z.push(tr("Dokumentierter Auftragszustand: ", "Recorded assignment state: ") + task.zustand + tr(". Dieser Quellenstand belegt keine aktuelle Ausführung.", ". This source state does not evidence current execution."));
    const laneSource = lane && ['lane', 'operator', 'abnahme'].includes(ziel);
    const projectContext = options.projectContext && entry && options.projectContext.id === entry.id ? options.projectContext : null;
    const registeredProject = projectContext && window.PROJEKTE?.projekte?.find(project => project.id === entry.id);
    const documentPath = registeredProject?.links?.notiz;
    const validProjectSource = projectContext && typeof documentPath === 'string' && documentPath.trim() === documentPath && documentPath.length > 0 && !/[\u0000-\u001f\u007f]/.test(documentPath)
      && !/^(?:[A-Za-z]:|\/)|\\/.test(documentPath) && !documentPath.split('/').some(part => part.startsWith('.'));
    const sourceContext = typeof options.sourceContext === 'string' ? options.sourceContext.trim() : '';
    z.push(tr('Quelle: ', 'Source: ') + (sourceContext || (projectContext ? validProjectSource ? documentPath : 'demo-guide' : (laneSource ? 'demo-sources/' + lane.key + '.md' : 'demo-guide' + (ziel === 'schritt' ? tr(", Vorhaben ", ", project ") + kern.entry : item.anker || item.id ? '#^' + (item.anker || item.id) : '')))));
    if (projectContext) z.push(tr('Gesprächsumfang: freiwillige Besprechung des dokumentierten Projekts. Keine neue Pflichtfrage. Projektkennung: ', 'Conversation scope: optional discussion of the documented project. No new mandatory question. Project ID: ') + entry.id);
    // The service hashes the complete lane document for each verified assignment.
    // A general lane conversation may reuse that source only when every row agrees.
    const laneTasks = laneSource && !review && !task
      ? [...(lane.auftraege || []), ...(lane.erledigt || []), ...(lane.abgenommen || [])] : [];
    const laneRevision = laneTasks.length && laneTasks.every(row => !row.vertragsfehler && !row.entryIssue
      && /^[a-f0-9]{64}$/.test(row.quellenrevision || '') && row.quellenrevision === laneTasks[0].quellenrevision)
      ? laneTasks[0].quellenrevision : '';
    const revision = review?.revision || options.revision || kern.revision || (laneSource ? task?.quellenrevision || laneRevision : '')
      || (validProjectSource && /^[a-f0-9]{64}$/.test(registeredProject.quellenrevision || '') ? registeredProject.quellenrevision : '');
    z.push(tr("Quellenrevision: ", "Source revision: ") + (revision || tr("nicht erfasst", "not recorded")));
    if (!laneSource && task && lane) z.push(tr("Zusätzliche Auftragsquelle: demo-sources/", "Additional assignment source: demo-sources/") + lane.key + tr(".md\nAuftragsquellenrevision: ", ".md\nAssignment source revision: ") + (task.quellenrevision || tr("nicht erfasst", "not recorded")));
    if (laneSource) {
      const stamp = (typeof lane.fileDate === 'string' ? lane.fileDate : lane.fileDate?.text) || lane.fileDate?.date;
      if (stamp) z.push(tr("Quellenstand: ", "Source date: ") + stamp);
    }
    if (projectDraft) z.push(tr("Gesprächsumfang: geprüfter optionaler Projektgesprächsentwurf, keine neue Pflichtfrage.\nBriefingquelle: ", "Conversation scope: checked optional project conversation draft, no new mandatory question.\nBriefing source: ") + projectDraft.source + tr("\nBerichtszeit: ", "\nReport time: ") + projectDraft.reportedAt);
    if (options.briefing) z.push(tr("Operatorrückmeldung: ", "Operator reply: ") + options.briefing.reportedAt + tr("\nBriefingquelle: ", "\nBriefing source: ") + options.briefing.source + (options.briefing.checked ? tr("\nBerichtete Prüfung: ", "\nReported check: ") + options.briefing.checked : ''));
    if (item.quelleUrl) z.push(tr("Originalzugang: ", "Original access: ") + item.quelleUrl);
    const issues = [...new Set([item.vertragsfehler, item.entryIssue, task?.vertragsfehler, task?.entryIssue].filter(Boolean))];
    if (issues.length) z.push(tr("Quellen-/Zuordnungslücke: ", "Source or binding gap: ") + issues.join('; '));
    if (review) {
      for (const [field, label] of [['zweck', tr("Zweck", "Purpose")], ['ergebnis', tr("Vorgelegtes Ergebnis", "Submitted output")], ['gepruft', tr("Berichtete Prüfung", "Reported check")]]) if (review[field]) z.push(label + ': ' + review[field]);
      if (review.quelle) z.push(tr("Ergebnisquelle: ", "Output source: ") + (review.quelle.text || '') + (review.quelle.href ? ' ' + review.quelle.href : ''));
      for (const material of review.ansehen || []) z.push(tr("Material: ", "Material: ") + material.text + (material.href ? ' ' + material.href : ''));
      if (!review.vorlage) z.push(tr("Eine vollständige Ergebnisvorlage ist nicht belegt; vor einem Urteil an der Quelle prüfen.", "A complete output submission is not evidenced. Check the source before giving a verdict."));
      if (review.abnahmeart) z.push(tr("Urteilsumfang: ", "Verdict scope: ") + review.abnahmeart);
      for (const warning of review.warnings || []) z.push(tr("Quellenhinweis: ", "Source note: ") + warning);
    } else if (task) {
      if (task.ergebnis || item.ergebnis) z.push(tr("Vorgelegtes Ergebnis: ", "Submitted output: ") + (task.ergebnis || item.ergebnis));
      if (task.pruefung || item.pruefung) z.push(tr("Berichtete Prüfung: ", "Reported check: ") + (task.pruefung || item.pruefung));
      for (const material of task.ergebnisZiele || []) z.push(tr("Material: ", "Material: ") + material.text + (material.href ? ' ' + material.href : ''));
    }
    if (options.stale || options.unavailable) z.push(tr("Quelle geändert oder nicht neu lesbar; aktuellen Stand zuerst prüfen.", "Source changed or unavailable for a fresh read. Check the current state first."));
    const saved = ziel === 'abnahme' && task ? abnahme(task) || review?.answer : get(item.id);
    if (saved) z.push('Historischer Beleg: ' + (saved.art || saved.urteil || tr("Notiz", "Note")) + ', ' + (saved.zeit || saved.empfangen || 'Datum nicht erfasst') + '. Keine neue Entscheidung.\n' + [saved.notiz, saved.wortlaut, saved.quellenrevision || saved.revision].filter(Boolean).join('\n'));
    const message = lane && window.LEITSTAND_INSTANZ?.letzte(lane, task ? 'auftrag:' + lane.key + ':' + task.kennung : lane.key);
    if (message) z.push('Historische Nachricht vom ' + (message.zeit || 'Datum nicht erfasst') + ': ' + message.text);
    z.push(tr("Im bestehenden Chat klären; aktuelle Quellen und geltende Autorisierung vor einer Änderung prüfen.", "Discuss in the existing chat. Check current sources and applicable authorization before making a change."));
    // Fingerprint raw evidence, including wording when no revision exists; UI language is not a source change.
    const sourceBasis = JSON.stringify({
      target: ziel, ...(sourceContext ? { sourceContext } : {}), sourceQuestion, project: entry?.id || entryId || '', document: validProjectSource ? documentPath : '',
      revision, lane: laneSource ? lane.key : '', sourceDate: laneSource ? lane.fileDate : null,
      laneEvidence: laneSource ? [lane.setupSource, lane.setupRevision] : null,
      anchor: item.anker || item.id || '', originalAccess: item.quelleUrl || '',
      prerequisite: item.voraussetzung || '', context: item.kontext || '', issues,
      task: task ? [task.kennung, task.auftrag, task.zustand, task.quellenrevision,
        task.ergebnis || item.ergebnis, task.pruefung || item.pruefung, task.ergebnisZiele] : null,
      report: laneSource && !task ? lane.report : null,
      projectDraft: projectDraft ? [projectDraft.text, projectDraft.source, projectDraft.revision, projectDraft.reportedAt] : null,
      briefing: options.briefing ? [options.briefing.source, options.briefing.reportedAt, options.briefing.checked] : null,
      review: review ? [review.revision, review.zweck, review.ergebnis, review.gepruft, review.quelle, review.ansehen, review.vorlage, review.abnahmeart] : null,
      stale: Boolean(options.stale), unavailable: Boolean(options.unavailable), saved, message,
    });
    return { preview: preview.join('\n'), action: preview[0], details: z.join('\n'), sourceBasis, sourceOperator: key || '', sourceRevision: revision };
  }

  function projectDiscussion(projectId) {
    const drafts = L.projectConversations(projectId);
    if (!drafts.length) return null;
    return el('div', { class: 'project-conversations' }, ...drafts.map(draft => discussion({
      id: 'project-discussion-' + projectId + '-' + draft.operator, entry: projectId,
      operator: draft.operator, text: draft.text,
    }, { ziel: 'operator', purpose: projectId, revision: draft.revision, briefing: draft })));
  }

  function controlIcon(kind) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    for (const [name, value] of Object.entries({ viewBox: '0 0 24 24', class: 'chat-control-icon', 'aria-hidden': 'true', focusable: 'false', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })) svg.setAttribute(name, value);
    const shapes = kind === 'copy'
      ? [['rect', { x: '8', y: '8', width: '12', height: '12', rx: '2' }], ['path', { d: 'M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3' }]]
      : kind === 'check' ? [['path', { d: 'm5 12 4 4L19 6' }]] : [['path', { d: 'm6 9 6 6 6-6' }]];
    for (const [tag, attributes] of shapes) {
      const shape = document.createElementNS(ns, tag);
      for (const [name, value] of Object.entries(attributes)) shape.setAttribute(name, value);
      svg.append(shape);
    }
    return svg;
  }
  const discussions = new Map();
  const discussionViews = new WeakMap();
  // Read only actual rendered discussions with an exact resolved source operator.
  function conversationSnapshots({ operators = [], nodes = document.querySelectorAll('.chat-discussion') } = {}) {
    const wanted = new Set(operators);
    return [...nodes].flatMap(node => {
      if ((node.dataset.chatKey || '').includes(':coordination-briefing-')) return [];
      const snapshot = discussionViews.get(node)?.snapshot?.();
      return snapshot && wanted.has(snapshot.operator) ? [snapshot] : [];
    });
  }
  // A late optional source may replace a question or a generic conversation.
  // Keep edited removed drafts explicitly separate from the newly current source.
  function refreshWithDrafts(container, render) {
    const active = document.activeElement;
    const key = active?.closest?.('.chat-discussion')?.dataset.chatKey;
    const control = active?.dataset.chatControl;
    const saved = { id: active?.id, href: active?.getAttribute?.('href'), start: active?.selectionStart, end: active?.selectionEnd };
    const retained = [...container.querySelectorAll('.chat-discussion')].filter(node => {
      const draft = discussions.get(node.dataset.chatKey)?.composition;
      return draft?.note || draft?.selected.size || node.contains(active);
    });
    const open = [...container.querySelectorAll('details[open][id]')].map(node => node.id);
    const position = { left: window.scrollX, top: window.scrollY };
    render();
    const missing = retained.filter(node => ![...container.querySelectorAll('.chat-discussion')].some(current => current.dataset.chatKey === node.dataset.chatKey));
    if (missing.length) container.append(el('section', { class: 'chat-retained-drafts' },
      el('h3', { text: tr('Frühere Gesprächsentwürfe', 'Earlier conversation drafts') }),
      el('p', { class: 'chat-composition-warning', text: tr('Die Briefingquelle hat sich geändert. Diese begonnenen Entwürfe bleiben zum Weiterbearbeiten und Kopieren erhalten. Sie geben den früheren Quellenstand wieder.', 'The briefing source has changed. These started drafts remain available for editing and copying. They reflect the earlier source state.') }), ...missing));
    for (const id of open) { const node = document.getElementById(id); if (node?.tagName === 'DETAILS') node.open = true; }
    const node = key && control
      ? [...container.querySelectorAll('.chat-discussion')].find(current => current.dataset.chatKey === key)?.querySelector('[data-chat-control="' + CSS.escape(control) + '"]')
      : saved.id ? container.querySelector('#' + CSS.escape(saved.id))
        : saved.href ? [...container.querySelectorAll('a')].find(link => link.getAttribute('href') === saved.href) : null;
    node?.focus({ preventScroll: true });
    if (typeof node?.setSelectionRange === 'function' && typeof saved.start === 'number') node.setSelectionRange(saved.start, saved.end);
    window.scrollTo(position);
  }
  function refreshDiscussions() {
    for (const node of document.querySelectorAll('.chat-discussion')) {
      const view = discussionViews.get(node);
      view?.refreshText();
      view?.show();
    }
  }
  if (typeof window.addEventListener === 'function') window.addEventListener('ui-language-before-change', event => {
    const drafts = [...discussions].filter(([, state]) => state.composition && (state.composition.note || state.composition.selected.size));
    if (!drafts.length) return;
    try {
      for (const [key, state] of drafts) {
        const draft = state.composition;
        const value = JSON.stringify({ base: draft.base, note: draft.note, selected: [...draft.selected] });
        const storageKey = 'mission-control-demo-composition:' + key;
        sessionStorage.setItem(storageKey, value);
        if (sessionStorage.getItem(storageKey) !== value) throw new Error('Draft not retained');
      }
    } catch {
      if (!window.confirm(tr('Der Browser kann deinen Gesprächsentwurf nicht behalten. Abbrechen lässt ihn zum Kopieren geöffnet. Trotzdem die Sprache wechseln und den Entwurf verwerfen?', 'The browser cannot retain your conversation draft. Cancel keeps it open for copying. Switch language and discard the draft anyway?'))) event.preventDefault();
    }
  });
  let discussionSequence = 0;

  function compositionControls(state, readOptions, onChange, persist) {
    const draft = state.composition ||= { base: null, note: '', selected: new Map() };
    const kinds = { artifact: tr("Artefakt", "Artifact"), workflow: tr("Arbeitsweg", "Workflow"), verified: tr("Belegt", "Evidence"), limit: tr("Prüfgrenze", "Check limit") };
    const list = el('span', { class: 'chat-context-items', role: 'group', 'aria-label': tr("Gesprächsfokus auswählen", "Choose conversation focus") });
    const note = el('textarea', { class: 'chat-composition-note', rows: '2', 'aria-label': tr("Persönliche Ergänzung", "Personal note"), 'data-chat-control': 'note' });
    const warning = el('span', { class: 'chat-composition-warning', role: 'status' });
    const previous = el('span', { class: 'chat-previous-contexts' });
    const rebase = el('button', { type: 'button', class: 'chat-composition-rebase', 'data-chat-control': 'rebase' }, tr("Aktuelle Quellenbasis verwenden", "Use current source basis"));
    const summary = el('summary', { 'data-chat-control': 'composition', text: tr('Gespräch ergänzen', 'Add to conversation') });
    const root = el('details', { class: 'chat-composer' }, summary, list,
      el('label', {}, el('span', { text: tr('Persönliche Ergänzung, wird mit dem Prompt kopiert', 'Personal note, included when copying the prompt') }), note), warning, previous, rebase);
    root.open = state.composerOpen ?? Boolean(draft.note || draft.selected.size);
    root.addEventListener('toggle', () => { state.composerOpen = root.open; });
    let currentBase = '';
    let renderedItems = '';
    let renderedPrevious = '';
    const sourceText = source => typeof source === 'string' ? source : JSON.stringify(source);
    const fingerprint = item => JSON.stringify([item.kind, item.text, item.source, item.revision]);
    note.value = draft.note;
    note.addEventListener('input', () => { draft.note = note.value; onChange(); persist(); });
    rebase.addEventListener('click', () => { draft.base = currentBase; onChange(); });
    function refresh(base, legacyBase) {
      const suppliedRevision = readOptions().compositionRevision;
      const sourceRevision = typeof suppliedRevision === 'function' ? suppliedRevision() : suppliedRevision || base;
      currentBase = sourceRevision;
      // Migrate an older draft only when its complete previous source prompt still matches exactly.
      if (!suppliedRevision && draft.base === legacyBase) draft.base = sourceRevision;
      if (draft.base === null) draft.base = sourceRevision;
      const supplied = readOptions().contextItems;
      const raw = typeof supplied === 'function' ? supplied() : supplied;
      const candidates = Array.isArray(raw) ? raw : [];
      const ids = new Set();
      const duplicateIds = new Set();
      for (const item of candidates) if (ids.has(item?.id)) duplicateIds.add(item.id); else ids.add(item?.id);
      const items = candidates.filter(item => item && typeof item.id === 'string' && item.id.trim()
        && !duplicateIds.has(item.id) && Object.hasOwn(kinds, item.kind)
        && typeof item.label === 'string' && item.label.trim() && typeof item.text === 'string' && item.text.trim()
        && item.source && typeof item.revision === 'string');
      const current = new Map(items.map(item => [item.id, item]));
      const signature = JSON.stringify(items);
      if (signature !== renderedItems) {
        const activeId = document.activeElement?.dataset?.compositionId;
        const hadFocus = list.contains(document.activeElement);
        list.replaceChildren(...items.map(item => {
          const button = el('button', { type: 'button', class: 'chat-context-item', 'data-kind': item.kind,
            'data-composition-id': item.id, 'data-chat-control': 'context-' + encodeURIComponent(item.id), title: item.text }, kinds[item.kind] + ': ' + item.label);
          button.addEventListener('click', () => {
            if (draft.selected.has(item.id)) draft.selected.delete(item.id);
            else draft.selected.set(item.id, JSON.parse(JSON.stringify(item)));
            onChange();
          });
          return button;
        }));
        renderedItems = signature;
        if (hadFocus) ([...list.querySelectorAll('button')].find(button => button.dataset.compositionId === activeId) || note).focus({ preventScroll: true });
      }
      for (const button of list.querySelectorAll('button')) button.setAttribute('aria-pressed', String(draft.selected.has(button.dataset.compositionId)));
      if (note.value !== draft.note) note.value = draft.note;
      const staleBase = draft.base !== currentBase;
      const staleItem = [...draft.selected].some(([id, item]) => !current.has(id) || fingerprint(current.get(id)) !== fingerprint(item));
      const oldItems = [...draft.selected].filter(([id, item]) => !current.has(id) || fingerprint(current.get(id)) !== fingerprint(item));
      const previousSignature = JSON.stringify(oldItems);
      if (previousSignature !== renderedPrevious) {
        previous.replaceChildren(...oldItems.map(([id, item]) => {
          const button = el('button', { type: 'button', class: 'chat-previous-context-remove',
            'data-chat-control': 'previous-' + encodeURIComponent(id), title: item.text }, tr("Frühere Auswahl entfernen: ", "Remove previous selection: ") + item.label);
          button.addEventListener('click', () => { draft.selected.delete(id); onChange(); if (!button.isConnected) note.focus({ preventScroll: true }); });
          return button;
        }));
        renderedPrevious = previousSignature;
      }
      warning.hidden = !staleBase && !staleItem;
      if (staleBase || staleItem) root.open = true;
      warning.textContent = staleBase || staleItem ? tr("Quellenbasis oder ausgewählte Bausteine haben sich geändert. Frühere Auswahl und persönliche Ergänzung bleiben erhalten; frühere Angaben sind kein aktueller Quellenstand.", "The source basis or selected items have changed. Your earlier selection and personal note are retained. Earlier statements do not represent the current source state.") : '';
      rebase.hidden = !staleBase;
      const extra = [];
      if (warning.textContent) extra.push(warning.textContent);
      for (const [id, item] of draft.selected) {
        const old = !current.has(id) || fingerprint(current.get(id)) !== fingerprint(item);
        extra.push((old ? tr("Frühere Auswahl (Quelle geändert oder nicht mehr verfügbar)", "Previous selection (source changed or no longer available)") : kinds[item.kind]) + ': ' + item.text
          + tr("\nQuelle: ", "\nSource: ") + sourceText(item.source) + tr("\nRevision: ", "\nRevision: ") + (item.revision || tr("nicht erfasst", "not recorded")));
      }
      if (draft.note) extra.push(tr("Persönliche Ergänzung (lokaler Entwurf):\n", "Personal note (local draft):\n") + draft.note);
      return extra.length ? tr("\n\nGesprächsfokus\n", "\n\nConversation focus\n") + extra.join('\n\n') : '';
    }
    return { root, refresh };
  }


  /** One inline preparation mechanism; local composition stays separate from source facts. */
  function discussion(item, options = {}) {
    const readItem = () => typeof item === 'function' ? item() : item;
    const readOptions = () => ({ compose: true, ...(typeof options === 'function' ? options() : options) });
    const source = readItem();
    const opts = readOptions();
    const key = [opts.ziel || '', source?.operator || source?.key || '', source?.kennung || source?.id || ''].join(':')
      + (opts.purpose ? ':' + opts.purpose : '');
    const state = discussions.get(key) || { open: false };
    const draftKey = 'mission-control-demo-composition:' + key;
    if (opts.compose && !state.composition) {
      try {
        const saved = JSON.parse(sessionStorage.getItem(draftKey));
        if (saved && typeof saved.note === 'string' && Array.isArray(saved.selected)) state.composition = {
          base: typeof saved.base === 'string' ? saved.base : null, note: saved.note,
          selected: new Map(saved.selected.filter(pair => Array.isArray(pair) && typeof pair[0] === 'string' && pair[1] && typeof pair[1].text === 'string' && typeof pair[1].revision === 'string')),
        };
      } catch { /* The current in-memory draft works when storage is unavailable. */ }
    }
    const persist = () => {
      if (!state.composition) return;
      const draft = state.composition;
      try { sessionStorage.setItem(draftKey, JSON.stringify({ base: draft.base, note: draft.note, selected: [...draft.selected] })); }
      catch { /* Current-page composition remains usable without browser storage. */ }
    };
    discussions.set(key, state);
    const active = document.activeElement;
    const restoreControl = active?.closest?.('.chat-discussion')?.dataset.chatKey === key ? active.dataset.chatControl : '';
    const textId = 'chat-text-' + (++discussionSequence);
    const expand = el('button', { type: 'button', class: 'chat-expand', 'data-chat-control': 'expand', 'aria-controls': textId + '-details' }, tr("Mehr", "More"));
    const copy = el('button', { type: 'button', class: 'chat-prompt-copy', 'data-chat-control': 'copy' }, controlIcon('copy'));
    let controlContext = '';
    const full = el('span', { id: textId, class: 'chat-prompt-text', tabindex: '0', 'data-chat-control': 'text' });
    const status = el('span', { class: 'chat-prompt-status', role: 'status' });
    const controls = el('span', { class: 'chat-prompt-controls' }, copy, expand);
    const body = el('span', { class: 'chat-prompt-body' }, full, controls);
    const root = el('span', { class: 'chat-discussion', 'data-chat-key': key },
      el('span', { class: 'chat-prompt-label', text: tr('Gesprächsprompt', 'Conversation prompt') }), body, status);
    const composer = opts.compose ? compositionControls(state, readOptions, () => { refreshText(); show(); persist(); }, persist) : null;
    if (composer) root.append(composer.root);
    let renderedSource;
    const refreshText = (force = false) => {
      const currentOptions = readOptions();
      const parts = promptParts(readItem(), currentOptions);
      renderedSource = parts;
      const base = parts.preview + '\n\n' + parts.details;
      // A compact action keeps its literal first sentence; every remaining character stays in the full prompt.
      const action = currentOptions.actionPreview ? (/^.*?[.!?](?=\s|$)/s.exec(parts.action)?.[0] || parts.action) : '';
      const addition = composer?.refresh(parts.sourceBasis, base) || '';
      const text = base + addition;
      const binding = base + addition;
      const selection = window.getSelection();
      if (!force && full.textContent && state.renderedBinding === binding && selection && !selection.isCollapsed && full.contains(selection.anchorNode)) return full.textContent;
      state.renderedBinding = binding;
      if (full.textContent !== text) {
        full.replaceChildren(el('span', { class: 'chat-prompt-preview', text: action || parts.preview }),
          ...(action ? [el('span', { class: 'chat-prompt-context', hidden: !state.open, text: parts.preview.slice(action.length) })] : []),
          el('span', { id: textId + '-details', class: 'chat-prompt-details', text: '\n\n' + parts.details + addition }));
      }
      if (state.feedbackBinding && state.feedbackBinding !== text && state.copied) {
        state.status = tr("Der Prompt hat sich seit dem Kopieren geändert. Kopiere die aktualisierte Fassung erneut.", "The prompt has changed since copying. Copy the updated version again.");
        state.copied = false;
      }
      const beginning = text.split('\n\n')[0].replace(/\s+/g, ' ').trim();
      const subject = beginning.length > 120 ? beginning.slice(0, 120).trimEnd() + '…' : beginning;
      controlContext = [currentOptions.purpose, subject].filter(Boolean).join(': ');
      return text;
    };
    const show = () => {
      full.hidden = false;
      full.querySelector('.chat-prompt-details').hidden = !state.open;
      const context = full.querySelector('.chat-prompt-context');
      if (context) context.hidden = !state.open;
      const expansion = (state.open ? tr('Quellenkontext schließen', 'Hide source context') : tr('Vollständigen Prompt lesen', 'Read full prompt')) + ': ' + controlContext;
      const copying = tr("Prompt kopieren", "Copy prompt") + ': ' + controlContext;
      expand.setAttribute('aria-label', expansion);
      expand.title = expansion;
      copy.setAttribute('aria-label', copying);
      copy.title = copying;
      expand.setAttribute('aria-expanded', String(state.open));
      expand.textContent = state.open ? tr('Quellenkontext schließen', 'Hide source context') : tr('Vollständigen Prompt lesen', 'Read full prompt');
      copy.replaceChildren(controlIcon(state.copied ? 'check' : 'copy'),
        el('span', { text: tr('Prompt kopieren', 'Copy prompt') }));
      status.className = state.status === tr("Kopiert", "Copied") ? 'chat-prompt-status sr-only' : 'chat-prompt-status';
      status.textContent = state.status || '';
    };
    expand.addEventListener('click', () => {
      refreshText();
      state.open = !state.open;
      show();
    });
    copy.addEventListener('click', async () => {
      const text = refreshText(true);
      copy.disabled = true;
      const ok = await L.kopiere(text);
      copy.disabled = false;
      // A source/filter redraw may replace this component while copying.
      // Resolve only the same source/purpose identity, preserving other work.
      const currentNode = root.isConnected ? root
        : [...document.querySelectorAll('.chat-discussion')].find(node => node.dataset.chatKey === key);
      const current = currentNode && discussionViews.get(currentNode);
      const currentText = current?.refreshText();
      state.feedbackBinding = text;
      state.copied = ok;
      state.status = ok ? currentText && currentText !== text
        ? tr("Eine frühere Fassung wurde kopiert. Prüfe den inzwischen geänderten Prompt erneut.", "An earlier version was copied. Review the changed prompt again.")
        : tr("Kopiert", "Copied")
        : tr("Kopieren nicht möglich. Der vollständige Text bleibt zum manuellen Kopieren geöffnet.", "Copying failed. The complete text remains open for manual copying.");
      if (!ok) state.open = true;
      if (!current) return;
      current.copy.disabled = false;
      current.show();
      if (ok && state.status === tr("Kopiert", "Copied")) {
        const token = state.copyToken = {};
        setTimeout(() => {
          if (state.copyToken !== token || state.status !== tr("Kopiert", "Copied")) return;
          state.copied = false; state.status = '';
          for (const node of document.querySelectorAll('.chat-discussion')) if (node.dataset.chatKey === key) discussionViews.get(node)?.show();
        }, 1800);
      }
      const activeNow = document.activeElement;
      const restore = !activeNow || activeNow === document.body || root.contains(activeNow) || currentNode.contains(activeNow);
      if (!ok && restore) {
        current.full.focus({ preventScroll: true });
        const range = document.createRange();
        range.selectNodeContents(current.full);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      } else if (ok && restore) current.copy.focus({ preventScroll: true });
    });
    const snapshot = () => {
      const current = promptParts(readItem(), readOptions());
      const warning = root.querySelector('.chat-composition-warning')?.textContent || '';
      const changed = Boolean(renderedSource && renderedSource.sourceBasis !== current.sourceBasis);
      return { key, operator: renderedSource?.sourceOperator || '', text: full.textContent,
        personalNote: state.composition?.note || '', edited: Boolean(state.composition?.note || state.composition?.selected.size),
        sourceRevision: renderedSource?.sourceRevision || '', stale: changed || Boolean(warning),
        sourceWarning: warning || (changed ? tr('Die Quelle des angezeigten Prompts hat sich seit der Darstellung geändert.', 'The displayed prompt source has changed since rendering.') : '') };
    };
    discussionViews.set(root, { refreshText, show, full, copy, snapshot });
    refreshText();
    show();
    if (restoreControl) requestAnimationFrame(() => {
      // The same source can appear twice; only restore a control actually replaced.
      if (root.isConnected && !active?.isConnected && (!document.activeElement || document.activeElement === document.body || document.activeElement === active)) {
        root.querySelector('[data-chat-control="' + restoreControl + '"]')?.focus({ preventScroll: true });
      }
    });
    return root;
  }

  function kopierKnopf(item, ziel) {
    return discussion(item, { ziel });
  }

  // What an item is for the inbox: a point carries its question and revision,
  // a step's identifier hashes its wording and so is its own revision.
  function kernVon(item, ziel, revision) {
    if (ziel === 'schritt') {
      return { ziel, entry: item.teilVon || item.entry || '', wortlaut: item.titel || '', revision: revision ?? item.id };
    }
    return { ziel, entry: item.projekt || item.entry || '', wortlaut: item.frage || '', revision: revision ?? item.revision ?? '' };
  }

  // Composite controls submit kind and note together; changing one hidden
  // field first would otherwise send the previous kind with the new note.
  function antwort(item, { art, notiz = '', bis = '' }, { revision, ziel } = {}) {
    const target = ziel || (item?.art === 'schritt' ? 'schritt' : 'punkt');
    const key = artKey(art);
    if (!item?.id || !artVon.get(key)?.ziele.includes(target)) return false;
    return speichere(item.id, { art: key, notiz: String(notiz).trim(), bis: String(bis) }, kernVon(item, target, revision));
  }

  /**
   * Fieldset for one point or step. ziel 'punkt' takes a posten record
   * {id, frage, projekt, revision}; ziel 'schritt' an einheiten record
   * {id, titel, teilVon} with art schritt. ziel defaults from item.art.
   */
  function create(item, { revision, ziel } = {}) {
    if (!item?.id) throw new Error('LEITSTAND_ANTWORTEN.create needs an item with id');
    const art = ziel || (item.art === 'schritt' ? 'schritt' : 'punkt');
    if (art !== 'punkt' && art !== 'schritt') throw new Error(`LEITSTAND_ANTWORTEN.create: unknown ziel ${art}`);
    const kern = kernVon(item, art, revision);
    const name = `antwort-${item.id}`;
    const kurz = L.questionLabel(kern.wortlaut);
    const bisher = get(item.id);
    const gespeichert = passtZumKern(item.id, bisher, kern) ? bisher : {};

    const gesetzt = el('span', { class: 'gesetzt', 'aria-live': 'polite' });
    const fehler = el('span', { class: 'meldung', role: 'status' });
    const wiederholen = el('button', { type: 'button', class: 'uebertragung-wiederholen', text: tr("Erneut übertragen", "Retry transfer"), hidden: true });
    const datum = el('input', { type: 'date', min: L.todayIso(), 'aria-label': tr(`später bis, ${kurz}`, `defer until, ${kurz}`) });
    datum.value = gespeichert.bis || '';
    const bis = el('label', { class: tr("bis", "until"), title: tr("Der Punkt kommt an diesem Tag wieder.", "The item returns on this day.") }, tr("bis", "until"), datum);
    const notiz = el('input', { type: 'text', class: 'notiz', placeholder: tr("Notiz", "Note"), 'aria-label': tr(`Notiz zu ${kurz}`, `Note for ${kurz}`) });
    notiz.value = gespeichert.notiz || '';

    function zeige() {
      const a = get(item.id);
      const def = a?.art ? artVon.get(a.art) : null;
      bis.hidden = a?.art !== 'spaeter';
      gesetzt.className = `gesetzt ${a?.art || ''}`.trim();
      if (!a) {
        wiederholen.hidden = true;
        gesetzt.replaceChildren();
        gesetzt.removeAttribute('title');
        return;
      }
      const aktuell = passtZumKern(item.id, a, kern);
      wiederholen.hidden = !a.art || !aktuell || Boolean(a.uebertragen && !a.fehler);
      wiederholen.disabled = uebertragungen.has(uebertragungsId(item.id, a));
      const geaendert = aktuell ? '' : tr(", passt nicht zur aktuellen Fassung", ", does not match the current version");
      gesetzt.title = `Im Browser gespeichert am ${L.fmtLang(stempel(a.zeit))} ${stempel(a.zeit).slice(11)}${geaendert}`;
      const uebertragung = a.uebertragen && !a.fehler
        ? el('span', { class: 'uebertragen', title: tr(`im Eingang seit ${L.fmtLang(stempel(a.uebertragen))} ${stempel(a.uebertragen).slice(11)}`, `In inbox since ${L.fmtLang(stempel(a.uebertragen))} ${stempel(a.uebertragen).slice(11)}`), text: tr(`übertragen ${stempel(a.uebertragen).slice(11)}`, `Transferred ${stempel(a.uebertragen).slice(11)}`) })
        : a.fehler ? el('span', { class: 'nicht-uebertragen', text: tr(`nicht übertragen: ${a.fehler}`, `Not transferred: ${a.fehler}`) })
          : a.art ? el('span', { class: 'nicht-uebertragen', text: tr("im Browser gespeichert, Übertragung ausstehend", "Saved in this browser, awaiting transfer") }) : null;
      gesetzt.replaceChildren(`${aktuell ? '' : tr("Frühere Antwort: ", "Earlier answer: ")}${def ? def.label : tr("Notiz", "Note")}${!aktuell && a.notiz ? `, Notiz: ${a.notiz}` : ''}${geaendert}`,
        ...(uebertragung ? [', ', uebertragung] : []));
    }

    function merke(aenderung) {
      fehler.textContent = speichere(item.id, aenderung, kern) ? '' : 'nicht gespeichert';
      zeige();
    }

    const angeboten = ARTEN.filter((a) => a.ziele.includes(art));
    const reihen = Object.entries(GRUPPEN).map(([gruppe, titel]) => {
      const arten = angeboten.filter((a) => a.gruppe === gruppe);
      return el('div', { class: `reihe ${gruppe}`, role: 'group', 'aria-label': titel },
        ...arten.map((a) => {
          const input = el('input', { type: 'radio', name, value: a.wert, title: a.hilfe, checked: gespeichert.art === a.wert });
          input.addEventListener('change', () => merke({ art: a.wert }));
          return el('label', { title: a.hilfe }, input, a.label);
        }));
    });
    const feld = el('fieldset', { class: 'antwort', 'data-punkt': item.id, 'data-ziel': art },
      el('legend', { class: 'sr-only', text: tr(`Antwort zu ${kurz}`, `Answer for ${kurz}`) }), ...reihen, bis, notiz, kopierKnopf(item, art, kern), gesetzt, wiederholen, fehler);
    // Atomic submissions and transfer results refresh every mounted copy.
    const anhoeren = (ev) => {
      if (!feld.isConnected) {
        document.removeEventListener('mission-control-demo-antwort', anhoeren);
        document.removeEventListener('mission-control-demo-uebertragung', anhoeren);
      }
      else if (ev.detail?.punktId === item.id) zeige();
    };
    document.addEventListener('mission-control-demo-antwort', anhoeren);
    document.addEventListener('mission-control-demo-uebertragung', anhoeren);
    wiederholen.addEventListener('click', async () => {
      wiederholen.disabled = true;
      await sende(item.id);
      zeige();
    });
    datum.addEventListener('change', () => merke({ bis: datum.value }));
    notiz.addEventListener('change', () => merke({ notiz: notiz.value.trim() }));
    zeige();
    return feld;
  }

  /** Self-contained prompt for one point or step, as its copy button writes it. */
  function prompt(item, options = {}) {
    const parts = promptParts(item, options);
    return parts.preview + '\n\n' + parts.details;
  }

  function promptParts(item, options = {}) {
    const art = options.ziel || (item.art === 'schritt' ? 'schritt' : 'punkt');
    return promptText(item, art, kernVon(item, art, options.revision), options);
  }

  /**
   * Stores and sends the verdict on a finished lane {operator, kennung}:
   * art abgenommen, or zurueck with the sentence notiz. A return without a
   * sentence is refused and nothing is stored; returns whether it was stored.
   */
  function abnehmen(lane, art, notiz = '', quellenrevision = '') {
    const satz = String(notiz ?? '').replace(/\s+/g, ' ').trim();
    if (!(art in ABNAHME_WORT) || !lane?.operator || !lane?.kennung || (art === 'zurueck' && !satz)) return false;
    return speichere(L.abnahmeId(lane.operator, lane.kennung), { art, notiz: satz, antwortId: crypto.randomUUID(), quellenrevision }, { ziel: 'abnahme', lane: lane.operator, kennung: lane.kennung });
  }

  /** The stored verdict on a finished lane, or null. */
  const abnahme = (lane) => get(L.abnahmeId(lane.operator, lane.kennung));

  /** Answers to points and steps still in ACTIVE-WORK, split by answer group. */
  function count() {
    const out = { entschieden: 0, beauftragt: 0 };
    const antworten = all();
    for (const [id, a] of Object.entries(antworten)) {
      if ((!L.postenById.has(id) && !schrittById.has(id)) || !a.art) continue;
      const zustand = L.antwortStatus(id, antworten);
      if (zustand === 'beauftragt') out.beauftragt += 1;
      else if (zustand === 'entschieden' || zustand === 'spaeter') out.entschieden += 1;
    }
    return out;
  }

  window.LEITSTAND_ANTWORTEN = { projectDiscussion,
    arten: ARTEN.map((a) => ({ ...a, ziele: [...a.ziele] })),
    gruppen: { ...GRUPPEN },
    create, antwort, get, all, status, prompt, discussion, refreshDiscussions, refreshWithDrafts, conversationSnapshots, count, sende, abnehmen, abnahme, abnahmeWort: { ...ABNAHME_WORT }, stempel,
  };
})();
