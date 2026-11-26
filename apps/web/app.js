(() => {
"use strict";
const RESOLVER_API="https://flixtv-api.vercel.app";
let flixLoadingTimer=0,flixLoadingProgress=0,flixLoadingInterval=0;
function startFlixLoading(){
 let bar=document.getElementById("flix-top-loading");
 if(!bar){
  bar=document.createElement("div");
  bar.id="flix-top-loading";
  bar.className="flix-top-loading";
  bar.setAttribute("role","progressbar");
  bar.setAttribute("aria-label","Duke ngarkuar faqen");
  bar.setAttribute("aria-valuemin","0");
  bar.setAttribute("aria-valuemax","100");
  bar.innerHTML='<span></span>';
  document.body.append(bar);
 }
 clearTimeout(flixLoadingTimer);
 clearInterval(flixLoadingInterval);
 bar.classList.add("is-active");
 const fill=bar.firstElementChild;
 flixLoadingProgress=Math.max(flixLoadingProgress,.035);
 fill.style.transition="none";
 fill.style.transform="scaleX("+flixLoadingProgress+")";
 bar.setAttribute("aria-valuenow",String(Math.round(flixLoadingProgress*100)));
 requestAnimationFrame(()=>{fill.style.transition="transform 180ms linear"});
 // Progress is deliberately indeterminate-like: it advances slowly and never
 // reaches completion until the destination has rendered and key images are ready.
 flixLoadingInterval=setInterval(()=>{
  flixLoadingProgress=Math.min(.90,flixLoadingProgress+Math.max(.002,(.90-flixLoadingProgress)*.018));
  fill.style.transform="scaleX("+flixLoadingProgress+")";
  bar.setAttribute("aria-valuenow",String(Math.round(flixLoadingProgress*100)));
 },180);
}
async function waitForFlixVisualReady(root){
 if(!root)return;
 // Wait only for the images that can affect the first rendered viewport.
 // Remaining posters keep their native lazy-loading behavior.
 const rails=[...root.querySelectorAll(".poster-row,.continue-watching-row,.content-row")];
 const selected=[];
 if(rails[0])selected.push(...[...rails[0].querySelectorAll("img")].slice(0,4));
 const railImages=new Set(rails.flatMap(rail=>[...rail.querySelectorAll("img")]));
 selected.push(...[...root.querySelectorAll("img")].filter(img=>!railImages.has(img)).slice(0,4));
 const images=[...new Set(selected)].slice(0,8);
 await Promise.all(images.map((img,index)=>new Promise(resolve=>{
  img.loading="eager";img.fetchPriority=index<2?"high":"auto";
  const done=()=>resolve();
  if(img.complete&&img.naturalWidth>0){if(img.decode)img.decode().catch(()=>{}).finally(done);else done();return}
  let settled=false;
  const finish=()=>{if(settled)return;settled=true;clearTimeout(timer);img.removeEventListener("load",finish);img.removeEventListener("error",finish);if(img.decode&&img.naturalWidth>0)img.decode().catch(()=>{}).finally(done);else done()};
  const timer=setTimeout(finish,5000);
  img.addEventListener("load",finish,{once:true});img.addEventListener("error",finish,{once:true});
 })));
 if(document.fonts?.ready)await Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,800))]);
 await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
}
async function finishFlixLoading(){
 const bar=document.getElementById("flix-top-loading");if(!bar)return;
 clearInterval(flixLoadingInterval);flixLoadingProgress=1;
 const fill=bar.firstElementChild;fill.style.transform="scaleX(1)";bar.setAttribute("aria-valuenow","100");
 clearTimeout(flixLoadingTimer);
 await new Promise(resolve=>setTimeout(resolve,210));
 bar.classList.remove("is-active");
 await new Promise(resolve=>setTimeout(resolve,130));
 fill.style.transform="scaleX(0)";flixLoadingProgress=0;
}
const API=location.hostname.endsWith("github.io")?"https://flixtv-snowy.vercel.app/api/tmdb.js":"/api/tmdb.js",IMG="https://image.tmdb.org/t/p/",$=id=>document.getElementById(id);
/* FLIXTV anti-popup and anti-ad protections.
   These controls protect the parent app. Cross-origin iframe content has separate browser security boundaries. */
(()=>{
 const allowedFrameHosts=["cinesrc.st","player.videasy.ws","videasy.ws","bingeapi.st"];
 const isAllowedPlayerUrl=url=>{
  try{const host=new URL(url,location.href).hostname.toLowerCase();return allowedFrameHosts.some(allowed=>host===allowed||host.endsWith("."+allowed))}
  catch(_){return false}
 };
 const blockedPatterns=[
  /(^|\.)doubleclick\.net$/i,/(^|\.)googlesyndication\.com$/i,
  /(^|\.)googleadservices\.com$/i,/(^|\.)adservice\./i,
  /(^|\.)popads\./i,/(^|\.)popcash\./i,
  /(^|\.)adsterra\./i,/(^|\.)exoclick\./i,
  /(^|\.)propellerads\./i,/(^|\.)taboola\./i,
  /(^|\.)outbrain\./i,/(^|\.)onclick\./i
 ];
 const isAdUrl=url=>{
  try{const u=new URL(url,location.href);return blockedPatterns.some(re=>re.test(u.hostname))||/[?&](?:utm_source=ad|ad_id|clickid)=/i.test(u.search)}
  catch(_){return true}
 };
 let trustedPlayerClick=false;
 document.addEventListener("click",event=>{
  trustedPlayerClick=!!(event.isTrusted&&event.target&&event.target.closest&&event.target.closest("#player-modal"));
  queueMicrotask(()=>{trustedPlayerClick=false});
 },true);
 const nativeOpen=window.open.bind(window);
 window.open=function(url,target,features){
  if(!trustedPlayerClick||!isAllowedPlayerUrl(url)){
   console.warn("[FLIXTV] Popup blocked:",url);return null;
  }
  return nativeOpen(url,"_blank","noopener,noreferrer");
 };
 const blockExternalTargets=event=>{
  const link=event.target&&event.target.closest?event.target.closest("a[target]"):null;
  if(!link)return;
  const target=(link.getAttribute("target")||"").toLowerCase();
  if(target==="_blank"&&!isAllowedPlayerUrl(link.href)){
   event.preventDefault();event.stopImmediatePropagation();
   console.warn("[FLIXTV] External tab blocked:",link.href);
  }
 };
 document.addEventListener("click",blockExternalTargets,true);
 document.addEventListener("auxclick",blockExternalTargets,true);
 document.addEventListener("submit",event=>{
  const form=event.target;
  if(form&&form.tagName==="FORM"&&(form.getAttribute("target")||"").toLowerCase()==="_blank"){
   event.preventDefault();event.stopImmediatePropagation();
  }
 },true);
 const nativeAnchorClick=HTMLAnchorElement.prototype.click;
 HTMLAnchorElement.prototype.click=function(){
  if((this.getAttribute("target")||"").toLowerCase()==="_blank"&&!isAllowedPlayerUrl(this.href)){
   console.warn("[FLIXTV] Scripted tab blocked:",this.href);return;
  }
  return nativeAnchorClick.call(this);
 };
 const removeInjectedAdElements=root=>{
  if(!root||!root.querySelectorAll)return;
  root.querySelectorAll('script[src],iframe[src],a[target="_blank"],[id*="ad-" i],[class*="advert" i],[class*="popup" i],[class*="popunder" i]').forEach(node=>{
   if(node===document.querySelector("#cinesrc-frame"))return;
   const src=node.getAttribute("src")||node.href||"";
   if(node.tagName==="SCRIPT"||isAdUrl(src)||/advert|popunder|ad-container|ad-overlay/i.test((node.id||"")+" "+(node.className||""))){
    if(node.tagName!=="SCRIPT"||isAdUrl(src)){node.remove();console.warn("[FLIXTV] Ad element removed:",src)}
   }
  });
 };
 const observer=new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{
  if(node.nodeType===1){removeInjectedAdElements(node);if(node.matches&&node.matches('a[target="_blank"]')&&!isAllowedPlayerUrl(node.href))node.remove()}
 })));
 observer.observe(document.documentElement,{childList:true,subtree:true});
 document.addEventListener("DOMContentLoaded",()=>removeInjectedAdElements(document));
})();
let selected=null,searchTimer=null,searchRequest=0,introTimer=null,controlsTimer=null,heroItems=[],heroIndex=0,heroTimer=null,heroLayer=0,ambientLayer=0,heroBusy=false;
const ambientPaletteCache=new Map();
function paintAmbientCanvas(){
 const canvas=$("ambient-canvas");
 if(!canvas)return;
 const context=canvas.getContext("2d",{alpha:true});
 if(!context)return;
 const width=320,height=180;
 canvas.width=width;canvas.height=height;
 const pixels=context.createImageData(width,height);
 let seed=0x5f3759df;
 for(let i=0;i<pixels.data.length;i+=4){
  seed=(seed*1664525+1013904223)>>>0;
  const grain=188+((seed>>>24)&67);
  pixels.data[i]=grain;
  pixels.data[i+1]=grain;
  pixels.data[i+2]=grain;
  pixels.data[i+3]=((seed>>>16)&31)+8;
 }
 context.putImageData(pixels,0,0);
}
function restartHeroProgress(){
 const fill=$("hero-progress-fill");
 if(!fill)return;
 fill.style.animation="none";
 void fill.offsetWidth;
 fill.style.animation="v3-hero-progress 8s linear forwards";
}
function updateDesktopNavPill(){
 const nav=document.querySelector(".desktop-nav");
 if(!nav)return;
 const pill=nav.querySelector(".nav-pill");
 const active=nav.querySelector(".nav-link.active");
 if(!pill||!active||getComputedStyle(nav).display==="none")return;
 const navRect=nav.getBoundingClientRect(),activeRect=active.getBoundingClientRect();
 pill.style.width=activeRect.width+"px";
 pill.style.transform="translate3d("+(activeRect.left-navRect.left-5)+"px,0,0)";
 pill.style.opacity="1";
}
paintAmbientCanvas();
let homeDataPromise=null,homeDataLoadedAt=0;
function notice(m){const e=$("notice");e.textContent=m;e.hidden=false;clearTimeout(notice.timer);notice.timer=setTimeout(()=>e.hidden=true,3600)}
function modal(id,on){$(id).classList.toggle("open",on);$(id).setAttribute("aria-hidden",String(!on));document.body.classList.toggle("no-scroll",on||$("player-modal").classList.contains("open"))}
function title(x){return x.title||x.name||x.original_title||x.original_name||"Pa titull"}
function kind(x){if(x&&x.media_type==="movie")return"movie";if(x&&x.media_type==="tv")return"tv";if(x&&x.release_date)return"movie";if(x&&x.first_air_date)return"tv";return"movie"}
function year(x){return(x.release_date||x.first_air_date||"").slice(0,4)}
function poster(x){return x.poster_path?IMG+"w342"+x.poster_path:""}
function card(x,keepArtworkOverlay=false,showRating=true){
 const b=document.createElement("button");b.className="poster-card";b.type="button";
 b.setAttribute("aria-label","Shiko detajet: "+title(x));
 const src=poster(x),rating=Number(x.vote_average);
 const art=document.createElement("span");art.className="poster-art";
 if(src){
  const image=document.createElement("img");
  image.loading="lazy";image.decoding="async";image.fetchPriority="low";image.alt="";
  image.src=src;art.append(image);
 }else{
  const placeholder=document.createElement("span");
  placeholder.className="placeholder";placeholder.textContent="FLIXTV";art.append(placeholder);
 }
 if(showRating&&Number.isFinite(rating)&&rating>0){
  const ratingBadge=document.createElement("span");
  ratingBadge.className="poster-rating";
  ratingBadge.setAttribute("aria-label","Vlerësimi "+rating.toFixed(1));
  ratingBadge.innerHTML='<span aria-hidden="true">★</span> '+rating.toFixed(1);
  art.append(ratingBadge);
 }
 const hover=document.createElement("span");hover.className="poster-hover";
 const playIcon=document.createElement("span");playIcon.className="poster-play-icon";
 playIcon.innerHTML='<i class="bi bi-play-fill" aria-hidden="true"></i>';
 const name=document.createElement("strong");name.className="poster-title";name.textContent=title(x);
 const meta=document.createElement("small");meta.className="poster-year";
 meta.textContent=year(x)+(kind(x)==="tv"?" · TV":"");
 hover.append(playIcon);
 if(keepArtworkOverlay){
  hover.append(name,meta);art.append(hover);b.append(art);
 }else{
  art.append(hover);b.append(art,name,meta);
 }
 const warm=()=>prefetchTitle(x);
 b.addEventListener("pointerenter",warm,{once:true,passive:true});
 b.addEventListener("touchstart",warm,{once:true,passive:true});
 b.onclick=event=>{
  if(event.target&&event.target.closest&&event.target.closest(".poster-play-icon")){
   try{const result=play(x);if(result&&typeof result.catch==="function")result.catch(error=>notice(error.message||"Nuk u hap player-i."))}
   catch(error){notice(error.message||"Nuk u hap player-i.")}
   return;
  }
  openTitlePage(x,true,false,b);
 };
 return b
}
window.FLIXTV_HOME_CARD=card;
function createTrendingMovieCard(item){
 const element=card(item,true);
 element.classList.add("trending-movie-card");
 return element;
}
async function tmdb(path){const [pathname,query=""]=path.split("?");const params=new URLSearchParams(query);params.set("path",pathname);if(!params.has("language"))params.set("language",activeWatchProfile?.language==="en"?"en-US":"sq-AL");const r=await fetch(API+"?"+params.toString());if(!r.ok)throw Error("Kërkesa për katalogun dështoi ("+r.status+").");return r.json()}
async function translateOverviewToAlbanian(text){
 if(!text)return "";
 try{
  const response=await fetch("/api/translate.js",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text})});
  if(!response.ok)throw new Error("Translation unavailable");
  const data=await response.json();
  return data.translated||text;
 }catch(_){return text}
}
async function getAlbanianOverview(item,mediaType){
 if(activeWatchProfile?.language==="en")return String(item.overview||"").trim();
 let source="";
 // Prefer a predictable English source so an English synopsis is never mistaken for an Albanian one.
 try{
  const english=await tmdb("/"+mediaType+"/"+item.id+"?language=en-US");
  source=String(english.overview||"").trim();
 }catch(_){}
 if(!source)return String(item.overview||"").trim();
 const translated=String(await translateOverviewToAlbanian(source)||"").trim();
 // Do not silently label untranslated English text as Albanian.
 return translated&&translated.toLowerCase()!==source.toLowerCase()?translated:"";
}
async function loadTitleVideos(item,details){
 const type=kind(item),base="/"+type+"/"+item.id+"/videos";
 const languages=[ "en-US", "en-GB", item.original_language?item.original_language+"-"+String(item.original_language).toUpperCase():null, "sq-AL" ].filter(Boolean);
 const results=[...(details.videos?.results||[])];
 const seen=new Set(results.map(v=>v.key).filter(Boolean));
 for(const language of languages){
  try{
   const data=await tmdb(base+"?language="+encodeURIComponent(language));
   for(const video of data.results||[]){
    if(video?.site==="YouTube"&&video.key&&!seen.has(video.key)){results.push(video);seen.add(video.key)}
   }
   if(results.some(v=>v.site==="YouTube"&&v.key&&(v.type==="Trailer"||v.type==="Teaser")))break;
  }catch(error){console.warn("Trailer lookup failed for",language,error)}
 }
 // Include any official trailer/teaser first, then a usable YouTube video as last resort.
 details.videos={...(details.videos||{}),results};
 return details;
}
const pagedRows=new Map();
async function appendRowPage(state){
 if(!state||!state.active||state.loading||state.done)return;
 state.loading=true;
 const nextPage=state.page+1;
 try{
  const separator=state.path.includes("?")?"&":"?";
  const data=await tmdb(state.path+separator+"page="+nextPage);
  const container=$(state.id);
  if(!container||!state.active||pagedRows.get(state.id)!==state)return;
  if(state.observer){state.observer.disconnect();state.observer=null}
  const results=(data.results||[]).filter(item=>item.poster_path&&!state.seen.has(item.id));
  results.forEach(item=>state.seen.add(item.id));
  const hint=container.querySelector(".row-more-hint");
  if(hint)hint.remove();
  if(results.length)container.append(...results.map(state.renderCard||card));
  state.page=nextPage;
  state.totalPages=Math.min(Number(data.total_pages)||10,10);
  state.done=state.page>=state.totalPages||results.length===0;
  if(state.done&&container.__flixRowScrollHandler){
   container.removeEventListener("scroll",container.__flixRowScrollHandler);
   container.__flixRowScrollHandler=null;
  }
  if(!state.done){
   const sentinel=document.createElement("div");
   sentinel.className="row-more-hint";
   sentinel.textContent="Po ngarkohen titujt…";
   sentinel.setAttribute("aria-live","polite");
   sentinel.style.cssText="flex:0 0 125px;min-height:70px;display:grid;place-items:center;color:#929bab;font-size:11px;text-align:center;padding:10px";
   container.append(sentinel);
   if("IntersectionObserver" in window){
    state.observer=new IntersectionObserver(entries=>{
     if(entries.some(entry=>entry.isIntersecting))appendRowPage(state);
    },{root:container,rootMargin:"0px 420px 0px 0px",threshold:0});
    state.observer.observe(sentinel);
   }
  }
 }catch(error){
  if(state.active&&pagedRows.get(state.id)===state){
   state.done=true;
   if(state.observer){state.observer.disconnect();state.observer=null}
   const container=$(state.id),hint=container&&container.querySelector(".row-more-hint");
   if(hint){hint.textContent="Nuk u ngarkuan titujt e tjerë.";hint.classList.add("row-more-error")}
   if(container&&container.__flixRowScrollHandler){
    container.removeEventListener("scroll",container.__flixRowScrollHandler);
    container.__flixRowScrollHandler=null;
   }
   console.warn("[FLIXTV] Row pagination failed:",state.id,error);
  }
 }finally{state.loading=false}
}
async function row(id,path,renderCard=card){
 const container=$(id);
 if(!container)return [];
 const request=(Number(container.__flixRowRequest)||0)+1;
 container.__flixRowRequest=request;
 const previousState=pagedRows.get(id);
 if(previousState){
  previousState.active=false;
  if(previousState.observer){previousState.observer.disconnect();previousState.observer=null}
 }
 if(container.__flixRowScrollHandler){
  container.removeEventListener("scroll",container.__flixRowScrollHandler);
  container.__flixRowScrollHandler=null;
 }
 try{
  const data=await tmdb(path);
  if(container.__flixRowRequest!==request)return data.results||[];
  const results=(data.results||[]).filter(item=>item.poster_path);
  container.replaceChildren(...results.map(renderCard));
  const state={
   id,path,renderCard,page:1,totalPages:Math.min(Number(data.total_pages)||10,10),
   loading:false,done:false,active:true,seen:new Set(results.map(item=>item.id)),
   observer:null,scrollTimer:null
  };
  state.done=state.page>=state.totalPages||results.length===0;
  pagedRows.set(id,state);
  if(!state.done){
   const sentinel=document.createElement("div");
   sentinel.className="row-more-hint";
   sentinel.textContent="Shfleto për më shumë";
   sentinel.setAttribute("aria-live","polite");
   sentinel.style.cssText="flex:0 0 125px;min-height:70px;display:grid;place-items:center;color:#929bab;font-size:11px;text-align:center;padding:10px";
   container.append(sentinel);
   if("IntersectionObserver" in window){
    state.observer=new IntersectionObserver(entries=>{
     if(entries.some(entry=>entry.isIntersecting))appendRowPage(state);
    },{root:container,rootMargin:"0px 420px 0px 0px",threshold:0});
    state.observer.observe(sentinel);
   }
   const onScroll=()=>{
    clearTimeout(state.scrollTimer);
    state.scrollTimer=setTimeout(()=>{
     if(state.active&&pagedRows.get(id)===state&&container.scrollLeft+container.clientWidth>=container.scrollWidth-260){
      appendRowPage(state);
     }
    },100);
   };
   container.__flixRowScrollHandler=onScroll;
   container.addEventListener("scroll",onScroll,{passive:true});
  }
  return data.results||[];
 }catch(error){
  if(container.__flixRowRequest===request)notice(error.message);
  return [];
 }
}
const HERO_SAVED_KEY="flxtv:my-list:v1";
const heroLogoCache=new Map();
function heroListKey(){
 let profileId="main";
 try{if(activeWatchProfile&&activeWatchProfile.id)profileId=String(activeWatchProfile.id)}catch(_){}
 return HERO_SAVED_KEY+":"+profileId;
}
function readHeroSavedItems(){
 try{const value=JSON.parse(localStorage.getItem(heroListKey())||"[]");return Array.isArray(value)?value:[]}catch(_){return []}
}
function isHeroItemSaved(item){
 const id=String(item&&item.id||"");
 const media=kind(item);
 return readHeroSavedItems().some(entry=>String(entry.id)===id&&String(entry.media_type||"movie")===media);
}
function renderHeroSaveButton(item){
 const button=$("hero-add");
 if(!button||!item)return;
 const saved=isHeroItemSaved(item);
 button.innerHTML='<i class="bi '+(saved?"bi-check-lg":"bi-plus-lg")+'" aria-hidden="true"></i>';
 button.setAttribute("aria-pressed",String(saved));
 button.setAttribute("aria-label",saved?"Hiq nga lista ime":"Shto te lista ime");
 button.title=saved?"Hiq nga lista ime":"Shto te lista ime";
 button.classList.toggle("is-saved",saved);
}
function toggleHeroSaved(item){
 if(!item||!item.id)return;
 try{
  const list=readHeroSavedItems();
  const media=kind(item),id=String(item.id);
  const index=list.findIndex(entry=>String(entry.id)===id&&String(entry.media_type||"movie")===media);
  if(index>=0){
   list.splice(index,1);
   localStorage.setItem(heroListKey(),JSON.stringify(list));
   notice("U hoq nga Lista ime.");
  }else{
   list.unshift({
    id:item.id,media_type:media,title:title(item),
    poster_path:item.poster_path||"",backdrop_path:item.backdrop_path||"",
    vote_average:Number(item.vote_average)||0,
    release_date:item.release_date||"",first_air_date:item.first_air_date||"",
    overview:item.overview||"",genre_ids:Array.isArray(item.genre_ids)?item.genre_ids:[],
    savedAt:Date.now()
   });
   localStorage.setItem(heroListKey(),JSON.stringify(list.slice(0,500)));
   notice("U shtua te Lista ime.");
  }
  renderHeroSaveButton(item);
 }catch(error){
  console.warn("[FLIXTV] Saved-title storage failed",error);
  notice("Nuk u ruajt në këtë pajisje.");
 }
}
function heroGenreLabel(item){
 const ids=Array.isArray(item.genre_ids)?item.genre_ids:(Array.isArray(item.genres)?item.genres.map(g=>g.id):[]);
 const names=ids.map(id=>genreSq&&genreSq[id]).filter(Boolean);
 return names.slice(0,2).join(" · ");
}
function heroFocusPosition(item){
 const supplied=item.hero_focus||item.backdrop_position;
 if(typeof supplied==="string"&&supplied.trim())return supplied;
 return kind(item)==="tv"?"center 28%":"center 32%";
}
async function resolveHeroLogo(item){
 const media=kind(item),key=media+":"+item.id;
 if(!heroLogoCache.has(key)){
  const request=tmdb("/"+media+"/"+item.id+"/images?include_image_language=en,null")
   .then(data=>{
    const logos=Array.isArray(data.logos)?data.logos.filter(x=>x&&x.file_path):[];
    logos.sort((a,b)=>{
     const score=x=>(x.iso_639_1==="en"?3:x.iso_639_1===null?2:0)+(Number(x.width)||0)/100000;
     return score(b)-score(a);
    });
    return logos[0]?.file_path||"";
   }).catch(()=> "");
  heroLogoCache.set(key,request);
 }
 return heroLogoCache.get(key);
}
async function applyHeroLogo(item,request){
 const image=$("hero-title-logo"),fallback=$("hero-title");
 if(!image||!fallback)return;
 // Keep the title area blank while artwork is being resolved. Never flash the
 // plain-text fallback before the actual logo has had a chance to load.
 image.hidden=true;
 fallback.hidden=true;
 try{
  // Do not leave the hero title blank if TMDB's artwork endpoint stalls.
  const path=await Promise.race([
   resolveHeroLogo(item),
   new Promise(resolve=>setTimeout(()=>resolve(""),1400))
  ]);
  if(request!==showHero.requestId)return;
  if(!path){image.removeAttribute("src");fallback.hidden=false;return}
  const source=IMG+"w500"+path;
  const preload=new Image();
  preload.decoding="async";
  preload.onload=()=>{
   if(request!==showHero.requestId)return;
   image.onload=null;
   image.onerror=null;
   image.alt=title(item);
   image.src=source;
   image.hidden=false;
  };
  preload.onerror=()=>{
   if(request!==showHero.requestId)return;
   image.removeAttribute("src");
   fallback.hidden=false;
  };
  preload.src=source;
 }catch(_){
  if(request===showHero.requestId){image.hidden=true;fallback.hidden=false}
 }
}

/* Extract a compact color palette from the active TMDB cover.
   The canvas is intentionally tiny so this runs once per cover, not per frame. */
