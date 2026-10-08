const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'static/js/contact.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'docs/kontakt/index.html'), 'utf8');

// Native fallback must never send form fields through an HTTP request.
const formTag = html.match(/<form\b[^>]*>/)[0];
assert.match(formTag, /method=(?:"dialog"|dialog)(?:\s|>)/);
assert(!/\baction=/.test(formTag));
assert(!/<(?:input|textarea)\b[^>]*\bname=/.test(html));
assert.match(html, /mailto:HLG\.Karlsson@gmail\.com/);

function scenario(values, valid = true) {
    const elements = {};
    for (const id of ['form', 'first-name', 'last-name', 'email', 'message']) {
        elements['contact-' + id] = {
            value: values[id] || '', listeners: {}, validation: '',
            addEventListener(type, fn) { this.listeners[type] = fn; },
            setCustomValidity(value) { this.validation = value; }
        };
    }
    elements['contact-form'].reportValidity = () => valid && !elements['contact-message'].validation;
    const location = { href: 'https://astorpsfaglar.se/kontakt/' };
    vm.runInNewContext(source, { document: { getElementById: id => elements[id] }, window: { location } });
    let prevented = false;
    const before = Object.values(elements).map(e => e.value);
    elements['contact-form'].listeners.submit({ preventDefault() { prevented = true; } });
    assert(prevented);
    assert.deepEqual(Object.values(elements).map(e => e.value), before, 'Keep visitor input intact');
    return { location, elements };
}

const values = { 'first-name': 'Åsa &', 'last-name': 'Öberg', email: 'test+bird@example.org', message: 'Fågeltips?\n&bcc=annan@example.org # + % 🐦' };
const good = new URL(scenario(values).location.href);
assert.equal(good.protocol, 'mailto:');
assert.equal(good.pathname, 'HLG.Karlsson@gmail.com');
assert.deepEqual([...good.searchParams.keys()], ['subject', 'body']);
assert.equal(good.searchParams.get('subject'), 'Kontakt via Fågelåret i Åstorp: Åsa & Öberg');
assert.equal(good.searchParams.get('body'), 'Namn: Åsa & Öberg\r\nE-post: test+bird@example.org\r\n\r\n' + values.message);
assert.equal(scenario(values, false).location.href, 'https://astorpsfaglar.se/kontakt/');
const blank = scenario({ ...values, message: ' \n ' });
assert.equal(blank.location.href, 'https://astorpsfaglar.se/kontakt/');
assert.equal(blank.elements['contact-message'].validation, 'Skriv ett meddelande.');
blank.elements['contact-message'].listeners.input();
assert.equal(blank.elements['contact-message'].validation, '');
const unnamed = new URL(scenario({ email: values.email, message: 'Hej!' }).location.href);
assert.equal(unnamed.searchParams.get('subject'), 'Kontakt via Fågelåret i Åstorp');
console.log('PASS: mailto encoding, validation, retained fields, and no HTTP form fallback.');
