(function(w){'use strict';
const TABS=[['home','Home'],['tv','TV Shows'],['movies','Movies'],['new','New & Popular'],['list','My List']];
const App={
  header(tab){const h=document.getElementById('hdr');h.classList.remove('solid');if(!tab){h.innerHTML='';return}
    h.innerHTML='<div class="hbar" data-row><div class="logo">CINEVAULT</div><button class="ico f" data-act="tab" data-t="search">'+Icons.search+'</button>'+
      TABS.map(t=>'<button class="tab f'+(t[0]===tab?' on':'')+'" data-act="tab" data-t="'+t[0]+'">'+t[1].replace('&','&amp;')+'</button>').join('')+
      '<i class="sp"></i><button class="av f" data-act="switch" style="background:'+Icons.AV[Store.n]+'">'+Icons.face+'</button></div>'},
  act(el){const d=el.dataset;switch(d.act){
    case'open':Router.go('details',{id:+d.id,type:d.type||'movie'});break;
    case'play':Router.go('player',{id:+d.id,type:d.type||'movie',season:+d.season||1,episode:+d.episode||1});break;
    case'tab':if(Router.cur.name!==d.t)Router.root(d.t);break;
    case'prof':Store.use(+d.n);Router.root('home');break;
    case'switch':Router.root('profiles');break;
    case'list':el.innerHTML=Store.toggleList(+d.id,d.type||'movie')?Icons.check+'In My List':Icons.plus+'My List';break;
    case'key':Screens.search.key(d.k);break;
    case'retry':Router.reload();break;
    default:if(Router.cur.name==='player')Screens.player.act(d)}},
  back(){const r=Router;if(r.back())return;const n=r.cur.name,tab=Screens[n].tab;
    if(tab&&Nav.r>1){Nav.set(1,0);return}
    if(tab&&Nav.r===1){Nav.set(0,Math.max(0,Nav.rows[0].items.findIndex(e=>e.classList.contains('on'))));return}
    if(n!=='home'&&n!=='profiles'){r.root('home');return}this.exit()},
  exit(){try{if(w.webOS&&webOS.platformBack)webOS.platformBack();else if(w.PalmSystem&&PalmSystem.platformBack)PalmSystem.platformBack();else w.close()}catch(e){w.close()}},
  key(k){const s=Screens[Router.cur.name];if(s.onKey&&s.onKey(k))return;
    if(k==='back')this.back();else if(k==='enter'){const el=Nav.cur();if(el)this.act(el)}else if(k==='up'||k==='down'||k==='left'||k==='right')Nav.move(k)},
  fit(){document.getElementById('stage').style.transform='scale('+Math.min(w.innerWidth/1920,w.innerHeight/1080)+')'},
  init(){Store.use(Store.last());Remote.init(k=>this.key(k));
    document.addEventListener('click',e=>{const f=e.target.closest&&e.target.closest('.f');if(f&&Nav.at(f))this.act(f)});
    document.addEventListener('webOSRelaunch',()=>{try{PalmSystem.activate()}catch(x){}});
    document.addEventListener('visibilitychange',()=>{const s=Router.cur&&Screens[Router.cur.name];if(s&&s.onVisibility)s.onVisibility(document.hidden)});
    this.fit();w.addEventListener('resize',()=>this.fit());Router.root('profiles')}
};
w.App=App;App.init();
})(window);
