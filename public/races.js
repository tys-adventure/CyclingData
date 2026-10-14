import {miles, feet} from './units.js';
export const RACE_TYPES = {road:'Road race', gravel:'Gravel', mtb:'Mountain bike', tt:'Time trial', crit:'Criterium', sportive:'Sportive / endurance'};
export const RACE_GOALS = {finish:'Finish confidently', personal_best:'Beat my personal best', compete:'Race competitively'};
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const format = value => Number(value).toLocaleString(undefined, {maximumFractionDigits:1});
export const raceDate = value => new Date(`${value}T00:00:00`);
export function daysUntil(value, now = new Date()) {
  const date = raceDate(value);
  return Math.round((Date.UTC(date.getFullYear(),date.getMonth(),date.getDate()) - Date.UTC(now.getFullYear(),now.getMonth(),now.getDate())) / 86400000);
}
export function validateRace(input) {
  const name = String(input.name || '').trim(), date = String(input.race_date || '');
  const parsed = raceDate(date);
  if (!name || name.length > 160) throw Error('Enter a race name of up to 160 characters.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) || parsed.getFullYear() < 2000 || parsed.getFullYear() > 2100 || `${parsed.getFullYear()}-${String(parsed.getMonth()+1).padStart(2,'0')}-${String(parsed.getDate()).padStart(2,'0')}` !== date) throw Error('Choose a valid race date between 2000 and 2100.');
  if (!RACE_TYPES[input.race_type] || !RACE_GOALS[input.goal]) throw Error('Choose a race type and goal.');
  const distance = input.distance_m == null ? null : Number(input.distance_m), elevation = input.elevation_m == null ? null : Number(input.elevation_m);
  if (distance !== null && (!Number.isFinite(distance) || distance <= 0 || distance > 10000000)) throw Error('Enter a positive race distance.');
  if (elevation !== null && (!Number.isFinite(elevation) || elevation < 0 || elevation > 100000)) throw Error('Enter a valid elevation gain.');
  const notes = String(input.notes || '').trim();
  if (notes.length > 1000) throw Error('Keep your notes under 1,000 characters.');
  return {name,race_date:date,race_type:input.race_type,goal:input.goal,distance_m:distance,elevation_m:elevation,notes};
}

// Transparent, local rules tailor advice; free-text names/notes never become instructions.
export function raceTips(race, rides, now = new Date()) {
  const days = daysUntil(race.race_date,now), tips = [];
  if (days < 0) return ['This event has passed. Review what worked, note what you would change, and archive it when ready.'];
  if (days <= 7) tips.push('Race week: prioritize recovery and familiar short rides. Avoid trying to make up missed training or testing new equipment.');
  else if (days <= 28) tips.push('Final preparation: rehearse the course demands, pacing, clothing, and food on familiar rides. Leave room for recovery as race day approaches.');
  else tips.push('Build toward the event with consistent riding and planned recovery. Practice the demands of this course without suddenly increasing your usual workload.');
  const byType = {
    road:'Road race: practice group riding, cornering, and predictable positioning with an experienced group. Review the course and conserve effort where it is safe to do so.',
    gravel:'Gravel: practice handling and braking on similar surfaces. Test tires, pressure, and repair supplies on training rides; check where resupply is available.',
    mtb:'Mountain bike: prioritize technical skills, line choice, and controlled descending on similar terrain. Check the bike and study the course before the start.',
    tt:'Time trial: rehearse a sustainable effort and a comfortable, tested riding position. Study turns and pacing changes; avoid an opening effort you cannot sustain.',
    crit:'Criterium: practice pack riding, cornering, and repeated accelerations in a supervised setting. Learn the circuit, arrive for a warm-up, and hold predictable lines.',
    sportive:'Endurance event: start at a sustainable pace, plan stops and resupply, and practice eating and drinking during longer rides.'
  };
  tips.push(byType[race.race_type]);
  const today = new Date(now); today.setHours(0,0,0,0);
  const end = new Date(today);end.setDate(end.getDate()+1);
  const start = new Date(today);start.setDate(start.getDate()-29);
  const recent = rides.filter(r => new Date(r.started_at) >= start && new Date(r.started_at) < end);
  const longest = Math.max(0,...recent.map(r => Number(r.distance_m)||0));
  if (!recent.length) tips.push('No rides are recorded in the last 30 days. Import recent rides for a clearer preparation picture; the dashboard cannot infer your current readiness.');
  else if (race.distance_m && longest < Number(race.distance_m)) tips.push(`Your longest recorded ride in the last 30 days is ${format(miles(longest))} mi versus this ${format(miles(race.distance_m))} mi event. Use that gap to plan endurance practice and resupply; do not try to close it in one ride.`);
  else if (race.distance_m) tips.push(`You have recorded a ${format(miles(longest))} mi ride in the last 30 days. Now rehearse this event's terrain and pacing; matching distance alone does not establish race readiness.`);
  if (Number(race.elevation_m) > 0) tips.push(`The course includes ${format(feet(race.elevation_m))} ft of climbing. Check the gradients and gearing, and practice pacing on comparable hills.`);
  if (race.goal === 'personal_best') tips.push('Personal-best goal: compare similar courses and conditions, then choose a pacing plan you have rehearsed. Set a fallback goal for weather or mechanical delays.');
  if (race.goal === 'compete') tips.push('Competitive goal: study the course and likely decisive sections. Practice race-specific skills with a club or coach and choose a category suited to your experience.');
  if (race.goal === 'finish') tips.push('Finish goal: prioritize a controlled start, steady pacing, reliable equipment, and an eating-and-drinking plan you have already practiced.');
  tips.push('Race-day checklist: verify registration, license requirements, organizer rules, start time, route, weather, helmet, bike condition, and repair kit.');
  return tips;
}

export function renderRaces(target, races, rides, {history=false,now=new Date()}={}) {
  const visible = races.filter(r => history ? r.archived || daysUntil(r.race_date,now)<0 : !r.archived && daysUntil(r.race_date,now)>=0).sort((a,b)=>a.race_date.localeCompare(b.race_date)||a.id.localeCompare(b.id));
  if (!visible.length) {
    target.innerHTML = `<div class="empty-state"><h3>${history?'No past or archived races.':'Give your next adventure a date.'}</h3><p>${history?'Past events and races you archive will appear here.':'Add an upcoming race to see a countdown and tips for your event.'}</p></div>`;
    return;
  }
  target.innerHTML = visible.map(r => {
    const days = daysUntil(r.race_date,now), countdown = r.archived?'Archived':days<0?'Past event':days===0?'Race day':`${days} days to go`;
    const metadata = [RACE_TYPES[r.race_type],raceDate(r.race_date).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}),r.distance_m ? `${format(miles(r.distance_m))} mi` : '',r.elevation_m!=null ? `${format(feet(r.elevation_m))} ft` : ''].filter(Boolean).join(' · ');
    return `<section class="race-entry"><div class="race-entry-head"><div><h3>${escape(r.name)}</h3><p>${escape(metadata)}</p></div><span class="pill">${escape(countdown)}</span></div><p class="race-goal">Goal: ${escape(RACE_GOALS[r.goal])}</p>${r.notes?`<p class="race-notes">${escape(r.notes)}</p>`:''}<details class="race-tips"><summary>Preparation & race-day tips</summary><p class="race-tip-context">Based on your event details and recorded rides from the last 30 days. These tips do not predict finishing times or race readiness.</p><ul>${raceTips(r,rides,now).map(tip=>`<li>${escape(tip)}</li>`).join('')}</ul><p class="race-sources">Further reading: <a href="https://usacycling.org/teams/club-tool-kit/your-first-race-day" target="_blank" rel="noopener noreferrer">USA Cycling race-day guide</a> · <a href="https://www.britishcycling.org.uk/sportives/article/sp-Sportive-Tips---Pacing-your-ride-0" target="_blank" rel="noopener noreferrer">British Cycling pacing guide</a></p></details><div class="race-actions"><button class="text-button" data-edit-race="${escape(r.id)}">Edit race</button><button class="text-button" data-archive-race="${escape(r.id)}">${r.archived?'Restore race':'Archive race'}</button></div></section>`;
  }).join('');
}
