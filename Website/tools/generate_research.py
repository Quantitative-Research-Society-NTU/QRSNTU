"""Generate project pages, profile wrappers, and Academy cohorts from canonical data.

Run before generate_seo.py. --check compares content with SEO blocks stripped.
"""
import argparse
import json
import re
from html import escape
from pathlib import Path
from string import Template

ROOT = Path(__file__).resolve().parents[1] / 'v1'
TEMPLATE = Template((Path(__file__).parent / 'templates/research-page.html').read_text(encoding='utf-8'))
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
    accepted = [r for r in research if r.get('status') == 'accepted']
    pending = {}

    def person_link(pid, root):
        person = person_map.get(pid)
        # Existing competition collaborators without profiles remain plain names.
        if not person:
            return escape(pid.replace('-', ' ').title())
        name = person['name']
        return f'<a href="{root}{profile_route(person)}/" class="person-link">{escape(name)}</a>'

    def project_link(pid, root):
        return f'<a href="{root}projects/{pid}/" class="card-link">{escape(project_map[pid]["title"])}</a>'

    def page(route, title, content, kind='research', attributes='', scripts=''):
        root = '../' * len(route.split('/'))
        pending[ROOT / route / 'index.html'] = TEMPLATE.substitute(title=escape(title), root=root, kind=kind, width='max-w-6xl' if kind == 'academy' else 'max-w-4xl', attributes=attributes, content=content, scripts=scripts)

    for p in projects:
        root = '../../'
        status = 'Early-stage / Active derived research' if p.get('stage') == 'early-stage' else p['status'].capitalize()
        content = f'<p class="mb-8"><a href="../" class="card-link">&larr; All projects</a></p><header class="project-heading"><h1 class="section-title">{escape(p["title"])}</h1><p class="badge badge-status">{escape(status)}</p><p class="project-summary">{escape(p["summary"])}</p></header>'
        if p.get('alternate_title'):
            content += f'<p>{escape(p["alternate_title"])}</p>'
        if p.get('lead'):
            content += '<div class="project-team">' + ''.join('<p><span class="label">' + label + ':</span> ' + ', '.join(person_link(pid, root) for pid in ids) + '</p>' for label, ids in [('Lead', [p['lead']]), ('Authors', p['authors']), ('Slicers', p['slicers'])] if ids) + '</div>'
            papers = [r for r in accepted if r['project_id'] == p['id'] or p['id'] in r.get('related_project_ids', [])]
            items = []
            for r in papers:
                link = f'<a href="{escape(r["url"], quote=True)}" class="external-link" target="_blank" rel="noopener noreferrer">[OpenReview]</a>' if r.get('url') else ''
                items.append(f'<li id="research-{r["id"]}" class="publication-entry"><h3 class="publication-title">{escape(r["title"])}</h3><p class="publication-authors">{", ".join(person_link(pid, root) for pid in r["authors"])}</p><p class="person-list-meta">{escape(r["venue"])} · {r["year"]} · Accepted {link}</p></li>')
            if items:
                content += section('Accepted Research', '<ul class="person-list">' + ''.join(items) + '</ul>')
        else:
            content += '<div class="project-team"><p><span class="label">Participants:</span> ' + ', '.join(person_link(pid, root) for pid in p.get('participants', [])) + '</p></div>'
        if p.get('recognition'):
            content += section('Recognition', '<ul class="person-list">' + ''.join('<li>' + escape(' · '.join(filter(None, [r['event'], r.get('track'), r['result']]))) + '</li>' for r in p['recognition']) + '</ul>')
        if p.get('links'):
            labels = {'arXiv preprint': 'arXiv', 'github': 'GitHub', 'website': 'Website'}
            content += '<div class="project-links">' + ''.join(f'<a href="{escape(url, quote=True)}" class="external-link" target="_blank" rel="noopener noreferrer">[{escape(labels.get(label, label))}]</a>' for label, url in p['links'].items()) + '</div>'
        if p.get('related_project_ids'):
            content += section('Related projects', '<p>' + ', '.join(project_link(pid, root) for pid in p['related_project_ids']) + '</p>')
        page('projects/' + p['id'], p['title'], content, 'projects')
        for alias in p.get('legacy_ids', []):
            destination = '../' + p['id'] + '/'
            pending[ROOT / 'projects' / alias / 'index.html'] = f'<!DOCTYPE html>\n<html lang="en"><head><meta charset="UTF-8"><title>{escape(p["title"])} | QRS</title><meta http-equiv="refresh" content="0; url={destination}"><link rel="canonical" href="https://qrsntu.org/projects/{p["id"]}/"></head><body><a href="{destination}">Continue to {escape(p["title"])}</a></body></html>\n'

    batches = sorted({a['batch'] for p in people for a in p.get('research_academy', [])})
    def academy_row(title, body):
        return f'<section><h2 class="font-serif text-2xl font-bold">{escape(title)}</h2><div class="space-y-4">{body}</div></section>'
    academy = '<header class="text-center mb-12"><h1 class="section-title">QRS Research Academy</h1><p class="section-subtitle">From guided research to independent research leadership.</p></header><div class="academy-layout">'
    academy += academy_row('Join the Academy', "<p>The QRS Research Academy is QRS's entry-stage research programme for students who want to develop the skills needed to conduct original research.</p><p>Participants join an active project and move from guided work towards owning a clearly defined research direction. They learn to formulate a question, design and execute research, analyse evidence, and communicate results clearly.</p>" + '<div class="academy-actions"><a href="https://forms.cloud.microsoft/r/hX0YN2Nvsz" class="btn btn-red" target="_blank" rel="noopener noreferrer">Apply to QRS Research Academy</a><a href="members/" class="card-link">Meet members and alumni →</a></div><p class="academy-cohorts"><strong>Cohorts:</strong> ' + ' · '.join(escape(batch) for batch in batches) + '</p>')
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
        if existing.exists() and 'Generated by Website/tools/generate_research.py' not in existing.read_text(encoding='utf-8'):
            continue
        root = '../' * len(route.split('/'))
        page(route, p['name'], '<p class="mb-8"><a href="' + root + 'people/" class="card-link">&larr; Back to People</a></p><div id="person-profile"></div>', 'people', f'data-person-id="{p["id"]}" data-root="{root}"', f'<script type="module" src="{root}assets/person-page.js?v=20261003-shared"></script>')

    def normalized(source):
        source = SEO.sub('', source)
        source = re.sub(r'<footer([^>]*)>.*?</footer>', r'<footer\1></footer>', source, flags=re.S)
        # SEO replaces the profile fallback after generation.
        source = re.sub(r'<div id="person-profile">.*?</div>', '<div id="person-profile"></div>', source, flags=re.S)
        return re.sub(r'>\s+<', '><', re.sub(r'\s+', ' ', source)).strip()

    changed = [p for p, value in pending.items() if not p.exists() or normalized(p.read_text(encoding='utf-8')) != normalized(value)]
    if check and changed:
        raise SystemExit('Stale research pages: ' + ', '.join(str(p.relative_to(ROOT)) for p in changed))
    if not check:
        for path in changed:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(pending[path], encoding='utf-8', newline='\n')
    print(f'Research pages {"checked" if check else "generated"}: {len(pending)} pages; {len(changed)} changed.')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    generate(parser.parse_args().check)
