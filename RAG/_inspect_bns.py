import pdfplumber
import os
os.chdir(r'D:\Mr.Ashish\EBENCH\RAG')
with pdfplumber.open('BNS2023.pdf') as pdf:
    for pn in [4, 5, 6, 7, 10, 20]:
        if pn < len(pdf.pages):
            text = pdf.pages[pn].extract_text() or ''
            print(f'=== Page {pn+1} ===')
            for line in text.split('\n')[:30]:
                print(f'  {repr(line)}')
            print()
