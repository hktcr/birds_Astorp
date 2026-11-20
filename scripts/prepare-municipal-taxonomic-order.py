#!/usr/bin/env python3
"""Build explicit species sequence from the project's authoritative AviList v2026."""
import hashlib
import io
import json
import pathlib
import re
import urllib.request
import zipfile
import xml.etree.ElementTree as ET
from decimal import Decimal
ROOT = pathlib.Path(__file__).resolve().parents[1]
URL = "https://www.avilist.org/wp-content/uploads/2026/10/AviList-v2026-20Oct2026-short-version.xlsx"
TAXONOMY = ROOT / "static/data/municipal-taxonomy.json"
OUTPUT = ROOT / "static/data/municipal-taxonomic-order.json"
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
with urllib.request.urlopen(URL, timeout=90) as response:
    raw = response.read()
digest = hashlib.sha256(raw).hexdigest()
with zipfile.ZipFile(io.BytesIO(raw)) as book:
    strings = []
    if "xl/sharedStrings.xml" in book.namelist():
        for item in ET.fromstring(book.read("xl/sharedStrings.xml")).findall("m:si", NS):
            strings.append("".join(item.itertext()))
    sheets = ET.fromstring(book.read("xl/workbook.xml")).find("m:sheets", NS)
    sheet = next((s for s in sheets if s.attrib["name"].strip().lower() == "avilist v2026"), None)
    if sheet is None:
        raise ValueError("Unexpected workbook sheets: " + str([s.attrib["name"] for s in sheets]))
    links = {r.attrib["Id"]: r.attrib["Target"] for r in ET.fromstring(book.read("xl/_rels/workbook.xml.rels"))}
    target = links[sheet.attrib["{" + REL + "}id"]]
    member = target.lstrip("/") if target.startswith("/") else "xl/" + target
    def value(cell):
        kind = cell.attrib.get("t")
        if kind == "inlineStr":
            return "".join(cell.find("m:is", NS).itertext()).strip()
        text = cell.findtext("m:v", "", NS)
        return (strings[int(text)] if kind == "s" and text else text).strip()
    rows = []
    for row in ET.fromstring(book.read(member)).findall("m:sheetData/m:row", NS):
        rows.append({re.sub(r"\d", "", cell.attrib["r"]): value(cell) for cell in row})
header_index = next((i for i, row in enumerate(rows[:40]) if "#" in row.values() and any(v.casefold() == "rank" for v in row.values())), None)
if header_index is None:
    raise ValueError("Cannot find explicit sequence/rank headers: " + str(rows[:6]))
headers = {v.casefold(): k for k, v in rows[header_index].items()}
sequence_col = headers["#"]
rank_col = headers["rank"]
name_col = headers.get("scientific name")
if not name_col:
    raise ValueError("Missing SCIENTIFIC NAME header: " + str(headers))
avibase_col = next((column for title, column in headers.items() if title in ("avibase id", "avibase taxon id", "avibase taxon concept id")), None)
if not avibase_col:
    raise ValueError("Missing Avibase identity header: " + str(headers))
sequence = {}
identities = {}
for row in rows[header_index + 1:]:
    if row.get(rank_col, "").casefold() != "species":
        continue
    name = row[name_col]
    number = Decimal(row[sequence_col])
    if number != number.to_integral_value() or number <= 0:
        raise ValueError("Non-integral taxonomic sequence for " + name)
    if name in sequence:
        raise ValueError("Duplicate species: " + name)
    sequence[name] = int(number)
    identities[name] = row.get(avibase_col, "").removeprefix("avibase-").upper()
taxonomy = json.loads(TAXONOMY.read_text())
if taxonomy["version"] != "AviList v2026" or set(sequence) != set(taxonomy["species"]):
    raise ValueError("Source species differ from the project's verified AviList version")
if len(set(sequence.values())) != len(sequence):
    raise ValueError("Duplicate taxonomic sequence values")
for name, avibase_id in taxonomy["species"].items():
    if identities[name] != avibase_id.removeprefix("avibase-").upper():
        raise ValueError("Avibase identity mismatch: " + name)
snapshot = json.loads((ROOT / "static/data/municipal-preview.json").read_text())
missing = sorted({r["scientificName"] for r in snapshot["records"]} - set(sequence))
if missing:
    raise ValueError("Unmapped municipal species: " + str(missing))
document = {
    "schemaVersion": 1,
    "taxonomyVersion": "AviList v2026",
    "source": {
        "url": URL,
        "reference": "https://www.avilist.org/checklist/v2026/",
        "metadata": "https://www.avilist.org/wp-content/uploads/2026/11/AviList_v2026_metadata_20Oct.pdf",
        "sha256": digest,
        "sheet": sheet.attrib["name"],
        "sequenceField": "#",
        "rankFilter": "species",
        "license": "CC BY 4.0",
        "citation": "AviList Core Team. 2026. AviList: The Global Avian Checklist, v2026. https://doi.org/10.2173/avilist.v2026"
    },
    "speciesCount": len(sequence),
    "sequenceByScientificName": dict(sorted(sequence.items(), key=lambda item: item[1]))
}
OUTPUT.write_text(json.dumps(document, ensure_ascii=False, separators=(",", ":")) + "\n")
print(f"PASS official AviList v2026 sequence: {len(sequence)} species; all project identities and municipal species verified; SHA256 {digest}")
