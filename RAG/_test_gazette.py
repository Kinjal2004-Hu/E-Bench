"""Test gazette_two_column parser on BNS only (no FAISS rebuild)."""
import sys
sys.path.insert(0, r'D:\Mr.Ashish\EBENCH\RAG')
from build_corpus import parse_gazette_two_column, PDF_DIR, LAW_REGISTRY

law = next(l for l in LAW_REGISTRY if l["id"] == "bns_2023")
pdf_path = PDF_DIR / law["pdf"]
provisions = parse_gazette_two_column(pdf_path, law["label"])

print(f"BNS provisions: {len(provisions)}")

nums = []
for p in provisions:
    n = str(p.get("number", ""))
    if n.isdigit():
        nums.append(int(n))
nums.sort()
print(f"range: {min(nums)}-{max(nums)}" if nums else "none")

# Check key sections
for key in [103, 302, 303, 304]:
    hit = next((p for p in provisions if str(p.get("number")) == str(key)), None)
    if hit:
        print(f"\n--- Section {key}: {hit.get('title')}")
        print(f"    text: {hit.get('full_text','')[:150]}")
    else:
        print(f"\n--- Section {key}: MISSING")

# Show samples of titles for first 10
print("\nFirst 10 titles:")
for p in provisions[:10]:
    print(f"  {p.get('number')}: {p.get('title')[:70]}")
