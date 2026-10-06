import { mkdtemp, readFile, writeFile, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

// An isolated coding exercise; never reverts or edits the working application.
const lab = await mkdtemp(join(tmpdir(), 'urecruitment-countdown-'));
const root = process.cwd();
await symlink(resolve('node_modules'), join(lab, 'node_modules'), 'dir');
const original = await readFile('scripts/demo/baseline.ts', 'utf8');
const initial = `${original}\nexport function placementDaysUsed(start: string, _period: number, now: Date = new Date()): number {\n  return originalLoad(start, now.toISOString());\n}\n`;
await writeFile(join(lab, 'placement-countdown.ts'), initial);
await writeFile(join(lab, 'baseline.ts'), initial);
await writeFile(join(lab, 'cases.ts'), await readFile('scripts/demo/cases.ts'));
await writeFile(join(lab, 'spec.md'), await readFile('specs/049-live-technical-demo/spec.md'));
await writeFile(join(lab, 'countdown.test.ts'), `import { describe, expect, it } from 'vitest';\nimport { cases } from './cases';\nimport { placementDaysUsed } from './placement-countdown';\ndescribe('049 spec-derived rehearsal', () => {\n  for (const c of cases) it(c.id, () => expect(placementDaysUsed(c.start, c.period, new Date(c.now))).toBe(c.expected));\n});\n`);
await writeFile(join(lab, 'vitest.config.mts'), `import { defineConfig } from 'vitest/config';\nexport default defineConfig({ root: ${JSON.stringify(lab)}, test: { environment: 'node', include: ['countdown.test.ts'] } });\n`);
await writeFile(join(lab, 'README.md'), `# Isolated live coding rehearsal\n\nThis exercise replays the historical initial-load formula from HEAD 3c39f2e against feature 049's actual expected cases. It is not a reverted production checkout. The real app is already corrected.\n\nEdit only placement-countdown.ts using spec.md. Run:\n\nnpm exec -- vitest run --config ${join(lab, 'vitest.config.mts')}\n\nInspect:\n\ndiff -u ${join(lab, 'baseline.ts')} ${join(lab, 'placement-countdown.ts')}\n\nThen show the integrated real app in ${root} and its load/save/reload evidence.\n`);
console.log(`Rehearsal directory: ${lab}\nExpected red test command:\nnpm exec -- vitest run --config ${join(lab, 'vitest.config.mts')}\nEdit ${join(lab, 'placement-countdown.ts')} with Copilot using ${join(lab, 'spec.md')}.\nThis is an isolated exercise; the application remains corrected.`);
