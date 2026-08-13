"""Detect column boundary from x0 of line-start chars across BNS/BNSS/BSA."""
import pdfplumber
from collections import Counter

paths = {
    'BNS': r'D:\Mr.Ashish\EBENCH\RAG\PDFs\BNS2023.pdf',
    'BNSS': r'D:\Mr.Ashish\EBENCH\RAG\PDFs\BNSS2023.pdf',
    'BSA': r'D:\Mr.Ashish\EBENCH\RAG\PDFs\BSA2023.pdf',
}
out = []
for name, p in paths.items():
    pdf = pdfplumber.open(p)
    line_starts = Counter()
    for pg in range(0, len(pdf.pages), max(1, len(pdf.pages)//12)):
        chars = pdf.pages[pg].chars
        tops = sorted({round(c['top'], 1) for c in chars})
        for top in tops:
            grp = [c for c in chars if abs(c['top'] - top) < 1.5]
            if not grp:
                continue
            x0 = min(c['x0'] for c in grp)
            line_starts[round(x0)] += 1
    out.append('=== %s line-start x0 histogram ===' % name)
    for x, c in sorted(line_starts.items()):
        if c >= 2:
            out.append('  x0=%5d : %d' % (x, c))
    pdf.close()

with open(r'D:\Mr.Ashish\EBENCH\RAG\_probe_cols2.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))
print('done')
