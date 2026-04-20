import PyPDF2
import json
import re

reader = PyPDF2.PdfReader("/tmp/fisk.pdf")
text = ""
for page in reader.pages:
    text += page.extract_text() + "\n"

# Look for table rows.
# "Årta 26.3  Herculesdammarna Linda Niklasson 21.3 1.3-08°"

lines = text.split('\n')
start = False
records = {}

MONTHS = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"]

for line in lines:
    if "Fenologi våren 2021" in line:
        start = True
    elif "TABELL 4" in line or "Fenologi hösten" in line:
        break
    
    if start:
        # A row usually starts with a non-digit, then has a date (D.M).
        # We need the last token which might be the extreme date, e.g. "1.3-08°"
        # or maybe there are multiple lines per row. Let's just try a regex.
        # Art Datum ... Median Extremdatum
        # We know some species strings:
        
        parts = line.strip().split()
        if len(parts) > 5 and re.match(r'\d{1,2}\.\d{1,2}', parts[1]):
            # Parts[0] is the species name, might be multiple tokens though, but usually capitalized.
            # Let's extract the species by taking everything until the first date string.
            art_matches = []
            for i, p in enumerate(parts):
                if re.match(r'\d{1,2}\.\d{1,2}', p):
                    species = " ".join(parts[:i])
                    break
            
            # Now the extreme date is the last token or near it.
            # E.g. 1.3-08°
            # find all dates D.M or DD.MM in the line
            dates = re.findall(r'(\d{1,2})\.(\d{1,2})', line)
            if dates:
                # the Extremdatum is typically at the end of the line.
                # Let's find the last occurrence of something that looks like an extreme date.
                # Extremdatum looks like 1.3-08° or 12.4-76
                last_part = parts[-1]
                m = re.search(r'^(\d{1,2})\.(\d{1,2})', last_part)
                if m:
                    d, m_ = int(m.group(1)), int(m.group(2))
                    # format as MM-DD
                    records[species] = f"{m_:02d}-{d:02d}"
                else:
                    # Sometimes the last part is not an extreme date? Let's check part -2
                    m2 = re.search(r'^(\d{1,2})\.(\d{1,2})', parts[-2])
                    if m2:
                        d, m_ = int(m2.group(1)), int(m2.group(2))
                        records[species] = f"{m_:02d}-{d:02d}"

print(json.dumps(records, indent=2, ensure_ascii=False))
