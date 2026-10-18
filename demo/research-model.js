import './mission-control/vault-links.js';
const tr = (de, en) => typeof window !== 'undefined' && window.UI_LANGUAGE ? window.UI_LANGUAGE.t(de, en) : de;

const normalize = value => String(value).toLocaleLowerCase('de').replaceAll('ä', 'ae').replaceAll('ö', 'oe').replaceAll('ü', 'ue').replaceAll('ß', 'ss').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const safeRelative = value => typeof value === 'string' && value.length > 0 && !/[\\:\x00]/.test(value) && value.split('/').every(part => part && !part.startsWith('.') && !/[. ]$/.test(part));
export { normalize };

/** Index an inspected snapshot. Source identities remain distinct across repositories. */
export function buildModel(data) {
  if (data?.schema !== 'second-brain-coverage-1' || !Array.isArray(data.vault?.documents) || !Array.isArray(data.repositories?.documents) || !Array.isArray(data.vault?.links)) throw new Error(tr('Der Quellenbestand hat ein unbekanntes Format.', "The source collection has an unknown format."));
  const nodes = new Map();
  for (const [origin, entries] of [['vault', data.vault.documents], ['repo', data.repositories.documents]]) {
    for (const entry of entries) {
      if (!entry || typeof entry.id !== 'string' || !safeRelative(entry.path) || typeof entry.title !== 'string' || !/^[a-f0-9]{64}$/.test(entry.revision) || nodes.has(entry.id) || !Array.isArray(entry.tags) || !Array.isArray(entry.aliases) || ![...entry.tags, ...entry.aliases].every(value => typeof value === 'string')) throw new Error(tr('Ein Quellenobjekt ist ungültig.', "A source object is invalid."));
      if (origin === 'vault' && entry.id !== entry.path) throw new Error(tr('Die Quellenidentität stimmt nicht mit ihrem Pfad überein.', "The source identity does not match its path."));
      if (origin === 'repo' && !entry.id.startsWith('repo:')) throw new Error(tr('Die Repository-Identität fehlt.', "The repository identity is missing."));
      const repository = origin === 'repo' ? String(entry.repository || entry.id.split('::')[0].slice(5)) : '';
      const mapping = data.repositories.mappings?.find(item => entry.mappingIds?.includes(item.id));
      const repositoryLabel = typeof mapping?.name === 'string' ? mapping.name.replaceAll('/', ' ∕ ') : repository;
      const route = origin === 'vault' ? (entry.path.includes('/') ? entry.path : 'Einstiege/' + entry.path) : 'Projektwissen/' + repositoryLabel + '/' + entry.path;
      nodes.set(entry.id, { ...entry, origin, repository, route, type: typeof entry.type === 'string' ? entry.type : '', search: normalize([entry.title, entry.path, repository, repositoryLabel, ...entry.tags, ...entry.aliases].join(' ')) });
    }
  }
  if (data.repositories.links !== undefined && !Array.isArray(data.repositories.links)) throw new Error(tr('Die Repository-Verweise sind ungültig.', "The repository references are invalid."));
  const links = [...data.vault.links, ...(data.repositories.links || [])];
  if (links.some(link => !link || !nodes.has(link.from) || !nodes.has(link.to) || typeof link.quote !== 'string' || !link.quote.trim() || !Number.isInteger(link.line) || link.line < 1)) throw new Error(tr('Ein Quellenverweis ist ungültig.', "A source reference is invalid."));
  if ((data.repositories.links || []).some(link => nodes.get(link.from)?.origin !== 'repo' || nodes.get(link.to)?.origin !== 'repo' || nodes.get(link.from)?.repository !== nodes.get(link.to)?.repository)) throw new Error(tr('Ein Repository-Verweis verlässt seinen geprüften Bestand.', "A repository reference leaves its inspected collection."));
  const adjacency = new Map([...nodes.keys()].map(id => [id, new Map()]));
  for (const edge of links) {
    for (const [id, other] of [[edge.from, edge.to], [edge.to, edge.from]]) {
      if (!adjacency.get(id).has(other)) adjacency.get(id).set(other, []);
      adjacency.get(id).get(other).push(edge);
    }
  }
  return { nodes, links, adjacency, data };
}

