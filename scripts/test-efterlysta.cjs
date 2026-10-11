const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const source = fs.readFileSync(path.join(__dirname, '../content/efterlysta.md'), 'utf8');
const hashes = {
    obsData: '8ccdf1926264ef2a85d807e4fd6c9d621984cc05ff09d36c31a5155dc01ad320',
    tomtkryssInfo: 'e9c1ab66ab4c4493ff965913d7a689879a39738881fd30c61a9d802bae345e8f',
    forstafyndInfo: '5acfeda8d1100286054e4bbf75d0c791ecbbe646786f9259ede5be07463aefcf',
    fetchWindows: '60d0eb4cf6c9240f60547f8f2c79eb3d100862999248af8c024488a98a46bb83'
};
for (const [name, expected] of Object.entries(hashes)) {
    const raw = source.match(new RegExp('const ' + name + ' = (.*);'))[1];
    assert.equal(crypto.createHash('sha256').update(raw).digest('hex'), expected, 'Preserve original published ' + name);
}
assert.equal((source.match(/>WANTED<\/div>/g) || []).length, 50);
assert.equal((source.match(/class="bounty-name"/g) || []).length, 53);
assert.match(source, /50 märkta som efterlysta och 3 med dokumenterade fynd/);
assert(!source.includes('senaste 7 dagarna'));
assert(!source.includes('map-lightbox'));
assert(!source.includes('classList.add("heat-'));

const elements = new Map();
const callbacks = {};
function element(id) {
    if (!elements.has(id)) elements.set(id, {
        innerHTML: '', textContent: '', open: false, style: {}, listeners: {},
        classList: {add() {}, remove() {}},
        showModal() {this.open = true;}, close() {this.open = false;},
        addEventListener(event, fn) {this.listeners[event] = fn;}
    });
    return elements.get(id);
}
const map = {
    layers: [], setView() {return this;}, invalidateSize() {},
    eachLayer(fn) {this.layers.slice().forEach(fn);},
    removeLayer(layer) {this.layers = this.layers.filter(x => x !== layer);},
    fitBounds(bounds) {this.bounds = bounds;}
};
class TileLayer {addTo(m) {m.layers.push(this);return this;}}
const L = {
    TileLayer, map: () => map, tileLayer: () => new TileLayer(), latLngBounds: x => x,
    circleMarker: coords => ({coords, addTo(m) {m.layers.push(this);return this;}, bindPopup(html) {this.popup = html;return this;}})
};
const context = vm.createContext({
    document: {getElementById: element, querySelectorAll: () => [], body: element('body'), addEventListener: (event, fn) => callbacks[event] = fn},
    L, setTimeout: fn => fn(), setInterval() {}, console
});
vm.runInContext(source.match(/<script>\s*([\s\S]*?)<\/script>/)[1], context);
assert.equal(vm.runInContext('getFetchWindow(102925)', context), 'Tidsperiod okänd');
vm.runInContext("openModal('102925', 'Skäggdopping')", context);
assert.match(element('modalContent').innerHTML, /Sparade fynd i Skåne/);
assert.match(element('modalContent').innerHTML, /Saknas i underlaget/);
const expected = vm.runInContext('obsData[102925].filter(r => /query=([\\d.]+),([\\d.]+)/.test(r.maps_url)).length', context);
vm.runInContext("openSkaneObsMap(obsData[102925], 'Skäggdopping')", context);
assert(element('skane-map-dialog').open);
assert.equal(map.layers.filter(x => !(x instanceof TileLayer)).length, expected);
assert.equal(map.bounds.length, expected);
assert(map.layers.filter(x => x.popup).every(x => x.popup.includes('Datum: Saknas i underlaget')));
callbacks.keydown({key: 'Escape'});
element('skane-map-dialog').listeners.keydown({key: 'Escape', preventDefault() {}, stopPropagation() {}});
assert(!element('skane-map-dialog').open);
vm.runInContext("openSkaneObsMap(obsData[102925], 'Skäggdopping')", context);
element('skane-map-dialog').listeners.cancel({preventDefault() {}});
assert(!element('skane-map-dialog').open);
vm.runInContext("openSkaneObsMap(obsData[102925], 'Skäggdopping')", context);
assert.equal(map.layers.filter(x => !(x instanceof TileLayer)).length, expected, 'Reopening must replace markers');
for (const [taxon, date] of [['100075', '21 maj 2023'], ['102936', '9 april 2024'], ['102122', '25 maj 2026']]) {
    vm.runInContext(`openModal('${taxon}', 'Testart')`, context);
    assert(element('modalContent').innerHTML.includes(date));
}
console.log('PASS: all 705 original observations preserved, truthful dates/status, separate Skåne map, markers, close and reopen.');
