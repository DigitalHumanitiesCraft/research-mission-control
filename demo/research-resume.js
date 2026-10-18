const uiResearchResume = (de, en) => globalThis.window?.UI_LANGUAGE?.t(de, en) ?? de;
const schema = 'second-brain-resume-1';
const fields = new Set(['schema', 'sourceId', 'sourceRevision', 'note', 'hash', 'savedAt', 'sourceMissing']);
const revision = /^[a-f0-9]{64}$/;

/** A resume record binds the user's note to one inspected source, not a work history. */
function validateResume(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !fields.has(key))
      || value.schema !== schema || typeof value.sourceId !== 'string' || !value.sourceId.trim() || value.sourceId.length > 4096 || /[\u0000-\u001f\u007f]/.test(value.sourceId)
      || typeof value.sourceRevision !== 'string' || !revision.test(value.sourceRevision)
      || typeof value.note !== 'string' || value.note.length > 4000
      || typeof value.hash !== 'string' || value.hash.length > 8192 || (value.hash !== '' && !value.hash.startsWith('#')) || /[\u0000-\u001f\u007f]/.test(value.hash)
      || typeof value.savedAt !== 'string' || value.savedAt.length > 64 || !Number.isFinite(Date.parse(value.savedAt))
      || ('sourceMissing' in value && typeof value.sourceMissing !== 'boolean')) throw new Error(uiResearchResume('Der gespeicherte Denkstand ist ungültig. Er wurde nicht verändert.', "The saved thinking state is invalid. It was not changed."));
  return { schema, sourceId: value.sourceId, sourceRevision: value.sourceRevision, note: value.note, hash: value.hash, savedAt: value.savedAt };
}

export function createResume(model, id, { note = '', hash = '', savedAt } = {}) {
  const source = model.nodes.get(id);
  if (!source) throw new Error(uiResearchResume('Die ausgewählte Quelle fehlt im geladenen Bestand.', "The selected source is missing from the loaded collection."));
  return validateResume({ schema, sourceId: source.id, sourceRevision: source.revision, note, hash, savedAt });
}

export function parseResume(raw, model) {
  if (raw === null) return null;
  if (typeof raw !== 'string') throw new Error(uiResearchResume('Der gespeicherte Denkstand ist ungültig. Er wurde nicht verändert.', "The saved thinking state is invalid. It was not changed."));
  const saved = validateResume(JSON.parse(raw));
  return { ...saved, sourceMissing: !model.nodes.has(saved.sourceId) };
}

export function serializeResume(saved) {
  return JSON.stringify(validateResume(saved));
}

/** A changed revision establishes only a different source representation. */
export function compareResume(saved, model) {
  const record = validateResume(saved);
  const source = model.nodes.get(record.sourceId);
  if (source && (typeof source.revision !== 'string' || !revision.test(source.revision))) throw new Error(uiResearchResume('Die aktuelle Quellenrevision ist ungültig.', "The current source revision is invalid."));
  return { status: !source ? 'missing' : source.revision === record.sourceRevision ? 'unchanged' : 'changed',
    sourceId: record.sourceId, savedRevision: record.sourceRevision, currentRevision: source?.revision ?? null };
}