export function selectNodes(model, query = '', scope = '') {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  return [...model.nodes.values()].filter(node => (!scope || node.route.startsWith(scope)) && terms.every(term => node.search.includes(term))).sort((a, b) => a.title.localeCompare(b.title, 'de') || a.id.localeCompare(b.id));
}

/** Every filtered source belongs to exactly one child group or is a direct leaf. */
export function partition(nodes, scope = '') {
  const groups = new Map(), leaves = [];
  for (const node of nodes) {
    const rest = node.route.slice(scope.length), slash = rest.indexOf('/');
    if (slash < 0) { leaves.push(node); continue; }
    const label = rest.slice(0, slash), key = scope + label + '/';
    if (!groups.has(key)) groups.set(key, { key, label, nodes: [] });
    groups.get(key).nodes.push(node);
  }
  return { groups: [...groups.values()].sort((a, b) => a.label.localeCompare(b.label, 'de')), leaves };
}

export function neighborhood(model, ids) {
  const included = new Set(ids.filter(id => model.nodes.has(id)));
  const related = new Set();
  for (const id of included) for (const other of model.adjacency.get(id).keys()) if (!included.has(other)) related.add(other);
  return { selected: [...included].map(id => model.nodes.get(id)), related: [...related].map(id => model.nodes.get(id)).sort((a, b) => a.title.localeCompare(b.title, 'de')) };
}

/** Direction describes literal references, without inferring a semantic relationship. */
export function relationContext(model, id) {
  const source = model.nodes.get(id) || null;
  const result = { source, incoming: [], outgoing: [], self: [] };
  if (!source) return result;
  const incoming = new Map(), outgoing = new Map();
  for (const edge of model.links) {
    if (edge.from !== id && edge.to !== id) continue;
    if (edge.from === id && edge.to === id) { result.self.push(edge); continue; }
    const direction = edge.from === id ? outgoing : incoming;
    const neighbor = model.nodes.get(edge.from === id ? edge.to : edge.from);
    if (!direction.has(neighbor.id)) direction.set(neighbor.id, { node: neighbor, edges: [] });
    direction.get(neighbor.id).edges.push(edge);
  }
  const byTitle = (a, b) => a.node.title.localeCompare(b.node.title, 'de') || a.node.id.localeCompare(b.node.id);
  result.incoming = [...incoming.values()].sort(byTitle);
  result.outgoing = [...outgoing.values()].sort(byTitle);
  return result;
}

export function parseBoard(raw, model) {
  if (raw === null) return { items: [], missing: [] };
  const data = JSON.parse(raw);
  if (data?.schema !== 'second-brain-spatial-1' || !Array.isArray(data.items) || data.items.length > 200 || new Set(data.items.map(item => item?.id)).size !== data.items.length) throw new Error(tr('Die gespeicherte Anordnung ist ungültig. Sie wurde nicht verändert.', "The saved arrangement is invalid. It has not been changed."));
  for (const item of data.items) if (!item || typeof item.id !== 'string' || !Number.isFinite(item.x) || !Number.isFinite(item.y) || item.x < 0 || item.x > 1 || item.y < 0 || item.y > 1) throw new Error(tr('Die gespeicherte Position ist ungültig. Sie wurde nicht verändert.', "The saved position is invalid. It has not been changed."));
  return { items: data.items.filter(item => model.nodes.has(item.id)), missing: data.items.filter(item => !model.nodes.has(item.id)) };
}

export function sourceAddress(node) {
  if (node.origin === 'repo') return null;
  return globalThis.SECOND_BRAIN_VAULT.href(node.path);
}
