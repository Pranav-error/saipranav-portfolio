"""Keep the site's open-source numbers current.

"Merged" is counted as commits GitHub attributes to this account on a repo's
default branch (GET /repos/{repo}/commits?author=USER) — not PR merge status.
Several maintainers (pgmoneta, pgagroal, ...) apply patches by hand (rebase,
cherry-pick, git am) and close the PR without using the merge button, so
GitHub's own PR search undercounts real landed work; the commit itself is the
ground truth regardless of how it got there. This matches what GitHub shows
on the account's own contribution graph for that repo.

Verified 2026-10-08: a PR-search + commit-message-matching heuristic (the
previous approach here) silently missed 26 of pgmoneta's merged patches after
a maintainer merge wave — the commit-search API it relied on doesn't reliably
resolve hand-landed/rebased commits back to the author, while the direct
`?author=` commits endpoint does. Don't go back to PR-search-based counting
for "merged" without re-verifying against this endpoint on at least pgmoneta.

Open PRs have no such ambiguity (nothing's landed yet), so those still come
from a normal PR search.

Then rewrites the figures in content.json, index.html and terminal.js.
Displayed totals are rounded down ("69" -> "65+") so they stay true between
runs. Run from the workflow: the Actions token only sees public repositories,
so no private repository names can leak into the public site.
"""

import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request

USER = os.environ.get("OSS_USER", "Pranav-error")
TOKEN = os.environ.get("GITHUB_TOKEN")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Not upstream open source: internship, work, friends' and practice repositories.
EXCLUDE = {
    "Sakram-Arch/simulation",
    "Patel-Muhammad/name-pr",
    "PritamP20/HackSprint",
    "DotDev-Club/DotDev",
    "chiraghontec/qnit-customer-discovery",
}
EXCLUDE_OWNERS = {USER, "Site-Analysis"}
# Display names for the breakdown; anything else uses the repository name.
NAMES = {"OSGeo/grass": "GRASS GIS", "gnuradio/gnuradio": "GNU Radio", "JabRef/jabref": "JabRef",
         "kubernetes/website": "kubernetes/website"}


def api(url):
    req = urllib.request.Request(url, headers={"Accept": "application/vnd.github+json"})
    if TOKEN:
        req.add_header("Authorization", f"Bearer {TOKEN}")
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def landed_commit_count(repo):
    """Commits GitHub attributes to USER on repo's default branch — the real
    "merged" count, however the commit actually got there."""
    n, page = 0, 1
    while True:
        items = api(f"https://api.github.com/repos/{repo}/commits?author={USER}&per_page=100&page={page}")
        n += len(items)
        if len(items) < 100 or page >= 10:
            return n
        page += 1


def discover_repos():
    """Every repo with at least one PR by USER (merged, open, or hand-landed-
    and-closed) — just used to find candidates; counts come from landed_commit_count."""
    repos, page = set(), 1
    while True:
        res = api("https://api.github.com/search/issues?q="
                  + urllib.parse.quote(f"author:{USER} is:pr") + f"&per_page=100&page={page}")
        items = res.get("items", [])
        for it in items:
            repo = it["repository_url"].split("/repos/", 1)[1]
            if repo not in EXCLUDE and repo.split("/")[0] not in EXCLUDE_OWNERS:
                repos.add(repo)
        if len(items) < 100 or page >= 10:
            break
        page += 1
    return repos


def open_pr_count(repo):
    res = api("https://api.github.com/search/issues?q="
              + urllib.parse.quote(f"repo:{repo} author:{USER} is:pr is:open"))
    return res.get("total_count", 0)


def collect():
    repos = {}
    for repo in discover_repos():
        try:
            merged = landed_commit_count(repo)
        except (urllib.error.URLError, ValueError):
            continue  # repo unreachable or rate-limited this run; try again next run rather than report 0
        try:
            open_n = open_pr_count(repo)
        except (urllib.error.URLError, ValueError):
            open_n = 0
        if merged or open_n:
            repos[repo] = {"merged": merged, "open": open_n}
    return repos


def floor_to(n, step):
    return max(step, n // step * step)


def name(repo):
    return NAMES.get(repo, repo.split("/")[1])


def main():
    repos = collect()
    merged = {r: c["merged"] for r, c in repos.items() if c["merged"]}
    total = sum(merged.values())
    open_total = sum(c["open"] for c in repos.values())
    if total == 0:
        raise SystemExit("no merged PRs found; refusing to overwrite the site with zeros")
    ranked = sorted(merged.items(), key=lambda kv: (-kv[1], name(kv[0]).lower()))
    shown = f"{floor_to(total, 5)}+"
    in_review = f"{floor_to(open_total, 10)}+" if open_total >= 10 else str(open_total)
    breakdown = ", ".join(f"{name(r)} ({n})" for r, n in ranked)
    print(f"merged={total} across {len(ranked)} projects, open={open_total}: {breakdown}")

    path = os.path.join(ROOT, "content.json")
    data = json.load(open(path, encoding="utf-8"))
    pg = [name(r) for r, _ in ranked if r.split("/")[0].startswith("pg")]
    others = [name(r) for r, _ in ranked if not r.split("/")[0].startswith("pg")]
    for e in data["experience"]:
        if e.get("role") == "Open Source Contributor":
            e["company"] = (f"PostgreSQL ecosystem ({', '.join(pg)}), " if pg else "") + ", ".join(others)
            e["points"][0] = (f"{shown} patches merged across {len(ranked)} upstream projects — {breakdown}"
                              f" — with {in_review} more under review.")
    for a in data["achievements"]:
        if re.fullmatch(r"\d+\+ Merged Upstream Patches", a.get("title", "")):
            a["title"] = f"{shown} Merged Upstream Patches"
            a["description"] = re.sub(r"with \S+ more in review", f"with {in_review} more in review", a["description"])
    new = json.dumps(data, indent=2, ensure_ascii=False) + "\n"
    changed = []
    if new != open(path, encoding="utf-8").read():
        open(path, "w", encoding="utf-8").write(new); changed.append("content.json")

    subs = {
        "index.html": [
            (r"\d+\+(?= merged open-source patches)", shown),
            (r"(?<=/// )\d+\+(?= MERGED UPSTREAM PATCHES)", shown),
            (r"(?<=> )\d+\+(?= merged patches to PostgreSQL)", shown),
            (r'data-count="\d+\+">\d+\+(?=</div>\s*<div[^>]*>Merged OSS Patches)', f'data-count="{shown}">{shown}'),
        ],
        "terminal.js": [(r"\d+\+(?= upstream patches)", shown)],
    }
    for fn, rules in subs.items():
        p = os.path.join(ROOT, fn)
        text = orig = open(p, encoding="utf-8").read()
        for pattern, repl in rules:
            text = re.sub(pattern, repl, text)
        if text != orig:
            open(p, "w", encoding="utf-8").write(text); changed.append(fn)
    print("updated: " + (", ".join(changed) if changed else "nothing"))


if __name__ == "__main__":
    main()
