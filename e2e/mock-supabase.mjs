import { createServer } from 'node:http';
import { createHmac } from 'node:crypto';
import { createPlacementFixture } from './placement-fixtures.mjs';
export const USER_ID = '00000000-0000-4000-8000-000000000047';
export const EMAIL = 'recruiter@example.test';
const revoked = new Set();
const tokens = new Map();
const rates = new Map();
let pendingCode = null;
function jwt(user, seconds = 3600) {
  const head = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ sub: user.id, aud: 'authenticated', role: 'authenticated', email: user.email, iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000)+seconds })).toString('base64url');
  return `${head}.${body}.${createHmac('sha256','fictional-jwt-key').update(`${head}.${body}`).digest('base64url')}`;
}
export function startMock(port = 54329, options = {}) {
  let placementFixture = options.placements ? createPlacementFixture(options.today) : null;
  let failNextPlacementWrite = false;
  return new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      const url = new URL(req.url, `http://127.0.0.1:${port}`);
      let body = ''; for await (const chunk of req) body += chunk;
      let input = {}; try { input = JSON.parse(body || '{}'); } catch { /* no JSON */ }
      const reply = (value, status = 200) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(value)); };
      // Browsers cannot use a cross-origin form/fetch to mutate test controls.
      if (url.pathname.startsWith('/test/') && req.headers.origin) return reply({ message: 'Test controls require a local script' }, 403);
      if (url.pathname === '/test/info') return reply({ provider: 'urecruitment-fictional', today: options.today ?? null });
      if (url.pathname === '/test/placements') {
        if (req.method !== 'POST') return reply({ message: 'POST required' }, 405);
        const today = options.today ?? new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
        placementFixture = createPlacementFixture(today);
        placementFixture.reset(input.empty === true);
        failNextPlacementWrite = false;
        return reply({ today, fictional: true });
      }
      if (url.pathname === '/test/placement-failure') { failNextPlacementWrite = true; return reply({}); }
      if (placementFixture && url.pathname.startsWith('/rest/v1/')) {
        const table = url.pathname.slice('/rest/v1/'.length);
        if (table === 'placements' && ['POST', 'PATCH'].includes(req.method)) {
          if (failNextPlacementWrite) { failNextPlacementWrite = false; return reply({ message: 'Fictional save failure' }, 500); }
          const row = placementFixture.write(input, url.searchParams.get('id')?.slice(3));
          return reply(req.headers.accept?.includes('vnd.pgrst.object') ? row : [row]);
        }
        const rows = placementFixture.read(table, url.searchParams);
        if (rows !== undefined) return reply(req.headers.accept?.includes('vnd.pgrst.object') ? (rows[0] ?? null) : rows);
      }
      const user = { id: USER_ID, email: EMAIL, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-10-02T00:00:00Z' };
      if (url.pathname === '/auth/v1/otp') {
        if (input.create_user !== false) return reply({ msg: 'Public signup must be disabled' }, 400);
        if (input.email === EMAIL) pendingCode = { expires: Date.now() + 600000 };
        return reply({});
      }
      if (url.pathname === '/test/session' || url.pathname === '/auth/v1/verify') {
        if (url.pathname !== '/test/session' && (!pendingCode || pendingCode.expires <= Date.now() || input.email !== EMAIL || input.token !== '001234')) return reply({ code: 'otp_expired', msg: 'Invalid OTP' }, 403);
        if (url.pathname === '/auth/v1/verify') pendingCode = null;
        const token = jwt(user); const refresh = `refresh-${Date.now()}-${Math.random()}`; tokens.set(token, user); tokens.set(refresh, user);
        return reply({ access_token: token, refresh_token: refresh, expires_in: 3600, token_type: 'bearer', user });
      }
      if (url.pathname === '/auth/v1/user') {
        const token = req.headers.authorization?.replace('Bearer ', '');
        return tokens.has(token) ? reply(tokens.get(token)) : reply({ msg: 'Invalid token' }, 401);
      }
      if (url.pathname === '/auth/v1/token') {
        if (!tokens.has(input.refresh_token)) return reply({ msg: 'Invalid refresh' }, 401);
        const token = jwt(user); tokens.set(token, user);
        return reply({ access_token: token, refresh_token: input.refresh_token, expires_in: 3600, token_type: 'bearer', user });
      }
      if (url.pathname === '/auth/v1/logout') return reply({});
      if (url.pathname === '/rest/v1/recruiter_access') {
        const email = url.searchParams.get('email'); const id = url.searchParams.get('user_id');
        const approved = (!email || email === `eq.${EMAIL}`) && (!id || id === `eq.${USER_ID}`) && !revoked.has(USER_ID);
        return reply(approved ? { user_id: USER_ID } : null);
      }
      if (url.pathname === '/rest/v1/rpc/consume_auth_limit') {
        const old = rates.get(input.bucket_key); const now = Date.now();
        const state = !old || now-old.start >= input.window_seconds*1000 ? { start: now, count: 0 } : old;
        state.count++; rates.set(input.bucket_key,state); return reply(state.count <= input.max_attempts);
      }
      // Test-provider controls are local-only and absent from application routes.
      if (url.pathname === '/test/reset') { rates.clear(); revoked.clear(); pendingCode = null; placementFixture = options.placements ? createPlacementFixture(options.today) : null; failNextPlacementWrite = false; return reply({}); }
      if (url.pathname === '/test/expire') { if (pendingCode) pendingCode.expires = 0; return reply({}); }
      if (url.pathname === '/test/revoke') { revoked.add(USER_ID); return reply({}); }
      if (url.pathname === '/rest/v1/pipeline_status') return reply([
        { pipeline_entry_id: '00000000-0000-4000-8000-000000000101', candidate_id: '00000000-0000-4000-8000-000000000201', job_id: '00000000-0000-4000-8000-000000000301', stage: 'Screening', working_days_used: 8, limit_days: 5, status: 'overdue', days_over: 3, waiting_on: 'Recruiter' },
        { pipeline_entry_id: '00000000-0000-4000-8000-000000000102', candidate_id: '00000000-0000-4000-8000-000000000202', job_id: '00000000-0000-4000-8000-000000000301', stage: 'Sourced', working_days_used: 5, limit_days: 5, status: 'due-soon', days_over: 0, waiting_on: 'Recruiter' }
      ]);
      if (url.pathname === '/rest/v1/pipeline_entries') return reply([
        { id: '00000000-0000-4000-8000-000000000101', job_id: '00000000-0000-4000-8000-000000000301', owner_name: 'Fictional Recruiter', candidates: { full_name: 'Fictional Candidate One' }, jobs: { current_version_id: '00000000-0000-4000-8000-000000000401', clients: { name: 'Fictional Agency' } } },
        { id: '00000000-0000-4000-8000-000000000102', job_id: '00000000-0000-4000-8000-000000000301', owner_name: 'Fictional Recruiter', candidates: { full_name: 'Fictional Candidate Two' }, jobs: { current_version_id: '00000000-0000-4000-8000-000000000401', clients: { name: 'Fictional Agency' } } }
      ]);
      if (url.pathname === '/rest/v1/job_versions') return reply([{ id: '00000000-0000-4000-8000-000000000401', fields: { title: 'Fictional Engineering Role' } }]);
      if (url.pathname === '/rest/v1/jobs' && !req.headers.accept?.includes('vnd.pgrst.object')) return reply([{ id: '00000000-0000-4000-8000-000000000301', current_version_id: '00000000-0000-4000-8000-000000000401', status: 'open', owner_name: 'Fictional Recruiter', created_at: '2026-10-02T00:00:00Z', clients: { name: 'Fictional Agency' } }]);
      if (url.pathname.startsWith('/rest/v1/')) {
        if (req.headers.accept?.includes('vnd.pgrst.object')) return reply({ message: 'No fictional row at this id' }, 406);
        return reply([]);
      }
      return reply({ message: 'Unhandled mock request' }, 404);
    });
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}
