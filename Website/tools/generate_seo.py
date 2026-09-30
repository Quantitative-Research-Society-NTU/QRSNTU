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
    "": "QRS@NTU develops and conducts student-led research in quantitative finance, machine learning, and related technical areas.",
    "about": "About QRS@NTU, which develops and conducts student-led research, and its place in the wider QRS network.",
    "projects": "Explore QRS research projects, competitions, and recognition in quantitative finance, machine learning, and mathematics.",
    "publications": "Browse publications and preprints by QRS researchers, with author, year, and venue filters.",
    "programmes": "The QRS Research Academy is the entry-stage educational research programme at QRS@NTU, with a path to QRS Researcher roles.",
    "events": "Find QRS and QRS@NTU talks, workshops, competitions, and community events.",
    "service": "QRS supports academic workshops and research communities with web, publicity, outreach, and organisational infrastructure.",
    "people": "Meet QRS@NTU officers and QRS researchers, and explore their profiles, projects, and publications.",
    "math_notes": "Browse NTU mathematics and economics past-year papers, solutions, revision notes, and course resources.",
    "join_us": "Apply to the QRS Research Academy or get involved with the QRS@NTU community.",
    "contact": "Contact the Quantitative Research Society (QRS) for enquiries and collaboration.",
    "gmmg": "Compete individually in the Global Market Making Games 2026 Singapore qualifier on 16 October. Open to all university students in Singapore.",
    "site-map": "Find all public QRS pages, including programmes, events, research publications, mathematics notes, and member profiles.",
}


def gmmg_events(canonical):
    """Singapore qualifier and final as separate Events. The venue is still to be announced,
    so the location is the country and city only; do not add a street address until confirmed."""
    common = {
        "@type": "Event",
        "eventStatus": "https://schema.org/EventScheduled",
        "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
        "location": {"@type": "Place", "name": "Singapore (venue to be announced)",
                     "address": {"@type": "PostalAddress", "addressLocality": "Singapore", "addressCountry": "SG"}},
        "url": canonical,
        "inLanguage": "en",
        "organizer": [
            {"@type": "Organization", "name": "Amsterdam Investment Club", "url": "https://www.amsterdaminvestmentclub.com/"},
            {"@type": "Organization", "name": "Quantitative Research Society", "alternateName": "QRS@NTU", "url": ORIGIN + "/"}],
    }
    qualifier = {**common, "@id": canonical + "#qualifier",
                 "name": "Global Market Making Games 2026 - Singapore Qualifier",
                 "description": "Individual market-making competition open to university students across Singapore. Results decide who progresses to the Singapore final.",
                 "startDate": "2026-10-16T19:30:00+08:00", "endDate": "2026-10-16T21:00:00+08:00",
                 "isAccessibleForFree": True,
                 "offers": {"@type": "Offer", "price": "0", "priceCurrency": "SGD", "url": canonical}}
    final = {**common, "@id": canonical + "#final",
             "name": "Global Market Making Games 2026 - Singapore Final",
             "description": "Leading Singapore qualifiers compete in the Singapore final to decide the Singapore champion.",
             "startDate": "2026-11-13T16:00:00+08:00", "endDate": "2026-11-13T19:00:00+08:00"}
    return [qualifier, final]


# Per-page extra structured data, keyed by route slug.
PAGE_EXTRAS = {
    "gmmg": {"graph": gmmg_events},
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
    <title>Site Map | QRS</title>
    <link rel="stylesheet" href="../style.css">
    <link rel="icon" href="../Files/logo-v1.png" type="image/png">
</head>
<body>
    <main style="max-width: 60rem; margin: 3rem auto; padding: 0 1.5rem;">
        <h1>QRS Site Map</h1>
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
    pages.append((ROOT / "site-map/index.html", sitemap_page, "Site Map | QRS"))
    for path, source, title in pages:
        source = BLOCK.sub("\n", source)
        canonical = ORIGIN + route(path)
        slug = route(path).strip("/")
        person_match = re.search(r'data-person-id="([^"]+)"', source)
        person = people[person_match[1]] if person_match else None
        description = DESCRIPTIONS.get(slug, f"{title.split(' | ')[0]} at QRS.")
        if person:
            description = f"Explore {person['name']}'s QRS profile, projects, publications, and academic links."
        graph = [{"@type": "ProfilePage" if person else "WebPage", "@id": canonical + "#webpage",
                  "url": canonical, "name": title, "description": description,
                  "isPartOf": {"@id": ORIGIN + "/#website"}, "inLanguage": "en"}]
        if person:
            graph[0]["mainEntity"] = {"@type": "Person", "name": person["name"], "url": canonical}
            # Supply a real name and links before the JS profile renderer runs.
            fallback = '<div id="person-profile"><h1>' + escape(person["name"]) + '</h1>'
            roles = person.get("roles") or ([person["role"]] if person.get("role") else [])
            if roles:
                fallback += '<p>' + '<br>'.join(escape(role) for role in roles) + '</p>'
            fallback += '<p><a href="/projects/">Projects</a> &middot; <a href="/publications/">Publications</a></p></div>'
            source = re.sub(r'<div id="person-profile">.*?</div>', lambda _: fallback, source, flags=re.S)
        extras = PAGE_EXTRAS.get(slug, {})
        if extras:
            graph.extend(extras["graph"](canonical))
        if not slug:
            graph.extend([
                {"@type": "WebSite", "@id": ORIGIN + "/#website", "url": ORIGIN + "/", "name": "QRS",
                 "alternateName": "Quantitative Research Society",
                 "publisher": {"@id": ORIGIN + "/#organization"}},
                {"@type": "Organization", "@id": ORIGIN + "/#organization", "name": "Quantitative Research Society",
                 "alternateName": ["QRS", "QRS@NTU"], "url": ORIGIN + "/", "logo": ORIGIN + "/Files/logo-v1.png",
                 "email": "contact@qrsntu.org", "sameAs": ["https://github.com/Quantitative-Research-Society-NTU",
                 "https://www.linkedin.com/company/quantitative-research-society-ntu/"]}])
        metadata = [f'<link rel="canonical" href="{canonical}">',
                    f'<meta name="description" content="{escape(description, quote=True)}">',
                    '<meta name="robots" content="index,follow,max-image-preview:large">',
                    '<meta property="og:type" content="website">',
                    '<meta property="og:site_name" content="QRS">',
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
