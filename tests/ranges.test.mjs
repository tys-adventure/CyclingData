import assert from 'node:assert/strict';
import {dashboardRange,chartBuckets,rangeStats,shiftMonths} from '../public/ranges.js';
const now=new Date(2026,9,14,12),iso=d=>[d.getFullYear(),d.getMonth()+1,d.getDate()].join('-');
const expected={week:'2026-10-8',month:'2026-9-15','90days':'2026-7-17','6months':'2026-4-15',ytd:'2026-1-1'};
for(const [key,start] of Object.entries(expected)){
 const range=dashboardRange(key,now);
 assert.equal(iso(range.start),start);assert.equal(iso(range.end),'2026-10-15');
 const input=[{started_at:range.start.toISOString(),distance_m:1000,elevation_m:10,duration_s:60},{started_at:new Date(range.end-1).toISOString(),distance_m:2000,elevation_m:20,duration_s:120},{started_at:range.end.toISOString(),distance_m:999999,elevation_m:99,duration_s:999},{started_at:new Date(range.start-1).toISOString(),distance_m:999999,elevation_m:99,duration_s:999}];
 assert.deepEqual(rangeStats(input,range.start,range.end),{distance:3000,elevation:30,duration:180,count:2});
 const buckets=chartBuckets(input,range);assert.equal(buckets.reduce((sum,b)=>sum+b.value,0),3);assert.equal(buckets[0].date.getTime(),range.start.getTime());assert.equal(buckets.at(-1).end.getTime(),range.end.getTime());
 for(let i=1;i<buckets.length;i++)assert.equal(buckets[i].date.getTime(),buckets[i-1].end.getTime());
}
assert.equal(chartBuckets([],dashboardRange('week',now)).length,7);
assert.equal(iso(dashboardRange('ytd',new Date(2026,0,1,12)).previousEnd),'2025-1-2');
assert.equal(iso(shiftMonths(new Date(2026,7,31),-6)),'2026-2-28');
assert.equal(iso(shiftMonths(new Date(2024,7,31),-6)),'2024-2-29');
assert.equal(iso(dashboardRange('6months',new Date(2026,0,14,12)).start),'2025-7-15');
assert.throws(()=>dashboardRange('invalid',now));
console.log('All five ranges, boundary inclusion, chart totals, month ends, leap years and year rollover passed.');
