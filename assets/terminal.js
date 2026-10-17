'use strict';
window.TCGTerminal={mount({posts,openPanel,closeWindow,archive,search,selectFilter,isActive=()=>true}) {
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  // This terminal navigates the portfolio. It never runs system commands.
  const input=$('#terminal-input'), output=$('#terminal-output');
  const history=[];let historyIndex=0;
  const print=message=>{const line=document.createElement('p');line.textContent=message;output.append(line);output.scrollTop=output.scrollHeight;};
  const printCommand=raw=>{
    const line=document.createElement('p');line.className='terminal-command';
    for(const [text,cls] of [['┌─[','prompt-branch'],['thecybergeek','prompt-user'],['@parrot','prompt-host'],[']─[','prompt-branch'],['~/','prompt-path'],[']\n└──╼ ','prompt-branch'],['$','prompt-symbol'],[' '+raw,'prompt-command']]){
      const span=document.createElement('span');span.className=cls;span.textContent=text;line.append(span);
    }
    output.append(line);output.scrollTop=output.scrollHeight;
  };
  $('#terminal-form').addEventListener('submit',event=>{
    event.preventDefault();const raw=input.value.trim();if(!raw)return;
    printCommand(raw);history.push(raw);historyIndex=history.length;input.value='';
    const [command,...args]=raw.toLowerCase().split(/\s+/);
    if(command==='help')print('YOUR WAY AROUND THE LAB\n\n  whoami          Meet TheCyberGeek\n  ls              List the room’s destinations\n  about           Open the profile\n  archive         Explore all writeups\n  research        Open vulnerability notes\n  search <query>  Find a machine or CVE\n  guidelines      Open content wiki\n  contact         Open contact channels\n  stats           Archive totals\n  pwd             Current directory\n  date            UK local date and time\n  clear           Clear the terminal\n  exit            Return to the room');
    else if(command==='whoami')print('Matthew Bach / TheCyberGeek\nCoach | Staff Content Engineer at Hack The Box | Security researcher\nBSc in Computer Science\nMaster’s degree in Cyber Security and Human Factors (first-class honours)\nOSCP | CRTP | CRTE | CWES | CPTS\nKeeping it Geeky!');
    else if(command==='pwd')print('/home/thecybergeek');
    else if(command==='date')print(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',dateStyle:'full',timeStyle:'short'}).format(new Date()));
    else if(command==='stats')print(posts.length+' archived files\n'+posts.filter(p=>p.category==='HackTheBox').length+' Hack The Box\n'+posts.filter(p=>p.category==='CVEs').length+' CVE entries');
    else if(command==='ls')print('archive/    about/    research/    guidelines/    contact/\n\nType a destination to open it.');
    else if(command==='clear')output.replaceChildren();
    else if(command==='exit')closeWindow();
    else if(['about','archive','research','guidelines','contact'].includes(command)){if(command==='archive'){search.value='';selectFilter('all');}openPanel(command);}
    else if(command==='search'){if(!args.length)print('Usage: search <machine, challenge or CVE>');else{archive.query(args.join(' '));openPanel('archive');search.focus();}}
    else print(`Unknown command: ${command}\nTry help. There’s always another way in.`);
  });
  $$('[data-command]').forEach(button=>button.addEventListener('click',()=>{input.value=button.dataset.command;$('#terminal-form').requestSubmit();if(isActive())input.focus();}));
  window.TCGTerminalMenus?.mount({input,output,closeWindow,isActive,resetHistory(){history.length=0;historyIndex=0;}});
  input.addEventListener('keydown',event=>{if(event.key!=='Tab'||!input.value.trim())return;const commands=['help','whoami','ls','about','archive','research','guidelines','search','contact','stats','pwd','date','clear','exit'];const matches=commands.filter(c=>c.startsWith(input.value.trim().toLowerCase()));if(matches.length){event.preventDefault();if(matches.length===1)input.value=matches[0]+(matches[0]==='search'?' ':'');else print(matches.join('  '));}});
  input.addEventListener('keydown',event=>{if(!['ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();historyIndex=Math.max(0,Math.min(history.length,historyIndex+(event.key==='ArrowUp'?-1:1)));input.value=history[historyIndex]||'';});

}};
