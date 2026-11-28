(function(w){'use strict';
const sv=p=>'<svg viewBox="0 0 24 24"><path d="'+p+'"/></svg>';
const I=w.Icons={play:sv('M8 5v14l11-7z'),pause:sv('M6 5h4v14H6zm8 0h4v14h-4z'),plus:sv('M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z'),check:sv('M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z'),
  info:sv('M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-6h2zm0-8h-2V7h2z'),search:sv('M15.5 14h-.8l-.3-.3A6.5 6.5 0 109.5 16a6.5 6.5 0 004.2-1.6l.3.3v.8l5 5 1.5-1.5zm-6 0a4.5 4.5 0 110-9 4.5 4.5 0 010 9z')};
const COLORS=['#e50914','#2d7ff9','#e5a900','#20a36a','#8758d6','#e06b32','#218c9b','#b94f83'];
const esc=s=>String(s==null?'':s).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const card=(m,o)=>{o=o||{};const ls=!!o.ls,p=o.prog,src=ls?(m.backdrop||m.poster):(m.poster||m.backdrop),action=o.play?'play':'open';
  return '<div class="card f'+(o.rank?' t10':'')+(ls?' ls':'')+'" role="button" tabindex="0" aria-label="'+esc((m.title||'Open title')+(m.year?' '+m.year:''))+'" data-act="'+action+'" data-id="'+m.id+'" data-type="'+(m.type||'movie')+'"'+(o.season?' data-season="'+o.season+'"':'')+(o.episode?' data-episode="'+o.episode+'"':'')+(src?' data-src="'+esc(src)+'"':'')+'>'+(o.rank?'<b class="rank">'+o.rank+'</b>':'')+
  '<div class="poster" style="background-color:#242429">'+(m.orig?'<b class="nb">C</b>':'')+(!o.rank&&m.match>=96?'<b class="tt">TOP<br>10</b>':'')+(ls?'<b class="pl">'+I.play+'</b>':'')+
  '<div class="cap"><div class="pt">'+esc(m.title)+'</div>'+(o.ra?'<span class="ra">Recently Added</span>':'<div class="pm">'+(m.year||'')+' · '+((m.genres&&m.genres[0])||'')+'</div>')+'</div>'+
  (p!=null?'<div class="bar"><i style="transform:scaleX('+p/100+')"></i></div>':'')+'</div></div>'};
let PEND={},RID=0;const CH=8;
const rail=(t,items,o)=>{const id=++RID;PEND[id]={q:(items||[]).slice(CH),o:o,n:CH};
  return '<section class="sec"><h2>'+esc(t)+'</h2><div class="track" data-row data-rail data-rid="'+id+'">'+(items||[]).slice(0,CH).map((m,i)=>card(m,o(m,i))).join('')+'</div></section>'};
const listBtn=m=>'<button class="btn f" data-act="list" data-id="'+m.id+'" data-type="'+m.type+'">'+(Store.inList(m.id,m.type)?I.check+'In My List':I.plus+'My List')+'</button>';
const hero=(m,det)=>{m=m||{id:0,title:'FLIXTV',type:'movie',year:'',rating:'',match:0,len:'',desc:'Discover films and series.',genres:[],cast:[],hue:0};
  const season=Number(m.firstSeasonNumber||1);
  return '<section class="hero'+(det?' det':'')+'"><div class="bd" style="'+(m.backdrop?'background:#000 url('+m.backdrop+') center/cover':'background:#17171b')+'"></div>'+(det?'':'<div class="mat">'+esc(m.rating)+'</div>')+
  '<div class="hin"><div class="lab"><b>F</b>'+(m.type==='tv'?'SERIES':'FILM')+'</div><h1>'+esc(m.title)+'</h1>'+
  (det?'':'<div class="t10b"><i>TOP<br>10</i>Trending '+(m.type==='tv'?'TV Shows':'Movies')+'</div>')+
  '<div class="meta"><span class="match">'+m.match+'% Match</span><span>'+esc(m.year)+'</span><span class="tag">'+esc(m.rating)+'</span><span>'+esc(m.len)+'</span><span class="tag">HD</span></div><p>'+esc(m.desc)+'</p>'+
  (det?'<div class="dl"><b>Starring: </b>'+esc((m.cast||[]).join(', '))+'</div><div class="dl"><b>Genres: </b>'+esc((m.genres||[]).join(', '))+'</div>':'')+
  '<div class="btns" data-row><button class="btn f" data-act="play" data-id="'+m.id+'" data-type="'+m.type+'"'+(m.type==='tv'?' data-season="'+season+'" data-episode="1"':'')+'>'+I.play+'Play</button>'+(det?listBtn(m):'<button class="btn f" data-act="open" data-id="'+m.id+'" data-type="'+m.type+'">'+I.info+'More Info</button>')+'</div></div></section>';
};
const catalog=(tab,type,only)=>({tab:tab,load:()=>Api.home(type,only),
  view(d){const pr=Store.progress();return '<div id="scroll">'+hero(d.hero)+d.rows.map(r=>rail(r.title,r.items,(m,i)=>({rank:r.kind==='top10'?i+1:0,prog:r.kind==='cont'?pr[(m.type||'movie')+':'+m.id]:null,ls:r.kind==='cont',play:r.kind==='cont',season:m.season,episode:m.episode,ra:r.title==='Coming Soon'}))).join('')+'</div>'}});
const episodeRail=(season,items)=>rail('Season '+season+' · Episodes',items,m=>({play:true,season:m.season,episode:m.episode,ls:true}));

w.Screens={
  more(row){const p=PEND[row.getAttribute('data-rid')];if(!p||!p.q.length)return false;row.insertAdjacentHTML('beforeend',p.q.splice(0,6).map(m=>card(m,p.o(m,p.n++))).join(''));return true},
  reset(){PEND={};RID=0;},
  home:catalog('home',null),tv:catalog('tv','tv'),movies:catalog('movies','movie'),new:catalog('new',null,['Coming Soon','Trending Now','Top 10 Movies']),
  err:e=>'<div class="msg"><h2>Something went wrong</h2><p>'+esc(e&&e.message||'Please try again.')+'</p><div data-row><button class="btn f" data-act="retry">Try again</button></div></div>',
  profiles:{
    tab:null,creating:false,name:'',color:COLORS[0],
    load:()=>Promise.resolve(Store.profiles()),
    start:()=>({r:0,c:0}),
    view(items){
      if(!items.length)this.creating=true;
      if(this.creating)return this.createView();
      return '<div class="who"><h1>Who’s watching?</h1><div class="profs" data-row>'+
        items.map(p=>'<button class="pf f" data-act="prof" data-id="'+esc(p.id)+'"><div class="a" style="background:'+esc(p.color)+'"><span>'+esc((p.name||'?').charAt(0).toUpperCase())+'</span></div>'+esc(p.name)+'</button>').join('')+
        '<button class="pf f add-profile" data-act="add-profile"><div class="a">+</div>Add profile</button></div></div>';
    },
    createView(){
      const rows=['ABCDEFGHIJ','KLMNOPQRST','UVWXYZ0123','456789'];
      return '<div class="profile-create"><h1>Create your profile</h1><div id="profile-name" class="profile-name">'+esc(this.name||'Enter your name')+'</div>'+
        '<div class="profile-colors" data-row>'+COLORS.map((c,i)=>'<button class="profile-color f'+(c===this.color?' selected':'')+'" data-act="profile-color" data-color="'+c+'" aria-label="Choose avatar color" style="background:'+c+'"></button>').join('')+'</div>'+
        '<div class="profile-keyboard">'+rows.map(row=>'<div class="profile-key-row" data-row>'+row.split('').map(k=>'<button class="profile-key f" data-act="profile-key" data-k="'+k+'">'+k+'</button>').join('')+'</div>').join('')+
        '<div class="profile-key-row" data-row><button class="profile-key wide f" data-act="profile-key" data-k="space">SPACE</button><button class="profile-key wide f" data-act="profile-key" data-k="del">DELETE</button></div></div>'+
        '<div class="profile-actions" data-row><button class="btn f" data-act="profile-cancel">Cancel</button><button class="btn primary f" data-act="profile-create">Create profile</button></div></div>';
    },
    add(){this.creating=true;this.name='';this.color=COLORS[0];Router.reload();},
    key(k){
      if(k==='del')this.name=this.name.slice(0,-1);
      else if(k==='space')this.name=(this.name+' ').slice(0,18);
      else this.name=(this.name+k).slice(0,18);
      const field=document.getElementById('profile-name');if(field)field.textContent=this.name||'Enter your name';
    },
    chooseColor(color){
      this.color=color;
      document.querySelectorAll('.profile-color').forEach(el=>el.classList.toggle('selected',el.dataset.color===color));
    },
    create(){
      const name=this.name.trim();
      if(!name){const field=document.getElementById('profile-name');if(field)field.textContent='Enter a name first';return}
      const profile=Store.createProfile(name,this.color);
      this.creating=false;this.name='';Router.root('home');
    },
    cancel(){
      if(!Store.profiles().length){this.name='';return}
      this.creating=false;this.name='';Router.reload();
    },
    onKey(k){
      if(k==='back'&&this.creating){this.cancel();return true}
      if(k==='back'&&!Store.profiles().length)return true;
      return false;
    }
  },
  list:{tab:'list',load:()=>Api.byIds(Store.get('list',[])),
    view(items){const pr=Store.progress();let h='<div id="scroll"><h1 class="pt1">My List</h1>';
      if(!items.length)return h+'<div class="msg"><p>Your list is empty. Select “My List” on any title to save it here.</p><div data-row><button class="btn f" data-act="tab" data-t="home">Browse titles</button></div></div></div>';
      for(let i=0;i<items.length;i+=7)h+='<section class="sec"><div class="grow" data-row>'+items.slice(i,i+7).map(m=>card(m,{prog:pr[(m.type||'movie')+':'+m.id]})).join('')+'</div></section>';
      return h+'</div>'}},
  details:{
    tab:null,detail:null,seasonToken:0,
    load(p){
      this.seasonToken++;this.detail=null;
      return Api.get(p.id,p.type).then(title=>{
        const seasons=(title.seasons||[]).filter(s=>Number(s.season_number)>0);
        const selected=seasons.length?Number(seasons[0].season_number):1;
        return Promise.all([Api.similar(p.id,p.type),title.type==='tv'?Api.season(p.id,selected):Promise.resolve([])]).then(result=>{
          this.detail={title:title,similar:result[0],seasons:seasons,selected:selected,episodes:result[1]};
          return this.detail;
        });
      });
    },
    view(d){
      const m=d.title;
      const picker=m.type==='tv'?'<section class="season-section"><h2>Choose Season</h2><div class="season-picker" data-row>'+d.seasons.map(s=>'<button class="season-btn f'+(Number(s.season_number)===d.selected?' selected':'')+'" data-act="season" data-season="'+s.season_number+'">'+esc(s.name||('Season '+s.season_number))+'</button>').join('')+'</div></section><div id="episode-section">'+episodeRail(d.selected,d.episodes)+'</div>':'';
      return '<div id="scroll">'+hero(m,true)+picker+rail('More Like This',d.similar,()=>({}))+'</div>';
    },
    selectSeason(season){
      const d=this.detail;if(!d||!d.title||d.title.type!=='tv')return;
      season=Number(season);if(!season||season===d.selected)return;
      d.selected=season;const token=++this.seasonToken;
      document.querySelectorAll('.season-btn').forEach(el=>el.classList.toggle('selected',Number(el.dataset.season)===season));
      const box=document.getElementById('episode-section');
      if(!box)return;
      const old=box.querySelector('[data-rid]');if(old)delete PEND[old.dataset.rid];
      box.innerHTML='<section class="sec"><h2>Season '+season+' · Loading episodes</h2></section>';
      Api.season(d.title.id,season).then(items=>{
        if(token!==this.seasonToken||Router.cur.name!=='details')return;
        d.episodes=items;
        box.innerHTML=items.length?episodeRail(season,items):'<section class="sec"><h2>Season '+season+' · No episodes found</h2></section>';
        Nav.rescan();
      }).catch(()=>{
        if(token!==this.seasonToken)return;
        box.innerHTML='<section class="sec"><h2>Could not load this season. Try again.</h2></section>';Nav.rescan();
      });
    }
  },
  search:{tab:'search',t:0,q:'',load:()=>Api.search(''),
    view(items){this.q='';const K='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',kb=n=>'<div class="krow" data-row>'+K.slice(n*12,n*12+12).split('').map(c=>'<button class="key f" data-act="key" data-k="'+c+'">'+c+'</button>').join('')+'</div>';
      return '<div id="scroll" data-fixed><div class="qv"><span id="qv" class="ph">Search for a show, movie or genre</span></div>'+kb(0)+kb(1)+kb(2)+
        '<div class="krow" data-row><button class="key w f" data-act="key" data-k=" ">Space</button><button class="key w f" data-act="key" data-k="del">Delete</button><button class="key w f" data-act="key" data-k="clr">Clear</button></div>'+
        '<section class="sec"><h2 id="rt">Popular searches</h2><div class="track" data-row data-rail id="res">'+items.map(m=>card(m,{})).join('')+'</div></section></div>'},
    key(k){this.q=k==='del'?this.q.slice(0,-1):k==='clr'?'':(this.q+k).slice(0,24);const q=this.q,v=document.getElementById('qv');
      v.textContent=q||'Search for a show, movie or genre';v.className=q?'':'ph';clearTimeout(this.t);
      this.t=setTimeout(()=>Api.search(q).then(it=>{const r=document.getElementById('res');if(q!==this.q||!r)return;
        r.innerHTML=it.map(m=>card(m,{})).join('');r._off=0;r.style.transform='';Nav.rescan()}),220)},
    destroy(){clearTimeout(this.t)}},
  player:{tab:null,pos:0,dur:0,m:null,frame:null,listener:null,params:null,lastSavedAt:0,
    load:p=>Api.get(p.id,p.type),
    view(m,p){this.m=m;this.params=p||{};this.pos=0;this.dur=0;this.lastSavedAt=0;this.resumeSent=false;this.resumeState=Store.getPlayback(m.id,m.type);
      const tv=m.type==='tv',season=Number(this.params.season||(this.resumeState&&this.resumeState.season)||m.firstSeasonNumber||1),episode=Number(this.params.episode||(this.resumeState&&this.resumeState.episode)||1);
      this.params.season=season;this.params.episode=episode;
      const path=tv?'/embed/tv/'+m.id+'/'+season+'/'+episode:'/embed/movie/'+m.id;
      const url='https://bingeapi.st'+path+'?color=e50914&autoplay=1&right_click=0&sub_lang=eng&sub_os=1';
      return '<div class="player"><iframe id="binge-frame" class="player-frame" src="'+url+'" title="'+esc(m.title)+'" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen frameborder="0"></iframe><div class="player-actions" data-row><button class="btn f" data-act="close">‹ Back to FLIXTV</button></div></div>';},
    mount(){this.frame=document.getElementById('binge-frame');const self=this;this.listener=function(event){
      if(event.origin!=='https://bingeapi.st'&&event.origin!=='https://bingeapi.com')return;
      if(!self.frame||event.source!==self.frame.contentWindow)return;
      const data=event.data;if(!data||data.source!=='bingeapi_player')return;
      if(data.event==='time'&&typeof data.info==='number')self.pos=Math.max(0,data.info);
      if(data.event==='duration'&&typeof data.info==='number')self.dur=Math.max(0,data.info);
      if(!self.resumeSent&&self.frame&&self.resumeState&&self.dur>0){
        const saved=self.resumeState;
        const sameEpisode=(self.m.type!=='tv'||(Number(saved.season||1)===Number(self.params.season||1)&&Number(saved.episode||1)===Number(self.params.episode||1)));
        if(sameEpisode&&Number(saved.time)>30&&Number(saved.time)<self.dur-90){
          self.resumeSent=true;
          self.frame.contentWindow.postMessage({source:'bingeapi_player_command',command:'seek',value:Number(saved.time)},'https://bingeapi.st');
        }else self.resumeSent=true;
      }
      if(data.event==='time'&&self.dur>0&&self.m&&Math.abs(self.pos-self.lastSavedAt)>=15){
        Store.setProgress(self.m.id,self.m.type,Math.min(94,Math.round(self.pos/self.dur*100)),self.m,{time:self.pos,duration:self.dur,season:self.params.season,episode:self.params.episode});
        self.lastSavedAt=self.pos;
      }
      if(data.event==='ended'&&self.m)Store.clearProgress(self.m.id,self.m.type);
    };w.addEventListener('message',this.listener);},
    act(d){if(d.act==='close')App.back();},
    onKey(k){if(!this.frame)return false;const commands={play:'play',pause:'pause',ff:'seek',rew:'seek'};if(!commands[k])return false;
      const value=k==='ff'?Math.max(0,this.pos+30):k==='rew'?Math.max(0,this.pos-30):undefined;
      this.frame.contentWindow.postMessage({source:'bingeapi_player_command',command:commands[k],value:value},'https://bingeapi.st');return true;},
    onVisibility(hidden){if(hidden&&this.frame)this.frame.contentWindow.postMessage({source:'bingeapi_player_command',command:'pause'},'https://bingeapi.st');},
    destroy(){if(this.m&&this.dur>0&&this.pos>0)Store.setProgress(this.m.id,this.m.type,Math.min(94,Math.round(this.pos/this.dur*100)),this.m,{time:this.pos,duration:this.dur,season:this.params.season,episode:this.params.episode});if(this.listener)w.removeEventListener('message',this.listener);this.listener=null;this.frame=null;}
  }
};
})(window);