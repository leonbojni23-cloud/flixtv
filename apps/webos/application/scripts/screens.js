(function(w){'use strict';
const sv=p=>'<svg viewBox="0 0 24 24"><path d="'+p+'"/></svg>';
const I=w.Icons={play:sv('M8 5v14l11-7z'),pause:sv('M6 5h4v14H6zm8 0h4v14h-4z'),plus:sv('M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z'),check:sv('M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z'),
  info:sv('M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-6h2zm0-8h-2V7h2z'),search:sv('M15.5 14h-.8l-.3-.3A6.5 6.5 0 109.5 16a6.5 6.5 0 004.2-1.6l.3.3v.8l5 5 1.5-1.5zm-6 0a4.5 4.5 0 110-9 4.5 4.5 0 010 9z'),
  face:'<svg viewBox="0 0 100 100"><circle cx="34" cy="42" r="6" fill="#fff"/><circle cx="66" cy="42" r="6" fill="#fff"/><path d="M30 62q20 18 40 0" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round"/></svg>',
  AV:['#2d7ff9','#e5b109','#e50914','#46d369'],NAMES:['Ardit','Elira','Kids','Guest']};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const bg=m=>'background:linear-gradient(160deg,hsl('+m.hue+',55%,34%),hsl('+(m.hue+40)%360+',60%,11%))';
const bd=m=>m.backdrop?'background:#000 url('+m.backdrop+') center/cover':'background:linear-gradient(125deg,hsl('+m.hue+',62%,36%),hsl('+(m.hue+60)%360+',55%,9%))';
const fmt=s=>Math.floor(s/60)+':'+('0'+Math.floor(s%60)).slice(-2);
const card=(m,o)=>{o=o||{};const ls=o.ls,p=o.prog,src=ls?m.backdrop:m.poster,action=o.play?'play':'open';
  return '<div class="card f'+(o.rank?' t10':'')+(ls?' ls':'')+'" data-act="'+action+'" data-id="'+m.id+'" data-type="'+(m.type||'movie')+'"'+(o.season?' data-season="'+o.season+'"':'')+(o.episode?' data-episode="'+o.episode+'"':'')+(src?' data-src="'+esc(src)+'"':'')+'>'+(o.rank?'<b class="rank">'+o.rank+'</b>':'')+
  '<div class="poster" style="'+(ls?bd(m):bg(m))+'">'+(m.orig?'<b class="nb">C</b>':'')+(!o.rank&&m.match>=96?'<b class="tt">TOP<br>10</b>':'')+(ls?'<b class="pl">'+I.play+'</b>':'')+
  '<div class="cap"><div class="pt">'+esc(m.title)+'</div>'+(o.ra?'<span class="ra">Recently Added</span>':'<div class="pm">'+(m.year||'')+' · '+((m.genres&&m.genres[0])||'')+'</div>')+'</div>'+
  (p!=null?'<div class="bar"><i style="transform:scaleX('+p/100+')"></i></div>':'')+'</div></div>'};
/* Windowed rails: only 8 cards are in the DOM at first; more are appended as focus nears the end. */
let PEND={},RID=0;const CH=8;
const rail=(t,items,o)=>{const id=++RID;PEND[id]={q:items.slice(CH),o:o,n:CH};
  return '<section class="sec"><h2>'+esc(t)+'</h2><div class="track" data-row data-rail data-rid="'+id+'">'+items.slice(0,CH).map((m,i)=>card(m,o(m,i))).join('')+'</div></section>'};
const listBtn=m=>'<button class="btn f" data-act="list" data-id="'+m.id+'" data-type="'+m.type+'">'+(Store.inList(m.id,m.type)?I.check+'In My List':I.plus+'My List')+'</button>';
const hero=(m,det)=>{m=m||{id:0,title:'FLIXTV',type:'movie',year:'',rating:'',match:0,len:'',desc:'Discover films and series.',genres:[],cast:[],hue:0};
  const season=Number(m.firstSeasonNumber||1);
  return '<section class="hero'+(det?' det':'')+'"><div class="bd" style="'+bd(m)+'"></div>'+(det?'':'<div class="mat">'+m.rating+'</div>')+
  '<div class="hin"><div class="lab"><b>C</b>'+(m.type==='tv'?'SERIES':'FILM')+'</div><h1>'+esc(m.title)+'</h1>'+
  (det?'':'<div class="t10b"><i>TOP<br>10</i>Trending '+(m.type==='tv'?'TV Shows':'Movies')+'</div>')+
  '<div class="meta"><span class="match">'+m.match+'% Match</span><span>'+m.year+'</span><span class="tag">'+m.rating+'</span><span>'+m.len+'</span><span class="tag">HD</span></div><p>'+esc(m.desc)+'</p>'+
  (det?'<div class="dl"><b>Starring: </b>'+esc((m.cast||[]).join(', '))+'</div><div class="dl"><b>Genres: </b>'+esc((m.genres||[]).join(', '))+'</div>':'')+
  '<div class="btns" data-row><button class="btn f" data-act="play" data-id="'+m.id+'" data-type="'+m.type+'"'+(m.type==='tv'?' data-season="'+season+'" data-episode="1"':'')+'>'+I.play+'Play</button>'+(det?listBtn(m):'<button class="btn f" data-act="open" data-id="'+m.id+'" data-type="'+m.type+'">'+I.info+'More Info</button>')+'</div></div></section>';
};
const catalog=(tab,type,only)=>({tab:tab,load:()=>Api.home(type,only),
  view(d){const pr=Store.progress();return '<div id="scroll">'+hero(d.hero)+d.rows.map(r=>rail(r.title,r.items,(m,i)=>({rank:r.kind==='top10'?i+1:0,prog:r.kind==='cont'?pr[(m.type||'movie')+':'+m.id]:null,ls:r.kind==='cont',ra:r.title==='Coming Soon'}))).join('')+'</div>'}});

w.Screens={
  more(row){const p=PEND[row.getAttribute('data-rid')];if(!p||!p.q.length)return false;row.insertAdjacentHTML('beforeend',p.q.splice(0,6).map(m=>card(m,p.o(m,p.n++))).join(''));return true},
  reset(){PEND={}},
  home:catalog('home',null),tv:catalog('tv','tv'),movies:catalog('movies','movie'),new:catalog('new',null,['Coming Soon','Trending Now','Top 10 Movies']),
  err:e=>'<div class="msg"><h2>Something went wrong</h2><p>'+esc(e&&e.message||'Please try again.')+'</p><div data-row><button class="btn f" data-act="retry">Try again</button></div></div>',
  profiles:{tab:null,load:()=>Promise.resolve(),start:()=>({r:0,c:Store.last()}),
    view:()=>'<div class="who"><h1>Who’s watching?</h1><div class="profs" data-row>'+I.NAMES.map((n,i)=>'<button class="pf f" data-act="prof" data-n="'+i+'"><div class="a" style="background:'+I.AV[i]+'">'+I.face+'</div>'+n+'</button>').join('')+'</div></div>'},
  list:{tab:'list',load:()=>Api.byIds(Store.get('list',[])),
    view(items){const pr=Store.progress();let h='<div id="scroll"><h1 class="pt1">My List</h1>';
      if(!items.length)return h+'<div class="msg"><p>Your list is empty. Select “My List” on any title to save it here.</p><div data-row><button class="btn f" data-act="tab" data-t="home">Browse titles</button></div></div></div>';
      for(let i=0;i<items.length;i+=7)h+='<section class="sec"><div class="grow" data-row>'+items.slice(i,i+7).map(m=>card(m,{prog:pr[(m.type||'movie')+':'+m.id]})).join('')+'</div></section>';
      return h+'</div>'}},
  details:{tab:null,load:p=>Api.get(p.id,p.type).then(function(title){return Promise.all([Promise.resolve(title),Api.similar(p.id,p.type),title.type==='tv'?Api.season(p.id,title.firstSeasonNumber||1):Promise.resolve([])]);}),
    view:d=>'<div id="scroll">'+hero(d[0],true)+(d[0].type==='tv'?rail('Season '+(d[0].firstSeasonNumber||1)+' · Episodes',d[2],m=>({play:true,season:m.season,episode:m.episode})): '')+rail('More Like This',d[1],()=>({}))+'</div>'},
  search:{tab:'search',t:0,q:'',load:()=>Api.search(''),
    view(items){this.q='';const K='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',kb=n=>'<div class="krow" data-row>'+K.slice(n*12,n*12+12).split('').map(c=>'<button class="key f" data-act="key" data-k="'+c+'">'+c+'</button>').join('')+'</div>';
      return '<div id="scroll" data-fixed><div class="qv"><span id="qv" class="ph">Search for a show, movie or genre</span></div>'+kb(0)+kb(1)+kb(2)+
        '<div class="krow" data-row><button class="key w f" data-act="key" data-k=" ">Space</button><button class="key w f" data-act="key" data-k="del">Delete</button><button class="key w f" data-act="key" data-k="clr">Clear</button></div>'+
        '<section class="sec"><h2 id="rt">Popular searches</h2><div class="track" data-row data-rail id="res">'+items.map(m=>card(m,{})).join('')+'</div></section></div>'},
    key(k){this.q=k==='del'?this.q.slice(0,-1):k==='clr'?'':(this.q+k).slice(0,24);const q=this.q,v=document.getElementById('qv');
      v.textContent=q||'Search for a show, movie or genre';v.className=q?'':'ph';clearTimeout(this.t);
      this.t=setTimeout(()=>Api.search(q).then(it=>{const r=document.getElementById('res');if(q!==this.q||!r)return;
        r.innerHTML=it.map(m=>card(m,{})).join('');r._off=0;r.style.transform='';
        document.getElementById('rt').textContent=q?(it.length?'Results for “'+q+'”':'No results for “'+q+'”'):'Popular searches';Nav.rescan()}),150)},
    destroy(){clearTimeout(this.t)}},
  player:{tab:null,pos:0,dur:0,m:null,frame:null,listener:null,params:null,lastSavedAt:0,
    load:p=>Api.get(p.id,p.type),
    view(m,p){this.m=m;this.params=p||{};this.pos=0;this.dur=0;
      const tv=m.type==='tv',season=Number(this.params.season||m.firstSeasonNumber||1),episode=Number(this.params.episode||1);
      const path=tv?'/embed/tv/'+m.id+'/'+season+'/'+episode:'/embed/movie/'+m.id;
      const url='https://bingeapi.st'+path+'?color=e50914&autoplay=1&right_click=0&sub_lang=alb&sub_os=1';
      return '<div class="player"><iframe id="binge-frame" class="player-frame" src="'+url+'" title="'+esc(m.title)+'" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen frameborder="0"></iframe><div class="player-actions" data-row><button class="btn f" data-act="close">‹ Back to FLIXTV</button></div></div>';},
    mount(){this.frame=document.getElementById('binge-frame');const self=this;this.listener=function(event){
      if(event.origin!=='https://bingeapi.st'&&event.origin!=='https://bingeapi.com')return;
      const data=event.data;if(!data||data.source!=='bingeapi_player')return;
      if(data.event==='time'&&typeof data.info==='number')self.pos=data.info;
      if(data.event==='duration'&&typeof data.info==='number')self.dur=data.info;
      if(data.event==='time'&&self.dur>0&&self.m&&Math.abs(self.pos-self.lastSavedAt)>=15){Store.setProgress(self.m.id,self.m.type,Math.min(96,Math.round(self.pos/self.dur*100)),self.m);self.lastSavedAt=self.pos;}
      if(data.event==='ended'&&self.m)Store.setProgress(self.m.id,self.m.type,100,self.m);
    };w.addEventListener('message',this.listener);},
    act(d){if(d.act==='close')App.back();},
    onKey(k){if(!this.frame)return false;const commands={play:'play',pause:'pause',ff:'seek',rew:'seek'};if(!commands[k])return false;
      /* BingeAPI seek values are absolute playback seconds, not relative offsets. */
      const value=k==='ff'?Math.max(0,this.pos+30):k==='rew'?Math.max(0,this.pos-30):undefined;
      this.frame.contentWindow.postMessage({source:'bingeapi_player_command',command:commands[k],value:value},'*');return true;},
    onVisibility(hidden){if(hidden&&this.frame)this.frame.contentWindow.postMessage({source:'bingeapi_player_command',command:'pause'},'*');},
    destroy(){if(this.m&&this.dur>0&&this.pos>0)Store.setProgress(this.m.id,this.m.type,Math.min(96,Math.round(this.pos/this.dur*100)),this.m);if(this.listener)w.removeEventListener('message',this.listener);this.listener=null;this.frame=null;}
  }
};
})(window);
