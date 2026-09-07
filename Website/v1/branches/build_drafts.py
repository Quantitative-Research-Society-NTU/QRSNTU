"""Generate branch previews from the V1 pages."""
from pathlib import Path
import os
import re
import json
from html import escape

ROOT = Path(__file__).resolve().parents[1]
CHAPTERS = [("nus", "NUS"), ("sjtu", "上交"), ("hkust", "HKUST"), ("cuhk", "香港中文大学"), ("fdu", "复旦"), ("cmu", "CMU")]
SOURCES = [p for p in ROOT.rglob("index.html")
           if p.relative_to(ROOT).parts[0] not in {"branches", "math_notes", "fonts", *(slug for slug, _ in CHAPTERS)}]

def generate(source, target, slug, campus, variant):
    page = source.read_text(encoding="utf-8")
    base = os.path.relpath(source.parent, target.parent).replace("\\", "/") + "/"
    page = page.replace("<head>", '<head>\n    <base href="' + base + '">\n    <meta name="robots" content="noindex,nofollow">')
    page = page.replace("<body ", f'<body data-chapter="{campus}" data-slug="{slug}" data-variant="{variant}" ')
    page = page.replace("QRS@NTU", f"QRS@{campus}").replace("Society @NTU", f"Society @{campus}")
    chinese = slug in {"sjtu", "cuhk", "fdu"}
    brand = f"量化研究协会@{campus}" if chinese else f"QRS@{campus}"
    page = page.replace(f'data-chapter="{campus}"', f'data-chapter="{campus}" data-brand="{brand}"')
    if chinese:
        page = page.replace(f"QRS@{campus}", brand).replace(f"Quantitative Research Society @{campus}", brand)
    if source.parent.name == "about":
        page = page.replace("society at NTU", f"society at {campus}").replace("across NTU", f"across {campus}")
        page = re.sub(r'Publish notes, problem sets, and past-year papers for NTU modules on <a .*?</a>\.', "Share technical notes, research methods, and reproducible learning resources.", page)
        if chinese:
            content = (ROOT / "branches/about-zh.html").read_text(encoding="utf-8").replace("{{campus}}", campus)
            page = re.sub(r'<main\b.*?</main>', lambda _: content, page, flags=re.S)
            page = page.replace('<html lang="en">', '<html lang="zh-Hans">').replace(f"About | {brand}", f"关于我们 | {brand}")
    for component in ("header", "footer"):
        path = os.path.relpath(ROOT / "branches" / f"{component}.js", source.parent).replace("\\", "/")
        page = re.sub(r'src="[^"]*assets/' + component + r'\.js(?:\?[^"]*)?"', f'src="{path}"', page)
    routing = os.path.relpath(ROOT / "branches/routing.js", source.parent).replace("\\", "/")
    if 'http-equiv="refresh"' in page:
        for alias in ("yh", "jn", "cdl"):
            destination = os.path.relpath(ROOT / slug / alias, source.parent).replace("\\", "/") + "/"
            page = page.replace(f"../../{alias}/", destination)
    page = page.replace("</body>", f'<script type="module" src="{routing}"></script>\n</body>')
    if variant == "landing" and source == ROOT / "index.html":
        # Preserve the exact original hero; full research feeds belong to the full version.
        start = page.index('            <section id="current-work"')
        end = page.index("        </main>", start)
        page = page[:start] + page[end:]
        page = re.sub(r'<script[^>]+src="assets/home-page.js[^"]*"[^>]*></script>', "", page)
    # Render navigation in the HTML so both links are visible before JS loads.
    home = ROOT / slug / ("landing" if variant == "landing" else "")
    home_href = os.path.relpath(home, source.parent).replace("\\", "/") + "/"
    about_href = os.path.relpath(home / "about", source.parent).replace("\\", "/") + "/"
    logo_href = os.path.relpath(ROOT / "Files/logo-v1.png", source.parent).replace("\\", "/")
    main_href = os.path.relpath(ROOT, source.parent).replace("\\", "/") + "/"
    navigation = f'''<nav class="container mx-auto px-6 py-4 flex justify-between items-center flex-wrap gap-4">
        <a href="{home_href if variant != 'landing' else 'https://qrsntu.org/'}" class="flex items-center gap-3"><img src="{logo_href}" alt="{escape(brand)} Logo" class="h-10 w-10 rounded-md"><span class="font-serif font-bold text-xl text-white">{escape(brand)}</span></a>
        <div class="flex items-center gap-6 text-sm"><a href="{main_href}" data-site-link class="nav-link">Main Branch</a><a href="{about_href}" data-site-link class="nav-link">About</a></div>
    </nav>'''
    page = re.sub(r'(<header\b[^>]*>).*?(</header>)', lambda m: m[1] + navigation + m[2], page, flags=re.S)
    if source == ROOT / "index.html" and variant == "full":
        projects = json.loads((ROOT / "data/projects.json").read_text(encoding="utf-8"))
        renderer = (ROOT / "assets/home-page.js").read_text(encoding="utf-8")
        picks = re.search(r'const HOME_FEATURED_PROJECT_IDS = (\[[^;]+\])', renderer)[1]
        ids = re.findall(r"'([^']+)'", picks)
        cards = []
        for project_id in ids:
            project = next((p for p in projects if p['id'] == project_id), None)
            if not project:
                continue
            href = os.path.relpath(ROOT / slug / "projects", source.parent).replace("\\", "/") + "/#project-" + project_id
            cards.append(f'''<div class="home-card"><h3 class="card-title">{escape(project['title'])}</h3><p class="card-description">{escape(project['summary'])}</p><a href="{href}" class="card-link">Learn more <i data-lucide="arrow-right" class="inline-block h-4 w-4 ml-1"></i></a></div>''')
        page = page.replace('<div id="home-projects" class="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto"></div>', '<div id="home-projects" class="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">' + ''.join(cards) + '</div>')
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(page, encoding="utf-8")

for slug, campus in CHAPTERS:
    branch = ROOT / slug
    for source in SOURCES:
        generate(source, branch / source.relative_to(ROOT), slug, campus, "full")
    for source in (ROOT / "index.html", ROOT / "about/index.html"):
        generate(source, branch / "landing" / source.relative_to(ROOT), slug, campus, "landing")

print(f"Generated {len(CHAPTERS)} branches with {len(SOURCES)} full-content pages and 2 landing pages each.")
