"""Verify margin/body column x-boundary across BNS, BNSS, BSA pages."""
import pdfplumber

paths = {
    'BNS': r'D:\Mr.Ashish\EBENCH\RAG\PDFs\BNS2023.pdf',
    'BNSS': r'D:\Mr.Ashish\EBENCH\RAG\PDFs\BNSS2023.pdf',
    'BSA': r'D:\Mr.Ashish\EBENCH\RAG\PDFs\BSA2023.pdf',
}
out = []
for name, p in paths.items():
    pdf = pdfplumber.open(p)
    margin_maxes = []
    body_mins = []
    # sample pages evenly
    step = max(1, len(pdf.pages) // 8)
    for pg in range(0, len(pdf.pages), step):
        chars = pdf.pages[pg].chars
        if not chars:
            continue
        # group into lines
        tops = sorted({round(c['top'], 1) for c in chars})
        for top in tops[:30]:
            grp = [c for c in chars if abs(c['top'] - top) < 1.5]
            if not grp:
                continue
            grp.sort(key=lambda c: c['x0'])
            # find big column gap
            for i in range(1, len(grp)):
                gap = grp[i]['x0'] - grp[i-1]['x1']
                if gap > 20:
                    margin_maxes.append(round(grp[i-1]['x1'], 1))
                    body_mins.append(round(grp[i]['x0'], 1))
                    break
    out.append('%s: sampled margin_max range [%s], body_min range [%s]' % (
        name,
        (min(margin_maxes), max(margin_maxes)) if margin_maxes else None,
        (min(body_mins), max(body_mins)) if body_mins else None,
    ))
    pdf.close()

with open(r'D:\Mr.Ashish\EBENCH\RAG\_probe_cols.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))
print('done')
