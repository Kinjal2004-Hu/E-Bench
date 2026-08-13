"""Probe BNS gazette PDF chars: do chars carry x-positions to reconstruct words?"""
import pdfplumber

pdf = pdfplumber.open(r'D:\Mr.Ashish\EBENCH\RAG\PDFs\BNS2023.pdf')

# Get chars on page 78, filter to body column (x0 > 110)
chars = pdf.pages[77].chars
body = [c for c in chars if c['x0'] > 110 and 80 < c['top'] < 150]
body.sort(key=lambda c: (round(c['top'] / 3), c['x0']))

out = []
out.append('total chars on page: %d, body sample: %d' % (len(chars), len(body)))

# Show a snippet of chars with positions to see gap pattern
prev_top = None
prev_x1 = None
line = []
for c in body[:200]:
    top_grp = round(c['top'] / 3)
    if prev_top is not None and top_grp != prev_top:
        out.append('LINE: ' + ' '.join(line))
        line = []
    line.append('%s@%.1f' % (c['text'], c['x0']))
    prev_top = top_grp
if line:
    out.append('LINE: ' + ' '.join(line))

# Compute gap stats
gaps = []
for c in body[1:]:
    if prev_x1 is not None:
        gaps.append(c['x0'] - prev_x1)
    prev_x1 = c['x1']
if gaps:
    out.append('min gap=%.2f max gap=%.2f' % (min(gaps), max(gaps)))

with open(r'D:\Mr.Ashish\EBENCH\RAG\_probe_chars.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))
print('done')
