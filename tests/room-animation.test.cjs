const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

test('room keeps a shared continuous clock across dialogs and background frame gaps', () => {
  const frames = [], avatar = [], discord = [], elements = new Map();
  const removedControls = new Set(['#motion-toggle', '#hints-toggle', '#lights-toggle']);
  const context2d = new Proxy({}, {get: (object, key) => object[key] || (() => {})});
  function element(selector) {
    if (removedControls.has(selector)) return null;
    if (!elements.has(selector)) elements.set(selector, {
      open: false, scrollWidth: 1672, clientWidth: 1440,
      classList: {add() {}, remove() {}, toggle() {}},
      addEventListener() {}, setAttribute() {}, removeAttribute() {}, focus() {},
      getContext: () => context2d,
      showModal() {this.open = true;}, close() {this.open = false;}
    });
    return elements.get(selector);
  }
  const document = {
    querySelector: element, querySelectorAll: () => [],
    addEventListener() {}, body: element('body'), documentElement: element('html'),
    hidden: false
  };
  const context = {
    document, console, Intl, Date,
    location: {hash: '#about'}, history: {pushState() {}},
    performance: {now: () => 1000},
    matchMedia: () => ({matches: true, addEventListener() {}}),
    localStorage: {getItem: () => 'paused'},
    ResizeObserver: class {observe() {}},
    setInterval() {}, requestAnimationFrame: callback => frames.push(callback),
    addEventListener() {}, ARCHIVE_POSTS: [],
    TCGArchiveUI: {mount: () => ({query() {}})},
    TCGTerminal: {mount() {}},
    TCGRoomWindow: require('../assets/room-window.js'),
    TCGAvatarMotion: {mount: () => (time, reduced = false) => avatar.push({time, reduced})},
    TCGDiscordChat: {mount: () => (time, reduced = false) => discord.push({time, reduced})}
  };
  context.window = context;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/site.js'), 'utf8'), context);
  assert.equal(element('#app-window').open, true);
  assert.equal(frames.length, 1);
  for (const time of [1016, 6000, 21000, 121000]) {
    document.hidden = time === 21000;
    frames.shift()(time);
    assert.equal(frames.length, 1, 'exactly one next frame stays scheduled');
    assert.equal(avatar.at(-1).time, (time - 1000) / 1000);
    assert.equal(avatar.at(-1).reduced, false);
    assert.deepEqual(avatar.at(-1), discord.at(-1));
  }
  assert.equal(avatar.at(-1).time, 120, 'background frame gaps do not reset the timeline');
});
