"""Validate sitemap destinations and crawl signals locally or on the live site."""
import argparse
import json
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse, urljoin
from urllib.request import urlopen
from xml.etree import ElementTree as ET

ORIGIN = "https://qrsntu.org"
ROOT = Path(__file__).resolve().parents[1] / "v1"


class Head(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.canonicals, self.descriptions, self.robots, self.schemas = [], [], [], []
        self.links, self.redirects = [], []
        self.schema = None
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "link" and attrs.get("rel") == "canonical":
            self.canonicals.append(attrs.get("href"))
        if tag == "meta":
            name = attrs.get("name", "").lower()
            if name == "description":
                self.descriptions.append(attrs.get("content"))
            if name == "robots":
                self.robots.append(attrs.get("content", ""))
            if attrs.get("http-equiv", "").lower() == "refresh":
                self.redirects.append(attrs.get("content"))
        if tag == "a":
            self.links.append(attrs.get("href", ""))
        if tag == "script" and attrs.get("type") == "application/ld+json":
            self.schema = ""

    def handle_data(self, data):
        if self.schema is not None:
            self.schema += data

    def handle_endtag(self, tag):
        if tag == "script" and self.schema is not None:
            self.schemas.append(json.loads(self.schema))
            self.schema = None


def check(site, live):
    def read(path):
        if live:
            with urlopen(ORIGIN + path, timeout=30) as response:
                assert response.status == 200, (path, response.status)
                assert response.url == ORIGIN + path, (path, "unexpected redirect", response.url)
                assert "noindex" not in response.headers.get("X-Robots-Tag", "").lower(), path
                return response.read().decode("utf-8")
        target = site / path.lstrip("/")
        if path.endswith("/"):
            target /= "index.html"
        return target.read_text(encoding="utf-8")

    robots = read("/robots.txt")
    assert "Sitemap: " + ORIGIN + "/sitemap.xml" in robots
    assert not any(line.strip().lower().startswith("disallow: /") for line in robots.splitlines())
    root = ET.fromstring(read("/sitemap.xml"))
    assert root.tag == "{http://www.sitemaps.org/schemas/sitemap/0.9}urlset"
    urls = [element.text for element in root.findall("{*}url/{*}loc")]
    assert urls and len(urls) == len(set(urls)), "Missing or duplicate sitemap URLs"

    def page(url):
        parsed = urlparse(url)
        assert parsed.scheme == "https" and parsed.netloc == "qrsntu.org", url
        assert not parsed.query and not parsed.fragment and parsed.path.endswith("/"), url
        head = Head(read(parsed.path))
        assert head.canonicals == [url], (url, head.canonicals)
        assert len(head.descriptions) == 1 and head.descriptions[0], url
        assert not head.redirects and not any("noindex" in value for value in head.robots), url
        assert head.schemas and head.schemas[0]["@context"] == "https://schema.org", url
        assert head.schemas[0]["@graph"][0]["url"] == url, url
        return url

    with ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(page, urls))
    directory = Head(read("/site-map/"))
    linked = {urljoin(ORIGIN, href) for href in directory.links}
    assert set(urls) - {ORIGIN + "/site-map/"} <= linked, "HTML sitemap omits a page"
    for alias, canonical in {"/index.html": "/", "/research.html": "/projects/",
                             "/events_learning.html": "/events/",
                             "/awards_recognition.html": "/projects/",
                             "/people/yuhe-sui/": "/yh/", "/people/jianing-zhang/": "/jn/",
                             "/people/danlin-chen/": "/cdl/"}.items():
        assert Head(read(alias)).canonicals == [ORIGIN + canonical], alias
        assert ORIGIN + alias not in urls, alias
    for campus in ("nus", "cuhk", "fdu", "sjtu", "cmu", "hkust", "branches"):
        assert any("noindex" in value for value in Head(read(f"/{campus}/")).robots), campus
        assert not any(url.startswith(ORIGIN + f"/{campus}/") for url in urls), campus
    print(f"PASS: {len(urls)} canonical pages, XML/HTML sitemaps, robots, JSON-LD, aliases, and preview exclusions ({'live' if live else site}).")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--site", type=Path, default=ROOT)
    parser.add_argument("--live", action="store_true")
    args = parser.parse_args()
    check(args.site, args.live)
