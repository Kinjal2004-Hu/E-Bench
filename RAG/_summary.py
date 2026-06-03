import json
from pathlib import Path
summary = []
for d in sorted(Path('data').iterdir()):
    if not d.is_dir():
        continue
    f = d / 'corpus.json'
    if not f.exists():
        continue
    data = json.loads(f.read_text(encoding='utf-8'))
    summary.append({
        'id': d.name,
        'label': data.get('law_name'),
        'domain': data.get('domain'),
        'strategy': data.get('strategy'),
        'count': data.get('provision_count'),
        'seconds': data.get('extraction_seconds'),
    })
total = sum(s['count'] for s in summary)
print(f'Total: {total} provisions across {len(summary)} laws')
print('---')
for s in summary:
    print(f'  {s["id"]:>22}: {s["count"]:>5} ({s["strategy"]:<27}) {s["domain"]}')
