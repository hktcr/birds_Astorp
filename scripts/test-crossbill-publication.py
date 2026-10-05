"""Check the crossbill publication's source, generated links and image taxonomy."""
import base64
import hashlib
import json
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SLUG = 'mindre-korsnabbar-over-maglaby'
POST_URL = '/posts/2026/10/' + SLUG + '/'
PHOTO_URL = '/images/posts/2026-10-04-' + SLUG + '/maglaby-landskap.jpg'

class Elements(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.elements = []
        self.feed(html)
    def handle_starttag(self, tag, attrs):
        self.elements.append((tag, dict(attrs)))

checklist = json.loads((ROOT / 'data/checklist-2026.json').read_text())
assert len(checklist['observations']) == 148
assert len({o['species'] for o in checklist['observations']}) == 148
last = checklist['observations'][-1]
assert last['species'] == 'Mindre korsnäbb' and last['latin'] == 'Loxia curvirostra'
assert last['date'] == '2026-10-04' and 'ungefärlig observationsplats' in last['location']
assert (last['lat'], last['lng']) == (56.101, 13.053)
assert not any(o['species'] == 'Nötkråka' for o in checklist['observations'])
for directory in ('static/data', 'docs/data'):
    assert json.loads((ROOT / directory / 'checklist-2026.json').read_text()) == checklist

post = (ROOT / 'docs' / POST_URL.strip('/') / 'index.html').read_text()
assert 'Mindre korsnäbbar över Maglaby' in post and '148/150' in post
assert 'Det blev art 148.' in post and 'Fåglarna kom inte med.' in post
assert 'https://kof.nu/obsar/?entry_id=3281' in post
assert 'https://kof.nu/obsar/?entry_id=3290' in post
assert 'notkraka-map' in post
nutcracker = (ROOT / 'docs/species/nötkråka/index.html').read_text()
nutcracker_elements = Elements(nutcracker).elements
maps = [a for t, a in nutcracker_elements if 'data-notkraka-map' in a]
assert len(maps) == 1 and maps[0]['id'] == 'notkraka-atlas-map'
assert 'Ej kryssad 2026' in nutcracker
assert PHOTO_URL not in nutcracker, 'A landscape must not become a nutcracker portrait'
for asset in ('css/notkraka-map.css', 'js/notkraka-map.js', 'data/notkraka-astorp-fallback.json'):
    assert asset in post, f'Missing map reference: {asset}'
    assert asset in nutcracker, f'Missing atlas map reference: {asset}'
    assert (ROOT / 'docs' / asset).read_bytes() == (ROOT / 'static' / asset).read_bytes()
assert '56.1005396' not in post and '13.0529855' not in post
images = [a for t, a in Elements(post).elements if t == 'img' and a.get('src') == PHOTO_URL]
assert len(images) == 1 and 'Inga fåglar' in images[0]['alt']
for root in ('static', 'docs'):
    photo = ROOT / root / PHOTO_URL.lstrip('/')
    assert photo.is_file()
    thumbnail = photo.with_name(base64.urlsafe_b64encode(photo.name.encode()).decode().rstrip('=') + '-thumb-b64.jpg')
    assert thumbnail.is_file()
assert hashlib.sha256((ROOT/'static'/PHOTO_URL.lstrip('/')).read_bytes()).digest() == hashlib.sha256((ROOT/'docs'/PHOTO_URL.lstrip('/')).read_bytes()).digest()

home = (ROOT/'docs/index.html').read_text()
assert POST_URL in home and 'Mindre korsnäbbar över Maglaby' in home
assert 'Senaste notis' in home
assert POST_URL in (ROOT/'docs/posts/index.html').read_text()
assert POST_URL in (ROOT/'docs/index.xml').read_text()
assert POST_URL in (ROOT/'docs/posts/index.xml').read_text()
assert POST_URL in (ROOT/'docs/sitemap.xml').read_text()
wheel = json.loads((ROOT/'static/data/species_days_historic.json').read_text())
assert wheel['Mindre korsnäbb']['10-04'] == 1
assert (ROOT/'static/data/species_days_historic.json').read_bytes() == (ROOT/'docs/data/species_days_historic.json').read_bytes()
atlas = (ROOT/'docs/species/mindre-korsnäbb/index.html').read_text()
assert POST_URL in atlas and '148' in atlas and '2026-10-04' in atlas
assert PHOTO_URL not in atlas, 'A landscape must not become a crossbill portrait'
gallery = Elements((ROOT/'docs/galleri/index.html').read_text())
photos = [a for t,a in gallery.elements if t=='a' and a.get('data-image-src')==PHOTO_URL]
assert len(photos)==1 and photos[0]['data-species']=='landskap'
assert 'vagen-mot-150' not in home and 'vagen-mot-150' not in (ROOT/'docs/posts/index.html').read_text()
print('PASS: 148 species, current post/home/feed/atlas, landscape taxonomy, original + thumbnail, approximate locality, no nutcracker tick, draft remains hidden.')
