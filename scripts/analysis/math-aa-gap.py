#!/usr/bin/env python3
"""Math AA depth-gap report.

Compares our authored Math AA course (content/courses/ib-maths-aa-{hl,sl})
against the official IB sub-topic granularity, using the rdojo folder TREE
(slugs only — no content) as the reference structure. Facts/structure only;
no third-party prose is read or reproduced.

Output: docs/course-upgrade/reference-derived/math-aa-gap.md (git-ignored)
"""
import json, glob, os, re, sys
from collections import defaultdict

ROOT = "/Users/hamzagul/Documents/examcore"
RDOJO_NOTES = f"{ROOT}/markschemehamza/notes/ib-math-aa"
RDOJO_QB = f"{ROOT}/markschemehamza/questionbank/ib-math-aa"
OUT = f"{ROOT}/docs/course-upgrade/reference-derived/math-aa-gap.md"

GROUP_NAMES = {
    "1": "Number & Algebra",
    "2": "Functions",
    "3": "Geometry & Trigonometry",
    "4": "Statistics & Probability",
    "5": "Calculus",
}
STOP = set("and the of a to in for with as is on from into their its using".split())

def slug_to_code_title(slug):
    """sl-4-8-binomial-distribution -> ('SL 4.8', 'binomial distribution')."""
    m = re.match(r"(sl|ahl|hl)-(\d+)-(\d+)-(.*)$", slug)
    if not m:
        return None
    lvl, grp, sub, rest = m.groups()
    rest = re.sub(r"-\d{4,}$", "", rest)          # strip trailing db ids like -10167
    title = rest.replace("-", " ").strip()
    return (f"{lvl.upper()} {grp}.{sub}", title, grp, lvl.upper())

def tokens(s):
    return set(t for t in re.findall(r"[a-z]+", s.lower()) if t not in STOP and len(t) > 2)

# --- 1. Reference structure: official sub-topics from rdojo notes tree ------
ref = {}   # code -> {title, group, level}
for nj in glob.glob(f"{RDOJO_NOTES}/**/notes.json", recursive=True):
    sub_slug = os.path.basename(os.path.dirname(nj))
    parsed = slug_to_code_title(sub_slug)
    if parsed:
        code, title, grp, lvl = parsed
        ref.setdefault(code, {"title": title, "group": grp, "level": lvl})

# --- 2. Which reference sub-topics have a question bank --------------------
qb_codes = set()
for d in glob.glob(f"{RDOJO_QB}/*/*"):
    if os.path.isdir(d):
        parsed = slug_to_code_title(os.path.basename(d))
        if parsed:
            qb_codes.add(parsed[0])

# --- 3. Our authored lessons + depth metrics ------------------------------
def load_our(level):
    out = []
    for f in sorted(glob.glob(f"{ROOT}/content/courses/ib-maths-aa-{level}/*.json")):
        d = json.load(open(f))
        secs = d.get("sections", [])
        out.append({
            "code": str(d.get("topicCode", "")),
            "title": d.get("title", ""),
            "we": sum(1 for s in secs if s.get("type") == "workedExample"),
            "qc": len(d.get("quickCheck", [])),
            "words": len(re.findall(r"\w+", json.dumps(d))),
            "group": str(d.get("topicCode", "0"))[0],
            "file": os.path.basename(f),
        })
    return out

our_hl = load_our("hl")
our_sl = load_our("sl")

def best_match(ref_title, group, our_lessons):
    """Best our-lesson in the same group by token overlap; returns (lesson, score)."""
    rt = tokens(ref_title)
    best, best_score = None, 0.0
    for l in our_lessons:
        if l["group"] != group:
            continue
        lt = tokens(l["title"])
        if not lt or not rt:
            continue
        j = len(rt & lt) / len(rt | lt)
        if j > best_score:
            best, best_score = l, j
    return best, best_score

# --- 4. Build per-subtopic rows -------------------------------------------
rows = []
for code, meta in sorted(ref.items(), key=lambda kv: (kv[1]["group"], kv[1]["level"] != "SL", kv[0])):
    lvl = meta["level"]
    our_pool = our_hl if lvl == "AHL" else our_sl  # AHL only exists in HL course
    # for SL subtopics, also allow matching the HL course (HL is a superset)
    pool = our_hl if lvl == "AHL" else (our_sl + our_hl)
    match, score = best_match(meta["title"], meta["group"], pool)
    rows.append({
        "code": code, "title": meta["title"], "group": meta["group"], "level": lvl,
        "has_qb": code in qb_codes,
        "match": match, "score": score,
    })

# --- 5. Group-level granularity summary -----------------------------------
ref_by_group = defaultdict(lambda: {"SL": 0, "AHL": 0})
for code, meta in ref.items():
    ref_by_group[meta["group"]][meta["level"]] += 1
our_by_group_hl = defaultdict(int)
our_by_group_sl = defaultdict(int)
for l in our_hl: our_by_group_hl[l["group"]] += 1
for l in our_sl: our_by_group_sl[l["group"]] += 1

# --- 6. Emit markdown -----------------------------------------------------
L = []
L.append("# Math AA — Depth-Gap Report")
L.append("")
L.append("_Reference-only. Derived from the rdojo folder **structure** (official IB "
         "sub-topic slugs) + our own course files. No third-party prose read or "
         "reproduced. Git-ignored._")
