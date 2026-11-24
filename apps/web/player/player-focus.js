(function(){
"use strict";
const debug=(()=>{
 try{return new URLSearchParams(location.search).get("debugPlayerFocus")==="1"||new URLSearchParams(location.search).get("flxdiag")==="1"||localStorage.getItem("flxtv:debug-player-focus")==="1"||localStorage.getItem("flxtv:diagnostics")==="1"}catch(_){return false}
})();
const log=(type,data={})=>{
 if(debug)console.info("[FLIXTV][PlayerFocus]",type,data);
 try{window.FlixDiagnostics?.log("player-focus."+type,data,"debug")}catch(_){}
};
let snapshot=[],active=false,observer=null,frame=0,attempts=0;
function getPlayer(){return document.getElementById("player-modal")}
function setActive(on,reason="api"){
 const player=getPlayer();
 on=!!on;
 log("transition.requested",{requested:on,active,reason,modalExists:!!player,modalOpen:!!player?.classList.contains("open"),ariaHidden:player?.getAttribute("aria-hidden")});
 if(!player)return false;
 if(on===active)return true;
 if(on){
  active=true;snapshot=[];
  let branch=player;
  while(branch&&branch!==document.body){
   const parent=branch.parentElement;
   if(!parent)break;
   for(const sibling of parent.children){
    if(sibling===branch)continue;
    snapshot.push({node:sibling,inert:!!sibling.inert});
    sibling.inert=true;
   }
   branch=parent;
  }
  document.documentElement.classList.add("flxtv-player-active");
  document.body.classList.add("flxtv-player-active","no-scroll");
  log("activated",{inertNodes:snapshot.length,htmlClass:document.documentElement.className,bodyClass:document.body.className});
  window.dispatchEvent(new CustomEvent("flxtv:player-focus",{detail:{active:true,reason}}));
  return true;
 }
 const restored=snapshot.length;
 snapshot.forEach(item=>{if(item.node&&item.node.isConnected)item.node.inert=item.inert});
 snapshot=[];active=false;
 document.documentElement.classList.remove("flxtv-player-active");
 document.body.classList.remove("flxtv-player-active","no-scroll");
 log("deactivated",{restoredNodes:restored,htmlClass:document.documentElement.className,bodyClass:document.body.className});
 window.dispatchEvent(new CustomEvent("flxtv:player-focus",{detail:{active:false,reason}}));
 return true;
}
function sync(reason="mutation"){
 const player=getPlayer();
 const shouldBeActive=!!player&&player.classList.contains("open")&&player.getAttribute("aria-hidden")!=="true";
 log("sync",{reason,shouldBeActive,active,modalExists:!!player,modalOpen:!!player?.classList.contains("open"),ariaHidden:player?.getAttribute("aria-hidden")});
 setActive(shouldBeActive,reason);
}
function observe(){
 const player=getPlayer();
 if(!player){
  attempts++;
  if(attempts===1||attempts%60===0)log("waiting-for-modal",{attempts,readyState:document.readyState});
  frame=requestAnimationFrame(observe);
  return;
 }
 if(observer)observer.disconnect();
 if(frame)cancelAnimationFrame(frame);
 observer=new MutationObserver(records=>{
  log("modal-mutation",{records:records.map(record=>({attribute:record.attributeName}))});
  sync("modal-mutation");
 });
 observer.observe(player,{attributes:true,attributeFilter:["class","aria-hidden"]});
 log("observer-attached",{readyState:document.readyState,modalOpen:player.classList.contains("open"),ariaHidden:player.getAttribute("aria-hidden")});
 sync("observer-initial");
}
if(debug){
 log("module-loaded",{readyState:document.readyState,modalExists:!!getPlayer(),timestamp:performance.now()});
 window.addEventListener("error",event=>log("window-error",{message:event.message||"Resource/script error",filename:event.filename||event.target?.src||event.target?.href||"",line:event.lineno||0,column:event.colno||0,targetTag:event.target?.tagName||""}),true);
 window.addEventListener("unhandledrejection",event=>log("unhandled-rejection",{reason:String(event.reason?.stack||event.reason||"")}));
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",observe,{once:true});else observe();
window.FlixPlayerFocus={setActive,isActive:()=>active,sync:()=>sync("manual"),getSnapshot:()=>({active,inertNodes:snapshot.length,observerAttached:!!observer,waitingAttempts:attempts})};
})();