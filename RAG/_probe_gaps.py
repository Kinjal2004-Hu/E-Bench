"""Analyze BNS gazette char gaps to determine word-boundary threshold."""
import pdfplumber

pdf = pdfplumber.open(r'D:\Mr.Ashish\EBENCH\RAG\PDFs\BNS2023.pdf')

chars = pdf.pages[77].chars
# Find distinct top values in body column (x0 > 110)
tops = sorted({round(c['top'], 1) for c in chars if c['x0'] > 110 and c['top'] > 60})
with open(r'D:\Mr.Ashish\EBENCH\RAG\_probe_gaps.txt', 'w', encoding='utf-8') as f:
    f.write('distinct tops (body): %d\n' % len(tops))
    f.write('sample tops: %s\n' % tops[:40])

    # Analyze a body text line (e.g., top ~84.0) from the margin title area
    for top in [84.0, 95.9, 107.9, 131.9]:
        grp = [c for c in chars if c['x0'] > 110 and abs(c['top'] - top) < 1.5]
        if not grp:
            continue
        grp.sort(key=lambda c: c['x0'])
        gaps = [round(grp[i]['x0'] - grp[i-1]['x1'], 1) for i in range(1, len(grp))]
        from collections import Counter
        cnt = Counter(gaps)
        f.write('\n=== top=%s chars=%d ===\n' % (top, len(grp)))
        f.write('gap histogram (gap: count):\n')
        for g, c in sorted(cnt.items()):
            f.write('  %5.1f : %d\n' % (g, c))
        f.write('sequence:\n')
        f.write(''.join(c['text'] for c in grp))
        f.write('\n')
print('done')
