"""Probe BNSS: how do section headers appear?"""
import pdfplumber
import re

pdf = pdfplumber.open(r'D:\Mr.Ashish\EBENCH\RAG\PDFs\BNSS2023.pdf')
out = []
out.append('pages: %d' % len(pdf.pages))

# Find pages containing section header pattern
for pg in range(0, len(pdf.pages)):
    text = pdf.pages[pg].extract_text() or ""
    m = re.search(r'^\s*(\d{1,3})\.\s+[A-Z]', text, re.MULTILINE)
    if m and pg > 2:
        out.append('--- page %d first match: %r' % (pg + 1, m.group(0)[:60]))
        # show surrounding lines
        lines = text.split('\n')
        for i, l in enumerate(lines):
            if m.group(0).strip().startswith(l.strip()[:10]):
                out.append('  context: %r' % lines[max(0,i-1):i+2])
                break
        break

with open(r'D:\Mr.Ashish\EBENCH\RAG\_probe_bnss.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))
print('done')
