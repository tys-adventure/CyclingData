export const changeLabels={new:'New feature',improved:'Improvement',fixed:'Fix'};
export function filterReleases(releases,query='',type='all'){
 const terms=query.trim().toLowerCase().split(/\s+/).filter(Boolean);
 return releases.filter(release=>{
  const displayDate=new Intl.DateTimeFormat('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(release.date+'T12:00:00Z'));
  const text=[release.title,release.summary,release.area,release.date,displayDate,...release.changes.flatMap(c=>[c.title,c.text,changeLabels[c.type]])].join(' ').toLowerCase();
  return (type==='all'||release.changes.some(c=>c.type===type))&&terms.every(term=>text.includes(term));
 });
}
