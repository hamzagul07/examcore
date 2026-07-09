# Isolating the marking work from `marking-scanned-scripts-accuracy`

> **STATUS (2026-07-09): the isolation is already done.** The clean branch
> **`marking-accuracy-clean`** exists = latest `main` + exactly the two marking
> commits (cherry-picked conflict-free in an isolated worktree; typechecks with 0
> errors and passes all marking unit tests on top of current main). **The only
> step left is the merge** — see "Merge + clean up" at the bottom. The
> "isolate" section below is kept for reference / if you need to redo it against
> a newer `main`.

The scanned-script multi-question + marking-accuracy work was committed on the
branch **`marking-scanned-scripts-accuracy`**, but a concurrent process
committed unrelated **Community Q&A / mastery-band / mark-back** work onto the
same branch, interleaved between and after the marking commits. Before merging
the marking work to `main`, isolate just the two marking commits.

## The two marking commits (stable hashes)

| Hash | Summary |
|------|---------|
| `933f33b2` | Marking: scanned-script multi-question + accuracy hardening (22 files) |
| `8adeaaf8` | Marking: per-question examiner-ink + OCR parallelization |

- They are **non-contiguous** on the branch (concurrent commits sit between/after them).
- `933f33b2`'s parent is `c881c1e4`, already on `main`.
- Neither marking commit is on `main` yet.
- Cherry-pick both onto a fresh branch off `main`, base first (`933f33b2`) then ink (`8adeaaf8`).

## Run when the concurrent work is idle and the tree is clean

```bash
cd /Users/hamzagul/Documents/examcore

# 0. Confirm idle + clean.
git status                          # working tree clean
git worktree list                   # just the main dir

# 1. Latest main.
git switch main
git pull --ff-only 2>/dev/null || true   # only if there's a remote

# 2. Fresh branch for ONLY the marking work.
git switch -c marking-accuracy-clean

# 3. Apply the two marking commits in dependency order.
git cherry-pick 933f33b2 8adeaaf8
```

### If a cherry-pick conflicts
(Most likely on `lib/marking/single-question-pipeline.ts` if mark-back touched it.)

```bash
git status                          # conflicted files
# Resolve, KEEPING BOTH the marking change and the concurrent change.
git add <resolved-files>
git cherry-pick --continue
# …or abort:
git cherry-pick --abort
```

## Verify (the key gate)

```bash
# Must contain EXACTLY the two marking commits over main — nothing else:
git log --oneline main..marking-accuracy-clean
#   expect:
#     <hash> Marking: per-question examiner-ink mapped across scanned pages
#     <hash> Marking: scanned-script multi-question + accuracy hardening

grep -cE "markSplitQuestions|buildPerPageInk|extractStatedTotalMarks" \
  lib/marking/single-question-pipeline.ts   # → non-zero

npx tsc --noEmit
for f in reconcile-marks derive-scheme split-questions question-marks; do
  npx tsx "lib/marking/$f.test.ts"
done
```

If `main..marking-accuracy-clean` shows anything other than those two commits,
**stop and inspect** before merging.

## Merge + clean up

```bash
# Local merge:
git switch main
git merge --no-ff marking-accuracy-clean

# …or PR:
git push -u origin marking-accuracy-clean
gh pr create --base main --head marking-accuracy-clean \
  --title "Marking: scanned-script multi-question + accuracy hardening" \
  --body "Isolated marking commits (933f33b2, 8adeaaf8), cherry-picked clean off main."

# After merge, delete the interleaved branch:
git branch -D marking-scanned-scripts-accuracy
```

## Still outstanding after the merge
- **Live end-to-end verify** of the per-question examiner-ink (unit-verified; a
  full browser run was blocked by branch churn + Gemini 429s). Upload an
  image-based 2-question script in scanned mode → expect two results with red
  ink annotations. Do it when Gemini quota is free.
- **Timeout margin**: with the verify pass, a many-page multi-question *image*
  upload runs close to `maxDuration=300`. OCR is now parallelized; consider
  raising `maxDuration` or making the verify pass conditional above N questions.
