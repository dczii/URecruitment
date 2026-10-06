import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const baseline = process.argv.includes('--baseline');
const base = 'http://127.0.0.1:3100';
const provider = 'http://127.0.0.1:54329';
const info = await fetch(`${provider}/test/info`).then(r => r.json());
if (info.provider !== 'urecruitment-fictional' || info.today !== '2026-10-05') throw new Error('Start the fixed-time local demo first.');
const output = 'docs/engineering/live-demo/screenshots';
await mkdir(output, { recursive: true });
const manifest = { capturedAt: new Date().toISOString(), scenarioInstant: '2026-10-05T04:00:00Z', backend: 'local fictional provider; no SQL/RLS proof', mode: baseline ? 'original application before fix' : 'corrected application', head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), sources: {}, captures: [] };
for (const path of ['src/server/placements/list.ts', 'src/server/placements/create.ts', 'src/components/features/placements/Placements.tsx']) manifest.sources[path] = createHash('sha256').update(await readFile(path)).digest('hex');
const browser = await chromium.launch();
try {
  for (const viewport of baseline ? [{ width: 1440, height: 900 }] : [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await fetch(`${provider}/test/reset`, { method: 'POST' });
    await fetch(`${provider}/test/placements`, { method: 'POST' });
    const context = await browser.newContext({ viewport, timezoneId: 'Asia/Singapore' });
    const page = await context.newPage();
    await page.clock.setFixedTime(new Date('2026-10-05T04:00:00Z'));
    const label = viewport.width === 1440 ? 'desktop' : 'phone';
    async function capture(name) {
      await page.evaluate(() => document.fonts.ready);
      const filename = `${name}-${label}.png`;
      if (name !== 'typed-name') await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: `${output}/${filename}`, fullPage: name !== 'typed-name', animations: 'disabled' });
      manifest.captures.push({ filename, viewport, url: page.url(), sha256: createHash('sha256').update(await readFile(`${output}/${filename}`)).digest('hex') });
    }
    await page.goto(`${base}/login`);
    await page.getByLabel('Work email').fill('recruiter@example.test');
    await page.getByRole('button', { name: 'Send login code' }).click();
    await page.getByLabel('Six-digit code').fill('001234');
    await page.getByRole('button', { name: 'Verify and sign in' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto(`${base}/placements`);
    const ended = page.getByRole('row').filter({ hasText: 'Avery Tan (fictional)' });
    await expect(ended).toContainText(baseline ? '60 of 30 days used' : '30 of 30 days used');
    await capture(baseline ? 'before' : 'after');
    if (!baseline) {
      const row = page.getByRole('row').filter({ hasText: 'Frankie Teo (fictional)' });
      await row.getByLabel('Start date for Frankie Teo (fictional)').fill('2026-09-25');
      await row.getByRole('button', { name: 'Confirm', exact: true }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('dialog')).toBeInViewport();
      await expect(page.getByRole('dialog')).toHaveCSS('opacity', '1');
      await expect(page.getByRole('dialog')).not.toHaveAttribute('data-starting-style');
      await capture('typed-name');
      await page.getByRole('dialog').getByLabel('Name', { exact: true }).fill('Demo Recruiter');
      await page.getByRole('dialog').getByRole('button', { name: 'Continue' }).click();
      await expect(row).toContainText('10 of 30 days used');
      await page.reload();
      await expect(row).toContainText('10 of 30 days used');
      await capture('saved-reloaded');
      await row.getByLabel('Start date for Frankie Teo (fictional)').fill('2026-01-01');
      await row.getByRole('button', { name: 'Update', exact: true }).click();
      await expect(row.getByRole('alert')).toContainText('before the date');
      await capture('validation');
      await fetch(`${provider}/test/placements`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ empty: true }) });
      await page.reload();
      await expect(page.getByText('No placements yet', { exact: false })).toBeVisible();
      await capture('empty');
    }
    await context.close();
  }
  if (!baseline) {
    execFileSync(process.execPath, ['scripts/demo/pages.mjs'], { stdio: 'inherit' });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    for (const name of ['specification', 'implementation', 'consistency']) {
      await page.goto(pathToFileURL(resolve(`docs/engineering/live-demo/evidence/${name}.html`)).href);
      await page.evaluate(() => document.fonts.ready);
      const filename = `${name}-desktop.png`;
      await page.screenshot({ path: `${output}/${filename}`, fullPage: true, animations: 'disabled' });
      manifest.captures.push({ filename, viewport: { width: 1440, height: 900 }, source: `evidence/${name}.html`, sha256: createHash('sha256').update(await readFile(`${output}/${filename}`)).digest('hex') });
    }
    await context.close();
  }
} finally { await browser.close(); }
await writeFile(`${output}/${baseline ? 'before' : 'after'}-manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
await fetch(`${provider}/test/placements`, { method: 'POST' });
console.log(`Captured ${manifest.captures.length} real browser screenshots in ${output}`);
