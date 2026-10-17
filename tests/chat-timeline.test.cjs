const test=require('node:test'),assert=require('node:assert/strict');
const {at,messages,SEND,SWITCH}=require('../assets/chat-timeline.js');
test('type, send, then click the other conversation in order',()=>{
  for(let turn=0;turn<4;turn++){
    const start=turn*10,person=turn%2,id=`sent-${turn}`;
    assert.equal(at(start).active,person);
    assert.ok(at(start+3).draft>at(start+1).draft);
    assert.ok(!messages(person,start+SEND-.01).some(m=>m.id===id));
    const sent=at(start+SEND+.01);
    assert.equal(sent.draft,0);assert.equal(sent.send,true);
    assert.equal(sent.avatar.pose,'typing');assert.equal(sent.avatar.right,2);
    assert.ok(messages(person,start+SEND+.01).some(m=>m.id===id));
    assert.equal(at(start+SWITCH-.01).active,person);
    const clicked=at(start+SWITCH+.01);
    assert.equal(clicked.active,1-person);assert.equal(clicked.click,true);
    assert.equal(clicked.avatar.pose,'mouse');
    assert.equal(clicked.draft,0);
  }
});
test('both conversations retain sent messages and receive replies while away',()=>{
  assert.ok(messages(0,19).some(m=>m.id==='sent-0'));
  assert.ok(messages(0,19).some(m=>m.id==='reply-0'));
  assert.ok(messages(1,21.1).some(m=>m.id==='sent-1'));
  assert.ok(messages(1,21.1).some(m=>m.id==='reply-1'));
  for(const person of [0,1]){
    const history=messages(person,20000);
    assert.equal(history.length,6);
    assert.equal(new Set(history.map(m=>m.id)).size,history.length);
  }
});
test('input growth happens only with typing and send is the final keypress',()=>{
  let previous=at(0);
  for(let t=.01;t<40;t+=.01){
    const current=at(t);
    if(current.draft>previous.draft){
      assert.equal(current.avatar.pose,'typing');
      assert.ok(current.avatar.left||current.avatar.right);
    }
    if(current.phase>=6.2){assert.equal(current.avatar.left,0);assert.equal(current.avatar.right,0);}
    previous=current;
  }
});
