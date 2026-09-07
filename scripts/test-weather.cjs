const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../layouts/_default/vader.html'), 'utf8');
function source(name) {
  const start = html.indexOf('    function ' + name + '(');
  assert(start >= 0, name);
  const end = html.indexOf('\n    function ', start + 1);
  return html.slice(start, end < 0 ? undefined : end);
}
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
async function render(values, failure = false) {
  const elements = Object.fromEntries(ids.map(id => [id, {
    textContent: '', style: {}, attributes: {}, classList: { add() {} },
    setAttribute(name, value) { this.attributes[name] = value; }
  }]));
  const warnings = [];
  const requests = [];
  const context = vm.createContext({
    document: { getElementById: id => elements[id] || null },
    STATION_TEMP: '62040',
    console: { warn: (...args) => warnings.push(args) },
    fetch: async url => {
      requests.push(url);
      if (failure) throw new Error('Network failure');
      return { ok: true, json: async () => ({ value: values[url.match(/parameter\/(\d+)/)[1]] || [] }) };
    }
  });
  // Include the real rendering functions, with DOM IDs taken from the actual template.
  for (const name of ['buildWindNowWidget', 'setCompBar', 'getBeaufortText', 'getWindDirectionText', 'buildPressureNowWidget']) {
    let code = source(name);
    // getWindDirectionText is followed by unrelated tab setup.
    if (name === 'getWindDirectionText') code = code.slice(0, code.indexOf('\n    var tabLoaded'));
    vm.runInContext(code, context);
  }
  vm.runInContext('buildWindNowWidget(); buildPressureNowWidget();', context);
  await new Promise(resolve => setImmediate(resolve));
  return { elements, warnings, requests };
}
(async () => {
  const value = (v, date = 1788760800000) => ({ value: String(v), date });
  const good = await render({ 3: [value(180)], 4: [value(3.1)], 9: [value(1021), value(1020.5), value(1020.2), value(1020)] });
  assert.equal(good.warnings.length, 0);
  assert.equal(good.elements['wind-speed-value'].textContent, '3.1');
  assert.equal(good.elements['wind-dir-text'].textContent, 'sydlig vind');
  assert.match(good.elements['wind-timestamp'].textContent, /^Uppdaterad kl /);
  assert.equal(good.elements['pressure-now-value'].textContent, '1020.0');
  assert.equal(good.elements['pressure-trend-icon'].attributes['aria-label'], 'Lufttryck: sjunkande');
  assert(!good.requests.some(url => url.includes('/parameter/6/')), 'Pressure must not depend on unused humidity data');
  const empty = await render({});
  assert.equal(empty.warnings.length, 0);
  assert.equal(empty.elements['wind-timestamp'].textContent, 'Vinddata saknas');
  const invalid = await render({ 3: [value('invalid')], 4: [value(3)] });
  assert.equal(invalid.elements['wind-timestamp'].textContent, 'Vinddata ej tillgänglig');
  const failed = await render({}, true);
  assert.equal(failed.elements['wind-timestamp'].textContent, 'Vinddata ej tillgänglig');
  const twilight = fs.readFileSync(path.join(__dirname, '../static/js/twilight.js'), 'utf8');
  const start = twilight.indexOf('    function renderWheel(');
  const end = twilight.indexOf('\n    function ', start + 1);
  const hiddenContext = vm.createContext({ window: { devicePixelRatio: 1 } });
  vm.runInContext(twilight.slice(start, end), hiddenContext);
  for (const width of [0, 40, 82]) {
    hiddenContext.canvas = {
      parentElement: { getBoundingClientRect: () => ({ width }) },
      getContext() { throw new Error('Hidden/tiny canvas must not draw negative radii'); }
    };
    vm.runInContext('renderWheel(canvas)', hiddenContext);
  }
  console.log('PASS: hidden and narrow daylight canvas.');
  console.log('PASS: current weather, empty values, invalid values, network failure.');
})().catch(error => { console.error(error); process.exitCode = 1; });
