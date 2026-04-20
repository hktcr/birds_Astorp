import PyPDF2
import json
import re

reader = PyPDF2.PdfReader("/tmp/fisk.pdf")
text = ""
for page in reader.pages:
    text += page.extract_text() + "\n"

with open("fisk_text.txt", "w") as f:
    f.write(text)
