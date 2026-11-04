(() => {
"use strict";
const API=location.hostname.endsWith("github.io")?"https://flixtv-snowy.vercel.app/api/tmdb.js":"/api/tmdb.js",IMG="https://image.tmdb.org/t/p/",$=id=>document.getElementById(id);
/* FLIXTV anti-popup and anti-ad protections.
   These controls protect the parent app. Cross-origin iframe content has separate browser security boundaries. */
(()=>{
 const allowedFrameHosts=["cinesrc.st"];
 const isAllowedPlayerUrl=url=>{
  try{const host=new URL(url,location.href).hostname.toLowerCase();return allowedFrameHosts.some(allowed=>host===allowed||host.endsWith("."+allowed))}
  catch(_){return false}
 };
 const blockedPatterns=[
  /(^|\\.)doubleclick\\.net$/i,/(^|\\.)googlesyndication\\.com$/i,
  /(^|\\.)googleadservices\\.com$/i,/(^|\\.)adservice\\./i,
  /(^|\\.)popads\\./i,/(^|\\.)popcash\\./i,
  /(^|\\.)adsterra\\./i,/(^|\\.)exoclick\\./i,
  /(^|\\.)propellerads\\./i,/(^|\\.)taboola\\./i,
  /(^|\\.)outbrain\\./i,/(^|\\.)onclick\\./i
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
let selected=null,searchTimer=null,searchRequest=0,introTimer=null,controlsTimer=null,heroItems=[],heroIndex=0,heroTimer=null,heroLayer=0,heroBusy=false;
function notice(m){const e=$("notice");e.textContent=m;e.hidden=false;clearTimeout(notice.timer);notice.timer=setTimeout(()=>e.hidden=true,3600)}
function modal(id,on){$(id).classList.toggle("open",on);$(id).setAttribute("aria-hidden",String(!on));document.body.classList.toggle("no-scroll",on||$("player-modal").classList.contains("open"))}
function title(x){return x.title||x.name||x.original_title||x.original_name||"Pa titull"}
function kind(x){if(x&&x.media_type==="movie")return"movie";if(x&&x.media_type==="tv")return"tv";if(x&&x.release_date)return"movie";if(x&&x.first_air_date)return"tv";return"movie"}
function year(x){return(x.release_date||x.first_air_date||"").slice(0,4)}
function poster(x){return x.poster_path?IMG+"w342"+x.poster_path:""}
function card(x){
 const b=document.createElement("button");b.className="poster-card";b.type="button";
 const src=poster(x),rating=Number(x.vote_average);
 b.innerHTML=(src?'<img loading="lazy" alt="">':'<div class="placeholder">FLIXTV</div>')+
  (Number.isFinite(rating)&&rating>0?'<span class="poster-rating" aria-label="TMDB rating '+rating.toFixed(1)+'"><span aria-hidden="true">★</span> '+rating.toFixed(1)+'</span>':"")+
  '<span class="poster-title"></span><span class="poster-year"></span>';
 if(src)b.querySelector("img").src=src;
 b.querySelector(".poster-title").textContent=title(x);
 b.querySelector(".poster-year").textContent=year(x)+(kind(x)==="tv"?" · TV":"");
 b.onclick=()=>window.location.assign(pageUrl(x));return b
}
async function tmdb(path){const [pathname,query=""]=path.split("?");const params=new URLSearchParams(query);params.set("path",pathname);if(!params.has("language"))params.set("language","sq-AL");const r=await fetch(API+"?"+params.toString());if(!r.ok)throw Error("Kërkesa për katalogun dështoi ("+r.status+").");return r.json()}
async function translateOverviewToAlbanian(text){
 if(!text)return "";
 try{
  const response=await fetch("/api/translate.js?text="+encodeURIComponent(text));
  if(!response.ok)throw new Error("Translation unavailable");
  const data=await response.json();
  return data.translated||text;
 }catch(_){return text}
}
async function getAlbanianOverview(item,mediaType){
 let source=item.overview||"";
 if(!source){
  try{
   const english=await tmdb("/"+mediaType+"/"+item.id+"?language=en-US");
   source=english.overview||"";
  }catch(_){}
 }
 if(!source)return "";
 const translated=await translateOverviewToAlbanian(source);
 return translated||source;
}
const pagedRows=new Map();
async function appendRowPage(state){
 if(!state||state.loading||state.done)return;
 state.loading=true;
 const nextPage=state.page+1;
 try{
  const separator=state.path.includes("?")?"&":"?";
  const data=await tmdb(state.path+separator+"page="+nextPage);
  const container=$(state.id);
  if(!container)return;
  const results=(data.results||[]).filter(item=>item.poster_path&&!state.seen.has(item.id));
  results.forEach(item=>state.seen.add(item.id));
  const hint=container.querySelector(".row-more-hint");
  if(hint)hint.remove();
  if(results.length)container.append(...results.map(card));
  state.page=nextPage;
  state.totalPages=Math.min(Number(data.total_pages)||10,10);
  state.done=state.page>=state.totalPages||results.length===0;
  if(!state.done){
   const sentinel=document.createElement("div");
   sentinel.className="row-more-hint";
   sentinel.textContent="Po ngarkohen titujt...";
   sentinel.style.cssText="flex:0 0 125px;min-height:70px;display:grid;place-items:center;color:#929bab;font-size:11px;text-align:center;padding:10px";
   container.append(sentinel);
   if("IntersectionObserver" in window){
    state.observer=new IntersectionObserver(entries=>{
     if(entries.some(entry=>entry.isIntersecting))appendRowPage(state);
    },{root:container,rootMargin:"0px 420px 0px 0px",threshold:0});
    state.observer.observe(sentinel);
   }
  }else if(state.observer){state.observer.disconnect();state.observer=null}
 }catch(error){
  notice(error.message);
  state.done=true;
 }finally{state.loading=false}
}
async function row(id,path){
 try{
  const data=await tmdb(path);
  const container=$(id);
  if(!container)return data.results||[];
  const results=(data.results||[]).filter(item=>item.poster_path);
  container.replaceChildren(...results.map(card));
  const state={id,path,page:1,totalPages:Math.min(Number(data.total_pages)||10,10),loading:false,done:false,seen:new Set(results.map(item=>item.id)),observer:null};
  state.done=state.page>=state.totalPages||results.length===0;
  pagedRows.set(id,state);
  if(!state.done){
   const sentinel=document.createElement("div");
   sentinel.className="row-more-hint";
   sentinel.textContent="Loading as you browse";
   sentinel.style.cssText="flex:0 0 125px;min-height:70px;display:grid;place-items:center;color:#929bab;font-size:11px;text-align:center;padding:10px";
   container.append(sentinel);
   if("IntersectionObserver" in window){
    state.observer=new IntersectionObserver(entries=>{
     if(entries.some(entry=>entry.isIntersecting))appendRowPage(state);
    },{root:container,rootMargin:"0px 420px 0px 0px",threshold:0});
    state.observer.observe(sentinel);
   }
   let scrollTimer;
   container.addEventListener("scroll",()=>{
    clearTimeout(scrollTimer);
    scrollTimer=setTimeout(()=>{
     if(container.scrollLeft+container.clientWidth>=container.scrollWidth-260)appendRowPage(state);
    },90);
   },{passive:true});
  }
  return data.results||[];
 }catch(error){notice(error.message);return []}
}
function showHero(index){
 if(!heroItems.length)return;
 heroIndex=(index+heroItems.length)%heroItems.length;
 const item=heroItems[heroIndex];
 const request=++showHero.requestId;
 const nextLayer=heroLayer===0?1:0;
 const next=$(nextLayer===0?"hero-bg-a":"hero-bg-b");
 const current=$(heroLayer===0?"hero-bg-a":"hero-bg-b");
 const path=item.backdrop_path||item.poster_path;
 const imageUrl=IMG+(item.backdrop_path?"w1280":"w780")+path;
 const image='url("'+imageUrl+'")';
 const hero=$("hero");
 // Apply the image immediately so the featured panel never stays black while preloading.
 next.style.backgroundImage=image;
 next.style.backgroundSize="cover";
 next.style.backgroundPosition="center 32%";
 next.style.backgroundColor="#202938";
 next.classList.add("active");
 current.classList.remove("active");
 heroLayer=nextLayer;
 hero.style.backgroundImage='linear-gradient(90deg,rgba(5,7,12,.48),rgba(5,7,12,.08)),linear-gradient(0deg,#090b10 0%,transparent 72%)';
 document.querySelector("header.topbar").style.setProperty("--header-art",image);
 const preload=new Image();
 preload.onload=()=>{
   if(request!==showHero.requestId)return;
   next.style.backgroundImage=image;
 };
 preload.onerror=()=>{
   if(request!==showHero.requestId)return;
   next.style.backgroundImage="linear-gradient(135deg,#303b50,#111722)";
 };
 preload.src=imageUrl;
 $("hero-content").classList.add("changing");
 clearTimeout(showHero.contentTimer);
 showHero.contentTimer=setTimeout(()=>{
   if(request!==showHero.requestId)return;
   $("hero-title").textContent=title(item);
   $("hero-overview").textContent=item.overview||"Po përgatitet përshkrimi në shqip…";getAlbanianOverview(item,kind(item)).then(text=>{if(request===showHero.requestId&&text)$("hero-overview").textContent=text})
   $("hero-eyebrow").textContent="TË PËRZGJEDHUR";
   $("hero-action").textContent="Shiko detajet";
   $("hero-action").onclick=()=>window.location.assign(pageUrl(item));
   requestAnimationFrame(()=>$("hero-content").classList.remove("changing"));
 },180);
}
showHero.requestId=0;
function startHeroTimer(){
 clearInterval(heroTimer);
 if(heroItems.length<2)return;
 heroTimer=setInterval(()=>{if(!document.hidden)showHero(heroIndex+1)},6500);
}

const WATCH_PROGRESS_KEY="flxtv:watch-progress:v1";
let latestPlaybackTime=0,latestPlaybackDuration=0,lastProgressWrite=0,progressPollTimer=null;
function readWatchProgress(){
 try{const value=JSON.parse(localStorage.getItem(WATCH_PROGRESS_KEY)||"{}");return value&&typeof value==="object"?value:{}}catch(_){return {}}
}
function writeWatchProgress(data){
 try{localStorage.setItem(WATCH_PROGRESS_KEY,JSON.stringify(data))}catch(_){}
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
 if(duration>0&&time/duration>=0.92){delete data[key];writeWatchProgress(data);lastProgressWrite=now;renderContinueWatching();return}
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
 renderContinueWatching();
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
function renderContinueWatching(){
 const row=$("continue-watching"),section=$("continue-watching-section");
 if(!row||!section)return;
 const entries=Object.values(readWatchProgress()).filter(x=>x&&x.id&&x.currentTime>0&&(!x.duration||x.currentTime<x.duration*0.92)).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0)).slice(0,20);
 row.replaceChildren();
 section.hidden=!entries.length;
 entries.forEach(entry=>{
  const item={id:entry.id,media_type:entry.mediaType,title:entry.title,name:entry.title,poster_path:entry.poster_path,backdrop_path:entry.backdrop_path};
  const button=document.createElement("button");button.type="button";button.className="continue-card";
  const image=document.createElement("img");image.loading="lazy";image.alt="";image.src=entry.backdrop_path?IMG+"w500"+entry.backdrop_path:(entry.poster_path?IMG+"w342"+entry.poster_path:"");
  const body=document.createElement("span");body.className="continue-card-copy";
  const name=document.createElement("strong");name.textContent=entry.title||"Pa titull";
  const detail=document.createElement("small");detail.textContent=entry.mediaType==="tv"?"Sezoni "+(entry.season||1)+" · Episodi "+(entry.episode||1):"Vazhdo filmin";
  const progress=document.createElement("span");progress.className="continue-progress";
  const fill=document.createElement("i");fill.style.width=(entry.duration>0?Math.min(100,Math.max(0,entry.currentTime/entry.duration*100)):0)+"%";progress.append(fill);
  const remaining=document.createElement("small");remaining.className="continue-remaining";remaining.textContent=entry.duration>0?"Mbeten "+formatPlaybackTime(Math.max(0,entry.duration-entry.currentTime)):"Vazhdo shikimin";
  body.append(name,detail,progress,remaining);button.append(image,body);
  button.addEventListener("click",()=>window.location.assign(continueWatchUrl(item,entry)));
  row.append(button);
 });
}
function startProgressPolling(){
 clearInterval(progressPollTimer);
 progressPollTimer=setInterval(()=>{
  if(!$("player-modal").classList.contains("open")||!currentPlayback)return;
  sendCineSrcCommand("getCurrentTime");
  sendCineSrcCommand("getDuration");
 },4000);
}
function sendCineSrcCommand(command,args=[]){
 const frame=$("cinesrc-frame");
 if(!frame||!frame.contentWindow)return;
 try{frame.contentWindow.postMessage({type:"cinesrc:command",command,args},"https://cinesrc.st")}catch(_){}
}

async function home(){
 renderContinueWatching();
 $("catalog").hidden=false;
 $("search-page").hidden=true;
 $("hero").hidden=false;
 await Promise.all([
   row("trending","/trending/all/week"),
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
   let d=await tmdb("/trending/all/week");
   let candidates=(d&&d.results)||[];
   heroItems=candidates.filter(x=>(x.media_type==="movie"||x.media_type==="tv"||x.title||x.name)&&(x.backdrop_path||x.poster_path)).slice(0,8);
   if(!heroItems.length){
     d=await tmdb("/movie/popular");
     candidates=(d&&d.results)||[];
     heroItems=candidates.filter(x=>x.backdrop_path||x.poster_path).slice(0,8);
   }
   if(heroItems.length){
     showHero(0);
     startHeroTimer();
   }else{
     $("hero").style.backgroundImage="linear-gradient(135deg,#202938,#090b10)";
     $("hero-title").textContent="Discover something great.";
     $("hero-overview").textContent="Movies and series, all in one place.";
     notice("Katalogu nuk ktheu tituj të përzgjedhur.");
   }
 }catch(e){
   $("hero").style.backgroundImage="linear-gradient(135deg,#202938,#090b10)";
   notice(e.message);
 }
}

function titleSlug(value){return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}
let titlePageItem=null,titlePageSeason=1,titlePageEpisode=1;
function pageUrl(item,play=false){const slug=titleSlug(title(item))||String(item.id);return "/"+slug+(play?"/play":"")}
function titlePageMarkup(item,d,playMode=false){
 const tv=kind(d)==="tv",backdrop=d.backdrop_path?IMG+"w1280"+d.backdrop_path:(d.poster_path?IMG+"w780"+d.poster_path:""),posterPath=d.poster_path?IMG+"w500"+d.poster_path:"";
 const meta=[year(d),d.vote_average?"★ "+Number(d.vote_average).toFixed(1)+"/10":"",d.runtime?d.runtime+" min":tv?(d.number_of_seasons||0)+" sezone":""].filter(Boolean);
 const genres=(d.genres||[]).slice(0,5),cast=(d.credits?.cast||[]).slice(0,6);
 const seasons=tv?(d.seasons||[]).filter(x=>x.season_number>=0):[];
 const overview=d.overviewSq||d.overview||"Përshkrimi nuk është i disponueshëm.";
 return '<div class="title-page-hero"><div class="title-page-backdrop" style="'+(backdrop?'background-image:linear-gradient(90deg,#080b11 0%,rgba(8,11,17,.92) 30%,rgba(8,11,17,.48) 66%,rgba(8,11,17,.25)),linear-gradient(0deg,#090b10 0%,transparent 52%),url("'+backdrop+'")':'')+'"></div>'+
 '<div class="title-page-inner"><a class="title-page-back" href="/" data-title-home>‹ <span>Kthehu te FLIXTV</span></a><div class="title-page-layout"><div class="title-page-copy"><div class="title-page-kicker"><span class="title-page-kicker-dot"></span>'+(tv?"FLIXTV ORIGINAL SERIES":"FLIXTV FILM")+'</div><h1>'+escapeHtml(title(d))+'</h1>'+
 '<div class="title-page-meta">'+meta.map((x,i)=>'<span class="'+(i===1?'rating':'')+'">'+escapeHtml(x)+'</span>').join('<i></i>')+'</div>'+
 (genres.length?'<div class="title-page-genres">'+genres.map(g=>'<span>'+escapeHtml(g.name)+'</span>').join("")+'</div>':"")+
 '<p class="title-page-overview">'+escapeHtml(overview)+'</p>'+
 (tv?'<div class="title-page-episodes"><label>SEZONI<select id="title-season">'+seasons.map(x=>'<option value="'+x.season_number+'" '+(Number(x.season_number)===titlePageSeason?'selected':'')+'>'+escapeHtml(x.name||("Sezoni "+x.season_number))+'</option>').join("")+'</select></label><label>EPISODI<select id="title-episode"></select></label></div>':"")+
 '<div class="title-page-actions"><button class="primary-btn" id="title-play">▶ <span>'+(tv?"Luaj episodin":"Luaj filmin")+'</span></button><button class="secondary-btn" id="title-trailer" '+(!((d.videos?.results||[]).some(x=>x.site==="YouTube"&&(x.type==="Trailer"||x.type==="Teaser")))?'hidden':"")+' >▷ Traileri</button></div>'+
 '</div><div class="title-page-poster-wrap">'+(posterPath?'<img class="title-page-poster" src="'+posterPath+'" alt="'+escapeHtml(title(d))+' poster">':'<div class="title-page-poster-placeholder">FLIXTV</div>')+'<div class="title-page-poster-caption"><span>FLIXTV</span><small>'+(tv?"SERIAL":"FILM")+'</small></div></div></div></div></div>'+
 '<section class="title-page-more"><div class="title-page-section-head"><div><span class="title-page-section-label">MË SHUMË INFORMACION</span><h2>Rreth titullit</h2></div><span class="title-page-index">FLIXTV / '+(tv?"SERIALE":"FILMA")+'</span></div><div class="title-page-info-grid"><article class="title-page-info-card"><span>PËRSHKRIMI</span><p>'+escapeHtml(overview)+'</p></article><article class="title-page-facts"><div><span>STATUSI</span><strong>'+escapeHtml(d.status||"Nuk dihet")+'</strong></div><div><span>TITULLI ORIGJINAL</span><strong>'+escapeHtml(d.original_title||d.original_name||title(d))+'</strong></div><div><span>GJUHA ORIGJINALE</span><strong>'+escapeHtml(String(d.original_language||"").toUpperCase())+'</strong></div>'+(d.release_date||d.first_air_date?'<div><span>DATA E PUBLIKIMIT</span><strong>'+escapeHtml(d.release_date||d.first_air_date)+'</strong></div>':"")+'</article></div>'+
 (cast.length?'<div class="title-page-cast-head"><h2>Interpretojnë</h2><span>KASTI KRYESOR</span></div><div class="title-page-cast">'+cast.map(p=>'<div class="title-page-cast-card">'+(p.profile_path?'<img loading="lazy" src="'+IMG+'w185'+p.profile_path+'" alt="">':'<div class="cast-placeholder">FLIXTV</div>')+'<strong>'+escapeHtml(p.name||"")+'</strong><small>'+escapeHtml(p.character||"")+'</small></div>').join("")+'</div>':"")+'</section>';
}
function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
async function openTitlePage(item,push=false,playMode=false){
 if(!item||!item.id)return;
 try{
  const k=kind(item),d=await tmdb("/"+k+"/"+item.id+"?append_to_response=videos,credits");
  d.overviewSq=await getAlbanianOverview(d,k);
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
  document.body.classList.remove("no-scroll");
  if(k==="tv")await loadTitleEpisodes();
  const trailer=(d.videos?.results||[]).find(x=>x.site==="YouTube"&&(x.type==="Trailer"||x.type==="Teaser"));
  $("title-trailer").onclick=()=>{if(trailer)window.open("https://www.youtube.com/watch?v="+trailer.key,"_blank","noopener")};
  const canResume=savedIsResumable&&(k==="movie"||(Number(savedForTitle.season)===titlePageSeason&&Number(savedForTitle.episode)===titlePageEpisode));
  const titlePlayLabel=$("title-play").querySelector("span");
  if(titlePlayLabel)titlePlayLabel.textContent=canResume?(k==="tv"?"Vazhdo serialin":"Vazhdo filmin"):(k==="tv"?"Luaj episodin":"Luaj filmin");
  $("title-play").classList.toggle("is-resume",!!canResume);
  $("title-play").onclick=()=>{
   const params=new URLSearchParams();
   if(k==="tv"){const s=canResume?Number(savedForTitle.season):Number($("title-season").value),e=canResume?Number(savedForTitle.episode):Number($("title-episode").value);params.set("season",String(s));params.set("episode",String(e));}
   if(canResume)params.set("t",String(Math.floor(Number(savedForTitle.currentTime)||0)));
   window.location.assign(pageUrl(titlePageItem,true)+(params.size?"?"+params.toString():""));
  };
  if(k==="tv")$("title-season").onchange=async()=>{titlePageSeason=Number($("title-season").value);titlePageEpisode=1;await loadTitleEpisodes()};
  if(playMode){const params=new URLSearchParams(location.search);if(k==="tv"){titlePageSeason=Number(params.get("season")||titlePageSeason);titlePageEpisode=Number(params.get("episode")||1);await loadTitleEpisodes()}startTitlePlayback(k==="tv"?titlePageSeason:undefined,k==="tv"?titlePageEpisode:undefined,Number(params.get("t")||0))}
  window.scrollTo(0,0);
 }catch(e){notice(e.message)}
}
async function loadTitleEpisodes(){
 if(!titlePageItem||kind(titlePageItem)!=="tv")return;
 try{const d=await tmdb("/tv/"+titlePageItem.id+"/season/"+titlePageSeason);const select=$("title-episode");if(!select)return;
 const episodes=d.episodes||[];select.innerHTML=episodes.map(ep=>'<option value="'+ep.episode_number+'">E'+ep.episode_number+" · "+escapeHtml(ep.name||"Episodi "+ep.episode_number)+'</option>').join("");
 if(episodes.some(ep=>ep.episode_number===titlePageEpisode))select.value=String(titlePageEpisode);else titlePageEpisode=Number(select.value||1);
 select.onchange=()=>titlePageEpisode=Number(select.value);
 }catch(e){notice("Episodet nuk u ngarkuan: "+e.message)}
}
function startTitlePlayback(season,episode,resumeTime=null){
 if(!titlePageItem)return;
 const saved=getSavedProgress(titlePageItem);
 const startAt=Number(resumeTime)>0?Number(resumeTime):(saved&&kind(titlePageItem)==="tv"&&Number(saved.season)===Number(season||1)&&Number(saved.episode)===Number(episode||1)?Number(saved.currentTime):kind(titlePageItem)==="movie"&&saved?Number(saved.currentTime):0);
 latestPlaybackTime=startAt;latestPlaybackDuration=saved&&startAt===Number(saved.currentTime)?Number(saved.duration)||0:0;lastProgressWrite=0;
 $("title-page").hidden=true;$("player-modal").classList.add("open");$("player-modal").setAttribute("aria-hidden","false");
 document.body.classList.add("no-scroll");currentPlayback={item:titlePageItem,season,episode};
 $("cinesrc-frame").src=buildPlayerUrl(titlePageItem,season,episode,startAt);
 startProgressPolling();
}
function slugSimilarity(a,b){
 const rows=Array.from({length:b.length+1},(_,i)=>i);
 for(let i=1;i<=a.length;i++){let prev=rows[0];rows[0]=i;for(let j=1;j<=b.length;j++){const temp=rows[j];rows[j]=Math.min(rows[j]+1,rows[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=temp}}
 return 1-rows[b.length]/Math.max(a.length,b.length,1);
}
async function resolveTitleRoute(){
 const parts=decodeURIComponent(location.pathname).split("/").filter(Boolean);
 if(!parts.length){document.documentElement.classList.remove("deep-route-loading");$("title-page").hidden=true;$("catalog").hidden=false;$("hero").hidden=false;home();return}
 const playMode=parts[1]==="play",slug=parts[0];
 const query=slug.replace(/-/g," ");
 try{
  const data=await tmdb("/search/multi?query="+encodeURIComponent(query)+"&include_adult=false");
  const candidates=(data.results||[]).filter(x=>x.media_type==="movie"||x.media_type==="tv");
  const match=candidates.find(x=>titleSlug(title(x))===slug||titleSlug(x.original_title||x.original_name||"")===slug)||candidates.find(x=>slugSimilarity(titleSlug(title(x)),slug)>=0.68);
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
window.addEventListener("popstate",()=>{if(location.pathname==="/"){if($("player-modal").classList.contains("open"))closePlayer();$("title-page").hidden=true;$("catalog").hidden=false;$("hero").hidden=false;home()}else{if($("player-modal").classList.contains("open"))closePlayer();resolveTitleRoute()}});
document.addEventListener("keydown",e=>{if((e.key==="Escape"||e.key==="Backspace")&&$("player-modal").classList.contains("open")){e.preventDefault();leavePlayer()}});

async function details(item){try{const k=kind(item),d=await tmdb("/"+k+"/"+item.id+"?append_to_response=videos");selected={...item,...d,media_type:k};$("details-title").textContent=title(d);$("details-type").textContent=k==="tv"?"SERIAL":"FILM";$("details-meta").textContent=[year(d),d.vote_average?"★ "+Number(d.vote_average).toFixed(1):"",d.runtime?d.runtime+" min":d.number_of_seasons?d.number_of_seasons+" sezone":""].filter(Boolean).join(" · ");const overview=await getAlbanianOverview(d,k);$("details-overview").textContent=overview||"Përshkrimi nuk është i disponueshëm.";$("details-backdrop").style.backgroundImage=d.backdrop_path?'linear-gradient(0deg,#111722,transparent 80%),url("'+IMG+"w1280"+d.backdrop_path+'")':"linear-gradient(0deg,#111722,#263143)";const t=(d.videos&&d.videos.results||[]).find(v=>v.site==="YouTube"&&(v.type==="Trailer"||v.type==="Teaser"));$("watch-trailer").hidden=!t;$("watch-trailer").onclick=()=>window.open("https://www.youtube.com/watch?v="+t.key,"_blank","noopener");$("episode-controls").hidden=k!=="tv";$("play-title").hidden=k==="tv";$("episode-controls").style.display=k==="tv"?"flex":"none";if(k!=="tv"){$("season-select").replaceChildren();$("episode-select").replaceChildren()}if(k==="tv"){const seasons=(d.seasons||[]).filter(s=>s.season_number>=0);$("season-select").innerHTML=seasons.map(s=>'<option value="'+s.season_number+'">'+s.name+"</option>").join("");$("season-select").onchange=episodes;await episodes()}modal("details-modal",true)}catch(e){notice(e.message)}}
async function episodes(){if(!selected)return;try{const s=$("season-select").value,d=await tmdb("/tv/"+selected.id+"/season/"+s);$("episode-select").innerHTML=(d.episodes||[]).map(ep=>'<option value="'+ep.episode_number+'">E'+ep.episode_number+" · "+String(ep.name||"").replace(/[&<>"]/g,"")+"</option>").join("")}catch(e){notice(e.message)}}
const genreSq={28:"Aksion",12:"Aventurë",16:"Animacion",35:"Komedi",80:"Krim",99:"Dokumentar",18:"Dramë",10751:"Familjar",14:"Fantazi",36:"Histori",27:"Horror",10402:"Muzikë",9648:"Mister",10749:"Romancë",878:"Fantashkencë",10770:"Film televiziv",53:"Thriller",10752:"Luftë",37:"Western",10759:"Aksion dhe aventurë",10762:"Për fëmijë",10763:"Lajme",10764:"Reality",10765:"Fantashkencë dhe fantazi",10766:"Sapunoperë",10767:"Talk-show",10768:"Luftë dhe politikë"};
function ageLabel(cert){const c=String(cert||"").trim().toUpperCase();const map={"G":"Për të gjitha moshat","TV-G":"Për të gjitha moshat","TV-Y":"Për fëmijë","TV-Y7":"Për fëmijë mbi 7 vjeç","PG":"Nën mbikëqyrjen e prindërve","TV-PG":"Nën mbikëqyrjen e prindërve","PG-13":"13+","TV-14":"14+","R":"17+","TV-MA":"18+","NC-17":"18+","18":"18+","16":"16+","15":"15+","12":"12+","U":"Për të gjitha moshat"};return map[c]||c||"Pa klasifikim moshe";}
async function contentRating(item){try{const k=kind(item),d=await tmdb("/"+k+"/"+item.id+(k==="tv"?"/content_ratings":"/release_dates"));if(k==="tv"){const rows=(d.results||[]).filter(x=>x.iso_3166_1==="US"||x.iso_3166_1==="AL");return (rows.find(x=>x.iso_3166_1==="AL")||rows.find(x=>x.iso_3166_1==="US")||rows[0]||{}).rating||""}const rows=(d.results||[]).filter(x=>x.iso_3166_1==="US"||x.iso_3166_1==="AL");const country=rows.find(x=>x.iso_3166_1==="AL")||rows.find(x=>x.iso_3166_1==="US")||rows[0];return country&&country.release_dates&&((country.release_dates.find(x=>x.certification)||{}).certification)||""}catch(_){return""}}
let activePlayerProvider="cinesrc";
let currentPlayback=null;
function buildPlayerUrl(item,season,episode,resumeTime=0){
 const id=encodeURIComponent(String(item.id));
 const params=new URLSearchParams({
  autoplay:"true",muted:"false",controls:"true",autonext:"true",autoskip:"false",color:"#34cfeb",back:"close"
 });
 if(Number(resumeTime)>5){params.set("t",String(Math.floor(Number(resumeTime))));params.set("continueprompt","false")}
 if(kind(item)==="tv"){
  params.set("s",String(Number(season||1)));params.set("e",String(Number(episode||1)));
  return "https://cinesrc.st/embed/tv/"+id+"?"+params.toString();
 }
 return "https://cinesrc.st/embed/movie/"+id+"?"+params.toString();
}
function startPlayback(item,season,episode){
 currentPlayback={item,season,episode};
 $("cinesrc-frame").src=buildPlayerUrl(item,season,episode);
 $("content-intro").classList.remove("show");
}
// CineSRC is the only enabled playback source.
function play(item,season,episode){
 if(!item||!item.id)return;
 clearTimeout(introTimer);
 $("content-intro").classList.remove("show");
 $("content-intro").setAttribute("aria-hidden","true");
 $("player-modal").classList.remove("attention-active");
 $("player-modal").classList.add("open","controls-visible");
 $("player-modal").setAttribute("aria-hidden","false");
 $("details-modal").classList.remove("open");
 document.body.classList.add("no-scroll");
 currentPlayback={item,season,episode};
 latestPlaybackTime=0;latestPlaybackDuration=0;lastProgressWrite=0;
 $("cinesrc-frame").src=buildPlayerUrl(item,season,episode);
 startProgressPolling();
 clearTimeout(controlsTimer);
}
function hidePlayerControls(){$("player-modal").classList.add("controls-visible")}function showPlayerControls(){if(!$("player-modal").classList.contains("open"))return;$("player-modal").classList.add("controls-visible");clearTimeout(controlsTimer)}$("player-modal").addEventListener("mousemove",showPlayerControls);$("player-modal").addEventListener("pointerdown",showPlayerControls);$("player-modal").addEventListener("keydown",showPlayerControls);function closePlayer(){savePlaybackProgress(true);clearInterval(progressPollTimer);progressPollTimer=null;clearTimeout(controlsTimer);clearTimeout(introTimer);$("cinesrc-frame").src="about:blank";currentPlayback=null;$("content-intro").classList.remove("show");$("content-intro").setAttribute("aria-hidden","true");$("player-modal").classList.remove("attention-active");$("player-modal").classList.remove("open");$("player-modal").setAttribute("aria-hidden","true");document.body.classList.remove("no-scroll")}
window.addEventListener("message",event=>{
 if(event.origin!=="https://cinesrc.st"||event.source!==$("cinesrc-frame").contentWindow)return;
 if(!event.data||typeof event.data!=="object"||typeof event.data.type!=="string")return;
 const data=event.data;
 switch(data.type){
  case "cinesrc:ready":
   $("player-modal").dataset.playerState="ready";
   if(latestPlaybackTime>5)sendCineSrcCommand("seek",[latestPlaybackTime]);
   break;
  case "cinesrc:play":
  case "cinesrc:pause":
   if(Number.isFinite(Number(data.currentTime)))latestPlaybackTime=Math.max(0,Number(data.currentTime));
   if(Number(data.duration)>0)latestPlaybackDuration=Number(data.duration);
   if(latestPlaybackTime>0)savePlaybackProgress(true);
   break;
  case "cinesrc:timeupdate":
  case "cinesrc:seeked":
   if(Number.isFinite(Number(data.currentTime)))latestPlaybackTime=Math.max(0,Number(data.currentTime));
   if(Number(data.duration)>0)latestPlaybackDuration=Number(data.duration);
   savePlaybackProgress(false);
   break;
  case "cinesrc:loadedmetadata":
   latestPlaybackDuration=Number(data.duration)||latestPlaybackDuration;break;case "cinesrc:nextepisode":
   if(currentPlayback&&kind(currentPlayback.item)==="tv"){
    if(Number.isFinite(Number(data.season)))currentPlayback.season=Number(data.season);
    if(Number.isFinite(Number(data.episode)))currentPlayback.episode=Number(data.episode);
    latestPlaybackTime=0;latestPlaybackDuration=0;lastProgressWrite=0;
    savePlaybackProgress(true);
   }
   break;
  case "cinesrc:ended":
   if(currentPlayback)clearPlaybackProgress(currentPlayback.item);
  case "cinesrc:response":
   if(data.command==="getCurrentTime"&&Number.isFinite(Number(data.result))){latestPlaybackTime=Math.max(0,Number(data.result));if(latestPlaybackTime>0)savePlaybackProgress(true)}else if(data.command==="getDuration"&&Number(data.result)>0){latestPlaybackDuration=Number(data.result);savePlaybackProgress(true)}
   break;
  case "cinesrc:close":
   savePlaybackProgress(true);
   leavePlayer();
   break;
  case "cinesrc:error":
   $("player-modal").dataset.playerState="error";
   notice("CineSRC: "+String(data.error||"Videoja nuk u ngarkua. Provo përsëri."));break;
 }
});
window.addEventListener("pagehide",()=>savePlaybackProgress(true));
window.addEventListener("beforeunload",()=>savePlaybackProgress(true));
renderContinueWatching();
$("play-title").onclick=()=>play(selected);$("play-episode").onclick=()=>play(selected,$("season-select").value,$("episode-select").value);const playerCloseButton=$("player-close");if(playerCloseButton)playerCloseButton.onclick=closePlayer;
document.querySelectorAll("[data-close]").forEach(e=>e.onclick=()=>modal(e.dataset.close+"-modal",false));
let searchPageActive=false,searchDebounce=null,suggestionDebounce=null,suggestionRequest=0,advancedRequest=0;
function showSearchPage(){
 searchPageActive=true;
 $("hero").hidden=true;$("catalog").hidden=true;
 $("search-page").hidden=false;
 document.querySelectorAll("[data-page]").forEach(x=>x.classList.remove("active"));
 $("search").blur();
 $("search-page-input").value=$("search").value||$("search-page-input").value;
 $("search-page-input").focus({preventScroll:true});
 if(!$("search-page-input").value.trim())loadPopularSearch();
 else runAdvancedSearch();
 window.scrollTo({top:0,behavior:"instant"});
}
function closeSearchPage(){
 searchPageActive=false;$("search-page").hidden=true;
 $("hero").hidden=false;$("catalog").hidden=false;
 openPage("home");
}
function renderSearchCards(items){
 $("search-grid").replaceChildren(...items.filter(x=>x.poster_path).map(card));
 $("search-count").textContent=items.length+" titles";
 $("search-empty").hidden=items.length>0;
}
async function loadPopularSearch(){
 const request=++advancedRequest;
 $("search-heading").textContent="Të njohura tani";
 $("search-count").textContent="Po ngarkohet…";
 try{
  const d=await tmdb("/trending/all/week");
  if(request!==advancedRequest)return;
  renderSearchCards((d.results||[]).filter(x=>x.media_type==="movie"||x.media_type==="tv"));
 }catch(e){if(request===advancedRequest)notice(e.message)}
}
async function showSuggestions(query){
 const request=++suggestionRequest,box=$("search-suggestions");
 if(query.length<2){box.hidden=true;box.replaceChildren();return}
 try{
  const d=await tmdb("/search/multi?query="+encodeURIComponent(query)+"&include_adult=false");
  if(request!==suggestionRequest)return;
  const items=(d.results||[]).filter(x=>(x.media_type==="movie"||x.media_type==="tv")&&x.poster_path).slice(0,6);
  box.replaceChildren();
  items.forEach(item=>{
   const button=document.createElement("button");button.type="button";button.className="search-suggestion";
   const img=document.createElement("img");img.loading="lazy";img.src=poster(item);img.alt="";
   const copy=document.createElement("span");copy.className="suggestion-copy";
   const name=document.createElement("strong");name.textContent=title(item);
   const meta=document.createElement("small");meta.textContent=(kind(item)==="tv"?"Serial":"Film")+" · "+(year(item)||"—");
   copy.append(name,meta);button.append(img,copy);
   button.addEventListener("click",()=>{ $("search-page-input").value=title(item);$("search").value=title(item);box.hidden=true;window.location.assign(pageUrl(item))});
   box.append(button);
  });
  box.hidden=!items.length;
 }catch(_){if(request===suggestionRequest)box.hidden=true}
}
async function runAdvancedSearch(){
 const request=++advancedRequest,q=$("search-page-input").value.trim();
 $("search-suggestions").hidden=true;
 $("search-heading").textContent=q?'Results for “'+q+'”':"Popular right now";
 $("search-count").textContent="Loading…";
 const path=q?"/search/multi?query="+encodeURIComponent(q)+"&include_adult=false":"/trending/all/week";
 try{
  const d=await tmdb(path);
  if(request!==advancedRequest)return;
  renderSearchCards((d.results||[]).filter(x=>(x.media_type==="movie"||x.media_type==="tv")&&x.poster_path));
 }catch(e){if(request===advancedRequest)notice(e.message)}
}
function scheduleSearch(){
 clearTimeout(searchDebounce);clearTimeout(suggestionDebounce);
 const q=$("search-page-input").value.trim();
 $("search").value=q;
 suggestionDebounce=setTimeout(()=>showSuggestions(q),160);
 $("search-grid").replaceChildren();
 $("search-count").textContent="";
 $("search-heading").textContent=q?"Suggestions":"Popular right now";
 if(!q)searchDebounce=setTimeout(runAdvancedSearch,280);
}
$("search-page-input").addEventListener("input",scheduleSearch);
$("search-clear").onclick=()=>{$("search-page-input").value="";$("search").value="";$("search-suggestions").hidden=true;runAdvancedSearch()};
$("search-page-input").addEventListener("keydown",e=>{if(e.key==="Escape")$("search-suggestions").hidden=true;if(e.key==="Enter"){e.preventDefault();$("search-suggestions").hidden=true;runAdvancedSearch()}});
$("search").onfocus=()=>showSearchPage();
$("search-trigger").onclick=showSearchPage;
$("mobile-search").onclick=showSearchPage;
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
const loadedPages=new Set();
async function openPage(page){
 document.querySelectorAll("[data-page]").forEach(x=>x.classList.toggle("active",x.dataset.page===page));
 $("search-page").hidden=true;
 $("catalog").hidden=false;
 searchPageActive=false;
 $("hero").hidden=page!=="home";
 $("home-page").hidden=page!=="home";
 $("movies-page").hidden=page!=="movies";
 $("shows-page").hidden=page!=="shows";
 if(page==="home"){renderContinueWatching();await home();return}
 if(loadedPages.has(page))return;
 const jobs=page==="movies"?[
  ["movie-trending","/trending/movie/week"],["movie-popular","/movie/popular"],["movie-top","/movie/top_rated"],["movie-now","/movie/now_playing"],["movie-upcoming","/movie/upcoming"]
 ]:[
  ["show-trending","/trending/tv/week"],["show-popular","/tv/popular"],["show-top","/tv/top_rated"],["show-airing","/tv/on_the_air"],["show-today","/tv/airing_today"],
  ["show-action-adventure","/discover/tv?with_genres=10759&sort_by=popularity.desc"],
  ["show-scifi-fantasy","/discover/tv?with_genres=10765&sort_by=popularity.desc"],
  ["show-crime-drama","/discover/tv?with_genres=80,18&sort_by=popularity.desc"],
  ["show-comedy-romance","/discover/tv?with_genres=35,10749&sort_by=popularity.desc"],
  ["show-mystery-thriller","/discover/tv?with_genres=9648,53&sort_by=popularity.desc"]
 ];
 await Promise.all(jobs.map(([id,path])=>row(id,path)));
 loadedPages.add(page);
}
document.querySelectorAll("[data-page]").forEach(b=>b.onclick=()=>openPage(b.dataset.page));
$("hero-action").onclick=()=>{const item=heroItems[heroIndex];if(item)window.location.assign(pageUrl(item));};
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&heroItems.length>1)startHeroTimer()});
window.addEventListener("pageshow",()=>{renderContinueWatching();if(heroItems.length>1)startHeroTimer()});
if(location.pathname!=="/")resolveTitleRoute();else home();
})();