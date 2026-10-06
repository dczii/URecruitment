const info = await fetch('http://127.0.0.1:54329/test/info').then(r => r.json());
if (info.provider !== 'urecruitment-fictional') throw new Error('Not the local fictional provider');
for (const path of ['/test/reset', '/test/placements']) {
  const response = await fetch(`http://127.0.0.1:54329${path}`, { method: 'POST' });
  if (!response.ok) throw new Error(`Local reset failed: ${response.status}`);
}
console.log('Local fictional records reset. Reload /placements. No remote service contacted.');
