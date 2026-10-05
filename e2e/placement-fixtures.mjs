// Local-only fictional REST fixtures. This is not a SQL/RLS implementation.
const DAY = 86_400_000;
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const dateOffset = (date, days) => new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);

export function createPlacementFixture(today) {
  let placements;
  let empty = false;
  const client = { id: id(900), name: 'Fictional Harbour Agency', guarantee_period_days: 30 };
  const job = { id: id(901), client_id: client.id, current_version_id: id(902), clients: client };
  const names = ['Avery Tan (fictional)', 'Blake Lim (fictional)', 'Casey Wong (fictional)', 'Devon Lee (fictional)', 'Emery Ng (fictional)', 'Frankie Teo (fictional)'];
  const entries = names.map((name, i) => ({ id: id(910 + i), candidate_id: id(920 + i), job_id: job.id, stage: 'Placed', entered_at: `${dateOffset(today, -90)}T04:00:00Z`, owner_name: 'Demo Recruiter', candidates: { full_name: name }, jobs: job }));
  function reset(makeEmpty = false) {
    empty = makeEmpty;
    // Ended, ending soon, end today, active, future, unconfirmed.
    placements = [-60, -26, -30, -10, 3].map((offset, i) => ({ id: id(930 + i), pipeline_entry_id: entries[i].id, start_date: dateOffset(today, offset), guarantee_period_days: 30, guarantee_end_date: dateOffset(today, offset + 30), recruiter_name: 'Demo Recruiter' }));
  }
  reset();
  function flags() {
    let landing = today;
    for (let count = 0; count < 5;) {
      landing = dateOffset(landing, 1);
      const day = new Date(`${landing}T00:00:00Z`).getUTCDay();
      if (day !== 0 && day !== 6) count++;
    }
    return placements.filter(p => p.guarantee_end_date <= landing).map(p => ({ ...p, placement_id: p.id, flag: p.guarantee_end_date < today ? 'ended' : 'ending-soon' }));
  }
  function read(table, params) {
    const tables = { pipeline_entries: entries, placements, placements_guarantee_flag: flags(), clients: [client], jobs: [job], job_versions: [{ id: id(902), fields: { title: 'Platform Engineer' } }] };
    if (!(table in tables)) return undefined;
    let rows = empty ? [] : tables[table];
    for (const [key, value] of params) {
      if (value.startsWith('eq.')) rows = rows.filter(row => String(row[key]) === value.slice(3));
      if (value.startsWith('in.(')) {
        const values = value.slice(4, -1).split(',').map(v => v.replaceAll('"', ''));
        rows = rows.filter(row => values.includes(String(row[key])));
      }
    }
    return structuredClone(rows);
  }
  function write(row, existingId) {
    const existing = placements.find(p => p.id === existingId || p.pipeline_entry_id === row.pipeline_entry_id);
    const saved = { ...row, id: existing?.id ?? id(930 + entries.findIndex(e => e.id === row.pipeline_entry_id)) };
    if (existing) placements = placements.map(p => p.id === existing.id ? saved : p);
    else placements.push(saved);
    return structuredClone(saved);
  }
  return { read, write, reset };
}
