import logging
logging.disable(logging.CRITICAL)
import main

main.load_per_law_indexes()

data = main.PER_LAW_INDEXES["ica_1872"]
provisions = data["corpus"].get("provisions", [])
print("n provisions:", len(provisions))
print("has 10:", [p.get("number") for p in provisions if str(p.get("number", "")) == "10"])
num = "10"
prov = next((p for p in provisions if str(p.get("number", "")) == num), None)
print("prov found:", bool(prov), (prov or {}).get("title")[:50] if prov else "")
print("label:", data["label"])
print("prov label:", data.get("provision_label"))