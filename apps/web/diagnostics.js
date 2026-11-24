(function(){
"use strict";
const VERSION="1.0.0";
const params=new URLSearchParams(location.search);
let enabled=params.get("flxdiag")==="1"||params.get("debugPlayerFocus")==="1";
try{enabled=enabled||localStorage.getItem("flxtv:diagnostics")==="1"}catch(_){}
const LIMIT=500,KEY="flxtv:diagnostics:session:v1",started=performance.now();
const entries=[];
const native={log:console.log.bind(console),info:console.info.bind(console),warn:console.warn.bind(console),error:console.error.bind(console),debug:console.debug.bind(console)};
let panel=null,sequence=0,flushTimer=0;
function cleanUrl(value){
 try{
  const u=new URL(String(value||""),location.href);
  for(const key of [...u.searchParams.keys()]){
   if(/token|key|auth|secret|password|session|signature|sig|api.?key/i.test(key))u.searchParams.set(key,"[REDACTED]");
  }
  if(u.username||u.password){u.username="";u.password=""}
  return u.origin===location.origin?u.pathname+u.search:u.origin+u.pathname+u.search;
 }catch(_){return String(value||"").slice(0,500)}
}
function safe(value,depth=0){
 if(value===null||value===undefined)return value;
 if(typeof value==="string")return value.length>1800?value.slice(0,1800)+"…[truncated]":value;
 if(typeof value==="number"||typeof value==="boolean")return value;
 if(typeof value==="bigint")return String(value);
 if(value instanceof Error)return {name:value.name,message:value.message,stack:String(value.stack||"").slice(0,5000)};
 if(value instanceof Element)return {tag:value.tagName,id:value.id||"",className:typeof value.className==="string"?value.className.slice(0,300):"",src:value.getAttribute("src")?cleanUrl(value.getAttribute("src")):undefined};
 if(value instanceof Request)return {url:cleanUrl(value.url),method:value.method};
 if(value instanceof Response)return {status:value.status,ok:value.ok,url:cleanUrl(value.url)};
 if(typeof value==="function")return "[Function "+(value.name||"anonymous")+"]";
 if(typeof value!=="object")return String(value);
 if(depth>3)return Object.prototype.toString.call(value);
 if(Array.isArray(value))return value.slice(0,30).map(x=>safe(x,depth+1));
 const out={};
 let count=0;
 for(const key of Object.keys(value).slice(0,40)){
  if(/authorization|cookie|password|token|secret|api.?key/i.test(key)){out[key]="[REDACTED]";continue}
  try{out[key]=safe(value[key],depth+1)}catch(_){out[key]="[unreadable]"}
  if(++count>=40)break;
 }
 return out;
}
function persist(){
 try{sessionStorage.setItem(KEY,JSON.stringify(entries.slice(-LIMIT)))}catch(_){}
}
function record(type,data={},level="info"){
 const item={id:++sequence,t:new Date().toISOString(),ms:Math.round(performance.now()*10)/10,level,type,data:safe(data)};
 entries.push(item);
 if(entries.length>LIMIT)entries.splice(0,entries.length-LIMIT);
 if(level==="error"||level==="warn")native[level]("[FLIXTV DIAG]",type,item.data);
 if(panel)renderPanel();
 clearTimeout(flushTimer);flushTimer=setTimeout(persist,250);
 return item;
}
try{
 const old=JSON.parse(sessionStorage.getItem(KEY)||"[]");
 if(Array.isArray(old))entries.push(...old.slice(-LIMIT));
 sequence=entries.reduce((m,x)=>Math.max(m,Number(x.id)||0),0);
}catch(_){}
function snapshot(){
 const nav=performance.getEntriesByType("navigation")[0];
 return {version:VERSION,enabled,href:cleanUrl(location.href),userAgent:navigator.userAgent,platform:navigator.platform,language:navigator.language,online:navigator.onLine,visibility:document.visibilityState,readyState:document.readyState,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},memory:performance.memory?{used:performance.memory.usedJSHeapSize,total:performance.memory.totalJSHeapSize,limit:performance.memory.jsHeapSizeLimit}:null,navigation:nav?{type:nav.type,domInteractive:Math.round(nav.domInteractive),domContentLoaded:Math.round(nav.domContentLoadedEventEnd),load:Math.round(nav.loadEventEnd),transferSize:nav.transferSize}:null,htmlClass:document.documentElement.className,bodyClass:document.body?.className||"",player:{exists:!!document.getElementById("player-modal"),open:!!document.getElementById("player-modal")?.classList.contains("open"),ariaHidden:document.getElementById("player-modal")?.getAttribute("aria-hidden")||null}};
}
function serializeArgs(args){return Array.from(args).slice(0,12).map(x=>safe(x))}
if(enabled){
 record("diagnostics.started",{snapshot:snapshot(),limit:LIMIT});
 for(const method of ["log","info","warn","error","debug"]){
  const original=console[method].bind(console);
  console[method]=function(...args){
   record("console."+method,{args:serializeArgs(args)},method==="error"?"error":method==="warn"?"warn":"debug");
   return original(...args);
  };
 }
 window.addEventListener("error",event=>{
  const resource=event.target&&event.target!==window;
  record(resource?"resource.error":"javascript.error",resource?{tag:event.target.tagName,url:cleanUrl(event.target.src||event.target.href||""),html:event.target.outerHTML?.slice(0,500)}:{message:event.message,filename:cleanUrl(event.filename),line:event.lineno,column:event.colno,error:safe(event.error)}, "error");
 },true);
 window.addEventListener("unhandledrejection",event=>record("promise.unhandledrejection",{reason:safe(event.reason)},"error"));
 window.addEventListener("rejectionhandled",event=>record("promise.rejectionhandled",{reason:safe(event.reason)},"warn"));
 window.addEventListener("securitypolicyviolation",event=>record("security.csp",{directive:event.effectiveDirective,blockedURI:cleanUrl(event.blockedURI),sourceFile:cleanUrl(event.sourceFile),line:event.lineNumber,disposition:event.disposition},"warn"));
 window.addEventListener("online",()=>record("network.online",{}));
 window.addEventListener("offline",()=>record("network.offline",{},"warn"));
 window.addEventListener("visibilitychange",()=>record("document.visibility",{state:document.visibilityState}));
 window.addEventListener("pagehide",event=>record("lifecycle.pagehide",{persisted:event.persisted,snapshot:snapshot()}));
 window.addEventListener("pageshow",event=>record("lifecycle.pageshow",{persisted:event.persisted,snapshot:snapshot()}));
 window.addEventListener("orientationchange",()=>record("device.orientationchange",{orientation:screen.orientation?.type||"",angle:screen.orientation?.angle??null}));
 window.addEventListener("resize",()=>record("device.resize",{width:innerWidth,height:innerHeight}));
 if(window.fetch){
  const originalFetch=window.fetch.bind(window);
  window.fetch=function(input,init){
   const url=cleanUrl(input instanceof Request?input.url:input);
   const method=String(init?.method||(input instanceof Request?input.method:"GET")).toUpperCase();
   const start=performance.now();
   record("network.fetch.start",{method,url});
   return originalFetch(input,init).then(response=>{
    const duration=Math.round(performance.now()-start);
    record("network.fetch.end",{method,url,status:response.status,ok:response.ok,duration,type:response.type},response.ok?"debug":"warn");
    return response;
   }).catch(error=>{
    record("network.fetch.error",{method,url,duration:Math.round(performance.now()-start),error:safe(error)},"error");
    throw error;
   });
  };
 }
 if(window.XMLHttpRequest){
  const proto=XMLHttpRequest.prototype,open=proto.open,send=proto.send;
  proto.open=function(method,url,...rest){this.__flxDiag={method:String(method||"GET").toUpperCase(),url:cleanUrl(url)};return open.call(this,method,url,...rest)};
  proto.send=function(...args){
   const meta=this.__flxDiag||{method:"GET",url:"[unknown]"},start=performance.now();
   record("network.xhr.start",meta);
   this.addEventListener("loadend",()=>record("network.xhr.end",{...meta,status:this.status,duration:Math.round(performance.now()-start)},this.status>=400||this.status===0?"warn":"debug"),{once:true});
   this.addEventListener("error",()=>record("network.xhr.error",meta,"error"),{once:true});
   return send.apply(this,args);
  };
 }
 if(window.PerformanceObserver){
  try{new PerformanceObserver(list=>list.getEntries().forEach(e=>record("performance.longtask",{duration:Math.round(e.duration),startTime:Math.round(e.startTime),name:e.name},"warn"))).observe({type:"longtask",buffered:true})}catch(_){}
  try{new PerformanceObserver(list=>list.getEntries().forEach(e=>{if(e.duration>1200||e.transferSize===0&&e.initiatorType!=="fetch")record("performance.resource",{name:cleanUrl(e.name),type:e.initiatorType,duration:Math.round(e.duration),size:e.transferSize||0},"warn")})).observe({type:"resource",buffered:true})}catch(_){}
 }
 const milestones=["DOMContentLoaded","load"];
 milestones.forEach(name=>window.addEventListener(name,()=>record("lifecycle."+name,{snapshot:snapshot()}),{once:true}));
 document.addEventListener("click",event=>{
  const target=event.target.closest("button,a,[role=button],[data-page],#player-close");
  if(target)record("ui.click",{tag:target.tagName,id:target.id||"",text:(target.innerText||target.getAttribute("aria-label")||"").trim().slice(0,100),page:target.dataset?.page||"",playerOpen:!!document.getElementById("player-modal")?.classList.contains("open")},"debug");
 },true);
 document.addEventListener("DOMContentLoaded",()=>{
  record("dom.ready",{ids:["brand-intro","profile-picker","catalog","home-page","player-modal"].map(id=>({id,exists:!!document.getElementById(id)}))});
  if(!enabled)return;
  const button=document.createElement("button");
  button.type="button";button.className="flxtv-diagnostics-control";button.textContent="DIAG";button.setAttribute("aria-label","Open FLIXTV diagnostics");
  Object.assign(button.style,{position:"fixed",right:"10px",bottom:"10px",zIndex:"2147483647",padding:"8px 11px",border:"1px solid #ffffff55",borderRadius:"9px",background:"#111e",color:"#fff",font:"12px monospace"});
  button.addEventListener("click",()=>openPanel());document.body.append(button);
 });
}
function download(){
 const payload={exportedAt:new Date().toISOString(),app:"FLIXTV",snapshot:snapshot(),entries};
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="flixtv-diagnostics-"+new Date().toISOString().replace(/[:.]/g,"-")+".json";
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 record("diagnostics.exported",{entries:entries.length});
}
function renderPanel(){
 if(!panel)return;
 const list=panel.querySelector("[data-log-list]");
 list.replaceChildren();
 entries.slice(-120).reverse().forEach(item=>{
  const row=document.createElement("div");
  Object.assign(row.style,{padding:"7px 9px",borderBottom:"1px solid #ffffff16",font:"11px/1.45 ui-monospace,monospace",whiteSpace:"pre-wrap",overflowWrap:"anywhere",color:item.level==="error"?"#ff8585":item.level==="warn"?"#ffd18a":"#d7e1f2"});
  row.textContent=item.t+"  "+item.level.toUpperCase()+"  "+item.type+"\n"+JSON.stringify(item.data);
  list.append(row);
 });
 panel.querySelector("[data-count]").textContent=entries.length+" events captured";
}
function openPanel(){
 if(panel){panel.remove();panel=null;return}
 panel=document.createElement("section");
 Object.assign(panel.style,{position:"fixed",inset:"max(12px,env(safe-area-inset-top)) 10px max(58px,env(safe-area-inset-bottom))",zIndex:"2147483647",background:"#080d16f5",color:"#fff",border:"1px solid #ffffff30",borderRadius:"14px",display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 12px 50px #000b",fontFamily:"system-ui,sans-serif"});
 const head=document.createElement("header");
 Object.assign(head.style,{display:"flex",gap:"7px",alignItems:"center",padding:"10px",flexWrap:"wrap",borderBottom:"1px solid #ffffff22"});
 const title=document.createElement("strong");title.textContent="FLIXTV Diagnostics";
 const count=document.createElement("small");count.dataset.count="";count.style.marginRight="auto";
 const make=(label,fn)=>{const b=document.createElement("button");b.textContent=label;b.style.cssText="border:1px solid #ffffff44;border-radius:7px;background:#ffffff12;color:white;padding:7px 9px";b.onclick=fn;return b};
 head.append(title,count,make("Export JSON",download),make("Clear",()=>{entries.length=0;persist();record("diagnostics.cleared",{});}),make("Close",()=>{panel.remove();panel=null}));
 const list=document.createElement("div");list.dataset.logList="";list.style.cssText="overflow:auto;flex:1;min-height:0";
 panel.append(head,list);document.body.append(panel);renderPanel();
}
window.FlixDiagnostics={
 version:VERSION,
 enabled,
 log:(type,data={},level="info")=>record("app."+type,data,level),
 capture:(error,context={})=>record("app.captured-error",{error:safe(error),context:safe(context)},"error"),
 snapshot,
 getEntries:()=>entries.slice(),
 export:download,
 open:openPanel,
 clear:()=>{entries.length=0;persist();record("diagnostics.cleared",{})}
};
record("diagnostics.api.ready",{version:VERSION,enabled});
})();