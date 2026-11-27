(function(w){'use strict';
/* Row-based spatial nav. Layout values are cached at scan time; reads happen before writes to avoid reflow thrash. */
const Nav={rows:[],r:0,c:0,x:0,el:null,sc:null,hdr:null,
  scan(){this.rows=[];this.sc=document.getElementById('scroll');this.hdr=document.getElementById('hdr');
    const q=document.querySelectorAll('#hdr [data-row],#app [data-row]');
    for(let i=0;i<q.length;i++){const a=[].slice.call(q[i].querySelectorAll('.f'));if(!a.length)continue;
      const sec=q[i].closest('section');
      q[i]._top=sec&&this.sc&&this.sc.contains(sec)&&!sec.classList.contains('hero')?Math.max(0,sec.offsetTop-200):0;
      this.rows.push({el:q[i],items:a})}},
  rescan(){const r=this.r,c=this.c;this.scan();if(this.rows.length)this.set(Math.min(r,this.rows.length-1),c,true)},
  cur(){return this.el},
  xOf(el,off){let x=0,n=el;while(n){x+=n.offsetLeft;n=n.offsetParent}return x-(off!=null?off:el.parentNode._off||0)+el.offsetWidth/2},
  set(r,c,keepX){
    const R=this.rows[r];if(!R)return;const row=R.el,rail=row.hasAttribute('data-rail');
    c=Math.max(0,Math.min(c,R.items.length-1));
    if(c>=R.items.length-4&&row.hasAttribute('data-rid')&&Screens.more(row))R.items=[].slice.call(row.querySelectorAll('.f'));
    const el=R.items[c];let off=0;
    if(rail){const p=el.previousElementSibling;off=Math.max(0,Math.min(p?p.offsetLeft-80:0,row.offsetWidth-1920))}
    if(!keepX)this.x=this.xOf(el,rail?off:null);
    if(this.el)this.el.classList.remove('focus');el.classList.add('focus');this.el=el;this.r=r;this.c=c;
    if(this.sc&&!this.sc.hasAttribute('data-fixed')){this.sc.style.transform='translate3d(0,'+(-row._top)+'px,0)';this.hdr.classList.toggle('solid',row._top>0)}
    if(rail){row._off=off;row.style.transform='translate3d('+(-off)+'px,0,0)';
      for(let i=Math.max(0,c-1);i<c+9&&i<R.items.length;i++){const it=R.items[i],s=it.getAttribute('data-src');
        if(s){it.querySelector('.poster').style.backgroundImage='url('+s+')';it.classList.add('img');it.removeAttribute('data-src')}}}
  },
  at(el){for(let r=0;r<this.rows.length;r++){const i=this.rows[r].items.indexOf(el);if(i>-1){this.set(r,i);return true}}return false},
  move(d){const R=this.rows[this.r];if(!R)return;
    if(d==='left'||d==='right'){const n=this.c+(d==='right'?1:-1);if(n>=0&&n<R.items.length)this.set(this.r,n)}
    else{const n=this.r+(d==='down'?1:-1);if(n<0||n>=this.rows.length)return;
      const it=this.rows[n].items;let b=0,bd=1e9;
      for(let i=0;i<it.length;i++){const dx=Math.abs(this.xOf(it[i])-this.x);if(dx<bd){bd=dx;b=i}}
      this.set(n,b,true)}}
};
w.Nav=Nav;
})(window);
