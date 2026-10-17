const test = require('node:test');
const assert = require('node:assert/strict');
const {clip} = require('../assets/room-window.js');

function inside([x,y], polygon) {
  let result = false;
  for (let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
    const [a,b]=polygon[i], [c,d]=polygon[j];
    if ((b>y)!==(d>y) && x<(c-a)*(y-b)/(d-b)+a) result=!result;
  }
  return result;
}

// Record the actual Canvas clipping commands and apply their fill rules to
// independently chosen glass, frame, and plant landmarks in the illustration.
function mask(width,height) {
  let paths=[], current;
  const clips=[];
  clip({
    beginPath() {paths=[];},
    moveTo(x,y) {current=[[x,y]];paths.push(current);},
    lineTo(x,y) {current.push([x,y]);},
    closePath() {},
    rect(x,y,w,h) {paths.push([[x,y],[x+w,y],[x+w,y+h],[x,y+h]]);},
    clip(rule) {clips.push({paths,rule});}
  },width,height);
  return ([x,y]) => clips.every(({paths,rule}) => {
    const count=paths.filter(p=>inside([x*width/1672,y*height/941],p)).length;
    return rule==='evenodd' ? count%2===1 : count>0;
  });
}

for (const [width,height] of [[836,471],[1672,941],[418,235.5]]) {
  test(`rain mask keeps glass visible and excludes foreground at ${width}x${height}`,()=>{
    const visible=mask(width,height);
    for(const point of [[340,160],[460,190],[580,200],[345,285],[455,306]]) {
      assert.equal(visible(point),true,`clear glass ${point}`);
    }
    for(const point of [
      [390,200],[522,200], // vertical dividers
      [340,60],[638,220],[500,327],[289,240], // outer frame and sill
      [304,125], // hanging vine
      [310,280],[414,301],[570,305],[625,289] // sill plants
    ]) {
      assert.equal(visible(point),false,`foreground ${point}`);
    }
  });
}
