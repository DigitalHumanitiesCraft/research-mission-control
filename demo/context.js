'use strict';

window.ARBEITSKONTEXT = (() => {
  const key = 'mission-control-demo.kontext.v1';
  function gespeichert() {
    try { return JSON.parse(sessionStorage.getItem(key)) || {}; } catch { return {}; }
  }
  function lese(seite, adresseNutzen = true) {
    const stand = gespeichert();
    const adresse = new URLSearchParams(adresseNutzen ? location.hash.slice(1) : '');
    const werte = { ...stand[seite], projekt: stand.projekt || '', ...Object.fromEntries(adresse) };
    if (adresse.has('projekt') && adresse.get('projekt') !== (stand[seite]?.projekt || '') && !adresse.has('id')) { delete werte.id; delete werte.form; }
    return werte;
  }
  function schreibe(seite, werte) {
    const stand = gespeichert();
    stand[seite] = { ...werte };
    if ('projekt' in werte) stand.projekt = werte.projekt || '';
    try { sessionStorage.setItem(key, JSON.stringify(stand)); } catch { /* URL remains usable without storage. */ }
    const adresse = new URLSearchParams();
    for (const [name, wert] of Object.entries(werte)) if (wert !== null && wert !== undefined && wert !== '') adresse.set(name, String(wert));
    history.replaceState(null, '', `${location.pathname}${location.search}#${adresse}`);
    links(stand.projekt, werte.bezug ?? stand.projekt);
  }
  function links(projekt, bezug = projekt) {
    // Only the pages of this shell carry the project in their hash; Mission
    // Control addresses a project in its query string instead.
    for (const a of document.querySelectorAll('nav a[href], a[data-work-view-link]')) {
      const url = new URL(a.getAttribute('href'), location.href);
      if (!/(?:sources|experiment|collective)\.html$/.test(url.pathname)) continue;
      const adresse = new URLSearchParams(url.hash.slice(1));
      adresse.set('projekt', projekt || '');
      if (/sources\.html$/.test(url.pathname)) {
        if (bezug) adresse.set('bezug', bezug);
        else adresse.delete('bezug');
      }
      url.hash = adresse.toString();
      a.href = url.href;
    }
  }
  // A project opens in the Projekte view of Mission Control, a question in its
  // Fragen view, which took over from the former work surface on 15 October 2026.
  function arbeitsadresse(projekt, frage = '') {
    return frage
      ? `mission-control/fragen.html?${new URLSearchParams({ vorhaben: projekt, punkt: frage })}`
      : `mission-control/projekte.html?${new URLSearchParams({ projekt })}`;
  }
  function projektZiel(projekt, eintraege = []) {
    const entry = eintraege.find((item) => item.id === projekt && (typeof item.name === 'string' || typeof item.titel === 'string'));
    return entry ? { id: entry.id, name: entry.name || entry.titel, href: arbeitsadresse(entry.id) } : null;
  }
  return { lese, schreibe, links, arbeitsadresse, projektZiel };
})();
