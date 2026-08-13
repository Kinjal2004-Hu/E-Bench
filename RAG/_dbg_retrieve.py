import logging
logging.disable(logging.CRITICAL)
import inspect
import main

src = inspect.getsource(main.retrieve)
old = (
    "    # Exact-number matches are guaranteed pool members (vector_score 10.0\n"
    "    # sorts them above every FAISS hit, so the pool trim cannot drop them).\n"
    "    for lid, num in targeted.items():\n"
    "        data = PER_LAW_INDEXES.get(lid)\n"
    "        if not data:\n"
    "            continue\n"
    "        provisions = data[\"corpus\"].get(\"provisions\", [])\n"
    "        prov = next((p for p in provisions if str(p.get(\"number\", \"\")) == num), None)\n"
    "        if not prov:\n"
    "            continue\n"
)
new = old + "        print('DBG INJECTING', lid, num, 'HAS_PROV', bool(prov), flush=True)\n"
assert old in src, "INJECTION BLOCK NOT FOUND IN SOURCE"
src = src.replace(old, new)
g = {"__name__": "x"}
exec(compile(src, "dbg", "exec"), vars(main))

main.load_per_law_indexes()
q = 'What agreements are contracts under Section 10 of the Indian Contract Act?'
rows = main.retrieve(q, 7)
print("TOP7:", [(r["section"]["document"], r["provision_number"], round(r["score"], 3)) for r in rows])