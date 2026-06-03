import json
import re
with open('data/constitution/corpus.json', encoding='utf-8') as fp:
    c = json.load(fp)
print(f'Total provisions: {c["provision_count"]}')

# Show first 10
for p in c['provisions'][:10]:
    print(f'  {p["number"]} | PART {p.get("part")} | {p["title"][:60]}')

# Count by part
parts = {}
for p in c['provisions']:
    part = p.get('part', 'None')
    parts[part] = parts.get(part, 0) + 1
print('\nProvisions per PART:')
for k, v in sorted(parts.items(), key=lambda x: str(x[0])):
    print(f'  {k}: {v}')

# Check Schedule entries
sched = [p for p in c['provisions'] if str(p['number']).startswith('SCHEDULE')]
print(f'\nSchedule entries: {len(sched)}')
for p in sched[:5]:
    print(f'  {p["number"]} | {p["title"][:60]}')

# Look for sub-clause style numbers (with letters)
letters = [p for p in c['provisions'] if re.search(r'[A-Z]$', str(p['number']))]
print(f'\nNumbered with letter suffix (e.g., 21A): {len(letters)}')
for p in letters[:5]:
    print(f'  {p["number"]} | {p["title"][:60]}')

# Range distribution
ranges = {'1-50': 0, '51-100': 0, '101-200': 0, '201-300': 0, '301-400': 0, '>400': 0}
for p in c['provisions']:
    n_str = str(p['number'])
    m = re.match(r'^(\d+)', n_str)
    if not m: continue
    n = int(m.group(1))
    if n <= 50: ranges['1-50'] += 1
    elif n <= 100: ranges['51-100'] += 1
    elif n <= 200: ranges['101-200'] += 1
    elif n <= 300: ranges['201-300'] += 1
    elif n <= 400: ranges['301-400'] += 1
    else: ranges['>400'] += 1
print('\nProvision ranges:')
for k, v in ranges.items():
    print(f'  {k}: {v}')

