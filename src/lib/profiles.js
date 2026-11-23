// Profile list storage + client-side password hashing.
import { loadKey, uid } from './utils.js';

// ---- profile switcher with a password gate ---------------------------------
// Not a real backend login — there's no server here to check a password
// against, so this hashes the password client-side (SHA-256 + a per-profile
// salt via Web Crypto) and compares hashes. That stops a casual person from
// reading someone else's data by picking their name, but anyone with access
// to the device's storage or dev tools could still get past it. Real
// Google/Apple sign-in needs an actual backend (see the README in the
// deployable zip) — flagged here as future work, not built yet.
export async function hashPassword(password, salt) {
  try {
    const enc = new TextEncoder();
    const data = enc.encode(salt + ':' + password);
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    return null;
  }
}
export function pKey(profile, key) {
  return `p:${profile}:${key}`;
}
export async function loadProfileList() {
  const list = await loadKey('profiles-list', []);
  // Migrate old plain-string profile entries (pre-password) to the new shape.
  return list.map(p => (typeof p === 'string' ? { name: p, passHash: null, salt: uid() } : p));
}
export async function saveProfileList(list) {
  try { await window.storage.set('profiles-list', JSON.stringify(list)); } catch (e) {}
}
