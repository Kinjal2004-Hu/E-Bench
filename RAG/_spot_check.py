import json
from pathlib import Path
DATA = Path('data')
for f in ['taxation', 'corporate', 'it_act_2000', 'sra_1963', 'tpa_1882', 'cpa_2019']:
    with open(DATA / f / 'corpus.json', encoding='utf-8') as fp:
        d = json.load(fp)
    print(f'=== {f}: {len(d["provisions"])} provisions ===')
    for p in d['provisions'][:8]:
        num = p.get('number', '?')
        title = p.get('title', '?')[:80]
        print(f'  N={num!r:>10} | T={title!r}')
    print('  ...')
    for p in d['provisions'][-4:]:
        num = p.get('number', '?')
        title = p.get('title', '?')[:80]
        print(f'  N={num!r:>10} | T={title!r}')
    print()
