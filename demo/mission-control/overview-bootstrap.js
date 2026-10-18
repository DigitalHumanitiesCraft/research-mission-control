// Only these two Overview pages share this ordered global-module startup contract.
const profiles = Object.freeze({ wer: ['./zeile.js', './wer.js'], fragen: ['./fragen.js'] });
const script = document.querySelector('script[type="module"][data-overview-view]');
const view = script?.dataset.overviewView;
const main = document.querySelector('main');
const tr = (de, en) => window.UI_LANGUAGE ? window.UI_LANGUAGE.t(de, en) : en;
const status = document.createElement('p');
status.id = 'overview-loading';
status.setAttribute('role', 'status');
status.textContent = tr('Ansicht wird geladen …', 'Loading view …');
main?.prepend(status);
main?.setAttribute('aria-busy', 'true');

try {
  if (!main || !Object.hasOwn(profiles, view)) throw new Error('Unknown Overview startup profile');
  for (const path of [
    '../data.js', './data/lab-lanes-data.js', './data/erledigt-data.js', './data/kalender-google-data.js',
    './model.js', './themen.js', './shell.js', './icons.js', './antworten.js', './instanz.js',
    './ergebnisse.js',
  ]) await import(path);
  for (const path of profiles[view]) await import(path);
  const rendered = view === 'fragen'
    ? document.getElementById('liste')?.childElementCount > 0
    : Boolean(document.querySelector('#titel-instanzen .n'));
  if (!rendered) throw new Error('Overview initial render did not complete');
  main.setAttribute('aria-busy', 'false');
  status.remove();
} catch (error) {
  console.error('Overview startup failed', error);
  main?.setAttribute('aria-busy', 'false');
  status.setAttribute('role', 'alert');
  status.textContent = tr('Die Ansicht konnte nicht geladen werden. Bitte lade die Seite im Browser neu.', 'The view could not be loaded. Please reload the page in your browser.');
}
