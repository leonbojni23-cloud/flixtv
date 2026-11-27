(function(w){'use strict';
/* Low-memory navigation: keep only a small poster window decoded and never animate focus scaling. */
const Nav={rows:[],r:0,c:0,x:0,el:null,sc:null,hdr:null,activeRow:null,
  scan(){
    if(this.activeRow&&!document.body.contains(this.activeRow))this.activeRow=null;
    this.rows=[];this.sc=document.getElementById('scroll');this.hdr=document.getElementById('hdr');
    const q=document.querySelectorAll('#hdr [data-row],#app [data-row]');
    for(let i=0;i<q.length;i++){
      const a=[].slice.call(q[i].querySelectorAll('.f'));if(!a.length)continue;
      const sec=q[i].closest('section');
      q[i]._top=sec&&this.sc&&this.sc.contains(sec)&&!sec.classList.contains('hero')?Math.max(0,sec.offsetTop-190):0;
      this.rows.push({el:q[i],items:a});
    }
  },
  rescan(){const r=this.r,c=this.c;this.scan();if(this.rows.length)this.set(Math.min(r,this.rows.length-1),c,true)},
  cur(){return this.el},
  xOf(el,off){let x=0,n=el;while(n){x+=n.offsetLeft;n=n.offsetParent}return x-(off!=null?off:el.parentNode._off||0)+el.offsetWidth/2},
  loadPoster(el){
    if(!el||el.dataset.loaded==='1')return;
    const src=el.getAttribute('data-src'),poster=el.querySelector('.poster');if(!src||!poster)return;
    poster.style.backgroundImage='linear-gradient(0deg,rgba(0,0,0,.78),rgba(0,0,0,0) 68%),url("'+src.replace(/"/g,'%22')+'")';
    el.dataset.loaded='1';
  },
  unloadPoster(el){
    if(!el||el.dataset.loaded!=='1')return;
    const poster=el.querySelector('.poster');if(poster)poster.style.backgroundImage='none';
    delete el.dataset.loaded;
  },
  preparePosters(row,index){
    const cards=row.items.filter(el=>el.classList.contains('card'));
    if(this.activeRow&&this.activeRow!==row.el){
      this.activeRow.querySelectorAll('.card[data-loaded="1"]').forEach(el=>this.unloadPoster(el));
    }
    this.activeRow=cards.length?row.el:null;
    if(!cards.length)return;
    const start=Math.max(0,index-1),end=Math.min(cards.length-1,index+4);
    cards.forEach((el,i)=>{if(i>=start&&i<=end)this.loadPoster(el);else this.unloadPoster(el)});
  },
  warmInitial(){
    const row=document.querySelector('#app [data-row][data-rail]');
    if(!row)return;
    const cards=row.querySelectorAll('.card');
    for(let i=0;i<Math.min(cards.length,6);i++)this.loadPoster(cards[i]);
  },
  set(r,c,keepX){
    const R=this.rows[r];if(!R)return;const row=R.el,rail=row.hasAttribute('data-rail');
    c=Math.max(0,Math.min(c,R.items.length-1));
    if(c>=R.items.length-4&&row.hasAttribute('data-rid')&&Screens.more(row))R.items=[].slice.call(row.querySelectorAll('.f'));
    const el=R.items[c];let off=0;
    if(rail){const p=el.previousElementSibling;off=Math.max(0,Math.min(p?p.offsetLeft-80:0,row.offsetWidth-1760))}
    if(!keepX)this.x=this.xOf(el,rail?off:null);
    if(this.el)this.el.classList.remove('focus');el.classList.add('focus');this.el=el;this.r=r;this.c=c;
    this.preparePosters(R,c);
    if(this.sc&&!this.sc.hasAttribute('data-fixed')){this.sc.style.transform='translateY('+(-row._top)+'px)';this.hdr.classList.toggle('solid',row._top>0)}
    if(rail){row._off=off;row.style.transform='translateX('+(-off)+'px)'}
  },
  at(el){for(let r=0;r<this.rows.length;r++){const i=this.rows[r].items.indexOf(el);if(i>-1){this.set(r,i);return true}}return false},
  move(d){
    const R=this.rows[this.r];if(!R)return;
    if(d==='left'||d==='right'){
      const n=this.c+(d==='right'?1:-1);if(n>=0&&n<R.items.length)this.set(this.r,n);
    }else{
      const n=this.r+(d==='down'?1:-1);if(n<0||n>=this.rows.length)return;
      const it=this.rows[n].items;let b=0,bd=1e9;
      for(let i=0;i<it.length;i++){const dx=Math.abs(this.xOf(it[i])-this.x);if(dx<bd){bd=dx;b=i}}
      this.set(n,b,true);
    }
  }
};
w.Nav=Nav;
})(window);