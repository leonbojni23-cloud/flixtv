(function(){
"use strict";

const modalId="player-modal";
const wrapperId="cinesrc-video-wrapper";
const movedIds=["resolved-video","external-subtitle-overlay","subtitle-toolbar","cinesrc-fullscreen-blocker"];
let scheduled=false;
let moved=false;

function isIPhone(){return /iPhone|iPod/i.test(navigator.userAgent||"");}
function isIPad(){return /iPad/i.test(navigator.userAgent||"")||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);}
function getViewport(){
 const vv=window.visualViewport;
 return {width:Math.max(1,vv?vv.width:window.innerWidth),height:Math.max(1,vv?vv.height:window.innerHeight),left:vv?vv.offsetLeft:0,top:vv?vv.offsetTop:0};
}
function setVar(node,name,value){
 const next=(Math.round(value*100)/100)+"px";
 if(node.style.getPropertyValue(name)!==next)node.style.setProperty(name,next);
}
function movePlayerLayers(wrapper){
 if(moved)return;
 moved=true;
 movedIds.forEach(id=>{const node=document.getElementById(id);if(node&&node.parentElement!==wrapper)wrapper.appendChild(node);});
}
function clearIPhoneState(modal,wrapper){
 modal.classList.remove("ios-player-active");
 if(wrapper)wrapper.classList.remove("ios-virtual-landscape");
 ["--flxtv-ios-vv-width","--flxtv-ios-vv-height","--flxtv-ios-vv-left","--flxtv-ios-vv-top"].forEach(name=>modal.style.removeProperty(name));
}
function sync(){
 const modal=document.getElementById(modalId),wrapper=document.getElementById(wrapperId);
 if(!modal||!wrapper)return;
 if(!modal.classList.contains("open")||!isIPhone()){clearIPhoneState(modal,wrapper);return;}
 movePlayerLayers(wrapper);
 modal.classList.add("ios-player-active","css-fullscreen");
 const viewport=getViewport();
 setVar(modal,"--flxtv-ios-vv-width",viewport.width);
 setVar(modal,"--flxtv-ios-vv-height",viewport.height);
 setVar(modal,"--flxtv-ios-vv-left",viewport.left);
 setVar(modal,"--flxtv-ios-vv-top",viewport.top);
 wrapper.classList.toggle("ios-virtual-landscape",viewport.height>viewport.width);
}
function cssFullscreen(modal){
 modal.classList.add("css-fullscreen");
 document.body.classList.add("no-scroll");
}
function requestFullscreen(){
 const modal=document.getElementById(modalId);
 if(!modal)return;
 const iphone=isIPhone();
 if(iphone){cssFullscreen(modal);sync();}
 const canRequest=typeof modal.requestFullscreen==="function"&&document.fullscreenEnabled;
 if(!canRequest){cssFullscreen(modal);return;}
 try{
  const result=modal.requestFullscreen({navigationUI:"hide"});
  if(result&&typeof result.then==="function"){
   result.then(()=>{
    if(screen.orientation&&typeof screen.orientation.lock==="function"&&!iphone){
     screen.orientation.lock("landscape").catch(()=>{});
    }
   }).catch(error=>{
    cssFullscreen(modal);
    console.info("[FLIXTV] Native fullscreen unavailable; using viewport fullscreen:",error);
   });
  }
 }catch(error){
  cssFullscreen(modal);
  console.info("[FLIXTV] Native fullscreen unavailable; using viewport fullscreen:",error);
 }
}
function exitFullscreen(){
 if(document.fullscreenElement&&document.exitFullscreen)document.exitFullscreen().catch(()=>{});
 try{if(screen.orientation&&typeof screen.orientation.unlock==="function")screen.orientation.unlock();}catch(_){}
 const modal=document.getElementById(modalId),wrapper=document.getElementById(wrapperId);
 if(modal&&wrapper){modal.classList.remove("css-fullscreen");clearIPhoneState(modal,wrapper);}
}
function onFullscreenChange(){
 const modal=document.getElementById(modalId);
 if(!modal)return;
 if(document.fullscreenElement===modal)return;
 if(!modal.classList.contains("open"))return;
 if(!isIPhone())modal.classList.remove("css-fullscreen");
}
window.addEventListener("resize",()=>{schedule();},{passive:true});
window.addEventListener("orientationchange",()=>{schedule();},{passive:true});
document.addEventListener("fullscreenchange",onFullscreenChange);
if(window.visualViewport){
 window.visualViewport.addEventListener("resize",()=>{schedule();},{passive:true});
 window.visualViewport.addEventListener("scroll",()=>{schedule();},{passive:true});
}
function schedule(){
 if(scheduled)return;
 scheduled=true;
 requestAnimationFrame(()=>{scheduled=false;sync();});
}
window.FlixPlayerOrientation={sync,requestFullscreen,exitFullscreen,isIPhone,isIPad};
})();