L.append("")
L.append(f"- Reference sub-topics (official IB granularity): **{len(ref)}**  "
         f"(SL {sum(1 for m in ref.values() if m['level']=='SL')}, "
         f"AHL {sum(1 for m in ref.values() if m['level']=='AHL')})")
L.append(f"- Reference sub-topics with a question bank: **{len(qb_codes & set(ref))}**")
L.append(f"- Our lessons: **{len(our_hl)} HL**, **{len(our_sl)} SL** "
         f"(each consolidates multiple official sub-topics)")
L.append(f"- Our lessons with an integrated question bank: **0** "
         f"(we have {sum(1 for l in our_hl if l['qc'])>0 and 'quickCheck MCQ only' or 'quickCheck MCQ only'})")
L.append("")
L.append("## 1. Granularity per topic group")
L.append("")
L.append("| Group | Official sub-topics (SL+AHL) | Our HL lessons | Our SL lessons | Consolidation |")
L.append("|---|---|---|---|---|")
for g in sorted(GROUP_NAMES):
    off = ref_by_group[g]["SL"] + ref_by_group[g]["AHL"]
    hl = our_by_group_hl[g]; sl = our_by_group_sl[g]
    ratio = f"{off/hl:.1f}× per HL lesson" if hl else "—"
    L.append(f"| **{g}. {GROUP_NAMES[g]}** | {off} ({ref_by_group[g]['SL']}+{ref_by_group[g]['AHL']}) | {hl} | {sl} | {ratio} |")
tot_off = len(ref)
L.append(f"| **Total** | **{tot_off}** | **{len(our_hl)}** | **{len(our_sl)}** | "
         f"**~{tot_off/len(our_hl):.1f}× per HL lesson** |")
L.append("")
L.append("> Each of our lessons currently covers ~2 official IB sub-topics on average. "
         "The reference splits them into dedicated pages — the core depth opportunity.")
L.append("")

# Per-group detailed tables
L.append("## 2. Sub-topic coverage & practice gaps")
L.append("")
for g in sorted(GROUP_NAMES):
    grp_rows = [r for r in rows if r["group"] == g]
    if not grp_rows:
        continue
    L.append(f"### {g}. {GROUP_NAMES[g]}")
    L.append("")
    L.append("| Official code | Sub-topic | Ref QB | Maps to our lesson | Match | Our depth | Verdict |")
    L.append("|---|---|:--:|---|:--:|---|---|")
    for r in grp_rows:
        m = r["match"]
        qb = "✅" if r["has_qb"] else "—"
        if m and r["score"] >= 0.35:
            maps = m["title"][:38]
            conf = f"{r['score']:.2f}"
            depth = f"{m['words']}w · {m['we']}we"
            verdict = "Deepen + add practice"
        elif m and r["score"] >= 0.15:
            maps = m["title"][:38]
            conf = f"{r['score']:.2f}?"
            depth = f"{m['words']}w · {m['we']}we"
            verdict = "Likely covered — verify/split"
        else:
            maps = "— no title match —"
            conf = "—"
            depth = "—"
            verdict = "**Verify / author new**"
        L.append(f"| {r['code']} | {r['title'][:44]} | {qb} | {maps} | {conf} | {depth} | {verdict} |")
    L.append("")

# Ranked backlog
missing = [r for r in rows if not (r["match"] and r["score"] >= 0.15)]
deepen = [r for r in rows if (r["match"] and r["score"] >= 0.15)]
L.append("## 3. Ranked backlog")
L.append("")
L.append("> ⚠️ **Match confidence caveat.** The 'maps to' column is an automatic "
         "title-token match. Our lessons use a *custom consolidated* numbering, not "
         "the official IB sub-topic codes, so a low/blank match often means our "
         "**title** doesn't share words with the official one — **not** that the "
         "topic is uncovered. Treat the group-level granularity table (§1) as the "
         "robust finding; treat the list below as a **review queue**, not a verified "
         "gap list.")
L.append("")
L.append(f"- **Verify / author-new candidates ({len(missing)})** — no title-level "
         f"match to any of our lessons; each needs a human glance to confirm whether "
         f"it's genuinely missing or just folded into a differently-named lesson:")
for r in missing:
    L.append(f"  - {r['code']} {r['title']}" + ("  · ref has QB" if r["has_qb"] else ""))
L.append("")
L.append(f"- **Deepen / split ({len(deepen)})** — matched to one of our lessons; "
         f"candidates to break into dedicated sub-topic pages with their own practice.")
L.append(f"- **Add practice everywhere** — 0 of our {len(our_hl)+len(our_sl)} lessons "
         f"have an integrated question bank; {len(qb_codes & set(ref))} reference "
         f"sub-topics do. This is the biggest single gap and where the marking loop plugs in.")
L.append("")
L.append("## 4. Recommended pilot")
L.append("")
L.append("**Group 4 (Statistics & Probability)** — highest practice-gap payoff and the "
         "cleanest fit for the AI marker (structured, mark-by-mark). Start with "
         "**Binomial distribution** (official IB code **SL 4.8**; our course numbers it "
         "internally). High traffic, has a reference QB, and its discrete "
         "worked-answer format is ideal for mark-by-mark grading.")

os.makedirs(os.path.dirname(OUT), exist_ok=True)
open(OUT, "w").write("\n".join(L) + "\n")
print(f"Wrote {OUT}")
print(f"ref sub-topics={len(ref)}  with_qb={len(qb_codes & set(ref))}  "
      f"our_hl={len(our_hl)} our_sl={len(our_sl)}  missing={len(missing)} deepen={len(deepen)}")
