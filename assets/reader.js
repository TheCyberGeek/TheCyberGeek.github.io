'use strict';
(() => {
  document.querySelector('#copy-link')?.addEventListener('click',async()=>{
    const status=document.querySelector('#reader-status');
    try{await navigator.clipboard.writeText(location.href);status.textContent='Article link copied.';}catch{status.textContent='Copy this address: '+location.href;}
  });
  document.querySelector('#reader-save')?.addEventListener('click',()=>{
    let values=[];try{values=JSON.parse(localStorage.getItem('tcg-saved')||'[]');}catch{}if(!Array.isArray(values))values=[];
    const key=location.pathname,on=values.includes(key);values=on?values.filter(v=>v!==key):[...values,key];
    try{localStorage.setItem('tcg-saved',JSON.stringify(values));update();document.querySelector('#reader-status').textContent=on?'Removed from saved files.':'Saved to your archive reading list.';}catch{document.querySelector('#reader-status').textContent='Your browser could not save this file. You can bookmark the page instead.';}
  });
  function update(){let values=[];try{values=JSON.parse(localStorage.getItem('tcg-saved')||'[]');}catch{}const on=Array.isArray(values)&&values.includes(location.pathname),b=document.querySelector('#reader-save');if(b){b.textContent=on?'★ Saved':'☆ Save file';b.setAttribute('aria-pressed',String(on));}}
  update();
})();
