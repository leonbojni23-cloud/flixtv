(function(w){'use strict';
const Router={stack:[],cur:null,tok:0,
  go(name,p){this.leave();if(this.cur)this.stack.push(this.cur);this.show({name:name,p:p||{}})},
  root(name){this.leave();this.stack=[];this.show({name:name,p:{}})},
  back(){if(!this.stack.length)return false;this.leave();this.show(this.stack.pop());return true},
  reload(){this.leave();this.show(this.cur)},
  leave(){const c=this.cur;this.tok++;Screens.reset();if(!c)return;c.pos={r:Nav.r,c:Nav.c};const s=Screens[c.name];if(s.destroy)s.destroy()},
  show(e){this.cur=e;const s=Screens[e.name],t=++this.tok,a=document.getElementById('app');
    Nav.rows=[];Nav.el=null;App.header(s.tab);a.innerHTML='<div class="loader"></div>';
    s.load(e.p).then(d=>{if(t!==this.tok)return;
      a.innerHTML=s.view(d,e.p);if(s.mount)s.mount(a,d,e.p);Nav.scan();
      const pos=e.pos||(s.start&&s.start())||{r:s.tab?1:0,c:0};Nav.set(Math.min(pos.r,Nav.rows.length-1),pos.c);
    }).catch(err=>{if(t!==this.tok)return;a.innerHTML=Screens.err(err);Nav.scan();Nav.set(Nav.rows.length-1,0)});
  }
};
w.Router=Router;
})(window);
