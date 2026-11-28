(function(w){'use strict';
const Store={P:'cv.unselected.',n:null,
  profiles(){
    try{
      const value=JSON.parse(localStorage.getItem('cv.profiles')||'[]');
      return Array.isArray(value)?value.filter(p=>p&&p.id!=null&&p.name):[];
    }catch(e){return []}
  },
  current(){return this.profiles().find(p=>String(p.id)===String(this.n))||null;},
  createProfile(name,color){
    const profiles=this.profiles();
    const profile={id:'p'+Date.now().toString(36)+profiles.length,name:String(name||'').trim().slice(0,18),color:color||'#e50914'};
    profiles.push(profile);
    try{localStorage.setItem('cv.profiles',JSON.stringify(profiles))}catch(e){}
    this.use(profile.id);
    return profile;
  },
  use(id){this.n=String(id);this.P='cv.'+this.n+'.';try{localStorage.setItem('cv.last',this.n)}catch(e){}},
  last(){try{return localStorage.getItem('cv.last')||null}catch(e){return null}},
  get(k,d){try{const v=localStorage.getItem(this.P+k);return v===null?d:JSON.parse(v)}catch(e){return d}},
  set(k,v){try{localStorage.setItem(this.P+k,JSON.stringify(v))}catch(e){}},
  list(){return this.get('list',[])},
  inList(id,type){return this.list().some(function(item){return typeof item==='object'?Number(item.id)===Number(id)&&(!type||item.type===type):Number(item)===Number(id)})},
  toggleList(id,type){const l=this.list(),i=l.findIndex(function(item){return typeof item==='object'?Number(item.id)===Number(id)&&item.type===type:Number(item)===Number(id)});if(i>-1)l.splice(i,1);else l.unshift({id:Number(id),type:type||'movie'});this.set('list',l);return i<0},
  progress(){return this.get('prog',{})},
  playback(){return this.get('playback',{})},
  getPlayback(id,type){return this.playback()[(type||'movie')+':'+id]||null},
  clearProgress(id,type){const key=(type||'movie')+':'+id,progress=this.progress(),playback=this.playback();delete progress[key];delete playback[key];this.set('prog',progress);this.set('playback',playback);this.set('recent',this.get('recent',[]).filter(function(x){return !(Number(x.id)===Number(id)&&x.type===(type||'movie'))}))},
  setProgress(id,type,p,item,position){
    const key=(type||'movie')+':'+id,progress=this.progress(),playback=this.playback();
    if(p>=95){this.clearProgress(id,type);return}
    progress[key]=Math.max(0,Math.min(94,Number(p)||0));
    if(position&&Number(position.time)>=0){playback[key]={time:Number(position.time)||0,duration:Number(position.duration)||0,season:Number(position.season)||1,episode:Number(position.episode)||1,updatedAt:Date.now()};this.set('playback',playback)}
    this.set('prog',progress);
    if(item){const recent=this.get('recent',[]).filter(function(x){return !(Number(x.id)===Number(item.id)&&x.type===item.type)});recent.unshift({id:item.id,type:item.type,title:item.title,year:item.year,rating:item.rating,match:item.match,genres:item.genres,cast:item.cast,desc:item.desc,poster:item.poster,backdrop:item.backdrop,hue:item.hue,mins:item.mins,len:item.len,firstSeasonNumber:item.firstSeasonNumber,season:Number(position&&position.season)||1,episode:Number(position&&position.episode)||1});this.set('recent',recent.slice(0,20))}
  }
};
w.Store=Store;
})(window);