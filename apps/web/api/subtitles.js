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
   const type=String(q.type||"movie").toLowerCase();
   if(!/^\d+$/.test(tmdbId)||!["movie","tv"].includes(type))return json(res,400,{error:"TMDB ID ose tipi i përmbajtjes është i pavlefshëm."});
   const params=new URLSearchParams();
   params.set("tmdb_id",tmdbId);
   params.set("languages",String(q.languages||"sq,en"));
   if(type==="tv"){
    if(q.season_number)params.set("season_number",String(q.season_number));
    if(q.episode_number)params.set("episode_number",String(q.episode_number));
   }
   const data=await upstream("/subtitles?"+params.toString());
   return json(res,200,{data:Array.isArray(data.data)?data.data:[]});
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
