import { readFile, writeFile } from 'node:fs/promises';
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const dir = 'docs/engineering/live-demo/evidence';
const screens = [
  ['specification', 'Specification drives the change', 'specs/049-live-technical-demo/spec.md'],
  ['implementation', 'Authoritative countdown shared by load and save', 'src/lib/placement-countdown.ts'],
  ['consistency', 'Same inputs · expected and actual outputs', `${dir}/verification.json`],
];
for (const [name, title, path] of screens) {
  let source = await readFile(path, 'utf8');
  let body;
  if (name === 'consistency') {
    const report = JSON.parse(source);
    body = `<p>Generated ${escape(report.generatedAt)} · Node ${escape(report.node)} · focused tests exit ${escape(report.exitCode)} · ${report.dirty ? 'working tree includes uncommitted changes' : 'clean checkout'}</p><table><thead><tr>${['Case / requirement', 'Start', 'UTC instant', 'Period', 'Load before', 'Save before', 'Expected', 'Actual', 'Classification'].map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${report.rows.map(r => `<tr>${[r.id, r.start, r.now, r.period, r.before, r.originalSave, r.expected, r.actual, r.result].map(c => `<td>${escape(c)}</td>`).join('')}</tr>`).join('')}</tbody></table><p>Every actual value must equal its explicitly specified expected value. “Approved difference” requires that exact match.</p><p>${escape(report.scope)}</p>`;
  } else {
    if (name === 'specification') {
      const requirements = source.slice(source.indexOf('## Requirements'), source.indexOf('## Success Criteria'));
      const clarification = source.slice(source.indexOf('## Clarifications'), source.indexOf('## Assumptions'));
      source = `${requirements}\n${clarification}`;
    }
    body = `<pre>${escape(source)}</pre>`;
  }
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>${escape(title)}</title><style>body{font-family:system-ui,sans-serif;margin:0;padding:40px;background:white;color:#171717}header{border-bottom:1px solid #ddd;padding-bottom:20px;margin-bottom:24px}h1{font-size:28px;margin:8px 0}p{color:#555;line-height:1.5}pre{font:16px/1.65 ui-monospace,monospace;white-space:pre-wrap;overflow-wrap:anywhere;border:1px solid #ddd;border-radius:12px;padding:24px;background:#fafafa}small{font-weight:600;letter-spacing:.08em}footer{color:#555;margin-top:24px}table{border-collapse:collapse;width:100%;font-size:14px;line-height:1.5}th,td{border:1px solid #ddd;padding:12px;text-align:left;overflow-wrap:anywhere}th{background:#f5f5f5}tbody tr:nth-child(even){background:#fafafa}</style><header><small>PREPARED ENGINEERING EVIDENCE</small><h1>${escape(title)}</h1><p>Actual repository file: ${escape(path)}. This viewer shows ${name === 'specification' ? 'the requirements and recorded clarification' : 'source/evidence'}; it is not an IDE or AI conversation.</p></header>${body}<footer>Fictional local demo · feature 049 · see the full source file and presenter script for live commands and limitations.</footer></html>`;
  await writeFile(`${dir}/${name}.html`, html);
}
console.log('Prepared source/evidence viewer pages from actual repository files.');
