// Berichte: the check and completion reports a subagent leaves per step,
// shown as rows below an entry. Reads window.BERICHTE, written by
// mission-control/data/make_berichte.py, and never mutates it. Rows use
// the accepted row form (.zeile from base.css) without depending on
// zeile.js, and open exactly one level: the report's four sections.
'use strict';

window.LEITSTAND_BERICHTE = (() => {
  const tr = (de, en) => window.UI_LANGUAGE ? window.UI_LANGUAGE.t(de, en) : de;
  const L = window.LEITSTAND;
  if (!L) throw new Error('berichte.js needs model.js loaded first');

  const ABSCHNITTE = ['Ergebnis', 'Befund', 'Offen', 'Folge'];
  let folge = 0;

  /** Reports of an entry, newest first as the data file orders them. */
  function list(entryId) {
    const all = window.BERICHTE?.berichte;
    if (!Array.isArray(all)) return [];
    return all.filter((b) => b && b.entry === entryId);
  }

  // Inline markup on already escaped text. Code spans are cut out first, so
  // nothing inside them turns into a link. Escaping has turned quotes into
  // entities, so an href cannot leave its attribute; only http(s) links are
  // made, any other target stays text.
  function inline(escaped) {
    return escaped.split(/`([^`]+)`/).map((teil, i) => {
      if (i % 2) return `<code>${teil}</code>`;
      return teil.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, text, url) =>
        /^https?:\/\//i.test(url) ? `<a href="${url}" target="_blank" rel="noopener">${text}</a>` : m);
    }).join('');
  }

  /**
   * Small Markdown to HTML converter for report text: headings, paragraphs,
   * flat lists, fenced code, links and code spans. Everything else stays
   * text. A heading of n hashes becomes h(n + shift), so "###" under a
   * section's own h3 becomes h4.
   */
  function toHtml(md, shift = 1) {
    const lines = L.esc(md).split(/\r?\n/);
    const out = [];
    let para = [];
    let liste = null;
    const flushPara = () => {
      if (para.length) out.push(`<p>${inline(para.join(' '))}</p>`);
      para = [];
    };
    const flushListe = () => {
      if (liste) out.push(`<${liste.tag}>${liste.items.map((t) => `<li>${inline(t)}</li>`).join('')}</${liste.tag}>`);
      liste = null;
    };
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/^\s*```/.test(line)) {
        flushPara(); flushListe();
        const code = [];
        while (++i < lines.length && !/^\s*```/.test(lines[i])) code.push(lines[i]);
        out.push(`<pre><code>${code.join('\n')}</code></pre>`);
        continue;
      }
      const h = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
      if (h) {
        flushPara(); flushListe();
        const level = Math.min(6, h[1].length + shift);
        out.push(`<h${level}>${inline(h[2])}</h${level}>`);
        continue;
      }
      const item = /^\s*([-*+]|\d+[.)])\s+(.*)$/.exec(line);
      if (item) {
        flushPara();
        const tag = /\d/.test(item[1]) ? 'ol' : 'ul';
        if (liste && liste.tag !== tag && !/^\s/.test(line)) flushListe();
        if (!liste) liste = { tag, items: [] };
        liste.items.push(item[2]);
        continue;
      }
      if (!line.trim()) {
        flushPara(); flushListe();
        continue;
      }
      // An indented line under a list item continues that item.
      if (liste && /^\s/.test(line)) {
        liste.items[liste.items.length - 1] += ' ' + line.trim();
        continue;
      }
      flushListe();
      para.push(line.trim());
    }
    flushPara(); flushListe();
    return out.join('');
  }

  // The four sections of the report text, in their fixed order.
  function abschnitte(text) {
    const teile = new Map();
    const heads = [...String(text || '').matchAll(/^##[ \t]+(.+?)[ \t]*#*[ \t]*$/gm)];
    heads.forEach((h, i) => {
      const end = i + 1 < heads.length ? heads[i + 1].index : text.length;
      teile.set(h[1].trim(), text.slice(h.index + h[0].length, end).trim());
    });
    return ABSCHNITTE.filter((t) => teile.has(t)).map((t) => ({ titel: t, md: teile.get(t) }));
  }

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function detail(b, id) {
    const d = el('div', 'detail bericht-detail');
    d.id = id;
    const meta = el('p', 'bericht-meta');
    meta.textContent = [b.schritt && tr(`Schritt: ${b.schritt}`, `Step: ${b.schritt}`), b.instanz, b.erzeugt && `${L.fmtLang(b.erzeugt)} ${b.erzeugt.slice(11)}`.trim(), b.datei]
      .filter(Boolean).join(', ');
    d.append(meta);
    for (const a of abschnitte(b.text)) {
      const sec = el('section', `bericht-abschnitt ${a.titel.toLowerCase()}`);
      // Only escaped text and the converter's own tags reach innerHTML.
      sec.innerHTML = `<h3>${L.esc(({ Ergebnis: tr('Ergebnis', 'Result'), Befund: tr('Befund', 'Finding'), Offen: tr('Offen', 'Open'), Folge: tr('Folge', 'Next step') })[a.titel] || a.titel)}</h3>${toHtml(a.md)}`;
      d.append(sec);
    }
    return d;
  }

  function zeile(b) {
    const id = `bericht-${++folge}-detail`;
    const row = el('div', 'zeile bericht');
    row.dataset.entry = b.entry;

    const name = el('span', 'name', tr('Bericht ', "Report ") + L.fmt(b.erzeugt));

    const ergebnis = b.ergebnis || b.folge || '';
    const etikett = el('span', 'etikett', ergebnis);
    if (ergebnis) etikett.title = ergebnis.replace(/`/g, '');

    const ende = el('span', 'ende');
    ende.append(el('span', 'rechts auftrag', b.auftrag || tr('Bericht', "Report")));
    const stand = b.erledigt
      ? el('span', 'zweite erledigt', '✓')
      : el('span', 'zweite offen-zahl', tr(`offen ${Number(b.offen) || 0}`, `Open ${Number(b.offen) || 0}`));
    stand.title = b.folge || '';
    if (b.erledigt) stand.append(el('span', 'sr-only', tr(', erledigt', ', completed')));
    ende.append(stand);

    row.append(name, etikett, ende);

    row.append(detail(b, id));
    return row;
  }

  /** div.berichte with one row per report of the entry; hidden when there is none. */
  function create(entryId) {
    const box = el('div', 'berichte');
    const items = list(entryId);
    box.hidden = items.length === 0;
    for (const b of items) box.append(zeile(b));
    return box;
  }

  return { list, create, toHtml };
})();
