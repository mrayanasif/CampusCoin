import sys
from pypdf import PdfReader
r = PdfReader(r"C:\Users\Zeeshan\Desktop\SFC-Mindforge\CampusCoin End-to-End Web Solutions_SRS.pdf")
print("pages:", len(r.pages))
out = []
for i, p in enumerate(r.pages, 1):
    t = p.extract_text() or ""
    out.append(f"\n===== PAGE {i} =====\n" + t)
txt = "".join(out)
open(r"C:\Users\Zeeshan\Desktop\SFC-Mindforge\docs\srs_extracted_text.txt", "w", encoding="utf-8").write(txt)
print("chars:", len(txt))
print("--- preview ---")
print(txt[:3000])
