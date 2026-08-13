"""Check BNS page dimensions and right-column structure."""
import pdfplumber

pdf = pdfplumber.open(r'D:\Mr.Ashish\EBENCH\RAG\PDFs\BNS2023.pdf')
out = []
for pg in [0, 33, 77]:
    page = pdf.pages[pg]
    out.append('page %d: width=%.1f height=%.1f' % (pg+1, page.width, page.height))
    chars = page.chars
    # distinct line-start x0 counts
    lines = {}
    for c in chars:
        if c.get('text','').strip():
            key = round(c['top'], 1)
            lines.setdefault(key, []).append(c)
    # For each line, first char x0
    starts = {}
    for top, grp in lines.items():
        grp.sort(key=lambda c: c['x0'])
        x0 = grp[0]['x0']
        starts[round(x0)] = starts.get(round(x0), 0) + 1
    out.append('  line-start histogram: %s' % sorted(starts.items()))
    out.append('')

with open(r'D:\Mr.Ashish\EBENCH\RAG\_check_geom.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))
print('done')
