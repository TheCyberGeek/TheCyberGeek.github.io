'use strict';
window.TCGTerminalMenus={mount({input,output,closeWindow,isActive,resetHistory}){
  const panel=document.querySelector('.terminal-panel');
  const menus=[...panel.querySelectorAll('.terminal-menu')];
  const findbar=document.querySelector('#terminal-findbar');
  const find=document.querySelector('#terminal-find');
  const count=document.querySelector('#terminal-find-count');
  const status=document.querySelector('#terminal-menu-status');
  let zoom=0,matchIndex=-1,matches=[];
  const tell=text=>{status.textContent=text;status.hidden=!text;};
  const closeMenus=()=>menus.forEach(menu=>{menu.open=false;});
  const applyZoom=()=>panel.style.setProperty('--terminal-zoom',zoom+'px');
  function findMatches(direction=0){
    output.querySelectorAll('.terminal-match').forEach(line=>line.classList.remove('terminal-match'));
    const query=find.value.toLocaleLowerCase();
    matches=query?[...output.querySelectorAll('p')].filter(line=>line.textContent.toLocaleLowerCase().includes(query)):[];
    matchIndex=matches.length?(direction?(matchIndex+direction+matches.length)%matches.length:0):-1;
    count.textContent=query?(matches.length?`${matchIndex+1} of ${matches.length} matching lines`:'No matches'):'';
    if(matchIndex>=0){matches[matchIndex].classList.add('terminal-match');matches[matchIndex].scrollIntoView({block:'nearest'});}
  }
  const openFind=()=>{findbar.hidden=false;find.focus();find.select();};
  const closeFind=()=>{findbar.hidden=true;find.value='';findMatches();input.focus();};
  async function act(action){
    closeMenus();tell('');
    if(action==='close'){closeWindow();return;}
    if(action==='save'){
      const url=URL.createObjectURL(new Blob([output.innerText+'\n'],{type:'text/plain;charset=utf-8'}));
      const link=document.createElement('a');link.href=url;link.download='thecybergeek-terminal.txt';
      document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }else if(action==='copy'){
      const selection=window.getSelection();
      const text=input.selectionStart!==input.selectionEnd?input.value.slice(input.selectionStart,input.selectionEnd):selection&&output.contains(selection.anchorNode)&&selection.toString()?selection.toString():output.innerText;
      try{await navigator.clipboard.writeText(text);tell('Copied to clipboard.');}
      catch{tell('Clipboard access is unavailable. Use Select All, then your browser’s Copy command.');}
    }else if(action==='paste'){
      try{const text=(await navigator.clipboard.readText()).replace(/[\r\n]+/g,' ');input.setRangeText(text,input.selectionStart,input.selectionEnd,'end');input.value=input.value.slice(0,input.maxLength);}
      catch{tell('Use Ctrl+V (or ⌘V) to paste into the command line.');}
    }else if(action==='select'){
      const range=document.createRange();range.selectNodeContents(output);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);return;
    }else if(action.startsWith('zoom-')){
      zoom=action==='zoom-reset'?0:Math.max(-2,Math.min(10,zoom+(action==='zoom-in'?1:-1)));applyZoom();
    }else if(action==='find'){openFind();return;}
    else if(action==='next'||action==='previous'){if(findbar.hidden||!find.value){openFind();return;}findMatches(action==='next'?1:-1);return;}
    else if(action==='find-close'){closeFind();return;}
    else if(action==='reset'||action==='clear'){
      input.value='';resetHistory();zoom=0;applyZoom();closeFind();
      if(action==='clear')output.replaceChildren();
    }else if(action==='help'){
      input.value='help';document.querySelector('#terminal-form').requestSubmit();
    }else if(action==='about')tell('TheCyberGeek Terminal: an interactive portfolio navigator styled after Parrot’s MATE Terminal. Type help for available commands.');
    if(isActive())input.focus();
  }
  panel.querySelectorAll('[data-terminal-action]').forEach(button=>button.addEventListener('click',()=>act(button.dataset.terminalAction)));
  menus.forEach((menu,index)=>{
    const summary=menu.querySelector('summary');
    summary.addEventListener('click',()=>menus.forEach(other=>{if(other!==menu)other.open=false;}));
    menu.addEventListener('keydown',event=>{
      const buttons=[...menu.querySelectorAll('button')];
      if(['ArrowLeft','ArrowRight'].includes(event.key)){
        event.preventDefault();closeMenus();const next=menus[(index+(event.key==='ArrowRight'?1:-1)+menus.length)%menus.length];next.open=true;next.querySelector('summary').focus();
      }else if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
        event.preventDefault();menu.open=true;const current=buttons.indexOf(document.activeElement);
        const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:current<0?(event.key==='ArrowUp'?buttons.length-1:0):(current+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;
        buttons[next].focus();
      }
    });
  });
  document.addEventListener('click',event=>{if(!event.target.closest('.terminal-menu'))closeMenus();});
  document.addEventListener('focusin',event=>{if(!event.target.closest('.terminal-menu'))closeMenus();});
  document.addEventListener('keydown',event=>{
    if(!isActive())return;
    if(event.key==='Escape'){
      const open=menus.find(menu=>menu.open);
      if(open||!findbar.hidden){event.preventDefault();event.stopImmediatePropagation();if(open){closeMenus();open.querySelector('summary').focus();}else closeFind();}
    }
  },true);
  find.addEventListener('input',()=>findMatches());
  find.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();findMatches(event.shiftKey?-1:1);}});
  // Refresh results when terminal commands change the scrollback.
  new MutationObserver(()=>{if(!findbar.hidden)findMatches();}).observe(output,{childList:true,subtree:true,characterData:true});
}};
