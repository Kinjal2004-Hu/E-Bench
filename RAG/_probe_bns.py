"""Probe BNS gazette PDF: test extract_text vs extract_words spacing."""
import pdfplumber
import re

pdf = pdfplumber.open(r'D:\Mr.Ashish\EBENCH\RAG\PDFs\BNS2023.pdf')

out = []
out.append('pages: %d' % len(pdf.pages))

# Method 1: extract_text (current)
t1 = pdf.pages[77].extract_text() or ""
out.append('--- Method 1: extract_text() page 78, line containing 302 ---')
for line in t1.split('\n'):
    if '302' in line and len(line) < 200:
        out.append(repr(line))
        break

# Method 2: extract_words (x-coordinate aware)
words = pdf.pages[77].extract_words()
out.append('--- Method 2: extract_words() page 78, words near "302" ---')
line_words = []
for w in words:
    if abs(w['top'] - 100) < 30:  # rough
        line_words.append(w['text'])
out.append(' '.join(line_words)[:300])

# Method 3: extract_text with layout param
try:
    t3 = pdf.pages[77].extract_text(layout=True)
    out.append('--- Method 3: extract_text(layout=True) ---')
    for line in t3.split('\n'):
        if '302' in line:
            out.append(repr(line[:200]))
            break
except Exception as e:
    out.append('Method 3 failed: %s' % e)

# Check if words have x0 positions enabling column detection
out.append('--- word x0 sample (page 78) ---')
for w in words[:30]:
    out.append('x0=%.1f top=%.1f text=%r' % (w['x0'], w['top'], w['text']))

with open(r'D:\Mr.Ashish\EBENCH\RAG\_probe_out.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))
print('done')
