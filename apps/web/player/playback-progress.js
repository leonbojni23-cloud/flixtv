(function(){"use strict";
let active=false,callbacks={};function start(next){callbacks=next||callbacks;active=true}function stop(){active=false}function flush(){if(active)callbacks.onFlush?.()}
function handle(e){if(!active)return;const {type,data={}}=e.detail||{};if(type==="timeupdate"||type==="seeking")callbacks.onTimeUpdate?.(data,false);else if(type==="seeked")callbacks.onTimeUpdate?.(data,true);else if(type==="pause")callbacks.onFlush?.(data);else if(type==="ended")callbacks.onEnded?.(data);else if(type==="loadedmetadata")callbacks.onMetadata?.(data)}
window.addEventListener("flxtv:cinesrc-event",handle);window.FlixPlaybackProgress={start,stop,flush,isActive:()=>active};
})();