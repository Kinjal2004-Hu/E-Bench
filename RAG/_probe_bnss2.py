"""Probe BNSS: sample pages showing how section headers appear."""
import pdfplumber

pdf = pdfplumber.open(r'D:\Mr.Ashish\EBENCH\RAG\PDFs\BNSS2023.pdf')
out = []
for pg in [10, 30, 60, 100]:
    text = pdf.pages[pg].extract_text() or ""
    lines = text.split('\n')
    out.append('=== page %d (first 25 lines) ===' % (pg + 1))
    for l in lines[:25]:
        out.append('  %r' % l[:100])
    out.append('')

with open(r'D:\Mr.Ashish\EBENCH\RAG\_probe_bnss2.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))
print('done')
