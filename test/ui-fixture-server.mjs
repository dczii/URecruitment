/** Local, read-only fictional REST fixture. Never forwards requests or mutates data. */
import http from 'node:http';
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const owner = 'Fictional Recruiter';
const entries = [1,2].map(n => ({id:id(n), job_id:id(10), candidate_id:id(20+n), stage:'Screening', owner_name:owner, candidates:{full_name:n===1?'Fictional Candidate':'虚构候选人'}, jobs:{client_id:id(30),current_version_id:id(40),clients:{name:'Fictional Client'}}}));
const versions = [{id:id(40), fields:{title:'Fictional Engineer',must_have:[],nice_to_have:[]},created_at:'2026-10-01T00:00:00Z'}];
const server = http.createServer(async (req,res) => {
  const url = new URL(req.url,'http://127.0.0.1');
  res.setHeader('Content-Type','application/json');
  let data=[];
  if(req.method !== 'GET' && url.pathname !== '/rest/v1/rpc/search_candidates') {res.writeHead(403);res.end(JSON.stringify({message:'Read-only UI fixture: mutation refused'}));return;}
  const table=url.pathname.split('/').at(-1);
  if(table==='pipeline_status') data=entries.map((e,i)=>({pipeline_entry_id:e.id,candidate_id:e.candidate_id,job_id:e.job_id,stage:e.stage,working_days_used:6,limit_days:3,status:'overdue',days_over:3-i,waiting_on:'Recruiter'}));
  if(table==='pipeline_entries') data=url.searchParams.get('stage')==='eq.Placed'?[{...entries[0],id:id(3),stage:'Placed'}]:entries;
  if(table==='job_versions') data=versions;
  if(table==='jobs') data=[{id:id(10),status:'open',owner_name:owner,current_version_id:id(40),clients:{name:'Fictional Client'},created_at:'2026-10-01T00:00:00Z'}];
  if(table==='clients') data=[{id:id(30),name:'Fictional Client'}];
  if(table==='search_candidates') data=[{candidate_id:id(21),full_name:'Fictional Candidate',headline:'Fictional Engineer',total_years:4,location:'Singapore',languages:[],cv_updated_at:'2026-10-01T00:00:00Z',keyword_score:1,highlight:null}];
  if(req.headers.accept?.includes('application/vnd.pgrst.object+json')) data=data[0]??null;
  res.end(JSON.stringify(data));
});
server.listen(54329,'127.0.0.1',()=>console.log('Read-only fictional UI fixture listening on localhost:54329'));
