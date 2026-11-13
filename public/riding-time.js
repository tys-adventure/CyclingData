// Presentation only. Training calculations continue to use recorded seconds.
export function formatRidingTime(seconds){
 const minutes=Math.max(0,Math.round((Number(seconds)||0)/60)),hours=Math.floor(minutes/60),rest=minutes%60;
 return hours?hours+' hr'+(hours===1?'':'s')+(rest?' '+rest+' min':''):minutes+' min';
}
export function ridingTimeBreakdown(rides,{start=null,end=null,now=null}={}){
 let indoorSeconds=0,outdoorSeconds=0,indoorCount=0,outdoorCount=0;
 for(const ride of rides){
  const at=Date.parse(ride.started_at),seconds=Number(ride.duration_s);
  if(!Number.isFinite(at)||!Number.isFinite(seconds)||seconds<0||(start&&at<+start)||(end&&at>=+end)||(now&&at>+now))continue;
  if(ride.indoor===true){indoorSeconds+=seconds;indoorCount++;}else{outdoorSeconds+=seconds;outdoorCount++;}
 }
 const totalSeconds=indoorSeconds+outdoorSeconds;
 return {indoorSeconds,outdoorSeconds,totalSeconds,indoorCount,outdoorCount,
  total:formatRidingTime(totalSeconds),
  text:'Indoor '+formatRidingTime(indoorSeconds)+' · Outdoor '+formatRidingTime(outdoorSeconds)};
}
