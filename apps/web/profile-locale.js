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
 "Music":"Muzikë","Mystery":"Mister","Romance":"Romancë","Sci-Fi":"Fantashkencë","War":"Luftë"
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
 "FLIXTV / KOLEKSION":"FLIXTV / COLLECTION","Profili aktiv":"Active profile","MENAXHO PROFILET":"MANAGE PROFILES"
};
const textSources=new WeakMap(),textLast=new WeakMap(),attributeSources=new WeakMap(),attributeLast=new WeakMap();
let language="sq",scheduled=false;
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
 return Object.prototype.hasOwnProperty.call(dictionary,core)?lead+dictionary[core]+trail:trimmed;
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
function scheduleNodes(nodes){
 if(scheduled)return;scheduled=true;
 requestAnimationFrame(()=>{scheduled=false;nodes.forEach(processNode)});
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
const observer=new MutationObserver(records=>{
 const nodes=new Set();
 records.forEach(record=>{
  if(record.type==="childList")record.addedNodes.forEach(node=>nodes.add(node));
  else if(record.type==="characterData")nodes.add(record.target);
  else if(record.type==="attributes")nodes.add(record.target);
 });
 if(nodes.size)scheduleNodes(nodes);
});
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