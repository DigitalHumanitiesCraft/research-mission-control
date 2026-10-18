'use strict';
const crypto = require('node:crypto');
module.exports = function buildDataAssets(data, source) {
  const entries = new Map();
  const hash = text => crypto.createHash('sha256').update(text).digest('hex');
  const revision = hash(source);
  if (revision !== data.DEMO.sourceRevision) throw new Error('Synthetic data and source revision differ; update the explicit source bindings together.');
  const globals = { 'data.js': 'PRUEFANSICHT', 'mission-control/data/lab-lanes-data.js': 'LAB_LANES',
    'mission-control/data/erledigt-data.js': 'ERLEDIGT', 'mission-control/data/projekte-data.js': 'PROJEKTE',
    'mission-control/data/berichte-data.js': 'BERICHTE', 'mission-control/data/zugaenge-data.js': 'ZUGAENGE',
    'mission-control/data/kalender-google-data.js': 'KALENDER_GOOGLE', 'mission-control/data/frische-data.js': 'FRISCHE',
    'mission-control/data/monitor-data.js': 'MONITOR', 'mission-control/data/agenten-data.js': 'AGENTEN' };
  for (const [file, key] of Object.entries(globals)) {
    if (!data[key]) throw new Error('Missing synthetic contract: ' + key);
    const value = key === 'PROJEKTE' ? { ...data[key], projekte: data[key].projekte.map(project => project.links?.notiz === 'demo-guide' ? { ...project, quellenrevision: revision } : project) } : data[key];
    const editorial = key === 'PRUEFANSICHT' ? '\nwindow.LEITSTAND_ERGEBNIS_EDITORIAL = ' + JSON.stringify(data.DEMO.editorial || { readings: [], introductions: [] }, null, 2) + ';\n' : '';
    entries.set(file, 'window.' + key + ' = ' + JSON.stringify(value, null, 2) + ';\n' + editorial);
  }
  const documents = [{ path: 'demo-guide', text: source, revision, title: data.DEMO.sourceTitle }];
  for (const [path, document] of Object.entries(data.DEMO.sources || {})) {
    if (!/^demo-sources\/demo-[a-z-]+\.md$/.test(path) || document?.path !== path || typeof document.text !== 'string'
      || typeof document.title !== 'string' || !document.title || document.revision !== hash(document.text)) {
      throw new Error('Invalid authored synthetic source binding: ' + path);
    }
    documents.push(document);
  }
  const byPath = new Map(documents.map(document => [document.path, document]));
  if (!Array.isArray(data.RESEARCH_PATHS)) throw new Error('Missing authored synthetic reading paths.');
  const pathIds = new Set();
  for (const item of data.RESEARCH_PATHS) {
    if (!item || typeof item.id !== 'string' || !item.id.startsWith('demo-') || pathIds.has(item.id)
      || !['title', 'prompt', 'reason'].every(key => typeof item[key] === 'string' && item[key].trim())
      || !Array.isArray(item.paths) || !item.paths.length || new Set(item.paths).size !== item.paths.length
      || !item.paths.every(id => byPath.has(id)) || !Array.isArray(item.sourceRefs) || item.sourceRefs.length !== item.paths.length
      || !item.sourceRefs.every((ref, index) => ref?.path === item.paths[index] && ref.revision === byPath.get(ref.path).revision
        && Number.isInteger(ref.line) && ref.line > 0 && ref.line <= byPath.get(ref.path).text.split('\n').length)) {
      throw new Error('Invalid authored synthetic reading path.');
    }
    pathIds.add(item.id);
  }
  entries.set('research-paths.js', 'window.RESEARCH_PATHS = ' + JSON.stringify(data.RESEARCH_PATHS, null, 2) + ';\n');
  const map = {};
  const links = [];
  for (const [index, document] of documents.entries()) {
    const file = index ? 'demo-assets/source-' + index + '.json' : 'demo-assets/source.json';
    map[document.path] = file;
    entries.set(file, JSON.stringify(document, null, 2));
    // Only this literal reference, present in the authored bytes, forms a graph edge.
    const line = document.text.split('\n').findIndex(line => line === 'Related example source: [[demo-guide]]');
    if (line >= 0) links.push({ from: document.path, to: 'demo-guide', quote: 'Related example source: [[demo-guide]]', line: line + 1 });
  }
  const coverage = { schema: 'second-brain-coverage-1', synthetic: true, generatedAt: data.BRIEFINGS.assembledAt, errors: [],
    vault: { documents: documents.map(({ path, title, revision }) => ({ id: path, path, title, revision, tags: ['demo'], aliases: [], type: 'research' })),
      links, coverage: { missingPaths: [] } }, repositories: { documents: [], mappings: [], links: [] } };
  for (const [file, value] of Object.entries({
    'source-map.json': map, 'demo-assets/coverage.json': coverage,
    'demo-assets/work.json': data.PRUEFANSICHT, 'demo-assets/acceptance.json': data.DEMO.acceptanceReview,
    'demo-assets/agent-work.json': data.DEMO.agentWork, 'demo-assets/operator-sessions.json': data.DEMO.operatorSessions,
    'demo-assets/relations.json': data.DEMO.relations, 'demo-assets/progress.json': data.DEMO.progress,
    'mission-control/briefings/current.json': { snapshot: '2026-10-17T080000Z.json' },
    'mission-control/briefings/2026-10-17T080000Z.json': data.BRIEFINGS,
  })) { if (!value) throw new Error('Missing synthetic read asset: ' + file); entries.set(file, JSON.stringify(value, null, 2)); }
  const profileIndex = require('./knowledge-profiles.cjs')(data, documents);
  const common = [...entries];
  for (const profile of profileIndex.profiles) {
    for (const [file, value] of common) {
      if (/^demo-assets\/source(?:-\d+)?\.json$/.test(file)) continue;
      entries.set(profile.prefix + file, value);
    }
    const profileMap = {};
    for (const layout of profile.sources) {
      profileMap[layout.id] = layout.storagePath;
      entries.set(layout.storagePath, JSON.stringify(byPath.get(layout.id), null, 2));
    }
    entries.set(profile.prefix + 'source-map.json', JSON.stringify(profileMap, null, 2));
    const selectedCoverage = { ...coverage, profile: profile.id, vault: { ...coverage.vault,
      documents: coverage.vault.documents.map(document => ({ ...document, storagePath: profile.sources.find(source => source.id === document.id).storagePath })) } };
    entries.set(profile.prefix + 'demo-assets/coverage.json', JSON.stringify(selectedCoverage, null, 2));
  }
  entries.set('profiles/index.json', JSON.stringify(profileIndex, null, 2));
  entries.set('demo-profiles.js', 'window.MISSION_CONTROL_DEMO_PROFILES = ' + JSON.stringify(profileIndex, null, 2) + ';\n');
  return entries;
};
