'use strict';
(() => {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const posts = window.ARCHIVE_POSTS || [];
  const dialog = $('#app-window');
  const panels = $$('[data-panel]');
  const names = {archive:'Archive',about:'About TheCyberGeek',terminal:'Terminal',research:'Research',contact:'Contact'};
  const hints = {archive:'The server rack → open the original writeup archive.',about:'The human → meet the geek behind the glasses.',terminal:'The terminal → type your way around the lab.',research:'The workbench → explore vulnerability research.',contact:'The comms screen → open a connection.'};
  const scene = $('#room-scene');
  const mobile = matchMedia('(max-width: 760px)');
  let lastOpener = null;
  let currentPanel = '';
  const archive = window.TCGArchiveUI.mount(posts);
  const selectFilter=value=>archive.query('',value);
  const results = $('#archive-results');
  const search = $('#archive-search');
  const sort = $('#archive-sort');
  function defaultHint() {$('#room-hint').textContent = scene.scrollWidth > scene.clientWidth + 2 ? '↔ Swipe to explore the room, or use the shortcuts below.' : '↖ Click something that sparks your curiosity.';}
  function frameRoom() {
    const overflow=scene.scrollWidth-scene.clientWidth;
    scene.scrollLeft=Math.max(0,Math.min(overflow,scene.scrollWidth*(mobile.matches ? 0.46 : 0.5)-scene.clientWidth/2));
    defaultHint();
  }
  new ResizeObserver(frameRoom).observe(scene);
  defaultHint();mobile.addEventListener('change', defaultHint);

  function openPanel(name, updateHistory = true) {
    if(name==='guidelines'){location.assign('guidelines/');return;}
    if (!Object.hasOwn(names,name)) return;
    currentPanel = name;
    if (updateHistory && location.hash !== '#' + name) history.pushState(null,'','#' + name);
    panels.forEach(panel => {panel.hidden = panel.dataset.panel !== name;});
    $('#window-title').textContent = names[name];
    $('#full-page-link').href=name==='terminal'?'terminal/':name+'/';
    document.title = `TheCyberGeek | ${name === 'about' ? 'The human' : name.charAt(0).toUpperCase()+name.slice(1)}`;
    if (!dialog.open) {dialog.showModal();document.body.classList.add('modal-open');}
    $('.window-body').scrollTop = 0;
    $$('.room-dock [data-open]').forEach(link => {if(link.dataset.open === name) link.setAttribute('aria-current','true');else link.removeAttribute('aria-current');});
    if (name === 'terminal') $('#terminal-input').focus({preventScroll:true});
    else $('#close-window').focus({preventScroll:true});
  }
  function closeWindow(updateHistory = true) {
    if (dialog.open) dialog.close();
    document.body.classList.remove('modal-open');
    currentPanel = '';
    if (updateHistory) history.pushState(null,'',location.pathname + location.search + '#home');
    $$('.room-dock [data-open]').forEach(link => link.removeAttribute('aria-current'));
    document.title = 'TheCyberGeek | Welcome to the lab';
    lastOpener?.focus({preventScroll:true});
  }
  function syncRoute() {
    const name = location.hash.slice(1);
    if (Object.hasOwn(names,name)) openPanel(name,false);
    else if (dialog.open) closeWindow(false);
  }
  $$('[data-open]').forEach(link => {
    link.addEventListener('click', event => {event.preventDefault();if(!dialog.contains(link))lastOpener = link;openPanel(link.dataset.open);});
    ['mouseenter','focus'].forEach(type => link.addEventListener(type, () => {$('#room-hint').textContent = hints[link.dataset.open];}));
    ['mouseleave','blur'].forEach(type => link.addEventListener(type, defaultHint));
  });
  $('#close-window').addEventListener('click',()=>closeWindow());
  $('#minimize-window').addEventListener('click',()=>closeWindow());
  $('#maximize-window').addEventListener('click',event=>{
    const maximized=dialog.classList.toggle('window-maximized');
    event.currentTarget.setAttribute('aria-pressed',String(maximized));
    event.currentTarget.setAttribute('aria-label',maximized?'Restore window size':'Maximize window');
    event.currentTarget.title=maximized?'Restore':'Maximize';
    event.currentTarget.textContent=maximized?'❐':'□';
  });
  dialog.addEventListener('cancel',event=>{event.preventDefault();closeWindow();});
  dialog.addEventListener('click',event=>{
    const r=dialog.getBoundingClientRect();
    if(event.target===dialog && (event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom))closeWindow();
  });
  window.addEventListener('popstate',syncRoute);
  window.addEventListener('hashchange',syncRoute);

  $('#view-cves').addEventListener('click',()=>{archive.query('','CVEs');openPanel('archive');});
  $$('[data-article]').forEach(link=>{const post=posts.find(p=>p.title===link.dataset.article);if(post)link.href=post.url;});
  $$('[data-category]').forEach(link=>link.addEventListener('click',()=>archive.query('',link.dataset.category)));

  window.TCGTerminal.mount({posts,openPanel,closeWindow,archive,search,selectFilter,isActive:()=>currentPanel==='terminal'});
  document.addEventListener('keydown',event=>{if(event.key==='/'&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!/INPUT|TEXTAREA|SELECT/.test(event.target.tagName)&&!event.target.isContentEditable){event.preventDefault();lastOpener=document.activeElement;openPanel('terminal');}});

  const updateClock=()=>{$('#lab-clock').textContent=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit'}).format(new Date());};
  updateClock();setInterval(updateClock,60000);

  // Small canvas overlays animate the illustration without moving its pixel geometry.
  const canvas=$('#room-effects'),ctx=canvas.getContext('2d');
  const W=836,H=471;canvas.width=W;canvas.height=H;
  const drawAvatar=window.TCGAvatarMotion.mount($('#avatar-motion'),$('.room-image'));
  const drawDiscord=window.TCGDiscordChat.mount($('#discord-chat'));
  const animationStarted=performance.now();
  let seed=903;const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
  const rain=Array.from({length:100},()=>({x:.17+random()*.21,y:random(),speed:.10+random()*.12,length:3+Math.floor(random()*6)}));
  const stars=Array.from({length:14},()=>({x:.18+random()*.19,y:.18+random()*.14,phase:random()*6.28}));
  function drawRoom(t) {
    drawAvatar(t);
    drawDiscord(t);
    if(!ctx)return;ctx.clearRect(0,0,W,H);
    ctx.save();window.TCGRoomWindow.clip(ctx,W,H);
    rain.forEach(drop=>{const y=((drop.y+t*drop.speed)%1)*H*.32+H*.04;const x=Math.floor(drop.x*W);ctx.fillStyle='rgba(108,173,238,.37)';ctx.fillRect(x,Math.floor(y),1,drop.length);ctx.fillStyle='rgba(163,206,249,.24)';ctx.fillRect(x+1,Math.floor(y)-1,1,2);});
    stars.forEach(star=>{const alpha=.12+Math.max(0,Math.sin(t*.6+star.phase))*.48;ctx.fillStyle=`rgba(247,183,101,${alpha})`;ctx.fillRect(Math.floor(star.x*W),Math.floor(star.y*H),2,3);});ctx.restore();
    // Independently blinking activity lights on the server rack.
    for(let i=0;i<13;i++){
      const y=.18+i*.045;const x=.108+(i%3)*.014;
      const on=Math.sin(t*(1.4+(i%4)*.2)+i*2.3)>.3;
      ctx.fillStyle=on?'rgba(145,255,97,.78)':'rgba(145,255,97,.07)';ctx.fillRect(Math.floor(x*W),Math.floor(y*H),3,2);
    }
    // Slow display sweeps and soft light pulses, not rapid flicker.
    const sweep=(t*.09)%1;
    const screens=[[[.467,.408],[.563,.419],[.563,.534],[.467,.52]],[[.582,.422],[.687,.433],[.687,.569],[.582,.545]]];
    screens.forEach((polygon,index)=>{
      ctx.save();ctx.beginPath();polygon.forEach(([x,y],i)=>i===0?ctx.moveTo(x*W,y*H):ctx.lineTo(x*W,y*H));ctx.closePath();ctx.clip();
      const tint=index===0?'105,224,121':'145,154,235';
      ctx.fillStyle=`rgba(${tint},${.012+(Math.sin(t*.7+index)+1)*.012})`;ctx.fillRect(0,0,W,H);
      ctx.fillStyle=`rgba(${tint},.07)`;ctx.fillRect(0,H*(.40+sweep*.18),W,1);ctx.restore();
    });
    // Three little pixel trails of steam above the coffee mug.
    for(let trail=0;trail<3;trail++)for(let j=0;j<5;j++){
      const progress=(t*.22+trail*.31+j*.035)%1;
      const x=W*.576+Math.sin(progress*6+trail)*3;
      const y=H*.569-progress*24;
      ctx.fillStyle=`rgba(185,203,209,${(1-progress)*.20})`;ctx.fillRect(Math.floor(x),Math.floor(y),2,2);
    }
  }
  function animate(time) {
    // One continuous clock keeps the avatar, conversations and room in sync.
    // Browsers may suspend frames in background tabs; elapsed time still advances.
    drawRoom((time-animationStarted)/1000);
    requestAnimationFrame(animate);
  }
  drawRoom(0);requestAnimationFrame(animate);syncRoute();
})();
