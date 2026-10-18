// Zugänge: one link per place an entry can be opened from (repository, local
// clone, running page, slides, offer, Drive folder, vault note, knowledge
// entry point). Reads window.ZUGAENGE, written by
// mission-control/data/make_zugaenge.py, and never mutates it. Drawing
// follows icons.js (24 viewBox, currentColor stroke, round caps).
'use strict';

window.LEITSTAND_ZUGAENGE = (() => {
  const tr = (de, en) => window.UI_LANGUAGE ? window.UI_LANGUAGE.t(de, en) : de;
  const NS = 'http://www.w3.org/2000/svg';
  // The data file is generated from vault text, so every target is checked
  // again here: only schemes that open a document, never one that runs code.
  const SCHEMES = new Set(['http:', 'https:', 'obsidian:', 'file:']);

  const LABELS = {
    repo: tr('Repository', "Repository"),
    lokal: tr('Lokaler Ordner', "Local folder"),
    seite: tr('Laufende Seite', "Running page"),
    folien: tr('Folien', "Slides"),
    angebot: tr('Angebot', "Offer"),
    drive: tr('Drive-Ordner', "Drive folder"),
    vault: tr('Projektdokument im Vault', "Project document in the vault"),
    docs: tr('Knowledge-Einstieg', "Knowledge entry point"),
  };

  // The word on each chip. The operator found the bare icons hard to tell
  // apart (15 October 2026), so every access point names itself; LABELS
  // stays the long form in tooltip and accessible name.
  const WORTE = {
    repo: 'Repo',
    lokal: tr('Ordner', "Folder"),
    seite: tr('Seite', "Page"),
    folien: tr('Folien', "Slides"),
    angebot: tr('Angebot', "Offer"),
    drive: 'Drive',
    vault: 'Obsidian',
    docs: tr('Wissen', "Knowledge"),
  };

  const PATHS = {
    // Two commits on a trunk and a branch joining from the side.
    repo: ['M4 5a2 2 0 1 0 4 0a2 2 0 1 0 -4 0z', 'M4 19a2 2 0 1 0 4 0a2 2 0 1 0 -4 0z', 'M16 7a2 2 0 1 0 4 0a2 2 0 1 0 -4 0z', 'M6 7v10', 'M18 9v1a4 4 0 0 1 -4 4h-4a4 4 0 0 0 -4 3'],
    lokal: ['M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2h8.5A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1 -1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z'],
    // Browser window with a play triangle, read as "running page".
    seite: ['M3 5h18v14H3z', 'M3 8.5h18', 'M10.5 11v5.5l4.5 -2.75z'],
    // Projection screen with text lines on a stand.
    folien: ['M3 4h18v12H3z', 'M7 8h10M7 11.5h6.5', 'M12 16v4M9 20h6'],
    // Sheet with a folded corner and a check mark.
    angebot: ['M6 3h9l4 4v14H6z', 'M15 3v4h4', 'M9 14l2 2 4 -4.5'],
    // A plain triangle with one inner stroke; deliberately no brand logo.
    drive: ['M12 3.5l9 16H3z', 'M7.6 12h8.8'],
    // Faceted stone after the Obsidian mark, simplified to the outline and
    // two facets; it opens the note in Obsidian.
    vault: [],
    // Open book.
    docs: ['M3 5.5A1.5 1.5 0 0 1 4.5 4H11v16H4.5A1.5 1.5 0 0 1 3 18.5z', 'M21 5.5A1.5 1.5 0 0 0 19.5 4H13v16h6.5a1.5 1.5 0 0 0 1.5 -1.5z'],
  };

  function safe(url) {
    try {
      return SCHEMES.has(new URL(url).protocol);
    } catch {
      return false;
    }
  }

  /** Access points of an entry, unsafe or malformed targets left out. */
  function list(entryId) {
    const items = window.ZUGAENGE?.eintraege?.[entryId];
    if (!Array.isArray(items)) return [];
    return items.filter((z) => z && Object.hasOwn(PATHS, z.art) && safe(z.url));
  }

  /** SVG element for an access kind; size is a number in px or a CSS length. */
  function icon(art, size) {
    if (art === 'vault') {
      const svg = window.SECOND_BRAIN_VAULT.icon();
      svg.setAttribute('class', 'vault-icon zugang-zeichen zugang-vault');
      if (size != null) { const len = typeof size === 'number' ? `${size}px` : String(size); svg.style.inlineSize = len; svg.style.blockSize = len; }
      return svg;
    }
    if (!Object.hasOwn(PATHS, art)) return null;
    const svg = document.createElementNS(NS, 'svg');
    for (const [name, value] of Object.entries({ viewBox: '0 0 24 24', class: `zugang-zeichen zugang-${art}`,
      'aria-hidden': 'true', focusable: 'false', fill: 'none', stroke: 'currentColor',
      'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })) svg.setAttribute(name, value);
    if (size != null) {
      const len = typeof size === 'number' ? `${size}px` : String(size);
      svg.style.inlineSize = len;
      svg.style.blockSize = len;
    }
    for (const d of PATHS[art]) {
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('d', d);
      svg.append(path);
    }
    return svg;
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  function link(z) {
    const a = document.createElement('a');
    a.className = `zugang zugang-art-${z.art}`;
    a.href = z.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    const ziel = z.pfad || z.url;
    a.title = `${LABELS[z.art]}: ${z.label}\n${ziel}`;
    a.setAttribute('aria-label', `${LABELS[z.art]}: ${z.label}`);
    a.append(icon(z.art), document.createTextNode(WORTE[z.art]));
    return a;
  }

  // Browsers refuse to open file: links from an http page, so a click on a
  // local folder or file also puts its path on the clipboard for Explorer or an editor.
  function withPathCopy(a, z, status) {
    a.addEventListener('click', async () => {
      const ok = await copy(z.pfad);
      status.textContent = ok ? tr(`Pfad kopiert: ${z.pfad}`, `Path copied: ${z.pfad}`) : tr(`Pfad: ${z.pfad}`, `Path: ${z.pfad}`);
      status.hidden = false;
    });
  }

  // Same pattern as RE_ENTRY_ID in serve.py: the request names an entry and
  // nothing else, the service resolves folder and command itself.
  const ENTRY_ID = /^[a-z0-9][a-z0-9-]{0,119}$/;

  function zielLink(url) {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = url;
    return a;
  }

  // The service answers with the address of its child server; only a loopback
  // http address is accepted, whatever else the answer says.
  function lokaleUrl(text) {
    try {
      const u = new URL(text);
      return u.protocol === 'http:' && (u.hostname === '127.0.0.1' || u.hostname === 'localhost') ? u.href : '';
    } catch {
      return '';
    }
  }

  // POST to serve.py; resolves to the parsed answer or throws with the
  // service's own message. A page outside serve.py has no such endpoint.
  async function dienst(pfad, entryId) {
    if (location.protocol !== 'http:' || !ENTRY_ID.test(entryId)) throw new Error(tr('Seite läuft nicht über den lokalen Dienst', "This page is not served by the local service"));
    let antwort;
    try {
      antwort = await fetch(`${pfad}?entry=${encodeURIComponent(entryId)}`, { method: 'POST', cache: 'no-store' });
    } catch {
      throw new Error(tr('lokaler Dienst nicht erreichbar', "Local service unavailable"));
    }
    let body = null;
    try { body = await antwort.json(); } catch { body = null; }
    // A plain static server refuses POST as 501; only serve.py knows the path.
    if (antwort.status === 501) throw new Error(tr('Seite läuft nicht über den lokalen Dienst', "This page is not served by the local service"));
    if (!antwort.ok) throw new Error(body?.error || tr(`Dienst antwortet ${antwort.status}`, `Service returned ${antwort.status}`));
    return body || {};
  }

  // Without the service the command is copied for a terminal, as before
  // /api/start existed, and the status line says why.
  async function befehlZeigen(z, status, grund) {
    const ok = await copy(z.befehl);
    const hinweis = document.createElement('span');
    hinweis.textContent = tr(`Start über den Dienst nicht möglich (${grund}). ${ok ? 'Befehl kopiert, im Terminal ausführen: ' : 'Im Terminal ausführen: '}`, `Cannot start through the service (${grund}). ${ok ? 'Command copied; run in a terminal: ' : 'Run in a terminal: '}`);
    const code = document.createElement('code');
    code.textContent = z.befehl;
    status.replaceChildren(hinweis, code);
    if (safe(z.lokalUrl)) status.append(document.createTextNode(tr(' dann ', ' then ')), zielLink(z.lokalUrl));
    status.hidden = false;
  }

  function startButton(entryId, z, status, compact = false) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = compact ? 'zugang-start anwendung-oeffnen' : 'zugang-start';
    // The tooltip carries the full state; the hidden span repeats it for
    // assistive technology, which does not read a title reliably.
    const sr = document.createElement('span');
    sr.className = 'sr-only';
    const wort = document.createElement('span');
    if (compact) {
      wort.className = 'sr-only';
      b.append(icon('seite'));
    }
    b.append(wort, sr);
    const zustand = (text, titel) => {
      wort.textContent = text;
      b.title = titel;
      if (compact) b.setAttribute('aria-label', titel);
      sr.textContent = `, ${titel}`;
    };
    const bereit = () => zustand(compact ? 'Webanwendung öffnen' : 'starten',
      compact ? 'Lokale Webanwendung starten und öffnen' : tr('Projektserver über den lokalen Dienst starten und die Seite öffnen', "Start the project server through the local service and open its page"));
    bereit();

    function stopKnopf() {
      const s = document.createElement('button');
      s.type = 'button';
      s.className = 'zugang-start';
      s.textContent = tr('stoppen', "Stop");
      s.title = 'Projektserver dieses Vorhabens beenden';
      s.addEventListener('click', async () => {
        s.disabled = true;
        try {
          await dienst('/api/stop', entryId);
          bereit();
          status.textContent = tr('Projektserver gestoppt.', "Project server stopped.");
          // The stop button leaves with the status line, so focus returns to start.
          b.focus();
        } catch (err) {
          s.disabled = false;
          status.firstChild.textContent = tr(`Stoppen fehlgeschlagen (${err.message}). Läuft unter `, `Stopping failed (${err.message}). Running at `);
        }
      });
      return s;
    }

    b.addEventListener('click', async () => {
      if (b.getAttribute('aria-busy') === 'true') return;
      b.setAttribute('aria-busy', 'true');
      zustand('startet', 'Projektserver startet');
      try {
        const url = lokaleUrl((await dienst('/api/start', entryId)).url);
        if (!url) throw new Error(tr('Antwort ohne lokale Adresse', "Response has no local address"));
        zustand('läuft', tr(`Projektserver läuft unter ${url}. Ein Klick öffnet die Seite erneut`, `Project server running at ${url}. Click to reopen the page`));
        status.replaceChildren(document.createTextNode(tr('Läuft unter ', "Running at ")), zielLink(url), document.createTextNode(' '), stopKnopf());
        status.hidden = false;
        // A popup blocker may refuse this after the wait; the link above stays.
        window.open(url, '_blank', 'noopener');
      } catch (err) {
        zustand('Fehler', `Start fehlgeschlagen: ${err.message}. Der Befehl steht darunter, ein Klick versucht es erneut`);
        await befehlZeigen(z, status, err.message);
      } finally {
        b.removeAttribute('aria-busy');
      }
    });
    return b;
  }

  // Overview access follows the user's work surface; source repository links
  // remain in the project detail.
  function application(entryId) {
    const seiten = list(entryId).filter((z) => z.art === 'seite');
    const publicSite = seiten.find((z) => /^https:\/\//i.test(z.url));
    if (publicSite) {
      const a = document.createElement('a');
      a.className = 'anwendung-oeffnen';
      a.href = publicSite.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.title = tr('Webanwendung öffnen: ', "Open web application: ") + publicSite.label;
      a.setAttribute('aria-label', a.title);
      a.append(icon('seite'));
      return a;
    }
    const localSite = seiten.find((z) => z.servierbar && z.befehl);
    if (!localSite) return null;
    const root = document.createElement('span');
    root.className = 'anwendung-zugang';
    const status = document.createElement('span');
    status.className = 'anwendung-status';
    status.setAttribute('role', 'status');
    status.hidden = true;
    root.append(startButton(entryId, localSite, status, true), status);
    return root;
  }

  /**
   * div.zugaenge with one chip per access point of the entry; empty when none.
   * vaultUrl adds the entry's note in Obsidian unless an access point already
   * opens it, so the detail needs no separate Obsidian link.
   */
  function create(entryId, vaultUrl = '') {
    const root = document.createElement('div');
    root.className = 'zugaenge';
    const items = list(entryId);
    if (vaultUrl && safe(vaultUrl) && !items.some((z) => z.url === vaultUrl)) {
      items.push({ art: 'vault', url: vaultUrl, label: tr('Eintrag in Obsidian', "Entry in Obsidian") });
    }
    if (!items.length) return root;
    const row = document.createElement('div');
    row.className = 'zugaenge-reihe';
    const status = document.createElement('p');
    status.className = 'zugaenge-status';
    status.setAttribute('role', 'status');
    status.hidden = true;
    for (const z of items) {
      const a = link(z);
      if (z.url.startsWith('file:') && z.pfad) withPathCopy(a, z, status);
      if (z.art === 'seite' && z.servierbar && z.befehl) {
        const gruppe = document.createElement('span');
        gruppe.className = 'zugang-gruppe';
        gruppe.append(a, startButton(entryId, z, status));
        row.append(gruppe);
      } else {
        row.append(a);
      }
    }
    root.append(row, status);
    return root;
  }

  /**
   * Text with every web access point named in it as a link, e.g. "Angebot
   * example identifier" to its Google document (operator, 15 October 2026). Only http(s)
   * targets, so text never links a local file; the first mention links.
   */
  function verlinke(entryId, text) {
    const frag = document.createDocumentFragment();
    const s = String(text ?? '');
    const treffer = [];
    for (const z of list(entryId)) {
      if (!/^https?:/.test(z.url) || String(z.label || '').length < 4) continue;
      const i = s.indexOf(z.label);
      if (i >= 0 && !treffer.some((t) => i < t.i + t.z.label.length && t.i < i + z.label.length)) treffer.push({ i, z });
    }
    let pos = 0;
    for (const { i, z } of treffer.sort((a, b) => a.i - b.i)) {
      frag.append(s.slice(pos, i));
      const a = document.createElement('a');
      a.href = z.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.className = 'im-text';
      a.title = `${LABELS[z.art]}: ${z.label}`;
      a.textContent = z.label;
      frag.append(a);
      pos = i + z.label.length;
    }
    frag.append(s.slice(pos));
    return frag;
  }

  return { list, create, application, verlinke, icon, labels: { ...LABELS }, arten: Object.keys(PATHS) };
})();
