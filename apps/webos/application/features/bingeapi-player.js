(function(){
"use strict";
var tv=window.TV,view=document.getElementById("player-view"),frame=document.getElementById("cinesrc-frame"),loading=document.getElementById("player-loading"),back=document.getElementById("player-back");
if(!tv||!view||!frame){console.error("[FLIXTV] BingeAPI player mount is missing.");return}
var origin="https://bingeapi.st",currentItem=null,currentUrl="",loadTimer=0,focusTimer=0,lastTime=0,lastDuration=0,inertSnapshot=[];
function validId(value){var id=String(value==null?"":value);return /^[0-9]+$/.test(id)&&Number(id)>0?id:""}
function buildUrl(item,request){
 item=item||{};request=request||{};
 var tmdb=item.tmdb||{},id=validId(request.tmdbId||tmdb.id||item.tmdbId||item.id),type=request.type||tmdb.type||item.media_type||item.type||"movie";
 if(!id)throw new Error("Mungon TMDB ID për këtë titull.");
 var params=new URLSearchParams();
 params.set("autoplay","1");params.set("theme","dark");params.set("color","e50936");params.set("bg","08090d");
 params.set("sub_lang","eng");params.set("sub_os","1");params.set("autonext","1");params.set("right_click","0");
 if(type==="tv"||type==="series"){
  var season=Number(request.season!==undefined?request.season:item.season),episode=Number(request.episode!==undefined?request.episode:item.episode);
  if(!Number.isInteger(season)||season<1||!Number.isInteger(episode)||episode<1)throw new Error("Zgjidh sezonin dhe episodin përpara riprodhimit.");
  return origin+"/embed/tv/"+id+"/"+season+"/"+episode+"?"+params.toString();
 }
 return origin+"/embed/movie/"+id+"?"+params.toString();
}
function setLoading(show,message){if(!loading)return;loading.hidden=!show;if(message)loading.textContent=message}
function lockApp(){
 inertSnapshot=[];
 Array.prototype.forEach.call(document.body.children,function(node){
  if(node===view)return;
  inertSnapshot.push({node:node,inert:!!node.inert,aria:node.getAttribute("aria-hidden")});
  node.inert=true;node.setAttribute("aria-hidden","true");
 });
 document.body.classList.add("player-open");
}
function unlockApp(){
 inertSnapshot.forEach(function(entry){
  if(!entry.node||!entry.node.isConnected)return;
  entry.node.inert=entry.inert;
  if(entry.aria===null)entry.node.removeAttribute("aria-hidden");else entry.node.setAttribute("aria-hidden",entry.aria);
 });
 inertSnapshot=[];document.body.classList.remove("player-open");
}
function openPlayer(payload){
 currentItem=payload.item||null;currentUrl=payload.url;lastTime=0;lastDuration=0;
 view.hidden=false;lockApp();setLoading(true,"Po ngarkohet BingeAPI…");
 if(loadTimer)clearTimeout(loadTimer);
 loadTimer=setTimeout(function(){loadTimer=0;setLoading(false)},20000);
 frame.src=currentUrl;
 if(focusTimer)clearTimeout(focusTimer);
 focusTimer=setTimeout(function(){try{frame.focus()}catch(_){}},850);
 return true;
}
function closePlayer(){
 if(loadTimer)clearTimeout(loadTimer);if(focusTimer)clearTimeout(focusTimer);
 loadTimer=focusTimer=0;setLoading(false);frame.src="about:blank";currentUrl="";currentItem=null;
 view.hidden=true;unlockApp();
}
function onRemoteBack(event){
 if(view.hidden)return;
 var key=event.keyCode||event.which;
 if(key===461||key===27||key===8){event.preventDefault();event.stopPropagation();if(tv.view()==="bingeapi-player")tv.closeView();else closePlayer()}
}
document.addEventListener("keydown",onRemoteBack,true);
frame.addEventListener("load",function(){if(!view.hidden&&currentUrl){if(loadTimer)clearTimeout(loadTimer);loadTimer=0;setLoading(false)}});
window.addEventListener("message",function(event){
 if(event.origin!==origin||event.source!==frame.contentWindow)return;
 var data=event.data;if(!data||data.source!=="bingeapi_player")return;
 var value=Number(data.info);
 if(data.event==="time"&&Number.isFinite(value)&&value>=0){
  lastTime=value;
  if(currentItem&&value>0&&Math.floor(value)%15===0){
   try{tv.store("bingeapi:last-progress",{id:currentItem.tmdb&&currentItem.tmdb.id||null,type:currentItem.tmdb&&currentItem.tmdb.type||"movie",time:value,duration:lastDuration,title:currentItem.title||"",updatedAt:Date.now()})}catch(_){}
  }
 }
 if(data.event==="duration"&&Number.isFinite(value)&&value>0)lastDuration=value;
 if(data.event==="play"||data.event==="serverchange"||data.event==="duration")setLoading(false);
 if(data.event==="error"){setLoading(false);tv.toast(String(data.info||"BingeAPI nuk gjeti burim videoje."))}
 if(data.event==="ended")lastTime=0;
});
if(back){
 back.onok=function(){if(tv.view()==="bingeapi-player")tv.closeView()};
 back.addEventListener("click",function(){if(tv.view()==="bingeapi-player")tv.closeView()});
}
tv.addView("bingeapi-player",{
 nav:function(){return back?[[back]]:[]},
 show:function(payload){openPlayer(payload||{})},
 hide:closePlayer,
 back:function(){tv.closeView()}
});
window.TVPlayer={
 open:function(item,request){
  var url;try{url=buildUrl(item,request)}catch(error){tv.toast(error.message||"Nuk u hap player-i.");return false}
  if(item&&typeof tv.remember==="function")tv.remember(item);
  var payload={item:item||null,request:request||{},url:url};
  if(tv.view()==="bingeapi-player")return openPlayer(payload);
  tv.openView("bingeapi-player",payload);return true;
 },
 close:function(){if(tv.view()==="bingeapi-player")tv.closeView();else closePlayer()},
 buildUrl:buildUrl,getCurrentUrl:function(){return currentUrl},
 getPlaybackState:function(){return{currentTime:lastTime,duration:lastDuration}}
};
console.info("[FLIXTV] BingeAPI player initialized for webOS.");
})();