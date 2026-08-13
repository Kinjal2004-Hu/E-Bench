"""Inspect x-positions of section 1 line in BNS page 1."""
import pdfplumber

pdf = pdfplumber.open(r'D:\Mr.Ashish\EBENCH\RAG\PDFs\BNS2023.pdf')
chars = pdf.pages[0].chars

out = []
# Find the line containing "ThisActmaybecalled"
target = None
for c in chars:
    if c.get('text') == 'T' and c['x0'] < 300:
        target = c
        break

# Group chars into lines
lines = {}
for c in chars:
    key = round(c['top'], 1)
    lines.setdefault(key, []).append(c)

for top in sorted(lines):
    grp = sorted(lines[top], key=lambda c: c['x0'])
    margin = ''.join(c['text'] for c in grp if c['x0'] < 114)
    body = ''.join(c['text'] for c in grp if c['x0'] >= 118)
    if 'ThisActmay' in body or 'Shorttitle' in body:
        out.append('top=%.1f [margin]%s [body]%s' % (top, margin.strip(), body.strip()))
        # show x positions of each char
        out.append('  chars:')
        for c in grp:
            out.append('    %r x0=%.1f x1=%.1f' % (c['text'], c['x0'], c['x1']))

with open(r'D:\Mr.Ashish\EBENCH\RAG\_check_s1.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))
print('done')
