(function(){
"use strict";
const GUIDE_API="https://nuvio-parents-guide-addon.vercel.app";
const TMDB_API=location.hostname.endsWith("github.io")?"https://flixtv-snowy.vercel.app/api/tmdb.js":"/api/tmdb.js";
const cache=new Map();
let requestId=0,timer=0;
const labels={
 violence_gore:"Dhuna",violence:"Dhuna",sexual_content:"Përmbajtje seksuale",nudity:"Lakuriqësi",
 profanity:"Gjuhë e rëndë",strong_language:"Gjuhë e rëndë",substances:"Alkool dhe drogë",
 frightening_intense_scenes:"Skena shqetësuese",horror:"Horror",discrimination:"Diskriminim"
};
function getNode(){return document.getElementById("parental-guide-overlay")}
function hide(){clearTimeout(timer);const node=getNode();if(!node)return;node.classList.remove("is-visible");node.setAttribute("aria-hidden","true")}
function show(data){
 const node=getNode();if(!node)return;
 const rating=node.querySelector(".parental-guide-rating"),tags=node.querySelector(".parental-guide-tags");
 const cert=String(data.certification||"").trim();
 const advisories=(data.advisories||[]).slice(0,4);
 if(!cert&&!advisories.length){hide();return}
 rating.textContent=cert||"PARALAJMËRIM PËRMBAJTJEJE";
 rating.hidden=!cert;
 tags.replaceChildren();
 advisories.forEach(item=>{
  const chip=document.createElement("span");
  chip.className="parental-guide-chip";
  chip.textContent=item.label;
  tags.append(chip);
 });
 node.classList.remove("is-visible");
 node.setAttribute("aria-hidden","false");
 requestAnimationFrame(()=>node.classList.add("is-visible"));
 clearTimeout(timer);timer=setTimeout(hide,6500);
}
async function tmdb(path){
 const params=new URLSearchParams({path,language:"en-US"});
 const response=await fetch(TMDB_API+"?"+params.toString(),{credentials:"same-origin"});
 if(!response.ok)throw new Error("TMDB metadata unavailable");
 return response.json();
}
function extractAdvisories(payload){
 const found=[],seen=new Set();
 const add=(raw)=>{
  if(!raw||typeof raw!=="object")return;
  const category=String(raw.category||raw.type||raw.name||raw.slug||"").toLowerCase();
  const description=String(raw.description||raw.summary||raw.label||"").trim();
  const label=labels[category]||category.replace(/[_-]+/g," ").replace(/\b\w/g,x=>x.toUpperCase());
  if(!label||label.length>45)return;
  const key=label.toLowerCase();
  if(!seen.has(key)){seen.add(key);found.push({label,description})}
 };
 const visit=(value,depth=0)=>{
  if(depth>5||value==null)return;
  if(Array.isArray(value)){value.forEach(item=>visit(item,depth+1));return}
  if(typeof value!=="object")return;
  if(value.category||value.severity||value.description||value.slug)add(value);
  Object.values(value).forEach(child=>{if(child&&typeof child==="object")visit(child,depth+1)});
 };
 visit(payload);
 return found.filter(item=>item.label).slice(0,4);
}
async function loadGuide(item,season,episode){
 const mediaType=(item.media_type==="tv"||item.first_air_date||item.name)?"tv":"movie";
 const cacheKey=[mediaType,item.id,season||"",episode||""].join(":");
 if(cache.has(cacheKey))return cache.get(cacheKey);
 const task=(async()=>{
  const [external,certification,guide]=await Promise.allSettled([
   tmdb("/"+mediaType+"/"+item.id+"/external_ids"),
   mediaType==="movie"?tmdb("/movie/"+item.id+"/release_dates"):tmdb("/tv/"+item.id+"/content_ratings"),
   (async()=>{
    const ids=await tmdb("/"+mediaType+"/"+item.id+"/external_ids");
    if(!ids.imdb_id)return null;
    const url=GUIDE_API+"/api/v1/guide?imdbId="+encodeURIComponent(ids.imdb_id)+"&mediaType="+mediaType;
    const response=await fetch(url,{headers:{Accept:"application/json"},signal:AbortSignal.timeout(4500)});
    if(!response.ok)return null;
    return response.json();
   })()
  ]);
  let cert="";
  if(certification.status==="fulfilled"){
   const data=certification.value;
   if(mediaType==="movie"){
    const results=data.results||[];
    const preferred=results.find(x=>x.iso_3166_1==="US")||results.find(x=>x.iso_3166_1==="GB")||results[0];
    cert=(preferred?.release_dates||[]).map(x=>x.certification).find(Boolean)||"";
   }else{
    const results=data.results||[];
    const preferred=results.find(x=>x.iso_3166_1==="US")||results.find(x=>x.iso_3166_1==="GB")||results[0];
    cert=preferred?.rating||"";
   }
  }
  const guideData=guide.status==="fulfilled"?guide.value:null;
  const advisories=guideData?extractAdvisories(guideData):[];
  return {certification:cert,advisories};
 })();
 cache.set(cacheKey,task);
 try{return await task}catch(_){cache.delete(cacheKey);return {certification:"",advisories:[]}}
}
async function open(item,season,episode){
 const id=++requestId;hide();
 if(!item||!item.id)return;
 const data=await loadGuide(item,season,episode);
 if(id!==requestId||!document.getElementById("player-modal")?.classList.contains("open"))return;
 show(data);
}
function close(){requestId++;hide()}
window.FlixParentalGuide={open,close};
})();