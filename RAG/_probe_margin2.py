"""Verify margin-title accumulation pattern on more BNS pages + check BNSS/BSA layout."""
import pdfplumber

paths = {
    'BNS': r'D:\Mr.Ashish\EBENCH\RAG\PDFs\BNS2023.pdf',
    'BNSS': r'D:\Mr.Ashish\EBENCH\RAG\PDFs\BNSS2023.pdf',
    'BSA': r'D:\Mr.Ashish\EBENCH\RAG\PDFs\BSA2023.pdf',
}

out = []
for name, p in paths.items():
    pdf = pdfplumber.open(p)
    out.append('=== %s pages=%d ===' % (name, len(pdf.pages)))
    # sample a middle page
    pg = pdf.pages[min(len(pdf.pages)//2, len(pdf.pages)-1)]
    chars = pg.chars
    tops = sorted({round(c['top'], 1) for c in chars if c['top'] > 70})[:15]
    for top in tops:
        grp = [c for c in chars if abs(c['top'] - top) < 1.5]
        if not grp:
            continue
        grp.sort(key=lambda c: c['x0'])
        margin = ''.join(c['text'] for c in grp if c['x0'] < 110)
        body = ''.join(c['text'] for c in grp if c['x0'] >= 110)
        if margin or body:
            out.append('  [m]%s  [b]%s' % (margin.strip()[:60], body.strip()[:60]))
    out.append('')
    pdf.close()

with open(r'D:\Mr.Ashish\EBENCH\RAG\_probe_margin2.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))
print('done')
