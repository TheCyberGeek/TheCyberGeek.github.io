/* Pixel scribbles are decorative, fictional chat. No real account or messages. */
(function(root){
  function mount(canvas){
    const ctx=canvas.getContext('2d');
    canvas.width=1000;canvas.height=750;
    if(!ctx)return ()=>{};
    ctx.imageSmoothingEnabled=false;
    const timeline=root.TCGChatTimeline;
    const texture=new Image();texture.src='assets/screen-discord.png';
    let ready=false,lastKey='',lastTime=0,lastReduced=false;
    texture.decode().then(()=>{ready=true;lastKey='';draw(lastTime,lastReduced);}).catch(()=>{});
    function box(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
    function scribble(x,y,count,seed,color='#929aaa',height=6){
      for(let i=0;i<count;i++){
        const n=(seed*31+i*17)%29,step=7+n%5;
        box(x,y+n%3,step-2,2,color);
        if(n%3)box(x+2,y+3,Math.max(2,step-4),2,color);
        if(n%2)box(x+step-4,y+height-2,3,2,color);
        x+=step+3;
      }
      return x;
    }
    function avatar(person,x,y,size){
      // Reuse portraits from the original texture, without altering its source.
      const portraits=[[309,67],[309,184],[309,476],[309,128],[309,245],
        [309,300],[309,363],[309,421],[309,541]];
      const source=portraits[person%portraits.length];
      ctx.drawImage(texture,source[0]/1000*texture.naturalWidth,source[1]/750*texture.naturalHeight,
        43/1000*texture.naturalWidth,43/750*texture.naturalHeight,x,y,size,size);
    }
    function draw(time,reduced=false){
      lastTime=time;lastReduced=reduced;
      if(!ready)return;
      const t=reduced?0:time,state=timeline.at(t),history=timeline.messages(state.active,t);
      const key=JSON.stringify([state.active,state.draft,state.send,state.pointer,state.click,
        Math.round(state.travel*28),Math.floor(t*2)%2,history.map(m=>m.id)]);
      if(key===lastKey)return;lastKey=key;
      ctx.clearRect(0,0,1000,750);
      // The server rail, member list and surrounding Discord chrome stay intact.
      box(74,0,218,678,'#1c2230');
      box(74,51,218,2,'#111824');
      scribble(91,23,13,8,'#b6bccb',7);
      scribble(90,73,12,21,'#767e92');
      // Nine contacts fill the sidebar; only the first two participate in the loop.
      Array.from({length:9},(_,person)=>person).forEach(person=>{
        const y=99+person*65,selected=state.active===person;
        box(82,y,202,54,selected?'#373754':'#202635');
        if(selected)box(82,y,3,54,'#a18bf1');
        avatar(person,92,y+9,34);
        scribble(137,y+14,10,person*19+5,selected?'#c5bddf':'#9398aa',7);
        scribble(137,y+31,8,person*13+7,'#777f94',5);
        box(118,y+36,7,7,person<2?'#55c793':['#55c793','#e3b563','#727b8d'][person%3]);
      });
      box(286,99,3,574,'#151c29');box(286,99,3,174,'#62687d');
      // Conversation title and message history change together at the mouse click.
      box(296,0,302,52,'#1c2230');
      avatar(state.active,311,10,31);
      scribble(357,24,16,state.active*19+5,'#c3c5d5',8);
      box(296,55,539,620,'#202532');
      history.forEach((message,index)=>{
        const y=80+index*94;
        avatar(message.self?2:state.active,311,y,36);
        scribble(362,y+2,message.self?12:10,message.self?83:state.active*19+5,
          message.self?'#8cd8bd':state.active?'#e6a3d5':'#ae91ed',7);
        scribble(537,y+3,5,message.seed,'#616b81',4);
        scribble(362,y+24,22+message.seed%9,message.seed,'#aab0bf',7);
        scribble(362,y+41,12+message.seed%16,message.seed+8,'#919aaf',7);
      });
      // Input fills in discrete keypress bursts. Sending clears it before reaching.
      box(307,678,510,52,'#303747');
      box(319,697,14,4,'#aeb5c6');box(324,692,4,14,'#aeb5c6');
      const draft=state.active===state.author?state.draft:0;
      if(draft){
        const end=scribble(349,696,draft,71+state.turn*13,'#cad0df',9);
        if(Math.floor(t*2)%2===0)box(end+3,693,3,14,'#c4c8dd');
      }else if(state.send){
        box(780,694,10,4,'#91deb9');box(786,698,5,9,'#91deb9');
      }else{
        scribble(350,699,16,9,'#727e94',5);
      }
      // The pointer travels to the other conversation while the hand uses the mouse.
      if(state.pointer){
        const p=state.travel*state.travel*(3-2*state.travel);
        const targetY=125+(1-state.author)*65;
        const x=Math.round(605+(214-605)*p),y=Math.round(610+(targetY-610)*p);
        if(state.click){ctx.strokeStyle='#ad9ef5';ctx.lineWidth=3;ctx.strokeRect(x-9,y-9,24,24);}
        ctx.fillStyle='#e3e7f2';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+19);
        ctx.lineTo(x+5,y+14);ctx.lineTo(x+10,y+22);ctx.lineTo(x+14,y+20);
        ctx.lineTo(x+9,y+12);ctx.lineTo(x+17,y+12);ctx.closePath();ctx.fill();
      }
    }
    return draw;
  }
  root.TCGDiscordChat={mount};
})(window);
