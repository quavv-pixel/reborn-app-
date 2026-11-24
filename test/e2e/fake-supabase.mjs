/* A tiny stand-in for Supabase, for the sync UI test only. It answers the
   handful of HTTP requests the real @supabase/supabase-js library makes
   (sign up, sign in, read rows, call push_kv) and copies the server rules
   from supabase/schema.sql that matter: each user only sees their own rows,
   older uploads never overwrite newer ones, and push_kv refuses users who
   haven't paid when require_payment is on.

   It is NOT a security test of the real database — the real rules live in
   supabase/schema.sql and are enforced by Postgres. */
import http from 'node:http';
import { randomUUID } from 'node:crypto';

const b64url = o => Buffer.from(JSON.stringify(o)).toString('base64url');

export function startFakeSupabase(port) {
  const users = new Map();    // email -> { id, email, password }
  const tokens = new Map();   // access/refresh token -> user id
  const kv = new Map();       // `${userId}\n${key}` -> { key, value, updated_at_ms }
  const config = { requirePayment: false, paid: new Set(), requireConfirm: false };

  function session(user) {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const access = `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({
      sub: user.id, email: user.email, role: 'authenticated', aud: 'authenticated', exp,
    })}.fake-signature-${randomUUID()}`;
    const refresh = randomUUID();
    tokens.set(access, user.id);
    tokens.set(refresh, user.id);
    return {
      access_token: access, token_type: 'bearer', expires_in: 3600, expires_at: exp, refresh_token: refresh,
      user: publicUser(user),
    };
  }
  const publicUser = u => ({
    id: u.id, aud: 'authenticated', role: 'authenticated', email: u.email,
    app_metadata: { provider: 'email' }, user_metadata: {}, created_at: new Date().toISOString(),
  });
  const userFromReq = req => {
    const t = (req.headers.authorization || '').replace(/^Bearer /, '');
    const id = tokens.get(t);
    return id ? [...users.values()].find(u => u.id === id) : null;
  };

  const server = http.createServer(async (req, res) => {
    const cors = {
      'access-control-allow-origin': '*', 'access-control-allow-headers': '*',
      'access-control-allow-methods': '*', 'access-control-expose-headers': '*',
    };
    if (req.method === 'OPTIONS') { res.writeHead(204, cors).end(); return; }
    let raw = '';
    for await (const c of req) raw += c;
    const body = raw ? JSON.parse(raw) : {};
    const url = new URL(req.url, 'http://x');
    const send = (status, data) => {
      res.writeHead(status, { ...cors, 'content-type': 'application/json' });
      res.end(data === undefined ? '' : JSON.stringify(data));
    };
    const p = url.pathname;

    // ---- test controls ----
    if (p === '/__test__/config') {
      if ('requirePayment' in body) config.requirePayment = body.requirePayment;
      if (body.markPaid) config.paid.add(users.get(body.markPaid).id);
      if ('requireConfirm' in body) config.requireConfirm = body.requireConfirm;
      if (body.confirm) users.get(body.confirm).confirmed = true;
      return send(200, { ok: true });
    }
    if (p === '/__test__/rows') {
      const u = users.get(url.searchParams.get('email'));
      return send(200, [...kv.values()].filter(r => r.user_id === (u && u.id)));
    }

    // ---- auth (GoTrue) ----
    if (p === '/auth/v1/signup' && req.method === 'POST') {
      if (users.has(body.email)) return send(422, { code: 'user_already_exists', msg: 'User already registered' });
      const u = { id: randomUUID(), email: body.email, password: body.password, confirmed: !config.requireConfirm };
      users.set(u.email, u);
      // "Confirm email" on (Supabase's default): no session until the link is tapped.
      if (!u.confirmed) return send(200, publicUser(u));
      return send(200, session(u));
    }
    if (p === '/auth/v1/token' && req.method === 'POST') {
      if (url.searchParams.get('grant_type') === 'password') {
        const u = users.get(body.email);
        if (!u || u.password !== body.password) {
          return send(400, { code: 'invalid_credentials', error: 'invalid_grant', error_description: 'Invalid login credentials', msg: 'Invalid login credentials' });
        }
        if (!u.confirmed) return send(400, { code: 'email_not_confirmed', error: 'invalid_grant', error_description: 'Email not confirmed', msg: 'Email not confirmed' });
        return send(200, session(u));
      }
      if (url.searchParams.get('grant_type') === 'refresh_token') {
        const id = tokens.get(body.refresh_token);
        const u = [...users.values()].find(x => x.id === id);
        return u ? send(200, session(u)) : send(400, { code: 'refresh_token_not_found', msg: 'Invalid Refresh Token' });
      }
    }
    if (p === '/auth/v1/user' && req.method === 'GET') {
      const u = userFromReq(req);
      return u ? send(200, publicUser(u)) : send(401, { code: 'bad_jwt', msg: 'invalid JWT' });
    }
    if (p === '/auth/v1/logout') return send(204);

    // ---- database (PostgREST) ----
    const u = userFromReq(req);
    if (p === '/rest/v1/kv' && req.method === 'GET') {
      // RLS: "read own rows"
      return send(200, [...kv.values()].filter(r => u && r.user_id === u.id)
        .map(({ key, value, updated_at_ms }) => ({ key, value, updated_at_ms })));
    }
    if (p === '/rest/v1/rpc/push_kv' && req.method === 'POST') {
      if (!u) return send(401, { code: '28000', message: 'not signed in', hint: null, details: null });
      if (config.requirePayment && !config.paid.has(u.id)) {
        return send(400, { code: 'P0001', message: 'cloud sync needs an active subscription', hint: 'upgrade', details: null });
      }
      let n = 0;
      for (const r of body.rows) {
        const k = `${u.id}\n${r.key}`;
        const cur = kv.get(k);
        if (!cur || cur.updated_at_ms < r.t) { // "newer wins"
          kv.set(k, { user_id: u.id, key: r.key, value: r.value, updated_at_ms: r.t });
          n++;
        }
      }
      return send(200, n);
    }
    if (p === '/rest/v1/entitlements' && req.method === 'GET') {
      return send(200, u && config.paid.has(u.id) ? [{ active: true }] : []);
    }
    if (p === '/rest/v1/app_config' && req.method === 'GET') {
      return send(200, u ? [{ require_payment: config.requirePayment }] : []);
    }
    send(404, { message: `fake-supabase: no handler for ${req.method} ${p}` });
  });

  return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve({
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise(r => { server.closeAllConnections(); server.close(r); }),
  })));
}
