(function(){
"use strict";
var firstError=null,started=Date.now(),recovered=false;
function remember(kind,detail){
 if(firstError)return;
 firstError={kind:kind,detail:String(detail||"Unknown startup error").slice(0,1200),at:new Date().toISOString()};
 try{sessionStorage.setItem("flxtv:boot-error",JSON.stringify(firstError))}catch(_){}
}
window.addEventListener("error",function(e){
 if(e.target&&e.target!==window){remember("resource",((e.target.tagName||"resource")+" "+(e.target.src||e.target.href||"")));return}
 remember("javascript",(e.message||"JavaScript error")+" at "+(e.filename||"")+" :"+(e.lineno||0)+":"+(e.colno||0));
},true);
window.addEventListener("unhandledrejection",function(e){remember("promise",e.reason&& (e.reason.stack||e.reason.message)||e.reason)});
function showRecovery(){
 if(recovered)return;recovered=true;
 var root=document.documentElement,screen=document.getElementById("profile-picker"),splash=document.getElementById("brand-intro");
 if(splash)splash.remove();
 if(screen){screen.hidden=false;screen.style.visibility="visible";screen.style.opacity="1";}
 else{
  root.classList.add("profile-ready");
  var panel=document.createElement("section");
  panel.id="flxtv-boot-recovery";
  panel.setAttribute("role","alert");
  panel.innerHTML='<div class="flxtv-boot-card"><div class="flxtv-boot-brand">FLIX<span>TV</span></div><h1>FLIXTV nuk u inicializua</h1><p id="flxtv-boot-detail"></p><div class="flxtv-boot-actions"><button type="button" id="flxtv-boot-reload">Rifresko faqen</button><button type="button" id="flxtv-boot-diag">Hap diagnostikimin</button></div><small>Gabimi u regjistrua lokalisht në këtë pajisje.</small></div>';
  document.body.append(panel);
  var detail=panel.querySelector("#flxtv-boot-detail");
  detail.textContent=firstError?firstError.kind+": "+firstError.detail:"Nuk u krijua ekrani i profileve brenda afatit të nisjes.";
  panel.querySelector("#flxtv-boot-reload").onclick=function(){location.reload()};
  panel.querySelector("#flxtv-boot-diag").onclick=function(){if(window.FlixDiagnostics)window.FlixDiagnostics.open();else alert(detail.textContent)};
 }
 try{window.FlixDiagnostics&&window.FlixDiagnostics.log("boot.recovery",{elapsed:Date.now()-started,error:firstError,profilePickerExists:!!screen},"error")}catch(_){}
}
function check(){
 var root=document.documentElement,screen=document.getElementById("profile-picker");
 if(root.classList.contains("profile-ready"))return;
 if(screen&&!screen.hidden)return;
 if(Date.now()-started<8500)return;
 showRecovery();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",function(){setTimeout(check,8500)},{once:true});
else setTimeout(check,8500);
window.addEventListener("pageshow",function(){setTimeout(check,9000)});
})();