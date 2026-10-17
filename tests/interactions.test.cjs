// Event-level integration tests. These exercise the shipped modules in a small
// DOM adapter; they do not claim to validate browser layout or native dialogs.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'../assets',name),'utf8');
class Element{
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attributes={};this.events={};this.value='';this.checked=false;this.hidden=false;this.textContent='';this.classList={toggle(){},add(){}};}
  append(...children){this.children.push(...children);}
  replaceChildren(...children){this.children=children;}
  setAttribute(key,value){this.attributes[key]=String(value);}
  addEventListener(name,fn){(this.events[name]??=[]).push(fn);}
  async fire(name,extra={}){const e={target:this,currentTarget:this,preventDefault(){this.prevented=true;},...extra};for(const fn of this.events[name]||[])await fn(e);return e;}
  requestSubmit(){return this.fire('submit');}
  focus(){this.focused=true;}
  querySelector(selector){return this.children.find(c=>c.tagName===selector.toUpperCase());}
}
function setup({query='',saved=[],session=null}={}){
  const ids={};for(const id of ['archive-results','archive-search','archive-sort','saved-only','all-count','result-count','empty-results','load-more','reset-search','archive-summary','terminal-input','terminal-output','terminal-form'])ids[id]=new Element();
  ids['archive-sort'].value='newest';
  const filters=['all','HackTheBox','CVEs'].map(value=>{const b=new Element('button');b.dataset.filter=value;return b;});
  const commands=['help','whoami','ls','archive','research','contact'].map(command=>{const b=new Element('button');b.dataset.command=command;return b;});
  const home=new Element('a');home.href='https://example.test/';
  const storage=new Map([['tcg-saved',JSON.stringify(saved)]]),sessions=new Map(session?[['tcg-archive',JSON.stringify(session)]]:[]),navigations=[];
  const document={querySelector:s=>s.startsWith('#')?ids[s.slice(1)]||null:s==='[data-home]'?home:null,querySelectorAll:s=>s==='[data-filter]'?filters:s==='[data-command]'?commands:[],createElement:tag=>new Element(tag),documentElement:new Element(),addEventListener(){}};
  const location={href:'https://example.test/archive/'+query,search:query,pathname:'/archive/',assign:url=>navigations.push(String(url))};
  const storageAPI=map=>({getItem:key=>map.get(key)||null,setItem:(key,v)=>map.set(key,v)});
  const context={window:{},document,location,localStorage:storageAPI(storage),sessionStorage:storageAPI(sessions),URL,URLSearchParams,Intl,Date,Set,navigator:{clipboard:{writeText:async text=>{context.copied=text;}}}};
  context.window=context;vm.createContext(context);for(const file of ['archive-data.js','archive-utils.js','archive-ui.js','terminal.js'])vm.runInContext(read(file),context);
  return{ids,filters,commands,context,navigations,storage,load:file=>vm.runInContext(read(file),context)};
}
test('archive shows 12 of 55; pagination, filters, search and reset interact',async()=>{
  const e=setup();e.context.window.TCGArchiveUI.mount(e.context.window.ARCHIVE_POSTS);
  assert.equal(e.ids['archive-results'].children.length,12);assert.equal(e.ids['result-count'].textContent,'12 OF 55 FILES');
  await e.ids['load-more'].fire('click');assert.equal(e.ids['archive-results'].children.length,24);
  await e.filters[2].fire('click');assert.equal(e.ids['archive-results'].children.length,5);assert.equal(e.ids['load-more'].hidden,true);
  e.ids['archive-search'].value='no-such-file';await e.ids['archive-search'].fire('input');assert.equal(e.ids['empty-results'].hidden,false);
  await e.ids['reset-search'].fire('click');assert.equal(e.ids['result-count'].textContent,'12 OF 55 FILES');
});
test('saving and removing a file updates saved-only view and browser storage',async()=>{
  const e=setup();e.context.window.TCGArchiveUI.mount(e.context.window.ARCHIVE_POSTS);
  await e.ids['archive-results'].children[0].children[1].fire('click');assert.equal(JSON.parse(e.storage.get('tcg-saved')).length,1);
  e.ids['saved-only'].checked=true;await e.ids['saved-only'].fire('change');assert.equal(e.ids['archive-results'].children.length,1);
  await e.ids['archive-results'].children[0].children[1].fire('click');assert.equal(e.ids['archive-results'].children.length,0);assert.equal(e.ids['empty-results'].hidden,false);
});
test('URL query overrides previous search and restored filters',()=>{
  const e=setup({query:'?category=HackTheBox&q=Echoland',session:{filter:'CVEs',query:'nothing',sort:'oldest',saved:true}});
  e.context.window.TCGArchiveUI.mount(e.context.window.ARCHIVE_POSTS);assert.equal(e.ids['archive-results'].children.length,1);assert.match(e.ids['archive-results'].children[0].children[0].href,/Echoland/);
});
test('terminal commands, autocomplete and history work with navigation callbacks',async()=>{
  const e=setup(),opened=[],queries=[];
  e.context.window.TCGTerminal.mount({posts:e.context.window.ARCHIVE_POSTS,openPanel:p=>opened.push(p),closeWindow:()=>opened.push('home'),archive:{query:q=>queries.push(q)},search:{focus(){}},selectFilter(){}});
  const run=async value=>{e.ids['terminal-input'].value=value;await e.ids['terminal-form'].fire('submit');};
  await run('stats');assert.match(e.ids['terminal-output'].children.at(-1).textContent,/55 archived files/);
  assert.equal(e.ids['terminal-output'].children[0].children.map(s=>s.textContent).join(''),'┌─[thecybergeek@parrot]─[~/]\n└──╼ $ stats');
  await run('pwd');assert.equal(e.ids['terminal-output'].children.at(-1).textContent,'/home/thecybergeek');
  await run('search Echoland');assert.deepEqual(queries,['echoland']);assert.equal(opened.at(-1),'archive');
  await e.ids['terminal-input'].fire('keydown',{key:'ArrowUp'});assert.equal(e.ids['terminal-input'].value,'search Echoland');
  e.ids['terminal-input'].value='rese';await e.ids['terminal-input'].fire('keydown',{key:'Tab'});assert.equal(e.ids['terminal-input'].value,'research');
  await run('unknown');assert.match(e.ids['terminal-output'].children.at(-1).textContent,/Unknown command/);
  await run('clear');assert.equal(e.ids['terminal-output'].children.length,0);
  await run('exit');assert.equal(opened.at(-1),'home');
});
test('full-page terminal search retains its query in the destination URL',async()=>{
  const e=setup();delete e.ids['archive-results'];e.load('page.js');
  e.ids['terminal-input'].value='search Kernel Adventures';await e.ids['terminal-form'].fire('submit');
  assert.equal(e.navigations.at(-1),'https://example.test/archive/?q=kernel%20adventures&category=all');
});
test('HTB badge handles cached images, loading and failure with a visible fallback',async()=>{
  const e=setup(),pending=new Element('img'),cached=new Element('img');
  for(const image of [pending,cached]){
    image.hidden=true;image.nextElementSibling=new Element('span');
  }
  pending.complete=false;pending.naturalWidth=0;
  cached.complete=true;cached.naturalWidth=300;
  const queryAll=e.context.document.querySelectorAll;
  e.context.document.querySelectorAll=s=>s==='[data-htb-badge]'?[pending,cached]:queryAll(s);
  e.load('contact.js');
  assert.equal(cached.hidden,false);assert.equal(cached.nextElementSibling.hidden,true);
  assert.equal(pending.hidden,true);assert.equal(pending.nextElementSibling.hidden,false);
  pending.naturalWidth=300;await pending.fire('load');
  assert.equal(pending.hidden,false);assert.equal(pending.nextElementSibling.hidden,true);
  await pending.fire('error');
  assert.equal(pending.hidden,true);assert.equal(pending.nextElementSibling.hidden,false);
});
const menuFixture=()=>{
  const e=setup(),panel=new Element(),status=new Element(),find=new Element('input'),findbar=new Element(),count=new Element();
  findbar.hidden=true;find.select=()=>{};
  const actions={};for(const name of ['save','close','copy','paste','select','zoom-in','zoom-out','zoom-reset','find','next','previous','find-close','reset','clear','help','about']){actions[name]=new Element('button');actions[name].dataset.terminalAction=name;}
  const menus=Array.from({length:6},()=>{const menu=new Element(),summary=new Element('summary');menu.open=false;menu.querySelector=()=>summary;menu.querySelectorAll=()=>[actions.copy,actions.paste];return menu;});
  let zoom,closed=0,resets=0;
  panel.style={setProperty:(_,value)=>zoom=value};panel.querySelectorAll=s=>s==='.terminal-menu'?menus:Object.values(actions);
  const query=e.context.document.querySelector;
  e.context.document.querySelector=s=>({'.terminal-panel':panel,'#terminal-findbar':findbar,'#terminal-find':find,'#terminal-find-count':count,'#terminal-menu-status':status}[s]||query(s));
  const input=e.ids['terminal-input'],output=e.ids['terminal-output'];
  input.maxLength=160;input.selectionStart=0;input.selectionEnd=0;
  input.setRangeText=text=>input.value=text;
  output.querySelectorAll=s=>s==='p'?output.children:output.children.filter(p=>p.matched);
  output.contains=()=>false;output.innerText='terminal output';
  e.context.getSelection=()=>null;e.context.MutationObserver=class{observe(){}};
  e.load('terminal-menus.js');
  e.context.TCGTerminalMenus.mount({input,output,closeWindow(){closed++;},isActive:()=>true,resetHistory(){resets++;}});
  const line=text=>{const p=new Element('p');p.textContent=text;p.scrollIntoView=()=>{};p.classList={add(){p.matched=true;},remove(){p.matched=false;}};output.append(p);return p;};
  return{...e,input,output,find,findbar,count,status,menus,line,click:name=>actions[name].fire('click'),get zoom(){return zoom;},get closed(){return closed;},get resets(){return resets;}};
};
test('terminal menus search and cycle scrollback, then close search',async()=>{
  const e=menuFixture();const first=e.line('archive loaded'),second=e.line('ARCHIVE saved');e.line('help');
  await e.click('find');assert.equal(e.findbar.hidden,false);
  e.find.value='archive';await e.find.fire('input');assert.equal(e.count.textContent,'1 of 2 matching lines');assert.equal(first.matched,true);
  await e.click('next');assert.equal(e.count.textContent,'2 of 2 matching lines');assert.equal(second.matched,true);
  await e.click('next');assert.equal(first.matched,true);
  await e.click('previous');assert.equal(second.matched,true);
  await e.click('find-close');assert.equal(e.findbar.hidden,true);assert.equal(second.matched,false);
});
test('terminal menus zoom, reset scrollback/history, and close',async()=>{
  const e=menuFixture();e.line('keep on reset');e.menus[0].open=true;
  await e.click('zoom-in');assert.equal(e.zoom,'1px');assert.equal(e.menus[0].open,false);
  await e.click('reset');assert.equal(e.zoom,'0px');assert.equal(e.output.children.length,1);assert.equal(e.resets,1);
  await e.click('clear');assert.equal(e.output.children.length,0);assert.equal(e.resets,2);
  await e.click('close');assert.equal(e.closed,1);
});
test('terminal menu clipboard reports denied access and never executes pasted commands',async()=>{
  const e=menuFixture();await e.click('copy');assert.equal(e.context.copied,'terminal output');
  e.context.navigator.clipboard.readText=async()=> 'help\narchive';
  await e.click('paste');assert.equal(e.input.value,'help archive');assert.equal(e.output.children.length,0);
  e.context.navigator.clipboard.readText=async()=>{throw Error('denied');};
  await e.click('paste');assert.match(e.status.textContent,/Ctrl\+V/);
});
