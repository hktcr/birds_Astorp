#!/usr/bin/env python3
"""Extract a pinned, licensed AviList v2026 sequence without contacting avilist.org."""
import csv
import hashlib
import io
import json
import pathlib
import urllib.request
ROOT = pathlib.Path(__file__).resolve().parents[1]
COMMIT = "01264126448bd3d5d3bf69102abbfe98d9e3b489"
BLOB = "a5f81a9cc324635297b67a88a2e32044879ea65d"
BASE = "https://raw.githubusercontent.com/alchaincyf/huashu-bird-sticker/" + COMMIT
URL = BASE + "/data/species.csv"
with urllib.request.urlopen(URL, timeout=90) as response:
    raw = response.read()
git_blob = hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest()
if git_blob != BLOB:
    raise ValueError("Pinned source blob does not match")
source_rows = list(csv.DictReader(io.StringIO(raw.decode("utf-8-sig"))))
taxonomy = json.loads((ROOT / "static/data/municipal-taxonomy.json").read_text())
if taxonomy["version"] != "AviList v2026":
    raise ValueError("Project taxonomy version changed")
existing_sequence = {name: index + 1 for index, name in enumerate(taxonomy["species"])}
sequence = {}
for row in source_rows:
    name, number = row["scientific_name"], int(row["avilist_seq"])
    if name in sequence or number <= 0:
        raise ValueError("Duplicate name or invalid sequence: " + name)
    if name not in taxonomy["species"] or row["avibase"] != taxonomy["species"][name]:
        raise ValueError("Scientific name or Avibase identity mismatch: " + name)
    # Consistency check only; the output sequence is read from the CSV field.
    if number != existing_sequence[name]:
        raise ValueError("The published sequence differs from the project's versioned taxonomy: " + name)
    sequence[name] = number
if len(sequence) != 11011 or len(set(sequence.values())) != len(sequence):
    raise ValueError("Incomplete or duplicated published species sequence")
snapshot = json.loads((ROOT / "static/data/municipal-preview.json").read_text())
missing = sorted({r["scientificName"] for r in snapshot["records"]} - set(sequence))
if missing:
    raise ValueError("Municipal species without verified sequence: " + str(missing))
omitted = sorted(set(taxonomy["species"]) - set(sequence))
if len(omitted) != 161:
    raise ValueError("Unexpected source coverage")
document = {
    "schemaVersion": 1,
    "taxonomyVersion": "AviList v2026",
    "source": {
        "url": URL,
        "reference": "https://www.avilist.org/checklist/v2026/",
        "provenance": "https://github.com/alchaincyf/huashu-bird-sticker/blob/" + COMMIT + "/NOTICE.md",
        "upstream": "AviList Core Team. 2026. AviList: The Global Avian Checklist, v2026. https://doi.org/10.2173/avilist.v2026",
        "publisher": "huashu-bird-sticker (published AviList v2026 derivative)",
        "commit": COMMIT,
        "gitBlob": BLOB,
        "sha256": hashlib.sha256(raw).hexdigest(),
        "sequenceField": "avilist_seq",
        "sequenceNote": "Published species-only AviList sequence; these are not the original workbook's # values.",
        "rankFilter": "species",
        "license": "AviList fields CC BY 4.0; dataset compilation MIT",
        "coverageNote": "The published derivative omits 161 species flagged extinct or possibly extinct. All 165 distinct municipal species in the 2025–2026 snapshot are covered. Missing species are never assigned an inferred sequence."
    },
    "speciesCount": len(sequence),
    "omittedScientificNames": omitted,
    "sequenceByScientificName": dict(sorted(sequence.items(), key=lambda item: item[1]))
}
(ROOT / "static/data/municipal-taxonomic-order.json").write_text(json.dumps(document, ensure_ascii=False, separators=(",", ":")) + "\n")
print(f"PASS pinned AviList v2026 derivative: {len(sequence)} names and Avibase identities; 0 sequence disagreements; all municipal species covered; SHA256 {document['source']['sha256']}")
