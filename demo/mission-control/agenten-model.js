// Assignment evidence stays separate from execution telemetry and human acceptance.
(function (root) {
  'use strict';
  const meaningful = (v) => typeof v === 'string' && v.trim() && !/^(none|nichts|keine|kein|n\/a)[.!]?$/i.test(v.trim()) ? v.trim() : '';
  function hasId(text, id) {
    if (!id) return false;
    let start = text.indexOf(id);
    while (start >= 0) {
      const before = text[start - 1] || ' ';
      const after = text[start + id.length] || ' ';
      if (!/[A-Za-z0-9_-]/.test(before) && !/[A-Za-z0-9_-]/.test(after)) return true;
      start = text.indexOf(id, start + id.length);
    }
    return false;
  }
  function assignments(data) {
    const grouped = new Map();
    for (const lane of data.lanes || []) {
      for (const [index, a] of (lane.auftraege || []).entries()) {
        if (!a.auftrag) continue;
        const key = a.kennung || lane.key + ':' + index;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push({ lane, a });
      }
    }
    return [...grouped.entries()].map(([id, copies]) => {
      const active = copies.filter(({ lane }) => String(lane.report?.State || lane.state).toUpperCase() !== 'RETIRED');
      const candidates = active.length ? active : copies;
      const chosen = candidates[0];
      const { lane, a } = chosen;
      const conflict = new Set(candidates.map((x) => x.a.zustand)).size > 1;
      const reports = copies.filter(({lane: owner, a: task}) => hasId([owner.report?.Result, owner.report?.Evidence].filter(Boolean).join(' '), task.kennung)).map(({lane: owner}) => ({
        source: owner.key, date: owner.stand?.date || '', historical: String(owner.report?.State || owner.state).toUpperCase() === 'RETIRED',
        result: meaningful(owner.report?.Result), verification: meaningful(owner.report?.Verification),
        open: [...new Set([owner.report?.['Operator point'], owner.report?.Blocker, owner.report?.['Next action']].map(meaningful).filter(Boolean))].join(' '),
        evidence: meaningful(owner.report?.Evidence)
      }));
      const result = meaningful(a.ergebnis);
      const verification = meaningful(a.pruefung);
      const open = meaningful(a.offen);
      return { id, title: a.auftrag, project: a.vorhaben || '', state: conflict ? 'widerspruechlich' : a.zustand || 'unbekannt',
        since: a.seit || '', owners: candidates.map((x) => x.lane.key), lane: lane.key,
        result, verification, open, evidence: meaningful(a.belege), reports, conflict, retired: !active.length,
        reportDate: lane.stand?.date || '', sourceCount: copies.length };
    }).sort((a, b) => (a.state === 'erledigt') - (b.state === 'erledigt') || b.since.localeCompare(a.since) || a.title.localeCompare(b.title, 'de'));
  }
  function telemetry(data) {
    const records = [...(data.runs || []), ...(data.single || [])];
    return { workflows: (data.runs || []).length,
      workflowEntries: (data.runs || []).reduce((n, r) => n + (r.agents || []).length, 0),
      singleEntries: (data.single || []).length,
      tokens: records.reduce((n, r) => n + (Number.isFinite(r.tokens) ? r.tokens : 0), 0),
      missingTokens: records.filter((r) => !Number.isFinite(r.tokens)).length };
  }
  function workGroups(rows, definitions) {
    const byId = new Map(rows.map((a) => [a.id, a]));
    const used = new Set();
    const groups = [];
    const seen = new Set();
    for (const definition of definitions || []) {
      const tasks = (definition.tasks || []).map((id) => byId.get(id)).filter((a) => a && !used.has(a.id));
      if (definition.id && seen.has(definition.id)) continue;
      if (!tasks.length && !definition.result?.evidence) continue;
      if (definition.id) seen.add(definition.id);
      tasks.forEach((a) => used.add(a.id));
      groups.push({ ...definition, assignments: tasks, stages: (definition.stages || []).map((stage) => {
        const matches = tasks.filter((a) => stage.ids.includes(a.id));
        return { label: stage.label, state: matches.length === stage.ids.length ? (matches.some((a) => a.conflict) ? 'conflict' : matches.every((a) => a.state === 'erledigt') ? 'recorded' : 'open') : 'unknown' };
      }) });
    }
    return { groups, other: rows.filter((a) => !used.has(a.id)) };
  }
  const api = { assignments, telemetry, hasId, workGroups };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AGENTEN_MODEL = api;
})(typeof window !== 'undefined' ? window : globalThis);
