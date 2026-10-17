"""Generate project pages, profile wrappers, and Academy cohorts from canonical data.

Run before generate_seo.py. --check compares content with SEO blocks stripped.
"""
import argparse
import json
import re
from html import escape
from pathlib import Path
from string import Template

ROOT = Path(__file__).resolve().parents[1] / 'site'
TEMPLATE = Template((Path(__file__).parent / 'templates/research-page.html').read_text(encoding='utf-8'))
# Optional project-specific pages live in projects/<id>/ at the repository root: page.json lists the
# routes, build/ holds the page templates and public/ the files served at /projects/<id>/assets/.
# A page.json may set "base" (e.g. "learn/post-training") to publish somewhere other than
# /projects/<id>/; a folder whose id is not in projects.json is rendered only if it sets "base",
# and then has no project data ({{team}}, {{status}}, ... are unavailable). A page entry may also set
# "lang" (default "en") and "alternates", {hreflang: route}, which become <link rel="alternate"> tags.
CUSTOM = Path(__file__).resolve().parents[1] / 'projects'
ORIGIN = 'https://qrsntu.org'
PLACEHOLDER = re.compile(r'\{\{\s*(\w+)(?::([^}\s]+))?\s*\}\}')
SEO = re.compile(r'\s*<!-- SEO: generated -->.*?<!-- /SEO -->\s*', re.S)

def read(name):
    return json.loads((ROOT / 'data' / (name + '.json')).read_text(encoding='utf-8'))

def profile_route(person):
    return person.get('short_id') or 'people/' + person['id']

def section(title, content):
    return f'<section class="person-section"><h2 class="font-serif text-2xl font-bold mb-4">{escape(title)}</h2>{content}</section>'

