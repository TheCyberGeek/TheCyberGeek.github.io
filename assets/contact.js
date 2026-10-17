'use strict';
(() => {
  document.querySelectorAll('[data-htb-badge]').forEach(image=>{
    const fallback=image.nextElementSibling;
    const show=loaded=>{image.hidden=!loaded;fallback.hidden=loaded;};
    image.addEventListener('load',()=>show(image.naturalWidth>0));
    image.addEventListener('error',()=>show(false));
    if(image.complete)show(image.naturalWidth>0);
  });
})();