function ambientClamp(value,min,max){return Math.max(min,Math.min(max,value))}
function ambientRgbToHsl(r,g,b){
 r/=255;g/=255;b/=255;
 const max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min;
 let h=0,s=0,l=(max+min)/2;
 if(delta){
  s=delta/(1-Math.abs(2*l-1));
  if(max===r)h=((g-b)/delta)%6;
  else if(max===g)h=(b-r)/delta+2;
  else h=(r-g)/delta+4;
  h=(h*60+360)%360;
 }
 return {h,s:s*100,l:l*100};
}
function ambientHslToRgb(h,s,l){
 h=((h%360)+360)%360;s=ambientClamp(s,0,100)/100;l=ambientClamp(l,0,100)/100;
 const c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2;
 let r=0,g=0,b=0;
 if(h<60){r=c;g=x}else if(h<120){r=x;g=c}else if(h<180){g=c;b=x}
 else if(h<240){g=x;b=c}else if(h<300){r=x;b=c}else{r=c;b=x}
 return [r,g,b].map(v=>Math.round((v+m)*255));
}
function ambientPaletteColor(hsl,lightnessOffset=0,hueOffset=0){
 return ambientHslToRgb(
  hsl.h+hueOffset,
  ambientClamp(hsl.s+24,68,98),
  ambientClamp(hsl.l+lightnessOffset+5,44,69)
 ).join(",");
}
function ambientFallbackPalette(){
 return {c1:"190,104,69",c2:"76,111,94",c3:"121,91,151"};
}
let heroSmokeCanvasState=null;
function ensureHeroSmokeStage(){
 const hero=$("hero");if(!hero)return null;
 let stage=hero.querySelector(".hero-smoke-stage");
 if(!stage){stage=document.createElement("div");stage.className="hero-smoke-stage";stage.setAttribute("aria-hidden","true");const content=$("hero-content");if(content)hero.insertBefore(stage,content);else hero.appendChild(stage);}
 let canvas=stage.querySelector(".hero-smoke-canvas");
 if(!canvas){stage.replaceChildren();canvas=document.createElement("canvas");canvas.className="hero-smoke-canvas";canvas.width=220;canvas.height=124;stage.appendChild(canvas);}
 if(!heroSmokeCanvasState||heroSmokeCanvasState.canvas!==canvas){
  const context=canvas.getContext("2d",{alpha:true});if(!context)return stage;
  const size=128,grid=new Float32Array(size*size);let seed=0x6d2b79f5;
  for(let i=0;i<grid.length;i++){seed=(seed*1664525+1013904223)>>>0;grid[i]=(seed&65535)/65535;}
  heroSmokeCanvasState={canvas,context,grid,size,palette:[[194,104,62],[81,111,92],[132,92,151]],time:0,last:0,raf:0};
  const noise=(x,y)=>{const st=heroSmokeCanvasState;const n=st.size;x=((x%n)+n)%n;y=((y%n)+n)%n;const x0=Math.floor(x),y0=Math.floor(y),x1=(x0+1)&(n-1),y1=(y0+1)&(n-1),fx=x-x0,fy=y-y0,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy),g=st.grid;const a=g[y0*n+x0],b=g[y0*n+x1],c=g[y1*n+x0],d=g[y1*n+x1];return(a+(b-a)*sx)*(1-sy)+(c+(d-c)*sx)*sy;};
  const fbm=(x,y)=>{let sum=0,weight=.55,total=0;for(let o=0;o<4;o++){sum+=noise(x,y)*weight;total+=weight;x=x*2.03+17.1;y=y*2.01-9.7;weight*=.52;}return sum/total;};
  const smooth=(a,b,v)=>{const q=Math.max(0,Math.min(1,(v-a)/(b-a)));return q*q*(3-2*q);};
  const render=now=>{
   const st=heroSmokeCanvasState;if(!st||st.canvas!==canvas)return;
   if(document.hidden||window.FlixPlayerFocus?.isActive()){st.raf=0;return;}
   if(now-st.last<68){st.raf=requestAnimationFrame(render);return;}
   st.last=now;st.time+=.018;const w=canvas.width,h=canvas.height,p=st.palette,t=st.time,frame=context.createImageData(w,h),data=frame.data;
   for(let y=0;y<h;y++){const ny=y/h;for(let x=0;x<w;x++){const nx=x/w;
    const wx=(fbm(nx*2.1+31+t*.19,ny*2+7-t*.08)-.5)*1.25,wy=(fbm(nx*2.4-13-t*.11,ny*2.8+21+t*.14)-.5)*.92;
    const sx=(nx+wx)*3.15+t*.13,sy=(ny+wy)*2.25-t*.085;
    const broad=fbm(sx*5.2,sy*3.7),detail=fbm(sx*13+43,sy*11-19),filaments=1-Math.abs(2*detail-1);
    const density=smooth(.43,.66,broad+(filaments-.5)*.18),rising=smooth(.04,.30,ny)*(1-smooth(.86,1.08,ny)),plume=smooth(.04,.95,1-Math.abs(nx-.5)*1.78);
    const alpha=Math.min(196,Math.max(0,(density-.055)*286*(.58+detail*.68)*rising*plume));if(alpha<1)continue;
    const mix=Math.max(0,Math.min(1,detail*.85+ny*.12)),a=p[0],b=p[1],c=p[2],i=(y*w+x)*4;
    data[i]=Math.min(255,a[0]*(1-mix)*.48+b[0]*mix*.34+c[0]*.18+22);data[i+1]=Math.min(255,a[1]*(1-mix)*.48+b[1]*mix*.34+c[1]*.18+22);data[i+2]=Math.min(255,a[2]*(1-mix)*.48+b[2]*mix*.34+c[2]*.18+24);data[i+3]=alpha;
   }}
   context.putImageData(frame,0,0);st.raf=requestAnimationFrame(render);
  };
  heroSmokeCanvasState.render=render;
  heroSmokeCanvasState.raf=requestAnimationFrame(render);
 }
 if(heroSmokeCanvasState&&!heroSmokeCanvasState.raf&&!document.hidden&&!window.FlixPlayerFocus?.isActive()&&heroSmokeCanvasState.render)heroSmokeCanvasState.raf=requestAnimationFrame(heroSmokeCanvasState.render);
 return stage;
}
let pageSmokeState=null;
function ensurePageSmokeCanvas(){
 const ambient=$("app-ambient");if(!ambient)return null;
 let canvas=ambient.querySelector(".page-smoke-canvas");
 if(!canvas){
  canvas=document.createElement("canvas");canvas.className="page-smoke-canvas";
  canvas.setAttribute("aria-hidden","true");canvas.width=168;canvas.height=300;ambient.appendChild(canvas);
 }
 if(!pageSmokeState||pageSmokeState.canvas!==canvas){
  const context=canvas.getContext("2d",{alpha:true,desynchronized:true});if(!context)return null;
  const size=128,grid=new Float32Array(size*size);let seed=0x3c6ef372;
  for(let i=0;i<grid.length;i++){seed=(seed*1664525+1013904223)>>>0;grid[i]=(seed&65535)/65535;}
  const noise=(x,y)=>{x=((x%size)+size)%size;y=((y%size)+size)%size;const x0=Math.floor(x),y0=Math.floor(y),x1=(x0+1)&127,y1=(y0+1)&127,fx=x-x0,fy=y-y0,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy),a=grid[y0*size+x0],b=grid[y0*size+x1],c=grid[y1*size+x0],d=grid[y1*size+x1];return(a+(b-a)*sx)*(1-sy)+(c+(d-c)*sx)*sy;};
  const fbm=(x,y)=>{let sum=0,w=.58,total=0;for(let o=0;o<3;o++){sum+=noise(x,y)*w;total+=w;x=x*2.02+13.7;y=y*2.01-8.3;w*=.5;}return sum/total;};
  const smooth=(a,b,v)=>{const q=Math.max(0,Math.min(1,(v-a)/(b-a)));return q*q*(3-2*q);};
  pageSmokeState={canvas,context,palette:[[125,94,82],[83,108,112],[119,91,137]],targetPalette:[[125,94,82],[83,108,112],[119,91,137]],time:0,last:0,raf:0,fbm,smooth};
  const render=now=>{
   const st=pageSmokeState;if(!st||st.canvas!==canvas)return;
   if(document.hidden||window.FlixPlayerFocus?.isActive()){st.raf=0;return;}
   if(now-st.last<55){st.raf=requestAnimationFrame(render);return;}
   const dt=st.last?Math.min(2,(now-st.last)/55):1;st.last=now;st.time+=.010*dt;
   const w=canvas.width,h=canvas.height,t=st.time,p=st.palette,frame=context.createImageData(w,h),data=frame.data;
   for(let y=0;y<h;y++){const ny=y/h;for(let x=0;x<w;x++){const nx=x/w;
    // Broad, gently rising currents with fine filament detail: slow liquid-smoke motion.
    const bend=(fbm(nx*1.8+11+t*.075,ny*1.8-7-t*.035)-.5)*1.12;
    const flow=(fbm(nx*1.15-5-t*.04,ny*2.0+17+t*.045)-.5)*.76;
    const sx=(nx+bend)*2.65+t*.035,sy=(ny+flow)*1.85-t*.025;
    const body=fbm(sx*2.7,sy*2.55),detail=fbm(sx*6.5+29,sy*5.8-13);
    const filaments=1-Math.abs(detail*2-1);
    const ribbons=smooth(.43,.64,body+(filaments-.5)*.13);
    const vertical=smooth(.015,.20,ny)*(1-smooth(.94,1.08,ny));
    const side=smooth(-.04,.24,nx)*(1-smooth(.76,1.04,nx));
    const alpha=Math.min(232,Math.max(0,(ribbons-.12)*330*vertical*side*(.82+detail*.52)));
    if(alpha<1)continue;
    const mix=Math.max(0,Math.min(1,detail*.78+ny*.12)),i=(y*w+x)*4;
    data[i]=p[0][0]*(1-mix)*.62+p[1][0]*mix*.27+p[2][0]*.11;
    data[i+1]=p[0][1]*(1-mix)*.62+p[1][1]*mix*.27+p[2][1]*.11;
    data[i+2]=p[0][2]*(1-mix)*.62+p[1][2]*mix*.27+p[2][2]*.11;
    data[i+3]=alpha;
   }}
   context.putImageData(frame,0,0);st.raf=requestAnimationFrame(render);
  };
  pageSmokeState.render=render;
  pageSmokeState.raf=requestAnimationFrame(render);
 }
 if(pageSmokeState&&!pageSmokeState.raf&&!document.hidden&&!window.FlixPlayerFocus?.isActive()&&pageSmokeState.render)pageSmokeState.raf=requestAnimationFrame(pageSmokeState.render);
 return canvas;
}
function updatePageSmokePalette(colors){
 const canvas=ensurePageSmokeCanvas();if(!canvas||!pageSmokeState)return;
 const rgb=value=>String(value||"80,92,110").split(",").map(channel=>Math.max(0,Math.min(255,Number(channel)||0)));
 pageSmokeState.targetPalette=[rgb(colors.c1),rgb(colors.c2),rgb(colors.c3)];
}
function readAmbientPalette(imageUrl){
 if(!imageUrl)return Promise.resolve(null);
 if(ambientPaletteCache.has(imageUrl))return ambientPaletteCache.get(imageUrl);
 const task=new Promise(resolve=>{
  const image=new Image();
  image.crossOrigin="anonymous";
  image.decoding="async";
  image.onload=()=>{
   try{
    const canvas=document.createElement("canvas");
    canvas.width=64;canvas.height=64;
    const context=canvas.getContext("2d",{willReadFrequently:true});
    if(!context){resolve(null);return}
    context.drawImage(image,0,0,64,64);
    const pixels=context.getImageData(0,0,64,64).data;
    // Build a hue histogram from the whole cover, retaining two genuinely different artwork colors.
    const bins=Array.from({length:36},()=>({weight:0,r:0,g:0,b:0,count:0}));
    for(let i=0;i<pixels.length;i+=4){
     const r=pixels[i],g=pixels[i+1],b=pixels[i+2],alpha=pixels[i+3];
     if(alpha<170)continue;
     const high=Math.max(r,g,b),low=Math.min(r,g,b);
     if(high<18||low>248)continue;
     const saturation=high===0?0:(high-low)/high;
     const hsl=ambientRgbToHsl(r,g,b);
     // Keep muted film colors in the mix, but prioritize visible chromatic areas over black bars/highlights.
     if(saturation<.075)continue;
     let hue=hsl.h;
     const luminance=hsl.l/100;
     const chromaWeight=.24+saturation*.76;
     const midtoneWeight=.58+.42*(1-Math.min(1,Math.abs(luminance-.50)/.50));
     const weight=chromaWeight*midtoneWeight;
     const bin=bins[Math.min(35,Math.floor(hue/10))];
     bin.weight+=weight;bin.r+=r*weight;bin.g+=g*weight;bin.b+=b*weight;bin.count++;
    }
    const ranked=bins.filter(bin=>bin.weight>0).sort((a,b)=>b.weight-a.weight);
    if(!ranked.length){resolve(null);return}
    const colorFromBin=bin=>({
     rgb:[bin.r/bin.weight,bin.g/bin.weight,bin.b/bin.weight],
     hsl:ambientRgbToHsl(bin.r/bin.weight,bin.g/bin.weight,bin.b/bin.weight),
     weight:bin.weight
    });
    const first=colorFromBin(ranked[0]);
    const hueDistance=(a,b)=>{const d=Math.abs(a-b)%360;return Math.min(d,360-d)};
    // Prefer the strongest second hue that is visually distinct from the primary.
    const secondBin=ranked.find(bin=>hueDistance(colorFromBin(bin).hsl.h,first.hsl.h)>=24)||
      ranked.find(bin=>bin!==ranked[0])||ranked[0];
    const second=colorFromBin(secondBin);
    const makeCinematic=color=>{
     const saturation=ambientClamp(color.hsl.s*.72,34,68);
     const light=ambientClamp(color.hsl.l,34,54);
     return ambientHslToRgb(color.hsl.h,saturation,light).join(",");
    };
    const c1=makeCinematic(first);
    const c2=makeCinematic(second);
    // c3 intentionally repeats the secondary: the smoke palette is driven by two cover colors, not invented tints.
    resolve({c1,c2,c3:c2,dominantHue:first.hsl.h,secondaryHue:second.hsl.h});   }catch(_){resolve(null)}
  };
  image.onerror=()=>resolve(null);
  image.src=imageUrl;
 });
 ambientPaletteCache.set(imageUrl,task);
 if(ambientPaletteCache.size>28)ambientPaletteCache.delete(ambientPaletteCache.keys().next().value);
 return task;
}
async function updateAmbientScene(imageUrl,paletteUrl,request){
 let palette=null;
 // The same-origin TMDB proxy is the reliable CORS-safe source for pixel sampling.
 if(paletteUrl){try{palette=await readAmbientPalette(paletteUrl)}catch(_){}}
 if(!palette&&imageUrl&&imageUrl!==paletteUrl){try{palette=await readAmbientPalette(imageUrl)}catch(_){}}
 if(request!==showHero.requestId)return;
 const colors=palette||ambientFallbackPalette();
 // The legacy 2D page-smoke canvas is hidden by the active WebGL design; skip its CPU animation.
 const root=document.documentElement;
 const toRgb=value=>String(value||"").split(",").map(channel=>Math.max(0,Math.min(255,Number(channel)||0)));
 const primary=toRgb(colors.c1),secondary=toRgb(colors.c2),tertiary=toRgb(colors.c3);
 const baseRgb=primary.map(value=>Math.round(value*.13+4)).join(",");
 root.style.setProperty("--hero-smoke-one",primary.join(","));
 root.style.setProperty("--hero-smoke-two",secondary.join(","));
 root.style.setProperty("--hero-smoke-three",tertiary.join(","));
 root.style.setProperty("--hero-background-rgb",baseRgb);
 window.dispatchEvent(new CustomEvent("flxtv:ambient-palette"));
 const nextLayer=ambientLayer===0?1:0;
 const next=$("app-ambient-scene-"+(nextLayer===0?"a":"b"));
 const current=$("app-ambient-scene-"+(ambientLayer===0?"a":"b"));
 if(!next||!current)return;
 next.style.setProperty("--ambient-c1",colors.c1);
 next.style.setProperty("--ambient-c2",colors.c2);
 next.style.setProperty("--ambient-c3",colors.c3);
 next.style.setProperty("--ambient-color-one","rgb("+colors.c1+")");
 next.style.setProperty("--ambient-color-two","rgb("+colors.c2+")");
 next.style.setProperty("--ambient-color-three","rgb("+colors.c3+")");
 const art=next.querySelector(".ambient-scene-art");
 if(art)art.style.backgroundImage=imageUrl?'url("'+imageUrl+'")':'linear-gradient(135deg,#303b27,#171b11)';
 requestAnimationFrame(()=>{
  if(request!==showHero.requestId)return;
  next.classList.add("active");
  current.classList.remove("active");
  ambientLayer=nextLayer;
 });
}


function updateHeroDots(){
 const container=$("hero-dots");
 if(!container)return;
 container.querySelectorAll(".hero-dot").forEach((dot,index)=>{
  const active=index===heroIndex;
  dot.classList.toggle("active",active);
  dot.setAttribute("aria-current",active?"true":"false");
  dot.setAttribute("aria-pressed",active?"true":"false");
 });
}
function renderHeroDots(){
 const container=$("hero-dots");
 if(!container)return;
 const dots=heroItems.map((item,index)=>{
  const dot=document.createElement("button");
  dot.type="button";
  dot.className="hero-dot";
  dot.setAttribute("aria-label","Shfaq "+title(item));
  dot.addEventListener("click",()=>{
   if(index===heroIndex)return;
   showHero(index);
   startHeroTimer();
  });
  return dot;
 });
 container.replaceChildren(...dots);
 updateHeroDots();
}
function showHero(index){
 if(!heroItems.length)return;
 heroIndex=(index+heroItems.length)%heroItems.length;
 updateHeroDots();
 const item=heroItems[heroIndex];
 const request=++showHero.requestId;
 restartHeroProgress();
 const nextLayer=heroLayer===0?1:0;
 const next=$(nextLayer===0?"hero-bg-a":"hero-bg-b");
 const current=$(heroLayer===0?"hero-bg-a":"hero-bg-b");
 const path=item.backdrop_path;
 if(!path){
  notice("Ky titull nuk ka fotografi horizontale për Hero.");
  return;
 }
 const originalUrl=IMG+"original"+path;
 const fallbackUrl=IMG+"w1280"+path;
 const hero=$("hero");
 const preload=new Image();
 preload.decoding="async";
 preload.onload=()=>commitHero(originalUrl);
 preload.onerror=()=>{
  if(request!==showHero.requestId)return;
  const fallback=new Image();
  fallback.decoding="async";
  fallback.onload=()=>commitHero(fallbackUrl);
  fallback.onerror=()=>{
   if(request!==showHero.requestId)return;
   notice("Fotografia e Hero nuk u ngarkua. Po ruaj titullin aktual për të shmangur mospërputhjen.");
  };
  fallback.src=fallbackUrl;
 };
 function commitHero(loadedUrl){
  if(request!==showHero.requestId)return;
  const image='url("'+loadedUrl+'")';
  next.style.backgroundImage=image;
  next.style.backgroundSize="cover";
  next.style.backgroundPosition=heroFocusPosition(item);
  next.style.setProperty("--hero-position",heroFocusPosition(item));
  next.style.backgroundColor="#202518";
  next.classList.add("active");
  current.classList.remove("active");
  heroLayer=nextLayer;
  hero.dataset.mediaType=kind(item);
  hero.style.backgroundImage="none";
  document.querySelector("header.topbar").style.setProperty("--header-art",image);
  const paletteImagePath="/t/p/"+(loadedUrl===originalUrl?"original":"w1280")+path;
  const paletteImageUrl="/api/tmdb-image.js?path="+encodeURIComponent(paletteImagePath);
  void updateAmbientScene(loadedUrl,paletteImageUrl,request);
  $("hero-content").classList.add("changing");
  clearTimeout(showHero.contentTimer);
  showHero.contentTimer=setTimeout(()=>{
   if(request!==showHero.requestId)return;
   const heading=$("hero-title"),logo=$("hero-title-logo");
   heading.textContent=title(item);
   // Artwork is the primary title treatment. The plain-text fallback stays
   // hidden until logo lookup confirms this title has no usable artwork.
   heading.hidden=true;
   logo.hidden=true;
   logo.removeAttribute("src");
   if(item.vote_average&&Number(item.vote_average)>0){
    $("hero-rating").textContent=Number(item.vote_average).toFixed(1);
    $("hero-rating-item").hidden=false;
   }else $("hero-rating-item").hidden=true;
   const releaseYear=year(item);
   $("hero-year").textContent=releaseYear;
   $("hero-year-item").hidden=!releaseYear;
   const genre=heroGenreLabel(item);
   $("hero-genre").textContent=genre;
   $("hero-genre-item").hidden=!genre;
   $("hero-eyebrow").hidden=true;
   $("hero-play").onclick=()=>{
    try{
     const result=play(item);
     if(result&&typeof result.catch==="function")result.catch(error=>notice(error.message||"Nuk u hap player-i."));
    }catch(error){notice(error.message||"Nuk u hap player-i.")}
   };
   $("hero-info").onclick=()=>openTitlePage(item,true,false);
   $("hero-add").onclick=()=>toggleHeroSaved(item);
   renderHeroSaveButton(item);
   void applyHeroLogo(item,request);
   $("hero-overview").textContent=item.overview||"Po përgatitet përshkrimi…";
   getAlbanianOverview(item,kind(item)).then(translated=>{
    if(request===showHero.requestId&&translated)$("hero-overview").textContent=translated;
   }).catch(()=>{});
   requestAnimationFrame(()=>$("hero-content").classList.remove("changing"));
  },180);
 }
 preload.src=originalUrl;
}
showHero.requestId=0;
function startHeroTimer(){
 clearInterval(heroTimer);
 if(heroItems.length<2||window.FlixPlayerFocus?.isActive()||$("player-modal")?.classList.contains("open"))return;
 restartHeroProgress();
 heroTimer=setInterval(()=>{if(!document.hidden&&!$("hero").hidden&&!$("player-modal").classList.contains("open"))showHero(heroIndex+1)},8000);
}

const WATCH_PROGRESS_KEY="flxtv:watch-progress:v2",LEGACY_WATCH_PROGRESS_KEY="flxtv:watch-progress:v1";
const WATCH_DB_NAME="flxtv-persistence",WATCH_DB_STORE="watch-progress";
let watchDbPromise=null,latestPlaybackTime=0,latestPlaybackDuration=0,lastProgressWrite=0;
function openWatchDb(){
 if(!("indexedDB" in window))return Promise.resolve(null);
 if(!watchDbPromise)watchDbPromise=new Promise(resolve=>{
  try{
   const request=indexedDB.open(WATCH_DB_NAME,1);
   request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(WATCH_DB_STORE))db.createObjectStore(WATCH_DB_STORE)};
   request.onsuccess=()=>resolve(request.result);
   request.onerror=()=>resolve(null);
   request.onblocked=()=>resolve(null);
  }catch(_){resolve(null)}
 });
 return watchDbPromise;
}
function readWatchProgress(){
 try{
  const current=JSON.parse(localStorage.getItem(profileProgressKey())||"null");
  if(current&&typeof current==="object")return current;
  const legacy=JSON.parse((activeWatchProfile.id==="main"?localStorage.getItem(LEGACY_WATCH_PROGRESS_KEY):null)||"{}");
  return legacy&&typeof legacy==="object"?legacy:{};
 }catch(_){return {}}
}
function writeWatchProgress(data){
 const serialized=JSON.stringify(data);
 try{localStorage.setItem(profileProgressKey(),serialized)}catch(error){console.warn("[FLIXTV] localStorage write failed; IndexedDB backup remains available",error)}
 openWatchDb().then(db=>{
  if(!db)return;
  try{const tx=db.transaction(WATCH_DB_STORE,"readwrite");tx.objectStore(WATCH_DB_STORE).put(data,activeWatchProfile.id);}catch(error){console.warn("[FLIXTV] IndexedDB progress backup failed",error)}
 });
}
async function restoreWatchProgress(){
 const local=readWatchProgress(),db=await openWatchDb();
 if(!db){renderContinueWatching();return}
 const saved=await new Promise(resolve=>{
  try{const request=db.transaction(WATCH_DB_STORE,"readonly").objectStore(WATCH_DB_STORE).get(activeWatchProfile.id);request.onsuccess=()=>resolve(request.result||{});request.onerror=()=>resolve({})}catch(_){resolve({})}
 });
 const merged={...saved,...local};
 for(const [key,value] of Object.entries(saved||{})){
  if(!merged[key]||(Number(value.updatedAt)||0)>(Number(merged[key].updatedAt)||0))merged[key]=value;
 }
 if(Object.keys(merged).length)writeWatchProgress(merged);
 renderContinueWatching();
 try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(()=>{})}catch(_){}
}
function progressId(item){return (kind(item)==="tv"?"tv:":"movie:")+String(item.id)}
function getSavedProgress(item){return readWatchProgress()[progressId(item)]||null}
function savePlaybackProgress(force=false){
 if(!currentPlayback||!currentPlayback.item||!currentPlayback.item.id)return;
 const now=Date.now();
 if(!force&&now-lastProgressWrite<5000)return;
 const duration=Number(latestPlaybackDuration),time=Number(latestPlaybackTime);
 if(!Number.isFinite(time)||time<0)return;
 const data=readWatchProgress(),key=progressId(currentPlayback.item);
 if(duration>0&&time/duration>=0.92){window.dispatchEvent(new CustomEvent("flxtv:playback-completed",{detail:{item:currentPlayback.item}}));delete data[key];writeWatchProgress(data);lastProgressWrite=now;renderContinueWatching();return}
 const item=currentPlayback.item;
 data[key]={
  id:item.id,mediaType:kind(item),title:title(item),
  poster_path:item.poster_path||"",backdrop_path:item.backdrop_path||"",
  currentTime:time,duration:Number.isFinite(duration)?duration:0,
  season:kind(item)==="tv"?Number(currentPlayback.season||1):null,
  episode:kind(item)==="tv"?Number(currentPlayback.episode||1):null,
  updatedAt:now
 };
 writeWatchProgress(data);lastProgressWrite=now;
}
function clearPlaybackProgress(item){
 if(!item)return;
 const data=readWatchProgress();delete data[progressId(item)];writeWatchProgress(data);renderContinueWatching();
}
function formatPlaybackTime(seconds){
 const value=Math.max(0,Math.floor(Number(seconds)||0)),h=Math.floor(value/3600),m=Math.floor((value%3600)/60),s=value%60;
 return h?String(h)+":"+String(m).padStart(2,"0")+":"+String(s).padStart(2,"0"):String(m)+":"+String(s).padStart(2,"0");
}
function continueWatchUrl(item,entry){
 const params=new URLSearchParams();
 if(entry.mediaType==="tv"){params.set("season",String(entry.season||1));params.set("episode",String(entry.episode||1))}
 params.set("t",String(Math.floor(entry.currentTime||0)));
 return pageUrl(item,true)+"?"+params.toString();
}
let continueEditMode=false,continueLibraryReturnFocus=null;
function continueEntryItem(entry){
 return {id:entry.id,media_type:entry.mediaType,title:entry.title,name:entry.title,poster_path:entry.poster_path||"",backdrop_path:entry.backdrop_path||""};
}
function createContinueWatchingCard(entry,editing=false){
 const item=continueEntryItem(entry);
 const shell=document.createElement("article");
 shell.className="continue-card-shell"+(editing?" is-editing":"");
 const button=document.createElement("button");
 button.type="button";
 button.className="continue-card";
 button.setAttribute("aria-label","Vazhdo shikimin: "+(entry.title||"Pa titull"));
 const image=document.createElement("img");
 image.loading="lazy";
 image.decoding="async";
 image.alt="";
 image.src=entry.backdrop_path?IMG+"w500"+entry.backdrop_path:(entry.poster_path?IMG+"w342"+entry.poster_path:"");
 const body=document.createElement("span");
 body.className="continue-card-copy";
 const name=document.createElement("strong");
 name.textContent=entry.title||"Pa titull";
 const detail=document.createElement("small");
 detail.textContent="S"+(entry.season||1)+" · E"+(entry.episode||1);
 const artwork=document.createElement("span");
 artwork.className="continue-card-art";
 const progress=document.createElement("span");
 progress.className="continue-progress continue-progress-on-poster";
 progress.setAttribute("role","progressbar");
 progress.setAttribute("aria-label","Përparimi i shikimit");
 const fill=document.createElement("i");
 const percent=entry.duration>0?Math.min(100,Math.max(0,entry.currentTime/entry.duration*100)):0;
 fill.style.width=percent+"%";
 progress.setAttribute("aria-valuemin","0");
 progress.setAttribute("aria-valuemax","100");
 progress.setAttribute("aria-valuenow",String(Math.round(percent)));
 progress.append(fill);
 artwork.append(image,progress);
 body.append(name);
 if(entry.mediaType==="tv")body.append(detail);
 button.append(artwork,body);
 button.onclick=()=>{
  if(continueEditMode)return;
  // Open the title in-app so the poster-to-detail transition is animated and
  // the previous Home scroll position remains available to the Back button.
  void openTitlePage(item,true,true,button).then(()=>history.replaceState(history.state,"",continueWatchUrl(item,entry)));
 };
 shell.append(button);
 if(editing){
  const remove=document.createElement("button");
  remove.type="button";
  remove.className="continue-card-remove";
  remove.setAttribute("aria-label","Hiq "+(entry.title||"titullin")+" nga historiku");
  remove.innerHTML='<i class="bi bi-x-lg" aria-hidden="true"></i>';
  remove.onclick=event=>{
   event.preventDefault();
   event.stopPropagation();
   clearPlaybackProgress(item);
  };
  shell.append(remove);
 }
 return shell;
}
function toggleContinueEdit(){
 continueEditMode=!continueEditMode;
 const buttons=[$("continue-edit"),$("continue-library-edit")].filter(Boolean);
 buttons.forEach(button=>{
  button.textContent=continueEditMode?"Done":"Edit";
  button.setAttribute("aria-pressed",String(continueEditMode));
  button.classList.toggle("is-editing",continueEditMode);
 });
 renderContinueWatching();
}
function openContinueLibrary(){
 continueLibraryReturnFocus=document.activeElement;
 renderContinueWatching();
 modal("continue-library-modal",true);
 requestAnimationFrame(()=>$("continue-library-close")?.focus());
}
function closeContinueLibrary(){
 if(!$("continue-library-modal").classList.contains("open"))return;
 modal("continue-library-modal",false);
 continueEditMode=false;
 renderContinueWatching();
 if(continueLibraryReturnFocus&&typeof continueLibraryReturnFocus.focus==="function")continueLibraryReturnFocus.focus();
 continueLibraryReturnFocus=null;
}
function renderContinueWatching(){
 const row=$("continue-watching"),section=$("continue-watching-section");
 if(!row||!section)return;
 const entries=Object.values(readWatchProgress())
  .filter(x=>x&&x.id&&x.currentTime>0&&(!x.duration||x.currentTime<x.duration*0.92))
  .sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0))
  .slice(0,40);
 const rowScroll=row.scrollLeft;
 row.replaceChildren(...entries.map(entry=>createContinueWatchingCard(entry,continueEditMode)));
 row.scrollLeft=rowScroll;
 section.hidden=!entries.length;
 const grid=$("continue-library-grid");
 if(grid){
  const gridScroll=grid.scrollTop;
  grid.replaceChildren(...entries.map(entry=>createContinueWatchingCard(entry,continueEditMode)));
  grid.scrollTop=gridScroll;
 }
 const empty=$("continue-library-empty");
 if(empty)empty.hidden=entries.length>0;
 const editButtons=[$("continue-edit"),$("continue-library-edit")].filter(Boolean);
 editButtons.forEach(button=>{
  if(button.id==="continue-edit"){
   button.innerHTML=continueEditMode?'<span>Done</span>':'<i class="bi bi-pencil" aria-hidden="true"></i>';
   button.setAttribute("aria-label",continueEditMode?"Përfundo redaktimin":"Redakto Continue Watching");
  }else{
   button.textContent=continueEditMode?"Done":"Edit";
  }
  button.setAttribute("aria-pressed",String(continueEditMode));
 });
}
/* Event-driven progress bridge. CineSRC emits playback events; no polling loop is needed. */
/* BingeAPI postMessage bridge. The iframe remains isolated; only documented playback events are forwarded. */
window.addEventListener("message",event=>{
  const frame=$("cinesrc-frame");
  if(!frame||event.source!==frame.contentWindow||event.origin!=="https://bingeapi.st")return;
  const payload=event.data;
  if(!payload||payload.source!=="bingeapi_player"||!payload.event)return;
  const info=payload.info;
  const dispatch=(type,data={})=>window.dispatchEvent(new CustomEvent("flxtv:cinesrc-event",{detail:{type,data}}));
  switch(payload.event){
    case "play":dispatch("play");break;
    case "pause":dispatch("pause");break;
    case "ended":dispatch("ended");break;
    case "time":{
      const currentTime=Number(info);
      if(Number.isFinite(currentTime)&&currentTime>=0)dispatch("timeupdate",{currentTime,duration:latestPlaybackDuration});
      break;
    }
    case "duration":{
      const duration=Number(info);
      if(Number.isFinite(duration)&&duration>0){latestPlaybackDuration=duration;dispatch("loadedmetadata",{duration});}
      break;
    }
    case "seek":{
      const currentTime=Number(info);
      if(Number.isFinite(currentTime)&&currentTime>=0)dispatch("seeked",{currentTime,duration:latestPlaybackDuration});
      break;
    }
    case "buffering":
      if(info===true)setPlayerStatus("Po ngarkohet videoja…");
      else clearPlayerStatus();
      break;
    case "serverchange":
      $("player-modal").dataset.bingeapiServer=String(info||"").slice(0,80);
      break;
    case "error":
      $("player-modal").dataset.playerState="error";
      setPlayerStatus(String(info||"BingeAPI raportoi një gabim gjatë riprodhimit."),true);
      dispatch("error",{message:String(info||"BingeAPI playback error")});
      break;
  }
});


