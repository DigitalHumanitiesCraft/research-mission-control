const identifier = value => typeof value === 'string' && value.trim() === value && value.length > 0 && !/[\u0000-\u001f\u007f]/.test(value);
const nodeId = (kind, id) => kind + ':' + encodeURIComponent(id);
const recordKey = (...parts) => parts.map(encodeURIComponent).join(':');

// Source identities, rather than similar titles or displayed order, establish relations.
export function buildRelations(L, projectData, visible = () => true) {
  const unresolved = [];
  const projects = new Map();
  const operators = new Map();
  const assignments = new Map();
  const edges = new Map();
  const ambiguousProjects = new Set();
  const rawProjects = Array.isArray(projectData?.projekte) ? projectData.projekte : [];
  const issue = (kind, source, reason) => unresolved.push({ kind, source, reason });
  for (const source of rawProjects) {
    if (!identifier(source?.id)) { issue('project', source, 'invalid-project-id'); continue; }
    if (projects.has(source.id)) {
      if (JSON.stringify(projects.get(source.id).source) !== JSON.stringify(source)) {
        ambiguousProjects.add(source.id); issue('project', source, 'duplicate-project-id');
      }
      continue;
    }
    const entry = L.entryById?.get(source.id);
    projects.set(source.id, {
      id: source.id, title: source.titel || entry?.name || source.id,
      goal: source.ziel || entry?.ziele || '', state: source.status || entry?.status || source.zustand || '',
      stand: source.stand || entry?.stand || '', inputs: Array.isArray(source.wissen) ? source.wissen.map(item => ({ ...item })) : [],
      outputs: [], operatorIds: [], relations: [], projectHref: 'projekte.html?' + new URLSearchParams({ projekt: source.id }),
      source, entry,
    });
  }
  for (const id of ambiguousProjects) projects.delete(id);
  const candidates = new Map();
  const ambiguousOperators = new Set();
  for (const lane of L.lanes || []) {
    if (!identifier(lane?.key)) { issue('operator', lane, 'invalid-operator-id'); continue; }
    if (operators.has(lane.key)) { ambiguousOperators.add(lane.key); issue('operator', lane, 'duplicate-operator-id'); continue; }
    operators.set(lane.key, { id: lane.key, title: lane.rollentitel || lane.name || lane.key, projectIds: [], assignmentKeys: [], source: lane });
    for (const task of [...(lane.auftraege || []), ...(lane.erledigt || []), ...(lane.abgenommen || [])]) {
      const projectId = task.entryId || task.vorhaben;
      const conflict = task.entryId && task.vorhaben && task.entryId !== task.vorhaben;
      if (task.vertragsfehler || task.entryIssue || conflict || task.operator && task.operator !== lane.key
        || !identifier(task.kennung) || !identifier(projectId) || !projects.has(projectId)) {
        issue('assignment', { operatorId: lane.key, task }, conflict ? 'conflicting-project-id' : 'unbound-assignment'); continue;
      }
      const key = recordKey('assignment', lane.key, task.kennung);
      const record = { key, operatorId: lane.key, projectId, kennung: task.kennung, auftrag: task.auftrag || '',
        zustand: task.zustand || '', ergebnis: task.ergebnis || '', pruefung: task.pruefung || '', quellenrevision: task.quellenrevision || '' };
      if (!candidates.has(key)) candidates.set(key, []);
      candidates.get(key).push(record);
    }
  }
  for (const id of ambiguousOperators) operators.delete(id);
  for (const [key, rows] of candidates) {
    const record = rows[0];
    if (!operators.has(record.operatorId) || rows.some(row => JSON.stringify(row) !== JSON.stringify(record))) {
      issue('assignment', rows, 'conflicting-assignment-identity'); continue;
    }
    assignments.set(key, record);
    const project = projects.get(record.projectId);
    const operator = operators.get(record.operatorId);
    if (!project.operatorIds.includes(record.operatorId)) project.operatorIds.push(record.operatorId);
    if (!operator.projectIds.includes(record.projectId)) operator.projectIds.push(record.projectId);
    operator.assignmentKeys.push(key);
    if (record.ergebnis) project.outputs.push(record);
    edges.set(key, { key, kind: 'assignment', from: nodeId('operator', record.operatorId), to: nodeId('project', record.projectId), source: record });
  }
  for (const project of projects.values()) {
    for (const ref of Array.isArray(project.source.verbindungen) ? project.source.verbindungen : []) {
      if (!['ist-teil-von', 'baut-auf'].includes(ref?.art) || !projects.has(ref.ziel) || ref.ziel === project.id) {
        issue('relation', { projectId: project.id, ref }, 'unbound-project-relation'); continue;
      }
      const from = ref.gespiegelt ? ref.ziel : project.id;
      const to = ref.gespiegelt ? project.id : ref.ziel;
      const key = recordKey(ref.art, from, to);
      if (edges.has(key)) continue;
      const record = { key, kind: ref.art, from: nodeId('project', from), to: nodeId('project', to), source: { projectId: project.id, art: ref.art, ref: { ...ref } } };
      edges.set(key, record);
      projects.get(from).relations.push(record);
      projects.get(to).relations.push(record);
    }
  }
  const selected = [...projects.values()].filter(project => visible(project.entry || project.source));
  const selectedIds = new Set(selected.map(project => project.id));
  const selectedAssignments = [...assignments.values()].filter(record => selectedIds.has(record.projectId));
  const selectedKeys = new Set(selectedAssignments.map(record => record.key));
  const selectedEdges = [...edges.values()].filter(edge => edge.kind === 'assignment' ? selectedKeys.has(edge.key)
    : selectedIds.has(decodeURIComponent(edge.from.slice(8))) && selectedIds.has(decodeURIComponent(edge.to.slice(8))));
  const selectedEdgeKeys = new Set(selectedEdges.map(edge => edge.key));
  return {
    projects: selected.map(project => ({ ...project, relations: project.relations.filter(edge => selectedEdgeKeys.has(edge.key)) })),
    operators: [...operators.values()].map(operator => ({ ...operator, projectIds: operator.projectIds.filter(id => selectedIds.has(id)), assignmentKeys: operator.assignmentKeys.filter(key => selectedKeys.has(key)) })),
    assignments: selectedAssignments, edges: selectedEdges, unresolved,
  };
}
