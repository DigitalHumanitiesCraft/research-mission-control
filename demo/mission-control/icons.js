// Category marks: one hand-drawn inline SVG per Mission Control category, shown on
// the theme chips and before every entry, so chips and entries follow one
// order. Categories and their names come from themen.js; this module only
// draws. No category colours, because colour already carries lanes and change
// notes. Reads entries of window.LEITSTAND.aw.eintraege and never mutates
// them. Drawing follows the former project marks (24 viewBox, currentColor stroke,
// round caps), so colour comes only from the context. The harness marks
// at the end of this module are the one exception, drawn in brand colours.
'use strict';

window.LEITSTAND_ICONS = (() => {
  const NS = 'http://www.w3.org/2000/svg';

  // Keys are the category keys of themen.js.
  const PATHS = {
    // Coin with a euro sign, read as "paid".
    auftrag: ['M2.5 12a9.5 9.5 0 1 0 19 0a9.5 9.5 0 1 0 -19 0z', 'M16.2 8.2a5.3 5.3 0 1 0 0 7.6', 'M6.5 10.4h6.5M6.5 13.6h6.5'],
    // Flipchart on an easel with a rising line drawn on it, read as training.
    excellence: ['M4 4h16v11H4z', 'M12 2v2', 'M8.5 15l-2.5 6.5M15.5 15l2.5 6.5M12 15v3', 'M7 11.5l3 -3 2.5 2 4 -4'],
    // Mortarboard, read as "university".
    lehre: ['M2 9l10 -5 10 5 -10 5z', 'M6 11v5c0 1.5 3 3 6 3s6 -1.5 6 -3v-5', 'M22 9v6'],
    // Open book, read as scholarship; a magnifier read as "search".
    akademisch: ['M12 6.5C10 5 7 4.5 3 5v13c4 -0.5 7 0 9 1.5', 'M12 6.5C14 5 17 4.5 21 5v13c-4 -0.5 -7 0 -9 1.5', 'M12 6.5v13'],
    // Archive box with an arrow rising out of it: a former project taken out
    // again. A circular "renew" arrow was dropped, because inside the box it
    // shrinks to a blot at row size.
    alt: ['M3 4.5h18v4H3z', 'M4.5 8.5V19a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5 -1.5V8.5', 'M12 18v-6.5M9.5 14l2.5 -2.5 2.5 2.5'],
    // Open-end wrench on the diagonal, head at the upper left.
    werkzeug: ['M5.1 3.12A5 5 0 0 1 11.98 9.72L19.24 16.98A1.6 1.6 0 0 1 16.98 19.24L9.72 11.98A5 5 0 0 1 3.12 5.1L5.45 7.43L7.43 5.45z'],
    // Three connected nodes, the operator and his agents. Chosen over a gear,
    // which at row size reads like the wrench as "tool".
    system: [
      'M9.5 5a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0z',
      'M2.5 18a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0z',
      'M16.5 18a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0z',
      'M10.8 7.2L6.2 15.8M13.2 7.2L17.8 15.8M7.5 18h9',
    ],
    // Erlenmeyer flask with a fill line, read as "trial". It replaced the
    // play triangle in a screen frame when the category widened from games
    // and videos to trials of agentic work, which a video sign would narrow.
    experiment: ['M8 3h8', 'M10 3v6.2L4.6 18.4A1.7 1.7 0 0 0 6.1 21h11.8a1.7 1.7 0 0 0 1.5 -2.6L14 9.2V3', 'M7.2 14.5h9.6'],
  };

  // themen.js is read at call time, because some pages load it after this
  // module.
  const themen = () => window.LEITSTAND_THEMEN;

  /** Full name of a mark key, the category word. */
  function label(key) {
    return themen()?.kategorien[key] ?? null;
  }

  /**
   * Category of an ACTIVE-WORK entry as {key, label, svg}, or null for an
   * entry under "weitere". Such an entry gets no mark rather than a neutral
   * one, because any drawn sign would claim a category it does not have.
   */
  function art(entry) {
    const key = themen()?.kategorieVon(entry) ?? null;
    return key && Object.hasOwn(PATHS, key) ? { key, label: label(key), svg: create(key) } : null;
  }

  /**
   * SVG element for a mark key; size is a number in px or a CSS length. With
   * decorative set, the mark keeps its tooltip but is hidden from assistive
   * technology, for places where the same word already stands as text.
   */
  function create(key, size, { decorative = false } = {}) {
    const name = Object.hasOwn(PATHS, key) ? label(key) : null;
    if (!name) return null;
    const svg = document.createElementNS(NS, 'svg');
    const a11y = decorative ? { 'aria-hidden': 'true' } : { role: 'img', 'aria-label': name };
    for (const [attr, value] of Object.entries({ viewBox: '0 0 24 24', class: `art-zeichen art-${key}`, ...a11y,
      focusable: 'false', fill: 'none', stroke: 'currentColor',
      'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })) svg.setAttribute(attr, value);
    if (size != null) {
      const len = typeof size === 'number' ? `${size}px` : String(size);
      svg.style.inlineSize = len;
      svg.style.blockSize = len;
    }
    const title = document.createElementNS(NS, 'title');
    title.textContent = name;
    svg.append(title);
    for (const d of PATHS[key]) {
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('d', d);
      svg.append(path);
    }
    return svg;
  }

  // Task needs describe the work required, independently of completion.
  const TASK_PATHS = {
    ausfuehrbar: ['M4 12h15M13 6l6 6-6 6'],
    ausarbeiten: ['M4 16.5L16.5 4a2.1 2.1 0 0 1 3 3L7 19.5l-4 1 1-4Z', 'M14.5 6l3 3'],
    erforschen: ['M16 9.5a6.5 6.5 0 1 1-13 0a6.5 6.5 0 0 1 13 0Z', 'M14 14l6 6'],
    pruefen: ['M2 12c2.5-4.5 5.8-7 10-7s7.5 2.5 10 7c-2.5 4.5-5.8 7-10 7s-7.5-2.5-10-7Z', 'M15 12a3 3 0 1 1-6 0a3 3 0 0 1 6 0Z'],
  };

  // The caller supplies the accessible need text and the visible legend.
  function task(key) {
    if (!Object.hasOwn(TASK_PATHS, key)) return null;
    const svg = el('svg', { viewBox: '0 0 24 24', class: 'task-zeichen', 'aria-hidden': 'true', focusable: 'false',
      fill: 'none', stroke: 'currentColor', 'stroke-width': '1.6', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    svg.append(...TASK_PATHS[key].map((d) => el('path', { d })));
    return svg;
  }

  const FACT_PATHS = {
    pause: ['M8 5v14M16 5v14'],
    blocked: ['M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18Z', 'M6 6l12 12'],
    open: ['M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18Z', 'M12 7v5l3 2'],
    unknown: ['M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18Z', 'M9 9a3 3 0 1 1 4 2.8L12 14', 'M12 17h.01'],
    paused: ['M5 5h14l3 10v5H2v-5L5 5Z', 'M2 15h6l2 3h4l2-3h6'],
    delivered: ['M6 3h9l4 4v14H6z', 'M14 3v5h5', 'M9 12h7M9 16h7'],
    question: ['M5 6h14v10h-8l-5 4v-4H5z', 'M10 9a2 2 0 1 1 3 1.7L12 12', 'M12 14h.01'],
    result: ['M6 3h9l4 4v14H6z', 'M14 3v5h5', 'm9 14 2 2 4-5'],
    team: ['M9 8a3 3 0 1 0 6 0a3 3 0 0 0-6 0', 'M5 21v-3a7 7 0 0 1 14 0v3', 'M3 7a3 3 0 0 0 0 6M21 7a3 3 0 0 1 0 6'],
    source: ['M4 4h6a3 3 0 0 1 2 1a3 3 0 0 1 2-1h6v16h-6a3 3 0 0 0-2 1a3 3 0 0 0-2-1H4z', 'M12 5v16'],
  };
  function fact(key) {
    if (key === 'clock') key = 'open';
    if (!Object.hasOwn(FACT_PATHS, key)) return null;
    const svg = el('svg', { viewBox: '0 0 24 24', class: 'fact-icon', 'aria-hidden': 'true', focusable: 'false',
      fill: 'none', stroke: 'currentColor', 'stroke-width': '1.6', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    svg.append(...FACT_PATHS[key].map(d => el('path', { d })));
    return svg;
  }

  // Functional identity follows the stable operator key, independently of its harness.
  const OPERATOR_PATHS = {
    // Code in an application window, rather than the harness terminal mark.
    build: ['M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z', 'M3 8h18', 'M9 11l-3 3 3 3M15 11l3 3-3 3'],
    // Ordered source notes distinguish knowledge maintenance from editing a book.
    curation: ['M8 3h11a2 2 0 0 1 2 2v12', 'M5 6h11a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z', 'M7 11h7M7 16h5'],
    edition: ['M12 6C9.5 4 6 3.5 2.5 4.5v15c3.5-1 7-.5 9.5 1.5', 'M12 6c2.5-2 6-2.5 9.5-1.5v15c-3.5-1-7-.5-9.5 1.5', 'M12 6v15'],
    // A source list under inspection represents the actual research tools.
    fancy: ['M3 5h8M3 10h5M3 15h4', 'M20 11a5 5 0 1 1-10 0a5 5 0 0 1 10 0Z', 'M18.5 14.5L22 18'],
    interviewer: ['M5 3h11a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H9l-5 4v-4H3V5a2 2 0 0 1 2-2Z', 'M20 8a2 2 0 0 1 2 2v9h-4l-4 3v-3h-4a2 2 0 0 1-2-2'],
    monitor: ['M2 12c2.5-4.5 6-7 10-7s7.5 2.5 10 7c-2.5 4.5-6 7-10 7S4.5 16.5 2 12Z', 'M15 12a3 3 0 1 1-6 0a3 3 0 0 1 6 0Z'],
    realmcraft: ['M7 7h10a4 4 0 0 1 3.9 3.2l1 6a3 3 0 0 1-5.1 2.6L14.5 17h-5l-2.3 1.8a3 3 0 0 1-5.1-2.6l1-6A4 4 0 0 1 7 7Z', 'M7 10v5M4.5 12.5h5', 'M15.5 11h.01M18.5 14h.01'],
    // Inspection of a document does not assert a passed or accepted result.
    review: ['M13 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6M13 3l5 5v3M13 3v5h5', 'M20 16a4 4 0 1 1-8 0a4 4 0 0 1 8 0Z', 'M19 19l3 3'],
    'ride-static': ['M14.7 3.6a6 6 0 0 0-7.2 7.8l-3.9 3.9a3.4 3.4 0 0 0 4.8 4.8l4-4a6 6 0 0 0 7.8-7.2l-4 4-5-5 4-4Z'],
  };

  function operator(key) {
    if (!Object.hasOwn(OPERATOR_PATHS, key)) return null;
    const svg = el('svg', { viewBox: '0 0 24 24', class: 'operator-mark', 'data-operator': key,
      'aria-hidden': 'true', focusable: 'false', fill: 'none', stroke: 'currentColor',
      'stroke-width': '1.6', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    svg.append(...OPERATOR_PATHS[key].map(d => el('path', { d })));
    return svg;
  }


  // Short display names follow the user's confirmed ensemble correction (17 October 2026).
  // Exact project relationships stay in identity metadata and the profile details.
  function workArea(lane, { L = window.LEITSTAND, briefing } = {}) {
    const planning = lane.planning;
    const source = /^[a-z0-9][a-z0-9-]*$/.test(lane.key || '') ? 'demo-sources/' + lane.key + '.md' : '';
    if (lane.setup === 'planned' && source && lane.setupSource === source
      && planning?.source === source && /^[a-f0-9]{64}$/.test(planning.revision || '')
      && planning.revision === lane.setupRevision && typeof planning.workArea === 'string' && planning.workArea.trim()) return planning.workArea.trim();
    const t = (de, en) => window.UI_LANGUAGE ? window.UI_LANGUAGE.t(de, en) : de;
    if (lane.key === 'curation') return t('Second Brain / Wissenspflege', 'Second Brain / knowledge maintenance');
    if (lane.key === 'interviewer') return t('Positionsinterview', 'Position interview');
    if (lane.key === 'orchestrator') return t('Koordination', 'Coordination');
    if (lane.key === 'monitor') return 'Monitor';
    const current = [...new Set((lane.auftraege || []).filter(task => !task.vertragsfehler && !task.entryIssue
      && task.entryId && L?.entryById.has(task.entryId)).map(task => task.entryId))];
    if (current.length === 1) { const project = L.entryById.get(current[0]); return project.name || project.titel || project.id; }
    return String(lane.adresse || lane.key || '').trim();
  }

  // Role hue follows the canonical title; domain labels keep every exact project.
  function identity(lane, { L = window.LEITSTAND, domain = true } = {}) {
    const role = String(lane.rollentitel || '').trim();
    const families = {
      'Research Coordination': 'coordination',
      'Developer': 'implementation', 'Research Developer': 'implementation',
      'Knowledge Curation': 'knowledge', 'Researcher': 'knowledge', 'AI Research': 'knowledge', 'Teaching': 'knowledge', 'Writing': 'knowledge',
      'Quality Review': 'verification', 'Monitor': 'verification',
    };
    const root = document.createElement('span');
    root.className = 'operator-identity';
    root.setAttribute('data-operator', lane.key);
    root.setAttribute('data-family', families[role] || 'unknown');
    const roleMarks = { Developer: 'build', 'Research Developer': 'edition', 'Knowledge Curation': 'curation', Researcher: 'interviewer', Teaching: 'edition', Writing: 'curation', 'Quality Review': 'review', Monitor: 'monitor' };
    const ownMark = operator(lane.key);
    const mark = ownMark || (roleMarks[role] ? operator(roleMarks[role]) : role === 'Research Coordination' ? fact('team') : null);
    if (mark && role === 'Research Coordination') { mark.setAttribute('class', 'operator-mark'); mark.setAttribute('data-operator', lane.key); }
    if (mark) {
      if (!ownMark) { mark.setAttribute('data-operator', lane.key); const title = mark.querySelector?.('title'); if (title) title.textContent = role; }
      root.append(mark);
    } else { const initial = document.createElement('span'); initial.className = 'operator-initial'; initial.setAttribute('aria-hidden', 'true'); initial.textContent = role.slice(0, 1) || '?'; root.append(initial); }

    if (domain && L) {
      const seen = new Set();
      const proposals = lane.setup === 'planned' ? (lane.planning?.projectIds || []).map(id => L.entryById.get(id)).filter(Boolean) : [];
      const projects = [...Array.from(L.laneProjects(lane)), ...proposals].filter(project => project && L.entryById.has(project.id)
        && !seen.has(project.id) && seen.add(project.id));
      const shortName = workArea(lane, { L });
      if (projects.length || shortName) {
        const label = document.createElement('span');
        label.className = 'operator-domain';
        label.textContent = shortName;
        const planning = lane.planning;
        const source = 'demo-sources/' + lane.key + '.md';
        const boundPlanning = lane.setup === 'planned' && lane.setupSource === source && planning?.source === source
          && /^[a-f0-9]{64}$/.test(planning.revision || '') && planning.revision === lane.setupRevision;
        root.setAttribute('data-projects', JSON.stringify(boundPlanning ? [...new Set(planning.projectIds || [])] : projects.map(project => project.id)));
        root.append(label);
      }
    }
    return root;
  }

  // Harness marks: a small simplified brand mark of the AI system an
  // operator runs in, keyed by systemVon of model.js. The mark is decorative
  // beside the operator's name, which is its file key. Brand colours are the
  // one exception to the four hues of base.css and stay on these marks;
  // icons.css holds them as tokens. Codex and GPT share a terminal prompt,
  // because a hand-drawn OpenAI knot does not read at row size and Codex is
  // a terminal agent.
  let verlauf = 0;

  function el(tag, attrs) {
    const node = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    return node;
  }

  function harnessZeichen(key) {
    if (key === 'claude') {
      // Starburst of rounded rays in two lengths.
      const strahlen = [];
      for (let i = 0; i < 12; i += 1) {
        const w = (i * 30 + 8) * Math.PI / 180;
        const r = i % 2 ? 7.5 : 10;
        const x = (d) => (12 + Math.cos(w) * d).toFixed(2);
        const y = (d) => (12 + Math.sin(w) * d).toFixed(2);
        strahlen.push(`M${x(2.2)} ${y(2.2)}L${x(r)} ${y(r)}`);
      }
      return [el('path', { d: strahlen.join(''), stroke: 'currentColor', 'stroke-width': '2.6', 'stroke-linecap': 'round', fill: 'none' })];
    }
    if (key === 'gemini') {
      // Four-pointed star with concave sides, filled with a blue-to-violet
      // gradient; the id is unique per mark, as a page holds several.
      const id = `gemini-verlauf-${++verlauf}`;
      const grad = el('linearGradient', { id, x1: '0', y1: '0', x2: '1', y2: '1' });
      grad.append(el('stop', { offset: '0', class: 'stopp-a' }), el('stop', { offset: '1', class: 'stopp-b' }));
      const defs = el('defs', {});
      defs.append(grad);
      return [defs, el('path', { d: 'M12 1.5C12.6 7 17 11.4 22.5 12C17 12.6 12.6 17 12 22.5C11.4 17 7 12.6 1.5 12C7 11.4 11.4 7 12 1.5Z', fill: `url(#${id})` })];
    }
    const linie = { fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
    if (key === 'gpt') {
      // Terminal prompt ">_" in a rounded square.
      return [el('rect', { x: '2.5', y: '3.5', width: '19', height: '17', rx: '4', ...linie }), el('path', { d: 'M7 9.5l3 2.5l-3 2.5M12.5 15.5h4.5', ...linie })];
    }
    // Any other harness: a neutral agent node, a ring around a dot.
    return [el('circle', { cx: '12', cy: '12', r: '8.5', ...linie }), el('circle', { cx: '12', cy: '12', r: '2.5', fill: 'currentColor' })];
  }

  /**
   * Mark of the harness named in a lane's free harness text. With decorative
   * set, the mark keeps its tooltip but is hidden from assistive technology,
   * for places where the harness already stands as text. title: false drops
   * the mark's own tooltip where its container carries a fuller one.
   */
  function harness(text, { decorative = false, title: mitTitel = true } = {}) {
    const voll = String(text ?? '').replace(/\s+/g, ' ').trim();
    const art = window.LEITSTAND?.systemVon(voll) ?? { key: 'andere', name: voll || 'unbekannte Harness' };
    const svg = el('svg', { viewBox: '0 0 24 24', class: `harness-zeichen harness-${art.key}`, focusable: 'false',
      ...(decorative ? { 'aria-hidden': 'true' } : { role: 'img', 'aria-label': `Harness ${art.name}` }) });
    if (mitTitel) {
      const title = el('title', {});
      title.textContent = voll ? `Harness ${voll}` : 'Harness unbekannt';
      svg.append(title);
    }
    svg.append(...harnessZeichen(art.key));
    return svg;
  }

  return { art, create, harness, task, fact, operator, identity, workArea, label, keys: Object.keys(PATHS) };
})();
