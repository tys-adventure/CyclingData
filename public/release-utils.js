export const changeLabels={new:'New feature',improved:'Improvement',fixed:'Fix'};
// Keep publication records and their links intact; display one card per calendar day.
export function groupReleases(releases){
 const days=new Map();
 for(const release of releases){
  if(!days.has(release.date))days.set(release.date,{...release,id:'day-'+release.date,aliases:[],sections:[],changes:[],visuals:[],area:'',title:release.daily?.title||release.title,summary:release.daily?.summary||release.summary});
  const day=days.get(release.date);day.aliases.push(release.id);day.sections.push(release);day.changes.push(...release.changes);
  if(!day.visuals.includes(release.visual))day.visuals.push(release.visual);
  day.area=[...new Set(day.sections.map(s=>s.area))].join(' · ');
 }
 return [...days.values()];
}
export function filterReleases(releases,query='',type='all'){
 const terms=query.trim().toLowerCase().split(/\s+/).filter(Boolean);
 return releases.filter(release=>{
  const displayDate=new Intl.DateTimeFormat('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(release.date+'T12:00:00Z'));
  const text=[release.title,release.summary,release.area,release.date,displayDate,...(release.sections||[]).flatMap(s=>[s.title,s.summary,s.area]),...release.changes.flatMap(c=>[c.title,c.text,changeLabels[c.type]])].join(' ').toLowerCase();
  return (type==='all'||release.changes.some(c=>c.type===type))&&terms.every(term=>text.includes(term));
 });
}
