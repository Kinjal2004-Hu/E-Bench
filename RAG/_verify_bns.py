"""Verify BNS corpus quality."""
import json

with open(r'D:\Mr.Ashish\EBENCH\RAG\data\bns_2023\corpus.json', encoding='utf-8') as f:
    corpus = json.load(f)

provisions = corpus.get("provisions", [])
print(f"BNS total: {len(provisions)}")

for key in [103, 302, 303, 304]:
    hit = next((p for p in provisions if str(p.get("number")) == str(key)), None)
    if hit:
        print(f"\n=== Section {key}: {hit.get('title')}")
        print(f"    text: {hit.get('full_text','')[:300]}")
    else:
        print(f"\n=== Section {key}: MISSING")

# count untitled
untitled = [p for p in provisions if p.get("title") in ("(untitled)", "")]
print(f"\nUntitled: {len(untitled)}")
print("Sample untitled numbers:", [p["number"] for p in untitled[:15]])

# check a mid section (e.g., 302 has no (1)?)
p302 = next(p for p in provisions if str(p.get("number")) == "302")
print("\nFull 302 text:", p302.get("full_text", "")[:400])
