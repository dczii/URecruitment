import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { startMock } from '../../e2e/mock-supabase.mjs';

if (Number(process.versions.node.split('.')[0]) !== 22) throw new Error('Use Node 22 for this repository: run nvm use 22.');

// Deliberately no remote URL flags; these values override any local .env values.
const env = { ...process.env, SUPABASE_URL: 'http://127.0.0.1:54329', SUPABASE_SECRET_KEY: 'fictional-e2e-secret', SUPABASE_PUBLISHABLE_KEY: 'fictional-publishable-key', SENTRY_DSN: '', NEXT_PUBLIC_SENTRY_DSN: '', NEXT_TELEMETRY_DISABLED: '1' };
for (const port of [3100, 54329]) {
  await new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', error => reject(new Error(`Cannot bind local port ${port}: ${error.code}. Stop an existing demo or allow local listening.`)));
    probe.listen(port, '127.0.0.1', () => probe.close(resolve));
  });
}
const build = spawn('npm', ['exec', '--', 'next', 'build', '--webpack'], { stdio: 'inherit', env });
const built = await new Promise(resolve => build.on('exit', resolve));
if (built !== 0) process.exit(built ?? 1);
const mock = await startMock(54329, { placements: true, today: '2026-10-05' });
const child = spawn(process.execPath, ['--import', fileURLToPath(new URL('./clock.mjs', import.meta.url)), 'node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3100'], { stdio: 'inherit', env });
console.log('Fictional local demo: http://127.0.0.1:3100/placements · scenario 5 Oct 2026, 12:00 Singapore. Mock OTP: recruiter@example.test / 001234. No SQL/RLS verification.');
function stop() { child.kill('SIGTERM'); mock.close(); }
process.on('SIGTERM', stop); process.on('SIGINT', stop);
child.on('exit', code => { mock.close(); process.exit(code ?? 0); });
