#!/usr/bin/env python3
"""Best-effort logo fetcher.

For each studio domain, fetch the homepage, find the best square icon
(apple-touch-icon preferred, then <link rel=icon>, then og:image), and save it to
public/logos/<id>.<ext>. Studios with no fetchable logo fall back to a monogram
avatar in the UI. Run: python3 scripts/fetch-logos.py
"""
import json, os, re, sys, urllib.request, urllib.parse
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "logos")
os.makedirs(OUT, exist_ok=True)

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")

STUDIOS = {
    "pilates-fitness": "https://pilatesfitness.com.sg",
    "core-reformery": "https://thecorereformery.com",
    "kx-pilates": "https://kxpilates.com",
    "upside-motion": "https://www.upsidemotion.com",
    "ally-pilates": "https://www.allyspin.com",
    "the-flow-studio": "https://theflowstudio.co/singapore/",
    "focus-movement": "https://focusmovement.sg",
    "strong-pilates": "https://strongpilates.com",
    "absolute-pilates": "https://www.absoluteboutiquefitness.com.sg",
    "sg-pilates": "https://sgpilates.sg",
    "breathe-pilates": "https://www.breathepilates.com.sg",
    "club-pilates": "https://clubpilates.com.sg",
}


class IconParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.icons = []   # (rel, href, sizes)
        self.og = None
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "link" and a.get("rel"):
            rel = a["rel"].lower()
            if "icon" in rel and a.get("href"):
                self.icons.append((rel, a["href"], a.get("sizes", "")))
        if tag == "meta" and a.get("property") == "og:image" and a.get("content"):
            self.og = a["content"]


def fetch(url, timeout=15):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    return urllib.request.urlopen(req, timeout=timeout)


def size_score(sizes):
    m = re.findall(r"(\d+)x(\d+)", sizes or "")
    return max((int(w) for w, h in m), default=0)


def pick(icons, og):
    apple = [i for i in icons if "apple-touch" in i[0]]
    if apple:
        return max(apple, key=lambda i: size_score(i[2]))[1]
    if icons:
        pngs = [i for i in icons if i[1].lower().endswith((".png", ".svg"))] or icons
        return max(pngs, key=lambda i: size_score(i[2]))[1]
    return og


def ext_of(url):
    path = urllib.parse.urlparse(url).path.lower()
    for e in (".png", ".svg", ".jpg", ".jpeg", ".webp", ".ico"):
        if path.endswith(e):
            return e
    return ".png"


results = {}
for sid, home in STUDIOS.items():
    try:
        html = fetch(home).read().decode("utf-8", "ignore")
        p = IconParser(); p.feed(html)
        href = pick(p.icons, p.og)
        if not href:
            href = urllib.parse.urljoin(home, "/apple-touch-icon.png")
        icon_url = urllib.parse.urljoin(home, href)
        data = fetch(icon_url).read()
        if len(data) < 200:
            raise ValueError("icon too small")
        ext = ext_of(icon_url)
        fn = f"{sid}{ext}"
        with open(os.path.join(OUT, fn), "wb") as f:
            f.write(data)
        results[sid] = f"/logos/{fn}"
        print(f"OK   {sid:18} {len(data):>7}B  {icon_url}")
    except Exception as e:
        results[sid] = None
        print(f"MISS {sid:18} {e}")

with open(os.path.join(OUT, "_manifest.json"), "w") as f:
    json.dump(results, f, indent=2)
print("\nGot", sum(1 for v in results.values() if v), "of", len(STUDIOS), "logos")
