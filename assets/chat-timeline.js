'use strict';
(function(root){
  const TURN=10, SEND=6.05, SWITCH=8.6;
  const rhythm=[[0,0,0],[.16,1,0],[.30,1,2],[.44,0,1],[.60,2,1],[.75,2,0],[.89,1,2],[1.03,0,2],[1.19,2,1],[1.36,1,0],[1.58,0,0],[1.88,0,1],[2.08,2,0],[2.25,0,2],[2.43,0,0]];
  function at(time){
    time=Math.max(0,time);
    const turn=Math.floor(time/TURN),phase=time-turn*TURN;
    const author=turn%2,active=phase>=SWITCH?1-author:author;
    const typing=phase<SEND,send=phase>=SEND&&phase<6.20;
    let left=0,right=0,draft=0;
    if(typing){
      for(const beat of rhythm){if(phase%2.9<beat[0])break;[,left,right]=beat;}
      // Text grows on the same irregular keypress beats as the fingers.
      for(let cycle=0;cycle<3;cycle++)for(const [start,l,r] of rhythm){
        if(cycle*2.9+start<=phase&&(l||r))draft++;
      }
    }else if(send){right=2;}
    let pose='typing',mouseX=0,mouseY=0;
    if(phase>=6.4&&phase<6.64||phase>=9.5&&phase<9.74)pose='reach';
    if(phase>=6.64&&phase<9.5){
      pose='mouse';
      const p=Math.min(1,(phase-6.64)/(SWITCH-6.64));
      mouseX=Math.round(Math.sin(p*Math.PI/2)*2);
      mouseY=phase>=SWITCH&&phase<SWITCH+.14?1:0;
    }
    return {turn,phase,author,active,draft,typing,send,
      click:phase>=SWITCH&&phase<SWITCH+.18,
      pointer:phase>=6.64&&phase<9.5,
      travel:Math.min(1,Math.max(0,(phase-6.64)/(SWITCH-6.64))),
      avatar:{pose,left,right,mouseX,mouseY}};
  }
  function messages(conversation,time){
    const result=[{id:`${conversation}-intro`,self:false,seed:13+conversation*7},
      {id:`${conversation}-context`,self:false,seed:41+conversation*11}];
    const last=Math.floor(Math.max(0,time)/TURN);
    // Keep only recent turns in memory, while deriving history from elapsed time.
    for(let turn=Math.max(0,last-10);turn<=last;turn++){
      if(turn%2!==conversation)continue;
      if(time>=turn*TURN+SEND)result.push({id:`sent-${turn}`,self:true,seed:71+turn*13});
      if(time>=turn*TURN+SEND+5)result.push({id:`reply-${turn}`,self:false,seed:91+turn*17});
    }
    return result.slice(-6);
  }
  const api={at,messages,TURN,SEND,SWITCH};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.TCGChatTimeline=api;
})(typeof window!=='undefined'?window:globalThis);
