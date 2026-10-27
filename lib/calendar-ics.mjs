const clean=x=>String(x??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'');
export const icsText=x=>clean(x).replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
export function foldICS(line){
 const output=[];let current='',bytes=0;
 for(const char of line){const size=Buffer.byteLength(char);if(bytes+size>75){output.push(current);current=' ';bytes=1;}current+=char;bytes+=size;}output.push(current);return output.join('\r\n');
}
const valid=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T00:00:00Z'));
const stamp=d=>new Date(d).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
const day=d=>d.replaceAll('-','');
const after=d=>{const t=new Date(d+'T00:00:00Z');t.setUTCDate(t.getUTCDate()+1);return t.toISOString().slice(0,10);};
export function buildCalendarICS({sessions=[],races=[],now=new Date()}){
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//RideVector//Training Calendar//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:RideVector training','REFRESH-INTERVAL;VALUE=DURATION:PT1H','X-PUBLISHED-TTL:PT1H'];
 function event(id,title,start,end,description){
  if(!valid(start)||!valid(end)||end<start)return;
  lines.push('BEGIN:VEVENT','UID:'+icsText(id)+'@ridevector.app','DTSTAMP:'+stamp(now),'DTSTART;VALUE=DATE:'+day(start),'DTEND;VALUE=DATE:'+day(after(end)),'SUMMARY:'+icsText(title),'DESCRIPTION:'+icsText(description),'CLASS:PRIVATE','TRANSP:TRANSPARENT','END:VEVENT');
 }
 for(const s of sessions.filter(s=>!s.archived&&s.status!=='skipped'))event('session-'+s.id,(s.status==='completed'?'Completed · ':'')+s.title,s.session_date,s.session_date,[s.session_type==='rest'?'Rest / recovery day':'Training plan',s.duration_min?s.duration_min+' min target':'','Status: '+s.status,'Edit in RideVector.'].filter(Boolean).join('\n'));
 for(const r of races.filter(r=>!r.archived))event('race-'+r.id,r.name,r.race_date,r.race_end_date||r.race_date,'Race on your RideVector calendar. Edit in RideVector.');
 lines.push('END:VCALENDAR');return lines.map(foldICS).join('\r\n')+'\r\n';
}
