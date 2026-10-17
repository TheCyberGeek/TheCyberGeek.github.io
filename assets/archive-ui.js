'use strict';
window.TCGArchiveUI = (() => {
  function mount(posts) {
    const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
    const results=$('#archive-results'),search=$('#archive-search'),sort=$('#archive-sort'),savedOnly=$('#saved-only');
    if(!results)return null;
    let filter='all',visible=12,saved=new Set();
    const key=post=>new URL(post.url,location.href).pathname;
    try {const value=JSON.parse(localStorage.getItem('tcg-saved')||'[]');if(Array.isArray(value))saved=new Set(value);}catch{}
    try {const state=JSON.parse(sessionStorage.getItem('tcg-archive')||'null');if(state){filter=state.filter||'all';search.value=state.query||'';sort.value=state.sort||'newest';visible=Math.max(12,Number(state.visible)||12);savedOnly.checked=!!state.saved;}}catch{}
    const params=new URLSearchParams(location.search);
    if(params.has('category'))filter=params.get('category');
    if(params.has('q'))search.value=params.get('q');
    if(params.has('q')||params.has('category')){savedOnly.checked=false;visible=12;}
    if(!['all',...posts.map(p=>p.category)].includes(filter))filter='all';
    const dateLabel=date=>new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));
    function render() {
      const all=window.TCGArchive.select(posts,{filter,query:search.value,sort:sort.value});
      const matches=savedOnly.checked?all.filter(p=>saved.has(key(p))):all;
      results.replaceChildren();
      matches.slice(0,visible).forEach(post=>{
        const item=document.createElement('div');item.className='file-item';
        const row=document.createElement('a');row.className='file-row';row.href=post.url;
        const icon=document.createElement('span');icon.className='file-icon';icon.textContent=post.category==='CVEs'?'{!}':'▤';icon.setAttribute('aria-hidden','true');
        const label=document.createElement('span'),title=document.createElement('h3'),meta=document.createElement('small');
        title.textContent=post.title.replace(/^HackTheBox\s*[-–:]\s*/i,'');
        meta.textContent=post.category+' / '+(post.tags.includes('Challenge')?'Challenge':'Walkthrough')+' / '+dateLabel(post.date);
        label.append(title,meta);
        const date=document.createElement('time');date.dateTime=post.date;date.textContent=dateLabel(post.date).toUpperCase();
        const arrow=document.createElement('span');arrow.textContent='→';arrow.setAttribute('aria-hidden','true');
        row.append(icon,label,date,arrow);
        const bookmark=document.createElement('button');bookmark.className='save-file';
        const refresh=()=>{const on=saved.has(key(post));bookmark.textContent=on?'★':'☆';bookmark.setAttribute('aria-pressed',String(on));bookmark.setAttribute('aria-label',(on?'Unsave ':'Save ')+post.title);bookmark.title=on?'Remove from saved files':'Save for later';};refresh();
        bookmark.addEventListener('click',()=>{const id=key(post);if(saved.has(id))saved.delete(id);else saved.add(id);try{localStorage.setItem('tcg-saved',JSON.stringify([...saved]));}catch{}if(savedOnly.checked){render();savedOnly.focus();}else refresh();});
        item.append(row,bookmark);results.append(item);
      });
      $('#all-count').textContent=posts.length;
      $('#result-count').textContent=`${Math.min(visible,matches.length)} OF ${matches.length} FILES`;
      $('#empty-results').hidden=matches.length!==0;$('#load-more').hidden=visible>=matches.length;
      $$('[data-filter]').forEach(b=>{const on=b.dataset.filter===filter;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
      try{sessionStorage.setItem('tcg-archive',JSON.stringify({filter,query:search.value,sort:sort.value,visible,saved:savedOnly.checked}));}catch{}
    }
    function selectFilter(value){filter=value;visible=12;render();}
    function query(value,category='all'){search.value=value;savedOnly.checked=false;selectFilter(category);}
    $$('[data-filter]').forEach(b=>b.addEventListener('click',()=>selectFilter(b.dataset.filter)));
    search.addEventListener('input',()=>{visible=12;render();});sort.addEventListener('change',()=>{visible=12;render();});savedOnly.addEventListener('change',()=>{visible=12;render();});
    $('#load-more').addEventListener('click',()=>{const previous=visible;visible+=12;render();results.children[previous]?.querySelector('a').focus();});
    $('#reset-search').addEventListener('click',()=>{query('');search.focus();});
    const summary=$('#archive-summary');
    if(summary)for(const category of ['HackTheBox','CVEs']){const b=document.createElement('button');b.type='button';b.className='archive-stat';const n=document.createElement('strong');n.textContent=posts.filter(p=>p.category===category).length;const label=document.createElement('span');label.textContent=category==='HackTheBox'?'HACK THE BOX':category.toUpperCase();b.append(n,label);b.addEventListener('click',()=>query('',category));summary.append(b);}
    render();return {query,selectFilter,render};
  }
  return {mount};
})();
