"""Generate static SEO metadata and sitemaps from the deployed V1 pages.

Run before Jekyll; --check detects stale generated content without writing.
No third-party dependencies. Preview pages and redirect aliases are not indexed.
"""
import argparse
import json
import re
from html import escape, unescape
from pathlib import Path
from urllib.parse import urljoin
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1] / "v1"
ORIGIN = "https://qrsntu.org"
SKIP = {"_site", "branches", "fonts", "nus", "cuhk", "fdu", "sjtu", "cmu", "hkust"}
BLOCK = re.compile(r'\n?    <!-- SEO: generated -->.*?<!-- /SEO -->\n?', re.S)
DESCRIPTIONS = {
    "": "Quantitative Research Society at NTU: student quantitative and finance research, technical learning, industry events, and open mathematics notes.",
    "about": "Learn about QRS@NTU, our quantitative research mission, technical learning, and open educational resources.",
    "projects": "Explore QRS@NTU projects, competitions, and recognition in quantitative research, mathematics, and finance.",
    "publications": "Browse research publications by QRS@NTU members, with author, year, and venue filters.",
    "programmes": "Explore QRS@NTU programmes for quantitative research and industry preparation.",
    "events": "Find QRS@NTU workshops, seminars, and events for quantitative research and technical learning.",
    "people": "Meet the people behind QRS@NTU and explore their profiles, projects, and publications.",
    "math_notes": "Browse NTU mathematics and economics past-year papers, solutions, revision notes, and course resources.",
    "join_us": "Learn how to join QRS@NTU and take part in quantitative research, technical learning, and society activities.",
    "contact": "Contact the Quantitative Research Society at NTU for enquiries and collaboration.",
    "site-map": "Find all public QRS@NTU pages, including programmes, events, research publications, mathematics notes, and member profiles.",
}


def route(path):
    relative = path.relative_to(ROOT).as_posix()
    return "/" + relative.removesuffix("index.html")


def generate(check=False):
    pending = {}
    people = {p["id"]: p for p in json.loads((ROOT / "data/people.json").read_text(encoding="utf-8"))}
    pages = []
    for path in sorted(ROOT.rglob("*.html")):
        if any(part in SKIP for part in path.relative_to(ROOT).parts):
            continue
        source = path.read_text(encoding="utf-8")
        if re.search(r'<meta\b[^>]*content=["\'][^"\']*noindex', source, re.I):
            continue
        if re.search(r'http-equiv=["\']refresh', source, re.I):
            # Keep old inbound URLs working, but consolidate them on their destination.
            source = re.sub(r'(<link rel="canonical" href=")([^"]+)(")',
                            lambda m: m[1] + urljoin(ORIGIN + route(path), m[2]) + m[3], source)
            pending[path] = source
            continue
        if path.name != "index.html" or path.parent.name == "site-map":
            continue
        title = unescape(re.search(r'<title>(.*?)</title>', source, re.S)[1])
        pages.append((path, source, title))

    links = "\n".join(f'                <li><a href="{route(p)}">{escape(t)}</a></li>' for p, _, t in pages)
    sitemap_page = '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Site Map | QRS@NTU</title>
    <link rel="stylesheet" href="../style.css">
    <link rel="icon" href="../Files/logo-v1.png" type="image/png">
</head>
<body>
    <main style="max-width: 60rem; margin: 3rem auto; padding: 0 1.5rem;">
        <h1>QRS@NTU Site Map</h1>
        <p>Explore our public pages and member profiles.</p>
        <nav aria-label="All public pages">
            <ul>
''' + links + '''
            </ul>
        </nav>
    </main>
