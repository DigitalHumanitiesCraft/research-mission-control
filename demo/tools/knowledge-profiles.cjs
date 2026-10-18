'use strict';
// Logical identities remain stable: these are alternative package layouts of the same authored corpus.
const profiles = [
  { id: 'project-folder', title: { en: 'Project folders', de: 'Projektordner' }, description: { en: 'Sources are filed with their explicitly linked example project; unassigned roles remain shared.', de: 'Quellen liegen beim ausdrücklich zugeordneten Beispielprojekt; nicht zugeordnete Rollen bleiben gemeinsam abgelegt.' } },
  { id: 'linked-notes', title: { en: 'Linked notes', de: 'Verknüpfte Notizen' }, description: { en: 'The same sources form a flat note collection with their existing explicit links.', de: 'Dieselben Quellen bilden eine flache Notizsammlung mit ihren bestehenden ausdrücklichen Links.' } },
  { id: 'shared-sources', title: { en: 'Shared sources', de: 'Gemeinsame Quellen' }, description: { en: 'The same material is held in a common source collection, separate from project work.', de: 'Dasselbe Material liegt in einer gemeinsamen Quellensammlung, getrennt von der Projektarbeit.' } },
];
module.exports = function knowledgeProfiles(data, documents) {
  const assignments = new Map((data.LAB_LANES?.lanes || []).map(lane => [lane.key, [...new Set([...(lane.auftraege || []).map(task => task.vorhaben), ...(lane.planning?.projectIds || [])].filter(Boolean))]]));
  const safe = value => typeof value === 'string' && /^demo-[a-z0-9-]+$/.test(value);
  const layouts = profiles.map(profile => ({ ...profile, prefix: 'profiles/' + profile.id + '/', sources: documents.map(document => {
    const key = document.path === 'demo-guide' ? 'demo-guide' : document.path.match(/^demo-sources\/(demo-[a-z0-9-]+)\.md$/)?.[1];
    if (!safe(key)) throw new Error('Unknown synthetic profile source identity');
    const projects = assignments.get(key) || [];
    if (!projects.every(safe)) throw new Error('Unsafe synthetic project identity');
    const project = key === 'demo-guide' ? data.DEMO.projectId : projects.length === 1 ? projects[0] : 'shared';
    if (project !== 'shared' && !safe(project)) throw new Error('Unsafe synthetic guide project');
    const folder = profile.id === 'project-folder' ? 'projects/' + project + '/sources/'
      : profile.id === 'linked-notes' ? 'notes/' : 'sources/' + (key === 'demo-guide' ? 'shared/' : 'operators/');
    return { id: document.path, title: document.title, revision: document.revision, storagePath: 'profiles/' + profile.id + '/' + folder + key + '.json' };
  }) }));
  return { schema: 'mission-control-demo-profiles-1', defaultProfile: 'project-folder',
    invariant: { en: 'The research question, claims, results, limits, logical source identities and links stay the same. Only source organization changes. This example makes no claim about research effectiveness.', de: 'Forschungsfrage, Aussagen, Ergebnisse, Grenzen, logische Quellenidentitäten und Links bleiben gleich. Nur die Quellenablage ändert sich. Das Beispiel behauptet keine Forschungswirkung.' }, profiles: layouts };
};
