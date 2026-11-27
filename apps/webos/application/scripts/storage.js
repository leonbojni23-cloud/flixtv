(function(w){'use strict';
const P='flixtv.webos.';
const key=(id,type)=>String(type||'movie')+':'+String(id);
const Store={
  get(k,d){try{const v=localStorage.getItem(P+k);return v===null?d:JSON.parse(v)}catch(e){return d}},
  set(k,v){try{localStorage.setItem(P+k,JSON.stringify(v))}catch(e){}},
  inList(id,type){return this.get('list',[]).some(x=>typeof x==='object'?x.id===Number(id)&&x.type===(type||'movie'):x===Number(id))},
  toggleList(id,type){const l=this.get('list',[]),i=l.findIndex(x=>typeof x==='object'?x.id===Number(id)&&x.type===(type||'movie'):x===Number(id));if(i>-1)l.splice(i,1);else l.unshift({id:Number(id),type:type||'movie'});this.set('list',l);return i<0},
  progress(){return this.get('prog',{})},
  progressFor(id,type){const p=this.progress()[key(id,type)];return p===undefined?null:p},
  setProgress(id,type,p){const o=this.progress(),k=key(id,type);if(p>=97)delete o[k];else o[k]=p;this.set('prog',o)},
  remember(item){if(!item||!item.id)return;const a=this.get('recent',[]),t={id:Number(item.id),type:item.type||'movie',at:Date.now(),item:item};this.set('recent',[t].concat(a.filter(x=>!(x.id===t.id&&x.type===t.type))).slice(0,20))}
};
w.Store=Store;
})(window);
