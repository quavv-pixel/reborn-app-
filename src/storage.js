// Drop-in replacement for the Claude-artifact `window.storage` API, backed by
// the phone/browser's own localStorage. Same method names and shapes as the
// original, so life-tracker.jsx runs unmodified outside of Claude.
//
// localStorage stays the main copy (instant, works offline). When cloud sync
// is configured, every write/delete is also reported to src/sync/cloud.js,
// which uploads it in the background. Nothing in the tabs had to change,
// since they only ever call window.storage.
import { noteLocalChange } from './sync/cloud.js';

const PREFIX = 'ops-log:';

function readAll() {
  try {
    const raw = localStorage.getItem(PREFIX + '__all__');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function writeAll(obj) {
  try {
    localStorage.setItem(PREFIX + '__all__', JSON.stringify(obj));
  } catch {
    // localStorage full or unavailable — fail silently, same as the
    // original artifact storage does on quota errors.
  }
}

window.storage = {
  async get(key) {
    const all = readAll();
    if (!(key in all)) return null;
    return { key, value: all[key] };
  },
  async set(key, value) {
    const all = readAll();
    all[key] = value;
    writeAll(all);
    noteLocalChange(key);
    return { key, value };
  },
  async delete(key) {
    const all = readAll();
    const existed = key in all;
    delete all[key];
    writeAll(all);
    if (existed) noteLocalChange(key);
    return { key, deleted: existed };
  },
  async list(prefix) {
    const all = readAll();
    const keys = Object.keys(all).filter(k => !prefix || k.startsWith(prefix));
    return { keys };
  },
};
