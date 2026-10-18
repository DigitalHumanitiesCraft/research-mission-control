// The accepted row form of the Mission Control views, taken from the Übersicht:
// Art-Zeichen and name bold on the left, followed by the paid mark of an
// entry (shell.js bezahltMarke), the first-sentence label in the middle, a
// date or a single word small in mono on the right. A row navigates to its project or decision destination. Rows that are not entries (lanes,
// reports) carry no Art-Zeichen and the class ohne-zeichen. Reads
// window.LEITSTAND_ICONS (icons.js) and the DOM helpers of
// window.LEITSTAND_SHELL (shell.js); all text goes in through textContent.
(function () {
  'use strict';
  const tr = (de, en) => typeof window !== 'undefined' && window.UI_LANGUAGE ? window.UI_LANGUAGE.t(de, en) : de;
  const I = window.LEITSTAND_ICONS;
  const S = window.LEITSTAND_SHELL;
  if (!I || !S) throw new Error('zeile.js needs shell.js and icons.js loaded first');
  const { el, mitTitel, bezahltMarke } = S;

  let folge = 0;

  // second accepts a node, a string or {text, class, title}, or a list of them.
  // {text: '!', title} is the conflict mark of the counter row: it takes the
  // class konflikt and only its title reaches screen readers.
  function zweite(teil) {
    if (teil instanceof Node) return teil;
    if (typeof teil === 'string') return el('span', { class: 'zweite', text: teil });
    if (teil && typeof teil === 'object') {
      if (teil.text === '!') {
        return mitTitel(el('span', { class: `zweite konflikt ${teil.class || ''}`.trim() },
          el('span', { 'aria-hidden': 'true', text: '!' })), teil.title || tr('Terminkonflikt', "Scheduling conflict"));
      }
      return mitTitel(el('span', { class: `zweite ${teil.class || ''}`.trim(), text: teil.text }), teil.title);
    }
    return null;
  }

  // data.js records in schrittLanes, parallel to schritte, which lane works
  // on a step. The row shows these lanes once, in one line at its right end,
  // each as the mark of its harness (icons.js), resolved from the lane's
  // harness field; the lane names and their steps stand in the tooltip and
  // for screen readers. A lane the row already names on the right, is left out.
  function laneMarke(entry, genannt) {
    const L = window.LEITSTAND;
    const rufe = entry?.schrittLanes;
    if (!L || !Array.isArray(rufe)) return null;
    const proLane = new Map();
    rufe.forEach((ruf, i) => {
      if (typeof ruf !== 'string' || !/^[A-Za-z-]+$/.test(ruf)) return;
      const stamm = L.laneKey(ruf);
      const assignments = L.lanes.flatMap((l) => (l.auftraege || []).filter((a) => a.entryId === entry.id).map((a) => ({ ...a, lane: l.key })));
      if (L.aufgabenKontext({ text: entry.schritte?.[i] || '', lane: stamm }, assignments).beauftragung !== 'Beauftragt') return;
      if (genannt.has(L.laneName(stamm))) return;
      if (!proLane.has(stamm)) proLane.set(stamm, []);
      proLane.get(stamm).push(L.shortLabel(entry.schritte?.[i] || '', 12));
    });
    if (!proLane.size) return null;
    const marke = el('span', { class: 'zweite lane-marke' });
    const titel = [];
    for (const [stamm, schritte] of proLane) {
      const name = L.laneName(stamm);
      // A name no active operator answers to has no lane object; its
      // display name may still name the harness.
      const lane = (L.lanes || []).find((l) => l.key === stamm);
      marke.append(I.harness(lane?.harness || name, { decorative: true, title: false }));
      titel.push(tr(`Lane ${name} arbeitet an: ${schritte.filter(Boolean).join('; ') || 'einem Schritt'}`, `Operator ${name} is working on: ${schritte.filter(Boolean).join('; ') || 'a step'}`));
    }
    return mitTitel(marke, titel.join('. '));
  }

  function zeichen(entry, icon) {
    if (icon === false || icon === null) return null;
    if (!entry && typeof icon !== 'string') return null;
    const key = typeof icon === 'string' ? icon : I.art(entry)?.key;
    return key ? I.create(key) : null;
  }

  /**
   * Row element div.zeile. icon: kind key, false for none, default from entry.
   * href overrides the project or lane decision destination.
   */
  function create({ entry = null, icon, name, label = '', labelFull = '', right = '', rightClass = '', rightTitle = '',
    second = null, href = '' } = {}) {
    const anzeige = String(name ?? entry?.name ?? '');
    const id = `zeile-${entry?.id || 'z'}-${++folge}`;
    const marke = zeichen(entry, icon);
    const zeile = el('div', { class: marke ? 'zeile' : 'zeile ohne-zeichen', 'data-id': entry?.id, 'data-detail': `${id}-detail` });

    const nameTitel = entry && entry.name !== anzeige ? entry.name : '';
    // A row of an entry names the entry, so its paid mark follows the name;
    // a row that only refers to an entry (icon false) leaves it out.
    const inhalt = [marke, anzeige, entry && icon !== false ? bezahltMarke(entry) : null].filter(Boolean);
    // Rows navigate to the maintained project or decision page. Their full
    // contribution remains visible without opening another reading level.
    const lane = (window.LEITSTAND?.lanes || []).find((l) => l.name === anzeige || l.key === anzeige);
    const laneFrage = lane ? window.LEITSTAND.fragenNachFolge(window.LEITSTAND_ANTWORTEN?.all() || {}).rot.find(x => x.quelle === 'lane' && x.operator === lane.key) : null;
    const erfasst = !window.PROJEKTE || window.PROJEKTE.projekte.some(p => p.id === entry?.id);
    const ziel = href || (entry?.id ? (erfasst && entry.status !== 'abgeschlossen'
      ? 'projekte.html?projekt=' + encodeURIComponent(entry.id) : entry.vaultUrl || 'projekte.html?projekt=' + encodeURIComponent(entry.id))
      : lane ? (laneFrage ? 'fragen.html?punkt=' + encodeURIComponent('lane-' + lane.key + (laneFrage.kennung ? '-' + laneFrage.kennung : ''))
        : L.sourceReaderHref('demo-sources/' + lane.key)) : '');
    const knopf = ziel ? el('a', { href: ziel, title: nameTitel }, ...inhalt) : null;
    zeile.append(
      knopf ? el('span', { class: 'name' }, knopf) : el('span', { class: 'name', title: nameTitel }, ...inhalt),
      el('span', { class: 'etikett', title: labelFull && labelFull !== label ? labelFull : '', text: labelFull || label }));

    const ende = el('span', { class: 'ende' });
    if (right) ende.append(mitTitel(el('span', { class: `rechts ${rightClass || ''}`.trim(), text: right }), rightTitle));
    for (const teil of [].concat(second ?? [])) {
      const node = zweite(teil);
      if (node) ende.append(node);
    }
    // Visible text only: the first child, before the hidden tooltip copy.
    const genannt = new Set([...ende.children].map((n) => n.firstChild?.textContent?.trim()));
    const laneZeichen = laneMarke(entry, genannt);
    const rechts = ende.querySelector(':scope > .rechts');
    // Beside the right-hand word on its line, so the row keeps its height.
    if (laneZeichen && rechts) {
      const linie = el('span', { class: 'ende-zeile' });
      rechts.before(linie);
      linie.append(rechts, ' ', laneZeichen);
    } else if (laneZeichen) ende.prepend(laneZeichen);
    zeile.append(ende);

    return zeile;
  }

  window.LEITSTAND_ZEILE = { create };
})();
