// The sync engine: decides WHAT to upload and download. It knows nothing
// about Supabase or the network — it's handed a `local` store and a `remote`
// store, which is what makes it unit-testable (test/sync.test.js runs it
// against an in-memory fake "cloud").
//
// The model, in plain words:
//   - Your phone's localStorage stays the main copy. The app reads and writes
//     it instantly, online or offline.
//   - Every saved key carries a timestamp of its last change and a "dirty"
//     flag meaning "changed here, not uploaded yet".
//   - pull() runs before push(), and the cloud refuses an upload that's older
//     than what it already has, so an old edit can never overwrite a newer one.
//   - push(): upload dirty keys. A deleted key is uploaded as value=null (a
//     "tombstone") so other devices learn about the delete.
//   - pull(): download every row; for each key, the newer timestamp wins
//     ("last write wins").
//   - Keys starting with "device:" (theme on the picker screen, which profile
//     was open last) belong to one phone and are never synced.
//   - Some keys need a smarter merge than "newest wins". The profile list is
//     one: if phone A has profile "Me" and phone B has "Kid", newest-wins
//     would drop one of them. A `merge` function for that key combines both.
//
// Known limitation (fine for one person's data, worth knowing): timestamps
// come from each device's clock, and a whole tab's data (e.g. all gym logs)
// is one key. Editing the SAME tab on two devices while both are offline
// keeps only the newer edit.

// Data that existed before sync was turned on gets this timestamp: older
// than anything in the cloud (so the cloud wins a clash), but not zero (so
// it still beats "never seen" on a fresh device).
export const LEGACY_T = 1;

export function isSyncedKey(key) {
  return !key.startsWith('device:');
}

export function createSyncEngine({ local, remote, merge = {}, now = () => Date.now() }) {
  function meta() { return local.readMeta(); }

  return {
    // Call after every local write/delete.
    markChanged(key) {
      if (!isSyncedKey(key)) return;
      const m = meta();
      m[key] = { t: Math.max(now(), (m[key] && m[key].t + 1) || 0), dirty: true };
      local.writeMeta(m);
    },

    // First sign-in on a device: everything already on it that has never
    // been synced is queued for upload, with the LEGACY timestamp.
    adoptExistingData() {
      const all = local.readAll();
      const m = meta();
      for (const key of Object.keys(all)) {
        if (isSyncedKey(key) && !m[key]) m[key] = { t: LEGACY_T, dirty: true };
      }
      local.writeMeta(m);
    },

    pendingCount() {
      return Object.values(meta()).filter(x => x.dirty).length;
    },

    async push() {
      const m = meta();
      const all = local.readAll();
      const rows = Object.entries(m)
        .filter(([, x]) => x.dirty)
        .map(([key, x]) => ({ key, value: key in all ? all[key] : null, t: x.t }));
      if (!rows.length) return 0;
      await remote.push(rows);
      // Re-read: the user may have changed a key while the upload was in
      // flight. Only clear "dirty" if it's still the exact version we sent.
      const after = meta();
      for (const r of rows) if (after[r.key] && after[r.key].t === r.t) after[r.key].dirty = false;
      local.writeMeta(after);
      return rows.length;
    },

    // Returns the list of keys whose local value changed.
    async pull() {
      const rows = await remote.pull();
      const all = local.readAll();
      const m = meta();
      const changed = [];
      for (const row of rows) {
        if (!isSyncedKey(row.key)) continue;
        const mine = m[row.key];
        const mineT = mine ? mine.t : 0;
        if (row.t <= mineT) continue; // ours is as new or newer — keep it (push will upload it)

        if (mine && mine.dirty && merge[row.key] && row.value !== null && row.key in all) {
          // Both sides changed: combine, keep it dirty so the result uploads.
          const merged = merge[row.key](all[row.key], row.value);
          if (merged !== all[row.key]) changed.push(row.key);
          all[row.key] = merged;
          m[row.key] = { t: Math.max(now(), row.t + 1), dirty: true };
          continue;
        }
        if (row.value === null) {
          if (row.key in all) { delete all[row.key]; changed.push(row.key); }
        } else if (all[row.key] !== row.value) {
          all[row.key] = row.value;
          changed.push(row.key);
        }
        m[row.key] = { t: row.t, dirty: false };
      }
      local.writeAll(all);
      local.writeMeta(m);
      return changed;
    },

    async sync() {
      // Download FIRST, so we compare against the cloud's latest before
      // uploading anything — uploading first could push an old edit over a
      // newer one. (The server double-checks too: it only accepts a row if
      // it's newer than what it has. See supabase/schema.sql, push_kv.)
      const changed = await this.pull();
      const pushed = await this.push();
      return { pushed, changed };
    },
  };
}

// The profile list is a JSON array of { name, passHash, salt }. Merging two
// lists keeps every profile from both, matched by name. On a name clash the
// cloud's copy wins (its password hash matches the data that'll sync down).
export function mergeProfileLists(localValue, remoteValue) {
  let a = [], b = [];
  try { a = JSON.parse(localValue) || []; } catch {}
  try { b = JSON.parse(remoteValue) || []; } catch {}
  if (!Array.isArray(a)) a = [];
  if (!Array.isArray(b)) b = [];
  // Very old entries are plain strings (pre-password), newer ones objects.
  const nameOf = p => (typeof p === 'string' ? p : p && p.name);
  const byName = new Map();
  for (const p of a) if (nameOf(p)) byName.set(nameOf(p), p);
  for (const p of b) if (nameOf(p)) byName.set(nameOf(p), p);
  return JSON.stringify([...byName.values()]);
}
