export function isRevisionConflict(error) {
  return /REVISION_CONFLICT|Guide was deleted/.test(error?.message || '');
}
export function forkGuide(document, id = crypto.randomUUID()) {
  const copy = structuredClone(document);
  copy.id = id;
  copy.title += ' (local copy)';
  copy.revision = 0;
  copy.dirty = true;
  copy.updatedAt = new Date().toISOString();
  delete copy.sourceId;
  copy.batches = [];
  copy.captureBatches = [];
  for (const step of copy.steps) {
    for (const field of ['screenshot', 'audio', 'video']) {
      if (step[field + 'Path'] && !step[field]) throw Error('Download the guide media before making a copy.');
      delete step[field + 'Path'];
    }
  }
  return copy;
}
