(() => {
"use strict";
const API=location.hostname.endsWith("github.io")?"https://flixtv-snowy.vercel.app/api/tmdb.js":"/api/tmdb.js",IMG="https://image.tmdb.org/t/p/",$=id=>document.getElementById(id);
let selected=null,searchTimer=null,searchRequest=0,introTimer=null,controlsTimer=null,heroItems=[],heroIndex=0,heroTimer=null,heroLayer=0,heroBusy=false;
function notice(m){const e=$("notice");e.textContent=m;e.hidden=false;clearTimeout(notice.timer);notice.timer=setTimeout(()=>e.hidden=true,3600)}
function modal(id,on){$(id).classList.toggle("open",on);$(id).setAttribute("aria-hidden",String(!on));document.body.classList.toggle("no-scroll",on||$("player-modal").classList.contains("open"))}
function title(x){return x.title||x.name||x.original_title||x.original_name||"Untitled"}
function kind(x){return x.media_type==="tv"||x.first_air_date?"tv":"movie"}
function year(x){return(x.release_date||x.first_air_date||"").slice(0,4)}
function poster(x){return x.poster_path?IMG+"w342"+x.poster_path:""}
function card(x){const b=document.createElement("button");b.className="poster-card";b.type="button";const src=poster(x);b.innerHTML=(src?'<img loading="lazy" alt="">':'<div class="placeholder">FLIXTV</div>')+'<span class="poster-title"></span><span class="poster-year"></span>';if(src)b.querySelector("img").src=src;b.querySelector(".poster-title").textContent=title(x);b.querySelector(".poster-year").textContent=year(x)+(kind(x)==="tv"?" · TV":"");b.onclick=()=>details(x);return b}
async function tmdb(path){const [pathname,query=""]=path.split("?");const params=new URLSearchParams(query);params.set("path",pathname);if(!params.has("language"))params.set("language","en-US");const r=await fetch(API+"?"+params.toString());if(!r.ok)throw Error("Catalogue request failed ("+r.status+").");return r.json()}
async function row(id,path){try{const d=await tmdb(path);$(id).replaceChildren(...(d.results||[]).filter(x=>x.poster_path).map(card));return d.results||[]}catch(e){notice(e.message);return []}}
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
   $("hero-overview").textContent=item.overview||"Discover your next favourite.";
   $("hero-eyebrow").textContent="FEATURED";
   $("hero-action").textContent="View details";
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
 $("search-results").hidden=true;
 $("hero").hidden=false;
 await Promise.all([
   row("trending","/trending/all/week"),
   row("movies","/movie/popular"),
   row("shows","/tv/popular")
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
     notice("No featured titles were returned by the catalogue.");
   }
 }catch(e){
   $("hero").style.backgroundImage="linear-gradient(135deg,#202938,#090b10)";
   notice(e.message);
 }
}
async function details(item){try{const k=kind(item),d=await tmdb("/"+k+"/"+item.id+"?append_to_response=videos");selected={...item,...d,media_type:k};$("details-title").textContent=title(d);$("details-type").textContent=k==="tv"?"TV SERIES":"MOVIE";$("details-meta").textContent=[year(d),d.vote_average?"★ "+Number(d.vote_average).toFixed(1):"",d.runtime?d.runtime+" min":d.number_of_seasons?d.number_of_seasons+" seasons":""].filter(Boolean).join(" · ");$("details-overview").textContent=d.overview||"No description available.";$("details-backdrop").style.backgroundImage=d.backdrop_path?'linear-gradient(0deg,#111722,transparent 80%),url("'+IMG+"w1280"+d.backdrop_path+'")':"linear-gradient(0deg,#111722,#263143)";const t=(d.videos&&d.videos.results||[]).find(v=>v.site==="YouTube"&&(v.type==="Trailer"||v.type==="Teaser"));$("watch-trailer").hidden=!t;$("watch-trailer").onclick=()=>window.open("https://www.youtube.com/watch?v="+t.key,"_blank","noopener");$("episode-controls").hidden=k!=="tv";$("play-title").hidden=k==="tv";if(k==="tv"){const seasons=(d.seasons||[]).filter(s=>s.season_number>=0);$("season-select").innerHTML=seasons.map(s=>'<option value="'+s.season_number+'">'+s.name+"</option>").join("");$("season-select").onchange=episodes;await episodes()}modal("details-modal",true)}catch(e){notice(e.message)}}
async function episodes(){if(!selected)return;try{const s=$("season-select").value,d=await tmdb("/tv/"+selected.id+"/season/"+s);$("episode-select").innerHTML=(d.episodes||[]).map(ep=>'<option value="'+ep.episode_number+'">E'+ep.episode_number+" · "+String(ep.name||"").replace(/[&<>"]/g,"")+"</option>").join("")}catch(e){notice(e.message)}}
const genreSq={28:"Aksion",12:"Aventurë",16:"Animacion",35:"Komedi",80:"Krim",99:"Dokumentar",18:"Dramë",10751:"Familjar",14:"Fantazi",36:"Histori",27:"Horror",10402:"Muzikë",9648:"Mister",10749:"Romancë",878:"Fantashkencë",10770:"Film televiziv",53:"Thriller",10752:"Luftë",37:"Western",10759:"Aksion dhe aventurë",10762:"Për fëmijë",10763:"Lajme",10764:"Reality",10765:"Fantashkencë dhe fantazi",10766:"Sapunoperë",10767:"Talk-show",10768:"Luftë dhe politikë"};
function ageLabel(cert){const c=String(cert||"").trim().toUpperCase();const map={"G":"Për të gjitha moshat","TV-G":"Për të gjitha moshat","TV-Y":"Për fëmijë","TV-Y7":"Për fëmijë mbi 7 vjeç","PG":"Nën mbikëqyrjen e prindërve","TV-PG":"Nën mbikëqyrjen e prindërve","PG-13":"13+","TV-14":"14+","R":"17+","TV-MA":"18+","NC-17":"18+","18":"18+","16":"16+","15":"15+","12":"12+","U":"Për të gjitha moshat"};return map[c]||c||"Pa klasifikim moshe";}
async function contentRating(item){try{const k=kind(item),d=await tmdb("/"+k+"/"+item.id+(k==="tv"?"/content_ratings":"/release_dates"));if(k==="tv"){const rows=(d.results||[]).filter(x=>x.iso_3166_1==="US"||x.iso_3166_1==="AL");return (rows.find(x=>x.iso_3166_1==="AL")||rows.find(x=>x.iso_3166_1==="US")||rows[0]||{}).rating||""}const rows=(d.results||[]).filter(x=>x.iso_3166_1==="US"||x.iso_3166_1==="AL");const country=rows.find(x=>x.iso_3166_1==="AL")||rows.find(x=>x.iso_3166_1==="US")||rows[0];return country&&country.release_dates&&((country.release_dates.find(x=>x.certification)||{}).certification)||""}catch(_){return""}}
function startPlayback(path){$("yapgrid-frame").src="https://yapgrid.com/embed/"+path+"?autoplay=1&lang=en";$("content-intro").classList.remove("show")}
async function play(item,season,episode){if(!item||!item.id)return;clearTimeout(introTimer);const path=kind(item)==="tv"?"tv/"+item.id+"/"+Number(season)+"/"+Number(episode):"movie/"+item.id;$("intro-title").textContent=title(item);$("intro-rating").textContent="";$("intro-details").textContent="";$("content-intro").classList.add("show");$("content-intro").setAttribute("aria-hidden","false");$("player-modal").classList.add("open");$("player-modal").setAttribute("aria-hidden","false");$("details-modal").classList.remove("open");document.body.classList.add("no-scroll");$("yapgrid-frame").src="https://yapgrid.com/embed/"+path+"?autoplay=1&lang=en";$("player-modal").classList.add("controls-visible");clearTimeout(controlsTimer);const cert=await contentRating(item);if(!$("player-modal").classList.contains("open"))return;$("intro-rating").textContent=ageLabel(cert);$("intro-details").textContent=(item.genre_ids||[]).map(id=>genreSq[id]).filter(Boolean).slice(0,3).join(" · ")||"Informacioni i klasifikimit";introTimer=setTimeout(()=>{$("content-intro").classList.remove("show");$("content-intro").setAttribute("aria-hidden","true")},2800);$("intro-skip").onclick=()=>{$("content-intro").classList.remove("show");$("content-intro").setAttribute("aria-hidden","true")}}
function hidePlayerControls(){$("player-modal").classList.add("controls-visible")}function showPlayerControls(){if(!$("player-modal").classList.contains("open"))return;$("player-modal").classList.add("controls-visible");clearTimeout(controlsTimer)}$("player-modal").addEventListener("mousemove",showPlayerControls);$("player-modal").addEventListener("pointerdown",showPlayerControls);$("player-modal").addEventListener("keydown",showPlayerControls);function closePlayer(){clearTimeout(controlsTimer);clearTimeout(introTimer);$("yapgrid-frame").src="about:blank";$("content-intro").classList.remove("show");$("content-intro").setAttribute("aria-hidden","true");$("player-modal").classList.remove("open");$("player-modal").setAttribute("aria-hidden","true");document.body.classList.remove("no-scroll")}
$("play-title").onclick=()=>play(selected);$("play-episode").onclick=()=>play(selected,$("season-select").value,$("episode-select").value);$("player-close").onclick=closePlayer;
document.querySelectorAll("[data-close]").forEach(e=>e.onclick=()=>modal(e.dataset.close+"-modal",false));
async function search(q){q=q.trim();const request=++searchRequest;if(!q){$("hero").hidden=false;$("catalog").hidden=false;$("search-results").hidden=true;return} $("hero").hidden=true;$("catalog").hidden=true;$("search-results").hidden=false;$("search-count").textContent="Searching…";try{const d=await tmdb("/search/multi?query="+encodeURIComponent(q)+"&include_adult=false");if(request!==searchRequest)return;const items=(d.results||[]).filter(x=>(x.media_type==="movie"||x.media_type==="tv")&&x.poster_path);$("search-grid").replaceChildren(...items.map(card));$("search-count").textContent=items.length+" titles"}catch(e){if(request===searchRequest)notice(e.message)}}
$("search").oninput=e=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>search(e.target.value),220)};
$("search-trigger").onclick=()=>{const box=$("searchbox");if(innerWidth<=760)box.classList.add("expanded");$("search").focus()};
$("mobile-search").onclick=()=>{$("searchbox").classList.add("expanded");$("search").focus()};
$("search").onkeydown=e=>{if(e.key==="Escape"){$("search").value="";search("");$("search").blur();$("searchbox").classList.remove("expanded")}};
const movieGenreSelect=$("movie-genre-select");
const genreCollections=$("movie-genre-collections");
const movieCatalogSections=[...document.querySelectorAll("#movies-page > .catalog-row-section")];
const moviePageTitle=document.querySelector("#movies-page .page-catalog-head h1");
const movieJumpNav=document.querySelector("#movies-page .catalog-jump-nav");
const genreNames={28:"Action",12:"Adventure",16:"Animation",35:"Comedy",80:"Crime",99:"Documentary",18:"Drama",10751:"Family",14:"Fantasy",36:"History",27:"Horror",10402:"Music",9648:"Mystery",10749:"Romance",878:"Science Fiction",53:"Thriller",10752:"War",37:"Western"};
const genreMixes={
  28:[12,878,53,80],12:[28,14,878,10751],16:[10751,12,14,35],35:[10749,28,80,18,10751],80:[53,18,28,9648],99:[36,10402,18],18:[10749,80,53,36,10749],10751:[16,35,12,14],14:[12,28,10751,10749],36:[18,10752,10749],27:[53,9648,80,878],10402:[18,10749,35],9648:[53,80,18,27],10749:[35,18,14,10402],878:[28,12,53,18,14],53:[28,80,9648,27],10752:[28,18,36],37:[28,12,18]
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
 return {id:posters.id,path:"/discover/movie?with_genres="+idList.join(",")+"&sort_by=popularity.desc"};
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
 moviePageTitle.textContent=primary+" Movies";
 movieJumpNav.hidden=true;
 genreCollections.hidden=false;
 genreCollections.replaceChildren();
 const rows=[
  makeGenreRow(primary+" Movies",[genreId],0),
  ...[...new Set(genreMixes[genreId]||[])].map((secondary,index)=>makeGenreRow(primary+" + "+genreNames[secondary], [genreId,secondary],index+1))
 ];
 genreCollections.scrollIntoView({behavior:"smooth",block:"start"});
 await Promise.all(rows.map(async item=>{
  if(request!==genreRequest)return;
  try{
   const data=await tmdb(item.path);
   if(request!==genreRequest)return;
   const results=(data.results||[]).filter(movie=>movie.poster_path);
   $(item.id).replaceChildren(...results.map(card));
   if(!results.length)$(item.id).innerHTML='<div class="genre-loading">No movies found in this collection.</div>';
  }catch(error){
   if(request!==genreRequest)return;
   $(item.id).innerHTML='<div class="genre-loading">Could not load this collection.</div>';
   notice(error.message);
  }
 }));
}
if(movieGenreSelect)movieGenreSelect.addEventListener("change",()=>loadGenreCollections(movieGenreSelect.value));
const loadedPages=new Set();
async function openPage(page){
 document.querySelectorAll("[data-page]").forEach(x=>x.classList.toggle("active",x.dataset.page===page));
 $("search-results").hidden=true;
 $("catalog").hidden=false;
 $("hero").hidden=page!=="home";
 $("home-page").hidden=page!=="home";
 $("movies-page").hidden=page!=="movies";
 $("shows-page").hidden=page!=="shows";
 if(page==="home"){await home();return}
 if(loadedPages.has(page))return;
 const jobs=page==="movies"?[
  ["movie-trending","/trending/movie/week"],["movie-popular","/movie/popular"],["movie-top","/movie/top_rated"],["movie-now","/movie/now_playing"],["movie-upcoming","/movie/upcoming"]
 ]:[
  ["show-trending","/trending/tv/week"],["show-popular","/tv/popular"],["show-top","/tv/top_rated"],["show-airing","/tv/on_the_air"],["show-today","/tv/airing_today"]
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