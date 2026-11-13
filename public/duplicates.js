// Keep original source records: disconnects and activity updates remain reversible.
// Only confidently matched non-manual recordings share a dashboard entry.
export function sameRecording(a,b){
  if(a.user_id&&b.user_id&&a.user_id!==b.user_id)return false;
  if(a.source===b.source&&a.source_id&&a.source_id===b.source_id)return true;
  if(a.source==='manual'||b.source==='manual')return false;
  const startA=Date.parse(a.started_at),startB=Date.parse(b.started_at);
  if(!Number.isFinite(startA)||!Number.isFinite(startB)||Math.abs(startA-startB)>30000)return false;
  const ta=Number(a.duration_s),tb=Number(b.duration_s);
  if(a.distance_m==null||b.distance_m==null){
    // Time-only matches use explicit indoor metadata and much tighter bounds.
    // Same-provider IDs and short/repeated sessions remain separate.
    return a.indoor===true&&b.indoor===true&&a.source!==b.source&&
      Math.min(ta,tb)>=300&&Number.isFinite(ta)&&Number.isFinite(tb)&&
      Math.abs(startA-startB)<=5000&&Math.abs(ta-tb)<=Math.max(5,Math.max(ta,tb)*.01);
  }
  if(a.indoor!==undefined&&b.indoor!==undefined&&a.indoor!==b.indoor)return false;
  const da=Number(a.distance_m),db=Number(b.distance_m);
  if(![da,db,ta,tb].every(Number.isFinite)||Math.min(ta,tb)<60||Math.min(da,db)<100)return false;
  return Math.abs(da-db)<=Math.max(100,Math.max(da,db)*.02)&&Math.abs(ta-tb)<=Math.max(30,Math.max(ta,tb)*.05);
}
const priority={fit:0,tcx:1,gpx:2,apple_health:3,garmin:4,wahoo:5,strava:6,csv:7,manual:8};
export function uniqueRecordings(input){
  const sorted=[...input].sort((a,b)=>Date.parse(a.started_at)-Date.parse(b.started_at)||String(a.id||a.source_id).localeCompare(String(b.id||b.source_id)));
  const groups=[],active=[];
  for(const ride of sorted){
    // Match the original anchor, never a transitive chain of near-matches.
    const time=Date.parse(ride.started_at);
    while(active.length&&time-Date.parse(active[0].anchor.started_at)>30000)active.shift();
    const matches=active.filter(g=>sameRecording(g.anchor,ride)&&g.members.every(member=>sameRecording(member,ride)));
    const group=matches.length===1?matches[0]:null;
    if(group)group.members.push(ride);else {const next={anchor:ride,members:[ride]};groups.push(next);active.push(next);}
  }
  return groups.map(g=>{
    const members=[...g.members].sort((a,b)=>(priority[a.source]??99)-(priority[b.source]??99)||String(a.id||a.source_id).localeCompare(String(b.id||b.source_id)));
    const distance=members.find(r=>r.distance_m!=null)?.distance_m??null;
    return {...members[0],distance_m:distance,_copies:members};
  }).sort((a,b)=>Date.parse(b.started_at)-Date.parse(a.started_at));
}
