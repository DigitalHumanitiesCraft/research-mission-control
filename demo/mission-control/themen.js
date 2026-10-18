// Categories of the Mission Control views. An entry carries its category
// key in its kategorie field: make_data.py reads kategorie:: of the ACTIVE-WORK
// entry, whose section names the same category, and make_projekte.py gives an
// initiation the category of the project it is part of or builds on. A value
// that is no key of THEMEN, as the older values of the completion markers in
// the Erledigt-Log, falls under "weitere". Reads window.LEITSTAND (model.js)
// and never mutates it.
(function () {
  'use strict';
  const tr = (de, en) => window.UI_LANGUAGE ? window.UI_LANGUAGE.t(de, en) : de;
  const L = window.LEITSTAND;
  if (!L) throw new Error('themen.js needs model.js loaded first');

  const WEITERE = 'weitere';
  // Categories the operator set on 15 October 2026 and sharpened the same
  // evening to name the kind of work rather than the way it is paid; whether
  // an entry is paid says its bezahlt field (model.js bezahltVon). The
  // training branch of DHCraft is named after its calendar "excellence".
  // Order of the chips in the views.
  const THEMEN = {
    auftrag: 'Aufträge',
    excellence: 'Excellence',
    lehre: 'Lehre',
    akademisch: 'Akademisch',
    alt: 'Altprojekte',
    werkzeug: 'Werkzeuge',
    system: 'Arbeitssystem',
    experiment: 'Experimente',
  };

  /** Category key of an entry, as the keys of THEMEN, or null under "weitere". */
  function kategorieVon(entry) {
    const key = String(entry?.kategorie ?? '').trim();
    return Object.hasOwn(THEMEN, key) ? key : null;
  }

  /** Theme name of an entry, "weitere" when its kategorie is no category key. */
  function themaVon(entry) {
    return THEMEN[kategorieVon(entry)] || WEITERE;
  }

  /** Category key of a theme name, null for "weitere" or an unknown name. */
  function schluesselVon(thema) {
    return Object.keys(THEMEN).find((k) => THEMEN[k] === thema) ?? null;
  }

  /** Theme names in chip order; "weitere" only when an active entry has no theme. */
  function themen() {
    const namen = Object.values(THEMEN);
    const ohne = L.aw.eintraege.some((e) => L.groupOf(e) !== 'ruhend' && themaVon(e) === WEITERE);
    return ohne ? [...namen, WEITERE] : namen;
  }

  /** All ACTIVE-WORK entries of a theme, resting ones included. */
  function eintraege(thema) {
    return L.aw.eintraege.filter((e) => themaVon(e) === thema);
  }

  function label(thema) {
    const words = {
      Aufträge: tr('Aufträge', 'Assignments'), Excellence: 'Excellence', Lehre: tr('Lehre', 'Teaching'),
      Akademisch: tr('Akademisch', 'Academic'), Altprojekte: tr('Altprojekte', 'Older projects'),
      Werkzeuge: tr('Werkzeuge', 'Tools'), Arbeitssystem: tr('Arbeitssystem', 'Work system'),
      Experimente: tr('Experimente', 'Experiments'), weitere: tr('weitere', 'Other'),
    };
    return Object.hasOwn(words, thema) ? words[thema] : thema;
  }

  window.LEITSTAND_THEMEN = { themen, themaVon, kategorieVon, schluesselVon, eintraege, label, kategorien: { ...THEMEN }, WEITERE };
})();
