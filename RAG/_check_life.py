"""Find why 'life' loses its 'l' on page 34."""
import pdfplumber

pdf = pdfplumber.open(r'D:\Mr.Ashish\EBENCH\RAG\PDFs\BNS2023.pdf')
chars = pdf.pages[33].chars  # page 34

out = []
# Find the line containing "life,andshallalsobeliabletofine"
lines = {}
for c in chars:
    if c.get('text', '').strip():
        key = round(c['top'], 1)
        lines.setdefault(key, []).append(c)

for top in sorted(lines):
    grp = sorted(lines[top], key=lambda c: c['x0'])
    text = ''.join(c['text'] for c in grp)
    if 'life' in text or 'LIFE' in text or 'ife' in text:
        out.append('top=%.1f: %r' % (top, text))
        out.append('  chars:')
        for c in grp:
            out.append('    %r x0=%.1f x1=%.1f' % (c['text'], c['x0'], c['x1']))

with open(r'D:\Mr.Ashish\EBENCH\RAG\_check_life.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))
print('done')
