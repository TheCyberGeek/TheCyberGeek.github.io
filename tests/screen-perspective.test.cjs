const test=require('node:test'),assert=require('node:assert/strict');
const matrix=require('../assets/screen-perspective.js');
const project=(m,x,y)=>[(m[0]*x+m[4]*y+m[12])/(m[3]*x+m[7]*y+1),(m[1]*x+m[5]*y+m[13])/(m[3]*x+m[7]*y+1)];
test('flat page corners fit the monitor at desktop and mobile scales',()=>{
  for(const scale of [.75,1,1.8]){
    const corners=[[966,382],[1157,395],[1150,544],[962,520]].map(p=>p.map(v=>v*scale));
    const m=matrix(1000,750,corners);
    [[0,0],[1000,0],[1000,750],[0,750]].forEach((p,i)=>{
      const actual=project(m,...p);
      actual.forEach((v,j)=>assert.ok(Math.abs(v-corners[i][j])<1e-7));
    });
    // Separate buttons sharing a source baseline remain on one projected line.
    const a=project(m,40,575),b=project(m,280,575),c=project(m,530,575);
    assert.ok(Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))<1e-7);
  }
});
