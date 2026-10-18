// Instance card of a lane: a field to tell it something in the operator's
// own words and, behind "mehr", the lane's complete report. Replaces the
// answer kinds of antworten.js for lanes, as the operator found fourteen
// radios wrong for an instance. On 15 October 2026 the operator dropped the
// state word (läuft, fertig), which Mission Control cannot know live, and the
// lines Jetzt and Ergebnis, which quoted old tasks; the report behind "mehr"
// holds them. The lane's question to the operator stays visible, because
// Fragen and Wer decide on it here; kopf: false leaves out the head where
// the surrounding row already names the lane. Reads a lane
// object of window.LEITSTAND.lanes (model.js) and never mutates it; the DOM
// helpers come from window.LEITSTAND_SHELL (shell.js).
//
// A message goes to POST /api/answers of serve.py as a record with ziel
// "lane" (knowledge/integration.md, Answer inbox); it reaches the lane file
// only through the orchestrating session. For a lane other than the orchestrator the
// button also copies a ready prompt, so the operator can paste it into that
// instance himself. The last message per lane stays in localStorage under
// mission-control-demo-d-nachrichten, a per-browser convenience: it shows the transfer
// on the card after a reload. Optional result questions use a separate lane-and-
// assignment key in the same store. Required messages let views take a lane question off the
// day list once the operator answered its current wording. A sent message
// fires "mission-control-demo-nachricht" with laneKey, ok, optional and, when scoped, kennung.
// All text goes in through textContent.
(function () {
  'use strict';
  const tr = (de, en) => typeof window !== 'undefined' && window.UI_LANGUAGE ? window.UI_LANGUAGE.t(de, en) : de;
  const L = window.LEITSTAND;
  const S = window.LEITSTAND_SHELL;
  if (!L || !S) throw new Error('instanz.js needs model.js and shell.js loaded first');
  const { el, mitTitel, ohnePunkt, voll } = S;

  const STORE = L.store('mission-control-demo-d-nachrichten');
  const ENDPUNKT = '/api/answers';
  const coordinatorName = L.orchestrator ? L.laneName(L.orchestrator.key) : 'Koordination';
  // Same bound as serve.py validates for a lane message.
  const MAX_NOTIZ = 2000;
  const LANE_ORDNER = 'demo-sources/';
  let folge = 0;

  const leer = (s) => !String(s ?? '').trim() || /^(none|keine?r?|nichts)\.?$/i.test(String(s).trim());
  const uhr = L.uhrVon;
  const tag = (d) => L.fmtLang(L.localIso(d));
  const istHeute = (d) => tag(d) === tag(new Date());

  // Same hash as uebersicht.js uses for the revision of a lane question.
  function hash(s) {
    let h = 5381;
    for (const c of String(s)) h = ((h << 5) + h + c.codePointAt(0)) >>> 0;
    return h.toString(16);
  }

  // Time stamp of the lane file. model.js passes the generator's stand
  // ({date, text}, the text opening with "YYYY-MM-DD HH:MM" and an optional
  // offset) or the generation time as a string. A stamp without a time keeps
  // its date only and is never given a time of day.
  function stempel(fileDate) {
    const quelle = typeof fileDate === 'string' ? fileDate : fileDate?.text || '';
    const datum = typeof fileDate === 'string' ? fileDate.slice(0, 10) : fileDate?.date || quelle.slice(0, 10);
    const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})(?::\d{2})?(?:\s*([+-]\d{2}):?(\d{2}))?/.exec(quelle);
    if (!m) {
      return /^\d{4}-\d{2}-\d{2}$/.test(datum) ? { datum, zeit: '', date: null, revision: datum } : { datum: '', zeit: '', date: null, revision: '' };
    }
    const iso = `${m[1]}T${m[2]}:${m[3]}:00${m[4] ? `${m[4]}:${m[5]}` : ''}`;
    const date = new Date(iso);
    return { datum: m[1], zeit: `${m[2]}:${m[3]}`, date: Number.isNaN(date.getTime()) ? null : date, revision: `${m[1]} ${m[2]}:${m[3]}` };
  }

  // "vor N Minuten" up to an hour, "vor N Stunden" up to two days, then days.
  function alter(s, jetzt = new Date()) {
    if (!s.date) return s.datum ? `vom ${L.fmtLang(s.datum)}` : tr('ohne Zeitstempel', "No timestamp");
    const min = Math.max(0, Math.floor((jetzt - s.date) / 60000));
    if (min < 1) return tr('gerade eben', "Just now");
    if (min < 60) return tr(`vor ${min} ${min === 1 ? 'Minute' : 'Minuten'}`, `${min} ${min === 1 ? 'minute' : 'minutes'} ago`);
    const std = Math.floor(min / 60);
    if (std < 48) return tr(`vor ${std} ${std === 1 ? 'Stunde' : 'Stunden'}`, `${std} ${std === 1 ? 'hour' : 'hours'} ago`);
    return tr(`vor ${Math.floor(std / 24)} Tagen`, `${Math.floor(std / 24)} days ago`);
  }

  // Only https and obsidian links become anchors.
  function mitLinks(text) {
    const frag = document.createDocumentFragment();
    let pos = 0;
    for (const m of String(text).matchAll(/(?:https?|obsidian):\/\/[^\s<>"'`)\]]+/gi)) {
      const url = m[0].replace(/[.,;:]+$/, '');
      frag.append(text.slice(pos, m.index));
      frag.append(/^(https:\/\/|obsidian:\/\/)/i.test(url)
        ? el('a', { href: url, target: '_blank', rel: 'noopener', text: url })
        : url);
      pos = m.index + url.length;
    }
    frag.append(text.slice(pos));
    return frag;
  }

  /** The last message sent to a lane from this browser, or null. */
  function letzte(lane, key = lane?.key) {
    const alle = STORE.get({});
    const n = alle && typeof alle === 'object' ? alle[key] : null;
    return n && typeof n === 'object' && typeof n.text === 'string' ? n : null;
  }

  /** Whether the operator answered the lane's current question from this browser. */
  function beantwortet(lane) {
    const n = letzte(lane);
    return Boolean(n?.ok && !n.optional && !leer(lane.question) && n.frage === hash(lane.question));
  }

  function merke(lane, eintrag, key = lane.key) {
    const alle = STORE.get({});
    const neu = alle && typeof alle === 'object' ? alle : {};
    neu[key] = eintrag;
    return STORE.set(neu);
  }

  function prompt(lane, text, zeit) {
    return `Du arbeitest in der Lane ${lane.name} des Research Lab. Lies zuerst ${LANE_ORDNER}${lane.key}.md und die Nachrichten an dich in ${LANE_ORDNER}${L.orchestrator?.key || 'orchestrator'}.md. `
      + `Nachricht des Operators vom ${tag(zeit)} ${uhr(zeit)}: "${text}". `
      + 'Antworte in deiner Lane-Datei nach LAB-BOARD, Arbeitsvereinbarung Fassung 2.';
  }

  const kopiere = L.kopiere;

  async function uebertrage(satz) {
    try {
      const antwort = await fetch(ENDPUNKT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(satz) });
      if (antwort.ok) return '';
      const json = await antwort.json().catch(() => null);
      return `${antwort.status} ${json?.error || antwort.statusText}`.trim();
    } catch (err) {
      return tr(`kein Dienst erreichbar (${err.message})`, `Service unavailable (${err.message})`);
    }
  }

  // Status line after sending: visible words short, the message and the
  // exact time in the title.
  function zeigeStatus(node, n) {
    node.replaceChildren();
    node.removeAttribute('title');
    node.className = 'status';
    if (!n) return;
    if (n.optional || n.gespeichert === false) {
      node.textContent = (n.gespeichert === false ? 'Im Browser nicht gespeichert. ' : tr('Im Browser gespeichert. ', "Saved in this browser. "))
        + (n.ok ? 'Im Eingang bestätigt. ' : n.fehler ? tr('Eingang nicht bestätigt: ', "Inbox receipt unconfirmed: ") + n.fehler + '. ' : tr('Eingang noch nicht bestätigt. ', "Inbox receipt not confirmed yet. "))
        + tr('Übernahme durch ', "Adoption by ") + coordinatorName + tr(' nicht belegt.', " not evidenced.");
      if (n.gespeichert === false || n.fehler) node.classList.add('fehler');
      else if (n.ok) node.classList.add('ok');
      return;
    }
    const d = new Date(n.zeit);
    const wann = Number.isNaN(d.getTime()) ? '' : `${istHeute(d) ? '' : `${tag(d).slice(0, 6)} `}${uhr(d)}`;
    // kopiert is undefined for the orchestrator, which gets no prompt.
    const kopie = n.kopiert === true ? 'kopiert' : n.kopiert === false ? 'nicht kopiert' : '';
    const text = n.ok
      ? (n.kopiert === true ? tr(`kopiert und übertragen ${wann}`, `Copied and transferred ${wann}`) : tr(`übertragen ${wann}${kopie ? `, ${kopie}` : ''}`, `Transferred ${wann}${kopie ? `, ${kopie}` : ''}`))
      : [kopie, tr('nicht übertragen', "Not transferred"), n.fehler].filter(Boolean).join(', ');
    node.textContent = text.trim();
    node.classList.add(n.ok && n.kopiert !== false ? 'ok' : 'fehler');
    const wannVoll = Number.isNaN(d.getTime()) ? '' : `${tag(d)} ${uhr(d)}`;
    mitTitel(node, tr(`Deine Nachricht vom ${wannVoll}: ${n.text}${n.ok ? ', im Eingang' : ''}${n.kopiert ? ', Prompt in der Zwischenablage' : ''}`, `Your message from ${wannVoll}: ${n.text}${n.ok ? ', in the inbox' : ''}${n.kopiert ? ', prompt on the clipboard' : ''}`));
  }

  /**
   * Card for one lane. opts: entryName (the entry or work area the lane is
   * on), onEntry (optional, makes the entry name a jump button), id (element
   * id of the card), kopf (false leaves out the head when the surrounding
   * row already names lane, entry and report date), optional (voluntary
   * context with no required-question binding or clipboard handoff). task and
   * subject bind optional result questions to an assignment, preserving legacy
   * lane drafts and required answers.
   */
  function card(lane, opts = {}) {
    if (!lane?.key) throw new Error('LEITSTAND_INSTANZ.card needs a lane with key');
    const nr = ++folge;
    const task = opts.task;
    if (task && (!opts.optional || task.operator !== lane.key || !task.kennung || !task.auftrag)) {
      throw new Error('A task-scoped message needs the exact optional lane assignment');
    }
    const messageKey = task ? 'auftrag:' + lane.key + ':' + task.kennung : lane.key;
    const subject = task ? String(opts.subject || task.auftrag).trim() : '';
    const prefix = task ? 'Freiwillige Frage oder Beobachtung\nAuftrag: ' + task.kennung + '\nGegenstand: ' + subject + '\n\n' : '';
    const budget = Math.max(0, MAX_NOTIZ - prefix.length);
    let draftVersion = 0;
    const name = lane.name || lane.key;
    const datei = `${LANE_ORDNER}${lane.key}.md`;
    const s = stempel(lane.fileDate);
    const report = lane.report || {};
    // The orchestrator reads the inbox itself and needs no prompt.
    const istOrchestrator = lane.key === L.orchestrator?.key;
    const kopieren = !opts.optional && !istOrchestrator;
    const titelId = `instanz-${lane.key}-${nr}`;

    // The harness mark before the name is decorative, as the heading's title
    // names the harness; a page without icons.js shows the name alone.
    const marke = window.LEITSTAND_ICONS?.harness(lane.harness, { decorative: true }) ?? null;
    const kopf = el('div', { class: 'instanz-kopf' },
      mitTitel(el('h2', { id: titelId }, ...(marke ? [marke] : []), name), tr(`Lane-Datei ${datei}${lane.harness ? `, ${voll(lane.harness)}` : ''}`, `Operator file ${datei}${lane.harness ? `, ${voll(lane.harness)}` : ''}`)));
    const vorhaben = voll(opts.entryName || '');
    if (vorhaben) {
      const herkunft = lane.entryId ? tr('Vorhaben in ACTIVE-WORK', 'Project in ACTIVE-WORK') : `Lane-ID ${voll(lane.laneId) || tr('fehlt', "Missing")}, kein Vorhaben in ACTIVE-WORK zugeordnet`;
      if (typeof opts.onEntry === 'function') {
        const knopf = el('button', { type: 'button', class: 'vorhaben', title: tr(`${herkunft}, öffnet seine Zeile`, `${herkunft}, opens its row`), text: vorhaben });
        knopf.addEventListener('click', opts.onEntry);
        kopf.append(knopf);
      } else {
        kopf.append(mitTitel(el('span', { class: 'vorhaben', text: vorhaben }), herkunft));
      }
    }
    const stempelText = s.date ? `${L.fmtLang(s.datum)} ${s.zeit}` : s.datum ? L.fmtLang(s.datum) : '';
    kopf.append(mitTitel(el('time', { class: 'alter', datetime: s.date ? s.date.toISOString() : s.datum, text: alter(s) }),
      stempelText ? `Lane-Datei geschrieben ${stempelText}` : tr('Die Lane-Datei trägt keinen Zeitstempel', "The operator file has no timestamp")));

    // The lane's question to the operator, only when it has one.
    const braucht = voll(report['Operator point'] || lane.question || '');
    const lage = leer(braucht) ? null : el('dl', { class: 'lage' },
      el('dt', { title: tr('Operator point im Report der Lane-Datei', "Operator point in the operator file report"), text: tr('Braucht von dir', "Needs from you") }),
      el('dd', { class: 'drei', title: braucht, text: braucht }));

    // The message field.
    const feldId = opts.optional ? `instanz-kontext-${lane.key}${task ? '-' + task.kennung : ''}` : `instanz-text-${lane.key}-${nr}`;
    const text = el('textarea', { id: feldId, rows: '1', maxlength: String(budget), placeholder: tr(`Sag ${name} …`, `Tell ${name}…`),
      title: !kopieren ? tr(`geht in den Eingang für ${coordinatorName}. Strg+Enter überträgt.`, `Goes to the inbox for ${coordinatorName}. Ctrl+Enter transfers.`)
        : tr(`geht in den Eingang und als Prompt für ${name} in die Zwischenablage. Strg+Enter sendet.`, `Goes to the inbox and copies a prompt for ${name}. Ctrl+Enter sends.`) });
    const knopf = el('button', { type: 'submit', class: 'senden', text: opts.optional ? tr('In Eingang übertragen', 'Transfer to inbox') : tr('senden', "Send"),
      title: !kopieren ? 'an den Eingang übertragen' : tr(`an den Eingang übertragen und den Prompt für ${name} kopieren`, `Transfer to the inbox and copy the prompt for ${name}`) });
    const status = el('span', { class: 'status', role: 'status', 'aria-live': 'polite' });
    const zuletzt = letzte(lane, messageKey);
    zeigeStatus(status, zuletzt);
    // A message that did not reach the inbox comes back into the field.
    if (zuletzt && !zuletzt.ok) text.value = zuletzt.text;
    const form = el('form', { class: 'sagen' }, el('label', { class: 'sr-only', for: feldId, text: task ? 'Deine freiwillige Frage oder Beobachtung' : tr(`Nachricht an ${name}`, `Message to ${name}`) }), text, knopf, status);
    if (opts.optional) text.addEventListener('input', () => {
      draftVersion += 1;
      const draft = { text: text.value, zeit: new Date().toISOString(), ok: false, optional: true, frage: '' };
      draft.gespeichert = merke(lane, draft, messageKey);
      zeigeStatus(status, draft);
    });

    async function senden(ev) {
      ev.preventDefault();
      if (knopf.disabled) return;
      const submittedValue = text.value;
      const submittedVersion = draftVersion;
      const input = text.value.trim();
      const notiz = prefix + input;
      if (!input) {
        status.className = 'status fehler';
        status.textContent = tr('erst etwas schreiben', "Write a message first");
        status.removeAttribute('title');
        text.focus();
        return;
      }
      if (notiz.length > MAX_NOTIZ) {
        status.className = 'status fehler';
        status.textContent = tr('Die Nachricht ist zusammen mit ihrem Auftragsbezug zu lang. Bitte kürze deinen Text.', "The message and its assignment context are too long. Please shorten your text.");
        text.focus();
        return;
      }
      knopf.disabled = true;
      const zeit = new Date();
      const n = { text: input, zeit: zeit.toISOString(), ok: false, optional: Boolean(opts.optional), frage: opts.optional || leer(lane.question) ? '' : hash(lane.question) };
      if (!merke(lane, n, messageKey)) {
        n.gespeichert = false;
        zeigeStatus(status, n);
        knopf.disabled = false;
        text.focus();
        return;
      }
      if (opts.optional) zeigeStatus(status, n);
      // Optional context goes to the existing inbox without a clipboard handoff.
      const kopiert = kopieren ? await kopiere(prompt(lane, notiz, zeit)) : undefined;
      const fehler = await uebertrage({ ziel: 'lane', id: lane.key, entry: (task ? task.entryId || task.vorhaben : lane.entryId) || '', art: 'nachricht', notiz, revision: s.revision, wortlaut: '' });
      Object.assign(n, { ok: !fehler, fehler, kopiert });
      const current = letzte(lane, messageKey);
      // Transport completion belongs to the submitted draft. A user or another
      // tab may have written a newer one while the request was in flight.
      if (draftVersion === submittedVersion && text.value === submittedValue
        && current?.zeit === n.zeit && current.text === n.text) {
        n.gespeichert = merke(lane, n, messageKey);
        zeigeStatus(status, n);
        if (!fehler && n.gespeichert) text.value = '';
      } else {
        zeigeStatus(status, current);
        status.append(tr(' Die zuvor gesendete Nachricht ist ', " The previously sent message is ") + (fehler ? tr('nicht im Eingang bestätigt: ', "not confirmed in the inbox: ") + fehler + '.' : tr('im Eingang bestätigt.', "confirmed in the inbox.")) + tr(' Dein neuer Entwurf bleibt erhalten.', " Your newer draft is preserved."));
      }
      knopf.disabled = false;
      document.dispatchEvent(new CustomEvent('mission-control-demo-nachricht', { detail: { laneKey: lane.key, ok: !fehler, optional: Boolean(opts.optional), ...(task ? { kennung: task.kennung } : {}) } }));
    }
    form.addEventListener('submit', senden);
    text.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); form.requestSubmit(); }
    });

    const auf = el('a', { href: L.sourceReaderHref('demo-sources/' + lane.key), text: tr('Operator-Datei', "Operator file") });

    const mitKopf = opts.kopf !== false;
    return el('article', { class: 'instanz', id: opts.id, 'data-lane': lane.key,
      'aria-labelledby': mitKopf ? titelId : null, 'aria-label': mitKopf ? null : tr(`Instanz ${name}`, `Operator ${name}`) },
    mitKopf ? kopf : null, opts.optional ? null : lage,
    opts.optional ? el('p', { text: task
      ? tr('Hier kannst du eine Frage stellen oder festhalten, was noch unklar ist. Die Nachricht geht mit dem Auftragsbezug in den Eingang für ', "You can ask a question or note what is unclear. The message and its assignment context go to the inbox for ") + coordinatorName + '. Dein Gesamturteil und andere offene Fragen bleiben offen. Die Nachricht startet keinen Operator.'
      : tr('Freiwilliger Kontext oder Rückfrage zum laufenden Auftrag. ', "Optional context or question about the current assignment. ") + coordinatorName + tr(' liest den Eingang. Die tatsächliche Übernahme wird gesondert belegt.', " reads the inbox. Actual adoption is evidenced separately.") }) : null,
    form, opts.optional ? null : auf);
  }

  // The current copy-only surface preserves earlier messages and drafts.
  // Legacy card and transport remain intact for their existing consumers.
  function discussionCard(lane, opts = {}) {
    if (!lane?.key) throw new Error('A discussion needs a known operator');
    const A = window.LEITSTAND_ANTWORTEN;
    const task = opts.task;
    if (task && (task.operator !== lane.key || !task.kennung || !task.auftrag)) throw new Error('A result question needs its exact assignment');
    const item = task ? { ...task, frage: opts.subject || task.auftrag } : lane;
    const body = el('section', { class: 'instanz', ...(opts.id ? { id: opts.id } : {}) },
      opts.kopf === false ? '' : el('h3', { text: L.laneName(lane.key) }),
      A.discussion(() => {
        const current = typeof opts.review === 'function' ? opts.review() : opts.review;
        return current?.task || item;
      }, () => {
        const current = typeof opts.review === 'function' ? opts.review() : opts.review;
        return { ziel: current ? 'abnahme' : task ? 'lane' : 'operator', ...(task ? { task } : {}),
          ...(current ? { review: current, purpose: opts.subject,
            stale: typeof opts.stale === 'function' ? opts.stale() : opts.stale,
            unavailable: typeof opts.unavailable === 'function' ? opts.unavailable() : opts.unavailable } : {}) };
      }));
    const previous = letzte(lane, task ? 'auftrag:' + lane.key + ':' + task.kennung : lane.key);
    if (previous) body.append(el('details', { class: 'instanz-history' },
      el('summary', { text: previous.ok ? 'Frühere Browsernachricht' : tr('Früherer Browserentwurf', "Earlier browser draft") }),
      el('p', { text: previous.text }),
      el('p', { text: tr('Stand ', 'Status ') + (previous.zeit || tr('nicht erfasst', "Not recorded")) + '. ' + (previous.ok ? tr('Eingang damals bestätigt.', 'Receipt confirmed at that time.') : tr('Kein bestätigter Eingang.', "No confirmed inbox receipt.")) }),
      el('p', { text: tr('Die aktuelle Frage bleibt bis zur kanonischen Klärung offen.', "The current question remains open until canonical clarification.") })));
    return body;
  }

  window.LEITSTAND_INSTANZ = { card, discussionCard, letzte, beantwortet, prompt, stempel, alter };
})();
