(function(){"use strict";
const debug=(()=>{try{return new URLSearchParams(location.search).get("debugPlayerFocus")==="1"||localStorage.getItem("flxtv:debug-player-focus")==="1"}catch(_){return false}})();
const log=(...args)=>{if(debug)console.info("[FLIXTV][PlayerFocusDebug]",...args)};
let snapshot=[],active=false;
if(debug){
  log("module loaded before app.js",{
    readyState:document.readyState,
    playerModalExists:!!document.getElementById("player-modal"),
    playerModalOpen:!!document.getElementById("player-modal")?.classList.contains("open"),
    timestamp:performance.now()
  });
  window.addEventListener("error",event=>{
    console.error("[FLIXTV][PlayerFocusDebug] window error",{
      message:event.message||"Resource/script error",
      filename:event.filename||event.target?.src||event.target?.href||"",
      line:event.lineno||0,
      column:event.colno||0,
      targetTag:event.target?.tagName||""
    });
  },true);
  window.addEventListener("unhandledrejection",event=>{
    console.error("[FLIXTV][PlayerFocusDebug] unhandled rejection",event.reason);
  });
}
function setActive(on){
  const p=document.getElementById("player-modal");
  log("setActive requested",{requested:!!on,active,modalExists:!!p,modalOpen:!!p?.classList.contains("open"),ariaHidden:p?.getAttribute("aria-hidden")});
  if(!p)return;
  if(on){
    if(active)return;
    active=true;
    let branch=p;
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
    log("activated",{inertNodes:snapshot.length,bodyClass:document.body.className,htmlClass:document.documentElement.className});
    window.dispatchEvent(new CustomEvent("flxtv:player-focus",{detail:{active:true}}));
  }else{
    snapshot.forEach(x=>{if(x.node)x.node.inert=x.inert});
    const restored=snapshot.length;
    snapshot=[];
    active=false;
    document.documentElement.classList.remove("flxtv-player-active");
    document.body.classList.remove("flxtv-player-active","no-scroll");
    log("deactivated",{restoredNodes:restored,bodyClass:document.body.className,htmlClass:document.documentElement.className});
    window.dispatchEvent(new CustomEvent("flxtv:player-focus",{detail:{active:false}}));
  }
}
window.FlixPlayerFocus={setActive,isActive:()=>active};
})();