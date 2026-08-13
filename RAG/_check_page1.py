"""Dump BNS page 1 visual line starts and page 34 section 103 area."""
import pdfplumber

pdf = pdfplumber.open(r'D:\Mr.Ashish\EBENCH\RAG\PDFs\BNS2023.pdf')

out = []
for pg in [0, 33]:  # pages 1 and 34
    chars = pdf.pages[pg].chars
    lines = {}
    for c in chars:
        if c.get('text', '').strip():
            key = round(c['top'], 1)
            lines.setdefault(key, []).append(c)
    out.append('=== page %d ===' % (pg + 1))
    for top in sorted(lines)[:20]:
        grp = sorted(lines[top], key=lambda c: c['x0'])
        text = ''.join(c['text'] for c in grp)
        x0 = grp[0]['x0']
        out.append('  x0=%6.1f %r' % (x0, text[:90]))
    out.append('')

with open(r'D:\Mr.Ashish\EBENCH\RAG\_check_page1.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))
print('done')
