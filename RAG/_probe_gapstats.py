"""Measure char-gap distributions for margin vs body columns on BNS page 78."""
import pdfplumber
from collections import Counter

pdf = pdfplumber.open(r'D:\Mr.Ashish\EBENCH\RAG\PDFs\BNS2023.pdf')
chars = pdf.pages[77].chars
margin_gaps = Counter()
body_gaps = Counter()
margin_seq = []
body_seq = []

for c in chars:
    if c['top'] < 70:
        continue
    if c['x0'] < 110:
        margin_seq.append(c)
    elif c['x0'] >= 118:
        body_seq.append(c)

def gaps_of(seq, col):
    seq.sort(key=lambda c: c['x0'])
    out = []
    # group by line (top)
    lines = {}
    for c in seq:
        key = round(c['top'], 1)
        lines.setdefault(key, []).append(c)
    for key in sorted(lines):
        g = lines[key]
        g.sort(key=lambda c: c['x0'])
        for i in range(1, len(g)):
            out.append(round(g[i]['x0'] - g[i-1]['x1'], 2))
    return out

mg = gaps_of(margin_seq, 'margin')
bg = gaps_of(body_seq, 'body')

with open(r'D:\Mr.Ashish\EBENCH\RAG\_probe_gapstats.txt', 'w', encoding='utf-8') as f:
    f.write('MARGIN gaps: n=%d min=%.2f max=%.2f\n' % (len(mg), min(mg), max(mg)))
    c = Counter(mg)
    for g in sorted(c):
        f.write('  %6.2f : %d\n' % (g, c[g]))
    f.write('\nBODY gaps: n=%d min=%.2f max=%.2f\n' % (len(bg), min(bg), max(bg)))
    c = Counter(bg)
    for g in sorted(c):
        f.write('  %6.2f : %d\n' % (g, c[g]))
print('done')
