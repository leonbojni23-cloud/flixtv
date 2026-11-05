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
let titlePageItem=null,titlePageSeason=1,titlePageEpisode=1,titleEpisodesRequest=0;
function pageUrl(item,play=false){const slug=titleSlug(title(item))||String(item.id);return "/"+slug+(play?"/play":"")}
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
function titlePageMarkup(item,d,playMode=false){
 const tv=kind(d)==="tv",backdrop=d.backdrop_path?IMG+"w1280"+d.backdrop_path:(d.poster_path?IMG+"w780"+d.poster_path:""),posterPath=d.poster_path?IMG+"w500"+d.poster_path:"";
 const meta=[year(d),d.vote_average?"★ "+Number(d.vote_average).toFixed(1)+"/10":"",d.runtime?d.runtime+" min":tv?(d.number_of_seasons||0)+" sezone":""].filter(Boolean);
 const genres=(d.genres||[]).slice(0,5),cast=(d.credits?.cast||[]).slice(0,6);
 const seasons=tv?(d.seasons||[]).filter(x=>x.season_number>=0):[];
 const overview=d.overviewSq||d.overview||"Përshkrimi nuk është i disponueshëm.";
 const youtubeVideos=(d.videos?.results||[]).filter(x=>x.site==="YouTube"&&x.key);
 const trailerCandidates=youtubeVideos.filter(x=>x.type==="Trailer"||x.type==="Teaser");
 const trailer=(trailerCandidates.length?trailerCandidates:youtubeVideos).sort((a,b)=>Number(!!b.official)-Number(!!a.official)||Number(b.type==="Trailer")-Number(a.type==="Trailer")||Number(b.iso_639_1==="en")-Number(a.iso_639_1==="en"))[0];
 const imdbVideo=(d.imdbVideos?.videos||[]).find(v=>(v.type||"").toLowerCase()==="trailer"&&Array.isArray(v.playback)&&v.playback.some(p=>p.url&&["MP4","M3U8"].includes(String(p.format||"").toUpperCase())));
 const imdbSource=imdbVideo?.playback?.find(p=>String(p.format||"").toUpperCase()==="MP4"&&p.url)||imdbVideo?.playback?.find(p=>String(p.format||"").toUpperCase()==="M3U8"&&p.url);
 const preview=imdbSource?'<div class="title-page-preview" aria-hidden="true"><video class="title-page-imdb-video" autoplay muted playsinline loop controls preload="metadata" poster="'+escapeHtml(typeof imdbVideo.thumbnail==="string"?imdbVideo.thumbnail:"")+'"><source src="'+escapeHtml(imdbSource.url)+'" type="'+(String(imdbSource.format).toUpperCase()==="M3U8"?'application/vnd.apple.mpegurl':'video/mp4')+'"></video></div>':trailer?'<div class="title-page-preview youtube-custom-preview"><lite-youtube id="yt-title-trailer" videoid="'+escapeHtml(trailer.key)+'" js-api params="controls=0&rel=0&iv_load_policy=3&playsinline=1&autoplay=1&mute=1&enablejsapi=1&fs=0&disablekb=1"></lite-youtube><div class="yt-custom-controls"><button type="button" class="yt-play-toggle" aria-label="Luaj videon" aria-pressed="true"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg></button><button type="button" class="yt-mute-toggle" aria-label="Aktivizo zërin" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/></svg></button></div></div>':"";
 const cover=preview||(posterPath?'<img class="title-page-poster" src="'+posterPath+'" alt="'+escapeHtml(title(d))+' poster">':'<div class="title-page-poster-placeholder">FLIXTV</div>');
 return '<div class="title-page-hero"><div class="title-page-backdrop" style="'+(backdrop?'background-image:linear-gradient(90deg,#080b11 0%,rgba(8,11,17,.92) 30%,rgba(8,11,17,.48) 66%,rgba(8,11,17,.25)),linear-gradient(0deg,#090b10 0%,transparent 52%),url("'+backdrop+'")':'')+'"></div>'+
 '<div class="title-page-inner"><a class="title-page-back" href="/" data-title-home aria-label="Kthehu në faqen kryesore"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg></a><div class="title-page-cover">'+cover+'</div><div class="title-page-layout"><div class="title-page-copy"><div class="title-page-kicker"><span class="title-page-kicker-dot"></span>'+(tv?"FLIXTV ORIGINAL SERIES":"FLIXTV FILM")+'</div><h1>'+escapeHtml(title(d))+'</h1>'+
 '<div class="title-page-meta">'+meta.map((x,i)=>'<span class="'+(i===1?'rating':'')+'">'+escapeHtml(x)+'</span>').join('<i></i>')+'</div>'+
 (genres.length?'<div class="title-page-genres">'+genres.map(g=>'<span>'+escapeHtml(g.name)+'</span>').join("")+'</div>':"")+
 '<div class="title-page-overview-wrap"><p class="title-page-overview collapsed" id="title-overview">'+escapeHtml(overview)+'</p>'+(overview.length>190?'<button type="button" class="overview-more" id="overview-more" aria-expanded="false">Më shumë</button>':"")+'</div>'+
 '<div class="title-page-actions"><button class="primary-btn" id="title-play">▶ <span>'+(tv?"Luaj S"+titlePageSeason+":E"+titlePageEpisode:"Luaj filmin")+'</span></button></div>'+'</div></div></div></div>'+(tv?'<section class="series-episode-section"><div class="series-section-tabs"><button type="button" class="active" id="series-episodes-tab">Episodet</button><button type="button" id="series-similar-tab">Më shumë si ky</button></div><div class="series-season-bar"><label for="title-season">Sezoni</label><select id="title-season">'+seasons.map(x=>'<option value="'+x.season_number+'" '+(Number(x.season_number)===titlePageSeason?'selected':'')+'>'+escapeHtml(x.name||("Sezoni "+x.season_number))+'</option>').join("")+'</select></div><div id="title-episode-list" class="series-episode-list"></div></section>':"")+
 '<section class="title-page-more"><div class="title-page-section-head"><div><span class="title-page-section-label">MË SHUMË INFORMACION</span><h2>Rreth titullit</h2></div><span class="title-page-index">FLIXTV / '+(tv?"SERIALE":"FILMA")+'</span></div><div class="title-page-info-grid"><article class="title-page-facts"><div><span>STATUSI</span><strong>'+escapeHtml(d.status||"Nuk dihet")+'</strong></div><div><span>TITULLI ORIGJINAL</span><strong>'+escapeHtml(d.original_title||d.original_name||title(d))+'</strong></div><div><span>GJUHA ORIGJINALE</span><strong>'+escapeHtml(String(d.original_language||"").toUpperCase())+'</strong></div>'+(d.release_date||d.first_air_date?'<div><span>DATA E PUBLIKIMIT</span><strong>'+escapeHtml(d.release_date||d.first_air_date)+'</strong></div>':"")+'</article></div>'+
 (cast.length?'<div class="title-page-cast-head"><h2>Interpretojnë</h2><span>KASTI KRYESOR</span></div><div class="title-page-cast">'+cast.map(p=>'<div class="title-page-cast-card">'+(p.profile_path?'<img loading="lazy" src="'+IMG+'w185'+p.profile_path+'" alt="">':'<div class="cast-placeholder">FLIXTV</div>')+'<strong>'+escapeHtml(p.name||"")+'</strong><small>'+escapeHtml(p.character||"")+'</small></div>').join("")+'</div>':"")+'</section>';
}
function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
async function openTitlePage(item,push=false,playMode=false){
 if(!item||!item.id)return;
 try{
  const k=kind(item),d=await tmdb("/"+k+"/"+item.id+"?append_to_response=videos,credits,external_ids&include_video_language=en,null");
  await loadTitleVideos(item,d);
  const imdbId=d.external_ids?.imdb_id;
  if(imdbId){
   try{const imdbResponse=await fetch("/api/imdb-videos?id="+encodeURIComponent(imdbId));if(imdbResponse.ok){const imdbData=await imdbResponse.json();if(Array.isArray(imdbData.videos))d.imdbVideos=imdbData}}catch(_){/* Use the existing YouTube fallback if IMDb is unavailable. */}
  }
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
  initTitleYoutubeControls();
  document.body.classList.remove("no-scroll");
  if(k==="tv")await loadTitleEpisodes();
  const canResume=savedIsResumable&&(k==="movie"||(Number(savedForTitle.season)===titlePageSeason&&Number(savedForTitle.episode)===titlePageEpisode));
  const titlePlayLabel=$("title-play").querySelector("span");
  if(titlePlayLabel)titlePlayLabel.textContent=canResume?(k==="tv"?"Vazhdo S"+savedForTitle.season+":E"+savedForTitle.episode:"Vazhdo filmin"):(k==="tv"?"Luaj S"+titlePageSeason+":E"+titlePageEpisode:"Luaj filmin");
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
   $("title-season").onchange=async()=>{titlePageSeason=Number($("title-season").value);titlePageEpisode=1;episodeTab.classList.add("active");similarTab.classList.remove("active");episodeList.hidden=false;const similar=$("series-similar-list");if(similar)similar.hidden=true;await loadTitleEpisodes()};
   const episodeTab=$("series-episodes-tab"),similarTab=$("series-similar-tab"),episodeList=$("title-episode-list");
   episodeTab.onclick=()=>{episodeTab.classList.add("active");similarTab.classList.remove("active");episodeList.hidden=false;const similar=$("series-similar-list");if(similar)similar.hidden=true};
   similarTab.onclick=async()=>{similarTab.classList.add("active");episodeTab.classList.remove("active");episodeList.hidden=true;let similar=$("series-similar-list");if(!similar){similar=document.createElement("div");similar.id="series-similar-list";similar.className="series-similar-list";episodeList.after(similar)}if(similar.dataset.loaded==="true") {similar.hidden=false;return}similar.hidden=false;similar.textContent="Po ngarkohen sugjerimet…";try{const data=await tmdb("/tv/"+titlePageItem.id+"/similar");const items=(data.results||[]).filter(x=>x.poster_path).slice(0,12);similar.replaceChildren(...items.map(x=>{const b=document.createElement("button");b.className="series-similar-card";b.type="button";const img=document.createElement("img");img.loading="lazy";img.src=IMG+"w185"+x.poster_path;img.alt="";const label=document.createElement("span");label.textContent=title(x);b.append(img,label);b.onclick=()=>window.location.assign(pageUrl(x));return b}));similar.dataset.loaded="true";if(!items.length)similar.textContent="Nuk ka sugjerime për këtë serial."}catch(error){similar.textContent="Sugjerimet nuk u ngarkuan."}};
  }
  if(playMode){const params=new URLSearchParams(location.search);if(k==="tv"){titlePageSeason=Number(params.get("season")||titlePageSeason);titlePageEpisode=Number(params.get("episode")||1);await loadTitleEpisodes()}startTitlePlayback(k==="tv"?titlePageSeason:undefined,k==="tv"?titlePageEpisode:undefined,Number(params.get("t")||0))}
  window.scrollTo(0,0);
 }catch(e){notice(e.message)}
}
const titleSeasonEpisodeCache=new Map();
async function loadTitleEpisodes(){
 if(!titlePageItem||kind(titlePageItem)!=="tv")return;
 const request=++titleEpisodesRequest,itemId=Number(titlePageItem.id),season=Number(titlePageSeason);
 const cacheKey=itemId+":"+season,list=$("title-episode-list");
 if(!list)return;
 const isCurrent=()=>request===titleEpisodesRequest&&titlePageItem&&Number(titlePageItem.id)===itemId&&Number(titlePageSeason)===season;
 const renderEpisodes=episodes=>{
  if(!isCurrent())return;
  if(!episodes.some(ep=>Number(ep.episode_number)===Number(titlePageEpisode)))titlePageEpisode=Number(episodes[0]?.episode_number||1);
  const saved=getSavedProgress(titlePageItem),savedCanResume=!!(saved&&Number(saved.currentTime)>5&&(!saved.duration||Number(saved.currentTime)<Number(saved.duration)*0.92));
  list.innerHTML=episodes.map(ep=>{
   const epNo=Number(ep.episode_number),overview=String(ep.overview||"").trim();
   return '<article class="series-episode-card '+(epNo===titlePageEpisode?'selected':'')+'" data-episode="'+epNo+'" role="button" tabindex="0"><span class="series-episode-thumb">'+(ep.still_path?'<img loading="lazy" decoding="async" src="'+IMG+'w300'+ep.still_path+'" alt="">':'<span>FLIXTV</span>')+'<b>▶</b></span><span class="series-episode-copy"><strong>'+escapeHtml(ep.name||("Episodi "+epNo))+'</strong><small>E'+epNo+(ep.runtime?" · "+ep.runtime+" min":"")+(ep.air_date?" · "+escapeHtml(ep.air_date.slice(0,4)):"")+'</small>'+(overview?'<span class="series-episode-overview">'+escapeHtml(overview)+'</span><button type="button" class="episode-overview-more" aria-expanded="false" aria-label="Shfaq përshkrimin e plotë">…</button>':'')+'</span></article>'
  }).join("");
  list.querySelectorAll("[data-episode]").forEach(card=>{
   const play=()=>{const ep=Number(card.dataset.episode)||1;titlePageEpisode=ep;const resume=savedCanResume&&Number(saved.season)===season&&Number(saved.episode)===ep?Number(saved.currentTime):0;startTitlePlayback(season,ep,resume)};
   card.addEventListener("click",event=>{if(event.target.closest(".episode-overview-more"))return;play()});
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
 const frame=$("cinesrc-frame"),modal=$("player-modal");
 modal.classList.add("open");
 // Keep fullscreen, but do not force landscape orientation.
 // CineSRC handles its own rotate-phone prompt; iOS Safari does not support
 // programmatic orientation locking, so requesting it here cannot dismiss that prompt.
 const request=frame&&frame.requestFullscreen?frame.requestFullscreen({navigationUI:"hide"}):Promise.reject(new Error("Fullscreen API unavailable"));
 if(request&&typeof request.then==="function"){
  request.catch(()=>modal.classList.add("css-fullscreen"));
 }else modal.classList.add("css-fullscreen");
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
function startTitlePlayback(season,episode,resumeTime=null){
 if(!titlePageItem)return;
 stopTitlePagePreview();
 const saved=getSavedProgress(titlePageItem);
 const startAt=Number(resumeTime)>0?Number(resumeTime):(saved&&kind(titlePageItem)==="tv"&&Number(saved.season)===Number(season||1)&&Number(saved.episode)===Number(episode||1)?Number(saved.currentTime):kind(titlePageItem)==="movie"&&saved?Number(saved.currentTime):0);
 latestPlaybackTime=startAt;latestPlaybackDuration=saved&&startAt===Number(saved.currentTime)?Number(saved.duration)||0:0;lastProgressWrite=0;
 playbackReturnToTitlePage=!$("title-page").hidden;
 $("title-page").hidden=true;$("player-modal").classList.add("open");$("player-modal").setAttribute("aria-hidden","false");enterCineSrcFullscreen();
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
let playbackReturnToTitlePage=false;
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
 enterCineSrcFullscreen();
 $("player-modal").setAttribute("aria-hidden","false");
 $("details-modal").classList.remove("open");
 document.body.classList.add("no-scroll");
 currentPlayback={item,season,episode};
 latestPlaybackTime=0;latestPlaybackDuration=0;lastProgressWrite=0;
 $("cinesrc-frame").src=buildPlayerUrl(item,season,episode);
 startProgressPolling();
 clearTimeout(controlsTimer);
}
function hidePlayerControls(){$("player-modal").classList.add("controls-visible")}function showPlayerControls(){if(!$("player-modal").classList.contains("open"))return;$("player-modal").classList.add("controls-visible");clearTimeout(controlsTimer)}$("player-modal").addEventListener("mousemove",showPlayerControls);$("player-modal").addEventListener("pointerdown",showPlayerControls);$("player-modal").addEventListener("keydown",showPlayerControls);function closePlayer(){savePlaybackProgress(true);if(document.fullscreenElement){document.exitFullscreen().catch(()=>{})}try{if(screen.orientation&&typeof screen.orientation.unlock==="function")screen.orientation.unlock()}catch(_){}$("player-modal").classList.remove("css-fullscreen");clearInterval(progressPollTimer);progressPollTimer=null;clearTimeout(controlsTimer);clearTimeout(introTimer);$("cinesrc-frame").src="about:blank";currentPlayback=null;if(playbackReturnToTitlePage){$("title-page").hidden=false;$("catalog").hidden=true;$("hero").hidden=true;playbackReturnToTitlePage=false} $("content-intro").classList.remove("show");$("content-intro").setAttribute("aria-hidden","true");$("player-modal").classList.remove("attention-active");$("player-modal").classList.remove("open");$("player-modal").setAttribute("aria-hidden","true");document.body.classList.remove("no-scroll")}
window.addEventListener("message",event=>{
 if(event.origin!=="https://cinesrc.st"||event.source!==$("cinesrc-frame").contentWindow)return;
 if(!event.data||typeof event.data!=="object"||typeof event.data.type!=="string")return;
 const data=event.data;
 switch(data.type){
  case "cinesrc:ready":
   $("player-modal").dataset.playerState="ready";
   if(latestPlaybackTime>5)sendCineSrcCommand("seek",[latestPlaybackTime]);
   sendCineSrcCommand("getCurrentTime");
   sendCineSrcCommand("getDuration");
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
    const nextSeason=Number(data.season),nextEpisode=Number(data.episode);
    if(Number.isInteger(nextSeason)&&nextSeason>=0)currentPlayback.season=nextSeason;
    if(Number.isInteger(nextEpisode)&&nextEpisode>0)currentPlayback.episode=nextEpisode;
    latestPlaybackTime=0;latestPlaybackDuration=0;lastProgressWrite=0;
    savePlaybackProgress(true);
    setTimeout(()=>{
     if(!$("player-modal").classList.contains("open")||!currentPlayback)return;
     sendCineSrcCommand("getCurrentTime");
     sendCineSrcCommand("getDuration");
    },900);
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
function renderSportsItems(items){
 const grid=$("sports-grid");grid.replaceChildren();
 $("sports-empty").hidden=items.length>0;
 $("sports-empty").textContent=items.length?"":"Nuk ka evente në këtë kategori për momentin.";
 items.forEach(item=>{
  const button=document.createElement("button");button.type="button";button.className="sports-card";
  const live=String(item.name||item.title||"").toLowerCase().includes("live")||item.live===true;
  const titleText=item.name||item.title||item.id||"Event sportiv";
  const category=sportsLabel(item.type||item.category||sportsActiveCatalog?.name||"Sport");
  const image=item.poster||item.posterUrl||item.background||item.logo||"";
  button.innerHTML=(image?'<img loading="lazy" alt="">':'<div class="sports-card-art">LIVE</div>')+'<span class="sports-card-copy"><small></small><strong></strong><em>Shiko eventin →</em></span>';
  if(image){const img=button.querySelector("img");img.src=image;img.onerror=()=>img.remove()}
  button.querySelector("small").textContent=live?"● LIVE":category;
  button.querySelector("strong").textContent=titleText;
  button.addEventListener("click",()=>openSportsEvent(item));
  grid.append(button);
 });
}
async function loadSportsCatalog(catalog){
 sportsActiveCatalog=catalog;$("sports-status").textContent="Po ngarkohen eventet…";
 try{
  const data=await sportsRequest("catalog/"+encodeURIComponent(catalog.type)+"/"+encodeURIComponent(catalog.id)+".json");
  renderSportsItems(data.metas||data.items||[]);
  $("sports-status").textContent=(data.metas||data.items||[]).length+" evente";
 }catch(error){$("sports-status").textContent="Gabim";$("sports-empty").hidden=false;$("sports-empty").textContent=error.message}
}
async function openSportsEvent(item){
 const type=item.type||sportsActiveCatalog?.type||"sport";
 const id=item.id;if(!id)return;
 $("sports-status").textContent="Po kërkohen burimet…";
 try{
  let meta=item;
  try{const d=await sportsRequest("meta/"+encodeURIComponent(type)+"/"+encodeURIComponent(id)+".json");meta=d.meta||item}catch(_){}
  const videoId=meta.videos?.[0]?.id||id;
  const result=await sportsRequest("stream/"+encodeURIComponent(type)+"/"+encodeURIComponent(videoId)+".json");
  const streams=result.streams||[];
  if(!streams.length)throw new Error("Nuk u gjet burim transmetimi për këtë event.");
  showSportsStreams(meta,streams);
  $("sports-status").textContent="Zgjidh një burim";
 }catch(error){notice(error.message);$("sports-status").textContent="Gati"}
}
function showSportsStreams(meta,streams){
 const grid=$("sports-grid");grid.replaceChildren();
 const head=document.createElement("div");head.className="sports-event-head";
 const h=document.createElement("h2");h.textContent=meta.name||meta.title||"Event sportiv";
 const back=document.createElement("button");back.className="secondary-btn";back.type="button";back.textContent="← Kthehu te eventet";back.onclick=()=>sportsActiveCatalog&&loadSportsCatalog(sportsActiveCatalog);
 head.append(h,back);grid.append(head);
 streams.forEach((stream,index)=>{
  const button=document.createElement("button");button.type="button";button.className="sports-source";
  const label=stream.name||stream.title||stream.description||("Burimi "+(index+1));
  button.textContent=label;button.onclick=()=>playSportsStream(stream);
  grid.append(button);
 });
}
function playSportsStream(stream){
 const url=stream.url||stream.externalUrl||stream.ytId&&("https://www.youtube.com/watch?v="+stream.ytId);
 if(!url){notice("Ky burim nuk ka adresë të luajtshme.");return}
 let parsed;try{parsed=new URL(url)}catch(_){notice("Adresa e burimit është e pavlefshme.");return}
 if(parsed.protocol!=="https:"&&parsed.protocol!=="http:"){notice("Protokoll i palejuar.");return}
 const modal=$("sports-settings-modal");
 const card=modal.querySelector(".settings-card");
 card.innerHTML='<button class="close-btn" type="button" id="sports-player-close" aria-label="Mbyll">×</button><h2 class="sports-player-title"></h2><div class="sports-player-stage"></div>';
 card.querySelector("h2").textContent=stream.title||stream.name||"Transmetim sportiv";
 const stage=card.querySelector(".sports-player-stage");
 if(/\.(m3u8|mp4|webm)(?:$|\?)/i.test(url)){
  const video=document.createElement("video");video.controls=true;video.autoplay=true;video.playsInline=true;video.src=url;stage.append(video);
 }else{
  const frame=document.createElement("iframe");frame.src=url;frame.allow="autoplay; fullscreen; encrypted-media; picture-in-picture";frame.allowFullscreen=true;frame.referrerPolicy="no-referrer";stage.append(frame);
 }
 modal.classList.add("open");modal.setAttribute("aria-hidden","false");
 $("sports-player-close").onclick=()=>{modal.classList.remove("open");modal.setAttribute("aria-hidden","true");card.innerHTML='<button class="close-btn" data-close="sports-settings" aria-label="Mbyll">×</button><span class="catalog-overline">SPORTS STREAMS</span><h2>Konfiguro Sport</h2><p class="muted tiny">Manifesti kryesor konfigurohet në server. URL lokale përdoret vetëm për zhvillim.</p><form id="sports-settings-form"><label for="sports-manifest-input">Manifest URL</label><input id="sports-manifest-input" type="url" placeholder="https://sports.highfly.to/…/manifest.json" required autocomplete="off"><button class="primary-btn" type="submit">Ruaj dhe lidhu</button><button class="secondary-btn" id="sports-clear" type="button">Hiq konfigurimin</button></form>';bindSportsSettings()};
}
function bindSportsSettings(){
 const form=$("sports-settings-form");if(!form)return;
 $("sports-manifest-input").value=sportsUrl();
 form.onsubmit=async event=>{event.preventDefault();const value=$("sports-manifest-input").value.trim();try{const u=new URL(value);if(u.protocol!=="https:"||!["sports.highfly.to","sportsfree.highfly.to","sportsfree-us2.highfly.to"].includes(u.hostname)||!/^\/[^/]+\/manifest\.json$/.test(u.pathname))throw Error("Vendos manifest URL personale të Sports Streams.");localStorage.setItem(SPORTS_MANIFEST_KEY,value);modal("sports-settings",false);await loadSports()}catch(error){notice(error.message)}};
 const clear=$("sports-clear");if(clear)clear.onclick=()=>{localStorage.removeItem(SPORTS_MANIFEST_KEY);$("sports-manifest-input").value="";notice("Konfigurimi u hoq.");};
}
async function loadSports(){
 const grid=$("sports-grid");grid.replaceChildren();
 $("sports-status").textContent="Po lidhet me Sports Streams…";
 try{
  sportsManifest=await sportsRequest("manifest.json");
  sportsCatalogs=(sportsManifest.catalogs||[]).filter(c=>c.type==="sport"||sportsManifest.types?.includes(c.type));
  const cats=$("sports-categories");cats.replaceChildren();
  sportsCatalogs.forEach((catalog,index)=>{
   const button=document.createElement("button");button.type="button";button.className="sports-category"+(index===0?" active":"");button.textContent=catalog.name||sportsLabel(catalog.id);
   button.onclick=()=>{cats.querySelectorAll("button").forEach(x=>x.classList.toggle("active",x===button));loadSportsCatalog(catalog)};
   cats.append(button);
  });
  if(!sportsCatalogs.length)throw new Error("Manifest u hap, por nuk përmban katalogë sportivë.");
  await loadSportsCatalog(sportsCatalogs[0]);
 }catch(error){$("sports-status").textContent="Lidhja dështoi";$("sports-empty").hidden=false;$("sports-empty").textContent=error.message+" Kontrollo manifest URL te Konfigurimi."}
}

const loadedPages=new Set();
async function openPage(page){
 document.querySelectorAll("[data-page]").forEach(x=>x.classList.toggle("active",x.dataset.page===page));
 $("search-page").hidden=true;
 $("sports-page").hidden=page!=="sports";
 $("catalog").hidden=page==="sports";
 searchPageActive=false;
 $("hero").hidden=page!=="home";
 $("home-page").hidden=page!=="home";
 $("movies-page").hidden=page!=="movies";
 $("shows-page").hidden=page!=="shows";
 if(page==="home"){renderContinueWatching();await home();return}
 if(page==="sports"){await loadSports();return}
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
 $("sports-settings").onclick=()=>{bindSportsSettings();modal("sports-settings",true)};
 bindSportsSettings();
 document.querySelectorAll("[data-close]").forEach(e=>{if(e.dataset.close==="sports-settings")e.onclick=()=>modal("sports-settings",false)});
$("hero-action").onclick=()=>{const item=heroItems[heroIndex];if(item)window.location.assign(pageUrl(item));};
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&heroItems.length>1)startHeroTimer()});
window.addEventListener("pageshow",()=>{renderContinueWatching();if(heroItems.length>1)startHeroTimer()});
if(location.pathname!=="/")resolveTitleRoute();else home();
})();