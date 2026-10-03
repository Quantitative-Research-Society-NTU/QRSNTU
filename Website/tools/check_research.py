"""Validate public research semantics, generated content, and local site links."""
import argparse
import json
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse, unquote

ROOT = Path(__file__).resolve().parents[1] / 'v1'
REQUIRED = {
    'ai-native-workflow': (['jianing-zhang', 'shufang-chen', 'danlin-chen', 'wang-zimeng', 'xiaotong-li'], ['yizhe-chia']),
    'frtbtrace': ([], []), 'geoaft': ([], []),
    'geoattention': (['jianing-zhang', 'xiaotong-li'], []),
    'policyattention': (['shufang-chen', 'yingzhi-tang', 'xinyue-wu'], ['shufang-chen', 'xinyue-wu']),
    'riskhedge': (['yingzhi-tang', 'jianing-zhang', 'mi-zeyuan'], ['wang-zimeng', 'yingzhi-tang']),
    'softrank': (['jianing-zhang', 'yingzhi-tang'], ['jingshu-liu']),
    'hedgefidelity': ([], []), 'decisionrank': ([], []),
}
PAPERS = {
    'geoaft-ai-native-workflow-automlr-2026': ('ai-native-workflow', 'Geometric Attention Fine-Tuning Is Representation-Relative: Autonomous ML Research with AI-Native Workflow', 'NeurIPS 2026 AutoMLR', ['yuhe-sui', 'jianing-zhang', 'shufang-chen', 'xiaotong-li', 'wang-zimeng']),
    'policyattention-evorobust-2026': ('policyattention', 'PolicyAttention: Robustness and Failure Modes of Softmax Policy Improvement', 'NeurIPS 2026 EvoRobust', ['yuhe-sui', 'yingzhi-tang', 'xinyue-wu']),
    'policyattention-pta-2026': ('policyattention', 'PolicyAttention: When Softmax Attention Becomes Policy Improvement', 'NeurIPS 2026 PTA', ['yuhe-sui']),
    'riskhedge-evorobust-2026': ('riskhedge', 'Diverse Scenarios, Selective Evaluation: Certified Spectral-Risk Decisions under Costly Robustness Tests', 'NeurIPS 2026 EvoRobust', ['yuhe-sui', 'yingzhi-tang']),
    'approximation-rank-neurreps-ea-2026': ('softrank', 'The Approximation Rank of Softmax Attention: Sharp Geometric Laws and Robust Interaction Dimension', 'NeurIPS 2026 NeurReps Extended Abstracts', ['yuhe-sui', 'jianing-zhang']),
}
FORBIDDEN = re.compile(r'AIFW\d*|NRW\d*|Promoted2Researcher|Disconti\.|safety deadline|submission deadline|How Can Agent Work Scale Without Scaling Human Attention\?|Same Attention, Different Geometry: Identifiability Across Pre- and Post-Training|Verification-Gated Hierarchical Execution: A Demo for Long-Horizon Agents|GeoAFT: Fine-Tuning Attention Geometry Beyond Q/K Adaptation|AI Native Workflow for Research: Formalizing the AI Workflows Researchers Already Use|Geometric Attention Fine-Tuning Is Representation-Relative: Fixed-State Separations and Progressive Compression|Geometry-Adaptive Attention Enables Intrinsic-Dimensional Prediction', re.I)

