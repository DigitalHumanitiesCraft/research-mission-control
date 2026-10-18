const uiResearchWork = (de, en) => globalThis.window?.UI_LANGUAGE?.t(de, en) ?? de;
const kinds = new Map([
  ['concept', { key: 'concept', label: uiResearchWork('Begriff', "Concept") }],
  ['literature', { key: 'literature', label: uiResearchWork('Literatur', "Literature") }],
  ['knowledge', { key: 'knowledge', label: uiResearchWork('Wissensdokument', "Knowledge document") }],
  ['research', { key: 'research', label: uiResearchWork('Forschungsnotiz', "Research note") }],
  ['academic-writing', { key: 'writing', label: uiResearchWork('Wissenschaftlicher Text', "Academic text") }],
  ['course', { key: 'teaching', label: uiResearchWork('Lehrveranstaltung', "Course") }],
  ['workshop', { key: 'teaching', label: 'Workshop' }],
  ['design-document', { key: 'specification', label: uiResearchWork('Designdokument', "Design document") }],
  ['specification', { key: 'specification', label: uiResearchWork('Spezifikation', "Specification") }],
  ['spec', { key: 'specification', label: uiResearchWork('Spezifikation', "Specification") }],
  ['vault-organisation', { key: 'organisation', label: uiResearchWork('Vault-Organisation', "Vault organisation") }],
  ['moc', { key: 'organisation', label: uiResearchWork('Übersicht', "Overview") }],
]);

/** Broad metadata stays broad; a project-looking filename establishes no document kind. */
export function sourceKind(node) {
  return { ...(kinds.get(node?.type) || { key: 'document', label: uiResearchWork('Dokument', "Document") }) };
}

const byName = (a, b) => a.name.localeCompare(b.name, 'de') || a.id.localeCompare(b.id);
const text = value => {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'string') throw new Error(uiResearchWork('Ein Arbeitsfeld enthält keinen Text.', "A work field contains no text."));
  return value;
};

/** Project records retain original questions and source evidence without inferring resource use. */
export function buildWorkModel(model, data) {
  if (!(model?.nodes instanceof Map) || !Array.isArray(model.links) || !Array.isArray(data?.eintraege) || !Array.isArray(data.posten)) throw new Error(uiResearchWork('Der Arbeitsbestand hat ein unbekanntes Format.', "The work collection has an unknown format."));
  const sources = new Map([...model.nodes.values()].filter(node => node.origin === 'vault').map(node => [node.path, node.id]));
  const ids = new Set();
  const projects = data.eintraege.map(entry => {
    if (!entry || typeof entry.id !== 'string' || !entry.id.trim() || typeof entry.name !== 'string' || !entry.name.trim() || ids.has(entry.id)) throw new Error(uiResearchWork('Ein Arbeitseintrag hat keine eindeutige Identität.', "A work entry has no unique identity."));
    ids.add(entry.id);
    const steps = entry.schritte ?? [];
    if (!Array.isArray(steps) || !steps.every(step => typeof step === 'string')) throw new Error(uiResearchWork('Die dokumentierten Schritte sind ungültig.', "The recorded steps are invalid."));
    return {
      id: entry.id, name: entry.name, status: text(entry.status), goal: text(entry.ziele), stand: text(entry.stand),
      sourceId: typeof entry.notizPfad === 'string' ? sources.get(entry.notizPfad) || null : null,
      questions: data.posten.filter(point => point?.projekt === entry.id), steps: [...steps], waiting: text(entry.wartetAuf), raw: entry,
    };
  }).sort(byName);
  const questionIds = new Set();
  for (const point of data.posten) {
    if (!point || typeof point.id !== 'string' || !point.id.trim() || questionIds.has(point.id)) throw new Error(uiResearchWork('Eine Frage hat keine eindeutige Identität.', "A question has no unique identity."));
    if (typeof point.projekt !== 'string' || !ids.has(point.projekt)) throw new Error(uiResearchWork('Eine Frage gehört zu keinem bekannten Arbeitseintrag.', "A question belongs to no known work entry."));
    const wording = [point.frage, point.original];
    if (wording.some(value => value != null && typeof value !== 'string') || !wording.some(value => typeof value === 'string' && value.trim())) throw new Error(uiResearchWork('Eine Frage hat keinen gültigen Wortlaut.', "A question has no valid wording."));
    questionIds.add(point.id);
  }
  const projectsBySource = new Map();
  for (const project of projects) {
    if (!project.sourceId) continue;
    if (!projectsBySource.has(project.sourceId)) projectsBySource.set(project.sourceId, []);
    projectsBySource.get(project.sourceId).push(project);
  }
  const targets = new Map();
  for (const edge of model.links) {
    const referencing = projectsBySource.get(edge.from), node = model.nodes.get(edge.to);
    // Project endpoints and navigation hubs remain available in the full reference graph.
    if (!referencing || !node || node.origin !== 'vault' || projectsBySource.has(node.id) || node.isHub || node.type === 'vault-organisation') continue;
    if (!targets.has(node.id)) targets.set(node.id, { node, projects: new Map() });
    const target = targets.get(node.id);
    for (const project of referencing) {
      if (!target.projects.has(project.id)) target.projects.set(project.id, { project, edges: [] });
      target.projects.get(project.id).edges.push(edge);
    }
  }
  const shared = [...targets.values()].filter(target => target.projects.size > 1).map(target => ({
    node: target.node, projects: [...target.projects.values()].sort((a, b) => byName(a.project, b.project)),
  })).sort((a, b) => a.node.title.localeCompare(b.node.title, 'de') || a.node.id.localeCompare(b.node.id));
  return { projects, shared };
}
