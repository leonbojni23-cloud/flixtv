(() => {
"use strict";
const RESOLVER_API="https://flixtv-api.vercel.app";
const API=location.hostname.endsWith("github.io")?"https://flixtv-snowy.vercel.app/api/tmdb.js":"/api/tmdb.js",IMG="https://image.tmdb.org/t/p/",$=id=>document.getElementById(id);
/* FLIXTV anti-popup and anti-ad protections.
   These controls protect the parent app. Cross-origin iframe content has separate browser security boundaries. */
(()=>{
 const allowedFrameHosts=["cinesrc.st","player.videasy.ws","videasy.ws","111movies.net"];
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
  const video=$("resolved-video");
  if(video&&!video.hidden&&Number.isFinite(video.currentTime)){
   latestPlaybackTime=Number(video.currentTime)||0;
   latestPlaybackDuration=Number(video.duration)||latestPlaybackDuration;
   renderExternalSubtitle(latestPlaybackTime);
   savePlaybackProgress(false);
  }
 },4000);
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

function titleSlug(value){return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^\p{L}\p{N}]+/gu,"-").replace(/^-|-$/g,"")}
let titlePageItem=null,titlePageSeason=1,titlePageEpisode=1,titleEpisodesRequest=0;
function pageUrl(item,play=false){const slug=titleSlug(title(item))||"title";const type=kind(item);return "/"+slug+"--"+type+"-"+String(item.id)+(play?"/play":"")}
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
   try{const imdbResponse=await fetch("/api/imdb-videos.js?id="+encodeURIComponent(imdbId));if(imdbResponse.ok){const imdbData=await imdbResponse.json();if(Array.isArray(imdbData.videos))d.imdbVideos=imdbData}}catch(_){/* Use the existing YouTube fallback if IMDb is unavailable. */}
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
window.addEventListener("popstate",()=>{if($("player-modal").classList.contains("open"))closePlayer();if(location.pathname.replace(/\/$/,"")==="/sports"){openPage("sports",false)}else if(location.pathname==="/"){ $("title-page").hidden=true;$("catalog").hidden=false;$("hero").hidden=false;openPage("home",false)}else{resolveTitleRoute()}});
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
function stopResolvedVideo(){
  const anyPlayFrame=$("anyplay-frame");
  if(anyPlayFrame){
    anyPlayFrame.onload=null;
    anyPlayFrame.onerror=null;
    anyPlayFrame.removeAttribute("src");
    anyPlayFrame.hidden=true;
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
async function openResolvedPlayback(item,season,episode,button=null,resumeTime=0){
  if(!item||!item.id)return null;

  const playbackId=++playbackOpenId;
  clearTimeout(introTimer);
  $("content-intro").classList.remove("show");
  $("content-intro").setAttribute("aria-hidden","true");
  $("details-modal").classList.remove("open");

  playbackReturnToTitlePage=!$("title-page").hidden;
  currentPlayback={
    item,
    season:kind(item)==="tv"?Number(season||1):null,
    episode:kind(item)==="tv"?Number(episode||1):null
  };
  latestPlaybackTime=Math.max(0,Number(resumeTime)||0);
  latestPlaybackDuration=0;
  lastProgressWrite=0;

  stopResolvedVideo();
  clearExternalSubtitles();
  modal("player-modal",true);
  $("player-modal").dataset.playerState="resolving";
  setPlayerStatus("Po kërkohet burimi direkt M3U8…");
  if(kind(item)==="movie"){
    const frame=$("anyplay-frame");
    if(!frame)throw new Error("AnyPlay iframe mungon në FLIXTV.");
    $("resolved-video").hidden=true;
    setPlayerQualityOptions([]);
    frame.hidden=false;
    const embedUrl=new URL("https://111movies.net/movie/"+encodeURIComponent(String(item.id)));
    $("player-modal").dataset.playerProvider="111movies";
    frame.onload=()=>{if(playbackId===playbackOpenId){clearPlayerStatus();$("player-modal").dataset.playerState="loaded"}};
    frame.onerror=()=>{if(playbackId===playbackOpenId)setPlayerStatus("111Movies nuk mundi të ngarkohej. Kontrollo lidhjen ose burimin.",true)};
    $("player-modal").dataset.playerState="loading";
    setPlayerStatus("Po hapet filmi…");
    frame.src=embedUrl.href;
    console.info("[FLIXTV] 111Movies movie embed selected",{title:title(item),tmdbId:item.id,resumeAt:Number(resumeTime)||0});
    return {provider:"111movies",format:"embed",url:embedUrl.href};
  }

  startProgressPolling();
  void autoLoadOpenSubtitles(item,season,episode);

  let refreshedAfterNetworkFailure=false;
  const handleFatalNetworkError=async diagnostic=>{
    if(playbackId!==playbackOpenId)return;

    const status=Number(diagnostic.status)||0;
    const details=String(diagnostic.details||"");
    const looksLikeUnavailableResource=
      status===404||status===0||
      /fragLoadError|manifestLoadError|levelLoadError/i.test(details);

    if(looksLikeUnavailableResource&&!refreshedAfterNetworkFailure){
      refreshedAfterNetworkFailure=true;
      setPlayerStatus("CDN nuk dha segmentin (HTTP "+(status||"i fshehur")+
        "). Po kërkohet automatikisht një burim i ri…");
      try{
        localStorage.removeItem(cinesrcM3U8CacheKey(item,season,episode));
      }catch(_){}
      stopResolvedVideo();

      try{
        const fresh=await requestCineSrcM3U8(item,season,episode,null,true);
        if(playbackId!==playbackOpenId)return;
        if(!fresh||!fresh.masterUrl)throw new Error(lastCineSrcResolveError||"Resolver-i nuk dha një burim të ri.");
        await startResolvedStream(fresh);
      }catch(error){
        if(playbackId===playbackOpenId){
          console.error("[FLIXTV] Fresh M3U8 retry failed:",error);
          setPlayerStatus("Edhe burimi i ri dështoi: "+(error.message||"gabim i panjohur"),true);
        }
      }
      return;
    }

    const reason=status===404
      ?"CDN vazhdon të kthejë HTTP 404 edhe pas marrjes së një M3U8 të ri."
      :status===403
        ?"CDN kthen HTTP 403 për burimin e videos."
        :status===0
          ?"Chrome nuk ekspozoi statusin për shkak të CORS ose dështimit të rrjetit; burimi i ri dështoi gjithashtu."
          :"Kërkesa HLS dështoi pas provës automatike.";
    const resource=diagnostic.url?" URL: "+diagnostic.url:"";
    console.error("[FLIXTV] Final HLS network failure:",diagnostic);
    setPlayerStatus(reason+" "+diagnostic.details+resource,true);
  };

  const startResolvedStream=async resolved=>{
    if(playbackId!==playbackOpenId)return false;
    const directUrl=new URL(resolved.masterUrl);
    const allowedHost=directUrl.hostname==="bright67.online"||
      directUrl.hostname.endsWith(".bright67.online")||
      directUrl.hostname==="cinesrc.st"||
      directUrl.hostname.endsWith(".cinesrc.st");
    if(directUrl.protocol!=="https:"||!allowedHost){
      throw new Error("Resolver-i ktheu një adresë M3U8 që nuk lejohet.");
    }

    console.info("[FLIXTV] Starting in-app HLS playback",{
      title:title(item),
      mediaType:kind(item),
      playlistType:resolved.playlistType||"unknown",
      sourceHost:directUrl.hostname,
      cached:!!resolved.cached,
      refreshedAfterNetworkFailure
    });
    $("player-modal").dataset.playerState="loading";
    return playResolvedHls(directUrl.href,latestPlaybackTime,playbackId,handleFatalNetworkError);
  };

  try{
    const resolved=await requestCineSrcM3U8(item,season,episode,button);
    if(playbackId!==playbackOpenId)return null;
    if(!resolved||!resolved.masterUrl){
      throw new Error(lastCineSrcResolveError||"Resolver-i nuk ktheu URL-në M3U8.");
    }
    await startResolvedStream(resolved);
    return {provider:"cinesrc",format:"hls",masterUrl:resolved.masterUrl};
  }catch(error){
    if(playbackId===playbackOpenId){
      console.error("[FLIXTV] In-app direct HLS playback failed:",error);
      setPlayerStatus(error.message||"Nuk u gjet adresa M3U8.",true);
      showCineSrcResolutionStatus(null,error.message||"Nuk u gjet adresa M3U8.");
    }
    return null;
  }
}
function play(item,season,episode){
  if(!item||!item.id)return;
  const saved=getSavedProgress(item);
  const sameEpisode=kind(item)!=="tv"||
    (Number(saved?.season||0)===Number(season||1)&&Number(saved?.episode||0)===Number(episode||1));
  const resume=sameEpisode?Number(saved?.currentTime)||0:0;
  return openResolvedPlayback(item,season,episode,null,resume);
}
function hidePlayerControls(){$("player-modal").classList.add("controls-visible")}function showPlayerControls(){if(!$("player-modal").classList.contains("open"))return;$("player-modal").classList.add("controls-visible");clearTimeout(controlsTimer)}$("player-modal").addEventListener("mousemove",showPlayerControls);$("player-modal").addEventListener("pointerdown",showPlayerControls);$("player-modal").addEventListener("keydown",showPlayerControls);function closePlayer(){$("player-modal").dataset.playerProvider="";savePlaybackProgress(true);playbackOpenId++;cinesrcResolveRequestId++;subtitleLookupRequest++;if(document.fullscreenElement){document.exitFullscreen().catch(()=>{})}try{if(screen.orientation&&typeof screen.orientation.unlock==="function")screen.orientation.unlock()}catch(_){}$("player-modal").classList.remove("css-fullscreen");clearInterval(progressPollTimer);progressPollTimer=null;clearTimeout(controlsTimer);clearTimeout(introTimer);stopResolvedVideo();currentPlayback=null;if(playbackReturnToTitlePage){$("title-page").hidden=false;$("catalog").hidden=true;$("hero").hidden=true;playbackReturnToTitlePage=false} $("content-intro").classList.remove("show");$("content-intro").setAttribute("aria-hidden","true");$("player-modal").classList.remove("attention-active");$("player-modal").classList.remove("open");$("player-modal").setAttribute("aria-hidden","true");document.body.classList.remove("no-scroll")}

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
 if(activeSubtitleTrack){if(host)host.textContent="";return}
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
 externalSubtitleCues=[];lastSubtitleIndex=-1;externalSubtitleOffset=0;
 removeNativeSubtitleTrack();
 const host=$("external-subtitle-overlay");if(host)host.textContent="";
 const status=$("subtitle-status");if(status)status.textContent="Pa titra të ngarkuar";
}
async function loadExternalSubtitleFile(file){
 if(!file)return;
 if(file.size>5*1024*1024){notice("Skedari i titrave është shumë i madh (maksimumi 5 MB).");return}
 try{
  const raw=await file.text(),cues=parseExternalSubtitles(raw);
  if(!cues.length)throw new Error("Nuk u gjetën titra të vlefshëm. Përdor formatin SRT ose VTT.");
  externalSubtitleCues=cues;externalSubtitleOffset=0;lastSubtitleIndex=-1;externalSubtitleEnabled=true;
  activeSubtitleLabel=file.name||"Titra";
  activeSubtitleLanguage="sq";
  attachNativeSubtitleTrack(cues,activeSubtitleLabel,activeSubtitleLanguage);
  $("subtitle-status").textContent="Titra aktivë · "+cues.length+" rreshta";
  $("subtitle-toggle").textContent="CC ON";
  renderExternalSubtitle(latestPlaybackTime);
  notice("Titrat u ngarkuan me sukses.");
 }catch(error){notice(error.message||"Skedari i titrave nuk u lexua.")}
}
let subtitleLookupRequest=0;
async function autoLoadOpenSubtitles(item,season,episode){
 const request=++subtitleLookupRequest;
 clearExternalSubtitles();
 const status=$("subtitle-status");
 if(status)status.textContent="Po kërkohen titrat automatikisht…";
 try{
  const params=new URLSearchParams({tmdb_id:String(item.id),type:kind(item),languages:"sq,en"});
  if(kind(item)==="tv"){params.set("season_number",String(season||1));params.set("episode_number",String(episode||1))}
  const response=await fetch("/api/subtitles.js?"+params.toString(),{headers:{Accept:"application/json"}});
  const result=await response.json();
  if(request!==subtitleLookupRequest)return;
  if(!response.ok)throw new Error(result.error||"OpenSubtitles nuk u përgjigj.");
  const subtitles=Array.isArray(result.data)?result.data:[];
  if(!subtitles.length){status.textContent="Nuk u gjetën titra shqip ose anglisht";return}
  const langRank=code=>String(code||"").toLowerCase().startsWith("sq")?0:String(code||"").toLowerCase().startsWith("en")?1:2;
  subtitles.sort((a,b)=>langRank(a.attributes?.language)-langRank(b.attributes?.language));
  const chosen=subtitles.find(x=>Array.isArray(x.attributes?.files)&&x.attributes.files.some(f=>f.file_id))||subtitles[0];
  const file=(chosen.attributes?.files||[]).find(f=>f.file_id);
  if(!file)throw new Error("OpenSubtitles nuk dha skedar të shkarkueshëm.");
  const download=await fetch("/api/subtitles.js?action=download",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({file_id:file.file_id})});
  const payload=await download.json();
  if(request!==subtitleLookupRequest)return;
  if(!download.ok||!payload.content)throw new Error(payload.error||"Shkarkimi i titrave dështoi.");
  const cues=parseExternalSubtitles(payload.content);
  if(!cues.length)throw new Error("Skedari i shkarkuar nuk përmban SRT/VTT të lexueshëm.");
  externalSubtitleCues=cues;externalSubtitleOffset=0;lastSubtitleIndex=-1;externalSubtitleEnabled=true;
  $("subtitle-offset-value").textContent="0.0s";$("subtitle-toggle").textContent="CC ON";
  const languageCode=String(chosen.attributes?.language||"en").toLowerCase().startsWith("sq")?"sq":"en";
  const language=languageCode==="sq"?"Shqip":"Anglisht";
  activeSubtitleLabel="OpenSubtitles · "+language;
  activeSubtitleLanguage=languageCode;
  attachNativeSubtitleTrack(cues,activeSubtitleLabel,activeSubtitleLanguage);
  status.textContent="OpenSubtitles · "+language+" · "+cues.length+" rreshta";
  renderExternalSubtitle(latestPlaybackTime);
 }catch(error){
  if(request!==subtitleLookupRequest)return;
  console.warn("[FLIXTV] Automatic subtitle lookup failed:",error);
  if(status)status.textContent=error.message||"Titrat automatikë nuk u ngarkuan";
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
 return new Intl.DateTimeFormat("sq-AL",{timeZone:"Europe/Tirane",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit",hour12:false}).format(date);
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
 if(/\\.(m3u8|mp4|webm)(?:$|\\?)/i.test(parsed.href)){
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
  if(updateHistory){const target=page==="sports"?"/sports":page==="home"?"/":location.pathname;if(target!==location.pathname)history.pushState({page},"",target)}
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
 document.querySelectorAll("[data-close]").forEach(e=>{if(e.dataset.close==="sports-settings")e.onclick=()=>modal("sports-settings",false)});
$("hero-action").onclick=()=>{const item=heroItems[heroIndex];if(item)window.location.assign(pageUrl(item));};
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&heroItems.length>1)startHeroTimer()});
window.addEventListener("pageshow",()=>{renderContinueWatching();if(heroItems.length>1)startHeroTimer()});
if(location.pathname.replace(/\/$/,"")==="/sports")openPage("sports",false);else if(location.pathname!=="/")resolveTitleRoute();else home();
})();