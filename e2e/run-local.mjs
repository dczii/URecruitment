import { spawn } from 'node:child_process';
import { startMock } from './mock-supabase.mjs';
const env = { ...process.env, SUPABASE_URL: 'http://127.0.0.1:54329', SUPABASE_SECRET_KEY: 'fictional-e2e-secret', SUPABASE_PUBLISHABLE_KEY: 'fictional-publishable-key', SENTRY_DSN: '', NEXT_PUBLIC_SENTRY_DSN: '' };
// Production rendering avoids developer-extension instrumentation in smoke tests.
// Webpack is Next's supported fallback for restricted Turbopack worker ports.
const build = spawn('npm', ['exec', '--', 'next', 'build', '--webpack'], { stdio: 'inherit', env });
const buildCode = await new Promise(resolve => build.on('exit', resolve));
if (buildCode !== 0) process.exit(buildCode ?? 1);
const mock = await startMock();
const child = spawn('npm', ['run', 'start', '--', '--hostname', '127.0.0.1', '--port', process.env.PLAYWRIGHT_LOCAL_PORT ?? '3000'], { stdio: 'inherit', env });
function stop() { child.kill('SIGTERM'); mock.close(); }
process.on('SIGTERM', stop); process.on('SIGINT', stop);
child.on('exit', code => { mock.close(); process.exit(code ?? 0); });
