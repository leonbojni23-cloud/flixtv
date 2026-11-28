(function(w){'use strict';
/* 461 = webOS Back. Held/rapid keys switch the UI to "fast" mode (no transitions) to spare weak GPUs. */
const KEYS={37:'left',38:'up',39:'right',40:'down',13:'enter',8:'back',27:'back',461:'back',415:'play',19:'pause',417:'ff',412:'rew'};
w.Remote={last:0,tm:0,init(cb){const b=document.body;
  document.addEventListener('keydown',e=>{const k=KEYS[e.keyCode];if(!k)return;e.preventDefault();
    const t=Date.now(),d=t-this.last;if(d<60)return;this.last=t;
    if(d<220){b.classList.add('fast');clearTimeout(this.tm);this.tm=setTimeout(()=>b.classList.remove('fast'),260)}
    cb(k)});
}};
})(window);