class Links(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.base, self.links = None, []
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'base':
            self.base = attrs.get('href')
        for field in ('href', 'src'):
            if field in attrs and tag != 'base':
                self.links.append(attrs[field])

def check(site):
    def read(name):
        return json.loads((site / 'data' / (name + '.json')).read_text(encoding='utf-8'))
    for path in (site / 'data').glob('*.json'):
        json.loads(path.read_text(encoding='utf-8'))
    people, projects, research = read('people'), read('projects'), read('research')
    def unique(records):
        ids = [r['id'] for r in records]
        assert len(ids) == len(set(ids)), 'Duplicate IDs'
        return {r['id']: r for r in records}
    persons, programmes, papers = unique(people), unique(projects), unique(research)
    for pid in ['yuhe-sui', 'jianing-zhang', 'shufang-chen', 'wang-zimeng', 'yingzhi-tang']:
        internships = [e for e in persons[pid]['experience'] if e['organisation'] == 'UBS']
        expected_dates = 'Jul 2026 – Present' if pid == 'yingzhi-tang' else 'May 2026 – Aug 2026'
        assert len(internships) == 1 and internships[0]['dates'] == expected_dates, pid
    for pid, person in persons.items():
        for education in person.get('education', []):
            if education.get('dates'):
                assert education.get('dates_source') == person.get('linkedin'), (pid, 'Education dates need a verified source')
    assert papers['riskhedge-evorobust-2026']['url'] == 'https://openreview.net/forum?id=OzOTmkkAWW'
    assert papers['policyattention-evorobust-2026']['url'] == 'https://openreview.net/forum?id=VgswuGrqp6'
    assert set(papers) == set(PAPERS), 'Accepted set changed; review the authoritative accepted set'
    for rid, (pid, title, venue, authors) in PAPERS.items():
        r = papers[rid]
        assert (r['project_id'], r['title'], r['venue'], r['authors']) == (pid, title, venue, authors), rid
        assert r['status'] == 'accepted' and r['year'] == 2026, rid
        assert all(pid in programmes for pid in r.get('related_project_ids', [])), rid
        assert all(pid in persons for pid in r['authors']), rid
    assert papers['geoaft-ai-native-workflow-automlr-2026']['related_project_ids'] == ['geoaft']
    for pid, (authors, slicers) in REQUIRED.items():
        p = programmes[pid]
        assert p['lead'] == 'yuhe-sui' and p['authors'] == authors and p['slicers'] == slicers, pid
        assert all(person in persons for person in [p['lead'], *authors, *slicers]), pid
        assert 'participants' not in p, (pid, 'Duplicated role source')
        source = (site / 'projects' / pid / 'index.html').read_text(encoding='utf-8')
        assert 'Lead:</span>' in source and 'class="derived-note"' not in source, pid
        for label, ids in [('Authors', authors), ('Slicers', slicers)]:
            assert (f'{label}:</span>' in source) == bool(ids), (pid, label)
        assert 'None currently listed' not in source, pid
        for rid, r in papers.items():
            if r['project_id'] == pid or pid in r.get('related_project_ids', []):
                assert f'id="research-{rid}"' in source, (pid, rid)
    assert {'ntuinfo-com', 'alphaallocator', 'cffa-2026'} <= set(programmes)
    for pid, arxiv in [('frtbtrace', '2609.32238'), ('policyattention', '2609.30500'), ('softrank', '2608.28150')]:
        assert programmes[pid]['links']['arXiv preprint'] == 'https://arxiv.org/abs/' + arxiv
        assert arxiv in (site / 'projects' / pid / 'index.html').read_text(encoding='utf-8')
    members = (site / 'research-academy/members/index.html').read_text(encoding='utf-8')
    batch1 = {'yingzhi-tang', 'jianing-zhang', 'xiaotong-li'}
    batch2 = {'shufang-chen', 'wang-zimeng', 'xinyue-wu', 'jingshu-liu', 'yizhe-chia'}
    for pid in batch1 | batch2:
        p = persons[pid]
        batch = '2026 Fall #1' if pid in batch1 else '2026 Fall #2'
        promoted = pid in {'yingzhi-tang', 'jianing-zhang'}
        assert len(p['research_academy']) == 1 and p['research_academy'][0]['batch'] == batch, pid
        assert p['research_academy'][0]['status'] == ('promoted' if promoted else 'member'), pid
        assert ('QRS Research Academy Member' in p['roles']) != promoted, pid
        if promoted:
            assert p['roles'] == ['Researcher, Quantitative Research Society'], pid
        route = p.get('short_id') or 'people/' + pid
        source = (site / route / 'index.html').read_text(encoding='utf-8')
        assert batch in source and ('Researcher, Quantitative Research Society' if promoted else 'Member, QRS Research Academy') in source, pid
        assert ('Graduate, QRS Research Academy' if promoted else 'Member, QRS Research Academy') in source, pid
        assert 'Promoted to QRS Researcher' not in source, pid
        assert f'href="../../{route}/"' in members, (pid, 'Wrong member destination')
    assert persons['yizhe-chia']['name'] == 'Yizhe Chia'
    assert persons['danlin-chen']['roles'] == []
    assert persons['mi-zeyuan']['roles'] == ['Vice President, QRS@NTU']
    assert persons['wang-zimeng']['roles'] == ['NUS Sub-branch Coordinator', 'QRS Research Academy Member']
    assert persons['wang-zimeng']['is_admin'] is True
    directory = (site / 'people/index.html').read_text(encoding='utf-8')
    assert 'academy-container' not in directory and '../research-academy/members/' in directory and 'academy-section' not in directory
    assert 'hX0YN2Nvsz' in (site / 'research-academy/index.html').read_text(encoding='utf-8')

    broken, count = [], 0
    for path in site.rglob('*'):
        if '_site' in path.relative_to(site).parts or path.suffix not in {'.html', '.js', '.json', '.xml'}:
            continue
        source = path.read_text(encoding='utf-8')
        assert not FORBIDDEN.search(source), ('Unintended public exposure', path)
        if path.suffix != '.html':
            continue
        parser = Links(source)
        url = 'https://qrsntu.org/' + path.relative_to(site).as_posix()
        base = urljoin(url, parser.base) if parser.base else url
        for href in parser.links:
            parsed = urlparse(urljoin(base, href))
            if parsed.netloc != 'qrsntu.org' or parsed.scheme not in {'http', 'https'}:
                continue
            target = site / unquote(parsed.path).lstrip('/')
            if target.is_dir():
                target /= 'index.html'
            count += 1
            if not target.exists():
                broken.append((path.relative_to(site).as_posix(), href))
    assert not broken, ('Broken internal links', len(broken), broken[:20])
    print(f'PASS: public JSON, 9 research projects, 5 accepted papers, 8 cohort records, profiles, arXiv, visibility and {count} local links.')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--site', type=Path, default=ROOT)
    check(parser.parse_args().site)
