// Local execution records are a secondary view linked from the operator comparison.
// Source strings enter through textContent; this view writes no work state.
(function () {
  'use strict';
  const tr = (de, en) => typeof window !== 'undefined' && window.UI_LANGUAGE ? window.UI_LANGUAGE.t(de, en) : de;
  const L = window.LEITSTAND;
  const S = window.LEITSTAND_SHELL;
  const A = window.AGENTEN || { generated: '', day: '', runs: [], single: [] };
  if (!L || !S) throw new Error('agenten.js needs model and shell loaded first');

  const AGENT_ZUSTAND = { done: tr('fertig', 'Complete'), running: tr('läuft', 'Running'), queued: tr('wartet', 'Queued'), failed: tr('Fehler', 'Failed'), stopped: tr('abgebrochen', 'Stopped') };

  const generatedMs = Date.parse(A.generated) || Date.now();

  // The DOM helpers and the middle-dot rule are the shared ones of shell.js.
  const { el, mitTitel, ohnePunkt } = S;

  const zwei = (n) => String(n).padStart(2, '0');
  const uhr = (ms) => { const d = new Date(ms); return `${zwei(d.getHours())}:${zwei(d.getMinutes())}`; };

  function dauer(ms) {
    if (ms == null) return '';
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s} s`;
    const min = Math.round(s / 60);
    if (min < 60) return `${min} min`;
    return `${Math.floor(min / 60)} h ${zwei(min % 60)} min`;
  }

  function dauerGenau(ms) {
    const s = Math.round(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return [h ? `${h} h` : '', m ? `${m} min` : '', `${s % 60} s`].filter(Boolean).join(' ');
  }

  const zahl = new Intl.NumberFormat(window.UI_LANGUAGE?.locale || 'de-AT');
  function token(n) {
    if (n == null) return '';
    if (n < 1000) return String(n);
    // Below 999 500 so that rounding never shows "1000 Tsd.".
    if (n < 999500) return `${Math.round(n / 1000)} Tsd.`;
    return `${(n / 1e6).toLocaleString('de-AT', { maximumFractionDigits: 2, minimumFractionDigits: 2 })} Mio.`;
  }

  function modellKurz(id) {
    const m = /^(?:claude-)?([a-z]+)(?:-(\d+)-(\d+))?/.exec(String(id || ''));
    if (!m) return id || '';
    const name = m[1].charAt(0).toUpperCase() + m[1].slice(1);
    return m[2] ? `${name} ${m[2]}.${m[3]}` : name;
  }

  // Start and end of a run or agent in ms; a running item ends at the data stand.
  function spanne(x) {
    const start = Date.parse(x.startedAt);
    if (Number.isNaN(start)) return null;
    let ende = Date.parse(x.endedAt);
    if (Number.isNaN(ende)) ende = x.durationMs != null && x.state !== 'running' ? start + x.durationMs : generatedMs;
    return { start, ende: Math.max(ende, start) };
  }

  // The time window of the day: from the hour of the first start to the hour after the last end.
  const fenster = (() => {
    const spannen = [...A.runs, ...A.single].map(spanne).filter(Boolean);
    if (!spannen.length) return null;
    const a = new Date(Math.min(...spannen.map((s) => s.start))); a.setMinutes(0, 0, 0);
    const b = new Date(Math.max(...spannen.map((s) => s.ende))); if (b.getMinutes() || b.getSeconds()) { b.setHours(b.getHours() + 1); b.setMinutes(0, 0, 0); }
    return { start: a.getTime(), ende: b.getTime() };
  })();

  const lage = (ms) => ((ms - fenster.start) / (fenster.ende - fenster.start)) * 100;

  function balken(sp, cls) {
    const b = el('span', { class: `balken ${cls}` });
    b.style.left = `${lage(sp.start)}%`;
    b.style.width = `max(2px, ${lage(sp.ende) - lage(sp.start)}%)`;
    return b;
  }

  function zeitachse(x, titel) {
    const spur = el('span', { class: 'spur', role: 'img', 'aria-label': titel, title: titel });
    if (!fenster) return spur;
    if (Array.isArray(x)) {
      for (const sp of x) spur.append(balken(sp, 'leise'));
    } else {
      const sp = spanne(x);
      if (sp) spur.append(balken(sp, x.state === 'running' ? 'laeuft' : ''));
    }
    return spur;
  }

  function skala() {
    const s = el('span', { class: 'skala', 'aria-hidden': 'true' });
    if (!fenster) return s;
    for (let t = fenster.start; t <= fenster.ende; t += 3600000) {
      const m = el('span', { text: String(new Date(t).getHours()) });
      m.style.left = `${lage(t)}%`;
      s.append(m);
    }
    return s;
  }

  function zustandAgent(state) {
    return AGENT_ZUSTAND[state] || tr('unbekannt', 'Unknown');
  }

  // State cell of an agent; an unknown raw state shows as "unbekannt" and keeps
  // the raw value in the tooltip.
  function zustandZelle(state) {
    const bekannt = Object.hasOwn(AGENT_ZUSTAND, state);
    const z = el('span', { class: `a-zustand ${bekannt ? state : 'unbekannt'}`, text: zustandAgent(state) });
    return bekannt ? z : mitTitel(z, tr(`Zustand in den Daten: ${state || 'leer'}`, `State in the data: ${state || 'empty'}`));
  }

  // Phase segment: phase title and agent count, its underline split by agent state.
  function phase(titel, agents) {
    const n = agents.length;
    const je = {};
    // Unknown raw states count together, so the underline still adds up to 100 %.
    for (const a of agents) {
      const st = Object.hasOwn(AGENT_ZUSTAND, a.state) ? a.state : 'unbekannt';
      je[st] = (je[st] || 0) + 1;
    }
    const teile = Object.entries(je).map(([st, k]) => `${k} ${zustandAgent(st)}`);
    const title = n ? `${titel}: ${n} ${n === 1 ? 'Agent' : 'Agenten'}, ${teile.join(', ')}` : tr(`${titel}: noch kein Agent gestartet`, `${titel}: no agent started yet`);
    const seg = el('span', { class: 'phase' }, el('span', { class: 'ph-name', text: titel }), ' ', el('span', { class: 'mono', text: String(n) }));
    const strich = el('span', { class: 'ph-strich', 'aria-hidden': 'true' });
    if (n) {
      let x = 0;
      const stops = [];
      for (const st of ['done', 'running', 'queued', 'stopped', 'failed', 'unbekannt']) {
        if (!je[st]) continue;
        const farbe = { done: 'var(--soft)', running: 'var(--orchestrator)', queued: 'var(--line)', stopped: 'var(--andere)', failed: 'var(--stoerung)', unbekannt: 'var(--line)' }[st];
        const y = x + (je[st] / n) * 100;
        stops.push(`${farbe} ${x}% ${y}%`);
        x = y;
      }
      strich.style.background = `linear-gradient(to right, ${stops.join(', ')})`;
    } else {
      strich.classList.add('leer');
    }
    seg.append(strich);
    return mitTitel(seg, title);
  }

  function phasenVon(run) {
    const titel = [...run.phases];
    for (const a of run.agents) if (a.phase && !titel.includes(a.phase)) titel.push(a.phase);
    return titel.map((t) => ({ titel: t, agents: run.agents.filter((a) => a.phase === t) }));
  }

  function zeitTitel(x) {
    const sp = spanne(x);
    if (!sp) return tr('Zeit unbekannt', 'Time unknown');
    return x.state === 'running'
      ? `seit ${uhr(sp.start)}, Stand ${uhr(generatedMs)}`
      : tr(`${uhr(sp.start)} bis ${uhr(sp.ende)}, ${dauerGenau(sp.ende - sp.start)}`, `${uhr(sp.start)} to ${uhr(sp.ende)}, ${dauerGenau(sp.ende - sp.start)}`);
  }

  function dauerZelle(x) {
    const z = el('span', { class: 'dauer mono' });
    if (x.state === 'running') {
      z.classList.add('laeuft');
      z.textContent = tr(`läuft ${dauer(generatedMs - Date.parse(x.startedAt))}`, `Running ${dauer(generatedMs - Date.parse(x.startedAt))}`);
    } else if (x.state === 'failed' || x.state === 'stopped') {
      z.classList.add(x.state);
      z.textContent = zustandAgent(x.state);
    } else {
      z.textContent = dauer(x.durationMs);
    }
    return mitTitel(z, zeitTitel(x));
  }

  function tokenZelle(n, was) {
    if (n == null) return el('span', { class: 'token mono' });
    return mitTitel(el('span', { class: 'token mono', text: token(n) }), `${zahl.format(n)} Token ${was}`);
  }

  const M = window.AGENTEN_MODEL;
  const workflowId = (run) => 'ausfuehrung-' + String(run.id || run.name).replace(/[^a-z0-9_-]/gi, '-');

  function agentZeile(a) {
    const satz = a.resultFirstSentence || '';
    return el('li', { class: 'agent' },
      el('span', { class: 'a-label mono', text: a.label, title: a.label }),
      mitTitel(el('span', { class: 'a-modell', text: modellKurz(a.model) }), a.model || tr('Modell unbekannt', "Model unknown")),
      zustandZelle(a.state),
      mitTitel(el('span', { class: 'a-dauer mono', text: a.state === 'running' ? dauer(generatedMs - Date.parse(a.startedAt)) : dauer(a.durationMs) }),
        `${zeitTitel(a)}${a.tokens != null ? `, ${zahl.format(a.tokens)} Token` : ''}`),
      el('span', { class: 'a-satz', text: satz || (a.state === 'running' ? '' : tr('kein Ergebnissatz', "No result sentence")), title: satz }));
  }

  function agentListe(run) {
    const box = el('div', { class: run.phases ? 'agenten' : 'agenten einzeln' });
    if (run.phases) {
      for (const ph of phasenVon(run)) {
        if (!ph.agents.length) continue;
        box.append(el('h4', { class: 'ph-kopf', text: ph.titel }), el('ul', { role: 'list' }, ...ph.agents.map(agentZeile)));
      }
    } else {
      box.append(el('ul', { role: 'list' }, ...run.agents.map(agentZeile)));
    }
    return box;
  }

  // Execution details remain visible beneath their run header.
  function laufZeile(run, { name, nameTitel, phasen, zeit, dauerNode, tokenNode }) {
    return el('li', { class: 'lauf' },
      el('div', { class: 'l-zeile' }, el('span', { class: 'l-kopf' }, el('span', { class: 'l-name', title: nameTitel, text: name })), phasen, zeit, dauerNode, tokenNode),
      agentListe(run));
  }

  function workflowZeile(run) {
    const nameTitel = [run.summary, run.id].filter(Boolean).join(', ');
    const tokenWas = 'im erfassten Lauf';
    const row = laufZeile(run, {
      name: run.name,
      nameTitel,
      phasen: el('span', { class: 'l-phasen' }, ...phasenVon(run).map((p) => phase(p.titel, p.agents))),
      zeit: zeitachse(run, zeitTitel(run)),
      dauerNode: dauerZelle(run),
      tokenNode: tokenZelle(run.tokens, tokenWas),
    });
    row.id = workflowId(run);
    return row;
  }

  function einzelZeile() {
    const agents = A.single;
    const spannen = agents.map(spanne).filter(Boolean);
    const summe = agents.reduce((s, a) => s + (a.tokens || 0), 0) || null;
    const erste = spannen.length ? Math.min(...spannen.map((s) => s.start)) : null;
    const letzte = spannen.length ? Math.max(...spannen.map((s) => s.ende)) : null;
    const zeit = erste ? `Einzelagenten zwischen ${uhr(erste)} und ${uhr(letzte)}` : tr('Zeit unbekannt', "Time unknown");
    return laufZeile({ agents, phases: null }, {
      name: tr('Einzelagenten', "Individual agents"),
      nameTitel: 'Hintergrundagenten, die Claude einzeln gestartet hat, neueste zuerst',
      phasen: el('span', { class: 'l-phasen' }, phase('einzeln', agents)),
      zeit: zeitachse(spannen, zeit),
      dauerNode: el('span', { class: 'dauer mono' }),
      tokenNode: tokenZelle(summe, 'aller Einzelagenten zusammen'),
    });
  }

  function bilanz() {
    const t = M.telemetry(A);
    return [el('p', { class: 'bilanz', text: t.workflows + ' erfasste Workflows, ' + t.workflowEntries + tr(' Agenteneinträge darin, ', " agent records within them, ") + t.singleEntries + tr(' separat gestartete Agenteneinträge, ', " separately started agent records, ") + token(t.tokens) + ' erfasste Token.' }),
      el('p', { class: 'daten-grenze', text: 'Synthetischer Leerstand vom ' + (A.day || 'unbekannten Tag') + tr('. Codex, Gemini und Hauptgespräche sind nicht enthalten. Bei der Transkriptauswertung fehlen Cache-Lesezugriffe.', ". Other harnesses and main conversations are not included. Transcript analysis excludes cache reads.") + (t.missingTokens ? tr(' Für ', " For ") + t.missingTokens + ' Einträge fehlt eine Tokensumme.' : '') }),
      el('p', { class: 'daten-grenze', text: tr('Läufe und ihre Token sind nach Startdatum zugeordnet. Agenteneinträge belegen weder gleichzeitig aktive Agenten noch unterschiedliche Personen. Keine Kosten- oder Effizienzaussage.', "Runs and their tokens are grouped by start date. Agent records do not establish simultaneous activity or distinct people. No cost or efficiency claim.") })];
  }

  function flotte() {
    const tag = A.day || '';
    const heute = tag === L.todayIso();
    const stand = Date.parse(A.generated);
    const kopf = el('div', { class: 'f-kopf' },
      el('h2', { text: heute ? 'Workflows heute' : `Workflows am ${L.fmt(tag)}` }),
      el('span', { class: 'f-spalte', text: 'Phasen' }),
      el('span', { class: 'f-zeit' }, skala()),
      el('span', { class: 'f-spalte rechts', text: tr('Dauer', "Duration") }),
      el('span', { class: 'f-spalte rechts', text: tr('Token', "Tokens") }));
    const liste = el('ul', { class: 'laeufe', role: 'list' });
    for (const run of A.runs) liste.append(workflowZeile(run));
    if (A.single.length) liste.append(einzelZeile());
    if (!A.runs.length && !A.single.length) liste.append(el('li', { class: 'leer', text: tr('An diesem Tag keine Workflows und keine Einzelagenten.', "No workflows or individual agents recorded for this day.") }));
    const standNode = Number.isNaN(stand) ? el('p', { class: 'stand mono', text: tr('Agentendaten fehlen', "Agent data unavailable") })
      : mitTitel(el('p', { class: 'stand mono', text: `Stand ${uhr(stand)}` }), `agenten-data.js erzeugt am ${L.fmtLang(tag) || tag} um ${uhr(stand)}`);
    return el('section', { class: 'flotte', 'aria-label': tr('Workflows und Einzelagenten von Claude', "Workflows and individual agents") }, standNode, ...bilanz(), kopf, liste);
  }

  function render() {
    const execution = el('section', { class: 'ausfuehrung', 'aria-label': tr('Technische Ausführung und Tokenverbrauch', "Technical execution and token usage") },
      el('a', { href: 'operatoren.html', text: tr('Zur Operatorenliste', "Back to operators") }),
      el('h2', { text: tr('Technische Ausführung und Tokenverbrauch', "Technical execution and token usage") }), flotte(),
      el('p', { class: 'daten-grenze', text: tr('Diese Demo enthält keine tatsächlichen Ausführungsdaten. Sie belegen keine aktuelle Ausführung aller Operatoren.', "These local execution records cover recorded runs on this computer. They do not establish current execution of every operator.") }));
    document.getElementById('agenten').replaceChildren(execution);
    document.getElementById('agenten').setAttribute('aria-busy', 'false');
    let hash = '';
    try { hash = decodeURIComponent(location.hash.slice(1)); } catch { /* Preserve ordinary navigation for malformed links. */ }
    if (hash) document.getElementById(hash)?.scrollIntoView();
  }
  S.mount(document.getElementById('kopf'), { view: 'agenten', themen: false });
  render();
})();
