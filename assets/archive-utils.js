'use strict';
// Pure selection logic shared by the UI and its automated checks.
((root)=>{
  const select=(posts,{filter='all',query='',sort='newest'}={})=>{
    const needle=query.trim().toLowerCase();
    return posts.filter(post=>(filter==='all'||post.category===filter)&&`${post.title} ${post.category} ${(post.tags||[]).join(' ')}`.toLowerCase().includes(needle)).sort((a,b)=>sort==='title'?a.title.localeCompare(b.title):sort==='oldest'?a.date.localeCompare(b.date):b.date.localeCompare(a.date));
  };
  const api={select};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.TCGArchive=api;
})(globalThis);
