(() => {
  'use strict';
  const motion=window.MorjiaMotion,status=document.querySelector('#status');
  let seconds=0,last=0,paused=false,mode='walk';
  document.querySelectorAll('[data-mode]').forEach(button=>button.onclick=()=>{
    mode=button.dataset.mode;document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  });
  document.querySelector('#pause').onclick=e=>{paused=!paused;e.currentTarget.textContent=paused?'再生':'一時停止';e.currentTarget.setAttribute('aria-pressed',String(paused));};
  Promise.all([motion.loadStrip('review/approved-two-frame.png'),motion.loadStrip('assets/morjia_walk_v5b.png'),motion.loadStrip('assets/morjia_sleep_v5.png')]).then(strips=>{
    const canvases=['approved','fixed','sleep'].map(id=>document.getElementById(id));
    function tick(stamp){
      const dt=last?Math.min(.05,(stamp-last)/1000):0;last=stamp;if(!paused)seconds+=dt;
      const pose=mode==='walk'?motion.frameAt(seconds):Number(mode),x=mode==='walk'?145+(seconds*motion.speedAt(190))%610:450;
      canvases.forEach((canvas,i)=>{
        const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);
        motion.drawFrame(ctx,strips[i],i===2?1:pose,i===2?450:x,i===2?170+Math.sin(seconds/1.1)*.5:228,i===2?128:190);
        canvas.dataset.frame=String(i===2?1:pose);
      });
      status.textContent=paused?'一時停止中':'2コマを1秒4回で交互に切り替えています。';requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }).catch(()=>{status.textContent='素材を読み込めませんでした。ページを開き直してください。';});
})();
