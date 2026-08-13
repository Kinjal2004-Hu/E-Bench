"""Inspect section 15 layout on page 11."""
import pdfplumber

pdf = pdfplumber.open(r'D:\Mr.Ashish\EBENCH\RAG\PDFs\BNS2023.pdf')
chars = pdf.pages[10].chars

out = []
lines = {}
for c in chars:
    if c.get('text', '').strip():
        key = round(c['top'], 1)
        lines.setdefault(key, []).append(c)

for top in sorted(lines):
    grp = sorted(lines[top], key=lambda c: c['x0'])
    text = ''.join(c['text'] for c in grp)
    x0 = grp[0]['x0']
    out.append('  x0=%6.1f top=%6.1f %r' % (x0, top, text[:95]))

with open(r'D:\Mr.Ashish\EBENCH\RAG\_check_s15.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))
print('done')
