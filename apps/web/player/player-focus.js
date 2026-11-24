(function(){
"use strict";
let snapshot=[],active=false,observer=null;
function setActive(on){
 const player=document.getElementById("player-modal");
 if(!player)return;
 on=!!on;
 if(on===active)return;
 if(on){
  active=true;snapshot=[];
  let branch=player;
  while(branch&&branch!==document.body){
   const parent=branch.parentElement;if(!parent)break;
   for(const sibling of parent.children){if(sibling===branch)continue;snapshot.push({node:sibling,inert:!!sibling.inert});sibling.inert=true;}
   branch=parent;
  }
  document.documentElement.classList.add("flxtv-player-active");
  document.body.classList.add("flxtv-player-active","no-scroll");
  window.dispatchEvent(new CustomEvent("flxtv:player-focus",{detail:{active:true}}));
  return;
 }
 snapshot.forEach(item=>{if(item.node&&item.node.isConnected)item.node.inert=item.inert;});
 snapshot=[];active=false;
 document.documentElement.classList.remove("flxtv-player-active");
 document.body.classList.remove("flxtv-player-active","no-scroll");
 window.dispatchEvent(new CustomEvent("flxtv:player-focus",{detail:{active:false}}));
}
function sync(){
 const player=document.getElementById("player-modal");
 setActive(!!player&&player.classList.contains("open")&&player.getAttribute("aria-hidden")!=="true");
}
function observe(){
 const player=document.getElementById("player-modal");
 if(!player){requestAnimationFrame(observe);return;}
 if(observer)observer.disconnect();
 observer=new MutationObserver(sync);
 observer.observe(player,{attributes:true,attributeFilter:["class","aria-hidden"]});
 sync();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",observe,{once:true});else observe();
window.FlixPlayerFocus={isActive:()=>active,sync};
})();