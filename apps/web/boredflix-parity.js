
(function(){
"use strict";
var doc=document,$=function(id){return doc.getElementById(id)},root=$("app");
var current={page:"home",provider:null,query:"",tab:"continue",savedFilter:"all",media:"movie",filters:{genre:"",year:"",sort:"popularity.desc",rating:"",votes:""},results:[],pageNo:0,totalPages:1,loading:false,request:0,providerData:[],searchTimer:0};
var API=location.hostname.endsWith("github.io")?"https://flixtv-snowy.vercel.app/api/tmdb.js":"/api/tmdb.js",IMG="https://image.tmdb.org/t/p/";
var GENRES={movie:[[28,"Action"],[12,"Adventure"],[16,"Animation"],[35,"Comedy"],[80,"Crime"],[99,"Documentary"],[18,"Drama"],[10751,"Family"],[14,"Fantasy"],[36,"History"],[27,"Horror"],[10402,"Music"],[9648,"Mystery"],[10749,"Romance"],[878,"Sci-Fi"],[53,"Thriller"],[10752,"War"],[37,"Western"]],tv:[[10759,"Action & Adventure"],[16,"Animation"],[35,"Comedy"],[80,"Crime"],[99,"Documentary"],[18,"Drama"],[10751,"Family"],[10762,"Kids"],[9648,"Mystery"],[10763,"News"],[10764,"Reality"],[10765,"Sci-Fi & Fantasy"],[10766,"Soap"],[10767,"Talk"],[10768,"War & Politics"],[37,"Western"]]};
function safe(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function name(x){return x.title||x.name||x.original_title||x.original_name||"Untitled"}
function kind(x){return x.media_type==="tv"||x.first_air_date?"tv":"movie"}
function yr(x){return String(x.release_date||x.first_air_date||"").slice(0,4)}
function posterUrl(x){return x.poster_path?IMG+"w342"+x.poster_path:""}
function apiPath(path){var parts=path.split("?"),params=new URLSearchParams(parts[1]||"");params.set("path",parts[0]);if(!params.has("language"))params.set("language","sq-AL");return API+"?"+params.toString()}
async function tmdb(path){var r=await fetch(apiPath(path),{credentials:"same-origin"});if(!r.ok)throw new Error("TMDB request failed ("+r.status+").");return r.json()}
function bridge(){return window.FLIXTV_BRIDGE||null}
function openTitle(item){var b=bridge();if(b&&b.openTitle){b.openTitle(Object.assign({},item,{media_type:kind(item)}));return}location.href="/"+name(item).toLowerCase().replace(/[^a-z0-9]+/g,"-")+"--"+kind(item)+"-"+item.id}
function playTitle(item){var b=bridge();if(b&&b.play){try{var p=b.play(Object.assign({},item,{media_type:kind(item)}));if(p&&p.catch)p.catch(function(){openTitle(item)})}catch(_){openTitle(item)}}else openTitle(item)}
function scrollTop(){var s=$("app");if(s)s.scrollTo({top:0,behavior:"instant"});window.scrollTo({top:0,behavior:"instant"})}
function ensurePanel(){var p=$("bf-route-page");if(p)return p;p=doc.createElement("section");p.id="bf-route-page";p.className="bf-page";p.hidden=true;var t=$("title-page");if(t&&t.parentNode)t.parentNode.insertBefore(p,t);else root.appendChild(p);return p}
function setPanel(html){var p=ensurePanel();p.className="bf-page";p.innerHTML=html;p.hidden=false;return p}
function navActive(page){doc.querySelectorAll(".desktop-nav [data-bf-page],.mobile-nav [data-bf-page]").forEach(function(el){el.classList.toggle("active",el.getAttribute("data-bf-page")===page)})}
function showOnly(page){
 var innerRoute=page==="movies"||page==="shows"||page==="library"||page==="provider";
 doc.documentElement.classList.toggle("bf-inner-route",innerRoute);
 doc.body.classList.toggle("bf-provider-route",page==="provider");
 doc.body.classList.toggle("bf-movies-route",page==="movies");
 doc.body.classList.toggle("bf-shows-route",page==="shows");
 doc.body.classList.toggle("bf-search-route",page==="search");
 if($("hero"))$("hero").hidden=page!=="home"&&page!=="movies"&&page!=="shows";
 if($("catalog"))$("catalog").hidden=page!=="home";
 if($("search-page"))$("search-page").hidden=true;
 if($("sports-page"))$("sports-page").hidden=page!=="sports";
 if($("title-page"))$("title-page").hidden=true;
 var panel=$("bf-route-page");if(panel)panel.hidden=page==="home"||page==="sports";
 navActive(page==="library"?"library":page==="provider"?"provider":page);
 if(page==="home"&&bridge()&&bridge().openPage)bridge().openPage("home",false);
 if(page==="sports"&&bridge()&&bridge().openPage)bridge().openPage("sports",false);
}
function routeUrl(page,provider){if(page==="movies")return"/browse/movies";if(page==="shows")return"/browse/tv";if(page==="library")return"/library";if(page==="search")return"/search";if(page==="sports")return"/sports";if(page==="provider")return"/browse/provider/"+provider;return"/"}
function navigate(page,provider,query,replace){
 if(page!=="search")clearTimeout(current.searchTimer);
 if(page==="search"&&query!=null)current.query=query;
 var url=routeUrl(page,provider)+(page==="search"&&current.query?"?q="+encodeURIComponent(current.query):"");
 if(location.pathname+location.search!==url){
  var legacy=page==="movies"?"movies":page==="shows"?"shows":page==="sports"?"sports":"home";
  var view={page:legacy,sports:page==="sports",search:false,scrollY:0};
  var state={flixView:view,bfRoute:{page:page,provider:provider||null}};
  if(replace)history.replaceState(state,"",url);else history.pushState(state,"",url);
 }
 render(page,provider,query);
}
function renderGrid(container,items,append){
 var valid=items.filter(function(x){return x&&x.poster_path});
 if(!append)container.replaceChildren();
 if(!valid.length){if(!append){var empty=doc.createElement("div");empty.className="bf-empty";empty.textContent="No titles found. Try changing the filters.";container.appendChild(empty)}return}
 var fragment=doc.createDocumentFragment();
 valid.forEach(function(item,index){
  var card=createPoster(item);
  if(append){card.classList.add("bf-card-entering");card.style.setProperty("--bf-card-enter-delay",Math.min(index,8)*32+"ms")}
  fragment.appendChild(card);
 });
 container.appendChild(fragment);
}
function createPoster(item,onOpen){
 var b=doc.createElement("button");b.type="button";b.className="bf-grid-card";b.setAttribute("aria-label","Open "+name(item));
 var media=doc.createElement("span");media.className="bf-grid-media";
 var img=doc.createElement("img");img.loading="lazy";img.decoding="async";img.alt="";img.src=posterUrl(item);
 img.onerror=function(){img.style.display="none"};
 media.appendChild(img);
 var ratingValue=Number(item.vote_average);if(Number.isFinite(ratingValue)&&ratingValue>0){var badge=doc.createElement("span");badge.className="bf-grid-rating";badge.textContent="★ "+ratingValue.toFixed(1);media.appendChild(badge)}
 var hover=doc.createElement("span");hover.className="bf-grid-hover";var play=doc.createElement("span");play.className="bf-grid-play";play.textContent="▶";hover.appendChild(play);media.appendChild(hover);
 var title=doc.createElement("strong");title.className="bf-grid-title";title.textContent=name(item);
 var meta=doc.createElement("span");meta.className="bf-grid-meta";
 var identity=doc.createElement("span");identity.className="bf-grid-identity";identity.textContent=(kind(item)==="tv"?"TV Series":"Movie")+(yr(item)?" · "+yr(item):"");
 meta.appendChild(identity);
 var rating=Number(item.vote_average);
 if(Number.isFinite(rating)&&rating>0){var score=doc.createElement("span");score.className="bf-grid-rating-inline";score.textContent="★ "+rating.toFixed(1);score.setAttribute("aria-label","Rating "+rating.toFixed(1));meta.appendChild(score)}
 b.append(media,title,meta);b.addEventListener("click",function(e){if(onOpen)onOpen(item);else if(e.target.closest(".bf-grid-play"))playTitle(item);else openTitle(item)});return b;
}
function createWide(item){
 var b=doc.createElement("button");b.type="button";b.className="bf-wide-card";b.setAttribute("aria-label","Open "+name(item));
 var img=doc.createElement("img");img.loading="lazy";img.alt="";img.src=item.backdrop_path?IMG+"w780"+item.backdrop_path:posterUrl(item);
 var copy=doc.createElement("span");copy.className="bf-wide-copy";var strong=doc.createElement("strong");strong.textContent=name(item);
 var small=doc.createElement("small"),date=item.release_date||item.first_air_date;small.textContent=date?new Date(date+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}):"";
 copy.append(strong,small);b.append(img,copy);b.onclick=function(){openTitle(item)};return b;
}
function filterMarkup(){var gs=GENRES[current.media]||GENRES.movie;return '<div class="bf-filterbar"><button type="button" class="bf-filter-action" id="bf-surprise"><span class="bf-surprise-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="12" height="12" rx="2.5" transform="rotate(-12 9.5 9.5)"/><rect x="9" y="9" width="11.5" height="11.5" rx="2.5"/><path d="M12.5 12.5h.01m4.5 4.5h.01m0-4.5h.01m-4.5 4.5h.01"/></svg></span><span class="bf-surprise-label">Surprise me</span></button><select class="bf-filter-select" id="bf-genre" aria-label="Genre"><option value="">Genre</option>'+gs.map(function(g){return'<option value="'+g[0]+'">'+safe(g[1])+'</option>'}).join("")+'</select><select class="bf-filter-select" id="bf-year" aria-label="Year"><option value="">Year</option>'+Array.from({length:47},function(_,i){return 2026-i}).map(function(y){return'<option value="'+y+'">'+y+'</option>'}).join("")+'</select><select class="bf-filter-select" id="bf-sort" aria-label="Popular"><option value="popularity.desc">Popular</option><option value="primary_release_date.desc">Newest</option></select><select class="bf-filter-select" id="bf-rating" aria-label="Rating"><option value="">Rating</option><option value="6">6.0+</option><option value="7">7.0+</option><option value="8">8.0+</option><option value="9">9.0+</option></select><select class="bf-filter-select" id="bf-votes" aria-label="Votes"><option value="">Votes</option><option value="100">100+</option><option value="500">500+</option><option value="1000">1,000+</option><option value="5000">5,000+</option></select><span class="bf-result-count" id="bf-result-count"></span></div>'}
function browseMarkup(page){
 var tv=page==="shows";
 return '<div class="bf-page-inner bf-catalog-inner"><div class="bf-page-kicker">'+(tv?"TV SERIES":"MOVIE COLLECTION")+'</div><h1 class="bf-page-title">'+(tv?'TV <span class="bf-accent">Shows</span>':'Movies')+'</h1>'+filterMarkup()+'<div class="bf-surprise-result" id="bf-surprise-result" hidden aria-live="polite"></div><div class="bf-grid '+(tv?"":"bf-movies-grid")+'" id="bf-grid"><div class="bf-loading">Loading titles…</div></div><div class="bf-provider-scroll-sentinel" id="bf-provider-scroll-sentinel" aria-hidden="true"></div></div>'
}
function filterPath(page){var q=new URLSearchParams();q.set("include_adult","false");q.set("sort_by",current.filters.sort==="primary_release_date.desc"&&current.media==="tv"?"first_air_date.desc":current.filters.sort||"popularity.desc");q.set("page",String(page));if(current.filters.genre)q.set("with_genres",current.filters.genre);if(current.filters.year)q.set(current.media==="movie"?"primary_release_year":"first_air_date_year",current.filters.year);if(current.filters.rating)q.set("vote_average.gte",current.filters.rating);if(current.filters.votes)q.set("vote_count.gte",current.filters.votes);return"/discover/"+current.media+"?"+q.toString()}
function clearSurprisePick(){var zone=$("bf-surprise-result");if(zone){zone.hidden=true;zone.classList.remove("is-visible");zone.replaceChildren()}}
function surpriseQuery(page,providerMode,relaxed){
 var old=current.filters;current.filters=Object.assign({},old,{sort:"vote_average.desc",rating:String(Math.max(Number(old.rating)||0,relaxed?6.4:7)),votes:String(Math.max(Number(old.votes)||0,relaxed?75:250))});
 var path=providerMode?providerPath(page):filterPath(page);current.filters=old;return path;
}
function showSurprisePick(item){
 var zone=$("bf-surprise-result");if(!zone)return;
 zone.replaceChildren();
 var card=doc.createElement("article");card.className="bf-surprise-pick";
 var img=doc.createElement("img");img.loading="eager";img.alt="";img.src=posterUrl(item);
 var copy=doc.createElement("div");copy.className="bf-surprise-pick-copy";
 var kicker=doc.createElement("span");kicker.className="bf-surprise-pick-kicker";kicker.textContent="ZGJEDHJA JOTE";
 var heading=doc.createElement("strong");heading.className="bf-surprise-pick-title";heading.textContent=name(item);
 var meta=doc.createElement("span");meta.className="bf-surprise-pick-meta";
 var rating=Number(item.vote_average);meta.textContent=[kind(item)==="tv"?"Serial":"Film",yr(item),rating>0?"★ "+rating.toFixed(1):""].filter(Boolean).join(" · ");
 var action=doc.createElement("button");action.type="button";action.className="bf-surprise-pick-open";action.textContent="Hap titullin";action.onclick=function(){openTitle(item)};
 copy.append(kicker,heading,meta);
 if(item.overview){var summary=doc.createElement("p");summary.textContent=item.overview;copy.appendChild(summary)}
 copy.appendChild(action);card.append(img,copy);zone.appendChild(card);zone.hidden=false;
 zone.classList.remove("is-visible");void zone.offsetWidth;zone.classList.add("is-visible");
 if(zone.scrollIntoView)zone.scrollIntoView({behavior:"smooth",block:"nearest"});
}
async function runSurprise(providerMode){
 var button=$("bf-surprise");if(!button||button.disabled)return;
 var startedAt=Date.now(),minimumSpinMs=1550;
 var waitForDice=function(){var remaining=minimumSpinMs-(Date.now()-startedAt);return remaining>0?new Promise(function(resolve){window.setTimeout(resolve,remaining)}):Promise.resolve()};
 var label=button.querySelector(".bf-surprise-label"),original=label?label.textContent:button.textContent;
 button.disabled=true;button.classList.add("is-spinning");button.setAttribute("aria-busy","true");
 if(label)label.textContent="Po zgjedh…";
 clearSurprisePick();
 try{
  var pages=[1,2,3],responses=await Promise.all(pages.map(function(page){return tmdb(surpriseQuery(page,providerMode,false))}));
  var pool=[];responses.forEach(function(data){(data.results||[]).forEach(function(item){if(item&&item.poster_path)pool.push(Object.assign({},item,{media_type:current.media}))})});
  var strong=pool.filter(function(item){return Number(item.vote_average)>=7&&Number(item.vote_count)>=250});
  if(!strong.length){
   var fallback=await Promise.all([1,2].map(function(page){return tmdb(surpriseQuery(page,providerMode,true))}));
   fallback.forEach(function(data){(data.results||[]).forEach(function(item){if(item&&item.poster_path)pool.push(Object.assign({},item,{media_type:current.media}))})});
   strong=pool.filter(function(item){return Number(item.vote_average)>=6.4&&Number(item.vote_count)>=75});
  }
  var unique=strong.filter(function(item,index,array){return array.findIndex(function(other){return String(other.id)===String(item.id)})===index});
  if(!unique.length)throw new Error("Nuk u gjet një titull i përshtatshëm me këto filtra. Provo të heqësh një filtër.");
  unique.sort(function(a,b){return (Number(b.vote_average)-Number(a.vote_average))*2+Math.log1p(Number(b.vote_count)||0)-Math.log1p(Number(a.vote_count)||0)});
  var shortlist=unique.slice(0,Math.min(24,unique.length)),choice=shortlist[Math.floor(Math.random()*shortlist.length)];
  await waitForDice();
  showSurprisePick(choice);
  if(label)label.textContent="U zgjodh!";
  button.classList.add("has-pick");
  window.setTimeout(function(){if(label&&label.isConnected)label.textContent=original;if(button.isConnected)button.classList.remove("has-pick")},2600);
 }catch(error){
  await waitForDice();
  if(label)label.textContent=original;
  var zone=$("bf-surprise-result");if(zone){var message=doc.createElement("div");message.className="bf-surprise-error";message.textContent=error&&error.message?error.message:"Surprise Me nuk arriti të zgjedhë një titull.";zone.appendChild(message);zone.hidden=false}
 }finally{
  button.disabled=false;button.classList.remove("is-spinning");button.removeAttribute("aria-busy");
 }
}
function connectFilters(providerMode){
 ["genre","year","sort","rating","votes"].forEach(function(key){var el=$("bf-"+key);if(!el)return;el.value=current.filters[key]||"";el.addEventListener("change",function(){current.filters[key]=el.value;clearSurprisePick();if(providerMode)loadProviderResults(true);else loadDiscover(true)})});
 var surprise=$("bf-surprise");if(surprise)surprise.onclick=function(){runSurprise(providerMode)};
 var more=$("bf-load-more");if(more)more.onclick=function(){if(providerMode)loadProviderResults(false);else loadDiscover(false)};
}
function setCount(n){var c=$("bf-result-count");if(current.page==="provider")c=doc.querySelector(".bf-provider-tab.active .bf-provider-count")||c;if(c)c.textContent=Number(n||0).toLocaleString("en-US")+(current.page==="provider"?"":" titles")}
function resetFilters(){current.filters={genre:"",year:"",sort:"popularity.desc",rating:"",votes:""}}
async function loadDiscover(reset,forced){
 if(current.loading&&!reset)return;if(reset){current.results=[];current.pageNo=0;current.totalPages=1}
 var p=forced||current.pageNo+1,req=++current.request,grid=$("bf-grid"),more=$("bf-load-more");current.loading=true;
 if(more){more.disabled=true;more.textContent="Loading…"}if(grid&&reset)grid.innerHTML='<div class="bf-loading">Loading titles…</div>';
 try{var d=await tmdb(filterPath(p));if(req!==current.request)return;var items=(d.results||[]).filter(function(x){return x.poster_path}).map(function(x){return Object.assign({},x,{media_type:current.media})});current.results=reset?items:current.results.concat(items);current.pageNo=p;current.totalPages=Math.min(Number(d.total_pages)||1,500);if(grid)renderGrid(grid,reset?current.results:items,!reset);setCount(d.total_results||current.results.length);if(more){more.hidden=p>=current.totalPages;more.disabled=false;more.textContent="Load more"}}
 catch(e){if(grid&&reset)grid.innerHTML='<div class="bf-empty">'+safe(e.message)+'</div>';if(more){more.disabled=false;more.textContent="Try again"}}
 finally{if(req===current.request)current.loading=false}
}
function observeBrowseScroll(){
 if(current.browseObserver){current.browseObserver.disconnect();current.browseObserver=null}
 var sentinel=$("bf-provider-scroll-sentinel");if(!sentinel||!window.IntersectionObserver)return;
 current.browseObserver=new IntersectionObserver(function(entries){
  if(entries.some(function(entry){return entry.isIntersecting})&&!current.loading&&current.pageNo<current.totalPages)loadDiscover(false);
 },{root:null,rootMargin:"500px 0px 500px 0px",threshold:0});
 current.browseObserver.observe(sentinel);
}
function renderBrowse(page,sortBy){current.page=page;current.media=page==="shows"?"tv":"movie";current.pageNo=0;current.totalPages=1;resetFilters();current.filters.sort=sortBy||new URLSearchParams(location.search).get("sortBy")||"popularity.desc";setPanel(browseMarkup(page));connectFilters(false);if(page==="movies"||page==="shows"){if(bridge()&&bridge().ensureHeroCarousel)bridge().ensureHeroCarousel();observeBrowseScroll()}loadDiscover(true)}
function navigateBrowse(page,sortBy){clearTimeout(current.searchTimer);var url=routeUrl(page)+(sortBy?"?sortBy="+encodeURIComponent(sortBy):"");if(location.pathname+location.search!==url){var legacy=page==="movies"?"movies":"shows";history.pushState({flixView:{page:legacy,sports:false,search:false,scrollY:0},bfRoute:{page:page,provider:null}},"",url)}current.page=page;showOnly(page);navActive(page);scrollTop();renderBrowse(page,sortBy)}
function slug(p){var s=String(p.provider_name||"").toLowerCase().replace(/\+/g," plus ").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");if(s.indexOf("netflix")>=0)return"netflix";if(s.indexOf("hbo")>=0||s==="max")return"max";if(s.indexOf("disney")>=0)return"disney-plus";if(s.indexOf("prime")>=0||s.indexOf("amazon")>=0)return"prime-video";if(s.indexOf("hulu")>=0)return"hulu";if(s.indexOf("apple")>=0)return"apple-tv";if(s.indexOf("paramount")>=0)return"paramount-plus";if(s.indexOf("peacock")>=0)return"peacock";if(s.indexOf("crunchyroll")>=0)return"crunchyroll";return s}
async function loadProviders(){var lists=await Promise.all([tmdb("/watch/providers/movie?watch_region=AL&language=sq-AL"),tmdb("/watch/providers/tv?watch_region=AL&language=sq-AL")]),map=new Map();[["movie",lists[0]],["tv",lists[1]]].forEach(function(pair){(pair[1].results||[]).forEach(function(p){if(!p.provider_id||!p.provider_name)return;var x=map.get(String(p.provider_id))||Object.assign({},p,{mediaTypes:[]});x.mediaTypes.push(pair[0]);map.set(String(p.provider_id),x)})});var order=["netflix","max","disney-plus","prime-video","hulu","apple-tv","paramount-plus","peacock","crunchyroll"];return Array.from(map.values()).filter(function(p){return !/^justwatch/i.test(p.provider_name)}).sort(function(a,b){var ai=order.indexOf(slug(a)),bi=order.indexOf(slug(b));if(ai<0)ai=90;if(bi<0)bi=90;return ai-bi||(Number(a.display_priority)||999)-(Number(b.display_priority)||999)}).slice(0,20)}
function renderHomeServices(providers){var row=$("browse-services");if(!row)return;row.replaceChildren();providers.forEach(function(p){var btn=doc.createElement("button");btn.type="button";btn.className="service-card";var tile=doc.createElement("span");tile.className="service-logo-tile";if(p.logo_path){var img=doc.createElement("img");img.loading="lazy";img.alt="";img.src=IMG+"w185"+p.logo_path;tile.appendChild(img)}else{var initials=doc.createElement("span");initials.textContent=p.provider_name.slice(0,2).toUpperCase();tile.appendChild(initials)}var label=doc.createElement("span");label.className="service-card-label";label.textContent=p.provider_name;btn.append(tile,label);btn.onclick=function(){navigate("provider",slug(p))};row.appendChild(btn)});current.providerData=providers}
function findProvider(s){return(current.providerData||[]).find(function(p){return slug(p)===s})||null}
function providerFilterMarkup(){var gs=GENRES[current.media]||GENRES.movie;return '<div class="bf-filterbar bf-provider-filterbar"><select class="bf-filter-select" id="bf-genre" aria-label="Genre"><option value="">Genre</option>'+gs.map(function(g){return'<option value="'+g[0]+'">'+safe(g[1])+'</option>'}).join("")+'</select><select class="bf-filter-select" id="bf-year" aria-label="Year"><option value="">Year</option>'+Array.from({length:47},function(_,i){return 2026-i}).map(function(y){return'<option value="'+y+'">'+y+'</option>'}).join("")+'</select><select class="bf-filter-select" id="bf-sort" aria-label="Sort by"><option value="popularity.desc">Popular</option><option value="vote_average.desc">Rating</option></select><select class="bf-filter-select" id="bf-rating" aria-label="Minimum rating"><option value="">Rating</option><option value="6">6.0+</option><option value="7">7.0+</option><option value="8">8.0+</option><option value="9">9.0+</option></select></div>'}
function providerMarkup(p,providers){var rail=providers.map(function(x){return'<button class="bf-service-chip '+(String(x.provider_id)===String(p.provider_id)?"active":"")+'" data-provider="'+safe(slug(x))+'">'+(x.logo_path?'<img alt="" src="'+IMG+'w92'+safe(x.logo_path)+'">':'')+safe(x.provider_name)+'</button>'}).join("");return '<div class="bf-page-inner bf-provider-inner"><div class="bf-provider-head"><span class="bf-provider-mark">'+(p.logo_path?'<img alt="" src="'+IMG+'w92'+safe(p.logo_path)+'">':safe(p.provider_name.slice(0,2)))+'</span><div class="bf-provider-heading"><span class="bf-provider-kicker">Streaming service</span><h1 class="bf-provider-title">'+safe(p.provider_name)+'</h1></div></div><div class="bf-service-rail">'+rail+'</div><div class="bf-provider-tabs"><button class="bf-provider-tab active" data-media="movie">Movies <span class="bf-provider-count"></span></button><button class="bf-provider-tab" data-media="tv">TV Shows <span class="bf-provider-count"></span></button></div>'+providerFilterMarkup()+'<div class="bf-surprise-result" id="bf-surprise-result" hidden aria-live="polite"></div><div class="bf-grid bf-provider-grid" id="bf-grid"><div class="bf-loading">Loading titles…</div></div><div class="bf-provider-scroll-sentinel" id="bf-provider-scroll-sentinel" aria-hidden="true"></div></div>'}
function providerPath(p){var q=new URLSearchParams();q.set("with_watch_providers",String(current.provider.provider_id));q.set("watch_region","AL");q.set("with_watch_monetization_types","flatrate|free|ads");q.set("sort_by",current.filters.sort==="primary_release_date.desc"&&current.media==="tv"?"first_air_date.desc":current.filters.sort||"popularity.desc");q.set("page",String(p));q.set("include_adult","false");if(current.filters.genre)q.set("with_genres",current.filters.genre);if(current.filters.year)q.set(current.media==="movie"?"primary_release_year":"first_air_date_year",current.filters.year);if(current.filters.rating)q.set("vote_average.gte",current.filters.rating);if(current.filters.votes)q.set("vote_count.gte",current.filters.votes);return"/discover/"+current.media+"?"+q.toString()}
async function loadProviderResults(reset,forced){
 if((current.loading&&!reset)||!current.provider||(!reset&&current.pageNo>=current.totalPages))return;
 if(reset){current.results=[];current.pageNo=0;current.totalPages=1}
 var p=forced||current.pageNo+1,req=++current.request,grid=$("bf-grid");current.loading=true;
 if(grid&&reset)grid.innerHTML='<div class="bf-loading">Loading titles…</div>';
 try{
  var d=await tmdb(providerPath(p));if(req!==current.request)return;
  var items=(d.results||[]).filter(function(x){return x.poster_path}).map(function(x){return Object.assign({},x,{media_type:current.media})});
  current.results=reset?items:current.results.concat(items);current.pageNo=p;current.totalPages=Math.min(Number(d.total_pages)||1,500);
  if(grid)renderGrid(grid,reset?current.results:items,!reset);setCount(d.total_results||current.results.length);
 }catch(e){
  if(grid&&reset)grid.innerHTML='<div class="bf-empty">'+safe(e.message)+'</div>';
  else if(grid){var error=doc.createElement("div");error.className="bf-empty bf-provider-load-error";error.textContent="Could not load more titles. Scroll again to retry.";grid.appendChild(error)}
 }finally{if(req===current.request){current.loading=false;if(current.page==="provider"&&current.pageNo<current.totalPages)observeProviderScroll()}}
}
function observeProviderScroll(){
 if(current.providerObserver){current.providerObserver.disconnect();current.providerObserver=null}
 var sentinel=$("bf-provider-scroll-sentinel");if(!sentinel||!window.IntersectionObserver)return;
 current.providerObserver=new IntersectionObserver(function(entries){
  if(entries.some(function(entry){return entry.isIntersecting})&&!current.loading&&current.pageNo<current.totalPages)loadProviderResults(false);
 },{root:null,rootMargin:"500px 0px 500px 0px",threshold:0});
 current.providerObserver.observe(sentinel);
}
async function renderProvider(s){
 var providers=current.providerData;if(!providers||!providers.length){try{providers=await loadProviders();current.providerData=providers}catch(_){providers=[]}}
 var p=typeof s==="string"?findProvider(s):s;if(!p&&typeof s==="string"){var q=s.replace(/-/g," ");p=providers.find(function(x){return x.provider_name.toLowerCase().indexOf(q)>=0})}
 if(current.page!=="provider")return;
 if(!p){setPanel('<div class="bf-page-inner"><div class="bf-empty">This streaming service is not available for Albania in the current TMDB catalogue.</div></div>');return}
 current.provider=p;current.media="movie";current.pageNo=0;resetFilters();var themes={"netflix":"116, 0, 12","max":"38, 28, 70","disney-plus":"7, 28, 68","prime-video":"5, 42, 78","apple-tv":"18, 20, 26","paramount-plus":"8, 36, 72","hulu":"10, 74, 52","peacock":"34, 22, 70"};doc.body.style.setProperty("--bf-provider-rgb",themes[slug(p)]||"92, 12, 28");setPanel(providerMarkup(p,providers));
 doc.querySelectorAll(".bf-service-chip").forEach(function(b){b.onclick=function(){navigate("provider",b.getAttribute("data-provider"))}});
 doc.querySelectorAll(".bf-provider-tab").forEach(function(b){b.onclick=function(){current.media=b.getAttribute("data-media");doc.querySelectorAll(".bf-provider-tab").forEach(function(t){t.classList.toggle("active",t===b)});current.pageNo=0;resetFilters();["genre","year","sort","rating","votes"].forEach(function(k){var el=$("bf-"+k);if(el)el.value=current.filters[k]||""});setCount(0);loadProviderResults(true)}});
 connectFilters(true);observeProviderScroll();loadProviderResults(true);
}
function readLibrary(){var b=bridge();return b&&b.library?b.library():{profileId:"main",saved:[],progress:{}}}
function watchedKey(){return"flxtv:watched:v1:"+(readLibrary().profileId||"main")}
function readWatched(){try{var a=JSON.parse(localStorage.getItem(watchedKey())||"[]");return Array.isArray(a)?a:[]}catch(_){return[]}}
function writeWatched(a){try{localStorage.setItem(watchedKey(),JSON.stringify(a.slice(0,500)))}catch(_){}}
function markWatched(item){var key=kind(item)+":"+item.id,a=readWatched().filter(function(x){return kind(x)+":"+x.id!==key});a.unshift({id:item.id,media_type:kind(item),title:name(item),name:name(item),poster_path:item.poster_path||"",backdrop_path:item.backdrop_path||"",watchedAt:Date.now(),vote_average:item.vote_average||0});writeWatched(a);var b=bridge();if(b&&b.markWatched)b.markWatched(Object.assign({},item,{media_type:kind(item)}))}
function removeSaved(item){var b=bridge();if(b&&b.removeSaved){b.removeSaved(Object.assign({},item,{media_type:kind(item)}));return}var d=readLibrary(),list=(d.saved||[]).filter(function(x){return !(String(x.id)===String(item.id)&&kind(x)===kind(item))});try{localStorage.setItem("flxtv:my-list:v1:"+(d.profileId||"main"),JSON.stringify(list))}catch(_){}}
function libraryMarkup(){return '<div class="bf-page-inner"><div class="bf-library-head"><div class="bf-library-tabs" role="tablist" aria-label="My Library"><button class="bf-library-tab '+(current.tab==="continue"?"active":"")+'" data-tab="continue" role="tab" aria-selected="'+(current.tab==="continue")+'">Continue <span id="bf-count-continue"></span></button><button class="bf-library-tab '+(current.tab==="saved"?"active":"")+'" data-tab="saved" role="tab" aria-selected="'+(current.tab==="saved")+'">Saved <span id="bf-count-saved"></span></button><button class="bf-library-tab '+(current.tab==="watched"?"active":"")+'" data-tab="watched" role="tab" aria-selected="'+(current.tab==="watched")+'">Watched <span id="bf-count-watched"></span></button></div></div><div class="bf-library-toolbar" id="bf-library-toolbar"></div><div class="bf-grid" id="bf-grid"></div></div>'}
function renderLibrary(tab){current.tab=tab||"continue";if(current.tab!=="saved")current.savedFilter="all";setPanel(libraryMarkup());doc.querySelectorAll("[data-tab]").forEach(function(b){b.onclick=function(){renderLibrary(b.getAttribute("data-tab"))}});populateLibrary()}
function populateLibrary(){
 var grid=$("bf-grid");if(!grid)return;grid.className="bf-grid"+(current.tab==="continue"?" bf-grid-continue":" bf-grid-library");
 var d=readLibrary();
 var progress=Object.values(d.progress||{}).filter(function(x){return x&&x.id&&x.currentTime>0&&(!x.duration||x.currentTime<x.duration*.92)}).sort(function(a,b){return(b.updatedAt||0)-(a.updatedAt||0)}).map(function(x){return{id:x.id,title:x.title,name:x.title,poster_path:x.poster_path,backdrop_path:x.backdrop_path,media_type:x.mediaType||"movie",season:x.season,episode:x.episode,currentTime:x.currentTime,duration:x.duration,updatedAt:x.updatedAt}});
 var saved=(d.saved||[]).slice(),watched=readWatched();
 var counts={continue:progress.length,saved:saved.length,watched:watched.length};
 ["continue","saved","watched"].forEach(function(tab){var node=$("bf-count-"+tab);if(node){node.textContent=counts[tab]?" "+counts[tab]:"";node.hidden=!counts[tab]}});
 var toolbar=$("bf-library-toolbar");if(toolbar){
  toolbar.replaceChildren();
  if(current.tab==="saved"){
   var filters=doc.createElement("div");filters.className="bf-library-filters";
   [["all","All",saved.length],["movie","Movies",saved.filter(function(x){return kind(x)==="movie"}).length],["tv","Shows",saved.filter(function(x){return kind(x)==="tv"}).length]].forEach(function(entry){
    var button=doc.createElement("button");button.type="button";button.className="bf-library-filter"+(current.savedFilter===entry[0]?" active":"");button.textContent=entry[1]+" "+entry[2];button.setAttribute("aria-pressed",String(current.savedFilter===entry[0]));button.onclick=function(){current.savedFilter=entry[0];populateLibrary()};filters.appendChild(button)
   });
   toolbar.appendChild(filters)
  }
  var total=counts[current.tab]||0;
  if(total){
   var clear=doc.createElement("button");clear.type="button";clear.className="bf-library-clear";
   clear.textContent=current.tab==="continue"?"Clear all":current.tab==="saved"?"Clear saved":"Clear history";
   clear.onclick=function(){
    var message=current.tab==="continue"?"Remove all titles from Continue Watching?":current.tab==="saved"?"Remove all saved titles?":"Clear the watched history?";
    if(clear.dataset.confirm!=="yes"){clear.dataset.confirm="yes";clear.classList.add("confirm");clear.textContent="Click again to clear";clear.__resetTimer=window.setTimeout(function(){if(clear.isConnected){clear.dataset.confirm="";clear.classList.remove("confirm");clear.textContent=current.tab==="continue"?"Clear all":current.tab==="saved"?"Clear saved":"Clear history"}},3000);return}
    window.clearTimeout(clear.__resetTimer);var b=bridge();
    if(current.tab==="continue"&&b&&b.clearProgress)b.clearProgress();
    else if(current.tab==="saved"&&b&&b.clearSaved)b.clearSaved();
    else if(current.tab==="watched")writeWatched([]);
    populateLibrary()
   };
   toolbar.appendChild(clear)
  }
 }
 var items=current.tab==="continue"?progress:current.tab==="saved"?saved.filter(function(x){return current.savedFilter==="all"||kind(x)===current.savedFilter}):watched;
 grid.replaceChildren();
 if(!items.length){
  var empty=doc.createElement("div");empty.className="bf-empty";
  empty.textContent=current.tab==="continue"?"Nothing in progress. Start a movie or an episode and it will wait here, right where you stopped.":current.tab==="saved"?(saved.length?"No "+(current.savedFilter==="movie"?"movies":"shows")+" saved yet.":"Start your list. Tap + on any movie or show to save it for later."):"Nothing watched yet. Titles you finish show up here, so you always know what you've seen.";
  grid.appendChild(empty)
 }
 items.forEach(function(item){
  var shell=doc.createElement("div");shell.className="bf-library-card";
  var open=function(){if(current.tab==="continue"){var b=bridge();if(b&&b.openContinueEntry)b.openContinueEntry({id:item.id,mediaType:kind(item),title:name(item),poster_path:item.poster_path||"",backdrop_path:item.backdrop_path||"",currentTime:item.currentTime,duration:item.duration,season:item.season,episode:item.episode});else openTitle(item)}else openTitle(item)};
  shell.appendChild(createPoster(item,open));
  if(current.tab==="continue"){
   var info=doc.createElement("small");info.className="bf-library-progress";
   info.textContent=(item.media_type==="tv"?"S"+(item.season||1)+" · E"+(item.episode||1)+" · ":"")+"Continue watching";
   shell.appendChild(info)
  }
  var actions=doc.createElement("div");actions.className="bf-library-actions";
  if(current.tab==="saved"){
   var seen=doc.createElement("button");seen.textContent="Mark watched";seen.onclick=function(){markWatched(item);removeSaved(item);populateLibrary()};
   var del=doc.createElement("button");del.textContent="Remove";del.onclick=function(){removeSaved(item);populateLibrary()};
   actions.append(seen,del)
  }else if(current.tab==="watched"){
   var undo=doc.createElement("button");undo.textContent="Remove from watched";undo.onclick=function(){writeWatched(readWatched().filter(function(x){return !(String(x.id)===String(item.id)&&kind(x)===kind(item))}));populateLibrary()};actions.appendChild(undo)
  }else{
   var seen2=doc.createElement("button");seen2.textContent="Mark as finished";seen2.onclick=function(){markWatched(item);var b=bridge();if(b&&b.removeProgress)b.removeProgress(item);populateLibrary()};
   var remove=doc.createElement("button");remove.textContent="Remove";remove.onclick=function(){var b=bridge();if(b&&b.removeProgress)b.removeProgress(item);populateLibrary()};
   actions.append(seen2,remove)
  }
  shell.appendChild(actions);grid.appendChild(shell)
 });
}
function renderSearch(q){
 current.query=q||"";setPanel('<div class="bf-page-inner bf-page-search"><div class="bf-page-kicker" style="justify-content:center">DISCOVER FLIXTV</div><h1 class="bf-search-title">Discover something <span>new</span></h1><form class="bf-search-form" id="bf-search-form" role="search"><span class="bf-search-icon">⌕</span><input class="bf-search-input" id="bf-search-input" type="search" value="'+safe(current.query)+'" placeholder="Search movies and TV shows…" autocomplete="off"><button class="bf-search-clear" id="bf-search-clear" type="button" aria-label="Clear search">×</button></form><div class="section-heading"><h2 id="bf-search-heading">'+(current.query?"Search results":"Trending Today")+'</h2><span class="bf-result-count" id="bf-result-count"></span></div><div class="bf-grid" id="bf-grid"><div class="bf-loading">Loading…</div></div></div>');
 var form=$("bf-search-form"),input=$("bf-search-input");
 form.addEventListener("submit",function(e){e.preventDefault();current.query=input.value.trim();navigate("search",null,current.query,true);input.blur()});
 input.addEventListener("input",function(){current.query=input.value.trim();clearTimeout(current.searchTimer);current.searchTimer=setTimeout(function(){var target=routeUrl("search")+(current.query?"?q="+encodeURIComponent(current.query):"");history.replaceState({flixView:{page:"home",sports:false,search:false,scrollY:0},bfRoute:{page:"search"}},"",target);searchResults(current.query)},350)});
 $("bf-search-clear").onclick=function(){input.value="";current.query="";searchResults("");input.focus()};
 searchResults(current.query)
}
async function searchResults(q){
 var req=++current.request,g=$("bf-grid");if(!g)return;var h=$("bf-search-heading");if(h)h.textContent=q?"Search results":"Trending Today";g.innerHTML='<div class="bf-loading">Loading…</div>';
 try{var d=await tmdb(q?"/search/multi?query="+encodeURIComponent(q)+"&include_adult=false":"/trending/all/day");if(req!==current.request)return;var a=(d.results||[]).filter(function(x){return x.poster_path&&(x.media_type==="movie"||x.media_type==="tv"||x.title||x.name)}).map(function(x){return Object.assign({},x,{media_type:x.media_type||kind(x)})});renderGrid(g,a);setCount(d.total_results||a.length)}
 catch(e){g.innerHTML='<div class="bf-empty">'+safe(e.message)+'</div>'}
}
function renderSports(){showOnly("sports");navActive("sports");scrollTop()}
function render(page,provider,query){
 current.page=page||"home";showOnly(current.page);scrollTop();
 if(page==="home"){ensurePanel().hidden=true;return}
 if(page==="sports"){renderSports();return}
 if(page==="movies"){if(bridge()&&bridge().ensureHeroCarousel)bridge().ensureHeroCarousel();renderBrowse(page,query);return}if(page==="shows"){renderBrowse(page,query);return}
 if(page==="library"){renderLibrary(current.tab||"continue");return}
 if(page==="search"){renderSearch(query!=null?query:current.query);return}
 if(page==="provider"){renderProvider(provider);return}
}
function installHeader(){
 var nav=doc.querySelector(".desktop-nav"),actions=doc.querySelector(".top-actions");
 if(nav){
  nav.innerHTML='<span class="nav-pill" aria-hidden="true"></span><button class="nav-link" data-bf-page="home">Home</button><button class="nav-link" data-bf-page="movies">Movies</button><button class="nav-link" data-bf-page="shows">Shows</button><button class="nav-link" data-bf-page="sports">Sports</button><button class="nav-link" data-bf-page="library">My List</button>';
  var controls=doc.querySelector(".header-controls");
  if(!controls){controls=doc.createElement("div");controls.className="header-controls";nav.parentNode.insertBefore(controls,nav)}
  controls.appendChild(nav);
  if(actions)controls.appendChild(actions);
  nav.addEventListener("click",function(e){var b=e.target.closest("[data-bf-page]");if(b)navigate(b.getAttribute("data-bf-page"))});
 }
 var mobile=doc.querySelector(".mobile-nav");
 if(mobile){mobile.innerHTML='<button data-bf-page="home" class="active"><span class="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z"/></svg></span><span class="nav-label">Home</span></button><button data-bf-page="movies"><span class="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M4 5h16v14H4zM4 9h16M8 5l2 4m4-4 2 4"/></svg></span><span class="nav-label">Movies</span></button><button data-bf-page="shows"><span class="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="3" y="7" width="18" height="14" rx="2"/><path d="m7 2 5 5 5-5"/></svg></span><span class="nav-label">Shows</span></button><button data-bf-page="library"><span class="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v19H7.5A2.5 2.5 0 0 1 5 18.5zM5 5h15M9 8v9"/></svg></span><span class="nav-label">My List</span></button>';mobile.addEventListener("click",function(e){var b=e.target.closest("[data-bf-page]");if(b)navigate(b.getAttribute("data-bf-page"))})}
 var search=$("search-trigger");if(search)search.addEventListener("click",function(e){e.preventDefault();navigate("search",null,"")});
 var input=$("search");if(input){input.setAttribute("placeholder","Search movies and TV shows");input.addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault();navigate("search",null,input.value.trim())}})}
 var brand=doc.querySelector(".brand");if(brand)brand.addEventListener("click",function(e){e.preventDefault();navigate("home")})
}
function sectionOf(id){var n=$(id);return n?n.closest(".content-section"):null}
function reorderHome(){
 var home=$("home-page");if(!home)return;
 var services=$("browse-services-section"),top10=$("top10-section"),cont=$("continue-watching-section"),trending=sectionOf("trending-movies"),tvTrending=sectionOf("home-trending-shows"),topMovies=sectionOf("home-top-movies"),popularMovies=sectionOf("movies"),popularShows=sectionOf("shows");
 var wide=$("bf-popular-week");if(!wide){wide=doc.createElement("section");wide.className="content-section";wide.id="bf-popular-week";wide.innerHTML='<div class="section-heading"><h2>Popular this week</h2><span class="section-kicker">WEEKLY TRENDING</span></div><div class="bf-wide-row" id="bf-wide-row"><div class="bf-loading">Loading…</div></div>'}
 var topTv=$("bf-top-rated-tv");if(!topTv){topTv=doc.createElement("section");topTv.className="content-section";topTv.id="bf-top-rated-tv";topTv.innerHTML='<div class="section-heading"><h2>Top Rated TV Shows</h2></div><div class="poster-row" id="bf-top-rated-tv-row"></div>'}
 var order=[cont,services,top10,trending,tvTrending,wide,topMovies,topTv,popularMovies,popularShows];
 order.forEach(function(n){if(n){n.hidden=false;home.appendChild(n)}});
 [[services,"Browse by Service"],[top10,"Top 10 Today"],[trending,"Trending Movies"],[tvTrending,"Trending Series"],[topMovies,"Top Rated Movies"],[topTv,"Top Rated Series"],[popularMovies,"Popular Movies"],[popularShows,"Popular Series"]].forEach(function(pair){if(pair[0]){var h=pair[0].querySelector("h2");if(h)h.textContent=pair[1]}});
 [[trending,"movies",""],[tvTrending,"shows",""],[topMovies,"movies","vote_average.desc"],[topTv,"shows","vote_average.desc"]].forEach(function(row){if(!row[0])return;var h=row[0].querySelector(".section-heading h2");if(!h)return;var label=h.textContent,button=doc.createElement("button");button.type="button";button.className="bf-heading-link";button.innerHTML="<span>"+safe(label)+"</span><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m9 18 6-6-6-6\"/></svg>";button.onclick=function(){navigateBrowse(row[1],row[2])};h.replaceChildren(button)});
 Array.from(home.querySelectorAll(".content-section")).forEach(function(s){if(order.indexOf(s)<0)s.hidden=true})
}
async function loadHomeExtras(){
 try{var a=await Promise.all([tmdb("/trending/all/week"),tmdb("/tv/top_rated")]);var wide=$("bf-wide-row"),tv=$("bf-top-rated-tv-row");
  if(wide){wide.replaceChildren();(a[0].results||[]).filter(function(x){return x.backdrop_path}).slice(0,15).forEach(function(x){wide.appendChild(createWide(x))})}
  if(tv){tv.replaceChildren();(a[1].results||[]).filter(function(x){return x.poster_path}).slice(0,20).forEach(function(x){var item=Object.assign({},x,{media_type:"tv"});tv.appendChild(typeof window.FLIXTV_HOME_CARD==="function"?window.FLIXTV_HOME_CARD(item):createPoster(item))})}
 }catch(e){console.warn("[FLIXTV] Added home rows unavailable",e)}
 try{renderHomeServices(await loadProviders())}catch(e){console.warn("[FLIXTV] Provider list unavailable",e)}
}
function shader(){
 var c=doc.createElement("canvas");c.className="bf-fluid-canvas";c.setAttribute("aria-hidden","true");doc.body.appendChild(c);
 var fallback=doc.createElement("div");fallback.className="bf-motion-fallback";fallback.setAttribute("aria-hidden","true");doc.body.appendChild(fallback);
 if(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;
 var gl=c.getContext("webgl",{alpha:true,antialias:false,powerPreference:"low-power"});if(!gl)return;
 var vs="attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
 var fs="precision mediump float;uniform vec2 r;uniform float t;float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}float fb(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p*=2.02;a*=.5;}return v;}void main(){vec2 q=gl_FragCoord.xy/r,p=(q-.5)*vec2(r.x/r.y,1.);float tm=t*.055;vec2 w=vec2(fb(p*1.6+vec2(tm,0.)),fb(p*1.7+vec2(0.,-tm)));vec2 d=p+(w-.5)*1.5;float f=fb(d*2.2+vec2(-tm*.6,tm*.4)),g=fb(d*1.3+vec2(1.7,-tm*.3));vec3 col=mix(vec3(.075,.095,.045),vec3(.31,.22,.085),smoothstep(.28,.78,f));col=mix(col,vec3(.24,.245,.13),smoothstep(.36,.82,g)*.42);gl_FragColor=vec4(col,.46);}";
 function compile(type,src){var s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){gl.deleteShader(s);return null}return s}
 var a=compile(gl.VERTEX_SHADER,vs),b=compile(gl.FRAGMENT_SHADER,fs);if(!a||!b){c.style.display="none";return}
 var pr=gl.createProgram();gl.attachShader(pr,a);gl.attachShader(pr,b);gl.linkProgram(pr);if(!gl.getProgramParameter(pr,gl.LINK_STATUS)){c.style.display="none";return}fallback.style.display="none";
 gl.useProgram(pr);var buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
 var pos=gl.getAttribLocation(pr,"p");gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
 var rr=gl.getUniformLocation(pr,"r"),tt=gl.getUniformLocation(pr,"t"),start=performance.now(),raf=0,timer=0;
 function resize(){var dpr=Math.min(devicePixelRatio||1,1.3),w=Math.max(1,Math.floor(innerWidth*dpr)),h=Math.max(1,Math.floor(innerHeight*dpr));if(c.width!==w||c.height!==h){c.width=w;c.height=h;gl.viewport(0,0,w,h)}}
 function stop(){if(timer)clearTimeout(timer);timer=0;if(raf)cancelAnimationFrame(raf);raf=0}
 var playerLayer=$("player-modal"),scrollResumeTimer=0,scrolling=false;
 function shouldRun(){return !doc.hidden&&!scrolling&&c.isConnected&&doc.body&&!doc.body.classList.contains("bf-provider-route")&&!doc.body.classList.contains("bf-movies-route")&&!doc.body.classList.contains("bf-shows-route")&&!(playerLayer&&playerLayer.classList.contains("open"))}
 function schedule(){if(!shouldRun()||timer||raf)return;timer=window.setTimeout(function(){timer=0;if(shouldRun())raf=requestAnimationFrame(draw)},16)}
 function sync(){if(shouldRun())schedule();else stop()}
 function draw(now){raf=0;if(!shouldRun())return;resize();gl.uniform2f(rr,c.width,c.height);gl.uniform1f(tt,(now-start)/1000);gl.drawArrays(gl.TRIANGLES,0,6);schedule()}
 function pauseDuringScroll(){scrolling=true;stop();clearTimeout(scrollResumeTimer);scrollResumeTimer=window.setTimeout(function(){scrolling=false;sync()},180)}
 resize();sync();
 window.addEventListener("scroll",pauseDuringScroll,{passive:true});
 doc.addEventListener("visibilitychange",sync);
 if(window.MutationObserver&&doc.body){var routeObserver=new MutationObserver(sync);routeObserver.observe(doc.body,{attributes:true,attributeFilter:["class"]});if(playerLayer)routeObserver.observe(playerLayer,{attributes:true,attributeFilter:["class"]})}
 c.addEventListener("webglcontextlost",function(e){e.preventDefault();stop();c.style.display="none"});
 c.addEventListener("webglcontextrestored",function(){c.style.display="block";sync()});
}
function install(){
 doc.body.classList.add("bf-reference-mode");ensurePanel().hidden=true;installHeader();reorderHome();shader();
 var intent=window.__FLIXTV_ROUTE_INTENT,params=new URLSearchParams(location.search);
 if(intent){current.query=intent.query||"";var initialSort=intent.sortBy||"",initialUrl=routeUrl(intent.page,intent.provider)+(intent.page==="search"&&current.query?"?q="+encodeURIComponent(current.query):initialSort?"?sortBy="+encodeURIComponent(initialSort):"");history.replaceState({flixView:{page:"home",sports:false,search:false,scrollY:0},bfRoute:intent},"",initialUrl);render(intent.page,intent.provider,intent.sortBy||intent.query)}
 else if(location.pathname==="/sports")render("sports");
 else if(location.pathname.indexOf("/browse/provider/")===0)render("provider",location.pathname.split("/").pop());
 else if(location.pathname==="/browse/movies")render("movies");
 else if(location.pathname==="/browse/tv")render("shows");
 else if(location.pathname==="/library")render("library");
 else if(location.pathname==="/search")render("search",null,params.get("q")||"");
 else render("home");
 if(!intent&&location.pathname==="/")loadHomeExtras();
 window.addEventListener("popstate",function(){
  var p=location.pathname,qs=new URLSearchParams(location.search);
  if(p==="/browse/movies")render("movies");
  else if(p==="/browse/tv")render("shows");
  else if(p==="/library")render("library");
  else if(p==="/search")render("search",null,qs.get("q")||"");
  else if(p.indexOf("/browse/provider/")===0)render("provider",p.split("/").pop());
  else if(p==="/sports")render("sports");
  else{render("home");loadHomeExtras()}
 });
 window.addEventListener("flxtv:playback-completed",function(e){if(e.detail&&e.detail.item)markWatched(e.detail.item)});
}
if(doc.readyState==="loading")doc.addEventListener("DOMContentLoaded",install);else install();
})();
