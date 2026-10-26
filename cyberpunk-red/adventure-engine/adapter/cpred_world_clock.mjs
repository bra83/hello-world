// Canonical campaign clock projection for Cyberpunk RED operational continuation.
// Authority is Motor Barbara state.game_time.elapsed_seconds, never device wall-clock time.
export const WORLD_CLOCK_SOURCE='Motor Barbara game_time + Braseiro operational projection R4.31';
export const MINUTES_PER_DAY=1440;
export const SECONDS_PER_DAY=86400;
export function normalizeWorldClock(clock={}){
  const seconds=Number.isFinite(Number(clock?.elapsedSeconds))?Math.max(0,Math.floor(Number(clock.elapsedSeconds))):Math.max(0,Math.floor(Number(clock?.elapsedMinutes)||0))*60+Math.max(0,Math.min(59,Math.floor(Number(clock?.subMinuteSeconds)||0)));
  const elapsed=Math.floor(seconds/60);
  return {
    epoch:String(clock?.epoch||'campaign-start'),
    elapsedSeconds:seconds,
    elapsedMinutes:elapsed,
    subMinuteSeconds:seconds%60,
    day:Math.floor(seconds/SECONDS_PER_DAY)+1,
    minuteOfDay:elapsed%MINUTES_PER_DAY,
    secondOfMinute:seconds%60,
    source:'motor-barbara-game-time'
  };
}
export function createWorldClock({elapsedSeconds=null,elapsedMinutes=0,epoch='campaign-start'}={}){
  return normalizeWorldClock({elapsedSeconds:elapsedSeconds==null?Number(elapsedMinutes||0)*60:elapsedSeconds,epoch});
}
export function advanceWorldClockSeconds(clock,seconds){
  const n=Number(seconds);if(!Number.isInteger(n)||n<0||n>31536000)return{ok:false,reason:'invalid-seconds'};
  const before=normalizeWorldClock(clock),after=normalizeWorldClock({...before,elapsedSeconds:before.elapsedSeconds+n});
  return {ok:true,seconds:n,minutes:n/60,before,after,daysCrossed:Math.floor((after.elapsedSeconds-before.elapsedSeconds)/SECONDS_PER_DAY)};
}
export function advanceWorldClock(clock,minutes){
  const n=Number(minutes);if(!Number.isInteger(n)||n<0||n>525600)return{ok:false,reason:'invalid-minutes'};return advanceWorldClockSeconds(clock,n*60);
}
export function campaignDay(clock){return normalizeWorldClock(clock).day}
export function campaignMinute(clock){return normalizeWorldClock(clock).elapsedMinutes}
export function campaignSecond(clock){return normalizeWorldClock(clock).elapsedSeconds}
export function effectIsActive(effect,clock){
  const now=campaignMinute(clock),start=Math.max(0,Math.floor(Number(effect?.startsAtMinute)||0)),end=Math.max(start,Math.floor(Number(effect?.expiresAtMinute)||start));
  return now>=start&&now<end;
}
export function expiredEffects(effects=[],clock){const now=campaignMinute(clock);return (effects||[]).filter(e=>Number.isFinite(Number(e?.expiresAtMinute))&&Number(e.expiresAtMinute)<=now);}
export function activeEffects(effects=[],clock){return (effects||[]).filter(e=>effectIsActive(e,clock))}
