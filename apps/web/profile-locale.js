(function(){
"use strict";
const PROFILE_KEY="flxtv:profiles:v1",ACTIVE_KEY="flxtv:active-profile:v1";
const sq={
 "Home":"Kryefaqja","Movies":"Filma","Shows":"Seriale","Sports":"Sport","My List":"Lista ime",
 "Search":"Kërko","Search movies and TV shows":"Kërko filma dhe seriale","Search movies and TV shows…":"Kërko filma dhe seriale…",
 "Settings":"Cilësimet","Discover FLIXTV":"ZBULO FLIXTV","Discover something":"Zbulo diçka","new":"të re",
 "Search results":"Rezultatet e kërkimit","Trending Today":"Në trend sot","Browse by Service":"Shfleto sipas shërbimit",
 "STREAMING PLATFORMS":"PLATFORMA STREAMING","Top 10 Today":"10 më të kërkuarit sot","DAILY CHART":"RENDITJA DITORE",
 "Continue Watching":"Vazhdo shikimin","Edit":"Redakto","Done":"Përfundo","Trending Movies":"Filma në trend",
 "Trending Series":"Seriale në trend","Top Rated Movies":"Filmat më të vlerësuar","Top Rated Series":"Serialet më të vlerësuara",
 "Popular Movies":"Filma të njohur","Popular Series":"Seriale të njohura","Popular this week":"Të njohura këtë javë",
 "WEEKLY TRENDING":"TRENDI JAVOR","Top Rated TV Shows":"Serialet më të vlerësuara","Loading…":"Po ngarkohet…",
 "Loading...":"Po ngarkohet...","No titles found. Try changing the filters.":"Nuk u gjetën tituj. Provo të ndryshosh filtrat.",
 "Mark as finished":"Shëno si të përfunduar","Remove":"Hiq","Remove from watched":"Hiq nga të shikuarit",
 "Discover something new":"Zbulo diçka të re","Movies and TV shows":"Filma dhe seriale","Add Profile":"Shto profil",
 "MANAGE PROFILES":"MENAXHO PROFILET","Who's watching?":"Kush po shikon?","Profile":"Profili",
 "Play":"Luaj","Read more":"Lexo më shumë","Read less":"Lexo më pak","Browse by genre":"Shfleto sipas zhanrit",
 "Choose a genre":"Zgjidh një zhanër","All":"Të gjitha","Watch now":"Shiko tani","No results":"Nuk ka rezultate",
 "Popular":"Të njohura","Movie":"Film","TV Series":"Serial","TV Shows":"Seriale","Back":"Kthehu","Close":"Mbyll",
 "Save":"Ruaj","Cancel":"Anulo","Continue":"Vazhdo","Create":"Krijo","Profile name":"Emri i profilit",
 "PROFILE LANGUAGE":"GJUHA E PROFILIT","Choose profile language":"Zgjidh gjuhën e profilit",
 "Albanian interface and subtitles":"Ndërfaqe dhe titra shqip","English interface and subtitles":"Ndërfaqe dhe titra anglisht",
 "CREATE PROFILE":"KRIJO PROFILIN","CANCEL":"ANULO","BACK":"KTHEHU","CONTINUE":"VAZHDO",
 "Featured":"Të përzgjedhura","FEATURED":"TË PËRZGJEDHUR","Today's top 10 trending films":"10 filmat më në trend sot",
 "Based on TMDB daily trends":"Sipas trendit ditor të TMDB","Loading services…":"Po ngarkohen shërbimet…",
 "Today's chart is unavailable.":"Renditja e sotme nuk është e disponueshme.","Show all watch history":"Shfaq gjithë historikun e shikimit",
 "Action & Adventure":"Aksion dhe aventurë","Comedy & Romance":"Komedi dhe romancë","Crime & Thriller":"Krim dhe thriller",
 "Science Fiction & Fantasy":"Fantashkencë dhe fantazi","Now playing":"Në kinema","Coming soon":"Së shpejti",
 "Trending":"Në trend","Top rated":"Më të vlerësuar","Choose a genre":"Zgjidh një zhanër",
 "Search movies and TV shows…":"Kërko filma dhe seriale…","No subtitles loaded":"Pa titra të ngarkuar",
 "Load subtitles (.srt/.vtt)":"Ngarko titra (.srt/.vtt)","Delay subtitles":"Vono titrat","Advance subtitles":"Përshpejto titrat",
 "Loading…":"Po ngarkohet…","Settings":"Cilësimet","My List":"Lista ime","Continue watching":"Vazhdo shikimin",
 "Popular this week":"Të njohura këtë javë","Top Rated TV Shows":"Serialet më të vlerësuara",
 "TITLE":"TITULLI","Auto":"Automatik","Trailer":"Traileri","Crime & Drama Series":"Krim dhe dramë",
 "Mystery & Thriller Series":"Mister dhe thriller","Action & Adventure Series":"Aksion dhe aventurë",
 "Sci-Fi & Fantasy Series":"Fantashkencë dhe fantazi","Comedy & Romance Series":"Komedi dhe romancë",
 "On the air":"Në transmetim","Today":"Sot","Currently airing":"Në transmetim aktualisht","On TV today":"Sot në televizion",
 "Live matches and sports events.":"Ndeshje live dhe evente sportive.",
 "No saved content to continue.":"Nuk ka përmbajtje të ruajtur për vazhdim.",
 "▶ Play":"▶ Luaj","▶ Play episode":"▶ Luaj episodin","Searching for video source…":"Po kërkohet burimi i videos…",
 "FLIXTV · CONTENT DETAILS":"FLIXTV · INFORMACION I PËRMBAJTJES","SKIP":"KALO",
 "MOVIE PICKS":"ZGJEDHJE FILMASH","SERIES PICKS":"ZGJEDHJE SERIALESH","TOP RATED":"MË TË VLERËSUARIT",
 "IN THE SPOTLIGHT":"NË VËMENDJE","THE BIG SCREEN":"EKRANI I MADH","COLLECTION":"KOLEKSION",
 "Action":"Aksion","Adventure":"Aventurë","Animation":"Animacion","Comedy":"Komedi","Crime":"Krim",
 "Documentary":"Dokumentar","Drama":"Dramë","Family":"Familjar","Fantasy":"Fantazi","History":"Histori",
 "Music":"Muzikë","Mystery":"Mister","Romance":"Romancë","Sci-Fi":"Fantashkencë","War":"Luftë",
 "Created by:":"Krijuar nga:","Director:":"Regjisor:","Description unavailable.":"Përshkrimi nuk është i disponueshëm.","Read more":"Lexo më shumë","Read less":"Lexo më pak","Runtime":"Kohëzgjatja","Language":"Gjuha","Release Date":"Data e publikimit","Status":"Statusi","First Aired":"Transmetuar për herë të parë","Last Aired":"Transmetuar për herë të fundit","Seasons":"Sezone","Episodes":"Episode","Cast":"Aktorët","Trailers":"Trajlerët","Trailer":"Trajleri","You Might Also Like":"Mund të të pëlqejnë edhe","Loading recommendations…":"Po ngarkohen rekomandimet…","Loading episodes…":"Po ngarkohen episodet…","Loading trailer…":"Po ngarkohet trajleri…","Loading trailers…":"Po ngarkohen trajlerët…","Mark all episodes as watched":"Shëno të gjitha episodet si të shikuara","Add to My List":"Shto te Lista ime","Watch trailer":"Shiko trajlerin","Choose season":"Zgjidh sezonin","Season":"Sezoni","episodes":"episode","Returning Series":"Në transmetim","Ended":"Përfunduar","Canceled":"Anuluar","In Production":"Në prodhim","Planned":"Planifikuar","Released":"Publikuar","Post Production":"Pas prodhimit","Rumored":"Përfolur","Movie details":"Detajet e filmit","Series details":"Detajet e serialit","No subtitles loaded":"Nuk ka titra të ngarkuar","Loading subtitles…":"Po ngarkohen titrat…","No subtitles found":"Nuk u gjetën titra","Subtitles":"Titra",
};
const en={
 "Kryefaqja":"Home","Filma":"Movies","Seriale":"Shows","Sport":"Sports","Lista ime":"My List",
 "Kërko":"Search","Kërko filma dhe seriale":"Search movies and TV shows","Kërko filma dhe seriale…":"Search movies and TV shows…",
 "Cilësimet":"Settings","ZBULO FLIXTV":"DISCOVER FLIXTV","Zbulo diçka":"Discover something","të re":"new",
 "Rezultatet e kërkimit":"Search results","Në trend sot":"Trending Today","Shfleto sipas shërbimit":"Browse by Service",
 "PLATFORMA STREAMING":"STREAMING PLATFORMS","10 më të kërkuarit sot":"Top 10 Today","RENDITJA DITORE":"DAILY CHART",
 "Vazhdo shikimin":"Continue Watching","Redakto":"Edit","Përfundo":"Done","Filma në trend":"Trending Movies",
 "Seriale në trend":"Trending Series","Filmat më të vlerësuar":"Top Rated Movies","Serialet më të vlerësuara":"Top Rated Series",
 "Filma të njohur":"Popular Movies","Seriale të njohura":"Popular Series","Të njohura këtë javë":"Popular this week",
 "TRENDI JAVOR":"WEEKLY TRENDING","Po ngarkohet…":"Loading…","Po ngarkohet...":"Loading...",
 "Nuk u gjetën tituj. Provo të ndryshosh filtrat.":"No titles found. Try changing the filters.",
 "Shëno si të përfunduar":"Mark as finished","Hiq":"Remove","Hiq nga të shikuarit":"Remove from watched",
 "Shto profil":"Add Profile","MENAXHO PROFILET":"MANAGE PROFILES","Kush po shikon?":"Who's watching?",
 "Luaj":"Play","Lexo më shumë":"Read more","Lexo më pak":"Read less","Shfleto sipas zhanrit":"Browse by genre",
 "Zgjidh një zhanër":"Choose a genre","Të gjitha":"All","Shiko tani":"Watch now","Nuk ka rezultate":"No results",
 "Të njohura":"Popular","Film":"Movie","Serial":"TV Series","Kthehu":"Back","Mbyll":"Close","Ruaj":"Save",
 "Anulo":"Cancel","Vazhdo":"Continue","Krijo":"Create","Emri i profilit":"Profile name",
 "GJUHA E PROFILIT":"PROFILE LANGUAGE","Zgjidh gjuhën e profilit":"Choose profile language",
 "Ndërfaqe dhe titra shqip":"Albanian interface and subtitles","Ndërfaqe dhe titra anglisht":"English interface and subtitles",
 "KRIJO PROFILIN":"CREATE PROFILE","ANULO":"CANCEL","KTHEHU":"BACK","VAZHDO":"CONTINUE",
 "TË PËRZGJEDHUR":"FEATURED","10 filmat më në trend sot":"Today's top 10 trending films",
 "Sipas trendit ditor të TMDB":"Based on TMDB daily trends","Po ngarkohen shërbimet…":"Loading services…",
 "Shfaq gjithë historikun e shikimit":"Show all watch history","Aksion dhe aventurë":"Action & Adventure",
 "Komedi dhe romancë":"Comedy & Romance","Krim dhe thriller":"Crime & Thriller","Fantashkencë dhe fantazi":"Science Fiction & Fantasy",
 "Në kinema":"Now playing","Së shpejti":"Coming soon","Në trend":"Trending","Më të vlerësuar":"Top rated",
 "Pa titra të ngarkuar":"No subtitles loaded","Ngarko titra (.srt/.vtt)":"Load subtitles (.srt/.vtt)",
 "Vono titrat":"Delay subtitles","Përshpejto titrat":"Advance subtitles",
 "Të përzgjedhura":"Featured","EKRANI I MADH":"THE BIG SCREEN","KOLEKSION":"COLLECTION",
 "Zgjedhje filmash":"MOVIE PICKS","Zgjedhje serialesh":"SERIES PICKS","Në vëmendje":"IN THE SPOTLIGHT",
 "Filma dhe seriale, të gjitha në një vend.":"Movies and series, all in one place.",
 "Të njohur":"Popular","Filma të njohur":"Popular movies","Seriale të njohura":"Popular series",
 "DONE":"U KRYE","Season":"Sezoni","Episode":"Episodi","Movie details":"Detajet e filmit",
 "Series details":"Detajet e serialit","Subtitles":"Titra","Loading subtitles…":"Po ngarkohen titrat…",
 "No subtitles found":"Nuk u gjetën titra","Zbulo diçka të veçantë.":"Zbulo diçka të veçantë.",
 "U KRYE":"DONE","Sezoni":"Season","Episodi":"Episode","Detajet e filmit":"Movie details",
 "Detajet e serialit":"Series details","Titra":"Subtitles","Po ngarkohen titrat…":"Loading subtitles…",
 "Nuk u gjetën titra":"No subtitles found","Zbulo diçka të veçantë.":"Discover something special.",
 "Filma dhe seriale, të gjitha në një vend.":"Movies and series, all in one place.",
 "Zbulo diçka të veçantë.":"Discover something special.",
 "ZGJEDHJE FILMASH":"MOVIE PICKS","ZGJEDHJE SERIALESH":"SERIES PICKS","MË TË VLERËSUARIT":"TOP RATED",
 "Aksion dhe aventurë":"Action & Adventure","Komedi dhe romancë":"Comedy & Romance",
 "Krim dhe thriller":"Crime & Thriller","Fantashkencë dhe fantazi":"Science Fiction & Fantasy",
 "NË VËMENDJE":"IN THE SPOTLIGHT","Seriale aksion dhe fantazi":"Action & Fantasy Series",
 "Në trend":"Trending","Të njohur":"Popular","Më të vlerësuar":"Top rated",
 "Shfleto sipas zhanrit":"Browse by genre","Zgjidh një zhanër":"Choose a genre",
 "Aksion":"Action","Aventurë":"Adventure","Animacion":"Animation","Komedi":"Comedy","Krim":"Crime",
 "Dokumentar":"Documentary","Dramë":"Drama","Familjar":"Family","Fantazi":"Fantasy","Histori":"History",
 "Muzikë":"Music","Mister":"Mystery","Romancë":"Romance","Fantashkencë":"Sci-Fi","Luftë":"War",
 "SERIALE DHE HISTORI":"SERIES & STORIES","Në transmetim":"On the air","Sot":"Today",
 "Në transmetim aktualisht":"Currently airing","Sot në televizion":"On TV today",
 "Aksion dhe aventurë Series":"Action & Adventure Series","Fantashkencë dhe fantazi Series":"Sci-Fi & Fantasy Series",
 "Komedi dhe romancë Series":"Comedy & Romance Series","Ndeshje live dhe evente sportive.":"Live matches and sports events.",
 "Nuk ka përmbajtje të ruajtur për vazhdim.":"No saved content to continue.",
 "▶ Luaj":"▶ Play","Traileri":"Trailer","Sezoni":"Season","Episodi":"Episode","▶ Luaj episodin":"▶ Play episode",
 "Po kërkohet burimi i videos…":"Searching for video source…","FLIXTV · INFORMACION I PËRMBAJTJES":"FLIXTV · CONTENT DETAILS",
 "KALO":"SKIP","Pa titra të ngarkuar":"No subtitles loaded","TITULLI":"TITLE","Automatik":"Auto",
 "Po ngarkohet renditja ditore…":"Loading today's chart…","PËRZGJEDHJE FILMASH":"MOVIE PICKS",
 "FLIXTV / KOLEKSION":"FLIXTV / COLLECTION","Profili aktiv":"Active profile","MENAXHO PROFILET":"MANAGE PROFILES",
 "Vlerësimi":"Rating","Nuk u ngarkuan titujt e tjerë.":"More titles could not be loaded.",
 "Shfleto për më shumë":"Browse for more","Nuk u ruajt në këtë pajisje.":"Not saved on this device.",
 "Ky titull nuk ka fotografi horizontale për Hero.":"This title has no landscape artwork for the hero.",
 "Fotografia e Hero nuk u ngarkua. Po ruaj titullin aktual për të shmangur mospërputhjen.":"Hero artwork failed to load. Keeping the current title to avoid a mismatch.",
 "Po përgatitet përshkrimi…":"Preparing description…","Përparimi i shikimit":"Watch progress",
 "Përfundo redaktimin":"Finish editing","CineSRC raportoi një gabim gjatë riprodhimit.":"CineSRC reported a playback error.",
 "Nuk mund të lidhemi me CineSRC.":"Unable to connect to CineSRC.",
 "Nuk u ruajtën profilet në këtë pajisje.":"Profiles could not be saved on this device.",
 "Duhet të mbetet të paktën një profil.":"At least one profile must remain.",
 "Shkruaj emrin e ri për":"Enter a new name for",". Për ta fshirë, shkruaj DELETE.":". To delete, type DELETE.",
 "Renditja ditore nuk është e disponueshme.":"Today's chart is unavailable.",
 "Katalogu nuk ktheu tituj të përzgjedhur.":"The catalog returned no featured titles.",
 "Aktivizo zërin":"Enable sound","Çaktivizo zërin":"Mute",
 "Nuk u përditësua lista e episodeve: ":"Episode list could not be updated: ",
 "Më pak":"Less","Më shumë":"More","Shfaq përshkrimin e plotë":"Show full description",
 "Po kërkohet M3U8…":"Searching for M3U8…","Resolver-i në Vercel nuk arriti të gjejë M3U8.":"The Vercel resolver could not find an M3U8 stream.",
 "Resolver-i nuk ktheu adresën M3U8.":"The resolver returned no M3U8 URL.",
 "Kërkesa për M3U8 dështoi.":"M3U8 request failed.","Kthehu në FLIXTV":"Back to FLIXTV",
 "Për të gjitha moshat":"All ages","Për fëmijë":"Kids","Për fëmijë mbi 7 vjeç":"Kids 7+",
 "Nën mbikëqyrjen e prindërve":"Parental guidance",
 "Videoja është gati. Shtyp PLAY në kontrollet e videos.":"Video is ready. Press PLAY in the video controls.",
 "Videoja nuk mundi të niste. Kontrollo burimin ose rrjetin.":"Video could not start. Check the source or network.",
 "Elementi video mungon në FLIXTV.":"The video element is missing in FLIXTV.",
 "Kërkesa HLS dështoi. Mund të jetë problem rrjeti, CORS ose burimi.":"HLS request failed. This may be a network, CORS or source issue.",
 "HLS dështoi:":"HLS failed:","Po hapet M3U8 direkt në player…":"Opening M3U8 directly in the player…",
 "Kjo pajisje nuk mbështet HLS përmes HLS.js ose videos HTML5.":"This device does not support HLS through HLS.js or HTML5 video.",
 "CineSRC iframe mungon në player-in FLIXTV.":"CineSRC iframe is missing from the FLIXTV player.",
 "Skedari i titrave është shumë i madh (maksimumi 5 MB).":"Subtitle file is too large (5 MB maximum).",
 "Nuk u gjetën titra të vlefshëm. Përdor formatin SRT ose VTT.":"No valid subtitles found. Use SRT or VTT.",
 "Titra aktivë ·":"Subtitles active ·","Po kërkohen titrat shqip…":"Searching for Albanian subtitles…",
 "OpenSubtitles nuk u përgjigj.":"OpenSubtitles did not respond.",
 "Nuk u gjetën titra shqip për këtë titull.":"No Albanian subtitles were found for this title.",
 "Shkarkimi i titrave dështoi.":"Subtitle download failed.",
 "Skedari i titrave nuk përmban SRT/VTT të lexueshëm.":"Subtitle file contains no readable SRT/VTT.",
 "Po ngarkohen më shumë filma...":"Loading more movies...","Vazhdon në:":"Continues in:",
 "orë e":"hr and","orë":"hr",
 "Nuk ka evente në këtë kategori për momentin.":"No events in this category right now.",
 "Po kërkohen burimet…":"Searching for sources…","Zgjidh një burim më poshtë":"Choose a source below",
 "Ky burim nuk ka adresë të luajtshme.":"This source has no playable URL.",
 "Adresa e burimit është e pavlefshme.":"The source URL is invalid.",
 "Ky burim nuk mund të luhet në këtë pajisje. Provo një burim tjetër.":"This source cannot play on this device. Try another source.",
 "Manifest u hap, por nuk përmban katalogë sportivë.":"Manifest opened, but contains no sports catalogs.",
 "Lidhja dështoi":"Connection failed",
 "DaddyLive mbetet i disponueshëm te kategoritë më sipër.":"DaddyLive remains available in the categories above.",
 "Krijuar nga:":"Created by:","Regjisor:":"Director:","Përshkrimi nuk është i disponueshëm.":"Description unavailable.","Lexo më shumë":"Read more","Lexo më pak":"Read less","Kohëzgjatja":"Runtime","Gjuha":"Language","Data e publikimit":"Release Date","Statusi":"Status","Transmetuar për herë të parë":"First Aired","Transmetuar për herë të fundit":"Last Aired","Sezone":"Seasons","Aktorët":"Cast","Trajlerët":"Trailers","Trajleri":"Trailer","Mund të të pëlqejnë edhe":"You Might Also Like","Po ngarkohen rekomandimet…":"Loading recommendations…","Po ngarkohen episodet…":"Loading episodes…","Po ngarkohet trajleri…":"Loading trailer…","Po ngarkohen trajlerët…":"Loading trailers…","Shëno të gjitha episodet si të shikuara":"Mark all episodes as watched","Shto te Lista ime":"Add to My List","Shiko trajlerin":"Watch trailer","Zgjidh sezonin":"Choose season","Sezoni":"Season","episode":"episodes","Në transmetim":"Returning Series","Përfunduar":"Ended","Anuluar":"Canceled","Në prodhim":"In Production","Planifikuar":"Planned","Publikuar":"Released","Pas prodhimit":"Post Production","Përfolur":"Rumored","Detajet e filmit":"Movie details","Detajet e serialit":"Series details","Nuk ka titra të ngarkuar":"No subtitles loaded","Po ngarkohen titrat…":"Loading subtitles…","Nuk u gjetën titra":"No subtitles found","Titra":"Subtitles",
};
const textSources=new WeakMap(),textLast=new WeakMap(),attributeSources=new WeakMap(),attributeLast=new WeakMap();
let language="sq",scheduled=false;
const pendingAdded=new Set(),pendingTextNodes=new Set(),pendingAttributes=new Set();
function getLanguage(){
 try{
  const profiles=JSON.parse(localStorage.getItem(PROFILE_KEY)||"[]");
  const id=localStorage.getItem(ACTIVE_KEY)||"";
  const profile=Array.isArray(profiles)?profiles.find(item=>item&&item.id===id):null;
  return profile?.language==="en"?"en":"sq";
 }catch(_){return "sq"}
}
function translate(value,target){
 const dictionary=target==="en"?en:sq;
 const trimmed=String(value??"");
 const lead=(trimmed.match(/^\s*/)||[""])[0],trail=(trimmed.match(/\s*$/)||[""])[0];
 const core=trimmed.slice(lead.length,trimmed.length-trail.length);
 if(Object.prototype.hasOwnProperty.call(dictionary,core))return lead+dictionary[core]+trail;
 if(target!=="en"){
  let match=core.match(/^Play S(\d+) E(\d+)$/);if(match)return lead+"Luaj sezonin "+match[1]+" episodin "+match[2]+trail;
  match=core.match(/^Resume S(\d+) E(\d+)$/);if(match)return lead+"Vazhdo sezonin "+match[1]+" episodin "+match[2]+trail;
  match=core.match(/^Season (\d+)$/);if(match)return lead+"Sezoni "+match[1]+trail;
  match=core.match(/^(\d+) episodes?$/i);if(match)return lead+match[1]+" episode"+trail;
 }
 return trimmed;
}
function skip(node){
 const parent=node&&node.parentElement;
 return !parent||!!parent.closest('script,style,textarea,[contenteditable="true"],[data-no-i18n="true"]');
}
function processText(node){
 if(!node||node.nodeType!==Node.TEXT_NODE||skip(node))return;
 const current=node.nodeValue||"",last=textLast.get(node);
 if(last!==undefined&&current!==last)textSources.set(node,current);
 else if(!textSources.has(node))textSources.set(node,current);
 const source=textSources.get(node)||"";
 const next=translate(source,language);
 if(next!==current){textLast.set(node,next);node.nodeValue=next}
 else textLast.delete(node);
}
const ATTRS=["placeholder","aria-label","title"];
function processAttributes(element){
 if(!element||element.nodeType!==Node.ELEMENT_NODE||element.closest?.('[data-no-i18n="true"]'))return;
 let state=attributeSources.get(element);if(!state){state={};attributeSources.set(element,state)}
 let last=attributeLast.get(element);if(!last){last={};attributeLast.set(element,last)}
 ATTRS.forEach(name=>{
  if(!element.hasAttribute(name))return;
  const current=element.getAttribute(name),previous=last[name];
  if(previous!==undefined&&current!==previous)state[name]=current;
  else if(state[name]===undefined)state[name]=current;
  const next=translate(state[name],language);
  if(next!==current){last[name]=next;element.setAttribute(name,next)}else delete last[name];
 });
}
function processNode(node){
 if(!node)return;
 if(node.nodeType===Node.TEXT_NODE){processText(node);return}
 if(node.nodeType!==Node.ELEMENT_NODE&&node!==document.body)return;
 if(node.nodeType===Node.ELEMENT_NODE&&node.closest?.('[data-no-i18n="true"]'))return;
 if(node.nodeType===Node.ELEMENT_NODE)processAttributes(node);
 const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);
 let textNode;while((textNode=walker.nextNode()))processText(textNode);
 if(node.querySelectorAll)node.querySelectorAll("*").forEach(processAttributes);
}
function scheduleMutations(records){
 records.forEach(record=>{
  if(record.type==="childList")record.addedNodes.forEach(node=>pendingAdded.add(node));
  else if(record.type==="characterData")pendingTextNodes.add(record.target);
  else if(record.type==="attributes")pendingAttributes.add(record.target);
 });
 if(scheduled)return;
 scheduled=true;
 requestAnimationFrame(()=>{
  scheduled=false;
  const added=[...pendingAdded],textNodes=[...pendingTextNodes],attributes=[...pendingAttributes];
  pendingAdded.clear();pendingTextNodes.clear();pendingAttributes.clear();
  added.forEach(processNode);
  textNodes.forEach(processText);
  attributes.forEach(processAttributes);
 });
}
function apply(target){
 const previousLanguage=language;
 language=target==="en"?"en":"sq";
 document.documentElement.lang=language==="sq"?"sq":"en";
 document.documentElement.dataset.profileLanguage=language;
 if(document.body)document.body.dataset.profileLanguage=language;
 if(document.body)processNode(document.body);
 if(previousLanguage!==language)window.dispatchEvent(new CustomEvent("flxtv:profile-language-changed",{detail:{language}}));
}
const observer=new MutationObserver(scheduleMutations);
if(document.body)observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:ATTRS});
window.FlixLocale=Object.freeze({
 getLanguage:()=>language,
 setLanguage(value){apply(value)},
 apply,
 t(value){return translate(value,language)},
 refresh(){if(document.body)processNode(document.body)}
});
apply(getLanguage());
})();