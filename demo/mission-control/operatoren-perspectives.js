/** Old view addresses retain exact operator/task targets; project-only contexts move to Projects. */
export function legacyPerspectiveHref(address) {
  const url = new URL(address);
  const modes = url.searchParams.getAll('ansicht');
  if (modes.length !== 1 || !['fluss', 'topologie'].includes(modes[0])) return null;
  url.searchParams.delete('ansicht');
  if (url.searchParams.has('operator') || url.searchParams.has('auftrag') || /^#(?:operator-(?!project-)|result-|ensemble-open-|karte-|mehr-|auftrag-|ausfuehrung-)/.test(url.hash)) return url.href;
  const projectHash = /^#operator-project-(.+)$/.exec(url.hash);
  if (projectHash) {
    let id;
    try { id = decodeURIComponent(projectHash[1]); } catch { return url.href; }
    if (!url.searchParams.has('projekt')) url.searchParams.set('projekt', id);
    if (url.searchParams.get('projekt') === id) url.hash = '';
  }
  url.pathname = url.pathname.replace(/[^/]*$/, 'projekte.html');
  if (!url.hash) url.hash = modes[0] === 'fluss' ? 'projekt-auftraege' : 'projekt-verbindungen';
  return url.href;
}
