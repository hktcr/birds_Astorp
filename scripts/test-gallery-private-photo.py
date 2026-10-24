#!/usr/bin/env python3
"""Check explicitly private gallery locations stay out of public content."""
import json
from html.parser import HTMLParser
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
RECORDS = json.loads((ROOT / 'data/gallery_photos.json').read_text())

class GalleryParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.items = {}
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'a' and 'gallery-item' in attrs.get('class', '').split():
            self.items[attrs['data-image-src']] = attrs

gallery = GalleryParser()
gallery.feed((ROOT / 'docs/galleri/index.html').read_text())
private = [record for record in RECORDS.values() if record.get('map_private')]
assert private, 'Expected at least one private-position photo'
allowed_fields = {'id', 'url', 'post', 'title', 'date', 'width', 'height', 'thumb',
                  'caption', 'date_label', 'sort_date', 'date_source',
                  'display_title', 'map_private'}
for record in private:
    assert set(record) <= allowed_fields, 'Unexpected public metadata field'
    attrs = gallery.items[record['url']]
    assert json.loads(attrs['data-locations']) == [], 'Private photo has a map location'
    assert json.loads(attrs['data-review']) == record
    assert attrs['data-image-alt'] == record['caption']
    assert attrs['data-type'] == 'foto'
    assert attrs['data-species'] == 'landskap'
    assert record['caption'] in (ROOT / 'docs' / record['post'].lstrip('/') / 'index.html').read_text()
    for kind in ['url', 'thumb']:
        source = ROOT / 'static' / record[kind].lstrip('/')
        built = ROOT / 'docs' / record[kind].lstrip('/')
        assert source.read_bytes() == built.read_bytes()
        with Image.open(source) as image:
            assert not image.getexif(), 'Public image contains EXIF'
            assert set(image.info) <= {'jfif', 'jfif_version', 'jfif_unit', 'jfif_density'}, 'Public image has unreviewed metadata'
            if kind == 'url':
                assert image.size == (record['width'], record['height'])
    exif_path = ROOT / 'data/imageexif.json'
    if exif_path.exists():
        assert record['url'] not in json.loads(exif_path.read_text()), 'Private photo entered the public EXIF index'

print(f'PASS: {len(private)} private-position gallery photo(s), no public coordinates or EXIF; source/build bytes and caption match.')
