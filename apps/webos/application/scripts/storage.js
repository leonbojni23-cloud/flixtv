(function(w){'use strict';
const Store={P:'cv.0.',n:0,
  use(n){this.n=n;this.P='cv.'+n+'.';try{localStorage.setItem('cv.last',n)}catch(e){}},
  last(){try{return+localStorage.getItem('cv.last')||0}catch(e){return 0}},
  get(k,d){try{const v=localStorage.getItem(this.P+k);return v===null?d:JSON.parse(v)}catch(e){return d}},
  set(k,v){try{localStorage.setItem(this.P+k,JSON.stringify(v))}catch(e){}},
  list(){return this.get('list',[])},
  inList(id,type){return this.list().some(function(item){return typeof item==='object'?Number(item.id)===Number(id)&&(!type||item.type===type):Number(item)===Number(id)})},
  toggleList(id,type){const l=this.list(),i=l.findIndex(function(item){return typeof item==='object'?Number(item.id)===Number(id)&&item.type===type:Number(item)===Number(id)});if(i>-1)l.splice(i,1);else l.unshift({id:Number(id),type:type||'movie'});this.set('list',l);return i<0},
  progress(){return this.get('prog',{})},
  setProgress(id,type,p,item){const key=(type||'movie')+':'+id,o=this.progress();if(p>=97)delete o[key];else o[key]=p;this.set('prog',o);if(item&&p<97){const recent=this.get('recent',[]).filter(function(x){return !(Number(x.id)===Number(item.id)&&x.type===item.type)});recent.unshift({id:item.id,type:item.type,title:item.title,year:item.year,rating:item.rating,match:item.match,genres:item.genres,cast:item.cast,desc:item.desc,poster:item.poster,backdrop:item.backdrop,hue:item.hue,mins:item.mins,len:item.len,firstSeasonNumber:item.firstSeasonNumber});this.set('recent',recent.slice(0,20))}}
};
w.Store=Store;
})(window);