function startPlaybackProgressTracking(){
  window.FlixPlaybackProgress?.start({
    onTimeUpdate(data,force){
      const time=Number(data?.currentTime),duration=Number(data?.duration);
      if(Number.isFinite(time)&&time>=0)latestPlaybackTime=time;
      if(Number.isFinite(duration)&&duration>0)latestPlaybackDuration=duration;
      renderExternalSubtitle(latestPlaybackTime);savePlaybackProgress(!!force);
    },
    onFlush(){savePlaybackProgress(true)},
    onEnded(){if(latestPlaybackDuration>0)latestPlaybackTime=latestPlaybackDuration;savePlaybackProgress(true)},
    onMetadata(data){const duration=Number(data?.duration);if(Number.isFinite(duration)&&duration>0)latestPlaybackDuration=duration}
  });
}
window.addEventListener("flxtv:cinesrc-event",event=>{
  const {type,data={}}=event.detail||{};if(!currentPlayback)return;
  if(type==="ready"){$("player-modal").dataset.playerState="ready";setPlayerStatus("")}
  else if(type==="play"){$("player-modal").dataset.playerState="playing";clearPlayerStatus()}
  else if(type==="pause")$("player-modal").dataset.playerState="paused";
  else if(type==="loadedmetadata"){const d=Number(data.duration);if(Number.isFinite(d)&&d>0)latestPlaybackDuration=d}
  else if(type==="error"){$("player-modal").dataset.playerState="error";setPlayerStatus(window.FlixPlayerErrors?.message(data)||"CineSRC raportoi një gabim gjatë riprodhimit.",true)}
  else if(type==="sourceused"){
    const sourceId=String(data.sourceId||"").trim().slice(0,128);
    if(sourceId){try{localStorage.setItem("flxtv:cinesrc:lastserver",sourceId)}catch(_){}}
    $("player-modal").dataset.cinesrcSource=sourceId;
  }else if(type==="skipintro"){
    const time=Number(data.time);if(Number.isFinite(time)&&time>=0){latestPlaybackTime=time;savePlaybackProgress(true)}
  }else if(type==="close"){returnToPlaybackTitlePage()}
});
window.addEventListener("flxtv:player-error",event=>{
  if(!currentPlayback)return;$("player-modal").dataset.playerState="error";
  setPlayerStatus(event.detail?.message||"Nuk mund të lidhemi me CineSRC.",true);
});


 const WATCH_PROFILES_KEY="flxtv:profiles:v1",ACTIVE_PROFILE_KEY="flxtv:active-profile:v1";
 const DEFAULT_PROFILES=[
  {id:"arta",name:"Arta",color:"linear-gradient(135deg,#ff5f6d,#b52a26)",letter:"A"},
  {id:"main",name:"Leon",color:"linear-gradient(135deg,#2f80ed,#14305c)",letter:"L"},
  {id:"eli",name:"Eli",color:"linear-gradient(135deg,#8a2be2,#3b1d78)",letter:"E"}
 ];
 const EMPTY_PROFILE={id:"__no_profile__",name:"Profile",color:"#555",letter:"+"};
 let watchProfiles=[],activeWatchProfile=EMPTY_PROFILE,profileManageMode=false;
 function loadWatchProfiles(){
  try{
   const saved=JSON.parse(localStorage.getItem(WATCH_PROFILES_KEY)||"[]");
   watchProfiles=Array.isArray(saved)?saved.filter(p=>p&&p.id&&p.name).slice(0,8):[];
  }catch(_){watchProfiles=[]}
  // Remove only the three profiles that were automatically seeded by the old build.
  watchProfiles=watchProfiles.filter(p=>!DEFAULT_PROFILES.some(d=>p.id===d.id&&p.name===d.name));
  watchProfiles.forEach(p=>{p.language=p.language==="en"?"en":"sq";if(p.avatarType==="monogram")p.avatarType="portrait"});
  let id="";try{id=localStorage.getItem(ACTIVE_PROFILE_KEY)||""}catch(_){}
  activeWatchProfile=watchProfiles.find(x=>x.id===id)||watchProfiles[0]||EMPTY_PROFILE;
  try{
   if(watchProfiles.length)localStorage.setItem(WATCH_PROFILES_KEY,JSON.stringify(watchProfiles));
   else localStorage.removeItem(WATCH_PROFILES_KEY);
   if(activeWatchProfile===EMPTY_PROFILE)localStorage.removeItem(ACTIVE_PROFILE_KEY);
   else localStorage.setItem(ACTIVE_PROFILE_KEY,activeWatchProfile.id);
  }catch(_){}
 }
 async function refreshProfileContent(){
  if(document.body.classList.contains("bf-reference-mode"))return;
  const pending=homeDataPromise;
  if(pending){try{await pending}catch(_){}}
  homeDataPromise=null;homeDataLoadedAt=0;
  titlePageCache.clear();titlePagePrefetches.clear();titleSeasonEpisodeCache.clear();
  if(typeof loadedPages!=="undefined")loadedPages.clear();
  const path=location.pathname.replace(/\/$/,"")||"/";
  if(path==="/sports"){await openPage("sports",false);return}
  if(path==="/" ){
   const page=document.querySelector("[data-page].active")?.dataset.page||"home";
   if(["home","movies","shows"].includes(page))await openPage(page,false);
   return;
  }
  if(titlePageItem&&!$("title-page").hidden)await openTitlePage({...titlePageItem},false,false);
 }
 function profileProgressKey(){return WATCH_PROGRESS_KEY+":"+activeWatchProfile.id;}
 function saveProfiles(){try{if(watchProfiles.length)localStorage.setItem(WATCH_PROFILES_KEY,JSON.stringify(watchProfiles));else localStorage.removeItem(WATCH_PROFILES_KEY);if(activeWatchProfile&&activeWatchProfile!==EMPTY_PROFILE)localStorage.setItem(ACTIVE_PROFILE_KEY,activeWatchProfile.id);else localStorage.removeItem(ACTIVE_PROFILE_KEY)}catch(_){notice("Nuk u ruajtën profilet në këtë pajisje.")}window.FlixLocale?.setLanguage(activeWatchProfile?.language||"sq");renderProfileButton();renderProfileCards();if(heroItems[heroIndex])renderHeroSaveButton(heroItems[heroIndex])}
 function ensureProfileUi(){
  if($("profile-switcher"))return;
  const button=document.createElement("button");button.id="profile-switcher";button.type="button";button.className="profile-switcher";button.hidden=true;button.setAttribute("aria-label","Profili aktiv");button.setAttribute("aria-haspopup","true");button.setAttribute("aria-expanded","false");document.body.append(button);
  const settingsButton=$("header-settings");if(settingsButton)settingsButton.onclick=toggleProfileMenu;
  const screen=document.createElement("section");screen.id="profile-picker";screen.className="profile-screen";screen.hidden=true;
  screen.innerHTML='<main class="profile-stage"><h1 class="profile-title">Who\'s watching?</h1><section class="profiles-grid" id="profile-picker-list"></section><button class="profile-manage" id="profile-manage" type="button">MANAGE PROFILES</button></main>';
  document.body.append(screen);
  $("profile-manage").onclick=toggleProfileManage;
  renderProfileButton();renderProfileCards();
 }
 function renderProfileButton(){
  const b=$("profile-switcher");if(!b)return;
  if(!activeWatchProfile||activeWatchProfile===EMPTY_PROFILE){b.hidden=true;return;}b.hidden=false;
  const profileIndex=Math.max(0,watchProfiles.findIndex(p=>p.id===activeWatchProfile.id));const portraitUrl="https://raw.githubusercontent.com/HoneyTyagii/Netflix-Clone/master/public/profile-"+(profileIndex+1)+".png";const avatar=activeWatchProfile.avatarType==="monogram"?escapeHtml(activeWatchProfile.letter||activeWatchProfile.name.slice(0,1).toUpperCase()):'<img src="'+portraitUrl+'" alt="" onerror="this.remove();this.parentElement.textContent=\''+escapeHtml(activeWatchProfile.letter||activeWatchProfile.name.slice(0,1).toUpperCase())+'\'">';b.innerHTML='<span class="profile-mini-avatar" style="--profile-color:'+escapeHtml(activeWatchProfile.color||"#e50914")+'">'+avatar+'</span>';b.title=activeWatchProfile.name;b.setAttribute("aria-label","Profili: "+activeWatchProfile.name);
 }
 function renderProfileCards(){
  const list=$("profile-picker-list");if(!list)return;list.replaceChildren();
  watchProfiles.slice(0,3).forEach((p,index)=>{
   const card=document.createElement("div");card.className="profile-tile"+(profileManageMode?" managing":"");card.tabIndex=0;card.setAttribute("role","button");card.setAttribute("aria-label","Profili "+p.name);
   const wrap=document.createElement("div");wrap.className="profile-avatar-wrap";
   const avatar=document.createElement("div");avatar.className="profile-avatar-art";avatar.style.background=p.color||["#1674b8","#e50914","#d6a52b"][index%3];if(p.avatarType==="monogram"){avatar.textContent=p.letter||p.name.slice(0,1).toUpperCase()}else{const portrait=document.createElement("img");portrait.src="https://raw.githubusercontent.com/HoneyTyagii/Netflix-Clone/master/public/profile-"+(index+1)+".png";portrait.alt=p.name;portrait.loading="eager";portrait.onerror=()=>{portrait.remove();avatar.textContent=p.letter||p.name.slice(0,1).toUpperCase()};avatar.append(portrait)}wrap.append(avatar);
   const name=document.createElement("span");name.className="profile-name";name.textContent=p.name;
   card.append(wrap,name);
   if(profileManageMode){const edit=document.createElement("span");edit.className="profile-edit-badge";edit.setAttribute("aria-hidden","true");edit.textContent="✎";wrap.append(edit)}
   const activate=()=>{
    if(profileManageMode){manageOneProfile(p);return}
    if(card.dataset.activating==="true")return;
    card.dataset.activating="true";
    const screen=$("profile-picker");
    const source=card.querySelector(".profile-avatar-art");
    const sourceRect=source?.getBoundingClientRect();
    const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let flight=null;
    if(source&&sourceRect&&!reduced){
      flight=source.cloneNode(true);
      flight.classList.add("profile-flight-avatar");
      Object.assign(flight.style,{position:"fixed",left:sourceRect.left+"px",top:sourceRect.top+"px",width:sourceRect.width+"px",height:sourceRect.height+"px",margin:"0",zIndex:"20003",pointerEvents:"none",transformOrigin:"top left"});
      document.body.append(flight);
    }
    const previousLanguage=activeWatchProfile?.language||"sq";
    activeWatchProfile=p;
    window.FlixLocale?.setLanguage(p.language||"sq");
    profileManageMode=false;
    saveProfiles();
    // Reveal the app behind the picker before the picker starts fading.
    // Otherwise the first-run visibility gate leaves a black screen underneath.
    document.documentElement.classList.add("profile-ready");
    const target=$("profile-switcher");
    const targetRect=target?.getBoundingClientRect();
    let finished=false;
    const finish=()=>{
      if(finished)return;
      finished=true;
      if(flight)flight.remove();
      if(screen){screen.getAnimations().forEach(animation=>animation.cancel());screen.style.opacity="";screen.hidden=true;}
      unlockProfileScreen();
      renderContinueWatching();
      restoreWatchProgress();
      if(previousLanguage!==(p.language||"sq"))void refreshProfileContent();
    };
    if(flight&&targetRect){
      const dx=targetRect.left-sourceRect.left;
      const dy=targetRect.top-sourceRect.top;
      const sx=targetRect.width/sourceRect.width;
      const sy=targetRect.height/sourceRect.height;
      const travel=flight.animate([
        {transform:"translate3d(0,0,0) scale(1)",opacity:1,offset:0},
        {transform:"translate3d("+Math.round(dx*.28)+"px,"+Math.round(dy*.22)+"px,0) scale(1.12)",opacity:1,offset:.38},
        {transform:"translate3d("+dx+"px,"+dy+"px,0) scale("+sx+","+sy+")",opacity:1,offset:1}
      ],{duration:420,easing:"cubic-bezier(.22,.75,.25,1)",fill:"forwards"});
      if(screen)screen.animate([{opacity:1},{opacity:0}],{duration:360,easing:"ease-out",fill:"forwards"});
      travel.finished.then(finish,finish);
    }else if(screen&&!reduced){
      screen.animate([{opacity:1},{opacity:0}],{duration:220,easing:"ease-out",fill:"forwards"}).finished.then(finish,finish);
    }else finish();
   };
   card.addEventListener("click",activate);card.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();activate()}});
   list.append(card);
  });
  if(watchProfiles.length<8){
   const add=document.createElement("div");add.className="profile-tile profile-add-tile";add.tabIndex=0;add.setAttribute("role","button");add.setAttribute("aria-label","Add Profile");
   add.innerHTML='<div class="profile-avatar-wrap"><div class="profile-avatar-art">+</div></div><span class="profile-name">Add Profile</span>';
   const addAction=()=>showAddProfileEditor(add);add.addEventListener("click",addAction);add.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();addAction()}});
   list.append(add);
  }
  const manage=$("profile-manage");if(manage){manage.textContent=profileManageMode?"DONE":"MANAGE PROFILES";manage.hidden=watchProfiles.length===0;}
 }
 function closeProfileMenu(){const menu=$("profile-menu");if(menu)menu.remove();const button=$("header-settings")||$("profile-switcher");if(button)button.setAttribute("aria-expanded","false")}
 function toggleProfileMenu(event){
  event&&event.stopPropagation();if($("profile-menu")){closeProfileMenu();return}
  const button=$("header-settings")||$("profile-switcher");if(!button)return;
  const menu=document.createElement("div");menu.id="profile-menu";menu.className="profile-menu";
  const heading=document.createElement("div");heading.className="profile-menu-heading";heading.textContent="Profile";menu.append(heading);
  watchProfiles.forEach(p=>{
   const item=document.createElement("button");item.type="button";item.className="profile-menu-item"+(p.id===activeWatchProfile.id?" active":"");
   const avatar=document.createElement("span");avatar.className="profile-menu-avatar";avatar.style.background=p.color||"#333";if(p.avatarType==="monogram"){avatar.textContent=p.letter||p.name.slice(0,1).toUpperCase()}else{const profileIndex=Math.max(0,watchProfiles.findIndex(x=>x.id===p.id));const portrait=document.createElement("img");portrait.src="https://raw.githubusercontent.com/HoneyTyagii/Netflix-Clone/master/public/profile-"+(profileIndex%3+1)+".png";portrait.alt="";portrait.loading="eager";portrait.onerror=()=>{portrait.remove();avatar.textContent=p.letter||p.name.slice(0,1).toUpperCase()};avatar.append(portrait)}
   const name=document.createElement("span");name.className="profile-menu-name";name.textContent=p.name;
   const check=document.createElement("span");check.className="profile-menu-check";check.textContent=p.id===activeWatchProfile.id?"✓":"";
   item.append(avatar,name,check);item.onclick=()=>{closeProfileMenu();if(p.id===activeWatchProfile.id)return;const previousLanguage=activeWatchProfile?.language||"sq";activeWatchProfile=p;window.FlixLocale?.setLanguage(p.language||"sq");saveProfiles();renderContinueWatching();restoreWatchProgress();if(previousLanguage!==(p.language||"sq"))void refreshProfileContent()};menu.append(item);
  });
  const divider=document.createElement("div");divider.className="profile-menu-divider";menu.append(divider);
  const add=document.createElement("button");add.type="button";add.className="profile-menu-action";add.textContent="+  Shto profil";add.onclick=()=>{closeProfileMenu();addWatchProfile()};menu.append(add);
  const manage=document.createElement("button");manage.type="button";manage.className="profile-menu-action";manage.textContent="Menaxho profilet";manage.onclick=()=>{closeProfileMenu();openProfilePicker()};menu.append(manage);
  document.body.append(menu);button.setAttribute("aria-expanded","true");
  const rect=button.getBoundingClientRect(),width=Math.min(280,window.innerWidth-24);
  menu.style.width=width+"px";menu.style.top=Math.min(rect.bottom+10,window.innerHeight-menu.offsetHeight-12)+"px";menu.style.right=Math.max(12,window.innerWidth-rect.right)+"px";
  setTimeout(()=>document.addEventListener("pointerdown",outsideProfileMenu,{once:true}),0);
 }
 function outsideProfileMenu(event){const menu=$("profile-menu"),button=$("header-settings")||$("profile-switcher");if(!menu)return;if(menu.contains(event.target)||button?.contains(event.target)){document.addEventListener("pointerdown",outsideProfileMenu,{once:true});return}closeProfileMenu()}
 function lockProfileScreen(){if(document.body.classList.contains("profile-screen-open"))return;const y=window.scrollY||window.pageYOffset||0;document.body.dataset.profileScrollY=String(y);document.body.style.top="-"+y+"px";document.body.classList.add("profile-screen-open")}
  function unlockProfileScreen(){if(!document.body.classList.contains("profile-screen-open"))return;const y=Number(document.body.dataset.profileScrollY||0);document.body.classList.remove("profile-screen-open");document.body.style.top="";delete document.body.dataset.profileScrollY;window.scrollTo(0,y)}
  function openProfilePicker(){
   ensureProfileUi();
   profileManageMode=false;
   renderProfileCards();
   const screen=$("profile-picker");
   screen.getAnimations().forEach(animation=>animation.cancel());
   screen.style.opacity="1";
   screen.hidden=false;
   lockProfileScreen();
   if(!window.matchMedia("(prefers-reduced-motion: reduce)").matches){
    const stage=screen.querySelector(".profile-stage");
    if(stage){
     stage.animate([{opacity:0,transform:"translateY(8px)"},{opacity:1,transform:"translateY(0)"}],{duration:240,easing:"cubic-bezier(.2,.8,.2,1)"});
    }
   }
  }
  function closeProfilePicker(){const p=$("profile-picker");if(p)p.hidden=true;unlockProfileScreen()}
  function toggleProfileManage(){profileManageMode=!profileManageMode;renderProfileCards()}
 function manageOneProfile(p){
  if(p.id==="main"&&watchProfiles.length===1){notice("Duhet të mbetet të paktën një profil.");return}
  const action=prompt("Shkruaj emrin e ri për "+p.name+". Për ta fshirë, shkruaj DELETE.",p.name);
  if(action===null)return;
  if(action.trim().toUpperCase()==="DELETE"){
   if(watchProfiles.length<=1){notice("Duhet të mbetet të paktën një profil.");return}
   if(p.id===activeWatchProfile.id){activeWatchProfile=watchProfiles.find(x=>x.id!==p.id)}
   watchProfiles=watchProfiles.filter(x=>x.id!==p.id);saveProfiles();renderContinueWatching();return;
  }
  if(action.trim()){p.name=action.trim().slice(0,24);p.letter=p.name.slice(0,1).toUpperCase();saveProfiles()}
 }
 function showAddProfileEditor(tile,presetName=""){
  if(watchProfiles.length>=8){notice("Mund të krijosh deri në 8 profile.");return}
  if(tile.dataset.editorOpen==="true"&&tile.dataset.editorStep==="name")return;
  tile.dataset.editorOpen="true";tile.dataset.editorStep="name";tile.dataset.noI18n="true";
  tile.classList.add("profile-add-editing");tile.removeAttribute("role");tile.removeAttribute("tabindex");
  const uiLang=window.FlixLocale?.getLanguage?.()||"sq";
  const placeholder=uiLang==="en"?"Profile name":"Emri i profilit";
  const nextLabel=uiLang==="en"?"CONTINUE":"VAZHDO",cancelLabel=uiLang==="en"?"CANCEL":"ANULO";
  tile.innerHTML='<div class="profile-avatar-wrap"><div class="profile-avatar-art profile-add-preview" aria-label="Profile avatar"><svg class="profile-add-glyph" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="17" r="8" fill="currentColor"/><path d="M8 41c1.8-9 7.2-13.5 16-13.5S38.2 32 40 41" fill="currentColor"/></svg><span class="profile-add-initial" hidden></span></div></div><input class="profile-name-input" id="new-profile-name" type="text" name="profile-name" placeholder="'+placeholder+'" aria-label="'+placeholder+'" maxlength="24" autocomplete="off" autocapitalize="words" spellcheck="false" inputmode="text" enterkeyhint="next"><div class="profile-add-actions"><button type="button" class="profile-add-next" disabled>'+nextLabel+'</button><button type="button" class="profile-add-cancel">'+cancelLabel+'</button></div>';
  const input=tile.querySelector("#new-profile-name"),initial=tile.querySelector(".profile-add-initial"),glyph=tile.querySelector(".profile-add-glyph"),next=tile.querySelector(".profile-add-next");
  if(presetName)input.value=String(presetName).slice(0,24);
  const sync=()=>{const value=input.value.trim();initial.textContent=value.slice(0,1).toUpperCase();initial.hidden=!value;glyph.hidden=!!value;next.disabled=!value};
  sync();
  const advance=()=>{if(!input.value.trim()){input.focus();return}showProfileLanguageStep(tile,input.value)};
  input.addEventListener("input",sync);
  input.addEventListener("keydown",event=>{event.stopPropagation();if(event.key==="Enter"){event.preventDefault();advance()}if(event.key==="Escape"){event.preventDefault();cancelAddProfileEditor()}});
  next.addEventListener("click",advance);tile.querySelector(".profile-add-cancel").addEventListener("click",cancelAddProfileEditor);
  try{input.focus({preventScroll:true})}catch(_){input.focus()}
 }
 function showProfileLanguageStep(tile,rawName){
  const name=String(rawName||"").trim().replace(/\s+/g," ").slice(0,24);if(!name)return;
  const uiLang=window.FlixLocale?.getLanguage?.()||"sq",isEn=uiLang==="en";
  const initial=escapeHtml(name.slice(0,1).toUpperCase());
  tile.dataset.editorStep="language";
  tile.innerHTML='<div class="profile-avatar-wrap"><div class="profile-avatar-art profile-add-preview"><span class="profile-add-initial">'+initial+'</span></div></div><div class="profile-language-name">'+escapeHtml(name)+'</div><div class="profile-language-heading">'+(isEn?"PROFILE LANGUAGE":"GJUHA E PROFILIT")+'</div><div class="profile-language-options" role="radiogroup" aria-label="'+(isEn?"Choose profile language":"Zgjidh gjuhën e profilit")+'"><button type="button" class="profile-language-option" data-profile-language="sq" role="radio" aria-checked="false"><span class="profile-language-flag" aria-hidden="true">🇦🇱</span><span class="profile-language-copy"><strong>Shqip</strong><small>'+(isEn?"Albanian interface and subtitles":"Ndërfaqe dhe titra shqip")+'</small></span><span class="profile-language-check" aria-hidden="true">✓</span></button><button type="button" class="profile-language-option" data-profile-language="en" role="radio" aria-checked="false"><span class="profile-language-flag" aria-hidden="true">🇬🇧</span><span class="profile-language-copy"><strong>English</strong><small>'+(isEn?"English interface and subtitles":"Ndërfaqe dhe titra anglisht")+'</small></span><span class="profile-language-check" aria-hidden="true">✓</span></button></div><div class="profile-add-actions"><button type="button" class="profile-add-save" disabled>'+(isEn?"CREATE PROFILE":"KRIJO PROFILIN")+'</button><button type="button" class="profile-add-cancel">'+(isEn?"BACK":"KTHEHU")+'</button></div>';
  let selectedLanguage="";const save=tile.querySelector(".profile-add-save");
  tile.querySelectorAll("[data-profile-language]").forEach(option=>option.addEventListener("click",()=>{
   selectedLanguage=option.dataset.profileLanguage;
   tile.querySelectorAll("[data-profile-language]").forEach(item=>{const active=item===option;item.classList.toggle("selected",active);item.setAttribute("aria-checked",String(active))});
   save.disabled=false;
  }));
  save.addEventListener("click",()=>{if(selectedLanguage)createWatchProfile(name,tile,selectedLanguage)});
  tile.querySelector(".profile-add-cancel").addEventListener("click",()=>showAddProfileEditor(tile,name));
 }
 function cancelAddProfileEditor(){
  renderProfileCards();
  const addTile=$("profile-picker-list")?.querySelector(".profile-add-tile");
  addTile?.focus();
 }
 function createWatchProfile(rawName,tile,language="sq"){
  const name=String(rawName||"").trim().replace(/\s+/g," ").slice(0,24);
  if(!name){const input=tile?.querySelector(".profile-name-input");input?.focus();return}
  if(watchProfiles.length>=8){notice("Mund të krijosh deri në 8 profile.");renderProfileCards();return}
  const colors=["linear-gradient(135deg,#ff5f6d,#b52a26)","linear-gradient(135deg,#2f80ed,#14305c)","linear-gradient(135deg,#8a2be2,#3b1d78)","linear-gradient(135deg,#16a085,#075e54)","linear-gradient(135deg,#d97706,#78350f)","linear-gradient(135deg,#db4b9b,#831843)"];
  const previousLanguage=activeWatchProfile?.language||"sq";
  const p={id:"p"+Date.now().toString(36),name,color:colors[watchProfiles.length%colors.length],letter:name.slice(0,1).toUpperCase(),avatarType:"portrait",language:language==="en"?"en":"sq"};
  watchProfiles.push(p);activeWatchProfile=p;saveProfiles();renderContinueWatching();closeProfileMenu();
  if(!document.documentElement.classList.contains("profile-ready")){
   const screen=$("profile-picker");if(screen)screen.hidden=true;
   unlockProfileScreen();document.documentElement.classList.add("profile-ready");
  }else{
   renderProfileCards();
  }
  if(previousLanguage!==(p.language||"sq"))void refreshProfileContent();
 }

 
