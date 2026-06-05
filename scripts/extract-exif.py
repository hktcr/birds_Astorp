#!/usr/bin/env python3
"""Extract EXIF GPS + date from all post images → data/image-exif.json

Usage:
    python3 scripts/extract-exif.py

Output: data/image-exif.json with structure:
    {
        "/images/posts/2026-05-24-vykort/PXL_123.jpg": {
            "lat": 56.1234,
            "lng": 13.0567,
            "date": "2026-05-24T10:30:00"
        },
        ...
    }
"""

import json
import os
import sys
from pathlib import Path

try:
    from PIL import Image
    from PIL.ExifTags import TAGS, GPSTAGS
except ImportError:
    print("ERROR: Pillow not installed. Run: pip3 install Pillow")
    sys.exit(1)


def dms_to_decimal(dms, ref):
    """Convert GPS DMS (degrees, minutes, seconds) to decimal."""
    degrees = float(dms[0])
    minutes = float(dms[1])
    seconds = float(dms[2])
    decimal = degrees + minutes / 60 + seconds / 3600
    if ref in ('S', 'W'):
        decimal = -decimal
    return round(decimal, 7)


def extract_exif(filepath):
    """Extract GPS coords and date from a single image."""
    result = {}
    try:
        img = Image.open(filepath)
        exif = img._getexif()
        if not exif:
            return result

        for tag_id, value in exif.items():
            tag = TAGS.get(tag_id, tag_id)

            if tag == "GPSInfo":
                gps = {}
                for k, v in value.items():
                    gps[GPSTAGS.get(k, k)] = v

                lat_dms = gps.get('GPSLatitude')
                lat_ref = gps.get('GPSLatitudeRef')
                lng_dms = gps.get('GPSLongitude')
                lng_ref = gps.get('GPSLongitudeRef')

                if lat_dms and lng_dms and lat_ref and lng_ref:
                    result['lat'] = dms_to_decimal(lat_dms, lat_ref)
                    result['lng'] = dms_to_decimal(lng_dms, lng_ref)

            elif tag == "DateTimeOriginal":
                # Convert "2026:02:05 12:08:24" → "2026-02-05T12:08:24"
                try:
                    dt = value.replace(":", "-", 2).replace(" ", "T", 1)
                    result['date'] = dt
                except:
                    pass

    except Exception as e:
        pass

    return result


def main():
    project_root = Path(__file__).parent.parent
    img_dir = project_root / "static" / "images" / "posts"
    out_file = project_root / "data" / "imageexif.json"

    if not img_dir.exists():
        print(f"ERROR: {img_dir} not found")
        sys.exit(1)

    metadata = {}
    total = 0
    with_gps = 0
    with_date = 0

    for root, dirs, files in os.walk(img_dir):
        for fname in sorted(files):
            ext = fname.lower().rsplit('.', 1)[-1] if '.' in fname else ''
            if ext not in ('jpg', 'jpeg', 'png', 'webp'):
                continue
            # Skip thumbnails
            if '-thumb-b64' in fname:
                continue

            total += 1
            filepath = os.path.join(root, fname)

            # Build URL path: /images/posts/...
            rel = os.path.relpath(filepath, project_root / "static")
            url_path = "/" + rel.replace(os.sep, "/")

            exif = extract_exif(filepath)
            if exif:
                metadata[url_path] = exif
                if 'lat' in exif:
                    with_gps += 1
                if 'date' in exif:
                    with_date += 1

    # Write output
    out_file.parent.mkdir(parents=True, exist_ok=True)
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)

    print(f"Scanned {total} images (excl. thumbnails)")
    print(f"  With GPS:  {with_gps} ({100*with_gps//max(total,1)}%)")
    print(f"  With Date: {with_date} ({100*with_date//max(total,1)}%)")
    print(f"  Written:   {out_file}")


if __name__ == "__main__":
    main()
