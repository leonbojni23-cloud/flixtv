(() => {
"use strict";
const API=location.hostname.endsWith("github.io")?"https://flixtv-snowy.vercel.app/api/tmdb.js":"/api/tmdb.js",IMG="https://image.tmdb.org/t/p/",$=id=>document.getElementById(id);
/* FLIXTV popup guard: protects the top-level app only.
   Cross-origin player iframes have a separate JS context and cannot be controlled here. */
(()=>{
 const nativeOpen=window.open.bind(window);
 window.open=function(url,target,features){
  const source=document.activeElement&&document.activeElement.id;
  const intentional=source==="player-open-external"||source==="watch-trailer";
  if(!intentional){console.warn("[FLIXTV] Blocked unsolicited popup:",url);return null}
  return nativeOpen(url,target,features);
 };
 document.addEventListener("click",event=>{
  const link=event.target&&event.target.closest?event.target.closest("a[target]"):null;
  if(!link)return;
  const target=(link.getAttribute("target")||"").toLowerCase();
  if(target==="_blank"&&!link.hasAttribute("data-allow-external")){
   event.preventDefault();
   event.stopImmediatePropagation();
   console.warn("[FLIXTV] Blocked external tab:",link.href);
  }
 },true);
 document.addEventListener("submit",event=>{
  const target=(event.target.getAttribute("target")||"").toLowerCase();
  if(target==="_blank"){
   event.preventDefault();
   event.stopImmediatePropagation();
   console.warn("[FLIXTV] Blocked form popup.");
  }
 },true);
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
 b.onclick=()=>details(x);return b
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
   $("hero-action").onclick=()=>details(item);
   requestAnimationFrame(()=>$("hero-content").classList.remove("changing"));
 },180);
}
showHero.requestId=0;
function startHeroTimer(){
 clearInterval(heroTimer);
 if(heroItems.length<2)return;
 heroTimer=setInterval(()=>{if(!document.hidden)showHero(heroIndex+1)},6500);
}
async function home(){
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
async function details(item){try{const k=kind(item),d=await tmdb("/"+k+"/"+item.id+"?append_to_response=videos");selected={...item,...d,media_type:k};$("details-title").textContent=title(d);$("details-type").textContent=k==="tv"?"SERIAL":"FILM";$("details-meta").textContent=[year(d),d.vote_average?"★ "+Number(d.vote_average).toFixed(1):"",d.runtime?d.runtime+" min":d.number_of_seasons?d.number_of_seasons+" sezone":""].filter(Boolean).join(" · ");const overview=await getAlbanianOverview(d,k);$("details-overview").textContent=overview||"Përshkrimi nuk është i disponueshëm.";$("details-backdrop").style.backgroundImage=d.backdrop_path?'linear-gradient(0deg,#111722,transparent 80%),url("'+IMG+"w1280"+d.backdrop_path+'")':"linear-gradient(0deg,#111722,#263143)";const t=(d.videos&&d.videos.results||[]).find(v=>v.site==="YouTube"&&(v.type==="Trailer"||v.type==="Teaser"));$("watch-trailer").hidden=!t;$("watch-trailer").onclick=()=>window.open("https://www.youtube.com/watch?v="+t.key,"_blank","noopener");$("episode-controls").hidden=k!=="tv";$("play-title").hidden=k==="tv";$("episode-controls").style.display=k==="tv"?"flex":"none";if(k!=="tv"){$("season-select").replaceChildren();$("episode-select").replaceChildren()}if(k==="tv"){const seasons=(d.seasons||[]).filter(s=>s.season_number>=0);$("season-select").innerHTML=seasons.map(s=>'<option value="'+s.season_number+'">'+s.name+"</option>").join("");$("season-select").onchange=episodes;await episodes()}modal("details-modal",true)}catch(e){notice(e.message)}}
async function episodes(){if(!selected)return;try{const s=$("season-select").value,d=await tmdb("/tv/"+selected.id+"/season/"+s);$("episode-select").innerHTML=(d.episodes||[]).map(ep=>'<option value="'+ep.episode_number+'">E'+ep.episode_number+" · "+String(ep.name||"").replace(/[&<>"]/g,"")+"</option>").join("")}catch(e){notice(e.message)}}
const genreSq={28:"Aksion",12:"Aventurë",16:"Animacion",35:"Komedi",80:"Krim",99:"Dokumentar",18:"Dramë",10751:"Familjar",14:"Fantazi",36:"Histori",27:"Horror",10402:"Muzikë",9648:"Mister",10749:"Romancë",878:"Fantashkencë",10770:"Film televiziv",53:"Thriller",10752:"Luftë",37:"Western",10759:"Aksion dhe aventurë",10762:"Për fëmijë",10763:"Lajme",10764:"Reality",10765:"Fantashkencë dhe fantazi",10766:"Sapunoperë",10767:"Talk-show",10768:"Luftë dhe politikë"};
function ageLabel(cert){const c=String(cert||"").trim().toUpperCase();const map={"G":"Për të gjitha moshat","TV-G":"Për të gjitha moshat","TV-Y":"Për fëmijë","TV-Y7":"Për fëmijë mbi 7 vjeç","PG":"Nën mbikëqyrjen e prindërve","TV-PG":"Nën mbikëqyrjen e prindërve","PG-13":"13+","TV-14":"14+","R":"17+","TV-MA":"18+","NC-17":"18+","18":"18+","16":"16+","15":"15+","12":"12+","U":"Për të gjitha moshat"};return map[c]||c||"Pa klasifikim moshe";}
async function contentRating(item){try{const k=kind(item),d=await tmdb("/"+k+"/"+item.id+(k==="tv"?"/content_ratings":"/release_dates"));if(k==="tv"){const rows=(d.results||[]).filter(x=>x.iso_3166_1==="US"||x.iso_3166_1==="AL");return (rows.find(x=>x.iso_3166_1==="AL")||rows.find(x=>x.iso_3166_1==="US")||rows[0]||{}).rating||""}const rows=(d.results||[]).filter(x=>x.iso_3166_1==="US"||x.iso_3166_1==="AL");const country=rows.find(x=>x.iso_3166_1==="AL")||rows.find(x=>x.iso_3166_1==="US")||rows[0];return country&&country.release_dates&&((country.release_dates.find(x=>x.certification)||{}).certification)||""}catch(_){return""}}
let activePlayerProvider="vidcore";
let currentPlayback=null;
function buildPlayerUrl(item,season,episode,provider=activePlayerProvider){
 const id=encodeURIComponent(String(item.id)),type=kind(item);
 if(provider==="vidcore"){
  return type==="tv"
   ?"https://vidcore.io/tv/"+id+"/"+Number(season)+"/"+Number(episode)
   :"https://vidcore.io/movie/"+id;
 }
 if(provider==="yapgrid"){
  const path=type==="tv"?"tv/"+id+"/"+Number(season)+"/"+Number(episode):"movie/"+id;
  return "https://yapgrid.com/embed/"+path+"?lang=en";
 }
 throw new Error("Player provider is disabled.");
}
function setPlayerProvider(provider){
 if(provider!=="vidcore"&&provider!=="yapgrid")return;
 activePlayerProvider=provider;
 document.querySelectorAll("[data-player-provider]").forEach(button=>{
  const active=button.dataset.playerProvider===provider;
  button.classList.toggle("active",active);
  button.setAttribute("aria-pressed",String(active));
 });
 if(currentPlayback){
  const {item,season,episode}=currentPlayback;
  $("yapgrid-frame").src=buildPlayerUrl(item,season,episode,provider);
 }
}
document.querySelectorAll("[data-player-provider]").forEach(button=>{
 button.addEventListener("click",()=>setPlayerProvider(button.dataset.playerProvider));
});
function startPlayback(item,season,episode){
 currentPlayback={item,season,episode};
 $("yapgrid-frame").src=buildPlayerUrl(item,season,episode);
 $("content-intro").classList.remove("show");
}
window.addEventListener("message",event=>{
 if(event.origin!=="https://yapgrid.com"||event.source!==$("yapgrid-frame").contentWindow)return;
 const message=event.data;
 if(!message||message.type!=="PLAYER_EVENT"||!message.data)return;
 window.dispatchEvent(new CustomEvent("flixtv:player-event",{detail:message.data}));
});
async function play(item,season,episode){if(!item||!item.id)return;clearTimeout(introTimer);const path=kind(item)==="tv"?"tv/"+item.id+"/"+Number(season)+"/"+Number(episode):"movie/"+item.id;$("intro-title").textContent=title(item);$("intro-rating").textContent="";$("intro-details").textContent="";$("content-intro").classList.add("show");$("content-intro").setAttribute("aria-hidden","false");$("player-modal").classList.add("attention-active");$("player-modal").classList.add("open");$("player-modal").setAttribute("aria-hidden","false");$("details-modal").classList.remove("open");document.body.classList.add("no-scroll");currentPlayback={item,season,episode};$("yapgrid-frame").src=buildPlayerUrl(item,season,episode);$("player-modal").classList.add("controls-visible");clearTimeout(controlsTimer);const cert=await contentRating(item);if(!$("player-modal").classList.contains("open"))return;$("intro-rating").textContent=ageLabel(cert);$("intro-details").textContent=(item.genre_ids||[]).map(id=>genreSq[id]).filter(Boolean).slice(0,3).join(" · ")||"Informacioni i klasifikimit";introTimer=setTimeout(()=>{$("content-intro").classList.remove("show");$("content-intro").setAttribute("aria-hidden","true");$("player-modal").classList.remove("attention-active")},2800);$("intro-skip").onclick=()=>{clearTimeout(introTimer);$("content-intro").classList.remove("show");$("content-intro").setAttribute("aria-hidden","true");$("player-modal").classList.remove("attention-active")}}
function hidePlayerControls(){$("player-modal").classList.add("controls-visible")}function showPlayerControls(){if(!$("player-modal").classList.contains("open"))return;$("player-modal").classList.add("controls-visible");clearTimeout(controlsTimer)}$("player-modal").addEventListener("mousemove",showPlayerControls);$("player-modal").addEventListener("pointerdown",showPlayerControls);$("player-modal").addEventListener("keydown",showPlayerControls);function closePlayer(){clearTimeout(controlsTimer);clearTimeout(introTimer);$("yapgrid-frame").src="about:blank";currentPlayback=null;$("content-intro").classList.remove("show");$("content-intro").setAttribute("aria-hidden","true");$("player-modal").classList.remove("attention-active");$("player-modal").classList.remove("open");$("player-modal").setAttribute("aria-hidden","true");document.body.classList.remove("no-scroll")}
$("player-open-external").onclick=()=>{const url=$("yapgrid-frame").src;if(url&&url!=="about:blank")window.open(url,"_blank","noopener,noreferrer")};
$("play-title").onclick=()=>play(selected);$("play-episode").onclick=()=>play(selected,$("season-select").value,$("episode-select").value);$("player-close").onclick=closePlayer;
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
   button.addEventListener("click",()=>{ $("search-page-input").value=title(item);$("search").value=title(item);box.hidden=true;runAdvancedSearch();details(item)});
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
 if(page==="home"){await home();return}
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
$("hero-action").onclick=()=>$("catalog").scrollIntoView({behavior:"smooth"});
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&heroItems.length>1)startHeroTimer()});
window.addEventListener("pageshow",()=>{if(heroItems.length>1)startHeroTimer()});
home();
})();