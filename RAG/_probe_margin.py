"""Inspect BNS gazette two-column layout: margin titles (x<110) vs body (x>110)."""
import pdfplumber

pdf = pdfplumber.open(r'D:\Mr.Ashish\EBENCH\RAG\PDFs\BNS2023.pdf')

out = []
for pg in [77, 78, 79]:  # pages 78, 79, 80
    chars = pdf.pages[pg].chars
    tops = sorted({round(c['top'], 1) for c in chars if c['top'] > 70})
    out.append('=== page %d ===' % (pg + 1))
    for top in tops:
        grp = [c for c in chars if abs(c['top'] - top) < 1.5]
        if not grp:
            continue
        grp.sort(key=lambda c: c['x0'])
        margin = ''.join(c['text'] for c in grp if c['x0'] < 110)
        body = ''.join(c['text'] for c in grp if c['x0'] >= 110)
        if margin or body:
            out.append('  [margin] %s  [body] %s' % (margin.strip(), body.strip()))

with open(r'D:\Mr.Ashish\EBENCH\RAG\_probe_margin.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))
print('done')