function createTop10Card(item,rank){
 const button=document.createElement("button");
 button.type="button";
 button.className="top10-card";
 button.setAttribute("aria-label","Numri "+rank+": "+title(item));
 const media=document.createElement("span");media.className="top10-media";
 const number=document.createElement("span");
 number.className="top10-rank"+(rank>=10?" is-double-digit":"");number.setAttribute("aria-hidden","true");number.textContent=String(rank);
 const art=document.createElement("span");art.className="top10-art";
 const image=document.createElement("img");
 image.className="top10-poster";image.loading="lazy";image.decoding="async";
 image.fetchPriority="low";image.alt="";image.src=IMG+"w342"+item.poster_path;
 const overlay=document.createElement("span");overlay.className="top10-overlay";
 const playIcon=document.createElement("span");playIcon.className="top10-play";
 playIcon.innerHTML='<i class="bi bi-play-fill" aria-hidden="true"></i>';
 const name=document.createElement("strong");name.textContent=title(item);
 const meta=document.createElement("small");
 const rating=Number(item.vote_average);
 meta.textContent=[year(item),rating>0?"★ "+rating.toFixed(1):""].filter(Boolean).join(" · ");
 overlay.append(playIcon,name,meta);art.append(image,overlay);media.append(number,art);
 const caption=document.createElement("span");caption.className="top10-caption";
 caption.textContent=title(item);
 button.append(media,caption);
 button.onclick=event=>{
  if(event.target&&event.target.closest&&event.target.closest(".top10-play")){
   try{const result=play(item);if(result&&typeof result.catch==="function")result.catch(error=>notice(error.message||"Nuk u hap player-i."))}
   catch(error){notice(error.message||"Nuk u hap player-i.")}
   return;
  }
  openTitlePage(item,true,false,button);
 };
 return button;
}
async function loadHomeTop10(){
 const container=$("top10-today");
 if(!container)return [];
 container.innerHTML='<div class="service-loading">Po ngarkohet renditja ditore…</div>';
 try{
  const data=await tmdb("/trending/all/day?language="+(activeWatchProfile?.language==="en"?"en-US":"sq-AL"));
  const ranked=(data.results||[]).slice(0,10).map((item,index)=>({item,rank:index+1}));
  const visible=ranked.filter(entry=>entry.item&&entry.item.poster_path);
  if(!visible.length){
   container.innerHTML='<div class="service-loading">Renditja ditore nuk është e disponueshme.</div>';
   return [];
  }
  container.replaceChildren(...visible.map(entry=>createTop10Card(entry.item,entry.rank)));
  return visible.map(entry=>entry.item);
 }catch(error){
  container.innerHTML='<div class="service-loading">Renditja Top 10 nuk u ngarkua.</div>';
  console.warn("[FLIXTV] Daily Top 10 failed",error);
  return [];
 }
}
function scrollHomeCarousel(id,direction=1){
 const node=$(id);
 if(!node)return;
 const distance=Math.max(node.clientWidth*.78,180)*direction;
 node.scrollBy({left:distance,behavior:"smooth"});
}
async function home(){
 renderContinueWatching();
 $("catalog").hidden=false;
 $("search-page").hidden=true;
 $("hero").hidden=false;
 if(homeDataPromise)return homeDataPromise;
 if(homeDataLoadedAt&&Date.now()-homeDataLoadedAt<5*60*1000){
  if(heroItems.length>1)startHeroTimer();
  return;
 }
 const load=(async()=>{
  await Promise.all([
   row("trending-movies","/trending/movie/week",createTrendingMovieCard),
   loadHomeTop10(),
   row("movies","/movie/popular"),
   row("shows","/tv/popular"),
   row("home-top-movies","/movie/top_rated"),
   row("home-action-adventure","/discover/movie?with_genres=28,12&sort_by=popularity.desc"),
   row("home-comedy-romance","/discover/movie?with_genres=35,10749&sort_by=popularity.desc"),
   row("home-crime-thriller","/discover/movie?with_genres=80,53&sort_by=popularity.desc"),
   row("home-scifi-fantasy","/discover/movie?with_genres=878,14&sort_by=popularity.desc"),
   row("home-trending-shows","/trending/tv/week"),
   row("home-action-fantasy-shows","/discover/tv?with_genres=10759,10765&sort_by=popularity.desc")
  ]);
  try{
   let data=await tmdb("/trending/all/week");
   let candidates=(data&&data.results)||[];
   heroItems=candidates.filter(item=>(item.media_type==="movie"||item.media_type==="tv")&&item.backdrop_path).slice(0,8);
   if(!heroItems.length){
    data=await tmdb("/movie/popular");
    candidates=(data&&data.results)||[];
    heroItems=candidates.filter(item=>item.backdrop_path).slice(0,8);
   }
   renderHeroDots();
   if(heroItems.length){
    showHero(0);
    startHeroTimer();
   }else{
    $("hero").style.backgroundImage="linear-gradient(135deg,#202938,#090b10)";
    $("hero-title").textContent="Discover something great.";
    $("hero-overview").textContent="Movies and series, all in one place.";
    notice("Katalogu nuk ktheu tituj të përzgjedhur.");
   }
  }catch(error){
   $("hero").style.backgroundImage="linear-gradient(135deg,#202938,#090b10)";
   notice(error.message);
  }
 })();
 homeDataPromise=load;
 try{
  await load;
  homeDataLoadedAt=Date.now();
 }finally{
  if(homeDataPromise===load)homeDataPromise=null;
 }
}

