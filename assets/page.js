'use strict';
(() => {
  const posts=window.ARCHIVE_POSTS||[];
  const archive=window.TCGArchiveUI.mount(posts);
  document.documentElement.classList.add('js');
  const home=document.querySelector('[data-home]').href;
  document.querySelector('#expand-terminal')?.addEventListener('click',event=>{
    const maximized=document.querySelector('.terminal-desktop').classList.toggle('window-maximized');
    event.currentTarget.setAttribute('aria-pressed',String(maximized));
    event.currentTarget.setAttribute('aria-label',maximized?'Restore terminal size':'Maximize terminal');
    event.currentTarget.textContent=maximized?'❐':'□';
  });
  let pendingArchive='';
  const navigate=name=>location.assign(name==='wiki' ? 'https://wiki.thecybergeek.co.uk/' : new URL(name==='archive'&&pendingArchive?pendingArchive:name+'/',home));
  document.querySelectorAll('[data-article]').forEach(link=>{const post=posts.find(p=>p.title===link.dataset.article);if(post)link.href=post.url;});
  document.querySelector('#view-cves')?.addEventListener('click',()=>location.assign(new URL('archive/?category=CVEs',home)));
  if(document.querySelector('#terminal-form'))window.TCGTerminal.mount({posts,openPanel:navigate,closeWindow:()=>location.assign(home),archive:{query:(query,category='all')=>{pendingArchive='archive/?q='+encodeURIComponent(query)+'&category='+encodeURIComponent(category);}},search:{focus(){}},selectFilter(){pendingArchive='archive/?category=all&q=';}});
  if(document.querySelector('#terminal-form'))document.addEventListener('keydown',event=>{if(event.key==='Escape')location.assign(home);});
})();
