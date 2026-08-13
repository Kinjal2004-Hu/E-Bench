"""Check whether 'untitled' BNS sections really lack margin titles in PDF."""
import pdfplumber
import json

with open(r'D:\Mr.Ashish\EBENCH\RAG\data\bns_2023\corpus.json', encoding='utf-8') as f:
    corpus = json.load(f)
provisions = {str(p.get("number")): p for p in corpus["provisions"]}

pdf = pdfplumber.open(r'D:\Mr.Ashish\EBENCH\RAG\PDFs\BNS2023.pdf')

out = []
for num in ["1", "15", "103"]:
    p = provisions.get(num)
    if not p:
        out.append(f"section {num}: not found")
        continue
    pg = int(p.get("page", 1)) - 1
    text = pdf.pages[pg].extract_text() or ""
    out.append(f"=== section {num} (title={p.get('title')!r}) page={pg+1} ===")
    # show lines near the section number
    for line in text.split('\n'):
        if line.strip().startswith(num + ".") or f" {num}." in line:
            out.append("  line: %r" % line[:100])
            break
    else:
        out.append("  (no line starts with %s.)" % num)
    out.append("")

with open(r'D:\Mr.Ashish\EBENCH\RAG\_check_untitled.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))
print('done')
