'use strict';
(function(root){
  const timeline=typeof module!=='undefined'&&module.exports?require('./chat-timeline.js'):root.TCGChatTimeline;
  // The hands and Discord share one clock: type, send, reach, click, return.
  function poseAt(time){
    return timeline.at(time).avatar;
  }
  function mount(canvas,base){
    const ctx=canvas.getContext('2d');
    canvas.width=1672;canvas.height=941;
    if(!ctx)return ()=>{};
    ctx.imageSmoothingEnabled=false;
    const frames={};let loaded=false,lastKey='';
    Promise.all(['reach','mouse','typing-a','typing-b'].map(async name=>{
      const img=new Image();img.src='assets/avatar-'+name+'.png';await img.decode();frames[name]=img;
    })).then(()=>{loaded=true;lastKey='';}).catch(()=>{});
    // Keep hand frames away from the baked monitor artwork and single-handled cup.
    const region=[644,511,288,146];
    function patch(source,rect,dx=0,dy=0){
      const [x,y,w,h]=rect;
      ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
      if(rect===region){
        ctx.beginPath();ctx.moveTo(644,511);ctx.lineTo(720,511);ctx.lineTo(720,527);
        ctx.lineTo(932,527);ctx.lineTo(932,657);ctx.lineTo(644,657);ctx.closePath();ctx.clip();
      }
      ctx.drawImage(source,x,y,w,h,x+dx,y+dy,w,h);ctx.restore();
    }
    return function draw(time,reduced=false){
      const state=poseAt(time);
      const key=reduced?'still':JSON.stringify(state)+loaded+base.complete;
      if(key===lastKey)return;
      lastKey=key;ctx.clearRect(0,0,1672,941);
      if(reduced||!base.complete||!base.naturalWidth)return;
      if(state.pose==='typing'&&loaded){
        const hands=[base,frames['typing-a'],frames['typing-b']];
        if(state.left)patch(hands[state.left],[714,522,52,42]);
        if(state.right)patch(hands[state.right],[770,534,59,42]);
      }else if(loaded){
        patch(frames[state.pose],region);
        if(state.pose==='mouse'){
          // Small movements of the hand and mouse together, with the wrist held in place.
          patch(frames.mouse,[878,550,54,46],state.mouseX,state.mouseY);
        }
      }
    };
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={poseAt};
  else root.TCGAvatarMotion={mount,poseAt};
})(typeof window!=='undefined'?window:globalThis);
