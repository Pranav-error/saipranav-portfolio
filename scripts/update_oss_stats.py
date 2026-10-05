"""Keep the site's open-source numbers current.

Counts pull requests by the owner on upstream projects the same way the profile
README does (Pranav-error/Pranav-error, scripts/update_oss.py): a PR counts as
merged when GitHub says so, or when its commits were landed on the default branch
by hand and the PR closed. Then rewrites the figures in content.json, index.html
and terminal.js. Displayed totals are rounded down ("69" -> "65+") so they stay
true between runs.

Run from the workflow: the Actions token only sees public repositories, so no
private repository names can leak into the public site.
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

_landed = {}


def api(url):
    req = urllib.request.Request(url, headers={"Accept": "application/vnd.github+json"})
    if TOKEN:
        req.add_header("Authorization", f"Bearer {TOKEN}")
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def landed_subjects(repo):
    if repo not in _landed:
        subjects = set()
        page = 1
        try:
            while True:
                res = api("https://api.github.com/search/commits?q="
                          + urllib.parse.quote(f"repo:{repo} author:{USER}") + f"&per_page=100&page={page}")
                items = res.get("items", [])
                for it in items:
                    msg = (it.get("commit") or {}).get("message", "")
                    if msg:
                        subjects.add(msg.splitlines()[0].strip())
                if len(items) < 100:
                    break
                page += 1
        except (urllib.error.URLError, ValueError):
            pass
        _landed[repo] = subjects
    return _landed[repo]


def landed_by_hand(repo, number):
    subjects = landed_subjects(repo)
    if not subjects:
        return False
    try:
        commits = api(f"https://api.github.com/repos/{repo}/pulls/{number}/commits?per_page=100")
    except (urllib.error.URLError, ValueError):
        return False
    return any(((c.get("commit") or {}).get("message", "").splitlines() or [""])[0].strip() in subjects for c in commits)


def collect():
    repos, page = {}, 1
    while True:
        res = api("https://api.github.com/search/issues?q="
                  + urllib.parse.quote(f"author:{USER} is:pr") + f"&per_page=100&page={page}")
        items = res.get("items", [])
        for it in items:
            repo = it["repository_url"].split("/repos/", 1)[1]
            if repo in EXCLUDE or repo.split("/")[0] in EXCLUDE_OWNERS:
                continue
            c = repos.setdefault(repo, {"merged": 0, "open": 0})
            if (it.get("pull_request") or {}).get("merged_at"):
                c["merged"] += 1
            elif it["state"] == "open":
                c["open"] += 1
            elif landed_by_hand(repo, it["number"]):
                c["merged"] += 1
        if len(items) < 100 or page >= 10:
            break
        page += 1
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
