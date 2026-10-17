const test=require('node:test'),assert=require('node:assert/strict');
const {poseAt}=require('../assets/avatar-motion.js');
test('avatar cycles through typing, reach, mouse and return without jumping at the loop boundary',()=>{
  assert.equal(poseAt(2).pose,'typing');
  assert.equal(poseAt(6.5).pose,'reach');
  assert.equal(poseAt(8).pose,'mouse');
  assert.equal(poseAt(9.6).pose,'reach');
  assert.equal(poseAt(10).pose,'typing');
  assert.deepEqual(poseAt(0),poseAt(10));
  for(let t=0;t<28;t+=.03){
    const state=poseAt(t);
    assert.ok(Math.abs(state.mouseX)<=2&&Math.abs(state.mouseY)<=1);
    assert.ok([0,1,2].includes(state.left)&&[0,1,2].includes(state.right));
  }
});
test('typing alternates finger poses independently and includes rests',()=>{
  const poses=new Set();let independent=false,rest=false;
  for(let t=0;t<2.9;t+=.05){
    const state=poseAt(t);poses.add(state.left);poses.add(state.right);
    independent ||= state.left!==state.right;
    rest ||= state.left===0&&state.right===0;
  }
  assert.deepEqual([...poses].sort(),[0,1,2]);
  assert.ok(independent&&rest);
});
