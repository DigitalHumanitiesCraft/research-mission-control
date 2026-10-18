// Sicht "Frische": is the documented state of each open ACTIVE-WORK entry
// as new as the evidence of its work? One row per entry states the fact,
// never a score: the newest commit of its local clones and of its project
// document in the vault against the entry's updated date. It judges the
// documentation, never the code. The grouping rule (lage) lives in
// make_frische.py alone, so the view only reads it. Reads window.FRISCHE
// (make_frische.py), window.LEITSTAND (model.js), LEITSTAND_SHELL,
// LEITSTAND_THEMEN and LEITSTAND_ZEILE and never mutates their data; every
// text goes in through textContent. Rows the operator handed on for review
// are marked in localStorage under mission-control-demo-frische-markiert as {id: iso}.
(function () {
  'use strict';
  const tr = (de, en) => typeof window !== 'undefined' && window.UI_LANGUAGE ? window.UI_LANGUAGE.t(de, en) : de;
  const L = window.LEITSTAND;
  const S = window.LEITSTAND_SHELL;
  const Z = window.LEITSTAND_ZEILE;
  if (!L || !S) throw new Error('frische.js needs model and shell loaded first');
  const { el, mitTitel, ohnePunkt } = S;

  const getF = () => window.FRISCHE || null;
  const MARKIERT = L.store('mission-control-demo-frische-markiert');

  // Group order stays stable; every group and its evidence remain visible.
  const GRUPPEN = [
    { key: 'repo-neuer', titel: tr('Repo neuer als der Eintrag', "Repository newer than entry") },
    { key: 'vault-neuer', titel: tr('Projektdokument neuer als der Eintrag', "Project document newer than entry") },
    { key: 'aktuell', titel: tr('Kein neuerer datierter Beleg', 'No newer dated evidence') },
    { key: 'ohne-beleg', titel: tr('Ohne Beleg', "Without evidence") },
    { key: 'ruhend', titel: tr('Ruhend', "Dormant") },
  ];

  const klonName = (pfad) => String(pfad || '').split(/[\\/]/).filter(Boolean).pop() || pfad;
  const datumVon = (k) => k?.letzterCommit?.datum || '';
  const anzeigeName = (e) => L.nameOhneDatum(e.name);
  // Stricter than S.sicherUrl: this view links only into the local vault.
  const sicherUrl = (url) => (/^obsidian:\/\//i.test(String(url || '')) ? url : '');

  function newest(klone) {
    return klone.reduce((best, k) => (datumVon(k) > datumVon(best) ? k : best), klone[0]);
  }

  // The clone marks: * for uncommitted changes, an arrow with the number of
  // commits ahead of the upstream. Several clones of one entry add up.
  function klonMarken(klone) {
    const marken = [];
    const geaendert = klone.filter((k) => k.geaendert).map((k) => klonName(k.pfad));
    if (geaendert.length) {
      marken.push(mitTitel(el('span', { class: 'marke geaendert' }, el('span', { 'aria-hidden': 'true', text: '*' })),
        tr(`nicht committete Änderungen in ${geaendert.join(', ')}`, `Uncommitted changes in ${geaendert.join(', ')}`)));
    }
    const vor = klone.filter((k) => k.ungepusht > 0);
    if (vor.length) {
      const n = vor.reduce((s, k) => s + k.ungepusht, 0);
      marken.push(mitTitel(el('span', { class: 'marke ungepusht' }, el('span', { 'aria-hidden': 'true', text: `↑${n}` })),
        vor.map((k) => tr(`${klonName(k.pfad)}: ${k.ungepusht} ${k.ungepusht === 1 ? 'Commit' : 'Commits'} nicht gepusht`, `${klonName(k.pfad)}: ${k.ungepusht} unpushed ${k.ungepusht === 1 ? 'commit' : 'commits'}`)).join(', ')));
    }
    return marken;
  }

  // The fact of a row: in the two "newer" groups the evidence that is newer
  // than the entry, otherwise the newest evidence there is. The entry's own
  // date stands once, on the right.
  function fakt(r) {
    if (!r) return [mitTitel(el('span', { class: 'fakt-leer', text: tr('nicht gelesen', "Not read") }), tr('Der Eintrag ist jünger als die Frische-Daten; make_frische.py neu ausführen', "The entry is newer than the freshness snapshot; refresh the source comparison"))];
    const teile = [];
    const klone = r.klone.filter((k) => datumVon(k));
    const doc = r.projektdokument;
    const docDatum = doc?.letzterCommit || '';
    const neuer = r.lage === 'repo-neuer' || r.lage === 'vault-neuer';
    if (klone.length) {
      const k = newest(klone);
      if (!neuer || datumVon(k) > r.updated) {
        const titel = klone.length > 1
          ? `letzte Commits: ${klone.map((x) => `${klonName(x.pfad)} ${L.fmtLang(datumVon(x))}`).join(', ')}`
          : `letzter Commit in ${klonName(k.pfad)} am ${L.fmtLang(datumVon(k))}`;
        teile.push(el('span', { class: 'beleg' }, 'Repo ', mitTitel(el('span', { class: 'datum', text: L.fmt(datumVon(k)) }), titel),
          ...klonMarken(r.klone)));
      }
    } else if ((r.klone || []).length) {
      teile.push(el('span', { class: 'beleg' }, tr('Repo ohne Commit', "Repository without commit"), ...klonMarken(r.klone)));
    }
    if (docDatum && (!neuer || docDatum > r.updated)) {
      teile.push(el('span', { class: 'beleg' }, tr('Projektdokument ', 'Project document '),
        mitTitel(el('span', { class: 'datum', text: L.fmt(docDatum) }), tr(`letzter Vault-Commit von ${doc.datei} am ${L.fmtLang(docDatum)}`, `Latest vault commit of ${doc.datei} on ${L.fmtLang(docDatum)}`))));
    }
    if (!teile.length) {
      teile.push(el('span', { class: 'fakt-leer', text: r.lage === 'ohne-beleg' ? tr('kein Klon, kein Projektdokument', 'No clone or project document') : tr('kein datierter Beleg', "No dated evidence") }));
    }
    return teile.flatMap((t, i) => (i ? [', ', t] : [t]));
  }

  function markierung(id) {
    const alle = MARKIERT.get({}) || {};
    return typeof alle[id] === 'string' ? alle[id] : '';
  }

  // A mark from before the entry's last update is done: the entry was
  // revised after the operator asked for it. The mark is compared as a local
  // day, because toISOString counts in UTC.
  function giltMarkierung(e) {
    const m = markierung(e.id);
    const d = new Date(m);
    if (!m || Number.isNaN(d.getTime())) return '';
    return L.localIso(d) >= (e.updated || '') ? m : '';
  }

  function setzeMarkierung(id, wert) {
    const alle = MARKIERT.get({}) || {};
    if (wert) alle[id] = wert; else delete alle[id];
    return MARKIERT.set(alle);
  }

  // Local date and time of a stored mark, as 14.10.2026 15:20.
  function stempel(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return `${L.fmtLang(L.localIso(d))} ${L.uhrVon(d)}`;
  }

  function aktion(e, zeile) {
    const localStatus = el('span', { class: 'evidence-status', role: 'status' });
    const status = zeile?.matches('.project-evidence') ? localStatus : document.getElementById('meldung') || localStatus;
    const auftrag = tr(`Lagebericht ACTIVE-WORK für ${e.name} prüfen`, `Review the ACTIVE-WORK status for ${e.name}`);
    const knopf = el('button', { type: 'button', class: 'aktualisieren', text: tr('Prüfauftrag kopieren', "Copy review request"),
      title: tr(`kopiert „${auftrag}“ in die Zwischenablage und markiert die Zeile`, `Copies “${auftrag}” to the clipboard and marks this row`) });
    const manual = el('textarea', { class: 'copy-fallback', readonly: true, hidden: true, rows: 3, 'aria-label': tr('Prüfauftrag manuell kopieren', "Copy review request manually"), text: auftrag });
    const stand = el('span', { class: 'markiert-text' });
    const loesen = el('button', { type: 'button', class: 'loesen', text: tr('Markierung lösen', "Clear mark"), title: tr('nimmt die Markierung dieser Zeile zurück', "Clears this row's mark") });
    const zeige = () => {
      const m = giltMarkierung(e);
      stand.textContent = m ? tr(`markiert ${stempel(m)}`, `Marked ${stempel(m)}`) : '';
      stand.title = m ? tr(`Auftrag am ${stempel(m)} kopiert, im Browser gespeichert; die Markierung endet mit der nächsten Aktualisierung des Eintrags`, `Request copied on ${stempel(m)} and saved in this browser; the mark expires when the entry is updated`) : '';
      loesen.hidden = !m;
      markeSetzen(zeile, e);
    };
    knopf.addEventListener('click', async () => {
      const ok = await L.kopiere(auftrag);
      const gespeichert = ok && setzeMarkierung(e.id, new Date().toISOString());
      manual.hidden = ok;
      if (!ok) { manual.focus(); manual.select(); }
      status.textContent = ok ? tr(`${auftrag}, kopiert`, `${auftrag}, copied`) : tr('Bitte den ausgewählten Prüfauftrag manuell kopieren.', "Please copy the selected full review request manually.");
      knopf.textContent = ok ? tr('kopiert', 'Copied') : tr('nicht kopiert', "Not copied");
      setTimeout(() => { knopf.textContent = tr('Prüfauftrag kopieren', "Copy review request"); }, 2500);
      if (ok && !gespeichert) stand.textContent = tr('kopiert, Markierung nicht gespeichert', "Copied; mark not saved");
      else zeige();
    });
    loesen.addEventListener('click', () => {
      setzeMarkierung(e.id, null);
      zeige();
      knopf.focus();
    });
    zeige();
    return el('div', { class: 'aktion' }, knopf, stand, loesen, manual, localStatus);
  }

  function detail(e, r, zeile) {
    const teile = [];
    for (const k of r?.klone || []) {
      const name = klonName(k.pfad);
      const zusatz = [k.geaendert ? 'nicht committete Änderungen' : '', k.ungepusht > 0 ? 'nicht gepusht' : '',
        k.ungepusht === null ? 'ohne Upstream' : ''].filter(Boolean).join(', ');
      const p = el('p', { class: 'beleg-zeile' }, el('span', { class: 'lead', title: k.pfad }, `Repo ${name}`));
      if (k.letzterCommit) {
        p.append(' ', mitTitel(el('span', { class: 'datum', text: L.fmt(k.letzterCommit.datum) }), tr(`letzter Commit am ${L.fmtLang(k.letzterCommit.datum)}`, `Latest commit on ${L.fmtLang(k.letzterCommit.datum)}`)),
          ' ', el('span', { class: 'text', text: ohnePunkt(k.letzterCommit.betreff) }));
      } else {
        p.append(' ', el('span', { class: 'text', text: ohnePunkt(k.problem || tr('ohne lesbaren Commit', "No readable commit")) }));
      }
      if (zusatz) p.append(', ', el('span', { class: 'zusatz', text: zusatz }));
      teile.push(p);
    }
    const doc = r?.projektdokument;
    if (doc) {
      const url = sicherUrl(e.vaultUrl);
      const name = url ? el('a', { href: url, title: tr(`${doc.pfad} in Obsidian öffnen`, `Open ${doc.pfad} in Obsidian`), text: doc.datei })
        : el('span', { title: doc.pfad, text: doc.datei });
      const p = el('p', { class: 'beleg-zeile' }, el('span', { class: 'lead', text: tr('Projektdokument', "Project document") }), ' ', name);
      if (doc.letzterCommit) {
        p.append(' ', mitTitel(el('span', { class: 'datum', text: L.fmt(doc.letzterCommit) }), tr(`letzter Vault-Commit am ${L.fmtLang(doc.letzterCommit)}`, `Latest vault commit on ${L.fmtLang(doc.letzterCommit)}`)),
          ' ', el('span', { class: 'text', text: ohnePunkt(doc.betreff) }));
      } else {
        p.append(' ', el('span', { class: 'text', text: ohnePunkt(doc.problem || tr('nie committet', "Never committed")) }));
      }
      if (doc.geaendert) p.append(', ', el('span', { class: 'zusatz', text: tr('nicht committete Änderungen', "Uncommitted changes") }));
      teile.push(p);
    }
    if (r?.erledigt) {
      teile.push(el('p', { class: 'beleg-zeile' }, el('span', { class: 'lead', text: tr('Erledigt', "Completed") }), ' ',
        mitTitel(el('span', { class: 'datum', text: L.fmt(r.erledigt.datum) }), tr(`Erledigt-Log vom ${L.fmtLang(r.erledigt.datum)}`, `Completion log from ${L.fmtLang(r.erledigt.datum)}`)),
        ' ', el('span', { class: 'text', text: ohnePunkt(r.erledigt.text) })));
    } else {
      teile.push(el('p', { class: 'beleg-zeile' }, el('span', { class: 'lead', text: tr('Erledigt', "Completed") }), ' ', el('span', { class: 'text', text: tr('keine Zeile im Erledigt-Log', "No entry in the completion log") })));
    }
    teile.push(aktion(e, zeile));
    return teile;
  }

  // The mark of a handed-on row sits under its date on the right.
  function markeSetzen(zeile, e) {
    const ende = zeile?.querySelector(':scope > .ende');
    if (!ende) return;
    ende.querySelector('.markiert')?.remove();
    const m = giltMarkierung(e);
    if (m) ende.append(mitTitel(el('span', { class: 'zweite markiert', text: tr('markiert', "Marked") }), tr(`zur Prüfung kopiert am ${stempel(m)}`, `Copied for review on ${stempel(m)}`)));
  }

  function zeile(e, r) {
    const z = Z.create({
      entry: e, name: anzeigeName(e), right: L.fmt(e.updated), rightTitle: e.updated ? `Eintrag aktualisiert am ${L.fmtLang(e.updated)}` : tr('Eintrag ohne Datum', "Entry has no date"),
      href: `projekte.html?projekt=${encodeURIComponent(e.id)}`,
    });
    const etikett = z.querySelector(':scope > .etikett');
    etikett.replaceChildren(...fakt(r));
    markeSetzen(z, e);
    z.append(el('div', { class: 'detail' }, ...detail(e, r, z)));
    return z;
  }

  function gruppeVon(e, r) {
    if (e.status === 'ruhend') return 'ruhend';
    return r ? r.lage : 'ohne-beleg';
  }

  // Largest gap first; at equal gap the oldest entry, then the name.
  function ordnen(a, b) {
    return (b.r?.abstandTage || 0) - (a.r?.abstandTage || 0)
      || (a.e.updated || '').localeCompare(b.e.updated || '')
      || a.e.name.localeCompare(b.e.name, 'de');
  }

  function gruppe(g, liste) {
    const n = liste.length;
    const zahl = mitTitel(el('span', { class: 'n', text: String(n) }), tr(`${n} Vorhaben in dieser Gruppe`, `${n} projects in this group`));
    const listeNode = el('div', { class: 'liste', id: `liste-${g.key}` }, ...liste.map(({ e, r }) => zeile(e, r)));
    const kopf = el('h2', { id: `gruppe-${g.key}` }, g.titel, zahl);
    return el('section', { class: `col ${g.key}`, 'aria-labelledby': `gruppe-${g.key}` }, kopf, listeNode);
  }

  function erzeugtZeile() {
    const F = getF();
    const p = document.getElementById('erzeugt');
    p.removeAttribute('data-i18n-de');
    p.removeAttribute('data-i18n-en');
    if (!F) {
      p.textContent = tr('Keine Frische-Daten. python mission-control/data/make_frische.py erzeugt sie.', "No freshness data. The local data generator creates this snapshot.");
      p.classList.add('fehlt');
      return;
    }
    const [tag, zeit] = String(F.generated || '').split(' ');
    const previous = new Map((F.eintraege || []).map(record => [record.id, record]));
    const veraltet = L.aw.eintraege.some(entry => {
      const record = previous.get(entry.id);
      return !record || (entry.updated || '') !== (record.updated || '');
    });
    p.replaceChildren(mitTitel(el('span', { text: tr(`Belege gelesen ${L.fmt(tag)} ${zeit || ''}`, `Evidence read ${L.fmt(tag)} ${zeit || ''}`).trim() }),
      `Commits, Projektdokumente und Erledigt-Log am ${L.fmtLang(tag)} um ${zeit || ''} gelesen; ACTIVE-WORK-Stand ${L.fmtLang(L.stand.activeWork)}`));
    if (veraltet) {
      p.append(', ', mitTitel(el('span', { class: 'veraltet', text: tr('ACTIVE-WORK seither geändert', "ACTIVE-WORK has changed since") }),
        tr('Ein Eintrag fehlt im damaligen Vergleich oder trägt ein anderes Datum; make_frische.py neu ausführen', "An entry is missing from that comparison or has a different date; refresh the source comparison")));
    }
  }

  function zeichnen() {
    const F = getF();
    const fokus = document.activeElement?.closest?.('#cols .zeile')?.dataset.id;
    const cols = document.getElementById('cols');
    if (!F) {
      cols.replaceChildren();
      return;
    }
    const recById = new Map((F.eintraege || []).map((r) => [r.id, r]));
    const eintraege = L.aw.eintraege.filter((e) => e.status !== 'abgeschlossen' && S.visible(e));
    const nach = new Map(GRUPPEN.map((g) => [g.key, []]));
    for (const e of eintraege) {
      const r = recById.get(e.id) || null;
      nach.get(gruppeVon(e, r))?.push({ e, r });
    }
    const sektionen = new Map();
    for (const g of GRUPPEN) {
      const liste = nach.get(g.key).sort(ordnen);
      if (liste.length) sektionen.set(g.key, gruppe(g, liste));
    }
    // The remaining evidence groups share the third column.
    const stapelTeile = ['aktuell', 'ohne-beleg', 'ruhend'].map((k) => sektionen.get(k)).filter(Boolean);
    const stapel = stapelTeile.length ? el('div', { class: 'stapel' }, ...stapelTeile) : null;
    cols.replaceChildren(...[sektionen.get('repo-neuer'), sektionen.get('vault-neuer'), stapel].filter(Boolean));
    if (!cols.children.length) cols.append(el('p', { class: 'leer', text: tr('Kein offenes Vorhaben in diesem Thema.', "No open project in this category.") }));
    if (fokus && !document.activeElement?.closest?.('#cols .zeile')) {
      document.querySelector(`#cols .zeile[data-id="${CSS.escape(fokus)}"] > .name a`)?.focus();
    }
  }

  function projectEvidence(entry) {
    const record = (getF()?.eintraege || []).find(item => item.id === entry.id) || null;
    // Retain the original evidence even when its comparison no longer binds to this entry.
    const current = Boolean(record && entry.updated && record.updated === entry.updated);
    const group = current ? GRUPPEN.find(item => item.key === gruppeVon(entry, record)) : null;
    const state = group?.titel || tr('Vergleichsstand unbekannt', 'Comparison state unknown');
    const node = el('details', { class: 'project-evidence', 'data-evidence-state': current ? gruppeVon(entry, record) : 'unknown' },
      el('summary', { text: tr('Quellenvergleich: ', 'Source comparison: ') + state }));
    const body = el('div', { class: 'detail' });
    const generated = getF()?.generated;
    body.append(el('p', { class: 'evidence-read', text: generated
      ? tr('Belege gelesen ', 'Evidence read ') + generated
      : tr('Lesedatum der Belege unbekannt.', 'Evidence read date unknown.') }));
    if (!current) body.append(el('p', { class: 'evidence-unknown', text: tr('Der Vergleich fehlt oder gehört nicht zum aktuellen Eintragsdatum. Vorhandene Belege bleiben lesbar.', 'The comparison is missing or does not match the current entry date. Available evidence remains readable.') }));
    body.append(el('p', { class: 'evidence-fact' }, ...fakt(current ? record : null)), ...detail(entry, record, node));
    node.append(body);
    return node;
  }

  window.LEITSTAND_FRISCHE = { projectEvidence };
  const host = document.getElementById('cols');
  if (host && document.getElementById('erzeugt') && document.getElementById('kopf')) {
    if (!Z) throw new Error('The freshness page needs zeile.js loaded first');
    erzeugtZeile();
    // mount() applies the stored theme at once and so renders the groups.
    S.mount(document.getElementById('kopf'), { view: 'frische', onFilter: zeichnen });
  }
})();
