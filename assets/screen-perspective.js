/* Map a flat page onto the four corners of the illustrated monitor. */
(function(root){
  function matrix(width,height,corners){
    const source=[[0,0],[width,0],[width,height],[0,height]],rows=[];
    source.forEach(([x,y],i)=>{
      const [u,v]=corners[i];
      rows.push([x,y,1,0,0,0,-u*x,-u*y,u]);
      rows.push([0,0,0,x,y,1,-v*x,-v*y,v]);
    });
    for(let c=0;c<8;c++){
      let pivot=c;
      for(let r=c+1;r<8;r++)if(Math.abs(rows[r][c])>Math.abs(rows[pivot][c]))pivot=r;
      [rows[c],rows[pivot]]=[rows[pivot],rows[c]];
      const divisor=rows[c][c];
      if(Math.abs(divisor)<1e-12)throw new Error('Invalid screen corners');
      for(let k=c;k<=8;k++)rows[c][k]/=divisor;
      for(let r=0;r<8;r++)if(r!==c){const factor=rows[r][c];for(let k=c;k<=8;k++)rows[r][k]-=factor*rows[c][k];}
    }
    const [a,b,c,d,e,f,g,h]=rows.map(row=>row[8]);
    return [a,d,0,g,b,e,0,h,0,0,1,0,c,f,0,1];
  }
  if(typeof module!=='undefined'&&module.exports)module.exports=matrix;
  else root.TCGScreenPerspective=matrix;
})(typeof window!=='undefined'?window:globalThis);
