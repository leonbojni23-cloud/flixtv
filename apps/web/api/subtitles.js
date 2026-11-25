const API="https://api.opensubtitles.com/api/v1";
const USER_AGENT="FLIXTV/1.0";
function json(res,status,data){
 res.statusCode=status;
 res.setHeader("Content-Type","application/json; charset=utf-8");
 res.setHeader("Cache-Control","no-store");
 res.end(JSON.stringify(data));
}
async function upstream(path,options={}){
 const key=process.env.OPENSUBTITLES_API_KEY;
 if(!key)throw Object.assign(new Error("Mungon OPENSUBTITLES_API_KEY në Vercel Environment Variables."),{status:503});
 const response=await fetch(API+path,{
  ...options,
  headers:{
   "Api-Key":key,
   "User-Agent":USER_AGENT,
   "Accept":"application/json",
   ...(options.headers||{})
  }
 });
 const text=await response.text();
 let data={};
 try{data=JSON.parse(text)}catch(_){}
 if(!response.ok)throw Object.assign(new Error(data.message||data.error||("OpenSubtitles HTTP "+response.status)),{status:response.status});
 return data;
}
module.exports=async function handler(req,res){
 if(req.method==="OPTIONS"){
  res.setHeader("Allow","GET, POST, OPTIONS");
  return res.status(204).end();
 }
 try{
  if(req.method==="GET"){
   const q=req.query||{};
   const tmdbId=String(q.tmdb_id||"").trim();
   const parentTmdbId=String(q.parent_tmdb_id||"").trim();
   const imdbId=String(q.imdb_id||"").replace(/^tt0*/i,"");
   const parentImdbId=String(q.parent_imdb_id||"").replace(/^tt0*/i,"");
   const requestedType=String(q.type||"movie").toLowerCase();
   const isEpisode=requestedType==="tv"||requestedType==="episode";
   const type=isEpisode?"episode":"movie";
   const validId=isEpisode?(parentTmdbId||parentImdbId):(tmdbId||imdbId);
   if(!/^\d+$/.test(validId)||!["movie","tv","episode"].includes(requestedType))return json(res,400,{error:"TMDB/IMDb ID ose tipi i përmbajtjes është i pavlefshëm."});
   const language=String(q.languages||"sq").toLowerCase();
   if(!["sq","en"].includes(language))return json(res,400,{error:"Gjuha e titrave duhet të jetë sq ose en."});
   const params=new URLSearchParams();
   if(isEpisode){
    if(parentTmdbId)params.set("parent_tmdb_id",parentTmdbId);
    if(parentImdbId)params.set("parent_imdb_id",parentImdbId);
    if(q.season_number)params.set("season_number",String(q.season_number));
    if(q.episode_number)params.set("episode_number",String(q.episode_number));
   }else{
    if(tmdbId)params.set("tmdb_id",tmdbId);
    if(imdbId)params.set("imdb_id",imdbId);
   }
   const moviehash=String(q.moviehash||"").trim().toLowerCase();
   if(moviehash&&!/^[a-f0-9]{16}$/.test(moviehash))return json(res,400,{error:"Movie hash i pavlefshëm."});
   if(moviehash)params.set("moviehash",moviehash);
   params.set("type",type);
   params.set("languages",language);
   params.set("per_page","50");
   params.set("hearing_impaired","exclude");
   params.set("foreign_parts_only","exclude");
   params.set("machine_translated","exclude");
   params.set("ai_translated","exclude");
   const sortedParams=new URLSearchParams([...params.entries()].sort(([a],[b])=>a.localeCompare(b)));
   let data=await upstream("/subtitles?"+sortedParams.toString());
   let results=Array.isArray(data.data)?data.data:[];
   const fallbackQuery=String(q.query||"").trim().slice(0,160);
   if(!results.length&&fallbackQuery){
    const fallback=new URLSearchParams();
    fallback.set("query",fallbackQuery.toLowerCase());
    fallback.set("type",type);
    fallback.set("languages",language);
    if(isEpisode){
     if(q.season_number)fallback.set("season_number",String(q.season_number));
     if(q.episode_number)fallback.set("episode_number",String(q.episode_number));
    }else if(/^\\d{4}$/.test(String(q.year||""))){fallback.set("year",String(q.year))}
    const canonicalFallback=new URLSearchParams([...fallback.entries()].sort(([a],[b])=>a.localeCompare(b)));
    data=await upstream("/subtitles?"+canonicalFallback.toString());
    results=Array.isArray(data.data)?data.data:[];
   }
   return json(res,200,{data:results});
  }
  if(req.method==="POST"){
   let body=req.body;
   if(typeof body==="string"){try{body=JSON.parse(body)}catch(_){body={}}}
   const fileId=Number(body&&body.file_id);
   if(!Number.isInteger(fileId)||fileId<=0)return json(res,400,{error:"file_id i pavlefshëm."});
   const download=await upstream("/download",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({file_id:fileId,sub_format:"srt"})
   });
   if(!download.link)return json(res,502,{error:"OpenSubtitles nuk ktheu lidhje shkarkimi."});
   const fileResponse=await fetch(download.link,{redirect:"follow"});
   if(!fileResponse.ok)return json(res,502,{error:"Skedari i titrave nuk mund të shkarkohej."});
   const content=await fileResponse.text();
   if(!content||content.length>5*1024*1024)return json(res,502,{error:"Skedari i titrave është bosh ose shumë i madh."});
   return json(res,200,{content,file_name:download.file_name||"subtitle.srt"});
  }
  res.setHeader("Allow","GET, POST, OPTIONS");
  return json(res,405,{error:"Method not allowed"});
 }catch(error){
  console.error("[FLIXTV OpenSubtitles]",error);
  return json(res,Number(error.status)||500,{error:error.message||"Gabim gjatë marrjes së titrave."});
 }
};
