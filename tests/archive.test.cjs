const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const {select} = require('../assets/archive-utils.js');
const context = {window:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/archive-data.js'),'utf8'), context);
const posts = JSON.parse(JSON.stringify(context.window.ARCHIVE_POSTS));

test('CVE filter selects only vulnerability entries', () => {
  const found=select(posts,{filter:'CVEs'});
  assert.equal(found.length,5);
  assert.ok(found.every(post=>post.title.startsWith('CVE-')));
});
test('search trims input and ignores case', () => {
  const found=select(posts,{query:'  eCHoLand  '});
  assert.equal(found.length,1);
  assert.equal(found[0].title,'HackTheBox - Echoland');
});
test('search combines with category and includes tags', () => {
  assert.equal(select(posts,{filter:'CVEs',query:'Challenge'}).length,0);
  assert.equal(select(posts,{filter:'HackTheBox',query:'Challenge'}).length,13);
});
test('oldest and newest sort by publication, without mutating the index', () => {
  const before=JSON.stringify(posts);
  assert.equal(select(posts,{sort:'oldest'})[0].date,'2019-09-17');
  assert.equal(select(posts,{sort:'newest'})[0].date,'2021-03-10');
  assert.equal(JSON.stringify(posts),before);
});
test('empty results and title order are deterministic', () => {
  assert.deepEqual(select(posts,{query:'no-such-file'}),[]);
  const sorted=select(posts,{sort:'title'});
  assert.deepEqual(sorted.map(p=>p.title),posts.map(p=>p.title).sort((a,b)=>a.localeCompare(b)));
});