function titleSlug(value){return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^\p{L}\p{N}]+/gu,"-").replace(/^-|-$/g,"")}
let titlePageItem=null,titlePageSeason=1,titlePageEpisode=1,titleEpisodesRequest=0;
function pageUrl(item,play=false){const slug=titleSlug(title(item))||"title";const type=kind(item);return "/"+slug+"--"+type+"-"+String(item.id)+(play?"/play":"")}
const titlePagePrefetches=new Map();
const titlePageCache=new Map();
const TITLE_PAGE_CACHE_TTL=6*60*60*1000;
const TITLE_PAGE_MEMORY_LIMIT=24;
function titleDetailsKey(item){return kind(item)+":"+String(item.id)+":"+(activeWatchProfile?.language==="en"?"en":"sq")}
function cacheTitleDetails(key,data){
 titlePageCache.delete(key);
 titlePageCache.set(key,data);
 while(titlePageCache.size>TITLE_PAGE_MEMORY_LIMIT){
  titlePageCache.delete(titlePageCache.keys().next().value);
 }
 return data;
}
function readTitleDetailsCache(item){
 try{
  const cached=JSON.parse(localStorage.getItem("flxtv:title:"+titleDetailsKey(item))||"null");
  if(!cached||!cached.data||Date.now()-Number(cached.savedAt||0)>TITLE_PAGE_CACHE_TTL)return null;
  return cached.data;
 }catch(_){return null}
}
function storeTitleDetailsCache(item,data){
 const key=titleDetailsKey(item);
 cacheTitleDetails(key,data);
 // Persist the potentially large TMDB payload when the main thread is idle,
 // rather than blocking the title-page transition and its first paint.
 const persist=()=>{
  try{
   if(titlePageCache.get(key)!==data)return;
   localStorage.setItem("flxtv:title:"+key,JSON.stringify({savedAt:Date.now(),data}));
  }catch(_){}
 };
 if("requestIdleCallback" in window)requestIdleCallback(persist,{timeout:1800});
 else setTimeout(persist,250);
}
function prefetchTitle(item){
 if(!item||!item.id)return Promise.resolve(null);
 const key=titleDetailsKey(item);
 if(titlePageCache.has(key)){
  const cached=titlePageCache.get(key);
  cacheTitleDetails(key,cached);
  return Promise.resolve(cached);
 }
 if(titlePagePrefetches.has(key))return titlePagePrefetches.get(key);
 const stored=readTitleDetailsCache(item);
 if(stored)return Promise.resolve(cacheTitleDetails(key,stored));
 const request=tmdb("/"+kind(item)+"/"+item.id+"?append_to_response=videos,credits,external_ids&include_video_language=en,null")
  .then(data=>{
   if(data&&data.id)storeTitleDetailsCache(item,data);
   titlePagePrefetches.delete(key);
   return data;
  })
  .catch(error=>{titlePagePrefetches.delete(key);throw error});
 titlePagePrefetches.set(key,request);
 return request;
}
function navigateToTitle(item){
 if(!item||!item.id)return;
 // Use the same navigation path as every in-app title card so the previous
 // page, scroll position and active tab are saved for the detail Back button.
 openTitlePage(item,location.pathname!==pageUrl(item),false);
}
let titleYoutubePlayer=null;
function setTitleYoutubeButton(playing){
 const button=document.querySelector(".yt-play-toggle");if(!button)return;
 button.innerHTML=playing
  ?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/></svg>'
  :'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>';
 button.setAttribute("aria-label",playing?"Pusho videon":"Luaj videon");
 button.setAttribute("aria-pressed",String(!playing));
}
function setTitleYoutubeMuteButton(muted){
 const button=document.querySelector(".yt-mute-toggle");if(!button)return;
 button.innerHTML=muted
  ?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="m16 9 5 6m0-6-5 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
  :'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 9a5 5 0 0 1 0 6m2.5-8.5a8.5 8.5 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
 button.setAttribute("aria-label",muted?"Aktivizo zërin":"Çaktivizo zërin");
 button.setAttribute("aria-pressed",String(!muted));
}
function initTitleYoutubeControls(){
 const host=$("yt-title-trailer"),playButton=document.querySelector(".yt-play-toggle"),muteButton=document.querySelector(".yt-mute-toggle");
 if(!host||!playButton||!muteButton)return;
 let player=null,playing=true,muted=true;
 const updatePlay=()=>setTitleYoutubeButton(playing);
 const updateMute=()=>setTitleYoutubeMuteButton(muted);
 const getPlayer=async()=>{
  if(player)return player;
  if(typeof host.getYTPlayer!=="function")throw new Error("Lite YouTube API nuk u ngarkua");
  player=await host.getYTPlayer();
  if(!player)throw new Error("YouTube player nuk u krijua");
  titleYoutubePlayer=player;
  try{player.mute()}catch(_){}
  muted=true;updateMute();
  return player;
 };
 playButton.onclick=async event=>{
  event.preventDefault();event.stopPropagation();
  try{const p=await getPlayer();if(playing){p.pauseVideo();playing=false}else{p.playVideo();playing=true}updatePlay()}
  catch(error){console.warn("Lite YouTube playback command failed",error)}
 };
 muteButton.onclick=async event=>{
  event.preventDefault();event.stopPropagation();
  try{const p=await getPlayer();if(muted){p.unMute();muted=false;if(p.getPlayerState()!==1)p.playVideo()}else{p.mute();muted=true}updateMute()}
  catch(error){console.warn("Lite YouTube audio command failed",error)}
 };
 updatePlay();updateMute();
 const activate=()=>{
  host.click();
  getPlayer().then(p=>{try{p.mute();muted=true;updateMute();p.playVideo();playing=true;updatePlay()}catch(_){} })
   .catch(error=>console.warn("Lite YouTube initialization failed",error));
 };
 if(customElements.get("lite-youtube"))activate();
 else customElements.whenDefined("lite-youtube").then(activate);
}
function movieTitlePageMarkup(d){
 const genres=(d.genres||[]).slice(0,4);
 const director=(d.credits?.crew||[]).find(person=>person.job==="Director");
 const cast=(d.credits?.cast||[]).slice(0,12);
 const companies=(d.production_companies||[]).filter(company=>company.logo_path).slice(0,3);
 const runtime=Number(d.runtime)||0;
 const hours=Math.floor(runtime/60),minutes=runtime%60;
 const duration=runtime?(hours?hours+"h ":"")+minutes+"m":"—";
 const release=d.release_date?new Date(d.release_date+"T12:00:00").toLocaleDateString(activeWatchProfile?.language==="en"?"en-US":"sq-AL",{month:"long",day:"numeric",year:"numeric"}):"—";
 const backdrop=d.backdrop_path?IMG+"original"+d.backdrop_path:(d.poster_path?IMG+"w780"+d.poster_path:"");
 const certification=""; 
 const logoFallback='<span class="movie-detail-title-fallback">'+escapeHtml(title(d))+'</span>';
 return '<div class="movie-detail-page">'+
  '<div class="movie-detail-ambient" aria-hidden="true"><img class="movie-detail-ambient-image" src="'+escapeHtml(backdrop)+'" alt="" loading="eager" decoding="async"></div>'+
  '<section class="movie-detail-hero">'+
   '<div class="movie-detail-backdrop"><img class="movie-detail-backdrop-image" src="'+escapeHtml(backdrop)+'" alt="" aria-hidden="true" fetchpriority="high" decoding="async"></div>'+
   '<div class="movie-detail-shade"></div>'+
   '<div class="movie-detail-copy">'+
    '<div class="movie-detail-logo-wrap" id="movie-detail-logo">'+logoFallback+'</div>'+
    '<div class="movie-detail-genres">'+genres.map(g=>'<span>'+escapeHtml(g.name)+'</span>').join('<i>·</i>')+'</div>'+
    '<div class="movie-detail-actions">'+
     '<button class="movie-detail-play" id="title-play"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.8v14.4L19 12z" fill="currentColor"/></svg><span>Play</span></button>'+
     '<button class="movie-detail-round" id="movie-detail-save" aria-label="Add to My List"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button>'+
     '<button class="movie-detail-round" id="movie-detail-trailer" aria-label="Watch trailer"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4.5" width="18" height="15" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="m10 8.5 5.5 3.5-5.5 3.5z" fill="currentColor" stroke="none"/></svg></button>'+
    '</div>'+
    '<div class="movie-detail-meta"><span>'+escapeHtml(String(d.release_date||"").slice(0,4)||"—")+'</span><span>'+escapeHtml(duration)+'</span><span class="movie-detail-cert" id="movie-detail-cert">—</span><span class="movie-detail-rating"><b>★</b> '+(d.vote_average?Number(d.vote_average).toFixed(1):"—")+'</span></div>'+
    (director?'<div class="movie-detail-director"><span>Director:</span> '+escapeHtml(director.name)+'</div>':'')+
    '<div class="movie-detail-overview-wrap"><p class="movie-detail-overview collapsed" id="title-overview">'+escapeHtml(d.overviewSq||d.overview||"")+'</p><button type="button" class="movie-detail-readmore" id="overview-more" aria-expanded="false">Read more</button></div>'+
   '</div>'+
   '<div class="movie-detail-facts" aria-label="Movie information">'+
    '<div><span>Runtime</span><strong>'+escapeHtml(duration)+' <i id="movie-detail-endtime"></i></strong></div>'+
    '<div><span>Language</span><strong id="movie-detail-language">'+escapeHtml((d.original_language||"en").toUpperCase()==="EN"?"English":String(d.original_language||"").toUpperCase())+'</strong></div>'+
    '<div><span>Release Date</span><strong>'+escapeHtml(release)+'</strong></div>'+
   '</div>'+
   '<div class="movie-detail-studios" id="movie-detail-studios">'+companies.slice(0,3).map(company=>'<img loading="lazy" src="'+IMG+'w300'+company.logo_path+'" alt="'+escapeHtml(company.name)+'" decoding="async">').join("")+'</div>'+
  '</section>'+
  '<section class="movie-detail-section movie-detail-cast-section" id="movie-detail-cast-section"><h2>Cast</h2><div class="movie-detail-cast-row">'+cast.map(person=>'<article class="movie-detail-cast-card">'+(person.profile_path?'<img loading="lazy" decoding="async" src="'+IMG+'w185'+person.profile_path+'" alt="'+escapeHtml(person.name)+'">':'<div class="movie-detail-cast-placeholder"></div>')+'<strong>'+escapeHtml(person.name||"")+'</strong><span>'+escapeHtml(person.character||"")+'</span></article>').join("")+'</div></section>'+
  '<section class="movie-detail-section movie-detail-trailers-section" id="movie-trailers"><h2>Trailers</h2><div class="movie-detail-trailer-row" id="movie-detail-trailer-row"><div class="movie-detail-loading">Loading trailers…</div></div></section>'+
  '<section class="movie-detail-section movie-detail-similar-section" id="movie-similar"><h2>You Might Also Like</h2><div class="movie-detail-similar-row" id="movie-detail-similar-row"><div class="movie-detail-loading">Loading recommendations…</div></div></section>'+
 '</div>';
}
function titlePageMarkup(item,d,playMode=false){
 if(kind(d)!=="tv")return movieTitlePageMarkup(d);
 return seriesTitlePageMarkup(d,playMode);
}
function seriesTitlePageMarkup(d,playMode=false){
 const backdrop=d.backdrop_path?IMG+"original"+d.backdrop_path:(d.poster_path?IMG+"w780"+d.poster_path:"");
 const genres=(d.genres||[]).slice(0,4),cast=(d.credits?.cast||[]).slice(0,12);
 const seasons=(d.seasons||[]).filter(x=>Number(x.season_number)>=0);
 const firstAir=d.first_air_date?new Date(d.first_air_date+"T12:00:00").toLocaleDateString(activeWatchProfile?.language==="en"?"en-US":"sq-AL",{month:"long",day:"numeric",year:"numeric"}):"—";
 const lastAir=d.last_air_date?new Date(d.last_air_date+"T12:00:00").toLocaleDateString(activeWatchProfile?.language==="en"?"en-US":"sq-AL",{month:"long",day:"numeric",year:"numeric"}):"—";
 const years=(d.first_air_date||"").slice(0,4)+(d.last_air_date?"–"+String(d.last_air_date).slice(0,4):d.status==="Ended"?"":"–");
 const rating=d.vote_average?Number(d.vote_average).toFixed(1):"—";
 const runtime=(d.episode_run_time||[]).find(x=>Number(x)>0);
 const creators=(d.created_by||[]).map(x=>x.name).filter(Boolean);
 const network=(d.networks||[]).find(x=>x.logo_path);
 const saved=getSavedProgress(titlePageItem||d);
 const resumeLabel=saved&&Number(saved.currentTime)>5&&(!saved.duration||Number(saved.currentTime)<Number(saved.duration)*.92)?"Resume S"+(saved.season||titlePageSeason)+" E"+(saved.episode||titlePageEpisode):"Play S"+titlePageSeason+" E"+titlePageEpisode;
 const logoFallback='<span class="movie-detail-title-fallback">'+escapeHtml(title(d))+'</span>';
 return '<div class="series-detail-page movie-detail-page">'+
  '<div class="movie-detail-ambient" aria-hidden="true"><img class="movie-detail-ambient-image" src="'+escapeHtml(backdrop)+'" alt="" loading="eager" decoding="async"></div>'+
  '<section class="movie-detail-hero series-detail-hero">'+
   '<div class="movie-detail-backdrop"><img class="movie-detail-backdrop-image" src="'+escapeHtml(backdrop)+'" alt="" aria-hidden="true" fetchpriority="high" decoding="async"></div>'+
   '<div class="movie-detail-shade"></div>'+
   '<div class="movie-detail-copy">'+
    '<div class="movie-detail-logo-wrap" id="series-detail-logo">'+logoFallback+'</div>'+
    '<div class="movie-detail-genres">'+genres.map(g=>'<span>'+escapeHtml(g.name)+'</span>').join('<i>·</i>')+'</div>'+
    '<div class="movie-detail-actions">'+
     '<button class="movie-detail-play" id="title-play"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.8v14.4L19 12z" fill="currentColor"/></svg><span>'+escapeHtml(resumeLabel)+'</span></button>'+
     '<button class="movie-detail-round" id="series-detail-save" aria-label="Add to My List"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button>'+
     '<button class="movie-detail-round" id="series-detail-trailer" aria-label="Watch trailer"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4.5" width="18" height="15" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="m10 8.5 5.5 3.5-5.5 3.5z" fill="currentColor" stroke="none"/></svg></button>'+
    '</div>'+
    '<div class="movie-detail-meta"><span>'+escapeHtml(years||"—")+'</span><span class="movie-detail-cert">'+escapeHtml(d.content_ratings?.results?.find(x=>x.iso_3166_1==="US")?.rating||"TV")+'</span><span class="movie-detail-rating"><b>★</b> '+rating+'</span></div>'+
    (creators.length?'<div class="movie-detail-director"><span>Created by:</span> '+escapeHtml(creators.join(", "))+'</div>':'')+
    '<div class="movie-detail-overview-wrap"><p class="movie-detail-overview collapsed" id="title-overview">'+escapeHtml(d.overviewSq||d.overview||"Description unavailable.")+'</p><button type="button" class="movie-detail-readmore" id="overview-more" aria-expanded="false">Read more</button></div>'+
   '</div>'+
   '<div class="movie-detail-facts series-detail-facts" aria-label="Series information">'+
    '<div><span>Status</span><strong>'+escapeHtml(d.status||"—")+'</strong></div>'+
    '<div><span>Language</span><strong id="series-detail-language">'+escapeHtml(languageDisplayName(d.original_language))+'</strong></div>'+
    '<div><span>First Aired</span><strong>'+escapeHtml(firstAir)+'</strong></div>'+
    '<div><span>Last Aired</span><strong>'+escapeHtml(lastAir)+'</strong></div>'+
    '<div><span>Seasons</span><strong>'+Number(d.number_of_seasons||seasons.length||0)+'</strong></div>'+
    '<div><span>Episodes</span><strong>'+Number(d.number_of_episodes||0)+'</strong></div>'+
   '</div>'+
   '<div class="movie-detail-studios series-detail-networks" id="series-detail-networks">'+(network&&network.logo_path?'<img loading="lazy" src="'+IMG+'w300'+network.logo_path+'" alt="'+escapeHtml(network.name)+'" decoding="async">':'')+'</div>'+
  '</section>'+
  '<section class="movie-detail-section series-season-section" id="series-season-section">'+
   '<div class="series-season-heading"><button type="button" class="series-season-trigger" id="series-season-trigger"><span id="series-season-label">Season '+titlePageSeason+'</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button><button type="button" class="movie-detail-round series-seen-all" id="series-seen-all" aria-label="Mark all episodes as watched"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="2.8" fill="none" stroke="currentColor" stroke-width="1.8"/></svg></button></div>'+
   '<div class="series-season-menu" id="series-season-menu" hidden>'+seasons.map(x=>'<button type="button" class="series-season-option '+(Number(x.season_number)===Number(titlePageSeason)?'active':'')+'" data-season="'+Number(x.season_number)+'">'+(x.poster_path?'<img loading="lazy" src="'+IMG+'w92'+x.poster_path+'" alt="" decoding="async">':'<span class="series-season-poster-fallback">S'+Number(x.season_number)+'</span>')+'<span><strong>'+escapeHtml(x.name||("Season "+x.season_number))+'</strong><small>'+Number(x.episode_count||0)+' episodes</small></span>'+(Number(x.season_number)===Number(titlePageSeason)?'<b>✓</b>':'')+'</button>').join('')+'</div>'+
   '<select id="title-season" class="series-season-native" aria-label="Choose season">'+seasons.map(x=>'<option value="'+x.season_number+'" '+(Number(x.season_number)===Number(titlePageSeason)?'selected':'')+'>'+escapeHtml(x.name||("Season "+x.season_number))+'</option>').join('')+'</select>'+
   '<div id="title-episode-list" class="series-episode-list movie-detail-cast-row"><div class="movie-detail-loading">Loading episodes…</div></div>'+
  '</section>'+
  (cast.length?'<section class="movie-detail-section movie-detail-cast-section" id="movie-detail-cast-section"><h2>Cast</h2><div class="movie-detail-cast-row">'+cast.map(person=>'<article class="movie-detail-cast-card">'+(person.profile_path?'<img loading="lazy" decoding="async" src="'+IMG+'w185'+person.profile_path+'" alt="'+escapeHtml(person.name)+'">':'<div class="movie-detail-cast-placeholder"></div>')+'<strong>'+escapeHtml(person.name||"")+'</strong><span>'+escapeHtml(person.character||"")+'</span></article>').join('')+'</div></section>':'')+
  '<section class="movie-detail-section movie-detail-trailers-section" id="series-trailers"><h2>Trailer</h2><div class="movie-detail-trailer-row" id="series-detail-trailer-row"><div class="movie-detail-loading">Loading trailer…</div></div></section>'+
  '<section class="movie-detail-section movie-detail-similar-section" id="series-similar"><h2>You Might Also Like</h2><div class="movie-detail-similar-row" id="series-detail-similar-row"><div class="movie-detail-loading">Loading recommendations…</div></div></section>'+
  '<section class="movie-detail-section series-quick-navigation"><h2>'+escapeHtml(title(d))+' Seasons & Episodes</h2><div class="series-episode-jump" id="series-episode-jump"></div><div class="series-season-jump" id="series-season-jump">'+seasons.filter(x=>Number(x.season_number)>0).map(x=>'<button type="button" data-season-nav="'+Number(x.season_number)+'">Season '+Number(x.season_number)+'</button>').join('')+'</div></section>'+
 '</div>';
}
function languageDisplayName(code){
 try{return new Intl.DisplayNames([activeWatchProfile?.language==="en"?"en":"sq"],{type:"language"}).of(code||"en")}catch(_){return String(code||"en").toUpperCase()}
}
function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function syncMovieDetailHeader(enabled,activePage="movies"){
 const topbar=document.querySelector(".topbar");
 if(!topbar)return;
 let back=topbar.querySelector(".movie-detail-back");
 if(enabled){
  if(!back){
   back=document.createElement("button");back.type="button";back.className="movie-detail-back";back.setAttribute("aria-label","Go back");
   back.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
   back.addEventListener("click",event=>{
    event.preventDefault();
    event.stopPropagation();
    // Only use browser history when this title page was opened from inside FLIXTV.
    // A direct/deep link has no saved flixView entry, so return to Home explicitly.
    if(history.state?.titlePage&&history.length>1){
     history.back();
    }else{
     // Deep links (including Continue Watching URLs opened before this
     // in-app navigation pass) must explicitly hide the detail layer.
     history.replaceState({page:"home",flixView:{page:"home",scrollY:0,search:false,sports:false}},"","/");
     document.body.classList.remove("flxtv-movie-detail","flxtv-series-detail","flxtv-movie-overscroll-lock");
     setMovieGlobalAmbientSuppressed(false);
     $("title-page").hidden=true;
     $("catalog").hidden=false;
     $("hero").hidden=false;
     $("search-page").hidden=true;
     syncMovieDetailHeader(false);
     openPage("home",false);
    }
   });
   topbar.insertBefore(back,topbar.firstChild);
  }
  const activateMovies=()=>{
   const nav=document.querySelector('.mobile-nav [data-page="'+activePage+'"]');
   if(nav){document.querySelectorAll(".mobile-nav button").forEach(button=>button.classList.toggle("active",button===nav))}
  };
  activateMovies();requestAnimationFrame(activateMovies);
 }else if(back)back.remove();
}
function seriesSeenStorageKey(item,season){return "flxtv:series-seen:"+String(item?.id||"")+":"+Number(season||1)}
function getSeriesSeenEpisodes(item,season){
 try{return new Set((JSON.parse(localStorage.getItem(seriesSeenStorageKey(item,season))||"[]")||[]).map(Number))}catch(_){return new Set()}
}
function setSeriesSeenEpisodes(item,season,seen){
 try{localStorage.setItem(seriesSeenStorageKey(item,season),JSON.stringify(Array.from(seen).map(Number)))}catch(_){}
}
async function toggleSeriesEpisodeSeen(item,season,episode){
 const seen=getSeriesSeenEpisodes(item,season),number=Number(episode);
 if(seen.has(number))seen.delete(number);else seen.add(number);
 setSeriesSeenEpisodes(item,season,seen);
 if(titlePageItem&&Number(titlePageItem.id)===Number(item.id)&&Number(titlePageSeason)===Number(season))await loadTitleEpisodes();
}
async function toggleSeasonWatched(item,season){
 if(!item)return;
 try{
  const cacheKey=Number(item.id)+":"+Number(season)+":"+(activeWatchProfile?.language==="en"?"en":"sq");
  let episodes=titleSeasonEpisodeCache.get(cacheKey);
  if(!episodes){const data=await tmdb("/tv/"+Number(item.id)+"/season/"+Number(season));episodes=data.episodes||[];titleSeasonEpisodeCache.set(cacheKey,episodes)}
  const seen=getSeriesSeenEpisodes(item,season),numbers=episodes.map(x=>Number(x.episode_number));
  const all=numbers.length&&numbers.every(x=>seen.has(x));
  numbers.forEach(x=>all?seen.delete(x):seen.add(x));
  setSeriesSeenEpisodes(item,season,seen);
  if(titlePageItem&&Number(titlePageItem.id)===Number(item.id)&&Number(titlePageSeason)===Number(season))await loadTitleEpisodes();
 }catch(error){notice("Nuk u përditësua lista e episodeve: "+error.message)}
}
async function hydrateSeriesDetailExtras(item,d,videosPromise){
 const id=Number(item.id);
 const [images,recommendations,ratings]=await Promise.all([
  tmdb("/tv/"+id+"/images?include_image_language=en,null").catch(()=>({logos:[]})),
  tmdb("/tv/"+id+"/recommendations?page=1").catch(()=>({results:[]})),
  tmdb("/tv/"+id+"/content_ratings").catch(()=>({results:[]}))
 ]);
 if(!titlePageItem||Number(titlePageItem.id)!==id||kind(titlePageItem)!=="tv")return;
 const logo=(images.logos||[]).filter(x=>x.file_path).sort((a,b)=>{
  const preferred=x=>x.iso_639_1==="en"?0:x.iso_639_1===null?1:2;
  return preferred(a)-preferred(b)||(b.vote_average||0)-(a.vote_average||0);
 })[0];
 const usRating=(ratings.results||[]).find(x=>x.iso_3166_1==="US")?.rating;
 const certNode=document.querySelector(".series-detail-hero .movie-detail-cert");
 if(certNode&&usRating)certNode.textContent=usRating;
 const logoHost=$("series-detail-logo");
 if(logoHost&&logo)logoHost.innerHTML='<img class="movie-detail-title-logo" src="'+IMG+'w500'+logo.file_path+'" alt="'+escapeHtml(title(d))+'">';
 const networkHost=$("series-detail-networks");
 if(networkHost){
  const networks=(d.networks||[]).filter(x=>x.logo_path).slice(0,3);
  networkHost.innerHTML=networks.map(x=>'<img loading="lazy" src="'+IMG+'w300'+x.logo_path+'" alt="'+escapeHtml(x.name)+'" decoding="async">').join("");
  networkHost.hidden=!networks.length;
 }
 if(videosPromise)await videosPromise;
 if(!titlePageItem||Number(titlePageItem.id)!==id||kind(titlePageItem)!=="tv")return;
 const trailer=(d.videos?.results||[]).find(v=>v.site==="YouTube"&&(v.type==="Trailer"||v.type==="Teaser")&&v.key);
 const trailerRow=$("series-detail-trailer-row");
 if(trailerRow){
  trailerRow.innerHTML=trailer?'<button type="button" class="movie-detail-trailer-card" data-series-trailer="'+escapeHtml(trailer.key)+'"><span class="movie-detail-trailer-thumb"><img loading="lazy" src="https://img.youtube.com/vi/'+encodeURIComponent(trailer.key)+'/maxresdefault.jpg" alt="" decoding="async"><i><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></i></span><span>'+escapeHtml(title(d))+' - Trailer</span></button>':'<div class="movie-detail-empty">No trailer available.</div>';
  trailerRow.querySelector("[data-series-trailer]")?.addEventListener("click",()=>window.open("https://www.youtube.com/watch?v="+trailer.key,"_blank","noopener"));
 }
 const similarRow=$("series-detail-similar-row");
 if(similarRow){
  const rows=(recommendations.results||[]).filter(x=>x.poster_path).slice(0,16);
  similarRow.innerHTML=rows.length?rows.map(x=>'<button type="button" class="movie-detail-similar-card" data-series-similar="'+x.id+'"><img loading="lazy" decoding="async" src="'+IMG+'w342'+x.poster_path+'" alt="'+escapeHtml(title(x))+'"></button>').join(""):'<div class="movie-detail-empty">No recommendations available.</div>';
  similarRow.querySelectorAll("[data-series-similar]").forEach((button,index)=>button.addEventListener("click",()=>openTitlePage(rows[index],true,false)));
 }
 const save=$("series-detail-save");
 if(save){
  const isSaved=()=>readHeroSavedItems().some(x=>String(x.id)===String(item.id)&&kind(x)==="tv");
  const paint=()=>{const yes=isSaved();save.classList.toggle("saved",yes);save.setAttribute("aria-label",yes?"Remove from My List":"Add to My List");save.innerHTML=yes?'<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>':'<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>'};
  paint();save.onclick=()=>{toggleHeroSaved(item);paint()};
 }
 const trailerButton=$("series-detail-trailer");
 if(trailerButton)trailerButton.onclick=()=>$("series-trailers")?.scrollIntoView({behavior:"smooth",block:"start"});
 const more=$("overview-more"),overview=$("title-overview");
 if(more&&overview){more.hidden=String(d.overviewSq||d.overview||"").length<=130;more.onclick=()=>{const expanded=overview.classList.toggle("expanded");overview.classList.toggle("collapsed",!expanded);more.textContent=expanded?"Read less":"Read more";more.setAttribute("aria-expanded",String(expanded))}}
}
function formatMovieEndTime(runtime){
 if(!runtime)return "";
 const end=new Date(Date.now()+runtime*60000);
 return " · Ends "+end.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
}
async function hydrateMovieDetailExtras(item,d,videosPromise){
 const id=Number(item.id);
 const [images,releaseDates,recommendations]=await Promise.all([
  tmdb("/movie/"+id+"/images?include_image_language=en,null").catch(()=>({logos:[]})),
  tmdb("/movie/"+id+"/release_dates").catch(()=>({results:[]})),
  tmdb("/movie/"+id+"/recommendations?page=1").catch(()=>({results:[]}))
 ]);
 if(!titlePageItem||Number(titlePageItem.id)!==id||kind(titlePageItem)!=="movie")return;
 const logo=(images.logos||[]).filter(x=>x.file_path).sort((a,b)=>{
  const preferred=x=>x.iso_639_1==="en"?0:x.iso_639_1===null?1:2;
  return preferred(a)-preferred(b)||(b.vote_average||0)-(a.vote_average||0);
 })[0];
 const logoHost=$("movie-detail-logo");
 if(logoHost&&logo){logoHost.innerHTML='<img class="movie-detail-title-logo" src="'+IMG+'w500'+logo.file_path+'" alt="'+escapeHtml(title(d))+'">'}
 const countries=releaseDates.results||[];
 const country=countries.find(x=>x.iso_3166_1==="US")||countries.find(x=>x.iso_3166_1==="AL")||countries[0];
 const cert=(country?.release_dates||[]).find(x=>x.certification)?.certification||"NR";
 const certNode=$("movie-detail-cert");if(certNode)certNode.textContent=cert;
 const endNode=$("movie-detail-endtime");if(endNode)endNode.textContent=formatMovieEndTime(Number(d.runtime)||0);
 const langNode=$("movie-detail-language");
 if(langNode){
  try{langNode.textContent=new Intl.DisplayNames([activeWatchProfile?.language==="en"?"en":"sq"],{type:"language"}).of(d.original_language||"en")}catch(_){langNode.textContent=String(d.original_language||"en").toUpperCase()}
 }
 const studios=$("movie-detail-studios");
 if(studios){
  const companies=(d.production_companies||[]).filter(x=>x.logo_path).slice(0,3);
  studios.innerHTML=companies.map(x=>'<img loading="lazy" src="'+IMG+'w300'+x.logo_path+'" alt="'+escapeHtml(x.name)+'" decoding="async">').join("");
  studios.hidden=!companies.length;
 }
 if(videosPromise)await videosPromise;
 if(!titlePageItem||Number(titlePageItem.id)!==id||kind(titlePageItem)!=="movie")return;
 const trailerRows=(d.videos?.results||[]).filter(v=>v.site==="YouTube"&&(v.type==="Trailer"||v.type==="Teaser")&&v.key);
 const trailerRow=$("movie-detail-trailer-row");
 if(trailerRow){
  const videos=trailerRows.slice(0,8);
  trailerRow.innerHTML=videos.length?videos.map((v,i)=>'<button type="button" class="movie-detail-trailer-card" data-trailer-key="'+escapeHtml(v.key)+'"><span class="movie-detail-trailer-thumb"><img loading="lazy" src="https://img.youtube.com/vi/'+encodeURIComponent(v.key)+'/maxresdefault.jpg" data-fallback="https://img.youtube.com/vi/'+encodeURIComponent(v.key)+'/hqdefault.jpg" data-poster-fallback="'+escapeHtml(d.backdrop_path?IMG+'w780'+d.backdrop_path:(d.poster_path?IMG+'w500'+d.poster_path:''))+'" alt="" decoding="async"><i><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></i></span><span>Trailer '+(i+1)+'</span></button>').join(""):'<div class="movie-detail-empty">No trailers available.</div>';
  trailerRow.querySelectorAll(".movie-detail-trailer-thumb img").forEach(image=>image.addEventListener("error",()=>{
   if(image.dataset.fallback){image.src=image.dataset.fallback;image.dataset.fallback="";return}
   if(image.dataset.posterFallback){image.src=image.dataset.posterFallback;image.dataset.posterFallback=""}
  }));
  trailerRow.querySelectorAll("[data-trailer-key]").forEach(button=>button.addEventListener("click",()=>window.open("https://www.youtube.com/watch?v="+button.dataset.trailerKey,"_blank","noopener")));
 }
 const similarRow=$("movie-detail-similar-row");
 if(similarRow){
  const rows=(recommendations.results||[]).filter(x=>x.poster_path).slice(0,16);
  similarRow.innerHTML=rows.length?rows.map(x=>'<button type="button" class="movie-detail-similar-card" data-similar-id="'+x.id+'"><img loading="lazy" decoding="async" src="'+IMG+'w342'+x.poster_path+'" alt="'+escapeHtml(title(x))+'"></button>').join(""):'<div class="movie-detail-empty">No recommendations available.</div>';
  similarRow.querySelectorAll("[data-similar-id]").forEach((button,index)=>button.addEventListener("click",()=>openTitlePage(rows[index],true,false)));
 }
 const save=$("movie-detail-save");
 if(save){
  const saved=readHeroSavedItems().some(x=>String(x.id)===String(item.id)&&kind(x)==="movie");
  save.classList.toggle("saved",saved);
  save.innerHTML=saved?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
  save.onclick=()=>{toggleHeroSaved(item);const now=readHeroSavedItems().some(x=>String(x.id)===String(item.id)&&kind(x)==="movie");save.classList.toggle("saved",now);save.setAttribute("aria-label",now?"Remove from My List":"Add to My List");save.innerHTML=now?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>'};
 }
 const trailerButton=$("movie-detail-trailer");
 if(trailerButton)trailerButton.onclick=()=>{const section=$("movie-trailers");if(section)section.scrollIntoView({behavior:"smooth",block:"start"})};
 const more=$("overview-more"),overview=$("title-overview");
 if(more&&overview){
  more.hidden=String(d.overviewSq||d.overview||"").length<=130;
  more.onclick=()=>{const expanded=overview.classList.toggle("expanded");overview.classList.toggle("collapsed",!expanded);more.textContent=expanded?"Read less":"Read more";more.setAttribute("aria-expanded",String(expanded))};
 }
}
async function hydrateTitlePage(item,push=false,playMode=false){
 if(!item||!item.id)return;
 try{
  const k=kind(item),d=await prefetchTitle(item);
  const titleVideosPromise=loadTitleVideos(item,d).catch(error=>{console.warn("Trailer lookup failed",error);return d});
  const imdbId=d.external_ids?.imdb_id;
  if(imdbId){
   fetch("/api/imdb-videos.js?id="+encodeURIComponent(imdbId)).then(response=>response.ok?response.json():null).then(imdbData=>{
    if(imdbData&&Array.isArray(imdbData.videos)&&titlePageItem&&Number(titlePageItem.id)===Number(item.id)){
     d.imdbVideos=imdbData;
     const video=imdbData.videos.find(v=>(v.type||"").toLowerCase()==="trailer"&&Array.isArray(v.playback)&&v.playback.some(p=>p.url&&["MP4","M3U8"].includes(String(p.format||"").toUpperCase())));
     const source=video?.playback?.find(p=>String(p.format||"").toUpperCase()==="MP4"&&p.url)||video?.playback?.find(p=>String(p.format||"").toUpperCase()==="M3U8"&&p.url);
     const cover=$("title-page")?.querySelector(".title-page-cover");
     if(source&&cover&&titlePageItem&&Number(titlePageItem.id)===Number(item.id)){
      const preview=document.createElement("video");preview.className="title-page-imdb-video";preview.autoplay=true;preview.muted=true;preview.playsInline=true;preview.loop=true;preview.preload="metadata";
      if(typeof video.thumbnail==="string")preview.poster=video.thumbnail;
      const sourceNode=document.createElement("source");sourceNode.src=source.url;sourceNode.type=String(source.format).toUpperCase()==="M3U8"?"application/vnd.apple.mpegurl":"video/mp4";preview.append(sourceNode);cover.replaceChildren(preview);
     }
    }
   }).catch(()=>{});
  }
  d.overviewSq=String(d.overview||"");
  getAlbanianOverview(d,k).then(translated=>{
   if(!translated||!titlePageItem||Number(titlePageItem.id)!==Number(item.id))return;
   d.overviewSq=translated;
   const overviewNode=$("title-overview");
   if(overviewNode){overviewNode.textContent=translated;const more=$("overview-more");if(more)more.hidden=translated.length<=190}
  }).catch(()=>{});
  titlePageItem={...item,...d,media_type:k};
  const savedForTitle=getSavedProgress(titlePageItem);
  const savedIsResumable=!!(savedForTitle&&Number(savedForTitle.currentTime)>5&&(!savedForTitle.duration||Number(savedForTitle.currentTime)<Number(savedForTitle.duration)*0.92));
  const seasons=(d.seasons||[]).filter(x=>x.season_number>=0);
  if(k==="tv"){
   const savedSeason=Number(savedForTitle?.season||0),savedEpisode=Number(savedForTitle?.episode||0);
   if(savedIsResumable&&seasons.some(x=>Number(x.season_number)===savedSeason)){titlePageSeason=savedSeason;titlePageEpisode=savedEpisode||1}
   else if(!seasons.some(x=>Number(x.season_number)===titlePageSeason)){titlePageSeason=seasons[0]?.season_number??1;titlePageEpisode=1}
  }
  if(push)history.pushState({titlePage:true,play:playMode},"",pageUrl(titlePageItem,playMode));
  $("title-page").hidden=false;$("catalog").hidden=true;$("hero").hidden=true;$("search-page").hidden=true;
  $("title-page").innerHTML=titlePageMarkup(titlePageItem,d,playMode);
  const isMovieDetail=k==="movie",isSeriesDetail=k==="tv";
  document.body.classList.toggle("flxtv-movie-detail",isMovieDetail);
  document.body.classList.toggle("flxtv-series-detail",isSeriesDetail);
  setMovieGlobalAmbientSuppressed(isMovieDetail||isSeriesDetail);
  syncMovieDetailHeader(isMovieDetail||isSeriesDetail,isSeriesDetail?"shows":"movies");
  if(isMovieDetail)hydrateMovieDetailExtras(titlePageItem,d,titleVideosPromise).catch(error=>console.warn("Movie detail extras failed",error));
  if(isSeriesDetail)hydrateSeriesDetailExtras(titlePageItem,d,titleVideosPromise).catch(error=>console.warn("Series detail extras failed",error));
  initTitleYoutubeControls();
  document.body.classList.remove("no-scroll");
  if(k==="tv")loadTitleEpisodes();
  const canResume=savedIsResumable&&(k==="movie"||(Number(savedForTitle.season)===titlePageSeason&&Number(savedForTitle.episode)===titlePageEpisode));
  const titlePlayLabel=$("title-play").querySelector("span");
  if(titlePlayLabel)titlePlayLabel.textContent=canResume?(k==="tv"?"Resume S"+savedForTitle.season+" E"+savedForTitle.episode:"Resume"):(k==="tv"?"Play S"+titlePageSeason+" E"+titlePageEpisode:"Play");
  $("title-play").classList.toggle("is-resume",!!canResume);
  $("title-play").onclick=()=>{
   const season=k==="tv"?(canResume?Number(savedForTitle.season):Number($("title-season").value)):undefined;
   const episode=k==="tv"?(canResume?Number(savedForTitle.episode):Number(titlePageEpisode||1)):undefined;
   const resume=canResume?Number(savedForTitle.currentTime)||0:0;
   startTitlePlayback(season,episode,resume);
  };
  const overviewMore=$("overview-more");
  if(overviewMore)overviewMore.onclick=()=>{const overviewNode=$("title-overview"),expanded=overviewNode.classList.toggle("expanded");overviewNode.classList.toggle("collapsed",!expanded);overviewMore.textContent=expanded?"Më pak":"Më shumë";overviewMore.setAttribute("aria-expanded",String(expanded))};
  if(k==="tv"){
   const seasonSelect=$("title-season"),seasonTrigger=$("series-season-trigger"),seasonMenu=$("series-season-menu"),seasonLabel=$("series-season-label");
   const seenAll=$("series-seen-all");
   if(seasonTrigger&&seasonMenu){
    seasonTrigger.onclick=()=>{seasonMenu.hidden=!seasonMenu.hidden;seasonTrigger.classList.toggle("open",!seasonMenu.hidden)};
    seasonMenu.querySelectorAll("[data-season]").forEach(option=>option.onclick=()=>{
     seasonSelect.value=String(Number(option.dataset.season));seasonSelect.dispatchEvent(new Event("change",{bubbles:true}));seasonMenu.hidden=true;seasonTrigger.classList.remove("open");
    });
    document.addEventListener("click",function closeSeasonMenu(event){
     if(!document.body.classList.contains("flxtv-series-detail")){document.removeEventListener("click",closeSeasonMenu);return}
     if(!event.target.closest(".series-season-heading")&&!event.target.closest(".series-season-menu")){seasonMenu.hidden=true;seasonTrigger.classList.remove("open")}
    });
   }
   if(seasonSelect)seasonSelect.onchange=async()=>{
    titlePageSeason=Number(seasonSelect.value);titlePageEpisode=1;
    if(seasonLabel)seasonLabel.textContent="Season "+titlePageSeason;
    seasonMenu?.querySelectorAll("[data-season]").forEach(option=>{const active=Number(option.dataset.season)===titlePageSeason;option.classList.toggle("active",active);option.querySelector("b")?.remove();if(active){const check=document.createElement("b");check.textContent="✓";option.append(check)}});
    await loadTitleEpisodes();
   };
   if(seenAll)seenAll.onclick=()=>toggleSeasonWatched(titlePageItem,titlePageSeason);
   $("series-season-jump")?.querySelectorAll("[data-season-nav]").forEach(button=>button.onclick=()=>{
    seasonSelect.value=String(Number(button.dataset.seasonNav));seasonSelect.dispatchEvent(new Event("change",{bubbles:true}));
    $("series-season-jump").querySelectorAll("button").forEach(x=>x.classList.toggle("active",x===button));
    $("series-season-section")?.scrollIntoView({behavior:"smooth",block:"start"});
   });
  }
  if(playMode){const params=new URLSearchParams(location.search);if(k==="tv"){titlePageSeason=Number(params.get("season")||titlePageSeason);titlePageEpisode=Number(params.get("episode")||1);loadTitleEpisodes()}startTitlePlayback(k==="tv"?titlePageSeason:undefined,k==="tv"?titlePageEpisode:undefined,Number(params.get("t")||0))}
  window.scrollTo(0,0);
 }catch(e){notice(e.message)}
}
const titleSeasonEpisodeCache=new Map();
async function loadTitleEpisodes(){
 if(!titlePageItem||kind(titlePageItem)!=="tv")return;
 const request=++titleEpisodesRequest,itemId=Number(titlePageItem.id),season=Number(titlePageSeason);
 const cacheKey=itemId+":"+season+":"+(activeWatchProfile?.language==="en"?"en":"sq"),list=$("title-episode-list");
 if(!list)return;
 const isCurrent=()=>request===titleEpisodesRequest&&titlePageItem&&Number(titlePageItem.id)===itemId&&Number(titlePageSeason)===season;
 const renderEpisodes=episodes=>{
  if(!isCurrent())return;
  if(!episodes.some(ep=>Number(ep.episode_number)===Number(titlePageEpisode)))titlePageEpisode=Number(episodes[0]?.episode_number||1);
  const saved=getSavedProgress(titlePageItem),savedCanResume=!!(saved&&Number(saved.currentTime)>5&&(!saved.duration||Number(saved.currentTime)<Number(saved.duration)*0.92));
  list.innerHTML=episodes.map(ep=>{
   const epNo=Number(ep.episode_number),overview=String(ep.overview||"").trim();
   const seen=getSeriesSeenEpisodes(titlePageItem,season),isSeen=seen.has(epNo);
   return '<article class="series-episode-card '+(epNo===titlePageEpisode?'selected ':'')+(isSeen?'is-seen':'')+'" data-episode="'+epNo+'" role="button" tabindex="0"><span class="series-episode-thumb">'+(ep.still_path?'<img loading="lazy" decoding="async" src="'+IMG+'w780'+ep.still_path+'" alt="">':'<span>FLIXTV</span>')+'<b>E'+epNo+'</b><button type="button" class="series-episode-seen" aria-label="'+(isSeen?'Mark unwatched':'Mark watched')+'">'+(isSeen?'<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>':'<svg viewBox="0 0 24 24"><path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="2.8" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>')+'</button>'+(ep.runtime?'<i>'+Number(ep.runtime)+'m</i>':'')+'</span><span class="series-episode-copy"><strong>'+escapeHtml(ep.name||("Episode "+epNo))+'</strong>'+(overview?'<span class="series-episode-overview">'+escapeHtml(overview)+'</span>':'')+'</span></article>'
  }).join("");
  const jump=$("series-episode-jump");
  if(jump){
   jump.innerHTML=episodes.map(ep=>'<button type="button" data-jump-episode="'+Number(ep.episode_number)+'">E'+Number(ep.episode_number)+'</button>').join("");
   jump.querySelectorAll("[data-jump-episode]").forEach(button=>button.onclick=()=>{const ep=Number(button.dataset.jumpEpisode);titlePageEpisode=ep;const savedProgress=getSavedProgress(titlePageItem),resume=savedProgress&&Number(savedProgress.season)===season&&Number(savedProgress.episode)===ep?Number(savedProgress.currentTime)||0:0;startTitlePlayback(season,ep,resume)});
  }
  list.querySelectorAll("[data-episode]").forEach(card=>{
   const play=()=>{const ep=Number(card.dataset.episode)||1;titlePageEpisode=ep;const resume=savedCanResume&&Number(saved.season)===season&&Number(saved.episode)===ep?Number(saved.currentTime):0;startTitlePlayback(season,ep,resume)};
   card.addEventListener("click",event=>{if(event.target.closest(".series-episode-seen"))return;play()});
   const seenButton=card.querySelector(".series-episode-seen");
   if(seenButton)seenButton.addEventListener("click",event=>{event.stopPropagation();toggleSeriesEpisodeSeen(titlePageItem,season,Number(card.dataset.episode))});
   card.addEventListener("keydown",event=>{if(event.target===card&&(event.key==="Enter"||event.key===" ")){event.preventDefault();play()}});
   const more=card.querySelector(".episode-overview-more");
   if(more)more.addEventListener("click",event=>{
    event.stopPropagation();
    const copy=card.querySelector(".series-episode-overview"),expanded=copy.classList.toggle("expanded");
    more.classList.toggle("active",expanded);more.setAttribute("aria-expanded",String(expanded));
    more.setAttribute("aria-label",expanded?"Mbyll përshkrimin":"Shfaq përshkrimin e plotë");
   });
  });
 };
 try{
  let episodes=titleSeasonEpisodeCache.get(cacheKey);
  if(episodes){renderEpisodes(episodes);return}
  const d=await tmdb("/tv/"+itemId+"/season/"+season);
  if(!isCurrent())return;
  episodes=d.episodes||[];
  titleSeasonEpisodeCache.set(cacheKey,episodes);
  renderEpisodes(episodes);
  // Always fetch English source text: TMDB's sq-AL response can still contain English descriptions.
  (async()=>{
   if(activeWatchProfile?.language==="en")return;
   try{
    const english=await tmdb("/tv/"+itemId+"/season/"+season+"?language=en-US");
    const englishByNumber=new Map((english.episodes||[]).map(ep=>[Number(ep.episode_number),ep]));
    const translated=await Promise.all(episodes.map(async ep=>{
     const source=String(englishByNumber.get(Number(ep.episode_number))?.overview||ep.overview||"").trim();
     if(!source)return {...ep,overview:""};
     return {...ep,overview:await translateOverviewToAlbanian(source)};
    }));
    titleSeasonEpisodeCache.set(cacheKey,translated);
    renderEpisodes(translated);
   }catch(error){console.warn("Episode overview translation failed:",error)}
  })();
 }catch(e){if(isCurrent())notice("Episodet nuk u ngarkuan: "+e.message)}
}
function enterCineSrcFullscreen(){
 const modal=$("player-modal");
 // Use an in-page CSS fullscreen on iOS Safari. Native video fullscreen can
 // detach the iframe player UI and hide CineSRC-rendered subtitles.
 modal.classList.add("open","css-fullscreen");
 document.body.classList.add("no-scroll");
}
function stopTitlePagePreview(){
 const nativePreview=document.querySelector(".title-page-imdb-video");
 if(nativePreview){try{nativePreview.pause();nativePreview.currentTime=0}catch(_){}}
 const youtubeHost=$("yt-title-trailer");
 const stopYoutube=player=>{
  if(!player)return;
  try{player.pauseVideo();player.stopVideo()}catch(_){}
 };
 if(titleYoutubePlayer)stopYoutube(titleYoutubePlayer);
 else if(youtubeHost&&typeof youtubeHost.getYTPlayer==="function"){
  youtubeHost.getYTPlayer().then(stopYoutube).catch(()=>{});
 }
}
let cinesrcResolveRequestId=0,lastCineSrcResolveError="";
const CINESRC_M3U8_CACHE_TTL_MS=4*60*60*1000;
function cinesrcM3U8CacheKey(item,season,episode){
  const mediaType=kind(item);
  const parts=["flixtv","cinesrc","m3u8","v1",mediaType,String(item.id)];
  if(mediaType==="tv")parts.push(String(Number(season||1)),String(Number(episode||1)));
  return parts.join(":");
}
function readCineSrcM3U8Cache(item,season,episode){
  try{
    const key=cinesrcM3U8CacheKey(item,season,episode);
    const cached=JSON.parse(localStorage.getItem(key)||"null");
    if(!cached||typeof cached.masterUrl!=="string"||
       !Number.isFinite(Number(cached.expiresAt))||
       Date.now()>=Number(cached.expiresAt)){
      localStorage.removeItem(key);
      return null;
    }
    const url=new URL(cached.masterUrl);
    const allowed=url.hostname==="cinesrc.st"||url.hostname.endsWith(".cinesrc.st")||
      url.hostname==="bright67.online"||url.hostname.endsWith(".bright67.online");
    if(url.protocol!=="https:"||!allowed){
      localStorage.removeItem(key);
      return null;
    }
    return {
      success:true,
      source:"cinesrc",
      format:"hls",
      masterUrl:url.href,
      playlistType:cached.playlistType||"unknown",
      qualities:Array.isArray(cached.qualities)?cached.qualities:[],
      cached:true,
      expiresAt:Number(cached.expiresAt)
    };
  }catch(_){return null}
}
function saveCineSrcM3U8Cache(item,season,episode,resolved){
  try{
    if(!resolved||!resolved.masterUrl)return;
    const key=cinesrcM3U8CacheKey(item,season,episode);
    const now=Date.now();
    localStorage.setItem(key,JSON.stringify({
      masterUrl:resolved.masterUrl,
      playlistType:resolved.playlistType||"unknown",
      qualities:Array.isArray(resolved.qualities)?resolved.qualities:[],
      createdAt:now,
      expiresAt:now+CINESRC_M3U8_CACHE_TTL_MS
    }));
  }catch(error){
    console.warn("[FLIXTV] Could not persist M3U8 cache in this browser:",error);
  }
}

function showCineSrcResolutionStatus(payload,errorMessage=""){
  const actions=$("title-page-actions");
  if(!actions)return;
  let status=$("cinesrc-resolver-status");
  if(!status){
    status=document.createElement("div");
    status.id="cinesrc-resolver-status";
    status.style.cssText="margin-top:12px;color:#b8c6d8;font-size:13px;line-height:1.5;max-width:640px;overflow-wrap:anywhere";
    actions.after(status);
  }
  if(errorMessage){status.textContent=errorMessage;return}
  const labels=(payload?.qualities||[]).map(item=>item.label||((item.height||"")+"p")).filter(Boolean);
  status.textContent="Burimi M3U8 u gjet"+(labels.length?" · "+labels.join(" · "):" · HLS");
}
async function requestCineSrcM3U8(item,season,episode,button=null,forceRefresh=false){
  if(!item||!item.id)return null;
  const requestId=++cinesrcResolveRequestId;

  // Reuse the exact generated playlist URL for four hours. The key includes
  // movie ID, or series ID + season + episode, so a different title/episode
  // cannot accidentally inherit another stream URL.
  const cached=forceRefresh?null:readCineSrcM3U8Cache(item,season,episode);
  if(forceRefresh)console.warn("[FLIXTV] Forcing a fresh CineSRC resolver request after a failed HLS resource.");
  if(cached){
    lastCineSrcResolveError="";
    window.__FLIXTV_LAST_RESOLVED_STREAM__=cached;
    showCineSrcResolutionStatus(cached);
    console.info("[FLIXTV] Reusing cached CineSRC M3U8",{
      title:title(item),
      type:kind(item),
      expiresAt:new Date(cached.expiresAt).toISOString()
    });
    return cached;
  }

  const label=button?.querySelector("span");
  const previousLabel=label?.textContent;
  if(button){button.disabled=true;button.setAttribute("aria-busy","true")}
  if(label)label.textContent="Po kërkohet M3U8…";
  try{
    const params=new URLSearchParams({id:String(item.id),type:kind(item)});
    // Use a unique cache key when retrying a broken cached stream URL.
    if(forceRefresh)params.set("_fresh",String(Date.now()));
    if(kind(item)==="tv"){
      params.set("season",String(Number(season||1)));
      params.set("episode",String(Number(episode||1)));
    }
    const response=await fetch(RESOLVER_API+"/api/stream?"+params.toString(),{
      method:"GET",
      headers:{Accept:"application/json"}
    });
    const result=await response.json().catch(()=>null);
    if(!response.ok||!result||!result.success){
      throw new Error(result?.error||"Resolver-i në Vercel nuk arriti të gjejë M3U8.");
    }
    if(!result.masterUrl)throw new Error("Resolver-i nuk ktheu adresën M3U8.");
    lastCineSrcResolveError="";
    const resolved={
      ...result,
      masterUrl:result.masterUrl,
      apiBase:RESOLVER_API,
      requestedAt:new Date().toISOString(),
      cached:false,
      expiresAt:Date.now()+CINESRC_M3U8_CACHE_TTL_MS
    };
    if(requestId!==cinesrcResolveRequestId)return resolved;
    saveCineSrcM3U8Cache(item,season,episode,resolved);
    window.__FLIXTV_LAST_RESOLVED_STREAM__=resolved;
    showCineSrcResolutionStatus(resolved);
    const qualities=(resolved.qualities||[]).map(item=>item.label||((item.height||"")+"p")).filter(Boolean);
    notice("M3U8 u gjenerua dhe u ruajt për 4 orë"+(qualities.length?": "+qualities.join(" / "):"."));
    console.info("[FLIXTV] CineSRC resolver completed and cached",{
      title:title(item),
      type:kind(item),
      playlistType:resolved.playlistType||"unknown",
      qualities:qualities.length?qualities:["HLS"],
      masterUrlAvailable:!!resolved.masterUrl,
      cacheExpiresAt:new Date(resolved.expiresAt).toISOString()
    });
    return resolved;
  }catch(error){
    if(requestId===cinesrcResolveRequestId){
      lastCineSrcResolveError=error.message||"Kërkesa për M3U8 dështoi.";
      showCineSrcResolutionStatus(null,lastCineSrcResolveError);
      notice(lastCineSrcResolveError);
      console.error("[FLIXTV] CineSRC resolver failed:",error);
    }
    return null;
  }finally{
    if(button){
      button.disabled=false;
      button.removeAttribute("aria-busy");
      if(label&&previousLabel)label.textContent=previousLabel;
    }
  }
}
function startTitlePlayback(season,episode){
  if(!titlePageItem)return;
  stopTitlePagePreview();
  const saved=getSavedProgress(titlePageItem);
  const sameEpisode=kind(titlePageItem)!=="tv"||
    (Number(saved?.season||0)===Number(season||1)&&Number(saved?.episode||0)===Number(episode||1));
  const routeResume=Number(new URLSearchParams(location.search).get("t"))||0;
  const savedResume=sameEpisode?Number(saved?.currentTime)||0:0;
  const resume=routeResume>0?routeResume:savedResume;
  return openResolvedPlayback(titlePageItem,season,episode,$("title-play"),resume);
}
function slugSimilarity(a,b){
 const rows=Array.from({length:b.length+1},(_,i)=>i);
 for(let i=1;i<=a.length;i++){let prev=rows[0];rows[0]=i;for(let j=1;j<=b.length;j++){const temp=rows[j];rows[j]=Math.min(rows[j]+1,rows[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=temp}}
 return 1-rows[b.length]/Math.max(a.length,b.length,1);
}
function animatePosterFallback(sourceImage,targetPoster,sourceRect,sourceRadius){
 if(!sourceImage||!targetPoster||!sourceRect)return;
 if(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;
 const clone=document.createElement("img");
 clone.src=targetPoster.currentSrc||targetPoster.src||sourceImage.currentSrc||sourceImage.src;
 if(!clone.src)return;
 clone.alt="";clone.setAttribute("aria-hidden","true");clone.draggable=false;
 Object.assign(clone.style,{
  position:"fixed",left:sourceRect.left+"px",top:sourceRect.top+"px",
  width:sourceRect.width+"px",height:sourceRect.height+"px",
  objectFit:"contain",objectPosition:"center center",borderRadius:sourceRadius||"5px",
  background:"#05070b",border:"0",boxShadow:"0 12px 34px rgba(0,0,0,.28)",
  zIndex:"2147483647",pointerEvents:"none",margin:"0",padding:"0",
  maxWidth:"none",maxHeight:"none",transformOrigin:"top left",
  willChange:"transform,border-radius"
 });
 const run=async()=>{
  try{if(clone.decode)await clone.decode()}catch(_){}
  if(!targetPoster.isConnected)return;
  const to=targetPoster.getBoundingClientRect();
  if(to.width<2||to.height<2)return;
  document.body.append(clone);
  targetPoster.style.opacity="0";
  const sx=to.width/sourceRect.width,sy=to.height/sourceRect.height;
  const dx=to.left-sourceRect.left,dy=to.top-sourceRect.top;
  const animation=clone.animate([
   {transform:"translate(0,0) scale(1,1)",borderRadius:sourceRadius||"5px"},
   {transform:"translate("+dx+"px,"+dy+"px) scale("+sx+","+sy+")",borderRadius:getComputedStyle(targetPoster.parentElement).borderRadius||"10px"}
  ],{duration:680,easing:"cubic-bezier(.2,.75,.2,1)",fill:"forwards"});
  const cleanup=()=>{clone.remove();if(targetPoster.isConnected)targetPoster.style.opacity=""};
  animation.onfinish=cleanup;animation.oncancel=cleanup;
 };
 requestAnimationFrame(()=>{run().catch(error=>console.warn("[FLIXTV] Poster fallback transition failed",error))});
}
function setMovieGlobalAmbientSuppressed(suppress){
 const root=document.documentElement;
 const current=document.getElementById("app-ambient");
 let wallpaper=document.getElementById("movie-viewport-wallpaper");
 if(suppress){
  if(current&&!window.__flixGlobalAmbientNode)window.__flixGlobalAmbientNode=current;
  const artwork=document.querySelector("#title-page .movie-detail-backdrop-image")?.getAttribute("src")
   ||document.querySelector("#title-page .movie-detail-ambient-image")?.getAttribute("src");
  if(artwork){
   if(!wallpaper){
    wallpaper=document.createElement("div");
    wallpaper.id="movie-viewport-wallpaper";
    wallpaper.setAttribute("aria-hidden","true");
    document.body.appendChild(wallpaper);
   }
   wallpaper.style.backgroundImage='url("'+artwork.replace(/"/g,"%22")+'")';
  }
  document.body.classList.remove("flxtv-movie-overscroll-lock");
  return;
 }
 document.body.classList.remove("flxtv-movie-overscroll-lock");
 wallpaper?.remove();
 root.style.removeProperty("--movie-root-artwork");
 const saved=window.__flixGlobalAmbientNode;
 if(saved&&!saved.isConnected){
  const brandIntro=document.getElementById("brand-intro");
  if(brandIntro?.parentNode)brandIntro.parentNode.insertBefore(saved,brandIntro);
  else document.body.prepend(saved);
 }
}
async function openTitlePage(item,push=false,playMode=false,originCard=null){
 if(!item||!item.id)return;
 startFlixLoading();
 const sourceImage=originCard?.querySelector("img")||null,sourceRect=sourceImage?.getBoundingClientRect()||null;
 const sourceRadius=sourceImage?getComputedStyle(sourceImage).borderRadius:"5px",k=kind(item);
 let prepared=null;try{prepared=await prefetchTitle(item)}catch(error){console.warn("Title preparation failed",error)}
 const readyItem={...item,...(prepared||{}),media_type:k};titlePageItem=readyItem;
 if(push){
  const activePage=document.querySelector("[data-page].active")?.dataset.page||"home",appScroller=$("app");
  history.replaceState({...history.state,flixView:{scrollY:appScroller?.scrollTop||window.scrollY,page:activePage,search:!$("search-page").hidden,sports:!$("sports-page").hidden}},"",location.href);
  history.pushState({titlePage:true,play:playMode},"",pageUrl(item,playMode));
 }
 // Render and preload the title page off-screen while the current page stays visible.
 $("title-page").innerHTML=titlePageMarkup(readyItem,readyItem,playMode);
 window.FlixLocale?.refresh();
 await waitForFlixVisualReady($("title-page"));
 await finishFlixLoading();
 $("title-page").hidden=false;$("catalog").hidden=true;$("hero").hidden=true;$("search-page").hidden=true;
 document.body.classList.toggle("flxtv-movie-detail",k==="movie");document.body.classList.toggle("flxtv-series-detail",k==="tv");
 setMovieGlobalAmbientSuppressed(true);syncMovieDetailHeader(true,k==="tv"?"shows":"movies");
 document.body.classList.remove("no-scroll");window.scrollTo({top:0,left:0,behavior:"instant"});
 const destination=$("title-page").querySelector(".title-page-cover>.title-page-cover-image");
 if(sourceImage&&destination&&sourceRect&&sourceRect.width>1&&sourceRect.height>1)animatePosterFallback(sourceImage,destination,sourceRect,sourceRadius);
 void hydrateTitlePage(readyItem,false,playMode).then(()=>window.FlixLocale?.refresh());
}
async function resolveTitleRoute(){
 const parts=decodeURIComponent(location.pathname).split("/").filter(Boolean);
 if(!parts.length){document.documentElement.classList.remove("deep-route-loading");$("title-page").hidden=true;$("catalog").hidden=false;$("hero").hidden=false;home();return}
 const playMode=parts[1]==="play",slug=parts[0];
 try{
  let match=null;
  // New routes carry the exact TMDB media type and ID. Never guess from a localized title slug.
  const typedRoute=slug.match(/--(movie|tv)-(\d+)$/);
  if(typedRoute){
   const mediaType=typedRoute[1],id=Number(typedRoute[2]);
   const item=await tmdb("/"+mediaType+"/"+id);
   if(item&&item.id&&item.success!==false)match={...item,media_type:mediaType};
  }else if(/^\d+$/.test(slug)){
   // Backward compatibility for older numeric links.
   const id=Number(slug);
   for(const mediaType of ["movie","tv"]){
    try{
     const item=await tmdb("/"+mediaType+"/"+id);
     if(item&&item.id&&item.success!==false){match={...item,media_type:mediaType};break}
    }catch(_){}
   }
  }else{
   const query=slug.replace(/-/g," ");
   const data=await tmdb("/search/multi?query="+encodeURIComponent(query)+"&include_adult=false");
   const candidates=(data.results||[]).filter(x=>x.media_type==="movie"||x.media_type==="tv");
   match=candidates.find(x=>titleSlug(title(x))===slug||titleSlug(x.original_title||x.original_name||"")===slug)||candidates.find(x=>slugSimilarity(titleSlug(title(x)),slug)>=0.68);
  }
  if(!match){$("title-page").hidden=true;$("catalog").hidden=true;$("hero").hidden=true;$("title-page").innerHTML='<div class="title-page-not-found"><span>404</span><h1>Titulli nuk u gjet</h1><p>Kontrollo adresën ose kërko titullin në FLIXTV.</p><a class="primary-btn" href="/">Kthehu në FLIXTV</a></div>'; $("title-page").hidden=false;return}
  titlePageSeason=1;titlePageEpisode=1;
  await openTitlePage(match,false,playMode);document.documentElement.classList.remove("deep-route-loading");
 }catch(e){document.documentElement.classList.remove("deep-route-loading");notice(e.message);$("title-page").hidden=true;$("catalog").hidden=false;home()}
}
async function leavePlayer(){
 if(!$("player-modal").classList.contains("open"))return;
 const item=currentPlayback&&currentPlayback.item;
 const isTitleRoute=location.pathname.split("/").filter(Boolean)[1]==="play";
 closePlayer();
 if(isTitleRoute&&item){
  history.replaceState({titlePage:true},"",pageUrl(item));
  await openTitlePage(item,false,false);
 }
}
history.scrollRestoration="manual";
document.addEventListener("click",event=>{
 const back=event.target.closest("[data-title-home]");
 if(!back)return;
 event.preventDefault();
 if(history.state?.titlePage)history.back();
 else location.assign("/");
});
window.addEventListener("popstate",async event=>{
 startFlixLoading();
 if($("player-modal").classList.contains("open"))closePlayer();
 const view=event.state?.flixView;
 if(view){
  const targetRoot=view.page==="home"?$("home-page"):view.page==="movies"?$("movies-page"):view.page==="shows"?$("shows-page"):$("sports-page");
  await waitForFlixVisualReady(targetRoot);
  await finishFlixLoading();
  document.body.classList.remove("flxtv-movie-detail","flxtv-series-detail","flxtv-movie-overscroll-lock");
  setMovieGlobalAmbientSuppressed(false);syncMovieDetailHeader(false);
  $("title-page").hidden=true;$("catalog").hidden=false;$("sports-page").hidden=!view.sports;
  $("hero").hidden=view.page!=="home";$("home-page").hidden=view.page!=="home";$("movies-page").hidden=view.page!=="movies";$("shows-page").hidden=view.page!=="shows";$("search-page").hidden=!view.search;
  document.querySelectorAll("[data-page]").forEach(x=>x.classList.toggle("active",x.dataset.page===view.page));
  requestAnimationFrame(()=>window.scrollTo({top:view.scrollY||0,left:0,behavior:"instant"}));return;
 }
 if(location.pathname.replace(/\/$/,"")==="/sports")await openPage("sports",false);
 else if(location.pathname==="/")await openPage("home",false);
 else await resolveTitleRoute();
});
document.addEventListener("keydown",e=>{if((e.key==="Escape"||e.key==="Backspace")&&$("player-modal").classList.contains("open")){e.preventDefault();leavePlayer()}});

async function details(item){try{const k=kind(item),d=await tmdb("/"+k+"/"+item.id+"?append_to_response=videos");selected={...item,...d,media_type:k};$("details-title").textContent=title(d);$("details-type").textContent=k==="tv"?"SERIAL":"FILM";$("details-meta").textContent=[year(d),d.vote_average?"★ "+Number(d.vote_average).toFixed(1):"",d.runtime?d.runtime+" min":d.number_of_seasons?d.number_of_seasons+" sezone":""].filter(Boolean).join(" · ");const overview=await getAlbanianOverview(d,k);$("details-overview").textContent=overview||"Përshkrimi nuk është i disponueshëm.";$("details-backdrop").style.backgroundImage=d.backdrop_path?'linear-gradient(0deg,#111722,transparent 80%),url("'+IMG+"w1280"+d.backdrop_path+'")':"linear-gradient(0deg,#111722,#263143)";const t=(d.videos&&d.videos.results||[]).find(v=>v.site==="YouTube"&&(v.type==="Trailer"||v.type==="Teaser"));$("watch-trailer").hidden=!t;$("watch-trailer").onclick=()=>window.open("https://www.youtube.com/watch?v="+t.key,"_blank","noopener");$("episode-controls").hidden=k!=="tv";$("play-title").hidden=k==="tv";$("episode-controls").style.display=k==="tv"?"flex":"none";if(k!=="tv"){$("season-select").replaceChildren();$("episode-select").replaceChildren()}if(k==="tv"){const seasons=(d.seasons||[]).filter(s=>s.season_number>=0);$("season-select").innerHTML=seasons.map(s=>'<option value="'+s.season_number+'">'+s.name+"</option>").join("");$("season-select").onchange=episodes;await episodes()}modal("details-modal",true)}catch(e){notice(e.message)}}
async function episodes(){if(!selected)return;try{const s=$("season-select").value,d=await tmdb("/tv/"+selected.id+"/season/"+s);$("episode-select").innerHTML=(d.episodes||[]).map(ep=>'<option value="'+ep.episode_number+'">E'+ep.episode_number+" · "+String(ep.name||"").replace(/[&<>"]/g,"")+"</option>").join("")}catch(e){notice(e.message)}}
const genreSq={28:"Aksion",12:"Aventurë",16:"Animacion",35:"Komedi",80:"Krim",99:"Dokumentar",18:"Dramë",10751:"Familjar",14:"Fantazi",36:"Histori",27:"Horror",10402:"Muzikë",9648:"Mister",10749:"Romancë",878:"Fantashkencë",10770:"Film televiziv",53:"Thriller",10752:"Luftë",37:"Western",10759:"Aksion dhe aventurë",10762:"Për fëmijë",10763:"Lajme",10764:"Reality",10765:"Fantashkencë dhe fantazi",10766:"Sapunoperë",10767:"Talk-show",10768:"Luftë dhe politikë"};
function ageLabel(cert){const c=String(cert||"").trim().toUpperCase();const map={"G":"Për të gjitha moshat","TV-G":"Për të gjitha moshat","TV-Y":"Për fëmijë","TV-Y7":"Për fëmijë mbi 7 vjeç","PG":"Nën mbikëqyrjen e prindërve","TV-PG":"Nën mbikëqyrjen e prindërve","PG-13":"13+","TV-14":"14+","R":"17+","TV-MA":"18+","NC-17":"18+","18":"18+","16":"16+","15":"15+","12":"12+","U":"Për të gjitha moshat"};return map[c]||c||"Pa klasifikim moshe";}
async function contentRating(item){try{const k=kind(item),d=await tmdb("/"+k+"/"+item.id+(k==="tv"?"/content_ratings":"/release_dates"));if(k==="tv"){const rows=(d.results||[]).filter(x=>x.iso_3166_1==="US"||x.iso_3166_1==="AL");return (rows.find(x=>x.iso_3166_1==="AL")||rows.find(x=>x.iso_3166_1==="US")||rows[0]||{}).rating||""}const rows=(d.results||[]).filter(x=>x.iso_3166_1==="US"||x.iso_3166_1==="AL");const country=rows.find(x=>x.iso_3166_1==="AL")||rows.find(x=>x.iso_3166_1==="US")||rows[0];return country&&country.release_dates&&((country.release_dates.find(x=>x.certification)||{}).certification)||""}catch(_){return""}}

let currentPlayback=null;
let playbackReturnToTitlePage=false;
let playbackOpenId=0;
let activeHlsPlayer=null;
let activeSubtitleTrack=null;
let activeSubtitleTrackUrl=null;
let activeSubtitleLabel="";
let activeSubtitleLanguage="sq";
let hlsLibraryPromise=null;

function setPlayerStatus(message,error=false){
  const status=$("player-loading-status");
  if(!status)return;
  status.textContent=message||"";
  status.hidden=!message;
  status.classList.toggle("error",!!error);
}
function clearPlayerStatus(){setPlayerStatus("")}
function setPlayerQualityOptions(levels){
  const select=$("player-quality-select");
  if(!select)return;
  select.replaceChildren();
  const automatic=document.createElement("option");
  automatic.value="-1";automatic.textContent="Auto";
  select.append(automatic);
  (levels||[]).forEach((level,index)=>{
    const option=document.createElement("option");
    option.value=String(index);
    option.textContent=(level.height?String(level.height)+"p":("Cilësia "+(index+1)));
    select.append(option);
  });
  select.hidden=!(levels&&levels.length>1);
  select.value="-1";
  select.onchange=()=>{
    if(activeHlsPlayer)activeHlsPlayer.currentLevel=Number(select.value);
  };
}
function ensureHlsLibrary(){
  if(window.Hls)return Promise.resolve(window.Hls);
  if(hlsLibraryPromise)return hlsLibraryPromise;
  hlsLibraryPromise=new Promise((resolve,reject)=>{
    let script=document.querySelector('script[data-flxtv-hls]');
    const onLoad=()=>window.Hls?resolve(window.Hls):reject(new Error("HLS.js nuk u inicializua."));
    const onError=()=>reject(new Error("HLS.js nuk u shkarkua nga CDN."));
    if(script){
      script.addEventListener("load",onLoad,{once:true});
      script.addEventListener("error",onError,{once:true});
      if(window.Hls)resolve(window.Hls);
      return;
    }
    script=document.createElement("script");
    script.src="https://cdn.jsdelivr.net/npm/hls.js@1.7.4/dist/hls.min.js";
    script.async=true;
    script.crossOrigin="anonymous";
    script.dataset.flxtvHls="true";
    script.onload=onLoad;
    script.onerror=onError;
    document.head.append(script);
  }).catch(error=>{
    hlsLibraryPromise=null;
    throw error;
  });
  return hlsLibraryPromise;
}
function stopResolvedVideo(options={}){
  const streamFrame=$("cinesrc-frame");
  // During a new playback, replace the iframe URL directly. Navigating it to
  // about:blank first creates an unnecessary extra document load.
  if(streamFrame&&!options.preserveCineSrcFrame){
    streamFrame.onload=null;streamFrame.onerror=null;
    if(streamFrame.getAttribute("src")!=="about:blank")streamFrame.src="about:blank";
    streamFrame.hidden=true;
  }
  const video=$("resolved-video");
  if(activeHlsPlayer){
    try{activeHlsPlayer.destroy()}catch(_){}
    activeHlsPlayer=null;
  }
  if(video){
    try{
      video.ontimeupdate=null;
      video.onpause=null;
      video.onended=null;
      video.onerror=null;
      video.pause();
      video.querySelectorAll("track[data-flxtv-subtitle]").forEach(track=>track.remove());
      video.removeAttribute("src");
      video.load();
    }catch(_){}
    video.hidden=true;
  }
  activeSubtitleTrack=null;
  if(activeSubtitleTrackUrl){
    try{URL.revokeObjectURL(activeSubtitleTrackUrl)}catch(_){}
    activeSubtitleTrackUrl=null;
  }
  setPlayerQualityOptions([]);
}
function playVideoElement(video,resumeTime=0){
  const resume=Number(resumeTime)||0;
  const start=()=>{
    if(resume>0&&Number.isFinite(video.duration)&&video.duration>resume+2){
      try{video.currentTime=resume}catch(_){}
    }
    const playback=video.play();
    if(playback&&typeof playback.catch==="function"){
      playback.catch(error=>{
        if(error?.name==="NotAllowedError"){
          setPlayerStatus("Videoja është gati. Shtyp PLAY në kontrollet e videos.");
        }else{
          setPlayerStatus("Videoja nuk mundi të niste. Kontrollo burimin ose rrjetin.",true);
        }
      });
    }
  };
  if(video.readyState>=1)start();
  else video.addEventListener("loadedmetadata",start,{once:true});
}
async function playResolvedHls(masterUrl,resumeTime=0,expectedPlaybackId=playbackOpenId,onFatalNetworkError=null){
  const video=$("resolved-video");
  if(!video)throw new Error("Elementi video mungon në FLIXTV.");
  if(!/^https:\/\//i.test(String(masterUrl||"")))throw new Error("URL e videos nuk është HTTPS.");

  const sourceUrl=masterUrl;
  video.hidden=false;
  video.controls=true;
  video.autoplay=true;
  video.muted=false;
  video.playsInline=true;
  video.preload="auto";
  video.poster=currentPlayback?.item?.backdrop_path
    ?IMG+"w1280"+currentPlayback.item.backdrop_path:"";

  video.addEventListener("playing",clearPlayerStatus,{once:true});

  let Hls=null;
  try{
    Hls=await ensureHlsLibrary();
  }catch(error){
    console.warn("[FLIXTV] HLS.js failed to load; checking native HLS fallback.",error);
  }
  if(expectedPlaybackId!==playbackOpenId)return false;

  if(Hls&&Hls.isSupported()){
    setPlayerStatus("Po lidhet direkt me M3U8…");
    console.info("[FLIXTV] HLS.js source selected",{
      route:"direct M3U8",
      sourceHost:(()=>{try{return new URL(sourceUrl).host}catch(_){return "invalid"}})()
    });
    const hls=new Hls({
      enableWorker:true,
      lowLatencyMode:false,
      backBufferLength:30,
      maxBufferLength:20,
      maxMaxBufferLength:30,
      capLevelToPlayerSize:true,
      startLevel:-1,
      startFragPrefetch:true,
      manifestLoadingMaxRetry:1,
      levelLoadingMaxRetry:1,
      fragLoadingMaxRetry:1,
      manifestLoadingRetryDelay:500,
      levelLoadingRetryDelay:500,
      fragLoadingRetryDelay:500
    });
    activeHlsPlayer=hls;

    hls.on(Hls.Events.MANIFEST_PARSED,(_event,data)=>{
      if(activeHlsPlayer!==hls||expectedPlaybackId!==playbackOpenId)return;
      setPlayerQualityOptions(data.levels||hls.levels);
      playVideoElement(video,resumeTime);
    });

    hls.on(Hls.Events.ERROR,(_event,data)=>{
      if(activeHlsPlayer!==hls||!data||expectedPlaybackId!==playbackOpenId)return;
      const diagnosticUrl=String(data.url||data.context?.url||data.frag?.url||data.frag?.relurl||data.part?.url||data.networkDetails?.responseURL||"");
      console.warn("[FLIXTV] HLS request diagnostic",{
        type:data.type,
        details:data.details,
        fatal:!!data.fatal,
        url:diagnosticUrl,
        status:data.response?.code||data.networkDetails?.status||0,
        reason:data.reason||"",
        fragment:data.frag?{relurl:data.frag.relurl||"",baseurl:data.frag.baseurl||"",level:data.frag.level,sn:data.frag.sn}:null,
        response:data.response?{code:data.response.code,text:data.response.text||""}:null
      });
      if(!data.fatal)return;

      if(data.type===Hls.ErrorTypes.NETWORK_ERROR){
        const status=Number(data.response?.code||data.networkDetails?.status||0);
        const failedUrl=String(data.url||data.context?.url||data.frag?.url||data.frag?.relurl||data.part?.url||data.networkDetails?.responseURL||"");
        const diagnostic={
          status,
          url:failedUrl,
          details:String(data.details||"networkError"),
          reason:String(data.reason||"")
        };
        if(typeof onFatalNetworkError==="function"){
          onFatalNetworkError(diagnostic);
          return;
        }

        const detail=status===404
          ?"CDN kthen HTTP 404: segmenti nuk u gjet."
          :status===403
            ?"CDN kthen HTTP 403: burimi nuk u lejua."
            :"Kërkesa HLS dështoi. Mund të jetë problem rrjeti, CORS ose burimi.";
        const resource=failedUrl?(" Burimi: "+failedUrl):"";
        setPlayerStatus(detail+" "+String(data.details||"")+resource,true);
        return;
      }
      if(data.type===Hls.ErrorTypes.MEDIA_ERROR){
        try{hls.recoverMediaError();return}catch(_){}
      }
      setPlayerStatus("HLS dështoi: "+String(data.details||data.type||"gabim i panjohur"),true);
    });

    hls.attachMedia(video);
    hls.loadSource(sourceUrl);
    return true;
  }

  if(video.canPlayType("application/vnd.apple.mpegurl")){
    setPlayerStatus("Po hapet M3U8 direkt në player…");
    const onNativeError=()=>{
      if(expectedPlaybackId!==playbackOpenId)return;
      const mediaError=video.error;
      console.error("[FLIXTV] Native HLS playback failed",{
        code:mediaError?.code||0,
        message:mediaError?.message||"",
        source:video.currentSrc||masterUrl
      });
      setPlayerStatus("Shfletuesi nuk mundi të lexojë manifestin ose segmentet HLS.",true);
    };
    video.addEventListener("error",onNativeError,{once:true});
    video.src=masterUrl;
    video.load();
    playVideoElement(video,resumeTime);
    return true;
  }

  throw new Error("Kjo pajisje nuk mbështet HLS përmes HLS.js ose videos HTML5.");
}
function isIOSDevice(){
  return /iPad|iPhone|iPod/.test(navigator.userAgent)||
    (navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
}
function syncPlayerOrientation(){window.FlixPlayerOrientation?.sync()}
function requestPlayerFullscreen(){window.FlixPlayerOrientation?.requestFullscreen()}
async function openResolvedPlayback(item,season,episode,button=null,resumeTime=0){
  if(!item||!item.id)return null;
  const mediaType=kind(item)==="tv"?"tv":"movie",playbackId=++playbackOpenId;
  clearTimeout(introTimer);$("content-intro").classList.remove("show");$("content-intro").setAttribute("aria-hidden","true");
  $("details-modal").classList.remove("open");
  playbackReturnToTitlePage=!$("title-page").hidden;
  currentPlayback={item,season:mediaType==="tv"?Number(season||1):null,episode:mediaType==="tv"?Number(episode||1):null};
  latestPlaybackTime=0;latestPlaybackDuration=0;lastProgressWrite=0;
  stopResolvedVideo({preserveCineSrcFrame:true});clearExternalSubtitles();
  const frame=$("cinesrc-frame");if(!frame)throw new Error("BingeAPI iframe mungon në player-in FLIXTV.");
  frame.hidden=false;frame.setAttribute("title","BingeAPI player");
  frame.setAttribute("loading","eager");frame.setAttribute("fetchpriority","high");
  frame.setAttribute("allow","autoplay; fullscreen; picture-in-picture; encrypted-media");
  // Sandbox keeps the external player isolated while permitting fullscreen presentation,
  // while keeping the embedded BingeAPI document isolated from the parent page.
  frame.setAttribute("sandbox","allow-scripts allow-same-origin allow-forms allow-presentation allow-pointer-lock");
  $("resolved-video").hidden=true;$("player-quality-select").hidden=true;
  const subtitleToolbar=$("subtitle-toolbar");if(subtitleToolbar)subtitleToolbar.hidden=true;
  modal("player-modal",true);clearInterval(heroTimer);heroTimer=null;
  $("player-modal").dataset.playerState="loading";setPlayerStatus("Po lidhet me BingeAPI…");
  requestPlayerFullscreen();syncPlayerOrientation();startPlaybackProgressTracking();
  const id=encodeURIComponent(String(item.id));
  const url=new URL("https://bingeapi.st/embed/"+mediaType+"/"+id);
  if(mediaType==="tv"){
    url.pathname+="/"+Math.max(1,Number(season)||1)+"/"+Math.max(1,Number(episode)||1);
  }
  url.searchParams.set("theme","dark");
  url.searchParams.set("sub_lang","alb");
  url.searchParams.set("sub_os","1");
  url.searchParams.set("autoplay","1");
  frame.onload=()=>{
    if(playbackId!==playbackOpenId)return;
    $("player-modal").dataset.playerState="ready";
    setPlayerStatus("");
    window.dispatchEvent(new CustomEvent("flxtv:cinesrc-event",{detail:{type:"ready",data:{provider:"bingeapi"}}}));
  };
  frame.onerror=()=>{
    if(playbackId!==playbackOpenId)return;
    $("player-modal").dataset.playerState="error";
    setPlayerStatus("BingeAPI nuk u ngarkua. Kontrollo lidhjen ose burimin.",true);
  };
  frame.src=url.href;
  console.info("[FLIXTV] BingeAPI playback opened",{title:title(item),mediaType,tmdbId:item.id,season:currentPlayback.season,episode:currentPlayback.episode,resumeTime:Number(resumeTime)||0,embedUrl:url.href});
  return {provider:"bingeapi",format:"iframe",embedUrl:url.href};
}
function play(item,season,episode){
  if(!item||!item.id)return;
  const saved=getSavedProgress(item);
  const sameEpisode=kind(item)!=="tv"||
    (Number(saved?.season||0)===Number(season||1)&&Number(saved?.episode||0)===Number(episode||1));
  const resume=sameEpisode?Number(saved?.currentTime)||0:0;
  return openResolvedPlayback(item,season,episode,null,resume);
}
function hidePlayerControls(){$("player-modal").classList.add("controls-visible")}function showPlayerControls(){if(!$("player-modal").classList.contains("open"))return;$("player-modal").classList.add("controls-visible");clearTimeout(controlsTimer)}
function returnToPlaybackTitlePage(){
  const playback=currentPlayback;
  if(!playback?.item){closePlayer();return}
  const item={...playback.item,media_type:kind(playback.item)};
  const season=playback.season,episode=playback.episode;
  closePlayer();
  if(kind(item)==="tv"){
    titlePageSeason=Number(season||1);
    titlePageEpisode=Number(episode||1);
  }
  const target=pageUrl(item,false);
  if(location.pathname.replace(/\/$/,"")!==target){
    history.pushState({titlePage:true},"",target);
  }
  openTitlePage(item,false,false);
}
function closePlayer(){
  if(!$("player-modal").classList.contains("open"))return;
  window.FlixPlaybackProgress?.flush();renderContinueWatching();
  $("player-modal").classList.remove("ios-landscape-layout");
  playbackOpenId++;cinesrcResolveRequestId++;subtitleLookupRequest++;
  window.FlixPlaybackProgress?.stop();window.FlixCineSRC?.close();window.FlixPlayerOrientation?.exitFullscreen();
  $("player-modal").classList.remove("css-fullscreen");clearTimeout(controlsTimer);clearTimeout(introTimer);
  stopResolvedVideo();currentPlayback=null;
  if(playbackReturnToTitlePage){$("title-page").hidden=false;$("catalog").hidden=true;$("hero").hidden=true;playbackReturnToTitlePage=false}
  $("content-intro").classList.remove("show");$("content-intro").setAttribute("aria-hidden","true");
  $("player-modal").classList.remove("attention-active","open");$("player-modal").setAttribute("aria-hidden","true");
  ["--flxtv-vv-width","--flxtv-vv-height","--flxtv-vv-left","--flxtv-vv-top"].forEach(name=>$("player-modal").style.removeProperty(name));
  syncPlayerOrientation();if(heroItems.length>1)startHeroTimer();
}


/* FLIXTV external subtitle engine.
   Captions are rendered in the parent document and synchronized to CineSRC
   using its documented timeupdate/seeked postMessage events. */
let externalSubtitleCues=[],externalSubtitleOffset=0,externalSubtitleEnabled=true,lastSubtitleIndex=-1;
function parseSubtitleTimestamp(value){
 const m=String(value||"").trim().replace(",",".").match(/(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\.(\d{1,3})/);
 if(!m)return NaN;
 return (Number(m[1]||0)*3600+Number(m[2])*60+Number(m[3])+Number(("0."+String(m[4]).padEnd(3,"0"))));
}
function parseExternalSubtitles(raw){
 const text=String(raw||"").replace(/^\uFEFF/,"").replace(/\r/g,"");
 const blocks=text.split(/\n{2,}/),cues=[];
 for(const block of blocks){
  const lines=block.split("\n").map(x=>x.trimEnd());
  const timingIndex=lines.findIndex(line=>line.includes("-->"));
  if(timingIndex<0)continue;
  const timing=lines[timingIndex].split("-->");
  const start=parseSubtitleTimestamp(timing[0]),end=parseSubtitleTimestamp(timing[1].trim().split(/\s+/)[0]);
  const body=lines.slice(timingIndex+1).filter(Boolean).join("\n").replace(/<\/?(?:i|b|u|font|c|ruby|rt)[^>]*>/gi,"").replace(/<[^>]+>/g,"");
  if(Number.isFinite(start)&&Number.isFinite(end)&&end>start&&body)cues.push({start,end,text:body});
 }
 return cues.sort((x,y)=>x.start-y.start);
}
function renderExternalSubtitle(time){
 const host=$("external-subtitle-overlay");
 if(activeSubtitleTrack&&!$("resolved-video")?.hidden){if(host)host.textContent="";return}
 if(!host||!externalSubtitleEnabled||!externalSubtitleCues.length){if(host)host.textContent="";return}
 const t=Math.max(0,Number(time)||0)+externalSubtitleOffset;
 let lo=0,hi=externalSubtitleCues.length-1,found=-1;
 while(lo<=hi){const mid=(lo+hi)>>1,cue=externalSubtitleCues[mid];if(t<cue.start)hi=mid-1;else if(t>=cue.end)lo=mid+1;else{found=mid;break}}
 if(found===lastSubtitleIndex)return;
 lastSubtitleIndex=found;host.textContent=found>=0?externalSubtitleCues[found].text:"";
}
function removeNativeSubtitleTrack(){
 if(activeSubtitleTrack){
  try{activeSubtitleTrack.remove()}catch(_){}
  activeSubtitleTrack=null;
 }
 if(activeSubtitleTrackUrl){
  try{URL.revokeObjectURL(activeSubtitleTrackUrl)}catch(_){}
  activeSubtitleTrackUrl=null;
 }
}
function formatVttTimestamp(seconds){
 const ms=Math.max(0,Math.round(Number(seconds||0)*1000));
 const hours=Math.floor(ms/3600000);
 const minutes=Math.floor((ms%3600000)/60000);
 const wholeSeconds=Math.floor((ms%60000)/1000);
 const milli=ms%1000;
 return String(hours).padStart(2,"0")+":"+
  String(minutes).padStart(2,"0")+":"+
  String(wholeSeconds).padStart(2,"0")+"."+
  String(milli).padStart(3,"0");
}
function cuesToWebVtt(cues){
 const blocks=(cues||[]).map((cue,index)=>{
  const start=Math.max(0,Number(cue.start)+externalSubtitleOffset);
  const end=Math.max(start+0.05,Number(cue.end)+externalSubtitleOffset);
  return (index+1)+"\n"+formatVttTimestamp(start)+" --> "+
   formatVttTimestamp(end)+"\n"+String(cue.text||"").replace(/\r/g,"");
 });
 return "WEBVTT\n\n"+blocks.join("\n\n")+"\n";
}
function attachNativeSubtitleTrack(cues,label="Titra",language="sq"){
 const video=$("resolved-video");
 if(!video||!Array.isArray(cues)||!cues.length)return false;
 removeNativeSubtitleTrack();
 const blob=new Blob([cuesToWebVtt(cues)],{type:"text/vtt;charset=utf-8"});
 activeSubtitleTrackUrl=URL.createObjectURL(blob);
 const track=document.createElement("track");
 track.kind="subtitles";
 track.label=label;
 track.srclang=language||"sq";
 track.default=true;
 track.dataset.flxtvSubtitle="true";
 track.src=activeSubtitleTrackUrl;
 activeSubtitleTrack=track;
 const activate=()=>{
  try{if(track.track)track.track.mode=externalSubtitleEnabled?"showing":"disabled"}catch(_){}
 };
 track.addEventListener("load",activate,{once:true});
 video.addEventListener("loadedmetadata",activate,{once:true});
 video.append(track);
 activate();
 return true;
}
function clearExternalSubtitles(){
 externalSubtitleCues=[];lastSubtitleIndex=-1;externalSubtitleOffset=0;externalSubtitleEnabled=true;
 removeNativeSubtitleTrack();
 const host=$("external-subtitle-overlay");if(host)host.textContent="";
 const status=$("subtitle-status");if(status)status.textContent="Pa titra të ngarkuar";
}
async function loadExternalSubtitleFile(file){
 if(!file)return;
 subtitleLookupRequest++;
 if(file.size>5*1024*1024){notice("Skedari i titrave është shumë i madh (maksimumi 5 MB).");return}
 try{
  const raw=await file.text(),cues=parseExternalSubtitles(raw);
  if(!cues.length)throw new Error("Nuk u gjetën titra të vlefshëm. Përdor formatin SRT ose VTT.");
  externalSubtitleCues=cues;externalSubtitleOffset=0;lastSubtitleIndex=-1;externalSubtitleEnabled=true;
  activeSubtitleLabel=file.name||"Titra";
  activeSubtitleLanguage="sq";
  if($("cinesrc-frame")?.hidden)attachNativeSubtitleTrack(cues,activeSubtitleLabel,activeSubtitleLanguage);else removeNativeSubtitleTrack();
  $("subtitle-status").textContent="Titra aktivë · "+cues.length+" rreshta";
  $("subtitle-toggle").textContent="CC ON";
  renderExternalSubtitle(latestPlaybackTime);
  notice("Titrat u ngarkuan me sukses.");
 }catch(error){notice(error.message||"Skedari i titrave nuk u lexua.")}
}
let subtitleLookupRequest=0,subtitleDownloadRequest=0,activeSubtitleCandidates=[],activeSubtitleLookupId=0;
function subtitleScore(entry,item,season,episode){
 const x=entry.attributes||{},f=x.feature_details||{};
 const norm=v=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
 const same=(u,v)=>u!=null&&v!=null&&String(u).replace(/^tt0*/i,"")===String(v).replace(/^tt0*/i,"");
 const imdb=String(item?.external_ids?.imdb_id||item?.imdb_id||"").replace(/^tt0*/i,"");
 const tv=kind(item)==="tv",expected=norm(title(item));let s=x.moviehash_match?10000:0;
 if(tv){
  if(same(f.parent_tmdb_id,item.id))s+=1600;if(imdb&&same(f.parent_imdb_id,imdb))s+=1800;
  if(f.season_number!=null)s+=Number(f.season_number)===Number(season)?220:-180;
  if(f.episode_number!=null)s+=Number(f.episode_number)===Number(episode)?260:-220;
  const actual=norm(f.parent_title||f.title||f.movie_name);
  if(actual&&actual===expected)s+=350;else if(actual&&(actual.includes(expected)||expected.includes(actual)))s+=180;
 }else{
  if(same(f.tmdb_id,item.id))s+=1600;if(imdb&&same(f.imdb_id,imdb))s+=1800;
  const actual=norm(f.title||f.movie_name);
  if(actual&&actual===expected)s+=350;else if(actual&&(actual.includes(expected)||expected.includes(actual)))s+=180;
  const year=String(item?.release_date||"").slice(0,4);if(year&&String(f.year||"")===year)s+=90;else if(year&&f.year)s-=100;
 }
 const release=norm(x.release||x.files?.[0]?.file_name),words=expected.split(" ").filter(w=>w.length>2);
 if(words.length&&release)s+=Math.round(70*words.filter(w=>release.includes(w)).length/words.length);
 if(x.from_trusted)s+=18;if(x.hd)s+=6;if(!x.hearing_impaired)s+=5;
 s+=Math.min(12,Math.max(0,Number(x.ratings)||0)*1.2)+Math.min(8,Math.max(0,Number(x.votes)||0)/100)+Math.min(5,Math.max(0,Number(x.download_count)||0)/10000);
 if(x.machine_translated||x.ai_translated||x.foreign_parts_only)s-=1000;return s;
}
function subtitleOptionLabel(entry,index){
 const x=entry.attributes||{},f=x.feature_details||{},release=String(x.release||x.files?.[0]?.file_name||f.title||f.movie_name||"Version pa emër");
 const tags=[];if(x.moviehash_match)tags.push("HASH");if(x.from_trusted)tags.push("Trusted");if(Number(x.fps)>0)tags.push(Number(x.fps).toFixed(3)+" FPS");if(x.hd)tags.push("HD");
 return (index+1)+". "+release.slice(0,54)+(tags.length?" · "+tags.join(" · "):"");
}

async function downloadSubtitleCandidate(chosen,lookupId,languageName,languageCode){
 const request=++subtitleDownloadRequest,attr=chosen?.attributes||{},file=(attr.files||[]).find(x=>Number(x.file_id)>0);
 if(!file)throw new Error("Rezultati nuk ka skedar titrash.");
 const status=$("subtitle-status");if(status)status.textContent="Po shkarkohen titrat…";
 const response=await fetch("/api/subtitles.js?action=download",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({file_id:file.file_id})});
 const payload=await response.json();if(request!==subtitleDownloadRequest||lookupId!==subtitleLookupRequest)return;
 if(!response.ok||!payload.content)throw new Error(payload.error||(languageCode==="sq"?"Shkarkimi i titrave dështoi.":"Subtitle download failed."));
 const cues=parseExternalSubtitles(payload.content);if(!cues.length)throw new Error("Skedari i titrave nuk përmban SRT/VTT të lexueshëm.");
 externalSubtitleCues=cues;externalSubtitleOffset=0;lastSubtitleIndex=-1;removeNativeSubtitleTrack();
 $("subtitle-offset-value").textContent="0.0s";$("subtitle-toggle").textContent="CC ON";
 activeSubtitleLabel="OpenSubtitles · "+languageName;activeSubtitleLanguage=attr.language||languageCode;
 if(status)status.textContent=(attr.moviehash_match?"Përputhje hash · ":"")+String(attr.release||file.file_name||"OpenSubtitles").slice(0,45)+" · "+cues.length+" rreshta";
 renderExternalSubtitle(latestPlaybackTime);
}

async function autoLoadOpenSubtitles(item,season,episode){
 const request=++subtitleLookupRequest;
 activeSubtitleCandidates=[];activeSubtitleLookupId=request;
 const choice=$("subtitle-choice");if(choice){choice.replaceChildren(new Option("Po kërkohen titrat…",""));choice.disabled=true}
 clearExternalSubtitles();
 const languageCode=activeWatchProfile?.language==="en"?"en":"sq";
 const languageName=languageCode==="sq"?"Shqip":"English";
 const status=$("subtitle-status");
 if(status)status.textContent=languageCode==="sq"?"Po kërkohen titrat shqip…":"Searching for English subtitles…";
 try{
  const imdbId=String(item?.external_ids?.imdb_id||item?.imdb_id||"").replace(/^tt0*/i,"");
  const params=new URLSearchParams();
  if(kind(item)==="tv"){
   params.set("parent_tmdb_id",String(item.id));
   if(imdbId)params.set("parent_imdb_id",imdbId);
   params.set("type","episode");
  }else{
   params.set("tmdb_id",String(item.id));
   if(imdbId)params.set("imdb_id",imdbId);
   params.set("type","movie");
  }
  params.set("languages",languageCode);
  params.set("hearing_impaired","exclude");
  params.set("foreign_parts_only","exclude");
  params.set("machine_translated","exclude");
  params.set("ai_translated","exclude");
  params.set("per_page","50");
  params.set("query",String(title(item)||"").trim());
  if(kind(item)!=="tv"){const release=String(item.release_date||"").slice(0,4);if(/^\\d{4}$/.test(release))params.set("year",release)}
  if(kind(item)==="tv"){params.set("season_number",String(season||1));params.set("episode_number",String(episode||1))}
  const response=await fetch("/api/subtitles.js?"+params.toString(),{headers:{Accept:"application/json"}});
  const result=await response.json();
  if(request!==subtitleLookupRequest)return;
  if(!response.ok)throw new Error(result.error||(languageCode==="sq"?"OpenSubtitles nuk u përgjigj.":"OpenSubtitles did not respond."));
  const subtitles=(Array.isArray(result.data)?result.data:[]).filter(entry=>{
   const attr=entry?.attributes||{};
   return String(attr.language||"").toLowerCase()===languageCode&&Array.isArray(attr.files)&&attr.files.some(file=>Number(file.file_id)>0)&&!attr.foreign_parts_only&&!attr.machine_translated&&!attr.ai_translated;
  });
  if(!subtitles.length){
   if(status)status.textContent=languageCode==="sq"?"Nuk u gjetën titra shqip për këtë titull.":"No English subtitles were found for this title.";
   return;
  }
  activeSubtitleCandidates=subtitles.slice().sort((x,y)=>subtitleScore(y,item,season,episode)-subtitleScore(x,item,season,episode));
  activeSubtitleLookupId=request;
  const choice=$("subtitle-choice");
  if(choice){choice.replaceChildren(new Option(languageCode==="sq"?"Zgjidh versionin e titrave":"Choose subtitle version",""));activeSubtitleCandidates.forEach((entry,index)=>choice.add(new Option(subtitleOptionLabel(entry,index),String(index))));choice.disabled=false;choice.value="0";}
  await downloadSubtitleCandidate(activeSubtitleCandidates[0],request,languageName,languageCode);
 }catch(error){
  if(request!==subtitleLookupRequest)return;
  console.warn("[FLIXTV] Automatic subtitle lookup failed:",error);
  if(status)status.textContent=error.message||"Automatic subtitles could not be loaded";
 }
}
function updateSubtitleOffset(delta){
 externalSubtitleOffset=Math.max(-30,Math.min(30,externalSubtitleOffset+delta));
 $("subtitle-offset-value").textContent=(externalSubtitleOffset>0?"+":"")+externalSubtitleOffset.toFixed(1)+"s";
 if(activeSubtitleTrack)attachNativeSubtitleTrack(externalSubtitleCues,activeSubtitleLabel,activeSubtitleLanguage);
 lastSubtitleIndex=-1;renderExternalSubtitle(latestPlaybackTime);
}

const subtitleFileInput=$("subtitle-file-input");
if(subtitleFileInput)subtitleFileInput.addEventListener("change",event=>{loadExternalSubtitleFile(event.target.files&&event.target.files[0]);event.target.value="";});
const subtitleChoice=$("subtitle-choice");
if(subtitleChoice)subtitleChoice.addEventListener("change",()=>{const i=Number(subtitleChoice.value);if(Number.isInteger(i)&&activeSubtitleCandidates[i])downloadSubtitleCandidate(activeSubtitleCandidates[i],activeSubtitleLookupId,activeWatchProfile?.language==="en"?"English":"Shqip",activeWatchProfile?.language==="en"?"en":"sq").catch(e=>notice(e.message));});
const subtitleLoadButton=$("subtitle-load-button");
if(subtitleLoadButton)subtitleLoadButton.addEventListener("click",()=>subtitleFileInput&&subtitleFileInput.click());
const subtitleToggle=$("subtitle-toggle");
if(subtitleToggle)subtitleToggle.addEventListener("click",()=>{
 externalSubtitleEnabled=!externalSubtitleEnabled;
 subtitleToggle.textContent=externalSubtitleEnabled?"CC ON":"CC OFF";
 if(activeSubtitleTrack&&activeSubtitleTrack.track){
  try{activeSubtitleTrack.track.mode=externalSubtitleEnabled?"showing":"disabled"}catch(_){}
 }
 lastSubtitleIndex=-1;renderExternalSubtitle(latestPlaybackTime);
});
const subtitleMinus=$("subtitle-offset-minus"),subtitlePlus=$("subtitle-offset-plus");
if(subtitleMinus)subtitleMinus.addEventListener("click",()=>updateSubtitleOffset(-0.5));
if(subtitlePlus)subtitlePlus.addEventListener("click",()=>updateSubtitleOffset(0.5));
window.addEventListener("pagehide",()=>savePlaybackProgress(true));
window.addEventListener("beforeunload",()=>savePlaybackProgress(true));
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")savePlaybackProgress(true)});
function runBrandIntro(){
 const splash=$("brand-intro");if(!splash){openProfilePicker();return;}
 const reduced=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
 if(reduced){splash.remove();openProfilePicker();return;}
 requestAnimationFrame(()=>splash.classList.add("stage-mark"));
 setTimeout(()=>splash.classList.add("stage-word"),1450);
 setTimeout(()=>splash.classList.add("stage-exit"),3500);
 setTimeout(()=>{splash.remove();window.dispatchEvent(new Event("flxtv:intro-finished"));openProfilePicker()},4200);
}
loadWatchProfiles();
window.FlixLocale?.setLanguage(activeWatchProfile?.language||"sq");
restoreWatchProgress();
renderContinueWatching();
ensureProfileUi();
// A Continue Watching deep link already belongs to the previously selected
// viewer. Keep that profile from localStorage and go straight to playback.
const isDirectPlaybackRoute=location.pathname.split("/").filter(Boolean)[1]==="play";
if(isDirectPlaybackRoute){
 document.documentElement.classList.add("profile-ready");
 const splash=$("brand-intro");if(splash)splash.remove();
}else{
 runBrandIntro();
}
$("play-title").onclick=()=>play(selected);$("play-episode").onclick=()=>play(selected,$("season-select").value,$("episode-select").value);const playerCloseButton=$("player-close");if(playerCloseButton)playerCloseButton.onclick=closePlayer;
document.querySelectorAll("[data-close]").forEach(e=>e.onclick=()=>modal(e.dataset.close+"-modal",false));
const movieGenreSelect=$("movie-genre-select");
const genreCollections=$("movie-genre-collections");
const movieCatalogSections=[...document.querySelectorAll("#movies-page > .catalog-row-section")];
const moviePageTitle=document.querySelector("#movies-page .page-catalog-head h1");
const movieJumpNav=document.querySelector("#movies-page .catalog-jump-nav");
const genreNames={28:"Aksion",12:"Aventurë",16:"Animacion",35:"Komedi",80:"Krim",99:"Dokumentar",18:"Dramë",10751:"Familjar",14:"Fantazi",36:"Histori",27:"Horror",10402:"Muzikë",9648:"Mister",10749:"Romancë",878:"Fantashkencë",53:"Thriller",10752:"Luftë",37:"Western"};
const genreMixes={
  28:[12,878,53,80,18,14],12:[28,14,878,10751,16,37],16:[10751,12,14,35,878,10402],35:[10749,28,80,18,10751,14,16],80:[53,18,28,9648,35,12],99:[36,10402,18,10752,10751],18:[10749,80,53,36,10752,35],10751:[16,35,12,14,10749,28],14:[12,28,10751,10749,878,16],36:[18,10752,10749,99,28],27:[53,9648,80,878,18,14],10402:[18,10749,35,16,99],9648:[53,80,18,27,878,80],10749:[35,18,14,10402,10751,36],878:[28,12,53,18,14,27],53:[28,80,9648,27,18,878],10752:[28,18,36,80,12],37:[28,12,18,36,80,10752]
};
let genreRequest=0;
function makeGenreRow(label,idList,index){
 const section=document.createElement("section");
 section.className="content-section catalog-row-section genre-results-section";
 const heading=document.createElement("div");heading.className="section-heading";
 const h2=document.createElement("h2");h2.textContent=label;
 heading.append(h2);
 const posters=document.createElement("div");posters.className="poster-row";posters.id="genre-row-"+index;
 posters.innerHTML='<div class="genre-loading">Loading '+label.toLowerCase()+'…</div>';
 section.append(heading,posters);genreCollections.append(section);
 return {id:posters.id,path:"/discover/movie?with_genres="+idList.join(",")+"&sort_by=popularity.desc",page:0,totalPages:10,loading:false,done:false,seen:new Set(),observer:null};
}
async function loadMoreGenreMovies(item,request){
 if(item.loading||item.done||request!==genreRequest)return;
 item.loading=true;
 const nextPage=item.page+1;
 try{
  const separator=item.path.includes("?")?"&":"?";
  const data=await tmdb(item.path+separator+"page="+nextPage);
  if(request!==genreRequest)return;
  const results=(data.results||[]).filter(movie=>movie.poster_path&&!item.seen.has(movie.id));
  results.forEach(movie=>item.seen.add(movie.id));
  const container=$(item.id);
  const loadingMessage=container.querySelector(".genre-loading");
  if(loadingMessage)loadingMessage.remove();
  if(results.length)container.append(...results.map(card));
  item.page=nextPage;
  item.totalPages=Math.min(Number(data.total_pages)||10,10);
  item.done=item.page>=item.totalPages||results.length===0;
  if(!container.children.length)container.innerHTML='<div class="genre-loading">No movies found in this collection.</div>';
  else if(!item.done){
   let hint=container.querySelector(".genre-more-hint");
   if(!hint){
    hint=document.createElement("div");
    hint.className="genre-more-hint";
    hint.textContent="Po ngarkohen më shumë filma...";
    hint.style.cssText="flex:0 0 150px;align-self:center;color:#929bab;font-size:12px;text-align:center;padding:12px";
    container.append(hint);
    if("IntersectionObserver" in window){
     item.observer=new IntersectionObserver(entries=>{
      if(entries.some(entry=>entry.isIntersecting))loadMoreGenreMovies(item,request);
     },{root:container,rootMargin:"0px 420px 0px 0px",threshold:0});
     item.observer.observe(hint);
    }
   }
  }else{
   if(item.observer){item.observer.disconnect();item.observer=null}
   const hint=container.querySelector(".genre-more-hint");if(hint)hint.remove();
  }
 }catch(error){
  if(request===genreRequest){notice(error.message);item.done=true}
 }finally{
  item.loading=false;
 }
}
async function loadGenreCollections(genreId){
 const request=++genreRequest;
 const primary=genreNames[genreId];
 if(!genreId){
  genreCollections.hidden=true;
  movieCatalogSections.forEach(section=>section.hidden=false);
  moviePageTitle.textContent="Movies";
  movieJumpNav.hidden=false;
  return;
 }
 movieCatalogSections.forEach(section=>section.hidden=true);
 moviePageTitle.textContent=primary+" filma";
 movieJumpNav.hidden=true;
 genreCollections.hidden=false;
 genreCollections.replaceChildren();
 const rows=[
  makeGenreRow(primary+" Movies",[genreId],0),
  ...[...new Set(genreMixes[genreId]||[])].map((secondary,index)=>makeGenreRow(primary+" + "+genreNames[secondary], [genreId,secondary],index+1))
 ];
 rows.forEach(item=>{
  const container=$(item.id);
  let scrollTimer;
  container.addEventListener("scroll",()=>{
   clearTimeout(scrollTimer);
   scrollTimer=setTimeout(()=>{
    if(container.scrollLeft+container.clientWidth>=container.scrollWidth-260)loadMoreGenreMovies(item,request);
   },90);
  },{passive:true});
  loadMoreGenreMovies(item,request);
 });
 genreCollections.scrollIntoView({behavior:"smooth",block:"start"});
}
if(movieGenreSelect)movieGenreSelect.addEventListener("change",()=>loadGenreCollections(movieGenreSelect.value));

const SPORTS_MANIFEST_KEY="flxtv:sports-manifest:v1";
let sportsManifest=null,sportsCatalogs=[],sportsActiveCatalog=null;
function sportsUrl(){try{return localStorage.getItem(SPORTS_MANIFEST_KEY)||""}catch(_){return""}}
async function sportsRequest(path){
 const response=await fetch("/api/sports.js",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({path,manifest:sportsUrl()})});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(data.error||"Sports Streams nuk u ngarkua.");
 return data;
}
function sportsLabel(value){return String(value||"Sport").replace(/[_-]+/g," ").replace(/\b\w/g,c=>c.toUpperCase())}
function sportsIcon(value){
 const v=String(value||"").toLowerCase();
 if(/football|soccer|futboll/.test(v))return "⚽";
 if(/basket|nba/.test(v))return "🏀";
 if(/tennis/.test(v))return "🎾";
 if(/cricket/.test(v))return "🏏";
 if(/rugby/.test(v))return "🏉";
 if(/hockey/.test(v))return "🏒";
 if(/baseball/.test(v))return "⚾";
 if(/mma|ufc|fight|boxing|box/.test(v))return "🥊";
 if(/motorsport|formula|f1|racing/.test(v))return "🏎️";
 if(/volley/.test(v))return "🏐";
 return "🏆";
}
function sportsImage(item){
 const images=[item.poster,item.posterUrl,item.poster_url,item.background,item.backgroundUrl,item.logo,item.logoUrl,item.thumbnail,item.thumb,item.image,item.imageUrl,item.picture,item.fanart,item.icon,...(Array.isArray(item.images)?item.images:[])];
 return images.find(v=>typeof v==="string"&&/^https?:\/\//i.test(v))||"";
}
function sportsBrand(item){
 const name=String(item.name||item.title||item.id||"").toLowerCase();
 if(/tnt\s*sport\s*1/.test(name))return {text:"TNT",sub:"SPORT 1",className:"tnt"};
 if(/tnt\s*sport\s*2/.test(name))return {text:"TNT",sub:"SPORT 2",className:"tnt"};
 if(/sky\s*sports/.test(name))return {text:"sky",sub:"SPORTS",className:"sky"};
 if(/\bcnn\b/.test(name))return {text:"CNN",sub:"",className:"cnn"};
 if(/\bmsnbc\b/.test(name))return {text:"MSNBC",sub:"",className:"msnbc"};
 return null;
}
function sportsTeamInfo(value){
 if(!value)return null;
 if(typeof value==="string")return {name:value,logo:""};
 if(typeof value!=="object")return null;
 return {name:value.name||value.title||value.shortName||value.abbreviation||"",logo:value.logo||value.logoUrl||value.image||value.badge||value.crest||""};
}
function sportsTeams(item){
 const pair=item.teams||item.competitors||item.participants||[];
 const home=sportsTeamInfo(item.homeTeam||item.home||item.team1||pair[0]);
 const away=sportsTeamInfo(item.awayTeam||item.away||item.team2||pair[1]);
 return home&&away&&home.name&&away.name?{home,away}:null;
}
function sportsStartDate(item){
 const raw=item.start||item.startsAt||item.startTime||item.start_time||item.date||item.datetime||item.releaseDate||item.release_date||item.time||item.kickoff||item.scheduled||item.timestamp;
 if(raw===undefined||raw===null||raw==="")return null;
 const date=typeof raw==="number"?(raw<1e12?new Date(raw*1000):new Date(raw)):new Date(raw);
 return Number.isNaN(date.getTime())?null:date;
}
function sportsDate(item){
 const date=sportsStartDate(item);if(!date)return "";
 return new Intl.DateTimeFormat(activeWatchProfile?.language==="en"?"en-GB":"sq-AL",{timeZone:"Europe/Tirane",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit",hour12:false}).format(date);
}
function sportsCountdown(item){
 const date=sportsStartDate(item);if(!date)return "";
 const diff=date.getTime()-Date.now();if(diff<=0)return "";
 const total=Math.floor(diff/60000),hours=Math.floor(total/60),minutes=total%60;
 if(hours&&minutes)return "Vazhdon në: "+hours+" orë e "+minutes+" minuta";
 if(hours)return "Vazhdon në: "+hours+" orë";
 return "Vazhdon në: "+minutes+" minuta";
}
function renderSportsItems(items){
 const grid=$("sports-grid");grid.replaceChildren();
 $("sports-empty").hidden=items.length>0;
 $("sports-empty").textContent=items.length?"":"Nuk ka evente në këtë kategori për momentin.";
 items.forEach(item=>{
  const button=document.createElement("button");button.type="button";button.className="sports-card";
  const live=item.live===true||String(item.name||item.title||"").toLowerCase().includes("live");
  const titleText=item.name||item.title||item.id||"Event sportiv";
  const category=sportsLabel(item.type||item.category||sportsActiveCatalog?.name||"Sport");
  const image=sportsImage(item),time=sportsDate(item),countdown=sportsCountdown(item),teams=sportsTeams(item),brand=sportsBrand(item);
  button.innerHTML='<div class="sports-card-media"><div class="sports-card-art"><span></span></div></div><span class="sports-card-copy"><small></small><strong></strong><div class="sports-team-pair" hidden><span class="sports-team-home"><img alt=""><b></b></span><i>VS</i><span class="sports-team-away"><img alt=""><b></b></span></div><time></time><em class="sports-countdown"></em><em>Shiko eventin →</em></span>';
  const media=button.querySelector(".sports-card-media"),art=button.querySelector(".sports-card-art"),artLabel=art.querySelector("span");
  artLabel.textContent=brand?brand.text:sportsIcon(category);
  if(brand){art.classList.add("sports-brand-art",brand.className);if(brand.sub){const sub=document.createElement("small");sub.textContent=brand.sub;art.append(sub)}}
  if(image){const img=document.createElement("img");img.loading="lazy";img.alt="";img.src=image;img.onerror=()=>{img.remove();art.hidden=false};media.prepend(img);art.hidden=true}
  button.querySelector("small").textContent=live?"● LIVE":category;
  button.querySelector("strong").textContent=titleText;
  if(teams){const pair=button.querySelector(".sports-team-pair");pair.hidden=false;const home=pair.querySelector(".sports-team-home"),away=pair.querySelector(".sports-team-away");home.querySelector("b").textContent=teams.home.name;away.querySelector("b").textContent=teams.away.name;if(teams.home.logo){home.querySelector("img").src=teams.home.logo}else{home.querySelector("img").hidden=true}if(teams.away.logo){away.querySelector("img").src=teams.away.logo}else{away.querySelector("img").hidden=true}}
  button.querySelector("time").textContent=time?("Shqipëri · "+time):"";
  button.querySelector("time").hidden=!time;
  button.querySelector(".sports-countdown").textContent=countdown;
  button.querySelector(".sports-countdown").hidden=!countdown;
  button.addEventListener("click",()=>openSportsEvent(item));
  grid.append(button);
 });
}
async function loadSportsCatalog(catalog){
 sportsActiveCatalog=catalog;$("sports-status").textContent="Po ngarkohen eventet…";
 try{
  const data=await sportsRequest("catalog/"+encodeURIComponent(catalog.type)+"/"+encodeURIComponent(catalog.id)+".json");
  const items=data.metas||data.items||[];
  renderSportsItems(items);
  $("sports-status").textContent=items.length+" evente";
 }catch(error){$("sports-status").textContent="Gabim";$("sports-empty").hidden=false;$("sports-empty").textContent=error.message}
}
async function openSportsEvent(item){
 const type=item.type||sportsActiveCatalog?.type||"sport",id=item.id;if(!id)return;
 $("sports-status").textContent="Po kërkohen burimet…";
 try{
  let meta=item;
  try{const d=await sportsRequest("meta/"+encodeURIComponent(type)+"/"+encodeURIComponent(id)+".json");meta=d.meta||item}catch(_){}
  const videoId=meta.videos?.[0]?.id||id;
  const result=await sportsRequest("stream/"+encodeURIComponent(type)+"/"+encodeURIComponent(videoId)+".json");
  const streams=result.streams||[];
  if(!streams.length)throw new Error("Nuk u gjet burim transmetimi për këtë event.");
  showSportsStreams(meta,streams);
  $("sports-status").textContent=streams.length+" burime të disponueshme";
 }catch(error){notice(error.message);$("sports-status").textContent="Gati"}
}
function showSportsStreams(meta,streams){
 const grid=$("sports-grid");grid.replaceChildren();
 const head=document.createElement("div");head.className="sports-event-head";
 const h=document.createElement("h2");h.textContent=meta.name||meta.title||"Event sportiv";
 const back=document.createElement("button");back.className="secondary-btn";back.type="button";back.textContent="← Kthehu te eventet";back.onclick=()=>sportsActiveCatalog&&loadSportsCatalog(sportsActiveCatalog);
 head.append(h,back);grid.append(head);
 const panel=document.createElement("section");panel.className="sports-player-panel";
 const title=document.createElement("h3");title.textContent="Zgjidh transmetimin";
 const stage=document.createElement("div");stage.className="sports-inline-stage";stage.innerHTML='<div class="sports-player-placeholder"><span>▶</span><strong>FLIXTV LIVE</strong><small>Zgjidh një burim më poshtë</small></div>';
 const sourceList=document.createElement("div");sourceList.className="sports-source-list";
 panel.append(title,stage,sourceList);grid.append(panel);
 streams.forEach((stream,index)=>{
  const button=document.createElement("button");button.type="button";button.className="sports-source";
  button.textContent=stream.name||stream.title||stream.description||("Burimi "+(index+1));
  button.onclick=()=>{sourceList.querySelectorAll("button").forEach(x=>x.classList.toggle("active",x===button));playSportsStream(stream,stage)};
  sourceList.append(button);
 });
}
function playSportsStream(stream,stage){
 const url=stream.url||stream.externalUrl||stream.ytId&&("https://www.youtube.com/watch?v="+stream.ytId);
 if(!url){notice("Ky burim nuk ka adresë të luajtshme.");return}
 let parsed;try{parsed=new URL(url)}catch(_){notice("Adresa e burimit është e pavlefshme.");return}
 if(parsed.protocol!=="https:"&&parsed.protocol!=="http:"){notice("Protokoll i palejuar.");return}
 stage.replaceChildren();
 if(/\.(m3u8|mp4|webm)(?:$|\\?)/i.test(parsed.href)){
  const video=document.createElement("video");video.controls=true;video.autoplay=true;video.playsInline=true;video.preload="metadata";video.src=parsed.href;
  video.addEventListener("error",()=>notice("Ky burim nuk mund të luhet në këtë pajisje. Provo një burim tjetër."));
  stage.append(video);const p=video.play();if(p?.catch)p.catch(()=>{});
 }else{
  const frame=document.createElement("iframe");frame.src=parsed.href;frame.title="Transmetim sportiv";frame.allow="autoplay; fullscreen; encrypted-media; picture-in-picture";frame.allowFullscreen=true;frame.loading="eager";frame.referrerPolicy="strict-origin-when-cross-origin";stage.append(frame);
 }
}
function showDaddyLive(){window.location.assign("/daddylive")}

async function loadSports(){
 const grid=$("sports-grid");grid.replaceChildren();
 const cats=$("sports-categories");cats.replaceChildren();
 const daddyButton=document.createElement("button");daddyButton.type="button";daddyButton.className="sports-category";daddyButton.textContent="DaddyLive";
 daddyButton.onclick=()=>{cats.querySelectorAll("button").forEach(x=>x.classList.toggle("active",x===daddyButton));showDaddyLive()};
 cats.append(daddyButton);
 $("sports-status").textContent="Po lidhet me Sports Streams…";
 try{
  sportsManifest=await sportsRequest("manifest.json");
  sportsCatalogs=(sportsManifest.catalogs||[]).filter(c=>c.type==="sport"||sportsManifest.types?.includes(c.type));
  sportsCatalogs.forEach((catalog,index)=>{
   const button=document.createElement("button");button.type="button";button.className="sports-category"+(index===0?" active":"");button.textContent=catalog.name||sportsLabel(catalog.id);
   button.onclick=()=>{cats.querySelectorAll("button").forEach(x=>x.classList.toggle("active",x===button));loadSportsCatalog(catalog)};
   cats.append(button);
  });
  if(!sportsCatalogs.length)throw new Error("Manifest u hap, por nuk përmban katalogë sportivë.");
  await loadSportsCatalog(sportsCatalogs[0]);
 }catch(error){$("sports-status").textContent="Lidhja dështoi";$("sports-empty").hidden=false;$("sports-empty").textContent=error.message+" DaddyLive mbetet i disponueshëm te kategoritë më sipër."}
}

const loadedPages=new Set();
async function openPage(page,updateHistory=true){
 startFlixLoading();
 try{
  if(updateHistory){const target=page==="sports"?"/sports":page==="home"?"/":location.pathname;if(target!==location.pathname)history.pushState({page},"",target)}
  // Keep the old page on screen while data and first-screen artwork are prepared.
  if(page==="home"){renderContinueWatching();await home()}
  else if(page==="sports")await loadSports();
  else if(!loadedPages.has(page)){
   const jobs=page==="movies"?[
    ["movie-trending","/trending/movie/week"],["movie-popular","/movie/popular"],["movie-top","/movie/top_rated"],["movie-now","/movie/now_playing"],["movie-upcoming","/movie/upcoming"]
   ]:[
    ["show-trending","/trending/tv/week"],["show-popular","/tv/popular"],["show-top","/tv/top_rated"],["show-airing","/tv/on_the_air"],["show-today","/tv/airing_today"],
    ["show-action-adventure","/discover/tv?with_genres=10759&sort_by=popularity.desc"],["show-scifi-fantasy","/discover/tv?with_genres=10765&sort_by=popularity.desc"],
    ["show-crime-drama","/discover/tv?with_genres=80,18&sort_by=popularity.desc"],["show-comedy-romance","/discover/tv?with_genres=35,10749&sort_by=popularity.desc"],
    ["show-mystery-thriller","/discover/tv?with_genres=9648,53&sort_by=popularity.desc"]
   ];
   await Promise.all(jobs.map(([id,path])=>row(id,path)));loadedPages.add(page);
  }
  const targetRoot=page==="sports"?$("sports-page"):page==="home"?$("home-page"):page==="movies"?$("movies-page"):$("shows-page");
  await waitForFlixVisualReady(targetRoot);
  await finishFlixLoading();
  document.body.classList.remove("flxtv-movie-detail","flxtv-series-detail");setMovieGlobalAmbientSuppressed(false);syncMovieDetailHeader(false);
  document.querySelectorAll("[data-page]").forEach(x=>x.classList.toggle("active",x.dataset.page===page));requestAnimationFrame(updateDesktopNavPill);
  const appScroller=$("app");if(appScroller){appScroller.scrollTo({top:0,behavior:"instant"});appScroller.classList.remove("flix-page-enter");requestAnimationFrame(()=>appScroller.classList.add("flix-page-enter"))}
  $("search-page").hidden=true;$("sports-page").hidden=page!=="sports";$("catalog").hidden=page==="sports";
  $("hero").hidden=page!=="home";$("home-page").hidden=page!=="home";$("movies-page").hidden=page!=="movies";$("shows-page").hidden=page!=="shows";
 }catch(error){console.warn("Page navigation preparation failed",error);await finishFlixLoading()}
}
$("continue-library-open").onclick=openContinueLibrary;
$("continue-library-close").onclick=closeContinueLibrary;
$("continue-library-backdrop").onclick=closeContinueLibrary;
$("continue-library-modal").addEventListener("keydown",event=>{
 if(event.key==="Escape"){event.preventDefault();closeContinueLibrary();return}
 if(event.key!=="Tab")return;
 const items=[...$("continue-library-modal").querySelectorAll("button:not([disabled])")].filter(button=>button.offsetParent!==null);
 if(!items.length)return;
 const first=items[0],last=items[items.length-1];
 if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
 else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
});
$("continue-edit").onclick=toggleContinueEdit;
$("continue-library-edit").onclick=toggleContinueEdit;
$("trending-movies-more").onclick=()=>scrollHomeCarousel("trending-movies",1);
document.querySelectorAll("[data-page]").forEach(b=>b.onclick=()=>openPage(b.dataset.page));
 requestAnimationFrame(updateDesktopNavPill);
 window.addEventListener("resize",()=>requestAnimationFrame(updateDesktopNavPill),{passive:true});
 if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>requestAnimationFrame(updateDesktopNavPill)).catch(()=>{});
 document.querySelectorAll("[data-close]").forEach(e=>{if(e.dataset.close==="sports-settings")e.onclick=()=>modal("sports-settings",false)});
/* Subtle electrical fade/recharge after scrolling stops. */
let heroTitleFlickerTimer=null;
function triggerHeroTitleFlicker(){
 const hero=document.getElementById("hero");
 const titleWrap=hero&&hero.querySelector(".hero-title-wrap");
 const visibleTitle=titleWrap&&titleWrap.querySelector("#hero-title-logo:not([hidden]),#hero-title:not([hidden])");
 if(!visibleTitle||!hero||!titleWrap.getClientRects().length)return;
 const rect=hero.getBoundingClientRect();
 if(rect.bottom<=0||rect.top>=window.innerHeight)return;
 visibleTitle.classList.remove("is-flickering");
 void visibleTitle.offsetWidth;
 visibleTitle.classList.add("is-flickering");
 clearTimeout(triggerHeroTitleFlicker.cleanupTimer);
 triggerHeroTitleFlicker.cleanupTimer=setTimeout(()=>visibleTitle.classList.remove("is-flickering"),440);
}
let flixScrollIdleTimer=0;
function pauseScrollHeavyWork(){
 if(heroSmokeCanvasState?.raf){cancelAnimationFrame(heroSmokeCanvasState.raf);heroSmokeCanvasState.raf=0;}
 if(pageSmokeState?.raf){cancelAnimationFrame(pageSmokeState.raf);pageSmokeState.raf=0;}
}
function resumeScrollHeavyWork(){
 if(document.hidden||window.FlixPlayerFocus?.isActive()||$("player-modal")?.classList.contains("open")||$("home-page")?.hidden||$("hero")?.hidden)return;
 ensureHeroSmokeStage();
 ensurePageSmokeCanvas();
}
const onFlixVerticalScroll=()=>{
 if(window.FlixPlayerFocus?.isActive())return;
 pauseScrollHeavyWork();
 clearTimeout(flixScrollIdleTimer);
 flixScrollIdleTimer=setTimeout(resumeScrollHeavyWork,520);
};
// The app itself is the vertical scroller. Window-only listeners miss element scroll events.
const flixAppScroller=$("app");
if(flixAppScroller)flixAppScroller.addEventListener("scroll",onFlixVerticalScroll,{passive:true});
window.addEventListener("scroll",onFlixVerticalScroll,{passive:true});

window.addEventListener("flxtv:player-focus",event=>{
 const focused=!!event.detail?.active;
 if(focused){
  clearInterval(heroTimer);heroTimer=null;
  clearTimeout(showHero.contentTimer);
  clearTimeout(triggerHeroTitleFlicker.cleanupTimer);
  if(heroSmokeCanvasState?.raf){cancelAnimationFrame(heroSmokeCanvasState.raf);heroSmokeCanvasState.raf=0;}
  if(pageSmokeState?.raf){cancelAnimationFrame(pageSmokeState.raf);pageSmokeState.raf=0;}
 }else{
  resumeScrollHeavyWork();
  if(heroItems.length>1)startHeroTimer();
 }
});
$("hero-prev").onclick=()=>{if(heroItems.length>1){showHero(heroIndex-1);startHeroTimer()}};
$("hero-next").onclick=()=>{if(heroItems.length>1){showHero(heroIndex+1);startHeroTimer()}};
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&heroItems.length>1)startHeroTimer()});
window.addEventListener("pageshow",()=>{renderContinueWatching();if(heroItems.length>1)startHeroTimer()});
document.addEventListener("visibilitychange",()=>{if(!document.hidden)renderContinueWatching()});
if(window.__FLIXTV_TEST_MODE__===true&&/^\/test\/?$/.test(location.pathname)){document.documentElement.classList.remove("deep-route-loading");home()}else if(location.pathname.replace(/\/$/,"")==="/sports")openPage("sports",false);else if(location.pathname!=="/")resolveTitleRoute();else home();

window.FLIXTV_BRIDGE={
 openPage:function(page,updateHistory){return openPage(page,updateHistory!==false)},
 openTitle:function(item){if(!item||!item.id)return;var panel=document.getElementById("bf-route-page");if(panel)panel.hidden=true;return openTitlePage(item,true,false)},
 play:function(item,season,episode){return play(item,season,episode)},
 toggleSaved:function(item){return toggleHeroSaved(item)},
 ensureHeroCarousel:function(){const result=home();if(result&&typeof result.then==="function")result.finally(()=>{const catalog=document.getElementById("catalog"),hero=document.getElementById("hero");if(catalog)catalog.hidden=true;if(hero)hero.hidden=false;if(heroItems.length>1)startHeroTimer()});else if(heroItems.length>1)startHeroTimer();return result},
 library:function(){return {profileId:activeWatchProfile&&activeWatchProfile.id||"main",saved:readHeroSavedItems(),progress:readWatchProgress()}},
 markWatched:function(item){try{var key="flxtv:watched:v1:"+(activeWatchProfile&&activeWatchProfile.id||"main");var list=JSON.parse(localStorage.getItem(key)||"[]");if(!Array.isArray(list))list=[];var id=String(item&&item.id||"");list=list.filter(function(x){return !(String(x.id)===id&&kind(x)===kind(item))});list.unshift({id:item.id,media_type:kind(item),title:title(item),name:title(item),poster_path:item.poster_path||"",backdrop_path:item.backdrop_path||"",watchedAt:Date.now(),vote_average:item.vote_average||0});localStorage.setItem(key,JSON.stringify(list.slice(0,500)))}catch(error){console.warn("[FLIXTV] Could not store watched title",error)}},
 removeSaved:function(item){var list=readHeroSavedItems().filter(function(x){return !(String(x.id)===String(item.id)&&kind(x)===kind(item))});try{localStorage.setItem(heroListKey(),JSON.stringify(list));if(heroItems[heroIndex])renderHeroSaveButton(heroItems[heroIndex])}catch(error){notice("Nuk u ndryshua lista personale.")}},
 clearSaved:function(){try{localStorage.setItem(heroListKey(),"[]");if(heroItems[heroIndex])renderHeroSaveButton(heroItems[heroIndex])}catch(error){notice("Lista nuk u pastrua.")}},
 clearProgress:function(){writeWatchProgress({});renderContinueWatching()},
 removeProgress:function(item){if(!item)return;var data=readWatchProgress();delete data[progressId(item)];writeWatchProgress(data);renderContinueWatching()},
 openContinueEntry:function(entry){var item=continueEntryItem(entry);var panel=document.getElementById("bf-route-page");if(panel)panel.hidden=true;history.pushState({titlePage:true},"",continueWatchUrl(item,entry));return openTitlePage(item,false,true)}
};

})();