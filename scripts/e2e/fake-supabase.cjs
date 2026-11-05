// Faux Supabase local (comptes + base) pour tester l'application sans accès au vrai projet.
const http = require('http'); const crypto = require('crypto');
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const uuid = () => crypto.randomUUID();
const db = { profiles: [], deals: [], deal_members: [], deal_steps: [], deal_settings: [], questionnaire_responses: [], documents: [], audit_log: [], form_submissions: [] };
const files = new Map(); const users = new Map(); const hashes = new Map(); const events = [];
const STEPS = ['Accord', 'Teaser', 'Sélection', 'NDA', 'Nom', 'Preuve', 'MOU', 'Documents', 'Contrat'];

function mkUser(email, meta = {}) { const u = { id: uuid(), aud: 'authenticated', role: 'authenticated', email, email_confirmed_at: new Date().toISOString(), app_metadata: {}, user_metadata: meta, created_at: new Date().toISOString() }; users.set(u.id, u); return u; }
function session(u) {
  const now = Math.floor(Date.now() / 1000);
  const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: u.id, email: u.email, role: 'authenticated', aud: 'authenticated', exp: now + 3600, iat: now, session_id: uuid() })}.sig`;
  return { access_token: jwt, token_type: 'bearer', expires_in: 3600, expires_at: now + 3600, refresh_token: uuid(), user: u };
}
const admin = mkUser('admin@test.local', { prenom: 'Ahmed' });
db.profiles.push({ id: admin.id, prenom: 'Ahmed', nom: 'Admin', role: 'admin', created_at: new Date().toISOString() });
hashes.set('ADMINTOKENHASH1234567890', admin.id);

function filt(rows, params) {
  let r = rows;
  for (const [k, v] of params) {
    if (['select', 'order', 'limit', 'offset', 'columns'].includes(k)) continue;
    const m = /^eq\.(.*)$/.exec(v); if (m) r = r.filter((x) => String(x[k]) === m[1]);
  }
  const ord = params.get('order'); if (ord) { const [c, d] = ord.split('.'); r = [...r].sort((a, b) => (a[c] > b[c] ? 1 : -1) * (d === 'desc' ? -1 : 1)); }
  const lim = params.get('limit'); if (lim) r = r.slice(0, Number(lim));
  return r;
}
function createDeal(by) {
  const deal = { id: uuid(), reference: `KR-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`, created_by: by, created_at: new Date().toISOString() };
  db.deals.push(deal);
  STEPS.forEach((label, i) => db.deal_steps.push({ deal_id: deal.id, position: i + 1, label, status: i === 0 ? 'current' : 'upcoming', updated_at: new Date().toISOString() }));
  db.deal_settings.push({ deal_id: deal.id, droit_applicable: 'maurice_arbitrage', duree_protection_mois: 18, duree_confidentialite_ans: 3, repartition: { mandat: 40, investisseurs: 40, ahmed: 20 } });
  db.audit_log.push({ id: db.audit_log.length + 1, deal_id: deal.id, user_id: by, action: 'dossier_cree', details: {}, created_at: new Date().toISOString() });
  return deal;
}
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const chunks = []; req.on('data', (d) => chunks.push(d));
  req.on('end', () => {
    const raw = Buffer.concat(chunks); const isStorage = url.pathname.startsWith('/storage/');
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
    if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
    const send = (code, obj, headers = {}) => { res.writeHead(code, { 'content-type': 'application/json', ...cors, ...headers }); res.end(obj === undefined ? undefined : JSON.stringify(obj)); };
    let j = {}; if (!isStorage && raw.length) { try { j = JSON.parse(raw.toString()); } catch {} } const p = url.pathname;
    if (isStorage) {
      const q = p.replace('/storage/v1', ''); let mm;
      if ((mm = /^\/object\/upload\/sign\/dossiers\/(.+)$/.exec(q))) {
        if (req.method === 'POST') return send(200, { url: `/object/upload/sign/dossiers/${mm[1]}?token=tok${Date.now()}` });
        if (req.method === 'PUT') { files.set(decodeURIComponent(mm[1]), raw); return send(200, { Key: 'dossiers/' + mm[1] }); }
      }
      if ((mm = /^\/object\/dossiers\/(.+)$/.exec(q))) {
        const path = decodeURIComponent(mm[1]);
        if (req.method === 'POST') { files.set(path, raw); return send(200, { Key: 'dossiers/' + path }); }
        if (req.method === 'HEAD') { res.writeHead(files.has(path) ? 200 : 404, cors); return res.end(); }
      }
      if ((mm = /^\/object\/sign\/dossiers\/(.+)$/.exec(q))) {
        if (req.method === 'POST') return send(200, { signedURL: `/object/sign/dossiers/${mm[1]}?token=t` });
        const f = files.get(decodeURIComponent(mm[1])); if (!f) return send(404, { message: 'not found' });
        res.writeHead(200, { 'content-type': 'application/pdf', ...cors }); return res.end(f);
      }
      if (req.method === 'DELETE' && q === '/object/dossiers') { for (const x of (JSON.parse(raw.toString()).prefixes || [])) files.delete(x); return send(200, []); }
      return send(404, { message: 'storage non géré ' + req.method + ' ' + q });
    }
    events.push(`${req.method} ${p}`);
    if (p === '/__events') return send(200, events);
    if (p === '/__files') return send(200, [...files.keys()]);
    // ----- Auth
    if (p === '/auth/v1/user') {
      const t = (req.headers.authorization || '').replace('Bearer ', ''); try { const sub = JSON.parse(Buffer.from(t.split('.')[1], 'base64url')).sub; if (users.has(sub)) return send(200, users.get(sub)); } catch {}
      return send(401, { code: 401, msg: 'invalid JWT' });
    }
    if (p === '/auth/v1/verify' && req.method === 'POST') {
      const uid = hashes.get(j.token_hash); if (!uid) return send(403, { code: 403, error_code: 'otp_expired', msg: 'Token has expired or is invalid' });
      hashes.delete(j.token_hash); return send(200, session(users.get(uid)));
    }
    if (p === '/auth/v1/logout') return send(204);
    if (p === '/auth/v1/admin/users' && req.method === 'POST') {
      if ([...users.values()].some((u) => u.email === j.email)) return send(422, { code: 422, error_code: 'email_exists', msg: 'A user with this email address has already been registered' });
      return send(200, mkUser(j.email, j.user_metadata));
    }
    let m;
    if ((m = /^\/auth\/v1\/admin\/users\/([0-9a-f-]+)$/.exec(p))) {
      if (req.method === 'GET') return users.has(m[1]) ? send(200, users.get(m[1])) : send(404, { msg: 'not found' });
      if (req.method === 'DELETE') { users.delete(m[1]); return send(200, {}); }
    }
    if (p === '/auth/v1/admin/generate_link') {
      const u = [...users.values()].find((x) => x.email === j.email); if (!u) return send(404, { code: 404, msg: 'User not found' });
      const h = crypto.randomBytes(24).toString('hex'); hashes.set(h, u.id);
      return send(200, { action_link: 'x', email_otp: '12345678', hashed_token: h, redirect_to: '', verification_type: 'magiclink', ...u });
    }
    if (p === '/auth/v1/invite') return send(500, { code: 500, error_code: 'unexpected_failure', msg: 'Error sending invite email' });
    // ----- REST
    if ((m = /^\/rest\/v1\/rpc\/create_deal$/.exec(p))) return send(200, createDeal(j.p_created_by));
    if ((m = /^\/rest\/v1\/([a-z_]+)$/.exec(p)) && db[m[1]]) {
      const t = m[1];
      if (req.method === 'GET' || req.method === 'HEAD') { const rows = filt(db[t], url.searchParams); return send(200, req.method === 'HEAD' ? undefined : rows, { 'content-range': `0-${Math.max(rows.length - 1, 0)}/${rows.length}` }); }
      if (req.method === 'POST') {
        const rows = (Array.isArray(j) ? j : [j]).map((r) => ({ id: r.id ?? (t === 'audit_log' ? db[t].length + 1 : uuid()), created_at: new Date().toISOString(), ...r }));
        if (t === 'deal_members') for (const r of rows) if (db[t].some((x) => x.deal_id === r.deal_id && x.role === r.role)) return send(409, { code: '23505', message: 'duplicate key' });
        db[t].push(...rows); return send(201, (req.headers.prefer || '').includes('representation') ? rows : undefined);
      }
      if (req.method === 'DELETE') { const del = new Set(filt(db[t], url.searchParams)); db[t] = db[t].filter((x) => !del.has(x)); return send(204); }
      if (req.method === 'PATCH') { const rows = filt(db[t], url.searchParams); rows.forEach((r) => Object.assign(r, j)); return send(200, (req.headers.prefer || '').includes('representation') ? rows : undefined); }
    }
    send(404, { message: `non géré: ${req.method} ${p}` });
  });
}).listen(54399, '127.0.0.1');
