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
async function row(id,path){try{const d=await tmdb(path);$(id).replaceChildren(...(d.results||[]).filter(x=>x.poster_path).map(card))}catch(e){notice(e.message)}}
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
 $("header.topbar").style.setProperty("--header-art",image);
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
document.querySelectorAll("[data-page]").forEach(b=>b.onclick=async()=>{const page=b.dataset.page;document.querySelectorAll("[data-page]").forEach(x=>x.classList.toggle("active",x.dataset.page===page));if(page==="home"){await home();return}$("hero").hidden=true;$("catalog").hidden=false;$("search-results").hidden=true;const id=page==="movies"?"movies":"shows";await row(id,page==="movies"?"/movie/popular":"/tv/popular");$(id).scrollIntoView({behavior:"smooth",block:"start"})});
$("hero-action").onclick=()=>$("catalog").scrollIntoView({behavior:"smooth"});
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&heroItems.length>1)startHeroTimer()});
window.addEventListener("pageshow",()=>{if(heroItems.length>1)startHeroTimer()});
home();
})();