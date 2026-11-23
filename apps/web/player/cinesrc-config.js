(function(){"use strict";
const ORIGIN="https://cinesrc.st",DEFAULTS=Object.freeze({autoplay:true,muted:false,controls:true,color:"#e50936",seek:10,back:"close",autoskip:false,prioritize:true,autonext:false,playsinline:true});
function build(o){o=o||{};const type=o.mediaType==="tv"?"tv":"movie",id=String(o.tmdbId??"").trim();if(!/^\d+$/.test(id))throw new TypeError("TMDB ID duhet të jetë numerik.");
const url=new URL("/embed/"+type+"/"+encodeURIComponent(id),ORIGIN);if(type==="tv"){url.searchParams.set("s",String(Math.max(1,Math.floor(Number(o.season)||1))));url.searchParams.set("e",String(Math.max(1,Math.floor(Number(o.episode)||1))))}
const s={...DEFAULTS,...(o.settings||{})},b=v=>v?"true":"false";
for(const [k,v] of Object.entries({autoplay:s.autoplay,muted:s.muted,controls:s.controls,autoskip:s.autoskip,prioritize:s.prioritize,playsinline:s.playsinline}))url.searchParams.set(k,b(v));
url.searchParams.set("color",String(s.color||DEFAULTS.color));url.searchParams.set("seek",String(Math.max(1,Math.min(60,Number(s.seek)||10))));url.searchParams.set("back","close");url.searchParams.set("autonext",b(type==="tv"&&s.autonext));
const t=Math.max(0,Math.floor(Number(o.resumeTime)||0));if(t>5){url.searchParams.set("t",String(t));url.searchParams.set("continueprompt","false")}return url}
window.FlixCineSRCConfig=Object.freeze({origin:ORIGIN,defaults:DEFAULTS,build});
})();