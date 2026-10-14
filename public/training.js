const dayStart = value => { const date = new Date(value); date.setHours(0, 0, 0, 0); return date; };
const dayKey = date => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
const advance = date => { const next = new Date(date); next.setDate(next.getDate() + 1); return next; };
const format = value => value.toLocaleString(undefined, {maximumFractionDigits: 1});
const dateLabel = date => date.toLocaleDateString(undefined, {month: 'short', day: 'numeric'});

// Volume proxy: recorded ride minutes, not TSS, Relative Effort, or measured fitness.
// Exact exponential decay uses calendar days, including zero-load rest days.
export function trainingTrend(rides, range) {
  const loads = new Map();
  let historyStart = null, rideCount = 0;
  for (const ride of rides) {
    const date = dayStart(ride.started_at), seconds = Number(ride.duration_s);
    if (!Number.isFinite(date.getTime()) || date >= range.end || !Number.isFinite(seconds) || seconds <= 0) continue;
    const key = dayKey(date);
    loads.set(key, (loads.get(key) || 0) + seconds / 60);
    if (!historyStart || date < historyStart) historyStart = date;
    rideCount++;
  }
  if (!historyStart) return {points: [], historyStart: null, rideCount: 0};
  let cursor = new Date(Math.min(historyStart.getTime(), range.start.getTime()));
  let fitness = 0, fatigue = 0;
  const points = [], fitnessAlpha = 1 - Math.exp(-1 / 42), fatigueAlpha = 1 - Math.exp(-1 / 7);
  while (cursor < range.end) {
    const load = loads.get(dayKey(cursor)) || 0;
    fitness += (load - fitness) * fitnessAlpha;
    fatigue += (load - fatigue) * fatigueAlpha;
    if (cursor >= range.start) points.push({date: new Date(cursor), load, fitness, fatigue});
    cursor = advance(cursor);
  }
  return {points, historyStart, rideCount};
}

export function renderTrainingChart(target, rides, range) {
  const {points, historyStart} = trainingTrend(rides, range);
  document.getElementById('training-period').textContent = `${range.label} · daily estimates`;
  if (!points.length) {
    target.innerHTML = '<div class="empty-state"><h3>Your training story starts with a ride.</h3><p>Add or import rides to estimate your Fitness and Fatigue trends.</p></div>';
    return;
  }
  const latest = points.at(-1), width = 760, left = 54, right = 738, top = 28, bottom = 224;
  const maximum = Math.max(10, Math.ceil(Math.max(...points.flatMap(p => [p.fitness, p.fatigue])) / 10) * 10);
  const x = index => points.length === 1 ? (left + right) / 2 : left + index / (points.length - 1) * (right - left);
  const y = value => bottom - value / maximum * (bottom - top);
  const path = field => points.map((point, i) => `${i ? 'L' : 'M'}${x(i).toFixed(2)},${y(point[field]).toFixed(2)}`).join(' ');
  let grid = '';
  for (let i = 0; i <= 4; i++) {
    const value = maximum * i / 4, position = y(value);
    grid += `<line class="training-grid" x1="${left}" x2="${right}" y1="${position}" y2="${position}"/><text x="${left - 10}" y="${position + 4}" text-anchor="end">${format(value)}</text>`;
  }
  const labelCount = Math.min(5, points.length);
  const labels = [...new Set(Array.from({length: labelCount}, (_, i) => Math.round(i * (points.length - 1) / Math.max(1, labelCount - 1))))];
  for (const i of labels) grid += `<text x="${x(i)}" y="248" text-anchor="${i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}">${dateLabel(points[i].date)}</text>`;
  const baseline = `History starts ${dateLabel(historyStart)}, ${historyStart.getFullYear()}. Earlier load is assumed zero; missing rides can lower these estimates.`;
  target.innerHTML = `<div class="training-values"><div><span class="fitness-key">Fitness · 42-day response</span><strong>${format(latest.fitness)} <small>min/day</small></strong></div><div><span class="fatigue-key">Fatigue · 7-day response</span><strong>${format(latest.fatigue)} <small>min/day</small></strong></div><p>At ${dateLabel(latest.date)} · duration-based estimates</p></div>
    <div class="training-chart" tabindex="0" role="group" aria-label="Fitness and Fatigue chart. Use left and right arrow keys to inspect each day." aria-describedby="training-method training-reading">
    <svg viewBox="0 0 ${width} 268" role="img" aria-label="Daily Fitness and Fatigue estimates, in weighted ride minutes per day"><text x="${left}" y="15">Weighted ride minutes / day</text>${grid}<path class="training-fitness" d="${path('fitness')}"/><path class="training-fatigue" d="${path('fatigue')}"/><line class="training-crosshair" x1="${x(points.length - 1)}" x2="${x(points.length - 1)}" y1="${top}" y2="${bottom}"/><circle class="fitness-dot" cx="${x(points.length - 1)}" cy="${y(latest.fitness)}" r="4"/><circle class="fatigue-dot" cx="${x(points.length - 1)}" cy="${y(latest.fatigue)}" r="4"/></svg></div>
    <output id="training-reading" aria-live="polite"></output><p class="training-history">${baseline}</p>`;
  const chart = target.querySelector('.training-chart'), svg = chart.querySelector('svg'), output = target.querySelector('output');
  let index = points.length - 1;
  const inspect = next => {
    index = Math.max(0, Math.min(points.length - 1, next));
    const point = points[index], position = x(index);
    const crosshair = target.querySelector('.training-crosshair');
    crosshair.setAttribute('x1', position); crosshair.setAttribute('x2', position);
    for (const field of ['fitness', 'fatigue']) {
      const dot = target.querySelector(`.${field}-dot`);
      dot.setAttribute('cx', position); dot.setAttribute('cy', y(point[field]));
    }
    output.textContent = `${dateLabel(point.date)}, ${point.date.getFullYear()} · Fitness ${format(point.fitness)} · Fatigue ${format(point.fatigue)} min/day · Riding ${format(point.load)} min`;
  };
  const pointer = event => {
    const bounds = svg.getBoundingClientRect(), position = (event.clientX - bounds.left) / bounds.width * width;
    inspect(Math.round((position - left) / (right - left) * (points.length - 1)));
  };
  chart.addEventListener('pointermove', pointer);
  chart.addEventListener('pointerdown', pointer);
  chart.addEventListener('keydown', event => {
    const steps = {ArrowLeft: index - 1, ArrowRight: index + 1, Home: 0, End: points.length - 1};
    if (event.key in steps) { event.preventDefault(); inspect(steps[event.key]); }
  });
  inspect(index);
}
