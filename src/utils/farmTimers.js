export function formatFarmTime(ms) {
 if(!Number.isFinite(ms))return null;
 const total=Math.max(0,Math.ceil(ms/1000));
 return `${Math.floor(total/3600)}h ${String(Math.floor(total/60)%60).padStart(2,'0')}m ${String(total%60).padStart(2,'0')}s`;
}
export function farmTimers(slot,now) {
 const state=String(slot?.state||'').toUpperCase();
 if(state==='READY')return {waterMs:null,harvestMs:0,remainingTicks:0,ready:true};
 if(state!=='GROWING')return {waterMs:null,harvestMs:null,remainingTicks:null};
 const tick=Number(slot.tick ?? NaN),goal=Number(slot.tick_goal ?? NaN),seconds=Number(slot.seconds_per_tick ?? NaN);
 const validTick=Number.isInteger(tick)&&tick>=0;
 const remainingTicks=validTick&&Number.isInteger(goal)&&goal>tick?goal-tick:null;
 let waterMs=null;
 if(validTick&&tick===0)waterMs=0;
 else if(validTick&&Number.isFinite(seconds)&&seconds>=0&&Number.isFinite(now)){
  const text=String(slot.last_action||'');
  const last=Date.parse(/(?:Z|[+-]\d{2}:\d{2})$/i.test(text)?text:text+'Z');
  if(Number.isFinite(last))waterMs=Math.max(0,last+seconds*1000-now);
 }
 const harvestMs=remainingTicks!==null&&waterMs!==null&&Number.isFinite(seconds)&&seconds>=0 ? waterMs+(remainingTicks-1)*seconds*1000 : null;
 return {waterMs,harvestMs,remainingTicks,ready:false};
}
export function harvestLabel(slot,now){
 const timer=farmTimers(slot,now);
 if(timer.ready)return 'Harvest ready';
 if(timer.harvestMs===null)return 'Harvest estimate unavailable';
 if(timer.harvestMs===0)return 'Final watering needed';
 return `Earliest harvest: ${formatFarmTime(timer.harvestMs)}`;
}
