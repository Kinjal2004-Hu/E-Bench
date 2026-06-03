import json

for lid in ['constitution', 'ica_1872', 'tpa_1882', 'sra_1963', 'cpa_2019', 'it_act_2000', 'taxation', 'labour_employment', 'gdr_rules_2014']:
    with open(f'data/{lid}/corpus.json', encoding='utf-8') as fp:
        c = json.load(fp)
    print(f'=== {lid} ({c["provision_count"]} provisions, {c["strategy"]}) ===')
    for p in c['provisions'][:3]:
        n = p['number']
        ctx = p.get('chapter') or p.get('part') or ''
        title = p['title'][:60]
        print(f'  {n} | {ctx} | {title}')
    if c['provisions']:
        last = c['provisions'][-1]
        print(f'  ... last: {last["number"]} | {last["title"][:60]}')
    print()
