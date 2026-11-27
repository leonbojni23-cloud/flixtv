(function(w){'use strict';
/* 461 = webOS Back, 415/19/417/412 = play/pause/ff/rew. Standard remote keys need no registration on webOS 4+. */
const KEYS={37:'left',38:'up',39:'right',40:'down',13:'enter',8:'back',27:'back',461:'back',415:'play',19:'pause',417:'ff',412:'rew'};
w.Remote={last:0,init(cb){
  document.addEventListener('keydown',e=>{const k=KEYS[e.keyCode];if(!k)return;e.preventDefault();
    const t=Date.now();if(t-this.last<80)return;this.last=t;cb(k)});
}};
})(window);
