// Dirty local drafts win until the user resolves a server revision conflict.
export function reconcileGuides(local, remote) {
  const byId = new Map(remote.map(guide => [guide.id, guide]));
  for (const guide of local) {
    const current=byId.get(guide.id);
    if(current)for(const key of ['ownerId','deletingAt'])if(key in current)guide[key]=current[key];
    if (guide.dirty || !guide.revision) byId.set(guide.id, guide);
    else if (byId.get(guide.id)?.revision === guide.revision) byId.set(guide.id, guide);
  }
  return [...byId.values()];
}