</body>
</html>
'''
    pages.append((ROOT / "site-map/index.html", sitemap_page, "Site Map | QRS@NTU"))
    for path, source, title in pages:
        source = BLOCK.sub("\n", source)
        canonical = ORIGIN + route(path)
        slug = route(path).strip("/")
        person_match = re.search(r'data-person-id="([^"]+)"', source)
        person = people[person_match[1]] if person_match else None
        description = DESCRIPTIONS.get(slug, f"{title.split(' | ')[0]} at QRS@NTU.")
        if person:
            description = f"Explore {person['name']}'s QRS@NTU profile, projects, publications, and academic links."
        graph = [{"@type": "ProfilePage" if person else "WebPage", "@id": canonical + "#webpage",
                  "url": canonical, "name": title, "description": description,
                  "isPartOf": {"@id": ORIGIN + "/#website"}, "inLanguage": "en"}]
        if person:
            graph[0]["mainEntity"] = {"@type": "Person", "name": person["name"], "url": canonical}
            # Supply a real name and links before the JS profile renderer runs.
            fallback = '<div id="person-profile"><h1>' + escape(person["name"]) + '</h1>'
            if person.get("role"):
                fallback += '<p>' + escape(person["role"]) + '</p>'
            fallback += '<p><a href="/projects/">Projects</a> &middot; <a href="/publications/">Publications</a></p></div>'
            source = re.sub(r'<div id="person-profile">.*?</div>', lambda _: fallback, source, flags=re.S)
        if not slug:
            graph.extend([
                {"@type": "WebSite", "@id": ORIGIN + "/#website", "url": ORIGIN + "/", "name": "QRS@NTU",
                 "publisher": {"@id": ORIGIN + "/#organization"}},
                {"@type": "Organization", "@id": ORIGIN + "/#organization", "name": "Quantitative Research Society at NTU",
                 "alternateName": "QRS@NTU", "url": ORIGIN + "/", "logo": ORIGIN + "/Files/logo-v1.png",
                 "email": "contact@qrsntu.org", "sameAs": ["https://github.com/Quantitative-Research-Society-NTU",
                 "https://www.linkedin.com/company/quantitative-research-society-ntu/"]}])
        metadata = [f'<link rel="canonical" href="{canonical}">',
                    f'<meta name="description" content="{escape(description, quote=True)}">',
                    '<meta name="robots" content="index,follow,max-image-preview:large">',
                    '<meta property="og:type" content="website">',
                    '<meta property="og:site_name" content="QRS@NTU">',
                    f'<meta property="og:title" content="{escape(title, quote=True)}">',
                    f'<meta property="og:description" content="{escape(description, quote=True)}">',
                    f'<meta property="og:url" content="{canonical}">',
                    f'<meta property="og:image" content="{ORIGIN}/Files/logo-v1.png">',
                    '<meta name="twitter:card" content="summary">',
                    '<script type="application/ld+json">' + json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False).replace('<', '\\u003c') + '</script>']
        block = '    <!-- SEO: generated -->\n    ' + '\n    '.join(metadata) + '\n    <!-- /SEO -->\n'
        source = source.replace('</head>', block + '</head>')
        # Initial HTML exposes a navigation link even without JS rendering the footer.
        source = re.sub(r'(<footer id="site-footer"[^>]*>).*?(</footer>)',
                        r'\1<a href="/site-map/">Site map</a>\2', source, flags=re.S)
        pending[path] = source

    namespace = "http://www.sitemaps.org/schemas/sitemap/0.9"
    ET.register_namespace("", namespace)
    urlset = ET.Element("{" + namespace + "}urlset")
    for path, _, _ in pages:
        url = ET.SubElement(urlset, "{" + namespace + "}url")
        ET.SubElement(url, "{" + namespace + "}loc").text = ORIGIN + route(path)
    ET.indent(urlset, space="  ")
    pending[ROOT / "sitemap.xml"] = '<?xml version="1.0" encoding="UTF-8"?>\n' + ET.tostring(urlset, encoding="unicode") + '\n'
    pending[ROOT / "robots.txt"] = "User-agent: *\nAllow: /\n\nSitemap: " + ORIGIN + "/sitemap.xml\n"
    changed = [p for p, value in pending.items() if not p.exists() or p.read_text(encoding="utf-8") != value]
    if check and changed:
        raise SystemExit("Stale SEO files: " + ", ".join(str(p.relative_to(ROOT)) for p in changed))
    if not check:
        for path in changed:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(pending[path], encoding="utf-8", newline="\n")
    print(f"SEO {'checked' if check else 'generated'}: {len(pages)} canonical pages; {len(changed)} files changed.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    generate(parser.parse_args().check)