def generate(check=False):
    people, projects, research = read('people'), read('projects'), read('research')
    person_map = {p['id']: p for p in people}
    project_map = {p['id']: p for p in projects}
    accepted_research = [r for r in research if r.get('status') == 'accepted']
    pending = {}
    copies = {}   # site file -> project public file, for <base>/assets/
    served_dirs = set()

    def person_link(pid, root):
        person = person_map.get(pid)
        # Existing competition collaborators without profiles remain plain names.
        if not person:
            return escape(pid.replace('-', ' ').title())
        name = person['name']
        return f'<a href="{root}{profile_route(person)}/" class="person-link">{escape(name)}</a>'

    def project_link(pid, root):
        return f'<a href="{root}projects/{pid}/" class="card-link">{escape(project_map[pid]["title"])}</a>'

    def page(route, title, content, kind='research', attributes='', scripts='', head='', width=None, lang='en'):
        root = '../' * len(route.split('/'))
        width = width or ('max-w-6xl' if kind == 'academy' else 'max-w-4xl')
        pending[ROOT / route / 'index.html'] = TEMPLATE.substitute(title=escape(title), root=root, kind=kind, width=width, attributes=attributes, content=content, scripts=scripts, head=head, lang=lang)

    def inline_svg(path):
        # Inline so figure text uses the page fonts; strip any XML prolog.
        source = path.read_text(encoding='utf-8')
        return re.sub(r'^\s*<\?xml[^>]*>\s*', '', source).strip()

    def custom_pages(pid, blocks):
        home = CUSTOM / pid
        config = json.loads((home / 'page.json').read_text(encoding='utf-8'))
        base = config.get('base', 'projects/' + pid)
        public, served = home / 'public', ROOT / base / 'assets'
        served_dirs.add(served)
        for source in sorted(f for f in public.rglob('*') if f.is_file()):
            copies[served / source.relative_to(public)] = source
        for spec in config['pages']:
            route = base + ('/' + spec['route'] if spec['route'] else '')
            root = '../' * len(route.split('/'))
            version = '?v=' + config['version']
            assets = f'{root}{base}/assets/'
            values = dict(blocks, root=root, assets=assets)
            def fill(match):
                name, argument = match[1], match[2]
                if name == 'svg':
                    return inline_svg(public / argument)
                if name not in values:
                    raise SystemExit(f'Unknown placeholder {{{{{name}}}}} in {spec["template"]}')
                return values[name] if name in ('root', 'assets') else values[name].replace('../../', root)
            body = PLACEHOLDER.sub(fill, (home / 'build' / spec['template']).read_text(encoding='utf-8'))
            body = re.sub(r'^<!--.*?-->\n', '', body, flags=re.S)
            head = ''.join(f'<link rel="stylesheet" href="{assets}{href}{version}">' for href in spec.get('stylesheets', []))
            head += ''.join(f'<link rel="alternate" hreflang="{code}" href="{ORIGIN}/{base}/{target + "/" if target else ""}">'
                            for code, target in spec.get('alternates', {}).items())
            scripts = ''.join(f'<script type="module" src="{assets}{src}{version}"></script>' for src in spec.get('scripts', []))
            page(route, spec['title'], body, config.get('kind', 'projects'), head=head, scripts=scripts, width=config.get('width'), lang=spec.get('lang', 'en'))

    for p in projects:
        root = '../../'
        status = 'Early-stage / Active derived research' if p.get('stage') == 'early-stage' else p['status'].capitalize()
        header = f'<p class="mb-8"><a href="../" class="card-link">&larr; All projects</a></p><header class="project-heading"><h1 class="section-title">{escape(p["title"])}</h1><p class="badge badge-status">{escape(status)}</p><p class="project-summary">{escape(p["summary"])}</p></header>'
        if p.get('alternate_title'):
            header += f'<p>{escape(p["alternate_title"])}</p>'
        team = accepted = ''
        if p.get('lead'):
            team = '<div class="project-team">' + ''.join('<p><span class="label">' + label + ':</span> ' + ', '.join(person_link(pid, root) for pid in ids) + '</p>' for label, ids in [('Lead', [p['lead']]), ('Authors', p['authors']), ('Slicers', p['slicers'])] if ids) + '</div>'
            papers = [r for r in accepted_research if r['project_id'] == p['id'] or p['id'] in r.get('related_project_ids', [])]
            items = []
            for r in papers:
                link = f'<a href="{escape(r["url"], quote=True)}" class="external-link" target="_blank" rel="noopener noreferrer">[OpenReview]</a>' if r.get('url') else ''
                items.append(f'<li id="research-{r["id"]}" class="publication-entry"><h3 class="publication-title">{escape(r["title"])}</h3><p class="publication-authors">{", ".join(person_link(pid, root) for pid in r["authors"])}</p><p class="person-list-meta">{escape(r["venue"])} · {r["year"]} · Accepted {link}</p></li>')
            if items:
                accepted = section('Accepted Research', '<ul class="person-list">' + ''.join(items) + '</ul>')
        else:
            team = '<div class="project-team"><p><span class="label">Participants:</span> ' + ', '.join(person_link(pid, root) for pid in p.get('participants', [])) + '</p></div>'
        recognition = links = related = ''
        if p.get('recognition'):
            recognition = section('Recognition', '<ul class="person-list">' + ''.join('<li>' + escape(' · '.join(filter(None, [r['event'], r.get('track'), r['result']]))) + '</li>' for r in p['recognition']) + '</ul>')
        if p.get('links'):
            labels = {'arXiv preprint': 'arXiv', 'github': 'GitHub', 'website': 'Website'}
            links = '<div class="project-links">' + ''.join(f'<a href="{escape(url, quote=True)}" class="external-link" target="_blank" rel="noopener noreferrer">[{escape(labels.get(label, label))}]</a>' for label, url in p['links'].items()) + '</div>'
        if p.get('related_project_ids'):
            related = section('Related projects', '<p>' + ', '.join(project_link(pid, root) for pid in p['related_project_ids']) + '</p>')
        if (CUSTOM / p['id'] / 'page.json').exists():
            custom_pages(p['id'], {'status': escape(status), 'team': team, 'accepted': accepted, 'recognition': recognition, 'links': links, 'related': related})
        else:
            content = header + team + accepted + recognition + links + related
            page('projects/' + p['id'], p['title'], content, 'projects')
        for alias in p.get('legacy_ids', []):
            destination = '../' + p['id'] + '/'
            pending[ROOT / 'projects' / alias / 'index.html'] = f'<!DOCTYPE html>\n<html lang="en"><head><meta charset="UTF-8"><title>{escape(p["title"])} | QRS</title><meta http-equiv="refresh" content="0; url={destination}"><link rel="canonical" href="https://qrsntu.org/projects/{p["id"]}/"></head><body><a href="{destination}">Continue to {escape(p["title"])}</a></body></html>\n'

    # Standalone pages (explainers, guides) that are not research projects.
    for config_path in sorted(CUSTOM.glob('*/page.json')):
        pid = config_path.parent.name
        if pid not in project_map and 'base' in json.loads(config_path.read_text(encoding='utf-8')):
            custom_pages(pid, {})

    batches = sorted({a['batch'] for p in people for a in p.get('research_academy', [])})
    def academy_row(title, body):
        return f'<section><h2 class="font-serif text-2xl font-bold">{escape(title)}</h2><div class="space-y-4">{body}</div></section>'
    academy = '<header class="text-center mb-12"><h1 class="section-title">QRS Research Academy</h1><p class="section-subtitle">From guided research to independent research leadership.</p></header><div class="academy-layout">'
    academy += academy_row('Join the Academy', "<p>The QRS Research Academy is QRS's entry-stage research programme for students who want to develop the skills needed to conduct original research.</p><p>Participants join an active project and move from guided work towards owning a clearly defined research direction. They learn to formulate a question, design and execute research, analyse evidence, and communicate results clearly.</p>" + '<div class="academy-actions"><a href="https://forms.gle/GGV5hH8oQqBY1ReP8" class="btn btn-red" target="_blank" rel="noopener noreferrer">Apply to QRS Research Academy</a><a href="members/" class="card-link">Meet members and alumni →</a></div><p class="academy-cohorts"><strong>Cohorts:</strong> ' + ' · '.join(escape(batch) for batch in batches) + '</p>')
    academy += academy_row('Research model', '<dl class="research-model"><div><dt>Lead</dt><dd>Owns the overall scientific direction of the parent project.</dd></div><div><dt>Authors</dt><dd>Core contributors to the parent research programme.</dd></div><div><dt>Slicers</dt><dd>Lead derived research directions with a distinct question, application, evaluation setting, or extension.</dd></div></dl><p>Members begin by working closely with an existing project before taking responsibility for a derived direction of their own. Project contributions do not confer an organisation-wide title.</p><p><a href="../projects/" class="card-link">Explore research projects →</a></p>')
    academy += academy_row('Progression', '<p>The initial goal is to develop towards leading a first-author workshop-level research project under mentorship. Strong participants may subsequently become <strong>QRS Researchers</strong>, take on broader responsibilities, and work towards full archival conference or journal papers.</p><p>Academy membership remains part of a person\'s history after promotion. Previous participants retain their cohort on their profile and the members page.</p>')
    academy += '</div>'
    page('research-academy', 'QRS Research Academy', academy, 'academy')

    content = '<p class="mb-8"><a href="../" class="card-link">&larr; Research Academy</a></p><h1 class="section-title">Research Academy Members</h1><p class="section-subtitle">Current members and alumni, with persistent cohort history.</p>'
    for batch in batches:
        cards = []
        for p in people:
            for a in p.get('research_academy', []):
                if a['batch'] != batch:
                    continue
                status = 'Researcher, Quantitative Research Society' if a['status'] == 'promoted' else 'Research Academy Member'
                extra_roles = [role for role in p.get('roles', []) if role != 'QRS Research Academy Member'] if a['status'] == 'member' else []
                areas = ', '.join(project_link(pid, '../../') for pid in a.get('research_areas', []))
                slicers = [q for q in projects if p['id'] in q.get('slicers', [])]
                cards.append('<article class="person-directory-card">' + f'<h3 class="person-directory-name">{person_link(p["id"], "../../")}</h3><p class="person-directory-role">{escape(" · ".join([status, *extra_roles]))}</p>' + (f'<p>Research areas: {areas}</p>' if areas else '') + ''.join('<p>Slicer — ' + project_link(q['id'], '../../') + '</p>' for q in slicers) + '</article>')
        content += section('QRS Research Academy, ' + batch, '<div class="grid sm:grid-cols-2 gap-6">' + ''.join(cards) + '</div>')
    page('research-academy/members', 'Research Academy Members', content, 'people')

    # Existing wrappers keep their styling and routes; only missing profiles are created.
    for p in people:
        route = profile_route(p)
        existing = ROOT / route / 'index.html'
        if existing.exists() and 'tools/generate_research.py' not in existing.read_text(encoding='utf-8'):
            continue
        root = '../' * len(route.split('/'))
        page(route, p['name'], '<p class="mb-8"><a href="' + root + 'people/" class="card-link">&larr; Back to People</a></p><div id="person-profile"></div>', 'people', f'data-person-id="{p["id"]}" data-root="{root}"', f'<script type="module" src="{root}assets/person-page.js?v=20261015-serif"></script>')

    def normalized(source):
        source = SEO.sub('', source)
        source = re.sub(r'<footer([^>]*)>.*?</footer>', r'<footer\1></footer>', source, flags=re.S)
        # SEO replaces the profile fallback after generation.
        source = re.sub(r'<div id="person-profile">.*?</div>', '<div id="person-profile"></div>', source, flags=re.S)
        return re.sub(r'>\s+<', '><', re.sub(r'\s+', ' ', source)).strip()

    changed = [p for p, value in pending.items() if not p.exists() or normalized(p.read_text(encoding='utf-8')) != normalized(value)]
    # Project files are copied as they are; anything left in a served assets folder that no longer
    # exists in the project is stale and removed.
    stale = [f for d in served_dirs if d.exists() for f in d.rglob('*') if f.is_file() and f not in copies]
    copied = [d for d, s in copies.items() if not d.exists() or d.read_bytes() != s.read_bytes()]
    if check and (changed or copied or stale):
        raise SystemExit('Stale research pages or project assets: ' + ', '.join(str(p.relative_to(ROOT)) for p in changed + copied + stale))
    if not check:
        for path in changed:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(pending[path], encoding='utf-8', newline='\n')
        for path in copied:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(copies[path].read_bytes())
        for path in stale:
            path.unlink()
    print(f'Research pages {"checked" if check else "generated"}: {len(pending)} pages, {len(copies)} project assets; '
          f'{len(changed) + len(copied) + len(stale)} changed.')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    generate(parser.parse_args().check)
